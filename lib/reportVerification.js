'use strict';

function teacherMayViewClassReport({ teacherId, homeroomTeacherId, assignedTeacherId }) {
  const id = Number(teacherId);
  if (!Number.isInteger(id) || id <= 0) return false;
  return id === Number(homeroomTeacherId) || id === Number(assignedTeacherId);
}

function verificationDecision(input) {
  const decision = String(input && input.decision || '').toLowerCase();
  const reason = String(input && input.reason || '').trim();
  if (decision !== 'approved' && decision !== 'returned') {
    return { ok: false, error: 'Choose approve or return.' };
  }
  if (decision === 'approved') return { ok: true, decision, reason };
  const subject = String(input && input.subject || '').trim();
  const learnerNumber = String(input && input.learner_number || '').trim();
  const learnerId = parseInt(input && input.learner_id, 10);
  if (!reason) return { ok: false, error: 'A returned report needs a reason.' };
  if (!subject || (!learnerNumber && !Number.isInteger(learnerId))) {
    return { ok: false, error: 'Name the learner and the subject that need correction.' };
  }
  return {
    ok: true,
    decision,
    reason,
    subject,
    learnerNumber,
    learnerId: Number.isInteger(learnerId) ? learnerId : null
  };
}

function correctionNotice({ decision, className, learnerName, subject, reason }) {
  if (decision === 'returned') {
    return {
      title: `Report correction for ${className}`,
      message: `${learnerName || 'A learner'} needs a correction in ${subject}. ${reason}`,
      targetTab: 'assessments'
    };
  }
  return {
    title: `Reports approved for ${className}`,
    message: `The class teacher approved the ${className} reports.`,
    targetTab: 'reports'
  };
}

module.exports = { teacherMayViewClassReport, verificationDecision, correctionNotice };
