'use strict';

const { NAME: name } = require('./constants');
const { version } = require('../package.json');
const { processCommand  } = require('./commands');

function cli(proc=process) {
  proc.title = name;
  const args = proc.argv;
  // process.on('uncaughtException', errorHandler);
  // process.on('unhandledRejection', errorHandler);
  processCommand(name, version, args);
}
module.exports = cli;