const db = require('../../../db/db');
const whatsapp = require('./whatsappService');
const NotificationService = require('./notificationService');
const emailService = require('./emailService');

const MENU = [
  { id: 'status', title: 'Application status', description: 'Accepted, waiting, or unsuccessful' },
  { id: 'payments', title: 'Payment deadlines', description: 'Fees that are still unpaid' },
  { id: 'progress', title: 'Learner progress', description: 'A short performance check' },
  { id: 'rate', title: 'Rate Geleza SA', description: 'Score the app from 1 to 5' },
  { id: 'human', title: 'Talk to a person', description: 'A Geleza executive is notified' }
];

async function session(phone) {
  await whatsapp.ensureSchema();
  const found = await db.query('SELECT * FROM whatsapp_sessions WHERE phone = $1', [phone]);
  if (found.rows[0]) return found.rows[0];
  const created = await db.query(
    `INSERT INTO whatsapp_sessions (phone) VALUES ($1) RETURNING *`,
    [phone]
  );
  return created.rows[0];
}

async function setSession(phone, step, context, misses) {
  await db.query(
    `UPDATE whatsapp_sessions SET step = $2, context = $3::jsonb, misses = $4, updated_at = NOW() WHERE phone = $1`,
    [phone, step, JSON.stringify(context || {}), misses || 0]
  );
}

async function contact(phone) {
  const result = await db.query(
    'SELECT * FROM whatsapp_contacts WHERE phone = $1 ORDER BY updated_at DESC LIMIT 1',
    [phone]
  );
  return result.rows[0] || null;
}

async function showMenu(phone, intro) {
  await setSession(phone, 'menu', {}, 0);
  return whatsapp.sendList(
    phone,
    intro || `Geleza SA help line. This chat uses the same updates as email. Choose an option, or type your question.`,
    MENU
  );
}

async function applicationFor(phone, email) {
  const digits = phone;
  const result = await db.query(
    `SELECT application_number, status, application_fee_status, registration_fee_status,
            application_fee_due_date, registration_fee_amount, application_fee_amount,
            first_name, surname
     FROM applications
     WHERE ($1 <> '' AND LOWER(primary_parent_email) = LOWER($1))
        OR regexp_replace(COALESCE(primary_parent_phone, ''), '\\D', '', 'g') IN ($2, $3)
     ORDER BY id DESC LIMIT 1`,
    [email || '', digits, digits.startsWith('27') ? `0${digits.slice(2)}` : digits]
  );
  return result.rows[0] || null;
}

async function replyStatus(phone, email) {
  const app = await applicationFor(phone, email);
  if (!app) {
    return whatsapp.sendText(phone, 'No application is linked to this WhatsApp number yet. Register the number in Geleza settings, or use the same mobile you put on the application form.');
  }
  const due = app.application_fee_due_date ? new Date(app.application_fee_due_date).toLocaleDateString('en-ZA') : 'not set';
  return whatsapp.sendText(
    phone,
    `${app.first_name} ${app.surname}: application ${app.application_number} is ${app.status}. Application fee ${app.application_fee_status || 'unpaid'} (due ${due}). Registration fee ${app.registration_fee_status || 'unpaid'}. The full letter is also in your email.`
  );
}

async function replyPayments(phone, email) {
  const app = await applicationFor(phone, email);
  if (!app) return whatsapp.sendText(phone, 'No payment deadline is linked to this number yet.');
  const lines = [];
  if (app.application_fee_status !== 'paid') {
    const due = app.application_fee_due_date ? new Date(app.application_fee_due_date).toLocaleDateString('en-ZA') : 'the date in your email';
    lines.push(`Application fee R${Number(app.application_fee_amount || 250).toFixed(2)} is unpaid. Deadline: ${due}.`);
  }
  if (app.registration_fee_status !== 'paid') {
    lines.push(`Registration fee R${Number(app.registration_fee_amount || 1500).toFixed(2)} is unpaid until the school records the money.`);
  }
  if (!lines.length) return whatsapp.sendText(phone, 'The fees linked to this number are already recorded as paid.');
  return whatsapp.sendText(phone, `${lines.join(' ')} Reference ${app.application_number}. Bank details stay in your email.`);
}

async function replyProgress(phone, userId) {
  if (!userId) {
    return whatsapp.sendText(phone, 'Link this WhatsApp number in Settings before a progress check. Sign in, open Settings, and confirm the code we send here.');
  }
  const children = await db.query(
    `SELECT c.id, c.full_name, c.surname, c.grade
     FROM children c
     WHERE c.parent_id::text = $1::text
        OR EXISTS (SELECT 1 FROM parent_children pc WHERE pc.child_id = c.id AND pc.parent_id::text = $1::text)
     ORDER BY c.full_name LIMIT 4`,
    [String(userId)]
  );
  if (!children.rows.length) {
    return whatsapp.sendText(phone, 'This number is linked, and no learner record is attached to it yet.');
  }
  const lines = [];
  for (const child of children.rows) {
    let average = null;
    try {
      const marks = await db.query('SELECT ROUND(AVG(percentage)) AS average FROM marks WHERE learner_id = $1', [child.id]);
      average = marks.rows[0]?.average;
    } catch (_) {}
    lines.push(`${child.full_name} ${child.surname}, Grade ${child.grade || ''}: ${average ? `${average}% average` : 'open the portal for the full report'}.`);
  }
  return whatsapp.sendText(phone, `Learner progress:\n${lines.join('\n')}`);
}

async function escalate(phone, email, message) {
  await whatsapp.ensureSchema();
  await db.query(
    'INSERT INTO whatsapp_escalations (phone, email, message) VALUES ($1, $2, $3)',
    [phone, email || null, String(message || '').slice(0, 2000)]
  );
  const executives = await db.query(
    `SELECT u.id, u.email FROM users u
     WHERE u.is_superadmin = TRUE
     ORDER BY u.id ASC LIMIT 8`
  );
  const ids = executives.rows.map((row) => row.id);
  const note = `WhatsApp help needed from ${phone}. ${message || 'The user asked for a person.'}`;
  if (ids.length) {
    await NotificationService.sendToUsers({
      userIds: ids,
      title: 'WhatsApp help needs a person',
      message: note,
      type: 'support',
      targetTab: 'messages'
    });
    for (const executive of executives.rows) {
      if (!executive.email) continue;
      emailService.send(
        executive.email,
        'Geleza SA WhatsApp help needs a person',
        `<p>${note}</p><p>Reply from the Geleza business WhatsApp ${whatsapp.BUSINESS_DISPLAY}.</p>`
      ).catch(() => {});
    }
  }
  return whatsapp.sendText(
    phone,
    'A Geleza SA executive has been notified and will join this chat. You can keep sending the details of the problem here.'
  );
}

async function saveRating(phone, email, score, comment) {
  await db.query(
    'INSERT INTO app_ratings (phone, email, score, comment) VALUES ($1, $2, $3, $4)',
    [phone, email || null, score, comment || null]
  );
}

async function handleIncoming(message) {
  const phone = whatsapp.normalise(message.from);
  if (!phone) return;
  const text = (message.text?.body || message.button?.text || message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || '').trim();
  const choice = message.interactive?.button_reply?.id || message.interactive?.list_reply?.id || text.toLowerCase();
  await whatsapp.logMessage(phone, 'in', text || choice, 'received');
  const current = await session(phone);
  const person = await contact(phone);
  const email = person?.email || null;

  if (['hi', 'hello', 'menu', 'help', 'start'].includes(choice)) {
    return showMenu(phone);
  }
  if (choice === 'human' || ['agent', 'person', 'executive', 'human'].includes(choice)) {
    return escalate(phone, email, text);
  }
  if (current.step === 'rating') {
    const score = parseInt(text, 10);
    if (score >= 1 && score <= 5) {
      await setSession(phone, 'rating_comment', { score }, 0);
      return whatsapp.sendButtons(phone, `You scored Geleza SA ${score} out of 5. Add a short comment, or skip.`, [
        { id: 'skip_comment', title: 'Skip comment' },
        { id: 'menu', title: 'Main menu' }
      ]);
    }
  }
  if (current.step === 'rating_comment' || choice === 'skip_comment') {
    const score = current.context?.score || null;
    if (choice !== 'skip_comment' && text) await saveRating(phone, email, score, text);
    else if (score) await saveRating(phone, email, score, null);
    await setSession(phone, 'menu', {}, 0);
    return showMenu(phone, 'Thank you. Your rating is saved. What else can Geleza help with?');
  }
  if (choice === 'status' || choice === 'application status') return replyStatus(phone, email);
  if (choice === 'payments' || choice === 'payment deadlines') return replyPayments(phone, email);
  if (choice === 'progress' || choice === 'learner progress') return replyProgress(phone, person?.user_id);
  if (choice === 'rate' || choice === 'rate geleza sa') {
    await setSession(phone, 'rating', {}, 0);
    return whatsapp.sendText(phone, 'Reply with a number from 1 to 5. 1 is poor and 5 is excellent.');
  }

  const misses = (current.misses || 0) + 1;
  await setSession(phone, current.step, current.context, misses);
  if (misses >= 2) return escalate(phone, email, text);
  return showMenu(phone, 'I can help with application status, payment deadlines, learner progress, or a rating. If this needs a person, choose Talk to a person.');
}

module.exports = { handleIncoming, showMenu };
