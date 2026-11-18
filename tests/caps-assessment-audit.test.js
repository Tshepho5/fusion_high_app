const test = require('node:test');
const assert = require('node:assert/strict');
const audit = require('../public/src/services/capsAssessmentAudit');

test('a missing mark is not treated as zero', () => {
  const records = audit.mergeRecords(
    [{ id: 1, child_id: 9, subject: 'Mathematics', score: null, max_score: 100, percentage: null, term: 1, assessment_name: 'Test', full_name: 'Thabo', surname: 'Molefe', learner_number: '20260001', learner_grade: 10 }],
    []
  );
  const summary = audit.summarise(records);
  assert.equal(records[0].score, null);
  assert.equal(summary.total_assessments_recorded, 1);
  assert.equal(summary.scored_assessments, 0);
  assert.equal(summary.school_average_mark, null);
  assert.equal(summary.sba_pass_rate, null);
  assert.equal(summary.levels_distribution.level1, 0);
});

test('one scored record is the average, the pass rate, and its achievement level', () => {
  const summary = audit.summarise(audit.mergeRecords(
    [{ id: 2, child_id: 9, subject: 'Mathematics', score: 42, max_score: 50, percentage: null, term: 2, assessment_name: 'Assignment', full_name: 'A', surname: 'B', learner_number: 'L1', learner_grade: 11 }],
    []
  ));
  assert.equal(summary.school_average_mark, 84);
  assert.equal(summary.sba_pass_rate, 100);
  assert.equal(summary.levels_distribution.level7, 1);
});

test('different scores land in different CAPS levels', () => {
  const rows = [82, 74, 63, 55, 44, 33, 12].map((percentage, index) => ({
    id: index + 1,
    child_id: index + 1,
    subject: 'Science',
    percentage,
    term: 1,
    assessment_name: 'Test',
    full_name: 'Learner',
    surname: String(index),
    learner_grade: 10
  }));
  const summary = audit.summarise(audit.mergeRecords(rows, []));
  assert.deepEqual(summary.levels_distribution, {
    level7: 1, level6: 1, level5: 1, level4: 1, level3: 1, level2: 1, level1: 1
  });
  assert.equal(summary.sba_pass_rate, 57);
});

test('a term stored as 32026 is the same Term 3 record as the progress copy', () => {
  const records = audit.mergeRecords(
    [{ id: 1, child_id: 4, subject: 'Physical Sciences', percentage: 84, term: 32026, assessment_name: 'Controlled Test 1', learner_grade: 10 }],
    [{ id: 2, child_id: 4, subject: 'Physical Sciences', grade_percentage: 84, term: 'Term 3 2026', assessment_name: 'Controlled Test 1', learner_grade: 10 }]
  );
  assert.equal(records.length, 1);
  assert.equal(records[0].term, 'Term 3');
  assert.equal(audit.termNumber(32026), 3);
  assert.equal(audit.termNumber('Term 3 2026'), 3);
});

test('a mirrored progress row is not counted twice', () => {
  const records = audit.mergeRecords(
    [{ id: 1, child_id: 4, subject: 'Accounting', percentage: 61, term: 3, assessment_name: 'Project', full_name: 'A', surname: 'B', learner_grade: 10 }],
    [{ id: 8, child_id: 4, subject: 'Accounting', grade_percentage: 61, term: 'Term 3', assessment_name: 'Project (61%)', full_name: 'A', surname: 'B', learner_grade: 10 }]
  );
  assert.equal(records.length, 1);
  assert.equal(records[0].source, 'mark');
});

test('grade, subject, and term filters stay inside the school query', () => {
  const filters = audit.readAuditFilters({ grade: '10', subject: 'Mathematics', term: 'Term 2', search: 'Molefe', school_id: '999' });
  const marks = audit.marksQuery(14, filters);
  const progress = audit.progressQuery(14, filters);
  assert.equal(filters.grade, 10);
  assert.equal(filters.term, 2);
  assert.equal(marks.params[0], 14);
  assert.equal(progress.params[0], 14);
  assert.match(marks.sql, /c\.school_id = \$1/);
  assert.match(progress.sql, /c\.school_id = \$1/);
  assert.doesNotMatch(marks.sql, /school_id IS NULL/);
  assert.doesNotMatch(progress.sql, /school_id IS NULL/);
  assert.equal(marks.params.includes(999), false);
});

test('an unmoderated schedule is not compliant and an empty school has no compliance rate', () => {
  const withMarks = audit.assembleAudit({
    markRows: [{ id: 1, child_id: 3, subject: 'History', percentage: 48, term: 1, assessment_name: 'Test', full_name: 'A', surname: 'B', learner_grade: 12, learner_number: '' }],
    progressRows: [],
    moderationRows: [],
    offeringNames: [],
    termScope: ''
  });
  assert.equal(withMarks.summary.compliance_rate, 0);
  assert.equal(withMarks.subject_schedules[0].moderation_status, 'Not moderated');
  assert.equal(withMarks.records[0].learner_number, '');

  const empty = audit.assembleAudit({ markRows: [], progressRows: [], moderationRows: [], offeringNames: [], termScope: '' });
  assert.equal(empty.summary.total_assessments_recorded, 0);
  assert.equal(empty.summary.school_average_mark, null);
  assert.equal(empty.summary.sba_pass_rate, null);
  assert.equal(empty.summary.compliance_rate, null);
  assert.deepEqual(empty.subjects, []);
});

test('only an approved or verified schedule counts as compliant', () => {
  const rows = [{ id: 1, child_id: 3, subject: 'Geography', percentage: 70, term: 1, assessment_name: 'Test', full_name: 'A', surname: 'B', learner_grade: 10 }];
  const approved = audit.assembleAudit({
    markRows: rows,
    progressRows: [],
    moderationRows: [{ subject: 'Geography', grade: 10, term_label: '', status: 'Approved', moderated_by_name: 'Head' }],
    offeringNames: ['Geography'],
    termScope: ''
  });
  assert.equal(approved.summary.compliance_rate, 100);
  const review = audit.assembleAudit({
    markRows: rows,
    progressRows: [],
    moderationRows: [{ subject: 'Geography', grade: 10, term_label: '', status: 'Under Review' }],
    offeringNames: [],
    termScope: ''
  });
  assert.equal(review.summary.compliance_rate, 0);
  assert.equal(review.summary.sba_pass_rate, 100);
});

test('changing the records changes the summary', () => {
  const before = audit.summarise(audit.mergeRecords(
    [{ id: 1, child_id: 1, subject: 'Math', percentage: 40, term: 1, assessment_name: 'Test', learner_grade: 8 }],
    []
  ));
  const after = audit.summarise(audit.mergeRecords(
    [{ id: 1, child_id: 1, subject: 'Math', percentage: 90, term: 1, assessment_name: 'Test', learner_grade: 8 }],
    []
  ));
  assert.equal(before.sba_pass_rate, 0);
  assert.equal(after.sba_pass_rate, 100);
  assert.equal(before.levels_distribution.level3, 1);
  assert.equal(after.levels_distribution.level7, 1);
});
