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
        console.error('FATAL: Could not connect to the database. Connection Error:', err.message);
        console.error(err.stack);
        // Do not immediately exit so container restart backoff doesn't hard-crash
        return;
    }
    console.log('Database connection successful.');

    try {
        // 1. Ensure core schema tables exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS roles (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) UNIQUE NOT NULL
            );
            INSERT INTO roles (name) VALUES ('admin'), ('parent'), ('learner'), ('teacher') ON CONFLICT DO NOTHING;

            CREATE TABLE IF NOT EXISTS departments (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL,
                description TEXT
            );
            INSERT INTO departments (name, description) VALUES ('Administration', 'School administration.'), ('Academic', 'Curriculum.') ON CONFLICT DO NOTHING;

            CREATE TABLE IF NOT EXISTS employee_roles (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) UNIQUE NOT NULL
            );
            INSERT INTO employee_roles (name) VALUES ('teacher'), ('Principal'), ('Vice_Principal') ON CONFLICT DO NOTHING;

            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE,
                password_hash VARCHAR(255),
                role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
                full_name VARCHAR(255),
                surname VARCHAR(255),
                id_number VARCHAR(20),
                dob DATE,
                gender VARCHAR(10),
                phone VARCHAR(20),
                physical_address TEXT,
                country VARCHAR(100),
                race VARCHAR(50),
                parent_type VARCHAR(50),
                reset_code VARCHAR(10),
                reset_expiry TIMESTAMP,
                profile_picture_path VARCHAR(255),
                preferences JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS children (
                id SERIAL PRIMARY KEY,
                parent_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                secondary_parent_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                learner_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                full_name VARCHAR(255) NOT NULL,
                surname VARCHAR(255) NOT NULL,
                dob DATE,
                grade INTEGER NOT NULL,
                stream VARCHAR(50) DEFAULT 'General',
                home_language VARCHAR(50) DEFAULT 'isiZulu',
                learner_number VARCHAR(50),
                application_number VARCHAR(50),
                subjects TEXT[] DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS employees (
                id SERIAL PRIMARY KEY,
                user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                employee_role_id INTEGER REFERENCES employee_roles(id),
                full_name VARCHAR(255) NOT NULL,
                surname VARCHAR(255) NOT NULL,
                department_id INTEGER REFERENCES departments(id),
                subjects TEXT[] DEFAULT '{}',
                subject_codes TEXT[] DEFAULT '{}',
                grades_taught INTEGER[] DEFAULT '{}',
                classes_taught TEXT[] DEFAULT '{}',
                phone VARCHAR(20),
                email VARCHAR(255),
                hired_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. Initialize performance indexes
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));
            CREATE INDEX IF NOT EXISTS idx_users_id_number ON users(id_number);
            CREATE INDEX IF NOT EXISTS idx_children_learner_number ON children(learner_number);
            CREATE INDEX IF NOT EXISTS idx_children_parent_id ON children(parent_id);
            CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
        `);

        console.log('[DATABASE] Core tables and performance indexes verified.');
    } catch (indexErr) {
        console.warn('[DATABASE WARNING] Schema verification warning:', indexErr.message);
    } finally {
        release();
    }
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool // Exporting pool for transaction support (BEGIN/COMMIT)
};