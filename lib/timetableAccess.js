'use strict';

const { positiveId } = require('./aiAccess');

/**
 * A timetable belongs to the school stored on the row.
 * A school id in the request cannot replace the signed-in user's school.
 * A superadmin must choose a school explicitly and does not receive every school.
 */
function timetableSchoolDecision(user, requestedSchoolId) {
  if (!user || !user.id) return { allowed: false, schoolId: null, code: 'unauthenticated' };
  const own = positiveId(user.school_id);
  const requested = positiveId(requestedSchoolId);
  if (user.is_superadmin === true && user.viewing !== true) {
    const chosen = requested || own;
    if (!chosen) return { allowed: false, schoolId: null, code: 'missing_school' };
    return { allowed: true, schoolId: chosen, code: 'explicit_school' };
  }
  if (requested && own && requested !== own) {
    return { allowed: false, schoolId: null, code: 'school_override' };
  }
  if (!own) return { allowed: false, schoolId: null, code: 'missing_school' };
  return { allowed: true, schoolId: own, code: 'own_school' };
}

function normaliseClass(value) {
  return String(value || '').trim().toLowerCase();
}

function parseTimetableData(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }
  return value;
}

/**
 * A learner or parent sees one published timetable for the learner's own class.
 * Drafts are excluded. More than one published match is refused instead of choosing the newest row.
 */
function selectPublishedClass(rows, className) {
  const wanted = normaliseClass(className);
  if (!wanted) return { ok: false, code: 'missing_class' };
  const matches = (rows || []).filter((row) => {
    if (!row || row.status !== 'published_to_learners' || row.is_active === false) return false;
    const data = parseTimetableData(row.timetable_data);
    if (!data || typeof data !== 'object') return false;
    return Object.keys(data).some((name) => normaliseClass(name) === wanted);
  });
  if (matches.length === 0) return { ok: false, code: 'not_published' };
  if (matches.length > 1) return { ok: false, code: 'ambiguous' };
  const row = matches[0];
  const data = parseTimetableData(row.timetable_data);
  const storedName = Object.keys(data).find((name) => normaliseClass(name) === wanted);
  return {
    ok: true,
    code: 'published_class',
    timetable: {
      ...row,
      timetable_data: { [storedName]: data[storedName] }
    }
  };
}

/**
 * A teacher may publish a draft only when assigned to every class in it, or is that class's teacher.
 * An admin of the same school may publish. A shared school membership is not enough.
 */
function teacherCanPublish({ role, teacherId, classNames, assignments, classRows, createdBy, authorRole }) {
  const roleName = String(role || '').toLowerCase();
  if (roleName === 'admin') return true;
  if (roleName !== 'teacher' && roleName !== 'class_teacher') return false;
  const names = (classNames || []).map(normaliseClass).filter(Boolean);
  if (!teacherId || names.length === 0) return false;
  const coversClasses = names.every((name) => {
    const assigned = (assignments || []).some((row) => (
      String(row.teacher_id) === String(teacherId) && normaliseClass(row.class_name) === name
    ));
    const classTeacher = (classRows || []).some((row) => (
      normaliseClass(row.name) === name
      && (String(row.assigned_teacher_id) === String(teacherId) || String(row.homeroom_teacher_id) === String(teacherId))
    ));
    return assigned || classTeacher;
  });
  if (!coversClasses) return false;
  if (createdBy == null || createdBy === '') return true;
  if (String(createdBy) === String(teacherId)) return true;
  return String(authorRole || '').toLowerCase() === 'admin';
}

function canReadTimetable({ actorSchoolId, timetableSchoolId, learnerSchoolId, parentLinked, role }) {
  const timetableSchool = positiveId(timetableSchoolId);
  const learnerSchool = positiveId(learnerSchoolId);
  const actorSchool = positiveId(actorSchoolId);
  if (!timetableSchool || !actorSchool || actorSchool !== timetableSchool) return false;
  if (learnerSchool && learnerSchool !== timetableSchool) return false;
  if (String(role || '').toLowerCase() === 'parent' && parentLinked !== true) return false;
  return true;
}

module.exports = {
  timetableSchoolDecision,
  canReadTimetable,
  selectPublishedClass,
  teacherCanPublish,
  parseTimetableData
};
