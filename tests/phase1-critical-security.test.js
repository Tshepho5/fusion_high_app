'use strict';

const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const root = path.join(__dirname, '..');
const firebaseModulePath = require.resolve('../db/firebase');
require.cache[firebaseModulePath] = {
  id: firebaseModulePath,
  filename: firebaseModulePath,
  loaded: true,
  exports: { app: null, db: null, firestore: null, auth: null, storage: null, bucket: null }
};
const testDb = `geleza_phase1_${Date.now()}`;
let adminClient;
let server;
let base;
let db;
let appMarker = '';
let profileMarker = '';
let messageMarker = '';
const createdFiles = [];
let originalApplicationFiles = [];

function assertDisposableDatabase(name) {
  assert.match(name, /^geleza_phase1_\d+$/);
  assert.notEqual(name, 'FUSION_DB');
}

async function api(method, urlPath, { token, body } = {}) {
  const response = await fetch(base + urlPath, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch (_) {}
  return { status: response.status, json, text };
}

function sign(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email, school_id: 999, is_superadmin: true, sid: user.sid },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

async function userRow(email) {
  const result = await db.query(
    'SELECT id, email, password_hash, role_id, school_id FROM users WHERE LOWER(email) = LOWER($1)',
    [email]
  );
  return result.rows;
}

before(async () => {
  assertDisposableDatabase(testDb);
  require('dotenv').config({ path: path.join(root, '.env') });
  const host = process.env.DB_HOST === 'localhost' ? '127.0.0.1' : (process.env.DB_HOST || '127.0.0.1');
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD;
  adminClient = new Client({ host, port, user, password, database: 'postgres' });
  await adminClient.connect();
  const existing = await adminClient.query('SELECT datname FROM pg_database WHERE datname = $1', [testDb]);
  assert.equal(existing.rows.length, 0);
  await adminClient.query(`CREATE DATABASE ${testDb}`);

  process.env.DATABASE_URL = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password || '')}@${host}:${port}/${testDb}`;
  assert.ok(process.env.DATABASE_URL.endsWith(`/${testDb}`));
  assert.equal(process.env.DATABASE_URL.includes('/FUSION_DB'), false);

  db = require('../db/db');
  const emailService = require('../public/src/services/emailService');
  emailService.send = async () => ({ success: true, skipped: true });
  emailService.sendTeacherApplicationPrincipalNotice = async () => ({ success: true, skipped: true });
  emailService.sendTeacherApplicationReceivedNotice = async () => ({ success: true, skipped: true });
  emailService.sendTeacherApplicationApprovedNotice = async () => ({ success: true, skipped: true });
  emailService.sendApplicationAccepted = async () => ({ success: true, skipped: true });
  emailService.sendApplicationWaitlisted = async () => ({ success: true, skipped: true });
  emailService.sendApplicationCorrection = async () => ({ success: true, skipped: true });
  emailService.sendApplicationUnsuccessful = async () => ({ success: true, skipped: true });
  emailService.sendApplicationApprovedWithFeeNotice = async () => ({ success: true, skipped: true });
  emailService.sendParentWelcome = async () => ({ success: true, skipped: true });
  const current = await db.query('SELECT current_database() AS name');
  assert.equal(current.rows[0].name, testDb);
  assert.notEqual(current.rows[0].name, 'FUSION_DB');

  await db.query(`
    CREATE TABLE roles (id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL);
    INSERT INTO roles (id, name) VALUES (1, 'admin'), (2, 'parent'), (3, 'learner'), (4, 'teacher');
    SELECT setval('roles_id_seq', 4);

    CREATE TABLE schools (
      id INTEGER PRIMARY KEY,
      name TEXT,
      slug TEXT,
      domain TEXT,
      contact_email TEXT,
      principal_name TEXT
    );
    INSERT INTO schools (id, name, slug) VALUES
      (10, 'Phase School A', 'phase-a'),
      (20, 'Phase School B', 'phase-b'),
      (22, 'Phase School C', 'phase-c');

    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      role_id INTEGER,
      school_id INTEGER DEFAULT 1,
      is_superadmin BOOLEAN DEFAULT FALSE,
      full_name TEXT,
      surname TEXT,
      id_number TEXT,
      dob DATE,
      gender TEXT,
      phone TEXT,
      physical_address TEXT,
      country TEXT,
      race TEXT,
      parent_type TEXT,
      profile_picture TEXT,
      profile_picture_path TEXT,
      active_session_id TEXT,
      session_seen_at TIMESTAMP,
      last_seen_at TIMESTAMP,
      is_online BOOLEAN,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE children (
      id SERIAL PRIMARY KEY,
      learner_user_id INTEGER,
      full_name TEXT,
      surname TEXT,
      parent_id INTEGER,
      secondary_parent_id INTEGER,
      learner_number TEXT UNIQUE,
      grade INTEGER,
      stream TEXT,
      subjects TEXT[] DEFAULT '{}',
      class_id INTEGER,
      application_number TEXT,
      home_language TEXT,
      school_id INTEGER DEFAULT 1,
      is_active BOOLEAN DEFAULT TRUE,
      profile_picture_path TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE parent_children (
      id SERIAL PRIMARY KEY,
      parent_id INTEGER NOT NULL,
      child_id INTEGER NOT NULL,
      relationship TEXT,
      is_primary BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (parent_id, child_id)
    );

    CREATE TABLE classes (
      id SERIAL PRIMARY KEY,
      name TEXT,
      school_id INTEGER,
      assigned_teacher_id INTEGER,
      ownership_quarantine BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE applications (
      id SERIAL PRIMARY KEY,
      application_number TEXT UNIQUE,
      status TEXT,
      school_id INTEGER DEFAULT 1,
      first_name TEXT,
      surname TEXT,
      email TEXT,
      phone TEXT,
      id_number TEXT,
      grade_applied INTEGER,
      stream TEXT,
      home_language TEXT,
      provisional_learner_number TEXT,
      assigned_class_id INTEGER,
      admin_notes TEXT,
      registration_fee_status TEXT,
      application_fee_status TEXT,
      application_fee_amount NUMERIC,
      registration_fee_amount NUMERIC,
      primary_parent_email TEXT,
      secondary_parent_email TEXT,
      primary_parent_name TEXT,
      primary_parent_surname TEXT,
      primary_parent_phone TEXT,
      primary_parent_id_number TEXT,
      ai_verification_notes TEXT,
      correction_token TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE application_documents (
      id SERIAL PRIMARY KEY,
      application_id INTEGER,
      file_path TEXT,
      file_name TEXT,
      mime_type TEXT,
      document_type TEXT
    );

    CREATE TABLE messages (
      id SERIAL PRIMARY KEY,
      sender_id INTEGER,
      recipient_id INTEGER,
      attachment_url TEXT
    );

    CREATE TABLE staff_invites (
      id SERIAL PRIMARY KEY,
      email TEXT,
      status TEXT,
      school_id INTEGER,
      invite_token TEXT,
      approval_token TEXT,
      password_hash TEXT,
      full_name TEXT,
      surname TEXT,
      phone TEXT,
      id_number TEXT,
      sace_number TEXT,
      qualifications TEXT,
      role_type TEXT,
      subjects_offered TEXT[] DEFAULT '{}',
      assigned_grades INTEGER[] DEFAULT '{}',
      assigned_classes TEXT[] DEFAULT '{}',
      confirmed_subjects TEXT[] DEFAULT '{}',
      confirmed_grades INTEGER[] DEFAULT '{}',
      confirmed_classes TEXT[] DEFAULT '{}',
      invited_by INTEGER,
      approved_by INTEGER,
      approved_at TIMESTAMP,
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE employees (
      id SERIAL PRIMARY KEY,
      user_id INTEGER UNIQUE,
      full_name TEXT,
      surname TEXT,
      department_id INTEGER,
      school_id INTEGER,
      phone TEXT,
      email TEXT,
      subjects TEXT[] DEFAULT '{}',
      grades_taught INTEGER[] DEFAULT '{}',
      classes_taught TEXT[] DEFAULT '{}'
    );

    CREATE TABLE teacher_assignments (
      id SERIAL PRIMARY KEY,
      teacher_id INTEGER,
      subject_name TEXT,
      grade_level INTEGER,
      class_name TEXT,
      class_id INTEGER,
      UNIQUE (teacher_id, subject_name, grade_level, class_name)
    );

    CREATE TABLE fee_invoices (
      id SERIAL PRIMARY KEY,
      learner_id INTEGER,
      parent_id INTEGER,
      invoice_number TEXT UNIQUE,
      title TEXT,
      description TEXT,
      category TEXT,
      term TEXT,
      amount NUMERIC,
      paid_amount NUMERIC,
      balance NUMERIC,
      status TEXT,
      due_date DATE,
      itemized_breakdown TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  const express = require('express');
  const app = express();
  app.use(express.json());
  const authRoutes = require('../public/src/routes/authRoutes');
  const protectedFiles = require('../public/src/controller/protectedFileController');
  const { authenticateToken } = require('../authMiddleware');
  app.use('/api', authRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/parent', require('../public/src/routes/parentRoutes'));
  app.use('/api/applications', require('../public/src/routes/applicationRoutes'));
  app.use('/api/admin', require('../public/src/routes/adminRoutes'));
  app.use('/api/staff-invites', require('../public/src/routes/staffInviteRoutes'));
  app.get('/uploads/applications/:filename', authenticateToken, protectedFiles.sendApplicationFile);
  app.get('/uploads/pfp/:filename', authenticateToken, protectedFiles.sendProfileFile);
  app.get('/uploads/messages/:subfolder/:filename', authenticateToken, protectedFiles.sendMessageFile);
  app.get('/uploads/messages/:filename', authenticateToken, protectedFiles.sendMessageFile);
  app.use('/uploads', protectedFiles.rejectSensitiveStatic, express.static(path.join(root, 'uploads')));

  server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  base = `http://127.0.0.1:${server.address().port}`;

  const applicationsDir = path.join(root, 'uploads', 'applications');
  originalApplicationFiles = fs.existsSync(applicationsDir) ? fs.readdirSync(applicationsDir) : [];
});

after(async () => {
  for (const file of createdFiles) {
    if (file.startsWith(path.join(root, 'uploads')) && path.basename(file).startsWith('phase1-')) {
      fs.rmSync(file, { force: true });
    }
  }
  if (server) await new Promise((resolve) => server.close(resolve));
  if (db && db.pool) await db.pool.end();
  if (adminClient && /^geleza_phase1_\d+$/.test(testDb)) {
    await adminClient.query(`DROP DATABASE IF EXISTS ${testDb} WITH (FORCE)`);
    await adminClient.end();
  }
});

describe('phase 1 critical security', { concurrency: 1 }, () => {
  test('C1 protects application, profile, and message files', async () => {
    const stamp = Date.now();
    appMarker = `phase1-${stamp}-admission.pdf`;
    profileMarker = `phase1-${stamp}-portrait.png`;
    messageMarker = `phase1-${stamp}-attachment.pdf`;
    const appPath = path.join(root, 'uploads', 'applications', appMarker);
    const profilePath = path.join(root, 'uploads', 'pfp', profileMarker);
    const messagePath = path.join(root, 'uploads', 'messages', 'documents', messageMarker);
    fs.mkdirSync(path.dirname(messagePath), { recursive: true });
    fs.writeFileSync(appPath, 'phase1 admission marker');
    fs.writeFileSync(profilePath, 'phase1 profile marker');
    fs.writeFileSync(messagePath, 'phase1 message marker');
    createdFiles.push(appPath, profilePath, messagePath);
    const beforeStat = fs.statSync(appPath);

    const hash = await bcrypt.hash('ExistingPass1!', 4);
    const parent = await db.query(
      `INSERT INTO users (email, password_hash, role_id, school_id, full_name, surname, active_session_id)
       VALUES ('parent.a@phase1.test', $1, 2, 10, 'Amahle', 'Dlamini', 'sid-parent-a') RETURNING id`,
      [hash]
    );
    const otherParent = await db.query(
      `INSERT INTO users (email, password_hash, role_id, school_id, full_name, surname, active_session_id)
       VALUES ('parent.b@phase1.test', $1, 2, 20, 'Lerato', 'Ndlovu', 'sid-parent-b') RETURNING id`,
      [hash]
    );
    const adminA = await db.query(
      `INSERT INTO users (email, password_hash, role_id, school_id, is_superadmin, full_name, surname, active_session_id, profile_picture_path)
       VALUES ('admin.a@phase1.test', $1, 1, 10, FALSE, 'School', 'Admin', 'sid-admin-a', $2) RETURNING id`,
      [hash, profileMarker]
    );
    const adminB = await db.query(
      `INSERT INTO users (email, password_hash, role_id, school_id, is_superadmin, full_name, surname, active_session_id)
       VALUES ('admin.b@phase1.test', $1, 1, 20, FALSE, 'Other', 'Admin', 'sid-admin-b') RETURNING id`,
      [hash]
    );
    const application = await db.query(
      `INSERT INTO applications (application_number, status, school_id, first_name, surname, primary_parent_email)
       VALUES ('APP-FILE-1', 'submitted', 10, 'Karabo', 'Dlamini', 'parent.a@phase1.test') RETURNING id`
    );
    await db.query(
      `INSERT INTO application_documents (application_id, file_path, file_name, mime_type)
       VALUES ($1, $2, $3, 'application/pdf')`,
      [application.rows[0].id, `uploads/applications/${appMarker}`, appMarker]
    );
    await db.query(
      `INSERT INTO messages (sender_id, recipient_id, attachment_url) VALUES ($1, $2, $3)`,
      [parent.rows[0].id, adminA.rows[0].id, `uploads/messages/documents/${messageMarker}`]
    );

    const parentToken = sign({ id: parent.rows[0].id, role: 'parent', email: 'parent.a@phase1.test', sid: 'sid-parent-a' });
    const otherToken = sign({ id: otherParent.rows[0].id, role: 'parent', email: 'parent.b@phase1.test', sid: 'sid-parent-b' });
    const adminToken = sign({ id: adminA.rows[0].id, role: 'admin', email: 'admin.a@phase1.test', sid: 'sid-admin-a' });
    const otherAdminToken = sign({ id: adminB.rows[0].id, role: 'admin', email: 'admin.b@phase1.test', sid: 'sid-admin-b' });

    const anonymous = await api('GET', `/uploads/applications/${appMarker}`);
    assert.equal(anonymous.status, 401);
    assert.equal(anonymous.text.includes('phase1 admission marker'), false);
    assert.equal(anonymous.text.includes(appPath), false);

    const crossSchool = await api('GET', `/uploads/applications/${appMarker}`, { token: otherAdminToken });
    assert.equal(crossSchool.status, 403);
    assert.equal(crossSchool.text.includes(appPath), false);

    const allowedAdmin = await api('GET', `/uploads/applications/${appMarker}`, { token: adminToken });
    assert.equal(allowedAdmin.status, 200);
    assert.equal(allowedAdmin.text.includes('phase1 admission marker'), true);

    const allowedParent = await api('GET', `/uploads/applications/${appMarker}`, { token: parentToken });
    assert.equal(allowedParent.status, 200);

    const otherParentDenied = await api('GET', `/uploads/applications/${appMarker}`, { token: otherToken });
    assert.equal(otherParentDenied.status, 403);

    const traversal = await api('GET', '/uploads/applications/..%2F..%2Fpackage.json', { token: adminToken });
    assert.ok(traversal.status === 400 || traversal.status === 404);
    assert.equal(traversal.text.includes('"name"'), false);

    const invalidName = await api('GET', '/uploads/applications/bad%20name.pdf', { token: adminToken });
    assert.equal(invalidName.status, 400);

    const missing = await api('GET', '/uploads/applications/phase1-missing-file.pdf', { token: adminToken });
    assert.equal(missing.status, 404);
    assert.equal(missing.text.includes(root), false);

    const profileAllowed = await api('GET', `/uploads/pfp/${profileMarker}`, { token: adminToken });
    assert.equal(profileAllowed.status, 200);
    const profileCross = await api('GET', `/uploads/pfp/${profileMarker}`, { token: otherAdminToken });
    assert.equal(profileCross.status, 403);

    const messageAllowed = await api('GET', `/uploads/messages/documents/${messageMarker}`, { token: parentToken });
    assert.equal(messageAllowed.status, 200);
    const messageDenied = await api('GET', `/uploads/messages/documents/${messageMarker}`, { token: otherToken });
    assert.equal(messageDenied.status, 403);

    const afterStat = fs.statSync(appPath);
    assert.equal(afterStat.size, beforeStat.size);
    for (const name of originalApplicationFiles) {
      assert.equal(fs.existsSync(path.join(root, 'uploads', 'applications', name)), true);
    }
  });

  test('C2 refuses registration over an existing account on both routes', async () => {
    const hash = await bcrypt.hash('ExistingPass1!', 4);
    await db.query(
      `INSERT INTO users (email, password_hash, role_id, school_id, full_name, surname)
       VALUES ('existing.parent@phase1.test', $1, 1, 10, 'Existing', 'Parent')`,
      [hash]
    );
    await db.query(
      `INSERT INTO users (email, password_hash, role_id, school_id, full_name, surname, id_number)
       VALUES ('learner.one@phase1.test', $1, 3, 10, 'Karabo', 'Dlamini', '0001015800085') RETURNING id`,
      [hash]
    );
    const learner = await db.query("SELECT id, password_hash FROM users WHERE email = 'learner.one@phase1.test'");
    await db.query(
      `INSERT INTO children (learner_user_id, full_name, surname, learner_number, grade, stream, school_id)
       VALUES ($1, 'Karabo', 'Dlamini', 'LN-PHASE-1', 10, 'Science', 10)`,
      [learner.rows[0].id]
    );

    const payload = {
      email: 'Existing.Parent@phase1.test',
      password: 'Replacement1!',
      full_name: 'Replacement',
      surname: 'Attacker',
      school_id: 20,
      children_to_link: [{
        learner_number: 'LN-PHASE-1',
        first_name: 'Karabo',
        surname: 'Dlamini',
        id_number: '0001015800085'
      }]
    };
    const first = await api('POST', '/api/register', { body: payload });
    const second = await api('POST', '/api/auth/register', { body: payload });
    assert.equal(first.status, 409);
    assert.equal(second.status, 409);
    assert.equal(JSON.stringify(first.json).includes('Replacement1'), false);
    assert.equal(JSON.stringify(first.json).includes(hash), false);

    const unchanged = await userRow('existing.parent@phase1.test');
    assert.equal(unchanged.length, 1);
    assert.equal(unchanged[0].password_hash, hash);
    assert.equal(unchanged[0].role_id, 1);
    assert.equal(unchanged[0].school_id, 10);
    const learnerAfter = await db.query('SELECT password_hash FROM users WHERE id = $1', [learner.rows[0].id]);
    assert.equal(learnerAfter.rows[0].password_hash, learner.rows[0].password_hash);

    const created = await api('POST', '/api/register', {
      body: {
        ...payload,
        email: 'new.parent@phase1.test',
        password: 'BrandNew1!'
      }
    });
    assert.equal(created.status, 200, created.text);
    const createdRows = await userRow('new.parent@phase1.test');
    assert.equal(createdRows.length, 1);
    assert.equal(createdRows[0].role_id, 2);
    assert.equal(await bcrypt.compare('BrandNew1!', createdRows[0].password_hash), true);

    const raceEmail = 'race.parent@phase1.test';
    const raceBody = { ...payload, email: raceEmail, password: 'RacePass1!' };
    const raced = await Promise.all([
      api('POST', '/api/register', { body: raceBody }),
      api('POST', '/api/auth/register', { body: { ...raceBody, email: 'Race.Parent@phase1.test' } }),
      api('POST', '/api/register', { body: raceBody }),
      api('POST', '/api/auth/register', { body: raceBody }),
    ]);
    const raceRows = await userRow(raceEmail);
    assert.equal(raceRows.length, 1);
    assert.equal(raced.some((item) => item.status === 200), true);
    assert.equal(raced.every((item) => item.status === 200 || item.status === 409), true);

    const still = await userRow('existing.parent@phase1.test');
    assert.equal(still[0].password_hash, hash);
    assert.equal(still[0].role_id, 1);
    assert.equal(still[0].school_id, 10);
  });

  test('C3 links a learner without changing or returning a password', async () => {
    const hash = await bcrypt.hash('LearnerSecret1!', 4);
    const parent = await db.query(
      `INSERT INTO users (email, password_hash, role_id, school_id, full_name, surname, active_session_id)
       VALUES ('linker@phase1.test', $1, 2, 10, 'Amahle', 'Dlamini', 'sid-linker') RETURNING id`,
      [hash]
    );
    const learner = await db.query(
      `INSERT INTO users (email, password_hash, role_id, school_id, full_name, surname, id_number, active_session_id)
       VALUES ('learner.two@phase1.test', $1, 3, 10, 'Thabo', 'Mokoena', '9801015800085', 'sid-learner') RETURNING id, password_hash`,
      [hash]
    );
    const child = await db.query(
      `INSERT INTO children (learner_user_id, full_name, surname, learner_number, grade, stream, school_id)
       VALUES ($1, 'Thabo', 'Mokoena', 'LN-PHASE-2', 9, 'General', 10) RETURNING id`,
      [learner.rows[0].id]
    );
    const otherLearner = await db.query(
      `INSERT INTO users (email, password_hash, role_id, school_id, id_number)
       VALUES ('learner.other@phase1.test', $1, 3, 20, '9701015800084') RETURNING id`,
      [hash]
    );
    await db.query(
      `INSERT INTO children (learner_user_id, full_name, surname, learner_number, school_id)
       VALUES ($1, 'Other', 'Learner', 'LN-PHASE-OTHER', 20)`,
      [otherLearner.rows[0].id]
    );

    const parentToken = sign({ id: parent.rows[0].id, role: 'parent', email: 'linker@phase1.test', sid: 'sid-linker' });
    const learnerToken = sign({ id: learner.rows[0].id, role: 'learner', email: 'learner.two@phase1.test', sid: 'sid-learner' });
    const body = {
      learner_number: 'LN-PHASE-2',
      id_number: '9801015800085',
      first_name: 'Thabo',
      surname: 'Mokoena',
      school_id: 20
    };

    const anonymous = await api('POST', '/api/parent/link-child', { body });
    assert.equal(anonymous.status, 401);
    const forbidden = await api('POST', '/api/parent/link-child', { token: learnerToken, body });
    assert.equal(forbidden.status, 403);

    const cross = await api('POST', '/api/parent/link-child', {
      token: parentToken,
      body: { ...body, learner_number: 'LN-PHASE-OTHER', id_number: '9701015800084', first_name: 'Other', surname: 'Learner' }
    });
    assert.equal(cross.status, 404);

    const linked = await api('POST', '/api/parent/link-child', { token: parentToken, body });
    assert.equal(linked.status, 200, linked.text);
    assert.equal(Object.prototype.hasOwnProperty.call(linked.json, 'credentials'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(linked.json, 'generated_password'), false);
    assert.equal(JSON.stringify(linked.json).toLowerCase().includes('password'), false);

    const learnerAfter = await db.query('SELECT password_hash, role_id, school_id FROM users WHERE id = $1', [learner.rows[0].id]);
    assert.equal(learnerAfter.rows[0].password_hash, learner.rows[0].password_hash);
    assert.equal(learnerAfter.rows[0].role_id, 3);
    assert.equal(learnerAfter.rows[0].school_id, 10);
    const links = await db.query('SELECT id FROM parent_children WHERE parent_id = $1 AND child_id = $2', [parent.rows[0].id, child.rows[0].id]);
    assert.equal(links.rows.length, 1);

    const repeat = await api('POST', '/api/parent/link-child', { token: parentToken, body });
    assert.equal(repeat.status, 400);
    const linksAfter = await db.query('SELECT id FROM parent_children WHERE parent_id = $1 AND child_id = $2', [parent.rows[0].id, child.rows[0].id]);
    assert.equal(linksAfter.rows.length, 1);
  });

  test('C4 does not let a staff invitation take over an existing account', async () => {
    const hash = await bcrypt.hash('StaffSecret1!', 4);
    const existing = await db.query(
      `INSERT INTO users (email, password_hash, role_id, school_id, full_name, surname)
       VALUES ('taken.teacher@phase1.test', $1, 2, 10, 'Taken', 'Account') RETURNING id, password_hash, role_id, school_id`,
      [hash]
    );
    const admin = await db.query(
      `INSERT INTO users (email, password_hash, role_id, school_id, is_superadmin, full_name, surname, active_session_id)
       VALUES ('invite.admin@phase1.test', $1, 1, 10, FALSE, 'Invite', 'Admin', 'sid-invite-admin') RETURNING id`,
      [hash]
    );
    const applied = await db.query(
      `INSERT INTO staff_invites (email, status, school_id, invite_token, full_name, surname, subjects_offered, assigned_grades, assigned_classes)
       VALUES ('new.applied@phase1.test', 'invited', 10, 'phase1-applied-token', 'New', 'Teacher', '{Mathematics}', '{10}', '{10A}') RETURNING id`
    );
    const approvedNew = await db.query(
      `INSERT INTO staff_invites (email, status, school_id, invite_token, password_hash, full_name, surname, subjects_offered, assigned_grades, assigned_classes)
       VALUES ('brand.teacher@phase1.test', 'approved', 20, 'phase1-approved-token', $1, 'Brand', 'Teacher', '{Mathematics}', '{10}', '{10A}') RETURNING id`,
      [hash]
    );
    const approvedTaken = await db.query(
      `INSERT INTO staff_invites (email, status, school_id, invite_token, full_name, surname)
       VALUES ('Taken.Teacher@phase1.test', 'approved', 20, 'phase1-takeover-token', 'Taken', 'Over') RETURNING id`
    );
    const appliedExisting = await db.query(
      `INSERT INTO staff_invites (email, status, school_id, invite_token, full_name, surname)
       VALUES ('taken.teacher@phase1.test', 'applied', 20, 'phase1-applied-existing', 'Taken', 'Account') RETURNING id`
    );

    const invalid = await api('POST', '/api/staff-invites/confirm', {
      body: { token: 'missing-token', password: 'StaffPass1', confirmPassword: 'StaffPass1', full_name: 'No', surname: 'One' }
    });
    assert.equal(invalid.status, 404);

    const apply = await api('POST', '/api/staff-invites/confirm', {
      body: {
        token: 'phase1-applied-token',
        password: 'StaffPass1',
        confirmPassword: 'StaffPass1',
        full_name: 'New',
        surname: 'Teacher'
      }
    });
    assert.equal(apply.status, 200, apply.text);
    assert.equal(apply.json.status, 'applied');
    assert.equal((await userRow('new.applied@phase1.test')).length, 0);
    const appliedRow = await db.query('SELECT status FROM staff_invites WHERE id = $1', [applied.rows[0].id]);
    assert.equal(appliedRow.rows[0].status, 'applied');

    const takeover = await api('POST', '/api/staff-invites/confirm', {
      body: {
        token: 'phase1-takeover-token',
        password: 'TakenOver1',
        confirmPassword: 'TakenOver1',
        full_name: 'Taken',
        surname: 'Over'
      }
    });
    assert.equal(takeover.status, 409);
    const victim = await db.query('SELECT password_hash, role_id, school_id FROM users WHERE id = $1', [existing.rows[0].id]);
    assert.equal(victim.rows[0].password_hash, existing.rows[0].password_hash);
    assert.equal(victim.rows[0].role_id, 2);
    assert.equal(victim.rows[0].school_id, 10);
    const takeoverInvite = await db.query('SELECT status FROM staff_invites WHERE id = $1', [approvedTaken.rows[0].id]);
    assert.equal(takeoverInvite.rows[0].status, 'approved');

    const created = await api('POST', '/api/staff-invites/register', {
      body: {
        token: 'phase1-approved-token',
        password: 'BrandNew1!',
        confirmPassword: 'BrandNew1!',
        full_name: 'Brand',
        surname: 'Teacher'
      }
    });
    assert.equal(created.status, 200, created.text);
    const teacher = await userRow('brand.teacher@phase1.test');
    assert.equal(teacher.length, 1);
    assert.equal(teacher[0].role_id, 4);
    assert.equal(teacher[0].school_id, 20);
    assert.equal(await bcrypt.compare('BrandNew1!', teacher[0].password_hash), true);

    const adminToken = sign({ id: admin.rows[0].id, role: 'admin', email: 'invite.admin@phase1.test', sid: 'sid-invite-admin' });
    const approveTaken = await api('POST', `/api/admin/staff-invites/${appliedExisting.rows[0].id}/approve`, { token: adminToken });
    assert.equal(approveTaken.status, 409);
    const victimAgain = await db.query('SELECT password_hash, role_id, school_id FROM users WHERE id = $1', [existing.rows[0].id]);
    assert.equal(victimAgain.rows[0].password_hash, existing.rows[0].password_hash);
    assert.equal(victimAgain.rows[0].role_id, 2);
    assert.equal(victimAgain.rows[0].school_id, 10);
    const stillApplied = await db.query('SELECT status FROM staff_invites WHERE id = $1', [appliedExisting.rows[0].id]);
    assert.equal(stillApplied.rows[0].status, 'applied');

    const approveExisting = await api('POST', `/api/admin/staff-invites/${approvedNew.rows[0].id}/approve`, { token: adminToken });
    assert.equal(approveExisting.status, 409);
    const teacherAgain = await userRow('brand.teacher@phase1.test');
    assert.equal(teacherAgain.length, 1);
    assert.equal(teacherAgain[0].role_id, 4);
    assert.equal(teacherAgain[0].school_id, 20);
    assert.equal(await bcrypt.compare('BrandNew1!', teacherAgain[0].password_hash), true);

    const approveOnly = await db.query(
      `INSERT INTO staff_invites (email, status, school_id, invite_token, password_hash, full_name, surname, subjects_offered, assigned_grades, assigned_classes)
       VALUES ('approved.only@phase1.test', 'applied', 10, 'phase1-approve-only', $1, 'Approved', 'Only', '{Mathematics}', '{10}', '{10A}') RETURNING id`,
      [hash]
    );
    const approved = await api('POST', `/api/admin/staff-invites/${approveOnly.rows[0].id}/approve`, { token: adminToken });
    assert.equal(approved.status, 200, approved.text);
    const approvedUser = await userRow('approved.only@phase1.test');
    assert.equal(approvedUser.length, 1);
    assert.equal(approvedUser[0].role_id, 4);
    assert.equal(approvedUser[0].school_id, 10);
    assert.equal(await bcrypt.compare('StaffSecret1!', approvedUser[0].password_hash), true);
  });

  test('C5 keeps admission decisions inside the authenticated school', async () => {
    const hash = await bcrypt.hash('AdminSecret1!', 4);
    const adminA = await db.query(
      `INSERT INTO users (email, password_hash, role_id, school_id, is_superadmin, full_name, surname, active_session_id)
       VALUES ('decision.a@phase1.test', $1, 1, 10, FALSE, 'Decision', 'Admin', 'sid-decision-a') RETURNING id`,
      [hash]
    );
    const adminC = await db.query(
      `INSERT INTO users (email, password_hash, role_id, school_id, is_superadmin, full_name, surname, active_session_id)
       VALUES ('decision.c@phase1.test', $1, 1, 22, FALSE, 'Campus', 'Admin', 'sid-decision-c') RETURNING id`,
      [hash]
    );
    const superadmin = await db.query(
      `INSERT INTO users (email, password_hash, role_id, school_id, is_superadmin, full_name, surname, active_session_id)
       VALUES ('decision.super@phase1.test', $1, 1, 10, TRUE, 'Platform', 'Admin', 'sid-decision-super') RETURNING id`,
      [hash]
    );
    const own = await db.query(
      `INSERT INTO applications (application_number, status, school_id, first_name, surname, grade_applied)
       VALUES ('APP-OWN-1', 'submitted', 10, 'Own', 'Learner', 10) RETURNING id`
    );
    const foreign = await db.query(
      `INSERT INTO applications (application_number, status, school_id, first_name, surname, grade_applied, primary_parent_email, primary_parent_name, primary_parent_surname)
       VALUES ('APP-FOREIGN-1', 'submitted', 20, 'Foreign', 'Learner', 11, 'secret.parent@phase1.test', 'Secret', 'Parent') RETURNING id`
    );
    const enroll = await db.query(
      `INSERT INTO applications (
         application_number, status, school_id, first_name, surname, grade_applied, stream, home_language,
         provisional_learner_number, registration_fee_status, id_number
       ) VALUES (
         'APP-ENROLL-1', 'submitted', 22, 'Enrolled', 'Learner', 10, 'Science', 'English',
         'PL-PHASE-22', 'paid', '0101015800080'
       ) RETURNING id`
    );

    const tokenA = sign({ id: adminA.rows[0].id, role: 'admin', email: 'decision.a@phase1.test', sid: 'sid-decision-a' });
    const tokenC = sign({ id: adminC.rows[0].id, role: 'admin', email: 'decision.c@phase1.test', sid: 'sid-decision-c' });
    const tokenSuper = sign({ id: superadmin.rows[0].id, role: 'admin', email: 'decision.super@phase1.test', sid: 'sid-decision-super' });

    const ownDecision = await api('POST', `/api/applications/${own.rows[0].id}/decision`, {
      token: tokenA,
      body: { status: 'approved', school_id: 20 }
    });
    assert.equal(ownDecision.status, 200, ownDecision.text);
    const ownRow = await db.query('SELECT status, school_id FROM applications WHERE id = $1', [own.rows[0].id]);
    assert.equal(ownRow.rows[0].status, 'approved');
    assert.equal(ownRow.rows[0].school_id, 10);

    const spoofed = await api('POST', `/api/applications/${foreign.rows[0].id}/decision`, {
      token: tokenA,
      body: { status: 'rejected', school_id: 10 }
    });
    assert.equal(spoofed.status, 404);
    assert.equal(spoofed.text.includes('secret.parent@phase1.test'), false);
    assert.equal(spoofed.text.includes('Foreign'), false);
    const foreignRow = await db.query('SELECT status FROM applications WHERE id = $1', [foreign.rows[0].id]);
    assert.equal(foreignRow.rows[0].status, 'submitted');

    const patched = await api('PATCH', `/api/admin/admissions/${foreign.rows[0].id}`, {
      token: tokenA,
      body: { status: 'rejected', school_id: 10 }
    });
    assert.equal(patched.status, 404);
    assert.equal(patched.text.includes('secret.parent@phase1.test'), false);
    const foreignStill = await db.query('SELECT status FROM applications WHERE id = $1', [foreign.rows[0].id]);
    assert.equal(foreignStill.rows[0].status, 'submitted');

    const headerSpoof = await api('POST', `/api/applications/${foreign.rows[0].id}/decision`, {
      token: tokenA,
      body: { status: 'approved' }
    });
    assert.equal(headerSpoof.status, 404);

    const superDecision = await api('PATCH', `/api/admin/admissions/${foreign.rows[0].id}`, {
      token: tokenSuper,
      body: { status: 'waitlisted' }
    });
    assert.equal(superDecision.status, 200, superDecision.text);
    const waited = await db.query('SELECT status FROM applications WHERE id = $1', [foreign.rows[0].id]);
    assert.equal(waited.rows[0].status, 'waitlisted');

    const enrolled = await api('POST', `/api/applications/${enroll.rows[0].id}/decision`, {
      token: tokenC,
      body: { status: 'enrolled', school_id: 1 }
    });
    assert.equal(enrolled.status, 200, enrolled.text);
    const child = await db.query(
      `SELECT school_id FROM children WHERE application_number = 'APP-ENROLL-1'`
    );
    assert.equal(child.rows.length, 1);
    assert.equal(child.rows[0].school_id, 22);

    const samePatch = await api('PATCH', `/api/admin/admissions/${own.rows[0].id}`, {
      token: tokenA,
      body: { status: 'waitlisted', school_id: 20 }
    });
    assert.equal(samePatch.status, 200, samePatch.text);
    const ownFinal = await db.query('SELECT status, school_id FROM applications WHERE id = $1', [own.rows[0].id]);
    assert.equal(ownFinal.rows[0].status, 'waitlisted');
    assert.equal(ownFinal.rows[0].school_id, 10);
  });
});
