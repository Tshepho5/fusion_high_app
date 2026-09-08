const db = require('./db/db');
async function run() {
  try {
    const res = await db.query(`SELECT u.id, u.full_name, u.email, r.name as role FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id IN (6, 36)`);
    console.log(res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
run();
