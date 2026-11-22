'use strict';

const fs = require('fs');
const path = require('path');
const db = require('../../../db/db');
const { withTransaction } = require('../../../db/transaction');
const { isIsolatedRuntime, isStagingReadOnly } = require('../../../lib/testSafety');
const principalActivation = require('./principalActivation');
const accountTokenService = require('./accountTokenService');
const {
  TOKEN_PURPOSES,
  isInternalPlaceholderEmail,
  resolveFrontendOrigin
} = require('../../../lib/authSecurity');
const academicStreamService = require('./academicStreamService');
const emailService = require('./emailService');
const NotificationService = require('./notificationService');
const { generateAcceptanceLetterPdf } = require('./acceptanceLetterPdfService');
const {
  REGISTRATION_TERMS_VERSION,
  REGISTRATION_TERMS_CLAUSES,
  OPEN_DEREGISTRATION_STATUSES,
  normalizeRole,
  normalizeEmail,
  normalizeIdNumber,
  isSchoolAdminRole,
  isParentRole,
  isLearnerRole,
  isTeacherRole,
  buildAcceptanceReference,
  isActorAuthorizedForApplication,
  evaluateRegistrationEligibility,
  validateRegistrationSubjects,
  evaluateDeregistrationTransition,
  resolveTeacherNotificationRecipients
} = require('../../../lib/learnerRegistrationWorkflow');

let schemaEnsured = false;

async function ensureRegistrationSchema(executor = db) {
  if (schemaEnsured) return;
  if (isIsolatedRuntime() || isStagingReadOnly()) return;
  try {
    const migrationPath = path.join(
      __dirname,
      '../../../db/migrations/20261121_integrated_learner_registration.sql'
    );
    const sql = fs.readFileSync(migrationPath, 'utf8');
    await executor.query(sql);
    schemaEnsured = true;
  } catch (err) {
    console.warn('[REGISTRATION SCHEMA WARNING]:', err.message);
  }
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
    [classId, schoolId]
  );
  return res.rows[0] || null;
}

async function fetchSchoolById(executor, schoolId) {
  const res = await executor.query(
    `SELECT *
     FROM schools
     WHERE id = $1
     LIMIT 1`,
    [schoolId]
  );
  return res.rows[0] || null;
}

async function dispatchInAppNotification({ userIds, schoolId, type, title, message, targetTab, metadata = {} }) {
  const uniqueIds = [...new Set((Array.isArray(userIds) ? userIds : []).map(Number).filter((n) => Number.isInteger(n) && n > 0))];
  if (uniqueIds.length === 0) return 0;
  return NotificationService.sendToUsers({
    userIds: uniqueIds,
    title,
    message,
    type,
    targetTab,
    metadata: {
      ...metadata,
      school_id: schoolId ? Number(schoolId) : undefined
    }
  });
}

function advisoryLockKeyForLearner(idNumber, childId, academicYear) {
  const seed = `${normalizeIdNumber(idNumber) || `child:${childId || 0}`}:${Number(academicYear) || 0}`;
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash | 0; // signed 32-bit int for pg_advisory_xact_lock
}

async function fetchSchoolSubjectConfig(executor, schoolId, academicYear, grade, schoolRow = null) {
  const nscRules = require('./nscCurriculum');
  let offerings = [];
  let streams = [];
  const gradeNum = Number(grade);
  const yearNum = Number(academicYear);
  let resolvedYear = yearNum;

  try {
    let offRes = await executor.query(
      `SELECT id, academic_year, subject_name, category, language_level, is_required, is_active
       FROM school_subject_offerings
       WHERE school_id = $1 AND academic_year = $2 AND grade = $3 AND COALESCE(is_active, TRUE) = TRUE
       ORDER BY category, subject_name`,
      [schoolId, yearNum, gradeNum]
    );
    if (!offRes.rows.length) {
      const latestRes = await executor.query(
        `SELECT academic_year FROM school_subject_offerings
         WHERE school_id = $1 AND grade = $2 AND COALESCE(is_active, TRUE) = TRUE
         ORDER BY academic_year DESC LIMIT 1`,
        [schoolId, gradeNum]
      );
      if (latestRes.rows[0]?.academic_year) {
        resolvedYear = Number(latestRes.rows[0].academic_year);
        offRes = await executor.query(
          `SELECT id, academic_year, subject_name, category, language_level, is_required, is_active
           FROM school_subject_offerings
           WHERE school_id = $1 AND academic_year = $2 AND grade = $3 AND COALESCE(is_active, TRUE) = TRUE
           ORDER BY category, subject_name`,
          [schoolId, resolvedYear, gradeNum]
        );
      }
    }
    const seen = new Set();
    for (const row of offRes.rows) {
      let displayName = String(row.subject_name || '').trim();
      const level = nscRules.normalizeLanguageLevel(row.language_level);
      if (String(row.category || '').toLowerCase() === 'language' && level && !displayName.toLowerCase().includes(level.toLowerCase())) {
        displayName = `${displayName} ${level}`;
      }
      const key = displayName.toLowerCase();
      if (!displayName || seen.has(key)) continue;
      seen.add(key);
      offerings.push({
        id: row.id,
        subject_name: displayName,
        raw_subject_name: row.subject_name,
        category: row.category || 'elective',
        language_level: level || '',
        is_required: Boolean(row.is_required),
        is_active: true
      });
    }
    // CAPS FET Grades 10-12 always include compulsory Life Orientation when a school has configured offerings
    if (offerings.length > 0 && gradeNum >= 10 && gradeNum <= 12 && !seen.has('life orientation')) {
      offerings.push({
        id: null,
        subject_name: 'Life Orientation',
        raw_subject_name: 'Life Orientation',
        category: 'compulsory',
        language_level: '',
        is_required: true,
        is_active: true
      });
    }
  } catch (err) {
    nscRules.wrapCurriculumSchemaError(err, 'fetchSchoolSubjectConfig:offerings');
  }

  try {
    let streamRes = await executor.query(
      `SELECT id, school_id, academic_year, grade, name, mathematics_option, electives, status
       FROM academic_streams
       WHERE school_id = $1 AND academic_year = $2 AND grade = $3 AND LOWER(status) IN ('published', 'draft')
       ORDER BY name`,
      [schoolId, yearNum, gradeNum]
    );
    if (!streamRes.rows.length) {
      const latestStreamYear = await executor.query(
        `SELECT academic_year FROM academic_streams
         WHERE school_id = $1 AND grade = $2 AND LOWER(status) IN ('published', 'draft')
         ORDER BY academic_year DESC LIMIT 1`,
        [schoolId, gradeNum]
      );
      if (latestStreamYear.rows[0]?.academic_year) {
        streamRes = await executor.query(
          `SELECT id, school_id, academic_year, grade, name, mathematics_option, electives, status
           FROM academic_streams
           WHERE school_id = $1 AND academic_year = $2 AND grade = $3 AND LOWER(status) IN ('published', 'draft')
           ORDER BY name`,
          [schoolId, Number(latestStreamYear.rows[0].academic_year), gradeNum]
        );
      }
    }
    streams = streamRes.rows;
  } catch (err) {
    nscRules.wrapCurriculumSchemaError(err, 'fetchSchoolSubjectConfig:streams');
  }

  let fallbackOfferedSubjects = [];
  const school = schoolRow || (await fetchSchoolById(executor, schoolId));
  if (Array.isArray(school?.offered_subjects)) {
    fallbackOfferedSubjects = school.offered_subjects.filter(Boolean);
  } else if (typeof school?.offered_subjects === 'string' && school.offered_subjects.trim()) {
    try {
      const parsed = JSON.parse(school.offered_subjects);
      if (Array.isArray(parsed)) fallbackOfferedSubjects = parsed.filter(Boolean);
    } catch (_) {
      fallbackOfferedSubjects = school.offered_subjects
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  // If no language offerings exist yet in school_subject_offerings, surface the school's registered offered_languages
  if (!offerings.some((o) => String(o.category || '').toLowerCase() === 'language') && school?.offered_languages) {
    const parsedLangs = nscRules.parseSchoolOfferedLanguages(school.offered_languages);
    const seen = new Set(offerings.map((o) => o.subject_name.toLowerCase()));
    for (const lang of parsedLangs) {
      const displayName = `${lang.language} ${lang.level}`;
      if (seen.has(displayName.toLowerCase())) continue;
      seen.add(displayName.toLowerCase());
      offerings.push({
        id: null,
        subject_name: displayName,
        raw_subject_name: lang.language,
        category: 'language',
        language_level: lang.level,
        is_required: Boolean(lang.required),
        is_active: true
      });
    }
  }

  return {
    offerings,
    streams,
    fallbackOfferedSubjects,
    resolved_year: resolvedYear,
    source: offerings.length > 0 ? 'school_subject_offerings' : (fallbackOfferedSubjects.length > 0 ? 'schools.offered_subjects' : 'unconfigured')
  };
}

async function findLinkedChildForApplication(executor, application) {
  const cleanId = normalizeIdNumber(application.id_number);
  const appNo = String(application.application_number || '').trim();
  const appEmail = normalizeEmail(application.email);
  const res = await executor.query(
    `SELECT c.*
     FROM children c
     LEFT JOIN users lu ON lu.id = c.learner_user_id
     WHERE ($1 <> '' AND c.application_number = $1)
        OR ($2 <> '' AND lu.id_number IS NOT NULL AND REGEXP_REPLACE(lu.id_number::text, '[^0-9]', '', 'g') = $2)
        OR ($3 <> '' AND lu.email IS NOT NULL AND LOWER(lu.email) = $3)
     ORDER BY CASE WHEN c.school_id = $4 THEN 0 ELSE 1 END, c.id DESC
     LIMIT 1`,
    [appNo, cleanId, appEmail, Number(application.school_id)]
  );
  return res.rows[0] || null;
}

async function findLinkedParentIds(executor, childId) {
  if (!childId) return [];
  const ids = new Set();
  try {
    const cRes = await executor.query(
      'SELECT * FROM children WHERE id = $1 LIMIT 1',
      [childId]
    );
    if (cRes.rows[0]?.parent_id) ids.add(Number(cRes.rows[0].parent_id));
    if (cRes.rows[0]?.secondary_parent_id) ids.add(Number(cRes.rows[0].secondary_parent_id));
  } catch (_) {}
  try {
    const pcRes = await executor.query(
      'SELECT parent_id FROM parent_children WHERE child_id = $1',
      [childId]
    );
    pcRes.rows.forEach((r) => {
      if (r.parent_id) ids.add(Number(r.parent_id));
    });
  } catch (_) {}
  return Array.from(ids);
}

async function findActiveEnrolmentsForLearner(executor, { childId, idNumber, learnerUserId, academicYear }) {
  const results = [];
  const seenKeys = new Set();
  const cleanId = normalizeIdNumber(idNumber);

  // 1. Check learner_enrolments joined to children, learner user & schools
  try {
    const enrRes = await executor.query(
      `SELECT le.id AS enrolment_id,
              le.school_id,
              le.child_id,
              le.academic_year,
              le.grade,
              le.class_id,
              le.status,
              s.name AS school_name
       FROM learner_enrolments le
       JOIN children c ON c.id = le.child_id
       LEFT JOIN users lu ON lu.id = c.learner_user_id
       LEFT JOIN schools s ON s.id = le.school_id
       WHERE le.status = 'active'
         AND ($1::int IS NULL OR le.academic_year = $1)
         AND (
           ($2::int IS NOT NULL AND le.child_id = $2)
           OR ($3::int IS NOT NULL AND c.learner_user_id = $3)
           OR ($4 <> '' AND lu.id_number IS NOT NULL AND REGEXP_REPLACE(lu.id_number::text, '[^0-9]', '', 'g') = $4)
         )`,
      [academicYear || null, childId || null, learnerUserId || null, cleanId]
    );
    for (const row of enrRes.rows) {
      const key = `${row.school_id}:${row.academic_year}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        results.push(row);
      }
    }
  } catch (_) {}

  // 2. Check completed / deregistration_requested learner_registrations
  try {
    const regRes = await executor.query(
      `SELECT lr.id AS registration_id,
              lr.school_id,
              lr.child_id,
              lr.academic_year,
              lr.grade,
              lr.class_id,
              lr.status,
              s.name AS school_name
       FROM learner_registrations lr
       LEFT JOIN children c ON c.id = lr.child_id
       LEFT JOIN users lu ON lu.id = COALESCE(lr.learner_user_id, c.learner_user_id)
       LEFT JOIN applications a ON a.id = lr.application_id
       LEFT JOIN schools s ON s.id = lr.school_id
       WHERE lr.status IN ('completed', 'deregistration_requested')
         AND ($1::int IS NULL OR lr.academic_year = $1)
         AND (
           ($2::int IS NOT NULL AND lr.child_id = $2)
           OR ($3::int IS NOT NULL AND lr.learner_user_id = $3)
           OR ($4 <> '' AND lu.id_number IS NOT NULL AND REGEXP_REPLACE(lu.id_number::text, '[^0-9]', '', 'g') = $4)
           OR ($4 <> '' AND a.id_number IS NOT NULL AND REGEXP_REPLACE(a.id_number::text, '[^0-9]', '', 'g') = $4)
         )`,
      [academicYear || null, childId || null, learnerUserId || null, cleanId]
    );
    for (const row of regRes.rows) {
      const key = `${row.school_id}:${row.academic_year}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        results.push(row);
      }
    }
  } catch (_) {}

  // 3. Check active children records with a real school_id (legacy active enrollments before learner_enrolments existed)
  try {
    const childRes = await executor.query(
      `SELECT c.id AS child_id,
              c.school_id,
              c.grade,
              c.class_id,
              s.name AS school_name
       FROM children c
       LEFT JOIN users lu ON lu.id = c.learner_user_id
       LEFT JOIN schools s ON s.id = c.school_id
       WHERE COALESCE(c.is_active, TRUE) = TRUE
         AND c.school_id IS NOT NULL
         AND (
           ($1::int IS NOT NULL AND c.id = $1)
           OR ($2::int IS NOT NULL AND c.learner_user_id = $2)
           OR ($3 <> '' AND lu.id_number IS NOT NULL AND REGEXP_REPLACE(lu.id_number::text, '[^0-9]', '', 'g') = $3)
         )`,
      [childId || null, learnerUserId || null, cleanId]
    );
    for (const row of childRes.rows) {
      const year = Number(academicYear || new Date().getFullYear());
      const key = `${row.school_id}:${year}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        results.push({
          ...row,
          academic_year: year,
          status: 'active'
        });
      }
    }
  } catch (_) {}

  return results;
}

async function findOpenDeregistrationsForLearner(executor, { childId, idNumber, learnerUserId }) {
  const cleanId = normalizeIdNumber(idNumber);
  try {
    const res = await executor.query(
      `SELECT r.*, s.name AS school_name
       FROM learner_deregistration_requests r
       LEFT JOIN children c ON c.id = r.child_id
       LEFT JOIN users lu ON lu.id = COALESCE(r.learner_user_id, c.learner_user_id)
       LEFT JOIN schools s ON s.id = r.school_id
       WHERE r.status IN ('pending_teacher_review', 'pending_admin_approval')
         AND (
           ($1::int IS NOT NULL AND r.child_id = $1)
           OR ($2::int IS NOT NULL AND r.learner_user_id = $2)
           OR ($3 <> '' AND lu.id_number IS NOT NULL AND REGEXP_REPLACE(lu.id_number::text, '[^0-9]', '', 'g') = $3)
         )
       ORDER BY r.created_at DESC`,
      [childId || null, learnerUserId || null, cleanId]
    );
    return res.rows;
  } catch (_) {
    return [];
  }
}

/**
 * Ensures an account exists for a parent or learner WITHOUT ever generating or
 * storing plaintext passwords. New accounts are created with password_hash = NULL
 * and receive a SHA-256 hashed activation token via principalActivation.issue().
 */
async function ensureAccountWithSafeActivation(executor, {
  email,
  fullName,
  surname,
  phone,
  idNumber,
  roleName,
  fallbackRoleId,
  schoolId
}) {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { user: null, created: false, activationToken: null };
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
    const hasUnexpiredToken =
      Boolean(user.activation_token_hash) &&
      user.activation_expires_at &&
      new Date(user.activation_expires_at).getTime() > Date.now();
    if (!user.password_hash && !user.is_superadmin && !hasUnexpiredToken) {
      activationToken = await principalActivation.issue(executor, user.id);
    }
    return { user, created: false, activationToken, pendingActivation: !user.password_hash };
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
      schoolId || null
    ]
  );

  const createdUser = inserted.rows[0];
  const activationToken = await principalActivation.issue(executor, createdUser.id);
  return { user: createdUser, created: true, activationToken };
}

/**
 * Triggered when Principal / School Admin approves a learner admission application.
 * Idempotent: creates/updates learner_registrations, ensures parent account via safe
 * hashed activation token (zero plaintext passwords), generates official Acceptance
 * Letter PDF, dispatches Acceptance Email, and sends in-app notifications.
 */
async function handleApplicationApproved({ applicationId, actor = null, baseUrl = '', assignedClassId = null }) {
  const applicationLifecycleService = require('./applicationLifecycleService');
  return applicationLifecycleService.approveApplication({
    applicationId,
    actor: actor || { role: 'admin', is_superadmin: true },
    baseUrl,
    assignedClassId
  });
}

/**
 * Generates Acceptance Letter PDF for an authorized Parent, Learner, or accepting School Admin.
 */
async function generateAcceptanceLetterForActor({ applicationId, actor }) {
  const appRes = await db.query(
    `SELECT a.*, s.name AS school_name
     FROM applications a
     LEFT JOIN schools s ON s.id = a.school_id
     WHERE a.id = $1
     LIMIT 1`,
    [applicationId]
  );
  if (appRes.rows.length === 0) {
    const err = new Error('Admission application not found.');
    err.status = 404;
    throw err;
  }
  const app = appRes.rows[0];
  if (!['approved', 'enrolled'].includes(normalizeRole(app.status))) {
    const err = new Error('An acceptance letter is only available for approved admission applications.');
    err.status = 409;
    throw err;
  }

  const role = normalizeRole(actor.role);
  const isAdminOfSchool =
    (isSchoolAdminRole(role) && Number(actor.school_id) === Number(app.school_id)) ||
    Boolean(actor.is_superadmin);

  if (!isAdminOfSchool) {
    const linkedChild = await findLinkedChildForApplication(db, app);
    const linkedParentIds = await findLinkedParentIds(db, linkedChild?.id);
    const allowed = isActorAuthorizedForApplication({
      actor,
      application: app,
      linkedChild,
      linkedParentIds
    });
    if (!allowed) {
      const err = new Error('You are not authorized to download this acceptance letter.');
      err.status = 403;
      throw err;
    }
  }

  const regRes = await db.query(
    'SELECT * FROM learner_registrations WHERE application_id = $1 LIMIT 1',
    [app.id]
  );
  const reg = regRes.rows[0] || null;
  const school = await fetchSchoolById(db, app.school_id);
  const classId = reg?.class_id || app.assigned_class_id || null;
  const classAllocation = classId ? await fetchClassAllocation(db, app.school_id, classId) : null;

  return generateAcceptanceLetterPdf({
    application: app,
    school,
    classAllocation,
    issuedAt: reg?.acceptance_letter_issued_at || app.updated_at || new Date()
  });
}

/**
 * Lists all accepted applications awaiting registration, completed registrations,
 * active school enrollments, and deregistration requests owned strictly by the
 * authenticated Parent or Learner.
 */
async function getMyRegistrations(actor) {
  const role = normalizeRole(actor.role);
  if (!isParentRole(role) && !isLearnerRole(role)) {
    const err = new Error('Only parent and learner accounts can access personal learner registrations.');
    err.status = 403;
    throw err;
  }

  const actorId = Number(actor.id);
  const actorEmail = normalizeEmail(actor.email);
  const actorIdNo = normalizeIdNumber(actor.id_number);

  // Fetch approved/enrolled applications owned by this parent or learner
  let appRows = [];
  if (isParentRole(role)) {
    const res = await db.query(
      `SELECT a.*,
              s.name AS school_name,
              s.emis_number AS school_emis_number,
              lr.id AS registration_id,
              lr.status AS registration_status,
              lr.acceptance_letter_reference,
              lr.acceptance_letter_issued_at,
              lr.class_id AS reg_class_id,
              lr.selected_subjects AS reg_selected_subjects,
              lr.terms_accepted,
              lr.terms_accepted_at,
              lr.completed_at,
              cl.name AS allocated_class_name,
              TRIM(CONCAT(COALESCE(tu.full_name, ''), ' ', COALESCE(tu.surname, ''))) AS class_teacher_name
       FROM applications a
       LEFT JOIN schools s ON s.id = a.school_id
       LEFT JOIN learner_registrations lr ON lr.application_id = a.id
       LEFT JOIN classes cl ON cl.id = COALESCE(lr.class_id, a.assigned_class_id)
       LEFT JOIN users tu ON tu.id = COALESCE(cl.homeroom_teacher_id, cl.assigned_teacher_id)
       WHERE LOWER(a.status) IN ('approved', 'enrolled')
         AND (
           ($1 <> '' AND (LOWER(a.primary_parent_email) = $1 OR LOWER(a.secondary_parent_email) = $1))
           OR ($2 <> '' AND LENGTH($2) >= 6 AND (
             REGEXP_REPLACE(COALESCE(a.primary_parent_id_number, '')::text, '[^0-9]', '', 'g') = $2
             OR REGEXP_REPLACE(COALESCE(a.secondary_parent_id_number, '')::text, '[^0-9]', '', 'g') = $2
           ))
           OR lr.parent_user_id = $3
           OR EXISTS (
             SELECT 1 FROM children c
             LEFT JOIN users lu ON lu.id = c.learner_user_id
             WHERE (c.parent_id = $3 OR c.secondary_parent_id = $3 OR EXISTS (
               SELECT 1 FROM parent_children pc WHERE pc.child_id = c.id AND pc.parent_id = $3
             ))
             AND (
               (c.application_number IS NOT NULL AND c.application_number = a.application_number)
               OR (lu.id_number IS NOT NULL AND a.id_number IS NOT NULL AND REGEXP_REPLACE(lu.id_number::text, '[^0-9]', '', 'g') = REGEXP_REPLACE(a.id_number::text, '[^0-9]', '', 'g'))
             )
           )
         )
       ORDER BY a.updated_at DESC, a.id DESC`,
      [actorEmail, actorIdNo, actorId]
    );
    appRows = res.rows;
  } else {
    const res = await db.query(
      `SELECT a.*,
              s.name AS school_name,
              s.emis_number AS school_emis_number,
              lr.id AS registration_id,
              lr.status AS registration_status,
              lr.acceptance_letter_reference,
              lr.acceptance_letter_issued_at,
              lr.class_id AS reg_class_id,
              lr.selected_subjects AS reg_selected_subjects,
              lr.terms_accepted,
              lr.terms_accepted_at,
              lr.completed_at,
              cl.name AS allocated_class_name,
              TRIM(CONCAT(COALESCE(tu.full_name, ''), ' ', COALESCE(tu.surname, ''))) AS class_teacher_name
       FROM applications a
       LEFT JOIN schools s ON s.id = a.school_id
       LEFT JOIN learner_registrations lr ON lr.application_id = a.id
       LEFT JOIN classes cl ON cl.id = COALESCE(lr.class_id, a.assigned_class_id)
       LEFT JOIN users tu ON tu.id = COALESCE(cl.homeroom_teacher_id, cl.assigned_teacher_id)
       WHERE LOWER(a.status) IN ('approved', 'enrolled')
         AND (
           lr.learner_user_id = $3
           OR ($1 <> '' AND LOWER(a.email) = $1)
           OR ($2 <> '' AND LENGTH($2) >= 6 AND REGEXP_REPLACE(COALESCE(a.id_number, '')::text, '[^0-9]', '', 'g') = $2)
           OR EXISTS (
             SELECT 1 FROM children c
             LEFT JOIN users lu ON lu.id = c.learner_user_id
             WHERE c.learner_user_id = $3
               AND (
                 (c.application_number IS NOT NULL AND c.application_number = a.application_number)
                 OR (lu.id_number IS NOT NULL AND a.id_number IS NOT NULL AND REGEXP_REPLACE(lu.id_number::text, '[^0-9]', '', 'g') = REGEXP_REPLACE(a.id_number::text, '[^0-9]', '', 'g'))
               )
           )
         )
       ORDER BY a.updated_at DESC, a.id DESC`,
      [actorEmail, actorIdNo, actorId]
    );
    appRows = res.rows;
  }

  // Fetch active children/enrollments owned by this user for deregistration, Learner password handoff & status display
  let childrenRows = [];
  if (isParentRole(role)) {
    const cRes = await db.query(
      `SELECT DISTINCT ON (c.id)
              c.id AS child_id,
              c.learner_user_id,
              c.full_name,
              c.surname,
              c.grade,
              c.stream,
              c.learner_number,
              c.application_number,
              c.school_id,
              c.class_id,
              c.subjects,
              COALESCE(c.is_active, TRUE) AS is_active,
              (lu.password_hash IS NOT NULL) AS learner_has_password,
              lu.email AS learner_account_email,
              lr.application_id,
              s.name AS school_name,
              cl.name AS class_name,
              TRIM(CONCAT(COALESCE(tu.full_name, ''), ' ', COALESCE(tu.surname, ''))) AS class_teacher_name
       FROM children c
       LEFT JOIN users lu ON lu.id = c.learner_user_id
       LEFT JOIN learner_registrations lr ON lr.child_id = c.id AND lr.status = 'completed'
       LEFT JOIN schools s ON s.id = c.school_id
       LEFT JOIN classes cl ON cl.id = c.class_id
       LEFT JOIN users tu ON tu.id = COALESCE(cl.homeroom_teacher_id, cl.assigned_teacher_id)
       WHERE c.parent_id = $1
          OR c.secondary_parent_id = $1
          OR EXISTS (SELECT 1 FROM parent_children pc WHERE pc.child_id = c.id AND pc.parent_id = $1)
       ORDER BY c.id DESC`,
      [actorId]
    );
    childrenRows = cRes.rows.map((row) => ({
      ...row,
      learner_has_password: Boolean(row.learner_has_password),
      learner_has_personal_email: Boolean(row.learner_account_email && !isInternalPlaceholderEmail(row.learner_account_email)),
      learner_account_email: undefined
    }));
  } else {
    const cRes = await db.query(
      `SELECT c.id AS child_id,
              c.learner_user_id,
              c.full_name,
              c.surname,
              c.grade,
              c.stream,
              c.learner_number,
              c.application_number,
              c.school_id,
              c.class_id,
              c.subjects,
              COALESCE(c.is_active, TRUE) AS is_active,
              (lu.password_hash IS NOT NULL) AS learner_has_password,
              s.name AS school_name,
              cl.name AS class_name,
              TRIM(CONCAT(COALESCE(tu.full_name, ''), ' ', COALESCE(tu.surname, ''))) AS class_teacher_name
       FROM children c
       LEFT JOIN users lu ON lu.id = c.learner_user_id
       LEFT JOIN schools s ON s.id = c.school_id
       LEFT JOIN classes cl ON cl.id = c.class_id
       LEFT JOIN users tu ON tu.id = COALESCE(cl.homeroom_teacher_id, cl.assigned_teacher_id)
       WHERE c.learner_user_id = $1
       ORDER BY c.id DESC`,
      [actorId]
    );
    childrenRows = cRes.rows;
  }

  const childIds = childrenRows.map((c) => Number(c.child_id)).filter(Number.isFinite);
  let deregistrationRequests = [];
  if (childIds.length > 0) {
    const dRes = await db.query(
      `SELECT r.*,
              c.full_name AS learner_first_name,
              c.surname AS learner_surname,
              c.grade AS learner_grade,
              s.name AS school_name,
              cl.name AS class_name,
              TRIM(CONCAT(COALESCE(tu.full_name, ''), ' ', COALESCE(tu.surname, ''))) AS class_teacher_name
       FROM learner_deregistration_requests r
       JOIN children c ON c.id = r.child_id
       LEFT JOIN schools s ON s.id = r.school_id
       LEFT JOIN classes cl ON cl.id = r.assigned_class_id
       LEFT JOIN users tu ON tu.id = r.assigned_class_teacher_id
       WHERE r.child_id = ANY($1::int[])
       ORDER BY r.created_at DESC`,
      [childIds]
    );
    deregistrationRequests = dRes.rows;
  }

  const applications = appRows.map((row) => {
    const isCompleted =
      normalizeRole(row.registration_status) === 'completed' ||
      (normalizeRole(row.status) === 'enrolled' && Boolean(row.completed_at));
    return {
      application_id: row.id,
      application_number: row.application_number,
      learner_number: row.provisional_learner_number || row.learner_number || null,
      acceptance_reference: row.acceptance_letter_reference || buildAcceptanceReference(row),
      school_id: row.school_id,
      school_name: row.school_name,
      school_emis_number: row.school_emis_number || null,
      learner_name: `${row.first_name || ''} ${row.surname || ''}`.trim(),
      first_name: row.first_name,
      surname: row.surname,
      grade: Number(row.grade_applied),
      academic_year: Number(row.academic_year || new Date().getFullYear()),
      stream: row.stream || null,
      application_status: row.status,
      registration_id: row.registration_id || null,
      registration_status: row.registration_status || (isCompleted ? 'completed' : 'awaiting_registration'),
      requires_registration: !isCompleted && normalizeRole(row.status) === 'approved',
      class_id: row.reg_class_id || row.assigned_class_id || null,
      class_name: row.allocated_class_name || null,
      class_teacher_name: row.class_teacher_name ? row.class_teacher_name.trim() : null,
      selected_subjects: row.reg_selected_subjects || row.selected_subjects || [],
      terms_accepted: Boolean(row.terms_accepted),
      terms_accepted_at: row.terms_accepted_at || null,
      completed_at: row.completed_at || null,
      acceptance_letter_issued_at: row.acceptance_letter_issued_at || row.updated_at || null
    };
  });

  return {
    applications,
    pending_count: applications.filter((a) => a.requires_registration).length,
    active_enrollments: childrenRows,
    deregistration_requests: deregistrationRequests
  };
}

/**
 * Fetches full verified registration context for an accepted application:
 * - Learner identity (read-only)
 * - Accepting school, grade, academic year (locked)
 * - Real configured school subjects & streams
 * - Real school-allocated class & Class Teacher
 * - Eligibility & single-active-school conflict status
 * - Terms & Conditions text + version
 */
async function getRegistrationContext({ applicationId, actor }) {
  const appRes = await db.query(
    `SELECT a.*, s.name AS school_name
     FROM applications a
     LEFT JOIN schools s ON s.id = a.school_id
     WHERE a.id = $1
     LIMIT 1`,
    [applicationId]
  );
  if (appRes.rows.length === 0) {
    const err = new Error('Admission application not found.');
    err.status = 404;
    throw err;
  }

  const app = appRes.rows[0];
  const school = await fetchSchoolById(db, app.school_id);
  const regRes = await db.query(
    'SELECT * FROM learner_registrations WHERE application_id = $1 LIMIT 1',
    [app.id]
  );
  const existingRegistration = regRes.rows[0] || null;

  const linkedChild = await findLinkedChildForApplication(db, app);
  const linkedParentIds = await findLinkedParentIds(db, linkedChild?.id);
  const classId = existingRegistration?.class_id || app.assigned_class_id || null;
  const classAllocation = classId ? await fetchClassAllocation(db, app.school_id, classId) : null;

  const academicYear = Number(app.academic_year || new Date().getFullYear());
  const grade = Number(app.grade_applied || 10);

  const schoolSubjectConfig = await fetchSchoolSubjectConfig(db, app.school_id, academicYear, grade, school);
  const activeEnrolments = await findActiveEnrolmentsForLearner(db, {
    childId: linkedChild?.id || existingRegistration?.child_id || null,
    idNumber: app.id_number,
    learnerUserId: linkedChild?.learner_user_id || existingRegistration?.learner_user_id || null,
    academicYear
  });
  const openDeregistrations = await findOpenDeregistrationsForLearner(db, {
    childId: linkedChild?.id || existingRegistration?.child_id || null,
    idNumber: app.id_number,
    learnerUserId: linkedChild?.learner_user_id || existingRegistration?.learner_user_id || null
  });

  const eligibility = evaluateRegistrationEligibility({
    application: app,
    actor,
    linkedChild,
    linkedParentIds,
    existingRegistration,
    activeEnrolments,
    openDeregistrations,
    classAllocation,
    schoolSubjectConfig
  });

  if (eligibility.code === 'UNAUTHORIZED_ACTOR') {
    const err = new Error(eligibility.reason);
    err.status = 403;
    throw err;
  }

  return {
    eligibility,
    application: {
      id: app.id,
      application_number: app.application_number,
      learner_number: app.provisional_learner_number || existingRegistration?.learner_number || linkedChild?.learner_number || null,
      acceptance_reference: existingRegistration?.acceptance_letter_reference || buildAcceptanceReference(app),
      status: app.status,
      grade,
      academic_year: academicYear,
      stream: app.stream || null,
      home_language: app.home_language || null,
      first_additional_language: app.first_additional_language || null
    },
    learner: {
      first_name: app.first_name,
      surname: app.surname,
      full_name: `${app.first_name || ''} ${app.surname || ''}`.trim(),
      date_of_birth: app.dob || null,
      gender: app.gender || null,
      id_number_masked: app.id_number ? `*********${String(app.id_number).slice(-4)}` : null,
      guardian_name: `${app.primary_parent_name || ''} ${app.primary_parent_surname || ''}`.trim(),
      guardian_email: app.primary_parent_email || null,
      guardian_phone: app.primary_parent_phone || null
    },
    school: {
      id: school?.id || app.school_id,
      name: school?.name || app.school_name,
      emis_number: school?.emis_number || null,
      province: school?.province || null,
      district: school?.district || null
    },
    class_allocation: classAllocation
      ? {
          assigned: true,
          class_id: classAllocation.id,
          class_name: classAllocation.name,
          grade: classAllocation.grade,
          stream: classAllocation.stream || null,
          class_teacher_id: classAllocation.teacher_id || null,
          class_teacher_name: classAllocation.teacher_name ? classAllocation.teacher_name.trim() : null
        }
      : {
          assigned: false,
          class_id: null,
          class_name: null,
          class_teacher_id: null,
          class_teacher_name: null,
          status_label: 'Class allocation pending school administration'
        },
    subject_configuration: {
      source: schoolSubjectConfig.source,
      configured: schoolSubjectConfig.offerings.length > 0 || schoolSubjectConfig.fallbackOfferedSubjects.length > 0,
      offerings: schoolSubjectConfig.offerings,
      streams: schoolSubjectConfig.streams,
      fallback_offered_subjects: schoolSubjectConfig.fallbackOfferedSubjects
    },
    existing_registration: existingRegistration
      ? {
          id: existingRegistration.id,
          status: existingRegistration.status,
          selected_subjects: existingRegistration.selected_subjects || [],
          terms_accepted: Boolean(existingRegistration.terms_accepted),
          terms_version: existingRegistration.terms_version || null,
          terms_accepted_at: existingRegistration.terms_accepted_at || null,
          completed_at: existingRegistration.completed_at || null
        }
      : null,
    terms: {
      version: REGISTRATION_TERMS_VERSION,
      clauses: REGISTRATION_TERMS_CLAUSES
    }
  };
}

/**
 * Transactional, idempotent completion of Learner Registration inside Parent/Learner Dashboard.
 * Enforces single active school registration, school subject validation, school class allocation,
 * explicit Terms & Conditions consent audit, and dispatches deduplicated Class & Subject Teacher
 * notifications after commit.
 */
async function completeLearnerRegistration({ applicationId, actor, payload = {}, baseUrl = '' }) {
  if (payload.terms_accepted !== true && payload.termsAccepted !== true) {
    const err = new Error('You must explicitly review and accept the Registration Terms & Conditions before completing registration.');
    err.status = 400;
    err.code = 'TERMS_NOT_ACCEPTED';
    throw err;
  }

  const submittedTermsVersion = String(payload.terms_version || payload.termsVersion || REGISTRATION_TERMS_VERSION).trim();
  const requestedSubjects = Array.isArray(payload.selected_subjects)
    ? payload.selected_subjects
    : (Array.isArray(payload.selectedSubjects) ? payload.selectedSubjects : []);
  const requestedStreamId = payload.academic_stream_id || payload.streamId || null;
  const requestedHomeLanguage = String(payload.home_language || payload.homeLanguage || '').trim();
  const requestedFal = String(payload.first_additional_language || payload.firstAdditionalLanguage || '').trim();

  const txResult = await withTransaction(async (client) => {
    // Lock application row to prevent concurrent duplicate registrations
    const appRes = await client.query(
      `SELECT a.*, s.name AS school_name
       FROM applications a
       LEFT JOIN schools s ON s.id = a.school_id
       WHERE a.id = $1
       FOR UPDATE OF a`,
      [applicationId]
    );
    if (appRes.rows.length === 0) {
      const err = new Error('Admission application not found.');
      err.status = 404;
      throw err;
    }

    const app = appRes.rows[0];
    const school = await fetchSchoolById(client, app.school_id);
    const academicYear = Number(app.academic_year || new Date().getFullYear());
    const grade = Number(app.grade_applied || 10);

    // Serialize concurrent registrations for the SAME learner across ALL schools
    const lockKey = advisoryLockKeyForLearner(app.id_number, app.id, academicYear);
    await client.query('SELECT pg_advisory_xact_lock($1)', [lockKey]);

    // Lock existing learner_registrations row if present
    const regLookup = await client.query(
      'SELECT * FROM learner_registrations WHERE application_id = $1 FOR UPDATE',
      [app.id]
    );
    const existingRegistration = regLookup.rows[0] || null;

    const linkedChild = await findLinkedChildForApplication(client, app);
    const linkedParentIds = await findLinkedParentIds(client, linkedChild?.id);
    const classId = existingRegistration?.class_id || app.assigned_class_id || null;
    const classAllocation = classId ? await fetchClassAllocation(client, app.school_id, classId) : null;
    const schoolSubjectConfig = await fetchSchoolSubjectConfig(client, app.school_id, academicYear, grade, school);

    const activeEnrolments = await findActiveEnrolmentsForLearner(client, {
      childId: linkedChild?.id || existingRegistration?.child_id || null,
      idNumber: app.id_number,
      learnerUserId: linkedChild?.learner_user_id || existingRegistration?.learner_user_id || null,
      academicYear
    });
    const openDeregistrations = await findOpenDeregistrationsForLearner(client, {
      childId: linkedChild?.id || existingRegistration?.child_id || null,
      idNumber: app.id_number,
      learnerUserId: linkedChild?.learner_user_id || existingRegistration?.learner_user_id || null
    });

    const eligibility = evaluateRegistrationEligibility({
      application: app,
      actor,
      linkedChild,
      linkedParentIds,
      existingRegistration,
      activeEnrolments,
      openDeregistrations,
      classAllocation,
      schoolSubjectConfig,
      requestedSchoolId: payload.school_id ?? null,
      requestedGrade: payload.grade ?? null,
      requestedAcademicYear: payload.academic_year ?? null
    });

    if (eligibility.alreadyRegistered && existingRegistration) {
      return {
        idempotentReplay: true,
        registration: existingRegistration,
        childId: existingRegistration.child_id,
        learnerNumber: existingRegistration.learner_number || linkedChild?.learner_number || app.provisional_learner_number || null,
        classAllocation,
        school,
        application: app,
        normalizedSubjects: existingRegistration.selected_subjects || []
      };
    }

    if (!eligibility.eligible) {
      const err = new Error(eligibility.reason);
      err.status = eligibility.code === 'UNAUTHORIZED_ACTOR' ? 403 : 409;
      err.code = eligibility.code;
      throw err;
    }

    // Validate subject selection strictly against real school config
    const subjectValidation = validateRegistrationSubjects({
      grade,
      selectedSubjects: requestedSubjects,
      streamId: requestedStreamId,
      homeLanguage: requestedHomeLanguage || app.home_language || '',
      firstAdditionalLanguage: requestedFal || app.first_additional_language || '',
      schoolConfig: schoolSubjectConfig
    });

    if (!subjectValidation.valid) {
      const err = new Error(subjectValidation.errors.join(' '));
      err.status = 400;
      err.code = 'INVALID_SUBJECT_SELECTION';
      err.details = subjectValidation.errors;
      throw err;
    }

    const normalizedSubjects = subjectValidation.normalizedSubjects;
    const resolvedStreamName = subjectValidation.streamName || app.stream || classAllocation.stream || 'General';
    const resolvedHomeLanguage = requestedHomeLanguage || app.home_language || null;
    const resolvedFal = requestedFal || app.first_additional_language || null;

    // Resolve or safely create Parent & Learner user records (NEVER plaintext passwords)
    let parentUserId = isParentRole(actor.role) ? Number(actor.id) : (existingRegistration?.parent_user_id || linkedChild?.parent_id || null);
    if (!parentUserId && app.primary_parent_email) {
      const ensuredParent = await ensureAccountWithSafeActivation(client, {
        email: app.primary_parent_email,
        fullName: app.primary_parent_name || 'Parent',
        surname: app.primary_parent_surname || app.surname || '',
        phone: app.primary_parent_phone || null,
        idNumber: app.primary_parent_id_number || null,
        roleName: 'parent',
        fallbackRoleId: 4,
        schoolId: app.school_id
      });
      parentUserId = ensuredParent.user?.id || null;
    }

    let learnerUserId = isLearnerRole(actor.role) ? Number(actor.id) : (existingRegistration?.learner_user_id || linkedChild?.learner_user_id || null);
    const cleanLearnerEmailInput = normalizeEmail(app.email);
    const cleanParentEmailInput = normalizeEmail(app.primary_parent_email);
    const hasDistinctLearnerEmail = Boolean(
      cleanLearnerEmailInput &&
      !isInternalPlaceholderEmail(cleanLearnerEmailInput) &&
      cleanLearnerEmailInput !== cleanParentEmailInput
    );
    const learnerEmailForAccount = hasDistinctLearnerEmail
      ? cleanLearnerEmailInput
      : `learner.${app.id}@${String(app.school_id)}.geleza.local`;

    if (!learnerUserId) {
      const existingLearner = await client.query(
        `SELECT id FROM users
         WHERE LOWER(email) = LOWER($1)
            OR ($2 <> '' AND id_number IS NOT NULL AND REGEXP_REPLACE(id_number::text, '[^0-9]', '', 'g') = $2 AND LOWER(COALESCE(email, '')) <> LOWER($3))
         LIMIT 1`,
        [learnerEmailForAccount, normalizeIdNumber(app.id_number), cleanParentEmailInput || '']
      );
      if (existingLearner.rows[0]?.id) {
        learnerUserId = existingLearner.rows[0].id;
        await client.query('UPDATE users SET school_id = $1 WHERE id = $2', [app.school_id, learnerUserId]);
      } else {
        const learnerRoleId = await resolveRoleId(client, 'learner', 3);
        const insLearner = await client.query(
          `INSERT INTO users (
             full_name, surname, email, phone, id_number, role_id, school_id,
             password_hash, email_verification_status
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, 'pending_verification')
           RETURNING id`,
          [
            String(app.first_name || 'Learner').trim(),
            String(app.surname || '').trim(),
            learnerEmailForAccount,
            app.phone || app.primary_parent_phone || null,
            app.id_number || null,
            learnerRoleId,
            app.school_id
          ]
        );
        learnerUserId = insLearner.rows[0]?.id || null;
      }
    } else {
      await client.query('UPDATE users SET school_id = $1 WHERE id = $2', [app.school_id, learnerUserId]);
    }

    const applicationLifecycleService = require('./applicationLifecycleService');
    const learnerNumber = await applicationLifecycleService.allocateUniqueLearnerNumber(client, {
      academicYear,
      existingLearnerNumber: linkedChild?.learner_number || app.provisional_learner_number || existingRegistration?.learner_number || null
    });

    // Upsert children record idempotently (preserving historical record if transferring from a deregistered school)
    let childId = linkedChild?.id || existingRegistration?.child_id || null;
    if (childId) {
      await client.query(
        `UPDATE children
         SET school_id = $1,
             class_id = $2,
             grade = $3,
             stream = $4,
             home_language = COALESCE($5, home_language),
             subjects = $6,
             learner_user_id = COALESCE($7, learner_user_id),
             parent_id = COALESCE($8, parent_id),
             learner_number = COALESCE(learner_number, $9),
             application_number = COALESCE($10, application_number),
             is_active = TRUE
         WHERE id = $11`,
        [
          app.school_id,
          classAllocation.id,
          grade,
          resolvedStreamName,
          resolvedHomeLanguage,
          normalizedSubjects,
          learnerUserId,
          parentUserId,
          learnerNumber,
          app.application_number,
          childId
        ]
      );
    } else {
      const insChild = await client.query(
        `INSERT INTO children (
           parent_id, learner_user_id, full_name, surname, dob,
           grade, stream, home_language, subjects, class_id, school_id,
           learner_number, application_number, is_active
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, TRUE)
         RETURNING id`,
        [
          parentUserId,
          learnerUserId,
          app.first_name,
          app.surname,
          app.dob || null,
          grade,
          resolvedStreamName,
          resolvedHomeLanguage,
          normalizedSubjects,
          classAllocation.id,
          app.school_id,
          learnerNumber,
          app.application_number
        ]
      );
      childId = insChild.rows[0].id;
    }

    // Link parent_children idempotently
    if (parentUserId && childId) {
      await client.query(
        `INSERT INTO parent_children (parent_id, child_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [parentUserId, childId]
      ).catch(() => {});
    }

    // Upsert active learner_enrolments row (unique partial index prevents dual active schools at DB level too!)
    try {
      await client.query(
        `INSERT INTO learner_enrolments (
           school_id, child_id, academic_year, grade, class_id, status, source, created_by
         ) VALUES ($1, $2, $3, $4, $5, 'active', 'integrated_registration', $6)
         ON CONFLICT (school_id, child_id, academic_year) DO UPDATE SET
           grade = EXCLUDED.grade,
           class_id = EXCLUDED.class_id,
           status = 'active',
           source = 'integrated_registration'`,
        [app.school_id, childId, academicYear, grade, classAllocation.id, actor.id]
      );
    } catch (enrErr) {
      if (enrErr.code === '23505') {
        const err = new Error('This learner already holds an active school enrollment for this academic year.');
        err.status = 409;
        err.code = 'CONFLICTING_ACTIVE_SCHOOL';
        throw err;
      }
      // If learner_enrolments table does not exist in a minimal schema, log warning only
      if (enrErr.code !== '42P01') throw enrErr;
    }

    // Upsert learner_registrations -> completed
    const regUpsert = await client.query(
      `INSERT INTO learner_registrations (
         application_id, school_id, child_id, learner_user_id, parent_user_id,
         academic_year, grade, class_id, class_teacher_id,
         academic_stream_id, stream_name, home_language, first_additional_language,
         selected_subjects, status, acceptance_letter_reference, acceptance_letter_issued_at,
         terms_version, terms_accepted, terms_accepted_by, terms_accepted_at,
         completed_by, completed_at
       ) VALUES (
         $1, $2, $3, $4, $5,
         $6, $7, $8, $9,
         $10, $11, $12, $13,
         $14, 'completed', $15, NOW(),
         $16, TRUE, $17, NOW(),
         $17, NOW()
       )
       ON CONFLICT (application_id) DO UPDATE SET
         child_id = EXCLUDED.child_id,
         learner_user_id = EXCLUDED.learner_user_id,
         parent_user_id = COALESCE(EXCLUDED.parent_user_id, learner_registrations.parent_user_id),
         class_id = EXCLUDED.class_id,
         class_teacher_id = EXCLUDED.class_teacher_id,
         academic_stream_id = EXCLUDED.academic_stream_id,
         stream_name = EXCLUDED.stream_name,
         home_language = EXCLUDED.home_language,
         first_additional_language = EXCLUDED.first_additional_language,
         selected_subjects = EXCLUDED.selected_subjects,
         status = 'completed',
         terms_version = EXCLUDED.terms_version,
         terms_accepted = TRUE,
         terms_accepted_by = EXCLUDED.terms_accepted_by,
         terms_accepted_at = NOW(),
         completed_by = EXCLUDED.completed_by,
         completed_at = NOW(),
         updated_at = NOW()
       RETURNING *`,
      [
        app.id,
        app.school_id,
        childId,
        learnerUserId,
        parentUserId,
        academicYear,
        grade,
        classAllocation.id,
        classAllocation.teacher_id || null,
        requestedStreamId || null,
        resolvedStreamName,
        resolvedHomeLanguage,
        resolvedFal,
        normalizedSubjects,
        buildAcceptanceReference(app),
        submittedTermsVersion,
        actor.id
      ]
    );
    const savedRegistration = regUpsert.rows[0];

    // Record Terms & Conditions Consent Audit entry
    await client.query(
      `INSERT INTO learner_registration_consents (
         registration_id, application_id, school_id, child_id,
         accepted_by_user_id, accepted_by_role, terms_version, terms_summary, consent_context
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'dashboard_learner_registration')`,
      [
        savedRegistration.id,
        app.id,
        app.school_id,
        childId,
        actor.id,
        normalizeRole(actor.role),
        submittedTermsVersion,
        REGISTRATION_TERMS_CLAUSES.join(' | ')
      ]
    );

    // Update application to enrolled with confirmed allocation & subjects
    await client.query(
      `UPDATE applications
       SET status = 'enrolled',
           assigned_class_id = $1,
           provisional_learner_number = COALESCE(provisional_learner_number, $2),
           selected_subjects = $3,
           academic_stream_id = COALESCE($4, academic_stream_id),
           stream = COALESCE($5, stream),
           home_language = COALESCE($6, home_language),
           first_additional_language = COALESCE($7, first_additional_language),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8`,
      [
        classAllocation.id,
        learnerNumber,
        normalizedSubjects,
        requestedStreamId || null,
        resolvedStreamName,
        resolvedHomeLanguage,
        resolvedFal,
        app.id
      ]
    );

    await applicationLifecycleService.recordStatusHistory(client, {
      applicationId: app.id,
      schoolId: app.school_id,
      fromStatus: app.status,
      toStatus: 'enrolled',
      actorId: actor.id,
      actorRole: actor.role,
      reason: `Learner registration completed for Grade ${grade} (${classAllocation.name}).`,
      metadata: {
        learner_number: learnerNumber,
        child_id: childId,
        class_id: classAllocation.id,
        subjects_count: normalizedSubjects.length
      }
    });

    return {
      idempotentReplay: false,
      registration: savedRegistration,
      childId,
      learnerNumber,
      parentUserId,
      learnerUserId,
      hasDistinctLearnerEmail,
      learnerEmailForAccount,
      baseUrl,
      classAllocation,
      school,
      application: app,
      normalizedSubjects
    };
  });

  // Non-blocking post-commit distribution notifications & Phase M2.4 Learner activation (deduplicated)
  let postRegActivation = { mode: 'existing', activationEmailSent: false };
  if (!txResult.idempotentReplay) {
    postRegActivation = await dispatchPostRegistrationNotifications(txResult).catch((err) => {
      console.warn('[POST-REGISTRATION NOTIFICATION WARNING]:', err.message);
      return { mode: 'parent_handoff', activationEmailSent: false };
    });
  }

  return {
    success: true,
    idempotent_replay: txResult.idempotentReplay,
    registration: txResult.registration,
    child_id: txResult.childId,
    learner_number: txResult.learnerNumber || null,
    class_allocation: txResult.classAllocation,
    selected_subjects: txResult.normalizedSubjects,
    learner_activation_mode: postRegActivation?.mode || (txResult.hasDistinctLearnerEmail ? 'email_sent' : 'parent_handoff'),
    message: txResult.idempotentReplay
      ? 'Learner registration was already completed.'
      : 'Learner registration completed successfully. Your class teacher and subject teachers have been updated.'
  };
}

/**
 * Dispatches deduplicated in-app notifications to:
 * 1. Assigned Class Teacher (within accepting school)
 * 2. Matching Subject Teachers (within accepting school, filtered by selected subjects + grade/class)
 * 3. School Administration / Principal (within accepting school)
 * 4. Parent & Learner confirmation
 */
async function dispatchPostRegistrationNotifications(txResult) {
  const { registration, application, school, classAllocation, normalizedSubjects, parentUserId, learnerUserId } = txResult;
  const schoolId = Number(application.school_id);
  const grade = Number(application.grade_applied);
  const learnerName = `${application.first_name || ''} ${application.surname || ''}`.trim();
  const className = classAllocation?.name || `Grade ${grade}`;

  // Fetch all subject teachers in the accepting school ONLY
  const teacherRows = [];
  try {
    const empRes = await db.query(
      `SELECT u.id AS user_id,
              u.school_id,
              TRIM(CONCAT(COALESCE(u.full_name, ''), ' ', COALESCE(u.surname, ''))) AS full_name,
              e.subjects,
              e.grades_taught,
              e.classes_taught
       FROM employees e
       JOIN users u ON u.id = e.user_id
       WHERE u.school_id = $1`,
      [schoolId]
    );
    teacherRows.push(...empRes.rows);
  } catch (_) {}

  try {
    const taRes = await db.query(
      `SELECT ta.teacher_id AS user_id,
              u.school_id,
              TRIM(CONCAT(COALESCE(u.full_name, ''), ' ', COALESCE(u.surname, ''))) AS full_name,
              ta.subject_name,
              ta.grade_level,
              ta.class_name
       FROM teacher_assignments ta
       JOIN users u ON u.id = ta.teacher_id
       WHERE u.school_id = $1`,
      [schoolId]
    );
    teacherRows.push(...taRes.rows);
  } catch (_) {}

  const { classTeacherUserId, subjectTeacherRecipients } = resolveTeacherNotificationRecipients({
    schoolId,
    classAllocation,
    subjectTeachers: teacherRows,
    selectedSubjects: normalizedSubjects,
    grade,
    className
  });

  // 1. Class Teacher Notification (deduplicated via class_teacher_notified_at)
  if (classTeacherUserId && !registration.class_teacher_notified_at) {
    await dispatchInAppNotification({
      userIds: [classTeacherUserId],
      schoolId,
      type: 'class_learner_registered',
      title: `New Learner Registered in ${className}`,
      message: `${learnerName} (Grade ${grade}) has completed registration and has been added to your class roster (${className}).`,
      targetTab: 'classes',
      metadata: {
        registration_id: registration.id,
        child_id: registration.child_id,
        class_id: classAllocation.id,
        class_name: className,
        grade,
        selected_subjects: normalizedSubjects
      }
    });
    await db.query(
      'UPDATE learner_registrations SET class_teacher_notified_at = NOW(), updated_at = NOW() WHERE id = $1',
      [registration.id]
    ).catch(() => {});
  }

  // 2. Subject Teacher Notifications (deduplicated per teacher)
  const notifiedSubjectTeacherIds = [];
  if (!registration.subject_teachers_notified_at) {
    for (const recipient of subjectTeacherRecipients) {
      await dispatchInAppNotification({
        userIds: [recipient.user_id],
        schoolId,
        type: 'subject_learner_registered',
        title: `New Learner Registered for ${recipient.subjects.join(', ')}`,
        message: `${learnerName} (${className}, Grade ${grade}) has registered for ${recipient.subjects.join(', ')} and now appears on your subject roster.`,
        targetTab: 'subjects',
        metadata: {
          registration_id: registration.id,
          child_id: registration.child_id,
          class_name: className,
          grade,
          subjects: recipient.subjects
        }
      });
      notifiedSubjectTeacherIds.push(recipient.user_id);
    }
    if (notifiedSubjectTeacherIds.length > 0) {
      await db.query(
        `UPDATE learner_registrations
         SET subject_teachers_notified_at = NOW(),
             subject_teachers_notified_ids = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [notifiedSubjectTeacherIds, registration.id]
      ).catch(() => {});
    }
  }

  // 3. School Admin / Principal Notification (scoped to accepting school)
  try {
    const adminsRes = await db.query(
      `SELECT u.id
       FROM users u
       LEFT JOIN roles r ON (u.role_id::text = r.id::text OR LOWER(r.name) = LOWER(u.role_id::text))
       WHERE u.school_id = $1
         AND LOWER(COALESCE(r.name, u.role_id::text, '')) IN ('admin', 'principal', 'vice_principal', 'subadmin')`,
      [schoolId]
    );
    const adminIds = adminsRes.rows.map((r) => Number(r.id)).filter(Number.isFinite);
    if (adminIds.length > 0) {
      await dispatchInAppNotification({
        userIds: adminIds,
        schoolId,
        type: 'learner_registration_completed',
        title: `Learner Registration Confirmed — ${learnerName}`,
        message: `${learnerName} has completed integrated registration for Grade ${grade} (${className}) with ${normalizedSubjects.length} subjects.`,
        targetTab: 'users',
        metadata: {
          registration_id: registration.id,
          application_id: application.id,
          child_id: registration.child_id,
          class_name: className
        }
      });
    }
  } catch (_) {}

  // 4. Parent & Learner Confirmation Notification
  const familyIds = [parentUserId, learnerUserId].filter(Boolean);
  if (familyIds.length > 0) {
    await dispatchInAppNotification({
      userIds: familyIds,
      schoolId,
      type: 'learner_registration_confirmed',
      title: `Registration Complete — ${school?.name || 'School'}`,
      message: `${learnerName} (Learner No: ${txResult.learnerNumber || application.provisional_learner_number || ''}) is now officially registered in ${className} (Grade ${grade}) with ${normalizedSubjects.length} selected subjects.`,
      targetTab: 'registration',
      metadata: {
        registration_id: registration.id,
        child_id: registration.child_id,
        learner_number: txResult.learnerNumber || application.provisional_learner_number || null,
        class_name: className,
        selected_subjects: normalizedSubjects
      }
    });
  }

  // 5. Phase M2.4 — Email 7a (Parent Registration Confirmation) & Email 7b (Learner Personal Activation)
  let activationMode = 'parent_handoff';
  let activationEmailSent = false;
  try {
    const applicationLifecycleService = require('./applicationLifecycleService');
    const cleanBaseUrl = String(txResult.baseUrl || resolveFrontendOrigin(null)).replace(/\/+$/, '');
    const resolvedLearnerNo = txResult.learnerNumber || application.provisional_learner_number || '';
    const parentFullName = `${application.primary_parent_name || ''} ${application.primary_parent_surname || ''}`.trim() || 'Parent / Guardian';
    const cleanParentEmail = normalizeEmail(application.primary_parent_email);
    const cleanLearnerEmail = normalizeEmail(application.email);
    const learnerHasPersonalEmail = Boolean(
      cleanLearnerEmail &&
      !isInternalPlaceholderEmail(cleanLearnerEmail) &&
      cleanLearnerEmail !== cleanParentEmail
    );

    // Check if Learner still needs to set their own private password
    let learnerNeedsPassword = true;
    if (learnerUserId) {
      const luRes = await db.query('SELECT password_hash FROM users WHERE id = $1 LIMIT 1', [learnerUserId]);
      learnerNeedsPassword = !luRes.rows[0]?.password_hash;
    }

    if (learnerHasPersonalEmail && learnerUserId && learnerNeedsPassword) {
      activationMode = 'email_sent';
      const issued = await accountTokenService.issueActionToken(db, {
        userId: learnerUserId,
        purpose: TOKEN_PURPOSES.LEARNER_EMAIL_ACTIVATION,
        applicationId: application.id,
        childId: registration.child_id,
        schoolId
      });
      const learnerActivationUrl = `${cleanBaseUrl}/activate?token=${encodeURIComponent(issued.token)}`;

      // Email 7b — Learner Personal Activation Link (72h single-use, sent ONLY AFTER registration)
      const learnerMailRes = await applicationLifecycleService.dispatchIdempotentEmail({
        applicationId: application.id,
        schoolId,
        eventType: 'learner_activation_invite',
        recipientEmail: cleanLearnerEmail,
        idempotencyKey: `learner_activate:${registration.id}:${cleanLearnerEmail}`,
        sendFn: () => emailService.sendLearnerActivationInvite({
          learnerEmail: cleanLearnerEmail,
          learnerName,
          learnerNumber: resolvedLearnerNo,
          schoolName: school?.name || application.school_name || 'School',
          grade,
          academicYear: Number(application.academic_year || registration.academic_year || new Date().getFullYear()),
          className,
          activationUrl: learnerActivationUrl
        })
      });
      activationEmailSent = Boolean(learnerMailRes.sent);
    } else if (!learnerNeedsPassword) {
      activationMode = 'already_activated';
    } else {
      activationMode = 'parent_handoff';
    }

    // Email 7a — Parent Registration Completed Confirmation (zero plaintext passwords)
    if (application.primary_parent_email) {
      const emailRes = await applicationLifecycleService.dispatchIdempotentEmail({
        applicationId: application.id,
        schoolId,
        eventType: 'registration_completed',
        recipientEmail: application.primary_parent_email,
        idempotencyKey: `reg_completed:${registration.id}:${cleanParentEmail}`,
        sendFn: () => emailService.sendRegistrationCompletedConfirmation({
          recipientEmail: application.primary_parent_email,
          recipientName: parentFullName,
          learnerName,
          learnerNumber: resolvedLearnerNo,
          applicationNumber: application.application_number,
          schoolName: school?.name || application.school_name || 'School',
          grade,
          academicYear: Number(application.academic_year || registration.academic_year || new Date().getFullYear()),
          stream: registration.stream_name || application.stream || null,
          className,
          classTeacherName: classAllocation?.teacher_name ? classAllocation.teacher_name.trim() : null,
          selectedSubjects: normalizedSubjects,
          dashboardUrl: `${cleanBaseUrl}/dashboard/parent?tab=registration`,
          activationUrl: null,
          learnerActivationMode: activationMode
        })
      });
      if (emailRes.sent) {
        await db.query(
          'UPDATE learner_registrations SET registration_email_sent_at = COALESCE(registration_email_sent_at, NOW()), updated_at = NOW() WHERE id = $1',
          [registration.id]
        ).catch(() => {});
      }
    }
  } catch (regMailErr) {
    console.warn('[REGISTRATION COMPLETE EMAIL WARNING]:', regMailErr.message);
  }
  return { mode: activationMode, activationEmailSent };
}

/**
 * Phase M2.4 — Authenticated Parent-Initiated Short-Lived Single-Use Handoff Session
 * Allows a Learner (especially a minor without personal email) to personally create or reset
 * their own private password after registration WITHOUT the Parent ever seeing or choosing it.
 */
async function createLearnerHandoffSession({
  applicationId = null,
  childId = null,
  actor,
  mode = 'setup',
  baseUrl = ''
}) {
  if (!actor || !actor.id || !isParentRole(actor.role)) {
    const err = new Error('Only an authenticated Parent / Guardian can start a Learner password handoff session.');
    err.status = 403;
    err.code = 'PARENT_AUTH_REQUIRED';
    throw err;
  }

  const actorId = Number(actor.id);
  let child = null;
  let resolvedAppId = applicationId ? Number(applicationId) : null;

  if (childId) {
    const cRes = await db.query(
      `SELECT c.*, u.password_hash AS learner_password_hash, u.email AS learner_email,
              lr.application_id AS reg_application_id
       FROM children c
       LEFT JOIN users u ON u.id = c.learner_user_id
       LEFT JOIN learner_registrations lr ON lr.child_id = c.id AND lr.status = 'completed'
       WHERE c.id = $1
       LIMIT 1`,
      [Number(childId)]
    );
    child = cRes.rows[0] || null;
    if (child && !resolvedAppId) resolvedAppId = child.reg_application_id || null;
  } else if (resolvedAppId) {
    const cRes = await db.query(
      `SELECT c.*, u.password_hash AS learner_password_hash, u.email AS learner_email,
              lr.application_id AS reg_application_id
       FROM learner_registrations lr
       JOIN children c ON c.id = lr.child_id
       LEFT JOIN users u ON u.id = c.learner_user_id
       WHERE lr.application_id = $1 AND lr.status = 'completed'
       LIMIT 1`,
      [resolvedAppId]
    );
    child = cRes.rows[0] || null;
  }

  if (!child) {
    const err = new Error('Learner password setup is available only after school registration has been completed.');
    err.status = 409;
    err.code = 'registration_required';
    throw err;
  }

  if (child.is_active === false || !child.learner_number || !child.learner_user_id) {
    const err = new Error('This learner does not have an active registered enrolment with an Official Learner Number.');
    err.status = 409;
    err.code = 'registration_required';
    throw err;
  }

  // Strictly verify owning Parent authorization (prevent another Parent from initiating handoff!)
  const linkedParentIds = await findLinkedParentIds(db, child.id);
  let authorized = linkedParentIds.includes(actorId);
  if (!authorized && resolvedAppId) {
    const appOwnerRes = await db.query(
      'SELECT parent_user_id, LOWER(primary_parent_email) AS email FROM applications WHERE id = $1 LIMIT 1',
      [resolvedAppId]
    );
    const appOwner = appOwnerRes.rows[0];
    if (appOwner && (Number(appOwner.parent_user_id) === actorId || (actor.email && appOwner.email === normalizeEmail(actor.email)))) {
      authorized = true;
    }
  }
  if (!authorized) {
    const err = new Error('You are not authorized to initiate a password setup session for this learner.');
    err.status = 403;
    err.code = 'UNAUTHORIZED_PARENT';
    throw err;
  }

  const isReset = mode === 'reset';
  if (!isReset && child.learner_password_hash) {
    const err = new Error('This learner has already created their private password. Use Learner Password Reset if they forgot it.');
    err.status = 409;
    err.code = 'already_activated';
    throw err;
  }

  const purpose = isReset
    ? TOKEN_PURPOSES.LEARNER_PASSWORD_RESET_HANDOFF
    : TOKEN_PURPOSES.LEARNER_PARENT_HANDOFF;

  const issued = await accountTokenService.issueActionToken(db, {
    userId: child.learner_user_id,
    purpose,
    createdByUserId: actorId,
    applicationId: resolvedAppId,
    childId: child.id,
    schoolId: child.school_id,
    ttlMinutes: 15
  });

  const cleanBaseUrl = String(baseUrl || resolveFrontendOrigin(null)).replace(/\/+$/, '');
  const relativeUrl = `/activate?token=${encodeURIComponent(issued.token)}&purpose=${encodeURIComponent(purpose)}`;

  return {
    success: true,
    mode: isReset ? 'reset' : 'setup',
    purpose,
    handoff_url: relativeUrl,
    absolute_handoff_url: `${cleanBaseUrl}${relativeUrl}`,
    expires_at: issued.expiresAt,
    expires_in_minutes: 15,
    learner_number: child.learner_number,
    learner_name: `${child.full_name || ''} ${child.surname || ''}`.trim(),
    instructions: 'Hand the device to the learner so they can personally enter and confirm their private password. This single-use session expires in 15 minutes.'
  };
}

/**
 * School Admin / Principal school-scoped dashboard overview of learner registrations
 * and deregistration/transfer requests.
 */
async function getSchoolRegistrationDashboard({ schoolId, actor }) {
  const targetSchoolId = Number(schoolId);
  if (!Number.isInteger(targetSchoolId) || targetSchoolId <= 0) {
    const err = new Error('A valid school context is required.');
    err.status = 400;
    throw err;
  }

  if (!actor.is_superadmin && Number(actor.school_id) !== targetSchoolId) {
    const err = new Error('Cross-school registration access is prohibited.');
    err.status = 403;
    throw err;
  }

  const regRes = await db.query(
    `SELECT a.id AS application_id,
            a.application_number,
            a.first_name,
            a.surname,
            a.grade_applied,
            a.academic_year,
            a.status AS application_status,
            a.primary_parent_name,
            a.primary_parent_surname,
            a.primary_parent_email,
            lr.id AS registration_id,
            COALESCE(lr.status, CASE WHEN LOWER(a.status) = 'enrolled' THEN 'completed' ELSE 'awaiting_registration' END) AS registration_status,
            lr.acceptance_letter_reference,
            lr.acceptance_letter_issued_at,
            lr.selected_subjects,
            lr.terms_accepted,
            lr.terms_version,
            lr.terms_accepted_at,
            lr.completed_at,
            lr.class_teacher_notified_at,
            lr.subject_teachers_notified_at,
            COALESCE(lr.class_id, a.assigned_class_id) AS class_id,
            cl.name AS class_name,
            TRIM(CONCAT(COALESCE(tu.full_name, ''), ' ', COALESCE(tu.surname, ''))) AS class_teacher_name
     FROM applications a
     LEFT JOIN learner_registrations lr ON lr.application_id = a.id
     LEFT JOIN classes cl ON cl.id = COALESCE(lr.class_id, a.assigned_class_id)
     LEFT JOIN users tu ON tu.id = COALESCE(cl.homeroom_teacher_id, cl.assigned_teacher_id)
     WHERE a.school_id = $1
       AND LOWER(a.status) IN ('approved', 'enrolled')
     ORDER BY COALESCE(lr.completed_at, a.updated_at) DESC, a.id DESC`,
    [targetSchoolId]
  );

  const deregRes = await db.query(
    `SELECT r.*,
            c.full_name AS learner_first_name,
            c.surname AS learner_surname,
            c.grade AS learner_grade,
            c.learner_number,
            cl.name AS class_name,
            TRIM(CONCAT(COALESCE(tu.full_name, ''), ' ', COALESCE(tu.surname, ''))) AS class_teacher_name,
            TRIM(CONCAT(COALESCE(req_u.full_name, ''), ' ', COALESCE(req_u.surname, ''))) AS requested_by_name
     FROM learner_deregistration_requests r
     JOIN children c ON c.id = r.child_id
     LEFT JOIN classes cl ON cl.id = r.assigned_class_id
     LEFT JOIN users tu ON tu.id = r.assigned_class_teacher_id
     LEFT JOIN users req_u ON req_u.id = r.requested_by_user_id
     WHERE r.school_id = $1
     ORDER BY
       CASE r.status
         WHEN 'pending_admin_approval' THEN 1
         WHEN 'pending_teacher_review' THEN 2
         ELSE 3
       END,
       r.created_at DESC`,
    [targetSchoolId]
  );

  return {
    school_id: targetSchoolId,
    registrations: regRes.rows,
    deregistration_requests: deregRes.rows
  };
}

/**
 * Controlled Deregistration / Transfer Request Creation (Parent or authorized Learner).
 */
async function createDeregistrationRequest({ actor, childId, requestType = 'deregistration', reason = '', targetSchoolName = null }) {
  const childRes = await db.query(
    `SELECT c.*,
            cl.name AS class_name,
            COALESCE(cl.homeroom_teacher_id, cl.assigned_teacher_id) AS class_teacher_id,
            s.name AS school_name
     FROM children c
     LEFT JOIN classes cl ON cl.id = c.class_id
     LEFT JOIN schools s ON s.id = c.school_id
     WHERE c.id = $1
     LIMIT 1`,
    [childId]
  );
  if (childRes.rows.length === 0) {
    const err = new Error('Learner record not found.');
    err.status = 404;
    throw err;
  }
  const child = childRes.rows[0];
  if (child.is_active === false) {
    const err = new Error('This learner is already deregistered from this school.');
    err.status = 409;
    throw err;
  }

  const linkedParentIds = await findLinkedParentIds(db, child.id);
  const actorId = Number(actor.id);
  const isLinkedParent = isParentRole(actor.role) && linkedParentIds.includes(actorId);
  const isLinkedLearner = isLearnerRole(actor.role) && Number(child.learner_user_id) === actorId;

  const transition = evaluateDeregistrationTransition({
    action: 'create',
    actor,
    targetSchoolId: child.school_id,
    isLinkedParent,
    isLinkedLearner,
    reason
  });

  if (!transition.allowed) {
    const err = new Error(transition.reason);
    err.status = transition.code === 'UNAUTHORIZED_INITIATOR' ? 403 : 400;
    err.code = transition.code;
    throw err;
  }

  const normalizedType = normalizeRole(requestType) === 'transfer' ? 'transfer' : 'deregistration';
  const academicYear = new Date().getFullYear();

  const saved = await withTransaction(async (client) => {
    const openCheck = await client.query(
      `SELECT id, status FROM learner_deregistration_requests
       WHERE school_id = $1 AND child_id = $2
         AND status IN ('pending_teacher_review', 'pending_admin_approval')
       FOR UPDATE`,
      [child.school_id, child.id]
    );
    if (openCheck.rows.length > 0) {
      const err = new Error('A deregistration or transfer request is already in progress for this learner.');
      err.status = 409;
      err.code = 'DEREGISTRATION_ALREADY_OPEN';
      throw err;
    }

    const regRow = await client.query(
      `SELECT id, academic_year FROM learner_registrations
       WHERE child_id = $1 AND school_id = $2
       ORDER BY id DESC LIMIT 1`,
      [child.id, child.school_id]
    );
    const effectiveYear = Number(regRow.rows[0]?.academic_year || academicYear);

    let enrolmentId = null;
    try {
      const enrRow = await client.query(
        `SELECT id FROM learner_enrolments
         WHERE child_id = $1 AND school_id = $2 AND status = 'active'
         ORDER BY academic_year DESC LIMIT 1`,
        [child.id, child.school_id]
      );
      enrolmentId = enrRow.rows[0]?.id || null;
    } catch (_) {}

    const initialStatus = child.class_teacher_id ? 'pending_teacher_review' : 'pending_admin_approval';

    const ins = await client.query(
      `INSERT INTO learner_deregistration_requests (
         school_id, child_id, learner_user_id, registration_id, enrolment_id,
         academic_year, request_type, reason, target_school_name,
         requested_by_user_id, requested_by_role,
         parent_confirmed_by, parent_confirmed_at,
         assigned_class_id, assigned_class_teacher_id, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        child.school_id,
        child.id,
        child.learner_user_id || null,
        regRow.rows[0]?.id || null,
        enrolmentId,
        effectiveYear,
        normalizedType,
        String(reason).trim(),
        targetSchoolName ? String(targetSchoolName).trim() : null,
        actorId,
        normalizeRole(actor.role),
        isLinkedParent ? actorId : null,
        isLinkedParent ? new Date() : null,
        child.class_id || null,
        child.class_teacher_id || null,
        initialStatus
      ]
    );

    if (regRow.rows[0]?.id) {
      await client.query(
        `UPDATE learner_registrations
         SET status = 'deregistration_requested', updated_at = NOW()
         WHERE id = $1 AND status = 'completed'`,
        [regRow.rows[0].id]
      );
    }

    return ins.rows[0];
  });

  // Notify assigned Class Teacher (if assigned) and School Administration
  const learnerName = `${child.full_name || ''} ${child.surname || ''}`.trim();
  if (saved.assigned_class_teacher_id) {
    await dispatchInAppNotification({
      userIds: [saved.assigned_class_teacher_id],
      schoolId: child.school_id,
      type: 'deregistration_review_requested',
      title: `Class Teacher Review Required: ${learnerName}`,
      message: `A ${normalizedType} request was submitted for ${learnerName} (${child.class_name || `Grade ${child.grade}`}). Please review and forward to Principal/Administration.`,
      targetTab: 'overview',
      metadata: {
        deregistration_request_id: saved.id,
        child_id: child.id
      }
    }).catch(() => {});
  }

  try {
    const adminsRes = await db.query(
      `SELECT u.id
       FROM users u
       LEFT JOIN roles r ON (u.role_id::text = r.id::text OR LOWER(r.name) = LOWER(u.role_id::text))
       WHERE u.school_id = $1
         AND LOWER(COALESCE(r.name, u.role_id::text, '')) IN ('admin', 'principal', 'vice_principal', 'subadmin')`,
      [child.school_id]
    );
    const adminIds = adminsRes.rows.map((r) => Number(r.id)).filter(Number.isFinite);
    if (adminIds.length > 0) {
      await dispatchInAppNotification({
        userIds: adminIds,
        schoolId: child.school_id,
        type: 'deregistration_requested',
        title: `Learner ${normalizedType === 'transfer' ? 'Transfer' : 'Deregistration'} Request — ${learnerName}`,
        message: `A ${normalizedType} request for ${learnerName} is awaiting review (${saved.status.replace(/_/g, ' ')}).`,
        targetTab: 'users',
        metadata: { deregistration_request_id: saved.id, child_id: child.id }
      });
    }
  } catch (_) {}

  return saved;
}

/**
 * Lists deregistration requests strictly scoped to the caller's role & school:
 * - Parent / Learner: only their own learner(s)
 * - Teacher: only learners in classes where they are the assigned Class Teacher in their school
 * - School Admin / Principal: only their own school
 */
async function listDeregistrationRequests({ actor, schoolId = null }) {
  const role = normalizeRole(actor.role);
  const actorId = Number(actor.id);

  if (isSchoolAdminRole(role) || actor.is_superadmin) {
    const effectiveSchoolId = actor.is_superadmin && schoolId ? Number(schoolId) : Number(actor.school_id);
    if (!effectiveSchoolId) return [];
    const res = await db.query(
      `SELECT r.*,
              c.full_name AS learner_first_name,
              c.surname AS learner_surname,
              c.grade AS learner_grade,
              c.learner_number,
              cl.name AS class_name,
              s.name AS school_name,
              TRIM(CONCAT(COALESCE(tu.full_name, ''), ' ', COALESCE(tu.surname, ''))) AS class_teacher_name
       FROM learner_deregistration_requests r
       JOIN children c ON c.id = r.child_id
       LEFT JOIN classes cl ON cl.id = r.assigned_class_id
       LEFT JOIN schools s ON s.id = r.school_id
       LEFT JOIN users tu ON tu.id = r.assigned_class_teacher_id
       WHERE r.school_id = $1
       ORDER BY r.created_at DESC`,
      [effectiveSchoolId]
    );
    return res.rows;
  }

  if (isTeacherRole(role)) {
    const res = await db.query(
      `SELECT r.*,
              c.full_name AS learner_first_name,
              c.surname AS learner_surname,
              c.grade AS learner_grade,
              c.learner_number,
              cl.name AS class_name,
              s.name AS school_name
       FROM learner_deregistration_requests r
       JOIN children c ON c.id = r.child_id
       LEFT JOIN classes cl ON cl.id = r.assigned_class_id
       LEFT JOIN schools s ON s.id = r.school_id
       WHERE r.school_id = $1
         AND (r.assigned_class_teacher_id = $2 OR cl.homeroom_teacher_id = $2 OR cl.assigned_teacher_id = $2)
       ORDER BY r.created_at DESC`,
      [Number(actor.school_id), actorId]
    );
    return res.rows;
  }

  if (isParentRole(role) || isLearnerRole(role)) {
    const mine = await getMyRegistrations(actor);
    return mine.deregistration_requests || [];
  }

  return [];
}

/**
 * Class Teacher review & acknowledgement step (moves pending_teacher_review -> pending_admin_approval).
 * Class Teachers CANNOT directly finalize deregistration.
 */
async function reviewDeregistrationAsTeacher({ requestId, actor, notes = '' }) {
  const saved = await withTransaction(async (client) => {
    const res = await client.query(
      `SELECT r.*, c.full_name AS learner_first_name, c.surname AS learner_surname,
              cl.homeroom_teacher_id, cl.assigned_teacher_id
       FROM learner_deregistration_requests r
       JOIN children c ON c.id = r.child_id
       LEFT JOIN classes cl ON cl.id = r.assigned_class_id
       WHERE r.id = $1
       FOR UPDATE OF r`,
      [requestId]
    );
    if (res.rows.length === 0) {
      const err = new Error('Deregistration request not found.');
      err.status = 404;
      throw err;
    }

    const reqRow = res.rows[0];
    const actorId = Number(actor.id);
    const isAssignedClassTeacher =
      Number(reqRow.assigned_class_teacher_id) === actorId ||
      Number(reqRow.homeroom_teacher_id) === actorId ||
      Number(reqRow.assigned_teacher_id) === actorId;

    const transition = evaluateDeregistrationTransition({
      action: 'teacher_review',
      actor,
      request: reqRow,
      targetSchoolId: reqRow.school_id,
      isAssignedClassTeacher
    });
    if (!transition.allowed) {
      const err = new Error(transition.reason);
      err.status = ['CROSS_SCHOOL_DENIED', 'NOT_ASSIGNED_CLASS_TEACHER', 'TEACHER_ROLE_REQUIRED'].includes(transition.code) ? 403 : 409;
      err.code = transition.code;
      throw err;
    }

    const upd = await client.query(
      `UPDATE learner_deregistration_requests
       SET status = 'pending_admin_approval',
           teacher_reviewed_by = $1,
           teacher_reviewed_at = NOW(),
           teacher_notes = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [actorId, String(notes || '').trim() || 'Reviewed and acknowledged by Class Teacher.', reqRow.id]
    );

    return { updated: upd.rows[0], reqRow };
  });

  // Notify Principal / School Admin for final decision
  try {
    const adminsRes = await db.query(
      `SELECT u.id
       FROM users u
       LEFT JOIN roles r ON (u.role_id::text = r.id::text OR LOWER(r.name) = LOWER(u.role_id::text))
       WHERE u.school_id = $1
         AND LOWER(COALESCE(r.name, u.role_id::text, '')) IN ('admin', 'principal', 'vice_principal', 'subadmin')`,
      [saved.updated.school_id]
    );
    const adminIds = adminsRes.rows.map((r) => Number(r.id)).filter(Number.isFinite);
    if (adminIds.length > 0) {
      const learnerName = `${saved.reqRow.learner_first_name || ''} ${saved.reqRow.learner_surname || ''}`.trim();
      await dispatchInAppNotification({
        userIds: adminIds,
        schoolId: saved.updated.school_id,
        type: 'deregistration_ready_for_admin',
        title: `Deregistration Ready for Principal Decision — ${learnerName}`,
        message: `Class Teacher review is complete for ${learnerName}. Please approve or reject the ${saved.updated.request_type} request.`,
        targetTab: 'users',
        metadata: { deregistration_request_id: saved.updated.id, child_id: saved.updated.child_id }
      });
    }
  } catch (_) {}

  return saved.updated;
}

/**
 * Principal / School Admin final decision on Controlled Deregistration / Transfer.
 * On APPROVE: closes active enrollment cleanly (`status = 'deregistered' | 'transferred'`,
 * `children.is_active = FALSE`) while preserving ALL historical marks, progress, attendance,
 * behavior incidents, and report cards untouched!
 * On REJECT: restores learner_registrations status to 'completed' and keeps active enrollment intact.
 */
async function decideDeregistrationAsAdmin({ requestId, actor, decision, notes = '' }) {
  const action = normalizeRole(decision) === 'approve' || normalizeRole(decision) === 'approved'
    ? 'admin_approve'
    : (normalizeRole(decision) === 'reject' || normalizeRole(decision) === 'rejected' ? 'admin_reject' : null);

  if (!action) {
    const err = new Error('Decision must be "approve" or "reject".');
    err.status = 400;
    throw err;
  }

  const result = await withTransaction(async (client) => {
    const res = await client.query(
      `SELECT r.*, c.full_name AS learner_first_name, c.surname AS learner_surname,
              c.parent_id, c.secondary_parent_id, c.learner_user_id
       FROM learner_deregistration_requests r
       JOIN children c ON c.id = r.child_id
       WHERE r.id = $1
       FOR UPDATE OF r`,
      [requestId]
    );
    if (res.rows.length === 0) {
      const err = new Error('Deregistration request not found.');
      err.status = 404;
      throw err;
    }

    const reqRow = res.rows[0];
    const transition = evaluateDeregistrationTransition({
      action,
      actor,
      request: reqRow,
      targetSchoolId: reqRow.school_id
    });
    if (!transition.allowed) {
      const err = new Error(transition.reason);
      err.status = ['CROSS_SCHOOL_DENIED', 'ADMIN_ROLE_REQUIRED', 'TEACHER_CANNOT_APPROVE_DEREGISTRATION'].includes(transition.code)
        ? 403
        : 409;
      err.code = transition.code;
      throw err;
    }

    const finalStatus = transition.nextStatus;
    const closedStatus = reqRow.request_type === 'transfer' ? 'transferred' : 'deregistered';

    const updReq = await client.query(
      `UPDATE learner_deregistration_requests
       SET status = $1,
           admin_decided_by = $2,
           admin_decided_at = NOW(),
           admin_decision_notes = $3,
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [finalStatus, Number(actor.id), String(notes || '').trim() || null, reqRow.id]
    );

    if (finalStatus === 'approved') {
      // 1. Close active enrollment in learner_enrolments (NEVER delete historical records!)
      try {
        await client.query(
          `UPDATE learner_enrolments
           SET status = $1
           WHERE school_id = $2 AND child_id = $3 AND status = 'active'`,
          [closedStatus, reqRow.school_id, reqRow.child_id]
        );
      } catch (e) {
        if (e.code !== '42P01') throw e;
      }

      // 2. Close active learner_registrations row
      await client.query(
        `UPDATE learner_registrations
         SET status = $1, updated_at = NOW()
         WHERE school_id = $2 AND child_id = $3 AND status IN ('completed', 'deregistration_requested')`,
        [closedStatus, reqRow.school_id, reqRow.child_id]
      );

      // 3. Deactivate active roster membership ONLY — preserve children row, marks, attendance, reports!
      await client.query(
        `UPDATE children
         SET is_active = FALSE
         WHERE id = $1 AND school_id = $2`,
        [reqRow.child_id, reqRow.school_id]
      );
    } else {
      // Rejected: restore registration status back to 'completed'
      await client.query(
        `UPDATE learner_registrations
         SET status = 'completed', updated_at = NOW()
         WHERE school_id = $1 AND child_id = $2 AND status = 'deregistration_requested'`,
        [reqRow.school_id, reqRow.child_id]
      );
    }

    return { updated: updReq.rows[0], reqRow };
  });

  // Notify Parent, Learner, and Class Teacher
  const recipientIds = [
    result.reqRow.parent_id,
    result.reqRow.secondary_parent_id,
    result.reqRow.learner_user_id,
    result.reqRow.assigned_class_teacher_id
  ].filter(Boolean);

  if (recipientIds.length > 0) {
    const learnerName = `${result.reqRow.learner_first_name || ''} ${result.reqRow.learner_surname || ''}`.trim();
    const isApproved = result.updated.status === 'approved';
    await dispatchInAppNotification({
      userIds: recipientIds,
      schoolId: result.updated.school_id,
      type: isApproved ? 'deregistration_approved' : 'deregistration_rejected',
      title: isApproved
        ? `Deregistration Approved — ${learnerName}`
        : `Deregistration Request Declined — ${learnerName}`,
      message: isApproved
        ? `School Administration has approved the ${result.updated.request_type} request for ${learnerName}. Historical academic records remain preserved, and the learner is now cleared to register at another school.`
        : `School Administration has declined the ${result.updated.request_type} request for ${learnerName}.${notes ? ` Note: ${notes}` : ''}`,
      targetTab: 'registration',
      metadata: {
        deregistration_request_id: result.updated.id,
        child_id: result.updated.child_id,
        decision: result.updated.status
      }
    }).catch(() => {});
  }

  return result.updated;
}

module.exports = {
  ensureRegistrationSchema,
  handleApplicationApproved,
  generateAcceptanceLetterForActor,
  getMyRegistrations,
  getRegistrationContext,
  completeLearnerRegistration,
  createLearnerHandoffSession,
  getSchoolRegistrationDashboard,
  createDeregistrationRequest,
  listDeregistrationRequests,
  reviewDeregistrationAsTeacher,
  decideDeregistrationAsAdmin
};
