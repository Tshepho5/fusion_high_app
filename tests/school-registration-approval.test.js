/**
 * Verifies approval, rollback, isolation, and cleanup for isolated registration probes.
 * Probe rows are removed afterward. Existing schools are not deleted.
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
require('dotenv').config();
const db = require('../db/db');
const { withTransaction } = require('../db/transaction');
const schoolController = require('../public/src/controller/schoolController');
const schoolLogo = require('../public/src/services/schoolLogo');
const emailService = require('../public/src/services/emailService');
const paymentHold = require('../public/src/services/paymentHold');

const invitations = [];
emailService.sendSchoolApplicationApprovedNotice = async (payload) => {
  invitations.push({ ...payload });
};
emailService.sendSchoolApplicationDeclinedNotice = async () => {};
const ACTIVATION_PASSWORD = 'Verify-Probe-A-2026!';

const BASE = 'http://127.0.0.1:4000';
const PROBES = [
  { emis: '998000201', email: 'geleza-verify-a@example.com', name: 'Geleza Verify Probe A', password: 'Verify-probe-A-2026' },
  { emis: '998000202', email: 'geleza-verify-b@example.com', name: 'Geleza Verify Probe B', password: 'Verify-probe-B-2026' },
  { emis: '998000203', email: 'geleza-verify-c@example.com', name: 'Geleza Verify Probe C', password: 'Verify-probe-C-2026' },
  { emis: '998000204', email: 'geleza-verify-d@example.com', name: 'Geleza Verify Probe D', password: 'Verify-probe-D-2026' },
  { emis: '998000205', email: 'geleza-verify-block@example.com', name: 'Geleza Verify Probe Block', password: 'Verify-probe-E-2026' }
];

function validId(seed) {
  const first12 = `8001015009${String(seed).padStart(2, '0')}`.slice(0, 12);
  let sum = 0;
  let doubleIt = true;
  for (let index = first12.length - 1; index >= 0; index -= 1) {
    let digit = Number(first12.charAt(index));
    if (doubleIt) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    doubleIt = !doubleIt;
  }
  return `${first12}${(10 - (sum % 10)) % 10}`;
}

function png() {
  return Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
}

function applicationForm(probe, seed) {
  const body = new FormData();
  body.append('school_name', probe.name);
  body.append('emis_number', probe.emis);
  body.append('province', 'Limpopo');
  body.append('district', 'Capricorn South');
  body.append('physical_address', 'Verification probe address');
  body.append('contact_email', probe.email);
  body.append('contact_phone', '0151234567');
  body.append('principal_first_name', 'Verify');
  body.append('principal_surname', 'Probe');
  body.append('principal_id_number', validId(seed));
  body.append('principal_email', probe.email);
  body.append('principal_phone', '0821234567');
  body.append('password', probe.password);
  body.append('offered_streams', JSON.stringify(['Science']));
  body.append('offered_languages', JSON.stringify(['Sepedi Home Language']));
  body.append('logo', new Blob([png()], { type: 'image/png' }), 'logo.png');
  return body;
}

function latestToken(email) {
  const notice = [...invitations].reverse().find((item) => item.principalEmail === email);
  assert.ok(notice && notice.activationUrl, 'approval did not prepare an invitation');
  return new URL(notice.activationUrl).searchParams.get('token');
}

async function activateAccount(email) {
  const token = latestToken(email);
  const response = await fetch(`${BASE}/api/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password: ACTIVATION_PASSWORD, confirm_password: ACTIVATION_PASSWORD })
  });
  const body = await response.json();
  assert.equal(response.status, 200, body.error || 'activation failed');
  assert.equal(JSON.stringify(body).includes(token), false);
  return token;
}

function mockRes() {
  const res = { statusCode: 200, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (payload) => { res.body = payload; return res; };
  return res;
}

async function reviewResend(applicationId, userId) {
  const req = {
    params: { id: String(applicationId) },
    body: {},
    headers: { origin: BASE },
    user: { id: userId, is_superadmin: true }
  };
  const res = mockRes();
  await schoolController.resendPrincipalActivation(req, res);
  return res;
}

async function review(applicationId, decision, userId, extra = {}) {
  const req = {
    params: { id: String(applicationId) },
    body: { decision, ...extra },
    headers: { origin: BASE },
    user: { id: userId, is_superadmin: true }
  };
  const res = mockRes();
  await schoolController.reviewSchoolApplication(req, res);
  return res;
}

async function cleanup() {
  const emails = [...PROBES.map((probe) => probe.email), 'geleza-activate@example.com'];
  const emis = [...PROBES.map((probe) => probe.emis), '998000211'];
  const logos = await db.query(
    'SELECT logo_stored_name FROM school_applications WHERE emis_number = ANY($1::text[])',
    [emis]
  );
  const schools = await db.query('SELECT id, logo_url FROM schools WHERE emis_number = ANY($1::text[])', [emis]);
  for (const row of logos.rows) schoolLogo.removeLogo(row.logo_stored_name);
  for (const row of schools.rows) schoolLogo.removeLogo(String(row.logo_url || '').split('/').pop());
  const schoolIds = schools.rows.map((row) => row.id);
  if (schoolIds.length) {
    await db.query('DELETE FROM employees WHERE school_id = ANY($1::int[])', [schoolIds]);
    await db.query('DELETE FROM classes WHERE school_id = ANY($1::int[])', [schoolIds]);
  }
  await db.query('DELETE FROM users WHERE email = ANY($1::text[])', [emails]);
  if (schoolIds.length) await db.query('DELETE FROM schools WHERE id = ANY($1::int[])', [schoolIds]);
  await db.query('DELETE FROM school_applications WHERE emis_number = ANY($1::text[])', [emis]);
}

describe('school approval verification', () => {
  before(async () => {
    await cleanup();
  });

  after(async () => {
    await cleanup();
    const left = await db.query(`
      SELECT
        (SELECT COUNT(*)::int FROM school_applications WHERE emis_number = ANY($1::text[])) AS applications,
        (SELECT COUNT(*)::int FROM schools WHERE emis_number = ANY($1::text[]) OR emis_number IN ('998000291', '998000292', '998000293', '998000299')) AS schools,
        (SELECT COUNT(*)::int FROM users WHERE email = ANY($2::text[]) OR email LIKE 'rollback-%@example.com' OR email = 'geleza-activate@example.com') AS users
    `, [PROBES.map((probe) => probe.emis), PROBES.map((probe) => probe.email)]);
    assert.equal(left.rows[0].applications, 0);
    assert.equal(left.rows[0].schools, 0);
    assert.equal(left.rows[0].users, 0);
    await db.pool.end();
  });

  it('shows that a complete bank record includes the full account number', () => {
    const bank = paymentHold.realBank({
      bank_name: 'Example Bank',
      account_holder: 'Example School',
      account_number: '1234567890',
      branch_code: '123456',
      account_type: 'Cheque / Current'
    });
    assert.deepEqual(Object.keys(bank).sort(), ['account_holder', 'account_number', 'account_type', 'bank_name', 'branch_code']);
    const placeholder = paymentHold.realBank({
      bank_name: 'Example Bank',
      account_holder: 'Example School',
      account_number: '62849102841',
      branch_code: '123456'
    });
    assert.equal(placeholder, null);
    const summary = paymentHold.publicBank({
      bank_name: 'Example Bank',
      account_holder: 'Example School',
      account_number: '1234567890',
      branch_code: '123456'
    });
    assert.deepEqual(summary, { has_bank_account: true, account_hint: '******7890' });
    assert.equal(JSON.stringify(summary).includes('1234567890'), false);
    assert.equal(paymentHold.publicBank({
      bank_name: 'Example Bank',
      account_holder: 'Example School',
      account_number: '62849102841',
      branch_code: '123456'
    }).has_bank_account, false);
  });

  it('rolls back a school and principal when a later stage fails', async () => {
    const before = await db.query('SELECT COUNT(*)::int AS total FROM schools');
    await assert.rejects(() => withTransaction(async (client) => {
      const school = await client.query(
        `INSERT INTO schools (name, slug, emis_number, province, district, physical_address, contact_email, contact_phone, principal_name)
         VALUES ('Rollback Stage Probe', $1, '998000299', 'Limpopo', 'Test', 'Address', 'rollback-stage@example.com', '0151234567', 'Rollback Probe')
         RETURNING id`,
        [`rollback-stage-${Date.now()}`]
      );
      await client.query(
        `INSERT INTO users (email, password_hash, school_id, is_superadmin, full_name, surname)
         VALUES ('rollback-stage@example.com', 'hash', $1, FALSE, 'Rollback', 'Probe')`,
        [school.rows[0].id]
      );
      await client.query(
        `INSERT INTO employees (user_id, full_name, surname, department_id, school_id)
         VALUES ((SELECT id FROM users WHERE email = 'rollback-stage@example.com'), 'Rollback', 'Probe', 0, $1)`,
        [school.rows[0].id]
      );
    }));
    const after = await db.query('SELECT COUNT(*)::int AS total FROM schools');
    const orphanUser = await db.query("SELECT id FROM users WHERE email = 'rollback-stage@example.com'");
    assert.equal(after.rows[0].total, before.rows[0].total);
    assert.equal(orphanUser.rows.length, 0);
  });

  it('rolls back when school, class, or principal creation fails', async () => {
    const before = await db.query('SELECT COUNT(*)::int AS total FROM schools');
    await assert.rejects(() => withTransaction(async (client) => {
      await client.query(
        `INSERT INTO schools (name, slug, emis_number, province, district, physical_address, contact_email, contact_phone, principal_name)
         VALUES (NULL, $1, '998000291', 'Limpopo', 'Test', 'Address', 'rollback-school@example.com', '0151234567', 'Rollback Probe')`,
        [`rollback-school-${Date.now()}`]
      );
    }));
    await assert.rejects(() => withTransaction(async (client) => {
      const school = await client.query(
        `INSERT INTO schools (name, slug, emis_number, province, district, physical_address, contact_email, contact_phone, principal_name)
         VALUES ('Rollback Class Probe', $1, '998000292', 'Limpopo', 'Test', 'Address', 'rollback-class@example.com', '0151234567', 'Rollback Probe')
         RETURNING id`,
        [`rollback-class-${Date.now()}`]
      );
      await client.query(
        'INSERT INTO classes (name, grade, stream, school_id) VALUES (\'8A\', 0, \'General\', $1)',
        [school.rows[0].id]
      );
    }));
    const existingEmail = await db.query(
      "SELECT email FROM users WHERE email IS NOT NULL AND btrim(email) <> '' ORDER BY id LIMIT 1"
    );
    assert.ok(existingEmail.rows.length > 0);
    await assert.rejects(() => withTransaction(async (client) => {
      const school = await client.query(
        `INSERT INTO schools (name, slug, emis_number, province, district, physical_address, contact_email, contact_phone, principal_name)
         VALUES ('Rollback Principal Probe', $1, '998000293', 'Limpopo', 'Test', 'Address', 'rollback-principal@example.com', '0151234567', 'Rollback Probe')
         RETURNING id`,
        [`rollback-principal-${Date.now()}`]
      );
      await client.query(
        `INSERT INTO users (email, password_hash, school_id, is_superadmin, full_name, surname)
         VALUES ($1, 'hash', $2, FALSE, 'Rollback', 'Probe')`,
        [existingEmail.rows[0].email, school.rows[0].id]
      );
    }));
    const after = await db.query('SELECT COUNT(*)::int AS total FROM schools');
    const orphans = await db.query(
      "SELECT id FROM users WHERE email IN ('rollback-school@example.com', 'rollback-class@example.com', 'rollback-principal@example.com')"
    );
    assert.equal(after.rows[0].total, before.rows[0].total);
    assert.equal(orphans.rows.length, 0);
  });

  it('approves two schools once, blocks a second approval, and keeps their logos apart', async () => {
    const duplicates = await db.query(`
      SELECT
        (SELECT COUNT(*)::int FROM (
          SELECT emis_number FROM schools
          WHERE emis_number IS NOT NULL AND btrim(emis_number) <> ''
          GROUP BY emis_number HAVING COUNT(*) > 1
        ) d) AS duplicate_school_emis,
        (SELECT COUNT(*)::int FROM (
          SELECT emis_number FROM school_applications
          WHERE status IN ('pending_review', 'under_review')
          GROUP BY emis_number HAVING COUNT(*) > 1
        ) d) AS duplicate_open_emis,
        (SELECT COUNT(*)::int FROM (
          SELECT LOWER(email) FROM users
          WHERE email IS NOT NULL AND btrim(email) <> ''
          GROUP BY LOWER(email) HAVING COUNT(*) > 1
        ) d) AS duplicate_user_emails
    `);
    console.log(`duplicate counts ${JSON.stringify(duplicates.rows[0])}`);
    const indexes = await db.query(
      "SELECT indexname FROM pg_indexes WHERE indexname IN ('schools_emis_number_unique', 'school_applications_open_emis_unique') ORDER BY indexname"
    );
    const departments = await db.query('SELECT COUNT(*)::int AS total FROM departments');
    console.log(`unique indexes ${indexes.rows.map((row) => row.indexname).join(', ') || 'none'}`);
    console.log(`departments ${departments.rows[0].total}`);
    assert.equal(indexes.rows.length, 2);
    assert.ok(departments.rows[0].total > 0);
    const preserved = await db.query(
      `SELECT id, logo_url FROM schools
       WHERE emis_number IS NULL OR NOT (emis_number = ANY($1::text[]))
       ORDER BY id LIMIT 1`,
      [PROBES.map((probe) => probe.emis)]
    );
    const preservedLogo = preserved.rows[0] ? preserved.rows[0].logo_url : null;

    const reviewer = await db.query('SELECT id FROM users WHERE is_superadmin = TRUE ORDER BY id LIMIT 1');
    assert.ok(reviewer.rows.length > 0, 'a superadmin account is required to exercise approval');
    const reviewerId = reviewer.rows[0].id;

    for (let index = 0; index < 3; index += 1) {
      const created = await fetch(`${BASE}/api/schools/apply`, { method: 'POST', body: applicationForm(PROBES[index], index + 1) });
      const payload = await created.json();
      assert.equal(created.status, 201, payload.error || 'registration was not accepted');
      assert.equal(payload.application.status, 'pending_review');
      assert.equal(Object.prototype.hasOwnProperty.call(payload.application, 'password_hash'), false);
      assert.equal(payload.password, undefined);
      assert.equal(payload.application.password, undefined);
    }
    const pendingSecrets = await db.query(
      'SELECT COUNT(*)::int AS kept FROM school_applications WHERE emis_number = ANY($1::text[]) AND password_hash IS NOT NULL',
      [PROBES.slice(0, 3).map((probe) => probe.emis)]
    );
    const earlyUsers = await db.query(
      'SELECT id FROM users WHERE email = ANY($1::text[])',
      [PROBES.slice(0, 3).map((probe) => probe.email)]
    );
    assert.equal(pendingSecrets.rows[0].kept, 0);
    assert.equal(earlyUsers.rows.length, 0);

    const pending = await db.query(
      "SELECT id, emis_number, logo_stored_name FROM school_applications WHERE emis_number = ANY($1::text[]) AND status = 'pending_review' ORDER BY emis_number",
      [PROBES.slice(0, 3).map((probe) => probe.emis)]
    );
    assert.equal(pending.rows.length, 3);
    assert.ok(pending.rows.every((row) => schoolLogo.safeLogoName(row.logo_stored_name)));

    const first = pending.rows.find((row) => row.emis_number === PROBES[0].emis);
    const second = pending.rows.find((row) => row.emis_number === PROBES[1].emis);
    const third = pending.rows.find((row) => row.emis_number === PROBES[2].emis);
    const approvedA = await review(first.id, 'approve', reviewerId);
    assert.equal(approvedA.statusCode, 200, approvedA.body && approvedA.body.error);
    const approvedB = await review(second.id, 'approve', reviewerId);
    assert.equal(approvedB.statusCode, 200, approvedB.body && approvedB.body.error);
    assert.notEqual(approvedA.body.school.logo_url, approvedB.body.school.logo_url);
    const clearedSecrets = await db.query(
      `SELECT COUNT(*)::int AS kept
       FROM school_applications
       WHERE emis_number = ANY($1::text[]) AND status = 'approved' AND password_hash IS NOT NULL`,
      [[PROBES[0].emis, PROBES[1].emis]]
    );
    const copiedSecrets = await db.query(
      'SELECT COUNT(*)::int AS kept FROM users WHERE email = ANY($1::text[]) AND password_hash IS NOT NULL',
      [[PROBES[0].email, PROBES[1].email]]
    );
    assert.equal(clearedSecrets.rows[0].kept, 0);
    assert.equal(copiedSecrets.rows[0].kept, 0);
    const tokenA = latestToken(PROBES[0].email);
    assert.equal(JSON.stringify(approvedA.body).includes(tokenA), false);

    const repeated = await review(first.id, 'approve', reviewerId);
    assert.equal(repeated.statusCode, 409);

    const linked = await db.query(`
      SELECT s.emis_number,
             COUNT(DISTINCT s.id)::int AS schools,
             COUNT(DISTINCT u.id)::int AS principals,
             COUNT(DISTINCT e.id)::int AS employees,
             COUNT(DISTINCT c.id)::int AS classes,
             BOOL_OR(u.is_superadmin) AS any_superadmin,
             BOOL_OR(r.name = 'admin') AS principal_is_admin,
             BOOL_AND(u.school_id = s.id) AS principal_school_matches,
             BOOL_AND(e.school_id = s.id) AS employee_school_matches,
             BOOL_AND(e.department_id IS NOT NULL) AS employee_has_department
      FROM schools s
      JOIN users u ON u.school_id = s.id AND u.email = ANY($2::text[])
      JOIN roles r ON r.id = u.role_id
      JOIN employees e ON e.user_id = u.id
      LEFT JOIN classes c ON c.school_id = s.id
      WHERE s.emis_number = ANY($1::text[])
      GROUP BY s.emis_number
      ORDER BY s.emis_number
    `, [[PROBES[0].emis, PROBES[1].emis], [PROBES[0].email, PROBES[1].email]]);
    assert.equal(linked.rows.length, 2);
    for (const row of linked.rows) {
      assert.equal(row.schools, 1);
      assert.equal(row.principals, 1);
      assert.equal(row.employees, 1);
      assert.ok(row.classes >= 1);
      assert.equal(row.any_superadmin, false);
      assert.equal(row.principal_is_admin, true);
      assert.equal(row.principal_school_matches, true);
      assert.equal(row.employee_school_matches, true);
      assert.equal(row.employee_has_department, true);
    }

    const listed = await fetch(`${BASE}/api/schools`);
    const schools = await listed.json();
    const visible = new Set((Array.isArray(schools) ? schools : []).map((school) => school.emis_number));
    assert.equal(visible.has(PROBES[0].emis), true);
    assert.equal(visible.has(PROBES[1].emis), true);

    const waiting = await fetch(`${BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: PROBES[0].email, password: ACTIVATION_PASSWORD })
    });
    const waitingBody = await waiting.json();
    assert.equal(waiting.status, 401);
    assert.equal(waitingBody.code, 'activation_required');
    await activateAccount(PROBES[0].email);
    const login = await fetch(`${BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: PROBES[0].email, password: ACTIVATION_PASSWORD })
    });
    const session = await login.json();
    assert.equal(login.status, 200, session.error || 'principal login failed');
    assert.equal(session.user.is_superadmin, false);
    assert.equal(String(session.user.role || session.user.role_name || '').toLowerCase(), 'admin');

    const schoolB = await db.query('SELECT id FROM schools WHERE emis_number = $1', [PROBES[1].emis]);
    const replace = await fetch(`${BASE}/api/schools/${schoolB.rows[0].id}/logo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.token}` },
      body: (() => {
        const body = new FormData();
        body.append('logo', new Blob([png()], { type: 'image/png' }), 'logo.png');
        return body;
      })()
    });
    assert.equal(replace.status, 403);

    const traversal = await fetch(`${BASE}/api/schools/logos/..%2F..%2Fpackage.json`);
    assert.equal(traversal.status, 404);
    const oddName = await fetch(`${BASE}/api/schools/logos/not-a-real-logo.png`);
    assert.equal(oddName.status, 404);

    const logoA = await fetch(`${BASE}${approvedA.body.school.logo_url}`);
    const logoB = await fetch(`${BASE}${approvedB.body.school.logo_url}`);
    assert.equal(logoA.status, 200);
    assert.equal(logoB.status, 200);
    assert.equal(logoA.headers.get('content-type'), 'image/png');

    const declined = await review(third.id, 'decline', reviewerId, { reason: 'Verification probe decline' });
    assert.equal(declined.statusCode, 200, declined.body && declined.body.error);
    const declinedRow = await db.query('SELECT status, password_hash, logo_stored_name FROM school_applications WHERE id = $1', [third.id]);
    assert.equal(declinedRow.rows[0].status, 'declined');
    assert.equal(declinedRow.rows[0].password_hash, null);
    assert.equal(schoolLogo.logoFilePath(declinedRow.rows[0].logo_stored_name), null);
    const declinedSchool = await db.query('SELECT id FROM schools WHERE emis_number = $1', [PROBES[2].emis]);
    assert.equal(declinedSchool.rows.length, 0);

    const again = await fetch(`${BASE}/api/schools/apply`, { method: 'POST', body: applicationForm(PROBES[2], 9) });
    assert.equal(again.status, 201);

    const raceProbe = await fetch(`${BASE}/api/schools/apply`, { method: 'POST', body: applicationForm(PROBES[3], 4) });
    const racePayload = await raceProbe.json();
    assert.equal(raceProbe.status, 201, racePayload.error);
    const [left, right] = await Promise.all([
      review(racePayload.application.id, 'approve', reviewerId),
      review(racePayload.application.id, 'approve', reviewerId)
    ]);
    const statuses = [left.statusCode, right.statusCode].sort();
    assert.deepEqual(statuses, [200, 409]);
    const raceSchools = await db.query('SELECT COUNT(*)::int AS total FROM schools WHERE emis_number = $1', [PROBES[3].emis]);
    const raceUsers = await db.query('SELECT COUNT(*)::int AS total FROM users WHERE email = $1', [PROBES[3].email]);
    assert.equal(raceSchools.rows[0].total, 1);
    assert.equal(raceUsers.rows[0].total, 1);

    await activateAccount(PROBES[1].email);
    const loginB = await fetch(`${BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: PROBES[1].email, password: ACTIVATION_PASSWORD })
    });
    const sessionB = await loginB.json();
    assert.equal(loginB.status, 200, sessionB.error || 'second principal login failed');
    const schoolA = await db.query('SELECT id FROM schools WHERE emis_number = $1', [PROBES[0].emis]);
    const replaceA = await fetch(`${BASE}/api/schools/${schoolA.rows[0].id}/logo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionB.token}` },
      body: (() => {
        const body = new FormData();
        body.append('logo', new Blob([png()], { type: 'image/png' }), 'logo.png');
        return body;
      })()
    });
    assert.equal(replaceA.status, 403);

    const block = PROBES[4];
    await db.query(
      `INSERT INTO users (email, password_hash, is_superadmin, full_name, surname)
       VALUES ($1, 'blocked-probe-hash', FALSE, 'Block', 'Probe')`,
      [block.email]
    );
    const blockedApp = await db.query(
      `INSERT INTO school_applications (
         application_number, status, school_name, emis_number, province, district,
         physical_address, contact_email, contact_phone,
         principal_first_name, principal_surname, principal_id_number,
         principal_email, principal_phone, password_hash
       ) VALUES (
         $1, 'pending_review', $2, $3, 'Limpopo', 'Capricorn South',
         'Verification probe address', $4, '0151234567',
         'Verify', 'Probe', $5,
         $4, '0821234567', 'pending-probe-hash'
       ) RETURNING id`,
      [`GSA-VERIFY-BLOCK-${Date.now()}`, block.name, block.emis, block.email, validId(5)]
    );
    const blocked = await review(blockedApp.rows[0].id, 'approve', reviewerId);
    assert.equal(blocked.statusCode, 409, blocked.body && blocked.body.error);
    const blockedSchool = await db.query('SELECT id FROM schools WHERE emis_number = $1', [block.emis]);
    const blockedRow = await db.query(
      'SELECT status, password_hash IS NOT NULL AS has_secret FROM school_applications WHERE id = $1',
      [blockedApp.rows[0].id]
    );
    assert.equal(blockedSchool.rows.length, 0);
    assert.equal(blockedRow.rows[0].status, 'pending_review');
    assert.equal(blockedRow.rows[0].has_secret, true);

    const listRes = mockRes();
    await schoolController.getSchoolApplications({ query: {}, user: { is_superadmin: true } }, listRes);
    const exposed = (Array.isArray(listRes.body) ? listRes.body : []).filter((row) => PROBES.some((probe) => probe.emis === row.emis_number));
    assert.ok(exposed.length > 0);
    assert.equal(exposed.some((row) => Object.prototype.hasOwnProperty.call(row, 'password_hash')), false);

    if (preserved.rows.length) {
      const stillThere = await db.query('SELECT logo_url FROM schools WHERE id = $1', [preserved.rows[0].id]);
      assert.equal(stillThere.rows[0].logo_url, preservedLogo);
    }

    const bankSchool = await db.query(
      `SELECT id, offered_languages
       FROM schools
       WHERE account_number IS NOT NULL AND btrim(account_number) <> ''
       ORDER BY id
       LIMIT 1`
    );
    if (bankSchool.rows.length) {
      const language = (bankSchool.rows[0].offered_languages && bankSchool.rows[0].offered_languages[0]) || 'English';
      const languageResponse = await fetch(
        `${BASE}/api/schools/check-language?school_id=${bankSchool.rows[0].id}&language=${encodeURIComponent(language)}`
      );
      const languageBody = await languageResponse.json();
      const details = languageBody.banking_details;
      const fieldNames = details && typeof details === 'object' ? Object.keys(details).sort() : [];
      assert.equal(Boolean(details && details.account_number), false);
      assert.equal(Boolean(details && details.account_holder), false);
      assert.equal(Boolean(details && details.branch_code), false);
      assert.equal(Boolean(details && details.bank_name), false);
      if (fieldNames.length) assert.deepEqual(fieldNames, ['account_hint', 'has_bank_account']);
      console.log(JSON.stringify({
        languageCheckStatus: languageResponse.status,
        requestWasAuthenticated: false,
        bankFieldNames: fieldNames,
        fullAccountNumberReturned: false
      }));
    } else {
      console.log(JSON.stringify({ languageCheckStatus: 'no-bank-school' }));
    }

    const beforeFiles = fs.existsSync(schoolLogo.logoDirectory) ? fs.readdirSync(schoolLogo.logoDirectory) : [];
    const rejected = await fetch(`${BASE}/api/schools/apply`, {
      method: 'POST',
      body: (() => {
        const body = applicationForm(PROBES[0], 1);
        body.set('logo', new Blob([Buffer.from('not-an-image')], { type: 'image/png' }), 'logo.png');
        return body;
      })()
    });
    assert.equal(rejected.status, 400);
    const afterFiles = fs.existsSync(schoolLogo.logoDirectory) ? fs.readdirSync(schoolLogo.logoDirectory) : [];
    assert.deepEqual(afterFiles.sort(), beforeFiles.sort());
  });

  it('checks invitation reuse, expiry, resend, payment access, classes, and local API routing', async () => {
    const { migrateSchoolOnboardingAndCleanRoster } = require('../db/migrate_school_onboarding_and_clean_roster');
    await migrateSchoolOnboardingAndCleanRoster();
    const activationController = require('../public/src/controller/principalActivationController');
    const authController = require('../public/src/controller/authController');
    const probe = { emis: '998000211', email: 'geleza-activate@example.com', name: 'Geleza Activate Probe', password: 'unused-password' };
    const created = await fetch(`${BASE}/api/schools/apply`, { method: 'POST', body: applicationForm(probe, 11) });
    const payload = await created.json();
    assert.equal(created.status, 201, payload.error || 'activation probe was not accepted');
    const reviewer = await db.query('SELECT id FROM users WHERE is_superadmin = TRUE ORDER BY id LIMIT 1');
    const approved = await review(payload.application.id, 'approve', reviewer.rows[0].id, {
      authority_review: { emis_checked: true, notes: 'Checked the EMIS and school name. The ID number is not proof of identity.' }
    });
    assert.equal(approved.statusCode, 200, approved.body && approved.body.error);
    const storedReview = await db.query('SELECT authority_review FROM school_applications WHERE id = $1', [payload.application.id]);
    assert.equal(storedReview.rows[0].authority_review.emis_checked, true);
    assert.equal(storedReview.rows[0].authority_review.id_checksum_is_not_proof, true);

    const firstToken = latestToken(probe.email);
    await db.query('UPDATE users SET activation_expires_at = NOW() - INTERVAL \'1 hour\' WHERE email = $1', [probe.email]);
    const expired = await fetch(`${BASE}/api/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: firstToken, password: ACTIVATION_PASSWORD, confirm_password: ACTIVATION_PASSWORD })
    });
    const expiredBody = await expired.json();
    assert.equal(expired.status, 400);
    assert.equal(expiredBody.code, 'activation_expired');
    const stillWaiting = await db.query('SELECT password_hash, is_superadmin FROM users WHERE email = $1', [probe.email]);
    assert.equal(stillWaiting.rows[0].password_hash, null);
    assert.equal(stillWaiting.rows[0].is_superadmin, false);

    const appRow = await db.query('SELECT id FROM school_applications WHERE emis_number = $1', [probe.emis]);
    const resend = await reviewResend(appRow.rows[0].id, reviewer.rows[0].id);
    assert.equal(resend.statusCode, 200, resend.body && resend.body.error);
    assert.equal(JSON.stringify(resend.body).includes(latestToken(probe.email)), false);
    const reusedOld = await fetch(`${BASE}/api/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: firstToken, password: ACTIVATION_PASSWORD, confirm_password: ACTIVATION_PASSWORD })
    });
    assert.equal(reusedOld.status, 400);
    const wrong = await fetch(`${BASE}/api/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'this-token-belongs-to-nobody-and-is-long-enough', password: ACTIVATION_PASSWORD, confirm_password: ACTIVATION_PASSWORD })
    });
    assert.equal(wrong.status, 400);
    const untouched = await db.query('SELECT password_hash, is_superadmin FROM users WHERE email = $1', [probe.email]);
    assert.equal(untouched.rows[0].password_hash, null);
    assert.equal(untouched.rows[0].is_superadmin, false);
    const forgot = mockRes();
    await authController.forgotPassword({ body: { email: probe.email } }, forgot);
    assert.equal(forgot.statusCode, 409);
    assert.equal(forgot.body.code, 'activation_required');

    const currentToken = latestToken(probe.email);
    await activateAccount(probe.email);
    const secondUse = await fetch(`${BASE}/api/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: currentToken, password: 'Another-Password-2026!', confirm_password: 'Another-Password-2026!' })
    });
    assert.equal(secondUse.status, 400);
    const login = await fetch(`${BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: probe.email, password: ACTIVATION_PASSWORD })
    });
    const session = await login.json();
    assert.equal(login.status, 200, session.error || 'activated principal could not sign in');
    assert.equal(session.user.is_superadmin, false);
    const changed = await fetch(`${BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: probe.email, password: 'Another-Password-2026!' })
    });
    assert.equal(changed.status, 401);

    const otherSchool = await db.query('SELECT id FROM schools WHERE emis_number IS DISTINCT FROM $1 ORDER BY id LIMIT 1', [probe.emis]);
    const paymentDenied = await fetch(`${BASE}/api/schools/${otherSchool.rows[0].id}/payment-account`, {
      headers: { Authorization: `Bearer ${session.token}` }
    });
    assert.equal(paymentDenied.status, 403);
    const ownSchool = await db.query('SELECT id FROM schools WHERE emis_number = $1', [probe.emis]);
    await db.query(
      `UPDATE schools
       SET bank_name = 'Example Bank', account_holder = 'Probe School', account_number = '1234567890', branch_code = '250655', account_type = 'Cheque'
       WHERE id = $1`,
      [ownSchool.rows[0].id]
    );
    const paymentOwn = await fetch(`${BASE}/api/schools/${ownSchool.rows[0].id}/payment-account`, {
      headers: { Authorization: `Bearer ${session.token}` }
    });
    const paymentOwnBody = await paymentOwn.json();
    assert.equal(paymentOwn.status, 200);
    assert.equal(paymentOwnBody.banking_details.account_number, '1234567890');
    const masked = await fetch(`${BASE}/api/schools/check-language?school_id=${ownSchool.rows[0].id}&language=Sepedi`);
    const maskedBody = await masked.json();
    assert.equal(maskedBody.banking_details.account_hint, '******7890');
    assert.equal(maskedBody.banking_details.account_number, undefined);
    assert.equal(maskedBody.banking_details.account_holder, undefined);
    const publicPayment = await fetch(`${BASE}/api/schools/${ownSchool.rows[0].id}/payment-account`);
    assert.equal(publicPayment.status, 401);

    const orphansBefore = await db.query(`
      SELECT COUNT(*)::int AS total
      FROM classes c
      WHERE c.school_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM schools s WHERE s.id = c.school_id)
    `);
    await assert.rejects(() => withTransaction(async (client) => {
      await client.query(`INSERT INTO classes (name, grade, stream, school_id) VALUES ('FK Probe', 8, 'General', 999999999)`);
      throw new Error('The class insert should have been rejected.');
    }));
    const orphans = await db.query(`
      SELECT COUNT(*)::int AS total
      FROM classes c
      WHERE c.school_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM schools s WHERE s.id = c.school_id)
    `);
    assert.equal(orphans.rows[0].total, orphansBefore.rows[0].total);
    assert.ok(orphans.rows[0].total > 0);
    const fk = await db.query(`SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'classes_school_id_fkey'`);
    assert.match(fk.rows[0].def, /FOREIGN KEY \(school_id\) REFERENCES schools\(id\)/);

    const localEnv = fs.readFileSync('client/.env', 'utf8');
    const productionEnv = fs.readFileSync('client/.env.production', 'utf8');
    const apiSource = fs.readFileSync('client/src/services/api.ts', 'utf8');
    assert.equal(localEnv.includes('fusion-high-backend.onrender.com'), false);
    assert.match(localEnv, /VITE_USE_LOCAL_BACKEND=true/);
    assert.match(productionEnv, /VITE_API_URL=https:\/\/fusion-high-backend\.onrender\.com/);
    assert.match(apiSource, /localBackendFlag !== 'false'/);
    const locks = await fetch(`${BASE}/api/system/portal-locks`);
    const lockBody = await locks.json();
    assert.equal(locks.status, 200);
    assert.ok(lockBody.controls && Object.prototype.hasOwnProperty.call(lockBody.controls, 'school_registration'));
    console.log(JSON.stringify({
      localApi: BASE,
      schoolRegistrationLocked: Boolean(lockBody.controls.school_registration && lockBody.controls.school_registration.is_locked),
      orphanClassesKept: orphans.rows[0].total
    }));
    assert.equal(activationController.resendPublic.name, 'resendPublic');
  });
});
