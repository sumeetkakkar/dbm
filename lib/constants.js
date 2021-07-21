'use strict';
const path = require('path');
const os = require('os');
// ndb: node.js dependencies bundle
const rootDir = process.env.DEPENDENCY_BUNDLE_ROOT || path.resolve(os.homedir(), '.ndb'); 

module.exports = {
  NAME: 'dbm',
  DEPENDENCY_BUNDLE_ROOT: rootDir,
};