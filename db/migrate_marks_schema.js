const db = require('./db');

async function runMigration() {
  console.log('[MIGRATION] Starting database schema verification and enhancements...');

  try {
    // 1. Check & enhance marks table
    await db.query(`
      ALTER TABLE marks ADD COLUMN IF NOT EXISTS child_id INTEGER REFERENCES children(id);
      ALTER TABLE marks ADD COLUMN IF NOT EXISTS subject VARCHAR(100);
      ALTER TABLE marks ADD COLUMN IF NOT EXISTS subject_name VARCHAR(100);
      ALTER TABLE marks ADD COLUMN IF NOT EXISTS grade INTEGER;
      ALTER TABLE marks ADD COLUMN IF NOT EXISTS percentage NUMERIC;
      ALTER TABLE marks ADD COLUMN IF NOT EXISTS assessment_name VARCHAR(255);
      ALTER TABLE marks ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE;
      ALTER TABLE marks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);
    console.log('[MIGRATION] marks table schema verified.');

    // 2. Check & enhance progress table
    await db.query(`
      ALTER TABLE progress ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE;
      ALTER TABLE progress ADD COLUMN IF NOT EXISTS assessment_name VARCHAR(255);
      ALTER TABLE progress ADD COLUMN IF NOT EXISTS score NUMERIC;
      ALTER TABLE progress ADD COLUMN IF NOT EXISTS total_marks NUMERIC;
      ALTER TABLE progress ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);
    console.log('[MIGRATION] progress table schema verified.');

    // 3. Check & enhance employees table
    await db.query(`
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS subjects TEXT[] DEFAULT '{}';
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS subject_codes TEXT[] DEFAULT '{}';
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS grades_taught INTEGER[] DEFAULT '{}';
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS classes_taught TEXT[] DEFAULT '{}';
    `);
    console.log('[MIGRATION] employees table schema verified.');

    // 4. Check & enhance messages table
    await db.query(`
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(255);
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(50);
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_size VARCHAR(50);
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS voice_duration INTEGER;
    `);
    console.log('[MIGRATION] messages table schema verified.');

    // Create helpful performance indices
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_marks_child_subj ON marks(child_id, subject);
      CREATE INDEX IF NOT EXISTS idx_progress_child_subj ON progress(child_id, subject);
    `);

    console.log('[MIGRATION] All database schema migrations executed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('[MIGRATION ERROR]', err);
    process.exit(1);
  }
}

runMigration();
