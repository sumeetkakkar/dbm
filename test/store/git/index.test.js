'use strict';
const assert = require('assert');
const path = require('path');
const GitStore = require('../../../lib/bundle/store/git');
const { getConfig, _clearConfig } = require('../../../lib/config');
const Bundle = require('../../../lib/bundle/model/bundle');
const BundleVersion = require('../../../lib/bundle/model/bundle-version');
const fakeSpawn = require('./fixtures/fake-spawn');
const rawRevs = require('./fixtures/raw-revs');

describe('store:git -> index', function () {
  let sandbox;

  before(function () {
    _clearConfig();
  });

  afterEach(function () {
    _clearConfig();
    if (sandbox) sandbox.restore();
    sandbox = undefined;
  });

  it('installBundle: singleRepo=false', async function () {
    const [ name, revs ] = rawRevs.single;
    const ver = 'v1.0.0';
    const repo = 'git@github.com:user';
    const installdir = process.cwd();
    const targetDir =  path.resolve(installdir, name, ver);

    const store = new GitStore();
    const config = await getConfig({ repo });
    config.extendSpecs(store.configSpecs);
    await store.init(config);

    sandbox = fakeSpawn(function onspawn(cmd, args=[], _options) {
      assert.strictEqual(cmd, 'git', `command should be 'git'`);
      const { stdout } = this;
      switch (args[0]) {
        case 'clone':
          assert.strictEqual(args[1], `${repo}/${name}.git`, `repo url should be complete git url`);
          assert.strictEqual(args[args.length-1], targetDir, `install dir should have expected value`);
          break;
        case 'ls-remote':
          for (const rev of revs) {
            stdout.write(rev+'\n');
          }
          break;
      }
      stdout.end();
    });

    const bundle = new Bundle({ name });
    const bundleVersion = new BundleVersion({ version: ver });
    const result = await store.installBundle(bundle, bundleVersion, { targetDir });
    assert.strictEqual(result, targetDir, `output dir should have expected value`);
  });

  it('installBundle: singleRepo=false - invalid version', async function () {
    const [ name, revs ] = rawRevs.single;
    const ver = '1.0.0';
    const repo = 'git@github.com:user';
    const installdir = process.cwd();
    const targetDir =  path.resolve(installdir, name, ver);

    const store = new GitStore();
    const config = await getConfig({ repo });
    config.extendSpecs(store.configSpecs);
    await store.init(config);

    sandbox = fakeSpawn(function onspawn(cmd, args=[], _options) {
      assert.strictEqual(cmd, 'git', `command should be 'git'`);
      assert.notStrictEqual(args[0], 'clone', `should not execute clone`);
      const { stdout } = this;
      switch (args[0]) {
        case 'ls-remote':
          for (const rev of revs) {
            stdout.write(rev+'\n');
          }
          break;
      }
      stdout.end();
    });

    const bundle = new Bundle({ name });
    const bundleVersion = new BundleVersion({ version: ver });
    let error;
    try {
      await store.installBundle(bundle, bundleVersion, { targetDir });
    } catch(ex) {
      error = ex;
    }
    assert(error, `should throw error`);
    assert.match(error.message, /not found/, `should throw "not found" error`);
  });

  it('installBundle: singleRepo=true', async function () {
    const [ , revs ] = rawRevs.multi;
    const name = 'dummy03';
    const ver = 'v1.0.0-rc.1';
    const repo = 'git@github.com:user/repo.git';
    const installdir = process.cwd();
    const targetDir =  path.resolve(installdir, name, ver);

    const store = new GitStore();
    const config = await getConfig({ repo });
    config.extendSpecs(store.configSpecs);
    await store.init(config);

    sandbox = fakeSpawn(function onspawn(cmd, args=[], _options) {
      assert.strictEqual(cmd, 'git', `command should be 'git'`);
      const { stdout } = this;
      switch (args[0]) {
        case 'clone':
          assert.strictEqual(args[1], repo, `repo url should be complete git url`);
          assert.strictEqual(args[args.length-1], targetDir, `install dir should have expected value`);
          break;
        case 'ls-remote':
          for (const rev of revs) {
            stdout.write(rev+'\n');
          }
          break;
      }
      stdout.end();
    });

    const bundle = new Bundle({ name });
    const bundleVersion = new BundleVersion({ version: ver });
    const result = await store.installBundle(bundle, bundleVersion, { targetDir });
    assert.strictEqual(result, targetDir, `output dir should have expected value`);
  });

  it('queryBundle: singleRepo=false, version filter', async function () {
    const [ name, revs ] = rawRevs.single;
    const version = 'v1.0.0';
    const repo = 'git@github.com:user';

    const store = new GitStore();
    const config = await getConfig({ repo });
    config.extendSpecs(store.configSpecs);
    await store.init(config);

    sandbox = fakeSpawn(function onspawn(cmd, args=[], _options) {
      assert.strictEqual(cmd, 'git', `command should be 'git'`);
      const { stdout } = this;
      switch (args[0]) {
        case 'ls-remote':
          for (const rev of revs) {
            stdout.write(rev+'\n');
          }
          break;
      }
      stdout.end();
    });

    const bundle = await store.queryBundle(name, { version });
    assert(bundle, `returned value should be a bundle`);
    assert.strictEqual(bundle.name, name, `name in the bundle should be valid`);
    assert(Array.isArray(bundle.versions), `should contain versions array`);
    assert.strictEqual(bundle.versions.length, 1, `should return one matching version`);
    assert.strictEqual(bundle.versions[0].version, version, `version should match the version`);
    assert.strictEqual(bundle.versions[0].ref, version, `ref should match the version`);
  });

  it('queryBundle: singleRepo=false, invalid version filter', async function () {
    const [ name, revs ] = rawRevs.single;
    const version = '1.0.0';
    const repo = 'git@github.com:user';

    const store = new GitStore();
    const config = await getConfig({ repo });
    config.extendSpecs(store.configSpecs);
    await store.init(config);

    sandbox = fakeSpawn(function onspawn(cmd, args=[], _options) {
      assert.strictEqual(cmd, 'git', `command should be 'git'`);
      const { stdout } = this;
      switch (args[0]) {
        case 'ls-remote':
          for (const rev of revs) {
            stdout.write(rev+'\n');
          }
          break;
      }
      stdout.end();
    });

    const bundle = await store.queryBundle(name, { version });
    assert(bundle, `returned value should be a bundle`);
    assert.strictEqual(bundle.name, name, `name in the bundle should be valid`);
    assert(Array.isArray(bundle.versions), `should contain versions array`);
    assert.strictEqual(bundle.versions.length, 0, `should not return any matching version`);
  });

  it('queryBundle: singleRepo=false, range version filter', async function () {
    const [ name, revs ] = rawRevs.single;
    const version = '1';
    const expectedVersion = 'v1.0.6';
    const repo = 'git@github.com:user';

    const store = new GitStore();
    const config = await getConfig({ repo });
    config.extendSpecs(store.configSpecs);
    await store.init(config);

    sandbox = fakeSpawn(function onspawn(cmd, args=[], _options) {
      assert.strictEqual(cmd, 'git', `command should be 'git'`);
      const { stdout } = this;
      switch (args[0]) {
        case 'ls-remote':
          for (const rev of revs) {
            stdout.write(rev+'\n');
          }
          break;
      }
      stdout.end();
    });

    const bundle = await store.queryBundle(name, { version });
    assert(bundle, `returned value should be a bundle`);
    assert.strictEqual(bundle.name, name, `name in the bundle should be valid`);
    assert(Array.isArray(bundle.versions), `should contain versions array`);
    assert(bundle.versions.length > 1, `should return multiple matching version [${bundle.versions.length}]`);
    assert.strictEqual(bundle.versions[0].version, expectedVersion, `version should match the version`);
    assert.strictEqual(bundle.versions[0].ref, expectedVersion, `ref should match the version`);
  });

  it('queryBundle: singleRepo=false, invalid name', async function () {
    const name = 'invalid';
    const repo = 'git@github.com:user';

    const store = new GitStore();
    const config = await getConfig({ repo });
    config.extendSpecs(store.configSpecs);
    await store.init(config);

    sandbox = fakeSpawn(function onspawn(cmd, args=[], _options) {
      assert.strictEqual(cmd, 'git', `command should be 'git'`);
      const { stdout, stderr } = this;
      switch (args[0]) {
        case 'ls-remote':
          stderr.end(name);
          return;
      }
      stdout.end();
    });

    const bundle = await store.queryBundle(name);
    assert.strictEqual(bundle, undefined, `returned value should be undefined`);
  });

  it('queryBundle: singleRepo=true, version filter', async function () {
    const [ , revs ] = rawRevs.multi;
    const name = 'dummy03';
    const version = 'v1.0.0-rc.1';
    const repo = 'git@github.com:user/repo.git';

    const store = new GitStore();
    const config = await getConfig({ repo });
    config.extendSpecs(store.configSpecs);
    await store.init(config);

    sandbox = fakeSpawn(function onspawn(cmd, args=[], _options) {
      assert.strictEqual(cmd, 'git', `command should be 'git'`);
      const { stdout } = this;
      switch (args[0]) {
        case 'ls-remote':
          for (const rev of revs) {
            stdout.write(rev+'\n');
          }
          break;
      }
      stdout.end();
    });

    const bundle = await store.queryBundle(name, { version });
    assert(bundle, `returned value should be a bundle`);
    assert.strictEqual(bundle.name, name, `name in the bundle should be valid`);
    assert(Array.isArray(bundle.versions), `should contain versions array`);
    assert.strictEqual(bundle.versions.length, 1, `should return one matching version`);
    assert.strictEqual(bundle.versions[0].version, version, `version should match the version`);
    assert.strictEqual(bundle.versions[0].ref, 'dummy03/v1.0.0-rc.1', `ref should have proper git ref`);
  });

  it('queryBundle: singleRepo=true', async function () {
    const [ , revs ] = rawRevs.multi;
    const repo = 'git@github.com:user/repo.git';

    const store = new GitStore();
    const config = await getConfig({ repo });
    config.extendSpecs(store.configSpecs);
    await store.init(config);

    sandbox = fakeSpawn(function onspawn(cmd, args=[], _options) {
      assert.strictEqual(cmd, 'git', `command should be 'git'`);
      const { stdout } = this;
      switch (args[0]) {
        case 'ls-remote':
          for (const rev of revs) {
            stdout.write(rev+'\n');
          }
          break;
      }
      stdout.end();
    });
    const repos = [
      [ 'dummy-1', 'v0.6.2', 'dummy-1/v0.6.2', ],
      [ 'dummy_2', 'v0.7.1', 'v0.7.1-dummy_2', ],
      [ 'dummy03', 'v1.0.0-rc.1', 'dummy03/v1.0.0-rc.1', ],
    ];

    async function execute(name, version, ref) {
      const bundle = await store.queryBundle(name);
      assert(bundle, `returned value should be a bundle [${name}]`);
      assert.strictEqual(bundle.name, name, `name in the bundle should be valid`);
      assert(Array.isArray(bundle.versions), `should contain versions array [${name}]`);
      assert(bundle.versions.length > 1, `should return multiple matching versions [${name}]`);
      assert.strictEqual(bundle.versions[0].version, version, `version should match the version [${name}]`);
      assert.strictEqual(bundle.versions[0].ref, ref, `ref should match the ref [${name}]`);
    }

    for ( const args of repos ) {
      await execute(...args);
    }
  });

  it('queryBundle: singleRepo=false with tag', async function () {
    const [ , revs ] = rawRevs.single;
    const repo = 'git@github.com:user';

    const store = new GitStore();
    const config = await getConfig({ repo });
    config.extendSpecs(store.configSpecs);
    await store.init(config);

    sandbox = fakeSpawn(function onspawn(cmd, args=[], _options) {
      assert.strictEqual(cmd, 'git', `command should be 'git'`);
      const { stdout } = this;
      switch (args[0]) {
        case 'ls-remote':
          for (const rev of revs) {
            stdout.write(rev+'\n');
          }
          break;
      }
      stdout.end();
    });
    const repos = [
      [ 'dummy', 'latest', 'master', ],
      [ 'dummy', 'master', 'master', ],
      [ 'dummy', 'v2.x', 'v2.x', ],
    ];

    async function execute(name, tag, ref) {
      const bundle = await store.queryBundle(name, { tag });
      assert(bundle, `returned value should be a bundle [${name}]`);
      assert.strictEqual(bundle.name, name, `name in the bundle should be valid`);
      assert(Array.isArray(bundle.versions), `should contain versions array [${name}]`);
      assert.strictEqual(bundle.versions.length,  1, `should return one matching version [${name}]`);
      assert.strictEqual(bundle.versions[0].version, ref, `version should match the ref [${name}]`);
      assert.strictEqual(bundle.versions[0].ref, ref, `ref should match the ref [${name}]`);
    }

    for ( const args of repos ) {
      await execute(...args);
    }
  });

  it('queryBundle: singleRepo=true with tag', async function () {
    const [ , revs ] = rawRevs.multi;
    const repo = 'git@github.com:user/repo.git';

    const store = new GitStore();
    const config = await getConfig({ repo });
    config.extendSpecs(store.configSpecs);
    await store.init(config);

    sandbox = fakeSpawn(function onspawn(cmd, args=[], _options) {
      assert.strictEqual(cmd, 'git', `command should be 'git'`);
      const { stdout } = this;
      switch (args[0]) {
        case 'ls-remote':
          for (const rev of revs) {
            stdout.write(rev+'\n');
          }
          break;
      }
      stdout.end();
    });
    const repos = [
      [ 'dummy-1', 'latest', 'dummy-1', ],
      [ 'dummy_2', 'latest', 'dummy_2', ],
      [ 'dummy03', 'latest', 'dummy03', ],
      [ 'dummy-v2.x', 'v2.x-fix-some-defect', 'v2.x-fix-some-defect', ],
    ];

    async function execute(name, tag, ref) {
      const bundle = await store.queryBundle(name, { tag });
      assert(bundle, `returned value should be a bundle [${name}]`);
      assert.strictEqual(bundle.name, name, `name in the bundle should be valid`);
      assert(Array.isArray(bundle.versions), `should contain versions array [${name}]`);
      assert.strictEqual(bundle.versions.length,  1, `should return one matching version [${name}]`);
      assert.strictEqual(bundle.versions[0].version, ref, `version should match the ref [${name}]`);
      assert.strictEqual(bundle.versions[0].ref, ref, `ref should match the ref [${name}]`);
    }

    for ( const args of repos ) {
      await execute(...args);
    }
  });

});