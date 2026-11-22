'use strict';

const db = require('../../../db/db');
const { withTransaction } = require('../../../db/transaction');
const accountTokenService = require('./accountTokenService');
const emailService = require('./emailService');
const { TOKEN_PURPOSES, resolveFrontendOrigin } = require('../../../lib/authSecurity');
const { canDecideApplication } = require('./schoolScope');

/**
 * Controlled School Admin workflow for linking legacy/offline Learners to a Parent account.
 * - Strict same-school Admin/Principal isolation.
 * - Never generates or emails plaintext passwords.
 * - Never overwrites an existing Parent's password.
 * - Issues a single-use 72h 'legacy_parent_activation' link only if a brand-new passwordless Parent account is created.
 */
async function linkLegacyLearnerToParent({ req, actor, payload = {} }) {
  const childId = payload.child_id ? parseInt(payload.child_id, 10) : null;
  const learnerNumber = String(payload.learner_number || '').trim().toUpperCase();
  const parentEmail = String(payload.parent_email || '').trim().toLowerCase();
  const parentFirstName = String(payload.parent_first_name || payload.parent_name || 'Parent').trim();
  const parentSurname = String(payload.parent_surname || '').trim();
  const parentPhone = payload.parent_phone ? String(payload.parent_phone).trim() : null;
  const relationship = String(payload.relationship || 'Guardian').trim();

  if ((!childId && !learnerNumber) || !parentEmail || !parentEmail.includes('@')) {
    const err = new Error('A valid learner identifier (child_id or learner_number) and parent_email are required.');
    err.status = 400;
    throw err;
  }

  const txResult = await withTransaction(async (client) => {
    const childRes = childId
      ? await client.query('SELECT * FROM children WHERE id = $1 FOR UPDATE', [childId])
      : await client.query(
          'SELECT * FROM children WHERE UPPER(TRIM(learner_number)) = $1 FOR UPDATE',
          [learnerNumber]
        );
    const child = childRes.rows[0];
    if (!child) {
      const err = new Error('Legacy learner record not found.');
      err.status = 404;
      throw err;
    }

    if (!canDecideApplication(actor, child.school_id)) {
      const err = new Error('Cross-school legacy learner linkage is prohibited.');
      err.status = 403;
      throw err;
    }

    await client.query('SELECT pg_advisory_xact_lock(hashtext(lower($1)))', [parentEmail]);

    const existingUserRes = await client.query(
      `SELECT u.id, u.email, u.full_name, u.surname, u.password_hash, u.school_id,
              COALESCE(u.is_superadmin, FALSE) AS is_superadmin,
              LOWER(COALESCE(r.name, u.role_id::text, '')) AS role_name
       FROM users u
       LEFT JOIN roles r ON (u.role_id::text = r.id::text OR LOWER(r.name) = LOWER(u.role_id::text))
       WHERE LOWER(u.email) = LOWER($1)
       LIMIT 1`,
      [parentEmail]
    );

    let parentUser = existingUserRes.rows[0] || null;
    let createdNewParent = false;
    let activationToken = null;

    if (parentUser) {
      if (parentUser.is_superadmin) {
        const err = new Error('Cannot link a platform administrator account as a learner parent.');
        err.status = 403;
        throw err;
      }
    } else {
      const roleRes = await client.query("SELECT id FROM roles WHERE LOWER(name) = 'parent' LIMIT 1");
      const parentRoleId = roleRes.rows[0]?.id || 4;
      const inserted = await client.query(
        `INSERT INTO users (
           email, password_hash, email_verification_status, role_id,
           full_name, surname, phone, school_id
         ) VALUES ($1, NULL, 'pending_verification', $2, $3, $4, $5, $6)
         RETURNING id, email, full_name, surname, password_hash, school_id`,
        [parentEmail, parentRoleId, parentFirstName, parentSurname, parentPhone, child.school_id]
      );
      parentUser = inserted.rows[0];
      createdNewParent = true;

      const issued = await accountTokenService.issueActionToken(client, {
        userId: parentUser.id,
        purpose: TOKEN_PURPOSES.LEGACY_PARENT_ACTIVATION,
        createdByUserId: actor.id,
        childId: child.id,
        schoolId: child.school_id
      });
      activationToken = issued.token;
    }

    let isPrimary = true;
    if (!child.parent_id) {
      await client.query('UPDATE children SET parent_id = $1 WHERE id = $2', [parentUser.id, child.id]);
    } else if (Number(child.parent_id) !== Number(parentUser.id)) {
      await client.query('UPDATE children SET secondary_parent_id = $1 WHERE id = $2', [parentUser.id, child.id]);
      isPrimary = false;
    }

    await client.query(
      `INSERT INTO parent_children (parent_id, child_id, relationship, is_primary)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (parent_id, child_id) DO NOTHING`,
      [parentUser.id, child.id, relationship, isPrimary]
    );

    const schoolRes = await client.query('SELECT id, name FROM schools WHERE id = $1 LIMIT 1', [child.school_id]);
    return {
      child,
      parentUser,
      createdNewParent,
      activationToken,
      schoolName: schoolRes.rows[0]?.name || 'Geleza SA Partner School'
    };
  });

  const baseUrl = resolveFrontendOrigin(req);
  if (txResult.activationToken) {
    const activationUrl = `${baseUrl}/activate?token=${encodeURIComponent(txResult.activationToken)}`;
    await emailService.sendAccountActivationNotice({
      recipientEmail: txResult.parentUser.email,
      recipientName: `${txResult.parentUser.full_name || ''} ${txResult.parentUser.surname || ''}`.trim() || 'Parent / Guardian',
      schoolName: txResult.schoolName,
      roleLabel: 'Parent / Guardian',
      activationUrl
    }).catch(() => {});
  } else {
    await emailService.sendChildLinkageEmail({
      parentEmail: txResult.parentUser.email,
      parentName: `${txResult.parentUser.full_name || ''} ${txResult.parentUser.surname || ''}`.trim() || 'Parent / Guardian',
      childName: txResult.child.full_name,
      surname: txResult.child.surname,
      learnerNumber: txResult.child.learner_number,
      grade: txResult.child.grade,
      stream: txResult.child.stream,
      baseUrl
    }).catch(() => {});
  }

  return {
    success: true,
    child_id: txResult.child.id,
    learner_number: txResult.child.learner_number,
    parent_user_id: txResult.parentUser.id,
    parent_email: txResult.parentUser.email,
    created_new_parent: txResult.createdNewParent,
    activation_required: Boolean(txResult.activationToken),
    message: txResult.createdNewParent
      ? 'Legacy learner linked. A secure one-time activation email has been sent to the parent.'
      : 'Legacy learner linked to the existing parent account without modifying their password.'
  };
}

module.exports = { linkLegacyLearnerToParent };
