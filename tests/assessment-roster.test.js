'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { enrolledInSubject, validateMark, teacherCovers, enrolmentSql } = require('../lib/assessmentAccess');

test('only an enrolled subject matches', () => {
  const subjects = ['Mathematics', 'Physical Sciences', 'Life Orientation'];
  assert.equal(enrolledInSubject(subjects, 'physical sciences'), true);
  assert.equal(enrolledInSubject(subjects, 'Accounting'), false);
  assert.equal(enrolledInSubject(null, 'Mathematics'), false);
});

test('a mark above the assessment total is rejected and a blank is not a zero', () => {
  assert.equal(validateMark(38, 50).ok, true);
  assert.equal(validateMark(51, 50).ok, false);
  assert.equal(validateMark(-1, 50).ok, false);
  assert.equal(validateMark('', 50).ok, false);
});

test('a teacher is limited to an assigned subject and class', () => {
  const assignments = [{ subject_name: 'Physical Sciences', grade_level: 10, class_name: '10A', class_id: 4 }];
  assert.equal(teacherCovers({ assignments, subject: 'Physical Sciences', grade: 10, className: '10A' }), true);
  assert.equal(teacherCovers({ assignments, subject: 'Accounting', grade: 10, className: '10A' }), false);
  assert.equal(teacherCovers({ assignments, subject: 'Physical Sciences', grade: 10, className: '10B' }), false);
  assert.equal(teacherCovers({
    assignments: [],
    employee: { subjects: ['Life Sciences'], grades_taught: [10], classes_taught: ['10A'] },
    subject: 'Life Sciences',
    grade: 10,
    className: '10A'
  }), true);
});

test('the roster query uses the learner subject list', () => {
  assert.match(enrolmentSql(1), /unnest\(COALESCE\(c\.subjects/);
  const learners = fs.readFileSync(
    path.join(__dirname, '../public/src/controller/teacher/teacherLearnersController.js'),
    'utf8'
  );
  const mine = learners.slice(learners.indexOf('exports.getMyLearners'), learners.indexOf('exports.getClassList'));
  assert.equal(mine.includes("c.stream = 'Science'"), false);
  assert.equal(mine.includes("c.stream = 'General'"), false);
  const save = learners.slice(learners.indexOf('exports.saveClassMarks'), learners.indexOf('exports.getClassRoster'));
  assert.equal(save.includes('INSERT INTO children'), false);
});
