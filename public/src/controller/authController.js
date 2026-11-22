'use strict';

const crypto = require('crypto');
const db = require('../../../db/db');
const { db: firestore } = require('../../../db/firebase');
const { withTransaction } = require('../../../db/transaction');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { attachSessionCookie, ensureActiveSessionColumn } = require('../../../authMiddleware');
const emailService = require('../services/emailService');
const { findLinkableLearner } = require('../services/learnerMatch');
const {
  MAX_RESET_ATTEMPTS,
  NON_ENUMERATING_LOGIN_ERROR,
  NON_ENUMERATING_RECOVERY_MESSAGE,
  classifyLoginIdentifier,
  evaluateEmailVerificationAccess,
  generateResetOtp,
  hashSecretValue,
  verifySecretHash,
  resolveFrontendOrigin,
  maskEmailAddress
} = require('../../../lib/authSecurity');

const SESSION_SELECT_COLS = `
            u.id, u.email, u.password_hash, u.password_set_at,
            u.email_verified_at, u.email_verification_status,
            u.id_number::text as id_number, u.phone::text as phone, u.full_name, u.surname,
            COALESCE(u.is_superadmin, FALSE) as is_superadmin,
            COALESCE(u.school_id, c.school_id) as school_id,
            COALESCE(r.name, u.role_id::text, 'learner') as role_name,
            c.id as child_id, c.learner_number::text as learner_number, c.grade, c.stream,
            COALESCE(c.is_active, TRUE) as child_is_active,
            s.name as school_name, s.slug as school_slug, s.domain as school_domain, s.emis_number,
            s.circuit, s.district, s.province, s.physical_address, s.contact_email, s.contact_phone,
            s.principal_name, s.logo_url, s.badge_url, s.primary_color, s.secondary_color, s.accent_color,
            s.motto, s.curriculum_type
        `;

const SESSION_USER_JOINS = `
                 FROM users u
                 LEFT JOIN roles r ON (u.role_id::text = r.id::text OR LOWER(r.name) = LOWER(u.role_id::text))
                 LEFT JOIN children c ON (c.learner_user_id::text = u.id::text AND COALESCE(c.is_active, TRUE) = TRUE)
                 LEFT JOIN schools s ON (s.id::text = COALESCE(u.school_id, c.school_id)::text)
`;

exports.loadSessionUser = async (userId) => {
  const result = await db.query(
    `SELECT ${SESSION_SELECT_COLS} ${SESSION_USER_JOINS} WHERE u.id::text = $1 ORDER BY u.id ASC LIMIT 1`,
    [String(userId)]
  );
  return result.rows[0] || null;
};

exports.issueLoginSession = async (user, res, rawIdentifier) => {
  const isSuperAdmin = Boolean(user.is_superadmin);
  let isTester = false;
  try {
    const state = await db.query(
      'SELECT deactivated_at, COALESCE(is_tester, FALSE) AS is_tester FROM users WHERE id = $1',
      [user.id]
    );
    if (state.rows[0] && state.rows[0].deactivated_at) {
      return res.status(401).json({ error: 'This account is deactivated.', code: 'deactivated' });
    }
    isTester = Boolean(state.rows[0] && state.rows[0].is_tester === true);
  } catch (_) {
    isTester = false;
  }

  await ensureActiveSessionColumn();

  const sessionId = crypto.randomUUID();
  await db.query(
    'UPDATE users SET active_session_id = $1, session_seen_at = NOW(), last_seen_at = NOW(), is_online = TRUE WHERE id = $2',
    [sessionId, user.id]
  );

  const signingSecret = process.env.JWT_SECRET;
  if (!signingSecret) {
    return res.status(500).json({ error: 'Server signing secret is not configured.' });
  }

  const token = jwt.sign(
    {
      id: user.id,
      role: user.role_name,
      email: user.email,
      full_name: user.full_name,
      school_id: user.school_id,
      is_superadmin: isSuperAdmin,
      sid: sessionId
    },
    signingSecret,
    { expiresIn: '7d' }
  );
  attachSessionCookie(res, token);

  const schoolObj = user.school_id
    ? {
        id: user.school_id,
        name: user.school_name,
        slug: user.school_slug,
        domain: user.school_domain,
        emis_number: user.emis_number,
        circuit: user.circuit,
        district: user.district,
        province: user.province,
        physical_address: user.physical_address,
        contact_email: user.contact_email,
        contact_phone: user.contact_phone,
        principal_name: user.principal_name,
        logo_url: user.logo_url,
        badge_url: user.badge_url,
        primary_color: user.primary_color || '#4f46e5',
        secondary_color: user.secondary_color || '#06b6d4',
        accent_color: user.accent_color || '#f59e0b',
        motto: user.motto,
        curriculum_type: user.curriculum_type,
        is_active: true
      }
    : null;

  return res.json({
    token,
    role: user.role_name,
    school_id: user.school_id,
    school: schoolObj,
    user: {
      id: user.id,
      email: user.email,
      full_name: `${user.full_name || ''} ${user.surname || ''}`.trim(),
      role: user.role_name,
      school_id: user.school_id,
      school_name: user.school_name,
      school_slug: user.school_slug,
      is_superadmin: isSuperAdmin,
      is_tester: isTester,
      learner_number: user.learner_number || (user.role_name === 'learner' ? rawIdentifier : undefined),
      grade: user.grade,
      stream: user.stream,
      email_verification_status: user.email_verification_status || null
    }
  });
};

const validatePassword = (password) => {
  if (!password) return 'Password is required.';
  if (typeof password !== 'string') return 'Invalid password format.';
  const minLength = 8;
  if (password.length < minLength) return `Password must be at least ${minLength} characters long.`;
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter.';
  if (!/\d/.test(password)) return 'Password must contain at least one number.';
  if (!/[!@#$%^&*(),.?":{}|<> ]/.test(password)) return 'Password must contain at least one special character.';
  return null;
};

/**
 * Neutralized email availability check (prevents account enumeration).
 */
exports.checkEmail = async (req, res) => {
  const email = (req.query.email || req.body?.email || '').toString().toLowerCase().trim();
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }
  return res.json({
    checked: true,
    message: 'Enter your details to continue. Existing parents should sign in first.'
  });
};

/**
 * Verifies if a learner exists in the system (used only by controlled workflows).
 */
exports.verifyLearner = async (req, res) => {
  const firstName = (req.body.first_name || req.body.name || req.query.first_name || '').toString().trim();
  const surname = (req.body.surname || req.query.surname || '').toString().trim();
  const idNumber = (req.body.id_number || req.body.idNumber || req.query.id_number || '').toString().replace(/\D/g, '').trim();
  const learnerNumber = (req.body.learner_number || req.body.learnerNumber || req.query.learner_number || '').toString().trim();

  if (!learnerNumber || idNumber.length !== 13 || !firstName || !surname) {
    return res.status(400).json({
      error: 'The official learner number, a 13-digit ID, the first name, and the surname are all required.'
    });
  }

  try {
    const learner = await findLinkableLearner({ learnerNumber, idNumber, firstName, surname });

    if (!learner) {
      return res.status(404).json({
        error: 'Those details could not be matched to an active learner record.'
      });
    }
    return res.json({
      verified: true,
      learner: {
        id: learner.id,
        full_name: learner.full_name,
        surname: learner.surname,
        learner_number: learner.learner_number,
        grade: learner.grade,
        stream: learner.stream,
        class_name: learner.class_name || `Grade ${learner.grade}A`,
        subjects: learner.subjects || []
      }
    });
  } catch (err) {
    console.error('Error verifying learner details:', err);
    return res.status(500).json({ error: 'Database verification failed.' });
  }
};

async function generateOfficialLearnerNumber(year = new Date().getFullYear()) {
  const currentYear = year || new Date().getFullYear();
  const prefix = `${currentYear}`;
  try {
    const [childRes, appRes] = await Promise.all([
      db.query("SELECT learner_number FROM children WHERE learner_number LIKE $1 OR learner_number ~ '^[0-9]+$'", [`${prefix}%`]),
      db.query('SELECT provisional_learner_number FROM applications WHERE provisional_learner_number LIKE $1', [`${prefix}%`])
    ]);

    let maxSeq = 0;
    const existingSet = new Set();

    const allRows = [...(childRes.rows || []), ...(appRes.rows || [])];
    for (const row of allRows) {
      const val = row.learner_number || row.provisional_learner_number || '';
      const numStr = val.replace(/\D/g, '');
      if (numStr.startsWith(prefix) && numStr.length === prefix.length + 4) {
        existingSet.add(numStr);
        const seq = parseInt(numStr.slice(prefix.length), 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }

    let nextSeq = maxSeq + 1;
    let candidate = `${prefix}${nextSeq.toString().padStart(4, '0')}`;
    while (existingSet.has(candidate)) {
      nextSeq += 1;
      candidate = `${prefix}${nextSeq.toString().padStart(4, '0')}`;
    }
    return candidate;
  } catch (_) {
    return `${currentYear}0001`;
  }
}

function getSchoolAcZaDomain(school) {
  if (!school) return 'fusionhigh.ac.za';
  if (typeof school === 'string') {
    const clean = school.toLowerCase().replace(/[^a-z0-9]/g, '');
    return clean ? `${clean}.ac.za` : 'fusionhigh.ac.za';
  }
  const slug = (school.slug || school.domain || school.name || '').toLowerCase();
  let cleanSlug = slug
    .replace(/\.co\.za|\.org\.za|\.gov\.za|\.ac\.za/g, '')
    .replace(/-secondary-lotus/g, 'secondary')
    .replace(/-high|-secondary/g, '')
    .replace(/[^a-z0-9]/g, '');
  if (slug.includes('fusion') && slug.includes('lotus')) cleanSlug = 'fusionsecondary';
  else if (slug.includes('fusion')) cleanSlug = 'fusionhigh';
  return cleanSlug ? `${cleanSlug}.ac.za` : 'fusionhigh.ac.za';
}

exports.generateOfficialLearnerNumber = generateOfficialLearnerNumber;
exports.getSchoolAcZaDomain = getSchoolAcZaDomain;

/**
 * Legacy public Parent / Learner self-registration has been retired (Phase M2.5).
 * - New families apply via /application.html (creating & verifying Parent account safely).
 * - Existing Parents sign in at /login.
 * - Invited Teachers register exclusively via /api/staff-invites/... with a Principal invite token.
 * - Legacy offline learners are linked by School Admin via /api/admin/legacy-learners/link.
 */
exports.registerUser = async (req, res) => {
  return res.status(410).json({
    success: false,
    code: 'legacy_registration_retired',
    error: 'Public parent and learner registration has been retired. New families should submit an admission application, and existing parents should sign in with their account.',
    apply_url: '/application.html',
    login_url: '/login'
  });
};

/**
 * Strict, non-enumerating account resolver for Login.
 * - Email identifier (`@`): matches ONLY users.email.
 * - Learner Number identifier (non-email): matches ONLY an active registered learner's children.learner_number
 *   where role is learner/student, children.is_active = TRUE, and school ownership matches.
 * - NEVER conflates phone numbers, SA IDs, or linked Parent accounts with Learner Numbers.
 */
async function resolveLoginCandidate(rawIdentifier) {
  const classified = classifyLoginIdentifier(rawIdentifier);
  if (classified.kind === 'invalid') return { classified, user: null };

  if (classified.kind === 'email') {
    const result = await db.query(
      `SELECT ${SESSION_SELECT_COLS}
       ${SESSION_USER_JOINS}
       WHERE LOWER(TRIM(u.email::text)) = $1
       ORDER BY u.id ASC
       LIMIT 1`,
      [classified.normalized]
    );
    return { classified, user: result.rows[0] || null };
  }

  // Strict Learner Number lookup: ONLY active enrolled learners with matching school_id
  const result = await db.query(
    `SELECT ${SESSION_SELECT_COLS}
     FROM children c
     JOIN users u ON u.id::text = c.learner_user_id::text
     LEFT JOIN roles r ON (u.role_id::text = r.id::text OR LOWER(r.name) = LOWER(u.role_id::text))
     LEFT JOIN schools s ON (s.id::text = c.school_id::text)
     WHERE COALESCE(c.is_active, TRUE) = TRUE
       AND c.learner_number IS NOT NULL
       AND UPPER(TRIM(c.learner_number::text)) = $1
       AND LOWER(COALESCE(r.name, u.role_id::text, '')) IN ('learner', 'student')
       AND c.school_id IS NOT NULL
       AND (u.school_id IS NULL OR u.school_id = c.school_id)
     ORDER BY c.id DESC
     LIMIT 1`,
    [classified.normalized]
  );
  return { classified, user: result.rows[0] || null };
}

exports.login = async (req, res) => {
  const rawIdentifier = (req.body.email || req.body.learnerNumber || req.body.identifier || '').toString().trim();
  const rawPassword = (req.body.password || '').toString();

  if (!rawIdentifier || !rawPassword) {
    return res.status(400).json({ error: 'Please enter your Email or Learner Number and Password.' });
  }

  try {
    const { classified, user } = await resolveLoginCandidate(rawIdentifier);

    if (!user || !user.password_hash) {
      // Constant-work dummy comparison reduces timing side-channel
      await bcrypt.compare(rawPassword, '$2a$10$7EqJtq98hPqEX7fNZaFWoOHi7Y5p2aA6q0A0jP2nF7B3yM3n9P6eG').catch(() => {});
      return res.status(401).json({
        error: NON_ENUMERATING_LOGIN_ERROR,
        code: 'invalid_credentials'
      });
    }

    let isValid = false;
    try {
      isValid = await bcrypt.compare(rawPassword, user.password_hash);
    } catch (_) {
      isValid = false;
    }

    if (!isValid) {
      return res.status(401).json({
        error: NON_ENUMERATING_LOGIN_ERROR,
        code: 'invalid_credentials'
      });
    }

    // Password is verified — now enforce Learner registration & Parent email-verification gates
    const roleLower = String(user.role_name || '').toLowerCase();
    if (classified.kind === 'learner_number') {
      if (roleLower !== 'learner' && roleLower !== 'student') {
        return res.status(401).json({ error: NON_ENUMERATING_LOGIN_ERROR, code: 'invalid_credentials' });
      }
      if (!user.child_id || user.child_is_active === false || !user.learner_number) {
        return res.status(403).json({
          error: 'Learner Number sign-in becomes available only after school registration is completed.',
          code: 'registration_required'
        });
      }
    }

    // Email verification gate: block pending_verification accounts (new Parents must verify email first)
    const access = evaluateEmailVerificationAccess(user);
    if (!access.allowedToLogin && access.status === 'pending_verification') {
      return res.status(403).json({
        error: 'Please verify your email address using the link sent to your inbox before signing in.',
        code: 'email_verification_required'
      });
    }

    return exports.issueLoginSession(user, res, rawIdentifier);
  } catch (err) {
    console.error('[AUTH LOGIN ERROR]:', err.message);
    return res.status(500).json({ error: 'Unable to complete sign-in right now. Please try again.' });
  }
};

/**
 * Neutralized pre-check endpoint so attackers cannot enumerate valid emails or Learner Numbers.
 */
exports.checkLoginAccount = async (req, res) => {
  const rawIdentifier = (req.body?.email || req.body?.identifier || req.body?.learnerNumber || req.query?.email || req.query?.identifier || '').toString().trim();
  if (!rawIdentifier) {
    return res.status(400).json({ exists: false, error: 'Enter your email or learner number first.' });
  }
  return res.json({ exists: true, neutral: true });
};

/**
 * Strict account resolver for Password Recovery (`forgotPassword`, `verifyOTP`, `resetPassword`).
 * - Email (`@`): resolves ONLY the exact `users` row with that email.
 * - Non-email (Learner Number): resolves ONLY the Learner's own `users` row via active `children.learner_number`.
 *   NEVER matches linked Parents (`parent_children`, `children.parent_id`, `children.secondary_parent_id`),
 *   phone numbers, or SA IDs!
 */
async function resolveRecoveryTarget(executor, rawIdentifier, { forUpdate = false } = {}) {
  const classified = classifyLoginIdentifier(rawIdentifier);
  if (classified.kind === 'invalid') return { classified, user: null };

  const lockClause = forUpdate ? 'FOR UPDATE OF u' : '';

  if (classified.kind === 'email') {
    const res = await executor.query(
      `SELECT u.id, u.email, u.full_name, u.surname, u.password_hash, u.password_set_at,
              u.previous_passwords, u.email_verified_at, u.email_verification_status,
              u.reset_code_hash, u.reset_expiry, COALESCE(u.reset_attempts, 0) AS reset_attempts,
              COALESCE(u.is_superadmin, FALSE) AS is_superadmin,
              COALESCE(r.name, u.role_id::text, 'learner') AS role_name,
              NULL::text AS learner_number
       FROM users u
       LEFT JOIN roles r ON (u.role_id::text = r.id::text OR LOWER(r.name) = LOWER(u.role_id::text))
       WHERE LOWER(TRIM(u.email::text)) = $1
       ORDER BY u.id ASC
       LIMIT 1
       ${lockClause}`,
      [classified.normalized]
    );
    return { classified, user: res.rows[0] || null };
  }

  // Strictly Learner account ONLY — NEVER linked parent
  const res = await executor.query(
    `SELECT u.id, u.email, u.full_name, u.surname, u.password_hash, u.password_set_at,
            u.previous_passwords, u.email_verified_at, u.email_verification_status,
            u.reset_code_hash, u.reset_expiry, COALESCE(u.reset_attempts, 0) AS reset_attempts,
            COALESCE(u.is_superadmin, FALSE) AS is_superadmin,
            COALESCE(r.name, u.role_id::text, 'learner') AS role_name,
            c.learner_number::text AS learner_number
     FROM children c
     JOIN users u ON u.id::text = c.learner_user_id::text
     LEFT JOIN roles r ON (u.role_id::text = r.id::text OR LOWER(r.name) = LOWER(u.role_id::text))
     WHERE COALESCE(c.is_active, TRUE) = TRUE
       AND c.learner_number IS NOT NULL
       AND UPPER(TRIM(c.learner_number::text)) = $1
       AND LOWER(COALESCE(r.name, u.role_id::text, '')) IN ('learner', 'student')
     ORDER BY c.id DESC
     LIMIT 1
     ${lockClause}`,
    [classified.normalized]
  );
  return { classified, user: res.rows[0] || null };
}

/**
 * Hardened Password Recovery initiation:
 * - Strict account-type resolution (Learner Number NEVER targets Parent).
 * - Non-enumerating response for unknown, unverified, legacy-unverified, or no-email accounts.
 * - Cryptographically random 10-digit OTP stored ONLY as SHA-256 hash (`reset_code_hash`),
 *   with `reset_code = NULL`, `reset_attempts = 0`, 15-minute expiry.
 * - Never logs or returns the OTP.
 */
exports.forgotPassword = async (req, res) => {
  const { email, identifier } = req.body || {};
  const queryInput = (email || identifier || '').toString().trim();
  if (!queryInput) {
    return res.status(400).json({ error: 'Email address or Official Learner Number is required.' });
  }

  const genericResponse = {
    success: true,
    message: NON_ENUMERATING_RECOVERY_MESSAGE,
    channel: 'email',
    expires_in: 900
  };

  try {
    const { user } = await resolveRecoveryTarget(db, queryInput);
    if (!user || !user.password_hash) {
      return res.status(200).json(genericResponse);
    }

    // Legacy-unverified & unverified policy: NEVER trust an unverified email as a sensitive recovery channel
    const access = evaluateEmailVerificationAccess(user);
    if (!access.canUseSelfServiceEmailRecovery) {
      console.info(
        `[AUTH RECOVERY AUDIT] Self-service email reset withheld for user_id=${user.id} (status=${access.status}, role=${user.role_name}).`
      );
      return res.status(200).json(genericResponse);
    }

    const targetDeliveryEmail = String(user.email || '').trim().toLowerCase();
    const canReceive = await emailService.domainCanReceiveMail(targetDeliveryEmail);
    if (!canReceive) {
      console.info(`[AUTH RECOVERY AUDIT] Non-routable domain withheld for user_id=${user.id}.`);
      return res.status(200).json(genericResponse);
    }

    const otp = generateResetOtp();
    const otpHash = hashSecretValue(otp);

    await db.query(
      `UPDATE users
       SET reset_code = NULL,
           reset_code_hash = $1,
           reset_attempts = 0,
           reset_expiry = NOW() + INTERVAL '15 minutes'
       WHERE id = $2`,
      [otpHash, user.id]
    );

    if (firestore) {
      const resetRecord = {
        user_id: user.id,
        channel: 'email',
        created_at: new Date(),
        expires_at: new Date(Date.now() + 15 * 60 * 1000)
      };
      setImmediate(() => {
        firestore.collection('password_resets').doc(String(user.id)).set(resetRecord).catch(() => {});
      });
    }

    const baseUrl = resolveFrontendOrigin(req);
    const tpl = emailService.templates.forgotPassword(otp, targetDeliveryEmail, baseUrl);
    const masked = maskEmailAddress(targetDeliveryEmail);
    console.info(`[AUTH RECOVERY AUDIT] Dispatching hashed recovery OTP to ${masked} for user_id=${user.id} role=${user.role_name}.`);

    await emailService.send(targetDeliveryEmail, tpl.subject, tpl.body, null, tpl.text).catch((mailErr) => {
      console.warn('[AUTH FORGOT PW EMAIL WARNING]:', mailErr.message);
    });

    return res.status(200).json(genericResponse);
  } catch (err) {
    console.error('[AUTH FORGOT PW ERROR]:', err.message);
    return res.status(200).json(genericResponse);
  }
};

exports.verifyOTP = async (req, res) => {
  const { email, identifier, code, otp } = req.body || {};
  const queryInput = (email || identifier || '').toString().trim();
  const rawCode = (code || otp || '').toString().trim();
  if (!queryInput || !rawCode) {
    return res.status(400).json({ error: 'Email or Learner Number and reset code are required.' });
  }

  try {
    const outcome = await withTransaction(async (client) => {
      const { user } = await resolveRecoveryTarget(client, queryInput, { forUpdate: true });
      if (!user || !user.reset_code_hash) {
        return { ok: false, status: 400, error: 'Invalid or expired reset code. Please request a new code.' };
      }

      if (!user.reset_expiry || new Date(user.reset_expiry).getTime() <= Date.now()) {
        await client.query(
          'UPDATE users SET reset_code = NULL, reset_code_hash = NULL, reset_expiry = NULL, reset_attempts = 0 WHERE id = $1',
          [user.id]
        );
        return { ok: false, status: 400, code: 'otp_expired', error: 'That reset code has expired. Please request a new code.' };
      }

      const attempts = Number(user.reset_attempts || 0);
      if (attempts >= MAX_RESET_ATTEMPTS) {
        await client.query(
          'UPDATE users SET reset_code = NULL, reset_code_hash = NULL, reset_expiry = NULL WHERE id = $1',
          [user.id]
        );
        return {
          ok: false,
          status: 429,
          code: 'otp_attempts_exceeded',
          error: 'Too many invalid reset attempts. Please request a new reset code.'
        };
      }

      const matched = verifySecretHash(rawCode, user.reset_code_hash);
      if (!matched) {
        const nextAttempts = attempts + 1;
        if (nextAttempts >= MAX_RESET_ATTEMPTS) {
          await client.query(
            'UPDATE users SET reset_attempts = $1, reset_code = NULL, reset_code_hash = NULL, reset_expiry = NULL WHERE id = $2',
            [nextAttempts, user.id]
          );
          return {
            ok: false,
            status: 429,
            code: 'otp_attempts_exceeded',
            error: 'Too many invalid reset attempts. Please request a new reset code.'
          };
        }
        await client.query('UPDATE users SET reset_attempts = $1 WHERE id = $2', [nextAttempts, user.id]);
        return { ok: false, status: 400, error: 'Invalid or expired reset code. Please check and try again.' };
      }

      return { ok: true };
    });

    if (!outcome.ok) {
      return res.status(outcome.status).json({ error: outcome.error, code: outcome.code || undefined });
    }
    return res.json({ success: true, message: 'Code verified successfully. You can now set your new password.' });
  } catch (err) {
    console.error('[VERIFY OTP ERROR]:', err.message);
    return res.status(500).json({ error: 'Could not verify the reset code.' });
  }
};

const PASSWORD_ALREADY_USED_ERROR = 'the password already exists and has been used before, put a new password';

async function runOptionalInTx(executor, savepointName, fn) {
  const isTxClient = executor && executor !== db && typeof executor.query === 'function';
  if (isTxClient) {
    await executor.query(`SAVEPOINT ${savepointName}`);
  }
  try {
    const result = await fn();
    if (isTxClient) {
      await executor.query(`RELEASE SAVEPOINT ${savepointName}`);
    }
    return result;
  } catch (err) {
    if (isTxClient) {
      await executor.query(`ROLLBACK TO SAVEPOINT ${savepointName}`).catch(() => {});
    }
    return null;
  }
}

async function checkPasswordHistoryMatch(executor, userId, candidatePassword, currentPasswordHash, previousPasswordsArray) {
  if (!candidatePassword) return false;

  if (currentPasswordHash) {
    try {
      const isMatch = currentPasswordHash.startsWith('$2')
        ? await bcrypt.compare(candidatePassword, currentPasswordHash)
        : candidatePassword === currentPasswordHash;
      if (isMatch) return true;
    } catch (_) {}
  }

  if (previousPasswordsArray && Array.isArray(previousPasswordsArray)) {
    for (const prevHash of previousPasswordsArray) {
      if (prevHash) {
        try {
          const isMatch = prevHash.startsWith('$2')
            ? await bcrypt.compare(candidatePassword, prevHash)
            : candidatePassword === prevHash;
          if (isMatch) return true;
        } catch (_) {}
      }
    }
  }

  if (userId) {
    const historyRes = await runOptionalInTx(executor, 'sp_pw_hist_read', () =>
      executor.query(
        'SELECT password_hash FROM user_password_history WHERE user_id = $1',
        [userId]
      )
    );
    if (historyRes?.rows) {
      for (const row of historyRes.rows) {
        const pHash = row.password_hash;
        if (pHash) {
          try {
            const isMatch = pHash.startsWith('$2')
              ? await bcrypt.compare(candidatePassword, pHash)
              : candidatePassword === pHash;
            if (isMatch) return true;
          } catch (_) {}
        }
      }
    }
  }

  return false;
}

async function recordNewPassword(executor, userId, newPasswordHash, oldPasswordHash) {
  const updatedWithHistory = await runOptionalInTx(executor, 'sp_pw_update_hist', () =>
    executor.query(
      `UPDATE users
       SET password_hash = $1,
           password_set_at = COALESCE(password_set_at, NOW()),
           previous_passwords = array_append(COALESCE(previous_passwords, '{}'), $2),
           reset_code = NULL,
           reset_code_hash = NULL,
           reset_expiry = NULL,
           reset_attempts = 0,
           active_session_id = NULL
       WHERE id = $3`,
      [newPasswordHash, oldPasswordHash || newPasswordHash, userId]
    )
  );
  if (!updatedWithHistory) {
    await executor.query(
      `UPDATE users
       SET password_hash = $1,
           password_set_at = COALESCE(password_set_at, NOW()),
           reset_code = NULL,
           reset_code_hash = NULL,
           reset_expiry = NULL,
           reset_attempts = 0,
           active_session_id = NULL
       WHERE id = $2`,
      [newPasswordHash, userId]
    );
  }

  await runOptionalInTx(executor, 'sp_pw_hist_write', async () => {
    if (oldPasswordHash) {
      await executor.query(
        'INSERT INTO user_password_history (user_id, password_hash) VALUES ($1, $2)',
        [userId, oldPasswordHash]
      );
    }
    await executor.query(
      'INSERT INTO user_password_history (user_id, password_hash) VALUES ($1, $2)',
      [userId, newPasswordHash]
    );
  });
}

exports.resetPassword = async (req, res) => {
  const { email, identifier, code, otp, new_password, newPassword } = req.body || {};
  const queryInput = (email || identifier || '').toString().trim();
  const rawCode = (code || otp || '').toString().trim();
  const targetPassword = (new_password || newPassword || '').toString();

  if (!queryInput || !rawCode || !targetPassword) {
    return res.status(400).json({ error: 'Email or Learner Number, reset code, and new password are required.' });
  }

  const pwError = validatePassword(targetPassword);
  if (pwError) return res.status(400).json({ error: pwError });

  try {
    const outcome = await withTransaction(async (client) => {
      const { user } = await resolveRecoveryTarget(client, queryInput, { forUpdate: true });
      if (!user || !user.reset_code_hash) {
        return { ok: false, status: 400, error: 'Invalid or expired reset code. Please request a new code.' };
      }

      if (!user.reset_expiry || new Date(user.reset_expiry).getTime() <= Date.now()) {
        await client.query(
          'UPDATE users SET reset_code = NULL, reset_code_hash = NULL, reset_expiry = NULL, reset_attempts = 0 WHERE id = $1',
          [user.id]
        );
        return { ok: false, status: 400, code: 'otp_expired', error: 'Reset session has expired. Please request a new code.' };
      }

      const attempts = Number(user.reset_attempts || 0);
      if (attempts >= MAX_RESET_ATTEMPTS) {
        await client.query(
          'UPDATE users SET reset_code = NULL, reset_code_hash = NULL, reset_expiry = NULL WHERE id = $1',
          [user.id]
        );
        return {
          ok: false,
          status: 429,
          code: 'otp_attempts_exceeded',
          error: 'Too many invalid reset attempts. Please request a new reset code.'
        };
      }

      const matched = verifySecretHash(rawCode, user.reset_code_hash);
      if (!matched) {
        const nextAttempts = attempts + 1;
        if (nextAttempts >= MAX_RESET_ATTEMPTS) {
          await client.query(
            'UPDATE users SET reset_attempts = $1, reset_code = NULL, reset_code_hash = NULL, reset_expiry = NULL WHERE id = $2',
            [nextAttempts, user.id]
          );
          return {
            ok: false,
            status: 429,
            code: 'otp_attempts_exceeded',
            error: 'Too many invalid reset attempts. Please request a new reset code.'
          };
        }
        await client.query('UPDATE users SET reset_attempts = $1 WHERE id = $2', [nextAttempts, user.id]);
        return { ok: false, status: 400, error: 'Invalid or expired reset code. Please request a new code.' };
      }

      const isAlreadyUsed = await checkPasswordHistoryMatch(
        client,
        user.id,
        targetPassword,
        user.password_hash,
        user.previous_passwords
      );
      if (isAlreadyUsed) {
        return { ok: false, status: 400, error: PASSWORD_ALREADY_USED_ERROR };
      }

      const hash = await bcrypt.hash(targetPassword, 10);
      await recordNewPassword(client, user.id, hash, user.password_hash);
      return { ok: true, userEmail: (user.email || '').toLowerCase().trim() };
    });

    if (!outcome.ok) {
      return res.status(outcome.status).json({ error: outcome.error, code: outcome.code || undefined });
    }

    if (outcome.userEmail && !outcome.userEmail.endsWith('.geleza.local') && !outcome.userEmail.endsWith('@fusion.high')) {
      const tpl = emailService.templates.passwordResetSuccess();
      emailService.send(outcome.userEmail, tpl.subject, tpl.body).catch(() => {});
    }

    return res.json({
      success: true,
      message: 'Password updated successfully! You can now sign in with your new password.'
    });
  } catch (err) {
    console.error('[RESET PASSWORD ERROR]:', err.message);
    return res.status(500).json({ error: 'Could not update password.' });
  }
};

exports.changePassword = async (req, res) => {
  const current_password = (req.body.current_password || req.body.currentPassword || '').toString().trim();
  const new_password = (req.body.new_password || req.body.newPassword || '').toString().trim();
  const confirm_password = (
    req.body.confirm_password ||
    req.body.confirmPassword ||
    req.body.confirmationPassword ||
    req.body.newPasswordConfirmation ||
    ''
  ).toString().trim();
  const userId = req.user.id;

  if (!current_password) return res.status(400).json({ error: 'Current password is required.' });
  if (!new_password) return res.status(400).json({ error: 'New password is required.' });
  if (!confirm_password) return res.status(400).json({ error: 'Confirmation password is required.' });
  if (new_password !== confirm_password) return res.status(400).json({ error: 'New password and confirmation password do not match.' });

  const pwError = validatePassword(new_password);
  if (pwError) return res.status(400).json({ error: pwError });

  try {
    const userRes = await db.query('SELECT password_hash, previous_passwords FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found.' });

    const user = userRes.rows[0];
    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect.' });

    const isAlreadyUsed = await checkPasswordHistoryMatch(
      db,
      userId,
      new_password,
      user.password_hash,
      user.previous_passwords
    );
    if (isAlreadyUsed) {
      return res.status(400).json({ error: PASSWORD_ALREADY_USED_ERROR });
    }

    const hash = await bcrypt.hash(new_password, 10);
    await recordNewPassword(db, userId, hash, user.password_hash);

    return res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.validatePassword = validatePassword;
exports.register = exports.registerUser;
