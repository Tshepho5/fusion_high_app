'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { teacherMayViewClassReport, verificationDecision, correctionNotice } = require('../lib/reportVerification');

test('a subject teacher cannot open another class report', () => {
  assert.equal(teacherMayViewClassReport({ teacherId: 4, homeroomTeacherId: 9, assignedTeacherId: 8 }), false);
  assert.equal(teacherMayViewClassReport({ teacherId: 9, homeroomTeacherId: 9, assignedTeacherId: 8 }), true);
});

test('returning a report requires a reason and approval does not change marks', () => {
  assert.equal(verificationDecision({ decision: 'returned', reason: '' }).ok, false);
  assert.equal(verificationDecision({ decision: 'returned', reason: 'Check the total' }).ok, false);
  const returned = verificationDecision({
    decision: 'returned',
    reason: 'Check the total',
    learner_number: 'L1007',
    subject: 'Mathematics'
  });
  assert.equal(returned.ok, true);
  assert.equal(returned.subject, 'Mathematics');
  assert.equal(verificationDecision({ decision: 'approved', reason: '' }).ok, true);
  const notice = correctionNotice({
    decision: 'returned',
    className: '10A',
    learnerName: 'Amina Dlamini',
    subject: 'Mathematics',
    reason: 'Check the total'
  });
  assert.match(notice.message, /Mathematics/);
  assert.match(notice.message, /Amina Dlamini/);
});
