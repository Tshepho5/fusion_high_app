'use strict';

function positiveId(value) {
  const parsed = parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function columnDefaultAssignsSchoolOne(columnDefault) {
  return String(columnDefault == null ? '' : columnDefault).trim() === '1';
}

/**
 * A new school-owned row uses the signed-in school.
 * A missing school stays missing. School 1 is never substituted.
 * A client school id cannot move the row to another school.
 */
function schoolForNewRecord(user, requestedSchoolId) {
  const own = positiveId(user && user.school_id);
  const requested = positiveId(requestedSchoolId);
  if (!user || !user.id) return { ok: false, schoolId: null, code: 'unauthenticated' };
  if (user.is_superadmin === true) {
    const chosen = requested || own;
    if (!chosen) return { ok: false, schoolId: null, code: 'missing_school' };
    return { ok: true, schoolId: chosen, code: 'explicit_school' };
  }
  if (!own) return { ok: false, schoolId: null, code: 'missing_school' };
  if (requested && requested !== own) return { ok: false, schoolId: null, code: 'school_override' };
  return { ok: true, schoolId: own, code: 'own_school' };
}

module.exports = {
  positiveId,
  columnDefaultAssignsSchoolOne,
  schoolForNewRecord
};
