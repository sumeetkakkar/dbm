'use strict';

/* eslint no-unused-vars: 0 */
class Store {
  /**
   * Init config store
   * @param {Object} config 
   */
  async init(config) {}

  /**
   * Close config store
   */
  async close() {}

  /**
   * Store specific config specs
   */
  get configSpecs() {  return []; }

  /**
   * Create bundle
   * @param {Bundle} bundle 
   */
  async createBundle(bundle)  { throw new Error('createBundle not implemented'); }

  /**
   * Saves a new bundle version
   * @param {Bundle} bundle 
   * @param {BundleVersion} version 
   * @param {Object} options 
   */
  async saveBundleVersion(bundle, ver, options) { throw new Error('saveBundleVersion not implemented'); }

  /**
   * Update an existing bundle version
   * @param {Bundle} bundle 
   * @param {BundleVersion} ver
   * @param {Object} options 
   */
  async updateBundleVersion(bundle, ver, options) { throw new Error('updateBundleVersion not implemented'); }

  /**
   * set tag
   * @param {Bundle} bundle 
   * @param {BundleVersion} ver 
   * @param {String} tag New tag
   * @returns 
   */
  async setBundleVersionTag(bundle, ver, tag) { throw new Error('setBundleVersionTag not implemented'); }

  /**
   * Delete bundle
   * @param {Bundle} bundle 
   * @param {BundleVersion} ver
   */
  async deleteBundleVersion(bundle, ver) { throw new Error('deleteBundleVersion not implemented'); }

  /**
   * Install bundle
   * @param {Bundle} bundle 
   * @param {BundleVersion} ver
   * @param {String} targetDir to save if the stream is not available
   * @param {Boolean} exists flag passed to store indicating the bundle version is already installed
   * @returns stream.Readable
   */
  async installBundle(bundle, ver, { targetDir, exists }) { throw new Error('installBundle not implemented'); }

  /**
   * Query bundle by name.
   * @param {String} name 
   * @param {Object} Options - accepts version to load specific version, or tag to load versions with specific tag
   */
  async queryBundle(name, { version, tag }={}) { throw new Error('queryBundle not implemented'); }

  /**
   * List bundles
   * @param {Any} pattern 
   */
  async listBundles(pattern) { throw new Error('listBundles not implemented'); }

}

module.exports = Store;