'use strict';

function decideEarlyWarningAlert({
  predictionAvailable,
  riskTierId,
  predictedScore,
  attendancePct,
  lastAlertAt,
  now = new Date(),
  force = false,
  cooldownDays = 7
}) {
  if (!predictionAvailable) return { dispatch: false, reason: 'prediction_unavailable' };
  const score = Number(predictedScore);
  const attendance = Number(attendancePct);
  const priority = riskTierId === 0
    || (Number.isFinite(score) && score <= 65)
    || (Number.isFinite(attendance) && attendance < 75);
  if (!priority) return { dispatch: false, reason: 'outside_priority_band' };
  if (force) return { dispatch: true, reason: 'forced' };
  if (lastAlertAt) {
    const last = new Date(lastAlertAt);
    const windowMs = cooldownDays * 24 * 60 * 60 * 1000;
    if (Number.isFinite(last.getTime()) && now.getTime() - last.getTime() < windowMs) {
      return { dispatch: false, reason: 'cooldown' };
    }
  }
  return { dispatch: true, reason: 'priority_band' };
}

function sameSchoolRecipientIds(people, schoolId) {
  const school = Number(schoolId);
  const ids = [];
  const seen = new Set();
  if (!Number.isInteger(school) || school <= 0) return ids;
  (people || []).forEach((person) => {
    const id = Number(person && person.id);
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) return;
    if (Number(person.school_id) !== school) return;
    seen.add(id);
    ids.push(id);
  });
  return ids;
}

const projectionNotice = 'This is a projection from recorded attendance, marks, and study hours. It is not an official result.';

function periodicAuditPlan(env = {}, now = new Date()) {
  const termNumber = Number(env.GELEZA_AUDIT_TERM);
  if (![1, 2, 3, 4].includes(termNumber)) {
    return { run: false, reason: 'term_not_configured' };
  }
  const yearNumber = Number(env.GELEZA_AUDIT_YEAR);
  return {
    run: true,
    term: termNumber,
    academicYear: Number.isInteger(yearNumber) && yearNumber >= 2000 ? yearNumber : now.getFullYear()
  };
}

module.exports = { decideEarlyWarningAlert, sameSchoolRecipientIds, projectionNotice, periodicAuditPlan };
