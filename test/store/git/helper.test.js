'use strict';
const assert = require('assert');
const path = require('path');
const semver = require('semver');
const fakeSpawn = require('./fixtures/fake-spawn');
const rawRevs = require('./fixtures/raw-revs');
const {
  getRevs,
  clone,
  getVersionChecker,
  getVersionEvaluator,
  GitRef,
} = require('../../../lib/bundle/store/git/helper');

describe('store:git -> helper', function () {
  let sandbox;

  afterEach(function () {
    if (sandbox) sandbox.restore();
    sandbox = undefined;
  });

  it('getVersionChecker: singleRepo=true', async function () {
    const [ names, revs ] = rawRevs.multi;
    const refs = GitRef.iterator(revs);

    const evaluators = names.map( name => ({ name, evaluator: getVersionEvaluator(name, true) }) );
    /* eslint no-useless-escape: 0*/
    const ver_ex = /v?\d+\.\d+\.\d+(-[-\w\.]+)?/;
    for (const { ref, type } of refs) {
      let bundle, version;
      for (const { name, evaluator } of evaluators ) {
        const v = evaluator(ref);
        if (v) {
          assert(!version, `should not evaluate for ${name}. Already evaluated for [bundle:${bundle}; version:${version}]`);
          version = v;
          bundle = name;
        }
      }
      if (!version) {
        assert.strictEqual(version, undefined, `returned value should be undefined ${ref}:${version}`);
        if (type === 'tag' && names.some( name => ref.includes(name) )) {
          assert.doesNotMatch(ref, ver_ex, `ref should not contain a valid version - ${ref}`);
        }
      } else {
        assert.notStrictEqual(version, ref, `Returned version for ${bundle} should not match the ref`);
        assert.strictEqual(ref.includes(version), true, `Returned value [${version}] should be a substring of the ref [${ref}] for ${bundle}`);
        assert(semver.valid(version), `returned value should be a valid version string for ${bundle} - ${version}`);
      }
    }
    function assertVersion(name, version, expectedRef) {
      const checker = getVersionChecker(name, version, false);
      let matched = undefined;
      for (const { ref } of refs) {
        const match = checker(ref);
        if (match) {
          assert(!matched, 'Should match only one');
          matched = ref;
        }
      }
      if (expectedRef) {
        assert.strictEqual(expectedRef, matched, `should exactly match the version`);
      } else {
        assert.strictEqual(matched, undefined, `should not match any version ${version}:${matched}`);
      }
    }
    const versions = new Map([
      [ 'dummy-v2.x', '2.2.0', 'dummy-v2.x-2.2.0' ],
      [ 'dummy-v2.x', 'v2.2.0', false ],
      [ 'dummy-1', 'v0.6.1', 'dummy-1:v0.6.1' ],
      [ 'dummy-1', 'v0.6.2', 'dummy-1/v0.6.2' ],
      [ 'dummy-1', 'v0.7.0', false ], // v0.7.0-dumm
      [ 'dummy-1', 'v0.7.1', 'v0.7.1-dummy_2' ],
      [ 'dummy03', 'v1.0.0-rc.1', 'dummy03/v1.0.0-rc.1' ],
      [ 'dummy-1', 'v1.0.0-rc.1', false ],
      [ 'dummy-1', 'v1.0.0-rc.2', 'dummy-1-v1.0.0-rc.2' ],
      [ 'dummy_2', 'v1.0.0-rc.3', '/v1.0.0-rc.3:dummy_2' ],
      [ 'dummy03', 'v1.0.0-rc.1', 'v2.0.0-rc.1-dummy03' ],
    ]);

    for ( const args of versions ) {
      assertVersion(...args);
    }
  });

  it('getVersionChecker: singleRepo=false', async function () {
    const [ name, revs ] = rawRevs.single;
    const refs = GitRef.iterator(revs);

    const evaluator = getVersionEvaluator(name, false);
    /* eslint no-useless-escape: 0*/
    const ver_ex = /^v?\d+\.\d+\.\d+(-[-\w\.]+)?$/;
    for (const { ref } of refs) {
      const v = evaluator(ref);
      if (!v) {
        assert.strictEqual(v, undefined, `returned value should be undefined ${ref}:${v}`);
        assert.doesNotMatch(ref, ver_ex, `ref should not be a valid version string - ${ref}`);
      } else {
        assert.strictEqual(v, ref, `Returned value should be same as ref`);
        assert.match(ref, ver_ex, `ref should be a valid version string - ${ref}`);
      }
    }
    function assertVersion(name, version, shouldMatch) {
      const checker = getVersionChecker(name, version, false);
      let matched = undefined;
      for (const { ref } of refs) {
        const match = checker(ref);
        if (match) {
          assert(!matched, 'Should match only one');
          matched = ref;
        }
      }
      if (shouldMatch) {
        assert.strictEqual(version, matched, `should exactly match the version`);
      } else {
        assert.strictEqual(matched, undefined, `should not match any version ${version}:${matched}`);
      }
    }
    const versions = new Map([
      [ 'v0.7.5', true ],
      [ 'v0.7.5-rc-1', false ],
      [ 'v1.1.8', false ],
      [ 'v2.0.0-rc.1', true ],
    ]);

    for ( const args of versions ) {
      assertVersion(name, ...args);
    }
  });

  it('getRevs: repo per bundle ', async function () {
    const repo = 'git@github.com:user';
    const name = 'dummy';
    const [ , revs ] = rawRevs.single;
    sandbox = fakeSpawn(function onspawn(cmd, args=[], _options) {
      assert.strictEqual(cmd, 'git', `command should be 'git'`);
      assert.strictEqual(args[0], 'ls-remote', `git command should be 'ls-remote'`);
      const { stdout } = this;
      for (const rev of revs) {
        stdout.write(rev+'\n');
      }
      stdout.end();
    });
    const [ gitUrl, singleRepo, orevs ] = await getRevs(repo, name, { tags: true, branches: true });
    assert.notStrictEqual(gitUrl, repo, `${gitUrl} and ${repo} should not be same`);
    assert(gitUrl.startsWith(repo), `${gitUrl} should startWith ${repo}`);
    assert(gitUrl.endsWith(`${name}.git`), `${gitUrl} should endsWith ${name}.git`);
    assert.strictEqual(singleRepo, false, 'expect unique repo per bundle');
    assert.strictEqual(revs.length, orevs.size, 'expect count of raw revs should be same as output revs ');
    let idx = 0;
    for ( const orev of orevs ) {
      const { ref, rawRef } = orev;
      assert(ref, `ref should have a value`);
      assert(revs[idx++].endsWith(rawRef), `rawRef should be pary of original revision`);
    }
  });

  it('getRevs: repo for multiple bundles', async function () {
    const repo = 'git@github.com:user/repo.git';
    const [ names, revs ] = rawRevs.multi;

    sandbox = fakeSpawn(function onspawn(cmd, args=[], _options) {
      assert.strictEqual(cmd, 'git', `command should be 'git'`);
      assert.strictEqual(args[0], 'ls-remote', `git command should be 'ls-remote'`);
      const { stdout } = this;
      for (const rev of revs) {
        stdout.write(rev+'\n');
      }
      stdout.end();
    });

    async function execute(repo, name, revs) {
      const [ gitUrl, singleRepo, orevs ] = await getRevs(repo, name, { tags: true, branches: true });
      assert.strictEqual(gitUrl, repo, `${gitUrl} and ${repo} should be same`);
      assert.strictEqual(singleRepo, true, 'expect one repo for multiple bundle');
      assert.strictEqual(revs.length, orevs.size, 'expect count of raw revs should be same as output revs ');
      let idx = 0;
      for ( const orev of orevs ) {
        const { ref, rawRef } = orev;
        assert(ref, `ref should have a value`);
        assert(revs[idx++].endsWith(rawRef), `rawRef should be pary of original revision`);
      }
    }
    for ( const name of names ) {
      await execute(repo, name, revs);
    }
  });

  it('getRevs: test repo urls', async function () {
    sandbox = fakeSpawn(function onspawn(_cmd, _args=[], _options) {
      this.stdout.end(); // just end the spawn
    });
    const repos = [
      [ 'git@github.com:user1/repo.git', 'dummy', true ],
      [ 'git@github.com:user2/repo', 'dummy', true ],
      [ 'git@github.com:user3/', 'dummy', false ],
      [ 'git@github.com:user4', 'dummy', false ],
      [ 'https://github.com/user6/repo.git', 'dummy', true ],
      [ 'https://github.com/user7/repo', 'dummy', true ],
      [ 'https://github.com/user8/', 'dummy', false ],
      [ 'https://github.com/user9', 'dummy', false ],
    ];
    async function execute(repo, name, expectedSingleRepo) {
      const [ gitUrl, singleRepo, ] = await getRevs(repo, name, { tags: true, branches: true });
      if (expectedSingleRepo) {
        assert.strictEqual(gitUrl, repo, `${gitUrl} and ${repo} should be same`);
        assert.strictEqual(singleRepo, true, 'expect one repo for multiple bundle');
      } else {
        assert.notStrictEqual(gitUrl, repo, `${gitUrl} and ${repo} should not be same`);
        assert(gitUrl.startsWith(repo), `${gitUrl} should startWith ${repo}`);
        assert(gitUrl.endsWith(`${name}.git`), `${gitUrl} should endsWith ${name}.git`);
      }
    }
    for ( const args of repos ) {
      await execute(...args);
    }
  });

  it('clone: test targetDir', async function () {
    sandbox = fakeSpawn(function onspawn(cmd, args=[], _options) {
      assert.strictEqual(cmd, 'git', `command should be 'git'`);
      assert.strictEqual(args[0], 'clone', `git command should be 'clone'`);
      this.stdout.end(); // just end the spawn
    });
    const repos = [
      [ 'git@github.com:user/repo.git', 'v1.2.1', undefined, undefined, path.resolve(process.cwd(), 'v1.2.1') ],
      [ 'git@github.com:user/repo.git', 'v1.2.2', undefined, __dirname, path.resolve(__dirname, 'v1.2.2') ],
      [ 'git@github.com:user/repo.git', 'v1.2.3', '1.2.3', undefined, path.resolve(process.cwd(), '1.2.3') ],
      [ 'git@github.com:user/repo.git', 'v1.2.4', '1.2.4', __dirname, path.resolve(__dirname, '1.2.4') ],
      [ 'git@github.com:user/repo.git', 'v1.2.5', path.resolve(__dirname, '1.2.5'), undefined, path.resolve(__dirname, '1.2.5') ],
      [ 'git@github.com:user/repo.git', 'v1.2.6', path.resolve(__dirname, '1.2.6'), process.cwd(), path.resolve(__dirname, '1.2.6') ],
    ];
    async function execute(repo, ref, targetDir, cwd, expectedOutDir) {
      const outdir = await clone(repo, { ref, targetDir, cwd });
      assert.strictEqual(outdir, expectedOutDir, `outdir should be ${expectedOutDir}`);
    }
    for ( const args of repos ) {
      await execute(...args);
    }
  });

});