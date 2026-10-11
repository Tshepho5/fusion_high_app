const db = require('../db/db');

async function migrate() {
  console.log('--- Creating Recycle Bin Table ---');

  await db.query(`
    CREATE TABLE IF NOT EXISTS recycle_bin (
      id SERIAL PRIMARY KEY,
      record_type VARCHAR(50) NOT NULL, -- 'user', 'learner', 'teacher', 'parent', 'admin'
      original_id INTEGER NOT NULL,
      school_id INTEGER,
      name VARCHAR(255) NOT NULL,
      identifier VARCHAR(255),
      role_name VARCHAR(50),
      data JSONB NOT NULL,
      deleted_by INTEGER,
      deleted_by_name VARCHAR(255),
      deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_recycle_bin_school ON recycle_bin(school_id);
    CREATE INDEX IF NOT EXISTS idx_recycle_bin_type ON recycle_bin(record_type);
    CREATE INDEX IF NOT EXISTS idx_recycle_bin_deleted_at ON recycle_bin(deleted_at DESC);
  `);

  console.log('✓ Table recycle_bin and indexes created successfully.');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
