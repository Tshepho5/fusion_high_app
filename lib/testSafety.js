'use strict';

const http = require('http');
const https = require('https');
const net = require('net');
const tls = require('tls');

const PRODUCTION_FIREBASE_PROJECT = 'fusion-high-app';
const PRODUCTION_DATABASE_NAMES = new Set(['fusion_db', 'postgres', 'template0', 'template1']);
const APPROVED_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const DISPOSABLE_DATABASE = /^geleza_(test|phase|streams)_[a-z0-9_]+$/i;

const DATABASE_ENV_KEYS = [
  'DATABASE_URL',
  'POSTGRES_URL',
  'POSTGRES_PRISMA_URL',
  'SUPABASE_DATABASE_URL',
  'POSTGRES_URL_NON_POOLING'
];

const SECRET_ENV_KEYS = [
  'FIREBASE_SERVICE_ACCOUNT_JSON',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'GOOGLE_APPLICATION_CREDENTIALS',
  'GEMINI_API_KEY',
  'GOOGLE_API_KEY',
  'SMTP_PASS',
  'SMTP_PASSWORD',
  'WHATSAPP_TOKEN',
  'WHATSAPP_ACCESS_TOKEN',
  'VAPID_PRIVATE_KEY'
];

class TestSafetyError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TestSafetyError';
    this.code = 'TEST_SAFETY';
  }
}

function isTestProcess() {
  if (process.env.GELEZA_TEST_MODE === '1') return true;
  if (process.env.NODE_ENV === 'test') return true;
  const execArgs = process.execArgv || [];
  if (execArgs.some((arg) => arg === '--test' || arg.startsWith('--test'))) return true;
  const entry = process.argv[1] || '';
  return /(?:^|[/\\])tests(?:[/\\]|$)/.test(entry);
}

function normaliseHost(host) {
  return String(host || '')
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/:\d+$/, '');
}

function isApprovedHost(host) {
  const normalised = normaliseHost(host);
  return APPROVED_HOSTS.has(normalised) || APPROVED_HOSTS.has(`[${normalised}]`);
}

function parseDatabaseTarget(target) {
  if (!target) {
    throw new TestSafetyError('A database target is required before a test connection can be created.');
  }
  if (typeof target === 'string') {
    return parseConnectionString(target);
  }
  if (target.connectionString) return parseConnectionString(target.connectionString);
  return {
    host: target.host || '',
    database: target.database || ''
  };
}

function parseConnectionString(connectionString) {
  let parsed;
  try {
    parsed = new URL(String(connectionString).replace(/^postgres(ql)?:/i, 'http:'));
  } catch (_) {
    throw new TestSafetyError('The test database target could not be read. The connection was refused.');
  }
  const database = decodeURIComponent((parsed.pathname || '').replace(/^\//, '').split('/')[0] || '');
  return { host: parsed.hostname || '', database };
}

function assertTestDatabaseAllowed(target) {
  if (!isTestProcess()) return parseDatabaseTarget(target);
  const described = parseDatabaseTarget(target);
  const database = String(described.database || '');
  const host = String(described.host || '');
  const expected = process.env.GELEZA_TEST_DATABASE || '';

  if (!expected) {
    throw new TestSafetyError(
      'Tests require GELEZA_TEST_DATABASE to name an explicit disposable database. No connection was created.'
    );
  }
  if (database.toLowerCase() === 'fusion_db' || PRODUCTION_DATABASE_NAMES.has(database.toLowerCase())) {
    throw new TestSafetyError(
      `Tests cannot use the database "${database}". FUSION_DB and server maintenance databases are refused.`
    );
  }
  if (!DISPOSABLE_DATABASE.test(database) || database !== expected) {
    throw new TestSafetyError(
      'The database name does not match the explicit disposable test database. No connection was created.'
    );
  }
  if (!isApprovedHost(host)) {
    throw new TestSafetyError(
      `Tests cannot use the database host "${host || '(missing)'}". Only a loopback host is approved.`
    );
  }
  return described;
}

function assertFirebaseTestAllowed(options = {}) {
  if (!isTestProcess()) return { mode: 'runtime' };
  const projectId = String(options.projectId || process.env.FIREBASE_PROJECT_ID || '').trim();
  if (projectId === PRODUCTION_FIREBASE_PROJECT) {
    throw new TestSafetyError(
      'Tests cannot initialise the production Firebase project fusion-high-app.'
    );
  }
  if (process.env.GELEZA_FIREBASE_MOCK === '1') return { mode: 'mock' };
  if (process.env.GELEZA_FIREBASE_EMULATOR === '1') {
    if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
      throw new TestSafetyError(
        'Firebase emulator tests require FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST. No project was initialised.'
      );
    }
    if (!projectId || projectId === PRODUCTION_FIREBASE_PROJECT) {
      throw new TestSafetyError(
        'Firebase emulator tests require a non-production FIREBASE_PROJECT_ID. fusion-high-app was refused.'
      );
    }
    return { mode: 'emulator', projectId };
  }
  throw new TestSafetyError(
    'Firebase tests require GELEZA_FIREBASE_MOCK=1 or GELEZA_FIREBASE_EMULATOR=1. Missing mocks do not fall back to production.'
  );
}

function mockFlag(service) {
  return `GELEZA_${String(service || '').toUpperCase()}_MOCK`;
}

function refuseExternalService(service) {
  if (!isTestProcess()) return;
  if (process.env[mockFlag(service)] === '1') return;
  throw new TestSafetyError(
    `${service} calls are blocked during tests. Set ${mockFlag(service)}=1 only for an explicit test double.`
  );
}

function hostFromRequestArgs(args) {
  const first = args[0];
  const second = args[1];
  if (typeof first === 'string') {
    try { return new URL(first).hostname; } catch (_) { return ''; }
  }
  if (first instanceof URL) return first.hostname;
  if (typeof first === 'number') return typeof second === 'string' ? second : 'localhost';
  if (first && typeof first === 'object') {
    if (first.href) {
      try { return new URL(first.href).hostname; } catch (_) { return ''; }
    }
    return first.hostname || first.host || '';
  }
  return '';
}

function rejectBlockedHost(host, label) {
  if (isApprovedHost(host)) return;
  throw new TestSafetyError(
    `External ${label} to "${host || '(unknown host)'}" is blocked during tests.`
  );
}

let networkGuardInstalled = false;
let bootstrapActivated = false;

function installTestNetworkGuard() {
  if (networkGuardInstalled) return;
  networkGuardInstalled = true;

  const wrapRequest = (original, label) => function guardedRequest(...args) {
    if (isTestProcess()) rejectBlockedHost(hostFromRequestArgs(args), label);
    return original.apply(this, args);
  };

  http.request = wrapRequest(http.request, 'HTTP');
  http.get = wrapRequest(http.get, 'HTTP');
  https.request = wrapRequest(https.request, 'HTTPS');
  https.get = wrapRequest(https.get, 'HTTPS');

  const wrapConnect = (original, label) => function guardedConnect(...args) {
    if (isTestProcess()) rejectBlockedHost(hostFromRequestArgs(args), label);
    return original.apply(this, args);
  };
  net.connect = wrapConnect(net.connect, 'TCP');
  tls.connect = wrapConnect(tls.connect, 'TLS');

  if (typeof global.fetch === 'function') {
    const originalFetch = global.fetch;
    global.fetch = function guardedFetch(input, init) {
      if (isTestProcess()) {
        const raw = typeof input === 'string' ? input : (input && input.url) || '';
        let host = '';
        try { host = new URL(raw).hostname; } catch (_) { host = ''; }
        rejectBlockedHost(host, 'fetch');
      }
      return originalFetch.apply(this, arguments);
    };
  }
}

function connectionIsApproved(value) {
  if (!value) return false;
  try {
    assertTestDatabaseAllowed(value);
    return true;
  } catch (_) {
    return false;
  }
}

function activateTestSafetyBootstrap() {
  if (bootstrapActivated) return;
  bootstrapActivated = true;
  process.env.GELEZA_TEST_MODE = '1';
  if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
    process.env.NODE_ENV = 'test';
  }
  for (const key of DATABASE_ENV_KEYS) {
    if (process.env[key] && !connectionIsApproved(process.env[key])) delete process.env[key];
  }
  for (const key of SECRET_ENV_KEYS) delete process.env[key];
  if (process.env.FIREBASE_PROJECT_ID === PRODUCTION_FIREBASE_PROJECT) {
    delete process.env.FIREBASE_PROJECT_ID;
  }
  installTestNetworkGuard();
}

module.exports = {
  APPROVED_HOSTS,
  DISPOSABLE_DATABASE,
  PRODUCTION_FIREBASE_PROJECT,
  TestSafetyError,
  activateTestSafetyBootstrap,
  assertFirebaseTestAllowed,
  assertTestDatabaseAllowed,
  installTestNetworkGuard,
  isApprovedHost,
  isTestProcess,
  parseConnectionString,
  parseDatabaseTarget,
  refuseExternalService
};
