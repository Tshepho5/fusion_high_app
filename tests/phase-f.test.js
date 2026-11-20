'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { timetableSchoolDecision, canReadTimetable } = require('../lib/timetableAccess');
const { parseTerm, parseAcademicYear, parseGrade } = require('../lib/academicContext');
const { markStatus, termResultLabel, boundedRecordedMark } = require('../lib/reportRecord');

test('a school cannot read another school timetable', () => {
  const decision = timetableSchoolDecision({ id: 4, school_id: 1, role: 'admin' }, 2);
  assert.equal(decision.allowed, false);
  assert.equal(decision.code, 'school_override');
  assert.equal(canReadTimetable({
    actorSchoolId: 1,
    timetableSchoolId: 2,
    learnerSchoolId: 2,
    role: 'learner'
  }), false);
  assert.equal(canReadTimetable({
    actorSchoolId: 2,
    timetableSchoolId: 2,
    learnerSchoolId: 2,
    role: 'teacher'
  }), true);
});

test('a missing school and an unlinked parent are denied', () => {
  assert.equal(timetableSchoolDecision({ id: 1, role: 'teacher' }, null).code, 'missing_school');
  assert.equal(canReadTimetable({
    actorSchoolId: 3,
    timetableSchoolId: 3,
    learnerSchoolId: 3,
    role: 'parent',
    parentLinked: false
  }), false);
  assert.equal(canReadTimetable({
    actorSchoolId: 3,
    timetableSchoolId: 3,
    learnerSchoolId: 3,
    role: 'parent',
    parentLinked: true
  }), true);
  assert.equal(canReadTimetable({
    actorSchoolId: 3,
    timetableSchoolId: 3,
    learnerSchoolId: 4,
    role: 'admin'
  }), false);
});

test('a superadmin must choose a school and does not receive every timetable', () => {
  assert.equal(timetableSchoolDecision({ id: 1, is_superadmin: true }, null).code, 'missing_school');
  assert.equal(timetableSchoolDecision({ id: 1, is_superadmin: true }, 5).schoolId, 5);
});

test('term, year, and grade are not invented when they are missing', () => {
  assert.equal(parseTerm(undefined).ok, false);
  assert.equal(parseTerm(0).ok, false);
  assert.equal(parseTerm(5).ok, false);
  assert.equal(parseTerm(2).term, 2);
  assert.equal(parseAcademicYear(undefined).ok, false);
  assert.equal(parseAcademicYear(2024).year, 2024);
  assert.equal(parseGrade(undefined).ok, false);
  assert.equal(parseGrade(13).ok, false);
  assert.equal(parseGrade(11).grade, 11);
});

test('blank, absent, exempt, and a genuine zero stay distinct', () => {
  assert.equal(markStatus(null), 'blank');
  assert.equal(markStatus(''), 'blank');
  assert.equal(markStatus(0), 'zero');
  assert.equal(boundedRecordedMark(0), 0);
  assert.equal(boundedRecordedMark(''), null);
  assert.equal(markStatus(null, 'absent'), 'absent');
  assert.equal(markStatus(null, 'exempt'), 'exempt');
  assert.equal(markStatus(null, 'not applicable'), 'not_applicable');
  assert.equal(markStatus(null, 'pending'), 'pending');
  assert.equal(termResultLabel(1, 40, true), 'Achieved');
  assert.equal(termResultLabel(3, 39, true), 'Not Achieved');
  assert.equal(termResultLabel(2, 80, false), '-');
  assert.equal(termResultLabel(4, 40, true), 'Promoted');
  assert.equal(termResultLabel(4, 10, true), 'Not Promoted');
});

test('generated study pages do not name an unverified author or claim official status', () => {
  const source = fs.readFileSync(path.join(__dirname, '../public/src/services/capsDocumentGenerator.js'), 'utf8');
  assert.equal(source.includes('Dr. T. Makola'), false);
  assert.equal(source.includes('AUTHENTICATED CAPS'), false);
  assert.equal(source.includes('DEPARTMENT OF BASIC EDUCATION'), false);
  assert.match(source, /Educational study resource provided through Geleza SA/);
});

test('timetable and advisor code no longer substitutes school 1, term 1, or year 2026', () => {
  const timetable = fs.readFileSync(path.join(__dirname, '../public/src/controller/timetableController.js'), 'utf8');
  const advisor = fs.readFileSync(path.join(__dirname, '../public/src/routes/aiAdvisorRoutes.js'), 'utf8');
  const tool = fs.readFileSync(path.join(__dirname, '../public/src/services/ai/toolRegistry.js'), 'utf8');
  assert.equal(timetable.includes('isNaN(parsed) ? 1'), false);
  assert.equal(advisor.includes('academic_year = 2026'), false);
  assert.equal(advisor.includes('term = 1'), false);
  assert.match(tool, /school_id = \$1 AND grade = \$2/);
});
