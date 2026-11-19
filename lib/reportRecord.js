'use strict';

const { finiteNumber } = require('./academicEvidence');
const { termIndex, yearFromTerm } = require('./reportTerm');

function boundedRecordedMark(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.min(100, Math.max(0, Math.round(number)));
}

function subjectEntries(subjects) {
  if (Array.isArray(subjects)) {
    return subjects.flatMap((entry) => {
      const subject = String(entry && (entry.subject || entry.name) || '').trim();
      if (!subject) return [];
      const source = entry.mark !== undefined ? entry.mark : entry.score;
      return [{
        subject,
        mark: boundedRecordedMark(source),
        assessments: Array.isArray(entry.assessments) ? entry.assessments : []
      }];
    });
  }
  if (subjects && typeof subjects === 'object') {
    return Object.entries(subjects).map(([subject, mark]) => ({
      subject,
      mark: boundedRecordedMark(mark),
      assessments: []
    }));
  }
  return [];
}

function recordedAverage(entries) {
  const marks = (entries || []).map((entry) => entry.mark).filter((mark) => mark !== null);
  if (!marks.length) return null;
  return Math.round(marks.reduce((sum, mark) => sum + mark, 0) / marks.length);
}

function reportIsComplete(entries) {
  return Array.isArray(entries) && entries.length > 0 && entries.every((entry) => entry.mark !== null);
}

function reportPeriod(body) {
  const source = body || {};
  const yearField = finiteNumber(source.academic_year !== undefined && source.academic_year !== '' ? source.academic_year : source.academicYear);
  const year = yearField !== null ? yearField : yearFromTerm(source.term);
  const grade = finiteNumber(source.grade);
  return {
    term: termIndex(source.term),
    academicYear: year !== null ? Math.round(Number(year)) : null,
    grade: grade !== null ? Math.round(grade) : null
  };
}

function termResultLabel(termNumber, average, complete) {
  const term = Number(termNumber);
  const score = Number(average);
  if (![1, 2, 3, 4].includes(term) || !complete || !Number.isFinite(score)) return '-';
  const passed = score >= 40;
  if (term === 4) return passed ? 'Promoted' : 'Not Promoted';
  return passed ? 'Achieved' : 'Not Achieved';
}

function reportLearnerRows(body) {
  const source = body || {};
  if (Array.isArray(source.learners_reports)) return source.learners_reports;
  if (Array.isArray(source.learners)) return source.learners;
  if (Array.isArray(source.records)) return source.records;
  return [];
}

module.exports = {
  boundedRecordedMark,
  subjectEntries,
  recordedAverage,
  reportIsComplete,
  reportPeriod,
  reportLearnerRows,
  termResultLabel
};
