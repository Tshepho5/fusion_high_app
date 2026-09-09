const db = require('../../db/db');

async function searchAll() {
  const email = 'thatojunior652@gmail.com';
  const tables = ['users', 'children', 'applications', 'parent_children', 'notifications', 'messages'];
  for (const table of tables) {
    try {
      const res = await db.query(`SELECT * FROM ${table} WHERE CAST(${table} AS text) ILIKE $1`, ['%' + email + '%']);
      console.log(table, ':', res.rows.length);
      if (res.rows.length > 0) {
        console.log(JSON.stringify(res.rows, null, 2));
      }
    } catch(e) {
      console.log(table, 'error:', e.message);
    }
  }
  process.exit(0);
}
searchAll();
