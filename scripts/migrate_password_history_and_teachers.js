require('dotenv').config();
const db = require('../db/db');

async function migratePasswordHistory() {
  console.log('--- Migrating user_password_history table ---');

  // 1. Create user_password_history table
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_password_history (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_user_password_history_user_id ON user_password_history(user_id);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS previous_passwords TEXT[] DEFAULT '{}';
  `);
  console.log('✓ user_password_history table & index verified.');

  // 2. Populate user_password_history with current password_hash for all users
  const users = await db.query('SELECT id, password_hash, previous_passwords FROM users WHERE password_hash IS NOT NULL');
  let inserted = 0;

  for (const u of users.rows) {
    if (u.password_hash) {
      const exists = await db.query('SELECT id FROM user_password_history WHERE user_id = $1 AND password_hash = $2 LIMIT 1', [u.id, u.password_hash]);
      if (exists.rows.length === 0) {
        await db.query('INSERT INTO user_password_history (user_id, password_hash) VALUES ($1, $2)', [u.id, u.password_hash]);
        inserted++;
      }
    }

    if (u.previous_passwords && Array.isArray(u.previous_passwords)) {
      for (const prev of u.previous_passwords) {
        if (prev) {
          const exists = await db.query('SELECT id FROM user_password_history WHERE user_id = $1 AND password_hash = $2 LIMIT 1', [u.id, prev]);
          if (exists.rows.length === 0) {
            await db.query('INSERT INTO user_password_history (user_id, password_hash) VALUES ($1, $2)', [u.id, prev]);
            inserted++;
          }
        }
      }
    }
  }

  console.log(`✓ Initialized ${inserted} historical password hashes in user_password_history.`);

  // 3. Link User 1 (Tshepho Letlalo Makula) to their timetable subjects in teacher_assignments & employees
  console.log('\n--- Ensuring User 1 (202247878@myturf.ul.ac.za) subject assignments ---');
  const user1 = await db.query("SELECT id, email FROM users WHERE id = 1 OR email = '202247878@myturf.ul.ac.za'");
  if (user1.rows.length > 0) {
    const u1 = user1.rows[0];
    
    // Check teacher_timetable for user 1
    const tt1 = await db.query(`
      SELECT tt.id, tt.subject_id, s.name as subject_name, s.code as subject_code, s.grade, c.name as class_name, c.id as class_id
      FROM teacher_timetable tt
      JOIN subjects s ON s.id = tt.subject_id
      LEFT JOIN classes c ON c.id = tt.class_id
      WHERE tt.teacher_id = $1
    `, [u1.id]);

    const assignmentsToAdd = [
      { subject: 'Physical Sciences', code: 'PHSC11', grade: 11, class_name: '11A' },
      { subject: 'Physical Sciences', code: 'PHSC10', grade: 10, class_name: '10A' },
      { subject: 'Physical Sciences', code: 'PHSC12', grade: 12, class_name: '12A' },
      { subject: 'Mathematics', code: 'MATH11', grade: 11, class_name: '11A' },
      { subject: 'Mathematics', code: 'MATH10', grade: 10, class_name: '10A' },
      { subject: 'Mathematics', code: 'MATH12', grade: 12, class_name: '12A' }
    ];

    for (const a of assignmentsToAdd) {
      const clsRes = await db.query('SELECT id FROM classes WHERE name = $1 LIMIT 1', [a.class_name]);
      const classId = clsRes.rows[0]?.id || null;
      await db.query(`
        INSERT INTO teacher_assignments (teacher_id, subject_name, subject_code, grade_level, class_name, class_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (teacher_id, subject_name, grade_level, class_name) DO NOTHING
      `, [u1.id, a.subject, a.code, a.grade, a.class_name, classId]);
    }

    // Update employees record for User 1
    await db.query(`
      UPDATE employees 
      SET subjects = ARRAY['Physical Sciences', 'Mathematics'],
          subject_codes = ARRAY['PHSC11', 'MATH11'],
          grades_taught = ARRAY[10, 11, 12],
          classes_taught = ARRAY['10A', '11A', '12A']
      WHERE user_id = $1 OR LOWER(email) = LOWER($2)
    `, [u1.id, u1.email]);

    console.log(`✓ User 1 assignments successfully registered.`);
  }

  process.exit(0);
}

migratePasswordHistory().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
