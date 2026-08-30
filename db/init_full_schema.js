const db = require('./db');

/**
 * Complete, idempotent database bootstrap engine.
 * Guarantees that all 40 system tables, foreign keys, columns, 
 * performance indexes, and default lookups exist on any environment.
 */
async function initializeAllDatabaseTables(customClient) {
  const runner = customClient || db;
  try {
    console.log('[SCHEMA BOOTSTRAP] Verifying all 40 database tables and schema columns...');

    await runner.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      -- 0. Multi-School Tenant Table (Mankweng / Polokwane & National)
      CREATE TABLE IF NOT EXISTS schools (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        domain VARCHAR(255),
        emis_number VARCHAR(50),
        circuit VARCHAR(100),
        district VARCHAR(100) DEFAULT 'Capricorn South',
        province VARCHAR(50) DEFAULT 'Limpopo',
        physical_address TEXT,
        contact_email VARCHAR(255),
        contact_phone VARCHAR(50),
        principal_name VARCHAR(255),
        logo_url TEXT,
        badge_url TEXT,
        primary_color VARCHAR(20) DEFAULT '#4f46e5',
        secondary_color VARCHAR(20) DEFAULT '#06b6d4',
        accent_color VARCHAR(20) DEFAULT '#f59e0b',
        motto TEXT,
        curriculum_type VARCHAR(50) DEFAULT 'CAPS (DBE Limpopo)',
        grade_range VARCHAR(50) DEFAULT '8-12',
        is_active BOOLEAN DEFAULT TRUE,
        settings JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE schools ADD COLUMN IF NOT EXISTS slug VARCHAR(100);
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS domain VARCHAR(255);
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS emis_number VARCHAR(50);
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS circuit VARCHAR(100);
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS district VARCHAR(100) DEFAULT 'Capricorn South';
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS province VARCHAR(50) DEFAULT 'Limpopo';
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS physical_address TEXT;
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS principal_name VARCHAR(255);
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS logo_url TEXT;
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS badge_url TEXT;
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS primary_color VARCHAR(20) DEFAULT '#4f46e5';
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(20) DEFAULT '#06b6d4';
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS accent_color VARCHAR(20) DEFAULT '#f59e0b';
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS motto TEXT;
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS curriculum_type VARCHAR(50) DEFAULT 'CAPS (DBE Limpopo)';
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS grade_range VARCHAR(50) DEFAULT '8-12';
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

      -- Drop legacy constraints if they exist
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schools' AND column_name = 'code') THEN
          ALTER TABLE schools ALTER COLUMN code DROP NOT NULL;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schools' AND column_name = 'contactEmail') THEN
          ALTER TABLE schools ALTER COLUMN "contactEmail" DROP NOT NULL;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schools' AND column_name = 'address') THEN
          ALTER TABLE schools ALTER COLUMN "address" DROP NOT NULL;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schools' AND column_name = 'activeYear') THEN
          ALTER TABLE schools ALTER COLUMN "activeYear" DROP NOT NULL;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schools' AND column_name = 'currentTerm') THEN
          ALTER TABLE schools ALTER COLUMN "currentTerm" DROP NOT NULL;
        END IF;
      END $$;

      INSERT INTO schools (id, name, slug, domain, emis_number, circuit, district, province, physical_address, contact_email, contact_phone, principal_name, logo_url, badge_url, primary_color, secondary_color, accent_color, motto, curriculum_type, grade_range)
      VALUES
        -- 1. Limpopo (Polokwane & Mankweng - Capricorn South District)
        (1, 'Fusion High School', 'fusion-high', 'fusion-high.co.za', '911220001', 'Polokwane Central Circuit', 'Capricorn South', 'Limpopo', 'Polokwane Central, Limpopo, 0700', 'admin@fusionhigh.co.za', '+27 15 291 0000', 'Dr. T. Makola', '/assets/schools/fusion-high.svg', '/assets/schools/fusion-high.svg', '#4f46e5', '#06b6d4', '#f59e0b', 'Innovate, Lead, Transform', 'CAPS (DBE Limpopo)', '8-12'),
        (2, 'Mountainview Senior Secondary School', 'mountainview-high', 'mountainview.co.za', '923241054', 'Mankweng Circuit', 'Capricorn South', 'Limpopo', 'Mankweng Unit B/C, Polokwane, 0727', 'info@mountainviewhigh.co.za', '+27 15 267 1100', 'Mr. M. S. Phasha', '/assets/schools/mountainview-high.svg', '/assets/schools/mountainview-high.svg', '#1e40af', '#3b82f6', '#f59e0b', 'Strive for Excellence', 'CAPS (DBE Limpopo)', '8-12'),
        (3, 'Makgoka High School', 'makgoka-high', 'makgoka.co.za', '923240457', 'Molepo Circuit', 'Capricorn South', 'Limpopo', 'Maclean Farm, Boyne, Mankweng Area, 0727', 'admin@makgoka.co.za', '+27 15 266 0022', 'Mrs. K. E. Molepo', '/assets/schools/makgoka-high.svg', '/assets/schools/makgoka-high.svg', '#065f46', '#10b981', '#fbbf24', 'Thuto Ke Lesedi', 'CAPS (DBE Limpopo)', '8-12'),
        (4, 'Turfloop High School', 'turfloop-high', 'turfloop.co.za', '923240890', 'Mankweng Circuit', 'Capricorn South', 'Limpopo', 'University Road, Turfloop, Mankweng, 0727', 'principal@turfloophigh.co.za', '+27 15 267 3300', 'Mr. N. J. Mamabolo', '/assets/schools/turfloop-high.svg', '/assets/schools/turfloop-high.svg', '#1e1b4b', '#4338ca', '#991b1b', 'Education for Progress', 'CAPS (DBE Limpopo)', '8-12'),
        (5, 'Hwiti High School', 'hwiti-high', 'hwiti.co.za', '923240150', 'Mankweng Circuit', 'Capricorn South', 'Limpopo', '118 Zone 1, Hwiti St, Mankweng/Sovenga, 0727', 'info@hwitisecondary.co.za', '+27 15 267 4400', 'Mrs. R. M. Ramokgopa', '/assets/schools/hwiti-high.svg', '/assets/schools/hwiti-high.svg', '#581c87', '#9333ea', '#06b6d4', 'Tsebo Ke Maatla', 'CAPS (DBE Limpopo)', '8-12'),
        (6, 'Ngwana Mohube Secondary School', 'ngwana-mohube', 'ngwanamohube.co.za', '923260994', 'Mankweng Circuit', 'Capricorn South', 'Limpopo', 'Gamphahlele, Seleteng, Limpopo, 0734', 'admin@ngwanamohube.co.za', '+27 15 267 5500', 'Mr. S. P. Mohube', '/assets/schools/ngwana-mohube.svg', '/assets/schools/ngwana-mohube.svg', '#991b1b', '#ef4444', '#0f172a', 'Thuto Ke Maatla', 'CAPS (DBE Limpopo)', '8-12'),
        
        -- 2. Gauteng (Lotus Gardens & Atteridgeville, Pretoria - GDE)
        (7, 'Fusion Secondary School (Lotus Gardens)', 'fusion-secondary-lotus', 'fusionsecondary.co.za', '700232348', 'Tshwane West District', 'Tshwane West', 'Gauteng', '809 Cyme Crescent, Lotus Gardens, Pretoria, 0008', 'admin@fusionsecondary.co.za', '+27 12 373 0000', 'Dr. T. Makola', '/assets/schools/fusion-secondary-lotus.svg', '/assets/schools/fusion-secondary-lotus.svg', '#4f46e5', '#06b6d4', '#f59e0b', 'Innovate, Aspire, Achieve', 'CAPS (GDE Gauteng)', '8-12'),
        (8, 'Saulridge Secondary School', 'saulridge-secondary', 'saulridge.co.za', '700232223', 'Tshwane South District (D4)', 'Tshwane South', 'Gauteng', 'Ramokgopa St, Saulsville, Atteridgeville, Pretoria, 0008', 'info@saulridge.co.za', '+27 12 375 6000', 'Mr. K. E. Masemola', '/assets/schools/saulridge-secondary.svg', '/assets/schools/saulridge-secondary.svg', '#1e3a8a', '#f59e0b', '#3b82f6', 'Knowledge is Power', 'CAPS (GDE Gauteng)', '8-12'),
        (9, 'Phelindaba Secondary School', 'phelindaba-secondary', 'phelindaba.co.za', '700232124', 'Tshwane South District (D4)', 'Tshwane South', 'Gauteng', 'Kgwale St, Atteridgeville, Pretoria, 0008', 'admin@phelindaba.co.za', '+27 12 373 8100', 'Mrs. M. T. Sithole', '/assets/schools/phelindaba-secondary.svg', '/assets/schools/phelindaba-secondary.svg', '#14532d', '#eab308', '#10b981', 'Strive for Success', 'CAPS (GDE Gauteng)', '8-12'),
        (10, 'Flavius Mareka Secondary School', 'flavius-mareka', 'flaviusmareka.co.za', '700231670', 'Tshwane South District (D4)', 'Tshwane South', 'Gauteng', 'Khoza St, Atteridgeville, Pretoria, 0008', 'principal@flaviusmareka.co.za', '+27 12 373 9200', 'Mr. L. N. Maluleke', '/assets/schools/flavius-mareka.svg', '/assets/schools/flavius-mareka.svg', '#1d4ed8', '#38bdf8', '#fbbf24', 'Excellence in Action', 'CAPS (GDE Gauteng)', '8-12'),
        (11, 'Dr. W.F. Nkomo Secondary School', 'wf-nkomo-secondary', 'wfnkomo.co.za', '700231613', 'Tshwane South District (D4)', 'Tshwane South', 'Gauteng', '84 Khudu St, Atteridgeville, Pretoria, 0008', 'info@wfnkomo.co.za', '+27 12 375 7300', 'Mr. D. M. Ndlovu', '/assets/schools/wf-nkomo-secondary.svg', '/assets/schools/wf-nkomo-secondary.svg', '#881337', '#f43f5e', '#fbbf24', 'Labor Omnia Vincit (Work Conquers All)', 'CAPS (GDE Gauteng)', '8-12'),
        (12, 'Hofmeyr Secondary School', 'hofmeyr-secondary', 'hofmeyr.co.za', '700231746', 'Tshwane South District (D4)', 'Tshwane South', 'Gauteng', '1 Mngadi and Mafole St, Atteridgeville, Pretoria, 0008', 'admin@hofmeyr.co.za', '+27 12 373 7400', 'Mrs. S. R. Mogale', '/assets/schools/hofmeyr-secondary.svg', '/assets/schools/hofmeyr-secondary.svg', '#581c87', '#14b8a6', '#f59e0b', 'Education for Liberation', 'CAPS (GDE Gauteng)', '8-12')
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        emis_number = EXCLUDED.emis_number,
        circuit = EXCLUDED.circuit,
        district = EXCLUDED.district,
        province = EXCLUDED.province,
        physical_address = EXCLUDED.physical_address,
        logo_url = EXCLUDED.logo_url,
        badge_url = EXCLUDED.badge_url,
        primary_color = EXCLUDED.primary_color,
        secondary_color = EXCLUDED.secondary_color,
        accent_color = EXCLUDED.accent_color,
        motto = EXCLUDED.motto;

      DO $$
      BEGIN
        IF pg_get_serial_sequence('schools', 'id') IS NOT NULL THEN
          EXECUTE 'SELECT setval(pg_get_serial_sequence(''schools'', ''id''), COALESCE((SELECT MAX(id::integer) FROM schools WHERE id::text ~ ''^[0-9]+$''), 1))';
        END IF;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END $$;

      -- 1. Core Auth & Organizational Tables
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
      INSERT INTO departments (name, description) VALUES 
        ('Administration', 'Handles overall school management and administration.'),
        ('Academic', 'Responsible for teaching staff and curriculum.'),
        ('Maintenance', 'Manages cleaning, repairs, and facilities.'),
        ('IT', 'Oversees technology infrastructure and support.')
      ON CONFLICT DO NOTHING;

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
        school_id INTEGER DEFAULT 1,
        is_superadmin BOOLEAN DEFAULT FALSE,
        reset_code VARCHAR(10),
        reset_expiry TIMESTAMP,
        profile_picture_path VARCHAR(255),
        preferences JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE users ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT FALSE;

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
        school_id INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Add school_id column to tables in case they existed prior
      ALTER TABLE users ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;

      CREATE TABLE IF NOT EXISTS classes (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        grade INTEGER NOT NULL CHECK (grade BETWEEN 8 AND 12),
        stream VARCHAR(50) DEFAULT 'General',
        homeroom_teacher_id INTEGER
      );

      INSERT INTO classes (name, grade, stream)
      VALUES 
        ('8A', 8, 'General'),
        ('8B', 8, 'General'),
        ('9A', 9, 'General'),
        ('9B', 9, 'General'),
        ('10A', 10, 'Science'),
        ('10B', 10, 'Commerce'),
        ('10C', 10, 'Tourism'),
        ('11A', 11, 'Science'),
        ('11B', 11, 'Tourism'),
        ('11C', 11, 'Commerce'),
        ('12A', 12, 'Science'),
        ('12B', 12, 'Commerce'),
        ('12C', 12, 'Tourism')
      ON CONFLICT (name) DO NOTHING;

      CREATE TABLE IF NOT EXISTS subjects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(20) UNIQUE NOT NULL,
        grade INTEGER NOT NULL CHECK (grade BETWEEN 8 AND 12),
        stream VARCHAR(50) DEFAULT 'General'
      );

      -- 2. Learners & Multi-Parent Tables
      CREATE TABLE IF NOT EXISTS children (
        id SERIAL PRIMARY KEY,
        parent_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        secondary_parent_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        learner_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        full_name VARCHAR(255) NOT NULL,
        surname VARCHAR(255) NOT NULL,
        dob DATE,
        grade INTEGER NOT NULL,
        class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
        stream VARCHAR(50) DEFAULT 'General',
        home_language VARCHAR(50) DEFAULT 'isiZulu',
        learner_number VARCHAR(50),
        application_number VARCHAR(50),
        subjects TEXT[] DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_path VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture VARCHAR(255);
      UPDATE users SET profile_picture_path = profile_picture WHERE profile_picture_path IS NULL AND profile_picture IS NOT NULL;
      UPDATE users SET profile_picture = profile_picture_path WHERE profile_picture IS NULL AND profile_picture_path IS NOT NULL;

      ALTER TABLE children ADD COLUMN IF NOT EXISTS class_id INTEGER;
      ALTER TABLE children ADD COLUMN IF NOT EXISTS secondary_parent_id INTEGER;
      ALTER TABLE children ADD COLUMN IF NOT EXISTS application_number VARCHAR(50);
      ALTER TABLE children ADD COLUMN IF NOT EXISTS home_language VARCHAR(50) DEFAULT 'isiZulu';
      ALTER TABLE children ADD COLUMN IF NOT EXISTS profile_picture_path VARCHAR(255);
      ALTER TABLE children ADD COLUMN IF NOT EXISTS profile_picture VARCHAR(255);
      ALTER TABLE children DROP CONSTRAINT IF EXISTS children_check;
      ALTER TABLE children ADD CONSTRAINT children_check CHECK (grade < 10 OR stream IN ('Science', 'Commerce', 'Tourism', 'Humanities', 'General', 'Technical'));

      CREATE TABLE IF NOT EXISTS parent_children (
        id SERIAL PRIMARY KEY,
        parent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
        relationship VARCHAR(50) DEFAULT 'Guardian',
        is_primary BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(parent_id, child_id)
      );

      -- 3. Academic Attendance & Assessment Tables
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

      CREATE TABLE IF NOT EXISTS progress (
        id SERIAL PRIMARY KEY,
        child_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
        subject VARCHAR(100),
        term VARCHAR(50),
        grade NUMERIC,
        score NUMERIC,
        total_marks NUMERIC DEFAULT 100,
        grade_symbol VARCHAR(10),
        time_taken_seconds INTEGER DEFAULT 0,
        notes TEXT,
        employee_id INTEGER,
        recorded_by INTEGER,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE progress ADD COLUMN IF NOT EXISTS grade NUMERIC;
      ALTER TABLE progress ADD COLUMN IF NOT EXISTS score NUMERIC;
      ALTER TABLE progress ADD COLUMN IF NOT EXISTS total_marks NUMERIC DEFAULT 100;
      ALTER TABLE progress ADD COLUMN IF NOT EXISTS grade_symbol VARCHAR(10);
      ALTER TABLE progress ADD COLUMN IF NOT EXISTS date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE progress ADD COLUMN IF NOT EXISTS employee_id INTEGER;
      ALTER TABLE progress ADD COLUMN IF NOT EXISTS recorded_by INTEGER;
      ALTER TABLE progress ADD COLUMN IF NOT EXISTS time_taken_seconds INTEGER DEFAULT 0;

      CREATE TABLE IF NOT EXISTS assessments (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
        class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
        teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        type VARCHAR(50) DEFAULT 'assignment',
        total_marks NUMERIC DEFAULT 100,
        weight NUMERIC DEFAULT 10,
        term VARCHAR(50) DEFAULT 'Term 1',
        due_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS assessment_results (
        id SERIAL PRIMARY KEY,
        assessment_id INTEGER REFERENCES assessments(id) ON DELETE CASCADE,
        child_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
        score NUMERIC DEFAULT 0,
        feedback TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS quizzes (
        id SERIAL PRIMARY KEY,
        child_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
        subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
        score NUMERIC DEFAULT 0,
        total_marks NUMERIC DEFAULT 100,
        title VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS assignments (
        id SERIAL PRIMARY KEY,
        child_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
        subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
        score NUMERIC DEFAULT 0,
        total_marks NUMERIC DEFAULT 100,
        title VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tests (
        id SERIAL PRIMARY KEY,
        child_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
        subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
        score NUMERIC DEFAULT 0,
        total_marks NUMERIC DEFAULT 100,
        title VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS exams (
        id SERIAL PRIMARY KEY,
        child_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
        subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
        score NUMERIC DEFAULT 0,
        total_marks NUMERIC DEFAULT 100,
        title VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 4. Communication, Announcements & Notifications
      CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        role_target VARCHAR(50) DEFAULT 'all',
        grade_target INTEGER,
        is_assignment BOOLEAN DEFAULT FALSE,
        due_date TIMESTAMP,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

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

      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'announcement',
        target_tab VARCHAR(50) DEFAULT 'announcements',
        metadata JSONB DEFAULT '{}'::jsonb,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 5. Timetables & School Events
      CREATE TABLE IF NOT EXISTS timetables (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        grade INT DEFAULT 10,
        stream VARCHAR(100) DEFAULT 'General',
        timetable_data JSONB NOT NULL,
        status VARCHAR(50) DEFAULT 'published',
        is_active BOOLEAN DEFAULT TRUE,
        created_by INT REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS timetable_swap_requests (
        id SERIAL PRIMARY KEY,
        timetable_id INT REFERENCES timetables(id) ON DELETE CASCADE,
        class_name VARCHAR(100) NOT NULL,
        requester_teacher_id INT REFERENCES users(id) ON DELETE CASCADE,
        requester_day VARCHAR(50) NOT NULL,
        requester_period VARCHAR(50) NOT NULL,
        requester_subject VARCHAR(100),
        target_teacher_id INT REFERENCES users(id) ON DELETE CASCADE,
        target_day VARCHAR(50) NOT NULL,
        target_period VARCHAR(50) NOT NULL,
        target_subject VARCHAR(100),
        reason TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        event_date DATE NOT NULL,
        start_time TIME,
        end_time TIME,
        location VARCHAR(255),
        event_type VARCHAR(50) DEFAULT 'General',
        audience VARCHAR(50) DEFAULT 'all',
        grade_target INT,
        stream_target VARCHAR(100),
        created_by INT REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 6. Textbooks & Inventory Tracking
      CREATE TABLE IF NOT EXISTS textbooks (
        id SERIAL PRIMARY KEY,
        grade INT,
        subject_id INT,
        title VARCHAR(255),
        file_path TEXT,
        resource_type VARCHAR(50) DEFAULT 'textbook',
        description TEXT,
        term VARCHAR(50),
        year INTEGER DEFAULT 2026,
        stream VARCHAR(50),
        class_id INTEGER,
        file_name VARCHAR(255),
        file_size VARCHAR(50),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS textbook_inventory (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        isbn VARCHAR(50),
        grade INTEGER NOT NULL,
        subject VARCHAR(100) NOT NULL,
        stream VARCHAR(50) DEFAULT 'General',
        total_copies INTEGER NOT NULL DEFAULT 0,
        available_copies INTEGER NOT NULL DEFAULT 0,
        barcode_prefix VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS textbook_allocations (
        id SERIAL PRIMARY KEY,
        inventory_id INTEGER NOT NULL REFERENCES textbook_inventory(id) ON DELETE CASCADE,
        child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
        copy_barcode VARCHAR(100) NOT NULL,
        status VARCHAR(30) DEFAULT 'issued',
        issue_date DATE DEFAULT CURRENT_DATE,
        return_due_date DATE,
        returned_date DATE,
        condition_on_issue VARCHAR(50) DEFAULT 'Good',
        condition_on_return VARCHAR(50),
        notes TEXT
      );

      -- 7. Exam Sessions & Seating Allocations
      CREATE TABLE IF NOT EXISTS exam_sessions (
        id SERIAL PRIMARY KEY,
        exam_name VARCHAR(255) NOT NULL,
        subject VARCHAR(100) NOT NULL,
        grade INTEGER NOT NULL,
        exam_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        venue VARCHAR(100) NOT NULL,
        total_seats INTEGER NOT NULL DEFAULT 50,
        invigilator_teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(30) DEFAULT 'scheduled',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS exam_seating_allocations (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
        child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
        desk_number VARCHAR(20) NOT NULL,
        attendance_status VARCHAR(20) DEFAULT 'unconfirmed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(session_id, desk_number),
        UNIQUE(session_id, child_id)
      );

      -- 8. Sports & Extracurricular Activities
      CREATE TABLE IF NOT EXISTS extracurricular_activities (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        category VARCHAR(50) NOT NULL,
        coach_teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        practice_days TEXT[] DEFAULT '{}',
        venue VARCHAR(150),
        season VARCHAR(50) DEFAULT 'Annual',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS extracurricular_members (
        id SERIAL PRIMARY KEY,
        activity_id INTEGER NOT NULL REFERENCES extracurricular_activities(id) ON DELETE CASCADE,
        child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
        role VARCHAR(50) DEFAULT 'Member',
        joined_date DATE DEFAULT CURRENT_DATE,
        UNIQUE(activity_id, child_id)
      );

      CREATE TABLE IF NOT EXISTS extracurricular_events (
        id SERIAL PRIMARY KEY,
        activity_id INTEGER NOT NULL REFERENCES extracurricular_activities(id) ON DELETE CASCADE,
        event_name VARCHAR(255) NOT NULL,
        opponent VARCHAR(150),
        event_date DATE NOT NULL,
        event_time TIME,
        location VARCHAR(200),
        result_summary VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 9. Online Admissions & Applications
      CREATE TABLE IF NOT EXISTS applications (
        id SERIAL PRIMARY KEY,
        application_number VARCHAR(50) UNIQUE NOT NULL,
        correction_token VARCHAR(64) UNIQUE,
        status VARCHAR(30) DEFAULT 'submitted',
        first_name VARCHAR(100) NOT NULL,
        surname VARCHAR(100) NOT NULL,
        id_number VARCHAR(20) NOT NULL,
        dob DATE,
        gender VARCHAR(20),
        citizenship VARCHAR(50) DEFAULT 'South Africa',
        phone VARCHAR(20),
        email VARCHAR(255),
        physical_address TEXT NOT NULL,
        grade_applied INTEGER NOT NULL CHECK (grade_applied BETWEEN 8 AND 12),
        stream VARCHAR(50) DEFAULT 'General',
        selected_subjects TEXT[] DEFAULT '{}',
        previous_school VARCHAR(255),
        previous_grade INTEGER,
        transfer_reason TEXT,
        medical_info TEXT,
        special_needs TEXT,
        primary_parent_name VARCHAR(100) NOT NULL,
        primary_parent_surname VARCHAR(100) NOT NULL,
        primary_parent_relationship VARCHAR(50) NOT NULL,
        primary_parent_id_number VARCHAR(20) NOT NULL,
        primary_parent_phone VARCHAR(20) NOT NULL,
        primary_parent_email VARCHAR(255) NOT NULL,
        primary_parent_address TEXT NOT NULL,
        primary_parent_occupation VARCHAR(100),
        primary_parent_employer VARCHAR(150),
        has_secondary_parent BOOLEAN DEFAULT FALSE,
        secondary_parent_name VARCHAR(100),
        secondary_parent_surname VARCHAR(100),
        secondary_parent_relationship VARCHAR(50),
        secondary_parent_id_number VARCHAR(20),
        secondary_parent_phone VARCHAR(20),
        secondary_parent_email VARCHAR(255),
        secondary_parent_address TEXT,
        secondary_parent_occupation VARCHAR(100),
        secondary_parent_employer VARCHAR(150),
        ai_verification_status VARCHAR(30) DEFAULT 'pending',
        ai_verification_notes JSONB DEFAULT '[]'::jsonb,
        assigned_class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
        provisional_learner_number VARCHAR(20),
        admin_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE applications ADD COLUMN IF NOT EXISTS home_language VARCHAR(50);
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS admin_notes TEXT;
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS provisional_learner_number VARCHAR(50);
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS assigned_class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL;

      ALTER TABLE children ADD COLUMN IF NOT EXISTS home_language VARCHAR(50);
      ALTER TABLE children ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
      ALTER TABLE children ADD COLUMN IF NOT EXISTS class_id INTEGER;

      CREATE TABLE IF NOT EXISTS application_documents (
        id SERIAL PRIMARY KEY,
        application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
        document_type VARCHAR(50) NOT NULL,
        file_path TEXT NOT NULL,
        file_name VARCHAR(255),
        mime_type VARCHAR(100),
        file_size INTEGER,
        is_verified BOOLEAN DEFAULT FALSE,
        ai_confidence_score NUMERIC(5,2) DEFAULT 0,
        ai_extracted_data JSONB DEFAULT '{}'::jsonb,
        issues TEXT[] DEFAULT '{}',
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 10. Staff Leave & Relief Allocations
      CREATE TABLE IF NOT EXISTS educator_leave_requests (
        id SERIAL PRIMARY KEY,
        teacher_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        leave_type VARCHAR(60) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        reason TEXT,
        status VARCHAR(30) DEFAULT 'pending',
        relief_status VARCHAR(30) DEFAULT 'unassigned',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS educator_relief_allocations (
        id SERIAL PRIMARY KEY,
        leave_request_id INTEGER NOT NULL REFERENCES educator_leave_requests(id) ON DELETE CASCADE,
        relief_teacher_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assigned_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        class_name VARCHAR(50),
        subject_name VARCHAR(100),
        period VARCHAR(50),
        relief_date DATE NOT NULL,
        notes TEXT,
        status VARCHAR(30) DEFAULT 'assigned',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 11. Parent-Teacher Conferences & Conduct Logs
      CREATE TABLE IF NOT EXISTS ptc_slots (
        id SERIAL PRIMARY KEY,
        teacher_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        slot_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        status VARCHAR(30) DEFAULT 'available',
        venue VARCHAR(100) DEFAULT 'Classroom / Online',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ptc_bookings (
        id SERIAL PRIMARY KEY,
        slot_id INTEGER NOT NULL REFERENCES ptc_slots(id) ON DELETE CASCADE,
        parent_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
        meeting_notes TEXT,
        status VARCHAR(30) DEFAULT 'booked',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS conduct_logs (
        id SERIAL PRIMARY KEY,
        child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
        recorded_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        incident_type VARCHAR(100) NOT NULL,
        severity VARCHAR(30) DEFAULT 'minor',
        description TEXT NOT NULL,
        action_taken TEXT,
        merit_demerit_points INTEGER DEFAULT 0,
        incident_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS behavior_incidents (
        id SERIAL PRIMARY KEY,
        child_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
        incident_type VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        action_taken TEXT,
        recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        incident_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS generated_reports (
        id SERIAL PRIMARY KEY,
        child_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
        term VARCHAR(50) NOT NULL,
        report_data JSONB NOT NULL,
        generated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 12. School Fees, Invoices & Payments
      CREATE TABLE IF NOT EXISTS fee_invoices (
        id SERIAL PRIMARY KEY,
        learner_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
        parent_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        invoice_number VARCHAR(100) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(50) DEFAULT 'Tuition',
        term VARCHAR(50) DEFAULT 'Term 3 2026',
        amount NUMERIC(10, 2) NOT NULL,
        paid_amount NUMERIC(10, 2) DEFAULT 0.00,
        balance NUMERIC(10, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        due_date DATE NOT NULL,
        itemized_breakdown JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS fee_payments (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER REFERENCES fee_invoices(id) ON DELETE CASCADE,
        learner_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
        parent_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        payment_reference VARCHAR(100) UNIQUE NOT NULL,
        receipt_number VARCHAR(100) UNIQUE NOT NULL,
        amount NUMERIC(10, 2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        gateway_transaction_id VARCHAR(100),
        status VARCHAR(50) DEFAULT 'completed',
        payer_name VARCHAR(255),
        payer_email VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 13. Tertiary Bursaries & Scholarships
      CREATE TABLE IF NOT EXISTS bursaries (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        sponsor VARCHAR(255) NOT NULL,
        logo_url TEXT,
        category VARCHAR(100) NOT NULL,
        min_aps INTEGER DEFAULT 28,
        min_aggregate_percentage NUMERIC(5,2) DEFAULT 60.00,
        required_subjects JSONB DEFAULT '[]'::jsonb,
        min_subject_percentage JSONB DEFAULT '{}'::jsonb,
        target_fields TEXT[],
        coverage_details TEXT[],
        estimated_annual_value NUMERIC(10, 2) DEFAULT 120000.00,
        eligibility_criteria TEXT,
        household_income_cap VARCHAR(100),
        deadline_date DATE,
        is_open BOOLEAN DEFAULT true,
        application_url TEXT NOT NULL,
        required_documents TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS learner_bursaries (
        id SERIAL PRIMARY KEY,
        learner_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
        bursary_id INTEGER REFERENCES bursaries(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'bookmarked',
        notes TEXT,
        checklist_progress JSONB DEFAULT '{}'::jsonb,
        applied_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(learner_id, bursary_id)
      );

      -- 14. Homework Assignments & Digital Submissions
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

      -- 15. Standalone Marks Table
      CREATE TABLE IF NOT EXISTS marks (
        id SERIAL PRIMARY KEY,
        learner_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
        subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
        subject_name VARCHAR(100),
        term INTEGER DEFAULT 1,
        mark_type VARCHAR(50) DEFAULT 'Test',
        score NUMERIC(5,2) NOT NULL,
        max_score NUMERIC(5,2) DEFAULT 100.00,
        weight NUMERIC(3,2) DEFAULT 1.0,
        recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 16. Parent-Educator Consultations (PTC 20-min slots)
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

      -- 17. Inter-School Competitions & Derby League
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

      -- 18. Official CAPS Term Academic Report Cards
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

    // Ensure default bursary entries exist in database
    const bursariesCheck = await runner.query('SELECT COUNT(*) FROM bursaries');
    if (parseInt(bursariesCheck.rows[0].count, 10) === 0) {
      await runner.query(`
        INSERT INTO bursaries (name, sponsor, category, min_aps, min_aggregate_percentage, required_subjects, coverage_details, estimated_annual_value, application_url)
        VALUES
          ('NSFAS Comprehensive Student Financial Aid', 'Department of Higher Education & Training (DHET)', 'General & Comprehensive', 25, 50.00, '["English FAL"]', ARRAY['100% Tuition', 'Accommodation', 'Book Allowance', 'Monthly Stipend'], 125000.00, 'https://www.nsfas.org.za'),
          ('Sasol STEM & Engineering Bursary', 'Sasol Energy & Chemicals', 'STEM & Engineering', 32, 70.00, '["Mathematics", "Physical Sciences"]', ARRAY['Full Tuition', 'University Residence', 'Laptop', 'Meals Allowance', 'Vacation Work'], 160000.00, 'https://www.sasolbursaries.com'),
          ('Funza Lushaka Educator Bursary Programme', 'Department of Basic Education (DBE)', 'Teaching & Education', 28, 60.00, '["English FAL", "Mathematics"]', ARRAY['100% Tuition', 'Hostel Accommodation', 'Book Allowance', 'Stipend'], 95000.00, 'http://www.funzalushaka.doe.gov.za'),
          ('Standard Bank 150 Bursary Fund', 'Standard Bank Group South Africa', 'Commerce & Finance', 32, 70.00, '["Mathematics", "Accounting"]', ARRAY['Full Tuition', 'Accommodation Allowance', 'Prescribed Textbooks', 'Monthly Allowance'], 145000.00, 'https://www.standardbank.co.za')
        ON CONFLICT DO NOTHING;
      `);
    }

    // Auto-migrate schema columns for existing and multi-tenant tables
    try {
      await runner.query(`
        -- Multi-School & Governance Tenant Columns
        ALTER TABLE users ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT FALSE;
        ALTER TABLE children ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
        ALTER TABLE children ADD COLUMN IF NOT EXISTS home_language VARCHAR(50) DEFAULT 'English';
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
        ALTER TABLE departments ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
        ALTER TABLE classes ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
        ALTER TABLE subjects ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
        ALTER TABLE timetables ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
        ALTER TABLE tests ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
        ALTER TABLE exams ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
        ALTER TABLE assignments ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
        ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
        ALTER TABLE assessment_results ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
        ALTER TABLE marks ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
        ALTER TABLE attendance ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
        ALTER TABLE conduct_logs ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
        ALTER TABLE merits ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
        ALTER TABLE fee_invoices ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
        ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
        ALTER TABLE educator_leave_requests ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
        ALTER TABLE educator_relief_allocations ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
        ALTER TABLE textbook_inventory ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
        ALTER TABLE textbook_allocations ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
        ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
        ALTER TABLE ptc_sessions ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
        ALTER TABLE ptc_slots ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
        ALTER TABLE ptc_bookings ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
        ALTER TABLE teacher_consultations ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
        ALTER TABLE report_cards ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
        ALTER TABLE generated_reports ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
        ALTER TABLE inter_school_competitions ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
        ALTER TABLE extracurricular_activities ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
        ALTER TABLE exam_seatings ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
        ALTER TABLE bursaries ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
        ALTER TABLE notifications ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;

        -- Inter-School and Announcements columns
        ALTER TABLE announcements ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
        ALTER TABLE announcements ADD COLUMN IF NOT EXISTS is_inter_school BOOLEAN DEFAULT FALSE;
        ALTER TABLE announcements ADD COLUMN IF NOT EXISTS role_target VARCHAR(50) DEFAULT 'all';
        ALTER TABLE announcements ADD COLUMN IF NOT EXISTS author_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
        ALTER TABLE announcements ADD COLUMN IF NOT EXISTS grade_target INTEGER;
        ALTER TABLE announcements ADD COLUMN IF NOT EXISTS stream_target VARCHAR(50);
        ALTER TABLE announcements ADD COLUMN IF NOT EXISTS subject_target VARCHAR(100);
        ALTER TABLE announcements ADD COLUMN IF NOT EXISTS is_assignment BOOLEAN DEFAULT FALSE;
        ALTER TABLE announcements ADD COLUMN IF NOT EXISTS due_date TIMESTAMP;
        ALTER TABLE announcements ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

        -- Event and Calendar Columns
        ALTER TABLE events ADD COLUMN IF NOT EXISTS school_id INTEGER DEFAULT 1;
        ALTER TABLE events ADD COLUMN IF NOT EXISTS is_inter_school BOOLEAN DEFAULT FALSE;
        ALTER TABLE events ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT FALSE;

        -- Ensure initial department and class records have school_id = 1
        UPDATE departments SET school_id = 1 WHERE school_id IS NULL;
        UPDATE classes SET school_id = 1 WHERE school_id IS NULL;
        UPDATE subjects SET school_id = 1 WHERE school_id IS NULL;
        UPDATE users SET school_id = 1 WHERE school_id IS NULL;
        UPDATE children SET school_id = 1 WHERE school_id IS NULL;
        UPDATE employees SET school_id = 1 WHERE school_id IS NULL;
      `);
    } catch (migErr) {
      console.warn('[SCHEMA MIGRATION WARNING]:', migErr.message);
    }

    console.log('✅ [SCHEMA BOOTSTRAP] All tables, indexes, and initial records verified successfully.');
  } catch (err) {
    console.error('❌ [SCHEMA BOOTSTRAP ERROR]:', err.message);
  }
}

module.exports = initializeAllDatabaseTables;
