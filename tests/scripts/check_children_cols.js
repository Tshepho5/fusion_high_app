const db = require('../../db/db');

async function check() {
  const r = await db.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'children'
  `);
  console.log('children columns:', r.rows.map(c => c.column_name));

  const hasIsActive = r.rows.some(c => c.column_name === 'is_active');
  console.log('Has is_active column:', hasIsActive);
  process.exit(0);
}
check();
