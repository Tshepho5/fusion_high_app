'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { assembleClassReadiness } = require('../lib/classReadiness');

const learners = [
  { class_name: '10A', grade: 10, subjects: ['Mathematics', 'Physical Sciences'] },
  { class_name: '10A', grade: 10, subjects: ['Mathematics', 'Physical Sciences'] }
];

test('one submitted subject does not make the class ready for reports', () => {
  const result = assembleClassReadiness({
    learners,
    teachers: [{ subject: 'Mathematics', class_name: '10A', teacher: 'Teacher A' }],
    submissions: [{ subject: 'Mathematics', class_name: '10A', status: 'submitted' }],
    authorizations: [{ subject: 'Mathematics', class_name: '10A', status: 'authorized' }]
  });
  assert.equal(result.ready, false);
  assert.equal(result.classes[0].subjects.find((subject) => subject.subject === 'Physical Sciences').ready, false);
  assert.equal(result.classes[0].subjects.find((subject) => subject.subject === 'Mathematics').ready, true);
});

test('a class is ready only when every enrolled subject has a submission and an authorized average', () => {
  const result = assembleClassReadiness({
    learners,
    teachers: [],
    submissions: [
      { subject: 'Mathematics', class_name: '10A', status: 'submitted' },
      { subject: 'Physical Sciences', class_name: '10A', status: 'submitted' }
    ],
    authorizations: [
      { subject: 'Mathematics', class_name: '10A', status: 'authorized' },
      { subject: 'Physical Sciences', class_name: '10A', status: 'authorized' }
    ]
  });
  assert.equal(result.ready, true);
  assert.equal(result.classes[0].subjects[0].enrolled, 2);
});

test('missing marks stay visible when the subject is otherwise submitted', () => {
  const result = assembleClassReadiness({
    learners,
    teachers: [],
    submissions: [{ subject: 'Mathematics', class_name: '10A', status: 'submitted' }],
    authorizations: [{ subject: 'Mathematics', class_name: '10A', status: 'authorized' }],
    marks: [{ subject: 'Mathematics', class_name: '10A', marked: 1 }]
  });
  const maths = result.classes[0].subjects.find((subject) => subject.subject === 'Mathematics');
  assert.equal(maths.missing_marks, 1);
  assert.equal(result.ready, false);
});

test('an invalidated average keeps the class incomplete', () => {
  const result = assembleClassReadiness({
    learners: [{ class_name: '10A', grade: 10, subjects: ['Mathematics'] }],
    teachers: [],
    submissions: [{ subject: 'Mathematics', class_name: '10A', status: 'submitted' }],
    authorizations: [{ subject: 'Mathematics', class_name: '10A', status: 'invalid' }]
  });
  assert.equal(result.ready, false);
});
