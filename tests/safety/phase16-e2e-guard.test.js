'use strict';

require('./blockLiveEffects');

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

describe('end-to-end suite boundary', () => {
  test('live scripts are not started by npm test, npm run test:integration, or npm run test:e2e', () => {
    const commands = ['test', 'test:unit', 'test:integration', 'test:e2e'];
    for (const name of commands) {
      const command = packageJson.scripts[name];
      assert.match(command, /bootstrap\.js|npm test/);
      for (const unsafe of ['test-gemini.js', 'geleza-ai-automation', 'verify_', 'dashboard_comprehensive']) {
        assert.equal(command.includes(unsafe), false, `${name} includes ${unsafe}`);
      }
    }
  });

  test('the Gemini script remains a refused live check', () => {
    const source = fs.readFileSync(path.join(root, 'tests/test-gemini.js'), 'utf8');
    assert.match(source, /GELEZA_ALLOW_LIVE_GEMINI/);
    assert.match(source, /process\.exit\(1\)/);
  });
});
