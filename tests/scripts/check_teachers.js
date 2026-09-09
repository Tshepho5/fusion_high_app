const db = require('../../db/db');

async function check() {
  const teachers = await db.query(`
    SELECT u.id, u.full_name, u.surname, u.email, e.subjects, e.grades_taught, e.classes_taught 
    FROM users u 
    JOIN roles r ON u.role_id = r.id 
    LEFT JOIN employees e ON u.id = e.user_id 
    WHERE r.name = 'teacher'
  `);
  console.log('--- TEACHERS ---');
  console.log(teachers.rows);

  const classes = await db.query(`SELECT * FROM classes LIMIT 10`);
  console.log('--- CLASSES ---');
  console.log(classes.rows);

  const children = await db.query(`SELECT id, full_name, surname, grade, class_id FROM children LIMIT 10`);
  console.log('--- CHILDREN ---');
  console.log(children.rows);

  process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });
