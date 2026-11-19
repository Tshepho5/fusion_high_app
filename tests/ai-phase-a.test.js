'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { canReadLearnerRecord, canReadClass, automationSchoolId, trustedActor } = require('../lib/aiAccess');
const { observedMarkSummary, unavailablePrediction, percentageFromMark, gelezaInputs } = require('../lib/academicEvidence');
const { buildDocumentInspection } = require('../lib/documentInspection');
const { evaluateRecordedSubjects } = require('../lib/nscEvidence');
const { getFallbackPrediction } = require('../public/src/services/aiAdvisorService');

describe('AI phase A access and evidence', () => {
  const learner = { id: 10, school_id: 2, class_id: 4, learner_user_id: 10, parent_id: 20 };
  const otherLearner = { id: 11, school_id: 3, class_id: 8, learner_user_id: 11, parent_id: 21 };

  test('a learner cannot take a teacher or principal role from the request', () => {
    const actor = trustedActor({ id: 10, role: 'learner', school_id: 2 });
    assert.equal(actor.role, 'learner');
    assert.equal(canReadLearnerRecord({ ...actor, role: 'teacher' }, otherLearner, { teachesClass: true }), false);
    assert.equal(canReadLearnerRecord(actor, otherLearner, {}), false);
  });

  test('a parent can read only a linked child', () => {
    const parent = { id: 20, role: 'parent', school_id: 2 };
    assert.equal(canReadLearnerRecord(parent, learner, { parentLinked: true }), true);
    assert.equal(canReadLearnerRecord(parent, otherLearner, { parentLinked: false }), false);
  });

  test('a teacher cannot read a learner outside an assigned class', () => {
    const teacher = { id: 30, role: 'teacher', school_id: 2 };
    assert.equal(canReadLearnerRecord(teacher, learner, { teachesClass: false }), false);
    assert.equal(canReadLearnerRecord(teacher, learner, { teachesClass: true }), true);
    assert.equal(canReadLearnerRecord(teacher, otherLearner, { teachesClass: true }), false);
  });

  test('a school administrator stays inside their school', () => {
    const admin = { id: 40, role: 'admin', school_id: 2 };
    assert.equal(canReadLearnerRecord(admin, learner, {}), true);
    assert.equal(canReadLearnerRecord(admin, otherLearner, {}), false);
  });

  test('a superadmin does not receive learner records from the role alone', () => {
    const executive = { id: 1, role: 'admin', school_id: null, is_superadmin: true };
    assert.equal(canReadLearnerRecord(executive, learner, {}), false);
    assert.equal(canReadClass(executive, { id: 4, school_id: 2 }, true), false);
  });

  test('a missing school does not become school 1', () => {
    assert.equal(trustedActor({ id: 5, role: 'admin', school_id: null }).school_id, null);
    assert.equal(automationSchoolId({ id: 5, role: 'admin' }), null);
    assert.equal(automationSchoolId({ id: 9, role: 'learner', school_id: 2 }), null);
    assert.equal(automationSchoolId({ id: 8, role: 'teacher', school_id: 2 }), 2);
  });

  test('missing marks stay missing', () => {
    const summary = observedMarkSummary([
      { subject: 'Mathematics', score: 62 },
      { subject: 'History', score: null }
    ]);
    assert.equal(summary.recorded_marks.length, 1);
    assert.equal(summary.prediction_available, false);
    assert.equal(summary.official_result, false);
    assert.equal(percentageFromMark({ score: null, max_score: 100 }), null);
    assert.equal(percentageFromMark({ score: '', max_score: 100 }), null);
  });

  test('an unavailable model does not invent a result', () => {
    const result = unavailablePrediction('The model is unavailable.');
    assert.equal(result.prediction_available, false);
    assert.equal(result.predicted_score, null);
    assert.equal(result.performance_prediction, null);
    const fallback = getFallbackPrediction({ math_score: null });
    assert.equal(fallback.prediction_available, false);
    assert.equal(fallback.career_recommendations, null);
    assert.equal(gelezaInputs({ Attendance: null, Hours_Studied: 10, Previous_Scores: 60 }).complete, false);
  });

  test('unreadable documents are not certified', () => {
    const unread = buildDocumentInspection({ extractedText: '' });
    assert.equal(unread.status, 'extraction_failed');
    assert.equal(unread.is_authentic, false);
    assert.equal(unread.clarity_score, null);
    assert.equal(unread.extracted_text_preview, '');
    assert.equal(/certified/i.test(JSON.stringify(unread)), false);

    const read = buildDocumentInspection({
      extractedText: 'Application copy for a learner. Identity number 8001015009087.',
      declaredData: { id_number: '8001015009087' }
    });
    assert.equal(read.status, 'text_extracted');
    assert.equal(read.authenticity_proven, false);
    assert.equal(read.official_decision, false);
  });

  test('a short mark list is an incomplete record, not a failed pass', () => {
    const result = evaluateRecordedSubjects([{ subject: 'Mathematics', score: 30 }]);
    assert.equal(result.passLevel, 'Incomplete record');
    assert.equal(result.atRisk, null);
  });
});
