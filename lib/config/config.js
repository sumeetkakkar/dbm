'use strict';
const _providers = Symbol('providers');
const _specs = Symbol('specs');

function addSpec(map, spec) {
  if (typeof spec === 'string') {
    map.set(spec, {});
  } else if (spec && spec.name) {
    map.set(spec.name, spec);
  } else {
    throw new Error(`Invalid config spec ${JSON.stringify(spec)}`);
  }
  return map;
}
class Config {
  constructor(specs = [], ...providers) {
    this[_specs] = specs.reduce(addSpec, new Map());
    this[_providers] = providers || [];
  }

  extendSpecs(specs = []) {
    for (const spec of specs) {
      addSpec(this[_specs], spec);
    }
    return this;
  }

  get(key) {
    if (! this[_specs].has(key)) {
      throw Object.assign(new Error(`Unknown config key ${key}`), { code: 'EBADKEY' });
    }
    const spec = this[_specs].get(key);
    let ret;
    for (const provider of this[_providers]) {
      const val = ((provider, key) => {
        if (typeof provider.get === 'function') {
          return provider.get(key);
        }
        return provider[key];
      })(provider, key);
      if (val !== undefined) ret = val;
    }
    if (ret === undefined && spec.default !== undefined) {
      ret = typeof spec.default === 'function' ? spec.default(this) : spec.default;
    }
    return ret;
  }

  * entries() {
    for (const key of this[_specs].keys()) {
      const value = this.get(key);
      if (value !== undefined) {
        yield [key, value];
      }
    }
  }
  
  // * keys() {
  //   for (const [ key ] of this.entries()) {
  //     yield key;
  //   }
  // }

  // * values() {
  //   for (const [ , value ] of this.entries()) {
  //     yield value;
  //   }
  // }
}

Config.prototype[Symbol.iterator] = Config.prototype.entries;

module.exports = Config;