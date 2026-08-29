/**
 * Comprehensive Automated Verification of All 12 Partner Schools Demo Logins
 * Tests Admin, Teacher, Parent, and Learner for every school.
 * Asserts automatic routing and school context resolution.
 */
const axios = require('axios');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:4000';
const PASSWORD = 'Password@123';

const SCHOOLS_TO_TEST = [
  { id: 1, name: 'Fusion High School', domain: 'fusionhigh.co.za' },
  { id: 2, name: 'Mountainview Senior Secondary School', domain: 'mountainview.co.za' },
  { id: 3, name: 'Makgoka High School', domain: 'makgoka.co.za' },
  { id: 4, name: 'Turfloop High School', domain: 'turfloop.co.za' },
  { id: 5, name: 'Hwiti High School', domain: 'hwiti.co.za' },
  { id: 6, name: 'Ngwana Mohube Secondary School', domain: 'ngwanamohube.co.za' },
  { id: 7, name: 'Fusion Secondary School (Lotus Gardens)', domain: 'fusionsecondary.co.za' },
  { id: 8, name: 'Saulridge Secondary School', domain: 'saulridge.co.za' },
  { id: 9, name: 'Phelindaba Secondary School', domain: 'phelindaba.co.za' },
  { id: 10, name: 'Flavius Mareka Secondary School', domain: 'flaviusmareka.co.za' },
  { id: 11, name: 'Dr. W.F. Nkomo Secondary School', domain: 'wfnkomo.co.za' },
  { id: 12, name: 'Hofmeyr Secondary School', domain: 'hofmeyr.co.za' }
];

async function runAllSchoolsLoginTest() {
  console.log('\n================================================================');
  console.log('🏛️ MULTI-SCHOOL DEMO USERS AUTHENTICATION AUDIT (12/12 SCHOOLS)');
  console.log('================================================================\n');

  let totalTests = 0;
  let passedTests = 0;

  for (const s of SCHOOLS_TO_TEST) {
    console.log(`\n🏫 Testing School [${s.id}] ${s.name} (@${s.domain}):`);

    const roles = ['admin', 'teacher', 'parent', 'learner'];

    for (const role of roles) {
      totalTests++;
      const email = `${role}@${s.domain}`;
      try {
        const res = await axios.post(`${BASE_URL}/api/login`, {
          email,
          identifier: email,
          password: PASSWORD
        });

        const data = res.data;
        const resRole = (data.role || '').toLowerCase();
        const resSchoolId = data.school_id || data.school?.id || data.user?.school_id;

        if (resRole === role && Number(resSchoolId) === s.id) {
          console.log(`  ✅ [PASS] ${role.toUpperCase().padEnd(8)}: ${email} -> Logged in as ${resRole} (School ID: ${resSchoolId} - ${data.school?.name || s.name})`);
          passedTests++;
        } else {
          console.error(`  ❌ [FAIL] ${role.toUpperCase().padEnd(8)}: Expected role "${role}" and schoolId ${s.id}, got role "${resRole}" and schoolId ${resSchoolId}`);
        }
      } catch (err) {
        console.error(`  ❌ [FAIL] ${role.toUpperCase().padEnd(8)}: ${email} -> ${err.response?.data?.error || err.message}`);
      }
    }
  }

  console.log('\n================================================================');
  console.log(`🏁 AUDIT COMPLETE: ${passedTests}/${totalTests} Tests Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runAllSchoolsLoginTest();
