'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { subjectiveHomeworkReview } = require('../lib/homeworkReview');
const { assessmentDraft } = require('../lib/assessmentDraft');
const { describeRecordedMarks } = require('../lib/academicRecord');
const { compareExtractedDocument } = require('../lib/admissionDocumentCheck');
const { calculateAps } = require('../public/src/services/careerAdvisorService');
const { loadedTutorGrade } = require('../lib/tutorGrade');

describe('AI phase C academic honesty', () => {
  test('a written homework answer does not receive an invented score', () => {
    const review = subjectiveHomeworkReview({
      submissionText: 'This is a long essay with more than enough words to look complete and thorough for an automatic marker.',
      fileName: 'essay.pdf'
    });
    assert.equal(review.ai_score, null);
    assert.equal(review.score_recorded, false);
    assert.equal(review.official_mark, false);
    assert.equal(review.scoring_method, 'teacher_review');
  });

  test('an incomplete mark list is not labelled as a pass', () => {
    const result = calculateAps([
      { subject: 'Mathematics', mark: 80 },
      { subject: 'Physical Sciences', mark: null }
    ]);
    assert.equal(result.nscPassType, 'Incomplete record');
    assert.equal(result.official_result, false);
    assert.equal(result.subjectBreakdown.length, 1);
  });

  test('a paper draft reports when the question marks do not add up', () => {
    const draft = assessmentDraft({
      requestedTotal: 10,
      text: 'Question 1 [2]\nQuestion 2 [3]'
    });
    assert.equal(draft.status, 'draft');
    assert.equal(draft.official, false);
    assert.equal(draft.caps_verified, false);
    assert.equal(draft.marks_consistent, false);
    assert.equal(draft.summed_marks, 5);
  });

  test('recorded marks describe a trend without a prediction', () => {
    const notes = describeRecordedMarks([
      { subject: 'Mathematics', score: 72 },
      { subject: 'Mathematics', score: 60 },
      { subject: 'History', score: 40 }
    ]);
    assert.equal(notes.observations[0].trend, 'up');
    assert.deepEqual(notes.stronger_subjects, ['Mathematics']);
    assert.deepEqual(notes.subjects_needing_support, ['History']);
    assert.equal(notes.official_result, false);
  });

  test('the tutor uses a note only for a grade that has a loaded file', () => {
    assert.equal(loadedTutorGrade(null, [10, 12]), null);
    assert.equal(loadedTutorGrade(11, [12]), null);
    assert.equal(loadedTutorGrade(9, [10, 12]), null);
    assert.equal(loadedTutorGrade(12, [12]), '12');
  });

  test('an admission document is compared locally and is not treated as verified', () => {
    const check = compareExtractedDocument({
      text: 'Birth record for another family name and a different number.',
      surname: 'Dlamini',
      idNumber: '0501015800081'
    });
    assert.equal(check.model_called, false);
    assert.equal(check.surname_present, false);
    assert.equal(check.id_present, false);
  });
});
