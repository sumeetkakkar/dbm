'use strict';

const path = require('path');
const { promises: fsPromises, constants: fsConstants } = require('fs');
const { 
  getInstallDir,
  installPackages,
  setCurrent,
} = require('../../bundle/common');

const logger = require('../../logger');

const Base = require('../_base');

class Install extends Base {
  static get name() {
    return 'install';
  }
  static get command() {
    return 'install <bundle> [version]';
  }
  static get description() {
    return 'Install version of the bundle';
  }

  static get aliases() {
    return [ 'i' ];
  }

  static get opts() {
    return [
      { flags: '-t --tag <tag>', description: 'Tag to use', defaultValue: '' }, // enpty tag
    ];
  }

  async _run(store, config, bundleName, bundleVer) {
    const rootdir = config.get('rootdir');
    const tag = config.get('tag');
    // Just in case the verion is part of the bundleName
    const [ name, ver ] = bundleName.split('@');
    const version = bundleVer || ver;

    logger.debug(`Querying bundle ${name}${version ? ` version:${version}` : ''}${tag ? ` tag:${tag}` : ''}`);

    const bundle = await store.queryBundle(name, { version, tag });

    if (!bundle) {
      logger.error(`Bundle ${name} does not exist!`);
      return false;
    }

    if (!Array.isArray(bundle.versions) || bundle.versions.length === 0) {
      logger.error(`No candidate version found for bundle ${name}!`);
      return false;
    }

    const bundleVersion = bundle.versions[0];

    logger.info(`Installing bundle ${bundle.name}@${bundleVersion.version}`);

    const targetDir = getInstallDir(rootdir, bundle.name, bundleVersion.version);

    let exists = false;
    try {
      await fsPromises.access(targetDir, fsConstants.F_OK);
      logger.warn(`Bundle already installed under ${targetDir}.`);
      logger.info(`Updating it with newer files!`);
      exists = true;
      // return true;
    } catch(ex) {
      if (ex.code !== 'ENOENT') {
        throw new Error(`Error accessing ${targetDir} [${ex.code} - ${ex.message}]`);
      }
    }

    await fsPromises.mkdir(targetDir, { recursive: true });

    const result = await store.installBundle(bundle, bundleVersion, { targetDir, exists });

    if (result === false) {
      logger.warn('Bundle installation skipped');
    }

    // Check package-lock.json and run `npm ci`
    try {
      await fsPromises.access(path.join(targetDir, 'package-lock.json'), fsConstants.F_OK);
      logger.info(`Installing packages`);
      await installPackages({ basedir: targetDir });
    } catch(ex) {
      if (ex.code !== 'ENOENT') {
        throw new Error(`Error accessing package-lock.json under ${targetDir} [${ex.code} - ${ex.message}]`);
      }
    }

    // Set this as current version. Do not overwrite.
    await setCurrent(targetDir, { overwrite: true });

    logger.info(`Bundle install under ${targetDir} complete`);

    return true;
  }
}

module.exports = Install;
