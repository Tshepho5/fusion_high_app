'use strict';

const DECISIONS = ['promote', 'repeat', 'pending', 'transferred', 'withdrawn'];
const REQUIRED_TERMS = [1, 2, 3, 4];

function reviewFacts(termsPresent) {
  const present = new Set((termsPresent || []).map(Number));
  const missing = REQUIRED_TERMS.filter((term) => !present.has(term));
  return {
    results_complete: missing.length === 0,
    missing_terms: missing,
    recommended_outcome: null
  };
}

function enrolmentFromDecision(grade, decision) {
  if (!DECISIONS.includes(decision)) {
    return { ok: false, error: 'Choose promote, repeat, pending, transferred, or withdrawn.' };
  }
  const current = Number(grade);
  if (!Number.isInteger(current) || current < 1 || current > 12) {
    return { ok: false, error: 'This learner does not have a valid grade.' };
  }
  if (decision === 'pending') {
    return { ok: true, create_enrolment: false, next_grade: null, status: 'pending' };
  }
  if (decision === 'transferred' || decision === 'withdrawn') {
    return { ok: true, create_enrolment: false, next_grade: null, status: decision };
  }
  if (decision === 'repeat') {
    return { ok: true, create_enrolment: true, next_grade: current, status: 'repeating' };
  }
  if (current >= 12) {
    return { ok: true, create_enrolment: false, next_grade: null, status: 'completed' };
  }
  return { ok: true, create_enrolment: true, next_grade: current + 1, status: 'promoted' };
}

function decisionAllowed(decision, resultsComplete) {
  if (resultsComplete) return { ok: true };
  if (decision === 'promote' || decision === 'repeat') {
    return { ok: false, error: 'Promotion or repetition needs a mark in every term. Record this learner as pending until the results are complete.' };
  }
  return { ok: true };
}

module.exports = {
  DECISIONS,
  REQUIRED_TERMS,
  reviewFacts,
  enrolmentFromDecision,
  decisionAllowed
};
