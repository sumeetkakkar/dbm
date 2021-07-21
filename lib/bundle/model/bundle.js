'user strict';
const Model = require('./_base');

const _versions = Symbol('_versions');

const properties = [
  'name',
  'tags',
];

class Bundle extends Model {
  static get properties() { return [ ...properties ]; }

  get versions() { return this._data[_versions] || []; }
  set versions(vers) { this._data[_versions] = vers; }
}

Bundle.setupProperties();

module.exports = Bundle;