const db = require('./db');

/**
 * Migration: Ensure Leave & Relief and Examination Seating schemas have all required columns
 * Idempotent, safe to run on every server startup.
 */
async function migrateLeaveAndExamSchema() {
  console.log('[MIGRATION] Verifying Educator Leave & Exam Seating database schemas...');
  try {
    // 1. Educator Leave Requests
    await db.query(`
      CREATE TABLE IF NOT EXISTS educator_leave_requests (
        id SERIAL PRIMARY KEY,
        teacher_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        leave_type VARCHAR(60) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        reason TEXT,
        status VARCHAR(30) DEFAULT 'pending',
        relief_status VARCHAR(30) DEFAULT 'unassigned',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE educator_leave_requests ADD COLUMN IF NOT EXISTS total_days NUMERIC(4,1) DEFAULT 1.0;
      ALTER TABLE educator_leave_requests ADD COLUMN IF NOT EXISTS document_url VARCHAR(255);
      ALTER TABLE educator_leave_requests ADD COLUMN IF NOT EXISTS reviewed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE educator_leave_requests ADD COLUMN IF NOT EXISTS admin_notes TEXT;
      ALTER TABLE educator_leave_requests ADD COLUMN IF NOT EXISTS school_id INTEGER;
      ALTER TABLE educator_leave_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

      CREATE INDEX IF NOT EXISTS idx_leave_teacher ON educator_leave_requests(teacher_user_id);
      CREATE INDEX IF NOT EXISTS idx_leave_status ON educator_leave_requests(status);
    `);
    console.log('[MIGRATION] ✓ educator_leave_requests schema synchronized.');

    // 2. Educator Relief Allocations
    await db.query(`
      CREATE TABLE IF NOT EXISTS educator_relief_allocations (
        id SERIAL PRIMARY KEY,
        leave_request_id INTEGER REFERENCES educator_leave_requests(id) ON DELETE CASCADE,
        absent_teacher_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        relief_teacher_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        relief_date DATE,
        period_number INTEGER,
        grade INTEGER,
        classroom VARCHAR(50) DEFAULT 'Classroom',
        subject VARCHAR(100),
        lesson_instructions TEXT,
        status VARCHAR(30) DEFAULT 'assigned',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE educator_relief_allocations ADD COLUMN IF NOT EXISTS absent_teacher_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
      ALTER TABLE educator_relief_allocations ADD COLUMN IF NOT EXISTS relief_teacher_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
      ALTER TABLE educator_relief_allocations ADD COLUMN IF NOT EXISTS relief_date DATE;
      ALTER TABLE educator_relief_allocations ADD COLUMN IF NOT EXISTS period_number INTEGER;
      ALTER TABLE educator_relief_allocations ADD COLUMN IF NOT EXISTS grade INTEGER;
      ALTER TABLE educator_relief_allocations ADD COLUMN IF NOT EXISTS classroom VARCHAR(50) DEFAULT 'Classroom';
      ALTER TABLE educator_relief_allocations ADD COLUMN IF NOT EXISTS subject VARCHAR(100);
      ALTER TABLE educator_relief_allocations ADD COLUMN IF NOT EXISTS lesson_instructions TEXT;
      ALTER TABLE educator_relief_allocations ADD COLUMN IF NOT EXISTS school_id INTEGER;

      -- Sync legacy column names if they exist
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'educator_relief_allocations' AND column_name = 'relief_teacher_user_id') THEN
          UPDATE educator_relief_allocations 
          SET relief_teacher_id = relief_teacher_user_id 
          WHERE relief_teacher_id IS NULL AND relief_teacher_user_id IS NOT NULL;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'educator_relief_allocations' AND column_name = 'subject_name') THEN
          UPDATE educator_relief_allocations 
          SET subject = subject_name 
          WHERE subject IS NULL AND subject_name IS NOT NULL;
        END IF;
      END $$;

      CREATE INDEX IF NOT EXISTS idx_relief_date ON educator_relief_allocations(relief_date);
      CREATE INDEX IF NOT EXISTS idx_relief_teacher ON educator_relief_allocations(relief_teacher_id);
    `);
    console.log('[MIGRATION] ✓ educator_relief_allocations schema synchronized.');

    // 3. Exam Sessions
    await db.query(`
      CREATE TABLE IF NOT EXISTS exam_sessions (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255),
        subject VARCHAR(150),
        grade INTEGER NOT NULL,
        stream VARCHAR(50) DEFAULT 'All',
        term VARCHAR(50) DEFAULT 'Term 3 2026',
        exam_date DATE NOT NULL,
        start_time VARCHAR(20) NOT NULL,
        end_time VARCHAR(20) NOT NULL,
        venue VARCHAR(150) DEFAULT 'Main Examination Hall',
        total_rows INTEGER DEFAULT 10,
        total_cols INTEGER DEFAULT 6,
        total_desks INTEGER DEFAULT 60,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS title VARCHAR(255);
      ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS stream VARCHAR(50) DEFAULT 'All';
      ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS term VARCHAR(50) DEFAULT 'Term 3 2026';
      ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS total_rows INTEGER DEFAULT 10;
      ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS total_cols INTEGER DEFAULT 6;
      ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS total_desks INTEGER DEFAULT 60;

      -- Backfill legacy exam_name if present
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_sessions' AND column_name = 'exam_name') THEN
          UPDATE exam_sessions SET title = exam_name WHERE title IS NULL AND exam_name IS NOT NULL;
        END IF;
      END $$;
    `);
    console.log('[MIGRATION] ✓ exam_sessions schema synchronized.');

    // 4. Exam Seating Allocations
    await db.query(`
      CREATE TABLE IF NOT EXISTS exam_seating_allocations (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
        child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
        desk_number VARCHAR(20) NOT NULL,
        attendance_status VARCHAR(30) DEFAULT 'present',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE exam_seating_allocations ADD COLUMN IF NOT EXISTS row_num INTEGER DEFAULT 1;
      ALTER TABLE exam_seating_allocations ADD COLUMN IF NOT EXISTS col_num INTEGER DEFAULT 1;
      ALTER TABLE exam_seating_allocations ADD COLUMN IF NOT EXISTS candidate_number VARCHAR(50);
      ALTER TABLE exam_seating_allocations ADD COLUMN IF NOT EXISTS attendance_status VARCHAR(30) DEFAULT 'present';

      CREATE INDEX IF NOT EXISTS idx_exam_alloc_session ON exam_seating_allocations(session_id);
      CREATE INDEX IF NOT EXISTS idx_exam_alloc_child ON exam_seating_allocations(child_id);
    `);
    console.log('[MIGRATION] ✓ exam_seating_allocations schema synchronized.');

    // 5. Extracurricular Activities
    await db.query(`
      CREATE TABLE IF NOT EXISTS extracurricular_activities (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        category VARCHAR(50) DEFAULT 'Sports',
        season VARCHAR(50) DEFAULT 'Annual',
        venue VARCHAR(150) DEFAULT 'School Sports Ground',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE extracurricular_activities ADD COLUMN IF NOT EXISTS coach_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE extracurricular_activities ADD COLUMN IF NOT EXISTS practice_schedule VARCHAR(255) DEFAULT 'Tuesdays & Thursdays 15:00 - 16:30';
      ALTER TABLE extracurricular_activities ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE extracurricular_activities ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'extracurricular_activities' AND column_name = 'coach_teacher_id') THEN
          UPDATE extracurricular_activities SET coach_user_id = coach_teacher_id WHERE coach_user_id IS NULL AND coach_teacher_id IS NOT NULL;
        END IF;
      END $$;
    `);
    console.log('[MIGRATION] ✓ extracurricular_activities schema synchronized.');

  } catch (err) {
    console.error('[MIGRATION ERROR] Failed to synchronize leave/exam schema:', err);
    throw err;
  }
}

module.exports = migrateLeaveAndExamSchema;
