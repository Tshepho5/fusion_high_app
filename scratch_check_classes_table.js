const db = require('./db/db');
async function run() {
  try {
    const res = await db.query(`SELECT school_id, grade, name, stream FROM classes ORDER BY school_id, grade, name`);
    console.log(`Total classes: ${res.rows.length}`);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
run();
