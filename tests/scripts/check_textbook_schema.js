const db = require('../../db/db');

async function check() {
  try {
    const colsAlloc = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'textbook_allocations'
    `);
    console.log('textbook_allocations columns:', colsAlloc.rows);

    const colsInv = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'textbook_inventory'
    `);
    console.log('textbook_inventory columns:', colsInv.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

check();
