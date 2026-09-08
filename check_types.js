const db = require('./db/db');
async function run() {
  try {
    await db.query('SELECT * FROM homework_assignments WHERE teacher_id = $1', ['347']);
    console.log('Query succeeded!');
  } catch (err) {
    console.log('Query failed with error:', err.message);
  }
  process.exit(0);
}
run();
