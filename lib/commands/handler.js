'use strict';
const { Command } = require('commander');
const { getConfig } = require('../config');
const logger = require('../logger');

const _program = Symbol('program');
const _baseOptions = Symbol('baseOptions');

class CommandEx extends Command {
  createCommand(name) {
    this[_baseOptions] = {};
    const cmd = new CommandEx(name);
    // Add an option to subcommands created using `.command()`
    cmd.option('-R, --repo <repo>', 'repository for bundles');
    return cmd;
  }
}

function validateOptions({ _repo }) {
  // TODO: Valid repo is a local directory (store: local), git/http url (store: git)
  // if (repo) {
  //   // ! /^http[s]?:\/\//.test(repo)
  //   logger.error('Please input valid value of the repository');
  //   return false;
  // }
  return true;
}

class Handler {
  constructor(name, version) {
    const program = this[_program] = new CommandEx(name)
      .option('-r, --root <rootdir>', 'root directory of local repository for bundles', (rootdir) => {
        if (rootdir) program[_baseOptions].rootdir = rootdir;
      })
      .option('-v, --verbose', 'display verbose logging while running command', () => {
        logger.setVerbose();
      })
      .version(version);
  }

  register(cmd) {
    const program = this[_program];

    // const inputstr = this.input && ` <${this.input}>` || '';
    const command = program.command(cmd.command)
      .description(cmd.description);
    for (const alias of cmd.aliases) {
      command.alias(alias);
    }
    for (const { flags, description, defaultValue } of cmd.opts) {
      // .option('-e, --exec_mode <mode>', 'Which exec mode to use', 'fast')
      command.option(flags, description, defaultValue);
    }
    if (cmd.helpText) {
      command.addHelpText(cmd.helpText);
    }
    // command.action(cmd.exec.bind(cmd));
    command.action(async function (...args) {
      // last arg is command. second last is options
      args.pop();
      const optns = { ...program[_baseOptions], ...(typeof args[args.length-1] === 'object' && args.pop() || undefined) };
      if (!validateOptions(optns)) {
        this.help();
        return;
      } 
      try {
        const config = await getConfig(optns);
        const ret = await cmd.exec(config, ...args);
        if (ret === false) {
          process.exit(1);
        }
      } catch (ex) {
        // command object is the last argument. removing it
        logger.error(ex);
        logger.error(`ERROR EXECUTION COMMAND: ${cmd.name} ${args.lenth > 2 ? args[0] : ''} ${JSON.stringify(optns)}! `, ex);
        process.exit(1);
      }
    });
    return command;
  }

  process(args) { 
    const program = this[_program];
    program.parse(args);
  }
}


module.exports = Handler;