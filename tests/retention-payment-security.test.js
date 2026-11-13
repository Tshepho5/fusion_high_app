/**
 * Retention dry-run, payment verification, invitation queue, and class quarantine.
 * Probe rows are removed afterward. Existing schools, users, and classes are not deleted.
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const db = require('../db/db');
const { withTransaction } = require('../db/transaction');
const { migrateSchoolOnboardingAndCleanRoster } = require('../db/migrate_school_onboarding_and_clean_roster');
const schoolRetention = require('../public/src/services/schoolRetention');
const paymentAccess = require('../public/src/services/paymentAccess');
const emailService = require('../public/src/services/emailService');
const principalActivation = require('../public/src/services/principalActivation');
const activationController = require('../public/src/controller/principalActivationController');
const applicationController = require('../public/src/controller/applicationController');
const schoolController = require('../public/src/controller/schoolController');

const PROBE_EMIS = ['998000321', '998000322', '998000323', '998000324', '998000325', '998000326', '998000327', '998000328'];
const PROBE_EMAILS = PROBE_EMIS.map((emis) => `geleza-retention-${emis}@example.com`);
const PAYMENT_EMAIL = 'geleza-payment-probe@example.com';
const PRINCIPAL_EMAIL = 'geleza-invite-probe@example.com';

function mockRes() {
  const res = { statusCode: 200, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (payload) => { res.body = payload; return res; };
  return res;
}

async function insertSchoolApplication(emis, status, extra) {
  const email = `geleza-retention-${emis}@example.com`;
  const result = await db.query(`
    INSERT INTO school_applications (
      application_number, status, school_name, emis_number, province, district,
      physical_address, contact_email, contact_phone,
      principal_first_name, principal_surname, principal_id_number,
      principal_email, principal_phone, declined_reason, reviewed_by, reviewed_at,
      created_at, updated_at, last_activity_at, withdrawn_at,
      legal_hold, investigation_hold, privacy_request_open
    ) VALUES (
      $1, $2, $3, $4, 'Limpopo', 'Capricorn South',
      'Probe address', $5, '0151234567',
      'Probe', 'Principal', '8001015009087',
      $5, '0821234567', $6, $7, $8,
      $9, $10, $11, $12,
      $13, FALSE, $14
    ) RETURNING id
  `, [
    `GSA-RET-${emis}`,
    status,
    `Retention Probe ${emis}`,
    emis,
    email,
    extra.reason || null,
    extra.reviewer || null,
    extra.reviewedAt || null,
    extra.createdAt,
    extra.updatedAt || extra.createdAt,
    extra.activityAt || extra.updatedAt || extra.createdAt,
    extra.withdrawnAt || null,
    extra.legalHold === true,
    extra.privacy === true
  ]);
  return result.rows[0].id;
}

async function cleanup() {
  await db.query('DELETE FROM application_payments WHERE payer_email = $1', [PAYMENT_EMAIL]);
  await db.query('DELETE FROM application_payment_grants WHERE application_id IN (SELECT id FROM applications WHERE primary_parent_email = $1)', [PAYMENT_EMAIL]);
  await db.query('DELETE FROM applications WHERE primary_parent_email = $1', [PAYMENT_EMAIL]);
  await db.query('DELETE FROM sensitive_email_queue WHERE recipient_hash = $1', [paymentAccess.hashValue(PRINCIPAL_EMAIL)]);
  await db.query('DELETE FROM users WHERE email = ANY($1::text[])', [[...PROBE_EMAILS, PRINCIPAL_EMAIL]]);
  const schools = await db.query('SELECT id FROM schools WHERE emis_number = $1', ['998000320']);
  if (schools.rows.length) {
    await db.query('DELETE FROM classes WHERE school_id = $1', [schools.rows[0].id]);
    await db.query('DELETE FROM schools WHERE id = $1', [schools.rows[0].id]);
  }
  await db.query('DELETE FROM school_applications WHERE emis_number = ANY($1::text[])', [PROBE_EMIS]);
}

describe('retention, payment access, invitation queue, and class quarantine', () => {
  before(async () => {
    await migrateSchoolOnboardingAndCleanRoster();
    await cleanup();
  });

  after(async () => {
    await cleanup();
    const left = await db.query(`
      SELECT
        (SELECT COUNT(*)::int FROM school_applications WHERE emis_number = ANY($1::text[])) AS applications,
        (SELECT COUNT(*)::int FROM users WHERE email = ANY($2::text[])) AS users,
        (SELECT COUNT(*)::int FROM schools WHERE emis_number = '998000320') AS schools
    `, [PROBE_EMIS, [...PROBE_EMAILS, PRINCIPAL_EMAIL]]);
    assert.equal(left.rows[0].applications, 0);
    assert.equal(left.rows[0].users, 0);
    assert.equal(left.rows[0].schools, 0);
    await db.pool.end();
  });

  it('reports retention actions without changing records, and blocks held applications', async () => {
    const reviewer = await db.query('SELECT id FROM users WHERE is_superadmin = TRUE ORDER BY id LIMIT 1');
    const reviewerId = reviewer.rows[0] ? reviewer.rows[0].id : null;
    const old = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000);
    const declinedAt = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000);
    const recent = new Date();
    await insertSchoolApplication('998000321', 'under_review', { createdAt: old, updatedAt: new Date(old.getTime() + 86400000), activityAt: old });
    await insertSchoolApplication('998000322', 'pending_review', { createdAt: old, updatedAt: old, activityAt: old });
    await insertSchoolApplication('998000323', 'declined', { createdAt: declinedAt, reviewedAt: declinedAt, reviewer: reviewerId, reason: 'EMIS could not be matched' });
    await insertSchoolApplication('998000324', 'approved', { createdAt: old, reviewedAt: old, reviewer: reviewerId });
    await insertSchoolApplication('998000325', 'withdrawn', { createdAt: old, withdrawnAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000) });
    await insertSchoolApplication('998000326', 'declined', { createdAt: declinedAt, reviewedAt: declinedAt, reviewer: reviewerId, reason: 'Contact 0821234567 and probe@example.com', legalHold: true });
    await insertSchoolApplication('998000327', 'pending_review', { createdAt: old, updatedAt: old, privacy: true });
    await db.query(
      `INSERT INTO users (email, password_hash, password_set_at, is_superadmin, full_name, surname)
       VALUES ($1, 'hash', $2, FALSE, 'Probe', 'Principal')`,
      [PROBE_EMAILS[3], new Date(Date.now() - 100 * 24 * 60 * 60 * 1000)]
    );
    const before = await db.query('SELECT principal_id_number, principal_email FROM school_applications WHERE emis_number = $1', ['998000323']);
    const inventoryBefore = await db.query(`
      SELECT
        (SELECT COUNT(*)::int FROM schools) AS schools,
        (SELECT COUNT(*)::int FROM users) AS users,
        (SELECT COUNT(*)::int FROM classes) AS classes
    `);
    const report = await schoolRetention.dryRun(db);
    const after = await db.query('SELECT principal_id_number, principal_email FROM school_applications WHERE emis_number = $1', ['998000323']);
    const inventoryAfter = await db.query(`
      SELECT
        (SELECT COUNT(*)::int FROM schools) AS schools,
        (SELECT COUNT(*)::int FROM users) AS users,
        (SELECT COUNT(*)::int FROM classes) AS classes
    `);
    assert.deepEqual(after.rows[0], before.rows[0]);
    assert.equal(report.dry_run, true);
    assert.equal(report.records_changed, false);
    assert.equal(report.automatic_actions_enabled, false);
    assert.equal(report.deletion_scheduled, false);
    assert.deepEqual(inventoryAfter.rows[0], inventoryBefore.rows[0]);
    assert.equal(report.policy_note.includes('not statutory POPIA deadlines'), true);
    assert.deepEqual(report.operational_records_excluded, ['schools', 'users', 'employees', 'classes']);
    assert.throws(() => schoolRetention.runRetentionActions(), /Automatic retention is disabled/);
    const pendingAccount = await db.query(`
      SELECT COUNT(*)::int AS total
      FROM users u
      JOIN school_applications a ON LOWER(u.email) = LOWER(a.principal_email)
      WHERE a.emis_number = '998000321'
    `);
    assert.equal(pendingAccount.rows[0].total, 0);
    const denied = mockRes();
    await schoolController.reviewSchoolApplication({
      params: { id: '1' },
      body: { decision: 'approve' },
      user: { id: reviewerId, is_superadmin: false }
    }, denied);
    assert.equal(denied.statusCode, 403);
    const approvedAction = report.qualifying.find((row) => row.emis_number === '998000324');
    assert.equal(approvedAction.action, 'remove_duplicate_sensitive_application_fields');
    assert.deepEqual(approvedAction.preserves, ['schools', 'users', 'employees', 'classes']);
    const byEmis = Object.fromEntries(report.qualifying.map((row) => [row.emis_number, row.rule]));
    assert.equal(byEmis['998000321'], 'pending');
    assert.equal(byEmis['998000322'], 'abandoned');
    assert.equal(byEmis['998000323'], 'declined');
    assert.equal(byEmis['998000324'], 'approved');
    assert.equal(byEmis['998000325'], 'withdrawn');
    assert.equal(byEmis['998000326'], undefined);
    assert.equal(byEmis['998000327'], undefined);
    const held = report.blocked.map((row) => row.emis_number).sort();
    assert.deepEqual(held, ['998000326', '998000327']);
    const declined = report.qualifying.find((row) => row.emis_number === '998000323');
    assert.equal(JSON.stringify(declined).includes('8001015009087'), false);
    assert.equal(JSON.stringify(declined).includes('@example.com'), false);
    const heldReason = report.qualifying.find((row) => row.emis_number === '998000326');
    assert.equal(heldReason, undefined);
    const recentReport = schoolRetention.classify({
      status: 'pending_review',
      created_at: recent,
      updated_at: recent,
      last_activity_at: recent,
      legal_hold: false,
      investigation_hold: false,
      privacy_request_open: false
    }, report.periods.pending_days ? { pending_days: 90, abandoned_days: 90, declined_months: 12, approved_after_activation_days: 90, withdrawn_days: 30 } : {}, new Date());
    assert.equal(recentReport.qualifies, false);
    const investigation = schoolRetention.classify({
      status: 'declined',
      reviewed_at: declinedAt,
      legal_hold: false,
      investigation_hold: true,
      privacy_request_open: false
    }, { pending_days: 90, abandoned_days: 90, declined_months: 12, approved_after_activation_days: 90, withdrawn_days: 30 }, new Date());
    assert.equal(investigation.blocked, true);
    assert.deepEqual(investigation.holds, ['investigation_hold']);
    console.log(JSON.stringify({
      retentionDryRun: report.counts,
      automaticActionsEnabled: report.automatic_actions_enabled
    }));
  });

  it('returns full payment details only after the resume token and verification code match', async () => {
    emailService.send = async () => ({ success: true });
    const school = await db.query(`
      INSERT INTO schools (name, slug, emis_number, province, district, physical_address, contact_email, contact_phone, principal_name,
        bank_name, account_holder, account_number, branch_code, account_type)
      VALUES ('Payment Probe School', $1, '998000320', 'Limpopo', 'Capricorn South', 'Probe address', $2, '0151234567', 'Probe Principal',
        'Example Bank', 'Probe School', '1234567890', '250655', 'Cheque')
      RETURNING id
    `, [`payment-probe-${Date.now()}`, PAYMENT_EMAIL]);
    const token = `resume-probe-${Date.now()}`;
    const application = await db.query(`
      INSERT INTO applications (
        application_number, correction_token, status, first_name, surname, id_number, physical_address, grade_applied,
        primary_parent_name, primary_parent_surname, primary_parent_relationship, primary_parent_id_number,
        primary_parent_phone, primary_parent_email, primary_parent_address, school_id
      ) VALUES (
        $1, $2, 'approved', 'Learner', 'Probe', '8001015009087', 'Probe address', 8,
        'Parent', 'Probe', 'Mother', '8001015009087', '0821234567', $3, 'Probe address', $4
      ) RETURNING id
    `, [`APP-PROBE-${Date.now()}`, token, PAYMENT_EMAIL, school.rows[0].id]);

    const missing = await paymentAccess.requestCode({ token: '', suppliedEmail: PAYMENT_EMAIL });
    assert.equal(missing.ok, false);
    const invalid = await paymentAccess.requestCode({ token: 'not-a-real-resume-token' });
    assert.equal(invalid.status, 400);
    const wrongEmail = await paymentAccess.requestCode({ token, suppliedEmail: 'other@example.com' });
    assert.equal(wrongEmail.status, 400);
    assert.equal(wrongEmail.error.includes('does not match'), true);
    const started = await paymentAccess.requestCode({ token, channel: 'email', suppliedEmail: PAYMENT_EMAIL });
    assert.equal(started.ok, true);
    assert.equal(started.body.payment_access, undefined);
    await db.query('UPDATE application_payment_grants SET otp_expires_at = NOW() - INTERVAL \'1 hour\' WHERE application_id = $1', [application.rows[0].id]);
    const expired = await paymentAccess.confirmCode({ token, code: started.code });
    assert.equal(expired.code, 'verification_expired');
    const again = await paymentAccess.requestCode({ token, channel: 'email' });
    const wrongCode = await paymentAccess.confirmCode({ token, code: '000000' });
    assert.equal(wrongCode.ok, false);
    const confirmed = await paymentAccess.confirmCode({ token, code: again.code });
    assert.equal(confirmed.ok, true);
    const pay = mockRes();
    await applicationController.payApplicationFee({
      params: { id: String(application.rows[0].id) },
      body: { resume_token: token, payment_access: confirmed.body.payment_access, payment_method: 'eft' },
      get: () => ''
    }, pay);
    assert.equal(pay.statusCode, 202);
    assert.equal(pay.body.banking_details.account_number, '1234567890');
    const hidden = mockRes();
    await applicationController.payApplicationFee({
      params: { id: String(application.rows[0].id) },
      body: { payment_method: 'eft' },
      get: () => ''
    }, hidden);
    assert.equal(hidden.body.banking_details.account_number, undefined);
    assert.equal(hidden.body.banking_details.has_bank_account, true);
    const resume = mockRes();
    await applicationController.getApplicationByToken({
      params: { token },
      query: {},
      get: () => ''
    }, resume);
    assert.equal(resume.body.banking_details.account_number, undefined);
    await db.query(`UPDATE schools SET account_number = '62849102841', account_holder = NULL WHERE id = $1`, [school.rows[0].id]);
    const placeholder = mockRes();
    await applicationController.payApplicationFee({
      params: { id: String(application.rows[0].id) },
      body: { resume_token: token, payment_access: confirmed.body.payment_access, payment_method: 'eft' },
      get: () => ''
    }, placeholder);
    assert.equal(JSON.stringify(placeholder.body.banking_details).includes('62849102841'), false);
    assert.equal(placeholder.body.banking_details.has_bank_account, false);
  });

  it('removes delivered and expired invitation content and invalidates the previous token', async () => {
    const raw = 'Open http://localhost:3000/activate?token=abcDEF1234567890xyz_- to continue';
    const redacted = emailService.redactInvitation(raw);
    assert.equal(redacted.includes('abcDEF1234567890xyz'), false);
    const hash = paymentAccess.hashValue(PRINCIPAL_EMAIL);
    await db.query(
      `INSERT INTO sensitive_email_queue (kind, recipient_hash, body, expires_at)
       VALUES ('principal_invitation', $1, $2, NOW() - INTERVAL '1 hour')`,
      [hash, raw]
    );
    await emailService.purgeExpiredInvitationMail();
    const expired = await db.query('SELECT id FROM sensitive_email_queue WHERE recipient_hash = $1', [hash]);
    assert.equal(expired.rows.length, 0);
    await db.query(
      `INSERT INTO sensitive_email_queue (kind, recipient_hash, body, expires_at)
       VALUES ('principal_invitation', $1, $2, NOW() + INTERVAL '2 hours')`,
      [hash, raw]
    );
    await emailService.forgetDeliveredInvitation(PRINCIPAL_EMAIL);
    const delivered = await db.query('SELECT body, delivered_at FROM sensitive_email_queue WHERE recipient_hash = $1', [hash]);
    assert.equal(delivered.rows[0].body, null);
    assert.ok(delivered.rows[0].delivered_at);

    const school = await db.query('SELECT id FROM schools WHERE emis_number = $1', ['998000320']);
    await db.query(
      `INSERT INTO users (email, is_superadmin, full_name, surname, school_id)
       VALUES ($1, FALSE, 'Invite', 'Probe', $2)`,
      [PRINCIPAL_EMAIL, school.rows[0].id]
    );
    const user = await db.query('SELECT id FROM users WHERE email = $1', [PRINCIPAL_EMAIL]);
    const first = await principalActivation.issue(db, user.rows[0].id);
    const lifetime = await db.query('SELECT EXTRACT(EPOCH FROM (activation_expires_at - NOW())) / 3600 AS hours FROM users WHERE id = $1', [user.rows[0].id]);
    assert.ok(Number(lifetime.rows[0].hours) > 71 && Number(lifetime.rows[0].hours) <= 72);
    await db.query('UPDATE users SET activation_expires_at = NOW() - INTERVAL \'1 hour\' WHERE id = $1', [user.rows[0].id]);
    const expiredActivation = mockRes();
    await activationController.activate({ body: { token: first, password: 'Invite-Probe-2026!', confirm_password: 'Invite-Probe-2026!' } }, expiredActivation);
    assert.equal(expiredActivation.body.code, 'activation_expired');
    const second = await principalActivation.issue(db, user.rows[0].id);
    assert.notEqual(first, second);
    const oldToken = mockRes();
    await activationController.activate({ body: { token: first, password: 'Invite-Probe-2026!', confirm_password: 'Invite-Probe-2026!' } }, oldToken);
    assert.equal(oldToken.statusCode, 400);
    const current = mockRes();
    await activationController.activate({ body: { token: second, password: 'Invite-Probe-2026!', confirm_password: 'Invite-Probe-2026!' } }, current);
    assert.equal(current.statusCode, 200);
    const reuse = mockRes();
    await activationController.activate({ body: { token: second, password: 'Other-Invite-2026!', confirm_password: 'Other-Invite-2026!' } }, reuse);
    assert.equal(reuse.statusCode, 400);
    const principal = await db.query('SELECT is_superadmin, password_set_at FROM users WHERE email = $1', [PRINCIPAL_EMAIL]);
    assert.equal(principal.rows[0].is_superadmin, false);
    assert.ok(principal.rows[0].password_set_at);
  });

  it('withdraws a pending application and keeps the personal record until retention is approved', async () => {
    const reviewer = await db.query('SELECT id FROM users WHERE is_superadmin = TRUE ORDER BY id LIMIT 1');
    const id = await insertSchoolApplication('998000328', 'pending_review', { createdAt: new Date(), reviewer: reviewer.rows[0]?.id || null });
    const res = mockRes();
    await schoolController.reviewSchoolApplication({
      params: { id: String(id) },
      body: { decision: 'withdraw', reason: 'The applicant asked to withdraw.' },
      headers: {},
      user: { id: reviewer.rows[0]?.id || null, is_superadmin: true }
    }, res);
    assert.equal(res.statusCode, 200, res.body && res.body.error);
    const row = await db.query('SELECT status, principal_id_number, withdrawn_at FROM school_applications WHERE id = $1', [id]);
    assert.equal(row.rows[0].status, 'withdrawn');
    assert.equal(row.rows[0].principal_id_number, '8001015009087');
    assert.ok(row.rows[0].withdrawn_at);
  });

  it('keeps bank account numbers and verification secrets out of parent emails and mail copies', async () => {
    const bankDetails = {
      bank_name: 'Example Bank',
      account_holder: 'Probe School',
      account_number: '1234567890',
      branch_code: '250655',
      account_type: 'Cheque'
    };
    const received = emailService.templates.applicationReceivedWithBanking({
      parentName: 'Parent Probe',
      learnerName: 'Learner Probe',
      grade: 8,
      stream: 'General',
      homeLanguage: 'English',
      schoolName: 'Payment Probe School',
      applicationNumber: 'APP-PROBE',
      feeAmount: 250,
      dueDateStr: '1 January 2027',
      bankDetails,
      paymentUrl: 'http://localhost:3000/application.html?resume=secret-resume-token'
    });
    const reminder = emailService.templates.applicationFeeReminder({
      parentName: 'Parent Probe',
      learnerName: 'Learner Probe',
      schoolName: 'Payment Probe School',
      applicationNumber: 'APP-PROBE',
      feeAmount: 250,
      dueDateStr: '1 January 2027',
      bankDetails,
      paymentUrl: 'http://localhost:3000/application.html?resume=secret-resume-token'
    });
    const combined = `${received.subject}\n${received.body}\n${reminder.subject}\n${reminder.body}`;
    assert.equal(combined.includes('1234567890'), false);
    assert.equal(combined.includes('250655'), false);
    assert.equal(combined.includes('Example Bank'), false);
    assert.equal(received.body.includes('resume=secret-resume-token'), true);
    assert.equal(received.body.includes('verification code'), true);
    const redacted = emailService.redactSensitiveMail(`${received.body}\nID 8001015009087\nverification code is 123456\nhttp://localhost:3000/activate?token=INVITESECRET`);
    assert.equal(redacted.includes('secret-resume-token'), false);
    assert.equal(redacted.includes('8001015009087'), false);
    assert.equal(redacted.includes('123456'), false);
    assert.equal(redacted.includes('INVITESECRET'), false);
    const policy = await db.query('SELECT automatic_actions_enabled FROM retention_policy WHERE id = 1');
    assert.equal(policy.rows[0].automatic_actions_enabled, false);
  });

  it('keeps the eleven unidentified classes quarantined and rejects a new class with no school', async () => {
    const classes = await db.query(`
      SELECT c.id, c.name, c.grade, c.stream, c.school_id,
             c.assigned_teacher_id IS NOT NULL AS has_teacher,
             c.homeroom_teacher_id IS NOT NULL AS has_homeroom,
             c.ownership_quarantine
      FROM classes c
      WHERE c.school_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM schools s WHERE s.id = c.school_id)
      ORDER BY c.id
    `);
    const schoolOne = await db.query('SELECT id FROM schools WHERE id = 1');
    const applicationsForSchoolOne = await db.query('SELECT COUNT(*)::int AS total FROM school_applications WHERE created_school_id = 1');
    const fk = await db.query(`SELECT convalidated, pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'classes_school_id_fkey'`);
    assert.equal(classes.rows.length, 11);
    assert.equal(classes.rows.every((row) => row.school_id === 1 && row.ownership_quarantine === true), true);
    assert.equal(schoolOne.rows.length, 0);
    assert.equal(applicationsForSchoolOne.rows[0].total, 0);
    assert.equal(fk.rows[0].convalidated, false);
    assert.match(fk.rows[0].def, /NOT VALID/);
    const attachedToARealSchool = await db.query(`
      SELECT COUNT(*)::int AS total
      FROM classes c
      WHERE c.ownership_quarantine = TRUE
        AND EXISTS (SELECT 1 FROM schools s WHERE s.id = c.school_id)
    `);
    assert.equal(attachedToARealSchool.rows[0].total, 0);
    const schools = await db.query('SELECT id FROM schools ORDER BY id LIMIT 2');
    if (schools.rows.length === 2) {
      const shared = await db.query(`
        SELECT COUNT(*)::int AS total
        FROM classes a
        JOIN classes b ON a.id = b.id
        WHERE a.school_id = $1 AND b.school_id = $2
      `, [schools.rows[0].id, schools.rows[1].id]);
      assert.equal(shared.rows[0].total, 0);
      const visibleToFirstSchool = await db.query(
        'SELECT COUNT(*)::int AS total FROM classes WHERE school_id = $1 AND ownership_quarantine = TRUE',
        [schools.rows[0].id]
      );
      assert.equal(visibleToFirstSchool.rows[0].total, 0);
    }
    const before = await db.query('SELECT COUNT(*)::int AS total FROM classes');
    await assert.rejects(() => withTransaction(async (client) => {
      await client.query(`INSERT INTO classes (name, grade, stream, school_id) VALUES ('Quarantine Probe', 8, 'General', 999999999)`);
      throw new Error('The class insert should have been rejected.');
    }));
    const after = await db.query('SELECT COUNT(*)::int AS total FROM classes');
    assert.equal(after.rows[0].total, before.rows[0].total);
    const backupDir = path.join(process.cwd(), 'backups');
    console.log(JSON.stringify({
      orphanClasses: classes.rows.map((row) => ({
        id: row.id,
        name: row.name,
        grade: row.grade,
        stream: row.stream,
        school_id: row.school_id,
        has_teacher: row.has_teacher,
        has_homeroom: row.has_homeroom
      })),
      schoolIdOneExists: false,
      schoolApplicationsForSchoolOne: 0,
      backupDirectoryPresent: fs.existsSync(backupDir),
      foreignKeyValidated: false
    }));
  });
});
