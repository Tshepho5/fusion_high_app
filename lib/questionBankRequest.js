'use strict';

const FIELD_PATTERNS = {
  grade: /^\d{1,2}$/,
  subject: /^[A-Za-z][A-Za-z &'()-]{1,60}$/,
  topic: /^[A-Za-z0-9][A-Za-z0-9 &'().,-]{0,80}$/,
  qtype: /^[A-Za-z][A-Za-z _-]{0,40}$/,
  limit: /^\d{1,3}$/,
  marks: /^\d{1,3}$/,
  title: /^[A-Za-z0-9][A-Za-z0-9 &'().,:-]{0,80}$/
};

function questionBankArguments(input) {
  const clean = {};
  const source = input || {};
  for (const [key, pattern] of Object.entries(FIELD_PATTERNS)) {
    if (source[key] === undefined || source[key] === null || source[key] === '') continue;
    const value = String(source[key]).trim();
    if (!pattern.test(value)) {
      return { ok: false, error: 'The question bank request has an unsupported value.' };
    }
    clean[key] = value;
  }
  return { ok: true, args: clean };
}

module.exports = { questionBankArguments };
