'use strict';

function loadedTutorGrade(grade, availableGrades) {
  const value = String(grade ?? '');
  return (availableGrades || []).map(String).includes(value) ? value : null;
}

module.exports = { loadedTutorGrade };
