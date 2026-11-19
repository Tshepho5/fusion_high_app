'use strict';

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function present(value) {
  return value !== null && value !== undefined && value !== '';
}

/**
 * policy:
 *   total_marks — obtained divided by the possible total
 *   explicit_weights — each mark's share of its own total, multiplied by its weight
 *   sba_exam — 40 percent SBA and 60 percent examination, only when that policy is selected
 * A missing mark stays missing. It is not counted as zero.
 */
function calculateLearner(assessments, policy) {
  const rows = (Array.isArray(assessments) ? assessments : []).filter((row) => row && row.included !== false);
  const missing = rows.filter((row) => !present(row.score)).map((row) => row.name || 'Assessment');
  if (!rows.length) return { status: 'incomplete', percentage: null, missing: [], method: policy };
  if (missing.length) return { status: 'incomplete', percentage: null, missing, method: policy };

  if (policy === 'explicit_weights') {
    let total = 0;
    for (const row of rows) {
      const max = Number(row.maximum);
      const weight = Number(row.weight);
      if (!Number.isFinite(max) || max <= 0 || !Number.isFinite(weight)) {
        return { status: 'invalid', percentage: null, missing: [], method: policy, reason: 'Each weighted assessment needs a maximum and a weight.' };
      }
      total += (Number(row.score) / max) * weight;
    }
    return { status: 'complete', percentage: round2(total), missing: [], method: policy };
  }

  if (policy === 'sba_exam') {
    const exams = rows.filter((row) => row.category === 'exam');
    const sba = rows.filter((row) => row.category !== 'exam');
    const sbaResult = sba.length ? calculateLearner(sba, 'total_marks') : { status: 'incomplete', percentage: null };
    const examResult = exams.length ? calculateLearner(exams, 'total_marks') : { status: 'incomplete', percentage: null };
    if (sbaResult.status !== 'complete' || examResult.status !== 'complete') {
      return { status: 'incomplete', percentage: null, missing, method: policy };
    }
    return {
      status: 'complete',
      percentage: round2((sbaResult.percentage * 0.4) + (examResult.percentage * 0.6)),
      missing: [],
      method: policy
    };
  }

  const obtained = rows.reduce((sum, row) => sum + Number(row.score), 0);
  const possible = rows.reduce((sum, row) => sum + Number(row.maximum), 0);
  if (!Number.isFinite(possible) || possible <= 0) {
    return { status: 'invalid', percentage: null, missing: [], method: 'total_marks', reason: 'The assessment total must be greater than zero.' };
  }
  return { status: 'complete', percentage: round2((obtained / possible) * 100), missing: [], method: 'total_marks' };
}

function classAverage(learnerResults) {
  const complete = (Array.isArray(learnerResults) ? learnerResults : []).filter((row) => row.status === 'complete' && row.percentage !== null);
  const incomplete = (Array.isArray(learnerResults) ? learnerResults : []).filter((row) => row.status !== 'complete');
  if (!complete.length || incomplete.length) {
    return { status: 'incomplete', average: null, complete: complete.length, incomplete: incomplete.length };
  }
  const average = round2(complete.reduce((sum, row) => sum + row.percentage, 0) / complete.length);
  return { status: 'complete', average, complete: complete.length, incomplete: 0 };
}

module.exports = { round2, calculateLearner, classAverage };
