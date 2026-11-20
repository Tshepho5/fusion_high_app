'use strict';

function sameId(left, right) {
  return String(left) === String(right);
}

function clean(value) {
  return String(value || '').trim();
}

/**
 * Decides whether an admin in one school may move a learner to another class.
 * The decision does not rewrite marks, attendance, or released reports.
 * No class capacity rule exists in the current data model.
 */
function decideClassTransfer({ actor, learner, currentClass, destinationClass, effectiveOn, reason, pendingTransfer, today }) {
  if (!actor || !actor.id) return { ok: false, status: 401, code: 'unauthenticated' };
  if (actor.is_superadmin === true) return { ok: false, status: 403, code: 'superadmin_not_operator' };
  if (String(actor.role || '').toLowerCase() !== 'admin') return { ok: false, status: 403, code: 'role_denied' };
  if (!actor.schoolId) return { ok: false, status: 400, code: 'missing_school' };
  if (!learner || !sameId(learner.school_id, actor.schoolId)) {
    return { ok: false, status: 404, code: 'learner_not_in_school' };
  }
  if (!currentClass || !sameId(currentClass.school_id, actor.schoolId) || !sameId(currentClass.id, learner.class_id)) {
    return { ok: false, status: 409, code: 'current_class_mismatch' };
  }
  if (!destinationClass || !sameId(destinationClass.school_id, actor.schoolId)) {
    return { ok: false, status: 404, code: 'destination_not_in_school' };
  }
  if (destinationClass.ownership_quarantine === true || destinationClass.is_active === false) {
    return { ok: false, status: 409, code: 'destination_inactive' };
  }
  if (sameId(destinationClass.id, currentClass.id)) return { ok: false, status: 409, code: 'same_class' };
  if (Number(destinationClass.grade) !== Number(learner.grade)) {
    return { ok: false, status: 409, code: 'grade_mismatch' };
  }
  const learnerStream = clean(learner.stream).toLowerCase();
  const destinationStream = clean(destinationClass.stream).toLowerCase();
  if (learnerStream && destinationStream && learnerStream !== destinationStream) {
    return { ok: false, status: 409, code: 'stream_mismatch' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(effectiveOn || ''))) {
    return { ok: false, status: 400, code: 'missing_date' };
  }
  if (!clean(reason)) return { ok: false, status: 400, code: 'missing_reason' };
  if (pendingTransfer) return { ok: false, status: 409, code: 'pending_transfer' };
  const applyNow = String(effectiveOn) <= String(today || '');
  return { ok: true, status: 200, code: applyNow ? 'applied' : 'scheduled', applyNow };
}

module.exports = { decideClassTransfer };
