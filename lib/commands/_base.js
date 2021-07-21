'use strict';
const { getStore } = require('../bundle');
const logger = require('../logger');

class Base {

  get name() {
    return this.constructor.name;
  }

  get command() {
    return this.constructor.command || this.name;
  }

  get description() {
    return this.constructor.description;
  }

  get aliases() {
    const aliases = this.constructor.aliases;
    return Array.isArray(aliases) && aliases || [ aliases ].filter(Boolean);
  }

  get opts() {
    const opts = this.constructor.opts;
    return Array.isArray(opts) && opts || [ opts ].filter(Boolean);
  }

  /**
   * Use it to disable command
   */
  get disabled() {
    return this.constructor.disabled || false;
  }

  async exec(config, ...args) {
    const store = getStore(config.get('store'));
    config.extendSpecs(store.configSpecs);
    await store.init(config);
    try {
      return this._run(store, config, ...args);
    } catch(ex) {
      logger.error(`Error during command execution`, ex);
    } finally {
      await store.close();
    }
    return false;
  }

  async _run(/*store, config, input*/) {
    throw new Error('not implemented');
  }
}

module.exports = Base;