const test = require('node:test');
const assert = require('node:assert/strict');
const { googleRelayAccepted } = require('../public/src/services/emailService');

test('a relay success that does not name the recipient is not delivery', () => {
  assert.equal(googleRelayAccepted({ success: true }, 'parent@school.co.za'), false);
});

test('a relay success that names the same recipient is delivery', () => {
  assert.equal(
    googleRelayAccepted({ success: true, to: 'Parent@school.co.za' }, 'parent@school.co.za'),
    true
  );
});

test('a relay success with a provider message id is delivery', () => {
  assert.equal(googleRelayAccepted({ success: true, id: 'msg_1' }, 'parent@school.co.za'), true);
});
