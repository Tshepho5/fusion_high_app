'use strict';

const db = require('../../../db/db');

let schemaReady = null;

function ensureSchema() {
  if (!schemaReady) {
    schemaReady = db.query(`
      CREATE TABLE IF NOT EXISTS answer_sheet_scans (
        id SERIAL PRIMARY KEY,
        school_id INTEGER NOT NULL,
        assessment_id INTEGER NOT NULL,
        child_id INTEGER,
        learner_number VARCHAR(80),
        document_hash VARCHAR(64) NOT NULL,
        original_filename TEXT,
        stated_mark NUMERIC(8, 2),
        maximum NUMERIC(8, 2) NOT NULL,
        confidence VARCHAR(30) NOT NULL DEFAULT 'unrecognized',
        status VARCHAR(30) NOT NULL,
        reason TEXT,
        confirmed_mark NUMERIC(8, 2),
        confirmed_by INTEGER,
        confirmed_at TIMESTAMPTZ,
        stored_path TEXT,
        created_by INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE answer_sheet_scans ADD COLUMN IF NOT EXISTS stored_path TEXT;
      CREATE UNIQUE INDEX IF NOT EXISTS answer_sheet_scans_one_hash
        ON answer_sheet_scans (assessment_id, document_hash)
        WHERE status <> 'rejected';
      CREATE INDEX IF NOT EXISTS answer_sheet_scans_assessment
        ON answer_sheet_scans (assessment_id, created_at DESC);
    `).catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

async function existingForAssessment(assessmentId) {
  await ensureSchema();
  const result = await db.query(
    `SELECT document_hash, child_id, status
     FROM answer_sheet_scans
     WHERE assessment_id = $1 AND status <> 'rejected'`,
    [assessmentId]
  );
  return result.rows;
}

async function insertScan(row) {
  await ensureSchema();
  const inserted = await db.query(
    `INSERT INTO answer_sheet_scans
      (school_id, assessment_id, child_id, learner_number, document_hash, original_filename,
       stated_mark, maximum, confidence, status, reason, stored_path, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING id, status, child_id, stated_mark, confidence, reason`,
    [
      row.schoolId, row.assessmentId, row.childId, row.learnerNumber, row.documentHash,
      row.filename || null, row.statedMark, row.maximum, row.confidence, row.status,
      row.reason || null, row.storedPath || null, row.createdBy
    ]
  );
  return inserted.rows[0];
}

async function getScan(id, schoolId) {
  await ensureSchema();
  const result = await db.query(
    `SELECT id, school_id, assessment_id, child_id, learner_number, stated_mark, maximum, status, stored_path
     FROM answer_sheet_scans
     WHERE id = $1 AND school_id = $2`,
    [id, schoolId]
  );
  return result.rows[0] || null;
}

async function markConfirmed(id, score, userId) {
  await ensureSchema();
  const updated = await db.query(
    `UPDATE answer_sheet_scans
     SET status = 'confirmed', confirmed_mark = $2, confirmed_by = $3, confirmed_at = NOW()
     WHERE id = $1 AND status = 'awaiting_verification'
     RETURNING id, status, confirmed_mark, child_id`,
    [id, score, userId]
  );
  return updated.rows[0] || null;
}

async function markRejected(id) {
  await ensureSchema();
  const updated = await db.query(
    `UPDATE answer_sheet_scans
     SET status = 'rejected'
     WHERE id = $1 AND status NOT IN ('confirmed', 'rejected')
     RETURNING id, status`,
    [id]
  );
  return updated.rows[0] || null;
}

async function listForAssessment(assessmentId, schoolId) {
  await ensureSchema();
  const result = await db.query(
    `SELECT id, child_id, learner_number, original_filename, stated_mark, maximum,
            confidence, status, reason, confirmed_mark, created_at,
            (stored_path IS NOT NULL) AS has_file
     FROM answer_sheet_scans
     WHERE assessment_id = $1 AND school_id = $2
     ORDER BY created_at DESC`,
    [assessmentId, schoolId]
  );
  return result.rows;
}

module.exports = {
  ensureSchema,
  existingForAssessment,
  insertScan,
  getScan,
  markConfirmed,
  markRejected,
  listForAssessment
};
