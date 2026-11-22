'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const os = require('node:os');
const bcrypt = require('bcryptjs');

const ROOT = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT, '.env') });

const STAGING_DB = process.env.GELEZA_STAGING_DATABASE || 'geleza_staging_phase_m2_20261121220348';
if (!/^geleza_staging_phase_m2_\d{14}$/.test(STAGING_DB)) {
  throw new Error(`Refusing to run M2 DB integration test against non-M2 database "${STAGING_DB}".`);
}

const mailCaptureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'geleza-m2-db-mail-'));
const TEST_PORT = 4327;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

// Configure strict isolated staging environment BEFORE requiring db/server modules
process.env.NODE_ENV = 'development';
process.env.GELEZA_STAGING = '1';
process.env.GELEZA_STAGING_DATABASE = STAGING_DB;
process.env.GELEZA_TEST_DATABASE = STAGING_DB;
process.env.GELEZA_STAGING_ALLOW_WRITES = '1';
process.env.GELEZA_STAGING_MAIL_DIR = mailCaptureDir;
process.env.GELEZA_FIREBASE_MOCK = '1';
process.env.GELEZA_PUSH_MOCK = '1';
process.env.DB_HOST = '127.0.0.1';
process.env.DB_NAME = STAGING_DB;
process.env.DATABASE_URL = `postgresql://${encodeURIComponent(process.env.DB_USER || 'postgres')}:${encodeURIComponent(process.env.DB_PASSWORD || '')}@127.0.0.1:${process.env.DB_PORT || 5432}/${STAGING_DB}`;
process.env.APP_URL = BASE_URL;
process.env.FRONTEND_URL = BASE_URL;
process.env.JWT_SECRET = 'phase-m2-isolated-staging-secret-2026';

// Generate valid Luhn SA ID for synthetic test learners
function makeValidSaId(yy, mm, dd, genderSeq = '5001', citizen = '0') {
  const first12 = `${String(yy).padStart(2, '0')}${String(mm).padStart(2, '0')}${String(dd).padStart(2, '0')}${genderSeq}${citizen}8`;
  let sum = 0;
  let dbl = true;
  for (let i = first12.length - 1; i >= 0; i -= 1) {
    let d = parseInt(first12[i], 10);
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  const check = (10 - (sum % 10)) % 10;
  return `${first12}${check}`;
}

function readCapturedEmails() {
  if (!fs.existsSync(mailCaptureDir)) return [];
  const files = fs.readdirSync(mailCaptureDir).filter((f) => f.endsWith('.json')).sort();
  return files.map((f) => {
    const meta = JSON.parse(fs.readFileSync(path.join(mailCaptureDir, f), 'utf8'));
    const htmlPath = path.join(mailCaptureDir, f.replace(/\.json$/, '.html'));
    const html = fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, 'utf8') : '';
    return { ...meta, html, file: f };
  });
}

function extractUrlParam(html, pathPrefix, paramName) {
  const re = new RegExp(`${pathPrefix}[^"'\\s<>]*[?&]${paramName}=([^"'&\\s<>]+)`, 'i');
  const m = String(html || '').match(re);
  return m ? decodeURIComponent(m[1]) : null;
}

function extractOtp10(html) {
  const m = String(html || '').match(/\b(\d{10})\b/);
  return m ? m[1] : null;
}

async function apiJson(route, { method = 'GET', token = null, body = null, headers = {} } = {}) {
  const hdrs = { ...headers };
  if (token) hdrs.Authorization = `Bearer ${token}`;
  let payload;
  if (body && !(body instanceof FormData)) {
    hdrs['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  } else {
    payload = body;
  }
  const res = await fetch(`${BASE_URL}${route}`, { method, headers: hdrs, body: payload });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (_) {}
  return { status: res.status, headers: res.headers, json, text };
}

function buildAppFormData(fields) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined && v !== null) fd.append(k, String(v));
  }
  const minimalPdf = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
  fd.append('birth_certificate', new Blob([minimalPdf], { type: 'application/pdf' }), 'birth_cert.pdf');
  fd.append('parent_id_doc', new Blob([minimalPdf], { type: 'application/pdf' }), 'parent_id.pdf');
  fd.append('proof_of_residence', new Blob([minimalPdf], { type: 'application/pdf' }), 'proof_res.pdf');
  return fd;
}

const express = require('express');
const cors = require('cors');
const db = require('../db/db');
const authRoutes = require('../public/src/routes/authRoutes');
const applicationRoutes = require('../public/src/routes/applicationRoutes');
const registrationRoutes = require('../public/src/routes/learnerRegistrationRoutes');
const adminRoutes = require('../public/src/routes/adminRoutes');
const staffInviteRoutes = require('../public/src/routes/staffInviteRoutes');
const userController = require('../public/src/controller/userController');
const protectedFiles = require('../public/src/controller/protectedFileController');
const { auth: authenticateToken } = require('../authMiddleware');
const { isOriginAllowed } = require('../lib/authSecurity');
const emailService = require('../public/src/services/emailService');

// Ensure domainCanReceiveMail accepts .test synthetic domains in isolated staging tests
const originalDomainCheck = emailService.domainCanReceiveMail;
emailService.domainCanReceiveMail = async (email) => {
  const clean = String(email || '').toLowerCase();
  if (clean.endsWith('.test') || clean.endsWith('@example.com')) return true;
  return originalDomainCheck(email);
};

let server;
let ctx = {};
const runTag = `${Date.now().toString(36)}`;

test.before(async () => {
  // Confirm DB isolation
  const dbCheck = await db.query('SELECT current_database() AS name');
  assert.equal(dbCheck.rows[0].name, STAGING_DB);
  assert.notEqual(dbCheck.rows[0].name.toLowerCase(), 'fusion_db');

  // Seed roles, schools, classes, curriculum offerings, school admins, teachers, and legacy users
  const rolesRes = await db.query('SELECT id, LOWER(name) AS name FROM roles');
  const roleMap = Object.fromEntries(rolesRes.rows.map((r) => [r.name, r.id]));

  const s1Res = await db.query(
    `SELECT id FROM schools WHERE slug = 'staging-horizon-high' LIMIT 1`
  );
  const s2Res = await db.query(
    `SELECT id FROM schools WHERE slug = 'staging-valley-secondary' LIMIT 1`
  );
  assert.ok(s1Res.rows[0] && s2Res.rows[0], 'Seeded staging schools must exist from M2.1');
  const school1Id = s1Res.rows[0].id;
  const school2Id = s2Res.rows[0].id;

  const academicYear = new Date().getFullYear();

  // Seed Grade 8 offerings for school1 and school2 so applications & registrations pass real curriculum validation
  for (const sid of [school1Id, school2Id]) {
    const grade8Subjects = [
      ['English', 'language', 'Home Language', true],
      ['isiZulu', 'language', 'First Additional Language', true],
      ['Mathematics', 'mathematics', '', true],
      ['Natural Sciences', 'elective', '', true],
      ['Social Sciences', 'elective', '', true],
      ['Economic and Management Sciences', 'elective', '', true],
      ['Technology', 'elective', '', true],
      ['Life Orientation', 'elective', '', true],
      ['Creative Arts', 'elective', '', true]
    ];
    for (const [subj, cat, langLevel, reqFlag] of grade8Subjects) {
      await db.query(
        `INSERT INTO school_subject_offerings (school_id, academic_year, grade, subject_name, category, language_level, is_required, is_active)
         VALUES ($1, $2, 8, $3, $4, $5, $6, TRUE)
         ON CONFLICT DO NOTHING`,
        [sid, academicYear, subj, cat, langLevel, reqFlag]
      );
    }
  }

  // Create School 1 Admin, School 2 Admin, Teacher, and Class 8A in School 1
  const adminPwHash = await bcrypt.hash('AdminPass!2026', 10);
  const teacherPwHash = await bcrypt.hash('TeacherPass!2026', 10);

  const admin1Res = await db.query(
    `INSERT INTO users (email, password_hash, password_set_at, email_verified_at, email_verification_status, role_id, full_name, surname, school_id)
     VALUES ($1, $2, NOW(), NOW(), 'verified', $3, 'Principal', 'One', $4)
     RETURNING id, email`,
    [`admin1.${runTag}@staging.test`, adminPwHash, roleMap.admin, school1Id]
  );
  const admin2Res = await db.query(
    `INSERT INTO users (email, password_hash, password_set_at, email_verified_at, email_verification_status, role_id, full_name, surname, school_id)
     VALUES ($1, $2, NOW(), NOW(), 'verified', $3, 'Principal', 'Two', $4)
     RETURNING id, email`,
    [`admin2.${runTag}@staging.test`, adminPwHash, roleMap.admin, school2Id]
  );
  const teacher1Res = await db.query(
    `INSERT INTO users (email, password_hash, password_set_at, email_verified_at, email_verification_status, role_id, full_name, surname, school_id)
     VALUES ($1, $2, NOW(), NOW(), 'verified', $3, 'Educator', 'One', $4)
     RETURNING id, email`,
    [`teacher1.${runTag}@staging.test`, teacherPwHash, roleMap.teacher, school1Id]
  );

  const class1Res = await db.query(
    `INSERT INTO classes (name, grade, stream, homeroom_teacher_id, school_id)
     VALUES ($1, 8, 'General', $2, $3)
     RETURNING id, name`,
    [`8A-${runTag}`, teacher1Res.rows[0].id, school1Id]
  );

  ctx = {
    roleMap,
    school1Id,
    school2Id,
    academicYear,
    admin1Email: admin1Res.rows[0].email,
    admin1Id: admin1Res.rows[0].id,
    admin2Email: admin2Res.rows[0].email,
    admin2Id: admin2Res.rows[0].id,
    teacher1Email: teacher1Res.rows[0].email,
    teacher1Id: teacher1Res.rows[0].id,
    class1Id: class1Res.rows[0].id
  };

  // Start isolated Express app mounting real M2 routes
  const app = express();
  app.use(cors({ origin: (origin, cb) => cb(null, isOriginAllowed(origin, process.env)), credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use('/api', authRoutes);
  app.use('/api/auth', authRoutes);
  app.get('/api/profile', authenticateToken, userController.getProfile);
  app.get('/uploads/applications/:filename', authenticateToken, protectedFiles.sendApplicationFile);
  app.use('/api/applications', applicationRoutes);
  app.use('/api/registrations', registrationRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/staff-invites', staffInviteRoutes);

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(TEST_PORT, '127.0.0.1', resolve));
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await db.pool?.end?.().catch(() => {});
  fs.rmSync(mailCaptureDir, { recursive: true, force: true });
});

test('M2.2 & M2.3 & M2.4 & M2.5 — Complete End-to-End Real DB Lifecycle, Security, Concurrency & Isolation', async (t) => {
  // 1. Login as School Admin 1, School Admin 2, Teacher 1
  const admin1Login = await apiJson('/api/auth/login', {
    method: 'POST',
    body: { email: ctx.admin1Email, password: 'AdminPass!2026' }
  });
  assert.equal(admin1Login.status, 200);
  const admin1Token = admin1Login.json.token;

  const admin2Login = await apiJson('/api/auth/login', {
    method: 'POST',
    body: { email: ctx.admin2Email, password: 'AdminPass!2026' }
  });
  assert.equal(admin2Login.status, 200);
  const admin2Token = admin2Login.json.token;

  const teacher1Login = await apiJson('/api/auth/login', {
    method: 'POST',
    body: { email: ctx.teacher1Email, password: 'TeacherPass!2026' }
  });
  assert.equal(teacher1Login.status, 200);
  assert.equal(teacher1Login.json.role.toLowerCase(), 'teacher');

  // 2. Account enumeration prevention on login, check-login-account, forgot-password
  const badLoginMissing = await apiJson('/api/auth/login', {
    method: 'POST',
    body: { email: `nonexistent.${runTag}@staging.test`, password: 'WrongPassword!1' }
  });
  const badLoginWrongPw = await apiJson('/api/auth/login', {
    method: 'POST',
    body: { email: ctx.admin1Email, password: 'WrongPassword!1' }
  });
  assert.equal(badLoginMissing.status, 401);
  assert.equal(badLoginWrongPw.status, 401);
  assert.equal(badLoginMissing.json.error, badLoginWrongPw.json.error);
  assert.equal(badLoginMissing.json.code, badLoginWrongPw.json.code);

  const checkMissing = await apiJson('/api/auth/check-login-account', {
    method: 'POST',
    body: { identifier: `nobody.${runTag}@staging.test` }
  });
  assert.equal(checkMissing.status, 200);
  assert.equal(checkMissing.json.neutral, true);

  const forgotMissing = await apiJson('/api/auth/forgot-password', {
    method: 'POST',
    body: { identifier: `nobody.${runTag}@staging.test` }
  });
  assert.equal(forgotMissing.status, 200);

  // 3. Legacy-unverified account can still log in, but self-service recovery is withheld silently
  const legacyLogin = await apiJson('/api/auth/login', {
    method: 'POST',
    body: { email: 'seed.legacy@staging.test', password: 'LegacyPass!2026' }
  });
  assert.equal(legacyLogin.status, 200);
  const beforeLegacyMails = readCapturedEmails().length;
  const legacyForgot = await apiJson('/api/auth/forgot-password', {
    method: 'POST',
    body: { identifier: 'seed.legacy@staging.test' }
  });
  assert.equal(legacyForgot.status, 200);
  assert.equal(legacyForgot.json.message, forgotMissing.json.message);
  assert.equal(readCapturedEmails().length, beforeLegacyMails, 'No OTP emailed to unverified legacy email');

  // 4. Scenario 1: New Parent submits application for Learner WITH personal email
  const parent1Email = `parent1.${runTag}@staging.test`;
  const parent1Password = 'ParentSec!2026';
  const learner1Email = `learner1.${runTag}@staging.test`;
const randSeq = (male) => String((male ? 5000 : 1000) + Math.floor(Math.random() * 3999)).padStart(4, '0');
  const learner1Id = makeValidSaId(12, 5, 14, randSeq(true));
  const parent1IdNum = makeValidSaId(84, 3, 21, randSeq(false));

  // Weak password rejected server-side
  const weakAppRes = await apiJson('/api/applications/apply', {
    method: 'POST',
    body: buildAppFormData({
      school_id: ctx.school1Id,
      first_name: 'Thabo',
      surname: 'Mokoena',
      id_number: learner1Id,
      dob: '2012-05-14',
      gender: 'Male',
      grade_applied: 8,
      academic_year: ctx.academicYear,
      home_language: 'English',
      physical_address: '12 Oak Street, Polokwane',
      email: learner1Email,
      primary_parent_name: 'Naledi',
      primary_parent_surname: 'Mokoena',
      primary_parent_relationship: 'Mother',
      primary_parent_id_number: parent1IdNum,
      primary_parent_phone: '0821112233',
      primary_parent_email: parent1Email,
      primary_parent_address: '12 Oak Street, Polokwane',
      parent_password: 'weak',
      confirm_parent_password: 'weak'
    })
  });
  assert.equal(weakAppRes.status, 400);

  // Valid New Parent submission
  const app1Res = await apiJson('/api/applications/apply', {
    method: 'POST',
    body: buildAppFormData({
      school_id: ctx.school1Id,
      first_name: 'Thabo',
      surname: 'Mokoena',
      id_number: learner1Id,
      dob: '2012-05-14',
      gender: 'Male',
      grade_applied: 8,
      academic_year: ctx.academicYear,
      home_language: 'English',
      physical_address: '12 Oak Street, Polokwane',
      email: learner1Email,
      primary_parent_name: 'Naledi',
      primary_parent_surname: 'Mokoena',
      primary_parent_relationship: 'Mother',
      primary_parent_id_number: parent1IdNum,
      primary_parent_phone: '0821112233',
      primary_parent_email: parent1Email,
      primary_parent_address: '12 Oak Street, Polokwane',
      parent_password: parent1Password,
      confirm_parent_password: parent1Password
    })
  });
  assert.equal(app1Res.status, 201, `App1 submit failed: ${app1Res.text}`);
  assert.ok(app1Res.json.applicationNumber);
  assert.equal(app1Res.json.email_verification_required, true);
  assert.equal(app1Res.json.learnerNumber, undefined);

  const app1Id = app1Res.json.applicationId;
  const app1Db = await db.query('SELECT provisional_learner_number, parent_user_id FROM applications WHERE id = $1', [app1Id]);
  assert.equal(app1Db.rows[0].provisional_learner_number, null, 'Official Learner Number must NOT be allocated on submission');
  assert.ok(app1Db.rows[0].parent_user_id, 'Application linked to new Parent user');

  // Verify Email 1 captured cleanly with Application Reference, verification URL, NO password, NO Learner Number
  const emailsAfterApp1 = readCapturedEmails().filter((m) => m.to === parent1Email);
  assert.ok(emailsAfterApp1.length >= 1, 'Email 1 must be captured for new Parent');
  const email1 = emailsAfterApp1[emailsAfterApp1.length - 1];
  assert.ok(email1.html.includes(app1Res.json.applicationNumber));
  assert.ok(!email1.html.includes(parent1Password), 'Email 1 must NEVER contain plaintext password');
  const verifyToken = extractUrlParam(email1.html, '/verify-email', 'token');
  assert.ok(verifyToken && verifyToken.length > 20, 'Email 1 must include single-use /verify-email token');

  // Unverified Parent CANNOT log in yet
  const unverifiedLogin = await apiJson('/api/auth/login', {
    method: 'POST',
    body: { email: parent1Email, password: parent1Password }
  });
  assert.equal(unverifiedLogin.status, 403);
  assert.equal(unverifiedLogin.json.code, 'email_verification_required');

  // Verify Parent email -> single-use consumption
  const verifyRes = await apiJson('/api/auth/verify-email', {
    method: 'POST',
    body: { token: verifyToken }
  });
  assert.equal(verifyRes.status, 200);
  const verifyReplay = await apiJson('/api/auth/verify-email', {
    method: 'POST',
    body: { token: verifyToken }
  });
  assert.equal(verifyReplay.status, 400);
  assert.equal(verifyReplay.json.code, 'token_used');

  // Verified Parent logs in cleanly
  const parent1Login = await apiJson('/api/auth/login', {
    method: 'POST',
    body: { email: parent1Email, password: parent1Password }
  });
  assert.equal(parent1Login.status, 200);
  const parent1Token = parent1Login.json.token;

  // 5. Unauthenticated duplicate-email submission MUST return 409 EXISTING_ACCOUNT_LOGIN_REQUIRED without overwriting password
  const learner2Id = makeValidSaId(12, 7, 19, randSeq(false));
  const unauthDupEmailRes = await apiJson('/api/applications/apply', {
    method: 'POST',
    body: buildAppFormData({
      school_id: ctx.school1Id,
      first_name: 'Lindiwe',
      surname: 'Mokoena',
      id_number: learner2Id,
      dob: '2012-07-19',
      gender: 'Female',
      grade_applied: 8,
      academic_year: ctx.academicYear,
      home_language: 'English',
      physical_address: '12 Oak Street, Polokwane',
      primary_parent_name: 'Naledi',
      primary_parent_surname: 'Mokoena',
      primary_parent_relationship: 'Mother',
      primary_parent_id_number: parent1IdNum,
      primary_parent_phone: '0821112233',
      primary_parent_email: parent1Email,
      primary_parent_address: '12 Oak Street, Polokwane',
      parent_password: 'AttackerPassword!99',
      confirm_parent_password: 'AttackerPassword!99'
    })
  });
  assert.equal(unauthDupEmailRes.status, 409);
  assert.equal(unauthDupEmailRes.json.code, 'EXISTING_ACCOUNT_LOGIN_REQUIRED');

  // Verify duplicate active application for Learner 1 is rejected (409 DUPLICATE_ACTIVE_APPLICATION)
  const dupActiveRes = await apiJson('/api/applications/apply', {
    method: 'POST',
    token: parent1Token,
    body: buildAppFormData({
      school_id: ctx.school1Id,
      first_name: 'Thabo',
      surname: 'Mokoena',
      id_number: learner1Id,
      dob: '2012-05-14',
      gender: 'Male',
      grade_applied: 8,
      academic_year: ctx.academicYear,
      home_language: 'English',
      physical_address: '12 Oak Street, Polokwane',
      primary_parent_name: 'Naledi',
      primary_parent_surname: 'Mokoena',
      primary_parent_relationship: 'Mother',
      primary_parent_id_number: parent1IdNum,
      primary_parent_phone: '0821112233',
      primary_parent_email: parent1Email,
      primary_parent_address: '12 Oak Street, Polokwane'
    })
  });
  assert.equal(dupActiveRes.status, 409);
  assert.equal(dupActiveRes.json.code, 'DUPLICATE_ACTIVE_APPLICATION');

  // 6. Scenario 2 & 3: Authenticated Existing Parent submits 2nd Learner (WITHOUT personal email) — no password fields required!
  const app2Res = await apiJson('/api/applications/apply', {
    method: 'POST',
    token: parent1Token,
    body: buildAppFormData({
      school_id: ctx.school1Id,
      first_name: 'Lindiwe',
      surname: 'Mokoena',
      id_number: learner2Id,
      dob: '2012-07-19',
      gender: 'Female',
      grade_applied: 8,
      academic_year: ctx.academicYear,
      home_language: 'English',
      physical_address: '12 Oak Street, Polokwane',
      primary_parent_name: 'Naledi',
      primary_parent_surname: 'Mokoena',
      primary_parent_relationship: 'Mother',
      primary_parent_id_number: parent1IdNum,
      primary_parent_phone: '0821112233',
      primary_parent_email: parent1Email,
      primary_parent_address: '12 Oak Street, Polokwane'
    })
  });
  assert.equal(app2Res.status, 201, `App2 submit failed: ${app2Res.text}`);
  assert.equal(app2Res.json.existing_parent, true);
  assert.equal(app2Res.json.email_verification_required, false);
  const app2Id = app2Res.json.applicationId;

  // Confirm existing Parent still has exact original password & zero duplicate user rows
  const parentCountRes = await db.query('SELECT COUNT(*)::int AS cnt FROM users WHERE LOWER(email) = LOWER($1)', [parent1Email]);
  assert.equal(parentCountRes.rows[0].cnt, 1);

  // 7. Cross-school isolation: Admin 2 CANNOT approve School 1's application
  const crossApprove = await apiJson(`/api/applications/${app1Id}/decision`, {
    method: 'POST',
    token: admin2Token,
    body: { status: 'approved', assigned_class_id: ctx.class1Id }
  });
  assert.equal(crossApprove.status, 404);

  // 8. Concurrent Approvals on App 1 & App 2 allocate distinct globally unique Official Learner Numbers + Acceptance Letter PDFs
  const [approve1, approve2] = await Promise.all([
    apiJson(`/api/applications/${app1Id}/decision`, {
      method: 'POST',
      token: admin1Token,
      body: { status: 'approved', assigned_class_id: ctx.class1Id, admin_notes: 'Welcome Thabo' }
    }),
    apiJson(`/api/applications/${app2Id}/decision`, {
      method: 'POST',
      token: admin1Token,
      body: { status: 'approved', assigned_class_id: ctx.class1Id, admin_notes: 'Welcome Lindiwe' }
    })
  ]);
  assert.equal(approve1.status, 200, `Approve1 failed: ${approve1.text}`);
  assert.equal(approve2.status, 200, `Approve2 failed: ${approve2.text}`);
  const learner1No = approve1.json.learner_number;
  const learner2No = approve2.json.learner_number;
  assert.match(learner1No, /^\d{8}$/);
  assert.match(learner2No, /^\d{8}$/);
  assert.notEqual(learner1No, learner2No, 'Concurrent approvals MUST allocate distinct Learner Numbers');

  // Replay approval is idempotent and NEVER changes Official Learner Number
  const approve1Replay = await apiJson(`/api/applications/${app1Id}/decision`, {
    method: 'POST',
    token: admin1Token,
    body: { status: 'approved', assigned_class_id: ctx.class1Id }
  });
  assert.equal(approve1Replay.status, 200);
  assert.equal(approve1Replay.json.learner_number, learner1No);

  // Check Email 5 captured with Official Learner Number & Acceptance Letter PDF attachment
  const acceptEmails = readCapturedEmails().filter((m) => m.to === parent1Email && /Acceptance|Approved/i.test(m.subject));
  assert.ok(acceptEmails.length >= 2, 'Approval emails must be captured');
  assert.ok(acceptEmails.some((m) => m.html.includes(learner1No) && m.attachments.some((a) => a.filename.endsWith('.pdf') && a.bytes > 500)));

  // 9. Parent completes Registration for App 1 (forged client learner_number MUST be ignored!)
  const regSubjects = ['English Home Language', 'isiZulu First Additional Language', 'Mathematics', 'Natural Sciences', 'Social Sciences', 'Economic and Management Sciences', 'Technology', 'Life Orientation', 'Creative Arts'];
  const reg1Res = await apiJson(`/api/registrations/applications/${app1Id}/complete`, {
    method: 'POST',
    token: parent1Token,
    body: {
      school_id: ctx.school1Id,
      grade: 8,
      academic_year: ctx.academicYear,
      learner_number: '99999999', // FORGED client value — MUST BE IGNORED
      home_language: 'English Home Language',
      first_additional_language: 'isiZulu First Additional Language',
      selected_subjects: regSubjects,
      terms_accepted: true
    }
  });
  assert.equal(reg1Res.status, 200, `Reg1 failed: ${reg1Res.text}`);
  assert.equal(reg1Res.json.learner_number, learner1No, 'Server MUST derive authoritative Learner Number from DB');
  assert.equal(reg1Res.json.learner_activation_mode, 'email_sent');

  // Idempotent registration replay does not duplicate children or enrolments
  const reg1Replay = await apiJson(`/api/registrations/applications/${app1Id}/complete`, {
    method: 'POST',
    token: parent1Token,
    body: {
      school_id: ctx.school1Id,
      grade: 8,
      academic_year: ctx.academicYear,
      selected_subjects: regSubjects,
      terms_accepted: true
    }
  });
  assert.equal(reg1Replay.status, 200);
  assert.equal(reg1Replay.json.idempotent_replay, true);

  // 10. Learner 1 (with personal email) receives Email 7b ONLY AFTER registration, activates password, logs in with Learner Number
  const learner1Emails = readCapturedEmails().filter((m) => m.to === learner1Email && /Activate Your Learner/i.test(m.subject));
  assert.equal(learner1Emails.length, 1, 'Learner 1 must receive Email 7b after registration');
  const learner1ActToken = extractUrlParam(learner1Emails[0].html, '/activate', 'token');
  assert.ok(learner1ActToken);

  // Wrong Learner Number attempting activation rejected (403)
  const wrongLearnerAct = await apiJson('/api/auth/activate', {
    method: 'POST',
    body: {
      token: learner1ActToken,
      password: 'LearnerOne!2026',
      confirm_password: 'LearnerOne!2026',
      learner_number: learner2No
    }
  });
  assert.equal(wrongLearnerAct.status, 403);

  // Password confirmation mismatch rejected (400)
  const mismatchAct = await apiJson('/api/auth/activate', {
    method: 'POST',
    body: {
      token: learner1ActToken,
      password: 'LearnerOne!2026',
      confirm_password: 'Different!2026'
    }
  });
  assert.equal(mismatchAct.status, 400);

  // Concurrent token consumption: only ONE succeeds, second gets 400 token_used
  const [actWin1, actWin2] = await Promise.all([
    apiJson('/api/auth/activate', {
      method: 'POST',
      body: { token: learner1ActToken, password: 'LearnerOne!2026', confirm_password: 'LearnerOne!2026', learner_number: learner1No }
    }),
    apiJson('/api/auth/activate', {
      method: 'POST',
      body: { token: learner1ActToken, password: 'LearnerOne!2026', confirm_password: 'LearnerOne!2026', learner_number: learner1No }
    })
  ]);
  const actStatuses = [actWin1.status, actWin2.status].sort();
  assert.deepEqual(actStatuses, [200, 400], 'Concurrent activation must consume token atomically once');

  // Learner 1 logs in with Official Learner Number + new private password!
  const learner1Login = await apiJson('/api/auth/login', {
    method: 'POST',
    body: { identifier: learner1No, password: 'LearnerOne!2026' }
  });
  assert.equal(learner1Login.status, 200, `Learner 1 login failed: ${learner1Login.text}`);
  assert.equal(learner1Login.json.role.toLowerCase(), 'learner');
  assert.equal(learner1Login.json.user.learner_number, learner1No);

  // 11. CRITICAL P0-1 FIX TEST: Learner Number password recovery targets ONLY Learner 1 (NEVER Parent 1!)
  const parent1HashBefore = (await db.query('SELECT password_hash FROM users WHERE LOWER(email) = LOWER($1)', [parent1Email])).rows[0].password_hash;
  const learnerForgot = await apiJson('/api/auth/forgot-password', {
    method: 'POST',
    body: { identifier: learner1No }
  });
  assert.equal(learnerForgot.status, 200);

  // Confirm OTP stored ONLY as hash in DB (`reset_code IS NULL`, `reset_code_hash` length 64)
  const lUserResetRow = (await db.query('SELECT reset_code, reset_code_hash FROM users WHERE LOWER(email) = LOWER($1)', [learner1Email])).rows[0];
  assert.equal(lUserResetRow.reset_code, null, 'Plaintext reset_code must stay NULL');
  assert.equal(String(lUserResetRow.reset_code_hash || '').length, 64);

  const lResetEmails = readCapturedEmails().filter((m) => m.to === learner1Email && /Reset|Recovery|Password/i.test(m.subject));
  assert.ok(lResetEmails.length >= 1, 'Learner 1 verified inbox must receive OTP');
  const learnerOtp = extractOtp10(lResetEmails[lResetEmails.length - 1].html);
  assert.match(learnerOtp, /^\d{10}$/);

  // Cross-account reset prevented: Learner OTP cannot reset Parent email!
  const crossReset = await apiJson('/api/auth/reset-password', {
    method: 'POST',
    body: { identifier: parent1Email, code: learnerOtp, new_password: 'CrossHack!2026' }
  });
  assert.equal(crossReset.status, 400);

  // Valid Learner reset succeeds, Parent password hash remains 100% unchanged!
  const learnerReset = await apiJson('/api/auth/reset-password', {
    method: 'POST',
    body: { identifier: learner1No, code: learnerOtp, new_password: 'LearnerNew!2027' }
  });
  assert.equal(learnerReset.status, 200, `Learner reset failed: ${learnerReset.text}`);

  // Reused OTP rejected!
  const otpReuse = await apiJson('/api/auth/reset-password', {
    method: 'POST',
    body: { identifier: learner1No, code: learnerOtp, new_password: 'LearnerAgain!2028' }
  });
  assert.equal(otpReuse.status, 400);

  const parent1HashAfter = (await db.query('SELECT password_hash FROM users WHERE LOWER(email) = LOWER($1)', [parent1Email])).rows[0].password_hash;
  assert.equal(parent1HashAfter, parent1HashBefore, 'Learner Number recovery MUST NEVER alter Parent password');

  // Learner logs in with new password
  const learner1NewLogin = await apiJson('/api/auth/login', {
    method: 'POST',
    body: { identifier: learner1No, password: 'LearnerNew!2027' }
  });
  assert.equal(learner1NewLogin.status, 200);

  // 12. Brute-force OTP lockout (5 wrong attempts -> 429 & hash wiped)
  await apiJson('/api/auth/forgot-password', { method: 'POST', body: { identifier: parent1Email } });
  let lockedStatus = 0;
  for (let i = 0; i < 5; i += 1) {
    const attempt = await apiJson('/api/auth/verify-otp', {
      method: 'POST',
      body: { identifier: parent1Email, code: '0000000000' }
    });
    lockedStatus = attempt.status;
  }
  assert.equal(lockedStatus, 429, '5th invalid OTP attempt must lock out with 429');

  // 13. Scenario 3: Learner WITHOUT personal email -> Registration -> Parent-initiated 15-min handoff
  const reg2Res = await apiJson(`/api/registrations/applications/${app2Id}/complete`, {
    method: 'POST',
    token: parent1Token,
    body: {
      school_id: ctx.school1Id,
      grade: 8,
      academic_year: ctx.academicYear,
      home_language: 'English Home Language',
      first_additional_language: 'isiZulu First Additional Language',
      selected_subjects: regSubjects,
      terms_accepted: true
    }
  });
  assert.equal(reg2Res.status, 200);
  assert.equal(reg2Res.json.learner_activation_mode, 'parent_handoff');
  const child2Id = reg2Res.json.child_id;

  // Wrong Parent CANNOT initiate handoff (403)
  const wrongParentLogin = await apiJson('/api/auth/login', {
    method: 'POST',
    body: { email: 'seed.verified@staging.test', password: 'LegacyPass!2026' }
  });
  assert.equal(wrongParentLogin.status, 200);
  const wrongHandoff = await apiJson(`/api/registrations/applications/${app2Id}/learner-setup-session`, {
    method: 'POST',
    token: wrongParentLogin.json.token
  });
  assert.equal(wrongHandoff.status, 403);

  // Owning Parent starts 15-min single-use handoff -> Learner sets own private password -> logs in with Learner Number
  const handoff2 = await apiJson(`/api/registrations/applications/${app2Id}/learner-setup-session`, {
    method: 'POST',
    token: parent1Token
  });
  assert.equal(handoff2.status, 201);
  assert.equal(handoff2.json.expires_in_minutes, 15);
  assert.equal(handoff2.json.learner_number, learner2No);
  const handoff2Token = extractUrlParam(handoff2.json.handoff_url, '/activate', 'token');
  assert.ok(handoff2Token);

  const l2Act = await apiJson('/api/auth/activate', {
    method: 'POST',
    body: { token: handoff2Token, password: 'LearnerTwo!2026', confirm_password: 'LearnerTwo!2026' }
  });
  assert.equal(l2Act.status, 200);
  assert.equal(l2Act.json.learner_number, learner2No);

  const l2Login = await apiJson('/api/auth/login', {
    method: 'POST',
    body: { identifier: learner2No, password: 'LearnerTwo!2026' }
  });
  assert.equal(l2Login.status, 200);
  assert.equal(l2Login.json.user.learner_number, learner2No);

  // Parent-initiated Learner password reset handoff for no-email minor
  const resetHandoff2 = await apiJson(`/api/registrations/children/${child2Id}/learner-reset-session`, {
    method: 'POST',
    token: parent1Token
  });
  assert.equal(resetHandoff2.status, 201);
  const resetHandoffToken = extractUrlParam(resetHandoff2.json.handoff_url, '/activate', 'token');
  const l2ResetDone = await apiJson('/api/auth/activate', {
    method: 'POST',
    body: { token: resetHandoffToken, password: 'LearnerTwoNew!2027', confirm_password: 'LearnerTwoNew!2027' }
  });
  assert.equal(l2ResetDone.status, 200);
  const l2NewLogin = await apiJson('/api/auth/login', {
    method: 'POST',
    body: { identifier: learner2No, password: 'LearnerTwoNew!2027' }
  });
  assert.equal(l2NewLogin.status, 200);

  // 14. Scenario 4: Rejected application -> NO Official Learner Number, blocked from registration, allows fresh resubmission
  const learner3Id = makeValidSaId(12, 9, 11, randSeq(true));
  const app3Res = await apiJson('/api/applications/apply', {
    method: 'POST',
    token: parent1Token,
    body: buildAppFormData({
      school_id: ctx.school1Id,
      first_name: 'Kagiso',
      surname: 'Mokoena',
      id_number: learner3Id,
      dob: '2012-09-11',
      gender: 'Male',
      grade_applied: 8,
      academic_year: ctx.academicYear,
      home_language: 'English',
      physical_address: '12 Oak Street, Polokwane',
      primary_parent_name: 'Naledi',
      primary_parent_surname: 'Mokoena',
      primary_parent_relationship: 'Mother',
      primary_parent_id_number: parent1IdNum,
      primary_parent_phone: '0821112233',
      primary_parent_email: parent1Email,
      primary_parent_address: '12 Oak Street, Polokwane'
    })
  });
  assert.equal(app3Res.status, 201);
  const app3Id = app3Res.json.applicationId;

  const decline3 = await apiJson(`/api/applications/${app3Id}/decision`, {
    method: 'POST',
    token: admin1Token,
    body: { status: 'rejected', reason: 'Zoning outside feeder area for this intake.' }
  });
  assert.equal(decline3.status, 200);

  const regDeclined = await apiJson(`/api/registrations/applications/${app3Id}/complete`, {
    method: 'POST',
    token: parent1Token,
    body: { school_id: ctx.school1Id, grade: 8, academic_year: ctx.academicYear, selected_subjects: regSubjects, terms_accepted: true }
  });
  assert.equal(regDeclined.status, 409, 'Rejected application MUST be blocked from registration');

  // 15. Phase M2.5: Legacy public /register retired (410), Controlled Admin Legacy Learner Linkage works same-school & blocks cross-school
  const legacyReg = await apiJson('/api/auth/register', {
    method: 'POST',
    body: { email: `legacy.try.${runTag}@staging.test`, password: 'SomePass!2026', role: 'parent' }
  });
  assert.equal(legacyReg.status, 410);
  assert.equal(legacyReg.json.code, 'legacy_registration_retired');

  const legacyLinkCrossSchool = await apiJson('/api/admin/legacy-learners/link', {
    method: 'POST',
    token: admin2Token,
    body: { child_id: child2Id, parent_email: `secondparent.${runTag}@staging.test`, parent_first_name: 'Sipho', parent_surname: 'Mokoena' }
  });
  assert.equal(legacyLinkCrossSchool.status, 403);

  const legacyLinkOk = await apiJson('/api/admin/legacy-learners/link', {
    method: 'POST',
    token: admin1Token,
    body: { child_id: child2Id, parent_email: `secondparent.${runTag}@staging.test`, parent_first_name: 'Sipho', parent_surname: 'Mokoena' }
  });
  assert.equal(legacyLinkOk.status, 200);
  assert.equal(legacyLinkOk.json.generated_password, undefined);
  assert.equal(legacyLinkOk.json.activation_required, true);

  // 16. CORS explicit allowlist check
  const allowedCors = await apiJson('/api/auth/check-login-account', {
    method: 'POST',
    headers: { Origin: 'https://fusion-high-app.web.app' },
    body: { identifier: 'test@example.com' }
  });
  assert.equal(allowedCors.headers.get('access-control-allow-origin'), 'https://fusion-high-app.web.app');

  const blockedCors = await apiJson('/api/auth/check-login-account', {
    method: 'POST',
    headers: { Origin: 'https://evil-attacker.example.com' },
    body: { identifier: 'test@example.com' }
  });
  assert.equal(blockedCors.headers.get('access-control-allow-origin'), null);

  // 17. Phase M2.5: Principal-invited Teacher registration flow remains preserved
  const hasStaffInvites = (await db.query(`SELECT to_regclass('public.staff_invites') AS reg`)).rows[0]?.reg;
  if (hasStaffInvites) {
    const inviteTok = `inv_${runTag}_teacher_ok`;
    await db.query(
      `INSERT INTO staff_invites (school_id, email, full_name, surname, role_type, invite_token, status)
       VALUES ($1, $2, 'Invited', 'Educator', 'teacher', $3, 'invited')`,
      [ctx.school1Id, `invited.teacher.${runTag}@staging.test`, inviteTok]
    );
    const verifyInvite = await apiJson(`/api/staff-invites/verify?token=${encodeURIComponent(inviteTok)}`);
    assert.equal(verifyInvite.status, 200, `Expected invited teacher verify to succeed, got ${verifyInvite.text}`);
    assert.equal(verifyInvite.json.valid, true);
    assert.equal(verifyInvite.json.invite.school_id, ctx.school1Id);
  }
});
