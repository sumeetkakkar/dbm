'use strict';
const assert = require('assert');
const semver = require('semver');
const SemverRange = require('semver/classes/range');
const Store = require('../_base');
const Bundle = require('../../model/bundle');
const BundleVersion = require('../../model/bundle-version');
const logger = require('../../../logger');

const configSpecs = require('./config-specs');

const {
  getRevs,
  clone,
  getVersionChecker,
  getVersionEvaluator,
} = require('./helper');

const _repo = Symbol('repo');

function assertRequired(store) {
  const repo = store[_repo];
  assert(repo, 'Repo is needed');
}

class GitStore extends Store {
  /**
   * Init config store
   * @param {Object} config 
   */
  async init(config) {
    const repo = config.get('repo');
    logger.debug(`Using GitStore [${repo}]`);
    this[_repo] = repo;
  }

  /**
   * Repo
   */
  get repo() { return this[_repo]; }

  /**
   * Store specific config specs
   */
  get configSpecs() {  return [ ...configSpecs ]; }

  /**
   * Close config store
   */
  async close() {
    logger.debug(`GitStore:close`);
  }

  /**
   * Create bundle
   * @param {Bundle} bundle 
   */
  async createBundle(_bundle)  {
    logger.warn(`GitStore:createBundle should not be called`);
    throw new Error(`GitStore:createBundle not applicable`);
  }

  /**
   * Saves a new bundle version
   * @param {Bundle} bundle 
   * @param {BundleVersion} version 
   * @param {Object} options 
   */
  async saveBundleVersion(_bundle, _ver, _options) {
    logger.warn(`GitStore:saveBundleVersion should not be called`);
    throw new Error(`GitStore:saveBundleVersion not applicable`);
  }

  /**
   * Update an existing bundle version
   * @param {Bundle} bundle 
   * @param {BundleVersion} ver
   * @param {Object} options 
   */
  async updateBundleVersion(_bundle, _ver, _options) {
    logger.warn(`GitStore:updateBundleVersion should not be called`);
    throw new Error(`GitStore:updateBundleVersion not applicable`);
  }

  /**
   * set tag
   * @param {Bundle} bundle 
   * @param {BundleVersion} ver 
   * @param {String} tag New tag
   * @returns 
   */
  async setBundleVersionTag(_bundle, _ver, _tag) {
    logger.warn(`GitStore:setBundleVersionTag should not be called`);
    throw new Error(`GitStore:setBundleVersionTag not applicable`);
  }

  /**
   * Delete bundle
   * @param {Bundle} bundle 
   * @param {BundleVersion} ver
   */
  async deleteBundleVersion(_bundle, _ver) {
    logger.warn(`GitStore:deleteBundleVersion should not be called`);
    throw new Error(`GitStore:deleteBundleVersion not applicable`);
  }

  /**
   * Install bundle
   * @param {Bundle} bundle 
   * @param {BundleVersion} ver
   * @param {String} targetDir to save if the stream is not available
   * @param {Boolean} exists flag passed to store indicating the bundle version is already installed
   * @returns undefined // stream.Readable
   */
  async installBundle(bundle, ver, { targetDir, exists }={}) {
    assertRequired(this);
    logger.debug('GitStore: installBundle', bundle.name, ver.version);
    if (exists) {
      logger.warn(`WARN Bundle ${bundle.name}@${ver.version} already cloned under ${targetDir}. SKIPPING!`);
      return false;
    }
    assert(targetDir, `Target directory is required to install the bundle`);
    const [ gitUrl, singleRepo, revs ] = await getRevs(this[_repo], bundle.name, { tags: true, branches: true });

    if (!revs) {
      throw new Error(`Error getting bundle details ${bundle.name}@${bundle.version}`);
    }
    let ref = ver.ref;
    if (!ref) {
      // get the ref for the version
      const checker = getVersionChecker(bundle.name, ver.version, singleRepo);

      for (const rev of revs) {
        if (checker(rev.ref)) {
          ref = rev.ref;
          break;
        }
      }
    }
    if (!ref) {
      throw new Error(`Bundle ${bundle.name}@${ver.version} not found`);
    }

    logger.debug(`GitStore: cloning ${gitUrl} ${ref} to ${targetDir}`);

    return await clone(gitUrl, { ref, targetDir });
  }

  /**
   * Query bundle by name.
   * @param {String} name 
   * @param {Object} Options - accepts version to load specific version, or tag to load versions with specific tag
   */
  async queryBundle(name, { version, tag }={}) {
    assertRequired(this);
    logger.debug('GitStore: queryBundle', name, version);
    const [ gitUrl, singleRepo, revs ] = await getRevs(this[_repo], name, { tags: true, branches: true });

    if (!revs) {
      return;
      // throw new Error(`Error getting bundle details ${name}`);
    }
    const range = (() => {
      // if version is valid, do exact match
      if (!version || semver.valid(version)) return;
      try {
        return new SemverRange(version);
      } catch (er) {
        // not a range. do exact match
        return;
      }
    })();

    const bundle = new Bundle({ name });
    if (version && !range) {
      const checker = getVersionChecker(bundle.name, version, singleRepo);
      for (const rev of revs) {
        const { ref } = rev;
        if (checker(ref)) {
          bundle.versions = [ new BundleVersion({ version, ref }) ];
          break;
        }
      }
      if (!bundle.versions) {
        logger.warn(`Version ${version} does not exist for ${name}`);
      }
    } else if (tag && !range) { // if version range is passed in use that
      // received tag. use the branch which matches it
      const versions = bundle.versions = [];
      const candidates = [];
      if (tag === 'latest') {
        if (singleRepo) {
          candidates.push(name);
        } else {
          candidates.push(...[ tag, 'master', 'main' ]);
        }
      } else {
        const msg = `Will try to pick branch ${tag} from repo ${gitUrl}`;
        singleRepo ? logger.warn(msg) : logger.info(msg);
        candidates.push(tag);
      }
      for (const rev of revs) {
        const { ref, type } = rev;
        if (type !== 'branch') continue;
        const idx = candidates.indexOf(ref);
        if (idx >= 0) {
          const bver = new BundleVersion({ version: ref, ref });
          if (ref === tag) { // exact match. push it to top
            versions.unshift(bver);
          } else {
            versions.push(bver);
          }
        }
        if (versions.length === candidates.length) {
          break;
        }
      }
    } else { // no filter, get all
      const versions = bundle.versions = [];
      const process = getVersionEvaluator(name, singleRepo);
      let highidx = -1;
      for (const rev of revs) {
        const { ref } = rev;
        const v = process(ref);
        if (v) {
          const sver = semver.parse(v);
          if (sver && (!range || range.test(sver))) {
            versions.push(new BundleVersion({ version: v, ref }));
            if (!sver.prerelease || sver.prerelease.length === 0) {
              if (highidx < 0 || semver.gt(sver, versions[highidx].version)) {
                highidx = versions.length - 1;
              }
            }
          }
        }
      }
      if (highidx > 0) { // if not already first
        // move it to top
        const [ v ] = versions.splice(highidx, 1);
        versions.unshift(v);
      }
    }
    return bundle;
  }

  /**
   * List bundles
   * @param {Any} pattern 
   */
  async listBundles(_pattern) {
    logger.warn(`GitStore:listBundles should not be called`);
    return [];
  }

}

module.exports = GitStore;