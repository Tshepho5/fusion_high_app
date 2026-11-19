'use strict';

const db = require('../../../db/db');
const { resolveSchoolId } = require('../services/schoolScope');
const { termIndex, markBelongsToYear } = require('../../../lib/reportTerm');
const { reviewFacts, enrolmentFromDecision, decisionAllowed } = require('../../../lib/academicProgression');

function schoolIdFrom(req) {
  const schoolId = parseInt(resolveSchoolId(req), 10);
  return Number.isInteger(schoolId) && schoolId > 0 ? schoolId : null;
}

function mutationSchool(req, res) {
  if (req.user && req.user.is_superadmin && !req.user.viewing) {
    res.status(403).json({ error: 'Year-end decisions are made by the school principal or school admin.' });
    return null;
  }
  const schoolId = schoolIdFrom(req);
  if (!schoolId) {
    res.status(403).json({ error: 'This account is not linked to a school.' });
    return null;
  }
  return schoolId;
}

async function listProgression(req, res) {
  const schoolId = schoolIdFrom(req);
  const year = parseInt(req.query.year, 10);
  if (!schoolId) return res.status(403).json({ error: 'This account is not linked to a school.' });
  if (!Number.isInteger(year) || year < 2000) return res.status(400).json({ error: 'Choose an academic year.' });

  const learners = await db.query(
    `SELECT id, full_name, surname, grade, learner_number
     FROM children
     WHERE school_id = $1 AND COALESCE(is_active, TRUE) = TRUE
     ORDER BY grade, surname, full_name`,
    [schoolId]
  );
  const marks = await db.query(
    `SELECT COALESCE(m.child_id, m.learner_id) AS child_id, m.term, m.academic_year
     FROM marks m
     JOIN children c ON c.id = COALESCE(m.child_id, m.learner_id)
     WHERE c.school_id = $1`,
    [schoolId]
  );
  const decisions = await db.query(
    `SELECT * FROM progression_decisions WHERE school_id = $1 AND from_year = $2`,
    [schoolId, year]
  );
  const enrolments = await db.query(
    `SELECT e.*, cl.name AS class_name
     FROM learner_enrolments e
     LEFT JOIN classes cl ON cl.id = e.class_id AND cl.school_id = e.school_id
     WHERE e.school_id = $1 AND e.academic_year = $2`,
    [schoolId, year + 1]
  );
  const incoming = await db.query(
    `SELECT id, first_name, surname, grade_applied, status, academic_year
     FROM applications
     WHERE school_id = $1 AND academic_year = $2 AND status IN ('approved', 'enrolled')
     ORDER BY surname, first_name`,
    [schoolId, year + 1]
  );

  const termsByChild = new Map();
  marks.rows.forEach((mark) => {
    if (!markBelongsToYear(mark, year)) return;
    const term = termIndex(mark.term);
    if (!term) return;
    const key = Number(mark.child_id);
    if (!termsByChild.has(key)) termsByChild.set(key, new Set());
    termsByChild.get(key).add(term);
  });
  const decisionByChild = new Map(decisions.rows.map((row) => [Number(row.child_id), row]));
  const enrolmentByChild = new Map(enrolments.rows.map((row) => [Number(row.child_id), row]));

  res.json({
    year,
    next_year: year + 1,
    promotion_rule: null,
    learners: learners.rows.map((learner) => {
      const facts = reviewFacts([...(termsByChild.get(Number(learner.id)) || [])]);
      const decision = decisionByChild.get(Number(learner.id)) || null;
      const enrolment = enrolmentByChild.get(Number(learner.id)) || null;
      return {
        child_id: learner.id,
        name: `${learner.full_name || ''} ${learner.surname || ''}`.trim(),
        learner_number: learner.learner_number,
        grade: learner.grade,
        results_complete: facts.results_complete,
        missing_terms: facts.missing_terms,
        recommended_outcome: null,
        decision: decision ? decision.decision : null,
        reason: decision ? decision.reason : null,
        enrolment: enrolment ? {
          id: enrolment.id,
          year: enrolment.academic_year,
          grade: enrolment.grade,
          class_id: enrolment.class_id,
          class_name: enrolment.class_name,
          status: enrolment.status
        } : null
      };
    }),
    incoming: incoming.rows
  });
}

async function recordDecision(req, res) {
  const schoolId = mutationSchool(req, res);
  if (!schoolId) return;
  const childId = parseInt(req.params.childId, 10);
  const year = parseInt(req.body.year, 10);
  const decision = String(req.body.decision || '').toLowerCase();
  const reason = String(req.body.reason || '').trim();
  if (!Number.isInteger(childId) || !Number.isInteger(year)) {
    return res.status(400).json({ error: 'Choose a learner and an academic year.' });
  }

  const childRes = await db.query(
    `SELECT id, grade FROM children WHERE id = $1 AND school_id = $2 AND COALESCE(is_active, TRUE) = TRUE`,
    [childId, schoolId]
  );
  const child = childRes.rows[0];
  if (!child) return res.status(404).json({ error: 'Learner not found in this school.' });

  const marks = await db.query(
    `SELECT term, academic_year FROM marks WHERE child_id = $1 OR learner_id = $1`,
    [childId]
  );
  const terms = [];
  marks.rows.forEach((mark) => {
    if (!markBelongsToYear(mark, year)) return;
    const term = termIndex(mark.term);
    if (term) terms.push(term);
  });
  const facts = reviewFacts(terms);
  const allowed = decisionAllowed(decision, facts.results_complete);
  if (!allowed.ok) return res.status(409).json({ error: allowed.error, missing_terms: facts.missing_terms });
  const plan = enrolmentFromDecision(child.grade, decision);
  if (!plan.ok) return res.status(400).json({ error: plan.error });
  if ((decision === 'transferred' || decision === 'withdrawn') && reason.length < 3) {
    return res.status(400).json({ error: 'Record a short reason for a transfer or withdrawal.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const saved = await client.query(
      `INSERT INTO progression_decisions
        (school_id, child_id, from_year, decision, reason, results_complete, decided_by, enrolment_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NULL)
       ON CONFLICT (school_id, child_id, from_year)
       DO UPDATE SET decision = EXCLUDED.decision, reason = EXCLUDED.reason,
         results_complete = EXCLUDED.results_complete, decided_by = EXCLUDED.decided_by, decided_at = NOW()
       RETURNING id`,
      [schoolId, childId, year, decision, reason || null, facts.results_complete, req.user.id]
    );
    let enrolment = null;
    if (plan.create_enrolment) {
      const written = await client.query(
        `INSERT INTO learner_enrolments
          (school_id, child_id, academic_year, grade, status, source, created_by)
         VALUES ($1, $2, $3, $4, $5, 'progression', $6)
         ON CONFLICT (school_id, child_id, academic_year)
         DO UPDATE SET grade = EXCLUDED.grade, status = EXCLUDED.status
         RETURNING id, academic_year, grade, class_id, status`,
        [schoolId, childId, year + 1, plan.next_grade, plan.status, req.user.id]
      );
      enrolment = written.rows[0];
      await client.query(`UPDATE progression_decisions SET enrolment_id = $1 WHERE id = $2`, [enrolment.id, saved.rows[0].id]);
    } else {
      await client.query(
        `DELETE FROM learner_enrolments
         WHERE school_id = $1 AND child_id = $2 AND academic_year = $3 AND source = 'progression'`,
        [schoolId, childId, year + 1]
      );
    }
    await client.query('COMMIT');
    res.json({
      success: true,
      decision,
      results_complete: facts.results_complete,
      recommended_outcome: null,
      enrolment,
      current_grade_unchanged: true
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[PROGRESSION]', err.message);
    res.status(500).json({ error: 'The progression decision could not be saved.' });
  } finally {
    client.release();
  }
}

async function allocateClass(req, res) {
  const schoolId = mutationSchool(req, res);
  if (!schoolId) return;
  const enrolmentId = parseInt(req.params.id, 10);
  const classId = parseInt(req.body.class_id, 10);
  if (!Number.isInteger(enrolmentId) || !Number.isInteger(classId)) {
    return res.status(400).json({ error: 'Choose an enrolment and a class.' });
  }
  const found = await db.query(
    `SELECT e.id, e.grade
     FROM learner_enrolments e
     WHERE e.id = $1 AND e.school_id = $2`,
    [enrolmentId, schoolId]
  );
  if (!found.rows[0]) return res.status(404).json({ error: 'Enrolment not found.' });
  const schoolClass = await db.query(
    `SELECT id, name, grade FROM classes WHERE id = $1 AND school_id = $2`,
    [classId, schoolId]
  );
  if (!schoolClass.rows[0]) return res.status(404).json({ error: 'Class not found in this school.' });
  if (Number(schoolClass.rows[0].grade) !== Number(found.rows[0].grade)) {
    return res.status(409).json({ error: 'That class is not in the grade prepared for this learner.' });
  }
  const saved = await db.query(
    `UPDATE learner_enrolments SET class_id = $1 WHERE id = $2 AND school_id = $3
     RETURNING id, grade, class_id`,
    [classId, enrolmentId, schoolId]
  );
  res.json({ success: true, enrolment: saved.rows[0], class_name: schoolClass.rows[0].name });
}

async function applyEnrolments(req, res) {
  const schoolId = mutationSchool(req, res);
  if (!schoolId) return;
  const year = parseInt(req.body.year, 10);
  if (req.body.confirm !== 'apply-enrolments' || !Number.isInteger(year)) {
    return res.status(400).json({ error: 'Confirm that this academic year should become the current register.' });
  }
  const rows = await db.query(
    `SELECT id, child_id, grade, class_id, status
     FROM learner_enrolments
     WHERE school_id = $1 AND academic_year = $2`,
    [schoolId, year]
  );
  const waiting = rows.rows.filter((row) => !row.class_id);
  const ready = rows.rows.filter((row) => row.class_id);
  for (const row of ready) {
    await db.query(
      `UPDATE children SET grade = $1, class_id = $2
       WHERE id = $3 AND school_id = $4`,
      [row.grade, row.class_id, row.child_id, schoolId]
    );
  }
  res.json({
    success: true,
    applied: ready.length,
    waiting_for_class: waiting.map((row) => row.child_id)
  });
}

module.exports = { listProgression, recordDecision, allocateClass, applyEnrolments };
