const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

const guardUrl = pathToFileURL(path.resolve('client/productionApiGuard.mjs')).href;
const responseUrl = pathToFileURL(path.resolve('client/src/services/authResponse.ts')).href;

test('production build guard rejects the local-backend flag', async () => {
  const { assertProductionApiConfig, PRODUCTION_API_URL } = await import(guardUrl);
  assert.throws(
    () => assertProductionApiConfig({
      VITE_USE_LOCAL_BACKEND: 'true',
      VITE_API_URL: PRODUCTION_API_URL,
    }),
    /Production build rejected/
  );
});

test('production build guard rejects a localhost API URL', async () => {
  const { assertProductionApiConfig } = await import(guardUrl);
  assert.throws(
    () => assertProductionApiConfig({
      VITE_USE_LOCAL_BACKEND: 'false',
      VITE_API_URL: 'http://localhost:4000',
    }),
    /Production build rejected/
  );
});

test('production build guard accepts the Render API', async () => {
  const { assertProductionApiConfig, PRODUCTION_API_URL } = await import(guardUrl);
  assert.doesNotThrow(() => assertProductionApiConfig({
    VITE_USE_LOCAL_BACKEND: 'false',
    VITE_API_URL: PRODUCTION_API_URL,
  }));
});

test('production build guard accepts a missing API URL', async () => {
  const { assertProductionApiConfig } = await import(guardUrl);
  assert.doesNotThrow(() => assertProductionApiConfig({}));
});

test('HTML and malformed authentication responses are rejected', async () => {
  const { acceptAuthResponse, canEnterDashboard, INVALID_AUTH_RESPONSE } = await import(responseUrl);
  assert.throws(() => acceptAuthResponse('/api/login', '<!doctype html><html></html>'), new RegExp(INVALID_AUTH_RESPONSE));
  assert.throws(() => acceptAuthResponse('/api/login', '{not-json'), new RegExp(INVALID_AUTH_RESPONSE));
  assert.throws(() => acceptAuthResponse('/api/forgot-password', '<html>mail</html>'), new RegExp(INVALID_AUTH_RESPONSE));
  assert.throws(() => acceptAuthResponse('/api/webauthn/login/verify', { options: {} }), new RegExp(INVALID_AUTH_RESPONSE));
  assert.equal(canEnterDashboard('<!doctype html>'), false);
  assert.equal(canEnterDashboard({ error: 'The password is incorrect for this account.', code: 'password_incorrect' }), false);
});

test('a valid authentication payload can open a session', async () => {
  const { acceptAuthResponse, canEnterDashboard } = await import(responseUrl);
  const token = 'header.payload.signature-example';
  const body = acceptAuthResponse('/api/login', { token, role: 'admin', user: { id: 7 } });
  assert.equal(body.token, token);
  assert.equal(canEnterDashboard(body), true);
  const reset = acceptAuthResponse('/api/reset-password', { success: true, message: 'Password updated.' });
  assert.equal(reset.success, true);
  assert.equal(canEnterDashboard(reset), false);
});
