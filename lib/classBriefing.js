'use strict';

const { finiteNumber } = require('./academicEvidence');

function classifyBriefingRow(row) {
  const score = finiteNumber(row && row.predicted_score);
  const total = finiteNumber(row && row.total_attendance);
  const present = finiteNumber(row && row.present_attendance);
  const attendance = total !== null && total > 0 && present !== null
    ? Math.round((present / total) * 100)
    : null;
  const priority = (score !== null && score <= 65) || (attendance !== null && attendance < 75);
  let tier = 'insufficient';
  if (score !== null || attendance !== null) {
    if (priority) tier = 'priority';
    else if (score !== null && score < 80) tier = 'core';
    else if (score !== null) tier = 'high';
    else tier = 'recorded';
  }
  return { score, attendance, priority, tier };
}

function summariseBriefing(rows) {
  const classified = (rows || []).map((row) => ({ row, ...classifyBriefingRow(row) }));
  const priority = classified.filter((item) => item.tier === 'priority');
  const insufficient = classified.filter((item) => item.tier === 'insufficient');
  return {
    total: classified.length,
    priority_support_count: priority.length,
    core_progress_count: classified.filter((item) => item.tier === 'core').length,
    high_achiever_count: classified.filter((item) => item.tier === 'high').length,
    insufficient_count: insufficient.length,
    priority_students: priority.map((item) => ({
      child_id: item.row.child_id,
      name: `${item.row.full_name || ''} ${item.row.surname || ''}`.trim(),
      predicted_score: item.score,
      attendance_pct: item.attendance,
      nudge: Array.isArray(item.row.actionable_nudges) ? item.row.actionable_nudges[0] : null
    })),
    official_result: false
  };
}

module.exports = { classifyBriefingRow, summariseBriefing };
