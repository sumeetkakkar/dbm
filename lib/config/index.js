'use strict';

const os = require('os');
const path = require('path');
const fs = require('fs');
const { promises: fsPromises, constants: fsConstants } = fs;
const findUp = require('find-up');
const ini = require('ini');
const { NAME: name } = require('../constants');
const getSpecs = require('./specs');
const Config = require('./config');

const [ readIni, readIniSync ] = (() => {
  const rcfile = `.${name}rc`;
  async function loadIni(inifile) {
    try {
      await fsPromises.access(inifile, fsConstants.R_OK);
    } catch (ex) {
      if (ex.code === 'ENOENT') {
        return {};
      }
      throw ex;
    }

    const raw = await fsPromises.readFile(inifile, 'utf-8');
    return ini.parse(raw);
  }

  async function readIni(rootdir) {
    const inifile = rootdir && path.join(rootdir, rcfile) || await findUp(rcfile);
    if (! inifile) return {};
    return loadIni(inifile);
  }

  function readIniSync(rootdir) {
    const inifile = rootdir && path.join(rootdir, rcfile) || findUp.sync(rcfile);
    if (! inifile) return {};
    if (! fs.existsSync(inifile)) return {};
    const raw = fs.readFileSync(inifile, 'utf-8');
    return ini.parse(raw);
  }

  return [ readIni, readIniSync ];
})();

const readEnv = (() => {
  const prefix = new RegExp(`^${name}_config_`, 'i');
  return function readEnv(env=process.env) {
    const config = {};
    for (const ekey of Object.keys(env)) {
      if (ekey.match(prefix)) {
        const key = ekey.toLowerCase()
                        .replace(prefix, '')
                        .replace(/(?!^)_/g, '-');
        config[key] = env[ekey];
      }
    }
    return config;
  };
})();

let config;
async function getConfig(optns={}) {
  if (config) return config;
  const [ global, proj ] = await Promise.all([ 
    readIni(path.join(os.homedir(), `.${name}`)),
    readIni(),
  ]);
  const env = readEnv();
  const specs = getSpecs();
  config = new Config(specs, global, proj, env, optns);
  return config;
}

function getConfigSync(optns={}) {
  if (config) return config;
  const [ global, proj ] = [ 
    readIniSync(path.join(os.homedir(), `.${name}`)),
    readIniSync(),
  ];
  const env = readEnv();
  const specs = getSpecs();
  config = new Config(specs, global, proj, env, optns);
  return config;
}

function _clearConfig() {
  config = undefined;
}

module.exports = {
  getConfig,
  getConfigSync,
  _clearConfig,
};

// const conf = getConfigSync();
// console.log(conf.get('store'));
// for (const [key, value] of conf) {
//   console.log(key, value);
// }
// getConfig().then((config) => {
//   console.log(config.get('store'));
//   for (const [key, value] of config) {
//     console.log(key, value);
//   }
// }).catch(console.error);