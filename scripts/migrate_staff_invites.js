const db = require('../db/db');

async function migrate() {
  try {
    console.log('Running staff_invites enhancements...');

    // Drop old constraint if present
    await db.query(`
      ALTER TABLE staff_invites DROP CONSTRAINT IF EXISTS staff_invites_status_check;
    `);

    // Add new columns
    await db.query(`
      ALTER TABLE staff_invites ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
      ALTER TABLE staff_invites ADD COLUMN IF NOT EXISTS id_number VARCHAR(20);
      ALTER TABLE staff_invites ADD COLUMN IF NOT EXISTS qualifications TEXT;
      ALTER TABLE staff_invites ADD COLUMN IF NOT EXISTS experience_years INTEGER;
      ALTER TABLE staff_invites ADD COLUMN IF NOT EXISTS approval_token VARCHAR(64);
      ALTER TABLE staff_invites ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
      ALTER TABLE staff_invites ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE staff_invites ADD COLUMN IF NOT EXISTS declined_reason TEXT;
      ALTER TABLE staff_invites ADD COLUMN IF NOT EXISTS application_notes TEXT;
    `);

    // Add updated constraint
    await db.query(`
      ALTER TABLE staff_invites ADD CONSTRAINT staff_invites_status_check 
      CHECK (status IN ('pending', 'applied', 'under_review', 'approved', 'registered', 'accepted', 'declined'));
    `);

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    process.exit(0);
  }
}

migrate();
