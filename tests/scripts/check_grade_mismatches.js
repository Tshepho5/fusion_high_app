const db = require('../db/db');

async function checkMismatches() {
  const res = await db.query(`
    SELECT id, grade, subject, title, file_name, file_path 
    FROM textbooks 
    WHERE grade IS NULL 
       OR (title ILIKE '%Grade 10%' AND grade != 10) 
       OR (title ILIKE '%Grade 11%' AND grade != 11)
       OR (title ILIKE '%Grade 12%' AND grade != 12)
       OR (title ILIKE '%Grade 8%' AND grade != 8)
       OR (title ILIKE '%Grade 9%' AND grade != 9)
  `);

  console.log('Mismatched / NULL grade rows:', res.rows.length);
  console.table(res.rows);

  // Also check all Physical Sciences rows in textbooks
  const physRes = await db.query(`
    SELECT id, grade, subject, title, file_name 
    FROM textbooks 
    WHERE subject ILIKE '%Physical%' 
    ORDER BY grade, id
  `);
  console.log('\nAll Physical Sciences rows:', physRes.rows.length);
  console.table(physRes.rows);

  process.exit(0);
}

checkMismatches().catch(console.error);
