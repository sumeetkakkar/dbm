'use strict';
const assert = require('assert');
const _data = Symbol('data');
const _ts = Symbol('ts');
const _keys = Symbol('keys');

class Model {
  constructor(data={}) {
    assert.strictEqual(typeof data, 'object');
    this[_data] = data;
    this[_ts] = (typeof data.ts === 'number') ? data.ts : 1;
    this[_keys] = new Set(['ts']);
    Object.preventExtensions(this);
  }

  get _data() { return this[_data]; }
  get ts() { return this[_ts]; }
  set ts(val) { this[_ts] = val; }

  toJSON() {
    const keys = this.constructor[_keys] || [ 'ts' ];
    return keys.reduce((o, key) => {
      o[key] = this[key];
      return o;
    }, {});
  }

  static setupProperties(Class) {
    function propertyDescriptor(prop) {
      return {
        get: function getter() { return this[_data][prop]; },
        set: function setter(val) { this[_data][prop] = val; },
        enumerable: true,
        configurable: false, // not changable i.e. delete or modify
      };
    }
    if (!Class) Class = this;
    const { properties = [] } = Class;
    for (const prop of properties) {
      Object.defineProperty(Class.prototype, prop, propertyDescriptor(prop));
    }
    Class[_keys] = [ 'ts', ...properties ];
  }
}

module.exports= Model;