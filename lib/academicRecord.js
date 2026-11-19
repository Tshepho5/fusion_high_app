'use strict';

const { finiteNumber } = require('./academicEvidence');

function describeRecordedMarks(entries) {
  const bySubject = new Map();
  (entries || []).forEach((entry) => {
    const score = finiteNumber(entry && entry.score);
    const subject = String(entry && entry.subject || '').trim();
    if (!subject || score === null) return;
    const scores = bySubject.get(subject) || [];
    scores.push(score);
    bySubject.set(subject, scores);
  });

  const observations = [...bySubject.entries()].map(([subject, scores]) => {
    const latest = scores[0];
    const previous = scores[1];
    let trend = null;
    if (previous !== undefined) {
      if (latest > previous + 2) trend = 'up';
      else if (latest < previous - 2) trend = 'down';
      else trend = 'steady';
    }
    return { subject, latest, previous: previous === undefined ? null : previous, trend };
  });

  return {
    observations,
    stronger_subjects: observations.filter((item) => item.latest >= 70).map((item) => item.subject),
    subjects_needing_support: observations.filter((item) => item.latest < 50).map((item) => item.subject),
    official_result: false,
    message: 'These notes describe recorded marks. They are not a diagnosis, a prediction, or an official result.'
  };
}

module.exports = { describeRecordedMarks };
