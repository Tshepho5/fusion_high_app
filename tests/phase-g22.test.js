'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { schoolForNewRecord, columnDefaultAssignsSchoolOne } = require('../lib/schoolOwnership');
const { decideClassTransfer } = require('../lib/classTransfer');
const { teacherCanPublish } = require('../lib/timetableAccess');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const actor = { id: 4, role: 'admin', schoolId: 2 };
const learner = { id: 9, school_id: 2, class_id: 16, grade: 10, stream: 'Science' };
const currentClass = { id: 16, school_id: 2, grade: 10, stream: 'General' };
const destination = { id: 17, school_id: 2, grade: 10, stream: 'Science' };

test('a missing school does not become school 1', () => {
  const missing = schoolForNewRecord({ id: 1, school_id: null }, null);
  assert.equal(missing.ok, false);
  assert.equal(missing.schoolId, null);
  const override = schoolForNewRecord({ id: 2, school_id: 2 }, 3);
  assert.equal(override.code, 'school_override');
  const own = schoolForNewRecord({ id: 2, school_id: 2 }, 1);
  assert.equal(own.ok, false);
  assert.equal(columnDefaultAssignsSchoolOne('1'), true);
  assert.equal(columnDefaultAssignsSchoolOne(null), false);
});

test('startup no longer inserts classes without a school', () => {
  const schema = read('db/init_full_schema.js');
  const applications = read('db/init_applications.js');
  assert.equal(schema.includes('INSERT INTO classes (name, grade, stream)'), false);
  assert.equal(applications.includes('INSERT INTO classes (name, grade, stream)'), false);
  assert.equal(schema.includes('school_id INTEGER DEFAULT 1'), false);
  assert.equal(read('db/schema.sql').includes('school_id INTEGER DEFAULT 1'), false);
  assert.equal(read('public/src/controller/textbookController.js').includes('school_id INTEGER DEFAULT 1'), false);
});

test('a teacher cannot publish another teacher draft in the same school', () => {
  const shared = {
    role: 'teacher',
    classNames: ['10A'],
    assignments: [{ teacher_id: 7, class_name: '10A' }, { teacher_id: 8, class_name: '10A' }],
    classRows: []
  };
  assert.equal(teacherCanPublish({ ...shared, teacherId: 7, createdBy: 8, authorRole: 'teacher' }), false);
  assert.equal(teacherCanPublish({ ...shared, teacherId: 8, createdBy: 8, authorRole: 'teacher' }), true);
  assert.equal(teacherCanPublish({ ...shared, teacherId: 7, createdBy: 3, authorRole: 'admin' }), true);
  assert.equal(teacherCanPublish({ role: 'admin', teacherId: 3, classNames: ['10A'], assignments: [], classRows: [], createdBy: 8, authorRole: 'teacher' }), true);
});

test('a class transfer stays inside the school and keeps history decisions separate', () => {
  const accepted = decideClassTransfer({
    actor, learner, currentClass, destinationClass: destination,
    effectiveOn: '2026-11-20', reason: 'Stream placement', pendingTransfer: null, today: '2026-11-20'
  });
  assert.equal(accepted.code, 'applied');
  const future = decideClassTransfer({
    actor, learner, currentClass, destinationClass: destination,
    effectiveOn: '2026-12-01', reason: 'Stream placement', pendingTransfer: null, today: '2026-11-20'
  });
  assert.equal(future.applyNow, false);
  assert.equal(decideClassTransfer({
    actor: { ...actor, schoolId: 3 }, learner, currentClass, destinationClass: destination,
    effectiveOn: '2026-11-20', reason: 'Stream placement', today: '2026-11-20'
  }).code, 'learner_not_in_school');
  assert.equal(decideClassTransfer({
    actor: { id: 1, role: 'admin', is_superadmin: true, schoolId: 2 },
    learner, currentClass, destinationClass: destination,
    effectiveOn: '2026-11-20', reason: 'Stream placement', today: '2026-11-20'
  }).code, 'superadmin_not_operator');
  assert.equal(decideClassTransfer({
    actor: { id: 7, role: 'teacher', schoolId: 2 },
    learner, currentClass, destinationClass: destination,
    effectiveOn: '2026-11-20', reason: 'Stream placement', today: '2026-11-20'
  }).code, 'role_denied');
  assert.equal(decideClassTransfer({
    actor, learner, currentClass, destinationClass: { ...destination, school_id: 3 },
    effectiveOn: '2026-11-20', reason: 'Stream placement', today: '2026-11-20'
  }).code, 'destination_not_in_school');
  assert.equal(decideClassTransfer({
    actor, learner, currentClass, destinationClass: currentClass,
    effectiveOn: '2026-11-20', reason: 'Stream placement', today: '2026-11-20'
  }).code, 'same_class');
  assert.equal(decideClassTransfer({
    actor, learner, currentClass, destinationClass: { ...destination, ownership_quarantine: true },
    effectiveOn: '2026-11-20', reason: 'Stream placement', today: '2026-11-20'
  }).code, 'destination_inactive');
  const controller = read('public/src/controller/classTransferController.js');
  assert.equal(controller.includes('UPDATE marks'), false);
  assert.equal(controller.includes('UPDATE attendance'), false);
  assert.equal(controller.includes('UPDATE report_cards'), false);
  assert.match(controller, /UPDATE children/);
});

test('the ownership migration refuses every database except the staging database', () => {
  const migration = read('db/migrations/20261120_school_ownership_defaults.sql');
  assert.match(migration, /geleza_phase_g2/);
  assert.match(migration, /DROP DEFAULT/);
  assert.equal(migration.includes('UPDATE '), false);
  assert.equal(migration.includes('DELETE '), false);
  const approval = read('public/src/controller/adminController.js');
  assert.match(approval, /const bcrypt = require\('bcryptjs'\)/);
  const timetable = read('public/src/controller/timetableController.js');
  assert.match(timetable, /const PERIODS_1_HOUR = \[/);
  assert.match(read('package.json'), /"bcryptjs"/);
});
