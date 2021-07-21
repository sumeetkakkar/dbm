'use strict';
const sinon = require('sinon');
const cp = require('child_process');
const { PassThrough } = require('stream');
const { EventEmitter } = require('events');

function fakeSpawn(onspawn=()=>{}) {
  const sandbox = new sinon.createSandbox();
  sandbox.replace(cp, 'spawn', (...args) => {
    const stdout=new PassThrough();
    const stderr=new PassThrough();
    const stdin=new PassThrough();
    const mocked = new EventEmitter();
    const close = (code=0)=> {
      mocked.emit('close', code);
      mocked.removeAllListeners();
    };
    stdout.once('end', close.bind(undefined, 0));
    stderr.once('end', close.bind(undefined, 128));
    Object.assign(mocked, { stdout, stderr, stdin, });
    onspawn.instance = mocked;
    onspawn.call(mocked, ...args);
    return mocked;
  });
  return sandbox;
}

module.exports = fakeSpawn;