import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describeLoginFailure } from '../client/src/utils/loginFeedback.js';
import {
  clearAuthSession,
  readAuthValue,
  writeAuthSession,
} from '../client/src/utils/authStorage.js';

const require = createRequire(import.meta.url);
const { resolveVerifiedRole } = require('../utils/resolveVerifiedRole.js');

function memoryStore() {
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
  };
}

test('remembered sign-in stays in persistent storage only', () => {
  const persistent = memoryStore();
  const session = memoryStore();
  session.setItem('token', 'old-session');

  writeAuthSession({
    remember: true,
    persistent,
    session,
    entries: { token: 'kept', userRole: 'teacher', user: '{"id":1}' },
  });

  assert.equal(persistent.getItem('token'), 'kept');
  assert.equal(persistent.getItem('userRole'), 'teacher');
  assert.equal(session.getItem('token'), null);
  assert.equal(readAuthValue('token', [persistent, session]), 'kept');
});

test('unchecked remember me ends with the browser session', () => {
  const persistent = memoryStore();
  const session = memoryStore();
  persistent.setItem('token', 'old-login');
  persistent.setItem('userRole', 'admin');

  writeAuthSession({
    remember: false,
    persistent,
    session,
    entries: { token: 'tab-only', userRole: 'parent' },
  });

  assert.equal(persistent.getItem('token'), null);
  assert.equal(persistent.getItem('userRole'), null);
  assert.equal(session.getItem('token'), 'tab-only');
  assert.equal(session.getItem('userRole'), 'parent');
  assert.equal(readAuthValue('token', [persistent, session]), 'tab-only');
});

test('signing out clears both stores', () => {
  const persistent = memoryStore();
  const session = memoryStore();
  persistent.setItem('token', 'a');
  session.setItem('user', '{}');
  clearAuthSession([persistent, session]);
  assert.equal(readAuthValue('token', [persistent, session]), null);
  assert.equal(readAuthValue('user', [persistent, session]), null);
});

test('login failures distinguish connection problems from bad passwords', () => {
  const offline = describeLoginFailure({ message: 'Network Error' });
  assert.equal(offline.blameFields, false);
  assert.match(offline.message, /could not reach/i);

  const timeout = describeLoginFailure({ code: 'ECONNABORTED', message: 'timeout of 15000ms exceeded' });
  assert.equal(timeout.blameFields, false);
  assert.match(timeout.message, /timed out/i);

  const wrongPassword = describeLoginFailure({
    response: { status: 401, data: { error: 'Invalid password. Please check your credentials.' } },
  });
  assert.equal(wrongPassword.blameFields, true);
  assert.match(wrongPassword.message, /Invalid password/);

  const locked = describeLoginFailure({
    response: { status: 403, data: { error: 'Learner registration is closed.' } },
  });
  assert.equal(locked.blameFields, false);
  assert.match(locked.message, /closed/);

  const busy = describeLoginFailure({ response: { status: 503, data: {} } });
  assert.equal(busy.blameFields, false);
  assert.match(busy.message, /could not complete sign-in/i);
});

test('unverified accounts are not treated as learners', () => {
  assert.equal(resolveVerifiedRole({ dbRole: 'Admin' }), 'admin');
  assert.equal(resolveVerifiedRole({ matchedChild: true }), 'learner');
  assert.equal(resolveVerifiedRole({ tokenRole: 'teacher' }), 'teacher');
  assert.equal(resolveVerifiedRole({ dbRole: 'parent', tokenRole: 'admin' }), 'parent');
  assert.equal(resolveVerifiedRole({}), null);
  assert.equal(resolveVerifiedRole({ dbRole: '  ', tokenRole: '' }), null);
});
