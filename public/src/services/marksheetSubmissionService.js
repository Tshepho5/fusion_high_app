'use strict';

const db = require('../../../db/db');

let schemaReady = null;

function ensureSchema() {
  if (!schemaReady) {
    schemaReady = db.query(`
      CREATE TABLE IF NOT EXISTS marksheet_submissions (
        id SERIAL PRIMARY KEY,
        school_id INTEGER NOT NULL,
        academic_year INTEGER NOT NULL,
        grade INTEGER NOT NULL,
        class_name VARCHAR(80) NOT NULL DEFAULT '',
        subject VARCHAR(120) NOT NULL,
        assessment_name VARCHAR(255) NOT NULL,
        term_number INTEGER NOT NULL,
        term_label VARCHAR(40) NOT NULL DEFAULT '',
        teacher_id INTEGER,
        status VARCHAR(20) NOT NULL CHECK (status IN ('submitted', 'reopened')),
        version INTEGER NOT NULL,
        snapshot JSONB NOT NULL,
        missing_count INTEGER NOT NULL DEFAULT 0,
        submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        reopen_requested_at TIMESTAMPTZ,
        reopen_request_reason TEXT,
        reopened_at TIMESTAMPTZ,
        reopened_by INTEGER
      );
      CREATE UNIQUE INDEX IF NOT EXISTS marksheet_submissions_one_open
        ON marksheet_submissions (school_id, academic_year, grade, class_name, lower(subject), lower(assessment_name), term_number)
        WHERE status = 'submitted';
    `).catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

function termNumber(value) {
  return parseInt(String(value || '').replace(/[^0-9]/g, ''), 10) || 1;
}

async function findLocked(key) {
  await ensureSchema();
  const result = await db.query(
    `SELECT id, version, submitted_at, teacher_id, reopen_requested_at
     FROM marksheet_submissions
     WHERE school_id = $1 AND academic_year = $2 AND grade = $3
       AND LOWER(class_name) = LOWER($4)
       AND LOWER(subject) = LOWER($5)
       AND LOWER(assessment_name) = LOWER($6)
       AND term_number = $7
       AND status = 'submitted'
     LIMIT 1`,
    [key.schoolId, key.academicYear, key.grade, key.className || '', key.subject, key.assessmentName, termNumber(key.term)]
  );
  return result.rows[0] || null;
}

async function submit(key, snapshot, missingCount) {
  await ensureSchema();
  const existing = await findLocked(key);
  if (existing) {
    const error = new Error('This marksheet has already been submitted. Ask the school to reopen it before changing marks.');
    error.status = 409;
    throw error;
  }
  const versionResult = await db.query(
    `SELECT COALESCE(MAX(version), 0) + 1 AS version
     FROM marksheet_submissions
     WHERE school_id = $1 AND academic_year = $2 AND grade = $3
       AND LOWER(class_name) = LOWER($4)
       AND LOWER(subject) = LOWER($5)
       AND LOWER(assessment_name) = LOWER($6)
       AND term_number = $7`,
    [key.schoolId, key.academicYear, key.grade, key.className || '', key.subject, key.assessmentName, termNumber(key.term)]
  );
  const inserted = await db.query(
    `INSERT INTO marksheet_submissions
      (school_id, academic_year, grade, class_name, subject, assessment_name, term_number, term_label,
       teacher_id, status, version, snapshot, missing_count)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'submitted', $10, $11::jsonb, $12)
     RETURNING id, version, submitted_at, status`,
    [
      key.schoolId, key.academicYear, key.grade, key.className || '', key.subject, key.assessmentName,
      termNumber(key.term), String(key.term || ''), key.teacherId, versionResult.rows[0].version,
      JSON.stringify(snapshot), missingCount
    ]
  );
  return inserted.rows[0];
}

async function requestReopen(key, reason) {
  await ensureSchema();
  const locked = await findLocked(key);
  if (!locked) {
    const error = new Error('There is no submitted marksheet to reopen.');
    error.status = 404;
    throw error;
  }
  if (Number(locked.teacher_id) !== Number(key.teacherId)) {
    const error = new Error('Only the teacher who submitted this marksheet can request a correction.');
    error.status = 403;
    throw error;
  }
  await db.query(
    `UPDATE marksheet_submissions
     SET reopen_requested_at = NOW(), reopen_request_reason = $2
     WHERE id = $1`,
    [locked.id, String(reason || '').trim().slice(0, 500)]
  );
  return { id: locked.id, requested: true };
}

async function reopen(schoolId, submissionId, actorId) {
  await ensureSchema();
  const result = await db.query(
    `UPDATE marksheet_submissions
     SET status = 'reopened', reopened_at = NOW(), reopened_by = $3
     WHERE id = $1 AND school_id = $2 AND status = 'submitted'
     RETURNING id, version, status`,
    [submissionId, schoolId, actorId || null]
  );
  return result.rows[0] || null;
}

async function listForOverview(schoolId, grade, term, className) {
  await ensureSchema();
  const params = [schoolId, grade, termNumber(term)];
  let classClause = '';
  if (className && className !== 'All') {
    params.push(className);
    classClause = `AND LOWER(class_name) = LOWER($${params.length})`;
  }
  const result = await db.query(
    `SELECT id, subject, assessment_name, class_name, status, version, submitted_at,
            teacher_id, missing_count, reopen_requested_at, reopen_request_reason
     FROM marksheet_submissions
     WHERE school_id = $1 AND grade = $2 AND term_number = $3 AND status = 'submitted'
     ${classClause}
     ORDER BY submitted_at DESC`,
    params
  );
  return result.rows;
}

module.exports = {
  ensureSchema,
  findLocked,
  submit,
  requestReopen,
  reopen,
  listForOverview,
  termNumber
};
