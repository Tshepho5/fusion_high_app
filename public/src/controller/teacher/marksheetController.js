'use strict';

const db = require('../../../../db/db');
const { resolveSchoolId } = require('../../services/schoolScope');
const { enrolmentSql } = require('../../../../lib/assessmentAccess');
const { teacherIsAssigned } = require('./assessmentOpenController');
const submissions = require('../../services/marksheetSubmissionService');
const NotificationService = require('../../services/notificationService');

function keyFrom(req) {
  const body = req.body || {};
  return {
    schoolId: parseInt(resolveSchoolId(req), 10),
    academicYear: parseInt(body.academic_year, 10) || new Date().getFullYear(),
    grade: parseInt(body.grade, 10) || parseInt(String(body.class || '').replace(/[^0-9]/g, ''), 10),
    className: String(body.class || body.class_name || '').trim(),
    subject: String(body.subject || '').trim(),
    assessmentName: String(body.assessment_name || body.assessmentName || '').trim(),
    term: String(body.term || '').trim(),
    teacherId: req.user && req.user.id
  };
}

exports.submitMarksheet = async (req, res) => {
  try {
    if (req.user && req.user.is_superadmin) {
      return res.status(403).json({ error: 'The assigned subject teacher submits this marksheet.' });
    }
    const key = keyFrom(req);
    if (!Number.isInteger(key.schoolId) || !key.subject || !key.assessmentName || !Number.isInteger(key.grade)) {
      return res.status(400).json({ error: 'Choose the grade, subject, and assessment before submitting.' });
    }
    const allowed = await teacherIsAssigned(key.teacherId, key.subject, key.grade, key.className);
    if (!allowed) {
      return res.status(403).json({ error: 'You can submit marks only for a subject and class assigned to you.' });
    }
    const params = [key.subject, key.schoolId, key.grade, key.assessmentName, submissions.termNumber(key.term)];
    let classClause = '';
    if (key.className && !/^\d+$/.test(key.className) && key.className.toLowerCase() !== 'all') {
      params.push(key.className);
      classClause = `AND (cl.name ILIKE $${params.length} OR cl.id::text = $${params.length})`;
    }
    const recorded = await db.query(
      `SELECT c.id, c.learner_number, c.surname, c.full_name, m.score, m.max_score, m.percentage
       FROM children c
       LEFT JOIN classes cl ON c.class_id = cl.id
       JOIN marks m ON (m.child_id = c.id OR m.learner_id = c.id)
       WHERE c.school_id = $2 AND c.grade = $3
         AND ${enrolmentSql(1)}
         AND LOWER(COALESCE(m.subject, m.subject_name, '')) = LOWER($1)
         AND LOWER(COALESCE(m.assessment_name, '')) = LOWER($4)
         AND m.term = $5
         ${classClause}
       ORDER BY c.surname, c.full_name`,
      params
    );
    if (!recorded.rows.length) {
      return res.status(400).json({ error: 'Save the marks before submitting the marksheet.' });
    }
    const enrolled = await db.query(
      `SELECT c.id
       FROM children c
       LEFT JOIN classes cl ON c.class_id = cl.id
       WHERE c.school_id = $2 AND c.grade = $3 AND ${enrolmentSql(1)} ${classClause}`,
      params
    );
    const recordedIds = new Set(recorded.rows.map((row) => row.id));
    const missingCount = enrolled.rows.filter((row) => !recordedIds.has(row.id)).length;
    const saved = await submissions.submit(key, recorded.rows, missingCount);
    db.query(
      `SELECT id FROM users WHERE school_id = $1 AND role_id::text IN ('1', 'admin')`,
      [key.schoolId]
    ).then((admins) => NotificationService.sendToUsers({
      userIds: admins.rows.map((row) => row.id),
      title: `Marksheet submitted: ${key.subject}`,
      message: `${key.className || 'The class'} ${key.subject} ${key.assessmentName} was submitted. ${missingCount} learners still have no mark.`,
      type: 'marks',
      targetTab: 'reports',
      authorId: key.teacherId || 1,
      sendToMessages: false,
      sendEmail: false
    })).catch((noticeError) => console.warn('Marksheet notice skipped:', noticeError.message));
    res.status(201).json({
      success: true,
      submission: saved,
      recorded_count: recorded.rows.length,
      missing_count: missingCount
    });
  } catch (error) {
    console.error('Marksheet submission failed:', error);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'The marksheet could not be submitted.' });
  }
};

exports.requestReopen = async (req, res) => {
  try {
    const key = keyFrom(req);
    const reason = String((req.body && req.body.reason) || '').trim();
    if (!reason) return res.status(400).json({ error: 'Describe the correction that is needed.' });
    const result = await submissions.requestReopen(key, reason);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.status ? error.message : 'The correction request could not be saved.' });
  }
};

exports.reopenMarksheet = async (req, res) => {
  try {
    const schoolId = parseInt(resolveSchoolId(req), 10);
    if (!Number.isInteger(schoolId)) {
      return res.status(403).json({ error: 'This account is not linked to a school.' });
    }
    const opened = await submissions.reopen(schoolId, parseInt(req.params.id, 10), req.user && req.user.id);
    if (!opened) return res.status(404).json({ error: 'Submitted marksheet not found.' });
    res.json({ success: true, submission: opened });
  } catch (error) {
    res.status(500).json({ error: 'The marksheet could not be reopened.' });
  }
};
