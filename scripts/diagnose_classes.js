// Read-only diagnostic: lists teacher class/assignment records that may be duplicated or malformed.
const db = require('../db/db');

(async () => {
  try {
    const teachers = await db.query(`
      SELECT u.id, u.full_name, u.surname, u.email, u.school_id
      FROM users u WHERE u.full_name ILIKE '%thabang%'`);
    console.log('TEACHERS:', teachers.rows);

    for (const t of teachers.rows) {
      const ta = await db.query(`SELECT * FROM teacher_assignments WHERE teacher_id = $1 ORDER BY grade_level, class_name`, [t.id]);
      console.log(`\nteacher_assignments for ${t.id}:`, ta.rows);
      const emp = await db.query(`SELECT user_id, school_id, subjects, grades_taught, classes_taught FROM employees WHERE user_id = $1 OR LOWER(email)=LOWER($2)`, [t.id, t.email]);
      console.log('employees:', emp.rows);
      const inv = await db.query(`SELECT id, status, school_id, subjects_offered, confirmed_subjects, assigned_grades, confirmed_grades, assigned_classes, confirmed_classes FROM staff_invites WHERE LOWER(email)=LOWER($1)`, [t.email]);
      console.log('staff_invites:', inv.rows);
      const tt = await db.query(`SELECT tt.*, c.name AS class_name FROM teacher_timetable tt LEFT JOIN classes c ON c.id = tt.class_id WHERE tt.teacher_id = $1`, [t.id]).catch(e => ({ rows: [e.message] }));
      console.log('teacher_timetable:', tt.rows);
      const cls = await db.query(`SELECT id, name, grade, stream, school_id, room_number, assigned_teacher_id, homeroom_teacher_id FROM classes WHERE assigned_teacher_id = $1 OR homeroom_teacher_id = $1`, [t.id]);
      console.log('classes linked:', cls.rows);
      if (t.school_id) {
        const all = await db.query(`SELECT id, name, grade, stream, room_number, assigned_teacher_id FROM classes WHERE school_id = $1 ORDER BY grade, name`, [t.school_id]);
        console.log(`all classes in school ${t.school_id}:`, all.rows);
      }
    }
    const weird = await db.query(`SELECT id, name, grade, school_id FROM classes WHERE name ~ '^(10|11|12)13$' OR name ILIKE '%1013%' OR name ILIKE '%1113%' OR name ILIKE '%1213%' OR grade > 12`);
    console.log('\nMALFORMED classes:', weird.rows);
    const weirdTa = await db.query(`SELECT * FROM teacher_assignments WHERE grade_level > 12 OR class_name ~ '^(10|11|12)13$'`);
    console.log('MALFORMED teacher_assignments:', weirdTa.rows);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
})();
