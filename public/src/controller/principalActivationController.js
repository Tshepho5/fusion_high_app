'use strict';

const db = require('../../../db/db');
const bcrypt = require('bcryptjs');
const { withTransaction } = require('../../../db/transaction');
const emailService = require('../services/emailService');
const activation = require('../services/principalActivation');
const accountTokenService = require('../services/accountTokenService');
const { validatePassword } = require('./authController');
const {
  TOKEN_PURPOSES,
  NON_ENUMERATING_VERIFICATION_RESEND_MESSAGE,
  resolveFrontendOrigin
} = require('../../../lib/authSecurity');

function pageOrigin(req) {
  return resolveFrontendOrigin(req);
}

function invitationLink(req, token, mode = 'activate') {
  const origin = pageOrigin(req);
  if (mode === 'verify') {
    return `${origin}/verify-email?token=${encodeURIComponent(token)}`;
  }
  return `${origin}/activate?token=${encodeURIComponent(token)}`;
}

async function sendInvitation(req, user, token) {
  const school = user.school_id
    ? await db.query('SELECT name, emis_number FROM schools WHERE id = $1', [user.school_id])
    : { rows: [] };
  const roleRes = user.role_id
    ? await db.query('SELECT LOWER(name) AS name FROM roles WHERE id::text = $1::text LIMIT 1', [String(user.role_id)])
    : { rows: [] };
  const roleName = roleRes.rows[0]?.name || 'admin';
  const activationUrl = invitationLink(req, token);

  if (roleName === 'parent' || roleName === 'learner' || roleName === 'student') {
    await emailService.sendAccountActivationNotice({
      recipientEmail: user.email,
      recipientName: `${user.full_name || ''} ${user.surname || ''}`.trim() || 'User',
      schoolName: school.rows[0]?.name || '',
      roleLabel: roleName === 'parent' ? 'Parent / Guardian' : 'Learner',
      activationUrl
    });
    return;
  }

  await emailService.sendSchoolApplicationApprovedNotice({
    principalEmail: user.email,
    principalName: `${user.full_name || ''} ${user.surname || ''}`.trim() || 'Principal',
    schoolName: school.rows[0]?.name || 'your school',
    emisNumber: school.rows[0]?.emis_number || '',
    activationUrl
  });
}

/**
 * Inspects a token without consuming it so the frontend can display purpose-specific instructions.
 * Never leaks secrets or arbitrary account metadata.
 */
exports.inspectToken = async (req, res) => {
  const token = String(req.query?.token || req.body?.token || '').trim();
  if (token.length < 20 || token.length > 200) {
    return res.status(400).json({ valid: false, reason: 'invalid', error: 'This link is not valid.' });
  }
  try {
    const inspected = await accountTokenService.inspectActionToken(db, { token });
    if (inspected) {
      if (!inspected.valid) {
        return res.status(400).json({
          valid: false,
          reason: inspected.reason,
          purpose: inspected.purpose,
          error:
            inspected.reason === 'expired'
              ? 'This secure link has expired. Please request a new one.'
              : inspected.reason === 'already_used'
                ? 'This secure link has already been used.'
                : 'This secure link is not valid.'
        });
      }
      const isVerifyOnly = inspected.purpose === TOKEN_PURPOSES.PARENT_EMAIL_VERIFY;
      const isLearnerFlow = [
        TOKEN_PURPOSES.LEARNER_EMAIL_ACTIVATION,
        TOKEN_PURPOSES.LEARNER_PARENT_HANDOFF,
        TOKEN_PURPOSES.LEARNER_PASSWORD_RESET_HANDOFF
      ].includes(inspected.purpose);
      return res.json({
        valid: true,
        purpose: inspected.purpose,
        requires_password: !isVerifyOnly,
        role: isLearnerFlow ? 'learner' : String(inspected.role_name || '').toLowerCase(),
        learner_number: isLearnerFlow ? inspected.learner_number || null : null,
        expires_at: inspected.expires_at
      });
    }

    // Legacy users.activation_token_hash inspection fallback
    const tokenHash = activation.hashToken(token);
    const legacyRes = await db.query(
      `SELECT u.id, u.activation_expires_at, u.password_hash, COALESCE(u.is_superadmin, FALSE) AS is_superadmin,
              COALESCE(r.name, u.role_id::text, '') AS role_name
       FROM users u
       LEFT JOIN roles r ON (u.role_id::text = r.id::text OR LOWER(r.name) = LOWER(u.role_id::text))
       WHERE u.activation_token_hash = $1
       LIMIT 1`,
      [tokenHash]
    );
    const legacy = legacyRes.rows[0];
    if (!legacy || legacy.is_superadmin) {
      return res.status(400).json({ valid: false, reason: 'invalid', error: 'This activation link is not valid.' });
    }
    if (!legacy.activation_expires_at || new Date(legacy.activation_expires_at).getTime() <= Date.now()) {
      return res.status(400).json({ valid: false, reason: 'expired', error: 'This activation link has expired.' });
    }
    if (legacy.password_hash) {
      return res.status(400).json({ valid: false, reason: 'already_used', error: 'This activation link has already been used.' });
    }
    return res.json({
      valid: true,
      purpose: 'legacy_activation',
      requires_password: true,
      role: String(legacy.role_name || '').toLowerCase(),
      learner_number: null,
      expires_at: legacy.activation_expires_at
    });
  } catch (err) {
    console.error('[TOKEN INSPECT ERROR]:', err.message);
    return res.status(500).json({ valid: false, error: 'Could not check this link.' });
  }
};

/**
 * Verifies a new Parent's email ownership via single-use 'parent_email_verify' token.
 */
exports.verifyEmail = async (req, res) => {
  const token = String(req.body?.token || req.query?.token || '').trim();
  if (token.length < 20 || token.length > 200) {
    return res.status(400).json({ error: 'This email verification link is not valid.', code: 'token_invalid' });
  }
  try {
    const ip = req.ip || null;
    await withTransaction(async (client) => {
      const consumed = await accountTokenService.consumeActionToken(client, {
        token,
        allowedPurposes: [TOKEN_PURPOSES.PARENT_EMAIL_VERIFY],
        consumedByIp: ip
      });

      const updated = await client.query(
        `UPDATE users
         SET email_verified_at = COALESCE(email_verified_at, NOW()),
             email_verification_status = 'verified'
         WHERE id = $1
           AND COALESCE(is_superadmin, FALSE) = FALSE
         RETURNING id, email`,
        [consumed.user_id]
      );
      if (!updated.rows.length) {
        const err = new Error('This account could not be verified.');
        err.status = 400;
        throw err;
      }
      return updated.rows[0];
    });

    return res.json({
      success: true,
      verified: true,
      message: 'Your email address has been verified. You can now sign in with your email and password to track your application.'
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message, code: err.code || undefined });
    }
    console.error('[VERIFY EMAIL ERROR]:', err.message);
    return res.status(500).json({ error: 'Email verification could not be completed.' });
  }
};

/**
 * Resends a Parent email verification link without leaking whether the email exists.
 */
exports.resendVerificationEmail = async (req, res) => {
  const generic = {
    success: true,
    message: NON_ENUMERATING_VERIFICATION_RESEND_MESSAGE
  };
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email.includes('@') || email.length > 200) {
    return res.json(generic);
  }
  try {
    const found = await db.query(
      `SELECT id, email, full_name, surname, school_id, password_hash,
              email_verification_status, COALESCE(is_superadmin, FALSE) AS is_superadmin
       FROM users
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [email]
    );
    const user = found.rows[0];
    if (
      user &&
      !user.is_superadmin &&
      user.password_hash &&
      String(user.email_verification_status || '').toLowerCase() === 'pending_verification'
    ) {
      const issued = await accountTokenService.issueActionToken(db, {
        userId: user.id,
        purpose: TOKEN_PURPOSES.PARENT_EMAIL_VERIFY,
        schoolId: user.school_id || null
      });
      const verifyUrl = invitationLink(req, issued.token, 'verify');
      const schoolRes = user.school_id
        ? await db.query('SELECT name FROM schools WHERE id = $1 LIMIT 1', [user.school_id])
        : { rows: [] };
      await emailService.sendParentEmailVerification({
        recipientEmail: user.email,
        recipientName: `${user.full_name || ''} ${user.surname || ''}`.trim() || 'Parent / Guardian',
        schoolName: schoolRes.rows[0]?.name || 'Geleza SA',
        verificationUrl: verifyUrl
      }).catch(() => {});
    }
    return res.json(generic);
  } catch (_) {
    return res.json(generic);
  }
};

/**
 * Activates a passwordless account (or completes a Learner Parent-handoff / reset handoff)
 * via atomic single-use token consumption.
 */
exports.activate = async (req, res) => {
  const token = String(req.body?.token || '').trim();
  const password = String(req.body?.password || '');
  const confirm = String(req.body?.confirm_password || req.body?.password_confirm || '');
  const expectedLearnerNumber = String(req.body?.learner_number || '').trim().toUpperCase();

  if (token.length < 20 || token.length > 200) {
    return res.status(400).json({ error: 'This activation link is not valid.', code: 'token_invalid' });
  }
  const problem = validatePassword(password);
  if (problem) return res.status(400).json({ error: problem });
  if (!confirm || confirm !== password) {
    return res.status(400).json({ error: 'The two passwords do not match.' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const ip = req.ip || null;

    const saved = await withTransaction(async (client) => {
      // 1. Check purpose-specific account_action_tokens first
      const tokenHash = activation.hashToken(token);
      const tokenLookup = await client.query(
        'SELECT id, purpose FROM account_action_tokens WHERE token_hash = $1 LIMIT 1',
        [tokenHash]
      );

      if (tokenLookup.rows.length > 0) {
        const consumed = await accountTokenService.consumeActionToken(client, {
          token,
          allowedPurposes: [
            TOKEN_PURPOSES.PARENT_ACTIVATION,
            TOKEN_PURPOSES.LEARNER_EMAIL_ACTIVATION,
            TOKEN_PURPOSES.LEARNER_PARENT_HANDOFF,
            TOKEN_PURPOSES.LEARNER_PASSWORD_RESET_HANDOFF,
            TOKEN_PURPOSES.PRINCIPAL_ACTIVATION,
            TOKEN_PURPOSES.LEGACY_PARENT_ACTIVATION
          ],
          consumedByIp: ip
        });

        const isResetHandoff = consumed.purpose === TOKEN_PURPOSES.LEARNER_PASSWORD_RESET_HANDOFF;
        const isLearnerFlow = [
          TOKEN_PURPOSES.LEARNER_EMAIL_ACTIVATION,
          TOKEN_PURPOSES.LEARNER_PARENT_HANDOFF,
          TOKEN_PURPOSES.LEARNER_PASSWORD_RESET_HANDOFF
        ].includes(consumed.purpose);

        if (!isResetHandoff && consumed.password_hash) {
          const err = new Error('This account already has a password. Use sign in or password recovery.');
          err.status = 409;
          err.code = 'already_activated';
          throw err;
        }

        let learnerNumber = null;
        if (isLearnerFlow) {
          // Learner activation/handoff ONLY permitted after registration completion (active child with Official Learner Number)
          const childRes = await client.query(
            `SELECT c.id, c.learner_number, c.is_active, c.school_id
             FROM children c
             WHERE c.learner_user_id = $1
               AND COALESCE(c.is_active, TRUE) = TRUE
               AND c.learner_number IS NOT NULL
               AND TRIM(c.learner_number) <> ''
               AND ($2::int IS NULL OR c.id = $2::int)
             ORDER BY c.id DESC
             LIMIT 1`,
            [consumed.user_id, consumed.child_id || null]
          );
          const childRow = childRes.rows[0];
          if (!childRow) {
            const err = new Error('Learner password activation is only available after the learner has completed school registration.');
            err.status = 409;
            err.code = 'registration_required';
            throw err;
          }
          learnerNumber = String(childRow.learner_number).trim();
          if (expectedLearnerNumber && expectedLearnerNumber !== learnerNumber.toUpperCase()) {
            const err = new Error('This activation link does not belong to that Learner Number.');
            err.status = 403;
            err.code = 'token_account_mismatch';
            throw err;
          }
        }

        const verifiesRealInbox = [
          TOKEN_PURPOSES.PARENT_ACTIVATION,
          TOKEN_PURPOSES.LEARNER_EMAIL_ACTIVATION,
          TOKEN_PURPOSES.PRINCIPAL_ACTIVATION,
          TOKEN_PURPOSES.LEGACY_PARENT_ACTIVATION
        ].includes(consumed.purpose);

        const updated = await client.query(
          `UPDATE users
           SET password_hash = $1,
               password_set_at = NOW(),
               activation_token_hash = NULL,
               activation_expires_at = NULL,
               activation_purpose = NULL,
               active_session_id = CASE WHEN $4::boolean THEN NULL ELSE active_session_id END,
               email_verified_at = CASE WHEN $3::boolean THEN COALESCE(email_verified_at, NOW()) ELSE email_verified_at END,
               email_verification_status = CASE
                 WHEN $3::boolean THEN 'verified'
                 WHEN email_verification_status = 'verified' THEN 'verified'
                 ELSE 'legacy_unverified'
               END,
               is_superadmin = FALSE
           WHERE id = $2
             AND COALESCE(is_superadmin, FALSE) = FALSE
           RETURNING id, email`,
          [passwordHash, consumed.user_id, verifiesRealInbox, isResetHandoff]
        );
        if (!updated.rows.length) {
          const err = new Error('This activation link could not be completed.');
          err.status = 400;
          throw err;
        }

        return {
          id: updated.rows[0].id,
          email: isLearnerFlow ? null : updated.rows[0].email,
          role: isLearnerFlow ? 'learner' : String(consumed.role_name || '').toLowerCase(),
          purpose: consumed.purpose,
          learner_number: learnerNumber
        };
      }

      // 2. Backward-compatible fallback for in-flight legacy users.activation_token_hash tokens
      const found = await client.query(
        `SELECT u.id, u.email, COALESCE(u.is_superadmin, FALSE) AS is_superadmin, u.password_hash, u.activation_expires_at,
                COALESCE(r.name, u.role_id::text, '') AS role_name
         FROM users u
         LEFT JOIN roles r ON (u.role_id::text = r.id::text OR LOWER(r.name) = LOWER(u.role_id::text))
         WHERE u.activation_token_hash = $1
         FOR UPDATE OF u`,
        [tokenHash]
      );
      const user = found.rows[0];
      if (!user || user.is_superadmin) {
        const error = new Error('This invitation link is not valid.');
        error.status = 400;
        error.code = 'token_invalid';
        throw error;
      }
      if (!user.activation_expires_at || new Date(user.activation_expires_at).getTime() <= Date.now()) {
        const error = new Error('This invitation has expired. Ask Geleza SA to send a new one.');
        error.status = 400;
        error.code = 'activation_expired';
        throw error;
      }
      const updated = await client.query(
        `UPDATE users
         SET password_hash = $1,
             password_set_at = NOW(),
             email_verified_at = COALESCE(email_verified_at, NOW()),
             email_verification_status = 'verified',
             activation_token_hash = NULL,
             activation_expires_at = NULL,
             is_superadmin = FALSE
         WHERE id = $2
           AND activation_token_hash = $3
           AND COALESCE(is_superadmin, FALSE) = FALSE
           AND password_hash IS NULL
         RETURNING id, email`,
        [passwordHash, user.id, tokenHash]
      );
      if (!updated.rows.length) {
        const error = new Error('This invitation has already been used.');
        error.status = 400;
        error.code = 'token_used';
        throw error;
      }
      return {
        id: updated.rows[0].id,
        email: updated.rows[0].email,
        role: String(user.role_name || '').toLowerCase(),
        purpose: 'legacy_activation',
        learner_number: null
      };
    });

    const isLearner = saved.role === 'learner' || Boolean(saved.learner_number);
    return res.json({
      success: true,
      role: saved.role,
      purpose: saved.purpose,
      learner_number: saved.learner_number || undefined,
      message: isLearner && saved.learner_number
        ? `Your Learner password is ready. You can now sign in using your Official Learner Number (${saved.learner_number}) and your new password.`
        : 'Your password is ready. You can sign in with your email and password.'
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message, code: err.code || undefined });
    console.error('Account activation failed:', err.message);
    return res.status(500).json({ error: 'The password could not be saved.' });
  }
};

exports.resendPublic = async (req, res) => {
  const generic = {
    success: true,
    message: 'If that account is waiting for activation or email verification, a new link has been sent.'
  };
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email.includes('@') || email.length > 200) return res.json(generic);
  try {
    const found = await db.query(
      `SELECT u.id, u.email, u.full_name, u.surname, u.role_id, u.school_id,
              u.password_hash, u.email_verification_status,
              COALESCE(u.is_superadmin, FALSE) AS is_superadmin,
              LOWER(COALESCE(r.name, u.role_id::text, '')) AS role_name
       FROM users u
       LEFT JOIN roles r ON (u.role_id::text = r.id::text OR LOWER(r.name) = LOWER(u.role_id::text))
       WHERE LOWER(u.email) = LOWER($1)
       LIMIT 1`,
      [email]
    );
    const user = found.rows[0];
    if (!user || user.is_superadmin) return res.json(generic);

    // Case 1: New Parent who already chose their password and is waiting for email verification
    if (user.password_hash && String(user.email_verification_status || '').toLowerCase() === 'pending_verification') {
      const issued = await accountTokenService.issueActionToken(db, {
        userId: user.id,
        purpose: TOKEN_PURPOSES.PARENT_EMAIL_VERIFY,
        schoolId: user.school_id || null
      });
      const verifyUrl = invitationLink(req, issued.token, 'verify');
      const schoolRes = user.school_id
        ? await db.query('SELECT name FROM schools WHERE id = $1 LIMIT 1', [user.school_id])
        : { rows: [] };
      await emailService.sendParentEmailVerification({
        recipientEmail: user.email,
        recipientName: `${user.full_name || ''} ${user.surname || ''}`.trim() || 'Parent / Guardian',
        schoolName: schoolRes.rows[0]?.name || 'Geleza SA',
        verificationUrl: verifyUrl
      }).catch(() => {});
      return res.json(generic);
    }

    // Case 2: Passwordless Learner (only resend if already registered with active child row!)
    if (!user.password_hash && (user.role_name === 'learner' || user.role_name === 'student')) {
      const childRes = await db.query(
        `SELECT id, learner_number, school_id FROM children
         WHERE learner_user_id = $1 AND COALESCE(is_active, TRUE) = TRUE AND learner_number IS NOT NULL
         LIMIT 1`,
        [user.id]
      );
      if (childRes.rows[0]) {
        const issued = await accountTokenService.issueActionToken(db, {
          userId: user.id,
          purpose: TOKEN_PURPOSES.LEARNER_EMAIL_ACTIVATION,
          childId: childRes.rows[0].id,
          schoolId: childRes.rows[0].school_id || user.school_id || null
        });
        const activationUrl = invitationLink(req, issued.token, 'activate');
        const schoolRes = user.school_id
          ? await db.query('SELECT name FROM schools WHERE id = $1 LIMIT 1', [user.school_id])
          : { rows: [] };
        await emailService.sendLearnerActivationInvite({
          learnerEmail: user.email,
          learnerName: `${user.full_name || ''} ${user.surname || ''}`.trim() || 'Learner',
          learnerNumber: childRes.rows[0].learner_number,
          schoolName: schoolRes.rows[0]?.name || 'Geleza SA',
          activationUrl
        }).catch(() => {});
      }
      return res.json(generic);
    }

    // Case 3: Passwordless Principal/Admin/Legacy Parent
    if (!user.password_hash) {
      const token = await activation.issue(db, user.id);
      await sendInvitation(req, user, token).catch(() => {});
    }
    return res.json(generic);
  } catch (_) {
    return res.json(generic);
  }
};
