'use strict';

const db = require('../../../../db/db');
const { resolveSchoolId } = require('../../services/schoolScope');
const { enrolmentSql, teacherCovers, enrolledInSubject } = require('../../../../lib/assessmentAccess');

let schemaReady = null;

function ensureAssessmentSchema() {
  if (!schemaReady) {
    schemaReady = db.query(`
      ALTER TABLE assessments ADD COLUMN IF NOT EXISTS school_id INTEGER;
      ALTER TABLE assessments ADD COLUMN IF NOT EXISTS academic_year INTEGER;
      ALTER TABLE assessments ADD COLUMN IF NOT EXISTS term VARCHAR(40);
      ALTER TABLE assessments ADD COLUMN IF NOT EXISTS category VARCHAR(80);
      ALTER TABLE assessments ADD COLUMN IF NOT EXISTS weight NUMERIC(6, 2);
      ALTER TABLE assessments ADD COLUMN IF NOT EXISTS assessment_date DATE;
      ALTER TABLE assessments ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;
      ALTER TABLE assessments ADD COLUMN IF NOT EXISTS opened_by INTEGER;
      CREATE TABLE IF NOT EXISTS assessment_rosters (
        id SERIAL PRIMARY KEY,
        assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
        child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (assessment_id, child_id)
      );
      CREATE INDEX IF NOT EXISTS assessment_rosters_child ON assessment_rosters (child_id);
    `).catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

async function teacherIsAssigned(userId, subject, grade, className) {
  const assignments = await db.query(
    `SELECT subject_name, grade_level, class_name, class_id
     FROM teacher_assignments
     WHERE teacher_id = $1`,
    [userId]
  ).catch(() => ({ rows: [] }));
  const employee = await db.query(
    `SELECT subjects, grades_taught, classes_taught
     FROM employees WHERE user_id = $1`,
    [userId]
  ).catch(() => ({ rows: [] }));
  return teacherCovers({
    assignments: assignments.rows,
    employee: employee.rows[0] || null,
    subject,
    grade,
    className
  });
}

exports.openAssessment = async (req, res) => {
  try {
    if (req.user && req.user.is_superadmin) {
      return res.status(403).json({ error: 'The assigned subject teacher opens this assessment.' });
    }
    const schoolId = parseInt(resolveSchoolId(req), 10);
    if (!Number.isInteger(schoolId)) {
      return res.status(403).json({ error: 'This account is not linked to a school.' });
    }
    const subject = String(req.body.subject || '').trim();
    const name = String(req.body.name || req.body.assessment_name || '').trim();
    const grade = parseInt(req.body.grade, 10);
    const className = String(req.body.class || req.body.class_name || '').trim();
    const total = Number(req.body.total_marks || req.body.totalMarks);
    const term = String(req.body.term || '').trim();
    const category = String(req.body.category || req.body.assessment_type || 'Assessment').trim();
    const academicYear = parseInt(req.body.academic_year, 10) || new Date().getFullYear();
    const weight = req.body.weight === undefined || req.body.weight === '' ? null : Number(req.body.weight);
    if (!subject || !name || !Number.isInteger(grade)) {
      return res.status(400).json({ error: 'Choose the subject, grade, and assessment name.' });
    }
    if (!Number.isFinite(total) || total <= 0) {
      return res.status(400).json({ error: 'Enter the total possible marks before opening the assessment.' });
    }
    const teacherId = req.user && req.user.id;
    const allowed = await teacherIsAssigned(teacherId, subject, grade, className);
    if (!allowed) {
      return res.status(403).json({ error: 'You can open assessments only for a subject and class assigned to you.' });
    }
    await ensureAssessmentSchema();
    const classRow = className && !/^\d+$/.test(className)
      ? await db.query(
        `SELECT id FROM classes WHERE school_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1`,
        [schoolId, className]
      )
      : { rows: [] };
    const created = await db.query(
      `INSERT INTO assessments
        (name, subject, grade, class_id, total_marks, status, recorded_by_teacher_id, instructions,
         school_id, academic_year, term, category, weight, assessment_date, opened_at, opened_by)
       VALUES ($1, $2, $3, $4, $5, 'open', $6, $7, $8, $9, $10, $11, $12, $13, NOW(), $6)
       RETURNING id, name, subject, grade, total_marks, status, opened_at`,
      [
        name, subject, grade, classRow.rows[0]?.id || null, total, teacherId,
        String(req.body.instructions || '').trim() || null,
        schoolId, academicYear, term || null, category, Number.isFinite(weight) ? weight : null,
        req.body.assessment_date || null
      ]
    );
    const assessment = created.rows[0];
    const params = [subject, schoolId, grade, assessment.id];
    let classClause = '';
    if (className && !/^\d+$/.test(className) && className.toLowerCase() !== 'all') {
      params.push(className);
      classClause = `AND (cl.name ILIKE $${params.length} OR cl.id::text = $${params.length})`;
    }
    const roster = await db.query(
      `INSERT INTO assessment_rosters (assessment_id, child_id)
       SELECT $4, c.id
       FROM children c
       LEFT JOIN classes cl ON c.class_id = cl.id
       WHERE c.school_id = $2 AND c.grade = $3 AND ${enrolmentSql(1)} ${classClause}
       ON CONFLICT (assessment_id, child_id) DO NOTHING
       RETURNING child_id`,
      params
    );
    const learners = await db.query(
      `SELECT c.id, c.learner_number, c.surname, c.full_name, c.grade, cl.name AS class_name
       FROM assessment_rosters r
       JOIN children c ON c.id = r.child_id
       LEFT JOIN classes cl ON c.class_id = cl.id
       WHERE r.assessment_id = $1 AND c.school_id = $2
       ORDER BY c.surname, c.full_name`,
      [assessment.id, schoolId]
    );
    res.status(201).json({
      assessment,
      roster_count: roster.rows.length,
      learners: learners.rows.map((row) => ({
        ...row,
        subject,
        enrolled: true,
        mark_status: 'missing'
      }))
    });
  } catch (error) {
    console.error('Open assessment failed:', error);
    res.status(500).json({ error: 'The assessment could not be opened.' });
  }
};

exports.teacherIsAssigned = teacherIsAssigned;
exports.learnerEnrolled = enrolledInSubject;
