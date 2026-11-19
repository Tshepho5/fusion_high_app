'use strict';

const crypto = require('crypto');
const { resetAuthoritativeAccessCache } = require('./authoritativeAccess');

const TESTER_ROLES = new Set(['parent', 'teacher', 'learner']);
const BLOCKED_TESTER_ROLES = new Set([
  'admin',
  'principal',
  'superadmin',
  'system_admin',
  'master',
  'master_admin',
  'platform_admin'
]);

const ISSUE_STATUSES = [
  'open',
  'under_investigation',
  'confirmed',
  'in_progress',
  'fixed',
  'ready_for_retesting',
  'verified',
  'rejected'
];

const CHECK_RESULTS = ['pass', 'fail', 'blocked', 'not_implemented'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];
const CLOSED_ISSUE_STATUSES = new Set(['verified', 'rejected']);
const TEST_SCHOOL_SLUG = 'geleza-tester-school';
const INVITE_HOURS = 72;
const SCREENSHOT_LIMIT = 350000;

function testerInviteRoleAllowed({ requestedRole, targetIsSuperadmin }) {
  const role = String(requestedRole || '').trim().toLowerCase();
  if (targetIsSuperadmin === true) {
    return {
      ok: false,
      status: 403,
      error: 'A platform administrator account cannot be changed from the tester screen.'
    };
  }
  if (!TESTER_ROLES.has(role) || BLOCKED_TESTER_ROLES.has(role)) {
    return {
      ok: false,
      status: 403,
      error: 'Testers can only be invited as a parent, teacher, or learner.'
    };
  }
  return { ok: true, role };
}

function existingAccountInviteAllowed({ exists, isTester, isSuperadmin, schoolIsTest }) {
  if (isSuperadmin === true) {
    return {
      ok: false,
      status: 403,
      error: 'A platform administrator account cannot be invited as a tester.'
    };
  }
  if (!exists) return { ok: true, reuse: false };
  if (isTester !== true) {
    return {
      ok: false,
      status: 409,
      error: 'This email already belongs to a school account. Use a new address for a tester.'
    };
  }
  if (schoolIsTest !== true) {
    return {
      ok: false,
      status: 409,
      error: 'This tester email is still attached to another school. It cannot be moved onto live school records from this screen.'
    };
  }
  return { ok: true, reuse: true };
}

function assertTestSchool(school) {
  if (!school || school.is_test_school !== true) {
    return {
      ok: false,
      status: 403,
      error: 'Testers can only be placed in the Geleza SA test school.'
    };
  }
  return { ok: true };
}

function canBindLearnerChild({ userSchoolId, childSchoolId, userIsTester, childIsTestRecord }) {
  const userSchool = parseInt(userSchoolId, 10);
  const childSchool = parseInt(childSchoolId, 10);
  if (!Number.isInteger(userSchool) || userSchool <= 0) return false;
  if (!Number.isInteger(childSchool) || childSchool <= 0) return false;
  if (userSchool !== childSchool) return false;
  const tester = userIsTester === true;
  const testChild = childIsTestRecord === true;
  return tester === testChild;
}

function childVisibleToParent({ parentIsTester, parentSchoolId, childSchoolId, childIsTestRecord }) {
  if (parentIsTester !== true) return true;
  return canBindLearnerChild({
    userSchoolId: parentSchoolId,
    childSchoolId,
    userIsTester: true,
    childIsTestRecord
  });
}

function deliveryFromSendResult(result) {
  if (result && result.success === true) {
    return { email_sent: true, delivery_status: 'sent', status: 'pending' };
  }
  return { email_sent: false, delivery_status: 'failed', status: 'draft' };
}

function resendDelivery(previous, result) {
  const wasSent = previous && previous.delivery_status === 'sent';
  if (result && result.success === true) {
    return {
      email_sent: true,
      delivery_status: 'sent',
      status: 'pending',
      previous_link_kept: false
    };
  }
  if (wasSent) {
    return {
      email_sent: false,
      delivery_status: 'sent',
      status: 'pending',
      previous_link_kept: true
    };
  }
  return {
    email_sent: false,
    delivery_status: 'failed',
    status: 'draft',
    previous_link_kept: false
  };
}

function hashInviteToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function createInviteToken() {
  const token = crypto.randomBytes(32).toString('base64url');
  return { token, hash: hashInviteToken(token) };
}

function summariseProgramme(invitations, reports, usersById, now) {
  const clock = now instanceof Date ? now : new Date();
  const rows = Array.isArray(invitations) ? invitations : [];
  const notes = Array.isArray(reports) ? reports : [];
  const users = usersById || {};
  const roles = ['parent', 'teacher', 'learner'];

  const invitedFor = (role) => rows.filter((row) => row.role_name === role && row.delivery_status === 'sent').length;
  const pendingFor = (role) => rows.filter((row) => {
    if (row.role_name !== role || row.status !== 'pending') return false;
    if (!row.expires_at) return true;
    return new Date(row.expires_at).getTime() >= clock.getTime();
  }).length;

  const revokedIds = new Set();
  rows.forEach((row) => {
    const user = row.user_id != null ? users[String(row.user_id)] : null;
    if (row.status === 'revoked' || (user && user.deactivated === true)) revokedIds.add(row.id);
  });

  const active = rows.filter((row) => {
    const user = row.user_id != null ? users[String(row.user_id)] : null;
    return row.status === 'activated' && user && user.is_tester === true && user.deactivated !== true;
  }).length;

  const issues = notes.filter((row) => row.kind === 'issue');
  const checks = notes.filter((row) => row.kind === 'check');
  const outstanding = issues.filter((row) => !CLOSED_ISSUE_STATUSES.has(row.status));
  const dashboards = new Set(notes.map((row) => String(row.dashboard || '').trim()).filter(Boolean));
  const modules = new Set(notes.map((row) => {
    const dashboard = String(row.dashboard || '').trim();
    const moduleName = String(row.module || '').trim();
    return dashboard && moduleName ? `${dashboard}::${moduleName}` : '';
  }).filter(Boolean));

  return {
    parent_testers_invited: invitedFor('parent'),
    teacher_testers_invited: invitedFor('teacher'),
    learner_testers_invited: invitedFor('learner'),
    invitations_pending: roles.reduce((sum, role) => sum + pendingFor(role), 0),
    invitations_accepted: rows.filter((row) => row.accepted_at).length,
    accounts_activated: rows.filter((row) => row.activated_at).length,
    active_testers: active,
    suspended_or_revoked: revokedIds.size,
    dashboards_tested: dashboards.size,
    modules_tested: modules.size,
    passed_tests: checks.filter((row) => row.result === 'pass').length,
    failed_tests: checks.filter((row) => row.result === 'fail').length,
    outstanding_issues: outstanding.length,
    critical_issues: outstanding.filter((row) => row.severity === 'critical').length,
    awaiting_retest: issues.filter((row) => row.status === 'ready_for_retesting').length
  };
}

function cleanText(value, max) {
  return String(value || '').replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, max);
}

function validateTesterReport(body, tester) {
  const role = String(tester && tester.role || '').trim().toLowerCase();
  if (!tester || tester.is_tester !== true || !TESTER_ROLES.has(role)) {
    return { ok: false, status: 403, error: 'Only a parent, teacher, or learner tester can file a testing report.' };
  }
  const kind = String(body && body.kind || 'issue').trim().toLowerCase();
  if (kind !== 'issue' && kind !== 'check') {
    return { ok: false, status: 400, error: 'Choose a problem report or a module result.' };
  }
  const dashboard = cleanText(body.dashboard, 80);
  const moduleName = cleanText(body.module, 120);
  const description = cleanText(body.description, 4000);
  if (!dashboard || !moduleName || description.length < 10) {
    return { ok: false, status: 400, error: 'Dashboard, module, and a description of at least 10 characters are required.' };
  }
  const steps = cleanText(body.steps_to_reproduce, 4000);
  const expected = cleanText(body.expected_behaviour, 4000);
  const actual = cleanText(body.actual_behaviour, 4000);
  let severity = null;
  let result = null;
  let status = 'open';
  if (kind === 'issue') {
    if (steps.length < 5 || expected.length < 5 || actual.length < 5) {
      return { ok: false, status: 400, error: 'A problem report needs the steps, the expected behaviour, and the actual behaviour.' };
    }
    severity = String(body.severity || '').trim().toLowerCase();
    if (!SEVERITIES.includes(severity)) {
      return { ok: false, status: 400, error: 'Choose a severity of low, medium, high, or critical.' };
    }
  } else {
    result = String(body.result || '').trim().toLowerCase();
    if (!CHECK_RESULTS.includes(result)) {
      return { ok: false, status: 400, error: 'A module result must be pass, fail, blocked, or not implemented.' };
    }
    status = 'recorded';
  }
  let screenshot = null;
  if (body.screenshot_data) {
    const raw = String(body.screenshot_data);
    if (raw.length > SCREENSHOT_LIMIT || !/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(raw)) {
      return { ok: false, status: 400, error: 'The screenshot must be a PNG, JPEG, or WebP image under 350 KB.' };
    }
    screenshot = raw;
  }
  return {
    ok: true,
    value: {
      kind,
      role_name: role,
      dashboard,
      module: moduleName,
      description,
      steps_to_reproduce: steps || null,
      expected_behaviour: expected || null,
      actual_behaviour: actual || null,
      severity,
      result,
      status,
      screenshot_data: screenshot
    }
  };
}

function reportStatusAllowed(status) {
  return ISSUE_STATUSES.includes(String(status || '').trim().toLowerCase());
}

async function ensureTesterSchema(query) {
  await query(`
    ALTER TABLE schools ADD COLUMN IF NOT EXISTS is_test_school BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_tester BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS active_session_id TEXT;
    ALTER TABLE children ADD COLUMN IF NOT EXISTS is_test_record BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE classes ADD COLUMN IF NOT EXISTS school_id INTEGER;
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS school_id INTEGER;
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS tester_invitations (
      id SERIAL PRIMARY KEY,
      reference_code VARCHAR(24) UNIQUE NOT NULL,
      email VARCHAR(255) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      surname VARCHAR(255) NOT NULL DEFAULT '',
      phone VARCHAR(30),
      role_name VARCHAR(20) NOT NULL,
      school_id INTEGER NOT NULL,
      user_id INTEGER,
      token_hash VARCHAR(64),
      expires_at TIMESTAMPTZ,
      status VARCHAR(30) NOT NULL DEFAULT 'draft',
      delivery_status VARCHAR(20) NOT NULL DEFAULT 'not_sent',
      sent_at TIMESTAMPTZ,
      accepted_at TIMESTAMPTZ,
      activated_at TIMESTAMPTZ,
      revoked_at TIMESTAMPTZ,
      invited_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS tester_reports (
      id SERIAL PRIMARY KEY,
      reference_code VARCHAR(24) UNIQUE NOT NULL,
      tester_user_id INTEGER NOT NULL,
      invitation_id INTEGER,
      role_name VARCHAR(20) NOT NULL,
      dashboard VARCHAR(80) NOT NULL,
      module VARCHAR(120) NOT NULL,
      kind VARCHAR(20) NOT NULL,
      result VARCHAR(30),
      severity VARCHAR(20),
      status VARCHAR(40) NOT NULL DEFAULT 'open',
      description TEXT NOT NULL,
      steps_to_reproduce TEXT,
      expected_behaviour TEXT,
      actual_behaviour TEXT,
      screenshot_data TEXT,
      admin_note TEXT,
      updated_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS tester_invitations_one_open_email
      ON tester_invitations (LOWER(email))
      WHERE status IN ('draft', 'pending', 'accepted', 'activated');
    CREATE INDEX IF NOT EXISTS idx_tester_invitations_email ON tester_invitations (LOWER(email));
    CREATE INDEX IF NOT EXISTS idx_tester_invitations_status ON tester_invitations (status, role_name);
    CREATE INDEX IF NOT EXISTS idx_tester_reports_filters ON tester_reports (role_name, dashboard, status, created_at DESC);
  `);
  await query(`
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'temp_password_note'
      ) THEN
        UPDATE users SET temp_password_note = NULL WHERE COALESCE(is_tester, FALSE) = TRUE AND temp_password_note IS NOT NULL;
      END IF;
    END $$;
  `);
  resetAuthoritativeAccessCache();
}

async function ensureTestSchool(query) {
  const saved = await query(
    `INSERT INTO schools (name, slug, is_test_school)
     VALUES ('Geleza SA Tester School', $1, TRUE)
     ON CONFLICT (slug) DO UPDATE SET is_test_school = TRUE
     RETURNING id, name, slug, is_test_school`,
    [TEST_SCHOOL_SLUG]
  );
  return saved.rows[0];
}

module.exports = {
  BLOCKED_TESTER_ROLES,
  CHECK_RESULTS,
  INVITE_HOURS,
  ISSUE_STATUSES,
  SEVERITIES,
  TEST_SCHOOL_SLUG,
  TESTER_ROLES,
  assertTestSchool,
  canBindLearnerChild,
  childVisibleToParent,
  createInviteToken,
  deliveryFromSendResult,
  ensureTestSchool,
  ensureTesterSchema,
  existingAccountInviteAllowed,
  hashInviteToken,
  reportStatusAllowed,
  resendDelivery,
  summariseProgramme,
  testerInviteRoleAllowed,
  validateTesterReport
};
