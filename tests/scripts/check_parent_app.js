const db = require('../../db/db');

async function test() {
  const cols = await db.query(`
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'parent_portal_applications' 
    ORDER BY ordinal_position
  `);
  console.log('--- parent_portal_applications columns ---');
  console.log(cols.rows);

  process.exit(0);
}

test().catch(e => { console.error(e); process.exit(1); });
