const db = require('../../db/db');

async function check() {
  const app = await db.query(`SELECT * FROM applications WHERE application_number ILIKE '%88444%'`);
  console.log('--- APPLICATIONS ---');
  console.log(app.rows);

  const usr = await db.query(`SELECT * FROM users WHERE email ILIKE '%bontle%'`);
  console.log('--- USERS ---');
  console.log(usr.rows);

  await db.query(`DELETE FROM parent_portal_applications WHERE parent_email = 'bontlepretty222@gmail.com'`);
  console.log('Cleaned up bontlepretty222@gmail.com');

  process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });
