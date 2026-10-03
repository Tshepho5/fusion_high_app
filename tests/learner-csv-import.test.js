const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseCsv,
  autoMapHeaders,
  buildPreview,
  mapRow
} = require('../public/src/services/learnerCsvImport');

const SAMPLE = `First Name,Surname,ID Number,Admission No,Grade,Class,Gender,Date of Birth
Lerato,Walters,0001015009087,GSA-MKG-101,10,10A,Female,2009-03-12
Thabo,Mokoena,0002025009088,GSA-MKG-102,10,10A,Male,12/05/2009
`;

describe('learner CSV / SA-SAMS mapping', () => {
  it('parses CSV with headers', () => {
    const parsed = parseCsv(SAMPLE);
    assert.equal(parsed.error, null);
    assert.equal(parsed.rows.length, 2);
    assert.ok(parsed.headers.includes('First Name'));
  });

  it('auto-maps SA-SAMS-like headers', () => {
    const parsed = parseCsv(SAMPLE);
    const mapping = autoMapHeaders(parsed.headers);
    assert.equal(mapping.full_name, 'First Name');
    assert.equal(mapping.surname, 'Surname');
    assert.equal(mapping.id_number, 'ID Number');
    assert.equal(mapping.learner_number, 'Admission No');
    assert.equal(mapping.grade, 'Grade');
    assert.equal(mapping.class_name, 'Class');
  });

  it('builds a valid preview', () => {
    const preview = buildPreview(SAMPLE);
    assert.equal(preview.success, true);
    assert.equal(preview.valid_rows, 2);
    assert.equal(preview.required_missing.length, 0);
    assert.equal(preview.rows[0].row.full_name, 'Lerato');
    assert.equal(preview.rows[1].row.dob, '2009-05-12');
  });

  it('maps Learner Info style headers', () => {
    const headers = ['LearnerName', 'Surname', 'IDNo', 'AdmNo', 'Gr', 'Register Class'];
    const mapping = autoMapHeaders(headers);
    assert.equal(mapping.full_name, 'LearnerName');
    assert.equal(mapping.id_number, 'IDNo');
    assert.equal(mapping.learner_number, 'AdmNo');
    assert.equal(mapping.grade, 'Gr');
    assert.equal(mapping.class_name, 'Register Class');
  });

  it('splits combined name when surname unmapped', () => {
    const mapping = { full_name: 'Name' };
    const row = mapRow({ Name: 'Lerato Walters' }, mapping);
    assert.equal(row.full_name, 'Lerato');
    assert.equal(row.surname, 'Walters');
  });
});
