const db = require('./db/db');
async function run() {
  try {
    const res = await db.query(`
      SELECT u.id, u.full_name, u.surname, u.school_id, e.subjects, e.grades_taught, e.classes_taught 
      FROM users u 
      JOIN employees e ON u.id = e.user_id 
      WHERE EXISTS (SELECT 1 FROM unnest(e.subjects) s WHERE s ILIKE '%English%')
      ORDER BY u.school_id, u.id
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
run();
