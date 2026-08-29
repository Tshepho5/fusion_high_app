/**
 * Seed Demonstration Users for All 12 Schools (Limpopo & Gauteng)
 * Creates 1 Admin, 1 Teacher, 1 Parent, and 1 Child per school.
 * Sets standard password 'Password@123' for smooth live presentations.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');
const curriculumService = require('../public/src/services/curriculumService');

const DEMO_PASSWORD = 'Password@123';

const SCHOOL_DEMO_USERS = [
  // 1. Limpopo (Polokwane & Mankweng - Capricorn South)
  {
    school_id: 1,
    school_name: 'Fusion High School',
    domain: 'fusionhigh.co.za',
    admin: { email: 'admin@fusionhigh.co.za', name: 'Dr. Tshepho', surname: 'Makola', id_num: '8501015024081', phone: '+27 15 291 0000' },
    teacher: { email: 'teacher@fusionhigh.co.za', name: 'Thabang', surname: 'Maetane', id_num: '8902025024082', phone: '+27 15 291 0001', subject: 'Physical Sciences' },
    parent: { email: 'parent@fusionhigh.co.za', name: 'Peter', surname: 'Walters', id_num: '7503035024083', phone: '+27 82 111 0001' },
    learner: { email: 'learner@fusionhigh.co.za', name: 'Jane', surname: 'Walters', id_num: '0804044024084', phone: '+27 82 111 0002', learner_num: '202601001', grade: 11, stream: 'Science', home_lang: 'Sepedi' }
  },
  {
    school_id: 2,
    school_name: 'Mountainview Senior Secondary School',
    domain: 'mountainview.co.za',
    admin: { email: 'admin@mountainview.co.za', name: 'M. S.', surname: 'Phasha', id_num: '7801015024081', phone: '+27 15 267 1100' },
    teacher: { email: 'teacher@mountainview.co.za', name: 'Kabelo', surname: 'Phasha', id_num: '8802025024082', phone: '+27 15 267 1101', subject: 'Mathematics' },
    parent: { email: 'parent@mountainview.co.za', name: 'Mpho', surname: 'Mogale', id_num: '7603035024083', phone: '+27 82 222 0001' },
    learner: { email: 'learner@mountainview.co.za', name: 'Kabelo', surname: 'Mogale', id_num: '0805055024084', phone: '+27 82 222 0002', learner_num: '202602001', grade: 11, stream: 'Science', home_lang: 'Sepedi' }
  },
  {
    school_id: 3,
    school_name: 'Makgoka High School',
    domain: 'makgoka.co.za',
    admin: { email: 'admin@makgoka.co.za', name: 'K. E.', surname: 'Molepo', id_num: '7701015024081', phone: '+27 15 266 0022' },
    teacher: { email: 'teacher@makgoka.co.za', name: 'Johannes', surname: 'Molepo', id_num: '8702025024082', phone: '+27 15 266 0023', subject: 'Mathematics' },
    parent: { email: 'parent@makgoka.co.za', name: 'Sipho', surname: 'Makgoka', id_num: '7403035024083', phone: '+27 82 333 0001' },
    learner: { email: 'learner@makgoka.co.za', name: 'Tshepo', surname: 'Makgoka', id_num: '0906065024084', phone: '+27 82 333 0002', learner_num: '202603001', grade: 10, stream: 'Science', home_lang: 'Sepedi' }
  },
  {
    school_id: 4,
    school_name: 'Turfloop High School',
    domain: 'turfloop.co.za',
    admin: { email: 'admin@turfloop.co.za', name: 'N. J.', surname: 'Mamabolo', id_num: '7601015024081', phone: '+27 15 267 3300' },
    teacher: { email: 'teacher@turfloop.co.za', name: 'Thapelo', surname: 'Mamabolo', id_num: '8602025024082', phone: '+27 15 267 3301', subject: 'Life Sciences' },
    parent: { email: 'parent@turfloop.co.za', name: 'Peter', surname: 'Mamabolo', id_num: '7303035024083', phone: '+27 82 444 0001' },
    learner: { email: 'learner@turfloop.co.za', name: 'Lesedi', surname: 'Mamabolo', id_num: '0707075024084', phone: '+27 82 444 0002', learner_num: '202604001', grade: 12, stream: 'Science', home_lang: 'Sepedi' }
  },
  {
    school_id: 5,
    school_name: 'Hwiti High School',
    domain: 'hwiti.co.za',
    admin: { email: 'admin@hwiti.co.za', name: 'R. M.', surname: 'Ramokgopa', id_num: '7501015024081', phone: '+27 15 267 4400' },
    teacher: { email: 'teacher@hwiti.co.za', name: 'Bontle', surname: 'Ramokgopa', id_num: '8502025024082', phone: '+27 15 267 4401', subject: 'Accounting' },
    parent: { email: 'parent@hwiti.co.za', name: 'Mpho', surname: 'Sebatana', id_num: '7803035024083', phone: '+27 82 555 0001' },
    learner: { email: 'learner@hwiti.co.za', name: 'Tumelo', surname: 'Sebatana', id_num: '0808085024084', phone: '+27 82 555 0002', learner_num: '202605001', grade: 11, stream: 'Commerce', home_lang: 'Sepedi' }
  },
  {
    school_id: 6,
    school_name: 'Ngwana Mohube Secondary School',
    domain: 'ngwanamohube.co.za',
    admin: { email: 'admin@ngwanamohube.co.za', name: 'S. P.', surname: 'Mohube', id_num: '7401015024081', phone: '+27 15 267 5500' },
    teacher: { email: 'teacher@ngwanamohube.co.za', name: 'Lindiwe', surname: 'Mohube', id_num: '8402025024082', phone: '+27 15 267 5501', subject: 'Geography' },
    parent: { email: 'parent@ngwanamohube.co.za', name: 'Thabo', surname: 'Mohube', id_num: '7203035024083', phone: '+27 82 666 0001' },
    learner: { email: 'learner@ngwanamohube.co.za', name: 'Kagiso', surname: 'Mohube', id_num: '0809095024084', phone: '+27 82 666 0002', learner_num: '202606001', grade: 11, stream: 'Humanities', home_lang: 'Sepedi' }
  },

  // 2. Gauteng (Lotus Gardens & Atteridgeville, Pretoria - GDE)
  {
    school_id: 7,
    school_name: 'Fusion Secondary School (Lotus Gardens)',
    domain: 'fusionsecondary.co.za',
    admin: { email: 'admin@fusionsecondary.co.za', name: 'Dr. T.', surname: 'Makola', id_num: '8501015024085', phone: '+27 12 373 0000' },
    teacher: { email: 'teacher@fusionsecondary.co.za', name: 'Minenhle', surname: 'Khuzwayo', id_num: '8902025024085', phone: '+27 12 373 0001', subject: 'Information Technology' },
    parent: { email: 'parent@fusionsecondary.co.za', name: 'Bontle', surname: 'Khuzwayo', id_num: '7603035024085', phone: '+27 82 777 0001' },
    learner: { email: 'learner@fusionsecondary.co.za', name: 'Bontle', surname: 'Khuzwayo', id_num: '0910105024085', phone: '+27 82 777 0002', learner_num: '202607001', grade: 10, stream: 'Science', home_lang: 'Setswana' }
  },
  {
    school_id: 8,
    school_name: 'Saulridge Secondary School',
    domain: 'saulridge.co.za',
    admin: { email: 'admin@saulridge.co.za', name: 'K. E.', surname: 'Masemola', id_num: '7601015024086', phone: '+27 12 375 6000' },
    teacher: { email: 'teacher@saulridge.co.za', name: 'Phindile', surname: 'Masemola', id_num: '8602025024086', phone: '+27 12 375 6001', subject: 'Physical Sciences' },
    parent: { email: 'parent@saulridge.co.za', name: 'David', surname: 'Masemola', id_num: '7403035024086', phone: '+27 82 888 0001' },
    learner: { email: 'learner@saulridge.co.za', name: 'Katlego', surname: 'Masemola', id_num: '0811115024086', phone: '+27 82 888 0002', learner_num: '202608001', grade: 11, stream: 'Science', home_lang: 'Setswana' }
  },
  {
    school_id: 9,
    school_name: 'Phelindaba Secondary School',
    domain: 'phelindaba.co.za',
    admin: { email: 'admin@phelindaba.co.za', name: 'M. T.', surname: 'Sithole', id_num: '7501015024087', phone: '+27 12 373 8100' },
    teacher: { email: 'teacher@phelindaba.co.za', name: 'Vusi', surname: 'Sithole', id_num: '8502025024087', phone: '+27 12 373 8101', subject: 'Mathematics' },
    parent: { email: 'parent@phelindaba.co.za', name: 'Nomsa', surname: 'Sithole', id_num: '7303035024087', phone: '+27 82 999 0001' },
    learner: { email: 'learner@phelindaba.co.za', name: 'Sipho', surname: 'Sithole', id_num: '0912125024087', phone: '+27 82 999 0002', learner_num: '202609001', grade: 10, stream: 'Science', home_lang: 'isiZulu' }
  },
  {
    school_id: 10,
    school_name: 'Flavius Mareka Secondary School',
    domain: 'flaviusmareka.co.za',
    admin: { email: 'admin@flaviusmareka.co.za', name: 'L. N.', surname: 'Maluleke', id_num: '7301015024088', phone: '+27 12 373 9200' },
    teacher: { email: 'teacher@flaviusmareka.co.za', name: 'Kagiso', surname: 'Maluleke', id_num: '8302025024088', phone: '+27 12 373 9201', subject: 'Life Sciences' },
    parent: { email: 'parent@flaviusmareka.co.za', name: 'Joseph', surname: 'Maluleke', id_num: '7103035024088', phone: '+27 83 111 0001' },
    learner: { email: 'learner@flaviusmareka.co.za', name: 'Nthabiseng', surname: 'Maluleke', id_num: '0701015024088', phone: '+27 83 111 0002', learner_num: '202610001', grade: 12, stream: 'Science', home_lang: 'Setswana' }
  },
  {
    school_id: 11,
    school_name: 'Dr. W.F. Nkomo Secondary School',
    domain: 'wfnkomo.co.za',
    admin: { email: 'admin@wfnkomo.co.za', name: 'D. M.', surname: 'Ndlovu', id_num: '7201015024089', phone: '+27 12 375 7300' },
    teacher: { email: 'teacher@wfnkomo.co.za', name: 'Ayanda', surname: 'Ndlovu', id_num: '8202025024089', phone: '+27 12 375 7301', subject: 'Accounting' },
    parent: { email: 'parent@wfnkomo.co.za', name: 'Sizwe', surname: 'Ndlovu', id_num: '7003035024089', phone: '+27 83 222 0001' },
    learner: { email: 'learner@wfnkomo.co.za', name: 'Lindiwe', surname: 'Ndlovu', id_num: '0802025024089', phone: '+27 83 222 0002', learner_num: '202611001', grade: 11, stream: 'Commerce', home_lang: 'isiZulu' }
  },
  {
    school_id: 12,
    school_name: 'Hofmeyr Secondary School',
    domain: 'hofmeyr.co.za',
    admin: { email: 'admin@hofmeyr.co.za', name: 'S. R.', surname: 'Mogale', id_num: '7101015024090', phone: '+27 12 373 7400' },
    teacher: { email: 'teacher@hofmeyr.co.za', name: 'Given', surname: 'Mogale', id_num: '8102025024090', phone: '+27 12 373 7401', subject: 'History' },
    parent: { email: 'parent@hofmeyr.co.za', name: 'Eunice', surname: 'Mogale', id_num: '6903035024090', phone: '+27 83 333 0001' },
    learner: { email: 'learner@hofmeyr.co.za', name: 'Tebogo', surname: 'Mogale', id_num: '0903035024090', phone: '+27 83 333 0002', learner_num: '202612001', grade: 10, stream: 'Humanities', home_lang: 'Setswana' }
  }
];

async function seedDemoUsers() {
  console.log('\n================================================================');
  console.log('🏛️ SEEDING PRESENTATION DEMO USERS (12 SCHOOLS)');
  console.log(`🔑 Universal Password: "${DEMO_PASSWORD}"`);
  console.log('================================================================\n');

  try {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    // Get role IDs
    const rolesRes = await db.query('SELECT id, name FROM roles');
    const rolesMap = {};
    rolesRes.rows.forEach(r => { rolesMap[r.name.toLowerCase()] = r.id; });

    const adminRoleId = rolesMap['admin'] || 1;
    const teacherRoleId = rolesMap['teacher'] || 2;
    const learnerRoleId = rolesMap['learner'] || 3;
    const parentRoleId = rolesMap['parent'] || 4;

    for (const item of SCHOOL_DEMO_USERS) {
      console.log(`🏫 Setting up Demo Accounts for: [${item.school_id}] ${item.school_name}...`);

      // 1. Create/Update School Admin
      const adminRes = await db.query(`
        INSERT INTO users (email, password_hash, role_id, full_name, surname, id_number, phone, country, race, school_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'South Africa', 'Black', $8)
        ON CONFLICT (email) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          role_id = EXCLUDED.role_id,
          full_name = EXCLUDED.full_name,
          surname = EXCLUDED.surname,
          school_id = EXCLUDED.school_id
        RETURNING id;
      `, [item.admin.email, passwordHash, adminRoleId, item.admin.name, item.admin.surname, item.admin.id_num, item.admin.phone, item.school_id]);
      const adminId = adminRes.rows[0].id;

      // 2. Create/Update Teacher
      const teacherRes = await db.query(`
        INSERT INTO users (email, password_hash, role_id, full_name, surname, id_number, phone, country, race, school_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'South Africa', 'Black', $8)
        ON CONFLICT (email) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          role_id = EXCLUDED.role_id,
          full_name = EXCLUDED.full_name,
          surname = EXCLUDED.surname,
          school_id = EXCLUDED.school_id
        RETURNING id;
      `, [item.teacher.email, passwordHash, teacherRoleId, item.teacher.name, item.teacher.surname, item.teacher.id_num, item.teacher.phone, item.school_id]);
      const teacherId = teacherRes.rows[0].id;

      // Ensure employee record exists
      await db.query(`
        INSERT INTO employees (user_id, department_id, full_name, surname, email, phone, school_id)
        VALUES ($1, 1, $2, $3, $4, $5, $6)
        ON CONFLICT DO NOTHING;
      `, [teacherId, item.teacher.name, item.teacher.surname, item.teacher.email, item.teacher.phone, item.school_id]);

      // 3. Create/Update Parent
      const parentRes = await db.query(`
        INSERT INTO users (email, password_hash, role_id, full_name, surname, id_number, phone, physical_address, country, race, parent_type, school_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pretoria/Polokwane Area', 'South Africa', 'Black', 'Parent', $8)
        ON CONFLICT (email) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          role_id = EXCLUDED.role_id,
          full_name = EXCLUDED.full_name,
          surname = EXCLUDED.surname,
          school_id = EXCLUDED.school_id
        RETURNING id;
      `, [item.parent.email, passwordHash, parentRoleId, item.parent.name, item.parent.surname, item.parent.id_num, item.parent.phone, item.school_id]);
      const parentId = parentRes.rows[0].id;

      // 4. Create/Update Learner
      const learnerUserRes = await db.query(`
        INSERT INTO users (email, password_hash, role_id, full_name, surname, id_number, phone, country, race, school_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'South Africa', 'Black', $8)
        ON CONFLICT (email) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          role_id = EXCLUDED.role_id,
          full_name = EXCLUDED.full_name,
          surname = EXCLUDED.surname,
          school_id = EXCLUDED.school_id
        RETURNING id;
      `, [item.learner.email, passwordHash, learnerRoleId, item.learner.name, item.learner.surname, item.learner.id_num, item.learner.phone, item.school_id]);
      const learnerUserId = learnerUserRes.rows[0].id;

      // Compute official CAPS subjects
      const officialSubjects = curriculumService.getSubjectsForGradeAndStream(
        item.learner.grade,
        item.learner.stream,
        item.learner.home_lang
      );

      // Create/Update Child Record
      const childRes = await db.query(`
        INSERT INTO children (learner_user_id, full_name, surname, parent_id, learner_number, grade, stream, subjects, home_language, school_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (learner_number) DO UPDATE SET
          learner_user_id = EXCLUDED.learner_user_id,
          parent_id = EXCLUDED.parent_id,
          grade = EXCLUDED.grade,
          stream = EXCLUDED.stream,
          subjects = EXCLUDED.subjects,
          home_language = EXCLUDED.home_language,
          school_id = EXCLUDED.school_id
        RETURNING id;
      `, [learnerUserId, item.learner.name, item.learner.surname, parentId, item.learner.learner_num, item.learner.grade, item.learner.stream, officialSubjects, item.learner.home_lang, item.school_id]);
      const childDbId = childRes.rows[0].id;

      // Link Parent to Child in parent_children junction
      await db.query(`
        INSERT INTO parent_children (parent_id, child_id, relationship, is_primary)
        VALUES ($1, $2, 'Parent', TRUE)
        ON CONFLICT (parent_id, child_id) DO NOTHING;
      `, [parentId, childDbId]);

      console.log(`   ✓ Admin:   ${item.admin.email}`);
      console.log(`   ✓ Teacher: ${item.teacher.email}`);
      console.log(`   ✓ Parent:  ${item.parent.email}`);
      console.log(`   ✓ Learner: ${item.learner.email} (No: ${item.learner.learner_num}, Gr ${item.learner.grade} ${item.learner.stream})\n`);
    }

    console.log('================================================================');
    console.log('🎉 ALL 12 SCHOOLS DEMO USERS SEEDED SUCCESSFULLY!');
    console.log('👉 Each user can log in with their email and "Password@123".');
    console.log('👉 The system automatically detects their school and displays their branded dashboard.');
    console.log('================================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding demo users:', err);
    process.exit(1);
  }
}

seedDemoUsers();
