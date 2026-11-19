'use strict';

const db = require('../../../db/db');

let schemaReady = null;

function ensureSchema() {
  if (!schemaReady) {
    schemaReady = db.query(`
      CREATE TABLE IF NOT EXISTS report_verifications (
        id SERIAL PRIMARY KEY,
        school_id INTEGER NOT NULL,
        academic_year INTEGER NOT NULL,
        grade INTEGER NOT NULL,
        class_name VARCHAR(80) NOT NULL,
        term_number INTEGER NOT NULL,
        teacher_id INTEGER NOT NULL,
        decision VARCHAR(20) NOT NULL CHECK (decision IN ('approved', 'returned')),
        reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS report_verifications_lookup
        ON report_verifications (school_id, grade, term_number, lower(class_name), created_at DESC);
      ALTER TABLE report_verifications ADD COLUMN IF NOT EXISTS learner_id INTEGER;
      ALTER TABLE report_verifications ADD COLUMN IF NOT EXISTS subject VARCHAR(120);
      ALTER TABLE report_verifications ADD COLUMN IF NOT EXISTS routed_teacher_id INTEGER;
      CREATE TABLE IF NOT EXISTS report_card_versions (
        id SERIAL PRIMARY KEY,
        school_id INTEGER NOT NULL,
        child_id INTEGER NOT NULL,
        academic_year INTEGER NOT NULL,
        term INTEGER NOT NULL,
        grade INTEGER,
        class_name VARCHAR(80),
        snapshot JSONB NOT NULL,
        reason TEXT,
        created_by INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `).catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

async function latestForClasses(schoolId, grade, term, academicYear) {
  await ensureSchema();
  const result = await db.query(
    `SELECT DISTINCT ON (lower(class_name)) class_name, decision, reason, teacher_id, created_at
     FROM report_verifications
     WHERE school_id = $1 AND grade = $2 AND term_number = $3 AND academic_year = $4
     ORDER BY lower(class_name), created_at DESC`,
    [schoolId, grade, term, academicYear]
  );
  return result.rows;
}

async function recordDecision(row) {
  await ensureSchema();
  const inserted = await db.query(
    `INSERT INTO report_verifications
      (school_id, academic_year, grade, class_name, term_number, teacher_id, decision, reason, learner_id, subject, routed_teacher_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id, decision, created_at, learner_id, subject, routed_teacher_id`,
    [
      row.schoolId, row.academicYear, row.grade, row.className, row.termNumber, row.teacherId,
      row.decision, row.reason || null, row.learnerId || null, row.subject || null, row.routedTeacherId || null
    ]
  );
  return inserted.rows[0];
}

async function archiveClassReports({ schoolId, grade, className, term, academicYear, reason, userId }) {
  await ensureSchema();
  const saved = await db.query(
    `INSERT INTO report_card_versions
      (school_id, child_id, academic_year, term, grade, class_name, snapshot, reason, created_by)
     SELECT rc.school_id, rc.child_id, rc.academic_year, rc.term, rc.grade, $5, to_jsonb(rc), $6, $7
     FROM report_cards rc
     JOIN children c ON c.id = rc.child_id
     LEFT JOIN classes cl ON c.class_id = cl.id
     WHERE rc.school_id = $1 AND rc.grade = $2 AND rc.term = $3 AND rc.academic_year = $4
       AND LOWER(COALESCE(cl.name, rc.class_name, '')) = LOWER($5)
     RETURNING id`,
    [schoolId, grade, term, academicYear, className, reason || null, userId]
  );
  return saved.rows.length;
}

module.exports = { ensureSchema, latestForClasses, recordDecision, archiveClassReports };
