const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('./db');

/**
 * One-time containment for passwords that were committed or reset to published values.
 * Each affected account receives a random hash that is not stored or logged.
 * Those people sign in again through the forgot-password flow.
 */
const EXPOSED_ROSTER_EMAILS = [
  'admin@gelezasa.co.za',
  'exec@gelezasa.co.za',
  'principal@makgoka.co.za',
  'principal@mountainview.co.za',
  'teacher.science@gelezasa.co.za',
  'teacher.commerce@gelezasa.co.za',
  'parent.walters@gelezasa.co.za',
  'parent.modiba@gelezasa.co.za',
  'learner.walters@gelezasa.co.za',
  'learner.modiba@gelezasa.co.za',
  'admin@fusionhigh.co.za',
  '202247878@myturf.ul.ac.za'
];

async function applyBatch0CredentialRotation() {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS security_containment (
        id TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        affected_count INTEGER NOT NULL DEFAULT 0
      )
    `);
    const existing = await client.query(
      `SELECT id FROM security_containment WHERE id = 'batch0_admin_password_rotation'`
    );
    if (existing.rows.length > 0) {
      await client.query('COMMIT');
      return { applied: false, reason: 'already_applied' };
    }

    const users = await client.query(
      `SELECT id
       FROM users
       WHERE role_id = 1
          OR COALESCE(is_superadmin, FALSE) = TRUE
          OR role_id = (SELECT id FROM roles WHERE name = 'admin' LIMIT 1)
          OR LOWER(email) = ANY($1::text[])`,
      [EXPOSED_ROSTER_EMAILS]
    );

    for (const row of users.rows) {
      const secret = crypto.randomBytes(32).toString('base64url');
      const hash = await bcrypt.hash(secret, 10);
      await client.query(
        `UPDATE users
         SET password_hash = $1,
             active_session_id = NULL,
             reset_code = NULL,
             reset_expiry = NULL
         WHERE id = $2`,
        [hash, row.id]
      );
    }

    await client.query(
      `INSERT INTO security_containment (id, affected_count) VALUES ('batch0_admin_password_rotation', $1)`,
      [users.rows.length]
    );
    await client.query('COMMIT');
    console.log(`[SECURITY] Batch 0 rotated ${users.rows.length} administrator and exposed roster accounts and cleared their sessions.`);
    return { applied: true, count: users.rows.length };
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { applyBatch0CredentialRotation };

if (require.main === module) {
  applyBatch0CredentialRotation()
    .then((result) => {
      console.log(JSON.stringify({ applied: result.applied, count: result.count || 0, reason: result.reason || null }));
      process.exit(0);
    })
    .catch((err) => {
      console.error('[SECURITY] Batch 0 rotation failed:', err.message);
      process.exit(1);
    });
}
