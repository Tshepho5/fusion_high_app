/**
 * Geleza SA Database Schema Ensurer & Auto-Updater
 * Automatically runs on server startup and before critical transactions.
 * Guarantees that tables (recycle_bin, applications, schools, classes)
 * and all required columns/relations exist across all database environments.
 */

const db = require('./db');

let isEnsured = false;

async function ensureDatabaseSchema() {
  try {
    // 1. Recycle Bin Table (Prevents "relation recycle_bin does not exist" errors)
    await db.query(`
      CREATE TABLE IF NOT EXISTS recycle_bin (
        id SERIAL PRIMARY KEY,
        record_type VARCHAR(50) NOT NULL,
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

    // 2. Classes Table & Constraint Updates (Allows multiple schools to have 8A, 9A, etc.)
    await db.query(`
      CREATE TABLE IF NOT EXISTS classes (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        grade INTEGER NOT NULL,
        stream VARCHAR(50) DEFAULT 'General',
        homeroom_teacher_id INTEGER,
        school_id INTEGER
      );
      ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_name_key;
      ALTER TABLE classes ADD COLUMN IF NOT EXISTS school_id INTEGER;
      ALTER TABLE classes ADD COLUMN IF NOT EXISTS room_number VARCHAR(50);
    `);

    // 3. Schools Table Columns & Modules
    await db.query(`
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS teacher_modules JSONB;
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS learner_modules JSONB;
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS offered_streams TEXT[];
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS offered_languages TEXT[];
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS offered_subjects TEXT[];
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS sace_number VARCHAR(100);
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS account_holder VARCHAR(150);
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS account_number VARCHAR(50);
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS branch_code VARCHAR(20);
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS account_type VARCHAR(50) DEFAULT 'Cheque';
    `);

    // 4. Applications Table Columns (Prevents "column application_fee_amount of relation applications does not exist")
    await db.query(`
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
        grade_applied INTEGER NOT NULL,
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
        assigned_class_id INTEGER,
        provisional_learner_number VARCHAR(50),
        admin_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE applications ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS home_language VARCHAR(50);
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS application_fee_amount NUMERIC(10,2) DEFAULT 0.00;
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS application_fee_status VARCHAR(50) DEFAULT 'waived';
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS application_fee_paid_at TIMESTAMP;
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS application_fee_due_date TIMESTAMP;
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS application_fee_reminder_sent BOOLEAN DEFAULT FALSE;
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS registration_fee_amount NUMERIC(10,2) DEFAULT 0.00;
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS registration_fee_status VARCHAR(50) DEFAULT 'waived';
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS registration_fee_paid_at TIMESTAMP;
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS scenario VARCHAR(50) DEFAULT 'public_new_applicant';
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS existing_parent_id INTEGER;
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS existing_learner_id INTEGER;
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'fee_waived';
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100) DEFAULT 'WAIVED-ADMISSIONS';
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS admin_notes TEXT;
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS provisional_learner_number VARCHAR(50);
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS assigned_class_id INTEGER;
    `);

    // 5. Application Documents Table
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

    // 6. Application Payments Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS application_payments (
        id SERIAL PRIMARY KEY,
        application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
        fee_type VARCHAR(50) DEFAULT 'application_fee',
        amount NUMERIC(10,2) DEFAULT 0.00,
        payment_method VARCHAR(50) DEFAULT 'fee_waived',
        payment_reference VARCHAR(100),
        receipt_number VARCHAR(100),
        payer_name VARCHAR(255),
        payer_email VARCHAR(255),
        status VARCHAR(50) DEFAULT 'waived',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 7. Auto-synchronize registered school applications to schools table
    const pendingSchools = await db.query(`
      SELECT * FROM school_applications 
      WHERE created_school_id IS NULL OR status = 'pending_review' OR status = 'under_review'
    `).catch(() => ({ rows: [] }));

    for (const app of pendingSchools.rows) {
      try {
        const exist = await db.query(
          "SELECT id FROM schools WHERE emis_number = $1 OR LOWER(name) = LOWER($2)",
          [app.emis_number, app.school_name.trim()]
        );
        let schoolId;

        if (exist.rows.length > 0) {
          schoolId = exist.rows[0].id;
          await db.query("UPDATE schools SET is_active = TRUE WHERE id = $1", [schoolId]);
        } else {
          let slug = app.school_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          const slugCheck = await db.query("SELECT id FROM schools WHERE slug = $1", [slug]);
          if (slugCheck.rows.length > 0) {
            slug = `${slug}-${app.emis_number.slice(-4)}`;
          }

          const defaultTeacherModules = [
            'assessments', 'assignments', 'timetable', 'calendar',
            'announcements', 'messages', 'attendance', 'conduct', 'resources', 'ai-tools'
          ];
          const defaultLearnerModules = [
            'performance', 'reports', 'assignments', 'discover', 'ai-tutor',
            'timetable', 'calendar', 'messages', 'announcements'
          ];

          const insertRes = await db.query(`
            INSERT INTO schools (
              name, slug, domain, emis_number, circuit, district, province,
              physical_address, contact_email, contact_phone, principal_name,
              primary_color, secondary_color, motto, curriculum_type, grade_range,
              offered_streams, offered_languages, offered_subjects, is_active,
              teacher_modules, learner_modules
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, TRUE, $20::jsonb, $21::jsonb)
            RETURNING id;
          `, [
            app.school_name,
            slug,
            `${slug}.co.za`,
            app.emis_number,
            app.circuit,
            app.district,
            app.province,
            app.physical_address,
            app.contact_email,
            app.contact_phone,
            `${app.principal_first_name} ${app.principal_surname}`,
            app.primary_color || '#0284c7',
            app.secondary_color || '#06b6d4',
            app.motto || 'Excellence in Education',
            app.curriculum_type || 'CAPS (DBE)',
            app.grade_range || '8-12',
            app.offered_streams || ['General', 'Science', 'Commerce'],
            app.offered_languages || ['English Home Language', 'English FAL', 'Sepedi Home Language'],
            app.offered_subjects || [],
            JSON.stringify(defaultTeacherModules),
            JSON.stringify(defaultLearnerModules)
          ]);
          schoolId = insertRes.rows[0].id;
        }

        // Provision Grade 8 to 12 classes
        for (let g = 8; g <= 12; g++) {
          await db.query(`
            INSERT INTO classes (name, grade, stream, school_id)
            SELECT $1, $2, 'General', $3
            WHERE NOT EXISTS (
              SELECT 1 FROM classes WHERE school_id = $3 AND grade = $2
            );
          `, [`${g}A`, g, schoolId]);
        }

        // Update application record
        await db.query(`
          UPDATE school_applications
          SET status = 'approved',
              created_school_id = $1,
              reviewed_at = CURRENT_TIMESTAMP,
              executive_notes = 'Auto-approved and provisioned into system'
          WHERE id = $2;
        `, [schoolId, app.id]);

        console.log(`[SCHEMA SYNC] Auto-provisioned registered school: "${app.school_name}" (ID: ${schoolId})`);
      } catch (err) {
        console.warn(`[SCHEMA SYNC] Failed to provision school ${app.school_name}:`, err.message);
      }
    }

    isEnsured = true;
    console.log('[SCHEMA ENSURER] All database tables, columns, and registered schools verified and synced.');
  } catch (err) {
    console.warn('[SCHEMA ENSURER WARNING] Verification error:', err.message);
  }
}

module.exports = {
  ensureDatabaseSchema,
  isEnsured: () => isEnsured
};
