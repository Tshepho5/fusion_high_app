const axios = require('axios');
const db = require('../db/db');

const BASE_URL = 'http://127.0.0.1:4000';

function generateValidSAID(dobYYMMDD, genderMale = true, isCitizen = true) {
  const genderDigits = genderMale ? '5123' : '0123';
  const citizenDigit = isCitizen ? '0' : '1';
  const raceDigit = '8';
  const first12 = `${dobYYMMDD}${genderDigits}${citizenDigit}${raceDigit}`;
  
  let nCheck = 0;
  let bEven = true;
  for (let n = first12.length - 1; n >= 0; n--) {
    let nDigit = parseInt(first12.charAt(n), 10);
    if (bEven) {
      if ((nDigit *= 2) > 9) nDigit -= 9;
    }
    nCheck += nDigit;
    bEven = !bEven;
  }
  const checkDigit = (10 - (nCheck % 10)) % 10;
  return `${first12}${checkDigit}`;
}

async function runAdmissionsAndRegistrationTest() {
  console.log('================================================================');
  console.log('🏫 MULTI-SCHOOL ADMISSIONS & REGISTRATION PIPELINE TEST');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  const test = async (name, fn) => {
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      const errDetail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      console.error(`  ❌ [FAIL] ${name}: ${errDetail}`);
      failed++;
    }
  };

  const createdApplications = [];

  const learnerId1 = generateValidSAID('080315', true);
  const parentId1 = generateValidSAID('800512', true);

  const learnerId2 = generateValidSAID('090120', true);
  const parentId2 = generateValidSAID('820415', false);

  const learnerId3 = generateValidSAID('070710', false);
  const parentId3 = generateValidSAID('780612', false);

  const parentId4 = generateValidSAID('860101', true);
  const learnerId4 = generateValidSAID('100515', true);

  // 1. Submit application for Makgoka High School (ID 3)
  await test('Submit Application for Makgoka High School (Expect MKG- Prefix)', async () => {
    const res = await axios.post(`${BASE_URL}/api/applications/apply`, {
      first_name: 'Kagiso',
      surname: 'Molepo',
      id_number: learnerId1,
      dob: '2008-03-15',
      gender: 'Male',
      citizenship: 'South Africa',
      phone: '0712345678',
      email: 'kagiso.molepo@example.com',
      physical_address: 'Ga-Molepo, Mankweng, Limpopo',
      grade_applied: '10',
      stream: 'Science',
      home_language: 'Sepedi',
      primary_parent_name: 'Lesetja',
      primary_parent_surname: 'Molepo',
      primary_parent_relationship: 'Father',
      primary_parent_id_number: parentId1,
      primary_parent_phone: '0823456789',
      primary_parent_email: `parent.makgoka.${Date.now()}@example.com`,
      primary_parent_address: 'Ga-Molepo, Mankweng, Limpopo',
      school_id: 3
    });

    if (!res.data.applicationNumber) throw new Error('No application number returned');
    if (!res.data.applicationNumber.startsWith('MKG-2026-')) {
      throw new Error(`Expected MKG-2026 prefix, got ${res.data.applicationNumber}`);
    }
    createdApplications.push({ number: res.data.applicationNumber, schoolId: 3 });
    console.log(`     Created Makgoka Ref: ${res.data.applicationNumber}`);
  });

  // 2. Submit application for Mountainview High School (ID 2)
  await test('Submit Application for Mountainview Senior Secondary (Expect MTH- Prefix)', async () => {
    const res = await axios.post(`${BASE_URL}/api/applications/apply`, {
      first_name: 'Thabo',
      surname: 'Mametja',
      id_number: learnerId2,
      dob: '2009-01-20',
      gender: 'Male',
      citizenship: 'South Africa',
      phone: '0723456789',
      email: 'thabo.m@example.com',
      physical_address: 'Mankweng Unit C, Polokwane',
      grade_applied: '9',
      home_language: 'Sepedi',
      primary_parent_name: 'Mmamoya',
      primary_parent_surname: 'Mametja',
      primary_parent_relationship: 'Mother',
      primary_parent_id_number: parentId2,
      primary_parent_phone: '0834567890',
      primary_parent_email: `parent.mountainview.${Date.now()}@example.com`,
      primary_parent_address: 'Mankweng Unit C, Polokwane',
      school_id: 2
    });

    if (!res.data.applicationNumber) throw new Error('No application number returned');
    if (!res.data.applicationNumber.startsWith('MTH-2026-')) {
      throw new Error(`Expected MTH-2026 prefix, got ${res.data.applicationNumber}`);
    }
    createdApplications.push({ number: res.data.applicationNumber, schoolId: 2 });
    console.log(`     Created Mountainview Ref: ${res.data.applicationNumber}`);
  });

  // 3. Submit application for Turfloop High School (ID 4)
  await test('Submit Application for Turfloop High School (Expect TRF- Prefix)', async () => {
    const res = await axios.post(`${BASE_URL}/api/applications/apply`, {
      first_name: 'Dimakatso',
      surname: 'Phasha',
      id_number: learnerId3,
      dob: '2007-07-10',
      gender: 'Female',
      citizenship: 'South Africa',
      phone: '0734567890',
      email: 'dimakatso.p@example.com',
      physical_address: 'Turfloop, Mankweng, Limpopo',
      grade_applied: '11',
      stream: 'Commercial',
      home_language: 'Sepedi',
      primary_parent_name: 'Kholofelo',
      primary_parent_surname: 'Phasha',
      primary_parent_relationship: 'Mother',
      primary_parent_id_number: parentId3,
      primary_parent_phone: '0845678901',
      primary_parent_email: `parent.turfloop.${Date.now()}@example.com`,
      primary_parent_address: 'Turfloop, Mankweng, Limpopo',
      school_id: 4
    });

    if (!res.data.applicationNumber) throw new Error('No application number returned');
    if (!res.data.applicationNumber.startsWith('TRF-2026-')) {
      throw new Error(`Expected TRF-2026 prefix, got ${res.data.applicationNumber}`);
    }
    createdApplications.push({ number: res.data.applicationNumber, schoolId: 4 });
    console.log(`     Created Turfloop Ref: ${res.data.applicationNumber}`);
  });

  // 4. Verify Database Persistence with school_id
  await test('Verify School ID Isolation in Database Applications Table', async () => {
    for (const app of createdApplications) {
      const res = await db.query('SELECT school_id, application_number FROM applications WHERE application_number = $1', [app.number]);
      if (res.rows.length === 0) throw new Error(`App ${app.number} not found in DB`);
      if (res.rows[0].school_id !== app.schoolId) {
        throw new Error(`Expected school_id ${app.schoolId}, got ${res.rows[0].school_id}`);
      }
    }
  });

  // 5. Test Multi-School Parent Registration
  await test('Register Parent for Hwiti High School (School ID 5)', async () => {
    const parentEmail = `parent.hwiti.${Date.now()}@example.com`;
    const regRes = await axios.post(`${BASE_URL}/api/register`, {
      role: 'parent',
      full_name: 'Mpho',
      surname: 'Sebatana',
      email: parentEmail,
      phone: '0821112233',
      password: 'Password@123',
      id_number: parentId4,
      dob: '1986-01-01',
      gender: 'Male',
      physical_address: 'Sovenga Zone 1, Mankweng',
      country: 'South African Citizen',
      parent_type: 'Father',
      school_id: 5,
      children_to_link: [
        {
          firstName: 'Tumelo',
          surname: 'Sebatana',
          idNumber: learnerId4,
          grade: '10',
          stream: 'Science',
          home_language: 'Sepedi'
        }
      ]
    });

    if (!regRes.data.success && !regRes.data.user) {
      throw new Error('Registration failed');
    }

    // Verify parent and child school_id in database
    const userDbRes = await db.query('SELECT school_id FROM users WHERE email = $1', [parentEmail]);
    if (userDbRes.rows[0].school_id !== 5) {
      throw new Error(`Expected parent school_id 5, got ${userDbRes.rows[0].school_id}`);
    }

    const childDbRes = await db.query('SELECT school_id FROM children WHERE surname = $1 ORDER BY id DESC LIMIT 1', ['Sebatana']);
    if (childDbRes.rows[0].school_id !== 5) {
      throw new Error(`Expected child school_id 5, got ${childDbRes.rows[0].school_id}`);
    }
    console.log(`     Successfully registered parent and learner under Hwiti High School (School ID 5)`);
  });

  console.log('\n================================================================');
  console.log(`🏁 ADMISSIONS & REGISTRATION AUDIT COMPLETE: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
  process.exit(0);
}

runAdmissionsAndRegistrationTest().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
