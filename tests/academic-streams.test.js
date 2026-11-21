'use strict';
require('./safety/blockLiveEffects');

const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { Client } = require('pg');
const rules = require('../public/src/services/nscCurriculum');

const offerings = {
  languages: [
    { language: 'Sepedi', level: 'Home Language', required: false },
    { language: 'English', level: 'Home Language', required: false },
    { language: 'English', level: 'First Additional Language', required: false },
    { language: 'Afrikaans', level: 'First Additional Language', required: false }
  ],
  mathematics: ['Mathematics', 'Mathematical Literacy'],
  electives: ['Physical Sciences', 'Life Sciences', 'Geography', 'Accounting', 'Business Studies', 'Economics', 'Tourism', 'Computer Applications Technology', 'Information Technology']
};

describe('NSC subject rules', () => {
  test('a standard package has seven subjects and includes Life Orientation', () => {
    const stream = rules.validateStream({
      name: 'Science',
      mathematics: 'Mathematics',
      electives: ['Physical Sciences', 'Life Sciences', 'Geography']
    }, offerings);
    assert.equal(stream.ok, true);
    const subjectPackage = rules.buildPackage({
      homeLanguage: 'Sepedi',
      additionalLanguage: 'English',
      stream: stream.value
    });
    assert.equal(subjectPackage.count, 7);
    assert.equal(subjectPackage.subjects[3], 'Life Orientation');
    assert.deepEqual(subjectPackage.subjects.slice(4), ['Physical Sciences', 'Life Sciences', 'Geography']);
  });

  test('Mathematics and Mathematical Literacy cannot share one package', () => {
    const result = rules.validateStream({
      name: 'Mixed',
      mathematics: 'Mathematics',
      electives: ['Mathematical Literacy', 'Accounting', 'Economics']
    }, offerings);
    assert.equal(result.ok, false);
  });

  test('duplicate electives and Physical Sciences without Mathematics are rejected', () => {
    const duplicate = rules.validateStream({
      name: 'Duplicate',
      mathematics: 'Mathematics',
      electives: ['Geography', 'Geography', 'History']
    }, { ...offerings, electives: [...offerings.electives, 'History'] });
    assert.equal(duplicate.ok, false);
    const sciences = rules.validateStream({
      name: 'Sciences',
      mathematics: 'Mathematical Literacy',
      electives: ['Physical Sciences', 'Life Sciences', 'Geography']
    }, offerings);
    assert.match(sciences.errors.join(' '), /Physical Sciences must be taken with Mathematics/);
  });

  test('the same language cannot be both Home Language and First Additional Language', () => {
    const result = rules.validateLanguageChoice('English', 'English', offerings);
    assert.equal(result.ok, false);
    const offered = rules.validateLanguageChoice('Sepedi', 'Afrikaans', offerings);
    assert.equal(offered.ok, true);
  });

  test('a required First Additional Language is enforced', () => {
    const restricted = {
      ...offerings,
      languages: offerings.languages.map((row) => (
        row.language === 'English' && row.level === 'First Additional Language' ? { ...row, required: true } : row
      ))
    };
    const rejected = rules.validateLanguageChoice('Sepedi', 'Afrikaans', restricted);
    assert.match(rejected.errors.join(' '), /requires English/);
  });

  test('incomplete offerings cannot support a stream', () => {
    const result = rules.validateOfferings({ academic_year: 2026, grade: 10, languages: [], mathematics: [], electives: ['History'] });
    assert.equal(result.ok, false);
  });

  test('unrecognised subjects outside the Geleza SA CAPS catalogue are rejected while language levels normalise cleanly', () => {
    assert.equal(rules.normalizeLanguageLevel('HL'), 'Home Language');
    assert.equal(rules.normalizeLanguageLevel('FAL'), 'First Additional Language');
    const fabricated = rules.validateOfferings({
      academic_year: 2026,
      grade: 10,
      languages: [
        { language: 'Sepedi', level: 'HL' },
        { language: 'English', level: 'FAL' }
      ],
      mathematics: ['Mathematics'],
      electives: ['Physical Sciences', 'Life Sciences', 'Fake Made Up Subject 101']
    });
    assert.equal(fabricated.ok, false);
    assert.match(fabricated.errors.join(' '), /not in Geleza SA's recognised CAPS subject catalogue/);

    const aliased = rules.validateOfferings({
      academic_year: 2026,
      grade: 10,
      languages: [
        { language: 'Sepedi', level: 'HL' },
        { language: 'English', level: 'FAL' }
      ],
      mathematics: ['Mathematics'],
      electives: ['Engineering Graphics & Design (EGD)', 'Information Technology (IT)', 'Physical Sciences']
    });
    assert.equal(aliased.ok, true);
    assert.deepEqual(aliased.value.electives, ['Engineering Graphics and Design', 'Information Technology', 'Physical Sciences']);
    assert.equal(aliased.value.languages[0].level, 'Home Language');
    assert.equal(aliased.value.languages[1].level, 'First Additional Language');
  });

  test('Grade 8 and 9 offerings require a Home Language and validate Senior Phase subjects against the catalogue', () => {
    const noHome = rules.validateOfferings({
      academic_year: 2026,
      grade: 8,
      languages: [{ language: 'English', level: 'First Additional Language' }],
      mathematics: ['Mathematics'],
      electives: ['Natural Sciences']
    });
    assert.equal(noHome.ok, false);
    assert.match(noHome.errors.join(' '), /at least one Home Language/);

    const validSenior = rules.validateOfferings({
      academic_year: 2026,
      grade: 8,
      languages: [
        { language: 'Sepedi', level: 'Home Language' },
        { language: 'English', level: 'First Additional Language' }
      ],
      mathematics: ['Mathematics'],
      electives: ['Natural Sciences', 'Social Sciences', 'Technology', 'EMS', 'Life Orientation', 'Creative Arts']
    });
    assert.equal(validSenior.ok, true);
    assert.equal(validSenior.value.electives.includes('Economic & Management Sciences (EMS)'), true);
  });
});

describe('school academic streams', () => {
  const testDb = `geleza_streams_${Date.now()}`;
  let adminClient;
  let db;
  let service;
  let controller;
  let schoolA;
  let schoolB;
  const year = 2026;

  before(async () => {
    require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
    const host = process.env.DB_HOST === 'localhost' ? '127.0.0.1' : process.env.DB_HOST;
    assert.ok(host === '127.0.0.1' || host === 'localhost', 'Refusing to create a test database on an unapproved host.');
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
    process.env.GELEZA_TEST_DATABASE = testDb;
    process.env.DATABASE_URL = `postgresql://${encodeURIComponent(process.env.DB_USER || 'postgres')}:${encodeURIComponent(process.env.DB_PASSWORD || '')}@${host}:${process.env.DB_PORT || 5432}/${testDb}`;
    db = require('../db/db');
    const connected = await db.query('SELECT current_database() AS name');
    assert.equal(connected.rows[0].name, testDb);
    assert.notEqual(connected.rows[0].name, 'FUSION_DB');
    await db.query(`
      CREATE TABLE schools (id SERIAL PRIMARY KEY, name TEXT NOT NULL);
      CREATE TABLE applications (
        id SERIAL PRIMARY KEY,
        school_id INTEGER,
        id_number TEXT,
        grade_applied INTEGER,
        selected_subjects TEXT[],
        stream TEXT,
        status TEXT,
        application_number TEXT
      );
    `);
    schoolA = (await db.query(`INSERT INTO schools (name) VALUES ('School A') RETURNING id`)).rows[0].id;
    schoolB = (await db.query(`INSERT INTO schools (name) VALUES ('School B') RETURNING id`)).rows[0].id;
    await db.query(
      `INSERT INTO applications (school_id, id_number, grade_applied, selected_subjects, stream, status, application_number)
       VALUES ($1, '0000000000000', 9, ARRAY['English'], 'General', 'submitted', 'KEEP-1')`,
      [schoolA]
    );
    service = require('../public/src/services/academicStreamService');
    controller = require('../public/src/controller/academicStreamController');
    await service.ensureSchema();
    const kept = await db.query(`SELECT application_number, selected_subjects FROM applications WHERE application_number = 'KEEP-1'`);
    assert.equal(kept.rows.length, 1);
    assert.deepEqual(kept.rows[0].selected_subjects, ['English']);
  });

  after(async () => {
    if (db && db.pool) await db.pool.end();
    if (adminClient) {
      await adminClient.query(`DROP DATABASE IF EXISTS ${testDb}`);
      await adminClient.end();
    }
  });

  function sampleOfferings(grade) {
    return {
      academic_year: year,
      grade,
      languages: offerings.languages,
      mathematics: offerings.mathematics,
      electives: offerings.electives
    };
  }

  test('a principal configures offerings and streams for Grades 10, 11 and 12', async () => {
    for (const grade of [10, 11, 12]) {
      await service.saveOfferings(schoolA, 1, sampleOfferings(grade));
      const draft = await service.writeStream(schoolA, 1, {
        academic_year: year,
        grade,
        name: `Grade ${grade} combination`,
        mathematics: grade === 10 ? 'Mathematics' : 'Mathematical Literacy',
        electives: grade === 10
          ? ['Physical Sciences', 'Life Sciences', 'Geography']
          : ['Accounting', 'Business Studies', 'Economics']
      });
      assert.equal(draft.status, 'published');
      const second = await service.writeStream(schoolA, 1, {
        academic_year: year,
        grade,
        name: `Grade ${grade} alternate`,
        mathematics: 'Mathematical Literacy',
        electives: ['Tourism', 'Geography', 'Business Studies']
      });
      assert.equal(second.status, 'published');
      const published = await service.setStreamStatus(schoolA, draft.id, 'published');
      assert.equal(published.status, 'published');
    }
    const incomplete = await service.writeStream(schoolA, 1, {
      academic_year: year, grade: 10, name: 'Too short', mathematics: 'Mathematics', electives: ['Geography']
    }).then(() => null, (error) => error);
    assert.equal(incomplete.status, 400);
  });

  test('an applicant receives only the selected school published package', async () => {
    const saved = await service.listStreams(schoolA, year, 10, { publishedOnly: true });
    assert.equal(saved.length, 2);
    const extra = saved.find((stream) => stream.name.includes('alternate'));
    await service.setStreamStatus(schoolA, extra.id, 'archived');
    const visible = await service.listStreams(schoolA, year, 10, { publishedOnly: true });
    assert.equal(visible.length, 1);
    const rejected = await service.resolveApplicantPackage({
      schoolId: schoolA, grade: 10, academicYear: year, streamId: extra.id,
      homeLanguage: 'Sepedi', additionalLanguage: 'English', idNumber: '1111111111111'
    }).then(() => null, (error) => error);
    assert.equal(rejected.status, 400);
    const resolved = await service.resolveApplicantPackage({
      schoolId: schoolA, grade: 10, academicYear: year, streamId: visible[0].id,
      homeLanguage: 'Sepedi', additionalLanguage: 'English', idNumber: '1111111111111'
    });
    assert.equal(resolved.selectedSubjects.length, 7);
    assert.equal(resolved.selectedSubjects.includes('Life Orientation'), true);
    const otherSchool = await service.listStreams(schoolB, year, 10, { publishedOnly: true });
    assert.equal(otherSchool.length, 0);
    const empty = await service.resolveApplicantPackage({
      schoolId: schoolB, grade: 10, academicYear: year, streamId: visible[0].id,
      homeLanguage: 'Sepedi', additionalLanguage: 'English', idNumber: '2222222222222'
    }).then(() => null, (error) => error);
    assert.match(empty.message, /not yet been made available/);
  });

  test('a school administrator cannot manage another school', async () => {
    const response = { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    await controller.configuration({
      params: { id: String(schoolB) },
      query: { year: String(year), grade: '10' },
      user: { id: 4, school_id: schoolA, is_superadmin: false }
    }, response);
    assert.equal(response.statusCode, 403);
  });

  test('a subject change keeps the earlier application and needs school approval', async () => {
    const grade11 = (await service.listStreams(schoolA, year, 11, { publishedOnly: true }))[0];
    await db.query(
      `INSERT INTO applications (school_id, id_number, grade_applied, selected_subjects, stream, status, application_number)
       VALUES ($1, '3333333333333', 10, $2, 'Earlier', 'enrolled', 'KEEP-2')`,
      [schoolA, ['Sepedi Home Language', 'English First Additional Language', 'Mathematics', 'Life Orientation', 'Physical Sciences', 'Life Sciences', 'Geography']]
    );
    const blocked = await service.resolveApplicantPackage({
      schoolId: schoolA, grade: 11, academicYear: year, streamId: grade11.id,
      homeLanguage: 'Sepedi', additionalLanguage: 'English', idNumber: '3333333333333'
    }).then(() => null, (error) => error);
    assert.equal(blocked.status, 409);
    await service.approveSubjectChange(schoolA, 9, {
      id_number: '3333333333333', academic_year: year, grade: 11, academic_stream_id: grade11.id
    });
    const allowed = await service.resolveApplicantPackage({
      schoolId: schoolA, grade: 11, academicYear: year, streamId: grade11.id,
      homeLanguage: 'Sepedi', additionalLanguage: 'English', idNumber: '3333333333333'
    });
    assert.equal(allowed.selectedSubjects.length, 7);
    const earlier = await db.query(`SELECT selected_subjects FROM applications WHERE application_number = 'KEEP-2'`);
    assert.equal(earlier.rows[0].selected_subjects.includes('Physical Sciences'), true);
  });

  test('configuration auto-resolves latest configured year, supports Grades 8-9, stream edits, copy-year, and strict school isolation', async () => {
    // Configure Grade 8 & 9 for School A in 2026
    await service.saveOfferings(schoolA, 1, {
      academic_year: year,
      grade: 8,
      apply_to_grades: [8, 9],
      languages: [
        { language: 'Sepedi', level: 'Home Language', required: false },
        { language: 'English', level: 'First Additional Language', required: true }
      ],
      mathematics: ['Mathematics'],
      electives: ['Natural Sciences', 'Social Sciences', 'Technology', 'Life Orientation', 'Creative Arts']
    });

    // Auto-year configuration resolves 2026 even when current date rolls over to 2027
    const configRes = { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    await controller.configuration({
      params: { id: String(schoolA) },
      query: { year: 'auto', grade: '10' },
      user: { id: 1, school_id: schoolA, is_superadmin: false }
    }, configRes);
    assert.equal(configRes.statusCode, 200);
    assert.equal(configRes.body.academic_year, 2026);
    assert.equal(configRes.body.available_years.includes(2026), true);
    assert.equal(configRes.body.offerings.electives.length > 0, true);
    assert.equal(configRes.body.streams.length > 0, true);
    assert.equal(configRes.body.all_grade_offerings[8].languages.some((l) => l.language === 'Sepedi' && l.level === 'Home Language'), true);

    // Public published-streams returns ONLY School A's Grade 8 Home Language, and empty (not hardcoded!) for unconfigured School B
    const pubA = { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    await controller.published({ params: { id: String(schoolA) }, query: { year: '2027', grade: '8' } }, pubA);
    assert.equal(pubA.statusCode, 200);
    assert.deepEqual(pubA.body.languages.filter((l) => l.level === 'Home Language').map((l) => l.language), ['Sepedi']);

    const pubB = { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    await controller.published({ params: { id: String(schoolB) }, query: { year: '2027', grade: '8' } }, pubB);
    assert.equal(pubB.statusCode, 200);
    assert.deepEqual(pubB.body.languages, []);
    assert.equal(pubB.body.language_source, 'unconfigured');

    // Editing a stream updates its subjects immediately
    const streamToEdit = configRes.body.streams[0];
    const updatedStream = await service.writeStream(schoolA, 1, {
      academic_year: year,
      grade: 10,
      name: streamToEdit.name,
      mathematics: 'Mathematics',
      electives: ['Physical Sciences', 'Life Sciences', 'Accounting']
    }, streamToEdit.id);
    assert.deepEqual(updatedStream.electives, ['Physical Sciences', 'Life Sciences', 'Accounting']);

    // Copy 2026 configuration to 2027 cleanly for School A
    const copied = await service.copyYearConfiguration(schoolA, 1, 2026, 2027);
    assert.equal(copied.source_year, 2026);
    assert.equal(copied.target_year, 2027);
    assert.equal(copied.copied_offerings > 0, true);
    assert.equal(copied.copied_streams > 0, true);
    const streams2027 = await service.listStreams(schoolA, 2027, 10, { publishedOnly: true });
    assert.equal(streams2027.length > 0, true);
    assert.deepEqual(streams2027[0].electives, ['Physical Sciences', 'Life Sciences', 'Accounting']);
    // School B remains completely untouched
    const schoolB2027 = await service.listStreams(schoolB, 2027, 10, { publishedOnly: true });
    assert.equal(schoolB2027.length, 0);
  });

  test('curriculum GET endpoints and read services never execute DDL statements', async () => {
    const origQuery = db.query;
    const executedSql = [];
    db.query = (text, params) => {
      executedSql.push(String(text || ''));
      return origQuery(text, params);
    };
    try {
      const pubRes = { statusCode: 200, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
      await controller.published({ params: { id: String(schoolA) }, query: { year: '2026', grade: '10' } }, pubRes);
      assert.equal(pubRes.statusCode, 200);

      const pub8Res = { statusCode: 200, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
      await controller.published({ params: { id: String(schoolA) }, query: { year: '2026', grade: '8' } }, pub8Res);
      assert.equal(pub8Res.statusCode, 200);

      const cfgRes = { statusCode: 200, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
      await controller.configuration({
        params: { id: String(schoolA) },
        query: { year: 'auto', grade: '10' },
        user: { id: 1, school_id: schoolA, is_superadmin: false }
      }, cfgRes);
      assert.equal(cfgRes.statusCode, 200);

      const ddlPattern = /\b(CREATE|ALTER|DROP|TRUNCATE)\b|DO\s+\$\$/i;
      const ddlHits = executedSql.filter((sql) => ddlPattern.test(sql));
      assert.deepEqual(ddlHits, [], `Unexpected DDL executed during GET requests: ${ddlHits.join(' | ')}`);
    } finally {
      db.query = origQuery;
    }
  });

  test('legacy production v1 schema upgrades cleanly, is idempotent, guards duplicates, and enforces non-destructive rollback', async () => {
    const fs = require('fs');
    const legacyDb = `geleza_streams_legacy_${Date.now()}`;
    const host = process.env.DB_HOST === 'localhost' ? '127.0.0.1' : process.env.DB_HOST;
    assert.ok(host === '127.0.0.1' || host === 'localhost');

    await adminClient.query(`CREATE DATABASE ${legacyDb}`);
    const legacyClient = new Client({
      host,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      database: legacyDb
    });
    await legacyClient.connect();
    try {
      // 1. Seed EXACT legacy production schema (from 20261120_school_academic_structure.sql: Grade 10-12 only, NO stream_name!)
      await legacyClient.query(`
        CREATE TABLE schools (id SERIAL PRIMARY KEY, name TEXT NOT NULL, offered_languages TEXT[], offered_subjects TEXT[], offered_streams TEXT[]);
        CREATE TABLE applications (id SERIAL PRIMARY KEY, school_id INTEGER, id_number TEXT, grade_applied INTEGER, selected_subjects TEXT[]);
      `);
      const legacyStructureSql = fs.readFileSync(
        path.join(__dirname, '..', 'db', 'migrations', '20261120_school_academic_structure.sql'),
        'utf8'
      );
      await legacyClient.query(legacyStructureSql);

      const sId = (await legacyClient.query(`INSERT INTO schools (name, offered_languages) VALUES ('Legacy Prod School', ARRAY['Sepedi Home Language','English FAL']) RETURNING id`)).rows[0].id;
      await legacyClient.query(
        `INSERT INTO school_subject_offerings (school_id, academic_year, grade, subject_name, category, language_level, is_required, is_active)
         VALUES ($1, 2026, 10, 'Sepedi', 'language', 'Home Language', FALSE, TRUE),
                ($1, 2026, 10, 'English', 'language', 'First Additional Language', TRUE, TRUE),
                ($1, 2026, 10, 'Mathematics', 'mathematics', '', FALSE, TRUE),
                ($1, 2026, 10, 'Physical Sciences', 'elective', '', FALSE, TRUE),
                ($1, 2026, 10, 'Life Sciences', 'elective', '', FALSE, TRUE),
                ($1, 2026, 10, 'Geography', 'elective', '', FALSE, TRUE)`,
        [sId]
      );
      await legacyClient.query(
        `INSERT INTO academic_streams (school_id, academic_year, grade, name, mathematics_option, electives, status)
         VALUES ($1, 2026, 10, 'Science', 'Mathematics', ARRAY['Physical Sciences','Life Sciences','Geography'], 'published')`,
        [sId]
      );

      // Confirm Grade 8 is rejected on legacy schema BEFORE migration
      await assert.rejects(
        () => legacyClient.query(
          `INSERT INTO school_subject_offerings (school_id, academic_year, grade, subject_name, category, language_level)
           VALUES ($1, 2026, 8, 'Sepedi', 'language', 'Home Language')`,
          [sId]
        ),
        /check constraint/i
      );

      // 2. Apply upgrade migration ONCE and then TWICE (idempotency)
      const upgradeSql = fs.readFileSync(
        path.join(__dirname, '..', 'db', 'migrations', '20261121_curriculum_grades_8_12_upgrade.sql'),
        'utf8'
      );
      await legacyClient.query(upgradeSql);
      await legacyClient.query(upgradeSql);

      // 3. Verify existing Grade 10 offerings & streams preserved verbatim with zero duplicates
      const preservedOff = await legacyClient.query('SELECT COUNT(*)::int AS c FROM school_subject_offerings WHERE school_id = $1 AND grade = 10', [sId]);
      const preservedStr = await legacyClient.query('SELECT name, electives FROM academic_streams WHERE school_id = $1 AND grade = 10', [sId]);
      assert.equal(preservedOff.rows[0].c, 6);
      assert.equal(preservedStr.rows.length, 1);
      assert.deepEqual(preservedStr.rows[0].electives, ['Physical Sciences', 'Life Sciences', 'Geography']);

      // Verify existing FK (ON DELETE CASCADE) and category/status CHECK constraints preserved
      const fkCheck = await legacyClient.query(
        `SELECT conname FROM pg_constraint WHERE conrelid = 'school_subject_offerings'::regclass AND contype = 'f'`
      );
      assert.ok(fkCheck.rows.length >= 1, 'Foreign key on school_subject_offerings missing');
      await assert.rejects(
        () => legacyClient.query(
          `INSERT INTO school_subject_offerings (school_id, academic_year, grade, stream_name, subject_name, category, language_level)
           VALUES ($1, 2026, 10, '', 'BadCat', 'invalid_cat', '')`,
          [sId]
        ),
        /check constraint/i
      );

      // 4. Verify Grade 8 and Grade 9 offerings can now be inserted and ON CONFLICT with stream_name works
      await legacyClient.query(
        `INSERT INTO school_subject_offerings (school_id, academic_year, grade, stream_name, subject_name, category, language_level, is_active)
         VALUES ($1, 2026, 8, '', 'Sepedi', 'language', 'Home Language', TRUE),
                ($1, 2026, 9, '', 'Sepedi', 'language', 'Home Language', TRUE)
         ON CONFLICT (school_id, academic_year, grade, stream_name, subject_name, language_level)
         DO UPDATE SET is_active = TRUE`,
        [sId]
      );
      const g89 = await legacyClient.query('SELECT grade FROM school_subject_offerings WHERE school_id = $1 AND grade IN (8, 9) ORDER BY grade', [sId]);
      assert.deepEqual(g89.rows.map((r) => r.grade), [8, 9]);

      // 5. Verify non-destructive rollback REFUSES to proceed when Grade 8-9 rows exist (and does not delete them!)
      const downSql = fs.readFileSync(
        path.join(__dirname, '..', 'db', 'migrations', '20261121_curriculum_grades_8_12_upgrade.down.sql'),
        'utf8'
      );
      await assert.rejects(() => legacyClient.query(downSql), /ROLLBACK REFUSED/);
      await legacyClient.query('ROLLBACK');
      const stillThere = await legacyClient.query('SELECT COUNT(*)::int AS c FROM school_subject_offerings WHERE school_id = $1 AND grade IN (8, 9)', [sId]);
      assert.equal(stillThere.rows[0].c, 2);

      // 6. Verify duplicate pre-flight check aborts cleanly without deleting rows
      await legacyClient.query('DROP INDEX school_subject_offerings_unique');
      await legacyClient.query(
        `INSERT INTO school_subject_offerings (school_id, academic_year, grade, stream_name, subject_name, category, language_level)
         VALUES ($1, 2026, 10, '', 'Geography', 'elective', '')`,
        [sId]
      );
      await assert.rejects(() => legacyClient.query(upgradeSql), /MIGRATION ABORTED: Duplicate rows detected/);
      await legacyClient.query('ROLLBACK');
      const dupeCount = await legacyClient.query(`SELECT COUNT(*)::int AS c FROM school_subject_offerings WHERE school_id = $1 AND subject_name = 'Geography'`, [sId]);
      assert.equal(dupeCount.rows[0].c, 2, 'Duplicate pre-flight guard must NOT auto-delete rows');
    } finally {
      await legacyClient.end();
      await adminClient.query(`DROP DATABASE IF EXISTS ${legacyDb}`);
    }
  });

  test('Phase F read-only preflight diagnostic executes under default_transaction_read_only=on across legacy, upgraded, conflicting, and missing-table schemas', async () => {
    const fs = require('fs');
    const host = process.env.DB_HOST === 'localhost' ? '127.0.0.1' : process.env.DB_HOST;
    assert.ok(host === '127.0.0.1' || host === 'localhost');

    const preflightSql = fs.readFileSync(
      path.join(__dirname, '..', 'db', 'diagnostics', '20261121_curriculum_production_preflight.sql'),
      'utf8'
    );
    const legacyStructureSql = fs.readFileSync(
      path.join(__dirname, '..', 'db', 'migrations', '20261120_school_academic_structure.sql'),
      'utf8'
    );
    const upgradeSql = fs.readFileSync(
      path.join(__dirname, '..', 'db', 'migrations', '20261121_curriculum_grades_8_12_upgrade.sql'),
      'utf8'
    );

    const runInTempDb = async (suffix, setupFn) => {
      const dbName = `geleza_streams_pf_${suffix}_${Date.now()}`;
      await adminClient.query(`CREATE DATABASE ${dbName}`);
      const rwClient = new Client({
        host,
        port: parseInt(process.env.DB_PORT || '5432', 10),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        database: dbName
      });
      const roClient = new Client({
        host,
        port: parseInt(process.env.DB_PORT || '5432', 10),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        database: dbName,
        options: '-c default_transaction_read_only=on'
      });
      await rwClient.connect();
      await roClient.connect();
      try {
        await setupFn(rwClient);
        const res = await roClient.query(preflightSql);
        const byCheck = new Map(res.rows.map((r) => [r.check_name, r]));
        assert.equal(byCheck.get('database_identity').evidence_json.read_only_session, 'on');
        return { rows: res.rows, byCheck };
      } finally {
        await roClient.end();
        await rwClient.end();
        await adminClient.query(`DROP DATABASE IF EXISTS ${dbName}`);
      }
    };

    // Scenario 1: Legacy Production v1 schema (Grade 10-12 CHECK, NO stream_name column)
    const s1 = await runInTempDb('legacy', async (c) => {
      await c.query(`
        CREATE TABLE schools (id SERIAL PRIMARY KEY, name TEXT NOT NULL, offered_languages TEXT[], offered_subjects TEXT[], offered_streams TEXT[]);
        CREATE TABLE applications (id SERIAL PRIMARY KEY, school_id INTEGER, id_number TEXT, grade_applied INTEGER);
      `);
      await c.query(legacyStructureSql);
      const sId = (await c.query(`INSERT INTO schools (name, offered_languages) VALUES ('Walters High School', ARRAY['Sepedi Home Language']) RETURNING id`)).rows[0].id;
      await c.query(
        `INSERT INTO school_subject_offerings (school_id, academic_year, grade, subject_name, category, language_level)
         VALUES ($1, 2026, 10, 'Sepedi', 'language', 'Home Language'),
                ($1, 2026, 10, 'English', 'language', 'First Additional Language')`,
        [sId]
      );
      await c.query(
        `INSERT INTO academic_streams (school_id, academic_year, grade, name, mathematics_option, electives, status)
         VALUES ($1, 2026, 10, 'Science', 'Mathematics', ARRAY['Physical Sciences','Life Sciences','Geography'], 'published')`,
        [sId]
      );
    });
    assert.match(s1.byCheck.get('columns_school_subject_offerings').detail, /stream_name column present=false/);
    assert.equal(s1.byCheck.get('offerings_unique_key_conflicts').status, 'PASS');
    assert.equal(s1.byCheck.get('streams_active_name_conflicts').status, 'PASS');
    assert.equal(s1.byCheck.get('prereq_grade_check_scope_safe').status, 'PASS');
    assert.equal(s1.byCheck.get('OVERALL_MIGRATION_PREREQUISITE_VERDICT').status, 'PASS');
    const legacyConstraints = s1.byCheck.get('constraints_school_subject_offerings').evidence_json;
    assert.ok(legacyConstraints.some((x) => x.type === 'CHECK' && x.matches_grade_drop_rule === true && x.has_mixed_non_grade_clause === false));
    assert.ok(legacyConstraints.some((x) => x.type === 'CHECK' && x.matches_grade_drop_rule === false && /category/i.test(x.definition)));

    // Scenario 2: Already upgraded Grades 8-12 schema with Grade 8-12 data & approvals
    const s2 = await runInTempDb('upgraded', async (c) => {
      await c.query(`
        CREATE TABLE schools (id SERIAL PRIMARY KEY, name TEXT NOT NULL);
        CREATE TABLE applications (id SERIAL PRIMARY KEY, school_id INTEGER);
      `);
      await c.query(upgradeSql);
      const sId = (await c.query(`INSERT INTO schools (name) VALUES ('Upgraded School') RETURNING id`)).rows[0].id;
      await c.query(
        `INSERT INTO school_subject_offerings (school_id, academic_year, grade, stream_name, subject_name, category, language_level)
         VALUES ($1, 2026, 8, '', 'Sepedi', 'language', 'Home Language')`,
        [sId]
      );
      const stId = (await c.query(
        `INSERT INTO academic_streams (school_id, academic_year, grade, name, mathematics_option, electives, status)
         VALUES ($1, 2026, 10, 'Commerce', 'Mathematics', ARRAY['Accounting','Business Studies','Economics'], 'published') RETURNING id`,
        [sId]
      )).rows[0].id;
      await c.query(
        `INSERT INTO subject_change_approvals (school_id, id_number, academic_year, grade, academic_stream_id)
         VALUES ($1, '0901015000081', 2026, 10, $2)`,
        [sId, stId]
      );
    });
    assert.match(s2.byCheck.get('columns_school_subject_offerings').detail, /stream_name column present=true/);
    assert.equal(s2.byCheck.get('approvals_integrity_and_fk').status, 'PASS');
    assert.equal(s2.byCheck.get('applications_col_subject_package').status, 'PASS');
    assert.equal(s2.byCheck.get('OVERALL_MIGRATION_PREREQUISITE_VERDICT').status, 'PASS');

    // Scenario 3: Conflicting data (out-of-range grade, duplicate offerings, duplicate active streams, mixed CHECK constraint)
    const s3 = await runInTempDb('conflicts', async (c) => {
      await c.query(`
        CREATE TABLE schools (id SERIAL PRIMARY KEY, name TEXT NOT NULL);
        CREATE TABLE applications (id SERIAL PRIMARY KEY, school_id INTEGER);
        CREATE TABLE school_subject_offerings (
          id SERIAL PRIMARY KEY,
          school_id INTEGER NOT NULL REFERENCES schools(id),
          academic_year INTEGER NOT NULL,
          grade INTEGER NOT NULL,
          subject_name VARCHAR(80) NOT NULL,
          category VARCHAR(20) NOT NULL,
          language_level VARCHAR(40) NOT NULL DEFAULT '',
          CONSTRAINT mixed_grade_and_category CHECK (grade >= 1 AND category IN ('language','mathematics','elective'))
        );
        CREATE TABLE academic_streams (
          id SERIAL PRIMARY KEY,
          school_id INTEGER NOT NULL REFERENCES schools(id),
          academic_year INTEGER NOT NULL,
          grade INTEGER NOT NULL,
          name VARCHAR(80) NOT NULL,
          mathematics_option VARCHAR(40) NOT NULL,
          electives TEXT[] NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'draft'
        );
      `);
      const sId = (await c.query(`INSERT INTO schools (name) VALUES ('Conflict School') RETURNING id`)).rows[0].id;
      await c.query(
        `INSERT INTO school_subject_offerings (school_id, academic_year, grade, subject_name, category, language_level)
         VALUES ($1, 2026, 7, 'Sepedi', 'language', 'Home Language'),
                ($1, 2026, 10, 'Geography', 'elective', ''),
                ($1, 2026, 10, 'Geography', 'elective', '')`,
        [sId]
      );
      await c.query(
        `INSERT INTO academic_streams (school_id, academic_year, grade, name, mathematics_option, electives, status)
         VALUES ($1, 2026, 10, 'Science', 'Mathematics', ARRAY['Physical Sciences','Life Sciences','Geography'], 'published'),
                ($1, 2026, 10, 'science', 'Mathematics', ARRAY['Physical Sciences','Life Sciences','Accounting'], 'draft')`,
        [sId]
      );
    });
    assert.equal(s3.byCheck.get('offerings_grade_range_8_to_12').status, 'FAIL');
    assert.equal(s3.byCheck.get('offerings_grade_range_8_to_12').evidence_json.out_of_range_grade_ids.length, 1);
    assert.equal(s3.byCheck.get('offerings_unique_key_conflicts').status, 'FAIL');
    assert.equal(s3.byCheck.get('offerings_unique_key_conflicts').evidence_json.duplicate_group_count, 1);
    assert.equal(s3.byCheck.get('streams_active_name_conflicts').status, 'FAIL');
    assert.equal(s3.byCheck.get('streams_active_name_conflicts').evidence_json.duplicate_group_count, 1);
    assert.equal(s3.byCheck.get('prereq_grade_check_scope_safe').status, 'FAIL');
    assert.equal(s3.byCheck.get('OVERALL_MIGRATION_PREREQUISITE_VERDICT').status, 'FAIL');

    // Scenario 4: Missing curriculum tables + incompatible applications.subject_package TEXT column
    const s4 = await runInTempDb('missing', async (c) => {
      await c.query(`
        CREATE TABLE schools (id SERIAL PRIMARY KEY, name TEXT NOT NULL);
        CREATE TABLE applications (id SERIAL PRIMARY KEY, school_id INTEGER, subject_package TEXT);
      `);
      await c.query(`INSERT INTO schools (name) VALUES ('Fresh School')`);
    });
    assert.equal(s4.byCheck.get('table_school_subject_offerings').status, 'INFO');
    assert.equal(s4.byCheck.get('offerings_unique_key_conflicts').status, 'PASS');
    assert.equal(s4.byCheck.get('applications_col_subject_package').status, 'FAIL');
    assert.equal(s4.byCheck.get('prereq_applications_columns_ready').status, 'FAIL');
    assert.equal(s4.byCheck.get('OVERALL_MIGRATION_PREREQUISITE_VERDICT').status, 'FAIL');
  });

  test('Phase G: mixed-constraint abort guard and post-migration read-only verification SQL pass across production-mirror, pre-migration, and broken schemas', async () => {
    const fs = require('fs');
    const host = process.env.DB_HOST === 'localhost' ? '127.0.0.1' : process.env.DB_HOST;
    assert.ok(host === '127.0.0.1' || host === 'localhost');

    const legacyStructureSql = fs.readFileSync(
      path.join(__dirname, '..', 'db', 'migrations', '20261120_school_academic_structure.sql'),
      'utf8'
    );
    const upgradeSql = fs.readFileSync(
      path.join(__dirname, '..', 'db', 'migrations', '20261121_curriculum_grades_8_12_upgrade.sql'),
      'utf8'
    );
    const postVerifySql = fs.readFileSync(
      path.join(__dirname, '..', 'db', 'diagnostics', '20261121_curriculum_post_migration_verify.sql'),
      'utf8'
    );

    const dbName = `geleza_streams_pg_${Date.now()}`;
    await adminClient.query(`CREATE DATABASE ${dbName}`);
    const rw = new Client({
      host,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      database: dbName
    });
    const ro = new Client({
      host,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      database: dbName,
      options: '-c default_transaction_read_only=on'
    });
    await rw.connect();
    await ro.connect();
    try {
      // 1. Seed a production-mirror legacy v1 DB: 2 schools, 48 offerings, 15 streams, compatible applications columns
      await rw.query(`
        CREATE TABLE schools (id SERIAL PRIMARY KEY, name TEXT NOT NULL);
        CREATE TABLE applications (
          id SERIAL PRIMARY KEY,
          school_id INTEGER,
          first_additional_language VARCHAR(80),
          academic_stream_id INTEGER,
          subject_package JSONB
        );
      `);
      await rw.query(legacyStructureSql);
      const s13 = (await rw.query(`INSERT INTO schools (name) VALUES ('Walters High School') RETURNING id`)).rows[0].id;
      const s14 = (await rw.query(`INSERT INTO schools (name) VALUES ('Geleza SA Tester School') RETURNING id`)).rows[0].id;

      // Insert 48 legacy offerings across Grades 10-12 and 2 schools (8 subjects x 3 grades x 2 schools = 48)
      const seedSubjects = [
        ['Sepedi', 'language', 'Home Language'],
        ['English', 'language', 'First Additional Language'],
        ['Mathematics', 'mathematics', ''],
        ['Mathematical Literacy', 'mathematics', ''],
        ['Physical Sciences', 'elective', ''],
        ['Life Sciences', 'elective', ''],
        ['Accounting', 'elective', ''],
        ['Geography', 'elective', '']
      ];
      for (const sid of [s13, s14]) {
        for (const grade of [10, 11, 12]) {
          for (const [subj, cat, lvl] of seedSubjects) {
            await rw.query(
              `INSERT INTO school_subject_offerings (school_id, academic_year, grade, subject_name, category, language_level)
               VALUES ($1, 2026, $2, $3, $4, $5)`,
              [sid, grade, subj, cat, lvl]
            );
          }
        }
      }
      // Insert 15 legacy streams (3 grades x 3 streams for school 13 + 3 grades x 2 streams for school 14 = 15)
      for (const grade of [10, 11, 12]) {
        for (const stName of ['Science', 'Commerce', 'General']) {
          await rw.query(
            `INSERT INTO academic_streams (school_id, academic_year, grade, name, mathematics_option, electives, status)
             VALUES ($1, 2026, $2, $3, 'Mathematics', ARRAY['Physical Sciences','Life Sciences','Geography'], 'published')`,
            [s13, grade, stName]
          );
        }
        for (const stName of ['Science', 'Commerce']) {
          await rw.query(
            `INSERT INTO academic_streams (school_id, academic_year, grade, name, mathematics_option, electives, status)
             VALUES ($1, 2026, $2, $3, 'Mathematics', ARRAY['Accounting','Geography','Life Sciences'], 'published')`,
            [s14, grade, stName]
          );
        }
      }

      // 2. BEFORE migration: post-migration verification MUST return FAIL
      const preRes = await ro.query(postVerifySql);
      const preMap = new Map(preRes.rows.map((r) => [r.check_name, r]));
      assert.equal(preMap.get('database_identity').evidence_json.read_only_session, 'on');
      assert.equal(preMap.get('verify_offerings_stream_name_column').status, 'FAIL');
      assert.equal(preMap.get('verify_offerings_grade_check_8_to_12').status, 'FAIL');
      assert.equal(preMap.get('verify_offerings_unique_index_exact_key').status, 'FAIL');
      assert.equal(preMap.get('POST_MIGRATION_VERIFICATION_VERDICT').status, 'FAIL');

      // 3. Test fail-closed mixed-constraint guard: temporarily add a mixed CHECK constraint and verify migration ABORTS cleanly
      await rw.query(
        `ALTER TABLE school_subject_offerings ADD CONSTRAINT tmp_mixed_grade_cat CHECK (grade >= 10 AND category IN ('language','mathematics','elective'))`
      );
      await assert.rejects(
        () => rw.query(upgradeSql),
        /MIGRATION ABORTED: Refusing to drop mixed CHECK constraint tmp_mixed_grade_cat on school_subject_offerings/
      );
      await rw.query('ROLLBACK');
      await rw.query('ALTER TABLE school_subject_offerings DROP CONSTRAINT tmp_mixed_grade_cat');

      // 4. Execute upgrade migration TWICE (idempotency)
      await rw.query(upgradeSql);
      await rw.query(upgradeSql);

      // 5. AFTER migration: post-migration verification MUST return PASS across all 12 checks & preserve all 48 + 15 rows
      const postRes = await ro.query(postVerifySql);
      const postMap = new Map(postRes.rows.map((r) => [r.check_name, r]));
      for (const checkName of [
        'verify_offerings_stream_name_column',
        'verify_offerings_grade_check_8_to_12',
        'verify_offerings_category_check_intact',
        'verify_streams_grade_check_8_to_12',
        'verify_streams_status_check_intact',
        'verify_curriculum_foreign_keys_intact',
        'verify_offerings_unique_index_exact_key',
        'verify_streams_active_name_unique_index',
        'verify_curriculum_lookup_indexes',
        'verify_subject_change_approvals_structure',
        'verify_applications_columns_compatible',
        'verify_row_counts_and_data_integrity',
        'verify_zero_duplicates_against_target_indexes',
        'POST_MIGRATION_VERIFICATION_VERDICT'
      ]) {
        assert.equal(
          postMap.get(checkName)?.status,
          'PASS',
          `Expected ${checkName} to be PASS, got ${postMap.get(checkName)?.status}: ${postMap.get(checkName)?.detail}`
        );
      }
      const integrityEv = postMap.get('verify_row_counts_and_data_integrity').evidence_json;
      assert.equal(integrityEv.offerings_count, 48);
      assert.equal(integrityEv.streams_count, 15);
      assert.equal(integrityEv.offerings_null_stream_name, 0);

      // 6. Never report PASS for unchecked prerequisite: drop subject_change_approvals and confirm UNKNOWN/FAIL
      await rw.query('DROP TABLE subject_change_approvals');
      const brokenRes = await ro.query(postVerifySql);
      const brokenMap = new Map(brokenRes.rows.map((r) => [r.check_name, r]));
      assert.equal(brokenMap.get('verify_subject_change_approvals_structure').status, 'FAIL');
      assert.equal(brokenMap.get('verify_row_counts_and_data_integrity').status, 'UNKNOWN');
      assert.equal(brokenMap.get('POST_MIGRATION_VERIFICATION_VERDICT').status, 'FAIL');
    } finally {
      await ro.end();
      await rw.end();
      await adminClient.query(`DROP DATABASE IF EXISTS ${dbName}`);
    }
  });
});
