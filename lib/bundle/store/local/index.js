'use strict';
const assert = require('assert');
const path = require('path');
const { promises: fsPromises } = require('fs');
const Store = require('../_base');
const Bundle = require('../../model/bundle');
const BundleVersion = require('../../model/bundle-version');
const logger = require('../../../logger');
const { 
  buildBundle,
  installBundle,
} = require('../../tar-utils');

const configSpecs = require('./config-specs');

const {
  createBundle,
  updateBundleMeta,
  createBundleVersion,
  updateBundleVersion,
  updateBundleVersionMeta,
  deleteBundleVersion,
  loadBundle,
  getBundleByName,
  getBundles,
  getBundleVersion,
  getBundleVersions,
} = require('./helper');

const _basedir = Symbol('basedir');

const DEFAULT_BASEDIR = path.resolve(process.cwd(), '.store');

class LocalStore extends Store {
  /**
   * Init config store
   * @param {Object} config 
   */
  // async init({ basedir=DEFAULT_BASEDIR } = {}) {
  async init(config) {
    const basedir = config.get('repo') || DEFAULT_BASEDIR;
    logger.debug(`Using LocalStore [${basedir}]`);
    this[_basedir] = basedir;
    // use recursive. no errors even if the basedir exists
    await fsPromises.mkdir(basedir, { recursive: true });
  }

  /**
   * Store specific config specs
   */
  get configSpecs() {  return [ ...configSpecs ]; }

  /**
   * Base Path
   */
  get basedir() { return this[_basedir]; }

  /**
   * Close config store
   */
  async close() {
    logger.debug(`LocalStore:close`);
  }

  /**
   * Create bundle
   * @param {Bundle} bundle 
   */
  createBundle(bundle)  { 
    return createBundle(this[_basedir], bundle.name, bundle);
  }

  /**
   * Saves a new bundle version
   * @param {Bundle} bundle 
   * @param {BundleVersion} version 
   * @param {Object} options 
   */
  async saveBundleVersion(bundle, ver, options) {
    logger.debug(`LocalStore:updateBundleVersion`);
    const bstrm = await buildBundle(options);

    const created = await createBundleVersion(this[_basedir], bundle.name, ver.version, ver, bstrm);
    if (created) {
      if (ver.tag) {
        if (!bundle.tags) bundle.tags = {};
        bundle.tags[ver.tag] = ver.version;
        const tagged = await updateBundleMeta(this[_basedir], bundle.name, bundle);
        if (!tagged) {
          logger.error('Error setting tag!');
        }
      }
    }
    return created;
  }

  /**
   * Update an existing bundle version
   * @param {Bundle} bundle 
   * @param {BundleVersion} ver
   * @param {Object} options 
   */
  async updateBundleVersion(bundle, ver, options) {
    logger.debug(`LocalStore:updateBundleVersion`);
    const bstrm = await buildBundle(options);
    const vmeta = await getBundleVersion(this[_basedir], bundle.name, ver.version);
    if (!vmeta) {
      return this.createBundleVersion(bundle, ver, bstrm);
    }
    const updated = await updateBundleVersion(this[_basedir], bundle.name, ver.version, ver, bstrm);
    if (updated) {
      if (!bundle.tags) bundle.tags = {};
      let update = Boolean(ver.tag);
      if (vmeta.tag && vmeta.tag !== ver.tag) {
        delete bundle.tags[vmeta.tag];
        update = true;
      } 
      if (ver.tag && vmeta.tag !== ver.tag) {
        bundle.tags[ver.tag] = ver.version;
        update = true;
      }
      if (update) {
        const tagged = await updateBundleMeta(this[_basedir], bundle.name, bundle);
        if (!tagged) {
          logger.error('Error applying tag changes!');
        }
      }
    }
    return updated;
  }

  /**
   * set tag
   * @param {Bundle} bundle 
   * @param {BundleVersion} ver 
   * @param {String} tag  New tag
   * @returns 
   */
  async setBundleVersionTag(bundle, ver, tag) {
    if (ver.tag === tag) {
      logger.info(`${bundle.name}@${ver.version} already tagged ${tag} - SKIPPING!`);
      return true;
    }
    const origtag = ver.tag;
    ver.tag = tag;
    const updated = await updateBundleVersionMeta(this[_basedir], bundle.name, ver.version, ver);
    if (!updated) {
      logger.error('Error updating tag!');
      return false;
    }
    if (bundle.tags) {
      if (origtag) delete bundle.tags[origtag];
    } else {
      bundle.tags = {};
    }
    if (tag) bundle.tags[tag] = ver.version;
    const tagged = await updateBundleMeta(this[_basedir], bundle.name, bundle);
    if (!tagged) {
      logger.error('Error setting tag!');
    }
    return tagged;
  }

  /**
   * Delete bundle
   * @param {Bundle} bundle 
   * @param {BundleVersion} ver
   */
  async deleteBundleVersion(bundle, ver) {
    const deleted = await deleteBundleVersion(this[_basedir], bundle.name, ver.version); 
    if (bundle.tags && ver.tag && bundle.tags[ver.tag] === ver.version) {
      delete bundle.tags[ver.tag];
      const updated = await updateBundleMeta(this[_basedir], bundle.name, bundle);
      if (!updated) {
        logger.error('Error untagging version!');
      }
    }
    return deleted;
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
    logger.debug('LocalStore: installBundle', bundle.name, ver.version);
    assert(targetDir, `Target directory is required to install the bundle`);
    const strm = loadBundle(this[_basedir], bundle.name, ver.version);
    if (strm && typeof strm.pipe === 'function') {
      if (exists) {
        logger.warn(`WARN Bundle ${bundle.name}@${ver.version} exists under ${targetDir}. Content will be applied over existing content.`);
      }
      // it's a stream. handle it as a tar stream
      await installBundle(strm, targetDir);
      return targetDir;
    }
    return false;
  }

  /**
   * Query bundle by name.
   * @param {String} name 
   * @param {Object} Options - accepts version to load specific version, or tag to load versions with specific tag
   */
  async queryBundle(name, { version, tag }={}) {
    const meta = await getBundleByName(this[_basedir], name);
    if (!meta) {
      return meta;
    }
    const bundle = new Bundle(meta);
    if (version && tag) {
      if (bundle.tags) {
        version = bundle.tags[tag];
      }
      if (!version) {
        logger.warn(`No version found corresponding to tag ${tag} for ${name}`);
        return bundle;
      }
    }
    
    if (version) {
      const vmeta = await getBundleVersion(this[_basedir], name, version);
      if (!vmeta) {
        logger.warn(`Version ${version} does not exist for ${name}`);
        return bundle;
      }
      bundle.versions = [ new BundleVersion(vmeta) ];
    } else { // no filter, get all
      const versions = await getBundleVersions(this[_basedir], name) || [];
      bundle.versions = [];
      const latest = bundle.tags && bundle.tags.latest;
      for (const v of versions) {
        const ver = new BundleVersion(v);
        if (latest === v.version) {
          bundle.versions.unshift(ver);
        } else {
          bundle.versions.push(ver);
        }
      }
    }
    return bundle;
  }

  /**
   * List bundles
   * @param {Any} pattern 
   */
  async listBundles(pattern) {
    const filter = ((pattern) => {
      if (!pattern) return;
      switch (typeof pattern) {
        case 'function':
          return pattern;
        case 'string':
          return function match(expected, { name }) {
            return name.includes(expected);
          }.bind(null, pattern);
        default:
          if (pattern instanceof RegExp) {
            return function test(re, { name }) {
              return re.test(name);
            }.bind(null, pattern);
          }
          throw new TypeError(`Unsupported pattern - ${JSON.stringify(pattern)}`);
      }
    })(pattern);
    let bundles = await getBundles(this[_basedir]);
    if (filter) {
      bundles = bundles.filter(filter);
    }
    return bundles.map(meta => new Bundle(meta));
  }
}

module.exports = LocalStore;