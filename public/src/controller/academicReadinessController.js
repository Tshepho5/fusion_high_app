'use strict';

const db = require('../../../db/db');
const { resolveSchoolId } = require('../services/schoolScope');
const { assembleClassReadiness } = require('../../../lib/classReadiness');

async function loadReportReadiness({ schoolId, grade, term, academicYear, className }) {
  const params = [schoolId, grade];
  let classClause = '';
  if (className && className !== 'All') {
    params.push(className);
    classClause = `AND (cl.name ILIKE $${params.length} OR cl.id::text = $${params.length})`;
  }
  const learners = await db.query(
    `SELECT c.id, c.grade, c.subjects, COALESCE(cl.name, c.grade::text) AS class_name
     FROM children c
     LEFT JOIN classes cl ON c.class_id = cl.id
     WHERE c.school_id = $1 AND c.grade = $2 ${classClause}
     ORDER BY cl.name, c.surname`,
    params
  );
  const [teachers, submissions, authorizations, marks] = await Promise.all([
    db.query(
      `SELECT ta.subject_name AS subject, ta.class_name, CONCAT(u.full_name, ' ', COALESCE(u.surname, '')) AS teacher
       FROM teacher_assignments ta
       JOIN users u ON u.id = ta.teacher_id
       WHERE u.school_id = $1 AND ta.grade_level = $2`,
      [schoolId, grade]
    ).catch(() => ({ rows: [] })),
    db.query(
      `SELECT subject, class_name, assessment_name, status
       FROM marksheet_submissions
       WHERE school_id = $1 AND grade = $2 AND term_number = $3 AND academic_year = $4 AND status = 'submitted'`,
      [schoolId, grade, term, academicYear]
    ).catch(() => ({ rows: [] })),
      db.query(
        `SELECT DISTINCT ON (lower(subject), lower(class_name)) subject, class_name, status, result
         FROM calculation_authorizations
         WHERE school_id = $1 AND grade = $2 AND term_number = $3 AND academic_year = $4
         ORDER BY lower(subject), lower(class_name), authorized_at DESC`,
        [schoolId, grade, term, academicYear]
      ).catch(() => ({ rows: [] })),
    db.query(
      `SELECT COALESCE(m.subject, m.subject_name) AS subject,
              COALESCE(cl.name, c.grade::text) AS class_name,
              COUNT(DISTINCT c.id)::int AS marked
       FROM marks m
       JOIN children c ON c.id = COALESCE(m.child_id, m.learner_id)
       LEFT JOIN classes cl ON c.class_id = cl.id
       WHERE c.school_id = $1 AND c.grade = $2 AND m.term = $3 AND m.score IS NOT NULL
       GROUP BY COALESCE(m.subject, m.subject_name), COALESCE(cl.name, c.grade::text)`,
      [schoolId, grade, term]
    ).catch(() => ({ rows: [] }))
  ]);
  return assembleClassReadiness({
    learners: learners.rows,
    teachers: teachers.rows,
    submissions: submissions.rows,
    authorizations: authorizations.rows,
    marks: marks.rows
  });
}

exports.loadReportReadiness = loadReportReadiness;

exports.getReportReadiness = async (req, res) => {
  try {
    const schoolId = parseInt(resolveSchoolId(req), 10);
    if (!Number.isInteger(schoolId)) {
      return res.status(403).json({ error: 'This account is not linked to a school.' });
    }
    const grade = parseInt(req.query.grade, 10);
    const term = parseInt(String(req.query.term || '').replace(/[^0-9]/g, ''), 10);
    const academicYear = parseInt(req.query.academic_year || req.query.academicYear, 10) || new Date().getFullYear();
    const className = String(req.query.class || req.query.class_name || '').trim();
    if (!Number.isInteger(grade) || !Number.isInteger(term)) {
      return res.status(400).json({ error: 'Choose a grade and a term.' });
    }
    const readiness = await loadReportReadiness({ schoolId, grade, term, academicYear, className });
    res.json({ academic_year: academicYear, grade, term, ...readiness });
  } catch (error) {
    console.error('Report readiness failed:', error);
    res.status(500).json({ error: 'The class readiness check could not be completed.' });
  }
};
