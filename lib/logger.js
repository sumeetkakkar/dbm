'use strict';
  
const util = require('util');
const { NAME: name } = require('./constants');
const { Console } = console;

const _debugEnabled = Symbol('logger:debugEnabled');
const _set = Symbol('logger:set');
const pid = process.pid;

const { inspect: { colors } } = util;
const colorMarker = color => `\x1b[${color[0]}m`;
const RESET = colorMarker(colors.reset);
const FgRed = colorMarker(colors.red);
const FgYellow = colorMarker(colors.yellow);
const FgCyan = colorMarker(colors.cyan);
const FgWhite = colorMarker(colors.white);
const styles = {
  info: `${FgYellow}[info]${FgWhite}`,
  warn: `${FgYellow}[warn]${FgCyan}`,
  error: `${FgYellow}[error]${FgRed}`,
};

class Logger extends Console {
  constructor(name, options) {
    super({stdout: process.stdout, stderr: process.stderr, ...options});
    this[_debugEnabled] = false;
    this[_set] = name && name.toUpperCase();
  }

  setVerbose() {
    if (this[_debugEnabled]) return;
    this[_debugEnabled] = true;
    this.debug('enabled debug logging');
  }

  /**
   * Override debug
   * @param  {...any} args 
   */
  debug(...args) {
    if (!this[_debugEnabled]) return;
    const colors = process.stderr.hasColors && process.stderr.hasColors();
    const msg = util.formatWithOptions({ colors }, ...args);
    const coloredPID = util.inspect(pid, { colors });
    process.stderr.write(util.format('%s %s: %s\n', this[_set], coloredPID, msg));
  }
}

for (const name of ['error', 'warn', 'info']) {
  Object.defineProperty(Logger.prototype, name, {
    value: function (...args) {
      Console.prototype[name].call(this, styles[name], ...args, RESET);
    },
    writable: true,
  });
}

module.exports = new Logger(name);
module.exports.Logger = Logger;