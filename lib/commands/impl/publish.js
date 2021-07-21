'use strict';

const logger = require('../../logger');

const Bundle = require('../../bundle/model/bundle');
const BundleVersion = require('../../bundle/model/bundle-version');

const {
  getMeta,
  installPackages,
} = require('../../bundle/common');

const Base = require('../_base');

/**
 * Build and publish a bundle version
 */
class Publish extends Base {
  static get name() {
    return 'publish';
  }
  static get command() {
    return 'publish';
  }
  static get description() {
    return 'Publish version of the bundle';
  }

  static get opts() {
    return [
      { flags: '-d --dir <basedir>', description: 'base directory of the dependency bundle project', defaultValue: process.cwd() },
    ];
  }

  /**
   * Disable command
   */
  static get disabled() { return true; }

  async _run(store, config) {
    const basedir = config.get('basedir');
    
    const options = { basedir };
    const { name, version } = getMeta(options);
    logger.info(`Publishing bundle ${name}@${version}`);
    
    const bundle = new Bundle({ name });
    const tag = config.get('tag');
    const bundleVersion = new BundleVersion({ version, tag });

    logger.info(`Installing packages`);
    await installPackages(options);

    logger.info(`Check and initiate Bundle "${name}"`);
    const created = await store.createBundle(bundle);
    if (created) {
      logger.info(`Bundle initiated "${name}"`);
    }

    logger.info(`Save bundle version`);
    const result = await store.saveBundleVersion(bundle, bundleVersion, options);
    if (result) {
      logger.info(`${name}@${version} published successfully!`);
    } else {
      logger.error(`Unable to publishing ${name}@${version}. Please check whether it is already published!`);
    }
    return result;
  }
}

module.exports = Publish;