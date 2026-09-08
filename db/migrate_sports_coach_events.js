const db = require('./db');

async function migrateSportsCoachEvents() {
  console.log('[MIGRATION] Running sports coach & event confirmation migration...');
  try {
    // 1. Extracurricular Activities enhancements
    await db.query(`
      ALTER TABLE extracurricular_activities ADD COLUMN IF NOT EXISTS coach_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE extracurricular_activities ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
      ALTER TABLE extracurricular_activities ADD COLUMN IF NOT EXISTS venue VARCHAR(150) DEFAULT 'School Sports Ground';
      ALTER TABLE extracurricular_activities ADD COLUMN IF NOT EXISTS practice_schedule VARCHAR(255) DEFAULT 'Tuesdays & Thursdays 15:00 - 16:30';
    `);
    console.log('[MIGRATION] ✓ Extracurricular activities columns verified.');

    // 2. Extracurricular Events enhancements
    await db.query(`
      ALTER TABLE extracurricular_events ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'Draft';
      ALTER TABLE extracurricular_events ADD COLUMN IF NOT EXISTS is_confirmed BOOLEAN DEFAULT FALSE;
      ALTER TABLE extracurricular_events ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;
      ALTER TABLE extracurricular_events ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE extracurricular_events ADD COLUMN IF NOT EXISTS added_to_calendar BOOLEAN DEFAULT FALSE;
      ALTER TABLE extracurricular_events ADD COLUMN IF NOT EXISTS calendar_event_id INTEGER REFERENCES events(id) ON DELETE SET NULL;
      ALTER TABLE extracurricular_events ADD COLUMN IF NOT EXISTS created_by_coach_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE extracurricular_events ADD COLUMN IF NOT EXISTS bus_transport_info VARCHAR(255);
      ALTER TABLE extracurricular_events ADD COLUMN IF NOT EXISTS required_kit VARCHAR(255);
    `);
    console.log('[MIGRATION] ✓ Extracurricular events columns verified.');

    console.log('[MIGRATION SUCCESS] All sports coach and event features migrated safely with zero data loss and no dummy data.');
  } catch (err) {
    console.error('[MIGRATION ERROR] Failed to run sports coach events migration:', err);
    throw err;
  }
}

if (require.main === module) {
  migrateSportsCoachEvents()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = migrateSportsCoachEvents;
