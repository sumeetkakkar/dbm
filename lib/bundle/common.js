'use strict';
const assert = require('assert');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const logger = require('../logger');
const semver = require('semver');
const SemverRange = require('semver/classes/range');

const { promises: fsPromises, constants: fsConstants } = fs;

const DEFAULT_TAG = 'latest';
const CURRENT_DIR = 'current';
// .ndb: node.js dependency bundle
const ROOT_DIR = process.env.DEPENDENCY_BUNDLE_ROOT || path.resolve(os.homedir(), '.ndb');


function getBaseDir({ basedir } = {}) {
  return basedir || process.cwd();
}

function getMeta(options) {
  const basedir = getBaseDir(options);
  try {
    const pkg = require(path.resolve(basedir, 'package.json'));
    const { name, version } = pkg;
    return { name, version };
  } catch(ex) {
    if (ex.code === 'MODULE_NOT_FOUND') {
      throw new Error(`Missing package.json. Needed for deriving bundle's 'name' and 'version`);
    }
    throw ex;
  }
}

function installPackages(options) {
  const basedir = getBaseDir(options);
  const install = spawn('npm', [ 'ci' ], { cwd: basedir });
  return new Promise((resolve, reject) => {
    install.stdout.on('data', (data) => {
      logger.info(data && data.toString() || '');
    });
    install.stderr.on('data', (data) => {
      logger.warn(data && data.toString() || '');
    });
    install.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Error during 'npm ci'`));
      } else {
        resolve();
      }
    });
  });
}

function getInstallDir(rootdir, name, version) {
  assert.strictEqual(typeof version, 'string', `version required for installing ${name}`);
  return path.resolve(rootdir, name, version);
}

async function getBundleRoot(rootdir, name) {
  const base = path.resolve(rootdir, name);
  try {
    await fsPromises.access(base, fsConstants.F_OK);
    return base;
  } catch (ex) {
    if (ex.code === 'ENOENT') {
      return;
    } else {
      throw new Error(`Error accessing ${base}. [${ex.code}] [${ex.message}]`);
    }
  }
}

async function getDefaultInstalledVersion(rootdir, name) {
  const base = await getBundleRoot(rootdir, name);
  if (!base) return;
  const current = path.join(base, CURRENT_DIR);
  try {
    await fsPromises.access(current, fsConstants.F_OK);
    return current;
  } catch (ex) {
    if (ex.code === 'ENOENT') {
      return;
    } else {
      throw new Error(`Error accessing ${base}. [${ex.code}] [${ex.message}]`);
    }
  }
}

async function getCurrentVersion(base) {
  const current = path.join(base, CURRENT_DIR);
  try {
    return await fsPromises.readlink(current);
  } catch (ex) {
    if (ex.code !== 'ENOENT') {
      throw new Error(`Error accessing ${current}. [${ex.code}] [${ex.message}]`);
    }
  }
}

async function getInstalledVersions(rootdir, name, version) {
  const base = await getBundleRoot(rootdir, name);
  if (!base) return;
  const range = version && new SemverRange(version);
  const current = await getCurrentVersion(base);
  const files = await fsPromises.readdir(base, { withFileTypes: true });
  const checkValid = async (basepath) => {
    const nmdir = path.join(basepath, 'node_modules');
    try {
      await fsPromises.access(nmdir, fsConstants.F_OK);
      return true;
    } catch (ex) {
      if (ex.code === 'ENOENT') {
        return false;
      } else {
        throw new Error(`Error accessing ${nmdir}. [${ex.code}] [${ex.message}]`);
      }
    }
  };
  const versions = [];
  let curVersion;
  for (const fdirent of files) {
    // check whether the file is a folder
    if (! fdirent.isDirectory()) {
      continue;
    }
    const { name: ver } = fdirent;
    // should we handle 'latest'?
    if (!version || version === ver || range.test(ver)) {
      const verbasedir = path.resolve(base, ver);
      if (current === ver) {
        curVersion = [ ver, verbasedir ];
      } else if (await checkValid(verbasedir)) {
        versions.push([ ver, verbasedir ]);
      }
    }
  }
  return [ curVersion, versions ];
}

async function getLatestInstalledVersion(rootdir, name, version) {
  const base = await getBundleRoot(rootdir, name);
  if (!base) return;
  assert(version, 'version is required');
  const range = new SemverRange(version);
  const files = await fsPromises.readdir(base, { withFileTypes: true });
  let maxVersion;
  for (const fdirent of files) {
    // check whether the file is a folder
    if (! fdirent.isDirectory()) {
      continue;
    }
    const { name: ver } = fdirent;
    // should we handle 'latest'?
    if (version === ver) {
      maxVersion = ver;
      break;
    } else if (range.test(ver)) {
      if (maxVersion === undefined || semver.gt(ver, maxVersion)) {
        maxVersion = ver;
      }
    }
  }
  return maxVersion && getInstallDir(rootdir, name, maxVersion);
}

async function setCurrent(dir, { overwrite=false } = {}) {
  const version = path.basename(dir);
  const base = path.dirname(dir);
  const current = path.join(base, CURRENT_DIR);
  let exists = false;
  try {
    const cver = await fsPromises.readlink(current);
    exists = true;
    // check whether current is orphaned or not
    logger.debug(`${current} points to ${cver}. Checking whether it is orphaned`);
    await fsPromises.access(path.join(base, cver), fsConstants.F_OK);
    if (overwrite !== true) {
      logger.debug(`Skipping setting current as it is already mapped! [${current}]`);
      return false;
    }
  } catch (ex) {
    if (ex.code !== 'ENOENT') {
      throw new Error(`Error accessing ${current}. [${ex.code}] [${ex.message}]`);
    }
  }
  if (exists) {
    await fsPromises.unlink(current);
  }

  const cwd = process.cwd();
  try {
    process.chdir(base);

    logger.debug(`Linking ${dir} to ${current}`);
    await fsPromises.symlink(path.relative(base, dir), path.relative(base, current));
    logger.debug(`Linked ${version} to current`);

    return current;
  } finally {
    process.chdir(cwd);
  }
}

module.exports = {
  DEFAULT_TAG,
  ROOT_DIR,
  getBaseDir,
  getMeta,
  installPackages,
  getInstallDir,
  getDefaultInstalledVersion,
  getInstalledVersions,
  getLatestInstalledVersion,
  setCurrent,
};
