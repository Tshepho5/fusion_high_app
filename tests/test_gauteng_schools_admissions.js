/**
 * Automated Verification Script: Cross-Provincial Gauteng & Limpopo Admissions & Registration
 */
const axios = require('axios');
const db = require('../db/db');

const BASE_URL = process.env.BASE_URL || 'http://localhost:4000';

function generateValidSAID(birthDate, gender = 'Female') {
  const d = new Date(birthDate);
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');

  const gMin = gender.toLowerCase() === 'female' ? 0 : 5000;
  const gCode = String(gMin + Math.floor(Math.random() * 4999)).padStart(4, '0');
  const c = '0'; // SA Citizen
  const a = '8';

  const base12 = `${yy}${mm}${dd}${gCode}${c}${a}`;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    let digit = parseInt(base12[i], 10);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return `${base12}${checkDigit}`;
}

async function runGautengAdmissionsTest() {
  console.log('\n================================================================');
  console.log('🏛️ CROSS-PROVINCIAL GAUTENG & LIMPOPO MULTI-SCHOOL TEST');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  // 1. Verify 12 Total Schools in Database Directory
  await test('Verify 12 Enrolled Schools (Limpopo + Gauteng)', async () => {
    const res = await axios.get(`${BASE_URL}/api/schools`);
    if (!Array.isArray(res.data) || res.data.length < 12) {
      throw new Error(`Expected at least 12 schools, got ${res.data.length}`);
    }
    const lotus = res.data.find(s => s.slug === 'fusion-secondary-lotus');
    const saulridge = res.data.find(s => s.slug === 'saulridge-secondary');
    const phelindaba = res.data.find(s => s.slug === 'phelindaba-secondary');
    const flavius = res.data.find(s => s.slug === 'flavius-mareka');
    const nkomo = res.data.find(s => s.slug === 'wf-nkomo-secondary');
    const hofmeyr = res.data.find(s => s.slug === 'hofmeyr-secondary');

    if (!lotus || !saulridge || !phelindaba || !flavius || !nkomo || !hofmeyr) {
      throw new Error('One or more Gauteng schools missing from /api/schools response');
    }
    console.log(`     Successfully loaded all 12 partner schools (${res.data.length} enrolled)`);
  });

  // 2. Submit Application for Fusion Secondary School Lotus Gardens (Expect FSL- Prefix)
  await test('Submit Application for Fusion Secondary Lotus Gardens (Expect FSL- Prefix)', async () => {
    const res = await axios.post(`${BASE_URL}/api/applications/apply`, {
      first_name: 'Lerato',
      surname: 'Kekana',
      id_number: generateValidSAID('2008-05-12', 'Female'),
      dob: '2008-05-12',
      gender: 'Female',
      citizenship: 'South Africa',
      phone: '0711122334',
      email: 'lerato.k@example.com',
      physical_address: 'Lotus Gardens Ext 2, Pretoria, 0008',
      grade_applied: '10',
      stream: 'Science',
      home_language: 'Setswana',
      primary_parent_name: 'David',
      primary_parent_surname: 'Kekana',
      primary_parent_relationship: 'Father',
      primary_parent_id_number: generateValidSAID('1980-02-14', 'Male'),
      primary_parent_phone: '0821122334',
      primary_parent_email: `parent.lotus.${Date.now()}@example.com`,
      primary_parent_address: 'Lotus Gardens Ext 2, Pretoria, 0008',
      school_id: 7
    });

    if (!res.data.applicationNumber) throw new Error('No application number returned');
    if (!res.data.applicationNumber.startsWith('FSL-2026-')) {
      throw new Error(`Expected FSL-2026 prefix, got ${res.data.applicationNumber}`);
    }
    console.log(`     Created Lotus Gardens Ref: ${res.data.applicationNumber}`);
  });

  // 3. Submit Application for Saulridge Secondary (Expect SLR- Prefix)
  await test('Submit Application for Saulridge Secondary (Expect SLR- Prefix)', async () => {
    const res = await axios.post(`${BASE_URL}/api/applications/apply`, {
      first_name: 'Kabelo',
      surname: 'Mahlangu',
      id_number: generateValidSAID('2009-08-22', 'Male'),
      dob: '2009-08-22',
      gender: 'Male',
      citizenship: 'South Africa',
      phone: '0722233445',
      email: 'kabelo.m@example.com',
      physical_address: 'Ramokgopa St, Atteridgeville, Pretoria, 0008',
      grade_applied: '9',
      home_language: 'Sepedi',
      primary_parent_name: 'Nomsa',
      primary_parent_surname: 'Mahlangu',
      primary_parent_relationship: 'Mother',
      primary_parent_id_number: generateValidSAID('1982-11-05', 'Female'),
      primary_parent_phone: '0832233445',
      primary_parent_email: `parent.saulridge.${Date.now()}@example.com`,
      primary_parent_address: 'Ramokgopa St, Atteridgeville, Pretoria, 0008',
      school_id: 8
    });

    if (!res.data.applicationNumber) throw new Error('No application number returned');
    if (!res.data.applicationNumber.startsWith('SLR-2026-')) {
      throw new Error(`Expected SLR-2026 prefix, got ${res.data.applicationNumber}`);
    }
    console.log(`     Created Saulridge Ref: ${res.data.applicationNumber}`);
  });

  // 4. Submit Application for Dr. W.F. Nkomo Secondary (Expect WFN- Prefix)
  await test('Submit Application for Dr. W.F. Nkomo Secondary (Expect WFN- Prefix)', async () => {
    const res = await axios.post(`${BASE_URL}/api/applications/apply`, {
      first_name: 'Tshegofatso',
      surname: 'Modise',
      id_number: generateValidSAID('2007-04-18', 'Female'),
      dob: '2007-04-18',
      gender: 'Female',
      citizenship: 'South Africa',
      phone: '0733344556',
      email: 'tshego.m@example.com',
      physical_address: 'Ramushu St, Atteridgeville, Pretoria, 0008',
      grade_applied: '11',
      stream: 'Commercial',
      home_language: 'Setswana',
      primary_parent_name: 'Solomon',
      primary_parent_surname: 'Modise',
      primary_parent_relationship: 'Father',
      primary_parent_id_number: generateValidSAID('1979-09-12', 'Male'),
      primary_parent_phone: '0843344556',
      primary_parent_email: `parent.nkomo.${Date.now()}@example.com`,
      primary_parent_address: 'Ramushu St, Atteridgeville, Pretoria, 0008',
      school_id: 11
    });

    if (!res.data.applicationNumber) throw new Error('No application number returned');
    if (!res.data.applicationNumber.startsWith('WFN-2026-')) {
      throw new Error(`Expected WFN-2026 prefix, got ${res.data.applicationNumber}`);
    }
    console.log(`     Created W.F. Nkomo Ref: ${res.data.applicationNumber}`);
  });

  // 5. Parent & Learner Registration for Flavius Mareka Secondary School (School ID 10)
  await test('Register Parent for Flavius Mareka Secondary (School ID 10)', async () => {
    const parentEmail = `parent.flavius.${Date.now()}@example.com`;
    const regRes = await axios.post(`${BASE_URL}/api/register`, {
      role: 'parent',
      full_name: 'Nthabiseng',
      surname: 'Maluleke',
      email: parentEmail,
      phone: '0829988776',
      password: 'Password@123',
      confirmPassword: 'Password@123',
      id_number: generateValidSAID('1984-06-19', 'Female'),
      dob: '1984-06-19',
      gender: 'Female',
      physical_address: 'Khoza St, Atteridgeville, Pretoria, 0008',
      country: 'South Africa',
      parent_type: 'Mother',
      school_id: 10,
      children_to_link: [
        {
          firstName: 'Sipho',
          surname: 'Maluleke',
          idNumber: generateValidSAID('2009-02-10', 'Male'),
          grade: '10',
          stream: 'Science',
          home_language: 'Xitsonga'
        }
      ]
    });

    if (!regRes.data.success && !regRes.data.user) {
      throw new Error('Registration failed');
    }

    const userDb = await db.query('SELECT school_id FROM users WHERE email = $1', [parentEmail]);
    if (userDb.rows[0].school_id !== 10) {
      throw new Error(`Expected parent school_id 10, got ${userDb.rows[0].school_id}`);
    }
    console.log(`     Successfully registered parent & learner under Flavius Mareka Secondary (School ID 10)`);
  });

  console.log('\n================================================================');
  console.log(`🏁 GAUTENG AUDIT COMPLETE: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runGautengAdmissionsTest().catch(e => {
  console.error(e);
  process.exit(1);
});
