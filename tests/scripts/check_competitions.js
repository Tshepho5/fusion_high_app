const db = require('../../db/db');

async function check() {
  try {
    const res1 = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'inter_school_competitions'
    `);
    console.log('inter_school_competitions columns:');
    console.table(res1.rows);

    const res2 = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'schools'
    `);
    console.log('schools columns:');
    console.table(res2.rows);

    // Test running the exact query from interSchoolController.js
    console.log('\nTesting raw query without parameters:');
    const test1 = await db.query(`
      SELECT 
        c.id, c.title, c.activity_type, c.category, c.event_date, c.venue,
        c.home_score, c.away_score, c.status, c.trophy_title, c.highlights, c.created_at,
        h.id AS home_school_id, h.name AS home_school_name,
        a.id AS away_school_id, a.name AS away_school_name
      FROM inter_school_competitions c
      JOIN schools h ON c.home_school_id = h.id
      JOIN schools a ON c.away_school_id = a.id
    `);
    console.log('Test 1 succeeded, rows:', test1.rows.length);

  } catch (err) {
    console.error('Error during check:', err);
  } finally {
    process.exit(0);
  }
}

check();
