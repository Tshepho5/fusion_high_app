const db = require('./db');

async function migrateReportCards() {
  console.log('[MIGRATION] Enhancing report_cards and children tables...');
  try {
    // 1. Add report card lifecycle & multi-term fields
    await db.query(`
      ALTER TABLE report_cards ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';
      ALTER TABLE report_cards ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE report_cards ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
      ALTER TABLE report_cards ADD COLUMN IF NOT EXISTS all_terms_data JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE report_cards ADD COLUMN IF NOT EXISTS general_remarks TEXT;
      ALTER TABLE report_cards ADD COLUMN IF NOT EXISTS school_stamp_text TEXT;
      ALTER TABLE report_cards ADD COLUMN IF NOT EXISTS closing_date VARCHAR(50);
      ALTER TABLE report_cards ADD COLUMN IF NOT EXISTS reopening_date VARCHAR(50);
      ALTER TABLE report_cards ADD COLUMN IF NOT EXISTS issue_date VARCHAR(50);
    `);

    // 2. Add admission_number and id_number to children if missing
    await db.query(`
      ALTER TABLE children ADD COLUMN IF NOT EXISTS admission_number VARCHAR(50);
      ALTER TABLE children ADD COLUMN IF NOT EXISTS id_number VARCHAR(20);
      ALTER TABLE children ADD COLUMN IF NOT EXISTS dob DATE;
    `);

    // 3. Ensure schools has report_settings JSONB
    await db.query(`
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS report_settings JSONB DEFAULT '{
        "phase": "FET",
        "show_stamp": true,
        "show_signatures": true,
        "show_grade_average": true,
        "terms_count": 4,
        "closing_date": "2026/09/23",
        "reopening_date": "2026/10/06"
      }'::jsonb;
    `);

    // 4. Create indexes for quick report card lookup
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_report_cards_school_grade ON report_cards(school_id, grade, academic_year);
      CREATE INDEX IF NOT EXISTS idx_report_cards_child_year ON report_cards(child_id, academic_year);
    `);

    console.log('[MIGRATION] Report card database enhancements applied successfully.');
  } catch (err) {
    console.error('[MIGRATION ERROR]', err);
    throw err;
  }
}

migrateReportCards()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
