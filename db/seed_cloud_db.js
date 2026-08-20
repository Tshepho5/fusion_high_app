const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || 'postgresql://fusion_high_db_user:hmYNReP72H9Nne5px8hbNbCWVts1xgpD@dpg-da3haqdg1s2s73dkactg-a.oregon-postgres.render.com/fusion_high_db';

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function runCompleteCloudInit() {
  const client = await pool.connect();
  try {
    console.log('[CLOUD DB] Initializing all remaining feature tables...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS educator_leave_requests (
        id SERIAL PRIMARY KEY,
        teacher_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        leave_type VARCHAR(60) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        total_days NUMERIC(4,1) DEFAULT 1.0,
        reason TEXT,
        document_url VARCHAR(255),
        status VARCHAR(30) DEFAULT 'pending',
        reviewed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        admin_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS educator_relief_allocations (
        id SERIAL PRIMARY KEY,
        leave_request_id INTEGER REFERENCES educator_leave_requests(id) ON DELETE CASCADE,
        absent_teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        relief_teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        relief_date DATE NOT NULL,
        period_number INTEGER NOT NULL,
        grade INTEGER NOT NULL,
        classroom VARCHAR(50) DEFAULT 'Classroom 12',
        subject VARCHAR(100) NOT NULL,
        lesson_instructions TEXT,
        status VARCHAR(30) DEFAULT 'assigned',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ptc_slots (
        id SERIAL PRIMARY KEY,
        teacher_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        event_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        duration_minutes INTEGER DEFAULT 15,
        location VARCHAR(100) DEFAULT 'Room 12',
        is_booked BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ptc_bookings (
        id SERIAL PRIMARY KEY,
        slot_id INTEGER REFERENCES ptc_slots(id) ON DELETE CASCADE,
        parent_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        child_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
        subject VARCHAR(100),
        notes TEXT,
        meeting_type VARCHAR(50) DEFAULT 'In-Person',
        status VARCHAR(50) DEFAULT 'Confirmed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS conduct_logs (
        id SERIAL PRIMARY KEY,
        child_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
        type VARCHAR(20) CHECK (type IN ('merit', 'demerit')),
        category VARCHAR(100) NOT NULL,
        points INTEGER NOT NULL,
        description TEXT NOT NULL,
        incident_date DATE NOT NULL,
        recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action_taken TEXT,
        status VARCHAR(50) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        is_read BOOLEAN DEFAULT FALSE,
        link_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Check final tables count
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('🎉 [CLOUD DB] Total Tables in Render PostgreSQL:', res.rows.length);
    console.log(res.rows.map(r => r.table_name).join(', '));
  } catch (err) {
    console.error('[CLOUD DB ERROR]', err);
  } finally {
    client.release();
    await pool.end();
  }
}

runCompleteCloudInit();
