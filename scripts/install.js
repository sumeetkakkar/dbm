#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { getConfigSync } = require('../lib/config');
const logger = require('../lib/logger');

const config = getConfigSync();

const installDir = config.get('rootdir');

logger.info(`Installing scripts under: ${installDir}`);

// function copyFiles(src, dest) {
//   try {
//     fs.rmdirSync(dest, { recursive: true });
//   } catch (ex) {
//     if (ex.code !== 'ENOENT') throw ex;
//   }
//   const content = fs.readdirSync(src, { withFileTypes: true });
//   fs.mkdirSync(dest, { recursive: true });
//   for (const fdirent of content) {
//     // check whether the file is a folder
//     if (fdirent.isDirectory()) {
//       copyFiles(path.join(src, fdirent.name), path.join(dest, fdirent.name));
//       continue;
//     }
//     const { name: file } = fdirent;
//     fs.copyFileSync(path.join(src, file), path.join(dest, file));
//   }
// }

function createSymLink(src, dest) {
  try {
    fs.unlinkSync(dest);
  } catch (ex) {
    if (ex.code !== 'ENOENT') throw ex;
  }
  const parent = path.dirname(dest);
  fs.mkdirSync(parent, { recursive: true });
  const linksrc = path.relative(parent, src);
  const cwd = process.cwd();
  try {
    process.chdir(parent);
    fs.symlinkSync(linksrc, path.basename(dest));
  } finally {
    process.chdir(cwd);
  }
}

const src = path.resolve(__dirname, '..', 'artifacts');
const dest = path.resolve(installDir, 'bin');
logger.info(`source: ${src}, target: ${dest}`);
//copyFiles(src, dest);
createSymLink(src, dest);
logger.info('Install complete!')