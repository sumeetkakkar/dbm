'use strict';
const fs = require('fs');
const path = require('path');
const Handler = require('./handler');

function loadCommands(name, version) {
  const dir = 'impl';
  const handler = new Handler(name, version);
  // const cmds = new Map();
  // function addCommand(name, cmd) {
  //   if (cmds.has(name)) {
  //     const used = cmds.get(name);
  //     throw new Error(`${name} is already used for [${used.name}/${used.description}.`);
  //   }
  //   cmds.set(name, cmd);
  // }
  const files = fs.readdirSync(path.resolve(__dirname, dir));
  for (const file of files) {
    const cname = path.basename(file, '.js');
    try {
      const Impl = require(`./${dir}/${cname}`);
      const cmd = new Impl();
      if (cmd.disabled) continue;
      handler.register(cmd);
      // addCommand(cmd.name, cmd);
      // if (cmd.aliases) {
      //   for (const alias of cmd.aliases) {
      //     addCommand(alias, cmd);
      //   }
      // }
    } catch(ex) {
      throw new Error(`Error loading implementation of command "${cname}" [Error: ${ex.message}]`);
    }
  }

  return handler;
  // return cmds;
}

// const cmds = loadCommands('impl');

// function execCommand(name, args, options) {
//   const Impl = cmds.get(name);
//   if (!Impl) {
//     const err = new Error(`Oh no! '${name}' is an unknown cli option. If you want to look for the exact option name, check out '$ ${NAME} help'`);
//     err.code = 'COMMAND_NOT_FOUND';
//     throw err;
//   }
//   const cmd = new Impl(options);
//   return cmd.exec(args);
// }

module.exports = {
  processCommand(name, version, args) {
    const handler = loadCommands(name, version);
    handler.process(args);
    return handler;
  }
};