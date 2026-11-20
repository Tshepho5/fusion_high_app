'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { selectPublishedClass, teacherCanPublish } = require('../lib/timetableAccess');
const { buildClassProposal } = require('../lib/timetableGeneration');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('a learner sees only the published timetable for their own class', () => {
  const rows = [
    { id: 1, status: 'draft_teachers', is_active: true, timetable_data: { '10A': { Monday: {} } } },
    { id: 2, status: 'published_to_learners', is_active: true, timetable_data: { '10A': { Monday: { '08:00 - 09:00': { subject: 'Art' } } }, '10B': { Monday: {} } } }
  ];
  const selected = selectPublishedClass(rows, '10A');
  assert.equal(selected.ok, true);
  assert.deepEqual(Object.keys(selected.timetable.timetable_data), ['10A']);
  assert.equal(selectPublishedClass(rows, '10C').ok, false);
  assert.equal(selectPublishedClass([
    rows[1],
    { id: 3, status: 'published_to_learners', is_active: true, timetable_data: { '10A': {} } }
  ], '10A').code, 'ambiguous');
});

test('a teacher cannot publish a timetable for a class they are not assigned to', () => {
  assert.equal(teacherCanPublish({
    role: 'teacher',
    teacherId: 7,
    classNames: ['10A', '10B'],
    assignments: [{ teacher_id: 7, class_name: '10A' }],
    classRows: []
  }), false);
  assert.equal(teacherCanPublish({
    role: 'teacher',
    teacherId: 7,
    classNames: ['10A'],
    assignments: [{ teacher_id: 7, class_name: '10A' }],
    classRows: []
  }), true);
  assert.equal(teacherCanPublish({
    role: 'admin',
    teacherId: 1,
    classNames: ['10A'],
    assignments: [],
    classRows: []
  }), true);
});

test('generation uses assignments and does not invent a room or a teacher', () => {
  const schoolA = buildClassProposal({
    classes: [{ id: 1, name: '10A', grade: 10, stream: 'Science', room_number: 'Lab 1' }],
    subjects: ['Physical Sciences'],
    assignments: [{ teacher_id: 4, subject_name: 'Physical Sciences', grade_level: 10, class_name: '10A', full_name: 'A', surname: 'Teacher' }],
    periods: ['08:00 - 09:00']
  });
  const slot = schoolA.timetable_data['10A'].Monday['08:00 - 09:00'];
  assert.equal(slot.teacher_id, 4);
  assert.equal(slot.room, 'Lab 1');
  const schoolB = buildClassProposal({
    classes: [{ id: 2, name: '10A', grade: 10, stream: 'Science', room_number: null }],
    subjects: ['Accounting'],
    assignments: [{ teacher_id: 9, subject_name: 'Accounting', grade_level: 10, class_name: '11A', class_id: 99, full_name: 'Other', surname: 'School' }],
    periods: ['08:00 - 09:00']
  });
  assert.equal(schoolB.filled_count, 0);
  assert.equal(schoolB.timetable_data['10A'].Monday['08:00 - 09:00'], undefined);
  assert.equal(JSON.stringify(schoolB).includes('Unassigned'), false);
});

test('a class without a stream or a subject list is reported instead of being scheduled', () => {
  const missingStream = buildClassProposal({
    classes: [{ id: 3, name: '8A', grade: 8, stream: '', room_number: null }],
    subjects: ['Mathematics'],
    assignments: [],
    periods: ['08:00 - 09:00']
  });
  assert.equal(missingStream.filled_count, 0);
  assert.equal(missingStream.timetable_data['8A'], undefined);
  assert.match(missingStream.gaps[0].reason, /no stream/i);
});

test('timetable routes keep school ownership and do not replace active rows during generation', () => {
  const controller = read('public/src/controller/timetableController.js');
  const swap = read('public/src/controller/timetableSwapController.js');
  const parent = read('public/src/controller/parentController.js');
  assert.match(controller, /WHERE id = \$2 AND school_id = \$3 AND status = 'draft_teachers'/);
  assert.equal(controller.includes('DELETE FROM timetables'), false);
  assert.equal(controller.includes('SET is_active = FALSE WHERE grade'), false);
  assert.equal(controller.includes('Multi-Stream'), false);
  assert.equal(controller.includes('Unassigned'), false);
  assert.match(controller, /status = 'archived'/);
  assert.match(swap, /u\.school_id = \$2 AND r\.name = 'teacher'/);
  assert.equal(swap.includes('ILIKE'), false);
  assert.match(parent, /status = 'published_to_learners'/);
  assert.equal(parent.includes('Room ${child.grade'), false);
});

test('academic structure and versioning migrations are prepared and do not change existing timetable rows', () => {
  const structure = read('db/migrations/20261120_school_academic_structure.sql');
  const versions = read('db/migrations/20261120_timetable_versioning.sql');
  assert.match(structure, /school_subject_offerings/);
  assert.match(structure, /NOT APPLIED/);
  assert.equal(structure.includes('INSERT'), false);
  assert.match(versions, /PROPOSAL ONLY/);
  assert.equal(versions.includes('UPDATE timetables'), false);
  assert.equal(versions.includes('DELETE FROM timetables'), false);
});
