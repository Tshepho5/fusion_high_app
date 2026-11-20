'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { recordedLearnerNumber, recordedGender, recordedSchoolType } = require('../lib/displayRecord');
const { teacherOwnsSlot, offeredSubjectNames } = require('../lib/teacherSlot');
const { termResultLabel } = require('../lib/reportRecord');

test('a missing learner number, gender, or school type stays missing', () => {
  assert.equal(recordedLearnerNumber(null), null);
  assert.equal(recordedLearnerNumber('  GSA-100  '), 'GSA-100');
  assert.equal(recordedGender(''), null);
  assert.equal(recordedGender('Female'), 'Female');
  assert.equal(recordedSchoolType(undefined), null);
  assert.equal(recordedSchoolType('Independent'), 'Independent');
});

test('a teacher slot matches an assignment and not a similar name', () => {
  const assignments = [{ teacher_id: 7, subject_name: 'Mathematics', class_name: '10A' }];
  assert.equal(teacherOwnsSlot({ subject: 'Mathematics', teacher: 'T. Mokoena' }, '10A', 7, assignments), true);
  assert.equal(teacherOwnsSlot({ subject: 'Mathematics', teacher: 'T. Mokoena' }, '10A', 8, assignments), false);
  assert.equal(teacherOwnsSlot({ subject: 'History', teacher_id: 7 }, '10A', 7, assignments), true);
  assert.equal(teacherOwnsSlot({ subject: 'History', teacher: 'Mokoena' }, '10B', 7, []), false);
});

test('each school keeps its own subject list', () => {
  const schoolA = offeredSubjectNames([{ subject_name: 'Tourism' }, { subject_name: 'Tourism' }]);
  const schoolB = offeredSubjectNames([{ subject_name: 'Accounting' }]);
  assert.deepEqual(schoolA, ['Tourism']);
  assert.deepEqual(schoolB, ['Accounting']);
  assert.equal(schoolA.includes('Accounting'), false);
});

test('term results stay on the internal line and an incomplete term is blank', () => {
  assert.equal(termResultLabel(1, 40, true), 'Achieved');
  assert.equal(termResultLabel(4, 40, true), 'Promoted');
  assert.equal(termResultLabel(4, 39, false), '-');
  const report = fs.readFileSync(path.join(__dirname, '../public/src/controller/reportCardController.js'), 'utf8');
  const pdf = fs.readFileSync(path.join(__dirname, '../public/src/services/reportCardPdfService.js'), 'utf8');
  assert.match(report, /official_departmental_decision = false/);
  assert.match(pdf, /not a Department of Basic Education promotion decision/);
  assert.equal(pdf.includes('National Senior Certificate (CAPS): Home Language'), false);
});

test('new timetable setup does not give school 1 as a default', () => {
  const source = fs.readFileSync(path.join(__dirname, '../public/src/controller/timetableController.js'), 'utf8');
  const migration = fs.readFileSync(path.join(__dirname, '../db/migrations/20261120_timetable_school_default.sql'), 'utf8');
  assert.equal(source.includes('school_id INT DEFAULT 1'), false);
  assert.match(migration, /DROP DEFAULT/);
  assert.equal(migration.includes('UPDATE timetables'), false);
  assert.match(source, /school_subject_offerings/);
  assert.equal(source.includes("name: `Grade ${gr}A`"), false);
});

test('parent and advisor queries do not invent a learner number, gender, or school type', () => {
  const parent = fs.readFileSync(path.join(__dirname, '../public/src/controller/parentController.js'), 'utf8');
  const advisor = fs.readFileSync(path.join(__dirname, '../public/src/routes/aiAdvisorRoutes.js'), 'utf8');
  assert.equal(parent.includes('2026-FHS-'), false);
  assert.equal(parent.includes("COALESCE(u.gender, 'Male')"), false);
  assert.equal(advisor.includes("COALESCE(u.gender, 'Male')"), false);
  assert.equal(advisor.includes("COALESCE(s.school_type, 'Public')"), false);
});
