'use strict';
const assert = require('assert');
const path = require('path');
const cp = require('child_process');
const { promisify } = require('util');
const { promises: fsPromises } = require('fs');
const {
  createBundle,
  updateBundleMeta,
  createBundleVersion,
  updateBundleVersion,
  // updateBundleVersionMeta,
  deleteBundleVersion,
  loadBundle,
  getBundleByName,
  getBundles,
  getBundleVersions,
} = require('../../../lib/bundle/store/local/helper');
const { buildBundle } = require('../../../lib/bundle/tar-utils');

const exec = promisify(cp.exec);

require('../../../lib/logger').setVerbose();

const {
  getRootDir
} = require('../../fixtures/utils');

describe('store:local -> helper', function () {
  let basedir;
  before(async function () {
    const rootDir = await getRootDir();
    basedir = await fsPromises.mkdtemp(path.join(rootDir, 'local-helper-'));
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
    let result, bstrm;
    result = await createBundle(basedir, name);
    assert.strictEqual(result, true, 'createBundle should succeed');

    bstrm = await buildBundle({ basedir: path.resolve(__dirname, '..', '..', '..')});
    assert(bstrm && bstrm.pipe, `buildBundle should return stream`);

    result = await createBundleVersion(basedir, name, ver, {}, bstrm);
    assert.strictEqual(result, true, 'createBundleVersion should succeed');

    const bun = await getBundleByName(basedir, name);
    assert.strictEqual(bun && bun.name, name, 'getBundleByName should succeed');

    result = await updateBundleMeta(basedir, name, { ...bun, tags: { 'latest': ver } });
    assert.strictEqual(result, true, 'updateBundleMeta should succeed');

    bstrm = await buildBundle({ basedir: path.resolve(__dirname, '..', '..', '..')});

    result = await updateBundleVersion(basedir, name, ver, { updated: new Date().toJSON() }, bstrm);
    assert.strictEqual(result, true, 'updateBundleVersion should succeed');

    const bundles = await getBundles(basedir);
    assert.strictEqual(Array.isArray(bundles), true, `getBundles should return array of bundles`);
    for(const { name: bundle } of bundles) {
      assert.strictEqual(bundle, name, `bundle name should contain expected value`);
      const versions = await getBundleVersions(basedir, bundle);
      assert.strictEqual(Array.isArray(versions), true , `bundle versions should be an array`);
    }

    const strm = await loadBundle(basedir, name, ver);
    assert(strm && strm.pipe, `loadBundle should return stream`);

    result = await deleteBundleVersion(basedir, name, ver);
    assert.match(result, new RegExp(`^${ver}_DELETED_`), 'deleteBundleVersion should succeed');
  });
});