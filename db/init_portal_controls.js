const db = require('./db');

async function initPortalControls() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS system_portal_controls (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        is_locked BOOLEAN NOT NULL DEFAULT FALSE,
        locked_reason TEXT DEFAULT 'Locked by Geleza SA Executive Board',
        unlocked_at TIMESTAMP,
        locked_at TIMESTAMP,
        updated_by_email VARCHAR(255),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed default controls if not present
    await db.query(`
      INSERT INTO system_portal_controls (id, name, description, is_locked, locked_reason)
      VALUES 
        ('school_registration', 'Institutional School Registration', 'Controls whether new high schools can register and onboard onto Geleza SA.', FALSE, 'Institutional school onboarding is currently closed by the Geleza SA Executive Board.'),
        ('user_registration', 'General User Account Registration', 'Controls whether learners, parents, or staff can register new accounts.', FALSE, 'New user account registration is currently closed by Geleza SA Administration.'),
        ('parent_application', 'Parent Portal Access Applications', 'Controls whether parents without linked children can submit access applications.', FALSE, 'Parent Portal access applications are currently closed by Geleza SA Administration.')
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log('[PORTAL-CONTROLS] system_portal_controls table initialized successfully.');
  } catch (err) {
    console.error('[PORTAL-CONTROLS ERROR]:', err.message);
  }
}

if (require.main === module) {
  initPortalControls().then(() => process.exit(0));
}

module.exports = initPortalControls;
