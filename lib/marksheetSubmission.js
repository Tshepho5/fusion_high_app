'use strict';

function submissionStatus({ enrolledCount, markCount, locked }) {
  if (locked) return 'SUBMITTED';
  if (Number(markCount) > 0) return 'PARTIAL';
  if (Number(enrolledCount) > 0) return 'PENDING';
  return 'PENDING';
}

function blankMarksExcluded(rows) {
  return (Array.isArray(rows) ? rows : []).filter((row) => {
    const value = row && (row.mark_obtained !== undefined ? row.mark_obtained : row.score);
    return value !== '' && value !== null && value !== undefined;
  });
}

module.exports = { submissionStatus, blankMarksExcluded };
