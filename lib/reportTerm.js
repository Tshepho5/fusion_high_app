'use strict';

function termIndex(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const labeled = text.match(/term\s*([1-4])/i);
  if (labeled) return Number(labeled[1]);
  if (/^[1-4]$/.test(text)) return Number(text);
  const withoutYear = text.replace(/20\d{2}/g, '');
  const digit = withoutYear.match(/[1-4]/);
  return digit ? Number(digit[0]) : null;
}

function markPercentage(mark) {
  if (!mark || mark.score === null || mark.score === undefined || mark.score === '') return null;
  const score = Number(mark.score);
  if (!Number.isFinite(score)) return null;
  if (mark.percentage !== null && mark.percentage !== undefined && mark.percentage !== '') {
    const recorded = Number(mark.percentage);
    if (Number.isFinite(recorded)) return recorded;
  }
  const maximum = Number(mark.max_score);
  const maxScore = Number.isFinite(maximum) && maximum > 0 ? maximum : 100;
  return Math.round((score / maxScore) * 100);
}

function yearFromTerm(value) {
  const found = String(value ?? '').match(/20\d{2}/);
  return found ? Number(found[0]) : null;
}

function markBelongsToYear(mark, year) {
  const wanted = Number(year);
  if (!Number.isInteger(wanted) || wanted < 2000) return true;
  const recorded = Number(mark && mark.academic_year);
  if (Number.isInteger(recorded) && recorded >= 2000) return recorded === wanted;
  const embedded = yearFromTerm(mark && mark.term);
  if (embedded) return embedded === wanted;
  return true;
}

module.exports = { termIndex, markPercentage, yearFromTerm, markBelongsToYear };
