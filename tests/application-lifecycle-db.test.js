'use strict';
require('./safety/blockLiveEffects');

const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { Client } = require('pg');

describe('Application Lifecycle End-to-End Integration (Disposable PostgreSQL DB)', () => {
  const testDb = `geleza_test_lifecycle_${Date.now()}`;
  let adminClient;
  let db;
  let lifecycleService;
  let registrationService;
  let principalActivation;
  let emailService;
  let learnerController;
  let protectedFileController;

  const capturedEmails = [];
  const tempFiles = [];

  let schoolAId;
  let schoolBId;
  let principalA;
  let principalB;
  let classTeacherA;
  let subjectTeacherA;
  let subjectTeacherB;
  let class10AId;
  let streamScienceId;
  let unrelatedParent;

  before(async () => {
    require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
    const host = process.env.DB_HOST === 'localhost' ? '127.0.0.1' : (process.env.DB_HOST || '127.0.0.1');
    assert.ok(host === '127.0.0.1' || host === 'localhost', 'Refusing to run DB tests against non-local host.');

    adminClient = new Client({
      host,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      database: 'postgres'
    });
    await adminClient.connect();
    await adminClient.query(`CREATE DATABASE ${testDb}`);

    process.env.GELEZA_TEST_MODE = '1';
    process.env.GELEZA_FIREBASE_MOCK = '1';
    process.env.GELEZA_PUSH_MOCK = '1';
    process.env.GELEZA_TEST_DATABASE = testDb;
    process.env.DB_HOST = host;
    process.env.DB_NAME = testDb;
    process.env.DATABASE_URL = `postgresql://${encodeURIComponent(process.env.DB_USER || 'postgres')}:${encodeURIComponent(process.env.DB_PASSWORD || '')}@${host}:${process.env.DB_PORT || 5432}/${testDb}`;
    process.env.APP_URL = 'http://localhost:4000';
    process.env.FRONTEND_URL = 'http://localhost:4000';
    process.env.JWT_SECRET = 'test-lifecycle-jwt-secret-only';

    db = require('../db/db');
    const checkDb = await db.query('SELECT current_database() AS name');
    assert.equal(checkDb.rows[0].name, testDb);
    assert.notEqual(checkDb.rows[0].name, 'FUSION_DB');
    assert.notEqual(checkDb.rows[0].name, 'geleza_phase_g2');

    // Create baseline schema mirroring production tables
    await db.query(`
      CREATE TABLE roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL
      );
      INSERT INTO roles (name) VALUES ('admin'), ('principal'), ('teacher'), ('parent'), ('learner');

      CREATE TABLE schools (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(120),
        emis_number VARCHAR(50),
        contact_email VARCHAR(255),
        contact_phone VARCHAR(50),
        physical_address TEXT,
        province VARCHAR(100),
        district VARCHAR(100),
        circuit VARCHAR(100),
        logo_url TEXT,
        logo_stored_name VARCHAR(255),
        status VARCHAR(40) DEFAULT 'approved',
        offered_subjects JSONB DEFAULT '[]'::jsonb,
        offered_languages JSONB DEFAULT '[]'::jsonb,
        offered_streams JSONB DEFAULT '[]'::jsonb,
        registration_fee NUMERIC(10,2) DEFAULT 0
      );

      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT,
        role_id INTEGER REFERENCES roles(id),
        full_name VARCHAR(120),
        surname VARCHAR(120),
        phone VARCHAR(50),
        id_number VARCHAR(50),
        dob DATE,
        gender VARCHAR(30),
        country VARCHAR(80),
        race VARCHAR(60),
        physical_address TEXT,
        school_id INTEGER REFERENCES schools(id),
        is_superadmin BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        profile_picture TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE classes (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id),
        name VARCHAR(60) NOT NULL,
        grade INTEGER NOT NULL,
        stream VARCHAR(100),
        teacher_id INTEGER REFERENCES users(id),
        homeroom_teacher_id INTEGER REFERENCES users(id),
        assigned_teacher_id INTEGER REFERENCES users(id),
        capacity INTEGER DEFAULT 40,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE teachers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id),
        school_id INTEGER REFERENCES schools(id),
        subjects TEXT[] DEFAULT '{}',
        grades_taught INTEGER[] DEFAULT '{}',
        classes_taught TEXT[] DEFAULT '{}'
      );

      CREATE TABLE employees (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id),
        school_id INTEGER REFERENCES schools(id),
        subjects TEXT[] DEFAULT '{}',
        grades_taught INTEGER[] DEFAULT '{}',
        classes_taught TEXT[] DEFAULT '{}'
      );

      CREATE TABLE subjects (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id),
        name VARCHAR(150) NOT NULL,
        code VARCHAR(40),
        grade INTEGER,
        stream VARCHAR(100),
        teacher_id INTEGER REFERENCES users(id)
      );

      CREATE TABLE teacher_subjects (
        id SERIAL PRIMARY KEY,
        teacher_id INTEGER REFERENCES teachers(id),
        subject_id INTEGER REFERENCES subjects(id)
      );

      CREATE TABLE children (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id),
        parent_id INTEGER REFERENCES users(id),
        learner_user_id INTEGER REFERENCES users(id),
        full_name VARCHAR(120) NOT NULL,
        surname VARCHAR(120) NOT NULL,
        learner_number VARCHAR(60) UNIQUE,
        grade INTEGER NOT NULL,
        class_id INTEGER REFERENCES classes(id),
        stream VARCHAR(100),
        home_language VARCHAR(100),
        subjects TEXT[] DEFAULT '{}',
        dob DATE,
        gender VARCHAR(30),
        country VARCHAR(80),
        race VARCHAR(60),
        medical_info TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE parent_children (
        id SERIAL PRIMARY KEY,
        parent_id INTEGER REFERENCES users(id),
        child_id INTEGER REFERENCES children(id),
        relationship VARCHAR(60),
        is_primary BOOLEAN DEFAULT TRUE,
        UNIQUE(parent_id, child_id)
      );

      CREATE TABLE student_subjects (
        id SERIAL PRIMARY KEY,
        child_id INTEGER REFERENCES children(id),
        subject_id INTEGER REFERENCES subjects(id),
        UNIQUE(child_id, subject_id)
      );

      CREATE TABLE academic_years (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id),
        year INTEGER NOT NULL,
        is_current BOOLEAN DEFAULT TRUE
      );

      CREATE TABLE learner_enrolments (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id),
        child_id INTEGER REFERENCES children(id),
        academic_year INTEGER NOT NULL,
        grade INTEGER NOT NULL,
        class_id INTEGER REFERENCES classes(id),
        status VARCHAR(40) DEFAULT 'active',
        source VARCHAR(60),
        created_by INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (school_id, child_id, academic_year)
      );

      CREATE TABLE notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title VARCHAR(255),
        message TEXT,
        type VARCHAR(60),
        target_tab VARCHAR(100),
        metadata JSONB DEFAULT '{}'::jsonb,
        is_read BOOLEAN DEFAULT FALSE,
        link TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE applications (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id),
        application_number VARCHAR(60) UNIQUE NOT NULL,
        first_name VARCHAR(120) NOT NULL,
        surname VARCHAR(120) NOT NULL,
        id_number VARCHAR(50),
        dob DATE,
        gender VARCHAR(30),
        country VARCHAR(80),
        race VARCHAR(60),
        email VARCHAR(255),
        phone VARCHAR(50),
        learner_email VARCHAR(255),
        learner_phone VARCHAR(50),
        home_language VARCHAR(100),
        grade_applied INTEGER NOT NULL,
        stream VARCHAR(100),
        selected_subjects TEXT[] DEFAULT '{}',
        primary_parent_name VARCHAR(120),
        primary_parent_surname VARCHAR(120),
        primary_parent_email VARCHAR(255),
        secondary_parent_email VARCHAR(255),
        secondary_parent_id_number VARCHAR(50),
        primary_parent_phone VARCHAR(50),
        primary_parent_id_number VARCHAR(50),
        primary_parent_relationship VARCHAR(60),
        physical_address TEXT,
        medical_info TEXT,
        assigned_class_id INTEGER REFERENCES classes(id),
        provisional_learner_number VARCHAR(60),
        status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'waitlisted', 'enrolled')),
        admin_notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE application_documents (
        id SERIAL PRIMARY KEY,
        application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
        document_type VARCHAR(80) NOT NULL,
        file_path TEXT NOT NULL,
        file_name VARCHAR(255),
        original_filename VARCHAR(255),
        mime_type VARCHAR(120),
        file_size INTEGER DEFAULT 0,
        is_verified BOOLEAN DEFAULT FALSE,
        uploaded_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE school_subject_offerings (
        id SERIAL PRIMARY KEY,
        school_id INTEGER NOT NULL REFERENCES schools(id),
        academic_year INTEGER NOT NULL,
        grade INTEGER NOT NULL CHECK (grade BETWEEN 10 AND 12),
        category VARCHAR(40) NOT NULL,
        subject_name VARCHAR(150) NOT NULL,
        language_level VARCHAR(50) NOT NULL DEFAULT '',
        is_required BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE academic_streams (
        id SERIAL PRIMARY KEY,
        school_id INTEGER NOT NULL REFERENCES schools(id),
        academic_year INTEGER NOT NULL,
        grade INTEGER NOT NULL CHECK (grade BETWEEN 10 AND 12),
        name VARCHAR(120) NOT NULL,
        mathematics_option VARCHAR(120) NOT NULL,
        electives TEXT[] NOT NULL DEFAULT '{}',
        status VARCHAR(40) NOT NULL DEFAULT 'published',
        created_by INTEGER,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Seed 2 schools, teachers, admins, and legacy pre-migration application
    const schoolARes = await db.query(
      `INSERT INTO schools (name, emis_number, contact_email, contact_phone, physical_address, province, district)
       VALUES ('Walters High School', '592489761', 'admissions@waltershigh.test', '015 555 0101', '14 Church St, Polokwane', 'Limpopo', 'Capricorn')
       RETURNING id`
    );
    schoolAId = schoolARes.rows[0].id;

    const schoolBRes = await db.query(
      `INSERT INTO schools (name, emis_number, contact_email, contact_phone, physical_address, province, district)
       VALUES ('Riverside Secondary', '592499999', 'admissions@riverside.test', '015 555 0202', '99 River Rd, Tzaneen', 'Limpopo', 'Mopani')
       RETURNING id`
    );
    schoolBId = schoolBRes.rows[0].id;

    // Legacy pre-migration row to verify backward compatibility
    await db.query(
      `INSERT INTO applications (school_id, application_number, first_name, surname, grade_applied, status, primary_parent_name, primary_parent_email)
       VALUES ($1, 'APP-LEGACY-001', 'Legacy', 'Learner', 10, 'pending', 'Legacy Parent', 'legacy@test.local')`,
      [schoolAId]
    );

    // Apply all three additive SQL migrations
    const migrations = [
      '20261121_curriculum_grades_8_12_upgrade.sql',
      '20261121_integrated_learner_registration.sql',
      '20261121_application_lifecycle_remediation.sql'
    ];
    for (const file of migrations) {
      const sql = fs.readFileSync(path.join(__dirname, '..', 'db', 'migrations', file), 'utf8');
      await db.query(sql);
    }
    // Re-apply lifecycle migration a second time to verify strict idempotency
    const lifecycleSql = fs.readFileSync(
      path.join(__dirname, '..', 'db', 'migrations', '20261121_application_lifecycle_remediation.sql'),
      'utf8'
    );
    await db.query(lifecycleSql);

    const legacyCheck = await db.query(
      `SELECT application_number, academic_year, status FROM applications WHERE application_number = 'APP-LEGACY-001'`
    );
    assert.equal(legacyCheck.rows.length, 1);
    assert.ok(Number(legacyCheck.rows[0].academic_year) >= 2026);

    // Seed School A & B roles/users/classes/teachers/curriculum
    const roleRows = (await db.query('SELECT id, name FROM roles')).rows;
    const roleId = Object.fromEntries(roleRows.map((r) => [r.name, r.id]));

    const mkUser = async ({ email, role, fullName, surname, schoolId }) => {
      const res = await db.query(
        `INSERT INTO users (email, password_hash, role_id, full_name, surname, school_id)
         VALUES ($1, '$2a$10$testhashplaceholderxxxxxxxxxxxxxxxxxxxxxxxxxxxx', $2, $3, $4, $5)
         RETURNING id, email, full_name, surname, school_id`,
        [email, roleId[role], fullName, surname, schoolId]
      );
      return { ...res.rows[0], role };
    };

    principalA = await mkUser({ email: 'principal.a@waltershigh.test', role: 'principal', fullName: 'Bontle', surname: 'Mothopeng', schoolId: schoolAId });
    principalB = await mkUser({ email: 'principal.b@riverside.test', role: 'principal', fullName: 'Samuel', surname: 'Baloyi', schoolId: schoolBId });
    classTeacherA = await mkUser({ email: 'nkosi@waltershigh.test', role: 'teacher', fullName: 'Themba', surname: 'Nkosi', schoolId: schoolAId });
    subjectTeacherA = await mkUser({ email: 'mabuza@waltershigh.test', role: 'teacher', fullName: 'Zanele', surname: 'Mabuza', schoolId: schoolAId });
    subjectTeacherB = await mkUser({ email: 'khumalo@riverside.test', role: 'teacher', fullName: 'Siphiwe', surname: 'Khumalo', schoolId: schoolBId });
    unrelatedParent = await mkUser({ email: 'outsider.parent@test.local', role: 'parent', fullName: 'Outsider', surname: 'Guardian', schoolId: schoolBId });

    const classRes = await db.query(
      `INSERT INTO classes (school_id, name, grade, stream, teacher_id, homeroom_teacher_id, assigned_teacher_id, capacity)
       VALUES ($1, '10-A', 10, 'Science', $2, $2, $2, 35) RETURNING id`,
      [schoolAId, classTeacherA.id]
    );
    class10AId = classRes.rows[0].id;

    // Seed teachers & employees rows (School A vs School B)
    await db.query(
      `INSERT INTO teachers (user_id, school_id, subjects, grades_taught, classes_taught)
       VALUES ($1, $2, ARRAY['Mathematics', 'Physical Sciences'], ARRAY[10], ARRAY['10-A'])`,
      [subjectTeacherA.id, schoolAId]
    );
    await db.query(
      `INSERT INTO employees (user_id, school_id, subjects, grades_taught, classes_taught)
       VALUES ($1, $2, ARRAY['Mathematics', 'Physical Sciences'], ARRAY[10], ARRAY['10-A'])`,
      [subjectTeacherA.id, schoolAId]
    );
    await db.query(
      `INSERT INTO teachers (user_id, school_id, subjects, grades_taught, classes_taught)
       VALUES ($1, $2, ARRAY['Mathematics', 'Life Sciences'], ARRAY[10], ARRAY['10-A'])`,
      [subjectTeacherB.id, schoolBId]
    );
    await db.query(
      `INSERT INTO employees (user_id, school_id, subjects, grades_taught, classes_taught)
       VALUES ($1, $2, ARRAY['Mathematics', 'Life Sciences'], ARRAY[10], ARRAY['10-A'])`,
      [subjectTeacherB.id, schoolBId]
    );

    // Seed School A Grade 10 offerings & Science stream for 2027
    const offerings = [
      ['language', 'Sepedi', 'Home Language'],
      ['language', 'English', 'First Additional Language'],
      ['mathematics', 'Mathematics', ''],
      ['elective', 'Physical Sciences', ''],
      ['elective', 'Life Sciences', ''],
      ['elective', 'Geography', ''],
      ['elective', 'Life Orientation', '']
    ];
    for (const [category, subjectName, langLevel] of offerings) {
      await db.query(
        `INSERT INTO school_subject_offerings (school_id, academic_year, grade, stream_name, category, subject_name, language_level, is_active)
         VALUES ($1, 2027, 10, '', $2, $3, $4, TRUE)`,
        [schoolAId, category, subjectName, langLevel]
      );
      const displaySubject = langLevel ? `${subjectName} ${langLevel}` : subjectName;
      await db.query(
        `INSERT INTO subjects (school_id, name, grade, stream, teacher_id)
         VALUES ($1, $2, 10, 'Science', $3)`,
        [schoolAId, displaySubject, subjectName === 'Mathematics' || subjectName === 'Physical Sciences' ? subjectTeacherA.id : classTeacherA.id]
      );
    }
    // School B also has Mathematics taught by subjectTeacherB (must NEVER leak to School A learner!)
    await db.query(
      `INSERT INTO subjects (school_id, name, grade, stream, teacher_id)
       VALUES ($1, 'Mathematics', 10, 'Science', $2)`,
      [schoolBId, subjectTeacherB.id]
    );

    const streamRes = await db.query(
      `INSERT INTO academic_streams (school_id, academic_year, grade, name, mathematics_option, electives, status)
       VALUES ($1, 2027, 10, 'Science', 'Mathematics', ARRAY['Physical Sciences', 'Life Sciences', 'Geography'], 'published')
       RETURNING id`,
      [schoolAId]
    );
    streamScienceId = streamRes.rows[0].id;

    // Load services AFTER env & db are initialized on disposable DB
    emailService = require('../public/src/services/emailService');
    emailService.send = async (to, subject, body, _cc, _bcc, options = {}) => {
      capturedEmails.push({
        to,
        subject,
        body,
        attachments: options.attachments || [],
        sentAt: new Date().toISOString()
      });
      return { accepted: [to], messageId: `mock-${capturedEmails.length}` };
    };

    principalActivation = require('../public/src/services/principalActivation');
    lifecycleService = require('../public/src/services/applicationLifecycleService');
    registrationService = require('../public/src/services/learnerRegistrationService');
    learnerController = require('../public/src/controller/learnerController');
    protectedFileController = require('../public/src/controller/protectedFileController');
  });

  after(async () => {
    for (const f of tempFiles) {
      try { fs.unlinkSync(f); } catch (_) {}
    }
    if (db && db.pool) await db.pool.end();
    if (adminClient) {
      await adminClient.query(`DROP DATABASE IF EXISTS ${testDb}`);
      await adminClient.end();
    }
  });

  let mainAppId;
  let parentUser;
  let learnerUser;
  let approvedLearnerNumber;
  let uploadedDocId;
  let docRequestId;

  test('Step 1: Application submission provisions passwordless tracking accounts, records history, and sends Email 1 without plaintext passwords', async () => {
    const ins = await db.query(
      `INSERT INTO applications (
         school_id, application_number, first_name, surname, id_number, dob, gender,
         email, learner_email, home_language, first_additional_language, grade_applied, academic_year,
         stream, academic_stream_id, selected_subjects,
         primary_parent_name, primary_parent_surname, primary_parent_email, primary_parent_phone,
         primary_parent_relationship, physical_address, status
       ) VALUES (
         $1, 'APP-2027-0101', 'Sipho', 'Dlamini', '1104155123089', '2011-04-15', 'Male',
         'sipho.dlamini@test.local', 'sipho.dlamini@test.local', 'Sepedi Home Language', 'English First Additional Language', 10, 2027,
         'Science', $2, ARRAY['Sepedi Home Language', 'English First Additional Language', 'Mathematics', 'Physical Sciences', 'Life Sciences', 'Geography', 'Life Orientation'],
         'Lerato', 'Dlamini', 'lerato.dlamini@test.local', '0825550101',
         'Mother', '22 Oak Ave, Polokwane', 'submitted'
       ) RETURNING id`,
      [schoolAId, streamScienceId]
    );
    mainAppId = ins.rows[0].id;

    const result = await lifecycleService.handleApplicationSubmitted({ applicationId: mainAppId });
    assert.equal(result.applicationId, mainAppId);
    assert.equal(result.confirmationEmailSent, true);
    assert.ok(result.parentUserId > 0);
    assert.ok(result.learnerUserId > 0);

    parentUser = { id: result.parentUserId, role: 'parent', email: 'lerato.dlamini@test.local', full_name: 'Lerato', surname: 'Dlamini', school_id: schoolAId };
    learnerUser = { id: result.learnerUserId, role: 'learner', email: 'sipho.dlamini@test.local', full_name: 'Sipho', surname: 'Dlamini', school_id: schoolAId };

    // Email 1 dispatched to parent and learner without plaintext passwords
    const email1List = capturedEmails.filter((e) => e.subject.includes('APP-2027-0101') && /Application Received/i.test(e.subject));
    assert.ok(email1List.length >= 1, 'Email 1 must be dispatched on submission');
    for (const mail of email1List) {
      assert.match(mail.body, /APP-2027-0101/);
      assert.match(mail.body, /does not mean admission has been approved/i);
      assert.match(mail.body, /\/activate\?token=/);
      assert.doesNotMatch(mail.body, /Parent@2026|Temporary Password/i);
    }

    // Audit log & email log must never store raw tokens or passwords
    const emailLogs = await db.query(`SELECT * FROM application_email_log WHERE application_id = $1`, [mainAppId]);
    assert.ok(emailLogs.rows.length >= 1);
    for (const row of emailLogs.rows) {
      const serialized = JSON.stringify(row);
      assert.doesNotMatch(serialized, /activate\?token=[a-zA-Z0-9_-]{10,}/);
      assert.doesNotMatch(serialized, /Parent@2026/);
    }
  });

  test('Step 2: Secure activation token works once via principalActivationController, rejects reuse, and rejects expired tokens', async () => {
    const activationCtrl = require('../public/src/controller/principalActivationController');
    const parentMail = capturedEmails.find((e) => e.to === 'lerato.dlamini@test.local');
    const tokMatch = parentMail.body.match(/\/activate\?token=([a-zA-Z0-9_-]+)/i);
    assert.ok(tokMatch && tokMatch[1], 'Activation link must carry a single-use token');
    const rawToken = tokMatch[1];

    const callActivate = (body) => new Promise((resolve, reject) => {
      const req = { body };
      const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(data) { resolve({ statusCode: this.statusCode, data }); return this; }
      };
      activationCtrl.activate(req, res).catch(reject);
    });

    const first = await callActivate({ token: rawToken, password: 'SecureParentPass#2027!' });
    assert.equal(first.statusCode, 200);

    // Reusing the same token must fail (single-use enforcement)
    const reused = await callActivate({ token: rawToken, password: 'AnotherPass#2027!' });
    assert.notEqual(reused.statusCode, 200);

    // Expired token must fail
    const learnerTok = await principalActivation.issue(db, learnerUser.id);
    await db.query(`UPDATE users SET activation_expires_at = NOW() - INTERVAL '1 hour' WHERE id = $1`, [learnerUser.id]);
    const expired = await callActivate({ token: learnerTok, password: 'ExpiredTry#2027!' });
    assert.notEqual(expired.statusCode, 200);
  });

  test('Step 3: Un-enrolled learner stays in Restricted Applicant Dashboard and unrelated parents cannot read applications', async () => {
    const access = await lifecycleService.getLearnerAccessStatus(learnerUser);
    assert.equal(access.mode, 'restricted_applicant');
    assert.equal(access.isRestrictedApplicant, true);
    assert.equal(access.hasActiveEnrollment, false);
    assert.deepEqual(access.allowedModules, ['applications', 'registration', 'profile', 'settings']);

    const parentTracked = await lifecycleService.getMyTrackedApplications(parentUser);
    assert.equal(parentTracked.applications.length, 1);
    assert.equal(parentTracked.applications[0].application_number, 'APP-2027-0101');
    assert.equal(parentTracked.applications[0].status, 'submitted');

    const learnerTracked = await lifecycleService.getMyTrackedApplications(learnerUser);
    assert.equal(learnerTracked.applications.length, 1);

    const outsiderTracked = await lifecycleService.getMyTrackedApplications(unrelatedParent);
    assert.equal(outsiderTracked.applications.length, 0);
  });

  test('Step 4: Documentation Request, Cross-School & Unrelated-Family Isolation, Upload, Resubmission & Acceptance (Emails 2, 3, 4)', async () => {
    // School B Principal CANNOT request docs for School A application
    await assert.rejects(
      () => lifecycleService.createDocumentRequest({
        applicationId: mainAppId,
        actor: principalB,
        body: {
          required_documents: ['report_card'],
          instructions: 'Cross-school probe must fail.'
        }
      }),
      (err) => err.status === 403 || err.status === 404
    );

    // School A Principal creates document request -> status becomes documents_requested + Email 2
    const reqRes = await lifecycleService.createDocumentRequest({
      applicationId: mainAppId,
      actor: principalA,
      body: {
        required_documents: ['report_card', 'proof_of_residence'],
        instructions: 'Please upload certified Term 4 report and recent utility bill.',
        deadline: '2027-01-25'
      }
    });
    assert.equal(reqRes.application.status, 'documents_requested');
    assert.ok(reqRes.request.id > 0);
    docRequestId = reqRes.request.id;

    const email2 = capturedEmails.find((e) => e.to === 'lerato.dlamini@test.local' && /Additional Documents Required/i.test(e.subject));
    assert.ok(email2, 'Email 2 must be dispatched when school requests documents');
    assert.match(email2.body, /Latest Official School Report Card/);
    assert.match(email2.body, /Proof of Residential Address/);

    // Create a real temporary PDF file in uploads/applications for upload + protected file access check
    const appUploadsDir = path.join(process.cwd(), 'uploads', 'applications');
    fs.mkdirSync(appUploadsDir, { recursive: true });
    const tmpPdfName = `test_sipho_report_${Date.now()}.pdf`;
    const tmpPdf = path.join(appUploadsDir, tmpPdfName);
    const pdfBytes = Buffer.from('%PDF-1.4\n%Mock official report card bytes for automated lifecycle verification\n%%EOF');
    fs.writeFileSync(tmpPdf, pdfBytes);
    tempFiles.push(tmpPdf);

    // Unrelated parent CANNOT upload document to Sipho's application
    await assert.rejects(
      () => lifecycleService.uploadApplicationDocument({
        applicationId: mainAppId,
        actor: unrelatedParent,
        requestId: docRequestId,
        documentType: 'report_card',
        file: { path: tmpPdf, originalname: 'fake.pdf', mimetype: 'application/pdf', size: pdfBytes.length }
      }),
      (err) => err.status === 403
    );

    // Owning parent uploads document -> status becomes documents_submitted + Email 3 to school admin
    const uploadRes = await lifecycleService.uploadApplicationDocument({
      applicationId: mainAppId,
      actor: parentUser,
      requestId: docRequestId,
      documentType: 'report_card',
      file: { path: tmpPdf, originalname: 'sipho_term4_report.pdf', mimetype: 'application/pdf', size: pdfBytes.length }
    });
    assert.equal(uploadRes.application.status, 'documents_submitted');
    uploadedDocId = tmpPdfName;

    const email3 = capturedEmails.find(
      (e) => (e.to === 'admissions@waltershigh.test' || e.to === 'principal.a@waltershigh.test') && /Requested Document Submitted/i.test(e.subject)
    );
    assert.ok(email3, 'Email 3 must notify School A reviewer');

    // School A Principal rejects first upload -> back to documents_requested + Email 4 (resubmission required)
    const rejectDoc = await lifecycleService.reviewDocumentRequest({
      applicationId: mainAppId,
      requestId: docRequestId,
      actor: principalA,
      outcome: 'rejected',
      notes: 'Page 2 was cropped; please re-upload full report.'
    });
    assert.equal(rejectDoc.application.status, 'documents_requested');
    const email4Reject = capturedEmails.find((e) => e.to === 'lerato.dlamini@test.local' && /Documentation Update Required/i.test(e.subject));
    assert.ok(email4Reject, 'Email 4 must notify parent when resubmission is needed');
    assert.match(email4Reject.body, /Page 2 was cropped/);

    // Parent re-uploads & Principal accepts -> under_review + Email 4 (accepted)
    await lifecycleService.uploadApplicationDocument({
      applicationId: mainAppId,
      actor: parentUser,
      requestId: docRequestId,
      documentType: 'report_card',
      file: { path: tmpPdf, originalname: 'sipho_term4_report_full.pdf', mimetype: 'application/pdf', size: pdfBytes.length }
    });

    const acceptDoc = await lifecycleService.reviewDocumentRequest({
      applicationId: mainAppId,
      requestId: docRequestId,
      actor: principalA,
      outcome: 'approved',
      notes: 'Report verified and complete.'
    });
    assert.equal(acceptDoc.application.status, 'under_review');
    const email4Accept = capturedEmails.find((e) => e.to === 'lerato.dlamini@test.local' && /Documentation Accepted/i.test(e.subject));
    assert.ok(email4Accept, 'Email 4 must confirm accepted documentation');
  });

  test('Step 5: Protected application file controller enforces same-school admin and owning family access strictly', async () => {
    const invokeFile = (actor) => new Promise((resolve) => {
      const req = { params: { filename: String(uploadedDocId) }, user: actor };
      const res = {
        statusCode: 200,
        body: null,
        sentFile: null,
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.body = payload; resolve(this); return this; },
        setHeader() {},
        sendFile(filePath, cb) {
          this.sentFile = filePath;
          if (cb) cb(null);
          resolve(this);
        }
      };
      protectedFileController.sendApplicationFile(req, res).catch((err) => resolve({ statusCode: 500, err }));
    });

    const allowAdminA = await invokeFile(principalA);
    assert.equal(allowAdminA.statusCode, 200);
    assert.ok(allowAdminA.sentFile);

    const allowParent = await invokeFile(parentUser);
    assert.equal(allowParent.statusCode, 200);

    const allowLearner = await invokeFile(learnerUser);
    assert.equal(allowLearner.statusCode, 200);

    const blockAdminB = await invokeFile(principalB);
    assert.equal(blockAdminB.statusCode, 403);

    const blockOutsider = await invokeFile(unrelatedParent);
    assert.equal(blockOutsider.statusCode, 403);
  });

  test('Step 6: Approval persists unique Learner Number BEFORE Email 5, stays idempotent on retry, and allocates unique numbers under concurrency', async () => {
    const emailsBefore = capturedEmails.length;
    const approved = await lifecycleService.approveApplication({
      applicationId: mainAppId,
      actor: principalA,
      assignedClassId: class10AId,
      adminNotes: 'Welcome to Walters High School!'
    });
    assert.equal(approved.application.status, 'approved');
    assert.ok(approved.learnerNumber && /^2027-?\d{4,}$/.test(approved.learnerNumber), `Expected persistent learner number, got ${approved.learnerNumber}`);
    approvedLearnerNumber = approved.learnerNumber;

    // Confirm persisted in BOTH applications and learner_registrations
    const appRow = (await db.query(`SELECT provisional_learner_number, status, assigned_class_id FROM applications WHERE id = $1`, [mainAppId])).rows[0];
    assert.equal(appRow.provisional_learner_number, approvedLearnerNumber);
    assert.equal(appRow.status, 'approved');
    assert.equal(Number(appRow.assigned_class_id), class10AId);

    const regRow = (await db.query(`SELECT learner_number, status, class_id FROM learner_registrations WHERE application_id = $1`, [mainAppId])).rows[0];
    assert.equal(regRow.learner_number, approvedLearnerNumber);
    assert.equal(regRow.status, 'awaiting_registration');
    assert.equal(Number(regRow.class_id), class10AId);

    // Email 5 MUST include Learner Number, Ref, Grade, Year, School, and PDF attachment without plaintext password
    const email5List = capturedEmails.slice(emailsBefore).filter((e) => /Admission Approved/i.test(e.subject));
    assert.ok(email5List.length >= 1, 'Email 5 must be dispatched on approval');
    for (const mail of email5List) {
      assert.ok(mail.subject.includes(approvedLearnerNumber), 'Email 5 subject must include Learner Number');
      assert.ok(mail.body.includes(approvedLearnerNumber), 'Email 5 body must include Learner Number');
      assert.ok(mail.body.includes('APP-2027-0101'), 'Email 5 body must include Application Reference');
      assert.ok(mail.body.includes('Grade 10'), 'Email 5 body must include Grade');
      assert.ok(mail.body.includes('2027'), 'Email 5 body must include Academic Year');
      assert.ok(mail.body.includes('Walters High School'), 'Email 5 body must include School Name');
      assert.doesNotMatch(mail.body, /Parent@2026|Temporary Password/i);
      assert.equal(mail.attachments.length, 1, 'Email 5 must attach official Acceptance Letter PDF');
      assert.equal(mail.attachments[0].content.subarray(0, 5).toString('utf8'), '%PDF-');
    }

    // Duplicate approval idempotency: same learner number, zero duplicate Email 5, zero duplicate registrations
    const countBeforeRetry = capturedEmails.length;
    const retry = await lifecycleService.approveApplication({
      applicationId: mainAppId,
      actor: principalA,
      assignedClassId: class10AId
    });
    assert.equal(retry.learnerNumber, approvedLearnerNumber);
    assert.equal(capturedEmails.length, countBeforeRetry, 'Idempotent approval retry must not send duplicate Email 5');

    // Concurrent approvals: 3 simultaneous approvals must yield 3 strictly unique learner numbers
    const concurrentIds = [];
    for (let i = 1; i <= 3; i++) {
      const r = await db.query(
        `INSERT INTO applications (
           school_id, application_number, first_name, surname, grade_applied, academic_year,
           stream, primary_parent_name, primary_parent_email, status
         ) VALUES ($1, $2, $3, 'Mokoena', 10, 2027, 'Science', 'Parent', $4, 'submitted') RETURNING id`,
        [schoolAId, `APP-2027-CONC-${i}`, `Learner${i}`, `conc${i}@test.local`]
      );
      concurrentIds.push(r.rows[0].id);
    }
    const concurrentResults = await Promise.all(
      concurrentIds.map((id) => lifecycleService.approveApplication({ applicationId: id, actor: principalA, assignedClassId: class10AId }))
    );
    const issuedNumbers = new Set([approvedLearnerNumber, ...concurrentResults.map((r) => r.learnerNumber)]);
    assert.equal(issuedNumbers.size, 4, `All concurrent approvals must receive distinct unique learner numbers: ${[...issuedNumbers].join(', ')}`);
  });

  test('Step 7: Decline workflow requires reason, sends Email 6, and creates zero learner enrollment', async () => {
    const ins = await db.query(
      `INSERT INTO applications (
         school_id, application_number, first_name, surname, grade_applied, academic_year,
         stream, primary_parent_name, primary_parent_email, status
       ) VALUES ($1, 'APP-2027-DECL-1', 'Kabelo', 'Molefe', 10, 2027, 'Science', 'Palesa Molefe', 'palesa.molefe@test.local', 'submitted') RETURNING id`,
      [schoolAId]
    );
    const declineId = ins.rows[0].id;

    await assert.rejects(
      () => lifecycleService.declineApplication({ applicationId: declineId, actor: principalA, reason: '' }),
      (err) => err.status === 400
    );

    const declined = await lifecycleService.declineApplication({
      applicationId: declineId,
      actor: principalA,
      reason: 'Grade 10 Science capacity has been reached for 2027.'
    });
    assert.equal(declined.application.status, 'rejected');

    const email6 = capturedEmails.find((e) => e.to === 'palesa.molefe@test.local' && /APP-2027-DECL-1/.test(e.subject));
    assert.ok(email6, 'Email 6 must be dispatched when declining');
    assert.match(email6.body, /Grade 10 Science capacity has been reached/);

    const childCount = await db.query(`SELECT COUNT(*)::int AS cnt FROM children WHERE surname = 'Molefe'`);
    assert.equal(childCount.rows[0].cnt, 0, 'Declined application must NEVER create an enrolled child');
    const regCount = await db.query(`SELECT COUNT(*)::int AS cnt FROM learner_registrations WHERE application_id = $1`, [declineId]);
    assert.equal(regCount.rows[0].cnt, 0, 'Declined application must NEVER create a learner_registrations row');
  });

  test('Step 8: Complete Learner Registration preserves Learner Number, sends Email 7, unlocks Full Learner Dashboard, and isolates teachers to same school', async () => {
    // Before registration completes, learner is STILL restricted even after approval!
    const preRegAccess = await lifecycleService.getLearnerAccessStatus(learnerUser);
    assert.equal(preRegAccess.mode, 'restricted_applicant');
    assert.equal(preRegAccess.hasApprovedApplication, true);

    const completed = await registrationService.completeLearnerRegistration({
      applicationId: mainAppId,
      actor: parentUser,
      payload: {
        academic_stream_id: streamScienceId,
        home_language: 'Sepedi Home Language',
        first_additional_language: 'English First Additional Language',
        selected_subjects: [
          'Sepedi Home Language',
          'English First Additional Language',
          'Mathematics',
          'Physical Sciences',
          'Life Sciences',
          'Geography',
          'Life Orientation'
        ],
        terms_accepted: true,
        terms_version: '2026-v1'
      }
    });
    assert.equal(completed.learner_number, approvedLearnerNumber);
    assert.ok(completed.child_id > 0);

    // Idempotent second registration call must NOT duplicate children
    const replay = await registrationService.completeLearnerRegistration({
      applicationId: mainAppId,
      actor: parentUser,
      payload: { terms_accepted: true }
    });
    assert.equal(replay.idempotent_replay, true);

    // Email 7 dispatched with Learner Number, Class 10-A, and real registered subjects
    const email7 = capturedEmails.find((e) => /Registration Complete/i.test(e.subject) && e.subject.includes(approvedLearnerNumber));
    assert.ok(email7, 'Email 7 must be dispatched upon completing registration');
    assert.ok(email7.body.includes('10-A'));
    assert.ok(email7.body.includes('Physical Sciences'));
    assert.doesNotMatch(email7.body, /Parent@2026|Temporary Password/i);

    // Full Learner Dashboard NOW unlocks!
    const postRegAccess = await lifecycleService.getLearnerAccessStatus(learnerUser);
    assert.equal(postRegAccess.mode, 'enrolled');
    assert.equal(postRegAccess.isRestrictedApplicant, false);
    assert.equal(postRegAccess.hasActiveEnrollment, true);
    assert.equal(postRegAccess.learnerNumber, approvedLearnerNumber);

    // Learner Subjects Overview returns real subjects + ONLY School A teacher (NEVER School B teacher Khumalo!)
    const overviewPayload = await new Promise((resolve, reject) => {
      const req = { user: learnerUser, query: {} };
      const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(data) { resolve({ statusCode: this.statusCode, data }); return this; }
      };
      learnerController.getMySubjectsOverview(req, res).catch(reject);
    });
    assert.equal(overviewPayload.statusCode, 200);
    const overviewJson = JSON.stringify(overviewPayload.data);
    assert.match(overviewJson, /Mathematics/);
    assert.match(overviewJson, /Physical Sciences/);
    assert.match(overviewJson, /Zanele Mabuza/, 'School A subject teacher must be linked');
    assert.doesNotMatch(overviewJson, /Siphiwe Khumalo/, 'School B teacher must NEVER leak into School A learner subjects');
  });

  test('Step 9: Mandatory approval email payload failure rolls back cleanly without sending incomplete Email 5', async () => {
    const ins = await db.query(
      `INSERT INTO applications (
         school_id, application_number, first_name, surname, grade_applied, academic_year,
         stream, primary_parent_name, primary_parent_email, email, status
       ) VALUES ($1, 'APP-2027-INCOMPLETE-1', 'Incomplete', 'Payload', 10, 2027, 'Science', 'No Email Parent', '', '', 'submitted') RETURNING id`,
      [schoolAId]
    );
    const badId = ins.rows[0].id;
    const emailsBefore = capturedEmails.length;

    await assert.rejects(
      () => lifecycleService.approveApplication({ applicationId: badId, actor: principalA, assignedClassId: class10AId }),
      (err) => err.status === 422 && err.code === 'INCOMPLETE_APPROVAL_PAYLOAD'
    );

    const row = (await db.query(`SELECT status, provisional_learner_number FROM applications WHERE id = $1`, [badId])).rows[0];
    assert.equal(row.status, 'submitted', 'Failed approval must roll back application status');
    assert.equal(row.provisional_learner_number, null, 'Failed approval must not leave orphaned learner number');
    const regCnt = (await db.query(`SELECT COUNT(*)::int AS cnt FROM learner_registrations WHERE application_id = $1`, [badId])).rows[0].cnt;
    assert.equal(regCnt, 0);
    assert.equal(capturedEmails.length, emailsBefore, 'Incomplete approval must NEVER dispatch Email 5');
  });

  test('Step 10: Email failure is logged safely, retries cleanly, and prevents duplicate sends once delivered', async () => {
    const ins = await db.query(
      `INSERT INTO applications (
         school_id, application_number, first_name, surname, grade_applied, academic_year,
         stream, primary_parent_name, primary_parent_email, status
       ) VALUES ($1, 'APP-2027-RETRY-1', 'Retry', 'Applicant', 10, 2027, 'Science', 'Retry Parent', 'retry.parent@test.local', 'submitted') RETURNING id`,
      [schoolAId]
    );
    const retryId = ins.rows[0].id;

    // Force transport failure on first attempt
    const origSend = emailService.send;
    emailService.send = async () => { throw new Error('Simulated SMTP outage'); };
    try {
      const first = await lifecycleService.approveApplication({ applicationId: retryId, actor: principalA, assignedClassId: class10AId });
      assert.equal(first.application.status, 'approved', 'Committed DB approval must stay intact despite SMTP failure');
      const log1 = (await db.query(`SELECT status, attempts, error_message FROM application_email_log WHERE application_id = $1 AND event_type = 'application_accepted'`, [retryId])).rows[0];
      assert.equal(log1.status, 'failed');
      assert.equal(log1.attempts, 1);
      assert.match(log1.error_message, /Simulated SMTP outage/);
    } finally {
      emailService.send = origSend;
    }

    // Retry with healthy transport -> succeeds and marks sent (attempts = 2)
    const beforeRetry = capturedEmails.length;
    await lifecycleService.approveApplication({ applicationId: retryId, actor: principalA, assignedClassId: class10AId });
    assert.equal(capturedEmails.length, beforeRetry + 1);
    const log2 = (await db.query(`SELECT status, attempts FROM application_email_log WHERE application_id = $1 AND event_type = 'application_accepted'`, [retryId])).rows[0];
    assert.equal(log2.status, 'sent');
    assert.equal(log2.attempts, 2);

    // Third call -> already sent, zero duplicate email dispatched
    await lifecycleService.approveApplication({ applicationId: retryId, actor: principalA, assignedClassId: class10AId });
    assert.equal(capturedEmails.length, beforeRetry + 1);
  });

  test('Step 11: Concurrent registration attempts stay idempotent, single-school enrolment conflict is blocked, and multi-child + curriculum validation work', async () => {
    // 2nd child for same parent Lerato Dlamini (multi-child parent verification)
    const ins2 = await db.query(
      `INSERT INTO applications (
         school_id, application_number, first_name, surname, id_number, dob, gender,
         email, home_language, first_additional_language, grade_applied, academic_year,
         stream, academic_stream_id, selected_subjects,
         primary_parent_name, primary_parent_surname, primary_parent_email, primary_parent_phone,
         parent_user_id, status
       ) VALUES (
         $1, 'APP-2027-0202', 'Naledi', 'Dlamini', '1108200123082', '2011-08-20', 'Female',
         'naledi.dlamini@test.local', 'Sepedi Home Language', 'English First Additional Language', 10, 2027,
         'Science', $2, ARRAY['Sepedi Home Language', 'English First Additional Language', 'Mathematics', 'Physical Sciences', 'Life Sciences', 'Geography', 'Life Orientation'],
         'Lerato', 'Dlamini', 'lerato.dlamini@test.local', '0825550101',
         $3, 'submitted'
       ) RETURNING id`,
      [schoolAId, streamScienceId, parentUser.id]
    );
    const secondChildAppId = ins2.rows[0].id;

    // Parent sees BOTH children (Sipho + Naledi), unrelated parent still sees 0
    const parentApps = await lifecycleService.getMyTrackedApplications(parentUser);
    assert.equal(parentApps.applications.length, 2);
    assert.equal((await lifecycleService.getMyTrackedApplications(unrelatedParent)).applications.length, 0);

    // Approve Naledi at School A
    await lifecycleService.approveApplication({ applicationId: secondChildAppId, actor: principalA, assignedClassId: class10AId });

    // Fabricated curriculum subject MUST be rejected during registration
    await assert.rejects(
      () => registrationService.completeLearnerRegistration({
        applicationId: secondChildAppId,
        actor: parentUser,
        payload: {
          academic_stream_id: streamScienceId,
          home_language: 'Sepedi Home Language',
          first_additional_language: 'English First Additional Language',
          selected_subjects: ['Sepedi Home Language', 'English First Additional Language', 'Mathematics', 'Astrology 101', 'Life Sciences', 'Geography', 'Life Orientation'],
          terms_accepted: true,
          terms_version: '2026-v1'
        }
      }),
      (err) => err.status === 400
    );

    // Concurrent registration attempts for Naledi MUST NOT create duplicate children
    const regPayload = {
      academic_stream_id: streamScienceId,
      home_language: 'Sepedi Home Language',
      first_additional_language: 'English First Additional Language',
      selected_subjects: [
        'Sepedi Home Language',
        'English First Additional Language',
        'Mathematics',
        'Physical Sciences',
        'Life Sciences',
        'Geography',
        'Life Orientation'
      ],
      terms_accepted: true,
      terms_version: '2026-v1'
    };
    const [r1, r2] = await Promise.all([
      registrationService.completeLearnerRegistration({ applicationId: secondChildAppId, actor: parentUser, payload: regPayload }),
      registrationService.completeLearnerRegistration({ applicationId: secondChildAppId, actor: parentUser, payload: regPayload })
    ]);
    assert.equal(r1.child_id, r2.child_id);
    assert.equal(r1.learner_number, r2.learner_number);
    const nalediCount = (await db.query(`SELECT COUNT(*)::int AS cnt FROM children WHERE full_name = 'Naledi' AND surname = 'Dlamini'`)).rows[0].cnt;
    assert.equal(nalediCount, 1, 'Concurrent registration must create exactly 1 child row');

    // Single-school enrolment conflict: Naledi tries to enrol at School B for same year 2027 -> MUST reject 409 CONFLICTING_ACTIVE_SCHOOL
    const classBRes = await db.query(
      `INSERT INTO classes (school_id, name, grade, stream, capacity) VALUES ($1, '10-B', 10, 'Science', 35) RETURNING id`,
      [schoolBId]
    );
    const classBId = classBRes.rows[0].id;
    for (const [cat, subj, lvl] of [
      ['language', 'Sepedi', 'Home Language'],
      ['language', 'English', 'First Additional Language'],
      ['mathematics', 'Mathematics', ''],
      ['elective', 'Physical Sciences', ''],
      ['elective', 'Life Sciences', ''],
      ['elective', 'Geography', ''],
      ['elective', 'Life Orientation', '']
    ]) {
      await db.query(
        `INSERT INTO school_subject_offerings (school_id, academic_year, grade, stream_name, category, subject_name, language_level, is_active)
         VALUES ($1, 2027, 10, '', $2, $3, $4, TRUE)`,
        [schoolBId, cat, subj, lvl]
      );
    }
    const streamB = (await db.query(
      `INSERT INTO academic_streams (school_id, academic_year, grade, name, mathematics_option, electives, status)
       VALUES ($1, 2027, 10, 'Science', 'Mathematics', ARRAY['Physical Sciences', 'Life Sciences', 'Geography'], 'published') RETURNING id`,
      [schoolBId]
    )).rows[0].id;

    const appBId = (await db.query(
      `INSERT INTO applications (
         school_id, application_number, first_name, surname, id_number, dob, gender,
         email, home_language, first_additional_language, grade_applied, academic_year,
         stream, academic_stream_id, primary_parent_name, primary_parent_surname, primary_parent_email,
         parent_user_id, status
       ) VALUES (
         $1, 'APP-2027-SCHB-1', 'Naledi', 'Dlamini', '1108200123082', '2011-08-20', 'Female',
         'naledi.dlamini@test.local', 'Sepedi Home Language', 'English First Additional Language', 10, 2027,
         'Science', $2, 'Lerato', 'Dlamini', 'lerato.dlamini@test.local', $3, 'submitted'
       ) RETURNING id`,
      [schoolBId, streamB, parentUser.id]
    )).rows[0].id;
    await lifecycleService.approveApplication({ applicationId: appBId, actor: principalB, assignedClassId: classBId });

    await assert.rejects(
      () => registrationService.completeLearnerRegistration({
        applicationId: appBId,
        actor: parentUser,
        payload: { ...regPayload, academic_stream_id: streamB }
      }),
      (err) => err.status === 409 && err.code === 'CONFLICTING_ACTIVE_SCHOOL'
    );
  });

  test('Step 12: Non-destructive rollback guard refuses destructive rollback when lifecycle history exists', async () => {
    const downSql = fs.readFileSync(
      path.join(__dirname, '..', 'db', 'migrations', '20261121_application_lifecycle_remediation.down.sql'),
      'utf8'
    );
    await assert.rejects(
      () => db.query(downSql),
      /ROLLBACK REFUSED/i
    );
  });
});
