'use strict';

const db = require('../../../../db/db');
const { resolveSchoolId } = require('../../services/schoolScope');
const { enrolmentSql } = require('../../../../lib/assessmentAccess');
const { calculateLearner, classAverage } = require('../../../../lib/academicCalculation');
const { resolveReportClassName } = require('../../../../lib/reportClassName');
const { teacherIsAssigned } = require('./assessmentOpenController');
const { termNumber } = require('../../services/marksheetSubmissionService');
const authorizations = require('../../services/calculationAuthorizationService');

const POLICIES = new Set(['total_marks', 'explicit_weights', 'sba_exam']);

function categoryOf(row) {
  const label = `${row.assessment_type || ''} ${row.assessment_name || ''}`.toLowerCase();
  return label.includes('exam') ? 'exam' : 'sba';
}

async function buildPreview(req) {
  if (req.user && req.user.is_superadmin) {
    const error = new Error('The assigned subject teacher authorizes this calculation.');
    error.status = 403;
    throw error;
  }
  const schoolId = parseInt(resolveSchoolId(req), 10);
  const subject = String(req.body.subject || '').trim();
  const grade = parseInt(req.body.grade, 10);
  const requestedClass = String(req.body.class || req.body.class_name || '').trim();
  const term = String(req.body.term || '').trim();
  const policy = POLICIES.has(req.body.policy) ? req.body.policy : 'total_marks';
  if (!Number.isInteger(schoolId) || !subject || !Number.isInteger(grade)) {
    const error = new Error('Choose the grade and subject before calculating.');
    error.status = 400;
    throw error;
  }
  const classRows = await db.query(
    `SELECT name FROM classes WHERE school_id = $1 AND grade = $2 ORDER BY name`,
    [schoolId, grade]
  ).catch(() => ({ rows: [] }));
  const resolvedClass = resolveReportClassName({
    requested: requestedClass,
    classesInGrade: classRows.rows.map((row) => row.name)
  });
  if (!resolvedClass.ok) {
    const error = new Error(resolvedClass.error);
    error.status = 400;
    throw error;
  }
  const className = resolvedClass.className;
  const allowed = await teacherIsAssigned(req.user && req.user.id, subject, grade, requestedClass || className);
  if (!allowed) {
    const error = new Error('You can authorize calculations only for a subject and class assigned to you.');
    error.status = 403;
    throw error;
  }
  const params = [subject, schoolId, grade, termNumber(term)];
  let classClause = '';
  if (className && !/^\d+$/.test(className) && className.toLowerCase() !== 'all') {
    params.push(className);
    classClause = `AND (cl.name ILIKE $${params.length} OR cl.id::text = $${params.length})`;
  }
  const learners = await db.query(
    `SELECT c.id, c.learner_number, c.surname, c.full_name
     FROM children c
     LEFT JOIN classes cl ON c.class_id = cl.id
     WHERE c.school_id = $2 AND c.grade = $3 AND ${enrolmentSql(1)} ${classClause}
     ORDER BY c.surname, c.full_name`,
    params
  );
  if (!learners.rows.length) {
    return {
      policy, subject, grade, class_name: className, term_number: termNumber(term),
      schoolId, academicYear: parseInt(req.body.academic_year, 10) || new Date().getFullYear(),
      teacherId: req.user && req.user.id,
      summary: { status: 'incomplete', average: null, complete: 0, incomplete: 0 },
      learners: [], assessments: [], can_authorize: false
    };
  }
  const marks = await db.query(
    `SELECT child_id, learner_id, assessment_name, assessment_type, score, max_score, weight
     FROM marks
     WHERE school_id = $1 AND term = $2 AND LOWER(COALESCE(subject, subject_name, '')) = LOWER($3)
       AND (child_id = ANY($4) OR learner_id = ANY($4))
     ORDER BY id ASC`,
    [schoolId, termNumber(term), subject, learners.rows.map((row) => row.id)]
  );
  const byLearner = new Map();
  marks.rows.forEach((row) => {
    const id = row.child_id || row.learner_id;
    if (!byLearner.has(id)) byLearner.set(id, new Map());
    byLearner.get(id).set(String(row.assessment_name || 'Assessment'), row);
  });
  const names = new Set();
  marks.rows.forEach((row) => names.add(String(row.assessment_name || 'Assessment')));
  const submitted = await db.query(
    `SELECT assessment_name FROM marksheet_submissions
     WHERE school_id = $1 AND grade = $2 AND term_number = $3
       AND LOWER(subject) = LOWER($4) AND LOWER(class_name) = LOWER($5) AND status = 'submitted'`,
    [schoolId, grade, termNumber(term), subject, className || '']
  ).catch(() => ({ rows: [] }));
  const submittedNames = new Set(submitted.rows.map((row) => String(row.assessment_name)));
  const results = learners.rows.map((learner) => {
    const own = byLearner.get(learner.id) || new Map();
    const assessments = Array.from(names).map((name) => {
      const row = own.get(name);
      return {
        name,
        score: row ? row.score : null,
        maximum: row ? Number(row.max_score) : null,
        weight: row ? Number(row.weight) : null,
        category: categoryOf(row || { assessment_name: name }),
        submitted: submittedNames.has(name)
      };
    });
    const calculated = calculateLearner(assessments, policy);
    const unsubmitted = assessments.filter((row) => !row.submitted).map((row) => row.name);
    return {
      learner_id: learner.id,
      learner_number: learner.learner_number,
      name: [learner.surname, learner.full_name].filter(Boolean).join(', '),
      ...calculated,
      unsubmitted
    };
  });
  const summary = classAverage(results);
  const blocked = results.some((row) => row.unsubmitted.length > 0);
  return {
    policy,
    subject,
    grade,
    class_name: className,
    term_number: termNumber(term),
    schoolId,
    academicYear: parseInt(req.body.academic_year, 10) || new Date().getFullYear(),
    teacherId: req.user && req.user.id,
    summary,
    learners: results,
    assessments: Array.from(names),
    can_authorize: summary.status === 'complete' && !blocked
  };
}

exports.previewCalculation = async (req, res) => {
  try {
    const preview = await buildPreview(req);
    res.json(preview);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.status ? error.message : 'The calculation preview could not be prepared.' });
  }
};

exports.authorizeCalculation = async (req, res) => {
  try {
    const preview = await buildPreview(req);
    if (!preview.can_authorize) {
      return res.status(400).json({
        error: 'Authorize the average only after every enrolled learner has a submitted mark for each assessment.',
        preview
      });
    }
    const saved = await authorizations.recordAuthorization({
      schoolId: preview.schoolId,
      academicYear: preview.academicYear,
      grade: preview.grade,
      className: preview.class_name,
      subject: preview.subject,
      termNumber: preview.term_number,
      policy: preview.policy,
      teacherId: preview.teacherId
    }, preview);
    res.status(201).json({ success: true, authorization: saved, summary: preview.summary, learners: preview.learners });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.status ? error.message : 'The calculation could not be authorized.' });
  }
};
