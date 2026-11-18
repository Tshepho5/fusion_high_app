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

module.exports = { resolveSchoolId, canDecideApplication };
