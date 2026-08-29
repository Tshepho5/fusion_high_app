const db = require('./db');

async function initApplicationTables() {
  try {
    console.log('[DB] Ensuring Applications & Multi-Parent tables exist...');

    // 1. Classes Table (must exist before applications references it)
    await db.query(`
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
    `);

    // 2. Applications Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id SERIAL PRIMARY KEY,
        application_number VARCHAR(50) UNIQUE NOT NULL,
        correction_token VARCHAR(64) UNIQUE,
        status VARCHAR(30) DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_ai_review', 'action_required', 'approved', 'rejected', 'enrolled', 'waitlisted')),
        
        -- Learner Information
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

        -- Primary Parent / Guardian (Next of Kin 1)
        primary_parent_name VARCHAR(100) NOT NULL,
        primary_parent_surname VARCHAR(100) NOT NULL,
        primary_parent_relationship VARCHAR(50) NOT NULL,
        primary_parent_id_number VARCHAR(20) NOT NULL,
        primary_parent_phone VARCHAR(20) NOT NULL,
        primary_parent_email VARCHAR(255) NOT NULL,
        primary_parent_address TEXT NOT NULL,
        primary_parent_occupation VARCHAR(100),
        primary_parent_employer VARCHAR(150),

        -- Secondary Parent / Guardian (Next of Kin 2 - Optional)
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

        -- AI Review & Capacity
        ai_verification_status VARCHAR(30) DEFAULT 'pending',
        ai_verification_notes JSONB DEFAULT '[]'::jsonb,
        assigned_class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
        provisional_learner_number VARCHAR(20),
        admin_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Application Documents Table
    await db.query(`
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
    `);

    // 4. Multi-Parent Support: Ensure children and parent_children tables
    await db.query(`
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
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS home_language VARCHAR(50);
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS admin_notes TEXT;
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS provisional_learner_number VARCHAR(50);
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS assigned_class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL;

      ALTER TABLE children ADD COLUMN IF NOT EXISTS home_language VARCHAR(50);
      ALTER TABLE children ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
      ALTER TABLE children ADD COLUMN IF NOT EXISTS class_id INTEGER;
      ALTER TABLE children ADD COLUMN IF NOT EXISTS secondary_parent_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE children ADD COLUMN IF NOT EXISTS application_number VARCHAR(50);

      CREATE TABLE IF NOT EXISTS parent_children (
        id SERIAL PRIMARY KEY,
        parent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
        relationship VARCHAR(50) DEFAULT 'Guardian',
        is_primary BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(parent_id, child_id)
      );
    `);

    console.log('[DB] Application schema initialized successfully.');
  } catch (err) {
    console.error('[DB] Error initializing application tables:', err.message);
  }
}

module.exports = initApplicationTables;
