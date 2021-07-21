'use strict';

const { promises: fsPromises } = require('fs');
const semver = require('semver');
const SemverRange = require('semver/classes/range');
const { 
  getInstalledVersions,
  setCurrent,
} = require('../../bundle/common');

const logger = require('../../logger');

const Base = require('../_base');

function CheckNRemove(version) {
  const range = version && new SemverRange(version);
  return async function checkNRemove(ver, dir) {
    if (!version || ver === version || range.test(ver)) {
      logger.info(`removing ${dir}`);
      await fsPromises.rmdir(dir, { recursive: true });
      return true;
    }
    return false;
  };
}

class Remove extends Base {
  static get name() {
    return 'remove';
  }
  static get command() {
    return 'remove <bundle> [version]';
  }
  static get description() {
    return 'Remove installed bundle versions';
  }

  static get aliases() {
    return [ 'rm' ];
  }

  async _run(store, config, bundleName, bundleVer) {
    const rootdir = config.get('rootdir');
    // Just in case the verion is part of the bundleName
    const [ name, ver ] = bundleName.split('@');
    const version = bundleVer || ver;

    logger.debug(`Determining installed versions of bundle ${name}${version ? `@${version}` : ''}`);
    const [ curVersion, versions ] = await getInstalledVersions(rootdir, name);

    const checkNRemove = CheckNRemove(version);

    let reevalauteCurrent = false, curCandidateVer, curCandidateTag, cnt = 0;
    if (curVersion) {
       if (await checkNRemove(...curVersion)) {
         reevalauteCurrent = true;
         cnt++;
       }
    }

    for (const [ ver, dir ] of versions) {
      const removed = await checkNRemove(ver, dir);
      if (removed) cnt++;
      if (!removed && reevalauteCurrent) {
        // not candidate of remove, and current has to be reevaluated
        if (semver.valid(ver)) {
          if (!curCandidateVer || semver.gt(ver, curCandidateVer[0])) {
            curCandidateVer = [ ver, dir ];
          }
        } else {
          if (!curCandidateTag || ver > curCandidateTag[0]) {
            curCandidateTag = [ ver, dir ];
          }
        }
      }
    }

    const newCurrent = curCandidateVer || curCandidateTag;
    if (newCurrent) {
      logger.info(`Setting bundle ${name}@${newCurrent[0]} as current`);
      await setCurrent(newCurrent[1], { overwrite: true });
    }

    logger.info(`Bundle versions removed: ${cnt}`);

    return true;
  }
}

module.exports = Remove;