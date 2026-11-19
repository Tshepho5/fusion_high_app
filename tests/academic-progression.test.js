'use strict';
require('./safety/blockLiveEffects');

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { reviewFacts, enrolmentFromDecision, decisionAllowed } = require('../lib/academicProgression');

test('incomplete results stay pending and are not promoted', () => {
  const facts = reviewFacts([1, 2, 3]);
  assert.equal(facts.results_complete, false);
  assert.deepEqual(facts.missing_terms, [4]);
  assert.equal(facts.recommended_outcome, null);
  assert.equal(decisionAllowed('promote', false).ok, false);
  assert.equal(decisionAllowed('repeat', false).ok, false);
  assert.equal(decisionAllowed('pending', false).ok, true);
});

test('an approved promotion prepares the next grade and a repeat stays', () => {
  const promoted = enrolmentFromDecision(10, 'promote');
  assert.equal(promoted.create_enrolment, true);
  assert.equal(promoted.next_grade, 11);
  assert.equal(promoted.status, 'promoted');
  const repeating = enrolmentFromDecision(10, 'repeat');
  assert.equal(repeating.next_grade, 10);
  assert.equal(repeating.status, 'repeating');
  const finished = enrolmentFromDecision(12, 'promote');
  assert.equal(finished.create_enrolment, false);
  assert.equal(finished.status, 'completed');
});

test('pending, transfer, and withdrawal do not create another enrolment', () => {
  for (const decision of ['pending', 'transferred', 'withdrawn']) {
    const plan = enrolmentFromDecision(9, decision);
    assert.equal(plan.create_enrolment, false);
    assert.equal(plan.next_grade, null);
  }
});
