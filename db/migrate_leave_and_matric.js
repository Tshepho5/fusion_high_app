const db = require('./db');

async function migrateLeaveAndMatric() {
  console.log('[MIGRATION] Setting up Leave & Relief + Matric Candidate tables...');
  try {
    // 1. Educator Leave Requests Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS educator_leave_requests (
        id SERIAL PRIMARY KEY,
        teacher_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        leave_type VARCHAR(60) NOT NULL, -- 'Sick Leave', 'Family Responsibility', 'Study Leave', 'Official Workshop / Moderation', 'Special Leave'
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        total_days NUMERIC(4,1) DEFAULT 1.0,
        reason TEXT,
        document_url VARCHAR(255),
        status VARCHAR(30) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'cancelled'
        reviewed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        admin_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_leave_teacher ON educator_leave_requests(teacher_user_id);
      CREATE INDEX IF NOT EXISTS idx_leave_status ON educator_leave_requests(status);
    `);
    console.log('[MIGRATION] ✓ educator_leave_requests table ready.');

    // 2. Educator Relief Allocations Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS educator_relief_allocations (
        id SERIAL PRIMARY KEY,
        leave_request_id INTEGER REFERENCES educator_leave_requests(id) ON DELETE CASCADE,
        absent_teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        relief_teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        relief_date DATE NOT NULL,
        period_number INTEGER NOT NULL,
        grade INTEGER NOT NULL,
        classroom VARCHAR(50) DEFAULT 'Classroom 12',
        subject VARCHAR(100) NOT NULL,
        lesson_instructions TEXT,
        status VARCHAR(30) DEFAULT 'assigned', -- 'assigned', 'completed', 'acknowledged'
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_relief_date ON educator_relief_allocations(relief_date);
      CREATE INDEX IF NOT EXISTS idx_relief_teacher ON educator_relief_allocations(relief_teacher_id);
    `);
    console.log('[MIGRATION] ✓ educator_relief_allocations table ready.');

    // Seed sample leave & relief data if none exists
    const checkLeave = await db.query('SELECT COUNT(*) FROM educator_leave_requests');
    if (parseInt(checkLeave.rows[0].count, 10) === 0) {
      // Find teacher and admin IDs
      const teachers = await db.query("SELECT u.id, u.full_name, u.surname FROM users u JOIN roles r ON u.role_id = r.id WHERE LOWER(r.name) = 'teacher' LIMIT 4");
      const admins = await db.query("SELECT u.id FROM users u JOIN roles r ON u.role_id = r.id WHERE LOWER(r.name) = 'admin' LIMIT 1");
      const adminId = admins.rows[0]?.id || null;

      if (teachers.rows.length > 0) {
        const t1 = teachers.rows[0].id;
        const t2 = teachers.rows[1]?.id || t1;

        const inserted = await db.query(`
          INSERT INTO educator_leave_requests (teacher_user_id, leave_type, start_date, end_date, total_days, reason, status, reviewed_by_user_id, admin_notes)
          VALUES 
            ($1, 'Official Workshop / Moderation', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 day', 2.0, 'DBE Grade 12 Trial Examination Regional Moderation Workshop', 'approved', $2, 'Approved by Principal - Relief cover allocated.'),
            ($3, 'Sick Leave', CURRENT_DATE + INTERVAL '3 days', CURRENT_DATE + INTERVAL '4 days', 2.0, 'Medical consultation and recovery', 'pending', NULL, NULL)
          RETURNING id;
        `, [t1, adminId, t2]);

        const leaveId = inserted.rows[0]?.id;
        if (leaveId && teachers.rows.length >= 2) {
          const reliefTeacherId = teachers.rows[1].id;
          await db.query(`
            INSERT INTO educator_relief_allocations (leave_request_id, absent_teacher_id, relief_teacher_id, relief_date, period_number, grade, classroom, subject, lesson_instructions, status)
            VALUES
              ($1, $2, $3, CURRENT_DATE, 2, 12, 'Room 14B', 'Mathematics', 'Direct candidates to complete Past Paper 1 Section B (Calculus & Functions).', 'assigned'),
              ($1, $2, $3, CURRENT_DATE, 4, 11, 'Science Lab 2', 'Physical Sciences', 'Supervise Newton Laws problem set in CAPS study guide p. 84-90.', 'assigned');
          `, [leaveId, t1, reliefTeacherId]);
          console.log('[MIGRATION] ✓ Sample leave requests & relief periods seeded.');
        }
      }
    }

    console.log('[MIGRATION] Leave & Relief schema setup completed successfully!');
  } catch (err) {
    console.error('[MIGRATION] Error migrating leave and matric tables:', err);
    throw err;
  }
}

if (require.main === module) {
  migrateLeaveAndMatric()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = migrateLeaveAndMatric;
