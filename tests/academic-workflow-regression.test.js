'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { resolveEnrolmentSubjects, planSubjectCorrection } = require('../lib/learnerSubjectAllocation');
const { enrolledInSubject, validateMark } = require('../lib/assessmentAccess');
const { submissionStatus, blankMarksExcluded } = require('../lib/marksheetSubmission');
const { calculateLearner, classAverage } = require('../lib/academicCalculation');
const { assembleClassReadiness } = require('../lib/classReadiness');
const { teacherMayViewClassReport, verificationDecision } = require('../lib/reportVerification');
const { assembleParentReleases, paymentEntitlement } = require('../lib/reportRelease');

test('one class reaches a parent only after every subject is authorized and approved', () => {
  const enrolment = resolveEnrolmentSubjects({
    grade: 10,
    subjectPackage: ['Mathematics', 'English Home Language'],
    selectedSubjects: ['Mathematics', 'English Home Language', 'Life Sciences', 'Physical Sciences', 'Geography', 'Accounting', 'History']
  });
  assert.deepEqual(enrolment.subjects, ['Mathematics', 'English Home Language']);

  const correction = planSubjectCorrection({
    enrolled: ['Mathematics', 'English Home Language', 'Accounting'],
    approved: enrolment.subjects,
    subjectsWithMarks: ['Accounting']
  });
  assert.deepEqual(correction.removable, []);
  assert.deepEqual(correction.flagged_with_marks, ['Accounting']);

  const classLearners = [
    { id: 7, class_name: '10A', subjects: enrolment.subjects },
    { id: 8, class_name: '10A', subjects: enrolment.subjects }
  ];
  assert.equal(enrolledInSubject(classLearners[0].subjects, 'Life Sciences'), false);
  assert.equal(validateMark('', 50).ok, false);
  assert.equal(validateMark(35, 50).score, 35);

  const entered = blankMarksExcluded([
    { learner_id: 7, score: 35 },
    { learner_id: 8, score: '' }
  ]);
  assert.deepEqual(entered.map((row) => row.learner_id), [7]);
  assert.equal(submissionStatus({ enrolledCount: 2, markCount: entered.length, locked: false }), 'PARTIAL');

  const maths = classLearners.map((learner) => calculateLearner(
    learner.id === 7
      ? [{ name: 'Test', score: 35, maximum: 50 }, { name: 'Exam', score: 72, maximum: 100 }]
      : [{ name: 'Test', score: null, maximum: 50 }, { name: 'Exam', score: 72, maximum: 100 }],
    'total_marks'
  ));
  assert.equal(maths[0].percentage, 71.33);
  assert.equal(classAverage(maths).status, 'incomplete');

  const mathsOnly = assembleClassReadiness({
    learners: classLearners,
    teachers: [{ subject: 'Mathematics', class_name: '10A', teacher: 'Ms Khumalo' }],
    submissions: [{ subject: 'Mathematics', class_name: '10A', status: 'submitted' }],
    authorizations: [{ subject: 'Mathematics', class_name: '10A', status: 'authorized' }]
  });
  assert.equal(mathsOnly.ready, false);

  const english = classLearners.map((learner) => calculateLearner([
    { name: 'Task', score: learner.id === 7 ? 18 : 16, maximum: 20 }
  ], 'total_marks'));
  assert.equal(classAverage(english).status, 'complete');
  const ready = assembleClassReadiness({
    learners: classLearners,
    teachers: [
      { subject: 'Mathematics', class_name: '10A', teacher: 'Ms Khumalo' },
      { subject: 'English Home Language', class_name: '10A', teacher: 'Mr Ndlovu' }
    ],
    submissions: [
      { subject: 'Mathematics', class_name: '10A', status: 'submitted' },
      { subject: 'English Home Language', class_name: '10A', status: 'submitted' }
    ],
    authorizations: [
      { subject: 'Mathematics', class_name: '10A', status: 'authorized' },
      { subject: 'English Home Language', class_name: '10A', status: 'authorized' }
    ]
  });
  assert.equal(ready.ready, true);
  assert.equal(submissionStatus({ enrolledCount: 2, markCount: 2, locked: true }), 'SUBMITTED');

  assert.equal(teacherMayViewClassReport({ teacherId: 4, homeroomTeacherId: 9, assignedTeacherId: 8 }), false);
  assert.equal(teacherMayViewClassReport({ teacherId: 9, homeroomTeacherId: 9, assignedTeacherId: 8 }), true);
  assert.equal(verificationDecision({ decision: 'returned', reason: '' }).ok, false);
  const approval = verificationDecision({ decision: 'approved' });
  assert.equal(approval.ok, true);

  const beforeRelease = assembleParentReleases(3, [
    { child_id: 7, full_name: 'Amina', surname: 'Dlamini', grade: 10, class_name: '10A', parent_id: 3 }
  ], [{ child_id: 7, academic_year: 2026, term: 3, grade: 10, is_published: false, overall_average: 80 }]);
  assert.equal(beforeRelease[0].reports[0].release_status, 'not_released');
  assert.equal(beforeRelease[0].reports[0].overall_average, undefined);

  const released = assembleParentReleases(3, [
    { child_id: 7, full_name: 'Amina', surname: 'Dlamini', grade: 10, class_name: '10A', parent_id: 3 },
    { child_id: 99, full_name: 'Unrelated', surname: 'Learner', grade: 10, class_name: '10B', parent_id: 12 }
  ], [{ child_id: 7, academic_year: 2026, term: 3, grade: 10, is_published: true, overall_average: 80 }]);
  assert.equal(released.length, 1);
  assert.equal(released[0].reports[0].download_available, true);
  assert.equal(paymentEntitlement().blocks_access, false);
});

test('the live routes keep the role gates for marks, reports, and parent release', () => {
  const marks = fs.readFileSync(path.join(__dirname, '../public/src/controller/teacher/teacherLearnersController.js'), 'utf8');
  const save = marks.slice(marks.indexOf('exports.saveClassMarks'), marks.indexOf('exports.getClassRoster'));
  assert.match(save, /is_superadmin/);
  assert.match(save, /findLocked/);
  assert.match(save, /validateMark/);

  const reports = fs.readFileSync(path.join(__dirname, '../public/src/controller/reportCardController.js'), 'utf8');
  const publish = reports.slice(reports.indexOf('exports.publishGradeReportCards'), reports.indexOf('exports.getOfficialReportCardView'));
  assert.match(publish, /status\(409\)/);
  assert.match(publish, /The class teacher still has to verify these reports/);
  const official = reports.slice(reports.indexOf('const authorizedBySubject'), reports.indexOf('exports.getOfficialReportCardView'));
  assert.match(official, /authorizedBySubject\.has\(subKey\)/);
  assert.match(official, /continue;/);
  assert.equal((reports.match(/await denyUnassignedTeacher\(req, res,/g) || []).length, 3);

  const routes = fs.readFileSync(path.join(__dirname, '../public/src/routes/reportCardRoutes.js'), 'utf8');
  assert.match(routes, /\/my-releases/);
  const parentPage = fs.readFileSync(path.join(__dirname, '../client/src/pages/parent/ParentDashboard.tsx'), 'utf8');
  assert.match(parentPage, /ParentReportReleases/);
});
