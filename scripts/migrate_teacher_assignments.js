const db = require('../db/db');

async function migrate() {
  console.log('--- Starting Teacher Assignments & Passwords Migration ---');

  await db.query(`
    CREATE TABLE IF NOT EXISTS teacher_assignments (
      id SERIAL PRIMARY KEY,
      teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subject_name VARCHAR(100) NOT NULL,
      subject_code VARCHAR(50),
      grade_level INTEGER NOT NULL,
      class_name VARCHAR(50),
      class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_teacher_assignment UNIQUE (teacher_id, subject_name, grade_level, class_name)
    );
    CREATE INDEX IF NOT EXISTS idx_teacher_assignments_filter ON teacher_assignments(teacher_id, subject_name, grade_level);
    ALTER TABLE classes ADD COLUMN IF NOT EXISTS assigned_teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS previous_passwords TEXT[] DEFAULT '{}';
  `);
  console.log('✓ Tables & columns verified: teacher_assignments, classes.assigned_teacher_id, users.previous_passwords');

  // Populate teacher_assignments from employees
  const emps = await db.query('SELECT user_id, subjects, subject_codes, grades_taught, classes_taught FROM employees');
  let inserted = 0;
  for (const emp of emps.rows) {
    const subjects = emp.subjects || [];
    const grades = emp.grades_taught || [];
    const classes = emp.classes_taught || [];
    const codes = emp.subject_codes || [];

    for (let i = 0; i < subjects.length; i++) {
      const sub = subjects[i];
      const code = codes[i] || null;
      for (const grade of grades) {
        const gradeClasses = classes.filter(c => {
          const d = (c || '').replace(/\D/g, '');
          return d ? parseInt(d, 10) === grade : false;
        });
        const toInsert = gradeClasses.length > 0 ? gradeClasses : [`${grade}A`];

        for (const cls of toInsert) {
          const clsRes = await db.query('SELECT id FROM classes WHERE name = $1 LIMIT 1', [cls]);
          const classId = clsRes.rows[0]?.id || null;
          const res = await db.query(`
            INSERT INTO teacher_assignments (teacher_id, subject_name, subject_code, grade_level, class_name, class_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (teacher_id, subject_name, grade_level, class_name) DO NOTHING
          `, [emp.user_id, sub, code, grade, cls, classId]);
          if (res.rowCount > 0) inserted++;
        }
      }
    }
  }
  console.log(`✓ Migrated ${inserted} teacher assignment records from employees table.`);

  // Verify Thabang (user_id: 2)
  const thabang = await db.query('SELECT * FROM teacher_assignments WHERE teacher_id = 2 ORDER BY grade_level ASC');
  console.log(`✓ User 2 (Thabang) assignments count: ${thabang.rows.length}`);
  console.table(thabang.rows.map(r => ({
    id: r.id,
    teacher_id: r.teacher_id,
    subject: r.subject_name,
    grade: r.grade_level,
    class: r.class_name
  })));

  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
