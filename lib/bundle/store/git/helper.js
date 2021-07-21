'use strict';

const assert = require('assert');
const semver = require('semver');
const readline = require('readline');
const { promises: fsPromises } = require('fs');
const { PassThrough } = require('stream');
const cp = require('child_process'); // Directly using cp helps with mocking
const { URL } = require('url');
const logger = require('../../../logger');
const path = require('path');

const _data = Symbol('data');
class GitRef {
  constructor(line='') {
    const [ sha='', rawRef='' ] = line.trim().split(/\s+/, 2);
    const refsTag = 'refs/';
    const refType = rawRef.startsWith(refsTag) &&
                     rawRef.slice(refsTag.length, rawRef.indexOf('/', refsTag.length)) ||
                     rawRef;

    const type = ((refType) => {
      switch (refType) {
        case 'tags':
          return 'tag';
        case 'heads':
          return 'branch';
        case 'pull':
          return 'pull';
      }
      return refType.toLowerCase(); // HEAD
    })(refType);

    const ref = ((rawRef, refType, type) => {
      switch (type) {
        case 'tag':
        case 'branch':
          return rawRef.slice(`refs/${refType}/`.length);
        case 'pull': 
        // merged pull requests installable with #pull/123/merge
        // for the merged pr, or #pull/123 for the PR head (pull/123/head)
          return rawRef.slice('refs/'.length).replace(/\/head$/, '');
        case 'head': // HEAD
        default:
          return rawRef;
      }
    })(rawRef, refType, type);

    assert(ref, `Unsupported git ref line ${line}`);

    this[_data] = {
      sha,
      ref,
      rawRef,
      type
    };
  }

  get ref() { return this[_data].ref; }
  get sha() { return this[_data].sha; }
  get rawRef() { return this[_data].rawRef; }
  get type() { return this[_data].type; }
  toJSON() { return { ...this[_data] }; }

  static iterator(revs) {
    let pidx = -1;
    return {
      * [Symbol.iterator]() {
        let idx = 0;
        while (idx < revs.length) {
          if (idx > pidx) {
            revs[idx] = new GitRef(revs[idx]);
            pidx = idx;
          }
          yield revs[idx++];
        }
      },
      get size() {
        return revs.length;
      }
    };
  }
}

function execGitCommand(args=[], { output, cwd }={}) {
  const cmd = cp.spawn('git', args, { cwd });
  return new Promise((resolve, reject) => {
    // let response;
    cmd.stdout.on('data', (data) => {
      // Don't log. Just capture output.
      // logger.info(data && data.toString() || '');
      // response = (!response) ? data : Buffer.concat(response, data);
      if (output) {
        output.write(data.toString());
      } else {
        logger.debug(data && data.toString() || '');
      }
    });
    cmd.stderr.on('data', (data) => {
      logger.warn(data && data.toString() || '');
    });
    cmd.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Error executing git command [${code}] [${args.join(' ')}]`));
      } else {
        resolve(/*response*/);
      }
    });
  });
}

/**
 * An HTTPS URL like https://github.com/user/repo.git
 * An SSH URL, like git@github.com:user/repo.git
 * TODO: Maybe explore using https://github.com/npm/git
 * @param {String} repo 
 * @param {String} name 
 * @returns [ gitUrl, singleRepo ] 
 *  {String} gitUrl: processed git url for git commands
 *  {Boolean} singleRepo means the repo url is complete and the branching strategy is being used for different
 */
const processGitUrl = (() => {
  const cache = new Map();
  // eslint-disable-next-line no-useless-escape
  const sshEx = /^git@[^:#]+:[^#\/]+(?:\/([^\.]*))?(?:\.git)?$/;
  // eslint-disable-next-line no-useless-escape
  const pathEx = /^\/[^#\/]+(?:\/([^\.]*))?(?:\.git)?$/;
  function helpMessage() {
    return `
Supported formats are 
- Repo url for all bundles: i.e. https://github.com/user/<bundles-repo>.git or git@github.com:user/<bundles-repo>.git
- Org url containing multiple bundles: i.e. https://github.com/user or git@github.com:user
`;
  }
  function processSshUrl(repo, name) {
    const re = sshEx.exec(repo);
    if (!re) {
      logger.error(`Unable to parse git repo ssh url ${repo}`);
      throw new Error(`Invalid git ssh url [${repo}]. ${helpMessage()}`);
    }
    if (re.length === 1 || !re[1]) {
      const gurl = `${repo}${repo[repo.length-1] !== '/' ? '/' : ''}${name}.git`;
      logger.debug(`Bundle repo is ${gurl}`);
      return [ gurl, false ]; // looks like separate repo per bundle
    } else {
      logger.debug(`Determined single repo for managing bundles`);
      return [ repo, true ];  // looks like single repo for all bundles
    }
  }
  function processHttpUrl(repo, name) {
    const parsed = (() => {
      try {
        return new URL(repo);
      } catch (ex) {
        logger.error(`Unable to parse git repo http url ${repo} [${ex.stack}]`);
        throw new Error(`Invalid git http url [${repo}]. ${helpMessage()}`);
      }
    })();
    const re = pathEx.exec(parsed.pathname);
    if (!re) {
      logger.error(`Unable to parse git repo url's pathname [${parsed.pathname}] [${repo}]`);
      throw new Error(`Invalid git http url [${repo}]. ${helpMessage()}`);
    }
    if (re.length === 1 || !re[1]) {
      const gurl = `${repo}${repo[repo.length-1] !== '/' ? '/' : ''}${name}.git`;
      logger.debug(`Bundle repo is ${gurl}`);
      return [ gurl, false ]; // looks like separate repo per bundle
    } else {
      logger.debug(`Determined single repo for managing bundles`);
      return [ repo, true ];  // looks like single repo for all bundles
    }
  }
  return function processGitUrl(repo='', name) {
    const cacheKey = `${name}:${repo}`;
    if (!cache.has(cacheKey)) {
      assert(repo, `Repo url is required`);
      if (repo.startsWith('git@')) {
        cache.set(cacheKey, processSshUrl(repo, name));
      } else {
        cache.set(cacheKey, processHttpUrl(repo, name));
      }
    }
    return cache.get(cacheKey);
  };
})();

/**
 * An HTTPS URL like https://github.com/user/repo.git
 * An SSH URL, like git@github.com:user/repo.git
 * TODO: Maybe explore using https://github.com/npm/git
 * @param {*} repo 
 * @param {*} name 
 */
async function getRevs(repo, name, { tags=true, branches=false, filter=[] } = {}) {
  // singleRepo: Single repo for all bundles.
  const [ gitUrl, singleRepo ] = processGitUrl(repo, name);

  // refs/tags/foo^{} is the 'peeled tag', ie the commit
  // that is tagged by refs/tags/foo they resolve to the same
  // content, just different objects in git's data structure.
  // But, we care about the thing the tag POINTS to, not the tag
  // object itself, so we don't care of the peeled tag refs, or the pointer
  const gitargs = [ 'ls-remote', '--sort=-version:refname', '--refs' ];
  if (tags === true)  gitargs.push('--tags');
  if (branches === true)  gitargs.push('--heads');

  gitargs.push(gitUrl); // add git url

  filter = filter && typeof filter === 'string' ? [ filter ] : filter;
  if (Array.isArray(filter) && filter.length > 0)  gitargs.push(...filter); // ex: v\*, latest, master, my-branch

  const pstrm = new PassThrough();
  const rl = readline.createInterface( { input: pstrm } );
  const revs = [];
  rl.on('line', (line) => {
    // line && refs.push(new GitRef(line));
    line && revs.push(line);
  });

  try {
    await execGitCommand(gitargs, { output: pstrm });
  } catch (ex) {
    logger.error(`Error getting git revs [${ex.message}]`);
    return [];
  }

  // singleRepo: Single repo for all bundles vs separate repo for each bundle.
  return [ gitUrl, singleRepo, GitRef.iterator(revs) ];
}

async function clone(repo, { ref, targetDir, cwd=process.cwd(), force=false } = {}) {
  assert(repo, `Repo url is required`);
  // git clone git@github.com:user/repo.git -b v3.7.0  --depth 1 3.7.0
  const gitargs = [ 'clone', repo ];
  if (ref) {
    gitargs.push('-b', ref);
  }
  gitargs.push('--depth', '1');

  if (!targetDir) {
    targetDir = ref;
    if (!targetDir) {
      // eslint-disable-next-line no-useless-escape
      const re = /\/([^\/\.]+)(?:\.git)?$/.exec(repo);
      if (re && re.length >= 1) {
        targetDir = re[1];
      }
    }
  }

  assert(targetDir, `No target directory specified`);
  gitargs.push(targetDir);

  const outdir = path.resolve(cwd, targetDir);
  if (force === true) {
    try {
      await fsPromises.access(outdir);
      logger.error(`[**IMPORTANT**] Force clone disabled. Please manually remove ${outdir} instead!`);
      // await fsPromises.rmdir(outdir, { recursive: true });
    } catch (ex) {
      if (ex.code !== 'ENOENT') {
        throw new Error(`Error deleting ${outdir} before clone [${ex.code} - ${ex.message}]`);
      }
    }
  }

  await execGitCommand(gitargs, { cwd });

  // remove .git folder
  await fsPromises.rmdir(path.join(outdir, '.git'), { recursive: true });
  return outdir;
}

/**
 * Returns function to check whether git ref is for the input version
 * @param {*} name 
 * @param {*} version 
 * @param {*} singleRepo 
 * @returns 
 */
function getVersionChecker(name, version, singleRepo=false) {
  // singleRepo: Single repo for all bundles vs separate repo for each bundle.
  if (singleRepo === true) {
    // expect the bundle name and version in the tag.
    // <bundle>-<version>, <version>-<bundle>. seperator can be anything other than '.' (dot).
    const regex = new RegExp(`^(?:(?:.*?[^\\w\\.])?(${name})[^\\w\\.])?.*?(v?${version.replace(/\./g, '\\.')})(?:(?:.*?(?:[^\\w\\.](${name}))(?:[^\\w\\.].*?)?)?|(?:.*?))$`); // TODO: Should we support template?
    return function check(ref) {
      const re = this.exec(ref);
      if (re && re.length >= 4) {
        logger.debug(`check [single-repo]: ${ref} => [${re[1]},${re[2]},${re[3]}]`);
        // version should be in re[2], and  bundle name should be in re[1] or re[3]
        return re[2] && (re[1] || re[3]);
      }
      return false;
    }.bind(regex);
  }

  // expect version
  return Object.is.bind(Object, version);
}

/**
 * Returns function to derive version from the git ref
 * @param {*} name 
 * @param {*} version 
 * @param {*} singleRepo 
 * @returns 
 */
function getVersionEvaluator(name, singleRepo=false) {
  // singleRepo: Single repo for all bundles vs separate repo for each bundle.
  if (singleRepo === true) {
    // expect the bundle name and version in the tag.
    // <bundle>-<version>, <version>-<bundle>. seperator can be anything other than '.' (dot).
    const regex = new RegExp(`^(?:(?:.*?[^\\w\\.])?(v?\\d+\\.\\d+\\.\\d+(?:-[\\w\\.-]+)?)[^\\w\\.])?.*?(${name})(?:(?:.*?(?:[^\\w\\.](v?\\d+\\.\\d+\\.\\d+(?:-[\\w\\.-]+)?))(?:[^\\w\\.].*?)?)?|(?:.*?))$`); // TODO: Should we support template?
    return function getVersion(ref) {
      const re = this.exec(ref);
      if (re && re.length >= 4) {
        // bundle name should be in re[2], and  version should be in re[1] or re[3]
        logger.debug(`getVersion [single-repo]: ${ref} => [${re[1]},${re[2]},${re[3]}]`);
        return re[1] || re[3];
      }
    }.bind(regex);
  }

  // expect version
  return function getVersion(value) {
    if (semver.valid(value)) return value;
  };
}

module.exports = {
  getRevs,
  clone,
  getVersionChecker,
  getVersionEvaluator,
  GitRef,
};

// getRevs('git@github.com:krakenjs/kraken-js.git', 'kraken', { tags: true, branches: true, _filter: `master` })
// .then((ret) => {
//   return clone('git@github.com:krakenjs/kraken-js.git', { ref: 'v2.3.0', targetDir: '2.3.0', cwd: path.resolve(process.cwd(), 'tmp'), force: false });
// })
// .then(() => {
//   console.log('done');
// }).catch(console.error);

//git clone git@github.com:krakenjs/kraken-js.git -b v3.7.0  --depth 1 ./3.7.0
