const db = require('./db');
const bcrypt = require('bcryptjs');

/**
 * Migration & Schema Initialization for:
 * 1. Secured School Applications Table (Principal Registration & Accreditation)
 * 2. School-Specific Subjects, Streams, and Home Languages
 * 3. Colleague / Staff Invites Table (Teachers & Coaches)
 * 4. Dynamic Classes & Homeroom Teacher Linking
 * 5. Clean 2-Per-Role Production Testing Roster (Zero hardcoded percentages/fake reports)
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
    `);

    // 4. Ensure classes has school_id and room_number
    await db.query(`
      ALTER TABLE classes ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id) DEFAULT 1;
      ALTER TABLE classes ADD COLUMN IF NOT EXISTS room_number VARCHAR(50);
    `);

    console.log('[MIGRATION] Tables & schema verified. Establishing clean 2-per-role accounts...');

    // 5. Clean 2-per-role Testing Roster Setup
    const defaultPassword = 'password123';
    const defaultHash = await bcrypt.hash(defaultPassword, 10);
    const superadminPass = await bcrypt.hash('#Makola#$5$', 10);

    // Ensure roles exist
    const rolesRes = await db.query('SELECT id, name FROM roles');
    const roleMap = {};
    rolesRes.rows.forEach(r => { roleMap[r.name] = r.id; });
    const adminRoleId = roleMap['admin'] || 1;
    const parentRoleId = roleMap['parent'] || 2;
    const learnerRoleId = roleMap['learner'] || 3;
    const teacherRoleId = roleMap['teacher'] || 4;

    // A. 2 Geleza Executive / Admins
    // Executive 1: Tshepho Letlalo Makula (SuperAdmin)
    await db.query(`
      INSERT INTO users (email, password_hash, role_id, school_id, is_superadmin, full_name, surname, id_number, phone, country)
      VALUES ('admin@gelezasa.co.za', $1, $2, 1, TRUE, 'Tshepho Letlalo', 'Makula', '0209205494088', '0692606618', 'South Africa')
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role_id = EXCLUDED.role_id,
        is_superadmin = TRUE,
        full_name = EXCLUDED.full_name,
        surname = EXCLUDED.surname;
    `, [superadminPass, adminRoleId]);

    // Executive 2: Executive Director (Geleza SA Operations)
    await db.query(`
      INSERT INTO users (email, password_hash, role_id, school_id, is_superadmin, full_name, surname, id_number, phone, country)
      VALUES ('exec@gelezasa.co.za', $1, $2, 1, TRUE, 'Geleza Executive', 'Director', '8001015099088', '0123730000', 'South Africa')
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role_id = EXCLUDED.role_id,
        is_superadmin = TRUE,
        full_name = EXCLUDED.full_name,
        surname = EXCLUDED.surname;
    `, [defaultHash, adminRoleId]);

    // B. 2 School Principals (Showing Multi-School Isolation between School 3 and School 2)
    // Principal 1: Makgoka High School (School 3)
    await db.query(`
      INSERT INTO users (email, password_hash, role_id, school_id, is_superadmin, full_name, surname, id_number, phone, country)
      VALUES ('principal@makgoka.co.za', $1, $2, 3, FALSE, 'K. E.', 'Molepo', '8005200494082', '0152660022', 'South Africa')
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role_id = EXCLUDED.role_id,
        school_id = 3,
        full_name = EXCLUDED.full_name,
        surname = EXCLUDED.surname;
    `, [defaultHash, adminRoleId]);

    // Principal 2: Mountainview Senior Secondary (School 2)
    await db.query(`
      INSERT INTO users (email, password_hash, role_id, school_id, is_superadmin, full_name, surname, id_number, phone, country)
      VALUES ('principal@mountainview.co.za', $1, $2, 2, FALSE, 'M. S.', 'Phasha', '7803155494081', '0152671100', 'South Africa')
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role_id = EXCLUDED.role_id,
        school_id = 2,
        full_name = EXCLUDED.full_name,
        surname = EXCLUDED.surname;
    `, [defaultHash, adminRoleId]);

    // C. 2 Teachers (Each assigned to their school, class, and subjects)
    // Teacher 1: Mr. Thabang Maetane (Makgoka High School - Science Stream & Class Teacher for 10A)
    const t1UserRes = await db.query(`
      INSERT INTO users (email, password_hash, role_id, school_id, is_superadmin, full_name, surname, id_number, phone, country)
      VALUES ('teacher.science@gelezasa.co.za', $1, $2, 3, FALSE, 'Thabang', 'Maetane', '0208285930086', '0827637087', 'South Africa')
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role_id = EXCLUDED.role_id,
        school_id = 3,
        full_name = EXCLUDED.full_name,
        surname = EXCLUDED.surname
      RETURNING id;
    `, [defaultHash, teacherRoleId]);
    const teacher1Id = t1UserRes.rows[0].id;

    await db.query(`
      INSERT INTO employees (user_id, full_name, surname, department_id, subjects, subject_codes, grades_taught, classes_taught, school_id, phone, email)
      VALUES ($1, 'Thabang', 'Maetane', 2, ARRAY['Physical Sciences','Life Sciences','Mathematics'], ARRAY['PHSC10','LFSC10','MATH10S'], ARRAY[10,11], ARRAY['10A'], 3, '0827637087', 'teacher.science@gelezasa.co.za')
      ON CONFLICT (user_id) DO UPDATE SET
        subjects = EXCLUDED.subjects,
        subject_codes = EXCLUDED.subject_codes,
        grades_taught = EXCLUDED.grades_taught,
        classes_taught = EXCLUDED.classes_taught,
        school_id = 3;
    `, [teacher1Id]);

    // Teacher 2: Ms. Minenhle Dlungwane (Mountainview High School - Commerce Stream & Class Teacher for 10B)
    const t2UserRes = await db.query(`
      INSERT INTO users (email, password_hash, role_id, school_id, is_superadmin, full_name, surname, id_number, phone, country)
      VALUES ('teacher.commerce@gelezasa.co.za', $1, $2, 2, FALSE, 'Minenhle', 'Dlungwane', '0205101032085', '0711943962', 'South Africa')
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role_id = EXCLUDED.role_id,
        school_id = 2,
        full_name = EXCLUDED.full_name,
        surname = EXCLUDED.surname
      RETURNING id;
    `, [defaultHash, teacherRoleId]);
    const teacher2Id = t2UserRes.rows[0].id;

    await db.query(`
      INSERT INTO employees (user_id, full_name, surname, department_id, subjects, subject_codes, grades_taught, classes_taught, school_id, phone, email)
      VALUES ($1, 'Minenhle', 'Dlungwane', 2, ARRAY['Accounting','Business Studies','Economics'], ARRAY['ACC10','BUSS10','ECON10'], ARRAY[10,11], ARRAY['10B'], 2, '0711943962', 'teacher.commerce@gelezasa.co.za')
      ON CONFLICT (user_id) DO UPDATE SET
        subjects = EXCLUDED.subjects,
        subject_codes = EXCLUDED.subject_codes,
        grades_taught = EXCLUDED.grades_taught,
        classes_taught = EXCLUDED.classes_taught,
        school_id = 2;
    `, [teacher2Id]);

    // D. Dynamic Classes Setup & Homeroom Link
    await db.query(`
      INSERT INTO classes (name, grade, stream, homeroom_teacher_id, school_id)
      VALUES 
        ('10A', 10, 'Science', $1, 3),
        ('10B', 10, 'Commerce', $2, 2)
      ON CONFLICT (name) DO UPDATE SET
        stream = EXCLUDED.stream,
        homeroom_teacher_id = EXCLUDED.homeroom_teacher_id,
        school_id = EXCLUDED.school_id;
    `, [teacher1Id, teacher2Id]);

    const class10ARes = await db.query(`SELECT id FROM classes WHERE name = '10A'`);
    const class10BRes = await db.query(`SELECT id FROM classes WHERE name = '10B'`);
    const class10AId = class10ARes.rows[0]?.id;
    const class10BId = class10BRes.rows[0]?.id;

    // E. 2 Parents
    // Parent 1: Mrs. Sarah Walters (Makgoka High School)
    const p1UserRes = await db.query(`
      INSERT INTO users (email, password_hash, role_id, school_id, is_superadmin, full_name, surname, id_number, phone, country, parent_type)
      VALUES ('parent.walters@gelezasa.co.za', $1, $2, 3, FALSE, 'Sarah', 'Walters', '7905150099081', '0820000003', 'South Africa', 'Mother')
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role_id = EXCLUDED.role_id,
        school_id = 3,
        full_name = EXCLUDED.full_name,
        surname = EXCLUDED.surname
      RETURNING id;
    `, [defaultHash, parentRoleId]);
    const parent1Id = p1UserRes.rows[0].id;

    // Parent 2: Mr. Matome Modiba (Mountainview High School)
    const p2UserRes = await db.query(`
      INSERT INTO users (email, password_hash, role_id, school_id, is_superadmin, full_name, surname, id_number, phone, country, parent_type)
      VALUES ('parent.modiba@gelezasa.co.za', $1, $2, 2, FALSE, 'Matome', 'Modiba', '7608125099082', '0820000004', 'South Africa', 'Father')
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role_id = EXCLUDED.role_id,
        school_id = 2,
        full_name = EXCLUDED.full_name,
        surname = EXCLUDED.surname
      RETURNING id;
    `, [defaultHash, parentRoleId]);
    const parent2Id = p2UserRes.rows[0].id;

    // F. 2 Learners (Each strictly linked to their Parent, Class Teacher, and Subjects)
    // Learner 1: Lerato Walters (Grade 10A Science, Makgoka High)
    const l1UserRes = await db.query(`
      INSERT INTO users (email, password_hash, role_id, school_id, is_superadmin, full_name, surname, id_number, dob, gender, phone, country)
      VALUES ('learner.walters@gelezasa.co.za', $1, $2, 3, FALSE, 'Lerato', 'Walters', '0901014089081', '2009-01-01', 'Female', '0820000010', 'South Africa')
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role_id = EXCLUDED.role_id,
        school_id = 3,
        full_name = EXCLUDED.full_name,
        surname = EXCLUDED.surname
      RETURNING id;
    `, [defaultHash, learnerRoleId]);
    const learner1UserId = l1UserRes.rows[0].id;

    const child1Res = await db.query(`
      INSERT INTO children (learner_user_id, full_name, surname, parent_id, learner_number, grade, class_id, stream, home_language, school_id, subjects)
      VALUES (
        $1, 'Lerato', 'Walters', $2, 'GSA-MKG-001', 10, $3, 'Science', 'Sepedi Home Language', 3,
        ARRAY['Mathematics', 'Physical Sciences', 'Life Sciences', 'Geography', 'English FAL', 'Sepedi Home Language', 'Life Orientation']
      )
      ON CONFLICT (learner_user_id) DO UPDATE SET
        parent_id = EXCLUDED.parent_id,
        class_id = EXCLUDED.class_id,
        school_id = EXCLUDED.school_id,
        stream = EXCLUDED.stream,
        home_language = EXCLUDED.home_language,
        subjects = EXCLUDED.subjects
      RETURNING id;
    `, [learner1UserId, parent1Id, class10AId]);
    const child1Id = child1Res.rows[0].id;

    await db.query(`
      INSERT INTO parent_children (parent_id, child_id, relationship, is_primary)
      VALUES ($1, $2, 'Mother', TRUE)
      ON CONFLICT (parent_id, child_id) DO NOTHING;
    `, [parent1Id, child1Id]);

    // Learner 2: Karabo Modiba (Grade 10B Commerce, Mountainview High)
    const l2UserRes = await db.query(`
      INSERT INTO users (email, password_hash, role_id, school_id, is_superadmin, full_name, surname, id_number, dob, gender, phone, country)
      VALUES ('learner.modiba@gelezasa.co.za', $1, $2, 2, FALSE, 'Karabo', 'Modiba', '0905061234567', '2009-05-06', 'Male', '0820000020', 'South Africa')
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role_id = EXCLUDED.role_id,
        school_id = 2,
        full_name = EXCLUDED.full_name,
        surname = EXCLUDED.surname
      RETURNING id;
    `, [defaultHash, learnerRoleId]);
    const learner2UserId = l2UserRes.rows[0].id;

    const child2Res = await db.query(`
      INSERT INTO children (learner_user_id, full_name, surname, parent_id, learner_number, grade, class_id, stream, home_language, school_id, subjects)
      VALUES (
        $1, 'Karabo', 'Modiba', $2, 'GSA-MTV-002', 10, $3, 'Commerce', 'isiZulu Home Language', 2,
        ARRAY['Accounting', 'Business Studies', 'Economics', 'Mathematics', 'English FAL', 'isiZulu Home Language', 'Life Orientation']
      )
      ON CONFLICT (learner_user_id) DO UPDATE SET
        parent_id = EXCLUDED.parent_id,
        class_id = EXCLUDED.class_id,
        school_id = EXCLUDED.school_id,
        stream = EXCLUDED.stream,
        home_language = EXCLUDED.home_language,
        subjects = EXCLUDED.subjects
      RETURNING id;
    `, [learner2UserId, parent2Id, class10BId]);
    const child2Id = child2Res.rows[0].id;

    await db.query(`
      INSERT INTO parent_children (parent_id, child_id, relationship, is_primary)
      VALUES ($1, $2, 'Father', TRUE)
      ON CONFLICT (parent_id, child_id) DO NOTHING;
    `, [parent2Id, child2Id]);

    console.log('[MIGRATION] Clean 2-per-role roster successfully seeded.');
    console.log('[MIGRATION] Roster Accounts (Password for all: password123 | Admin Makola: #Makola#$5$):');
    console.log(' - SuperAdmins: admin@gelezasa.co.za, exec@gelezasa.co.za');
    console.log(' - Principals:  principal@makgoka.co.za (Makgoka), principal@mountainview.co.za (Mountainview)');
    console.log(' - Teachers:    teacher.science@gelezasa.co.za (10A Science), teacher.commerce@gelezasa.co.za (10B Commerce)');
    console.log(' - Parents:     parent.walters@gelezasa.co.za, parent.modiba@gelezasa.co.za');
    console.log(' - Learners:    learner.walters@gelezasa.co.za, learner.modiba@gelezasa.co.za');

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
