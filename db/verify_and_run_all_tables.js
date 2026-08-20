const db = require('./db');

async function runAllTables() {
    console.log('--- STARTING COMPREHENSIVE DATABASE TABLE INITIALIZATION ---');

    const tablesToEnsure = [
        `CREATE TABLE IF NOT EXISTS roles (
            id SERIAL PRIMARY KEY,
            name VARCHAR(50) UNIQUE NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS departments (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) UNIQUE NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS classes (
            id SERIAL PRIMARY KEY,
            name VARCHAR(50) UNIQUE NOT NULL,
            grade INTEGER NOT NULL,
            stream VARCHAR(50) DEFAULT 'General'
        )`,
        `CREATE TABLE IF NOT EXISTS subjects (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            code VARCHAR(20) UNIQUE NOT NULL,
            grade INTEGER NOT NULL,
            department_id INTEGER REFERENCES departments(id)
        )`,
        `CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role_id INTEGER REFERENCES roles(id),
            full_name VARCHAR(100) NOT NULL,
            surname VARCHAR(100),
            phone VARCHAR(20),
            id_number VARCHAR(20),
            dob DATE,
            gender VARCHAR(20),
            physical_address TEXT,
            country VARCHAR(100),
            race VARCHAR(50),
            parent_type VARCHAR(50),
            profile_picture_path VARCHAR(255),
            profile_picture VARCHAR(255),
            reset_code VARCHAR(10),
            reset_expiry TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS employees (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            employee_number VARCHAR(50) UNIQUE NOT NULL,
            department_id INTEGER REFERENCES departments(id),
            employment_type VARCHAR(50),
            hire_date DATE
        )`,
        `CREATE TABLE IF NOT EXISTS children (
            id SERIAL PRIMARY KEY,
            learner_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            full_name VARCHAR(100) NOT NULL,
            surname VARCHAR(100),
            parent_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            learner_number VARCHAR(50) UNIQUE NOT NULL,
            grade INTEGER NOT NULL,
            stream VARCHAR(50),
            home_language VARCHAR(50) DEFAULT 'isiZulu',
            subjects TEXT[],
            class_id INTEGER REFERENCES classes(id),
            application_number VARCHAR(50),
            profile_picture_path VARCHAR(255),
            profile_picture VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS parent_children (
            id SERIAL PRIMARY KEY,
            parent_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            child_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
            relationship VARCHAR(50) DEFAULT 'Parent',
            is_primary BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(parent_id, child_id)
        )`,
        `CREATE TABLE IF NOT EXISTS attendance (
            id SERIAL PRIMARY KEY,
            learner_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
            date DATE NOT NULL,
            status VARCHAR(20) NOT NULL,
            class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
            subject_name VARCHAR(100),
            period_number INTEGER DEFAULT 1,
            marked_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(learner_id, date, period_number)
        )`,
        `CREATE TABLE IF NOT EXISTS marks (
            id SERIAL PRIMARY KEY,
            learner_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
            subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
            term INTEGER NOT NULL,
            mark_type VARCHAR(50) NOT NULL,
            score NUMERIC(5,2) NOT NULL,
            max_score NUMERIC(5,2) NOT NULL,
            weight NUMERIC(3,2) DEFAULT 1.0,
            recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS applications (
            id SERIAL PRIMARY KEY,
            application_number VARCHAR(50) UNIQUE NOT NULL,
            provisional_learner_number VARCHAR(50),
            first_name VARCHAR(100) NOT NULL,
            surname VARCHAR(100) NOT NULL,
            id_number VARCHAR(20),
            grade_applied INTEGER NOT NULL,
            stream VARCHAR(50),
            home_language VARCHAR(50) DEFAULT 'isiZulu',
            parent_name VARCHAR(100) NOT NULL,
            parent_email VARCHAR(255) NOT NULL,
            parent_phone VARCHAR(20) NOT NULL,
            status VARCHAR(50) DEFAULT 'submitted',
            assigned_class_id INTEGER REFERENCES classes(id),
            selected_subjects TEXT[],
            documents JSONB,
            review_notes TEXT,
            resume_token VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS messages (
            id SERIAL PRIMARY KEY,
            sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            recipient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            subject VARCHAR(255),
            content TEXT,
            body TEXT,
            is_read BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS announcements (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            role_target VARCHAR(50) DEFAULT 'all',
            grade_target INTEGER,
            stream_target VARCHAR(50),
            subject_target VARCHAR(100),
            author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            type VARCHAR(50) DEFAULT 'system',
            target_tab VARCHAR(50),
            is_read BOOLEAN DEFAULT false,
            metadata JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS events (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            event_date DATE NOT NULL,
            start_time TIME,
            end_time TIME,
            location VARCHAR(255),
            category VARCHAR(50) DEFAULT 'General',
            target_role VARCHAR(50) DEFAULT 'all',
            created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS timetable (
            id SERIAL PRIMARY KEY,
            class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
            subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
            teacher_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            day_of_week VARCHAR(20) NOT NULL,
            period_number INTEGER NOT NULL,
            room_number VARCHAR(50),
            start_time TIME,
            end_time TIME,
            UNIQUE(class_id, day_of_week, period_number)
        )`,
        `CREATE TABLE IF NOT EXISTS ptc_sessions (
            id SERIAL PRIMARY KEY,
            teacher_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            parent_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            child_id INTEGER REFERENCES children(id) ON DELETE SET NULL,
            session_date DATE NOT NULL,
            start_time TIME NOT NULL,
            end_time TIME NOT NULL,
            status VARCHAR(50) DEFAULT 'available',
            meeting_notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS leave_requests (
            id SERIAL PRIMARY KEY,
            educator_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            relief_educator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            leave_type VARCHAR(50) NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            reason TEXT,
            status VARCHAR(50) DEFAULT 'pending',
            admin_notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS exam_seatings (
            id SERIAL PRIMARY KEY,
            learner_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
            subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
            hall_name VARCHAR(100) NOT NULL,
            desk_number VARCHAR(50) NOT NULL,
            exam_date DATE NOT NULL,
            session_time VARCHAR(50) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(learner_id, subject_id, exam_date)
        )`,
        `CREATE TABLE IF NOT EXISTS textbooks (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            isbn VARCHAR(50),
            grade INTEGER NOT NULL,
            subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
            total_copies INTEGER DEFAULT 100,
            available_copies INTEGER DEFAULT 100
        )`,
        `CREATE TABLE IF NOT EXISTS textbook_loans (
            id SERIAL PRIMARY KEY,
            textbook_id INTEGER REFERENCES textbooks(id) ON DELETE CASCADE,
            learner_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
            barcode VARCHAR(100),
            issued_date DATE DEFAULT CURRENT_DATE,
            return_due_date DATE,
            returned_date DATE,
            condition_on_issue VARCHAR(50) DEFAULT 'Good',
            condition_on_return VARCHAR(50),
            status VARCHAR(50) DEFAULT 'issued'
        )`,
        `CREATE TABLE IF NOT EXISTS extracurricular_activities (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            category VARCHAR(50) NOT NULL,
            coach_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            practice_schedule TEXT,
            venue VARCHAR(100)
        )`,
        `CREATE TABLE IF NOT EXISTS extracurricular_members (
            id SERIAL PRIMARY KEY,
            activity_id INTEGER REFERENCES extracurricular_activities(id) ON DELETE CASCADE,
            learner_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
            role VARCHAR(50) DEFAULT 'Member',
            joined_date DATE DEFAULT CURRENT_DATE,
            UNIQUE(activity_id, learner_id)
        )`,
        `CREATE TABLE IF NOT EXISTS conduct_records (
            id SERIAL PRIMARY KEY,
            learner_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
            educator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            incident_type VARCHAR(50) NOT NULL,
            points INTEGER DEFAULT 0,
            description TEXT NOT NULL,
            incident_date DATE DEFAULT CURRENT_DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
    ];

    for (const sql of tablesToEnsure) {
        try {
            await db.query(sql);
        } catch (e) {
            console.error('Table init error:', e.message);
        }
    }

    // Ensure columns exist on users & children
    const columnsToEnsure = [
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_path VARCHAR(255)`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture VARCHAR(255)`,
        `ALTER TABLE children ADD COLUMN IF NOT EXISTS profile_picture_path VARCHAR(255)`,
        `ALTER TABLE children ADD COLUMN IF NOT EXISTS profile_picture VARCHAR(255)`,
        `ALTER TABLE attendance ADD COLUMN IF NOT EXISTS subject_name VARCHAR(100)`
    ];

    for (const colSql of columnsToEnsure) {
        try {
            await db.query(colSql);
        } catch (e) {
            console.error('Column alter error:', e.message);
        }
    }

    // Fetch and display full list of existing tables in public schema
    const checkRes = await db.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name ASC
    `);

    console.log('\n✅ ALL DATABASE TABLES FULLY INITIALIZED & VERIFIED:');
    console.log('Total Tables in Database:', checkRes.rows.length);
    checkRes.rows.forEach((r, idx) => {
        console.log(`  ${(idx + 1).toString().padStart(2, ' ')}. ${r.table_name}`);
    });

    console.log('--- DATABASE TABLES VERIFICATION COMPLETE ---');
    process.exit(0);
}

runAllTables().catch(err => {
    console.error('Fatal DB init error:', err);
    process.exit(1);
});
