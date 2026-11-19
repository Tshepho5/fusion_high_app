'use strict';

const SCHOOL_ROLES = new Set(['admin', 'principal', 'vice_principal']);
const TEACHER_ROLES = new Set(['teacher', 'class_teacher']);

function positiveId(value) {
  const parsed = parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function roleOf(user) {
  return String(user && user.role || '').toLowerCase();
}

/**
 * The signed-in account is the only identity the AI may use.
 * A role, school, or user id in the request body is ignored.
 */
function trustedActor(user) {
  if (!user || !user.id) return null;
  return {
    id: user.id,
    role: roleOf(user),
    school_id: positiveId(user.school_id),
    is_superadmin: user.is_superadmin === true,
    viewing: user.viewing === true
  };
}

function sameSchool(actor, record) {
  const actorSchool = positiveId(actor && actor.school_id);
  const recordSchool = positiveId(record && record.school_id);
  return Boolean(actorSchool && recordSchool && actorSchool === recordSchool);
}

function canReadLearnerRecord(actor, learner, links = {}) {
  if (!actor || !actor.id || !learner) return false;
  if (actor.is_superadmin === true && actor.viewing !== true) return false;
  const role = roleOf(actor);
  if (role === 'learner') {
    const ownUser = learner.learner_user_id != null && String(learner.learner_user_id) === String(actor.id);
    const ownRow = String(learner.id) === String(actor.id);
    if (!ownUser && !ownRow) return false;
    if (positiveId(actor.school_id) && positiveId(learner.school_id)) return sameSchool(actor, learner);
    return true;
  }
  if (role === 'parent') return links.parentLinked === true;
  if (TEACHER_ROLES.has(role)) return sameSchool(actor, learner) && links.teachesClass === true;
  if (SCHOOL_ROLES.has(role)) return sameSchool(actor, learner);
  return false;
}

function canReadClass(actor, classRow, teachesClass) {
  if (!actor || !classRow) return false;
  if (actor.is_superadmin === true && actor.viewing !== true) return false;
  if (!sameSchool(actor, classRow)) return false;
  const role = roleOf(actor);
  if (SCHOOL_ROLES.has(role)) return true;
  if (TEACHER_ROLES.has(role)) return teachesClass === true;
  return false;
}

/**
 * Automation runs for the account's own school.
 * A school id in the request is never used.
 */
function automationSchoolId(user) {
  const actor = trustedActor(user);
  if (!actor) return null;
  const role = actor.role;
  const allowed = role === 'teacher' || SCHOOL_ROLES.has(role);
  if (!allowed) return null;
  return actor.school_id;
}

module.exports = {
  positiveId,
  roleOf,
  trustedActor,
  sameSchool,
  canReadLearnerRecord,
  canReadClass,
  automationSchoolId
};
