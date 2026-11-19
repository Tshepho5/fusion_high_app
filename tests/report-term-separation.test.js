'use strict';
require('./safety/blockLiveEffects');

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { termIndex, markPercentage, markBelongsToYear } = require('../lib/reportTerm');

test('a term stored with its year stays that term', () => {
  assert.equal(termIndex('Term 3 2026'), 3);
  assert.equal(termIndex('Term 4 2026'), 4);
  assert.equal(termIndex(3), 3);
  assert.equal(termIndex('32026'), 3);
  assert.notEqual(termIndex('Term 3 2026'), termIndex('Term 4 2026'));
});

test('a 2026 mark is not used as a 2027 mark', () => {
  assert.equal(markBelongsToYear({ academic_year: 2026, term: 4, score: 70 }, 2026), true);
  assert.equal(markBelongsToYear({ academic_year: 2026, term: 4, score: 70 }, 2027), false);
  assert.equal(markBelongsToYear({ academic_year: null, term: 'Term 3 2026', score: 61 }, 2027), false);
  assert.equal(markBelongsToYear({ academic_year: null, term: 3, score: 61 }, 2026), true);
});

test('a blank mark is not a zero and a real zero stays zero', () => {
  assert.equal(markPercentage({ score: null, max_score: 100 }), null);
  assert.equal(markPercentage({ score: '', max_score: 100 }), null);
  assert.equal(markPercentage({ score: 0, max_score: 100 }), 0);
  assert.equal(markPercentage({ score: 40, max_score: 80 }), 50);
});
