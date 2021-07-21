'use strict';

const path = require('path');
const semver = require('semver');
const { 
  getDefaultInstalledVersion,
  getLatestInstalledVersion,
} = require('../../bundle/common');

const logger = require('../../logger');

const Base = require('../_base');

async function getVersion(store, name, version) {

  logger.debug(`Querying bundle ${name}${version ? ` version:${version}` : ''}`);

  const bundle = await store.queryBundle(name, { version });

  if (!bundle) {
    logger.error(`Bundle ${name} does not exist!`);
    return false;
  }

  if (!Array.isArray(bundle.versions) || bundle.versions.length === 0) {
    logger.error(`No candidate version found for bundle ${name}!`);
    return false;
  }

  return bundle.versions[0];
}


class Path extends Base {
  static get name() {
    return 'path';
  }
  static get command() {
    return 'path <bundle> [version]';
  }
  static get description() {
    return 'Resolves path of the bundle version';
  }

  static get aliases() {
    return [ 'p' ];
  }

  static get opts() {
    return [
      { flags: '-c --check', description: 'Check whether the installed version is latest', defaultValue: false },
    ];
  }

  async _run(store, config, bundleName, bundleVer) {
    const rootdir = config.get('rootdir');
    const check = config.get('check');
    // Just in case the verion is part of the bundleName
    const [ name, ver ] = bundleName.split('@');
    const version = bundleVer || ver;

    logger.debug(`Determining install path of bundle ${name}${version ? `@${version}` : ''}`);
    const versionDir = version ?
        await getLatestInstalledVersion(rootdir, name, version) :
        await getDefaultInstalledVersion(rootdir, name);
    if (!versionDir) {
      logger.error(`Bundle ${name}${version ? `@${version}` : ''} not installed. Please install it first`);
      return false;
    }

    if (check && version) {
      const installedVer = path.basename(versionDir);
      if (installedVer !== version) {
        // potentially a semver
        const verObj = await getVersion(store, name, { version });
        if (!verObj) {
          logger.warn(`Unable to determine latest version of bundle ${name}. Using [${installedVer}]`);
        } else if (!semver.eq(verObj.version, installedVer)) {
          logger.error(`Installed version [${installedVer}] of bundle ${name} did not match the latest version [${verObj.version}]. Please update the version first`);
          return false;
        }
      }
    }
    process.stdout.write(path.join(versionDir, 'node_modules'));
    return true;
  }
}

module.exports = Path;
