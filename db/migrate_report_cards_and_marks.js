const db = require('./db');

async function runMigration() {
  console.log('[MIGRATION] Starting report cards and marks schema enhancements...');

  try {
    // 1. Enhance marks table
    await db.query(`
      ALTER TABLE marks ADD COLUMN IF NOT EXISTS published_to_admin BOOLEAN DEFAULT TRUE;
      ALTER TABLE marks ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'published';
      ALTER TABLE marks ADD COLUMN IF NOT EXISTS weight NUMERIC DEFAULT 100;
    `);
    console.log('[MIGRATION] marks table enhanced.');

    // 2. Enhance report_cards table
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
    console.log('[MIGRATION] report_cards table enhanced.');

    // 3. Ensure schools table has postal address if missing
    await db.query(`
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS postal_address TEXT;
    `);
    
    // Update default school info with official postal address if null
    await db.query(`
      UPDATE schools
      SET postal_address = 'P.O. Box 1024, Polokwane, 0700'
      WHERE id = 1 AND (postal_address IS NULL OR postal_address = '');
    `);

    // 4. Create performance indexes
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_report_cards_grade_term ON report_cards(school_id, grade, term);
      CREATE INDEX IF NOT EXISTS idx_report_cards_child_term ON report_cards(child_id, term);
      CREATE INDEX IF NOT EXISTS idx_marks_grade_subject ON marks(grade, subject, term);
    `);

    console.log('[MIGRATION] All report cards and marks migrations completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('[MIGRATION ERROR]', err);
    process.exit(1);
  }
}

runMigration();
