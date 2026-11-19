/**
 * A signed-in user stays on their own school.
 * Only Geleza SA (superadmin) may choose another school, and only when that id is sent.
 * Missing schools are not treated as school 1.
 */
function resolveSchoolId(req) {
  const own = parseInt(req.user && req.user.school_id, 10);
  const ownId = Number.isInteger(own) && own > 0 ? own : null;
  if (!req.user || !req.user.is_superadmin) return ownId;

  const raw = (req.query && req.query.school_id)
    || (req.headers && req.headers['x-school-id'])
    || (req.body && req.body.school_id)
    || ownId;
  const parsed = parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Admission decisions use the school stored on the application.
 * A client-supplied school id is never consulted.
 * A superadmin is the only account that may decide an application outside their own school.
 */
function canDecideApplication(user, applicationSchoolId) {
  if (!user) return false;
  if (user.is_superadmin === true) return true;
  const own = parseInt(user.school_id, 10);
  const applicationSchool = parseInt(applicationSchoolId, 10);
  if (!Number.isInteger(own) || own <= 0) return false;
  if (!Number.isInteger(applicationSchool) || applicationSchool <= 0) return false;
  return own === applicationSchool;
}

/**
 * The Geleza SA home directory lists platform executives.
 * A school directory is used only after a superadmin opens that school,
 * or for a principal, and then it is only their own school.
 */
function directoryScope(req) {
  if (!req.user || req.user.is_superadmin !== true) {
    return { mode: 'school', schoolId: resolveSchoolId(req) };
  }
  const requested = String((req.headers && req.headers['x-geleza-directory']) || '').toLowerCase();
  if (requested === 'school') {
    return { mode: 'school', schoolId: resolveSchoolId(req) };
  }
  return { mode: 'executives', schoolId: null };
}

const DASHBOARD_ROLES = new Set(['admin', 'teacher', 'parent', 'learner']);

function canOpenRegisteredSchoolDashboard({ executive, target, schoolActive, schoolId }) {
  if (!executive || executive.is_superadmin !== true) return false;
  if (!schoolActive) return false;
  if (!target || target.is_superadmin === true) return false;
  const targetSchool = parseInt(target.school_id, 10);
  const openedSchool = parseInt(schoolId, 10);
  if (!Number.isInteger(targetSchool) || targetSchool <= 0) return false;
  if (targetSchool !== openedSchool) return false;
  if (Number(target.id) === Number(executive.id)) return false;
  return DASHBOARD_ROLES.has(String(target.role || '').toLowerCase());
}

module.exports = { resolveSchoolId, canDecideApplication, directoryScope, canOpenRegisteredSchoolDashboard };
