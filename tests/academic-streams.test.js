'use strict';

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
      assert.equal(draft.status, 'draft');
      const second = await service.writeStream(schoolA, 1, {
        academic_year: year,
        grade,
        name: `Grade ${grade} alternate`,
        mathematics: 'Mathematical Literacy',
        electives: ['Tourism', 'Geography', 'Business Studies']
      });
      assert.ok(second.id);
      const published = await service.setStreamStatus(schoolA, draft.id, 'published');
      assert.equal(published.status, 'published');
    }
    const incomplete = await service.writeStream(schoolA, 1, {
      academic_year: year, grade: 10, name: 'Too short', mathematics: 'Mathematics', electives: ['Geography']
    }).then(() => null, (error) => error);
    assert.equal(incomplete.status, 400);
  });

  test('an applicant receives only the selected school published package', async () => {
    const visible = await service.listStreams(schoolA, year, 10, { publishedOnly: true });
    assert.equal(visible.length, 1);
    const hidden = await service.listStreams(schoolA, year, 10);
    const draft = hidden.find((stream) => stream.status === 'draft');
    const rejected = await service.resolveApplicantPackage({
      schoolId: schoolA, grade: 10, academicYear: year, streamId: draft.id,
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
});
