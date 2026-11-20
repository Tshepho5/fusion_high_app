'use strict';

function recordedText(value) {
  const text = String(value == null ? '' : value).trim();
  return text || null;
}

function recordedLearnerNumber(value) {
  return recordedText(value);
}

function recordedGender(value) {
  return recordedText(value);
}

function recordedSchoolType(value) {
  return recordedText(value);
}

module.exports = {
  recordedText,
  recordedLearnerNumber,
  recordedGender,
  recordedSchoolType
};
