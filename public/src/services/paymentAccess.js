const crypto = require('crypto');
const db = require('../../../db/db');
const emailService = require('./emailService');

const OTP_MINUTES = 10;
const ACCESS_MINUTES = 30;
const MAX_ATTEMPTS = 5;

function hashValue(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function maskEmail(email) {
  const [name, host] = String(email || '').split('@');
  if (!host) return 'the registered email address';
  return `${name.slice(0, 1)}***@${host}`;
}

function digits(value) {
  return String(value || '').replace(/\D/g, '');
}

async function findApplication(token) {
  if (!token || String(token).length < 8 || String(token).length > 80) return null;
  const result = await db.query(
    `SELECT id, application_number, school_id, correction_token,
            primary_parent_email, primary_parent_phone
     FROM applications
     WHERE correction_token = $1`,
    [String(token)]
  );
  return result.rows[0] || null;
}

async function requestCode({ token, channel, suppliedEmail, suppliedPhone }) {
  const application = await findApplication(token);
  if (!application) {
    return { ok: false, status: 400, error: 'This application link is not valid.' };
  }
  const registeredEmail = String(application.primary_parent_email || '').trim().toLowerCase();
  const registeredPhone = digits(application.primary_parent_phone);
  if (suppliedEmail && String(suppliedEmail).trim().toLowerCase() !== registeredEmail) {
    return { ok: false, status: 400, error: 'That email does not match the contact on this application.' };
  }
  if (suppliedPhone && digits(suppliedPhone) !== registeredPhone) {
    return { ok: false, status: 400, error: 'That phone number does not match the contact on this application.' };
  }
  if (!registeredEmail) {
    return { ok: false, status: 409, error: 'This application has no registered email address for verification.' };
  }
  const code = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
  await db.query(`
    INSERT INTO application_payment_grants (application_id, otp_hash, otp_expires_at, otp_attempts, access_hash, access_expires_at, updated_at)
    VALUES ($1, $2, NOW() + ($3::int * INTERVAL '1 minute'), 0, NULL, NULL, NOW())
    ON CONFLICT (application_id) DO UPDATE
      SET otp_hash = EXCLUDED.otp_hash,
          otp_expires_at = EXCLUDED.otp_expires_at,
          otp_attempts = 0,
          access_hash = NULL,
          access_expires_at = NULL,
          updated_at = NOW()
  `, [application.id, hashValue(code), OTP_MINUTES]);
  emailService.send(
    registeredEmail,
    'Geleza SA payment verification code',
    `<p>Your payment verification code is <strong>${code}</strong>. It expires in ${OTP_MINUTES} minutes.</p>`,
    null,
    `Your payment verification code is ${code}. It expires in ${OTP_MINUTES} minutes.`
  ).catch(() => {});
  return {
    ok: true,
    status: 200,
    body: {
      success: true,
      message: `A verification code was sent to ${maskEmail(registeredEmail)}.`,
      channel: channel === 'phone' ? 'phone_checked_code_sent_by_email' : 'email'
    },
    code
  };
}

async function confirmCode({ token, code }) {
  const application = await findApplication(token);
  if (!application || !code) {
    return { ok: false, status: 400, error: 'This application link is not valid.' };
  }
  const grant = await db.query('SELECT * FROM application_payment_grants WHERE application_id = $1', [application.id]);
  const row = grant.rows[0];
  if (!row || !row.otp_hash || !row.otp_expires_at || new Date(row.otp_expires_at).getTime() <= Date.now()) {
    return { ok: false, status: 400, error: 'This verification code has expired. Request a new one.', code: 'verification_expired' };
  }
  if (row.otp_attempts >= MAX_ATTEMPTS) {
    return { ok: false, status: 429, error: 'Too many verification attempts. Request a new code.' };
  }
  if (hashValue(String(code).trim()) !== row.otp_hash) {
    await db.query(
      'UPDATE application_payment_grants SET otp_attempts = otp_attempts + 1, updated_at = NOW() WHERE application_id = $1',
      [application.id]
    );
    return { ok: false, status: 400, error: 'That verification code does not match.' };
  }
  const access = crypto.randomBytes(32).toString('base64url');
  await db.query(`
    UPDATE application_payment_grants
    SET otp_hash = NULL, otp_expires_at = NULL, otp_attempts = 0,
        access_hash = $2, access_expires_at = NOW() + ($3::int * INTERVAL '1 minute'), updated_at = NOW()
    WHERE application_id = $1
  `, [application.id, hashValue(access), ACCESS_MINUTES]);
  return {
    ok: true,
    status: 200,
    body: {
      success: true,
      payment_access: access,
      expires_in_minutes: ACCESS_MINUTES,
      message: 'Payment details can now be opened for this application.'
    }
  };
}

async function grantCovers(applicationId, resumeToken, accessToken) {
  if (!accessToken || !resumeToken) return false;
  const application = await findApplication(resumeToken);
  if (!application || String(application.id) !== String(applicationId)) return false;
  const grant = await db.query(
    `SELECT access_hash, access_expires_at
     FROM application_payment_grants
     WHERE application_id = $1`,
    [application.id]
  );
  const row = grant.rows[0];
  if (!row || !row.access_hash || !row.access_expires_at) return false;
  if (new Date(row.access_expires_at).getTime() <= Date.now()) return false;
  return hashValue(accessToken) === row.access_hash;
}

module.exports = {
  requestCode,
  confirmCode,
  grantCovers,
  hashValue
};
