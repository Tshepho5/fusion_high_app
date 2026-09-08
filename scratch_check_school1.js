const db = require('./db/db');
async function run() {
  try {
    const res = await db.query(`
      SELECT e.id as emp_id, u.id as user_id, u.full_name, u.surname, u.email, u.school_id, e.subjects, e.grades_taught, e.classes_taught
      FROM employees e
      JOIN users u ON e.user_id = u.id
      WHERE u.school_id = 1
      ORDER BY u.id
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
run();
