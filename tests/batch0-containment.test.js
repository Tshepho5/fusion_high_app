const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { maintenanceAuthorized } = require('../public/src/services/maintenanceGate');

describe('maintenance gate', () => {
  const previous = process.env.MAINTENANCE_TOKEN;

  afterEach(() => {
    if (previous === undefined) delete process.env.MAINTENANCE_TOKEN;
    else process.env.MAINTENANCE_TOKEN = previous;
  });

  beforeEach(() => {
    delete process.env.MAINTENANCE_TOKEN;
  });

  it('stays closed when no maintenance token is configured', () => {
    assert.equal(maintenanceAuthorized('anything-at-least-24-characters'), false);
  });

  it('rejects a short configured token', () => {
    process.env.MAINTENANCE_TOKEN = 'short-token';
    assert.equal(maintenanceAuthorized('short-token'), false);
  });

  it('rejects a wrong token of the same length', () => {
    process.env.MAINTENANCE_TOKEN = 'a'.repeat(32);
    assert.equal(maintenanceAuthorized('b'.repeat(32)), false);
  });

  it('accepts only the configured token', () => {
    const token = 'maintenance-token-value-32b!!';
    process.env.MAINTENANCE_TOKEN = token;
    assert.equal(maintenanceAuthorized(token), true);
    assert.equal(maintenanceAuthorized(''), false);
  });
});
