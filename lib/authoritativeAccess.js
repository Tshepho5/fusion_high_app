'use strict';

const PRIVILEGED_ROLE_NAMES = new Set([
  'superadmin',
  'system_admin',
  'master',
  'master_admin',
  'platform_admin'
]);

const STATUS_COLUMNS = ['deleted_at', 'deactivated_at', 'disabled_at', 'is_active', 'status'];

let statusColumnCache = null;

function resetAuthoritativeAccessCache() {
  statusColumnCache = null;
}

function accountUnavailable(state) {
  if (state === 'deleted') return 'This account has been deleted.';
  if (state === 'deactivated') return 'This account is deactivated.';
  return 'This account cannot be used.';
}

async function lookupStatusColumns(query) {
  if (statusColumnCache) return statusColumnCache;
  try {
    const result = await query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'users'
         AND column_name = ANY($1::text[])`,
      [STATUS_COLUMNS]
    );
    statusColumnCache = new Set((result.rows || []).map((row) => row.column_name));
  } catch (_) {
    statusColumnCache = new Set();
  }
  return statusColumnCache;
}

function invalidAccountState(row) {
  if (!row) return 'missing';
  if (row.deleted_at) return 'deleted';
  if (row.deactivated_at || row.disabled_at) return 'deactivated';
  if (row.is_active === false) return 'deactivated';
  const status = String(row.status || '').trim().toLowerCase();
  if (status === 'deleted' || status === 'removed') return 'deleted';
  if (['deactivated', 'disabled', 'inactive', 'suspended', 'locked'].includes(status)) {
    return 'deactivated';
  }
  return null;
}

function shapeAccount(row) {
  return {
    id: row.id,
    email: row.email,
    school_id: row.school_id || null,
    role: String(row.role_name || '').toLowerCase(),
    is_superadmin: row.is_superadmin === true,
    active_session_id: row.active_session_id || null
  };
}

async function loadAuthoritativeAccount(query, userId) {
  if (userId === undefined || userId === null || String(userId).trim() === '') {
    return { state: 'missing', account: null };
  }
  const columns = await lookupStatusColumns(query);
  const extra = STATUS_COLUMNS.filter((name) => columns.has(name)).map((name) => `u.${name}`);
  const extraSql = extra.length ? `, ${extra.join(', ')}` : '';
  const result = await query(
    `SELECT u.id, u.email, u.school_id, u.active_session_id,
            COALESCE(u.is_superadmin, FALSE) AS is_superadmin,
            LOWER(COALESCE(
              r.name,
              CASE
                WHEN u.role_id::text IN ('1', 'admin') THEN 'admin'
                WHEN u.role_id::text IN ('2', 'parent') THEN 'parent'
                WHEN u.role_id::text IN ('3', 'learner') THEN 'learner'
                WHEN u.role_id::text IN ('4', 'teacher') THEN 'teacher'
                ELSE NULL
              END,
              ''
            )) AS role_name
            ${extraSql}
     FROM users u
     LEFT JOIN roles r ON (u.role_id::text = r.id::text OR LOWER(r.name) = LOWER(u.role_id::text))
     WHERE u.id::text = $1::text
     LIMIT 1`,
    [String(userId)]
  );
  const row = result.rows && result.rows[0];
  if (!row) {
    try {
      const recycled = await query(
        `SELECT id
         FROM recycle_bin
         WHERE original_id::text = $1::text
           AND LOWER(COALESCE(record_type, '')) IN ('user', 'users', 'account')
         LIMIT 1`,
        [String(userId)]
      );
      if (recycled.rows && recycled.rows.length) return { state: 'deleted', account: null };
    } catch (_) {
      // A missing recycle bin still leaves the absent user denied.
    }
    return { state: 'missing', account: null };
  }
  const invalid = invalidAccountState(row);
  if (invalid) return { state: invalid, account: shapeAccount(row) };
  return { state: 'active', account: shapeAccount(row) };
}

function applyAccount(req, account) {
  req.user = req.user || {};
  req.user.id = account.id;
  req.user.role = account.role;
  req.user.email = account.email;
  req.user.school_id = account.school_id;
  req.user.is_superadmin = account.is_superadmin === true;
  req.user.authoritative = true;
}

/**
 * Platform privilege comes only from users.is_superadmin.
 * A role name of superadmin, and any JWT claim, do not grant it.
 */
function hasDatabaseSuperadmin(account) {
  return Boolean(account && account.is_superadmin === true);
}

function testerRoleChangeAllowed({ requestedRole, targetIsSuperadmin }) {
  const role = String(requestedRole || '').trim().toLowerCase();
  if (PRIVILEGED_ROLE_NAMES.has(role)) {
    return { ok: false, status: 403, error: 'That role cannot be assigned from this screen.' };
  }
  if (targetIsSuperadmin === true) {
    return {
      ok: false,
      status: 403,
      error: 'A platform administrator account cannot be changed from the tester screen.'
    };
  }
  return { ok: true };
}

function createEnforceDatabaseSuperadmin(query, forbiddenMessage) {
  const message = forbiddenMessage || 'Only a Geleza SA platform administrator can perform this action.';
  return async function enforceDatabaseSuperadmin(req, res, next) {
    try {
      if (!req.user || req.user.id === undefined || req.user.id === null) {
        return res.status(401).json({ error: 'Unauthorized: User identity unverified.' });
      }
      const loaded = await loadAuthoritativeAccount(query, req.user.id);
      if (loaded.state !== 'active') {
        return res.status(401).json({ error: accountUnavailable(loaded.state), code: loaded.state });
      }
      applyAccount(req, loaded.account);
      if (!hasDatabaseSuperadmin(loaded.account)) {
        return res.status(403).json({ error: message });
      }
      return next();
    } catch (err) {
      console.error('[AUTHORITATIVE ACCESS]', err.message);
      return res.status(500).json({ error: 'Platform administrator access could not be verified.' });
    }
  };
}

module.exports = {
  PRIVILEGED_ROLE_NAMES,
  accountUnavailable,
  applyAccount,
  createEnforceDatabaseSuperadmin,
  hasDatabaseSuperadmin,
  invalidAccountState,
  loadAuthoritativeAccount,
  resetAuthoritativeAccessCache,
  testerRoleChangeAllowed
};
