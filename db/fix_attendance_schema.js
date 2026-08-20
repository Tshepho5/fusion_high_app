const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || 'postgresql://fusion_high_db_user:hmYNReP72H9Nne5px8hbNbCWVts1xgpD@dpg-da3haqdg1s2s73dkactg-a.oregon-postgres.render.com/fusion_high_db';

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function fixAttendanceSchema() {
  const client = await pool.connect();
  try {
    console.log('Harmonizing attendance schema on Render PostgreSQL...');

    await client.query(`
      ALTER TABLE attendance ADD COLUMN IF NOT EXISTS subject_name VARCHAR(100) DEFAULT 'General Registration';
      ALTER TABLE attendance ADD COLUMN IF NOT EXISTS class_id INTEGER;
      ALTER TABLE attendance ADD COLUMN IF NOT EXISTS recorded_by_teacher_id INTEGER;
      ALTER TABLE attendance ADD COLUMN IF NOT EXISTS recorded_by INTEGER;
      ALTER TABLE attendance ADD COLUMN IF NOT EXISTS reason TEXT;

      UPDATE attendance SET subject_name = 'General Registration' WHERE subject_name IS NULL;
      UPDATE attendance SET recorded_by_teacher_id = recorded_by WHERE recorded_by_teacher_id IS NULL AND recorded_by IS NOT NULL;
      UPDATE attendance SET recorded_by = recorded_by_teacher_id WHERE recorded_by IS NULL AND recorded_by_teacher_id IS NOT NULL;

      -- Remove any duplicate records keeping the latest id
      DELETE FROM attendance a USING attendance b
      WHERE a.id < b.id 
        AND a.child_id = b.child_id 
        AND a.attendance_date = b.attendance_date 
        AND COALESCE(a.subject_name, 'General Registration') = COALESCE(b.subject_name, 'General Registration');

      ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_child_date_subj_key;
      ALTER TABLE attendance ADD CONSTRAINT attendance_child_date_subj_key UNIQUE (child_id, attendance_date, subject_name);

      ALTER TABLE messages ADD COLUMN IF NOT EXISTS child_id INTEGER;
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS subject VARCHAR(255);
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS body TEXT;
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS content TEXT;

      UPDATE messages SET body = content WHERE body IS NULL AND content IS NOT NULL;
      UPDATE messages SET content = body WHERE content IS NULL AND body IS NOT NULL;
    `);

    console.log('✅ Attendance and Messages tables successfully updated on Render PostgreSQL!');
  } catch (err) {
    console.error('Error harmonizing attendance schema:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

fixAttendanceSchema();
