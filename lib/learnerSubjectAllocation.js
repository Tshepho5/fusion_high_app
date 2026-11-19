'use strict';

function cleanSubject(value) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001F\u007F]/g, '').trim();
}

function uniqueSubjects(values) {
  const seen = new Set();
  const result = [];
  (Array.isArray(values) ? values : []).forEach((value) => {
    const subject = cleanSubject(value);
    const key = subject.toLowerCase();
    if (!subject || seen.has(key)) return;
    seen.add(key);
    result.push(subject);
  });
  return result;
}

function keyOf(value) {
  return cleanSubject(value).toLowerCase();
}

function packageSubjects(subjectPackage) {
  if (Array.isArray(subjectPackage)) return uniqueSubjects(subjectPackage);
  if (subjectPackage && Array.isArray(subjectPackage.subjects)) return uniqueSubjects(subjectPackage.subjects);
  return [];
}

/**
 * Subjects written onto a learner at enrolment.
 * Grades 10–12 use the approved package, then the stored selection.
 * They are never replaced by a school-wide offering list or a hardcoded stream template.
 * Grades 8–9 use a stored selection, then the general curriculum for that grade.
 */
function resolveEnrolmentSubjects({ grade, subjectPackage, selectedSubjects, grade89Catalogue }) {
  const gradeNumber = Number(grade);
  const approved = packageSubjects(subjectPackage);
  const selected = uniqueSubjects(selectedSubjects);
  if (gradeNumber >= 10) {
    if (approved.length) return { subjects: approved, source: 'approved_package' };
    if (selected.length) return { subjects: selected, source: 'stored_selection' };
    return { subjects: [], source: 'unresolved' };
  }
  if (selected.length) return { subjects: selected, source: 'stored_selection' };
  return { subjects: uniqueSubjects(grade89Catalogue), source: 'grade_8_9_curriculum' };
}

/**
 * What a screen may show for one learner.
 * A missing list stays empty. It is not filled from the school's offerings.
 */
function subjectsForDisplay(storedSubjects) {
  return uniqueSubjects(storedSubjects);
}

/**
 * Plan a reversible correction. Subjects that already have marks stay on the learner
 * and are flagged. Nothing is removed when the approved package is unknown.
 */
function planSubjectCorrection({ enrolled, approved, subjectsWithMarks }) {
  const current = uniqueSubjects(enrolled);
  const allowed = uniqueSubjects(approved);
  const marked = new Set(uniqueSubjects(subjectsWithMarks).map(keyOf));
  if (!allowed.length) {
    return {
      status: 'needs_review',
      keep: current,
      missing: [],
      removable: [],
      flagged_with_marks: [],
      reason: 'No approved subject package is recorded for this learner.'
    };
  }
  const allowedKeys = new Set(allowed.map(keyOf));
  const currentKeys = new Set(current.map(keyOf));
  const removable = current.filter((subject) => !allowedKeys.has(keyOf(subject)) && !marked.has(keyOf(subject)));
  const flagged = current.filter((subject) => !allowedKeys.has(keyOf(subject)) && marked.has(keyOf(subject)));
  const missing = allowed.filter((subject) => !currentKeys.has(keyOf(subject)));
  const status = removable.length || flagged.length || missing.length ? 'mismatch' : 'matches';
  return {
    status,
    keep: current.filter((subject) => !removable.includes(subject)),
    missing,
    removable,
    flagged_with_marks: flagged,
    reason: status === 'matches'
      ? 'Stored subjects match the approved package.'
      : 'Stored subjects differ from the approved package.'
  };
}

function subjectsToAdd({ enrolled, requested, offered }) {
  const current = uniqueSubjects(enrolled);
  const currentKeys = new Set(current.map(keyOf));
  const offeredKeys = new Set(uniqueSubjects(offered).map(keyOf));
  const requestedList = uniqueSubjects(requested);
  if (!offeredKeys.size) {
    return { ok: false, error: 'This school has not saved subjects for this grade yet.' };
  }
  if (!requestedList.length) return { ok: false, error: 'Choose at least one subject to add.' };
  const unknown = requestedList.filter((subject) => !offeredKeys.has(keyOf(subject)));
  if (unknown.length) {
    return { ok: false, error: `${unknown.join(', ')} is not offered by this school for this grade.` };
  }
  const added = requestedList.filter((subject) => !currentKeys.has(keyOf(subject)));
  if (!added.length) return { ok: false, error: 'Those subjects are already on this learner.' };
  return { ok: true, subjects: uniqueSubjects(current.concat(added)), added };
}

function subjectsAfterCorrection(plan) {
  if (!plan || plan.status === 'needs_review') {
    return { ok: false, error: 'This learner needs an approved subject package before the list can change.' };
  }
  return {
    ok: true,
    subjects: uniqueSubjects([...(plan.keep || []), ...(plan.missing || [])]),
    removed: plan.removable || [],
    kept_with_marks: plan.flagged_with_marks || []
  };
}

module.exports = {
  uniqueSubjects,
  resolveEnrolmentSubjects,
  subjectsForDisplay,
  planSubjectCorrection,
  subjectsAfterCorrection,
  subjectsToAdd
};
