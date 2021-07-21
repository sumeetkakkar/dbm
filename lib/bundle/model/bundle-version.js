'use strict';
const Model = require('./_base');

const properties = [
  'version',
  'tag',
  'ref', // any reference
  'publisher',
];

class BundleVersion extends Model {
  static get properties() { return [ ...properties ]; }
}

BundleVersion.setupProperties();

module.exports = BundleVersion;

