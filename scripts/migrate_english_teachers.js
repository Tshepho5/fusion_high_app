const db = require('../db/db');

async function migrateEnglishTeachers() {
  try {
    const englishUserIds = [6, 337, 342, 346, 350, 354, 358, 362, 366, 370, 374, 378];
    const grades = [8, 9, 10, 11, 12];
    const classes = ['8A', '8B', '9A', '9B', '10A', '10B', '11A', '11B', '12A', '12B'];

    const res = await db.query(
      `UPDATE employees 
       SET grades_taught = $1, 
           classes_taught = $2
       WHERE user_id = ANY($3::int[])
       RETURNING user_id, grades_taught, classes_taught`,
      [grades, classes, englishUserIds]
    );

    console.log(`Successfully updated ${res.rows.length} English educators to Grades 8-12.`);
    res.rows.forEach(r => {
      console.log(`User ${r.user_id}: Grades ${JSON.stringify(r.grades_taught)}, Classes ${JSON.stringify(r.classes_taught)}`);
    });
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    process.exit(0);
  }
}

migrateEnglishTeachers();
