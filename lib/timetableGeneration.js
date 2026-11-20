'use strict';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

function normalise(value) {
  return String(value || '').trim().toLowerCase();
}

function assignmentMatches(assignment, classRow, subject) {
  if (!assignment || !classRow) return false;
  if (normalise(assignment.subject_name) !== normalise(subject)) return false;
  if (Number(assignment.grade_level) !== Number(classRow.grade)) return false;
  if (assignment.class_id != null && classRow.id != null && String(assignment.class_id) === String(classRow.id)) {
    return true;
  }
  const assignedClass = normalise(assignment.class_name);
  if (!assignedClass) return false;
  return assignedClass === normalise(classRow.name);
}

function teacherKey(teacherId) {
  return String(teacherId);
}

function teacherIsFree(teacherId, day, period, busy, daily, maxDailySlots) {
  const key = teacherKey(teacherId);
  if (busy.get(key) && busy.get(key).has(`${day}|${period}`)) return false;
  const count = daily.get(key) && daily.get(key).get(day);
  return (count || 0) < maxDailySlots;
}

function markTeacher(teacherId, day, period, busy, daily) {
  const key = teacherKey(teacherId);
  if (!busy.has(key)) busy.set(key, new Set());
  busy.get(key).add(`${day}|${period}`);
  if (!daily.has(key)) daily.set(key, new Map());
  daily.get(key).set(day, (daily.get(key).get(day) || 0) + 1);
}

/**
 * Places only subjects configured for the grade and teachers assigned to that class.
 * A missing assignment stays unplaced. A room is copied from the class record or left empty.
 */
function buildClassProposal({ classes, subjects, assignments, periods, maxDailySlots = 3 }) {
  const timetableData = {};
  const gaps = [];
  const busy = new Map();
  const daily = new Map();
  let filled = 0;
  const subjectList = [...new Set((subjects || []).map((name) => String(name || '').trim()).filter(Boolean))];
  const usable = [];

  (classes || []).forEach((classRow) => {
    const stream = String(classRow.stream || '').trim();
    const className = classRow.name ? String(classRow.name) : null;
    if (!stream) {
      gaps.push({ class_name: className, reason: 'This class has no stream recorded.' });
      return;
    }
    if (subjectList.length === 0) {
      gaps.push({ class_name: className, reason: 'No subjects are configured for this grade and year.' });
      return;
    }
    usable.push(classRow);
    timetableData[className] = {};
    DAYS.forEach((day) => {
      timetableData[className][day] = {};
    });
  });

  DAYS.forEach((day, dayIndex) => {
    (periods || []).forEach((period, periodIndex) => {
      usable.forEach((classRow, classIndex) => {
        const className = String(classRow.name);
        const used = new Set(Object.values(timetableData[className][day]).map((slot) => slot.subject));
        const candidates = subjectList.filter((subject) => !used.has(subject));
        if (candidates.length === 0) {
          gaps.push({
            class_name: className,
            day,
            period,
            reason: 'Every configured subject is already placed on this day.'
          });
          return;
        }
        const start = (dayIndex + periodIndex + classIndex) % candidates.length;
        let placed = false;
        for (let offset = 0; offset < candidates.length; offset += 1) {
          const subject = candidates[(start + offset) % candidates.length];
          const assignment = (assignments || []).find((row) => (
            assignmentMatches(row, classRow, subject)
            && teacherIsFree(row.teacher_id, day, period, busy, daily, maxDailySlots)
          ));
          if (!assignment) continue;
          markTeacher(assignment.teacher_id, day, period, busy, daily);
          const teacherName = `${assignment.full_name || ''} ${assignment.surname || ''}`.trim();
          timetableData[className][day][period] = {
            subject,
            teacher_id: assignment.teacher_id,
            teacher: teacherName || null,
            room: classRow.room_number ? String(classRow.room_number) : null,
            duration: '1 Hour (60 min)'
          };
          filled += 1;
          placed = true;
          break;
        }
        if (!placed) {
          gaps.push({
            class_name: className,
            day,
            period,
            reason: 'No teacher assignment is free for the subjects configured for this class.'
          });
        }
      });
    });
  });

  return { timetable_data: timetableData, gaps, filled_count: filled };
}

module.exports = { buildClassProposal, assignmentMatches, DAYS };
