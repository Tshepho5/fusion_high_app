'use strict';

function clean(value) {
  return String(value == null ? '' : value).trim();
}

function sameSubject(left, right) {
  return clean(left).toLowerCase() === clean(right).toLowerCase();
}

function enrolledInSubject(subjects, subject) {
  const wanted = clean(subject).toLowerCase();
  if (!wanted) return false;
  return (Array.isArray(subjects) ? subjects : []).some((item) => clean(item).toLowerCase() === wanted);
}

function enrolmentSql(subjectParam) {
  return `EXISTS (
    SELECT 1
    FROM unnest(COALESCE(c.subjects, ARRAY[]::text[])) AS enrolled(subject_name)
    WHERE LOWER(enrolled.subject_name) = LOWER($${subjectParam})
  )`;
}

function validateMark(score, maximum) {
  if (score === '' || score === null || score === undefined) {
    return { ok: false, reason: 'Enter a mark or leave the learner blank.' };
  }
  const value = Number(score);
  const max = Number(maximum);
  if (!Number.isFinite(value)) return { ok: false, reason: 'Enter a mark or leave the learner blank.' };
  if (!Number.isFinite(max) || max <= 0) return { ok: false, reason: 'The assessment total must be greater than zero.' };
  if (value < 0) return { ok: false, reason: 'A mark cannot be negative.' };
  if (value > max) return { ok: false, reason: 'A mark cannot be higher than the assessment total.' };
  return { ok: true, score: value, maximum: max };
}

function teacherCovers({ assignments, employee, subject, grade, className }) {
  const wanted = clean(subject).toLowerCase();
  if (!wanted) return false;
  const gradeNumber = Number(grade);
  const classWanted = clean(className).toLowerCase();
  const classIsSpecific = classWanted && classWanted !== 'all' && !/^\d+$/.test(classWanted);
  const rows = Array.isArray(assignments) ? assignments : [];
  const assigned = rows.some((row) => {
    if (clean(row.subject_name).toLowerCase() !== wanted) return false;
    if (Number.isInteger(gradeNumber) && Number(row.grade_level) !== gradeNumber) return false;
    if (!classIsSpecific) return true;
    const rowClass = clean(row.class_name).toLowerCase();
    return rowClass === classWanted || String(row.class_id || '') === classWanted;
  });
  if (assigned) return true;
  const subjects = Array.isArray(employee && employee.subjects) ? employee.subjects : [];
  const grades = Array.isArray(employee && employee.grades_taught) ? employee.grades_taught.map(Number) : [];
  const classes = Array.isArray(employee && employee.classes_taught) ? employee.classes_taught.map((item) => clean(item).toLowerCase()) : [];
  const subjectMatch = subjects.some((item) => clean(item).toLowerCase() === wanted);
  const gradeMatch = !Number.isInteger(gradeNumber) || grades.length === 0 || grades.includes(gradeNumber);
  const classMatch = !classIsSpecific || classes.length === 0 || classes.includes(classWanted);
  return subjectMatch && gradeMatch && classMatch;
}

module.exports = {
  sameSubject,
  enrolledInSubject,
  enrolmentSql,
  validateMark,
  teacherCovers
};
