const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || 'postgresql://fusion_high_db_user:hmYNReP72H9Nne5px8hbNbCWVts1xgpD@dpg-da3haqdg1s2s73dkactg-a.oregon-postgres.render.com/fusion_high_db';

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function fixProgressSchema() {
  const client = await pool.connect();
  try {
    console.log('Harmonizing children and progress schema...');

    await client.query(`
      ALTER TABLE children ADD COLUMN IF NOT EXISTS class_id INTEGER;
      ALTER TABLE children ADD COLUMN IF NOT EXISTS secondary_parent_id INTEGER;
      ALTER TABLE children ADD COLUMN IF NOT EXISTS application_number VARCHAR(50);
      ALTER TABLE children ADD COLUMN IF NOT EXISTS home_language VARCHAR(50) DEFAULT 'isiZulu';

      ALTER TABLE progress ADD COLUMN IF NOT EXISTS grade NUMERIC;
      ALTER TABLE progress ADD COLUMN IF NOT EXISTS score NUMERIC;
      ALTER TABLE progress ADD COLUMN IF NOT EXISTS date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE progress ADD COLUMN IF NOT EXISTS employee_id INTEGER;
      ALTER TABLE progress ADD COLUMN IF NOT EXISTS recorded_by INTEGER;
      ALTER TABLE progress ADD COLUMN IF NOT EXISTS time_taken_seconds INTEGER DEFAULT 0;

      UPDATE progress SET grade = score WHERE grade IS NULL AND score IS NOT NULL;
      UPDATE progress SET score = grade WHERE score IS NULL AND grade IS NOT NULL;
      UPDATE progress SET date = created_at WHERE date IS NULL AND created_at IS NOT NULL;
      UPDATE progress SET created_at = date WHERE created_at IS NULL AND date IS NOT NULL;
    `);

    console.log('✅ Progress and Children schema harmonized on Render database!');
  } catch (err) {
    console.error('Error harmonizing schema:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

fixProgressSchema();
