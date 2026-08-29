const axios = require('axios');
const db = require('../db/db');

const BASE_URL = 'http://127.0.0.1:4000';

async function runMankwengSchoolsAudit() {
  console.log('================================================================');
  console.log('🏫 MANKWENG & POLOKWANE MULTI-SCHOOL SAAS INTEGRITY AUDIT');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  const test = async (name, fn) => {
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  };

  // 1. Verify Schools in Database
  await test('Verify 6 Schools in Database Table', async () => {
    const res = await db.query('SELECT id, name, slug, circuit, emis_number, primary_color FROM schools ORDER BY id ASC');
    if (res.rows.length < 6) {
      throw new Error(`Expected at least 6 schools in database, found ${res.rows.length}`);
    }
    console.log(`     Found ${res.rows.length} schools in DB:`);
    res.rows.forEach(s => {
      console.log(`     - [ID ${s.id}] ${s.name} (${s.circuit}) • EMIS: ${s.emis_number}`);
    });
  });

  // 2. Test GET /api/schools
  await test('GET /api/schools (Public Schools Directory API)', async () => {
    const res = await axios.get(`${BASE_URL}/api/schools`);
    if (!Array.isArray(res.data) || res.data.length < 6) {
      throw new Error(`Invalid response format from /api/schools`);
    }
    const slugs = res.data.map(s => s.slug);
    if (!slugs.includes('mountainview-high')) throw new Error('Missing Mountainview High in response');
    if (!slugs.includes('makgoka-high')) throw new Error('Missing Makgoka High in response');
    if (!slugs.includes('turfloop-high')) throw new Error('Missing Turfloop High in response');
    if (!slugs.includes('hwiti-high')) throw new Error('Missing Hwiti High in response');
    if (!slugs.includes('ngwana-mohube')) throw new Error('Missing Ngwana Mohube in response');
  });

  // 3. Test GET /api/schools/current
  await test('GET /api/schools/current (Active Default School)', async () => {
    const res = await axios.get(`${BASE_URL}/api/schools/current`);
    if (!res.data || !res.data.name) throw new Error('Missing school object in /api/schools/current');
  });

  // 4. Test GET /api/schools/current with x-school-id Header
  await test('GET /api/schools/current with x-school-id = 3 (Makgoka High School)', async () => {
    const res = await axios.get(`${BASE_URL}/api/schools/current`, {
      headers: { 'x-school-id': '3' }
    });
    if (res.data.slug !== 'makgoka-high') {
      throw new Error(`Expected Makgoka High, got ${res.data.name}`);
    }
    if (res.data.circuit !== 'Molepo Circuit') {
      throw new Error(`Expected Molepo Circuit, got ${res.data.circuit}`);
    }
  });

  // 5. Test Specific School Slugs
  const expectedSchools = [
    { slug: 'mountainview-high', name: 'Mountainview Senior Secondary School', emis: '911220452' },
    { slug: 'makgoka-high', name: 'Makgoka High School', emis: '911220411' },
    { slug: 'turfloop-high', name: 'Turfloop High School', emis: '911220612' },
    { slug: 'hwiti-high', name: 'Hwiti High School', emis: '911220323' },
    { slug: 'ngwana-mohube', name: 'Ngwana Mohube Secondary School', emis: '911220501' }
  ];

  for (const exp of expectedSchools) {
    await test(`GET /api/schools/${exp.slug} (${exp.name})`, async () => {
      const res = await axios.get(`${BASE_URL}/api/schools/${exp.slug}`);
      if (res.data.name !== exp.name) throw new Error(`Name mismatch: expected ${exp.name}, got ${res.data.name}`);
      if (res.data.emis_number !== exp.emis) throw new Error(`EMIS mismatch: expected ${exp.emis}, got ${res.data.emis_number}`);
    });
  }

  console.log('\n================================================================');
  console.log(`🏁 MANKWENG AUDIT COMPLETE: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
  process.exit(0);
}

runMankwengSchoolsAudit().catch(err => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
