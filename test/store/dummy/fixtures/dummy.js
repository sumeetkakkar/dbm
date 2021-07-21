'use strict';
const assert = require('assert');
const path = require('path');
const { promises: fsPromises } = require('fs');
const { Store } = require('../../../../');
const Bundle = require('../../../../lib/bundle/model/bundle');
const BundleVersion = require('../../../../lib/bundle/model/bundle-version');
const logger = require('../../../../lib/logger');

const _repo = Symbol('repo');

class DummyStore extends Store {
  /**
   * Init config store
   * @param {Object} config 
   */
  async init(config) {
    const repo = config.get('repo');
    logger.debug(`Using DummyStore [${repo}]`);
    this[_repo] = repo;
  }

  /**
   * Repo
   */
  get repo() { return this[_repo]; }

  /**
   * Store specific config specs
   */
  get configSpecs() {  return [ { name: 'repo' } ]; }

  /**
   * Close config store
   */
  async close() {
    logger.debug(`DummyStore:close`);
  }

  /**
   * Create bundle
   * @param {Bundle} bundle 
   */
  async createBundle(_bundle)  {
    logger.warn(`DummyStore:createBundle should not be called`);
    throw new Error(`DummyStore:createBundle not applicable`);
  }

  /**
   * Saves a new bundle version
   * @param {Bundle} bundle 
   * @param {BundleVersion} version 
   * @param {Object} options 
   */
  async saveBundleVersion(_bundle, _ver, _options) {
    logger.warn(`DummyStore:saveBundleVersion should not be called`);
    throw new Error(`DummyStore:saveBundleVersion not applicable`);
  }

  /**
   * Update an existing bundle version
   * @param {Bundle} bundle 
   * @param {BundleVersion} ver
   * @param {Object} options 
   */
  async updateBundleVersion(_bundle, _ver, _options) {
    logger.warn(`DummyStore:updateBundleVersion should not be called`);
    throw new Error(`DummyStore:updateBundleVersion not applicable`);
  }

  /**
   * set tag
   * @param {Bundle} bundle 
   * @param {BundleVersion} ver 
   * @param {String} tag New tag
   * @returns 
   */
  async setBundleVersionTag(_bundle, _ver, _tag) {
    logger.warn(`DummyStore:setBundleVersionTag should not be called`);
    throw new Error(`DummyStore:setBundleVersionTag not applicable`);
  }

  /**
   * Delete bundle
   * @param {Bundle} bundle 
   * @param {BundleVersion} ver
   */
  async deleteBundleVersion(_bundle, _ver) {
    logger.warn(`DummyStore:deleteBundleVersion should not be called`);
    throw new Error(`DummyStore:deleteBundleVersion not applicable`);
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
    logger.debug('DummyStore: installBundle', bundle.name, ver.version);
    if (exists) {
      logger.warn(`WARN Bundle ${bundle.name}@${ver.version} already cloned under ${targetDir}. SKIPPING!`);
      return false;
    }
    assert(targetDir, `Target directory is required to install the bundle`);

    const installPath = path.resolve(targetDir, 'node_modules', 'dummy');

    await fsPromises.mkdir(installPath, { recursive: true });

    const pkg = {
      name: bundle.name,
      version: ver.version,
      description: `${bundle.name} package`,
    };

    await fsPromises.writeFile(path.join(installPath, 'package.json'), JSON.stringify(pkg));

    process.stdout.write('DummyStore.installBundle'); // This is for tests to listen

    // TODO:
    return true;
  }

  /**
   * Query bundle by name.
   * @param {String} name 
   * @param {Object} Options - accepts version to load specific version, or tag to load versions with specific tag
   */
  async queryBundle(name, { version, tag }={}) {
    logger.debug('DummyStore: queryBundle', name, version);
    const bundle = new Bundle({ name });
    bundle.versions = [ new BundleVersion({ version: version||'1.0.0', ref: tag }) ];
    process.stdout.write('DummyStore.queryBundle'); // This is for tests to listen
    return bundle;
  }

  /**
   * List bundles
   * @param {Any} pattern 
   */
  async listBundles(_pattern) {
    logger.warn(`DummyStore:listBundles should not be called`);
    return [];
  }

}

module.exports = DummyStore;