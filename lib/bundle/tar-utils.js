'use strict';
const path = require('path');
const fs = require('fs');
const tar = require('tar');
const logger = require('../logger');
const {
  getBaseDir
} = require('./common');

const { promises: fsPromises, constants: fsConstants } = fs;

async function buildBundle(options) {
  logger.info(`Building bundle`);
  const basedir = getBaseDir(options);

  logger.debug('Building bundle from', basedir);
  const nmdir = path.resolve(basedir, 'node_modules');

  try {
    await fsPromises.access(nmdir, fsConstants.F_OK | fsConstants.R_OK);
  } catch (ex) {
    const emsg = `Unable to access directory ${nmdir} [${ex.code}|${ex.message}]`;
    logger.error(emsg);
    throw new Error(emsg);
  }
  return tar.c( { gzip: true, cwd: basedir }, [ 'node_modules', 'package.json' ]);
}

function installBundle(instrm, basedir) {
  return new Promise((resolve, reject) => {
    // TODO: Should we strip node_modules?
    const tarstrm = tar.x( { gzip: true, cwd: basedir, newer: true /* strip: 1 */ });
    let done = (err, result) => {
      if (err) reject(err);
      else resolve(result);
      done = () => {};
    };
    tarstrm.on('error', (e) => {
      done(e);
    });
    instrm.on('error', (e) => {
      done(e);
    });
    instrm.on('end', function () {
      instrm.unpipe();
      // tarstrm.end(); // unpipe should end the out stream
      done();
    });
    instrm.pipe(tarstrm);
  });
}

module.exports = {
  buildBundle,
  installBundle,
};