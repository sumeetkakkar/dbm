'use strict';

const _data = Symbol('option:data');

class Option {

  constructor(flags, description, defaultValue) {
    this[_data] = {
      flags,
      description,
      defaultValue,
    };
  }

  get flags() { return this[_data].flags; }
  get description() { return this[_data].description; }
  get defaultValue() { return this[_data].defaultValue; }

  // .option('-e, --exec_mode <mode>', 'Which exec mode to use', 'fast')
  // register(cmd) {
  //   const inputstr = this.input && ` <${this.input}>` || '';
  //   return cmd.option(this.keys.join(', ') + inputstr, this.description, this.defaultValue);
  // }
}

module.exports = Option;