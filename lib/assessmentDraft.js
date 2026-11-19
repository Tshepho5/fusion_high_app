'use strict';

function bracketMarkTotal(text) {
  const marks = [...String(text || '').matchAll(/\[(\d+(?:\.\d+)?)\]/g)].map((match) => Number(match[1]));
  return {
    marks,
    total: marks.reduce((sum, mark) => sum + mark, 0)
  };
}

function assessmentDraft({ requestedTotal, text }) {
  const summed = bracketMarkTotal(text);
  const requested = Number(requestedTotal);
  return {
    status: 'draft',
    official: false,
    caps_verified: false,
    marks_consistent: summed.marks.length > 0 && Number.isFinite(requested) && summed.total === requested,
    summed_marks: summed.marks.length ? summed.total : null,
    requested_total: Number.isFinite(requested) ? requested : null
  };
}

module.exports = { bracketMarkTotal, assessmentDraft };
