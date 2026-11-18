'use strict';

require('./blockLiveEffects');

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const LEGACY_INTEGRATION = [
  'tests/phase1-critical-security.test.js',
  'tests/academic-streams.test.js',
  'tests/lesson-planning-db.test.js',
  'tests/school-registration-db.test.js',
  'tests/school-registration-approval.test.js',
  'tests/retention-payment-security.test.js'
];

describe('integration suite boundary', () => {
  test('legacy database tests are outside the default command', () => {
    for (const file of LEGACY_INTEGRATION) {
      assert.equal(fs.existsSync(path.join(root, file)), true, file);
      assert.equal(packageJson.scripts.test.includes(path.basename(file)), false, file);
    }
  });

  test('integration execution stays refused until a disposable database is named', () => {
    assert.equal(process.env.GELEZA_RUN_INTEGRATION, undefined);
    assert.equal(packageJson.scripts['test:integration'].includes('phase1-critical-security'), false);
    assert.match(packageJson.scripts['test:integration'], /bootstrap\.js/);
  });
});
