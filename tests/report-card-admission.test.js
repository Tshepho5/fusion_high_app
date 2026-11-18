'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.join(__dirname, '../public/src/controller/reportCardController.js'),
  'utf8'
);
const subjectsSource = fs.readFileSync(
  path.join(__dirname, '../public/src/controller/adminController.js'),
  'utf8'
);

test('grade template SQL uses the learner number as the admission identifier', () => {
  assert.equal(source.includes('c.admission_number, c.id_number, c.dob'), false);
  assert.equal(source.includes('c.id_number, c.dob'), false);
  assert.match(source, /c\.learner_number AS admission_number/);
  assert.match(source, /NULLIF\(c\.admission_number/);
  assert.match(source, /LEFT JOIN users u ON c\.learner_user_id = u\.id/);
  assert.match(source, /u\.id_number/);
  assert.match(source, /u\.dob/);
});

test('a missing percentage is not converted into CAPS level 1', () => {
  const start = source.indexOf('const getCapsLevel = (percentage) => {');
  const body = source.slice(start, start + 500);
  assert.match(body, /percentage === null/);
  assert.match(body, /level: '-'/);
});

test('report card subject lists are not filled from hardcoded stream catalogues', () => {
  assert.equal(source.includes("studentSubjects = ['Mathematics', 'Physical Sciences'"), false);
  assert.equal(source.includes("subjects = ['Accounting', 'Business Studies'"), false);
  assert.equal(source.includes("studentSubjects.push('Geography')"), false);
  assert.equal(source.includes("subList.push('Geography')"), false);
  assert.equal(source.includes('FROM subjects'), false);
});

test('curriculum mark averages stay inside the authenticated school', () => {
  const summary = subjectsSource.slice(subjectsSource.indexOf('exports.getSchoolSubjectsSummary'));
  assert.match(summary, /JOIN children c ON c\.id = COALESCE\(m\.child_id, m\.learner_id\)/);
  assert.match(summary, /c\.school_id = \$1/);
  assert.match(summary, /FROM school_subject_offerings/);
  assert.equal(summary.includes('FROM subjects s'), false);
});
