'use strict';

const db = require('../../../db/db');
const { resolveSchoolId } = require('../services/schoolScope');
const { planSubjectCorrection, subjectsAfterCorrection } = require('../../../lib/learnerSubjectAllocation');

function approvedFromRow(row) {
  const pack = row.subject_package;
  if (pack && Array.isArray(pack.subjects) && pack.subjects.length) return pack.subjects;
  if (Array.isArray(row.selected_subjects) && row.selected_subjects.length) return row.selected_subjects;
  return [];
}

exports.auditSubjectAllocation = async (req, res) => {
  try {
    const schoolId = parseInt(resolveSchoolId(req), 10);
    if (!Number.isInteger(schoolId)) {
      return res.status(403).json({ error: 'This account is not linked to a school.' });
    }
    const grade = req.query.grade ? parseInt(req.query.grade, 10) : null;
    const params = [schoolId];
    let gradeClause = '';
    if (Number.isInteger(grade)) {
      params.push(grade);
      gradeClause = ` AND c.grade = $${params.length}`;
    }
    const [applicationColumns, markColumns] = await Promise.all([
      db.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'subject_package'`
      ),
      db.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'marks'
           AND column_name IN ('subject', 'subject_name', 'child_id')`
      )
    ]);
    const hasPackage = applicationColumns.rows.length > 0;
    const markNames = new Set(markColumns.rows.map((row) => row.column_name));
    const subjectExpression = markNames.has('subject') && markNames.has('subject_name')
      ? `COALESCE(NULLIF(m.subject, ''), NULLIF(m.subject_name, ''))`
      : (markNames.has('subject_name') ? `NULLIF(m.subject_name, '')` : `NULLIF(m.subject, '')`);
    const markMatch = markNames.has('child_id')
      ? '(m.child_id = c.id OR m.learner_id = c.id)'
      : 'm.learner_id = c.id';
    const packageColumn = hasPackage ? 'subject_package' : 'NULL::jsonb AS subject_package';
    const { rows } = await db.query(
      `SELECT c.id, c.learner_number, c.full_name, c.surname, c.grade, c.stream, c.subjects,
              app.selected_subjects, app.subject_package,
              COALESCE(marked.subjects, ARRAY[]::text[]) AS marked_subjects
       FROM children c
       LEFT JOIN LATERAL (
         SELECT selected_subjects, ${packageColumn}
         FROM applications
         WHERE school_id = c.school_id
           AND provisional_learner_number = c.learner_number
         ORDER BY id DESC
         LIMIT 1
       ) app ON TRUE
       LEFT JOIN LATERAL (
         SELECT array_agg(DISTINCT subject_name) AS subjects
         FROM (
           SELECT ${subjectExpression} AS subject_name
           FROM marks m
           WHERE ${markMatch}
         ) named
         WHERE subject_name IS NOT NULL
       ) marked ON TRUE
       WHERE c.school_id = $1${gradeClause}
       ORDER BY c.grade, c.surname, c.full_name
       LIMIT 500`,
      params
    );
    const learners = rows.map((row) => {
      const plan = planSubjectCorrection({
        enrolled: row.subjects,
        approved: Number(row.grade) >= 10 ? approvedFromRow(row) : row.subjects,
        subjectsWithMarks: row.marked_subjects
      });
      return {
        id: row.id,
        learner_number: row.learner_number,
        name: [row.surname, row.full_name].filter(Boolean).join(', '),
        grade: row.grade,
        stream: row.stream,
        status: plan.status,
        stored_subjects: plan.keep.concat(plan.removable),
        removable_without_marks: plan.removable,
        flagged_with_marks: plan.flagged_with_marks,
        missing_from_package: plan.missing,
        reason: plan.reason
      };
    });
    const counts = learners.reduce((totals, learner) => {
      totals[learner.status] = (totals[learner.status] || 0) + 1;
      return totals;
    }, {});
    res.json({
      school_id: schoolId,
      changed: false,
      message: 'This review lists mismatches. It does not change learner subjects or marks.',
      counts,
      learners: learners.filter((learner) => learner.status !== 'matches')
    });
  } catch (error) {
    console.error('Subject allocation audit failed:', error);
    res.status(500).json({ error: 'The subject allocation review could not be completed.' });
  }
};

exports.applySubjectCorrection = async (req, res) => {
  try {
    if (req.body.confirm !== true) {
      return res.status(400).json({ error: 'Confirm the reviewed correction before changing this learner.' });
    }
    const schoolId = parseInt(resolveSchoolId(req), 10);
    const childId = parseInt(req.params.childId, 10);
    if (!Number.isInteger(schoolId) || !Number.isInteger(childId)) {
      return res.status(400).json({ error: 'Choose the learner in this school.' });
    }
    const child = await db.query(
      `SELECT c.id, c.grade, c.subjects, c.learner_number
       FROM children c
       WHERE c.id = $1 AND c.school_id = $2`,
      [childId, schoolId]
    );
    if (!child.rows[0]) return res.status(404).json({ error: 'The learner was not found in this school.' });
    const row = child.rows[0];
    const application = await db.query(
      `SELECT selected_subjects, subject_package
       FROM applications
       WHERE school_id = $1 AND provisional_learner_number = $2
       ORDER BY id DESC LIMIT 1`,
      [schoolId, row.learner_number]
    ).catch(() => ({ rows: [] }));
    const marks = await db.query(
      `SELECT DISTINCT COALESCE(NULLIF(subject, ''), NULLIF(subject_name, '')) AS subject
       FROM marks
       WHERE child_id = $1 OR learner_id = $1`,
      [childId]
    ).catch(() => ({ rows: [] }));
    const approved = Number(row.grade) >= 10 ? approvedFromRow(application.rows[0] || {}) : row.subjects;
    const plan = planSubjectCorrection({
      enrolled: row.subjects,
      approved,
      subjectsWithMarks: marks.rows.map((item) => item.subject)
    });
    const next = subjectsAfterCorrection(plan);
    if (!next.ok) return res.status(409).json({ error: next.error, plan });
    await db.query(
      `UPDATE children SET subjects = $1::text[] WHERE id = $2 AND school_id = $3`,
      [next.subjects, childId, schoolId]
    );
    res.json({
      success: true,
      changed: true,
      subjects: next.subjects,
      removed: next.removed,
      kept_with_marks: next.kept_with_marks,
      message: 'Subjects outside the package were removed only when they had no marks.'
    });
  } catch (error) {
    console.error('Subject correction failed:', error);
    res.status(500).json({ error: 'The subject correction could not be applied.' });
  }
};
