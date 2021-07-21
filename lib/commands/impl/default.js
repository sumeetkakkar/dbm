'use strict';

const path = require('path');
const os = require('os');
const { 
  getLatestInstalledVersion,
  setCurrent,
} = require('../../bundle/common');

const logger = require('../../logger');

const Base = require('../_base');

class Default extends Base {
  static get name() {
    return 'default';
  }
  static get command() {
    return 'default <bundle> [version]';
  }
  static get description() {
    return 'Set default version of the bundle';
  }

  static get opts() {
    return [ ];
  }

  async _run(store, config, bundleName, bundleVersion) {
    const rootdir = config.get('rootdir');
    // Just in case the verion is part of the bundleName
    const [ name, ver ] = bundleName.split('@');
    const version = bundleVersion || ver;

    if (!version) {
      logger.error(`No version specified to set as default for ${bundleName}`);
      return false;
    }

    const versionDir = await getLatestInstalledVersion(rootdir, name, version);
    if (!versionDir) {
      logger.error(`Bundle ${name}@${version} not installed. Please install it first`);
      return false;
    }

    logger.info(`Setting bundle ${name}@${path.basename(versionDir)} as current`);

    const current = await setCurrent(versionDir, { overwrite: true });

    logger.info(`Please set or update 'NODE_PATH' env with ${current}.
    i.e. update ~/.bash_profile, ~/.zshrc, ~/.profile, or ~/.bashrc to add
    export NODE_PATH=${process.env.NODE_PATH ? `$NODE_PATH:` : ''}${current}`);

    if (os.platform() === 'win32') {
      logger.info(`
    On Windows: set NODEPATH=${process.env.NODE_PATH ? `%NODE_PATH%;` : ''}${current}`);
    }

    return true;
  }
}

module.exports = Default;