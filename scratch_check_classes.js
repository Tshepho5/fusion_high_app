const db = require('./db/db');
async function run() {
  try {
    const res = await db.query(`
      SELECT e.id, u.id as user_id, u.full_name, u.surname, u.school_id, e.subjects, e.grades_taught, e.classes_taught
      FROM employees e
      JOIN users u ON e.user_id = u.id
      ORDER BY u.school_id, u.id
    `);
    for (const r of res.rows) {
      console.log(`[School ${r.school_id}] User ${r.user_id} (${r.full_name} ${r.surname}): subjects=${JSON.stringify(r.subjects)}, grades=${JSON.stringify(r.grades_taught)}, classes=${JSON.stringify(r.classes_taught)}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
run();
