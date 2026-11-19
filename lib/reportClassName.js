'use strict';

function resolveReportClassName({ requested, classesInGrade }) {
  const name = String(requested || '').trim();
  const classes = [...new Set((Array.isArray(classesInGrade) ? classesInGrade : [])
    .map((item) => String(item || '').trim())
    .filter(Boolean))];
  if (!name || name.toLowerCase() === 'all') return { ok: false, error: 'Choose one class.' };
  const exact = classes.find((item) => item.toLowerCase() === name.toLowerCase());
  if (exact) return { ok: true, className: exact };
  if (/^\d+$/.test(name)) {
    const matches = classes.filter((item) => item.toLowerCase().startsWith(name.toLowerCase()) && item.toLowerCase() !== name.toLowerCase());
    if (matches.length === 1) return { ok: true, className: matches[0] };
    if (matches.length > 1) return { ok: false, error: 'Choose the class, such as 10A. This grade has more than one class.' };
    return { ok: false, error: 'Choose the class name recorded for this grade.' };
  }
  if (!classes.length) return { ok: true, className: name };
  return { ok: false, error: 'That class is not in this grade.' };
}

module.exports = { resolveReportClassName };
