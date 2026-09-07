const db = require('../db/db');

function mapSubjectQuery(raw) {
  if (!raw) return '%';
  const s = raw.toLowerCase().trim();
  if (s.includes('math') && !s.includes('lit')) return 'Mathematics';
  if (s.includes('phys') || s.includes('chem') || s.includes('physical')) return 'Physical Sciences';
  if (s.includes('life sc') || s.includes('bio')) return 'Life Sciences';
  if (s.includes('acc')) return 'Accounting';
  if (s.includes('bus')) return 'Business Studies';
  if (s.includes('econ')) return 'Economics';
  if (s.includes('eng')) return 'English FAL';
  if (s.includes('lit')) return 'Mathematical Literacy';
  if (s.includes('tour')) return 'Tourism';
  if (s.includes('geog')) return 'Geography';
  if (s.includes('hist')) return 'History';
  if (s.includes('orient') || s.includes('lo')) return 'Life Orientation';
  if (s.includes('lang') || s.includes('zulu') || s.includes('sepedi') || s.includes('xhosa') || s.includes('afrikaans') || s.includes('tswana') || s.includes('sotho')) return 'Home Language';
  if (s.includes('ems') || s.includes('economic management')) return 'EMS';
  if (s.includes('natural')) return 'Natural Sciences';
  if (s.includes('social')) return 'Social Sciences';
  if (s.includes('tech')) return 'Technology';
  return raw;
}

async function runTest() {
  const tests = [
    { grade: 10, subject: 'Mathematics' },
    { grade: 10, subject: 'Physical Sciences' },
    { grade: 10, subject: 'Life Sciences' },
    { grade: 10, subject: 'English FAL' },
    { grade: 10, subject: 'isiZulu Home Language' },
    { grade: 10, subject: 'Accounting' },
    { grade: 10, subject: 'Business Studies' },
    { grade: 10, subject: 'Economics' },
    { grade: 10, subject: 'Mathematical Literacy' },
    { grade: 11, subject: 'Mathematics' },
    { grade: 11, subject: 'Physical Sciences' },
    { grade: 11, subject: 'Life Sciences' },
    { grade: 11, subject: 'Accounting' },
    { grade: 12, subject: 'English FAL' },
    { grade: 8, subject: 'Natural Sciences' },
    { grade: 9, subject: 'Mathematics' }
  ];

  for (const t of tests) {
    const targetSub = mapSubjectQuery(t.subject);
    const query = `
      SELECT id, title, resource_type, year, file_path, file_size
      FROM textbooks t
      WHERE (
        t.subject ILIKE $1 
        OR LOWER(t.subject) = LOWER($3)
        OR $3 ILIKE '%' || t.subject || '%'
        OR $1 = '%'
      )
      AND (t.grade = $2 OR t.grade IS NULL)
      ORDER BY t.year DESC NULLS LAST, t.upload_date DESC NULLS LAST, t.id DESC
    `;
    const res = await db.query(query, [`%${targetSub}%`, t.grade, t.subject]);
    console.log(`Grade ${t.grade} - ${t.subject} (${targetSub}) -> Found: ${res.rows.length} resources`);
  }
  process.exit(0);
}

runTest().catch(console.error);
