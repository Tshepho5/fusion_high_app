const crypto = require('crypto');

const ACTIVATION_HOURS = 72;

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function createToken() {
  const token = crypto.randomBytes(32).toString('base64url');
  return { token, hash: hashToken(token) };
}

async function ensureColumns(runner) {
  await runner.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS activation_token_hash VARCHAR(64)');
  await runner.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS activation_expires_at TIMESTAMPTZ');
  await runner.query('ALTER TABLE school_applications ADD COLUMN IF NOT EXISTS authority_review JSONB');
}

/**
 * Stores only the hash. The raw token is returned to the caller so it can be emailed once.
 */
async function issue(runner, userId) {
  await ensureColumns(runner);
  const created = createToken();
  const saved = await runner.query(
    `UPDATE users
     SET activation_token_hash = $1,
         activation_expires_at = NOW() + ($3::int * INTERVAL '1 hour'),
         password_hash = NULL
     WHERE id = $2 AND is_superadmin = FALSE
     RETURNING id`,
    [created.hash, userId, ACTIVATION_HOURS]
  );
  if (!saved.rows.length) {
    const error = new Error('This account cannot receive a principal invitation.');
    error.status = 409;
    throw error;
  }
  return created.token;
}

function readAuthorityReview(body) {
  const source = body && typeof body.authority_review === 'object' && body.authority_review
    ? body.authority_review
    : {};
  const yes = (value) => value === true || value === 'true' || value === 'yes' || value === 'on';
  const notes = String(source.notes || '').replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 2000);
  return {
    emis_checked: yes(source.emis_checked),
    name_and_location_checked: yes(source.name_and_location_checked),
    independent_contact_checked: yes(source.independent_contact_checked),
    applicant_authority_checked: yes(source.applicant_authority_checked),
    notes,
    id_checksum_is_not_proof: true
  };
}

module.exports = {
  ACTIVATION_HOURS,
  hashToken,
  createToken,
  ensureColumns,
  issue,
  readAuthorityReview
};
