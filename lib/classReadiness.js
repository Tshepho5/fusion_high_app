'use strict';

function keyOf(value) {
  return String(value || '').trim().toLowerCase();
}

function assembleClassReadiness({ learners, teachers, submissions, authorizations, marks }) {
  const classes = new Map();
  (Array.isArray(learners) ? learners : []).forEach((learner) => {
    const className = String(learner.class_name || learner.grade || '').trim() || 'Unassigned';
    if (!classes.has(className)) classes.set(className, new Map());
    const subjects = Array.isArray(learner.subjects) ? learner.subjects : [];
    subjects.forEach((subject) => {
      const name = String(subject || '').trim();
      if (!name) return;
      const bucket = classes.get(className);
      const id = keyOf(name);
      if (!bucket.has(id)) bucket.set(id, { subject: name, enrolled: 0 });
      bucket.get(id).enrolled += 1;
    });
  });

  const result = [];
  classes.forEach((subjectMap, className) => {
    const subjects = Array.from(subjectMap.values()).map((subject) => {
      const teacher = (Array.isArray(teachers) ? teachers : []).find((row) =>
        keyOf(row.subject) === keyOf(subject.subject)
        && (keyOf(row.class_name) === keyOf(className) || !String(row.class_name || '').trim())
      );
      const submitted = (Array.isArray(submissions) ? submissions : []).filter((row) =>
        keyOf(row.subject) === keyOf(subject.subject) && keyOf(row.class_name) === keyOf(className) && row.status === 'submitted'
      );
      const calculation = (Array.isArray(authorizations) ? authorizations : []).find((row) =>
        keyOf(row.subject) === keyOf(subject.subject) && keyOf(row.class_name) === keyOf(className)
      );
      const calculationStatus = calculation ? calculation.status : 'missing';
      const markedRow = (Array.isArray(marks) ? marks : []).find((row) =>
        keyOf(row.subject) === keyOf(subject.subject) && keyOf(row.class_name) === keyOf(className)
      );
      const markedCount = markedRow ? Number(markedRow.marked) || 0 : 0;
      const ready = subject.enrolled > 0 && submitted.length > 0 && calculationStatus === 'authorized';
      return {
        subject: subject.subject,
        teacher: teacher ? teacher.teacher : null,
        enrolled: subject.enrolled,
        marks_recorded: markedCount,
        missing_marks: Math.max(0, subject.enrolled - markedCount),
        submitted_assessments: submitted.length,
        calculation_status: calculationStatus,
        ready
      };
    }).sort((left, right) => left.subject.localeCompare(right.subject));
    const ready = subjects.length > 0 && subjects.every((subject) => subject.ready);
    result.push({
      class_name: className,
      status: ready ? 'ready' : 'incomplete',
      subjects
    });
  });
  result.sort((left, right) => left.class_name.localeCompare(right.class_name));
  return {
    classes: result,
    ready: result.length > 0 && result.every((row) => row.status === 'ready')
  };
}

module.exports = { assembleClassReadiness };
