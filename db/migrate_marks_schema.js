const db = require('./db');

async function migrateMarksSchema() {
  console.log('[MIGRATION] Starting database schema verification and enhancements for marks & progress...');

  try {
    // 1. Check & enhance marks table
    await db.query(`
      ALTER TABLE marks ADD COLUMN IF NOT EXISTS child_id INTEGER;
      ALTER TABLE marks ADD COLUMN IF NOT EXISTS learner_id INTEGER;
      ALTER TABLE marks ADD COLUMN IF NOT EXISTS subject VARCHAR(100);
      ALTER TABLE marks ADD COLUMN IF NOT EXISTS subject_name VARCHAR(100);
      ALTER TABLE marks ADD COLUMN IF NOT EXISTS grade INTEGER;
      ALTER TABLE marks ADD COLUMN IF NOT EXISTS percentage NUMERIC;
      ALTER TABLE marks ADD COLUMN IF NOT EXISTS assessment_name VARCHAR(255);
      ALTER TABLE marks ADD COLUMN IF NOT EXISTS assessment_type VARCHAR(100) DEFAULT 'formal_test';
      ALTER TABLE marks ADD COLUMN IF NOT EXISTS is_formal BOOLEAN DEFAULT TRUE;
      ALTER TABLE marks ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE;
      ALTER TABLE marks ADD COLUMN IF NOT EXISTS published_to_admin BOOLEAN DEFAULT TRUE;
      ALTER TABLE marks ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'published';
      ALTER TABLE marks ADD COLUMN IF NOT EXISTS weight NUMERIC DEFAULT 100;
      ALTER TABLE marks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);

    // Backfill null is_formal so existing records are formal
    await db.query(`UPDATE marks SET is_formal = TRUE WHERE is_formal IS NULL;`).catch(() => {});
    console.log('[MIGRATION] marks table schema verified.');

    // 2. Check & enhance progress table
    await db.query(`
      ALTER TABLE progress ADD COLUMN IF NOT EXISTS is_formal BOOLEAN DEFAULT TRUE;
      ALTER TABLE progress ADD COLUMN IF NOT EXISTS assessment_type VARCHAR(100) DEFAULT 'formal_test';
      ALTER TABLE progress ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE;
      ALTER TABLE progress ADD COLUMN IF NOT EXISTS assessment_name VARCHAR(255);
      ALTER TABLE progress ADD COLUMN IF NOT EXISTS score NUMERIC;
      ALTER TABLE progress ADD COLUMN IF NOT EXISTS total_marks NUMERIC;
      ALTER TABLE progress ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);

    await db.query(`UPDATE progress SET is_formal = TRUE WHERE is_formal IS NULL;`).catch(() => {});
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

    // 5. Enhance report_cards table
    await db.query(`
      ALTER TABLE report_cards ADD COLUMN IF NOT EXISTS class_name VARCHAR(50);
      ALTER TABLE report_cards ADD COLUMN IF NOT EXISTS stream VARCHAR(100);
      ALTER TABLE report_cards ADD COLUMN IF NOT EXISTS promotion_status VARCHAR(150);
      ALTER TABLE report_cards ADD COLUMN IF NOT EXISTS days_present INTEGER DEFAULT 0;
      ALTER TABLE report_cards ADD COLUMN IF NOT EXISTS days_absent INTEGER DEFAULT 0;
      ALTER TABLE report_cards ADD COLUMN IF NOT EXISTS total_days INTEGER DEFAULT 0;
      ALTER TABLE report_cards ADD COLUMN IF NOT EXISTS attendance_percentage NUMERIC DEFAULT 100;
      ALTER TABLE report_cards ADD COLUMN IF NOT EXISTS principal_signature TEXT;
      ALTER TABLE report_cards ADD COLUMN IF NOT EXISTS published_at TIMESTAMP;
      ALTER TABLE report_cards ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);

    // Create helpful performance indices
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_marks_child_subj ON marks(child_id, subject);
      CREATE INDEX IF NOT EXISTS idx_progress_child_subj ON progress(child_id, subject);
      CREATE INDEX IF NOT EXISTS idx_marks_grade_subj_formal ON marks(grade, subject, is_formal);
    `).catch(() => {});

    console.log('[MIGRATION] All database schema migrations executed successfully!');
  } catch (err) {
    console.error('[MIGRATION ERROR]', err);
    throw err;
  }
}

if (require.main === module) {
  migrateMarksSchema().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = migrateMarksSchema;

