'use strict';

const db = require('../../../../db/db');
const { resolveSchoolId } = require('../../services/schoolScope');
const { teacherMayViewClassReport, verificationDecision, correctionNotice } = require('../../../../lib/reportVerification');
const verifications = require('../../services/reportVerificationService');
const NotificationService = require('../../services/notificationService');

function termNumber(value) {
  return parseInt(String(value || '').replace(/[^0-9]/g, ''), 10);
}

async function notifyUsers(userIds, notice, authorId, metadata) {
  if (!userIds.length) return;
  await NotificationService.sendToUsers({
    userIds,
    title: notice.title,
    message: notice.message,
    type: 'reports',
    targetTab: notice.targetTab,
    metadata,
    authorId: authorId || 1,
    sendToMessages: false,
    sendEmail: false
  }).catch((error) => console.warn('Report notice skipped:', error.message));
}

exports.listClassReports = async (req, res) => {
  try {
    const schoolId = parseInt(resolveSchoolId(req), 10);
    const teacherId = req.user && req.user.id;
    if (!Number.isInteger(schoolId) || !teacherId) {
      return res.status(403).json({ error: 'This account is not linked to a school.' });
    }
    const classes = await db.query(
      `SELECT id, name, grade, homeroom_teacher_id, assigned_teacher_id
       FROM classes
       WHERE school_id = $1
         AND (homeroom_teacher_id = $2 OR assigned_teacher_id = $2)
       ORDER BY grade, name`,
      [schoolId, teacherId]
    );
    res.json({ classes: classes.rows });
  } catch (error) {
    res.status(500).json({ error: 'The assigned classes could not be loaded.' });
  }
};

exports.decideReportBatch = async (req, res) => {
  try {
    const schoolId = parseInt(resolveSchoolId(req), 10);
    const teacherId = req.user && req.user.id;
    const grade = parseInt(req.body.grade, 10);
    const className = String(req.body.class_name || req.body.class || '').trim();
    const term = termNumber(req.body.term);
    const academicYear = parseInt(req.body.academic_year, 10) || new Date().getFullYear();
    const checked = verificationDecision(req.body);
    if (!Number.isInteger(schoolId) || !teacherId) return res.status(403).json({ error: 'This account is not linked to a school.' });
    if (!checked.ok) return res.status(400).json({ error: checked.error });
    if (!Number.isInteger(grade) || !className || !Number.isInteger(term)) {
      return res.status(400).json({ error: 'Choose the class and term.' });
    }
    const classRow = await db.query(
      `SELECT homeroom_teacher_id, assigned_teacher_id
       FROM classes
       WHERE school_id = $1 AND grade = $2 AND LOWER(name) = LOWER($3)
       LIMIT 1`,
      [schoolId, grade, className]
    );
    const row = classRow.rows[0];
    if (!row || !teacherMayViewClassReport({
      teacherId,
      homeroomTeacherId: row.homeroom_teacher_id,
      assignedTeacherId: row.assigned_teacher_id
    })) {
      return res.status(403).json({ error: 'Only the class teacher assigned to this class can verify its reports.' });
    }
    let learner = null;
    let routedTeacherId = null;
    if (checked.decision === 'returned') {
      const learnerResult = await db.query(
        `SELECT c.id, c.full_name, c.surname, c.learner_number
         FROM children c
         LEFT JOIN classes cl ON c.class_id = cl.id
         WHERE c.school_id = $1 AND c.grade = $2 AND LOWER(COALESCE(cl.name, '')) = LOWER($3)
           AND ($4::int IS NULL OR c.id = $4)
           AND ($5 = '' OR c.learner_number = $5)
         LIMIT 1`,
        [schoolId, grade, className, checked.learnerId, checked.learnerNumber || '']
      );
      learner = learnerResult.rows[0];
      if (!learner) return res.status(404).json({ error: 'That learner is not in this class.' });
      const teacherResult = await db.query(
        `SELECT teacher_id
         FROM teacher_assignments
         WHERE grade_level = $1 AND LOWER(subject_name) = LOWER($2)
           AND (LOWER(COALESCE(class_name, '')) = LOWER($3) OR COALESCE(class_name, '') = '')
         ORDER BY CASE WHEN LOWER(COALESCE(class_name, '')) = LOWER($3) THEN 0 ELSE 1 END
         LIMIT 1`,
        [grade, checked.subject, className]
      ).catch(() => ({ rows: [] }));
      routedTeacherId = teacherResult.rows[0] ? teacherResult.rows[0].teacher_id : null;
      await verifications.archiveClassReports({
        schoolId, grade, className, term, academicYear, reason: checked.reason, userId: teacherId
      });
    }
    const saved = await verifications.recordDecision({
      schoolId, academicYear, grade, className, termNumber: term, teacherId,
      decision: checked.decision, reason: checked.reason,
      learnerId: learner ? learner.id : null,
      subject: checked.subject || null,
      routedTeacherId
    });
    const learnerName = learner ? [learner.full_name, learner.surname].filter(Boolean).join(' ') : '';
    const notice = correctionNotice({
      decision: checked.decision,
      className,
      learnerName,
      subject: checked.subject,
      reason: checked.reason
    });
    const recipients = checked.decision === 'returned'
      ? [routedTeacherId]
      : [row.homeroom_teacher_id, row.assigned_teacher_id];
    await notifyUsers(recipients.filter(Boolean), notice, teacherId, {
      class_name: className,
      grade,
      term,
      learner_id: learner ? learner.id : null,
      subject: checked.subject || null
    });
    res.status(201).json({
      success: true,
      verification: saved,
      preserved_report: checked.decision === 'returned',
      routed_teacher_id: routedTeacherId
    });
  } catch (error) {
    console.error('Report decision failed:', error);
    res.status(500).json({ error: 'The report decision could not be saved.' });
  }
};
