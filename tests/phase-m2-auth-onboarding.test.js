'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  MAX_RESET_ATTEMPTS,
  NON_ENUMERATING_LOGIN_ERROR,
  NON_ENUMERATING_RECOVERY_MESSAGE,
  PRODUCTION_FRONTEND_ORIGIN,
  hashSecretValue,
  verifySecretHash,
  generateSecureToken,
  generateResetOtp,
  classifyLoginIdentifier,
  isSafeNextPath,
  isInternalPlaceholderEmail,
  evaluateEmailVerificationAccess,
  resolveFrontendOrigin,
  isOriginAllowed
} = require('../lib/authSecurity');
const testSafety = require('../lib/testSafety');

const ROOT = path.resolve(__dirname, '..');

test('Phase M2.1 — testSafety blocks BREVO_API_KEY and RESEND_API_KEY in test and staging guards', () => {
  const src = fs.readFileSync(path.join(ROOT, 'lib/testSafety.js'), 'utf8');
  assert.match(src, /'RESEND_API_KEY'/);
  assert.match(src, /'BREVO_API_KEY'/);
  assert.equal(testSafety.isIsolatedRuntime(), true);
});

test('Phase M2.2 — classifyLoginIdentifier strictly separates email and Learner Number', () => {
  assert.deepEqual(classifyLoginIdentifier('Parent.One@Example.COM'), {
    kind: 'email',
    normalized: 'parent.one@example.com'
  });
  assert.deepEqual(classifyLoginIdentifier(' 20260001 '), {
    kind: 'learner_number',
    normalized: '20260001'
  });
  assert.deepEqual(classifyLoginIdentifier(''), { kind: 'invalid', normalized: '' });
  assert.deepEqual(classifyLoginIdentifier('bad identifier!!'), { kind: 'invalid', normalized: '' });
});

test('Phase M2.2 — cryptographic OTP and token hashing with constant-time verification', () => {
  const otp = generateResetOtp();
  assert.match(otp, /^\d{10}$/);
  const otpHash = hashSecretValue(otp);
  assert.equal(otpHash.length, 64);
  assert.equal(verifySecretHash(otp, otpHash), true);
  assert.equal(verifySecretHash('0000000000', otpHash), false);

  const tok = generateSecureToken();
  assert.ok(tok.token.length >= 40);
  assert.equal(tok.hash, hashSecretValue(tok.token));
  assert.equal(verifySecretHash(tok.token, tok.hash), true);
  assert.equal(MAX_RESET_ATTEMPTS, 5);
});

test('Phase M2.2 — legacy email verification access policy preserves legacy login without trusting unverified recovery', () => {
  const verified = evaluateEmailVerificationAccess({
    password_hash: '$2a$10$hash',
    password_set_at: '2026-10-01T10:00:00Z',
    email_verified_at: '2026-10-01T10:00:00Z',
    email_verification_status: 'verified',
    email: 'parent@example.com'
  });
  assert.equal(verified.allowedToLogin, true);
  assert.equal(verified.canUseSelfServiceEmailRecovery, true);

  const legacyUnverified = evaluateEmailVerificationAccess({
    password_hash: '$2a$10$hash',
    password_set_at: null,
    email_verified_at: null,
    email_verification_status: 'legacy_unverified',
    email: 'legacy@example.com'
  });
  assert.equal(legacyUnverified.allowedToLogin, true);
  assert.equal(legacyUnverified.canUseSelfServiceEmailRecovery, false);

  const pendingNewParent = evaluateEmailVerificationAccess({
    password_hash: '$2a$10$hash',
    password_set_at: '2026-11-22T10:00:00Z',
    email_verified_at: null,
    email_verification_status: 'pending_verification',
    email: 'newparent@example.com'
  });
  assert.equal(pendingNewParent.allowedToLogin, false);
  assert.equal(pendingNewParent.canUseSelfServiceEmailRecovery, false);
  assert.equal(pendingNewParent.code, 'email_verification_required');

  const noEmailLearner = evaluateEmailVerificationAccess({
    password_hash: '$2a$10$hash',
    password_set_at: '2026-11-22T10:00:00Z',
    email_verified_at: null,
    email_verification_status: 'verified',
    email: 'learner.12@1.geleza.local'
  });
  assert.equal(noEmailLearner.allowedToLogin, true);
  assert.equal(noEmailLearner.canUseSelfServiceEmailRecovery, false);
  assert.equal(isInternalPlaceholderEmail('learner.12@1.geleza.local'), true);
});

test('Phase M2.3 — isSafeNextPath strictly allowlists safe relative paths and blocks open redirects', () => {
  assert.equal(isSafeNextPath('/application.html'), '/application.html');
  assert.equal(isSafeNextPath('/application.html?school=staging-horizon'), '/application.html?school=staging-horizon');
  assert.equal(isSafeNextPath('/dashboard/parent?tab=registration'), '/dashboard/parent?tab=registration');

  assert.equal(isSafeNextPath('https://evil.example.com/phish'), null);
  assert.equal(isSafeNextPath('http://evil.example.com'), null);
  assert.equal(isSafeNextPath('//evil.example.com/application.html'), null);
  assert.equal(isSafeNextPath('javascript:alert(1)'), null);
  assert.equal(isSafeNextPath('/\\evil.example.com'), null);
  assert.equal(isSafeNextPath('/unapproved/path'), null);
  assert.equal(isSafeNextPath('/application.html?redirect=https://evil.com'), null);
});

test('Phase M2.6 — resolveFrontendOrigin never defaults production email links to Render backend URL', () => {
  const prodDefault = resolveFrontendOrigin(null, {
    NODE_ENV: 'production',
    APP_URL: 'https://fusion-high-backend.onrender.com'
  });
  assert.equal(prodDefault, PRODUCTION_FRONTEND_ORIGIN);

  const prodExplicit = resolveFrontendOrigin(null, {
    NODE_ENV: 'production',
    FRONTEND_URL: 'https://fusion-high-app.web.app/'
  });
  assert.equal(prodExplicit, 'https://fusion-high-app.web.app');

  const stagingExplicit = resolveFrontendOrigin(null, {
    NODE_ENV: 'production',
    GELEZA_STAGING: '1',
    FRONTEND_URL: 'http://127.0.0.1:4173'
  });
  assert.equal(stagingExplicit, 'http://127.0.0.1:4173');
});

test('Phase M2.6 — explicit CORS allowlist permits Firebase & loopback and rejects arbitrary origins', () => {
  assert.equal(isOriginAllowed('https://fusion-high-app.web.app', {}), true);
  assert.equal(isOriginAllowed('https://fusion-high-app.firebaseapp.com', {}), true);
  assert.equal(isOriginAllowed('http://127.0.0.1:4173', {}), true);
  assert.equal(isOriginAllowed('http://localhost:5173', {}), true);
  assert.equal(isOriginAllowed('https://attacker-phishing.example.com', {}), false);
  assert.equal(isOriginAllowed('https://random-app.onrender.com', {}), false);
  assert.equal(isOriginAllowed('https://random-app.vercel.app', {}), false);
});

test('Phase M2.5 — legacy ID-derived password generators and public /register CTA are removed', () => {
  const authCtrl = fs.readFileSync(path.join(ROOT, 'public/src/controller/authController.js'), 'utf8');
  assert.doesNotMatch(authCtrl, /generateLearnerPasswordFromID/);
  assert.doesNotMatch(authCtrl, /generated_password/);
  assert.match(authCtrl, /legacy_registration_retired/);
  assert.ok(NON_ENUMERATING_LOGIN_ERROR.length > 10);
  assert.ok(NON_ENUMERATING_RECOVERY_MESSAGE.length > 10);

  const learnerMatch = fs.readFileSync(path.join(ROOT, 'public/src/services/learnerMatch.js'), 'utf8');
  assert.doesNotMatch(learnerMatch, /learnerPasswordFromId/);
  assert.doesNotMatch(learnerMatch, /generated_password/);

  // Verify client/public/application.html and public/application.html stay byte-identical and contain zero /register links
  const clientAppHtml = fs.readFileSync(path.join(ROOT, 'client/public/application.html'), 'utf8');
  const publicAppHtml = fs.readFileSync(path.join(ROOT, 'public/application.html'), 'utf8');
  assert.equal(clientAppHtml, publicAppHtml);
  assert.doesNotMatch(clientAppHtml, /href="\/register"/);
  assert.match(clientAppHtml, /id="parent_password"/);
  assert.match(clientAppHtml, /id="confirm_parent_password"/);
  assert.doesNotMatch(clientAppHtml, /learner_password/i);

  // Verify application.js parity
  const clientAppJs = fs.readFileSync(path.join(ROOT, 'client/public/js/application.js'), 'utf8');
  const publicAppJs = fs.readFileSync(path.join(ROOT, 'public/js/application.js'), 'utf8');
  assert.equal(clientAppJs, publicAppJs);
  assert.match(clientAppJs, /Authorization/);
  assert.match(clientAppJs, /EXISTING_ACCOUNT_LOGIN_REQUIRED/);
});
