'use strict';

const { inspect: { colors } } = require('util');

const { 
  getInstalledVersions,
} = require('../../bundle/common');

const {
  writeSpecial,
  writeNewLine
} = require('../utils');

const logger = require('../../logger');

const Base = require('../_base');

function writeName(name) {
  writeSpecial(name, colors.underline, colors.bold, colors.cyan);
  writeNewLine();
}

function writeCurrentVersion(version, dir) {
  writeSpecial(`*${version}`, colors.bold, colors.yellow);
  writeSpecial(` [${dir}]`, colors.white);
  writeNewLine();
}

function writeVersion(version, dir) {
  writeSpecial(`${version} [${dir}]`, colors.white);
  writeNewLine();
}

class List extends Base {
  static get name() {
    return 'list';
  }
  static get command() {
    return 'list <bundle> [version]';
  }
  static get description() {
    return 'Lists installed bundle versions';
  }

  static get aliases() {
    return [ 'ls', 'l' ];
  }

  async _run(store, config, bundleName, bundleVer) {
    const rootdir = config.get('rootdir');
    // Just in case the verion is part of the bundleName
    const [ name, ver ] = bundleName.split('@');
    const version = bundleVer || ver;

    logger.debug(`Determining installed versions of bundle ${name}${version ? `@${version}` : ''}`);
    const [ curVersion, versions ] = await getInstalledVersions(rootdir, name, version);

    writeName(name);

    writeNewLine();

    if (!curVersion && versions.length === 0) {
      logger.error(`Bundle ${name}${version ? `@${version}` : ''} not installed.`);
      return false;
    }

    curVersion && writeCurrentVersion(curVersion[0], curVersion[1]);

    for (const [ ver, dir ] of versions) {
      writeVersion(ver, dir);
    }

    return true;
  }
}

module.exports = List;