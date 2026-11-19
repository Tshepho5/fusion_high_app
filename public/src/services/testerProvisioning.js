'use strict';

const bcrypt = require('bcryptjs');
const db = require('../../../db/db');
const { withTransaction } = require('../../../db/transaction');
const emailService = require('./emailService');
const curriculumService = require('./curriculumService');
const { MESSAGE } = require('./lettersOnly');
const {
  INVITE_HOURS,
  assertTestSchool,
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
} = require('../../../lib/testerProgramme');

let schemaReady = false;

function httpError(status, error) {
  const err = new Error(error);
  err.status = status;
  return err;
}

function hasDigits(value) {
  return value != null && String(value).trim() !== '' && /\d/.test(String(value));
}

function cleanEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function publicBase(req) {
  const origin = req && req.headers ? req.headers.origin : '';
  if (origin && /^https?:\/\//i.test(origin)) return String(origin).replace(/\/$/, '');
  const configured = process.env.FRONTEND_URL || process.env.APP_URL;
  if (configured) return String(configured).replace(/\/$/, '');
  if (req && typeof req.get === 'function') return `${req.protocol}://${req.get('host')}`;
  return 'http://localhost:5173';
}

async function ready() {
  if (schemaReady) return;
  await ensureTesterSchema((text, params) => db.query(text, params));
  schemaReady = true;
}

async function testSchool() {
  await ready();
  const school = await ensureTestSchool((text, params) => db.query(text, params));
  const decision = assertTestSchool(school);
  if (!decision.ok) throw httpError(decision.status, decision.error);
  return school;
}

async function roleId(client, role) {
  const found = await client.query('SELECT id FROM roles WHERE LOWER(name) = LOWER($1) LIMIT 1', [role]);
  if (!found.rows[0]) throw httpError(500, 'The selected tester role is not available.');
  return found.rows[0].id;
}

function reference(prefix) {
  const crypto = require('crypto');
  return `${prefix}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

async function insertReference(client, table) {
  const prefix = table === 'tester_reports' ? 'RPT' : 'TST';
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = reference(prefix);
    const clash = await client.query(`SELECT 1 FROM ${table} WHERE reference_code = $1 LIMIT 1`, [code]);
    if (clash.rows.length === 0) return code;
  }
  throw httpError(500, 'A tester reference could not be reserved.');
}

function invitationMessage(delivery) {
  if (delivery.email_sent) return 'The invitation email was accepted by the mail service.';
  if (delivery.previous_link_kept) {
    return 'The new email was not delivered. The previous invitation link remains the one on record.';
  }
  return 'The invitation was saved. The email was not delivered, so it is not marked as sent.';
}

async function loadAccount(email) {
  const existing = await db.query(
    `SELECT u.id, u.email, u.school_id, COALESCE(u.is_tester, FALSE) AS is_tester,
            COALESCE(u.is_superadmin, FALSE) AS is_superadmin,
            COALESCE(s.is_test_school, FALSE) AS school_is_test
     FROM users u
     LEFT JOIN schools s ON s.id = u.school_id
     WHERE LOWER(u.email) = LOWER($1)
     LIMIT 1`,
    [email]
  );
  return existing.rows[0] || null;
}

async function dispatchInvite(invitation, token, req) {
  const acceptUrl = `${publicBase(req)}/tester-invite?token=${encodeURIComponent(token)}`;
  return emailService.sendTesterInvitationEmail({
    testerEmail: invitation.email,
    testerName: `${invitation.full_name} ${invitation.surname}`.trim(),
    roleName: invitation.role_name,
    schoolName: invitation.school_name || 'Geleza SA Tester School',
    referenceCode: invitation.reference_code,
    acceptUrl
  });
}

async function storeDelivery(id, tokenHash, delivery) {
  const sent = delivery.email_sent === true;
  await db.query(
    `UPDATE tester_invitations
     SET token_hash = CASE WHEN $2::boolean THEN $3 ELSE token_hash END,
         expires_at = CASE WHEN $2::boolean THEN NOW() + ($4::int * INTERVAL '1 hour') ELSE expires_at END,
         status = $5,
         delivery_status = $6,
         sent_at = CASE WHEN $2::boolean THEN NOW() ELSE sent_at END,
         updated_at = NOW()
     WHERE id = $1`,
    [id, sent, tokenHash, INVITE_HOURS, delivery.status, delivery.delivery_status]
  );
}

async function createInvitation(input, req) {
  await ready();
  const roleDecision = testerInviteRoleAllowed({
    requestedRole: input.role,
    targetIsSuperadmin: false
  });
  if (!roleDecision.ok) throw httpError(roleDecision.status, roleDecision.error);

  const email = cleanEmail(input.email);
  if (!email || !email.includes('@') || email.length > 255) {
    throw httpError(400, 'A valid email address is required for the tester.');
  }
  const fullName = String(input.full_name || '').trim();
  const surname = String(input.surname || '').trim() || 'Tester';
  if (!fullName) throw httpError(400, 'Tester full name is required.');
  if (hasDigits(fullName) || hasDigits(surname)) throw httpError(400, MESSAGE);
  const phone = String(input.phone || '').trim().slice(0, 30) || null;
  const sendEmail = input.send_email === true;

  const account = await loadAccount(email);
  const accountDecision = existingAccountInviteAllowed({
    exists: Boolean(account),
    isTester: account ? account.is_tester === true : false,
    isSuperadmin: account ? account.is_superadmin === true : false,
    schoolIsTest: account ? account.school_is_test === true : false
  });
  if (!accountDecision.ok) throw httpError(accountDecision.status, accountDecision.error);

  const open = await db.query(
    `SELECT id, reference_code, status
     FROM tester_invitations
     WHERE LOWER(email) = LOWER($1)
       AND status IN ('draft', 'pending', 'accepted', 'activated')
     LIMIT 1`,
    [email]
  );
  if (open.rows[0]) {
    throw httpError(409, `An invitation for this email already exists (${open.rows[0].reference_code}). Resend that invitation instead of creating another.`);
  }

  const school = await testSchool();
  let created;
  try {
    created = await withTransaction(async (client) => {
    const code = await insertReference(client, 'tester_invitations');
    const saved = await client.query(
      `INSERT INTO tester_invitations (
         reference_code, email, full_name, surname, phone, role_name, school_id, user_id,
         status, delivery_status, invited_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft', 'not_sent', $9)
       RETURNING id, reference_code, email, full_name, surname, role_name, school_id`,
      [
        code,
        email,
        fullName,
        surname,
        phone,
        roleDecision.role,
        school.id,
        account ? account.id : null,
        req.user && req.user.id ? req.user.id : null
      ]
    );
    return saved.rows[0];
  });
  } catch (err) {
    if (/duplicate|tester_invitations_one_open_email/i.test(err.message || '')) {
      throw httpError(409, 'An invitation for this email already exists. Resend that invitation instead of creating another.');
    }
    throw err;
  }
  created.school_name = school.name;

  let delivery = { email_sent: false, delivery_status: 'not_sent', status: 'draft' };
  if (sendEmail) {
    const minted = createInviteToken();
    let sendResult = { success: false };
    try {
      sendResult = await dispatchInvite(created, minted.token, req);
    } catch (err) {
      sendResult = { success: false, error: err.message };
    }
    delivery = deliveryFromSendResult(sendResult);
    await storeDelivery(created.id, minted.hash, delivery);
  }

  return {
    email_sent: delivery.email_sent === true,
    message: sendEmail ? invitationMessage(delivery) : 'The invitation was saved as a draft. No email was sent.',
    invitation: await publicInvitation(created.id)
  };
}

async function publicInvitation(id) {
  const result = await db.query(
    `SELECT i.id, i.reference_code, i.email, i.full_name, i.surname, i.phone, i.role_name,
            i.school_id, s.name AS school_name, i.user_id, i.status, i.delivery_status,
            i.sent_at, i.accepted_at, i.activated_at, i.revoked_at, i.expires_at, i.created_at,
            u.deactivated_at
     FROM tester_invitations i
     LEFT JOIN schools s ON s.id = i.school_id
     LEFT JOIN users u ON u.id = i.user_id
     WHERE i.id = $1`,
    [id]
  );
  return shapeInvitation(result.rows[0]);
}

function shapeInvitation(row) {
  if (!row) return null;
  let accountState = 'none';
  if (row.user_id && row.deactivated_at) accountState = 'deactivated';
  else if (row.user_id) accountState = 'active';
  return {
    id: row.id,
    reference_code: row.reference_code,
    email: row.email,
    full_name: row.full_name,
    surname: row.surname,
    phone: row.phone,
    role_name: row.role_name,
    school_id: row.school_id,
    school_name: row.school_name,
    user_id: row.user_id,
    status: row.status,
    delivery_status: row.delivery_status,
    sent_at: row.sent_at,
    accepted_at: row.accepted_at,
    activated_at: row.activated_at,
    revoked_at: row.revoked_at,
    expires_at: row.expires_at,
    created_at: row.created_at,
    account_state: accountState
  };
}

async function listProgramme() {
  await ready();
  await db.query(
    `UPDATE tester_invitations
     SET status = 'expired', updated_at = NOW()
     WHERE status = 'pending' AND expires_at IS NOT NULL AND expires_at < NOW()`
  );
  const school = await testSchool();
  const invitations = await db.query(
    `SELECT i.id, i.reference_code, i.email, i.full_name, i.surname, i.phone, i.role_name,
            i.school_id, s.name AS school_name, i.user_id, i.status, i.delivery_status,
            i.sent_at, i.accepted_at, i.activated_at, i.revoked_at, i.expires_at, i.created_at,
            u.deactivated_at, COALESCE(u.is_tester, FALSE) AS user_is_tester
     FROM tester_invitations i
     LEFT JOIN schools s ON s.id = i.school_id
     LEFT JOIN users u ON u.id = i.user_id
     ORDER BY i.created_at DESC`
  );
  const reports = await db.query(
    `SELECT id, role_name, dashboard, module, kind, result, severity, status, created_at
     FROM tester_reports
     ORDER BY created_at DESC`
  );
  const usersById = {};
  invitations.rows.forEach((row) => {
    if (row.user_id == null) return;
    usersById[String(row.user_id)] = {
      is_tester: row.user_is_tester === true,
      deactivated: Boolean(row.deactivated_at)
    };
  });
  const legacy = await db.query(
    `SELECT u.id, u.email, u.full_name, u.surname, u.created_at, u.deactivated_at,
            u.school_id, s.name AS school_name
     FROM users u
     LEFT JOIN schools s ON s.id = u.school_id
     WHERE COALESCE(u.is_tester, FALSE) = TRUE
       AND COALESCE(u.is_superadmin, FALSE) = FALSE
       AND NOT EXISTS (SELECT 1 FROM tester_invitations i WHERE i.user_id = u.id)
     ORDER BY u.created_at DESC`
  );
  const programme = summariseProgramme(invitations.rows, reports.rows, usersById, new Date());
  programme.legacy_testers_outside_programme = legacy.rows.filter((row) => !row.deactivated_at).length;
  const testers = invitations.rows.map(shapeInvitation).concat(legacy.rows.map((row) => ({
    id: row.id,
    reference_code: 'LEGACY',
    email: row.email,
    full_name: row.full_name,
    surname: row.surname,
    role_name: 'legacy',
    school_id: row.school_id,
    school_name: row.school_name,
    user_id: row.id,
    status: row.deactivated_at ? 'revoked' : 'legacy',
    delivery_status: 'not_sent',
    sent_at: null,
    accepted_at: null,
    activated_at: null,
    revoked_at: row.deactivated_at,
    expires_at: null,
    created_at: row.created_at,
    account_state: row.deactivated_at ? 'deactivated' : 'active',
    legacy: true
  })));
  return {
    test_school: { id: school.id, name: school.name, slug: school.slug },
    testers,
    programme
  };
}

async function findInvitation(id) {
  const result = await db.query(
    `SELECT i.*, s.name AS school_name, COALESCE(s.is_test_school, FALSE) AS school_is_test
     FROM tester_invitations i
     LEFT JOIN schools s ON s.id = i.school_id
     WHERE i.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function resendInvitation(id, req) {
  await ready();
  const invitation = await findInvitation(id);
  if (!invitation) throw httpError(404, 'Tester invitation not found.');
  if (invitation.status === 'revoked' || invitation.status === 'activated' || invitation.status === 'accepted') {
    throw httpError(409, 'This invitation is no longer waiting to be sent.');
  }
  const schoolDecision = assertTestSchool({ is_test_school: invitation.school_is_test === true });
  if (!schoolDecision.ok) throw httpError(schoolDecision.status, schoolDecision.error);

  const minted = createInviteToken();
  let sendResult = { success: false };
  try {
    sendResult = await dispatchInvite(invitation, minted.token, req);
  } catch (err) {
    sendResult = { success: false, error: err.message };
  }
  const delivery = resendDelivery(invitation, sendResult);
  if (delivery.email_sent) {
    await storeDelivery(invitation.id, minted.hash, delivery);
  } else if (!delivery.previous_link_kept) {
    await db.query(
      `UPDATE tester_invitations
       SET delivery_status = 'failed', status = 'draft', updated_at = NOW()
       WHERE id = $1`,
      [invitation.id]
    );
  }
  return {
    email_sent: delivery.email_sent === true,
    message: invitationMessage(delivery),
    invitation: await publicInvitation(invitation.id)
  };
}

async function revokeLegacyTester(id) {
  await ready();
  const legacy = await db.query(
    `SELECT id, email, COALESCE(is_superadmin, FALSE) AS is_superadmin, COALESCE(is_tester, FALSE) AS is_tester
     FROM users WHERE id = $1`,
    [id]
  );
  const account = legacy.rows[0];
  if (!account || account.is_tester !== true) throw httpError(404, 'Tester invitation not found.');
  if (account.is_superadmin === true) throw httpError(409, 'The linked account could not be deactivated.');
  await db.query(
    `UPDATE users
     SET deactivated_at = NOW(), active_session_id = NULL
     WHERE id = $1 AND COALESCE(is_tester, FALSE) = TRUE AND COALESCE(is_superadmin, FALSE) = FALSE`,
    [account.id]
  );
  return { message: `The older tester account ${account.email} is deactivated and can no longer sign in.` };
}

async function revokeInvitation(id) {
  await ready();
  const invitation = await findInvitation(id);
  if (!invitation) throw httpError(404, 'Tester invitation not found.');
  await withTransaction(async (client) => {
    await client.query(
      `UPDATE tester_invitations
       SET status = 'revoked',
           revoked_at = NOW(),
           token_hash = NULL,
           expires_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [invitation.id]
    );
    if (invitation.user_id) {
      const revoked = await client.query(
        `UPDATE users
         SET deactivated_at = NOW(),
             active_session_id = NULL,
             is_tester = TRUE
         WHERE id = $1
           AND COALESCE(is_tester, FALSE) = TRUE
           AND COALESCE(is_superadmin, FALSE) = FALSE
         RETURNING id`,
        [invitation.user_id]
      );
      if (revoked.rows.length === 0) {
        const still = await client.query(
          `SELECT COALESCE(is_superadmin, FALSE) AS is_superadmin, COALESCE(is_tester, FALSE) AS is_tester
           FROM users WHERE id = $1`,
          [invitation.user_id]
        );
        if (still.rows[0]) {
          throw httpError(409, 'The linked account could not be deactivated.');
        }
      }
    }
  });
  return {
    message: `Testing access for ${invitation.reference_code} is revoked and the account can no longer sign in.`,
    invitation: await publicInvitation(invitation.id)
  };
}

async function ensureClass(client, schoolId) {
  const preferred = 'TST-10A';
  const owned = await client.query(
    'SELECT id, name FROM classes WHERE name = $1 AND school_id = $2 LIMIT 1',
    [preferred, schoolId]
  );
  if (owned.rows[0]) return owned.rows[0];
  try {
    const inserted = await client.query(
      `INSERT INTO classes (name, grade, stream, school_id)
       VALUES ($1, 10, 'Science', $2)
       RETURNING id, name`,
      [preferred, schoolId]
    );
    return inserted.rows[0];
  } catch (_) {
    const fallback = `TST10A-S${schoolId}`.slice(0, 50);
    const again = await client.query(
      'SELECT id, name FROM classes WHERE name = $1 AND school_id = $2 LIMIT 1',
      [fallback, schoolId]
    );
    if (again.rows[0]) return again.rows[0];
    const inserted = await client.query(
      `INSERT INTO classes (name, grade, stream, school_id)
       VALUES ($1, 10, 'Science', $2)
       RETURNING id, name`,
      [fallback, schoolId]
    );
    return inserted.rows[0];
  }
}

async function provisionAccount(client, user, schoolId, invitationId) {
  const subjects = curriculumService.getSubjectsForGradeAndStream(10, 'Science', 'English');
  const subjectList = Array.isArray(subjects) && subjects.length
    ? subjects
    : ['English FAL', 'Home Language', 'Mathematics', 'Physical Sciences', 'Life Sciences', 'Life Orientation'];
  const course = await ensureClass(client, schoolId);

  if (user.role_name === 'teacher') {
    const staff = await client.query('SELECT school_id FROM employees WHERE user_id = $1', [user.id]);
    if (staff.rows[0] && Number(staff.rows[0].school_id) !== Number(schoolId)) {
      throw httpError(409, 'This tester already has a staff record at another school.');
    }
    const phone = user.phone ? String(user.phone).slice(0, 20) : null;
    await client.query(
      `INSERT INTO employees (
         user_id, full_name, surname, school_id, phone, email, subjects, grades_taught, classes_taught
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, ARRAY[10]::int[], $8::text[])
       ON CONFLICT (user_id) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         surname = EXCLUDED.surname,
         school_id = EXCLUDED.school_id,
         subjects = EXCLUDED.subjects,
         grades_taught = EXCLUDED.grades_taught,
         classes_taught = EXCLUDED.classes_taught,
         email = EXCLUDED.email`,
      [user.id, user.full_name, user.surname, schoolId, phone, user.email, subjectList, [course.name]]
    );
    const pairs = [
      ['Mathematics', 'MATH10S'],
      ['Physical Sciences', 'PHSC10'],
      ['Life Sciences', 'LFSC10']
    ];
    for (const pair of pairs) {
      try {
        await client.query(
          `INSERT INTO teacher_assignments (teacher_id, subject_name, subject_code, grade_level, class_name, class_id)
           VALUES ($1, $2, $3, 10, $4, $5)
           ON CONFLICT ON CONSTRAINT unique_teacher_assignment DO NOTHING`,
          [user.id, pair[0], pair[1], course.name, course.id]
        );
      } catch (err) {
        if (!/unique|duplicate/i.test(err.message || '')) throw err;
      }
    }
  }

  if (user.role_name === 'learner') {
    const learnerNumber = `TST${String(user.id).padStart(6, '0')}`.slice(0, 20);
    const existing = await client.query(
      'SELECT id, school_id, COALESCE(is_test_record, FALSE) AS is_test_record FROM children WHERE learner_user_id = $1 LIMIT 1',
      [user.id]
    );
    if (existing.rows[0]) {
      if (Number(existing.rows[0].school_id) !== Number(schoolId) || existing.rows[0].is_test_record !== true) {
        throw httpError(409, 'This account is already linked to a learner record outside the test school.');
      }
    } else {
      await client.query(
        `INSERT INTO children (
           learner_user_id, full_name, surname, learner_number, grade, class_id, stream,
           subjects, school_id, home_language, is_test_record
         ) VALUES ($1, $2, $3, $4, 10, $5, 'Science', $6, $7, 'English', TRUE)`,
        [user.id, user.full_name, user.surname, learnerNumber, course.id, subjectList, schoolId]
      );
    }
  }

  if (user.role_name === 'parent') {
    const marker = `TCH${String(invitationId).padStart(6, '0')}`.slice(0, 20);
    const existing = await client.query(
      `SELECT id FROM children
       WHERE parent_id = $1 AND school_id = $2 AND COALESCE(is_test_record, FALSE) = TRUE AND learner_number = $3
       LIMIT 1`,
      [user.id, schoolId, marker]
    );
    if (!existing.rows[0]) {
      const child = await client.query(
        `INSERT INTO children (
           full_name, surname, parent_id, learner_number, grade, class_id, stream,
           subjects, school_id, home_language, is_test_record
         ) VALUES ('Test Child', 'Record', $1, $2, 10, $3, 'Science', $4, $5, 'English', TRUE)
         RETURNING id`,
        [user.id, marker, course.id, subjectList, schoolId]
      );
      await client.query(
        `INSERT INTO parent_children (parent_id, child_id, relationship, is_primary)
         VALUES ($1, $2, 'Parent', TRUE)
         ON CONFLICT (parent_id, child_id) DO NOTHING`,
        [user.id, child.rows[0].id]
      );
    }
  }
}

async function acceptInvitation({ token, password, confirm }) {
  await ready();
  if (!token || String(token).length < 20) throw httpError(400, 'This invitation link is not valid or has expired.');
  if (password !== confirm) throw httpError(400, 'The two passwords do not match.');
  const { validatePassword } = require('../controller/authController');
  const passwordError = validatePassword(password);
  if (passwordError) throw httpError(400, passwordError);

  const tokenHash = hashInviteToken(token);
  const passHash = await bcrypt.hash(password, 10);
  const school = await testSchool();

  await withTransaction(async (client) => {
    const found = await client.query(
      `SELECT * FROM tester_invitations WHERE token_hash = $1 LIMIT 1 FOR UPDATE`,
      [tokenHash]
    );
    const invitation = found.rows[0];
    if (!invitation || invitation.status !== 'pending' || !invitation.expires_at || new Date(invitation.expires_at).getTime() < Date.now()) {
      throw httpError(400, 'This invitation link is not valid or has expired.');
    }
    const roleDecision = testerInviteRoleAllowed({
      requestedRole: invitation.role_name,
      targetIsSuperadmin: false
    });
    if (!roleDecision.ok) throw httpError(roleDecision.status, roleDecision.error);
    if (Number(invitation.school_id) !== Number(school.id)) {
      throw httpError(403, 'Testers can only be placed in the Geleza SA test school.');
    }

    const account = await loadAccount(invitation.email);
    const accountDecision = existingAccountInviteAllowed({
      exists: Boolean(account),
      isTester: account ? account.is_tester === true : false,
      isSuperadmin: account ? account.is_superadmin === true : false,
      schoolIsTest: account ? account.school_is_test === true : false
    });
    if (!accountDecision.ok) throw httpError(accountDecision.status, accountDecision.error);

    const resolvedRoleId = await roleId(client, roleDecision.role);
    let userId = account ? account.id : null;
    if (userId) {
      const updated = await client.query(
        `UPDATE users
         SET password_hash = $1,
             role_id = $2,
             school_id = $3,
             is_tester = TRUE,
             is_superadmin = FALSE,
             deactivated_at = NULL,
             active_session_id = NULL,
             full_name = $4,
             surname = $5,
             phone = COALESCE($6, phone)
         WHERE id = $7
           AND COALESCE(is_tester, FALSE) = TRUE
           AND COALESCE(is_superadmin, FALSE) = FALSE
         RETURNING id`,
        [passHash, resolvedRoleId, school.id, invitation.full_name, invitation.surname, invitation.phone, userId]
      );
      if (!updated.rows[0]) throw httpError(409, 'This invitation cannot activate that account.');
    } else {
      const inserted = await client.query(
        `INSERT INTO users (
           email, password_hash, role_id, school_id, is_superadmin, is_tester,
           full_name, surname, phone, country, deactivated_at
         ) VALUES ($1, $2, $3, $4, FALSE, TRUE, $5, $6, $7, 'South Africa', NULL)
         RETURNING id`,
        [invitation.email, passHash, resolvedRoleId, school.id, invitation.full_name, invitation.surname, invitation.phone]
      );
      userId = inserted.rows[0].id;
    }

    await provisionAccount(client, {
      id: userId,
      role_name: roleDecision.role,
      full_name: invitation.full_name,
      surname: invitation.surname,
      phone: invitation.phone,
      email: invitation.email
    }, school.id, invitation.id);

    await client.query(
      `UPDATE tester_invitations
       SET status = 'activated',
           user_id = $2,
           accepted_at = NOW(),
           activated_at = NOW(),
           token_hash = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [invitation.id, userId]
    );
  });

  return {
    success: true,
    message: 'Your tester account is ready. Sign in with your email and the password you just created.'
  };
}

async function verifyInvitation(token) {
  await ready();
  if (!token) return { valid: false };
  const found = await db.query(
    `SELECT i.reference_code, i.role_name, i.email, i.expires_at, i.status, s.name AS school_name
     FROM tester_invitations i
     LEFT JOIN schools s ON s.id = i.school_id
     WHERE i.token_hash = $1
     LIMIT 1`,
    [hashInviteToken(token)]
  );
  const row = found.rows[0];
  if (!row || row.status !== 'pending' || !row.expires_at || new Date(row.expires_at).getTime() < Date.now()) {
    return { valid: false };
  }
  return {
    valid: true,
    reference_code: row.reference_code,
    role_name: row.role_name,
    school_name: row.school_name,
    email: row.email,
    expires_at: row.expires_at
  };
}

async function updateInvitationRole(id, role) {
  await ready();
  const invitation = await findInvitation(id);
  if (!invitation) throw httpError(404, 'Tester invitation not found.');
  const current = invitation.user_id
    ? await db.query('SELECT COALESCE(is_superadmin, FALSE) AS is_superadmin FROM users WHERE id = $1', [invitation.user_id])
    : { rows: [{ is_superadmin: false }] };
  const decision = testerInviteRoleAllowed({
    requestedRole: role,
    targetIsSuperadmin: current.rows[0] ? current.rows[0].is_superadmin === true : false
  });
  if (!decision.ok) throw httpError(decision.status, decision.error);
  if (invitation.status === 'revoked') throw httpError(409, 'A revoked invitation cannot change role.');
  const school = await testSchool();
  if (Number(invitation.school_id) !== Number(school.id)) {
    throw httpError(403, 'Testers can only be placed in the Geleza SA test school.');
  }

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE tester_invitations SET role_name = $1, updated_at = NOW() WHERE id = $2`,
      [decision.role, invitation.id]
    );
    if (invitation.user_id && invitation.status === 'activated') {
      const resolvedRoleId = await roleId(client, decision.role);
      const updated = await client.query(
        `UPDATE users
         SET role_id = $1
         WHERE id = $2 AND COALESCE(is_tester, FALSE) = TRUE AND COALESCE(is_superadmin, FALSE) = FALSE
         RETURNING id, full_name, surname, phone, email`,
        [resolvedRoleId, invitation.user_id]
      );
      if (!updated.rows[0]) throw httpError(404, 'Tester account not found.');
      await provisionAccount(client, {
        ...updated.rows[0],
        role_name: decision.role
      }, school.id, invitation.id);
    }
  });
  return {
    message: `Tester role updated to ${decision.role}.`,
    invitation: await publicInvitation(invitation.id)
  };
}

async function loadTester(userId) {
  const result = await db.query(
    `SELECT u.id, LOWER(COALESCE(r.name, '')) AS role, COALESCE(u.is_tester, FALSE) AS is_tester,
            u.school_id, COALESCE(s.is_test_school, FALSE) AS school_is_test
     FROM users u
     LEFT JOIN roles r ON (u.role_id::text = r.id::text OR LOWER(r.name) = LOWER(u.role_id::text))
     LEFT JOIN schools s ON s.id = u.school_id
     WHERE u.id::text = $1::text
     LIMIT 1`,
    [String(userId)]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    role: row.role,
    is_tester: row.is_tester === true,
    school_id: row.school_id,
    school_is_test: row.school_is_test === true
  };
}

async function createReport(userId, body) {
  await ready();
  const tester = await loadTester(userId);
  const decision = validateTesterReport(body, tester);
  if (!decision.ok) throw httpError(decision.status, decision.error);
  if (!tester.school_is_test) throw httpError(403, 'Testing reports can only be filed from the test school.');
  const saved = await withTransaction(async (client) => {
    const code = await insertReference(client, 'tester_reports');
    const invite = await client.query(
      `SELECT id FROM tester_invitations WHERE user_id = $1 ORDER BY id DESC LIMIT 1`,
      [tester.id]
    );
    const inserted = await client.query(
      `INSERT INTO tester_reports (
         reference_code, tester_user_id, invitation_id, role_name, dashboard, module, kind,
         result, severity, status, description, steps_to_reproduce, expected_behaviour,
         actual_behaviour, screenshot_data
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING id, reference_code, role_name, dashboard, module, kind, result, severity, status, created_at`,
      [
        code,
        tester.id,
        invite.rows[0] ? invite.rows[0].id : null,
        decision.value.role_name,
        decision.value.dashboard,
        decision.value.module,
        decision.value.kind,
        decision.value.result,
        decision.value.severity,
        decision.value.status,
        decision.value.description,
        decision.value.steps_to_reproduce,
        decision.value.expected_behaviour,
        decision.value.actual_behaviour,
        decision.value.screenshot_data
      ]
    );
    return inserted.rows[0];
  });
  return { success: true, report: saved, message: `Report ${saved.reference_code} was recorded.` };
}

function likeTerm(value, max) {
  return `%${String(value || '').trim().slice(0, max).replace(/[\\%_]/g, '\\$&')}%`;
}

function reportFilters(query) {
  const clauses = [];
  const params = [];
  const add = (sql, value) => {
    params.push(value);
    clauses.push(sql.replace('$?', `$${params.length}`));
  };
  if (query.role) add('role_name = $?', String(query.role).trim().toLowerCase());
  if (query.dashboard) add(`dashboard ILIKE $? ESCAPE '\\'`, likeTerm(query.dashboard, 80));
  if (query.module) add(`module ILIKE $? ESCAPE '\\'`, likeTerm(query.module, 120));
  if (query.status) add('status = $?', String(query.status).trim().toLowerCase());
  if (query.severity) add('severity = $?', String(query.severity).trim().toLowerCase());
  if (query.from) add('created_at >= $?::timestamptz', String(query.from));
  if (query.to) add(`created_at < ($?::date + INTERVAL '1 day')`, String(query.to));
  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

async function listReports(query) {
  await ready();
  const filters = reportFilters(query || {});
  const result = await db.query(
    `SELECT id, reference_code, tester_user_id, role_name, dashboard, module, kind, result,
            severity, status, description, steps_to_reproduce, expected_behaviour, actual_behaviour,
            admin_note, created_at, updated_at,
            (screenshot_data IS NOT NULL) AS has_screenshot
     FROM tester_reports
     ${filters.where}
     ORDER BY created_at DESC
     LIMIT 300`,
    filters.params
  );
  return result.rows;
}

async function listOwnReports(userId) {
  await ready();
  const tester = await loadTester(userId);
  if (!tester || tester.is_tester !== true) throw httpError(403, 'Only a tester account can view its testing reports.');
  const result = await db.query(
    `SELECT id, reference_code, role_name, dashboard, module, kind, result, severity, status,
            description, steps_to_reproduce, expected_behaviour, actual_behaviour, admin_note,
            created_at, updated_at, (screenshot_data IS NOT NULL) AS has_screenshot
     FROM tester_reports
     WHERE tester_user_id = $1
     ORDER BY created_at DESC
     LIMIT 100`,
    [tester.id]
  );
  return result.rows;
}

async function updateReport(id, body, adminId) {
  await ready();
  const status = String(body.status || '').trim().toLowerCase();
  if (!reportStatusAllowed(status)) throw httpError(400, 'That report status is not available.');
  const note = String(body.admin_note || '').replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 2000) || null;
  const updated = await db.query(
    `UPDATE tester_reports
     SET status = $1, admin_note = COALESCE($2, admin_note), updated_by = $3, updated_at = NOW()
     WHERE id = $4 AND kind = 'issue'
     RETURNING id, reference_code, status, admin_note, updated_at`,
    [status, note, adminId || null, id]
  );
  if (!updated.rows[0]) throw httpError(404, 'Testing issue not found.');
  return updated.rows[0];
}

module.exports = {
  acceptInvitation,
  createInvitation,
  createReport,
  listOwnReports,
  listProgramme,
  listReports,
  resendInvitation,
  revokeInvitation,
  revokeLegacyTester,
  updateInvitationRole,
  updateReport,
  verifyInvitation
};
