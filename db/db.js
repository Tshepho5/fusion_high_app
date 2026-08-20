const { Pool, types } = require('pg');
require('dotenv').config();

// Ensure PostgreSQL DATE columns (OID 1082) return exact 'YYYY-MM-DD' strings to prevent timezone shifting
types.setTypeParser(1082, (val) => val);

const isProduction = process.env.NODE_ENV === 'production' || !!process.env.DATABASE_URL;

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
      max: 30,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'FUSION_DB',
      max: 50,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// Test the database connection and initialize performance indexes on startup
pool.connect(async (err, client, release) => {
    if (err) {
        console.error('FATAL: Could not connect to the database. Please check your connection settings in the .env file.');
        console.error(err.stack);
        process.exit(1);
    }
    console.log('Database connection successful.');

    // Initialize database indexes for performance optimization
    try {
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));
            CREATE INDEX IF NOT EXISTS idx_users_id_number ON users(id_number);
            CREATE INDEX IF NOT EXISTS idx_children_learner_number ON children(learner_number);
            CREATE INDEX IF NOT EXISTS idx_children_parent_id ON children(parent_id);
            CREATE INDEX IF NOT EXISTS idx_parent_children_parent ON parent_children(parent_id);
            CREATE INDEX IF NOT EXISTS idx_parent_children_child ON parent_children(child_id);
            CREATE INDEX IF NOT EXISTS idx_attendance_child_date ON attendance(child_id, attendance_date);
            CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
            CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department_id);
            CREATE INDEX IF NOT EXISTS idx_timetables_grade_stream ON timetables(grade, stream);
            CREATE INDEX IF NOT EXISTS idx_messages_participants ON messages(sender_id, recipient_id);
            CREATE INDEX IF NOT EXISTS idx_announcements_created ON announcements(created_at DESC);
        `);
        // Clean up any historical dummy baseline assessment scores from database
        const cleanRes = await client.query(`DELETE FROM progress WHERE notes ILIKE '%baseline assessment score%'`);
        if (cleanRes.rowCount > 0) {
            console.log(`[DATABASE] Removed ${cleanRes.rowCount} dummy baseline assessment marks.`);
        }
        console.log('[DATABASE] Performance indexes verified.');
    } catch (indexErr) {
        console.warn('[DATABASE WARNING] Index verification warning:', indexErr.message);
    } finally {
        release();
    }
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool // Exporting pool for transaction support (BEGIN/COMMIT)
};