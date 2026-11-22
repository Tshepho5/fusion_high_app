'use strict';

const path = require('path');
const db = require('../../../db/db');
const { withTransaction } = require('../../../db/transaction');
const principalActivation = require('./principalActivation');
const emailService = require('./emailService');
const NotificationService = require('./notificationService');
const { generateAcceptanceLetterPdf } = require('./acceptanceLetterPdfService');
const { canDecideApplication } = require('./schoolScope');
const {
  normalizeRole,
  normalizeEmail,
  normalizeIdNumber,
  isSchoolAdminRole,
  isParentRole,
  isLearnerRole,
  buildAcceptanceReference,
  isActorAuthorizedForApplication
} = require('../../../lib/learnerRegistrationWorkflow');
const {
  normalizeApplicationStatus,
  getStatusLabel,
  validateApplicationTransition,
  validateApprovalDispatchPayload,
  validateDocumentRequestPayload,
  evaluateLearnerDashboardAccess,
  redactSensitiveFields
} = require('../../../lib/applicationLifecycle');
const { resolveFrontendOrigin } = require('../../../lib/authSecurity');

function advisoryLockKeyForYear(academicYear) {
  const seed = `geleza_learner_number_seq:${Number(academicYear) || new Date().getFullYear()}`;
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash | 0;
}

function safeDocUrl(filePath) {
  const raw = String(filePath || '').replace(/\\/g, '/');
  const base = raw.split('/').pop();
  if (!base || base === '.' || base === '..' || base.includes('..') || base.includes('/')) return null;
  return `/uploads/applications/${base}`;
}

async function resolveRoleId(executor, roleName, fallbackId) {
  try {
    const res = await executor.query(
      'SELECT id FROM roles WHERE LOWER(name) = LOWER($1) LIMIT 1',
      [roleName]
    );
    if (res.rows[0]?.id) return res.rows[0].id;
  } catch (_) {}
  return fallbackId;
}

async function fetchSchoolDetails(executor, schoolId) {
  if (!schoolId) return null;
  const res = await executor.query(
    `SELECT *
     FROM schools
     WHERE id = $1
     LIMIT 1`,
    [Number(schoolId)]
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    name: row.name || null,
    slug: row.slug || null,
    emis_number: row.emis_number || null,
    physical_address: row.physical_address || null,
    contact_email: row.contact_email || null,
    contact_phone: row.contact_phone || null,
    province: row.province || null,
    district: row.district || null,
    circuit: row.circuit || null,
    logo_url: row.logo_url || row.badge_url || null,
    logo_stored_name: row.logo_stored_name || null
  };
}

async function fetchClassAllocation(executor, schoolId, classId) {
  if (!classId) return null;
  const res = await executor.query(
    `SELECT cl.id,
            cl.name,
            cl.grade,
            cl.stream,
            cl.school_id,
            COALESCE(cl.homeroom_teacher_id, cl.assigned_teacher_id) AS teacher_id,
            TRIM(CONCAT(COALESCE(u.full_name, ''), ' ', COALESCE(u.surname, ''))) AS teacher_name,
            u.email AS teacher_email
     FROM classes cl
     LEFT JOIN users u ON u.id = COALESCE(cl.homeroom_teacher_id, cl.assigned_teacher_id)
     WHERE cl.id = $1 AND cl.school_id = $2
     LIMIT 1`,
    [Number(classId), Number(schoolId)]
  );
  return res.rows[0] || null;
}

/**
 * Concurrency-safe, persistent learner-number allocation.
 * - Uses PostgreSQL transaction-scoped advisory lock (`pg_advisory_xact_lock`)
 * - Never overwrites an already-issued learner number
 * - Checks BOTH `applications.provisional_learner_number` AND `children.learner_number`
 * - Guarantees uniqueness across concurrent approvals
 */
async function allocateUniqueLearnerNumber(client, { academicYear, existingLearnerNumber = null } = {}) {
  const existing = String(existingLearnerNumber || '').trim();
  if (existing) return existing;

  const year = Number(academicYear) || new Date().getFullYear();
  const prefix = String(year);
  await client.query('SELECT pg_advisory_xact_lock($1)', [advisoryLockKeyForYear(year)]);

  const [appRes, childRes] = await Promise.all([
    client.query(
      'SELECT provisional_learner_number AS num FROM applications WHERE provisional_learner_number LIKE $1',
      [`${prefix}%`]
    ),
    client.query(
      'SELECT learner_number AS num FROM children WHERE learner_number LIKE $1',
      [`${prefix}%`]
    )
  ]);

  let maxSeq = 0;
  for (const row of [...(appRes.rows || []), ...(childRes.rows || [])]) {
    const digits = String(row.num || '').replace(/\D/g, '');
    if (digits.startsWith(prefix) && digits.length >= prefix.length + 4) {
      const seq = parseInt(digits.slice(prefix.length), 10);
      if (Number.isInteger(seq) && seq > maxSeq) maxSeq = seq;
    }
  }

  let candidate = `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
  // Defensive loop in case of any unexpected collision
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const collision = await client.query(
      `SELECT 1 FROM applications WHERE provisional_learner_number = $1
       UNION ALL
       SELECT 1 FROM children WHERE learner_number = $1
       LIMIT 1`,
      [candidate]
    );
    if (collision.rows.length === 0) return candidate;
    maxSeq += 1;
    candidate = `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
  }
  throw new Error('Could not allocate a unique learner number after 20 attempts.');
}

/**
 * Safely ensures a Parent or Learner user account exists WITHOUT plaintext passwords.
 * - Never resets an existing user's password.
 * - Issues a fresh 72h SHA-256 hashed activation token ONLY for passwordless accounts
 *   without a valid unexpired token (or when `forceFreshToken` is requested on approval for a passwordless account).
 */
async function ensurePasswordlessAccount(executor, {
  email,
  fullName,
  surname,
  phone,
  idNumber,
  roleName,
  fallbackRoleId,
  schoolId,
  issueTokenIfPasswordless = true
}) {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { user: null, created: false, activationToken: null, pendingActivation: false };
  }

  const existing = await executor.query(
    `SELECT id, email, full_name, surname, password_hash, school_id, is_superadmin,
            activation_token_hash, activation_expires_at
     FROM users
     WHERE LOWER(email) = LOWER($1)
     LIMIT 1`,
    [cleanEmail]
  );

  if (existing.rows.length > 0) {
    const user = existing.rows[0];
    let activationToken = null;
    if (!user.password_hash && !user.is_superadmin && issueTokenIfPasswordless) {
      activationToken = await principalActivation.issue(executor, user.id);
    }
    return {
      user,
      created: false,
      activationToken,
      pendingActivation: !user.password_hash
    };
  }

  const roleId = await resolveRoleId(executor, roleName, fallbackRoleId);
  const inserted = await executor.query(
    `INSERT INTO users (full_name, surname, email, phone, id_number, role_id, school_id, password_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NULL)
     RETURNING id, email, full_name, surname, password_hash, school_id, is_superadmin`,
    [
      String(fullName || 'User').trim(),
      String(surname || '').trim(),
      cleanEmail,
      phone || null,
      idNumber || null,
      roleId,
      schoolId ? Number(schoolId) : null
    ]
  );

  const createdUser = inserted.rows[0];
  const activationToken = issueTokenIfPasswordless
    ? await principalActivation.issue(executor, createdUser.id)
    : null;
  return {
    user: createdUser,
    created: true,
    activationToken,
    pendingActivation: true
  };
}

async function recordStatusHistory(executor, {
  applicationId,
  schoolId,
  fromStatus = null,
  toStatus,
  actorId = null,
  actorRole = null,
  reason = null,
  metadata = {}
}) {
  try {
    await executor.query(
      `INSERT INTO application_status_history (
         application_id, school_id, from_status, to_status, actor_id, actor_role, reason, metadata
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        Number(applicationId),
        Number(schoolId),
        fromStatus ? normalizeApplicationStatus(fromStatus) : null,
        normalizeApplicationStatus(toStatus),
        actorId ? Number(actorId) : null,
        actorRole ? normalizeRole(actorRole) : null,
        reason ? String(reason).trim().slice(0, 1000) : null,
        JSON.stringify(redactSensitiveFields(metadata || {}))
      ]
    );
  } catch (err) {
    if (err?.code !== '42P01') throw err;
  }
}

/**
 * Reliable, idempotent email dispatch wrapper backed by `application_email_log`.
 * Never stores tokens/passwords; never corrupts application DB state on email failure.
 */
async function dispatchIdempotentEmail({
  applicationId,
  schoolId,
  eventType,
  recipientEmail,
  idempotencyKey,
  sendFn
}) {
  const cleanRecipient = normalizeEmail(recipientEmail);
  if (!cleanRecipient || !cleanRecipient.includes('@')) {
    return { sent: false, skipped: true, reason: 'missing_recipient' };
  }

  let hasLogTable = true;
  try {
    const existing = await db.query(
      'SELECT id, status, attempts FROM application_email_log WHERE idempotency_key = $1 LIMIT 1',
      [idempotencyKey]
    );
    if (existing.rows[0]?.status === 'sent') {
      return { sent: false, skipped: true, alreadySent: true };
    }
    if (!existing.rows[0]) {
      await db.query(
        `INSERT INTO application_email_log (
           application_id, school_id, event_type, recipient_email, idempotency_key, status, attempts
         ) VALUES ($1, $2, $3, $4, $5, 'pending', 0)
         ON CONFLICT (idempotency_key) DO NOTHING`,
        [Number(applicationId), Number(schoolId), eventType, cleanRecipient, idempotencyKey]
      );
    }
  } catch (logErr) {
    if (logErr?.code === '42P01') {
      hasLogTable = false;
    } else {
      console.warn('[APP EMAIL LOG WARNING]:', logErr.message);
      hasLogTable = false;
    }
  }

  try {
    const result = await sendFn();
    const ok = Boolean(result && (result.success !== false));
    if (hasLogTable) {
      await db.query(
        `UPDATE application_email_log
         SET status = $1::varchar,
             attempts = attempts + 1,
             sent_at = CASE WHEN $1::text = 'sent' THEN NOW() ELSE sent_at END,
             error_message = $2,
             updated_at = NOW()
         WHERE idempotency_key = $3`,
        [ok ? 'sent' : 'failed', ok ? null : String(result?.error || 'Email transport did not accept message').slice(0, 500), idempotencyKey]
      ).catch((uErr) => {
        console.warn('[APP EMAIL LOG UPDATE WARNING]:', uErr.message);
      });
    }
    return { sent: ok, skipped: false, error: ok ? null : (result?.error || 'Email delivery failed') };
  } catch (err) {
    const safeError = String(err?.message || 'Unknown email error').slice(0, 500);
    if (hasLogTable) {
      await db.query(
        `UPDATE application_email_log
         SET status = 'failed',
             attempts = attempts + 1,
             error_message = $1,
             updated_at = NOW()
         WHERE idempotency_key = $2`,
        [safeError, idempotencyKey]
      ).catch(() => {});
    }
    console.warn(`[APP EMAIL ${eventType} FAILED]:`, safeError);
    return { sent: false, skipped: false, error: safeError };
  }
}

async function notifySchoolAdmins(schoolId, { type, title, message, metadata = {} }) {
  try {
    const adminRes = await db.query(
      `SELECT u.id, u.email, u.full_name, u.surname
       FROM users u
       JOIN roles r ON r.id::text = u.role_id::text
       WHERE u.school_id = $1
         AND LOWER(r.name) IN ('admin', 'principal', 'vice_principal', 'school_admin', 'subadmin', 'sub_admin')
         AND COALESCE(u.is_superadmin, FALSE) = FALSE`,
      [Number(schoolId)]
    );
    const ids = adminRes.rows.map((r) => Number(r.id)).filter((n) => Number.isInteger(n) && n > 0);
    if (ids.length > 0) {
      await NotificationService.sendToUsers({
        userIds: ids,
        title,
        message,
        type,
        targetTab: 'users',
        metadata: { ...redactSensitiveFields(metadata), school_id: Number(schoolId) }
      });
    }
    return adminRes.rows;
  } catch (_) {
    return [];
  }
}

/**
 * PHASE M2.3: Post-submission onboarding & Email 1 (Application Received Confirmation).
 * - Never creates a Learner password or Learner activation link during public submission.
 * - Never allocates an Official Learner Number during submission.
 * - For new Parents: includes the single-use email verification link (`/verify-email?token=...`)
 *   so the Parent verifies email ownership before signing in.
 * - For existing authenticated Parents: reuses their existing account untouched and links
 *   directly to their Parent Dashboard.
 */
async function handleApplicationSubmitted({
  applicationId,
  baseUrl = '',
  parentUserId = null,
  parentVerificationToken = null,
  isExistingParent = false
}) {
  const appRes = await db.query('SELECT * FROM applications WHERE id = $1 LIMIT 1', [Number(applicationId)]);
  const app = appRes.rows[0];
  if (!app) return null;

  const school = await fetchSchoolDetails(db, app.school_id);
  const academicYear = Number(app.academic_year || new Date().getFullYear());
  const cleanBaseUrl = String(baseUrl || resolveFrontendOrigin(null)).replace(/\/+$/, '');
  const cleanParentEmail = normalizeEmail(app.primary_parent_email);
  const effectiveParentUserId = parentUserId || app.parent_user_id || null;

  // Persist user linkage & academic_year on applications safely (NO premature learner account/password creation)
  try {
    await db.query(
      `UPDATE applications
       SET academic_year = COALESCE(academic_year, $1),
           parent_user_id = COALESCE(parent_user_id, $2)
       WHERE id = $3`,
      [academicYear, effectiveParentUserId, app.id]
    );
  } catch (err) {
    if (err?.code !== '42703') console.warn('[APP LINKAGE UPDATE WARNING]:', err.message);
  }

  await recordStatusHistory(db, {
    applicationId: app.id,
    schoolId: app.school_id,
    fromStatus: null,
    toStatus: app.status || 'submitted',
    actorId: effectiveParentUserId,
    actorRole: 'parent',
    reason: 'Admission application submitted online and queued for school administration review.',
    metadata: {
      application_number: app.application_number,
      grade: Number(app.grade_applied),
      academic_year: academicYear
    }
  });

  const verificationUrl = parentVerificationToken
    ? `${cleanBaseUrl}/verify-email?token=${encodeURIComponent(parentVerificationToken)}`
    : null;

  const dashboardUrl = `${cleanBaseUrl}/dashboard/parent?tab=registration&applicationId=${encodeURIComponent(app.id)}`;
  const learnerFullName = `${app.first_name || ''} ${app.surname || ''}`.trim();
  const parentFullName = `${app.primary_parent_name || ''} ${app.primary_parent_surname || ''}`.trim();

  // Email 1 — Application Received (Parent) — Application Reference ONLY (NO Official Learner Number yet!)
  const emailResult = await dispatchIdempotentEmail({
    applicationId: app.id,
    schoolId: app.school_id,
    eventType: 'application_received',
    recipientEmail: app.primary_parent_email,
    idempotencyKey: `app_received:${app.id}:${cleanParentEmail}`,
    sendFn: () => emailService.sendApplicationReceivedConfirmation({
      recipientEmail: app.primary_parent_email,
      recipientName: parentFullName || 'Parent / Guardian',
      learnerName: learnerFullName,
      parentName: parentFullName,
      parentContact: app.primary_parent_phone || app.primary_parent_email,
      schoolName: school?.name || 'Geleza SA Partner School',
      schoolEmail: school?.contact_email || null,
      schoolPhone: school?.contact_phone || null,
      schoolAddress: school?.physical_address || null,
      applicationNumber: app.application_number,
      learnerNumber: null, // Official Learner Number is allocated ONLY upon approval
      grade: Number(app.grade_applied),
      academicYear,
      stream: app.stream || null,
      homeLanguage: app.home_language || null,
      firstAdditionalLanguage: app.first_additional_language || null,
      selectedSubjects: Array.isArray(app.selected_subjects) ? app.selected_subjects : [],
      submittedAt: app.created_at || new Date(),
      statusLabel: getStatusLabel(app.status || 'submitted'),
      dashboardUrl,
      verificationUrl,
      activationUrl: null,
      isExistingParent: Boolean(isExistingParent)
    })
  });

  if (emailResult.sent) {
    await db.query(
      'UPDATE applications SET confirmation_email_sent_at = COALESCE(confirmation_email_sent_at, NOW()) WHERE id = $1',
      [app.id]
    ).catch(() => {});
  }

  await notifySchoolAdmins(app.school_id, {
    type: 'application_submitted',
    title: `New Admission Application — ${learnerFullName}`,
    message: `${learnerFullName} applied for Grade ${app.grade_applied} (${academicYear}). Reference: ${app.application_number}.`,
    metadata: { application_id: app.id, application_number: app.application_number }
  });

  return {
    applicationId: app.id,
    parentUserId: effectiveParentUserId,
    learnerUserId: null,
    parentVerificationRequired: Boolean(verificationUrl),
    parentActivationRequired: false,
    learnerActivationRequired: false,
    confirmationEmailSent: emailResult.sent
  };
}

/**
 * PHASE D/F: Authoritative, transactional Application Approval.
 * - Enforces school isolation + state machine
 * - Allocates & persists unique Learner Number BEFORE committing or emailing
 * - Upserts learner_registrations with learner_number
 * - Prepares secure passwordless Parent & Learner activation links (zero plaintext passwords)
 * - Validates mandatory approval email payload (refuses incomplete approval emails)
 * - Generates Acceptance Letter PDF (with Learner Number!) and dispatches Email 5 idempotently
 */
async function approveApplication({
  applicationId,
  actor,
  baseUrl = '',
  assignedClassId = null,
  adminNotes = null
}) {
  const cleanBaseUrl = String(baseUrl || resolveFrontendOrigin(null)).replace(/\/+$/, '');

  const txResult = await withTransaction(async (client) => {
    const appRes = await client.query(
      `SELECT * FROM applications
       WHERE id::text = $1::text OR application_number = $1::text
       FOR UPDATE`,
      [String(applicationId)]
    );
    if (appRes.rows.length === 0) {
      const err = new Error('Application not found.');
      err.status = 404;
      throw err;
    }
    const app = appRes.rows[0];
    if (!canDecideApplication(actor, app.school_id)) {
      const err = new Error('Application not found.');
      err.status = 404;
      throw err;
    }

    const transition = validateApplicationTransition({
      fromStatus: app.status,
      toStatus: 'approved',
      actorRole: actor?.role,
      isSuperadmin: Boolean(actor?.is_superadmin)
    });
    if (!transition.allowed) {
      const err = new Error(transition.reason);
      err.status = transition.code === 'UNAUTHORIZED_STATUS_CHANGE' || transition.code === 'UNAUTHORIZED_ROLE' ? 403 : 409;
      err.code = transition.code;
      throw err;
    }

    const school = await fetchSchoolDetails(client, app.school_id);
    if (!school) {
      const err = new Error('Cannot approve application: accepting school record could not be found.');
      err.status = 400;
      throw err;
    }

    const academicYear = Number(app.academic_year || new Date().getFullYear());
    const grade = Number(app.grade_applied);
    const effectiveClassId = assignedClassId ? Number(assignedClassId) : (app.assigned_class_id ? Number(app.assigned_class_id) : null);
    let classAllocation = null;
    if (effectiveClassId) {
      classAllocation = await fetchClassAllocation(client, app.school_id, effectiveClassId);
      if (!classAllocation) {
        const err = new Error('Selected class does not belong to this school.');
        err.status = 400;
        throw err;
      }
    }

    // Check if learner already has a persistent learner_number on a linked child row in THIS school
    let existingChild = null;
    const cleanId = normalizeIdNumber(app.id_number);
    if (app.application_number || cleanId) {
      const cRes = await client.query(
        `SELECT c.id, c.school_id, c.learner_number, c.learner_user_id, c.parent_id
         FROM children c
         LEFT JOIN users lu ON lu.id = c.learner_user_id
         WHERE c.school_id = $3
           AND (
             ($1 <> '' AND c.application_number = $1)
             OR ($2 <> '' AND lu.id_number IS NOT NULL AND REGEXP_REPLACE(lu.id_number::text, '[^0-9]', '', 'g') = $2)
           )
         LIMIT 1`,
        [String(app.application_number || ''), cleanId, Number(app.school_id)]
      );
      existingChild = cRes.rows[0] || null;
    }

    // Only reuse existingChild.learner_number if no other application already holds that provisional_learner_number
    let reusableLearnerNo = app.provisional_learner_number || null;
    if (!reusableLearnerNo && existingChild?.learner_number) {
      const conflictApp = await client.query(
        `SELECT id FROM applications WHERE provisional_learner_number = $1 AND id <> $2 LIMIT 1`,
        [existingChild.learner_number, app.id]
      );
      if (conflictApp.rows.length === 0) {
        reusableLearnerNo = existingChild.learner_number;
      }
    }

    // Allocate & persist unique learner number BEFORE committing or emailing
    const learnerNumber = await allocateUniqueLearnerNumber(client, {
      academicYear,
      existingLearnerNumber: reusableLearnerNo
    });

    // Strictly validate ALL mandatory approval email fields INSIDE the transaction BEFORE committing approval
    const preCommitLearnerName = `${app.first_name || ''} ${app.surname || ''}`.trim();
    const preCommitEmailCheck = validateApprovalDispatchPayload({
      schoolName: school?.name,
      learnerName: preCommitLearnerName,
      learnerNumber,
      applicationNumber: app.application_number,
      grade,
      academicYear,
      parentEmail: app.primary_parent_email,
      learnerEmail: app.email || app.learner_email
    });
    if (!preCommitEmailCheck.valid) {
      const err = new Error(preCommitEmailCheck.reason);
      err.status = 422;
      err.code = 'INCOMPLETE_APPROVAL_PAYLOAD';
      throw err;
    }

    // Ensure Parent account exists (reusing existing account safely; never overwrites password).
    // Do NOT issue a Learner password-activation token at approval: Learner activates ONLY AFTER registration!
    let parentAccount = { user: null, activationToken: null, pendingActivation: false };
    if (app.parent_user_id) {
      const pRes = await client.query(
        'SELECT id, email, full_name, surname, password_hash, school_id, COALESCE(is_superadmin, FALSE) AS is_superadmin FROM users WHERE id = $1 LIMIT 1',
        [app.parent_user_id]
      );
      if (pRes.rows[0]) {
        parentAccount = { user: pRes.rows[0], activationToken: null, pendingActivation: !pRes.rows[0].password_hash };
      }
    }
    if (!parentAccount.user && app.primary_parent_email) {
      parentAccount = await ensurePasswordlessAccount(client, {
        email: app.primary_parent_email,
        fullName: app.primary_parent_name || 'Parent',
        surname: app.primary_parent_surname || app.surname || '',
        phone: app.primary_parent_phone || null,
        idNumber: app.primary_parent_id_number || null,
        roleName: 'parent',
        fallbackRoleId: 4,
        schoolId: app.school_id,
        issueTokenIfPasswordless: true
      });
    }

    let learnerAccount = { user: null, activationToken: null, pendingActivation: false };
    if (app.applicant_user_id) {
      const lRes = await client.query(
        'SELECT id, email, full_name, surname, password_hash, school_id FROM users WHERE id = $1 LIMIT 1',
        [app.applicant_user_id]
      );
      if (lRes.rows[0]) {
        learnerAccount = { user: lRes.rows[0], activationToken: null, pendingActivation: !lRes.rows[0].password_hash };
      }
    }

    const updatedAppRes = await client.query(
      `UPDATE applications
       SET status = 'approved',
           provisional_learner_number = $1,
           academic_year = COALESCE(academic_year, $2),
           assigned_class_id = COALESCE($3, assigned_class_id),
           admin_notes = COALESCE($4, admin_notes),
           approved_by = COALESCE(approved_by, $5),
           approved_at = COALESCE(approved_at, NOW()),
           reviewed_by = $5,
           reviewed_at = NOW(),
           parent_user_id = COALESCE($6, parent_user_id),
           applicant_user_id = COALESCE($7, applicant_user_id),
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [
        learnerNumber,
        academicYear,
        effectiveClassId,
        adminNotes !== null && adminNotes !== undefined && String(adminNotes).trim() !== '' ? String(adminNotes).trim() : null,
        actor?.id || null,
        parentAccount.user?.id || null,
        learnerAccount.user?.id || existingChild?.learner_user_id || null,
        app.id
      ]
    );
    const updatedApp = updatedAppRes.rows[0];
    const acceptanceRef = buildAcceptanceReference(updatedApp);

    // Upsert learner_registrations idempotently (never reset a completed registration)
    const regRes = await client.query(
      `INSERT INTO learner_registrations (
         application_id, school_id, child_id, learner_user_id, parent_user_id,
         academic_year, grade, class_id, class_teacher_id,
         stream_name, home_language, first_additional_language,
         status, acceptance_letter_reference, acceptance_letter_issued_at, learner_number
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'awaiting_registration', $13, NOW(), $14)
       ON CONFLICT (application_id) DO UPDATE SET
         parent_user_id = COALESCE(learner_registrations.parent_user_id, EXCLUDED.parent_user_id),
         learner_user_id = COALESCE(learner_registrations.learner_user_id, EXCLUDED.learner_user_id),
         child_id = COALESCE(learner_registrations.child_id, EXCLUDED.child_id),
         class_id = COALESCE(EXCLUDED.class_id, learner_registrations.class_id),
         class_teacher_id = COALESCE(EXCLUDED.class_teacher_id, learner_registrations.class_teacher_id),
         learner_number = COALESCE(learner_registrations.learner_number, EXCLUDED.learner_number),
         acceptance_letter_reference = COALESCE(learner_registrations.acceptance_letter_reference, EXCLUDED.acceptance_letter_reference),
         acceptance_letter_issued_at = COALESCE(learner_registrations.acceptance_letter_issued_at, NOW()),
         updated_at = NOW()
       RETURNING *`,
      [
        updatedApp.id,
        updatedApp.school_id,
        existingChild?.id || null,
        learnerAccount.user?.id || existingChild?.learner_user_id || null,
        parentAccount.user?.id || null,
        academicYear,
        grade,
        classAllocation?.id || effectiveClassId || null,
        classAllocation?.teacher_id || null,
        updatedApp.stream || null,
        updatedApp.home_language || null,
        updatedApp.first_additional_language || null,
        acceptanceRef,
        learnerNumber
      ]
    );

    if (!transition.idempotent) {
      await recordStatusHistory(client, {
        applicationId: updatedApp.id,
        schoolId: updatedApp.school_id,
        fromStatus: app.status,
        toStatus: 'approved',
        actorId: actor?.id || null,
        actorRole: actor?.role || 'admin',
        reason: adminNotes || 'Application approved by School Administration.',
        metadata: {
          learner_number: learnerNumber,
          acceptance_reference: acceptanceRef,
          class_id: classAllocation?.id || null
        }
      });
    }

    return {
      application: updatedApp,
      registration: regRes.rows[0],
      school,
      classAllocation,
      learnerNumber,
      acceptanceRef,
      academicYear,
      grade,
      parentAccount,
      learnerAccount,
      idempotentReplay: Boolean(transition.idempotent)
    };
  });

  const {
    application,
    registration,
    school,
    classAllocation,
    learnerNumber,
    acceptanceRef,
    academicYear,
    grade,
    parentAccount,
    learnerAccount
  } = txResult;

  const learnerFullName = `${application.first_name || ''} ${application.surname || ''}`.trim();
  const parentFullName = `${application.primary_parent_name || ''} ${application.primary_parent_surname || ''}`.trim();

  // Strictly validate ALL mandatory approval email fields BEFORE dispatching Email 5
  const emailCheck = validateApprovalDispatchPayload({
    schoolName: school?.name,
    learnerName: learnerFullName,
    learnerNumber,
    applicationNumber: application.application_number,
    grade,
    academicYear,
    parentEmail: application.primary_parent_email,
    learnerEmail: application.email
  });
  if (!emailCheck.valid) {
    const err = new Error(emailCheck.reason);
    err.status = 422;
    err.code = 'INCOMPLETE_APPROVAL_PAYLOAD';
    throw err;
  }

  const pdfResult = await generateAcceptanceLetterPdf({
    application: { ...application, provisional_learner_number: learnerNumber, learner_number: learnerNumber },
    school,
    classAllocation,
    issuedAt: registration.acceptance_letter_issued_at || new Date()
  });

  const dashboardRegistrationUrl = `${cleanBaseUrl}/dashboard/parent?tab=registration&applicationId=${encodeURIComponent(application.id)}`;
  const learnerDashboardUrl = `${cleanBaseUrl}/dashboard/learner?tab=registration&applicationId=${encodeURIComponent(application.id)}`;
  const parentActivationUrl = parentAccount.activationToken
    ? `${cleanBaseUrl}/activate?token=${encodeURIComponent(parentAccount.activationToken)}`
    : null;
  const learnerActivationUrl = learnerAccount.activationToken
    ? `${cleanBaseUrl}/activate?token=${encodeURIComponent(learnerAccount.activationToken)}`
    : null;

  // Email 5 — Official Admission Acceptance Email (Parent)
  const parentEmailResult = await dispatchIdempotentEmail({
    applicationId: application.id,
    schoolId: application.school_id,
    eventType: 'application_accepted',
    recipientEmail: application.primary_parent_email,
    idempotencyKey: `app_accepted:${application.id}:${normalizeEmail(application.primary_parent_email)}`,
    sendFn: () => emailService.sendIntegratedAcceptanceLetter({
      parentEmail: application.primary_parent_email,
      parentName: parentFullName || 'Parent / Guardian',
      parentContact: application.primary_parent_phone || application.primary_parent_email,
      learnerName: learnerFullName,
      learnerNumber,
      schoolName: school.name,
      schoolEmail: school.contact_email || null,
      schoolPhone: school.contact_phone || null,
      schoolAddress: school.physical_address || null,
      schoolEmis: school.emis_number || null,
      grade,
      academicYear,
      stream: application.stream || null,
      homeLanguage: application.home_language || null,
      firstAdditionalLanguage: application.first_additional_language || null,
      selectedSubjects: Array.isArray(application.selected_subjects) ? application.selected_subjects : [],
      approvedAt: application.approved_at || new Date(),
      applicationNumber: application.application_number,
      acceptanceReference: acceptanceRef,
      className: classAllocation?.name || null,
      classTeacherName: classAllocation?.teacher_name || null,
      dashboardRegistrationUrl,
      activationUrl: parentActivationUrl,
      pdfBuffer: pdfResult.buffer,
      pdfFilename: pdfResult.filename
    })
  });

  if (parentEmailResult.sent) {
    await db.query(
      'UPDATE learner_registrations SET acceptance_email_sent_at = COALESCE(acceptance_email_sent_at, NOW()), updated_at = NOW() WHERE id = $1',
      [registration.id]
    ).catch(() => {});
    await db.query(
      'UPDATE applications SET decision_email_sent_at = COALESCE(decision_email_sent_at, NOW()) WHERE id = $1',
      [application.id]
    ).catch(() => {});
  }

  // Also notify Learner at their own email if distinct from Parent email
  const cleanLearnerEmail = normalizeEmail(application.email);
  if (cleanLearnerEmail && cleanLearnerEmail !== normalizeEmail(application.primary_parent_email)) {
    await dispatchIdempotentEmail({
      applicationId: application.id,
      schoolId: application.school_id,
      eventType: 'application_accepted_learner',
      recipientEmail: cleanLearnerEmail,
      idempotencyKey: `app_accepted_learner:${application.id}:${cleanLearnerEmail}`,
      sendFn: () => emailService.sendIntegratedAcceptanceLetter({
        parentEmail: cleanLearnerEmail,
        parentName: learnerFullName,
        parentContact: application.primary_parent_phone || application.primary_parent_email,
        learnerName: learnerFullName,
        learnerNumber,
        schoolName: school.name,
        schoolEmail: school.contact_email || null,
        schoolPhone: school.contact_phone || null,
        schoolAddress: school.physical_address || null,
        schoolEmis: school.emis_number || null,
        grade,
        academicYear,
        stream: application.stream || null,
        homeLanguage: application.home_language || null,
        firstAdditionalLanguage: application.first_additional_language || null,
        selectedSubjects: Array.isArray(application.selected_subjects) ? application.selected_subjects : [],
        approvedAt: application.approved_at || new Date(),
        applicationNumber: application.application_number,
        acceptanceReference: acceptanceRef,
        className: classAllocation?.name || null,
        classTeacherName: classAllocation?.teacher_name || null,
        dashboardRegistrationUrl: learnerDashboardUrl,
        activationUrl: learnerActivationUrl,
        pdfBuffer: pdfResult.buffer,
        pdfFilename: pdfResult.filename
      })
    });
  }

  // Deduplicated in-app notification
  const notifyIds = [parentAccount.user?.id, learnerAccount.user?.id].filter(Boolean);
  if (notifyIds.length > 0 && !txResult.idempotentReplay) {
    await NotificationService.sendToUsers({
      userIds: notifyIds,
      title: `Admission Approved — ${school.name}`,
      message: `${learnerFullName} (Learner No: ${learnerNumber}) has been accepted for Grade ${grade} (${academicYear}). Complete Learner Registration in your dashboard to activate full learner access.`,
      type: 'admission_accepted',
      targetTab: 'registration',
      metadata: {
        application_id: application.id,
        application_number: application.application_number,
        learner_number: learnerNumber,
        acceptance_reference: acceptanceRef,
        school_id: application.school_id
      }
    }).catch(() => {});
  }

  return {
    application,
    registration,
    learnerNumber,
    acceptanceReference: acceptanceRef,
    pdfFilename: pdfResult.filename,
    emailDispatched: parentEmailResult.sent,
    emailSkipped: Boolean(parentEmailResult.skipped),
    parentActivationRequired: Boolean(parentActivationUrl),
    learnerActivationRequired: Boolean(learnerActivationUrl),
    dashboardRegistrationUrl
  };
}

/**
 * PHASE G: Authoritative, transactional Application Decline.
 * Records decision reason, reviewer, timestamp, timeline history, ensures NO active learner
 * enrollment is created, and dispatches Email 6 (Application Declined).
 */
async function declineApplication({ applicationId, actor, baseUrl = '', reason = '' }) {
  const cleanReason = String(reason || '').trim();
  if (cleanReason.length < 5) {
    const err = new Error('Please provide a clear reason for declining this application (at least 5 characters).');
    err.status = 400;
    throw err;
  }

  const txResult = await withTransaction(async (client) => {
    const appRes = await client.query(
      `SELECT * FROM applications
       WHERE id::text = $1::text OR application_number = $1::text
       FOR UPDATE`,
      [String(applicationId)]
    );
    if (appRes.rows.length === 0) {
      const err = new Error('Application not found.');
      err.status = 404;
      throw err;
    }
    const app = appRes.rows[0];
    if (!canDecideApplication(actor, app.school_id)) {
      const err = new Error('Application not found.');
      err.status = 404;
      throw err;
    }

    const transition = validateApplicationTransition({
      fromStatus: app.status,
      toStatus: 'rejected',
      actorRole: actor?.role,
      isSuperadmin: Boolean(actor?.is_superadmin)
    });
    if (!transition.allowed) {
      const err = new Error(transition.reason);
      err.status = transition.code === 'UNAUTHORIZED_STATUS_CHANGE' || transition.code === 'UNAUTHORIZED_ROLE' ? 403 : 409;
      err.code = transition.code;
      throw err;
    }

    const school = await fetchSchoolDetails(client, app.school_id);
    const updatedRes = await client.query(
      `UPDATE applications
       SET status = 'rejected',
           decision_reason = $1,
           admin_notes = $1,
           rejected_by = $2,
           rejected_at = NOW(),
           reviewed_by = $2,
           reviewed_at = NOW(),
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [cleanReason, actor?.id || null, app.id]
    );

    await recordStatusHistory(client, {
      applicationId: app.id,
      schoolId: app.school_id,
      fromStatus: app.status,
      toStatus: 'rejected',
      actorId: actor?.id || null,
      actorRole: actor?.role || 'admin',
      reason: cleanReason
    });

    return { application: updatedRes.rows[0], school };
  });

  const { application, school } = txResult;
  const academicYear = Number(application.academic_year || new Date().getFullYear());
  const learnerFullName = `${application.first_name || ''} ${application.surname || ''}`.trim();
  const parentFullName = `${application.primary_parent_name || ''} ${application.primary_parent_surname || ''}`.trim();
  const cleanBaseUrl = String(baseUrl || resolveFrontendOrigin(null)).replace(/\/+$/, '');

  const emailResult = await dispatchIdempotentEmail({
    applicationId: application.id,
    schoolId: application.school_id,
    eventType: 'application_declined',
    recipientEmail: application.primary_parent_email,
    idempotencyKey: `app_declined:${application.id}:${application.rejected_at ? new Date(application.rejected_at).getTime() : Date.now()}`,
    sendFn: () => emailService.sendApplicationUnsuccessful({
      parentEmail: application.primary_parent_email,
      parentName: parentFullName || 'Parent / Guardian',
      learnerName: learnerFullName,
      schoolName: school?.name || 'School Administration',
      schoolEmail: school?.contact_email || null,
      schoolPhone: school?.contact_phone || null,
      grade: Number(application.grade_applied),
      academicYear,
      applicationNumber: application.application_number,
      reason: cleanReason,
      dashboardUrl: `${cleanBaseUrl}/dashboard/parent?tab=registration`
    })
  });

  if (emailResult.sent) {
    await db.query('UPDATE applications SET decision_email_sent_at = NOW() WHERE id = $1', [application.id]).catch(() => {});
  }

  return { application, emailDispatched: emailResult.sent };
}

/**
 * PHASE E: School Admin / Principal requests additional documents from applicant/Parent.
 */
async function createDocumentRequest({ applicationId, actor, baseUrl = '', body = {} }) {
  const checked = validateDocumentRequestPayload(body);
  if (!checked.valid) {
    const err = new Error(checked.error);
    err.status = 400;
    throw err;
  }

  const txResult = await withTransaction(async (client) => {
    const appRes = await client.query(
      `SELECT * FROM applications
       WHERE id::text = $1::text OR application_number = $1::text
       FOR UPDATE`,
      [String(applicationId)]
    );
    if (appRes.rows.length === 0) {
      const err = new Error('Application not found.');
      err.status = 404;
      throw err;
    }
    const app = appRes.rows[0];
    if (!canDecideApplication(actor, app.school_id)) {
      const err = new Error('Application not found.');
      err.status = 404;
      throw err;
    }

    const transition = validateApplicationTransition({
      fromStatus: app.status,
      toStatus: 'documents_requested',
      actorRole: actor?.role,
      isSuperadmin: Boolean(actor?.is_superadmin)
    });
    if (!transition.allowed) {
      const err = new Error(transition.reason);
      err.status = transition.code === 'UNAUTHORIZED_STATUS_CHANGE' || transition.code === 'UNAUTHORIZED_ROLE' ? 403 : 409;
      err.code = transition.code;
      throw err;
    }

    const school = await fetchSchoolDetails(client, app.school_id);
    const reqInsert = await client.query(
      `INSERT INTO application_document_requests (
         application_id, school_id, requested_by, required_documents,
         descriptions, instructions, deadline, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'requested')
       RETURNING *`,
      [
        app.id,
        app.school_id,
        actor.id,
        JSON.stringify(checked.value.required_documents),
        checked.value.descriptions,
        checked.value.instructions,
        checked.value.deadline
      ]
    );
    const docRequest = reqInsert.rows[0];

    const updatedAppRes = await client.query(
      `UPDATE applications
       SET status = 'documents_requested',
           reviewed_by = $1,
           reviewed_at = NOW(),
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [actor.id, app.id]
    );

    await recordStatusHistory(client, {
      applicationId: app.id,
      schoolId: app.school_id,
      fromStatus: app.status,
      toStatus: 'documents_requested',
      actorId: actor.id,
      actorRole: actor.role,
      reason: checked.value.instructions,
      metadata: {
        request_id: docRequest.id,
        required_documents: checked.value.required_documents.map((d) => d.label),
        deadline: checked.value.deadline
      }
    });

    return { application: updatedAppRes.rows[0], docRequest, school };
  });

  const { application, docRequest, school } = txResult;
  const cleanBaseUrl = String(baseUrl || resolveFrontendOrigin(null)).replace(/\/+$/, '');
  const learnerFullName = `${application.first_name || ''} ${application.surname || ''}`.trim();
  const parentFullName = `${application.primary_parent_name || ''} ${application.primary_parent_surname || ''}`.trim();
  const dashboardUrl = `${cleanBaseUrl}/dashboard/parent?tab=registration&applicationId=${encodeURIComponent(application.id)}`;

  // Email 2 — Documentation Requested
  const emailResult = await dispatchIdempotentEmail({
    applicationId: application.id,
    schoolId: application.school_id,
    eventType: 'documentation_requested',
    recipientEmail: application.primary_parent_email,
    idempotencyKey: `doc_requested:${docRequest.id}:${normalizeEmail(application.primary_parent_email)}`,
    sendFn: () => emailService.sendDocumentationRequested({
      recipientEmail: application.primary_parent_email,
      recipientName: parentFullName || 'Parent / Guardian',
      learnerName: learnerFullName,
      schoolName: school?.name || 'School Administration',
      schoolEmail: school?.contact_email || null,
      schoolPhone: school?.contact_phone || null,
      applicationNumber: application.application_number,
      grade: Number(application.grade_applied),
      academicYear: Number(application.academic_year || new Date().getFullYear()),
      requiredDocuments: checked.value.required_documents,
      instructions: checked.value.instructions,
      deadline: checked.value.deadline,
      dashboardUrl
    })
  });

  if (emailResult.sent) {
    await db.query('UPDATE application_document_requests SET email_sent_at = NOW() WHERE id = $1', [docRequest.id]).catch(() => {});
  }

  const notifyIds = [application.parent_user_id, application.applicant_user_id].filter(Boolean);
  if (notifyIds.length > 0) {
    await NotificationService.sendToUsers({
      userIds: notifyIds,
      title: `Documents Required — ${school?.name || 'School'}`,
      message: `${school?.name || 'Your school'} requested additional documents for ${learnerFullName} (${application.application_number}): ${checked.value.descriptions}.`,
      type: 'documentation_requested',
      targetTab: 'registration',
      metadata: { application_id: application.id, request_id: docRequest.id, school_id: application.school_id }
    }).catch(() => {});
  }

  return { application, request: docRequest, emailDispatched: emailResult.sent };
}

/**
 * PHASE E: Authenticated Parent or Learner securely uploads a requested document.
 */
async function uploadApplicationDocument({
  applicationId,
  actor,
  file,
  documentType = 'supporting_document',
  requestId = null,
  baseUrl = ''
}) {
  if (!file || !file.path) {
    const err = new Error('Please attach a valid PDF, JPG, PNG, or WebP document.');
    err.status = 400;
    throw err;
  }

  const cleanDocType = String(documentType || 'supporting_document').trim().toLowerCase().replace(/[\s-]+/g, '_').slice(0, 50);
  const parsedRequestId = requestId ? parseInt(requestId, 10) : null;

  const txResult = await withTransaction(async (client) => {
    const appRes = await client.query(
      'SELECT * FROM applications WHERE id = $1 FOR UPDATE',
      [Number(applicationId)]
    );
    if (appRes.rows.length === 0) {
      const err = new Error('Application not found.');
      err.status = 404;
      throw err;
    }
    const app = appRes.rows[0];

    const authorized = isActorAuthorizedForApplication({ actor, application: app });
    if (!authorized) {
      const err = new Error('You are not authorized to upload documents for this application.');
      err.status = 403;
      throw err;
    }

    const currentStatus = normalizeApplicationStatus(app.status);
    if (['enrolled', 'rejected', 'withdrawn', 'cancelled'].includes(currentStatus)) {
      const err = new Error(`Documents cannot be uploaded while application status is "${getStatusLabel(currentStatus)}".`);
      err.status = 409;
      throw err;
    }

    let matchedRequest = null;
    if (parsedRequestId) {
      const rRes = await client.query(
        'SELECT * FROM application_document_requests WHERE id = $1 AND application_id = $2 FOR UPDATE',
        [parsedRequestId, app.id]
      );
      if (rRes.rows.length === 0) {
        const err = new Error('Documentation request not found for this application.');
        err.status = 404;
        throw err;
      }
      matchedRequest = rRes.rows[0];
    } else {
      // Attach to the latest open document request if one exists
      const openReq = await client.query(
        `SELECT * FROM application_document_requests
         WHERE application_id = $1 AND status IN ('requested', 'rejected')
         ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
        [app.id]
      );
      matchedRequest = openReq.rows[0] || null;
    }

    const docRes = await client.query(
      `INSERT INTO application_documents (
         application_id, document_type, file_path, file_name, mime_type, file_size,
         is_verified, request_id, uploaded_by, review_status
       ) VALUES ($1, $2, $3, $4, $5, $6, FALSE, $7, $8, 'submitted')
       RETURNING *`,
      [
        app.id,
        cleanDocType,
        file.path,
        file.originalname || path.basename(file.path),
        file.mimetype || 'application/octet-stream',
        Number(file.size) || 0,
        matchedRequest?.id || null,
        actor.id
      ]
    );
    const savedDoc = docRes.rows[0];

    if (matchedRequest) {
      await client.query(
        `UPDATE application_document_requests
         SET status = 'submitted', fulfilled_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [matchedRequest.id]
      );
    }

    let updatedApp = app;
    if (['documents_requested', 'action_required', 'submitted'].includes(currentStatus) && matchedRequest) {
      const uRes = await client.query(
        `UPDATE applications SET status = 'documents_submitted', updated_at = NOW() WHERE id = $1 RETURNING *`,
        [app.id]
      );
      updatedApp = uRes.rows[0];
      await recordStatusHistory(client, {
        applicationId: app.id,
        schoolId: app.school_id,
        fromStatus: app.status,
        toStatus: 'documents_submitted',
        actorId: actor.id,
        actorRole: actor.role,
        reason: `Uploaded requested document: ${savedDoc.file_name} (${cleanDocType}).`,
        metadata: { document_id: savedDoc.id, request_id: matchedRequest.id, document_type: cleanDocType }
      });
    } else {
      await recordStatusHistory(client, {
        applicationId: app.id,
        schoolId: app.school_id,
        fromStatus: app.status,
        toStatus: app.status,
        actorId: actor.id,
        actorRole: actor.role,
        reason: `Uploaded supporting document: ${savedDoc.file_name} (${cleanDocType}).`,
        metadata: { document_id: savedDoc.id, document_type: cleanDocType }
      });
    }

    const school = await fetchSchoolDetails(client, app.school_id);
    return { application: updatedApp, document: savedDoc, request: matchedRequest, school };
  });

  const { application, document, request, school } = txResult;
  const learnerFullName = `${application.first_name || ''} ${application.surname || ''}`.trim();
  const cleanBaseUrl = String(baseUrl || resolveFrontendOrigin(null)).replace(/\/+$/, '');

  // Notify school admins in-app + Email 3 (Documentation Submitted to School Reviewer)
  const admins = await notifySchoolAdmins(application.school_id, {
    type: 'documentation_submitted',
    title: `Requested Documents Submitted — ${learnerFullName}`,
    message: `New document "${document.file_name}" uploaded for application ${application.application_number}. Ready for school review.`,
    metadata: { application_id: application.id, document_id: document.id, request_id: request?.id || null }
  });

  const reviewerEmail = school?.contact_email || admins[0]?.email || null;
  let emailSent = false;
  if (reviewerEmail) {
    const emailRes = await dispatchIdempotentEmail({
      applicationId: application.id,
      schoolId: application.school_id,
      eventType: 'documentation_submitted_reviewer',
      recipientEmail: reviewerEmail,
      idempotencyKey: `doc_submitted:${document.id}:${normalizeEmail(reviewerEmail)}`,
      sendFn: () => emailService.sendDocumentationSubmittedReviewer({
        reviewerEmail,
        schoolName: school?.name || 'School Administration',
        learnerName: learnerFullName,
        applicationNumber: application.application_number,
        grade: Number(application.grade_applied),
        documentType: document.document_type,
        fileName: document.file_name,
        reviewUrl: `${cleanBaseUrl}/dashboard/admin?tab=users`
      })
    });
    emailSent = emailRes.sent;
  }

  return {
    application,
    document: { ...document, file_url: safeDocUrl(document.file_path) },
    emailDispatched: emailSent
  };
}

/**
 * PHASE E: School Admin / Principal reviews submitted documentation (accept or request resubmission).
 */
async function reviewDocumentRequest({ applicationId, requestId, actor, outcome, notes = '', baseUrl = '' }) {
  const cleanOutcome = String(outcome || '').trim().toLowerCase();
  if (!['approved', 'rejected'].includes(cleanOutcome)) {
    const err = new Error('Review outcome must be "approved" or "rejected".');
    err.status = 400;
    throw err;
  }
  const cleanNotes = String(notes || '').trim();
  if (cleanOutcome === 'rejected' && cleanNotes.length < 5) {
    const err = new Error('Provide clear review notes explaining what needs to be resubmitted.');
    err.status = 400;
    throw err;
  }

  const txResult = await withTransaction(async (client) => {
    const appRes = await client.query(
      `SELECT * FROM applications
       WHERE id::text = $1::text OR application_number = $1::text
       FOR UPDATE`,
      [String(applicationId)]
    );
    if (appRes.rows.length === 0) {
      const err = new Error('Application not found.');
      err.status = 404;
      throw err;
    }
    const app = appRes.rows[0];
    if (!canDecideApplication(actor, app.school_id)) {
      const err = new Error('Application not found.');
      err.status = 404;
      throw err;
    }

    const reqRes = await client.query(
      'SELECT * FROM application_document_requests WHERE id = $1 AND application_id = $2 FOR UPDATE',
      [Number(requestId), app.id]
    );
    if (reqRes.rows.length === 0) {
      const err = new Error('Documentation request not found.');
      err.status = 404;
      throw err;
    }

    const updatedReq = (await client.query(
      `UPDATE application_document_requests
       SET status = $1,
           reviewed_by = $2,
           reviewed_at = NOW(),
           review_outcome = $1,
           review_notes = $3,
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [cleanOutcome, actor.id, cleanNotes || (cleanOutcome === 'approved' ? 'Documents verified and accepted.' : ''), Number(requestId)]
    )).rows[0];

    await client.query(
      `UPDATE application_documents
       SET review_status = $1,
           is_verified = $2,
           reviewed_by = $3,
           reviewed_at = NOW(),
           review_notes = $4
       WHERE request_id = $5`,
      [cleanOutcome, cleanOutcome === 'approved', actor.id, cleanNotes || null, Number(requestId)]
    );

    const openRemaining = await client.query(
      `SELECT COUNT(*)::int AS cnt FROM application_document_requests
       WHERE application_id = $1 AND status IN ('requested', 'rejected')`,
      [app.id]
    );
    const nextStatus = cleanOutcome === 'rejected' || Number(openRemaining.rows[0]?.cnt || 0) > 0
      ? 'documents_requested'
      : 'under_review';

    const updatedApp = (await client.query(
      `UPDATE applications SET status = $1, reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW() WHERE id = $3 RETURNING *`,
      [nextStatus, actor.id, app.id]
    )).rows[0];

    await recordStatusHistory(client, {
      applicationId: app.id,
      schoolId: app.school_id,
      fromStatus: app.status,
      toStatus: nextStatus,
      actorId: actor.id,
      actorRole: actor.role,
      reason: cleanNotes || (cleanOutcome === 'approved' ? 'Submitted documentation verified and accepted.' : 'Submitted documentation requires resubmission.'),
      metadata: { request_id: updatedReq.id, review_outcome: cleanOutcome }
    });

    const school = await fetchSchoolDetails(client, app.school_id);
    return { application: updatedApp, request: updatedReq, school };
  });

  const { application, request, school } = txResult;
  const learnerFullName = `${application.first_name || ''} ${application.surname || ''}`.trim();
  const parentFullName = `${application.primary_parent_name || ''} ${application.primary_parent_surname || ''}`.trim();
  const cleanBaseUrl = String(baseUrl || resolveFrontendOrigin(null)).replace(/\/+$/, '');
  const dashboardUrl = `${cleanBaseUrl}/dashboard/parent?tab=registration&applicationId=${encodeURIComponent(application.id)}`;

  // Email 4 — Documentation Reviewed
  const emailResult = await dispatchIdempotentEmail({
    applicationId: application.id,
    schoolId: application.school_id,
    eventType: 'documentation_reviewed',
    recipientEmail: application.primary_parent_email,
    idempotencyKey: `doc_reviewed:${request.id}:${cleanOutcome}:${new Date(request.reviewed_at).getTime()}`,
    sendFn: () => emailService.sendDocumentationReviewed({
      recipientEmail: application.primary_parent_email,
      recipientName: parentFullName || 'Parent / Guardian',
      learnerName: learnerFullName,
      schoolName: school?.name || 'School Administration',
      applicationNumber: application.application_number,
      outcome: cleanOutcome,
      reviewNotes: request.review_notes || '',
      nextStatusLabel: getStatusLabel(application.status),
      dashboardUrl
    })
  });

  const notifyIds = [application.parent_user_id, application.applicant_user_id].filter(Boolean);
  if (notifyIds.length > 0) {
    await NotificationService.sendToUsers({
      userIds: notifyIds,
      title: cleanOutcome === 'approved' ? 'Documents Accepted' : 'Document Resubmission Requested',
      message: `${school?.name || 'School'} reviewed your documents for ${learnerFullName} (${application.application_number}): ${request.review_notes || cleanOutcome}.`,
      type: 'documentation_reviewed',
      targetTab: 'registration',
      metadata: { application_id: application.id, request_id: request.id, outcome: cleanOutcome }
    }).catch(() => {});
  }

  return { application, request, emailDispatched: emailResult.sent };
}

/**
 * PHASE C & J: Fetch ALL applications across ALL statuses for the signed-in Parent or Learner,
 * with real status timeline, real uploaded documents, real document requests, and next action.
 */
async function getMyTrackedApplications(actor) {
  const role = normalizeRole(actor?.role);
  if (!isParentRole(role) && !isLearnerRole(role)) {
    const err = new Error('Only parent and learner accounts can access personal application tracking.');
    err.status = 403;
    throw err;
  }

  const actorId = Number(actor.id);
  const actorEmail = normalizeEmail(actor.email);
  const actorIdNo = normalizeIdNumber(actor.id_number);

  let rows = [];
  if (isParentRole(role)) {
    const res = await db.query(
      `SELECT a.*,
              s.name AS school_name,
              s.emis_number AS school_emis_number,
              s.contact_email AS school_contact_email,
              s.contact_phone AS school_contact_phone,
              s.physical_address AS school_physical_address,
              lr.id AS registration_id,
              lr.status AS registration_status,
              lr.learner_number AS reg_learner_number,
              lr.acceptance_letter_reference,
              lr.acceptance_letter_issued_at,
              lr.class_id AS reg_class_id,
              lr.selected_subjects AS reg_selected_subjects,
              lr.completed_at,
              cl.name AS allocated_class_name,
              TRIM(CONCAT(COALESCE(tu.full_name, ''), ' ', COALESCE(tu.surname, ''))) AS class_teacher_name
       FROM applications a
       LEFT JOIN schools s ON s.id = a.school_id
       LEFT JOIN learner_registrations lr ON lr.application_id = a.id
       LEFT JOIN classes cl ON cl.id = COALESCE(lr.class_id, a.assigned_class_id)
       LEFT JOIN users tu ON tu.id = COALESCE(cl.homeroom_teacher_id, cl.assigned_teacher_id)
       WHERE a.parent_user_id = $3
          OR lr.parent_user_id = $3
          OR ($1 <> '' AND (LOWER(a.primary_parent_email) = $1 OR LOWER(a.secondary_parent_email) = $1))
          OR ($2 <> '' AND LENGTH($2) >= 6 AND (
            REGEXP_REPLACE(COALESCE(a.primary_parent_id_number, '')::text, '[^0-9]', '', 'g') = $2
            OR REGEXP_REPLACE(COALESCE(a.secondary_parent_id_number, '')::text, '[^0-9]', '', 'g') = $2
          ))
       ORDER BY a.created_at DESC, a.id DESC`,
      [actorEmail, actorIdNo, actorId]
    );
    rows = res.rows;
  } else {
    const res = await db.query(
      `SELECT a.*,
              s.name AS school_name,
              s.emis_number AS school_emis_number,
              s.contact_email AS school_contact_email,
              s.contact_phone AS school_contact_phone,
              s.physical_address AS school_physical_address,
              lr.id AS registration_id,
              lr.status AS registration_status,
              lr.learner_number AS reg_learner_number,
              lr.acceptance_letter_reference,
              lr.acceptance_letter_issued_at,
              lr.class_id AS reg_class_id,
              lr.selected_subjects AS reg_selected_subjects,
              lr.completed_at,
              cl.name AS allocated_class_name,
              TRIM(CONCAT(COALESCE(tu.full_name, ''), ' ', COALESCE(tu.surname, ''))) AS class_teacher_name
       FROM applications a
       LEFT JOIN schools s ON s.id = a.school_id
       LEFT JOIN learner_registrations lr ON lr.application_id = a.id
       LEFT JOIN classes cl ON cl.id = COALESCE(lr.class_id, a.assigned_class_id)
       LEFT JOIN users tu ON tu.id = COALESCE(cl.homeroom_teacher_id, cl.assigned_teacher_id)
       WHERE a.applicant_user_id = $3
          OR lr.learner_user_id = $3
          OR ($1 <> '' AND LOWER(a.email) = $1)
          OR ($2 <> '' AND LENGTH($2) >= 6 AND REGEXP_REPLACE(COALESCE(a.id_number, '')::text, '[^0-9]', '', 'g') = $2)
       ORDER BY a.created_at DESC, a.id DESC`,
      [actorEmail, actorIdNo, actorId]
    );
    rows = res.rows;
  }

  if (rows.length === 0) return { applications: [] };

  const appIds = rows.map((r) => Number(r.id));
  const [docsRes, reqsRes, histRes] = await Promise.all([
    db.query(
      `SELECT id, application_id, document_type, file_name, file_path, mime_type, file_size,
              is_verified, request_id, review_status, review_notes, uploaded_at, reviewed_at
       FROM application_documents
       WHERE application_id = ANY($1::int[])
       ORDER BY uploaded_at DESC`,
      [appIds]
    ).catch(() => ({ rows: [] })),
    db.query(
      `SELECT id, application_id, school_id, required_documents, descriptions, instructions,
              deadline, status, fulfilled_at, review_outcome, review_notes, reviewed_at, created_at
       FROM application_document_requests
       WHERE application_id = ANY($1::int[])
       ORDER BY created_at DESC`,
      [appIds]
    ).catch(() => ({ rows: [] })),
    db.query(
      `SELECT id, application_id, from_status, to_status, actor_role, reason, metadata, created_at
       FROM application_status_history
       WHERE application_id = ANY($1::int[])
       ORDER BY created_at ASC, id ASC`,
      [appIds]
    ).catch(() => ({ rows: [] }))
  ]);

  const docsByApp = new Map();
  for (const d of docsRes.rows) {
    const k = Number(d.application_id);
    if (!docsByApp.has(k)) docsByApp.set(k, []);
    docsByApp.get(k).push({ ...d, file_url: safeDocUrl(d.file_path), file_path: undefined });
  }

  const reqsByApp = new Map();
  for (const r of reqsRes.rows) {
    const k = Number(r.application_id);
    if (!reqsByApp.has(k)) reqsByApp.set(k, []);
    reqsByApp.get(k).push(r);
  }

  const histByApp = new Map();
  for (const h of histRes.rows) {
    const k = Number(h.application_id);
    if (!histByApp.has(k)) histByApp.set(k, []);
    histByApp.get(k).push({
      ...h,
      to_status_label: getStatusLabel(h.to_status)
    });
  }

  const applications = rows.map((row) => {
    const canonicalStatus = normalizeApplicationStatus(row.status);
    const docs = docsByApp.get(Number(row.id)) || [];
    const requests = reqsByApp.get(Number(row.id)) || [];
    const timeline = histByApp.get(Number(row.id)) || [];
    const openRequests = requests.filter((r) => ['requested', 'rejected'].includes(String(r.status || '').toLowerCase()));
    const isCompleted = normalizeRole(row.registration_status) === 'completed' || canonicalStatus === 'enrolled';

    let nextAction = null;
    if (openRequests.length > 0 || canonicalStatus === 'documents_requested') {
      nextAction = {
        code: 'UPLOAD_DOCUMENTS',
        label: 'Upload Requested Documentation',
        detail: openRequests[0]?.instructions || 'Your school requested additional documentation to continue reviewing this application.'
      };
    } else if (canonicalStatus === 'approved' && !isCompleted) {
      nextAction = {
        code: 'COMPLETE_REGISTRATION',
        label: 'Complete Learner Registration',
        detail: 'Your application has been approved. Complete Learner Registration to confirm subjects and unlock the full Learner Dashboard.'
      };
    } else if (canonicalStatus === 'submitted' || canonicalStatus === 'under_review' || canonicalStatus === 'documents_submitted') {
      nextAction = {
        code: 'AWAIT_SCHOOL_REVIEW',
        label: 'Awaiting School Review',
        detail: 'Your application is with the school administration for review. No action is required from you right now.'
      };
    } else if (canonicalStatus === 'rejected') {
      nextAction = {
        code: 'APPLICATION_DECLINED',
        label: 'Application Declined',
        detail: row.decision_reason || row.admin_notes || 'Please contact the school administration for more information.'
      };
    }

    return {
      application_id: row.id,
      application_number: row.application_number,
      learner_number: row.provisional_learner_number || row.reg_learner_number || null,
      acceptance_reference: canonicalStatus === 'approved' || isCompleted
        ? (row.acceptance_letter_reference || buildAcceptanceReference(row))
        : null,
      school_id: row.school_id,
      school_name: row.school_name,
      school_contact_email: row.school_contact_email || null,
      school_contact_phone: row.school_contact_phone || null,
      school_physical_address: row.school_physical_address || null,
      learner_name: `${row.first_name || ''} ${row.surname || ''}`.trim(),
      first_name: row.first_name,
      surname: row.surname,
      grade: Number(row.grade_applied),
      academic_year: Number(row.academic_year || new Date(row.created_at || Date.now()).getFullYear()),
      stream: row.stream || null,
      home_language: row.home_language || null,
      first_additional_language: row.first_additional_language || null,
      selected_subjects: row.reg_selected_subjects || row.selected_subjects || [],
      parent_name: `${row.primary_parent_name || ''} ${row.primary_parent_surname || ''}`.trim(),
      parent_email: row.primary_parent_email || null,
      parent_phone: row.primary_parent_phone || null,
      status: canonicalStatus,
      status_label: getStatusLabel(canonicalStatus),
      decision_reason: row.decision_reason || (canonicalStatus === 'rejected' ? row.admin_notes : null) || null,
      submitted_at: row.created_at,
      approved_at: row.approved_at || null,
      rejected_at: row.rejected_at || null,
      registration_id: row.registration_id || null,
      registration_status: row.registration_status || (isCompleted ? 'completed' : null),
      requires_registration: canonicalStatus === 'approved' && !isCompleted,
      class_allocation: row.allocated_class_name
        ? {
            class_id: row.reg_class_id || row.assigned_class_id,
            class_name: row.allocated_class_name,
            class_teacher_name: row.class_teacher_name ? row.class_teacher_name.trim() : null
          }
        : null,
      documents: docs,
      document_requests: requests,
      outstanding_document_requests_count: openRequests.length,
      timeline,
      next_action: nextAction
    };
  });

  return { applications };
}

/**
 * PHASE I: Authoritative Learner Dashboard access status (restricted_applicant vs enrolled).
 */
async function getLearnerAccessStatus(actor) {
  const role = normalizeRole(actor?.role);
  if (!isLearnerRole(role)) {
    return evaluateLearnerDashboardAccess({ role });
  }

  const actorId = Number(actor.id);
  const [childrenRes, tracked] = await Promise.all([
    db.query(
      `SELECT id, school_id, grade, stream, class_id, learner_number, COALESCE(is_active, TRUE) AS is_active
       FROM children
       WHERE learner_user_id = $1 AND COALESCE(is_active, TRUE) = TRUE`,
      [actorId]
    ).catch(() => ({ rows: [] })),
    getMyTrackedApplications(actor).catch(() => ({ applications: [] }))
  ]);

  const access = evaluateLearnerDashboardAccess({
    role,
    activeChildren: childrenRes.rows,
    applications: tracked.applications
  });

  return {
    ...access,
    applications_count: tracked.applications.length,
    outstanding_document_requests: tracked.applications.reduce(
      (acc, a) => acc + Number(a.outstanding_document_requests_count || 0),
      0
    )
  };
}

module.exports = {
  allocateUniqueLearnerNumber,
  ensurePasswordlessAccount,
  recordStatusHistory,
  dispatchIdempotentEmail,
  handleApplicationSubmitted,
  approveApplication,
  declineApplication,
  createDocumentRequest,
  uploadApplicationDocument,
  reviewDocumentRequest,
  getMyTrackedApplications,
  getLearnerAccessStatus
};
