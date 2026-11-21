const fs = require('fs');
const path = require('path');
const db = require('../../../db/db');
const { privateUploadFolder } = require('../../../lib/privateUploads');

const MESSAGE_FOLDERS = new Set(['images', 'voice', 'documents']);
const CONTENT_TYPES = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.webm': 'audio/webm',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.mp4': 'audio/mp4',
  '.wav': 'audio/wav',
};

function safeBasename(value) {
  if (typeof value !== 'string' || !value || value.length > 180) return null;
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch (_) {
    return null;
  }
  if (decoded.includes('\0') || decoded.includes('/') || decoded.includes('\\') || decoded.includes('..')) return null;
  const base = path.basename(decoded);
  if (base !== decoded || base === '.' || base === '..') return null;
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,179}$/.test(base)) return null;
  return base;
}

function storedBasename(value) {
  return path.basename(String(value || '').replace(/\\/g, '/'));
}

function containedFile(root, filename) {
  const resolvedRoot = path.resolve(root);
  const full = path.resolve(resolvedRoot, filename);
  if (full !== resolvedRoot && !full.startsWith(resolvedRoot + path.sep)) return null;
  return full;
}

function sendIfExists(res, fullPath) {
  if (!fullPath || !fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
    return res.status(404).json({ error: 'File not found.' });
  }
  const ext = path.extname(fullPath).toLowerCase();
  res.setHeader('Content-Type', CONTENT_TYPES[ext] || 'application/octet-stream');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Disposition', `inline; filename="${path.basename(fullPath)}"`);
  return res.sendFile(fullPath);
}

async function loadActor(userId) {
  const result = await db.query(
    `SELECT u.id, u.email, u.school_id, u.is_superadmin,
            LOWER(COALESCE(r.name, '')) AS role
     FROM users u
     LEFT JOIN roles r ON u.role_id::text = r.id::text
     WHERE u.id::text = $1::text
     LIMIT 1`,
    [String(userId)]
  );
  return result.rows[0] || null;
}

function sameSchool(actor, schoolId) {
  const own = parseInt(actor && actor.school_id, 10);
  const target = parseInt(schoolId, 10);
  return Number.isInteger(own) && own > 0 && own === target;
}

async function sendApplicationFile(req, res) {
  const filename = safeBasename(req.params.filename);
  if (!filename) return res.status(400).json({ error: 'That file name is not valid.' });
  try {
    const actor = await loadActor(req.user && req.user.id);
    if (!actor) return res.status(401).json({ error: 'Sign in to open this file.' });
    const docs = await db.query(
      `SELECT a.school_id, a.primary_parent_email, a.secondary_parent_email,
              a.email AS learner_email, a.parent_user_id, a.applicant_user_id
       FROM application_documents d
       JOIN applications a ON a.id = d.application_id
       WHERE regexp_replace(replace(d.file_path, '\\', '/'), '^.*/', '') = $1`,
      [filename]
    );
    if (docs.rows.length === 0) return res.status(404).json({ error: 'File not found.' });
    const email = String(actor.email || '').toLowerCase();
    const isSchoolReviewer = ['admin', 'principal', 'vice_principal', 'school_admin', 'subadmin', 'sub_admin'].includes(actor.role);
    const allowed = docs.rows.every((row) => {
      if (actor.is_superadmin) return true;
      if (isSchoolReviewer && sameSchool(actor, row.school_id)) return true;
      const parentEmail = String(row.primary_parent_email || '').toLowerCase();
      const secondEmail = String(row.secondary_parent_email || '').toLowerCase();
      const learnerEmail = String(row.learner_email || '').toLowerCase();
      if (actor.role === 'parent') {
        return (row.parent_user_id && Number(row.parent_user_id) === Number(actor.id))
          || (email && (email === parentEmail || email === secondEmail));
      }
      if (actor.role === 'learner' || actor.role === 'student') {
        return (row.applicant_user_id && Number(row.applicant_user_id) === Number(actor.id))
          || (email && email === learnerEmail);
      }
      return false;
    });
    if (!allowed) return res.status(403).json({ error: 'You cannot open this file.' });
    return sendIfExists(res, containedFile(path.join(process.cwd(), 'uploads', 'applications'), filename));
  } catch (err) {
    console.error('[FILE] application download failed');
    return res.status(500).json({ error: 'The file could not be opened.' });
  }
}

async function sendProfileFile(req, res) {
  const filename = safeBasename(req.params.filename);
  if (!filename) return res.status(400).json({ error: 'That file name is not valid.' });
  try {
    const actor = await loadActor(req.user && req.user.id);
    if (!actor) return res.status(401).json({ error: 'Sign in to open this file.' });
    const owners = await db.query(
      `SELECT id AS owner_id, school_id, 'user' AS kind FROM users
       WHERE regexp_replace(replace(COALESCE(profile_picture_path, ''), '\\', '/'), '^.*/', '') = $1
          OR regexp_replace(replace(COALESCE(profile_picture, ''), '\\', '/'), '^.*/', '') = $1
       UNION
       SELECT learner_user_id, school_id, 'child' FROM children
       WHERE regexp_replace(replace(COALESCE(profile_picture_path, ''), '\\', '/'), '^.*/', '') = $1`,
      [filename]
    );
    if (owners.rows.length === 0) return res.status(404).json({ error: 'File not found.' });
    const allowed = actor.is_superadmin || owners.rows.some((row) =>
      String(row.owner_id) === String(actor.id) || sameSchool(actor, row.school_id)
    );
    if (!allowed) return res.status(403).json({ error: 'You cannot open this file.' });
    return sendIfExists(res, containedFile(path.join(process.cwd(), 'uploads', 'pfp'), filename));
  } catch (err) {
    console.error('[FILE] profile download failed');
    return res.status(500).json({ error: 'The file could not be opened.' });
  }
}

async function sendMessageFile(req, res) {
  const filename = safeBasename(req.params.filename);
  const requestedFolder = req.params.subfolder ? safeBasename(req.params.subfolder) : null;
  if (!filename || (req.params.subfolder && !requestedFolder)) {
    return res.status(400).json({ error: 'That file name is not valid.' });
  }
  if (requestedFolder && !MESSAGE_FOLDERS.has(requestedFolder)) {
    return res.status(404).json({ error: 'File not found.' });
  }
  try {
    const actor = await loadActor(req.user && req.user.id);
    if (!actor) return res.status(401).json({ error: 'Sign in to open this file.' });
    const messages = await db.query(
      `SELECT sender_id, recipient_id, attachment_url
       FROM messages
       WHERE regexp_replace(replace(COALESCE(attachment_url, ''), '\\', '/'), '^.*/', '') = $1`,
      [filename]
    );
    const participant = messages.rows.some((row) =>
      String(row.sender_id) === String(actor.id) || String(row.recipient_id) === String(actor.id)
    );
    const ownUpload = filename.startsWith(`${actor.id}-`);
    if (!participant && !ownUpload) {
      return res.status(messages.rows.length ? 403 : 404).json({
        error: messages.rows.length ? 'You cannot open this file.' : 'File not found.'
      });
    }
    const folders = requestedFolder ? [requestedFolder] : ['images', 'voice', 'documents'];
    for (const folder of folders) {
      const full = containedFile(path.join(process.cwd(), 'uploads', 'messages', folder), filename);
      if (full && fs.existsSync(full) && fs.statSync(full).isFile()) return sendIfExists(res, full);
    }
    const recorded = messages.rows.map((row) => storedBasename(row.attachment_url)).find((name) => name === filename);
    if (!recorded && !ownUpload) return res.status(404).json({ error: 'File not found.' });
    return res.status(404).json({ error: 'File not found.' });
  } catch (err) {
    console.error('[FILE] message download failed');
    return res.status(500).json({ error: 'The file could not be opened.' });
  }
}

async function sendSchoolFile(req, res, folder, lookup) {
  const filename = safeBasename(req.params.filename);
  if (!filename) return res.status(400).json({ error: 'That file name is not valid.' });
  try {
    const actor = await loadActor(req.user.id);
    if (!actor) return res.status(401).json({ error: 'Sign in to open this file.' });
    const allowed = await lookup(actor, filename);
    if (!allowed) return res.status(allowed === false ? 403 : 404).json({ error: allowed === false ? 'You cannot open this file.' : 'File not found.' });
    const full = containedFile(path.join(process.cwd(), 'uploads', folder), filename)
      || containedFile(path.join(process.cwd(), 'public', 'uploads', folder), filename);
    return sendIfExists(res, full);
  } catch (err) {
    console.error('[FILE] school download failed');
    return res.status(500).json({ error: 'The file could not be opened.' });
  }
}

async function sendAssignmentFile(req, res) {
  return sendSchoolFile(req, res, 'assignments', async (actor, filename) => {
    const rows = await db.query(
      `SELECT school_id, teacher_id FROM homework_assignments WHERE file_url ILIKE $1 LIMIT 1`,
      [`%/${filename}`]
    );
    const row = rows.rows[0];
    if (!row) return null;
    if (actor.is_superadmin) return true;
    if (row.school_id && !sameSchool(actor, row.school_id) && String(row.teacher_id) !== String(actor.id)) return false;
    return true;
  });
}

async function sendSubmissionFile(req, res) {
  return sendSchoolFile(req, res, 'submissions', async (actor, filename) => {
    const rows = await db.query(
      `SELECT c.school_id, c.id AS child_id, c.parent_id, c.learner_user_id
       FROM homework_submissions s
       JOIN children c ON c.id = s.child_id
       WHERE s.file_url ILIKE $1
       LIMIT 1`,
      [`%/${filename}`]
    );
    const row = rows.rows[0];
    if (!row) return null;
    if (actor.is_superadmin) return true;
    if (!sameSchool(actor, row.school_id)) return false;
    const role = String(actor.role || '');
    if (role === 'learner') return String(actor.id) === String(row.learner_user_id) || String(actor.id) === String(row.child_id);
    if (role === 'parent') return String(actor.id) === String(row.parent_id);
    return role === 'admin' || role === 'principal' || role === 'vice_principal' || role === 'teacher';
  });
}

async function sendTextbookFile(req, res) {
  return sendSchoolFile(req, res, 'textbooks', async (actor, filename) => {
    const rows = await db.query(
      `SELECT u.school_id
       FROM textbooks t
       LEFT JOIN users u ON u.id::text = t.teacher_id::text
       WHERE t.file_name = $1 OR t.file_path ILIKE $2
       LIMIT 1`,
      [filename, `%/${filename}`]
    );
    const row = rows.rows[0];
    if (!row) return true;
    if (actor.is_superadmin || row.school_id == null) return true;
    return sameSchool(actor, row.school_id) ? true : false;
  });
}

function rejectSensitiveStatic(req, res, next) {
  const folder = privateUploadFolder(req.path);
  if (folder === 'invalid') return res.status(400).json({ error: 'That file name is not valid.' });
  if (folder) return res.status(401).json({ error: 'Sign in to open this file.' });
  return next();
}

module.exports = {
  safeBasename,
  sendApplicationFile,
  sendProfileFile,
  sendMessageFile,
  sendAssignmentFile,
  sendSubmissionFile,
  sendTextbookFile,
  rejectSensitiveStatic,
};
