'use strict';

const logger = require('../../logger');
const { inspect: { colors } } = require('util');
const {
  writeSpecial,
  writeNewLine
} = require('../utils');

const Base = require('../_base');

function writeName(name) {
  writeSpecial(name, colors.underline, colors.bold, colors.cyan);
  writeNewLine();
}

function writeCurrentVersion(version, tag) {
  writeSpecial(`*${version}${ tag && ` [tag:${tag}]` || ''}`, colors.bold, colors.yellow);
  writeNewLine();
}

function writeVersion(version, tag) {
  writeSpecial(`${version}${ tag && ` [tag:${tag}]` || ''}`, colors.white);
  writeNewLine();
}

class View extends Base {
  static get name() {
    return 'view';
  }
  static get command() {
    return 'view <bundle> [version]';
  }
  static get description() {
    return 'View available versions of the bundle';
  }

  static get aliases() {
    return [ 'vw' ];
  }

  static get opts() {
    return [
      { flags: '-t --tag <tag>', description: 'Tag to use', defaultValue: '' }, // enpty tag
    ];
  }

  async _run(store, config, bundleName, bundleVer) {
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

    writeName(bundle.name);

    writeNewLine();

    if (!Array.isArray(bundle.versions) || bundle.versions.length === 0) {
      logger.error(`No candidate version found for bundle ${name}!`);
      return false;
    }

    writeCurrentVersion(bundle.versions[0].version, bundle.versions[0].tag);

    for (let i = 1; i < bundle.versions.length; i++) {
      const { version, tag } = bundle.versions[i];
      writeVersion(version, tag);
    }

    return true;
  }
}

module.exports = View;