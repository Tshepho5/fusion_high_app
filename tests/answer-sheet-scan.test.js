'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { matchRosterLearner, prepareScan, confirmScan, scanBatch } = require('../lib/answerSheetScan');

const roster = [
  { child_id: 7, learner_number: 'L1007', surname: 'Dlamini' },
  { child_id: 8, learner_number: 'L1008', surname: 'Ndlovu' }
];
const hash = 'a'.repeat(64);

test('a surname without a learner number does not match or create a learner', () => {
  const match = matchRosterLearner({ learnerNumber: '', surname: 'Dlamini', roster });
  assert.equal(match.status, 'mismatch');
  assert.equal(match.child_id, null);
});

test('an unknown learner number stays unmatched', () => {
  const match = matchRosterLearner({ learnerNumber: 'L9999', roster });
  assert.equal(match.status, 'mismatch');
  const prepared = prepareScan({
    match,
    statedMark: 40,
    maximum: 50,
    documentHash: hash,
    existingHashes: [],
    confirmedChildIds: []
  });
  assert.equal(prepared.status, 'mismatch');
  assert.equal(prepared.child_id, null);
  assert.equal(prepared.stated_mark, null);
});

test('a blank reading is not stored as zero and a duplicate sheet is refused', () => {
  const match = matchRosterLearner({ learnerNumber: 'L1007', surname: 'Dlamini', roster });
  const blank = prepareScan({
    match,
    statedMark: '',
    maximum: 50,
    documentHash: hash,
    existingHashes: [],
    confirmedChildIds: []
  });
  assert.equal(blank.status, 'awaiting_verification');
  assert.equal(blank.stated_mark, null);
  const duplicate = prepareScan({
    match,
    statedMark: 38,
    maximum: 50,
    documentHash: hash,
    existingHashes: [hash],
    confirmedChildIds: []
  });
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.status, 'duplicate');
});

test('confirmation accepts only a matched sheet with a mark inside the total', () => {
  const pending = confirmScan({ status: 'awaiting_verification', childId: 7, statedMark: 38, maximum: 50 });
  assert.equal(pending.ok, true);
  assert.equal(pending.score, 38);
  assert.equal(confirmScan({ status: 'mismatch', childId: null, statedMark: 38, maximum: 50 }).ok, false);
  assert.equal(confirmScan({ status: 'awaiting_verification', childId: 7, statedMark: '', maximum: 50 }).ok, false);
  assert.equal(confirmScan({ status: 'awaiting_verification', childId: 7, statedMark: 60, maximum: 50 }).ok, false);
  assert.equal(confirmScan({ status: 'confirmed', childId: 7, statedMark: 38, maximum: 50 }).ok, false);
});

test('a batch stays incomplete until every roster learner has one confirmed sheet', () => {
  const roster = [
    { child_id: 7, learner_number: 'L1007', surname: 'Dlamini' },
    { child_id: 8, learner_number: 'L1008', surname: 'Ndlovu' }
  ];
  const partial = scanBatch({
    roster,
    scans: [{ id: 1, child_id: 7, status: 'awaiting_verification', stated_mark: 38 }]
  });
  assert.equal(partial.complete, false);
  assert.deepEqual(partial.missing.map((row) => row.child_id), [8]);
  assert.deepEqual(partial.confirmable, [1]);
  const done = scanBatch({
    roster,
    scans: [
      { id: 1, child_id: 7, status: 'confirmed', stated_mark: 38 },
      { id: 2, child_id: 8, status: 'confirmed', stated_mark: 40 }
    ]
  });
  assert.equal(done.complete, true);
  assert.equal(done.missing.length, 0);
});

test('a confirmed answer sheet cannot be rejected', () => {
  const { rejectScan } = require('../lib/answerSheetScan');
  assert.equal(rejectScan('confirmed').ok, false);
  assert.equal(rejectScan('awaiting_verification').status, 'rejected');
});

test('the scan route does not read handwriting or create a learner', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '../public/src/controller/teacher/answerSheetController.js'),
    'utf8'
  );
  assert.equal(/ocr|tesseract|vision\.googleapis|openai/i.test(source), false);
  assert.equal(/INSERT INTO children/i.test(source), false);
  assert.match(source, /automatic_reading: false/);
});
