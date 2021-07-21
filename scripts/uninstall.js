#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { getConfigSync } = require('../lib/config');
const logger = require('../lib/logger');

const config = getConfigSync();

const installDir = config.get('rootdir');

logger.info(`Cleaning scripts under: ${installDir}`);

const binpath = path.resolve(installDir, 'bin');
try {
  fs.unlinkSync(binpath);
} catch (ex) {
  if (ex.code !== 'ENOENT') throw ex;
}
// try {
//   fs.rmdirSync(dest, { recursive: true });
// } catch (ex) {
//   if (ex.code !== 'ENOENT') throw ex;
// }