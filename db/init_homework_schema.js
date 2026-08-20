const db = require('./db');

async function initHomeworkSchema() {
  console.log('--- Initializing Homework & Digital Submissions Schema ---');
  try {
    // 1. Create homework_assignments table
    await db.query(`
      CREATE TABLE IF NOT EXISTS homework_assignments (
        id SERIAL PRIMARY KEY,
        teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        subject VARCHAR(150) NOT NULL,
        grade INTEGER NOT NULL,
        stream VARCHAR(100) DEFAULT 'General',
        due_date DATE NOT NULL,
        due_time VARCHAR(20) DEFAULT '23:59',
        total_marks NUMERIC DEFAULT 50,
        file_url TEXT,
        file_name VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✅ Created homework_assignments table.');

    // 2. Create homework_submissions table
    await db.query(`
      CREATE TABLE IF NOT EXISTS homework_submissions (
        id SERIAL PRIMARY KEY,
        assignment_id INTEGER NOT NULL REFERENCES homework_assignments(id) ON DELETE CASCADE,
        child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
        learner_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        file_url TEXT,
        file_name VARCHAR(255),
        submission_text TEXT,
        submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        status VARCHAR(50) DEFAULT 'submitted', -- 'submitted', 'ai_evaluated', 'teacher_signed'
        ai_score NUMERIC,
        ai_percentage NUMERIC,
        ai_feedback TEXT,
        ai_strengths TEXT,
        ai_areas_for_improvement TEXT,
        teacher_score NUMERIC,
        teacher_percentage NUMERIC,
        teacher_feedback TEXT,
        signed_by_teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        signed_at TIMESTAMP WITH TIME ZONE,
        UNIQUE (assignment_id, child_id)
      );
    `);
    console.log('✅ Created homework_submissions table.');

    // 3. Create helpful indexes
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_hw_assign_grade_subj ON homework_assignments(grade, subject);
      CREATE INDEX IF NOT EXISTS idx_hw_sub_assign_child ON homework_submissions(assignment_id, child_id);
    `);
    console.log('✅ Created performance indexes.');

    console.log('--- Homework & Submissions Schema Ready ---');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error initializing homework schema:', err);
    process.exit(1);
  }
}

initHomeworkSchema();
