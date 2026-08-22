const db = require('../db/db');

async function testLearnerResources() {
  console.log('Testing Learner Subject Resources query...');
  
  const subjectsToTest = [
    { grade: 10, subject: 'Mathematics' },
    { grade: 10, subject: 'Physical Sciences' },
    { grade: 10, subject: 'English FAL' },
    { grade: 11, subject: 'Mathematics' },
    { grade: 11, subject: 'Physical Sciences' },
    { grade: 12, subject: 'English FAL' },
    { grade: 12, subject: 'Mathematics' }
  ];

  for (const s of subjectsToTest) {
    const res = await db.query(
      `SELECT title, resource_type, term, year, file_name, file_size 
       FROM textbooks 
       WHERE grade = $1 AND (subject ILIKE $2 OR $2 ILIKE subject)
       ORDER BY year DESC, title ASC`,
      [s.grade, `%${s.subject}%`]
    );

    console.log(`\n=== Grade ${s.grade} - ${s.subject} (${res.rows.length} documents) ===`);
    res.rows.slice(0, 4).forEach((row, i) => {
      console.log(`  ${i + 1}. [${row.resource_type.toUpperCase()}] ${row.title} (${row.file_size})`);
    });
  }

  process.exit(0);
}

testLearnerResources().catch(console.error);
