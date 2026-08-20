const { Pool } = require('pg');
require('dotenv').config();

const localPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'FUSION_DB'
});

const cloudPool = new Pool({
  connectionString: 'postgresql://fusion_high_db_user:hmYNReP72H9Nne5px8hbNbCWVts1xgpD@dpg-da3haqdg1s2s73dkactg-a.oregon-postgres.render.com/fusion_high_db',
  ssl: { rejectUnauthorized: false }
});

async function syncData() {
  console.log('🔄 Starting Clean Sync of All Local Users & Data to Render Cloud...');

  const localClient = await localPool.connect();
  const cloudClient = await cloudPool.connect();

  try {
    // Clean dependent tables on cloud first
    console.log('🧹 Preparing cloud tables for clean import...');
    await cloudClient.query(`
      ALTER TABLE progress DROP CONSTRAINT IF EXISTS progress_term_check;
      ALTER TABLE progress ALTER COLUMN term TYPE VARCHAR(50) USING term::varchar;

      TRUNCATE TABLE 
        progress, attendance, parent_children, children, employees, 
        ptc_bookings, ptc_slots, conduct_logs, educator_relief_allocations, 
        educator_leave_requests, notifications, messages, announcements, 
        classes, subjects, users
      CASCADE;
    `);

    // 1. Sync Roles
    console.log('1. Syncing Roles...');
    const roles = await localClient.query('SELECT * FROM roles ORDER BY id ASC');
    for (const r of roles.rows) {
      await cloudClient.query(
        'INSERT INTO roles (id, name) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET id = EXCLUDED.id',
        [r.id, r.name]
      );
    }
    await cloudClient.query("SELECT setval('roles_id_seq', (SELECT MAX(id) FROM roles))");

    // 2. Sync Departments
    console.log('2. Syncing Departments...');
    const depts = await localClient.query('SELECT * FROM departments ORDER BY id ASC');
    for (const d of depts.rows) {
      await cloudClient.query(
        'INSERT INTO departments (id, name, description) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING',
        [d.id, d.name, d.description]
      );
    }
    await cloudClient.query("SELECT setval('departments_id_seq', (SELECT MAX(id) FROM departments))");

    // 3. Sync Employee Roles
    console.log('3. Syncing Employee Roles...');
    const empRoles = await localClient.query('SELECT * FROM employee_roles ORDER BY id ASC');
    for (const er of empRoles.rows) {
      await cloudClient.query(
        'INSERT INTO employee_roles (id, name) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
        [er.id, er.name]
      );
    }
    await cloudClient.query("SELECT setval('employee_roles_id_seq', (SELECT MAX(id) FROM employee_roles))");

    // 4. Sync Users (preserving exact passwords, salts, and IDs)
    console.log('4. Syncing all 36+ Users with exact password hashes...');
    const users = await localClient.query('SELECT * FROM users ORDER BY id ASC');
    for (const u of users.rows) {
      await cloudClient.query(`
        INSERT INTO users (
          id, email, password_hash, role_id, full_name, surname, id_number, dob, 
          gender, phone, physical_address, country, race, parent_type, reset_code, 
          reset_expiry, profile_picture_path, preferences, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      `, [
        u.id, u.email, u.password_hash, u.role_id, u.full_name, u.surname, u.id_number, u.dob,
        u.gender, u.phone, u.physical_address, u.country, u.race, u.parent_type, u.reset_code,
        u.reset_expiry, u.profile_picture_path, u.preferences, u.created_at
      ]);
    }
    await cloudClient.query("SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users))");

    // 5. Sync Employees
    console.log('5. Syncing Employees...');
    const employees = await localClient.query('SELECT * FROM employees ORDER BY id ASC');
    for (const e of employees.rows) {
      await cloudClient.query(`
        INSERT INTO employees (
          id, user_id, employee_role_id, full_name, surname, department_id, subjects, 
          subject_codes, grades_taught, classes_taught, phone, email, hired_date, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `, [
        e.id, e.user_id, e.employee_role_id, e.full_name, e.surname, e.department_id, e.subjects,
        e.subject_codes, e.grades_taught, e.classes_taught, e.phone, e.email, e.hired_date, e.created_at
      ]);
    }
    await cloudClient.query("SELECT setval('employees_id_seq', (SELECT COALESCE(MAX(id), 1) FROM employees))");

    // 6. Sync Classes & Subjects
    console.log('6. Syncing Classes & Subjects...');
    const classes = await localClient.query('SELECT * FROM classes ORDER BY id ASC');
    for (const c of classes.rows) {
      await cloudClient.query(`
        INSERT INTO classes (id, name, grade, stream, homeroom_teacher_id)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (name) DO UPDATE SET
          grade = EXCLUDED.grade,
          stream = EXCLUDED.stream,
          homeroom_teacher_id = EXCLUDED.homeroom_teacher_id
      `, [c.id, c.name, c.grade, c.stream, c.homeroom_teacher_id]);
    }
    await cloudClient.query("SELECT setval('classes_id_seq', (SELECT COALESCE(MAX(id), 1) FROM classes))");

    const subjects = await localClient.query('SELECT * FROM subjects ORDER BY id ASC');
    for (const s of subjects.rows) {
      await cloudClient.query(`
        INSERT INTO subjects (id, name, code, grade, stream)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (code) DO NOTHING
      `, [s.id, s.name, s.code, s.grade, s.stream]);
    }
    await cloudClient.query("SELECT setval('subjects_id_seq', (SELECT COALESCE(MAX(id), 1) FROM subjects))");

    // 7. Sync Children & Parent_Children
    console.log('7. Syncing Children...');
    const children = await localClient.query('SELECT * FROM children ORDER BY id ASC');
    for (const ch of children.rows) {
      await cloudClient.query(`
        INSERT INTO children (
          id, parent_id, secondary_parent_id, learner_user_id, full_name, surname, 
          dob, grade, stream, home_language, learner_number, application_number, subjects, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `, [
        ch.id, ch.parent_id, ch.secondary_parent_id, ch.learner_user_id, ch.full_name, ch.surname,
        ch.dob, ch.grade, ch.stream, ch.home_language, ch.learner_number, ch.application_number, ch.subjects, ch.created_at
      ]);
    }
    await cloudClient.query("SELECT setval('children_id_seq', (SELECT COALESCE(MAX(id), 1) FROM children))");

    const pc = await localClient.query('SELECT * FROM parent_children');
    for (const link of pc.rows) {
      await cloudClient.query(`
        INSERT INTO parent_children (parent_id, child_id, relationship, is_primary)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (parent_id, child_id) DO NOTHING
      `, [link.parent_id, link.child_id, link.relationship, link.is_primary]);
    }

    // 8. Sync Progress / Marks
    console.log('8. Syncing Progress & Marks...');
    const progress = await localClient.query('SELECT * FROM progress ORDER BY id ASC');
    for (const p of progress.rows) {
      await cloudClient.query(`
        INSERT INTO progress (
          id, child_id, subject, term, assessment_type, score, total_marks, grade_symbol, notes, recorded_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [p.id, p.child_id, p.subject, p.term, p.assessment_type, p.score, p.total_marks, p.grade_symbol, p.notes, p.recorded_by, p.created_at]);
    }
    if (progress.rows.length > 0) {
      await cloudClient.query("SELECT setval('progress_id_seq', (SELECT COALESCE(MAX(id), 1) FROM progress))");
    }

    // 9. Sync Attendance
    console.log('9. Syncing Attendance...');
    const att = await localClient.query('SELECT * FROM attendance ORDER BY id ASC');
    for (const a of att.rows) {
      await cloudClient.query(`
        INSERT INTO attendance (id, child_id, attendance_date, status, reason, recorded_by, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [a.id, a.child_id, a.attendance_date, a.status, a.reason, a.recorded_by, a.created_at]);
    }
    if (att.rows.length > 0) {
      await cloudClient.query("SELECT setval('attendance_id_seq', (SELECT COALESCE(MAX(id), 1) FROM attendance))");
    }

    // 10. Sync Timetables, Announcements, Events, Messages
    console.log('10. Syncing Timetables & Announcements...');
    const tt = await localClient.query('SELECT * FROM timetables ORDER BY id ASC');
    for (const t of tt.rows) {
      await cloudClient.query(`
        INSERT INTO timetables (id, name, grade, stream, timetable_data, status, is_active, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [t.id, t.name, t.grade, t.stream, t.timetable_data, t.status, t.is_active, t.created_by, t.created_at, t.updated_at]);
    }
    if (tt.rows.length > 0) {
      await cloudClient.query("SELECT setval('timetables_id_seq', (SELECT COALESCE(MAX(id), 1) FROM timetables))");
    }

    const ann = await localClient.query('SELECT * FROM announcements ORDER BY id ASC');
    for (const a of ann.rows) {
      await cloudClient.query(`
        INSERT INTO announcements (id, title, content, author_id, audience, target_role, target_grade, category, is_pinned, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [a.id, a.title, a.content, a.author_id, a.audience, a.target_role, a.target_grade, a.category, a.is_pinned, a.created_at]);
    }
    if (ann.rows.length > 0) {
      await cloudClient.query("SELECT setval('announcements_id_seq', (SELECT COALESCE(MAX(id), 1) FROM announcements))");
    }

    console.log('🎉 ALL 36+ REAL USERS, PASSWORDS, CHILDREN, AND MARKS SUCCESSFULLY SYNCED TO RENDER!');
  } catch (err) {
    console.error('❌ Sync Error:', err);
  } finally {
    localClient.release();
    cloudClient.release();
    await localPool.end();
    await cloudPool.end();
  }
}

syncData();
