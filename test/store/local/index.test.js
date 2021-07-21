'use strict';
const assert = require('assert');
const path = require('path');
const cp = require('child_process');
const { promisify } = require('util');
const { promises: fsPromises } = require('fs');
const LocalStore = require('../../../lib/bundle/store/local');
const { getConfig } = require('../../../lib/config');
const Bundle = require('../../../lib/bundle/model/bundle');
const BundleVersion = require('../../../lib/bundle/model/bundle-version');
const { getInstallDir } = require('../../../lib/bundle/common');

const exec = promisify(cp.exec);

require('../../../lib/logger').setVerbose();

const {
  getRootDir
} = require('../../fixtures/utils');

describe('store:local -> index', function () {
  let basedir;
  before(async function () {
    const rootDir = await getRootDir();
    basedir = await fsPromises.mkdtemp(path.join(rootDir, 'local-index-'));
  });

  after(async function () {
    if (basedir) {
      try {
        await fsPromises.rmdir(basedir, { recursive: true, force: true });
        // await fsPromises.rm(basedir, { recursive: true, force: true });
      } catch (ex) {
        console.error(`Error deleting dir ${basedir}`, ex);
        if (basedir) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          await exec(`rm -rf ${basedir}`);
        }
      }
    }
  });

  it('lifecycle', async function () {
    this.timeout(10000);
    const name = 'dummy';
    const ver = '1.0.0';
    const bundle = new Bundle({ name });
    const bundleVersion = new BundleVersion({ version: ver, tag: 'beta01' });

    let result;
    const store = new LocalStore();
    const config = await getConfig({ repo: basedir });
    config.extendSpecs(store.configSpecs);
    await store.init(config);

    result = await store.createBundle(bundle);
    assert.strictEqual(result, true, 'createBundle should succeed');
    // const bun = await store.getBundleByName(name);

    const bundleOptions = { basedir: path.resolve(__dirname, '..', '..', '..') };

    result = await store.saveBundleVersion(bundle, bundleVersion, bundleOptions);
    assert.strictEqual(result, true, 'saveBundleVersion should succeed');

    let bun = await store.queryBundle(name);
    assert.strictEqual(bun && bun.name, name, 'queryBundle should succeed');

    result = await store.setBundleVersionTag(bun, bun.versions[0], 'beta02');
    assert.strictEqual(result, true, 'setBundleVersion should succeed');

    const prevTS = bun.ts;
    bun = await store.queryBundle(name);
    assert.strictEqual(bun && Array.isArray(bun.versions), true, 'bundle returned by queryBundle should contains "versions" array');

    result = await store.updateBundleVersion(bun, bun.versions[0], bundleOptions);
    assert.strictEqual(result, true, 'updateBundleVersion should succeed');

    const bundles = await store.listBundles();
    assert.strictEqual(Array.isArray(bundles), true, `listBundles should return array of bundles`);
    for(const { name: bundle, versions } of bundles) {
      assert.strictEqual(bundle, name, `bundle name should contain expected value`);
      assert.strictEqual(Array.isArray(versions), true , `bundle versions should be an array`);
    }

    const targetDir = getInstallDir(path.join(basedir, 'install'), bundle.name, bundleVersion.version);
    await fsPromises.mkdir(targetDir, { recursive: true });
    const output = await store.installBundle(bundle, bundleVersion, { targetDir, exists: false });
    assert.strictEqual(output, targetDir, `installBundle should return targetDir where the bundle was installed`);

    try {
      fsPromises.access(path.join(output, 'package.json'));
    } catch (ex) {
      if (ex.code === 'ENOENT') {
        assert.fail(`${output} directory should contain package.json`);
      }
    }

    bun = await store.queryBundle(name);
    assert.strictEqual(bun && bun.ts, prevTS+1, 'queryBundle should return bundle with incremented timestamp');
    result = await store.deleteBundleVersion(bun, bun.versions[0]);
    assert.match(result, new RegExp(`^${ver}_DELETED_`), 'deleteBundleVersion should succeed');
  });
});