'use strict';

const {
  TOKEN_PURPOSES,
  EMAIL_VERIFY_TTL_MINUTES,
  LEARNER_EMAIL_ACTIVATION_TTL_MINUTES,
  LEARNER_HANDOFF_TTL_MINUTES,
  generateSecureToken,
  hashSecretValue
} = require('../../../lib/authSecurity');

const DEFAULT_TTL_BY_PURPOSE = Object.freeze({
  [TOKEN_PURPOSES.PARENT_EMAIL_VERIFY]: EMAIL_VERIFY_TTL_MINUTES,
  [TOKEN_PURPOSES.PARENT_ACTIVATION]: EMAIL_VERIFY_TTL_MINUTES,
  [TOKEN_PURPOSES.LEARNER_EMAIL_ACTIVATION]: LEARNER_EMAIL_ACTIVATION_TTL_MINUTES,
  [TOKEN_PURPOSES.LEARNER_PARENT_HANDOFF]: LEARNER_HANDOFF_TTL_MINUTES,
  [TOKEN_PURPOSES.LEARNER_PASSWORD_RESET_HANDOFF]: LEARNER_HANDOFF_TTL_MINUTES,
  [TOKEN_PURPOSES.PRINCIPAL_ACTIVATION]: EMAIL_VERIFY_TTL_MINUTES,
  [TOKEN_PURPOSES.LEGACY_PARENT_ACTIVATION]: EMAIL_VERIFY_TTL_MINUTES
});

/**
 * Issues a single-use, purpose-specific, SHA-256 hashed action token in account_action_tokens.
 * Invalidates prior unconsumed tokens for the SAME (user_id, purpose) only — never colliding
 * with tokens belonging to a different purpose.
 */
async function issueActionToken(executor, {
  userId,
  purpose,
  createdByUserId = null,
  applicationId = null,
  childId = null,
  schoolId = null,
  ttlMinutes = null
}) {
  const validPurposes = Object.values(TOKEN_PURPOSES);
  if (!validPurposes.includes(purpose)) {
    const err = new Error(`Unsupported token purpose: ${purpose}`);
    err.status = 400;
    throw err;
  }

  const effectiveTtl = Number.isFinite(Number(ttlMinutes)) && Number(ttlMinutes) > 0
    ? Number(ttlMinutes)
    : (DEFAULT_TTL_BY_PURPOSE[purpose] || EMAIL_VERIFY_TTL_MINUTES);

  // Mark previous unconsumed tokens for this exact user + purpose as consumed so only the newest link is active
  await executor.query(
    `UPDATE account_action_tokens
     SET consumed_at = NOW()
     WHERE user_id = $1
       AND purpose = $2
       AND consumed_at IS NULL`,
    [Number(userId), purpose]
  );

  const created = generateSecureToken();
  const inserted = await executor.query(
    `INSERT INTO account_action_tokens (
       user_id, purpose, token_hash, created_by_user_id,
       application_id, child_id, school_id, expires_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, NOW() + ($8::int * INTERVAL '1 minute')
     )
     RETURNING id, user_id, purpose, application_id, child_id, school_id, expires_at`,
    [
      Number(userId),
      purpose,
      created.hash,
      createdByUserId ? Number(createdByUserId) : null,
      applicationId ? Number(applicationId) : null,
      childId ? Number(childId) : null,
      schoolId ? Number(schoolId) : null,
      effectiveTtl
    ]
  );

  return {
    id: inserted.rows[0].id,
    token: created.token,
    purpose: inserted.rows[0].purpose,
    expiresAt: inserted.rows[0].expires_at,
    userId: inserted.rows[0].user_id
  };
}

/**
 * Inspects a token without consuming it (returns sanitized metadata for UI rendering).
 */
async function inspectActionToken(executor, { token, allowedPurposes = null }) {
  const cleanToken = String(token || '').trim();
  if (cleanToken.length < 20 || cleanToken.length > 200) return null;
  const tokenHash = hashSecretValue(cleanToken);
  const res = await executor.query(
    `SELECT t.id, t.user_id, t.purpose, t.application_id, t.child_id, t.school_id,
            t.expires_at, t.consumed_at,
            u.email, u.full_name, u.surname, COALESCE(u.is_superadmin, FALSE) AS is_superadmin,
            COALESCE(r.name, u.role_id::text, '') AS role_name,
            c.learner_number
     FROM account_action_tokens t
     JOIN users u ON u.id = t.user_id
     LEFT JOIN roles r ON (u.role_id::text = r.id::text OR LOWER(r.name) = LOWER(u.role_id::text))
     LEFT JOIN children c ON (c.id = t.child_id OR (t.child_id IS NULL AND c.learner_user_id = u.id AND COALESCE(c.is_active, TRUE) = TRUE))
     WHERE t.token_hash = $1
     LIMIT 1`,
    [tokenHash]
  );
  const row = res.rows[0];
  if (!row) return null;
  if (allowedPurposes && !allowedPurposes.includes(row.purpose)) {
    return { ...row, valid: false, reason: 'purpose_mismatch' };
  }
  if (row.consumed_at) {
    return { ...row, valid: false, reason: 'already_used' };
  }
  if (!row.expires_at || new Date(row.expires_at).getTime() <= Date.now()) {
    return { ...row, valid: false, reason: 'expired' };
  }
  return { ...row, valid: true, reason: null };
}

/**
 * Atomically consumes a purpose-specific token inside an active transaction (`FOR UPDATE`).
 * Prevents race conditions and double-consumption.
 */
async function consumeActionToken(client, {
  token,
  allowedPurposes,
  expectedUserId = null,
  consumedByIp = null
}) {
  const cleanToken = String(token || '').trim();
  if (cleanToken.length < 20 || cleanToken.length > 200) {
    const err = new Error('This secure link is invalid.');
    err.status = 400;
    err.code = 'token_invalid';
    throw err;
  }

  const tokenHash = hashSecretValue(cleanToken);
  const found = await client.query(
    `SELECT t.id, t.user_id, t.purpose, t.application_id, t.child_id, t.school_id,
            t.expires_at, t.consumed_at,
            u.email, u.full_name, u.surname, u.password_hash,
            COALESCE(u.is_superadmin, FALSE) AS is_superadmin,
            COALESCE(r.name, u.role_id::text, '') AS role_name
     FROM account_action_tokens t
     JOIN users u ON u.id = t.user_id
     LEFT JOIN roles r ON (u.role_id::text = r.id::text OR LOWER(r.name) = LOWER(u.role_id::text))
     WHERE t.token_hash = $1
     FOR UPDATE OF t`,
    [tokenHash]
  );

  const row = found.rows[0];
  if (!row || row.is_superadmin) {
    const err = new Error('This secure link is invalid or unavailable.');
    err.status = 400;
    err.code = 'token_invalid';
    throw err;
  }

  if (Array.isArray(allowedPurposes) && allowedPurposes.length > 0 && !allowedPurposes.includes(row.purpose)) {
    const err = new Error('This link cannot be used for this action.');
    err.status = 400;
    err.code = 'token_purpose_mismatch';
    throw err;
  }

  if (expectedUserId !== null && expectedUserId !== undefined && Number(row.user_id) !== Number(expectedUserId)) {
    const err = new Error('This link does not belong to the requested account.');
    err.status = 403;
    err.code = 'token_account_mismatch';
    throw err;
  }

  if (row.consumed_at) {
    const err = new Error('This link has already been used.');
    err.status = 400;
    err.code = 'token_used';
    throw err;
  }

  if (!row.expires_at || new Date(row.expires_at).getTime() <= Date.now()) {
    const err = new Error('This link has expired. Please request a new one.');
    err.status = 400;
    err.code = 'token_expired';
    throw err;
  }

  const consumed = await client.query(
    `UPDATE account_action_tokens
     SET consumed_at = NOW(),
         consumed_by_ip = $2
     WHERE id = $1
       AND consumed_at IS NULL
     RETURNING id, consumed_at`,
    [row.id, consumedByIp ? String(consumedByIp).slice(0, 64) : null]
  );

  if (!consumed.rows.length) {
    const err = new Error('This link has already been used.');
    err.status = 400;
    err.code = 'token_used';
    throw err;
  }

  return row;
}

module.exports = {
  TOKEN_PURPOSES,
  issueActionToken,
  inspectActionToken,
  consumeActionToken
};
