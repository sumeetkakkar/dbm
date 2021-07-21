'use strict';
const {
  DEFAULT_TAG,
  ROOT_DIR,
} = require('../bundle/common');

module.exports = () => {
  const specs = [
    { name: 'store', default: require('../bundle').defaultStore, },
    { name: 'basedir', default: process.cwd(), },
    { name: 'tag', default: DEFAULT_TAG, },
    { name: 'check', default: false, },
    { name: 'rootdir', default: ROOT_DIR, },
  ];
  return specs;
};
