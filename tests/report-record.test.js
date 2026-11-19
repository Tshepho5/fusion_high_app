'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  boundedRecordedMark,
  subjectEntries,
  recordedAverage,
  reportIsComplete,
  reportPeriod,
  reportLearnerRows,
  termResultLabel
} = require('../lib/reportRecord');

describe('report records keep blank marks blank', () => {
  test('a blank mark is not stored as zero', () => {
    assert.equal(boundedRecordedMark(''), null);
    assert.equal(boundedRecordedMark(null), null);
    assert.equal(boundedRecordedMark(0), 0);
    assert.equal(boundedRecordedMark(81.6), 82);
  });

  test('the studio subject map and an older subject list both keep blanks out of the average', () => {
    const fromStudio = subjectEntries({ Mathematics: 80, History: null });
    const fromList = subjectEntries([
      { subject: 'Mathematics', mark: 80 },
      { subject: 'History', mark: '' }
    ]);
    assert.equal(recordedAverage(fromStudio), 80);
    assert.equal(reportIsComplete(fromStudio), false);
    assert.equal(recordedAverage(fromList), 80);
    assert.deepEqual(fromList.map((entry) => entry.mark), [80, null]);
  });

  test('a save accepts the year and learner list sent by the report screen', () => {
    const period = reportPeriod({ term: 'Term 4', academicYear: '2026', grade: '10' });
    const rows = reportLearnerRows({ learners: [{ child_id: 4 }] });
    assert.equal(period.term, 4);
    assert.equal(period.academicYear, 2026);
    assert.equal(period.grade, 10);
    assert.equal(rows.length, 1);
  });

  test('terms 1 to 3 say achieved and term 4 says promoted', () => {
    assert.equal(termResultLabel(1, 40, true), 'Achieved');
    assert.equal(termResultLabel(2, 39, true), 'Not Achieved');
    assert.equal(termResultLabel(3, 70, false), '-');
    assert.equal(termResultLabel(4, 40, true), 'Promoted');
    assert.equal(termResultLabel(4, 39, true), 'Not Promoted');
    assert.equal(termResultLabel(4, 80, false), '-');
  });

  test('a term label keeps its year and a bare term does not receive one', () => {
    assert.equal(reportPeriod({ term: 'Term 4 2026' }).academicYear, 2026);
    assert.equal(reportPeriod({ term: 'Term 4' }).academicYear, null);
  });
});
