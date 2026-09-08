const db = require('./db/db');
async function run() {
  try {
    const res = await db.query(`SELECT id, name, grade, stream, status, is_active, school_id, timetable_data FROM timetables`);
    console.log(`Total timetables: ${res.rows.length}`);
    for (const r of res.rows) {
      console.log(`Timetable ${r.id}: ${r.name}, grade=${r.grade}, school=${r.school_id}, active=${r.is_active}, keys=${Object.keys(r.timetable_data || {})}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
run();
