'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  resolveEnrolmentSubjects,
  subjectsForDisplay,
  planSubjectCorrection,
  subjectsAfterCorrection,
  subjectsToAdd,
  isSubjectListIncomplete
} = require('../lib/learnerSubjectAllocation');

const sciencePackage = [
  'Sepedi Home Language',
  'English First Additional Language',
  'Mathematics',
  'Life Orientation',
  'Physical Sciences',
  'Life Sciences',
  'Geography'
];

const schoolOfferings = sciencePackage.concat([
  'Accounting',
  'Business Studies',
  'Economics',
  'Tourism',
  'History'
]);

test('a grade 10 enrolment keeps the approved package and ignores the rest of the school list', () => {
  const resolved = resolveEnrolmentSubjects({
    grade: 10,
    subjectPackage: { subjects: sciencePackage },
    selectedSubjects: schoolOfferings
  });
  assert.deepEqual(resolved.subjects, sciencePackage);
  assert.equal(resolved.source, 'approved_package');
  assert.equal(resolved.subjects.includes('Accounting'), false);
});

test('a grade 10 enrolment without an approved list is left unresolved', () => {
  const resolved = resolveEnrolmentSubjects({
    grade: 10,
    subjectPackage: null,
    selectedSubjects: [],
    grade89Catalogue: schoolOfferings
  });
  assert.deepEqual(resolved.subjects, []);
  assert.equal(resolved.source, 'unresolved');
});

test('a stored selection is kept even when it is not exactly seven subjects', () => {
  const resolved = resolveEnrolmentSubjects({
    grade: 11,
    selectedSubjects: ['Mathematics', 'Mathematics', 'Physical Sciences']
  });
  assert.deepEqual(resolved.subjects, ['Mathematics', 'Physical Sciences']);
  assert.equal(resolved.source, 'stored_selection');
});

test('an empty learner subject list is not filled from school offerings', () => {
  assert.deepEqual(subjectsForDisplay(null), []);
  assert.deepEqual(subjectsForDisplay(schoolOfferings.slice(0, 2)), schoolOfferings.slice(0, 2));
});

test('subjects that already have marks are flagged and not proposed for removal', () => {
  const plan = planSubjectCorrection({
    enrolled: sciencePackage.concat(['Accounting']),
    approved: sciencePackage,
    subjectsWithMarks: ['Accounting']
  });
  assert.equal(plan.status, 'mismatch');
  assert.deepEqual(plan.removable, []);
  assert.deepEqual(plan.flagged_with_marks, ['Accounting']);
});

test('subjects outside the package with no marks can be removed without touching marked history', () => {
  const plan = planSubjectCorrection({
    enrolled: sciencePackage.concat(['Tourism']),
    approved: sciencePackage,
    subjectsWithMarks: ['Mathematics']
  });
  assert.deepEqual(plan.removable, ['Tourism']);
  assert.equal(plan.keep.includes('Mathematics'), true);
  assert.equal(plan.keep.includes('Tourism'), false);
});

test('a reviewed correction removes only subjects that have no marks', () => {
  const plan = planSubjectCorrection({
    enrolled: sciencePackage.concat(['Tourism', 'Accounting']),
    approved: sciencePackage.concat(['Life Orientation']),
    subjectsWithMarks: ['Accounting']
  });
  const applied = subjectsAfterCorrection(plan);
  assert.equal(applied.ok, true);
  assert.deepEqual(applied.removed, ['Tourism']);
  assert.equal(applied.subjects.includes('Accounting'), true);
  assert.equal(applied.subjects.includes('Life Orientation'), true);
  assert.equal(applied.subjects.includes('Tourism'), false);
  assert.equal(subjectsAfterCorrection(planSubjectCorrection({
    enrolled: ['Mathematics'],
    approved: [],
    subjectsWithMarks: []
  })).ok, false);
});

test('a learner with fewer than a full subject list is shown for the school admin to complete', () => {
  assert.equal(isSubjectListIncomplete({ grade: 10, enrolled: ['Mathematics', 'Accounting'], missingFromPackage: [] }), true);
  assert.equal(isSubjectListIncomplete({ grade: 10, enrolled: [], missingFromPackage: [] }), true);
  assert.equal(isSubjectListIncomplete({
    grade: 11,
    enrolled: ['Sepedi Home Language', 'English First Additional Language', 'Mathematics', 'Life Orientation', 'Physical Sciences', 'Life Sciences', 'Geography'],
    missingFromPackage: []
  }), false);
});

test('a school admin can add a subject the school offers without removing the rest', () => {
  const added = subjectsToAdd({
    enrolled: ['Mathematics', 'English First Additional Language'],
    requested: ['Life Sciences'],
    offered: ['Mathematics', 'English First Additional Language', 'Life Sciences']
  });
  assert.equal(added.ok, true);
  assert.deepEqual(added.added, ['Life Sciences']);
  assert.equal(added.subjects.includes('Mathematics'), true);
  const rejected = subjectsToAdd({
    enrolled: ['Mathematics'],
    requested: ['Accounting'],
    offered: ['Mathematics', 'Life Sciences']
  });
  assert.equal(rejected.ok, false);
  assert.equal(subjectsToAdd({ enrolled: [], requested: ['Tourism'], offered: [] }).ok, false);
});

test('a learner with no approved package is not rewritten', () => {
  const plan = planSubjectCorrection({
    enrolled: schoolOfferings,
    approved: [],
    subjectsWithMarks: []
  });
  assert.equal(plan.status, 'needs_review');
  assert.deepEqual(plan.removable, []);
});

test('learner login and report compilation do not invent a subject list', () => {
  const learner = fs.readFileSync(path.join(__dirname, '../public/src/controller/learnerController.js'), 'utf8');
  const reports = fs.readFileSync(path.join(__dirname, '../public/src/controller/reportCardController.js'), 'utf8');
  const overview = reports.slice(reports.indexOf('exports.getTeacherSubmissionsOverview'));
  assert.equal(learner.includes('UPDATE children SET subjects = $1 WHERE id = $2'), false);
  assert.equal(learner.includes("child.stream || 'Science'"), false);
  assert.equal(reports.includes('studentSubjects = offered.rows.map'), false);
  assert.equal(overview.includes('school_subject_offerings'), false);
});
