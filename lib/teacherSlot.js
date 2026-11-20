'use strict';

function normalise(value) {
  return String(value || '').trim().toLowerCase();
}

/**
 * A slot belongs to a teacher only through a stored assignment or a stored teacher id.
 * A similar display name is not a match.
 */
function teacherOwnsSlot(slot, className, teacherId, assignments) {
  if (!slot || !teacherId) return false;
  if (slot.teacher_id != null) return String(slot.teacher_id) === String(teacherId);
  const subject = normalise(slot.subject || slot.subject_name);
  const classKey = normalise(className);
  if (!subject) return false;
  return (assignments || []).some((row) => {
    if (String(row.teacher_id) !== String(teacherId)) return false;
    if (normalise(row.subject_name) !== subject) return false;
    const assignedClass = normalise(row.class_name);
    return !assignedClass || assignedClass === classKey;
  });
}

function offeredSubjectNames(rows) {
  return [...new Set((rows || []).map((row) => String(row.subject_name || row || '').trim()).filter(Boolean))];
}

module.exports = { teacherOwnsSlot, offeredSubjectNames };
