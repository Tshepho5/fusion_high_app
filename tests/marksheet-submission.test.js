'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { submissionStatus, blankMarksExcluded } = require('../lib/marksheetSubmission');

test('a saved draft is not treated as a school submission', () => {
  assert.equal(submissionStatus({ enrolledCount: 20, markCount: 20, locked: false }), 'PARTIAL');
  assert.equal(submissionStatus({ enrolledCount: 20, markCount: 8, locked: true }), 'SUBMITTED');
  assert.equal(submissionStatus({ enrolledCount: 20, markCount: 0, locked: false }), 'PENDING');
});

test('a blank mark is not turned into zero', () => {
  const kept = blankMarksExcluded([
    { mark_obtained: 0 },
    { mark_obtained: '' },
    { mark_obtained: null },
    { mark_obtained: 42 }
  ]);
  assert.deepEqual(kept.map((row) => row.mark_obtained), [0, 42]);
});

test('submitted marksheets block a later silent overwrite', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '../public/src/controller/teacher/teacherLearnersController.js'),
    'utf8'
  );
  const save = source.slice(source.indexOf('exports.saveClassMarks'), source.indexOf('exports.getClassRoster'));
  assert.match(save, /findLocked/);
  assert.match(save, /status\(409\)/);
});
