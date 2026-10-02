const db = require('../../../db/db');

const BUSINESS_DISPLAY = '076 606 4212';
const BUSINESS_E164 = '27766064212';
const GRAPH_VERSION = 'v21.0';

let schemaReady = false;

function normalise(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length === 10) digits = `27${digits.slice(1)}`;
  if (digits.length === 9) digits = `27${digits}`;
  if (!/^27\d{9}$/.test(digits)) return null;
  return digits;
}

function configured() {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

async function ensureSchema() {
  if (schemaReady) return;
  await db.query(`
    CREATE TABLE IF NOT EXISTS whatsapp_contacts (
      id SERIAL PRIMARY KEY,
      email TEXT,
      phone TEXT UNIQUE,
      user_id INTEGER,
      verified BOOLEAN DEFAULT FALSE,
      verify_code TEXT,
      verify_expires_at TIMESTAMP,
      opted_in BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS whatsapp_sessions (
      phone TEXT PRIMARY KEY,
      step TEXT DEFAULT 'menu',
      context JSONB DEFAULT '{}'::jsonb,
      misses INTEGER DEFAULT 0,
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS whatsapp_messages (
      id SERIAL PRIMARY KEY,
      phone TEXT,
      direction TEXT,
      body TEXT,
      status TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS whatsapp_escalations (
      id SERIAL PRIMARY KEY,
      phone TEXT,
      email TEXT,
      message TEXT,
      status TEXT DEFAULT 'open',
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS app_ratings (
      id SERIAL PRIMARY KEY,
      phone TEXT,
      email TEXT,
      score INTEGER,
      comment TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  schemaReady = true;
}

async function logMessage(phone, direction, body, status) {
  try {
    await ensureSchema();
    await db.query(
      'INSERT INTO whatsapp_messages (phone, direction, body, status) VALUES ($1, $2, $3, $4)',
      [phone, direction, String(body || '').slice(0, 2000), status || null]
    );
  } catch (err) {
    console.warn('[WHATSAPP LOG]', err.message);
  }
}

async function postMessage(payload) {
  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ messaging_product: 'whatsapp', ...payload })
    }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const reason = data.error?.message || `WhatsApp API ${response.status}`;
    throw new Error(reason);
  }
  return data;
}

async function deliver(phone, builder) {
  const to = normalise(phone);
  if (!to) return { sent: false, reason: 'That is not a South African mobile number.' };
  if (!configured()) {
    await logMessage(to, 'out', 'not_configured', 'held');
    return {
      sent: false,
      reason: `WhatsApp is ready for ${BUSINESS_DISPLAY}, and delivery starts when the WhatsApp Business API token is connected.`
    };
  }
  try {
    const data = await postMessage(builder(to));
    await logMessage(to, 'out', 'delivered', 'sent');
    return { sent: true, id: data.messages?.[0]?.id || null };
  } catch (err) {
    await logMessage(to, 'out', err.message, 'failed');
    return { sent: false, reason: err.message };
  }
}

function sendText(phone, body) {
  return deliver(phone, (to) => ({
    to,
    type: 'text',
    text: { preview_url: false, body: String(body).slice(0, 4000) }
  }));
}

function sendButtons(phone, body, buttons) {
  return deliver(phone, (to) => ({
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: String(body).slice(0, 1024) },
      action: {
        buttons: buttons.slice(0, 3).map((button) => ({
          type: 'reply',
          reply: { id: button.id, title: String(button.title).slice(0, 20) }
        }))
      }
    }
  }));
}

function sendList(phone, body, rows) {
  return deliver(phone, (to) => ({
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: String(body).slice(0, 1024) },
      action: {
        button: 'Choose',
        sections: [{
          title: 'Geleza SA',
          rows: rows.slice(0, 10).map((row) => ({
            id: row.id,
            title: String(row.title).slice(0, 24),
            description: String(row.description || '').slice(0, 72)
          }))
        }]
      }
    }
  }));
}

async function saveContact({ email, phone, userId, verified }) {
  const normalised = normalise(phone);
  if (!normalised) return null;
  await ensureSchema();
  const result = await db.query(
    `INSERT INTO whatsapp_contacts (email, phone, user_id, verified, opted_in, updated_at)
     VALUES ($1, $2, $3, $4, TRUE, NOW())
     ON CONFLICT (phone) DO UPDATE SET
       email = COALESCE(EXCLUDED.email, whatsapp_contacts.email),
       user_id = COALESCE(EXCLUDED.user_id, whatsapp_contacts.user_id),
       verified = whatsapp_contacts.verified OR EXCLUDED.verified,
       opted_in = TRUE,
       updated_at = NOW()
     RETURNING *`,
    [email ? String(email).toLowerCase() : null, normalised, userId || null, Boolean(verified)]
  );
  return result.rows[0];
}

async function phoneForEmail(email, verifiedOnly = false) {
  if (!email) return null;
  await ensureSchema();
  const result = await db.query(
    `SELECT phone FROM whatsapp_contacts
     WHERE LOWER(email) = LOWER($1) AND opted_in = TRUE
       AND ($2::boolean = FALSE OR verified = TRUE)
     ORDER BY verified DESC, updated_at DESC LIMIT 1`,
    [email, verifiedOnly]
  );
  return result.rows[0]?.phone || null;
}

async function startVerification(userId, email, phone) {
  const normalised = normalise(phone);
  if (!normalised) {
    return { ok: false, error: 'Enter a South African number, for example 0766064212.' };
  }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await ensureSchema();
  await db.query(
    `INSERT INTO whatsapp_contacts (email, phone, user_id, verified, verify_code, verify_expires_at, updated_at)
     VALUES ($1, $2, $3, FALSE, $4, NOW() + INTERVAL '10 minutes', NOW())
     ON CONFLICT (phone) DO UPDATE SET
       email = COALESCE(EXCLUDED.email, whatsapp_contacts.email),
       user_id = EXCLUDED.user_id,
       verified = FALSE,
       verify_code = EXCLUDED.verify_code,
       verify_expires_at = EXCLUDED.verify_expires_at,
       updated_at = NOW()`,
    [email || null, normalised, userId, code]
  );
  const sent = await sendText(
    normalised,
    `Geleza SA confirmation code: ${code}. It expires in 10 minutes. If you did not ask for this, ignore the message.`
  );
  if (!sent.sent) return { ok: false, error: sent.reason, phone: normalised };
  return { ok: true, phone: normalised };
}

async function confirmVerification(userId, code) {
  await ensureSchema();
  const result = await db.query(
    `UPDATE whatsapp_contacts
     SET verified = TRUE, verify_code = NULL, verify_expires_at = NULL, updated_at = NOW()
     WHERE user_id = $1 AND verify_code = $2 AND verify_expires_at > NOW()
     RETURNING phone`,
    [userId, String(code || '').trim()]
  );
  if (!result.rows[0]) return { ok: false, error: 'That code does not match, or it has expired.' };
  return { ok: true, phone: result.rows[0].phone };
}

async function contactForUser(userId) {
  await ensureSchema();
  const result = await db.query(
    'SELECT phone, verified FROM whatsapp_contacts WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1',
    [userId]
  );
  return result.rows[0] || null;
}

function noticeText(kind, params) {
  const learner = params.learnerName || 'your learner';
  const ref = params.applicationNumber || '';
  if (kind === 'otp') {
    return `Geleza SA password code: ${params.otp}. It is valid for 5 minutes. Do not share it.`;
  }
  if (kind === 'application_received') {
    return `Geleza SA received the application for ${learner}${ref ? ` (${ref})` : ''}. The fee stays unpaid until the school records the money. The due date is ${params.dueDateStr || 'on your email'}. Bank details are in your email.`;
  }
  if (kind === 'application_accepted') {
    return `Geleza SA accepted the application for ${learner}${ref ? ` (${ref})` : ''}. Finish registration from the link in your email.`;
  }
  if (kind === 'application_rejected') {
    return `Geleza SA could not offer a place to ${learner}${ref ? ` (${ref})` : ''}. The reason is in your email. Reply to this chat if you need a person to help.`;
  }
  if (kind === 'application_waitlisted') {
    return `Geleza SA placed ${learner} on the waiting list${ref ? ` (${ref})` : ''}. We will message you if a place opens.`;
  }
  if (kind === 'application_correction') {
    return `Geleza SA needs a correction on the application for ${learner}${ref ? ` (${ref})` : ''}. Open the link in your email to update it.`;
  }
  if (kind === 'fee_reminder') {
    return `Geleza SA payment reminder for ${learner}${ref ? ` (${ref})` : ''}. Amount R${Number(params.feeAmount || 0).toFixed(2)} is due ${params.dueDateStr || 'soon'}. It stays unpaid until the school records the money. Details are in your email.`;
  }
  if (kind === 'fee_received') {
    return `Geleza SA recorded a payment for ${learner}${ref ? ` (${ref})` : ''}. The receipt is in your email.`;
  }
  if (kind === 'approved_fee') {
    return `Geleza SA approved ${learner}. The registration fee is still unpaid until the school records it. The deadline is in your email.`;
  }
  if (kind === 'registration_success') {
    return `Geleza SA enrolled ${learner}${params.learnerNumber ? ` as ${params.learnerNumber}` : ''}${params.assignedClass ? ` in ${params.assignedClass}` : ''}. Your sign-in details were sent by email.`;
  }
  return `Geleza SA update for ${learner}. Please check your email for the full message.`;
}

async function mirrorEmail(kind, params) {
  try {
    const explicit = params.whatsappNumber || params.parentPhone || params.phone;
    const phone = normalise(explicit) || await phoneForEmail(params.parentEmail || params.email, kind === 'otp');
    if (!phone) return { sent: false, reason: 'no_whatsapp_number' };
    return await sendText(phone, noticeText(kind, params));
  } catch (err) {
    console.warn('[WHATSAPP MIRROR]', err.message);
    return { sent: false, reason: err.message };
  }
}

async function sendOtp(phone, otp) {
  return sendText(phone, noticeText('otp', { otp }));
}

module.exports = {
  BUSINESS_DISPLAY,
  BUSINESS_E164,
  normalise,
  configured,
  ensureSchema,
  sendText,
  sendButtons,
  sendList,
  saveContact,
  phoneForEmail,
  startVerification,
  confirmVerification,
  contactForUser,
  mirrorEmail,
  sendOtp,
  logMessage
};
