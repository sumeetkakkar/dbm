'use strict';
const assert = require('assert');
const path = require('path');
const cp = require('child_process');
const { promisify } = require('util');
const { promises: fsPromises } = require('fs');
const {
  _restoreStores: restoreStores
} = require('../../../lib/bundle/index');
const DummyStore = require('./fixtures/dummy');
const {
  processCommand,
  registerStore,
} = require('../../../index');
const {
  getRootDir
} = require('../../fixtures/utils');

const exec = promisify(cp.exec);

async function getCurrentVersion(bundledir) {
  try {
    return await fsPromises.readlink(path.resolve(bundledir, 'current'));
  } catch (ex) {
    if (ex.code === 'ENOENT') {
      return;
    }
    throw ex;
  }
}

async function getVersionCount(bundledir) {
  let cnt = 0;
  try {
    const files = await fsPromises.readdir(bundledir, { withFileTypes: true });
    for (const fdirent of files) {
      // check whether the file is a folder
      if (fdirent.isDirectory()) cnt++;
    }
  } catch (ex) {
    if (ex.code !== 'ENOENT') {
      throw ex;
    }
  }
  return cnt;
}

describe('store:dummy', function () {
  const stdoutWrite = process.stdout.write;
  let rootdir;
  before(async function () {
    const basedir = await getRootDir();
    rootdir = await fsPromises.mkdtemp(path.join(basedir, 'dummy-store-'));
  });

  after(async function () {
    if (rootdir) {
      try {
        await fsPromises.rmdir(rootdir, { recursive: true, force: true });
        // await fsPromises.rm(rootdir, { recursive: true, force: true });
      } catch (ex) {
        console.error(`Error deleting dir ${rootdir}`, ex);
        if (rootdir) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          await exec(`rm -rf ${rootdir}`);
        }
      }
    }
  });

  afterEach(() => {
    process.stdout.write = stdoutWrite;
    restoreStores();
  });

  it('test dummy store - module path', async function () {
    registerStore('dummy', require.resolve('./fixtures/dummy'), true);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout waiting for installBundle message')), 15000);
      process.stdout.write = function stdoutWrite_(msg) {
        if (/Bundle install under.*complete/.test(msg)) {
          clearTimeout(timer);
          setImmediate(resolve);
        }
      };

      processCommand('mycli', '1.0.0', [
        'node', __filename,
        '--root', rootdir,
        '--verbose',
        'install',
        'dummy',
      ]);
    });

    assert.strictEqual(await getCurrentVersion(path.join(rootdir, 'dummy')), '1.0.0');
    assert.strictEqual(await getVersionCount(path.join(rootdir, 'dummy')), 1);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout waiting for installBundle message 2.0.0')), 15000);
      process.stdout.write = function stdoutWrite_(msg) {
        if (/Bundle install under.*complete/.test(msg)) {
          clearTimeout(timer);
          setImmediate(resolve);
        }
      };

      processCommand('mycli', '1.0.0', [
        'node', __filename,
        '--root', rootdir,
        '--verbose',
        'install',
        'dummy',
        '2.0.0', // install 2.0.0 version
      ]);
    });
    assert.strictEqual(await getCurrentVersion(path.join(rootdir, 'dummy')), '2.0.0');
    assert.strictEqual(await getVersionCount(path.join(rootdir, 'dummy')), 2);

    let deleteMsg;
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout waiting while getting installed bundle path')), 15000);

      process.stdout.write = function stdoutWrite_(msg) {
        if (/Bundle versions removed:/.test(msg)) {
          deleteMsg = msg;
          clearTimeout(timer);
          setImmediate(resolve);
        }
      };
      
      processCommand('mycli', '1.0.0', [
        'node', __filename,
        '--root', rootdir,
        '--verbose',
        'remove',
        'dummy',
        '2.0.0',
      ]);
    });
    assert.match(deleteMsg, /Bundle versions removed: 1/, 'Should delete one bundle version');
    assert.strictEqual(await getCurrentVersion(path.join(rootdir, 'dummy')), '1.0.0');
    assert.strictEqual(await getVersionCount(path.join(rootdir, 'dummy')), 1);
  });

  it('test dummy store - instance', async function () {
    registerStore('dummy', DummyStore, true);
    const ver = '3.0.0';
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout waiting for installBundle message 2.0.0')), 15000);
      process.stdout.write = function stdoutWrite_(msg) {
        if (/Bundle install under.*complete/.test(msg)) {
          clearTimeout(timer);
          setImmediate(resolve);
        }
      };

      processCommand('mycli', '1.0.0', [
        'node', __filename,
        '--root', rootdir,
        '--verbose',
        'install',
        'dummy',
        ver, // install 3.0.0 version
      ]);
    });

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout waiting while getting installed bundle path')), 15000);

      const installPath = path.join(rootdir, 'dummy', ver, 'node_modules');
      process.stdout.write = function stdoutWrite_(msg) {
        if (msg === installPath) {
          clearTimeout(timer);
          setImmediate(resolve);
        }
      };
      
      processCommand('mycli', '1.0.0', [
        'node', __filename,
        '--root', rootdir,
        '--verbose',
        'path',
        'dummy',
        ver,
      ]);
    });
  });

});