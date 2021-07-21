'use strict';

/**
 * write text with special text formatting
 * @param {String} str text to write
 * @param  {...any} colors_  util.inspect.colors
 */
function writeSpecial(str, ...colors_) {
  for (const color of colors_) {
    process.stdout.write(`\x1b[${color[0]}m`);
  }

  process.stdout.write(str);

  for (let i = colors_.length - 1; i >= 0; i--) {
    process.stdout.write(`\x1b[${colors_[i][1]}m`);
  }
}

function writeNewLine() {
  process.stdout.write('\r\n');
}

module.exports = {
  writeSpecial,
  writeNewLine,
};