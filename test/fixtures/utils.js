'use strict';
const path = require('path');
const { promises: fsPromises } = require('fs');

const rootdir = path.resolve(__dirname, '..', '..', '.tmp');
async function getRootDir() {
  await fsPromises.mkdir(rootdir, { recursive: true });
  return rootdir;
}

module.exports = {
  getRootDir
};