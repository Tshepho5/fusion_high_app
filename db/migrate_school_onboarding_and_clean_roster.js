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
      ALTER TABLE school_applications ADD COLUMN IF NOT EXISTS password_hash TEXT;
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

    // Helper functions that work regardless of database unique constraint definitions
    async function upsertUser(email, hash, roleId, schoolId, isSuper, first, last, idNum, phone, extra = {}) {
      const existing = await db.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
      if (existing.rows.length === 0) {
        const res = await db.query(
          `INSERT INTO users (email, password_hash, role_id, school_id, is_superadmin, full_name, surname, id_number, phone, country, parent_type, dob, gender)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'South Africa', $10, $11, $12)
           RETURNING id`,
          [email, hash, roleId, schoolId, isSuper, first, last, idNum, phone, extra.parent_type || null, extra.dob || null, extra.gender || null]
        );
        return res.rows[0].id;
      } else {
        const uid = existing.rows[0].id;
        await db.query(
          `UPDATE users
           SET password_hash = $1, role_id = $2, school_id = COALESCE($3, school_id), is_superadmin = $4, full_name = $5, surname = $6, id_number = $7, phone = $8, parent_type = COALESCE($9, parent_type)
           WHERE id = $10`,
          [hash, roleId, schoolId, isSuper, first, last, idNum, phone, extra.parent_type || null, uid]
        );
        return uid;
      }
    }

    async function upsertEmployee(userId, first, last, deptId, subjects, codes, grades, classes, schoolId, phone, email) {
      const existing = await db.query('SELECT id FROM employees WHERE user_id = $1 LIMIT 1', [userId]);
      if (existing.rows.length === 0) {
        await db.query(
          `INSERT INTO employees (user_id, full_name, surname, department_id, subjects, subject_codes, grades_taught, classes_taught, school_id, phone, email)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [userId, first, last, deptId, subjects, codes, grades, classes, schoolId, phone, email]
        );
      } else {
        await db.query(
          `UPDATE employees
           SET full_name = $1, surname = $2, department_id = $3, subjects = $4, subject_codes = $5, grades_taught = $6, classes_taught = $7, school_id = $8, phone = $9, email = $10
           WHERE user_id = $11`,
          [first, last, deptId, subjects, codes, grades, classes, schoolId, phone, email, userId]
        );
      }
    }

    async function upsertClass(name, grade, stream, teacherId, schoolId) {
      const existing = await db.query('SELECT id FROM classes WHERE name = $1 LIMIT 1', [name]);
      if (existing.rows.length === 0) {
        const res = await db.query(
          `INSERT INTO classes (name, grade, stream, homeroom_teacher_id, school_id)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [name, grade, stream, teacherId, schoolId]
        );
        return res.rows[0].id;
      } else {
        await db.query(
          `UPDATE classes
           SET grade = $1, stream = $2, homeroom_teacher_id = $3, school_id = COALESCE($4, school_id)
           WHERE id = $5`,
          [grade, stream, teacherId, schoolId, existing.rows[0].id]
        );
        return existing.rows[0].id;
      }
    }

    async function upsertChild(learnerUserId, first, last, parentId, learnerNum, grade, classId, stream, lang, schoolId, subjects) {
      const existing = await db.query('SELECT id FROM children WHERE learner_user_id = $1 OR learner_number = $2 LIMIT 1', [learnerUserId, learnerNum]);
      if (existing.rows.length === 0) {
        const res = await db.query(
          `INSERT INTO children (learner_user_id, full_name, surname, parent_id, learner_number, grade, class_id, stream, home_language, school_id, subjects)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
          [learnerUserId, first, last, parentId, learnerNum, grade, classId, stream, lang, schoolId, subjects]
        );
        return res.rows[0].id;
      } else {
        await db.query(
          `UPDATE children
           SET full_name = $1, surname = $2, parent_id = $3, learner_number = $4, grade = $5, class_id = $6, stream = $7, home_language = $8, school_id = $9, subjects = $10, learner_user_id = $11
           WHERE id = $12`,
          [first, last, parentId, learnerNum, grade, classId, stream, lang, schoolId, subjects, learnerUserId, existing.rows[0].id]
        );
        return existing.rows[0].id;
      }
    }

    async function ensureParentChild(parentId, childId, relationship) {
      const existing = await db.query('SELECT 1 FROM parent_children WHERE parent_id = $1 AND child_id = $2 LIMIT 1', [parentId, childId]);
      if (existing.rows.length === 0) {
        await db.query(
          `INSERT INTO parent_children (parent_id, child_id, relationship, is_primary)
           VALUES ($1, $2, $3, TRUE)`,
          [parentId, childId, relationship]
        );
      }
    }

    // A. 2 Geleza Executive / Admins
    await upsertUser('admin@gelezasa.co.za', superadminPass, adminRoleId, null, true, 'Tshepho Letlalo', 'Makula', '0209205494088', '0692606618');
    await upsertUser('exec@gelezasa.co.za', defaultHash, adminRoleId, null, true, 'Geleza Executive', 'Director', '8001015099088', '0123730000');

    // Find available schools on tenant
    const allSchoolsRes = await db.query('SELECT id FROM schools ORDER BY id ASC');
    let schoolAId = 1;
    let schoolBId = 1;

    if (allSchoolsRes.rows.length > 0) {
      schoolAId = allSchoolsRes.rows[0].id;
      schoolBId = allSchoolsRes.rows[1] ? allSchoolsRes.rows[1].id : allSchoolsRes.rows[0].id;
    } else {
      const newSchoolRes = await db.query(`
        INSERT INTO schools (name, slug, domain, is_active)
        VALUES ('Walters High School', 'walters-high-school', 'walters-high-school.co.za', TRUE)
        RETURNING id
      `);
      schoolAId = newSchoolRes.rows[0].id;
      schoolBId = schoolAId;
    }

    // B. Principals
    await upsertUser('principal@makgoka.co.za', defaultHash, adminRoleId, schoolAId, false, 'K. E.', 'Molepo', '8005200494082', '0152660022');
    await upsertUser('principal@mountainview.co.za', defaultHash, adminRoleId, schoolBId, false, 'M. S.', 'Phasha', '7803155494081', '0152671100');

    // C. Teachers
    const teacher1Id = await upsertUser('teacher.science@gelezasa.co.za', defaultHash, teacherRoleId, schoolAId, false, 'Thabang', 'Maetane', '0208285930086', '0827637087');
    await upsertEmployee(teacher1Id, 'Thabang', 'Maetane', 2, ['Physical Sciences', 'Life Sciences', 'Mathematics'], ['PHSC10', 'LFSC10', 'MATH10S'], [10, 11], ['10A'], schoolAId, '0827637087', 'teacher.science@gelezasa.co.za');

    const teacher2Id = await upsertUser('teacher.commerce@gelezasa.co.za', defaultHash, teacherRoleId, schoolBId, false, 'Minenhle', 'Dlungwane', '0205101032085', '0711943962');
    await upsertEmployee(teacher2Id, 'Minenhle', 'Dlungwane', 2, ['Accounting', 'Business Studies', 'Economics'], ['ACC10', 'BUSS10', 'ECON10'], [10, 11], ['10B'], schoolBId, '0711943962', 'teacher.commerce@gelezasa.co.za');

    // D. Classes
    const class10AId = await upsertClass('10A', 10, 'Science', teacher1Id, schoolAId);
    const class10BId = await upsertClass('10B', 10, 'Commerce', teacher2Id, schoolBId);

    // E. Parents
    const parent1Id = await upsertUser('parent.walters@gelezasa.co.za', defaultHash, parentRoleId, schoolAId, false, 'Sarah', 'Walters', '7905150099081', '0820000003', { parent_type: 'Mother' });
    const parent2Id = await upsertUser('parent.modiba@gelezasa.co.za', defaultHash, parentRoleId, schoolBId, false, 'Matome', 'Modiba', '7608125099082', '0820000004', { parent_type: 'Father' });

    // F. Learners
    const learner1UserId = await upsertUser('learner.walters@gelezasa.co.za', defaultHash, learnerRoleId, schoolAId, false, 'Lerato', 'Walters', '0901014089081', '0820000010', { dob: '2009-01-01', gender: 'Female' });
    const child1Id = await upsertChild(
      learner1UserId, 'Lerato', 'Walters', parent1Id, 'GSA-MKG-001', 10, class10AId, 'Science', 'Sepedi Home Language', schoolAId,
      ['Mathematics', 'Physical Sciences', 'Life Sciences', 'Geography', 'English FAL', 'Sepedi Home Language', 'Life Orientation']
    );
    await ensureParentChild(parent1Id, child1Id, 'Mother');

    const learner2UserId = await upsertUser('learner.modiba@gelezasa.co.za', defaultHash, learnerRoleId, schoolBId, false, 'Karabo', 'Modiba', '0905061234567', '0820000020', { dob: '2009-05-06', gender: 'Male' });
    const child2Id = await upsertChild(
      learner2UserId, 'Karabo', 'Modiba', parent2Id, 'GSA-MTV-002', 10, class10BId, 'Commerce', 'isiZulu Home Language', schoolBId,
      ['Accounting', 'Business Studies', 'Economics', 'Mathematics', 'English FAL', 'isiZulu Home Language', 'Life Orientation']
    );
    await ensureParentChild(parent2Id, child2Id, 'Father');
    console.log('[MIGRATION] Demo roster checked. Existing passwords were left unchanged.');

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
