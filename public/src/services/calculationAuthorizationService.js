'use strict';

const db = require('../../../db/db');

let schemaReady = null;

function ensureSchema() {
  if (!schemaReady) {
    schemaReady = db.query(`
      CREATE TABLE IF NOT EXISTS calculation_authorizations (
        id SERIAL PRIMARY KEY,
        school_id INTEGER NOT NULL,
        academic_year INTEGER NOT NULL,
        grade INTEGER NOT NULL,
        class_name VARCHAR(80) NOT NULL DEFAULT '',
        subject VARCHAR(120) NOT NULL,
        term_number INTEGER NOT NULL,
        policy VARCHAR(40) NOT NULL,
        teacher_id INTEGER,
        status VARCHAR(20) NOT NULL CHECK (status IN ('authorized', 'invalid')),
        result JSONB NOT NULL,
        assessments_included JSONB NOT NULL,
        authorized_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        invalid_at TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS calculation_authorizations_lookup
        ON calculation_authorizations (school_id, grade, term_number, lower(subject), status);
    `).catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

async function recordAuthorization(key, result) {
  await ensureSchema();
  await db.query(
    `UPDATE calculation_authorizations
     SET status = 'invalid', invalid_at = NOW()
     WHERE school_id = $1 AND academic_year = $2 AND grade = $3
       AND LOWER(class_name) = LOWER($4) AND LOWER(subject) = LOWER($5)
       AND term_number = $6 AND status = 'authorized'`,
    [key.schoolId, key.academicYear, key.grade, key.className || '', key.subject, key.termNumber]
  );
  const inserted = await db.query(
    `INSERT INTO calculation_authorizations
      (school_id, academic_year, grade, class_name, subject, term_number, policy, teacher_id, status, result, assessments_included)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'authorized', $9::jsonb, $10::jsonb)
     RETURNING id, authorized_at, status`,
    [
      key.schoolId, key.academicYear, key.grade, key.className || '', key.subject, key.termNumber,
      key.policy, key.teacherId, JSON.stringify({ summary: result.summary, learners: result.learners || [] }), JSON.stringify(result.assessments)
    ]
  );
  return inserted.rows[0];
}

async function invalidate(key) {
  await ensureSchema();
  await db.query(
    `UPDATE calculation_authorizations
     SET status = 'invalid', invalid_at = NOW()
     WHERE school_id = $1 AND grade = $2 AND LOWER(subject) = LOWER($3)
       AND term_number = $4 AND LOWER(class_name) = LOWER($5) AND status = 'authorized'`,
    [key.schoolId, key.grade, key.subject, key.termNumber, key.className || '']
  );
}

module.exports = { ensureSchema, recordAuthorization, invalidate };
