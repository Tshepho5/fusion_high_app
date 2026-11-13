const db = require('./db');
/**
 * Migration & Schema Initialization for:
 * 1. Secured School Applications Table (Principal Registration & Accreditation)
 * 2. School-Specific Subjects, Streams, and Home Languages
 * 3. Colleague / Staff Invites Table (Teachers & Coaches)
 * 4. Dynamic Classes & Homeroom Teacher Linking
 * 5. Demo roster password resets are disabled
 */
async function migrateSchoolOnboardingAndCleanRoster() {
  console.log('[MIGRATION] Starting School Onboarding Schema & Clean Roster Setup...');

  try {
    // 1. Create School Applications Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS school_applications (
        id SERIAL PRIMARY KEY,
        application_number VARCHAR(50) UNIQUE NOT NULL,
        status VARCHAR(30) DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'under_review', 'approved', 'declined')),
        school_name VARCHAR(255) NOT NULL,
        emis_number VARCHAR(50) NOT NULL,
        province VARCHAR(50) NOT NULL,
        district VARCHAR(100) NOT NULL,
        circuit VARCHAR(100),
        physical_address TEXT NOT NULL,
        contact_email VARCHAR(255) NOT NULL,
        contact_phone VARCHAR(50) NOT NULL,
        curriculum_type VARCHAR(100) DEFAULT 'CAPS (DBE)',
        grade_range VARCHAR(50) DEFAULT '8-12',
        offered_streams TEXT[] DEFAULT ARRAY['General','Science','Commerce','Tourism'],
        offered_languages TEXT[] DEFAULT ARRAY['English FAL','Sepedi Home Language','isiZulu Home Language'],
        offered_subjects TEXT[] DEFAULT '{}',
        principal_first_name VARCHAR(100) NOT NULL,
        principal_surname VARCHAR(100) NOT NULL,
        principal_id_number VARCHAR(20) NOT NULL,
        principal_sace_number VARCHAR(50),
        principal_email VARCHAR(255) NOT NULL,
        principal_phone VARCHAR(50) NOT NULL,
        motto TEXT,
        primary_color VARCHAR(20) DEFAULT '#0284c7',
        secondary_color VARCHAR(20) DEFAULT '#06b6d4',
        application_fee_paid NUMERIC(10,2) DEFAULT 450.00,
        registration_fee_paid NUMERIC(10,2) DEFAULT 1500.00,
        payment_status VARCHAR(30) DEFAULT 'paid',
        payment_reference VARCHAR(100),
        executive_notes TEXT,
        declined_reason TEXT,
        reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMP,
        created_school_id INTEGER REFERENCES schools(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE school_applications ADD COLUMN IF NOT EXISTS offered_streams TEXT[] DEFAULT ARRAY['General','Science','Commerce','Tourism'];
      ALTER TABLE school_applications ADD COLUMN IF NOT EXISTS offered_languages TEXT[] DEFAULT ARRAY['English FAL','Sepedi Home Language','isiZulu Home Language'];
      ALTER TABLE school_applications ADD COLUMN IF NOT EXISTS offered_subjects TEXT[] DEFAULT '{}';
      ALTER TABLE school_applications ADD COLUMN IF NOT EXISTS principal_sace_number VARCHAR(50);
      ALTER TABLE school_applications ADD COLUMN IF NOT EXISTS application_fee_paid NUMERIC(10,2) DEFAULT 450.00;
      ALTER TABLE school_applications ADD COLUMN IF NOT EXISTS registration_fee_paid NUMERIC(10,2) DEFAULT 1500.00;
      ALTER TABLE school_applications ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30) DEFAULT 'paid';
      ALTER TABLE school_applications ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100);
      ALTER TABLE school_applications ADD COLUMN IF NOT EXISTS executive_notes TEXT;
      ALTER TABLE school_applications ADD COLUMN IF NOT EXISTS declined_reason TEXT;
      ALTER TABLE school_applications ADD COLUMN IF NOT EXISTS created_school_id INTEGER REFERENCES schools(id) ON DELETE SET NULL;
      ALTER TABLE school_applications ADD COLUMN IF NOT EXISTS password_hash TEXT;
      ALTER TABLE school_applications ADD COLUMN IF NOT EXISTS logo_stored_name VARCHAR(80);
    `);

    // 2. Add School-Specific Offerings & SACE Columns to Schools Table
    await db.query(`
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS offered_streams TEXT[] DEFAULT ARRAY['General','Science','Commerce','Tourism'];
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS offered_languages TEXT[] DEFAULT ARRAY['English FAL','Sepedi Home Language','isiZulu Home Language'];
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS offered_subjects TEXT[] DEFAULT '{}';
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS sace_number VARCHAR(50);
    `);

    // 3. Create Staff / Colleague Invites Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS staff_invites (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
        invited_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        email VARCHAR(255) NOT NULL,
        full_name VARCHAR(255),
        surname VARCHAR(255),
        role_type VARCHAR(50) DEFAULT 'teacher' CHECK (role_type IN ('teacher', 'sports_coach', 'hod')),
        sace_number VARCHAR(50),
        subjects_offered TEXT[] DEFAULT '{}',
        sports_coached TEXT[] DEFAULT '{}',
        assigned_grades INTEGER[] DEFAULT '{}',
        assigned_classes TEXT[] DEFAULT '{}',
        status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'approved', 'declined')),
        invite_token VARCHAR(64) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE staff_invites ADD COLUMN IF NOT EXISTS assigned_classes TEXT[] DEFAULT '{}';
      ALTER TABLE staff_invites ADD COLUMN IF NOT EXISTS sports_coached TEXT[] DEFAULT '{}';
      ALTER TABLE staff_invites ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
      ALTER TABLE staff_invites ADD COLUMN IF NOT EXISTS id_number VARCHAR(50);
      ALTER TABLE staff_invites ADD COLUMN IF NOT EXISTS qualifications VARCHAR(255);
      ALTER TABLE staff_invites ADD COLUMN IF NOT EXISTS experience_years INTEGER;
      ALTER TABLE staff_invites ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
      ALTER TABLE staff_invites ADD COLUMN IF NOT EXISTS confirmed_subjects TEXT[] DEFAULT '{}';
      ALTER TABLE staff_invites ADD COLUMN IF NOT EXISTS confirmed_grades INTEGER[] DEFAULT '{}';
      ALTER TABLE staff_invites ADD COLUMN IF NOT EXISTS confirmed_classes TEXT[] DEFAULT '{}';
      ALTER TABLE staff_invites ADD COLUMN IF NOT EXISTS approval_token VARCHAR(64);
      ALTER TABLE staff_invites ADD COLUMN IF NOT EXISTS approved_by INTEGER;
      ALTER TABLE staff_invites ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
      ALTER TABLE staff_invites ADD COLUMN IF NOT EXISTS declined_reason TEXT;
      ALTER TABLE staff_invites DROP CONSTRAINT IF EXISTS staff_invites_status_check;
    `);

    // 4. Ensure classes has school_id and room_number.
    // The column is added without a default school. A missing school id is not assigned.
    await db.query(`
      ALTER TABLE classes ADD COLUMN IF NOT EXISTS school_id INTEGER;
      ALTER TABLE classes ADD COLUMN IF NOT EXISTS room_number VARCHAR(50);
      ALTER TABLE classes ALTER COLUMN school_id DROP DEFAULT;
    `);
    const { ensureColumns } = require('../public/src/services/principalActivation');
    await ensureColumns(db);
    const classOrphans = await db.query(`
      SELECT COUNT(*)::int AS total
      FROM classes c
      WHERE c.school_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM schools s WHERE s.id = c.school_id)
    `);
    const orphanClasses = classOrphans.rows[0].total;
    const classForeignKey = await db.query(
      `SELECT 1 FROM pg_constraint WHERE conname = 'classes_school_id_fkey'`
    );
    if (!classForeignKey.rows.length) {
      if (orphanClasses === 0) {
        await db.query(`
          ALTER TABLE classes
          ADD CONSTRAINT classes_school_id_fkey
          FOREIGN KEY (school_id) REFERENCES schools(id)
          ON DELETE RESTRICT
        `);
      } else {
        // PostgreSQL NOT VALID checks every new or updated row and leaves the
        // existing orphaned rows untouched until VALIDATE CONSTRAINT is run.
        await db.query(`
          ALTER TABLE classes
          ADD CONSTRAINT classes_school_id_fkey
          FOREIGN KEY (school_id) REFERENCES schools(id)
          ON DELETE RESTRICT
          NOT VALID
        `);
        console.warn(`[MIGRATION] Kept ${orphanClasses} classes that point at a missing school. New classes cannot use a missing school.`);
      }
    }
    await db.query(`
      ALTER TABLE classes ADD COLUMN IF NOT EXISTS ownership_quarantine BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE classes ADD COLUMN IF NOT EXISTS ownership_quarantine_reason TEXT;
    `);
    const quarantined = await db.query(`
      UPDATE classes c
      SET ownership_quarantine = TRUE,
          ownership_quarantine_reason = 'The school id on this class is not in the schools table. The original school was not identified, so the class was not assigned to another school.'
      WHERE c.school_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM schools s WHERE s.id = c.school_id)
        AND c.ownership_quarantine = FALSE
      RETURNING id
    `);
    if (quarantined.rows.length) {
      console.warn(`[MIGRATION] Quarantined ${quarantined.rows.length} classes whose school could not be identified. They were not deleted or reassigned.`);
    }
    await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS password_set_at TIMESTAMPTZ');
    await db.query(`
      DO $$
      DECLARE constraint_name text;
      BEGIN
        FOR constraint_name IN
          SELECT conname FROM pg_constraint
          WHERE conrelid = 'school_applications'::regclass
            AND contype = 'c'
            AND pg_get_constraintdef(oid) ILIKE '%status%'
        LOOP
          EXECUTE format('ALTER TABLE school_applications DROP CONSTRAINT %I', constraint_name);
        END LOOP;
      END $$;
      ALTER TABLE school_applications ADD CONSTRAINT school_applications_status_check
        CHECK (status IN ('pending_review', 'under_review', 'approved', 'declined', 'withdrawn'));
      ALTER TABLE school_applications ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;
      ALTER TABLE school_applications ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMPTZ;
      ALTER TABLE school_applications ADD COLUMN IF NOT EXISTS legal_hold BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE school_applications ADD COLUMN IF NOT EXISTS legal_hold_reason TEXT;
      ALTER TABLE school_applications ADD COLUMN IF NOT EXISTS investigation_hold BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE school_applications ADD COLUMN IF NOT EXISTS investigation_hold_reason TEXT;
      ALTER TABLE school_applications ADD COLUMN IF NOT EXISTS privacy_request_open BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE school_applications ADD COLUMN IF NOT EXISTS privacy_request_note TEXT;
    `);
    await db.query(`
      UPDATE school_applications
      SET last_activity_at = COALESCE(updated_at, created_at, NOW())
      WHERE last_activity_at IS NULL
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS retention_policy (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        automatic_actions_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        pending_days INTEGER NOT NULL DEFAULT 90,
        declined_months INTEGER NOT NULL DEFAULT 12,
        approved_after_activation_days INTEGER NOT NULL DEFAULT 90,
        withdrawn_days INTEGER NOT NULL DEFAULT 30,
        abandoned_days INTEGER NOT NULL DEFAULT 90,
        policy_note TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await db.query(`
      INSERT INTO retention_policy (
        id, automatic_actions_enabled, pending_days, declined_months,
        approved_after_activation_days, withdrawn_days, abandoned_days, policy_note
      ) VALUES (
        1, FALSE, 90, 12, 90, 30, 90,
        'Provisionally adopted Geleza SA operational periods. These are not statutory POPIA deadlines. Automatic deletion and anonymisation stay disabled until the privacy notice has received the required review and approval.'
      )
      ON CONFLICT (id) DO NOTHING
    `);
    await db.query(`
      UPDATE retention_policy
      SET policy_note = 'Provisionally adopted Geleza SA operational periods. These are not statutory POPIA deadlines. Automatic deletion and anonymisation stay disabled until the privacy notice has received the required review and approval.',
          updated_at = NOW()
      WHERE id = 1
        AND automatic_actions_enabled = FALSE
        AND policy_note IS DISTINCT FROM 'Provisionally adopted Geleza SA operational periods. These are not statutory POPIA deadlines. Automatic deletion and anonymisation stay disabled until the privacy notice has received the required review and approval.'
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS application_payment_grants (
        application_id INTEGER PRIMARY KEY REFERENCES applications(id) ON DELETE CASCADE,
        otp_hash VARCHAR(64),
        otp_expires_at TIMESTAMPTZ,
        otp_attempts INTEGER NOT NULL DEFAULT 0,
        access_hash VARCHAR(64),
        access_expires_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS sensitive_email_queue (
        id SERIAL PRIMARY KEY,
        kind VARCHAR(40) NOT NULL,
        recipient_hash VARCHAR(64) NOT NULL,
        body TEXT,
        expires_at TIMESTAMPTZ NOT NULL,
        delivered_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    console.log('[MIGRATION] Schema verified. Demo roster password resets are disabled.');

    const duplicateEmis = await db.query(`
      SELECT emis_number
      FROM schools
      WHERE emis_number IS NOT NULL AND btrim(emis_number) <> ''
      GROUP BY emis_number
      HAVING COUNT(*) > 1
    `);
    if (duplicateEmis.rows.length === 0) {
      await db.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS schools_emis_number_unique
        ON schools (emis_number)
        WHERE emis_number IS NOT NULL AND btrim(emis_number) <> ''
      `);
    } else {
      console.warn('[MIGRATION] Skipped unique EMIS index because duplicate school EMIS values already exist.');
    }
    const openDuplicates = await db.query(`
      SELECT emis_number
      FROM school_applications
      WHERE status IN ('pending_review', 'under_review')
      GROUP BY emis_number
      HAVING COUNT(*) > 1
    `);
    if (openDuplicates.rows.length === 0) {
      await db.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS school_applications_open_emis_unique
        ON school_applications (emis_number)
        WHERE status IN ('pending_review', 'under_review')
      `);
    } else {
      console.warn('[MIGRATION] Skipped open-application EMIS index because duplicate pending applications already exist.');
    }

  } catch (err) {
    console.error('[MIGRATION ERROR] Failed to run school onboarding migration:', err.message);
    throw err;
  }
}

module.exports = { migrateSchoolOnboardingAndCleanRoster };

if (require.main === module) {
  migrateSchoolOnboardingAndCleanRoster()
    .then(() => {
      console.log('[MIGRATION COMPLETE] All schema and roster operations finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[MIGRATION FAILED]', err);
      process.exit(1);
    });
}
