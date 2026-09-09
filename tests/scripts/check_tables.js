const db = require('../../db/db');

async function check() {
  try {
    const colsSchools = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'schools'
    `);
    console.log('schools columns:', colsSchools.rows);

    const colsComp = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'inter_school_competitions'
    `);
    console.log('inter_school_competitions columns:', colsComp.rows);

    const colsTextbook = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name LIKE '%textbook%'
    `);
    console.log('textbook tables:', colsTextbook.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

check();
