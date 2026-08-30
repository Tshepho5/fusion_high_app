const db = require('../db/db');
const bcrypt = require('bcryptjs');

async function seedAllSchoolsData() {
  console.log('===============================================================');
  console.log('🚀 SEEDING COMPREHENSIVE DATA FOR ALL 12 SCHOOLS (TEACHERS & LEARNERS)');
  console.log('===============================================================\n');

  const defaultPassword = 'password123';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const schools = [
    { id: 1, slug: 'fusion-high', domain: 'fusionhigh.co.za', name: 'Fusion High School', lang: 'English' },
    { id: 2, slug: 'mountainview-high', domain: 'mountainview.co.za', name: 'Mountainview Senior Secondary School', lang: 'Sepedi' },
    { id: 3, slug: 'makgoka-high', domain: 'makgoka.co.za', name: 'Makgoka High School', lang: 'Sepedi' },
    { id: 4, slug: 'turfloop-high', domain: 'turfloop.co.za', name: 'Turfloop High School', lang: 'Sepedi' },
    { id: 5, slug: 'hwiti-high', domain: 'hwiti.co.za', name: 'Hwiti High School', lang: 'Sepedi' },
    { id: 6, slug: 'ngwana-mohube', domain: 'ngwanamohube.co.za', name: 'Ngwana Mohube Secondary School', lang: 'Sepedi' },
    { id: 7, slug: 'fusion-secondary-lotus', domain: 'fusionsecondary.co.za', name: 'Fusion Secondary School (Lotus Gardens)', lang: 'English' },
    { id: 8, slug: 'saulridge-secondary', domain: 'saulridge.co.za', name: 'Saulridge Secondary School', lang: 'Setswana' },
    { id: 9, slug: 'phelindaba-secondary', domain: 'phelindaba.co.za', name: 'Phelindaba Secondary School', lang: 'isiZulu' },
    { id: 10, slug: 'flavius-mareka', domain: 'flaviusmareka.co.za', name: 'Flavius Mareka Secondary School', lang: 'Setswana' },
    { id: 11, slug: 'wf-nkomo-secondary', domain: 'wfnkomo.co.za', name: 'Dr. W.F. Nkomo Secondary School', lang: 'Sepedi' },
    { id: 12, slug: 'hofmeyr-secondary', domain: 'hofmeyr.co.za', name: 'Hofmeyr Secondary School', lang: 'isiZulu' }
  ];

  // Common subjects pools
  const scienceSubs = ['Mathematics', 'Physical Sciences', 'Life Sciences', 'Geography', 'English FAL', 'Home Language', 'Life Orientation'];
  const commerceSubs = ['Accounting', 'Business Studies', 'Economics', 'Mathematics', 'English FAL', 'Home Language', 'Life Orientation'];
  const tourismSubs = ['Tourism', 'Geography', 'Mathematical Literacy', 'English FAL', 'Home Language', 'Life Orientation'];

  // Teacher templates by school
  const teacherRosterBySchool = {
    1: [
      { name: 'Thabang', surname: 'Maetane', email: 'tbjmaetane1010@gmail.com', phone: '0827637087', gender: 'male', subs: ['Physical Sciences'], grades: [10, 11, 12], classes: ['10A', '11A', '12A'] },
      { name: 'Thapelo', surname: 'Leshabane', email: 'thapeloleshabane05@gmail.com', phone: '0661420527', gender: 'male', subs: ['Mathematics'], grades: [10, 11, 12], classes: ['10A', '11A', '12A'] },
      { name: 'Minenhle', surname: 'Dlungwane', email: '202256986@myturf.ul.ac.za', phone: '0711943962', gender: 'female', subs: ['Life Sciences'], grades: [10, 11, 12], classes: ['10A', '11A', '12A'] },
      { name: 'Putla', surname: 'Dludlu', email: 'mini.dludlu@gmail.com', phone: '0711943963', gender: 'female', subs: ['Accounting', 'Economics'], grades: [10, 11, 12], classes: ['10B', '11B', '12B'] },
      { name: 'Mapula', surname: 'Modiba', email: 'mapula@gmail.com', phone: '0711943964', gender: 'female', subs: ['English FAL', 'Home Language'], grades: [10, 11, 12], classes: ['10A', '10B', '11A', '11B', '12A', '12B'] }
    ],
    2: [
      { name: 'Klaas', surname: 'Phasha', email: 'k.phasha@mountainview.co.za', phone: '0821100001', gender: 'male', subs: ['Mathematics', 'Physical Sciences'], grades: [10, 11, 12], classes: ['10A', '11A', '12A'] },
      { name: 'Mavis', surname: 'Ramatsobane', email: 'm.ramatsobane@mountainview.co.za', phone: '0821100002', gender: 'female', subs: ['Life Sciences', 'Geography'], grades: [10, 11, 12], classes: ['10A', '11A', '12A'] },
      { name: 'Ephraim', surname: 'Sebola', email: 'e.sebola@mountainview.co.za', phone: '0821100003', gender: 'male', subs: ['Accounting', 'Business Studies'], grades: [10, 11, 12], classes: ['10B', '11B', '12B'] },
      { name: 'Joyce', surname: 'Makgato', email: 'j.makgato@mountainview.co.za', phone: '0821100004', gender: 'female', subs: ['English FAL', 'Home Language'], grades: [10, 11, 12], classes: ['10A', '10B', '11A', '11B', '12A', '12B'] },
      { name: 'Daniel', surname: 'Mabitsela', email: 'd.mabitsela@mountainview.co.za', phone: '0821100005', gender: 'male', subs: ['Tourism', 'Life Orientation'], grades: [10, 11, 12], classes: ['10B', '11B', '12B'] }
    ],
    3: [
      { name: 'Samuel', surname: 'Molepo', email: 's.molepo@makgoka.co.za', phone: '0822200001', gender: 'male', subs: ['Mathematics'], grades: [10, 11, 12], classes: ['10A', '11A', '12A'] },
      { name: 'Constance', surname: 'Chokoe', email: 'c.chokoe@makgoka.co.za', phone: '0822200002', gender: 'female', subs: ['Physical Sciences', 'Life Sciences'], grades: [10, 11, 12], classes: ['10A', '11A', '12A'] },
      { name: 'Godfrey', surname: 'Mamabolo', email: 'g.mamabolo@makgoka.co.za', phone: '0822200003', gender: 'male', subs: ['Economics', 'Accounting'], grades: [10, 11, 12], classes: ['10B', '11B', '12B'] },
      { name: 'Lydia', surname: 'Mampuru', email: 'l.mampuru@makgoka.co.za', phone: '0822200004', gender: 'female', subs: ['Home Language', 'English FAL'], grades: [10, 11, 12], classes: ['10A', '10B', '11A', '11B', '12A', '12B'] }
    ],
    4: [
      { name: 'Solomon', surname: 'Mamabolo', email: 's.mamabolo@turfloop.co.za', phone: '0823300001', gender: 'male', subs: ['Mathematics', 'Physical Sciences'], grades: [10, 11, 12], classes: ['10A', '11A', '12A'] },
      { name: 'Rachel', surname: 'Mashishi', email: 'r.mashishi@turfloop.co.za', phone: '0823300002', gender: 'female', subs: ['Life Sciences', 'Geography'], grades: [10, 11, 12], classes: ['10A', '11A', '12A'] },
      { name: 'Patrick', surname: 'Mokgohloa', email: 'p.mokgohloa@turfloop.co.za', phone: '0823300003', gender: 'male', subs: ['Accounting', 'Business Studies'], grades: [10, 11, 12], classes: ['10B', '11B', '12B'] },
      { name: 'Grace', surname: 'Madiba', email: 'g.madiba@turfloop.co.za', phone: '0823300004', gender: 'female', subs: ['English FAL', 'Life Orientation'], grades: [10, 11, 12], classes: ['10A', '10B', '11A', '11B', '12A', '12B'] }
    ],
    5: [
      { name: 'Victor', surname: 'Ramokgopa', email: 'v.ramokgopa@hwiti.co.za', phone: '0824400001', gender: 'male', subs: ['Physical Sciences', 'Mathematics'], grades: [10, 11, 12], classes: ['10A', '11A', '12A'] },
      { name: 'Maria', surname: 'Mogale', email: 'm.mogale@hwiti.co.za', phone: '0824400002', gender: 'female', subs: ['Life Sciences', 'Geography'], grades: [10, 11, 12], classes: ['10A', '11A', '12A'] },
      { name: 'Joseph', surname: 'Setati', email: 'j.setati@hwiti.co.za', phone: '0824400003', gender: 'male', subs: ['Business Studies', 'Economics'], grades: [10, 11, 12], classes: ['10B', '11B', '12B'] },
      { name: 'Paulina', surname: 'Mabeba', email: 'p.mabeba@hwiti.co.za', phone: '0824400004', gender: 'female', subs: ['Home Language', 'English FAL'], grades: [10, 11, 12], classes: ['10A', '10B', '11A', '11B', '12A', '12B'] }
    ],
    6: [
      { name: 'Johannes', surname: 'Mohube', email: 'j.mohube@ngwanamohube.co.za', phone: '0825500001', gender: 'male', subs: ['Mathematics', 'Physical Sciences'], grades: [10, 11, 12], classes: ['10A', '11A', '12A'] },
      { name: 'Francina', surname: 'Phala', email: 'f.phala@ngwanamohube.co.za', phone: '0825500002', gender: 'female', subs: ['Life Sciences', 'Geography'], grades: [10, 11, 12], classes: ['10A', '11A', '12A'] },
      { name: 'Titus', surname: 'Ledwaba', email: 't.ledwaba@ngwanamohube.co.za', phone: '0825500003', gender: 'male', subs: ['Accounting', 'Business Studies'], grades: [10, 11, 12], classes: ['10B', '11B', '12B'] },
      { name: 'Anna', surname: 'Mphahlele', email: 'a.mphahlele@ngwanamohube.co.za', phone: '0825500004', gender: 'female', subs: ['Home Language', 'English FAL'], grades: [10, 11, 12], classes: ['10A', '10B', '11A', '11B', '12A', '12B'] }
    ],
    7: [
      { name: 'David', surname: 'Naidoo', email: 'd.naidoo@fusionsecondary.co.za', phone: '0826600001', gender: 'male', subs: ['Mathematics', 'Physical Sciences'], grades: [10, 11, 12], classes: ['10A', '11A', '12A'] },
      { name: 'Fatima', surname: 'Patel', email: 'f.patel@fusionsecondary.co.za', phone: '0826600002', gender: 'female', subs: ['Life Sciences', 'Geography'], grades: [10, 11, 12], classes: ['10A', '11A', '12A'] },
      { name: 'Kgomotso', surname: 'Mahlangu', email: 'k.mahlangu@fusionsecondary.co.za', phone: '0826600003', gender: 'male', subs: ['Accounting', 'Economics'], grades: [10, 11, 12], classes: ['10B', '11B', '12B'] },
      { name: 'Sarah', surname: 'Johnson', email: 's.johnson@fusionsecondary.co.za', phone: '0826600004', gender: 'female', subs: ['English FAL', 'Life Orientation'], grades: [10, 11, 12], classes: ['10A', '10B', '11A', '11B', '12A', '12B'] }
    ],
    8: [
      { name: 'Sipho', surname: 'Masemola', email: 's.masemola@saulridge.co.za', phone: '0827700001', gender: 'male', subs: ['Mathematics', 'Physical Sciences'], grades: [10, 11, 12], classes: ['10A', '11A', '12A'] },
      { name: 'Nomsa', surname: 'Khumalo', email: 'n.khumalo@saulridge.co.za', phone: '0827700002', gender: 'female', subs: ['Life Sciences', 'Geography'], grades: [10, 11, 12], classes: ['10A', '11A', '12A'] },
      { name: 'Lucas', surname: 'Mokoena', email: 'l.mokoena@saulridge.co.za', phone: '0827700003', gender: 'male', subs: ['Business Studies', 'Accounting'], grades: [10, 11, 12], classes: ['10B', '11B', '12B'] },
      { name: 'Bongiwe', surname: 'Nkosi', email: 'b.nkosi@saulridge.co.za', phone: '0827700004', gender: 'female', subs: ['Setswana', 'English FAL'], grades: [10, 11, 12], classes: ['10A', '10B', '11A', '11B', '12A', '12B'] }
    ],
    9: [
      { name: 'Bongani', surname: 'Sithole', email: 'b.sithole@phelindaba.co.za', phone: '0828800001', gender: 'male', subs: ['Mathematics', 'Physical Sciences'], grades: [10, 11, 12], classes: ['10A', '11A', '12A'] },
      { name: 'Thandiwe', surname: 'Dlamini', email: 't.dlamini@phelindaba.co.za', phone: '0828800002', gender: 'female', subs: ['Life Sciences', 'Geography'], grades: [10, 11, 12], classes: ['10A', '11A', '12A'] },
      { name: 'Themba', surname: 'Zungu', email: 't.zungu@phelindaba.co.za', phone: '0828800003', gender: 'male', subs: ['Economics', 'Accounting'], grades: [10, 11, 12], classes: ['10B', '11B', '12B'] },
      { name: 'Zanele', surname: 'Mkhize', email: 'z.mkhize@phelindaba.co.za', phone: '0828800004', gender: 'female', subs: ['isiZulu', 'English FAL'], grades: [10, 11, 12], classes: ['10A', '10B', '11A', '11B', '12A', '12B'] }
    ],
    10: [
      { name: 'Enock', surname: 'Maluleke', email: 'e.maluleke@flaviusmareka.co.za', phone: '0829900001', gender: 'male', subs: ['Mathematics', 'Physical Sciences'], grades: [10, 11, 12], classes: ['10A', '11A', '12A'] },
      { name: 'Patricia', surname: 'Baloyi', email: 'p.baloyi@flaviusmareka.co.za', phone: '0829900002', gender: 'female', subs: ['Life Sciences', 'Geography'], grades: [10, 11, 12], classes: ['10A', '11A', '12A'] },
      { name: 'Mandla', surname: 'Sibiya', email: 'm.sibiya@flaviusmareka.co.za', phone: '0829900003', gender: 'male', subs: ['Business Studies', 'Accounting'], grades: [10, 11, 12], classes: ['10B', '11B', '12B'] },
      { name: 'Nthabiseng', surname: 'Morake', email: 'n.morake@flaviusmareka.co.za', phone: '0829900004', gender: 'female', subs: ['Setswana', 'English FAL'], grades: [10, 11, 12], classes: ['10A', '10B', '11A', '11B', '12A', '12B'] }
    ],
    11: [
      { name: 'Meshack', surname: 'Ndlovu', email: 'm.ndlovu@wfnkomo.co.za', phone: '0831100001', gender: 'male', subs: ['Mathematics', 'Physical Sciences'], grades: [10, 11, 12], classes: ['10A', '11A', '12A'] },
      { name: 'Eunice', surname: 'Kekana', email: 'e.kekana@wfnkomo.co.za', phone: '0831100002', gender: 'female', subs: ['Life Sciences', 'Geography'], grades: [10, 11, 12], classes: ['10A', '11A', '12A'] },
      { name: 'Abel', surname: 'Chauke', email: 'a.chauke@wfnkomo.co.za', phone: '0831100003', gender: 'male', subs: ['Accounting', 'Economics'], grades: [10, 11, 12], classes: ['10B', '11B', '12B'] },
      { name: 'Dineo', surname: 'Mabena', email: 'd.mabena@wfnkomo.co.za', phone: '0831100004', gender: 'female', subs: ['Sepedi', 'English FAL'], grades: [10, 11, 12], classes: ['10A', '10B', '11A', '11B', '12A', '12B'] }
    ],
    12: [
      { name: 'Simon', surname: 'Mogale', email: 's.mogale@hofmeyr.co.za', phone: '0832200001', gender: 'male', subs: ['Mathematics', 'Physical Sciences'], grades: [10, 11, 12], classes: ['10A', '11A', '12A'] },
      { name: 'Ntombi', surname: 'Mthembu', email: 'n.mthembu@hofmeyr.co.za', phone: '0832200002', gender: 'female', subs: ['Life Sciences', 'Geography'], grades: [10, 11, 12], classes: ['10A', '11A', '12A'] },
      { name: 'Gideon', surname: 'Mahlangu', email: 'g.mahlangu@hofmeyr.co.za', phone: '0832200003', gender: 'male', subs: ['Business Studies', 'Accounting'], grades: [10, 11, 12], classes: ['10B', '11B', '12B'] },
      { name: 'Busisiwe', surname: 'Zulu', email: 'b.zulu@hofmeyr.co.za', phone: '0832200004', gender: 'female', subs: ['isiZulu', 'English FAL'], grades: [10, 11, 12], classes: ['10A', '10B', '11A', '11B', '12A', '12B'] }
    ]
  };

  // Student roster generation per school
  const studentNamesPool = [
    { first: 'Kagiso', last: 'Mabitsela', gender: 'male' },
    { first: 'Refilwe', last: 'Sebatana', gender: 'female' },
    { first: 'Tshepiso', last: 'Ramasobana', gender: 'male' },
    { first: 'Mpho', last: 'Chokoe', gender: 'female' },
    { first: 'Kabelo', last: 'Makgoka', gender: 'male' },
    { first: 'Dipuo', last: 'Ledwaba', gender: 'female' },
    { first: 'Tebogo', last: 'Madiba', gender: 'male' },
    { first: 'Nthabiseng', last: 'Mashishi', gender: 'female' },
    { first: 'Sello', last: 'Mphahlele', gender: 'male' },
    { first: 'Palesa', last: 'Moabelo', gender: 'female' },
    { first: 'Kholofelo', last: 'Mabeba', gender: 'female' },
    { first: 'Lethabo', last: 'Phaahla', gender: 'male' },
    { first: 'Boitumelo', last: 'Matlala', gender: 'female' },
    { first: 'Katlego', last: 'Ramokgopa', gender: 'male' },
    { first: 'Koketso', last: 'Chauke', gender: 'male' },
    { first: 'Modiehi', last: 'Baloyi', gender: 'female' },
    { first: 'Ofentse', last: 'Sithole', gender: 'male' },
    { first: 'Keletso', last: 'Masemola', gender: 'female' },
    { first: 'Tshegofatso', last: 'Morake', gender: 'male' },
    { first: 'Amogelang', last: 'Kekana', gender: 'female' }
  ];

  // School Administrator Roster
  const adminRoster = [
    { schoolId: 1, email: 'admin@fusionhigh.co.za', name: 'Tshepho Letlalo', surname: 'Makula', phone: '0692606618', isSuper: true },
    { schoolId: 2, email: 'admin@mountainviewhigh.co.za', name: 'M. S.', surname: 'Phasha', phone: '0152671100', isSuper: false },
    { schoolId: 2, email: 'admin@mountainview.co.za', name: 'M. S.', surname: 'Phasha', phone: '0152671100', isSuper: false },
    { schoolId: 3, email: 'admin@makgoka.co.za', name: 'K. E.', surname: 'Molepo', phone: '0152660022', isSuper: false },
    { schoolId: 4, email: 'principal@turfloophigh.co.za', name: 'N. J.', surname: 'Mamabolo', phone: '0152673300', isSuper: false },
    { schoolId: 4, email: 'admin@turfloop.co.za', name: 'N. J.', surname: 'Mamabolo', phone: '0152673300', isSuper: false },
    { schoolId: 5, email: 'admin@hwiti.co.za', name: 'R. M.', surname: 'Ramokgopa', phone: '0152674400', isSuper: false },
    { schoolId: 6, email: 'admin@ngwanamohube.co.za', name: 'S. P.', surname: 'Mohube', phone: '0152675500', isSuper: false },
    { schoolId: 7, email: 'admin@fusionsecondary.co.za', name: 'Tshepo', surname: 'Makola', phone: '0123730000', isSuper: false },
    { schoolId: 8, email: 'admin@saulridge.co.za', name: 'K. E.', surname: 'Masemola', phone: '0123756000', isSuper: false },
    { schoolId: 9, email: 'admin@phelindaba.co.za', name: 'M. T.', surname: 'Sithole', phone: '0123738100', isSuper: false },
    { schoolId: 10, email: 'admin@flaviusmareka.co.za', name: 'L. N.', surname: 'Maluleke', phone: '0123739200', isSuper: false },
    { schoolId: 11, email: 'admin@wfnkomo.co.za', name: 'D. M.', surname: 'Ndlovu', phone: '0123757300', isSuper: false },
    { schoolId: 12, email: 'admin@hofmeyr.co.za', name: 'S. R.', surname: 'Mogale', phone: '0123737400', isSuper: false }
  ];

  // 0. Process School Administrators
  console.log('--- 0. SEEDING ADMINISTRATORS FOR ALL 12 SCHOOLS ---');
  for (const adm of adminRoster) {
    await db.query(`
      INSERT INTO users (email, password_hash, role_id, school_id, full_name, surname, phone, is_superadmin)
      VALUES ($1, $2, (SELECT id FROM roles WHERE name = 'admin'), $3, $4, $5, $6, $7)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        school_id = EXCLUDED.school_id,
        full_name = EXCLUDED.full_name,
        surname = EXCLUDED.surname,
        role_id = EXCLUDED.role_id,
        is_superadmin = EXCLUDED.is_superadmin;
    `, [adm.email, passwordHash, adm.schoolId, adm.name, adm.surname, adm.phone, adm.isSuper]);
  }
  console.log('✅ Seeded dedicated administrators across all 12 schools.');

  // 1. Process Teachers
  console.log('\n--- 1. SEEDING TEACHERS FOR ALL 12 SCHOOLS ---');
  for (const school of schools) {
    const teachers = teacherRosterBySchool[school.id] || [];
    for (const t of teachers) {
      // Upsert User
      const userRes = await db.query(`
        INSERT INTO users (email, password_hash, role_id, school_id, full_name, surname, phone, gender)
        VALUES ($1, $2, (SELECT id FROM roles WHERE name = 'teacher'), $3, $4, $5, $6, $7)
        ON CONFLICT (email) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          school_id = EXCLUDED.school_id,
          full_name = EXCLUDED.full_name,
          surname = EXCLUDED.surname,
          phone = EXCLUDED.phone
        RETURNING id;
      `, [t.email, passwordHash, school.id, t.name, t.surname, t.phone, t.gender]);
      const userId = userRes.rows[0].id;

      // Upsert Employee profile
      await db.query(`
        INSERT INTO employees (user_id, employee_role_id, full_name, surname, department_id, subjects, grades_taught, classes_taught, phone, email, hired_date)
        VALUES ($1, 1, $2, $3, 2, $4, $5, $6, $7, $8, '2024-01-15'::DATE)
        ON CONFLICT (user_id) DO UPDATE SET
          subjects = EXCLUDED.subjects,
          grades_taught = EXCLUDED.grades_taught,
          classes_taught = EXCLUDED.classes_taught;
      `, [userId, t.name, t.surname, t.subs, t.grades, t.classes, t.phone, t.email]);
    }
    console.log(`✅ Seeded ${teachers.length} teachers for [${school.id}] ${school.name}`);
  }

  // 2. Process Learners for schools 3 to 12 (Schools 1 & 2 already have learners, but we ensure their data is complete)
  console.log('\n--- 2. SEEDING LEARNERS FOR ALL 12 SCHOOLS ---');
  for (const school of schools) {
    // If school is 3 through 12, seed 18 learners (6 per grade: 10, 11, 12)
    if (school.id >= 3) {
      let lrnIdx = 1;
      for (const grade of [10, 11, 12]) {
        for (let i = 0; i < 6; i++) {
          const person = studentNamesPool[(lrnIdx + school.id * 3) % studentNamesPool.length];
          const stream = i < 3 ? 'Science' : (i < 5 ? 'Commerce' : 'Tourism');
          const className = `${grade}${stream === 'Science' ? 'A' : 'B'}`;
          const subjects = stream === 'Science' ? scienceSubs : (stream === 'Commerce' ? commerceSubs : tourismSubs);
          const studentNum = `2025${school.id}${grade}${String(i + 1).padStart(2, '0')}`;
          const studentEmail = `${studentNum}@${school.domain}`;
          const birthYear = 2026 - (grade + 6);
          const dob = `${birthYear}-0${(i % 9) + 1}-15`;

          // Insert User
          const uRes = await db.query(`
            INSERT INTO users (email, password_hash, role_id, school_id, full_name, surname, dob, gender)
            VALUES ($1, $2, (SELECT id FROM roles WHERE name = 'learner'), $3, $4, $5, $6::DATE, $7)
            ON CONFLICT (email) DO UPDATE SET
              password_hash = EXCLUDED.password_hash,
              school_id = EXCLUDED.school_id,
              full_name = EXCLUDED.full_name,
              surname = EXCLUDED.surname
            RETURNING id;
          `, [studentEmail, passwordHash, school.id, person.first, person.last, dob, person.gender]);
          const userId = uRes.rows[0].id;

          // Insert Child
          await db.query(`
            INSERT INTO children (learner_user_id, full_name, surname, learner_number, grade, class_id, stream, subjects, school_id, home_language)
            VALUES ($1, $2, $3, $4, $5, (SELECT id FROM classes WHERE name = $6 LIMIT 1), $7, $8, $9, $10)
            ON CONFLICT (learner_user_id) DO UPDATE SET
              grade = EXCLUDED.grade,
              stream = EXCLUDED.stream,
              subjects = EXCLUDED.subjects,
              school_id = EXCLUDED.school_id;
          `, [userId, person.first, person.last, studentNum, grade, className, stream, subjects, school.id, school.lang]);

          lrnIdx++;
        }
      }
      console.log(`✅ Seeded 18 learners across Grades 10-12 for [${school.id}] ${school.name}`);
    } else {
      console.log(`ℹ️ [${school.id}] ${school.name} already has custom seeded learners (${school.id === 1 ? 21 : 24} students).`);
      // Update password hash for custom learners of schools 1 & 2
      await db.query(`
        UPDATE users 
        SET password_hash = $1 
        WHERE school_id = $2 AND role_id = (SELECT id FROM roles WHERE name = 'learner')
      `, [passwordHash, school.id]);
    }
  }

  // 3. Seed Marks, Progress, & Attendance for all children across all schools
  console.log('\n--- 3. SEEDING MARKS, PROGRESS, & ATTENDANCE ---');
  const allChildrenRes = await db.query('SELECT c.id, c.learner_user_id, c.grade, c.stream, c.subjects, c.school_id FROM children c');
  console.log(`Processing ${allChildrenRes.rows.length} total enrolled children across all schools...`);

  const termDates = [
    '2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07',
    '2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14',
    '2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21',
    '2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28'
  ];

  // Cache teachers per school for attendance recording
  const teachersBySchoolMap = {};
  for (const s of schools) {
    const tRes = await db.query(`
      SELECT u.id FROM users u 
      JOIN roles r ON u.role_id = r.id 
      WHERE r.name = 'teacher' AND u.school_id = $1 
      LIMIT 1
    `, [s.id]);
    teachersBySchoolMap[s.id] = tRes.rows.length > 0 ? tRes.rows[0].id : 1;
  }

  for (const child of allChildrenRes.rows) {
    const subjects = child.subjects || scienceSubs;
    const teacherId = teachersBySchoolMap[child.school_id] || 1;
    
    // Seed Progress / Marks for Terms 1, 2, 3
    for (const sub of subjects) {
      const baseScore = 55 + (child.id * 7 + sub.length * 3) % 40; // 55% to 94%
      
      // Progress table entry
      await db.query(`
        INSERT INTO progress (child_id, subject, term, grade, date)
        VALUES ($1, $2, 3, $3, CURRENT_DATE)
        ON CONFLICT DO NOTHING;
      `, [child.id, sub, baseScore]);
    }

    // Seed Attendance records for Term 3 dates
    for (let d = 0; d < termDates.length; d++) {
      const date = termDates[d];
      const isAbsent = (child.id + d) % 23 === 0;
      const isLate = (child.id + d) % 17 === 0;
      const status = isAbsent ? 'absent' : (isLate ? 'late' : 'present');

      await db.query(`
        INSERT INTO attendance (child_id, attendance_date, status, school_id, reason, recorded_by_teacher_id)
        SELECT $1, $2::DATE, $3, $4, $5, $6
        WHERE NOT EXISTS (
          SELECT 1 FROM attendance WHERE child_id = $1 AND attendance_date = $2::DATE
        );
      `, [child.id, date, status, child.school_id, status === 'present' ? 'On time' : status, teacherId]);
    }
  }

  // 4. Seed School-Specific Announcements
  console.log('\n--- 4. SEEDING SCHOOL ANNOUNCEMENTS ---');
  for (const school of schools) {
    await db.query(`
      INSERT INTO announcements (title, content, author_id, school_id, role_target, created_at)
      VALUES 
        ('Term 3 CAPS Assessment Schedule', 'Official Grade 10-12 CAPS assessment timetable is active. Please prepare for SBA moderation.', (SELECT id FROM users WHERE school_id = $1 AND role_id = (SELECT id FROM roles WHERE name = 'admin') LIMIT 1), $1, 'all', CURRENT_TIMESTAMP - INTERVAL '3 days'),
        ('Parent-Educator Consultations Open', 'Book your 15-minute consultation slots with subject educators on the parent portal.', (SELECT id FROM users WHERE school_id = $1 AND role_id = (SELECT id FROM roles WHERE name = 'admin') LIMIT 1), $1, 'parent', CURRENT_TIMESTAMP - INTERVAL '1 day')
      ON CONFLICT DO NOTHING;
    `, [school.id]);
  }

  console.log('\n===============================================================');
  console.log('🎉 ALL 12 SCHOOLS FULLY POPULATED WITH TEACHERS, LEARNERS & DATA');
  console.log('===============================================================');
}

if (require.main === module) {
  seedAllSchoolsData().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}

module.exports = seedAllSchoolsData;
