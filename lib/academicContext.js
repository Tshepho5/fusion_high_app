'use strict';

function parseTerm(value) {
  if (value === undefined || value === null || value === '') {
    return { ok: false, message: 'Choose a term from 1 to 4.' };
  }
  const term = Number(value);
  if (!Number.isInteger(term) || term < 1 || term > 4) {
    return { ok: false, message: 'Choose a term from 1 to 4.' };
  }
  return { ok: true, term };
}

function parseAcademicYear(value) {
  if (value === undefined || value === null || value === '') {
    return { ok: false, message: 'Choose an academic year.' };
  }
  const year = Number(value);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return { ok: false, message: 'Choose an academic year.' };
  }
  return { ok: true, year };
}

function parseGrade(value) {
  if (value === undefined || value === null || value === '') {
    return { ok: false, message: 'Choose the learner grade.' };
  }
  const grade = Number(value);
  if (!Number.isInteger(grade) || grade < 1 || grade > 12) {
    return { ok: false, message: 'Choose a grade from 1 to 12.' };
  }
  return { ok: true, grade };
}

module.exports = { parseTerm, parseAcademicYear, parseGrade };
