'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateLearner, classAverage } = require('../lib/academicCalculation');

test('different assessment totals become one percentage from the combined total', () => {
  const result = calculateLearner([
    { name: 'Test 1', score: 35, maximum: 50 },
    { name: 'Test 2', score: 72, maximum: 100 },
    { name: 'Practical', score: 18, maximum: 20 }
  ], 'total_marks');
  assert.equal(result.status, 'complete');
  assert.equal(result.percentage, 73.53);
});

test('explicit weights use each assessment maximum instead of adding the raw marks', () => {
  const result = calculateLearner([
    { name: 'Test 1', score: 35, maximum: 50, weight: 40 },
    { name: 'Test 2', score: 72, maximum: 100, weight: 40 },
    { name: 'Practical', score: 18, maximum: 20, weight: 20 }
  ], 'explicit_weights');
  assert.equal(result.status, 'complete');
  assert.equal(result.percentage, 74.8);
});

test('a missing mark is not treated as zero and blocks the average', () => {
  const learner = calculateLearner([
    { name: 'Test 1', score: 35, maximum: 50 },
    { name: 'Test 2', score: null, maximum: 100 }
  ], 'total_marks');
  assert.equal(learner.status, 'incomplete');
  assert.equal(learner.percentage, null);
  const summary = classAverage([
    { status: 'complete', percentage: 80 },
    learner
  ]);
  assert.equal(summary.status, 'incomplete');
  assert.equal(summary.average, null);
});

test('the selected 40 and 60 policy is applied only to complete SBA and examination groups', () => {
  const result = calculateLearner([
    { name: 'Test', score: 40, maximum: 50, category: 'sba' },
    { name: 'Exam', score: 70, maximum: 100, category: 'exam' }
  ], 'sba_exam');
  assert.equal(result.percentage, 74);
});
