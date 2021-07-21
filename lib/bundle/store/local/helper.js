'use strict';
const path = require('path');
const fs = require('fs');
const assert = require('assert');
const { promises: fsPromises } = fs;
const logger = require('../../../logger');

/*
  <basedir>
       - <bundle-name>
          - 1.0.0
            - metadata.json
            - bundle.tgz
          - 1.1.0
            - metadata.json
            - bundle.tgz
*/

const METADATA_FILE = 'metadata.json';
const BUNDLE_FILE = 'bundle.tgz';

function getBundleDir(basedir, name) {
  return path.join(basedir, name);
}

function getBundleVerDir(basedir, name, ver) {
  return path.join(getBundleDir(basedir, name), ver);
}

async function getTempDirBase(basedir) {
  const tdir = path.join(basedir, '.temp');
  await fsPromises.mkdir(tdir, { recursive: true });
  return tdir;
}

function getTimestamp() {
  // eslint-disable-next-line no-useless-escape
  return new Date().toJSON().replace(/[-\s:TZ\.]/g, '');
}

function getTempDirPrefix(name, ver) {
  return `${name}-${ver}-${getTimestamp()}`;
}

async function loadMetadata(mfile) {
  try {
    // read the metadata file if it exists
    const meta = await fsPromises.readFile(mfile);
    // Create Bundle object
    return JSON.parse(meta);
  } catch (ex) {
    if (ex.code === 'ENOENT') {
      logger.debug(`loadMetadata: metadata file ${mfile} does not exist`);
      return;
    }
    logger.error(`loadMetadata: Error loading metadata file ${mfile} [${ex.code}][${ex.message}]`);
    throw new Error(`Error loading metadata for ${mfile}: [${ex.code}] [${ex.stack}]`);
  }
}

function writeMetadata(mfile, metadata, optns) {
  // const controller = new AbortController();
  // const { signal } = controller;

  const signal = undefined;
  return fsPromises.writeFile(mfile, JSON.stringify(metadata, undefined, 2), { signal, flag: 'wx', ...optns});
}

async function updateMetadata(mfile, metadata) {
  const tmpfile = mfile + '.update';
  const cleanup = async function cleanup(file, ret) {
    try {
      await fsPromises.unlink(file);
    } catch (ex) {
      if (ex.code !== 'ENOENT') {
        logger.debug(`updateMetadata: Unable to delete ${file}. Please delete it manually [${ex.code}] [${ex.message}]`);
      }
    }
    return ret;
  }.bind(null, tmpfile);
  try {
    // cp metadata.json to metadata.json.update - handle file exists
    await fsPromises.copyFile(mfile, tmpfile, fs.constants.COPYFILE_EXCL);
  } catch(ex) {
    logger.error(`updateMetadata: Error creating working metadata from ${mfile} [${ex.code}][${ex.message}]`);
    return false;
  }
  // load metadata.json.update.
  const cmeta = await loadMetadata(tmpfile);
  // unable to load meta
  if (!cmeta) {
    logger.error(`updateMetadata: Unable to load metadata file ${tmpfile}`);
    return await cleanup(false);
  }
  // check ts - handle ts mismatch
  if (metadata.ts !== cmeta.ts) {
    logger.error(`updateMetadata: Metadata ${mfile} already updated. Expected:${metadata.ts}, Found:${cmeta.ts}`);
    return await cleanup(false);
  } 
  // all good
  try {
    // increment ts
    if (typeof metadata.ts === 'number') metadata.ts++;
    // write to metadata.json.update
    await writeMetadata(tmpfile, metadata, { flag: 'w' });
    // mv metadata.json.update to metadata.json
    await fsPromises.rename(tmpfile, mfile);
    return true;
  } catch (ex) {
    logger.error(`updateMetadata: Metadata ${mfile} update failed [${ex.code}] [${ex.stack}]`);
    return false;
  } finally {
    await cleanup();
  }
}

function writeBundle(bstrm, fstrm) {
  return new Promise((resolve, reject) => {
    let done = (err, result) => {
      if (err) reject(err);
      else resolve(result);
      done = () => {};
    };
    bstrm.pipe(fstrm);
    fstrm.on('error', (e) => {
      logger.error(`Error in the file stream`, e);
      done(e);
    });
    bstrm.on('error', (e) => {
      logger.error(`Error in the input stream`, e);
      done(e);
    });
    bstrm.on('end', function () {
      logger.debug(`Bundle file written`);
      bstrm.unpipe && bstrm.unpipe();
      // fstrm.end(); // unpipe should end the filestream
      done();
    });
  });
}
/**
 * 
 * @param {String} basedir 
 * @param {String} name 
 * @param {Object} metadata 
 * @returns 
 */
async function createBundle(basedir, name, metadata={}) {
  const bundledir = getBundleDir(basedir, name);
  logger.debug(`createBundle: Creating bundle directory [${bundledir}]`);
  try {
    await fsPromises.mkdir(bundledir);
  } catch (ex) {
    if (ex.code === 'EEXIST') {
      logger.debug(`createBundle: bundle directory already exists [${bundledir}]`);
      // If the folder already exist, it can be assumed that the bundle is already created.
      return false;
    }
    throw ex;
  }

  // Use exclusive flag to fail if there is concurrent processing going on.
  logger.debug(`createBundle: creating metadata file [${METADATA_FILE}]`);
  if (!metadata.name) metadata.name = name;
  await writeMetadata(path.join(bundledir, METADATA_FILE), metadata);

  return true;
}

function updateBundleMeta(basedir, name, metadata) {
  const bundledir = getBundleDir(basedir, name);
  logger.debug(`updateBundleMeta: Updating bundle metadata directory [${bundledir}]`);

  const metadataFile = path.join(bundledir, METADATA_FILE);
  return updateMetadata(metadataFile, metadata);
  // const workMetadataFile = path.join(bundledir, `${METADATA_FILE}.update`);
  // const cleanup = function cleanup(mfile, ret) {
  //   try {
  //     fsPromises.unlink(mfile);
  //   } catch (ex) {
  //     if (ex.code !== 'ENOENT') {
  //       logger.debug(`updateBundleMeta: Unable to delete ${mfile}. Please delete it manually [${ex.code}] [${ex.message}]`);
  //     }
  //   }
  //   return ret;
  // }.bind(null, workMetadataFile);
  // try {
  //   // cp metadata.json to metadata.json.update - handle file exists
  //   await fsPromises.copyFile(metadataFile, workMetadataFile, fs.constants.COPYFILE_EXCL);
  // } catch(ex) {
  //   logger.error(`updateBundleMeta: Error creating working metadata from ${metadataFile} [${ex.code}][${ex.message}]`);
  //   return false;
  // }
  // // load metadata.json.update.
  // const cmeta = await loadMetadata(workMetadataFile);
  // // unable to load meta
  // if (!cmeta) {
  //   logger.error(`updataBundleMeta: Unable to load metadata file ${workMetadataFile}`);
  //   return await cleanup(false);
  // }
  // // check ts - handle ts mismatch
  // if (metadata.ts !== cmeta.ts) {
  //   logger.error(`updateBundleMeta: Metadata already updated ${metadataFile} expected:${metadata.ts}, current:${cmeta.ts}`);
  //   return await cleanup(false);
  // } 
  // // all good
  // try {
  //   // increment ts
  //   if (typeof metadata.ts === 'number') metadata.ts++;
  //   // write to metadata.json.update
  //   await writeMetadata(workMetadataFile, metadata, { flag: 'w' });
  //   // mv metadata.json.update to metadata.json
  //   await fsPromises.rename(workMetadataFile, metadataFile);
  //   return true;
  // } catch (ex) {
  //   logger.error(`updateBundleMeta: Metadata update ${metadataFile} failed [${ex.code}] [${ex.stack}]`);
  //   return false;
  // } finally {
  //   cleanup();
  // }
}

async function createBundleVersion(basedir, name, ver, metadata={}, bstrm, { verdir }={}) {
  logger.debug(`createBundleVersion: Creating bundle version [${name}] [${ver}] under [${basedir}]`);
  assert.strictEqual(bstrm && typeof bstrm.pipe, 'function', 'Bundle stream is required');
  if (!verdir) {
    verdir = getBundleVerDir(basedir, name, ver);
    // create bundle version directory
    try {
      await fsPromises.mkdir(verdir);
    } catch (ex) {
      if (ex.code === 'EEXIST') {
        logger.debug(`createBundleVersion: bundle version already exists [${verdir}]`);
        // If the folder already exist, it can be assumed that the bundle version is already created.
        return false;
      }
      throw ex;
    }
  }

  // write metadata file
  logger.debug(`createBundleVersion: creating metadata file [${METADATA_FILE}]`);
  if (!metadata.version) metadata.version = ver;
  await writeMetadata(path.join(verdir, METADATA_FILE), metadata);

  logger.debug(`createBundleVersion: creating bundle file [${BUNDLE_FILE}]`);

  // Use exclusive flag to fail if there is concurrent processing going on.
  const fstrm = fs.createWriteStream(path.join(verdir, BUNDLE_FILE), { flag: 'wx' });
  await writeBundle(bstrm, fstrm);

  return true;
}

async function updateBundleVersion(basedir, name, ver, metadata, bstrm) {
  const verdir = getBundleVerDir(basedir, name, ver);
  logger.debug(`updateBundleVersion: Updating bundle version [${verdir}]`);
  // caller should make sure the update is required
  // try {
  //   await fsPromises.access(verdir)
  // } catch(ex) {
  //   if (ex.code === 'ENOENT') {
  //     logger.debug(`updateBundleVersion: Bundle for this version does not exist. Creating new version.`);
  //     return createBundleVersion(basedir, name, ver, metadata, bstrm);
  //   }
  //   throw ex;
  // }

  logger.debug(`updateBundleVersion: Create temporary directory`);
  const tmpbasedir = await getTempDirBase(basedir);
  const tmpdir = await fsPromises.mkdtemp(path.join(tmpbasedir, getTempDirPrefix(name, ver)));

  logger.debug(`updateBundleVersion: Create bundle version under ${tmpdir}`);
  // create the new bundle version record. 
  await createBundleVersion(tmpdir, name, ver, metadata, bstrm, { verdir: tmpdir });

  logger.debug(`updateBundleVersion: Delete previous bundle version [${verdir}]`);
  const newverdir = await deleteBundleVersion(basedir, name, ver);

  logger.debug(`updateBundleVersion: Rename bundle version directory [${verdir}] to ${newverdir}`);
  // change temporary dir to version directory
  await fsPromises.rename(tmpdir, verdir);
  return true;
}

function updateBundleVersionMeta(basedir, name, ver, metadata) {
  const verdir = getBundleVerDir(basedir, name, ver);
  logger.debug(`updateBundleVersionMeta: Updating bundle metadata directory [${verdir}]`);
  const metadataFile = path.join(verdir, METADATA_FILE);
  return updateMetadata(metadataFile, metadata);
}

async function deleteBundleVersion(basedir, name, ver) {
  const verdir = getBundleVerDir(basedir, name, ver);
  logger.debug(`deleteBundleVersion: deleting bundle version [${verdir}]`);
  let retried = 0, deldir;
  const uniqueId = getTimestamp();
  do {
    deldir = `${ver}_DELETED_${uniqueId}${retried>0?`_${retried}`:''}`;
    logger.debug(`deleteBundleVersion: Rename bundle version directory [${verdir}] to ${deldir} to mark it deleted`);
  // rename the current version directory 
    try {
      await fsPromises.rename(verdir, getBundleVerDir(basedir, name, deldir));
      break;
    } catch (ex) {
      logger.error(`deleteBundleVersion: Rename bundle version directory failed. attempt:${retried+1} [${ex.message}]`);
      deldir = undefined;
    }
  } while(++retried < 3);
  if (!deldir) {
    throw new Error(`Error deleting bundle version [${verdir}]`);
  }
  return deldir;
}

function loadBundle(basedir, name, ver) {
  const verdir = getBundleVerDir(basedir, name, ver);
  return fs.createReadStream(path.join(verdir, BUNDLE_FILE));
}

async function getBundleByName(basedir, name) {
  const bundledir = getBundleDir(basedir, name);
  logger.debug(`getBundleByName: get bundle details from directory [${bundledir}]`);
  try {
    await fsPromises.access(bundledir);
  } catch(ex) {
    if (ex.code === 'ENOENT') {
      logger.info(`getBundleByName: Bundle with this name does not exist. [${name}]`);
      return;
    }
    logger.error(`getBundleByName: Error reading bundle directory ${bundledir}. [${ex.stack}]`);
    throw ex;
  }
  // read the metadata file if it exists
  const meta = await loadMetadata(path.join(bundledir, METADATA_FILE));
  if (!meta) {
    logger.debug(`getBundleByName: ${METADATA_FILE} for the bundle does not exist. [${name}]`);
  }
  return meta;
}

const NOT_BUNDLE_FOLDERS = new Set([
  '.temp',
  '.tmp',
]);
async function getBundles(basedir) {
  logger.debug(`getBundles`);
  const files = await fsPromises.readdir(basedir, { withFileTypes: true });
  const bundles = [];
  for (const fdirent of files) {
    // check whether the file is a folder
    if (! fdirent.isDirectory()) {
      continue;
    }
    const { name: file } = fdirent;
    if (NOT_BUNDLE_FOLDERS.has(file) || file.startsWith('.')) {
      logger.debug(`getBundles: Ignoring ${file}`);
      continue;
    }
    // read the metadata file if it exists
    const meta = await loadMetadata(path.join(basedir, file, METADATA_FILE));
    if (!meta) {
      logger.debug(`getBundles: Ignoring ${file} - missing ${METADATA_FILE}`);
      continue;
    }
    logger.debug(`getBundles: loaded bundle ${file}`);
    // Create Bundle object
    bundles.push(meta);
  }
  return bundles;
}

async function getBundleVersion(basedir, name, ver) {
  const verdir = getBundleVerDir(basedir, name, ver);
  logger.debug(`getBundleVersion: bundle ver directory ${verdir}`);
  return await loadMetadata(path.join(verdir, METADATA_FILE));
}

async function getBundleVersions(basedir, name) {
  const bundledir = getBundleDir(basedir, name);
  logger.debug(`getBundleVersions: bundle directory [${bundledir}]`);
  const files = await fsPromises.readdir(bundledir, { withFileTypes: true });
  const versions = [];
  for (const fdirent of files) {
    // check whether the file is a folder
    if (! fdirent.isDirectory()) {
      continue;
    }
    const { name: file } = fdirent;
    if (NOT_BUNDLE_FOLDERS.has(file) || file.startsWith('.')) {
      logger.debug(`getBundleVersions: Ignoring ${file}`);
      continue;
    }
    // read the metadata file if it exists
    const meta = await loadMetadata(path.join(bundledir, file, METADATA_FILE));
    if (!meta) {
      logger.debug(`getBundleVersions: Ignoring ${file} - missing ${METADATA_FILE}`);
      continue;
    }
    logger.debug(`getBundleVersions: loaded bundle ${file}`);
    // Create BundleVersion object
    versions.push(meta);
  }
  return versions;
}

module.exports = {
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
};