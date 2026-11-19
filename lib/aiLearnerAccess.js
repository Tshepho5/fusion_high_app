'use strict';

const { canReadLearnerRecord, canReadClass, positiveId } = require('./aiAccess');

async function teacherClassIds(db, teacherId, schoolId) {
  const ids = new Set();
  const add = (rows) => {
    (rows || []).forEach((row) => {
      const id = positiveId(row.id || row.class_id);
      if (id) ids.add(id);
    });
  };
  try {
    const classes = await db.query(
      `SELECT id FROM classes
       WHERE school_id = $1
         AND (homeroom_teacher_id::text = $2::text OR assigned_teacher_id::text = $2::text)`,
      [schoolId, String(teacherId)]
    );
    add(classes.rows);
  } catch (_) {}
  try {
    const timetable = await db.query(
      `SELECT DISTINCT class_id AS id FROM teacher_timetable
       WHERE teacher_id::text = $1::text AND class_id IS NOT NULL`,
      [String(teacherId)]
    );
    add(timetable.rows);
  } catch (_) {}
  try {
    const assignments = await db.query(
      `SELECT DISTINCT class_id AS id FROM teacher_assignments
       WHERE teacher_id::text = $1::text AND class_id IS NOT NULL`,
      [String(teacherId)]
    );
    add(assignments.rows);
  } catch (_) {}
  return [...ids];
}

async function teacherTeachesLearner(db, teacherId, learner) {
  if (!learner || !positiveId(learner.class_id) || !positiveId(learner.school_id)) return false;
  const classIds = await teacherClassIds(db, teacherId, learner.school_id);
  return classIds.includes(positiveId(learner.class_id));
}

async function parentLinkedTo(db, parentId, learner) {
  if (!learner) return false;
  if (learner.parent_id != null && String(learner.parent_id) === String(parentId)) return true;
  if (learner.secondary_parent_id != null && String(learner.secondary_parent_id) === String(parentId)) return true;
  try {
    const link = await db.query(
      `SELECT 1 FROM parent_children WHERE child_id = $1 AND parent_id::text = $2::text LIMIT 1`,
      [learner.id, String(parentId)]
    );
    return link.rows.length > 0;
  } catch (_) {
    return false;
  }
}

async function loadAuthorisedLearner(db, actor, childId) {
  const id = positiveId(childId);
  if (!actor || !actor.id || !id) return { status: 404 };
  let learner;
  try {
    const result = await db.query(
      `SELECT id, school_id, class_id, parent_id, secondary_parent_id, learner_user_id, full_name, surname, grade, stream
       FROM children WHERE id = $1 LIMIT 1`,
      [id]
    );
    learner = result.rows[0];
  } catch (err) {
    if (!/secondary_parent_id/i.test(err.message || '')) throw err;
    const result = await db.query(
      `SELECT id, school_id, class_id, parent_id, learner_user_id, full_name, surname, grade, stream
       FROM children WHERE id = $1 LIMIT 1`,
      [id]
    );
    learner = result.rows[0];
  }
  if (!learner) return { status: 404 };
  const role = String(actor.role || '').toLowerCase();
  const parentLinked = role === 'parent' ? await parentLinkedTo(db, actor.id, learner) : false;
  const teachesClass = role === 'teacher' || role === 'class_teacher'
    ? await teacherTeachesLearner(db, actor.id, learner)
    : false;
  if (!canReadLearnerRecord(actor, learner, { parentLinked, teachesClass })) return { status: 404 };
  return { status: 200, learner };
}

async function loadAuthorisedClass(db, actor, classId) {
  const id = positiveId(classId);
  if (!actor || !id) return { status: 404 };
  const result = await db.query(
    `SELECT id, school_id, name, grade FROM classes WHERE id = $1 LIMIT 1`,
    [id]
  );
  const classRow = result.rows[0];
  if (!classRow) return { status: 404 };
  const classIds = await teacherClassIds(db, actor.id, classRow.school_id);
  const teachesClass = classIds.includes(id);
  if (!canReadClass(actor, classRow, teachesClass)) return { status: 404 };
  return { status: 200, classRow };
}

module.exports = {
  teacherClassIds,
  teacherTeachesLearner,
  parentLinkedTo,
  loadAuthorisedLearner,
  loadAuthorisedClass
};
