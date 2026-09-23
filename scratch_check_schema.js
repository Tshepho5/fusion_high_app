const db = require('./db/db');
async function check() {
  const res = await db.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'marks'`);
  console.log('MARKS COLUMNS:', res.rows);
  const rc = await db.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'report_cards'`);
  console.log('REPORT_CARDS COLUMNS:', rc.rows);
  process.exit(0);
}
check().catch(console.error);
