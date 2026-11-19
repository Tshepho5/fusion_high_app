'use strict';

function compareExtractedDocument({ text, surname, idNumber }) {
  const source = String(text || '');
  const readable = source.trim().length >= 10;
  if (!readable) {
    return { readable: false, surname_present: null, id_present: null, model_called: false };
  }
  const expectedSurname = String(surname || '').trim().toLowerCase();
  const surnamePresent = expectedSurname.length >= 2
    ? source.toLowerCase().includes(expectedSurname)
    : null;
  const digits = String(idNumber || '').replace(/\D/g, '');
  const idPresent = digits.length === 13
    ? source.replace(/\s/g, '').includes(digits)
    : null;
  return { readable: true, surname_present: surnamePresent, id_present: idPresent, model_called: false };
}

module.exports = { compareExtractedDocument };
