const db = require('../../../db/db');
const bcrypt = require('bcryptjs');
const { withTransaction } = require('../../../db/transaction');
const emailService = require('../services/emailService');
const activation = require('../services/principalActivation');
const { validatePassword } = require('./authController');

function pageOrigin(req) {
  const origin = req.headers?.origin || process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
  return String(origin).replace(/\/$/, '');
}

function invitationLink(req, token) {
  return `${pageOrigin(req)}/activate?token=${encodeURIComponent(token)}`;
}

async function sendInvitation(req, user, token) {
  const school = user.school_id
    ? await db.query('SELECT name, emis_number FROM schools WHERE id = $1', [user.school_id])
    : { rows: [] };
  await emailService.sendSchoolApplicationApprovedNotice({
    principalEmail: user.email,
    principalName: `${user.full_name || ''} ${user.surname || ''}`.trim() || 'Principal',
    schoolName: school.rows[0]?.name || 'your school',
    emisNumber: school.rows[0]?.emis_number || '',
    activationUrl: invitationLink(req, token)
  });
}

exports.activate = async (req, res) => {
  const token = String(req.body?.token || '').trim();
  const password = String(req.body?.password || '');
  const confirm = String(req.body?.confirm_password || req.body?.password_confirm || '');
  if (token.length < 20 || token.length > 200) {
    return res.status(400).json({ error: 'This invitation link is not valid.' });
  }
  const problem = validatePassword(password);
  if (problem) return res.status(400).json({ error: problem });
  if (confirm && confirm !== password) {
    return res.status(400).json({ error: 'The two passwords do not match.' });
  }

  try {
    const tokenHash = activation.hashToken(token);
    const passwordHash = await bcrypt.hash(password, 10);
    const saved = await withTransaction(async (client) => {
      const found = await client.query(
        `SELECT id, email, is_superadmin, password_hash, activation_expires_at
         FROM users
         WHERE activation_token_hash = $1
         FOR UPDATE`,
        [tokenHash]
      );
      const user = found.rows[0];
      if (!user || user.is_superadmin) {
        const error = new Error('This invitation link is not valid.');
        error.status = 400;
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
             activation_token_hash = NULL,
             activation_expires_at = NULL,
             is_superadmin = FALSE
         WHERE id = $2
           AND activation_token_hash = $3
           AND is_superadmin = FALSE
           AND password_hash IS NULL
         RETURNING id, email, is_superadmin`,
        [passwordHash, user.id, tokenHash]
      );
      if (!updated.rows.length) {
        const error = new Error('This invitation has already been used.');
        error.status = 400;
        throw error;
      }
      return updated.rows[0];
    });
    return res.json({
      success: true,
      message: 'Your password is ready. You can sign in with your email.',
      email: saved.email
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message, code: err.code || undefined });
    console.error('Principal activation failed.');
    return res.status(500).json({ error: 'The password could not be saved.' });
  }
};

exports.resendPublic = async (req, res) => {
  const generic = {
    success: true,
    message: 'If that account is waiting for a password, a new invitation has been sent.'
  };
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email.includes('@') || email.length > 200) return res.json(generic);
  try {
    const found = await db.query(
      `SELECT id, email, full_name, surname, school_id, password_hash, is_superadmin
       FROM users
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [email]
    );
    const user = found.rows[0];
    if (user && !user.password_hash && !user.is_superadmin && user.school_id) {
      const token = await activation.issue(db, user.id);
      await sendInvitation(req, user, token).catch(() => {});
    }
    return res.json(generic);
  } catch (_) {
    return res.json(generic);
  }
};
