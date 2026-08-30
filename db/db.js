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
    console.warn('[DATABASE WARNING] Idle client connection reset/error (reconnecting):', err.message);
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

            ALTER TABLE users ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT FALSE;

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

            CREATE TABLE IF NOT EXISTS attendance (
                id SERIAL PRIMARY KEY,
                child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
                class_id INTEGER,
                subject_name VARCHAR(100) DEFAULT 'General Registration',
                attendance_date DATE NOT NULL,
                status VARCHAR(20) DEFAULT 'present',
                recorded_by_teacher_id INTEGER,
                recorded_by INTEGER,
                reason TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            ALTER TABLE attendance ADD COLUMN IF NOT EXISTS subject_name VARCHAR(100) DEFAULT 'General Registration';
            ALTER TABLE attendance ADD COLUMN IF NOT EXISTS class_id INTEGER;
            ALTER TABLE attendance ADD COLUMN IF NOT EXISTS recorded_by_teacher_id INTEGER;
            ALTER TABLE attendance ADD COLUMN IF NOT EXISTS recorded_by INTEGER;
            ALTER TABLE attendance ADD COLUMN IF NOT EXISTS reason TEXT;

            UPDATE attendance SET subject_name = 'General Registration' WHERE subject_name IS NULL;
            UPDATE attendance SET recorded_by_teacher_id = recorded_by WHERE recorded_by_teacher_id IS NULL AND recorded_by IS NOT NULL;
            UPDATE attendance SET recorded_by = recorded_by_teacher_id WHERE recorded_by IS NULL AND recorded_by_teacher_id IS NOT NULL;

            -- Messages table support
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                child_id INTEGER,
                subject VARCHAR(255),
                body TEXT,
                content TEXT,
                read_at TIMESTAMP,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            ALTER TABLE messages ADD COLUMN IF NOT EXISTS child_id INTEGER;
            ALTER TABLE messages ADD COLUMN IF NOT EXISTS subject VARCHAR(255);
            ALTER TABLE messages ADD COLUMN IF NOT EXISTS body TEXT;
            ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;
            ALTER TABLE messages ADD COLUMN IF NOT EXISTS content TEXT;

            UPDATE messages SET body = content WHERE body IS NULL AND content IS NOT NULL;
            UPDATE messages SET content = body WHERE content IS NULL AND body IS NOT NULL;

            -- Homework & Digital Submissions
            CREATE TABLE IF NOT EXISTS homework_assignments (
                id SERIAL PRIMARY KEY,
                teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                subject VARCHAR(150) NOT NULL,
                grade INTEGER NOT NULL,
                stream VARCHAR(100) DEFAULT 'General',
                due_date DATE NOT NULL,
                due_time VARCHAR(20) DEFAULT '23:59',
                total_marks NUMERIC DEFAULT 50,
                file_url TEXT,
                file_name VARCHAR(255),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS homework_submissions (
                id SERIAL PRIMARY KEY,
                assignment_id INTEGER NOT NULL REFERENCES homework_assignments(id) ON DELETE CASCADE,
                child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
                learner_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                file_url TEXT,
                file_name VARCHAR(255),
                submission_text TEXT,
                submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                status VARCHAR(50) DEFAULT 'submitted',
                ai_score NUMERIC,
                ai_percentage NUMERIC,
                ai_feedback TEXT,
                ai_strengths TEXT,
                ai_areas_for_improvement TEXT,
                teacher_score NUMERIC,
                teacher_percentage NUMERIC,
                teacher_feedback TEXT,
                signed_by_teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                signed_at TIMESTAMP WITH TIME ZONE,
                UNIQUE (assignment_id, child_id)
            );

            CREATE TABLE IF NOT EXISTS teacher_consultations (
                id SERIAL PRIMARY KEY,
                school_id INTEGER DEFAULT 1,
                teacher_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                parent_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                child_id INTEGER REFERENCES children(id) ON DELETE SET NULL,
                subject VARCHAR(150) DEFAULT 'General Academic Consultation',
                consultation_date DATE NOT NULL,
                start_time VARCHAR(20) NOT NULL,
                end_time VARCHAR(20) NOT NULL,
                venue_or_link VARCHAR(255) DEFAULT 'Educator Office / Virtual Room',
                parent_notes TEXT,
                teacher_notes TEXT,
                status VARCHAR(30) DEFAULT 'scheduled',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS inter_school_competitions (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                activity_type VARCHAR(100) NOT NULL,
                category VARCHAR(50) DEFAULT 'sports',
                home_school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
                away_school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
                event_date DATE NOT NULL,
                venue VARCHAR(255),
                home_score INTEGER DEFAULT 0,
                away_score INTEGER DEFAULT 0,
                status VARCHAR(30) DEFAULT 'scheduled',
                trophy_title VARCHAR(255),
                highlights TEXT,
                created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                school_id INTEGER DEFAULT 1,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS report_cards (
                id SERIAL PRIMARY KEY,
                school_id INTEGER DEFAULT 1,
                child_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
                grade INTEGER NOT NULL,
                term INTEGER NOT NULL,
                academic_year INTEGER DEFAULT 2026,
                marks_breakdown JSONB DEFAULT '[]'::jsonb,
                overall_average NUMERIC(5,2),
                overall_level INTEGER,
                teacher_comment TEXT,
                principal_comment TEXT,
                is_published BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. Initialize unique attendance constraints & performance indexes
        try {
            await client.query(`
                DELETE FROM attendance a USING attendance b
                WHERE a.id < b.id 
                  AND a.child_id = b.child_id 
                  AND a.attendance_date = b.attendance_date 
                  AND COALESCE(a.subject_name, 'General Registration') = COALESCE(b.subject_name, 'General Registration');

                ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_child_date_subj_key;
                ALTER TABLE attendance ADD CONSTRAINT attendance_child_date_subj_key UNIQUE (child_id, attendance_date, subject_name);
            `);
        } catch (constraintErr) {
            console.warn('[DATABASE WARNING] Attendance constraint notice:', constraintErr.message);
        }

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));
            CREATE INDEX IF NOT EXISTS idx_users_id_number ON users(id_number);
            CREATE INDEX IF NOT EXISTS idx_children_learner_number ON children(learner_number);
            CREATE INDEX IF NOT EXISTS idx_children_parent_id ON children(parent_id);
            CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
            CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);
            CREATE INDEX IF NOT EXISTS idx_attendance_child_id ON attendance(child_id);
        `);

        console.log('[DATABASE] Core tables, attendance schema, and performance indexes verified.');
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