'use strict';
const { assert } = require('../logger');
const logger = require('../logger');

const defaultStore = 'git';
const supportedStores = [
  [ 'git', require.resolve('./store/git') ],
  [ 'local', require.resolve('./store/local') ],
];

const stores = new Map(supportedStores);

Object.defineProperty(stores, 'default', {
  value: defaultStore,
  enumerable: false,
  writable: true,
});

function getStore(name) {
  const store = stores.get(name);
  if (!store) {
    throw new Error(`Unknown store - ${name}`);
  }
  if (typeof store === 'string') {
    return new (require(store));
  } else {
    return new store();
  }
}

function registerStore(name, store, isDefault=false) {
  if (store) {
    const supportedTypes = [ 'function', 'string' ];
    assert(supportedTypes.indexOf(typeof store) >= 0, `value of store '${name}' should be ${supportedTypes.join(' or ')}`);
    if (stores.has(name)) {
      logger.debug(`Updating existing store '${name}' with new implementation`);
    }
    stores.set(name, store);
  }
  if (isDefault === true && stores.has(name)) {
    stores.default = name;
  }
}

module.exports = {
  getStore,
  registerStore,
  get defaultStore() { 
    return stores.default;
 },
  _restoreStores() { 
    stores.clear();
    for ( const [name, sval] of supportedStores ) {
      stores.set(name, sval);
    }
    stores.default = defaultStore;
  },
};