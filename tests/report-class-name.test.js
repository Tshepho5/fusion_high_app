'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveReportClassName } = require('../lib/reportClassName');

test('a grade number is stored as the only class in that grade', () => {
  assert.equal(resolveReportClassName({ requested: '10', classesInGrade: ['10A'] }).className, '10A');
});

test('a grade number is refused when the grade has more than one class', () => {
  const result = resolveReportClassName({ requested: '10', classesInGrade: ['10A', '10B'] });
  assert.equal(result.ok, false);
});
