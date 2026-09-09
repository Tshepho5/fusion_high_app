const db = require('../../db/db');

async function test() {
  try {
    const res = await db.query(`
      SELECT column_name, column_default, is_nullable, data_type
      FROM information_schema.columns
      WHERE table_name = 'inter_school_competitions'
    `);
    console.log(res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

test();
