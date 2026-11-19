'use strict';

function finiteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function percentageFromMark(row) {
  if (!row) return null;
  const direct = finiteNumber(row.percentage);
  if (direct !== null) return direct;
  const score = finiteNumber(row.score);
  const max = finiteNumber(row.max_score);
  if (score === null || max === null || max <= 0) return null;
  return Math.round((score / max) * 100);
}

function observedMarkSummary(entries) {
  const recorded = (entries || []).filter((entry) => finiteNumber(entry && entry.score) !== null)
    .map((entry) => ({ subject: entry.subject, score: finiteNumber(entry.score) }));
  if (!recorded.length) {
    return {
      prediction_available: false,
      official_result: false,
      source: 'recorded_marks',
      recorded_marks: [],
      missing_marks: [],
      observed_average: null,
      message: 'No recorded marks are available, so no prediction was produced.'
    };
  }
  const average = Math.round(recorded.reduce((sum, entry) => sum + entry.score, 0) / recorded.length);
  return {
    prediction_available: false,
    official_result: false,
    source: 'recorded_marks',
    recorded_marks: recorded,
    observed_average: average,
    message: 'This is the average of recorded marks only. It is not a model prediction, an official mark, or a promotion decision.'
  };
}

function unavailablePrediction(message, extra = {}) {
  return {
    prediction_available: false,
    official_result: false,
    source: 'not_produced',
    career_recommendations: null,
    stream_selection: null,
    performance_prediction: null,
    at_risk_assessment: null,
    predicted_score: null,
    risk_tier: null,
    message,
    ...extra
  };
}

const ADVISOR_FIELDS = [
  ['math_score', 'Mathematics'],
  ['physics_score', 'Physical Sciences'],
  ['chemistry_score', 'Chemistry'],
  ['biology_score', 'Life Sciences'],
  ['english_score', 'English'],
  ['history_score', 'History'],
  ['geography_score', 'Geography'],
  ['ems_score', 'EMS'],
  ['natural_sciences_score', 'Natural Sciences']
];

function advisorEvidence(input) {
  const source = input || {};
  const recorded = [];
  const missing = [];
  ADVISOR_FIELDS.forEach(([key, label]) => {
    if (!Object.prototype.hasOwnProperty.call(source, key)) return;
    const score = finiteNumber(source[key]);
    if (score === null) missing.push(label);
    else recorded.push({ subject: label, score });
  });
  return { recorded, missing, sufficient: recorded.length > 0 && missing.length === 0 };
}

function gelezaInputs(input) {
  const source = input || {};
  const attendance = finiteNumber(source.Attendance);
  const hours = finiteNumber(source.Hours_Studied);
  const previous = finiteNumber(source.Previous_Scores);
  const missing = [];
  if (attendance === null) missing.push('attendance');
  if (hours === null) missing.push('study hours');
  if (previous === null) missing.push('previous marks');
  return { attendance, hours, previous, complete: missing.length === 0, missing };
}

module.exports = {
  finiteNumber,
  percentageFromMark,
  observedMarkSummary,
  unavailablePrediction,
  advisorEvidence,
  gelezaInputs
};
