'use strict';

const { finiteNumber } = require('./academicEvidence');

function levelFor(score) {
  if (score >= 80) return 7;
  if (score >= 70) return 6;
  if (score >= 60) return 5;
  if (score >= 50) return 4;
  if (score >= 40) return 3;
  if (score >= 30) return 2;
  return 1;
}

/**
 * Uses only marks that were actually recorded.
 * A missing subject is not treated as zero, and a missing home-language mark is not treated as 50.
 */
function evaluateRecordedSubjects(subjectMarks) {
  const scoredSubjects = (subjectMarks || [])
    .map((entry) => ({ subject: entry.subject, score: finiteNumber(entry.score) }))
    .filter((entry) => entry.subject && entry.score !== null)
    .map((entry) => ({ ...entry, level: levelFor(entry.score) }));

  if (!scoredSubjects.length) {
    return {
      passLevel: 'Incomplete record',
      apsScore: null,
      atRisk: null,
      failedGateways: [],
      interventions: [],
      scoredSubjects: []
    };
  }

  const homeLanguage = scoredSubjects.find((entry) => entry.subject.toLowerCase().includes('home language'));
  const withoutLifeOrientation = scoredSubjects.filter((entry) => !entry.subject.toLowerCase().includes('life orientation'));
  const count50 = withoutLifeOrientation.filter((entry) => entry.score >= 50).length;
  const count40 = withoutLifeOrientation.filter((entry) => entry.score >= 40).length;
  const count30 = scoredSubjects.filter((entry) => entry.score >= 30).length;
  const failedGateways = scoredSubjects
    .filter((entry) => entry.score < 40 && /math|physical science|accounting|life science|home language/.test(entry.subject.toLowerCase()))
    .map((entry) => `${entry.subject} (${entry.score}%)`);

  if (!homeLanguage || scoredSubjects.length < 6) {
    return {
      passLevel: 'Incomplete record',
      apsScore: scoredSubjects.reduce((sum, entry) => sum + entry.level, 0),
      atRisk: null,
      failedGateways,
      interventions: [],
      scoredSubjects
    };
  }

  let passLevel = 'Did Not Meet Minimums';
  let atRisk = false;
  if (homeLanguage.score >= 40 && count50 >= 4 && count30 >= 6) passLevel = "Bachelor's Degree Pass";
  else if (homeLanguage.score >= 40 && count40 >= 4 && count30 >= 5) passLevel = 'Diploma Pass';
  else if (homeLanguage.score >= 40 && count40 >= 2 && count30 >= 5) passLevel = 'Higher Certificate Pass';
  else {
    passLevel = 'At Risk / Non-Pass';
    atRisk = true;
  }

  return {
    passLevel,
    apsScore: scoredSubjects.reduce((sum, entry) => sum + entry.level, 0),
    atRisk: atRisk || failedGateways.length > 0,
    failedGateways,
    interventions: [],
    scoredSubjects
  };
}

module.exports = { evaluateRecordedSubjects };
