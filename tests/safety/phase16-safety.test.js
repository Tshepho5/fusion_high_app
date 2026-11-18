'use strict';

require('./blockLiveEffects');

const { describe, test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const jwt = require('jsonwebtoken');

const root = path.join(__dirname, '..', '..');
const {
  TestSafetyError,
  assertFirebaseTestAllowed,
  assertTestDatabaseAllowed,
  refuseExternalService
} = require('../../lib/testSafety');
const {
  createEnforceDatabaseSuperadmin,
  loadAuthoritativeAccount,
  resetAuthoritativeAccessCache,
  testerRoleChangeAllowed
} = require('../../lib/authoritativeAccess');

const SECRET = 'phase16-test-secret-not-a-credential';
const DESIGNATED_ADMIN = Object.freeze({
  email: '202247878@myturf.ul.ac.za',
  role_name: 'admin',
  is_superadmin: true,
  active_session_id: 'designated-session',
  school_id: 10
});

const state = {
  columns: [],
  users: [],
  children: [],
  recycle: []
};

function rowsFor(text) {
  if (/information_schema/i.test(text)) {
    return state.columns.map((column_name) => ({ column_name }));
  }
  if (/recycle_bin/i.test(text)) return state.recycle;
  if (/FROM children/i.test(text)) return state.children;
  if (/FROM users/i.test(text)) return state.users;
  return [];
}

const dbPath = require.resolve('../../db/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: {
    query: async (text) => ({ rows: rowsFor(text) }),
    pool: {}
  }
};

const { auth, requireRole } = require('../../authMiddleware');
const schoolSource = fs.readFileSync(path.join(root, 'public/src/routes/schoolRoutes.js'), 'utf8');
const systemSource = fs.readFileSync(path.join(root, 'public/src/routes/systemRoutes.js'), 'utf8');
const authSource = fs.readFileSync(path.join(root, 'authMiddleware.js'), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

function minimalEnv(extra = {}) {
  return {
    PATH: process.env.PATH || '',
    HOME: process.env.HOME || '',
    NODE_ENV: 'test',
    GELEZA_TEST_MODE: '1',
    ...extra
  };
}

function runNode(script, extraEnv = {}) {
  return spawnSync(process.execPath, ['-e', script], {
    cwd: root,
    env: minimalEnv(extraEnv),
    encoding: 'utf8',
    timeout: 15000
  });
}

function sign(claims) {
  return jwt.sign(claims, SECRET, { expiresIn: '5m' });
}

function invoke(middleware, req) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const res = {
      statusCode: 200,
      body: null,
      status(code) { this.statusCode = code; return this; },
      json(payload) {
        this.body = payload;
        finish({ statusCode: this.statusCode, body: payload, nexted: false });
        return this;
      },
      cookie() { return this; },
      clearCookie() { return this; }
    };
    Promise.resolve(middleware(req, res, () => finish({
      statusCode: res.statusCode,
      body: res.body,
      nexted: true,
      user: req.user
    }))).catch(reject);
    setTimeout(() => {
      if (!settled) reject(new Error('middleware timed out'));
    }, 2000);
  });
}

beforeEach(() => {
  resetAuthoritativeAccessCache();
  state.columns = [];
  state.users = [];
  state.children = [];
  state.recycle = [];
  process.env.JWT_SECRET = SECRET;
});

describe('PostgreSQL test isolation', () => {
  test('rejects FUSION_DB before a connection exists', () => {
    process.env.GELEZA_TEST_DATABASE = 'geleza_test_probe';
    assert.throws(
      () => assertTestDatabaseAllowed('postgresql://127.0.0.1:5432/FUSION_DB'),
      (err) => err instanceof TestSafetyError && /FUSION_DB/.test(err.message)
    );
  });

  test('rejects an unapproved database host', () => {
    process.env.GELEZA_TEST_DATABASE = 'geleza_test_probe';
    assert.throws(
      () => assertTestDatabaseAllowed('postgresql://prod.db.example.invalid:5432/geleza_test_probe'),
      (err) => err instanceof TestSafetyError && /host/.test(err.message)
    );
  });

  test('rejects a missing disposable database name', () => {
    delete process.env.GELEZA_TEST_DATABASE;
    assert.throws(
      () => assertTestDatabaseAllowed('postgresql://127.0.0.1:5432/geleza_test_probe'),
      (err) => err instanceof TestSafetyError && /GELEZA_TEST_DATABASE/.test(err.message)
    );
  });

  test('db.js refuses a production-looking target without opening a pool', () => {
    const result = runNode(
      "require('./db/db');",
      { DATABASE_URL: 'postgresql://prod.db.example.invalid:5432/FUSION_DB' }
    );
    assert.notEqual(result.status, 0);
    assert.match(`${result.stderr}\n${result.stdout}`, /FUSION_DB|disposable database|TEST_SAFETY|TestSafetyError/);
    assert.doesNotMatch(`${result.stderr}\n${result.stdout}`, /Database connection successful/);
  });
});

describe('Firebase test isolation', () => {
  test('rejects the production project id', () => {
    process.env.GELEZA_FIREBASE_MOCK = '1';
    assert.throws(
      () => assertFirebaseTestAllowed({ projectId: 'fusion-high-app' }),
      (err) => err instanceof TestSafetyError && /fusion-high-app/.test(err.message)
    );
    delete process.env.GELEZA_FIREBASE_MOCK;
  });

  test('fails closed when no mock or emulator is configured', () => {
    delete process.env.GELEZA_FIREBASE_MOCK;
    delete process.env.GELEZA_FIREBASE_EMULATOR;
    assert.throws(
      () => assertFirebaseTestAllowed({ projectId: 'geleza-test' }),
      (err) => err instanceof TestSafetyError && /Missing mocks/.test(err.message)
    );
  });

  test('the Firebase module does not initialise fusion-high-app when a mock is missing', () => {
    const result = runNode("require('./db/firebase');", {
      FIREBASE_PROJECT_ID: 'fusion-high-app',
      FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({ project_id: 'fusion-high-app' })
    });
    assert.notEqual(result.status, 0);
    assert.match(`${result.stderr}\n${result.stdout}`, /fusion-high-app|Missing mocks|TestSafetyError/);
    assert.doesNotMatch(`${result.stderr}\n${result.stdout}`, /initialized successfully/);
  });

  test('an explicit mock exports no Firebase app', () => {
    const result = runNode(
      "const firebase = require('./db/firebase'); if (firebase.app || firebase.db || firebase.mocked !== true) process.exit(2);",
      { GELEZA_FIREBASE_MOCK: '1', FIREBASE_PROJECT_ID: 'geleza-test' }
    );
    assert.equal(result.status, 0, result.stderr || result.stdout);
  });

  test('an emulator flag still cannot select fusion-high-app', () => {
    process.env.GELEZA_FIREBASE_EMULATOR = '1';
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
    assert.throws(
      () => assertFirebaseTestAllowed({ projectId: 'fusion-high-app' }),
      /fusion-high-app/
    );
    delete process.env.GELEZA_FIREBASE_EMULATOR;
    delete process.env.FIRESTORE_EMULATOR_HOST;
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
  });
});

describe('external-service isolation', () => {
  test('email, AI, WhatsApp, and push fail closed without a test double', () => {
    for (const service of ['email', 'ai', 'whatsapp', 'push']) {
      delete process.env[`GELEZA_${service.toUpperCase()}_MOCK`];
      assert.throws(() => refuseExternalService(service), TestSafetyError);
    }
  });

  test('the AI provider refuses a configured key during tests', () => {
    const result = runNode(
      "const ai = require('./public/src/services/ai/aiProvider'); ai.getClient();",
      { GEMINI_API_KEY: 'not-a-live-key' }
    );
    assert.notEqual(result.status, 0);
    assert.match(`${result.stderr}\n${result.stdout}`, /blocked during tests/);
  });

  test('fetch to a public host is blocked by the test bootstrap', () => {
    assert.throws(() => fetch('https://example.invalid/phase16'), TestSafetyError);
  });

  test('document verification refuses Gemini before a model call', () => {
    const source = fs.readFileSync(path.join(root, 'public/src/services/applicationService.js'), 'utf8');
    const refusal = source.indexOf("refuseExternalService('ai')");
    const call = source.indexOf('getGenerativeModel(');
    assert.ok(refusal > 0);
    assert.ok(call > refusal);
  });

  test('the live Gemini script exits before calling a model', () => {
    const result = spawnSync(process.execPath, ['tests/test-gemini.js'], {
      cwd: root,
      env: minimalEnv({ GEMINI_API_KEY: 'not-a-live-key' }),
      encoding: 'utf8',
      timeout: 15000
    });
    assert.equal(result.status, 1);
    assert.match(`${result.stderr}\n${result.stdout}`, /Refusing to call Gemini/);
    assert.doesNotMatch(`${result.stderr}\n${result.stdout}`, /Trying gemini/);
  });
});

describe('test-suite separation', () => {
  test('the default npm test command loads the bootstrap and only safe unit files', () => {
    assert.match(packageJson.scripts.test, /--require \.\/tests\/safety\/bootstrap\.js/);
    assert.match(packageJson.scripts['test:unit'], /npm test/);
    assert.match(packageJson.scripts['test:integration'], /phase16-integration\.test\.js/);
    assert.match(packageJson.scripts['test:e2e'], /phase16-e2e-guard\.test\.js/);
    for (const unsafe of [
      'test-gemini.js',
      'phase1-critical-security',
      'lesson-planning-db',
      'school-registration-db',
      'school-registration-approval',
      'geleza-ai-automation',
      'run_schema_test',
      'verify_',
      'tests/test_'
    ]) {
      assert.equal(packageJson.scripts.test.includes(unsafe), false, unsafe);
    }
  });
});

describe('database-authoritative superadmin authorization', () => {
  test('the designated admin keeps an admin role and the database flag', async () => {
    state.users = [{ ...DESIGNATED_ADMIN }];
    const loaded = await loadAuthoritativeAccount(
      async (text) => ({ rows: rowsFor(text) }),
      42
    );
    assert.equal(loaded.state, 'active');
    assert.equal(loaded.account.role, 'admin');
    assert.equal(loaded.account.is_superadmin, true);
    assert.equal(loaded.account.email, DESIGNATED_ADMIN.email);
  });

  test('a superadmin role name without the database flag is denied', async () => {
    state.users = [{
      id: 7,
      email: 'role-only@example.com',
      role_name: 'superadmin',
      is_superadmin: false,
      active_session_id: 'sid-role',
      school_id: 3
    }];
    const guard = createEnforceDatabaseSuperadmin(async (text) => ({ rows: rowsFor(text) }));
    const result = await invoke(guard, { user: { id: 7, role: 'superadmin', is_superadmin: true } });
    assert.equal(result.nexted, false);
    assert.equal(result.statusCode, 403);
  });

  test('a JWT superadmin claim cannot pass the school-review rule', async () => {
    state.users = [{
      id: 8,
      email: 'ordinary-admin@example.com',
      role_name: 'admin',
      is_superadmin: false,
      active_session_id: 'sid-admin',
      school_id: 4
    }];
    const guard = createEnforceDatabaseSuperadmin(
      async (text) => ({ rows: rowsFor(text) }),
      'Only Geleza SA platform administrators can review school admissions and registrations.'
    );
    const result = await invoke(guard, {
      user: { id: 8, role: 'admin', is_superadmin: true, sid: 'sid-admin' }
    });
    assert.equal(result.statusCode, 403);
    assert.match(result.body.error, /school admissions and registrations/);
    assert.equal(result.user ? result.user.is_superadmin : false, false);
  });

  test('auth replaces a stale superadmin claim with the current database flag', async () => {
    state.users = [{
      id: 9,
      email: 'stale@example.com',
      role_name: 'admin',
      is_superadmin: false,
      active_session_id: 'sid-stale',
      school_id: 5
    }];
    const token = sign({
      id: 9,
      role: 'superadmin',
      email: 'stale@example.com',
      is_superadmin: true,
      school_id: 999,
      sid: 'sid-stale'
    });
    const result = await invoke(auth, { headers: { authorization: `Bearer ${token}` } });
    assert.equal(result.nexted, true);
    assert.equal(result.user.is_superadmin, false);
    assert.equal(result.user.role, 'admin');
    assert.equal(result.user.school_id, 5);
    assert.equal(result.user.authoritative, true);
  });

  test('a database flag still grants review after the token says otherwise', async () => {
    state.users = [{ ...DESIGNATED_ADMIN, id: 11, active_session_id: 'sid-live' }];
    const guard = createEnforceDatabaseSuperadmin(async (text) => ({ rows: rowsFor(text) }));
    const result = await invoke(guard, {
      user: { id: 11, role: 'learner', is_superadmin: false }
    });
    assert.equal(result.nexted, true);
    assert.equal(result.user.role, 'admin');
    assert.equal(result.user.is_superadmin, true);
  });

  test('a missing user is denied', async () => {
    const token = sign({ id: 404, role: 'superadmin', is_superadmin: true, sid: 'missing' });
    const result = await invoke(auth, { headers: { authorization: `Bearer ${token}` } });
    assert.equal(result.nexted, false);
    assert.equal(result.statusCode, 401);
    assert.equal(result.body.code, 'account_missing');
  });

  test('a deleted user is denied even if a child row remains', async () => {
    state.recycle = [{ id: 1 }];
    state.children = [{ id: 404, school_id: 1 }];
    const result = await invoke(requireRole('learner'), {
      user: { id: 404, role: 'learner', is_superadmin: true }
    });
    assert.equal(result.statusCode, 401);
    assert.equal(result.body.code, 'deleted');
  });

  test('a deactivated user cannot keep a stale token', async () => {
    state.columns = ['is_active'];
    state.users = [{
      id: 12,
      email: 'inactive@example.com',
      role_name: 'admin',
      is_superadmin: true,
      is_active: false,
      active_session_id: 'sid-inactive',
      school_id: 1
    }];
    const token = sign({ id: 12, role: 'admin', is_superadmin: true, sid: 'sid-inactive' });
    const result = await invoke(auth, { headers: { authorization: `Bearer ${token}` } });
    assert.equal(result.statusCode, 401);
    assert.equal(result.body.code, 'deactivated');
  });

  test('role checks do not accept a token role when the database has none', async () => {
    const result = await invoke(requireRole(['admin', 'superadmin']), {
      user: { id: 77, role: 'superadmin', is_superadmin: true }
    });
    assert.equal(result.statusCode, 401);
    assert.equal(result.nexted, false);
  });

  test('an ordinary admin cannot assign a superadmin role or edit a platform administrator', () => {
    const role = testerRoleChangeAllowed({ requestedRole: 'superadmin', targetIsSuperadmin: false });
    assert.equal(role.ok, false);
    assert.equal(role.status, 403);
    const preserved = testerRoleChangeAllowed({ requestedRole: 'teacher', targetIsSuperadmin: true });
    assert.equal(preserved.ok, false);
    const ordinary = testerRoleChangeAllowed({ requestedRole: 'teacher', targetIsSuperadmin: false });
    assert.equal(ordinary.ok, true);
  });

  test('school review and master-admin routes use the database guard', () => {
    assert.match(schoolSource, /createEnforceDatabaseSuperadmin/);
    assert.match(systemSource, /createEnforceDatabaseSuperadmin/);
    assert.match(authSource, /loadAuthoritativeAccount/);
    assert.equal(/roleName === 'superadmin'/.test(authSource), false);
    assert.equal(/req\.user\?\.is_superadmin\) return next/.test(schoolSource), false);
  });
});
