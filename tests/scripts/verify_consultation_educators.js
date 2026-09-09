// tests/scripts/verify_consultation_educators.js
const consultationController = require('../../public/src/controller/consultationController');
const parentController = require('../../public/src/controller/parentController');

async function runTests() {
  console.log('================================================================');
  console.log('🧑‍🏫 VERIFYING CONSULTATION EDUCATORS ENDPOINT & GRADE FILTERING');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Test getConsultationEducators without grade filter
    console.log('[1] Testing getConsultationEducators (All Educators)...');
    let allStatus = 200;
    let allData = null;
    await consultationController.getConsultationEducators({ query: {} }, {
      status(c) { allStatus = c; return this; },
      json(d) { allData = d; return this; }
    });

    assert(allStatus === 200, 'Endpoint returns HTTP 200');
    assert(allData && allData.success === true, 'Response contains success: true');
    assert(allData && Array.isArray(allData.educators) && allData.educators.length > 0, `Returns list of educators (count: ${allData?.educators?.length})`);

    const sample = allData.educators[0];
    assert(sample && sample.full_name && sample.surname, `Educators have full_name and surname: ${sample?.full_name} ${sample?.surname}`);
    assert(Array.isArray(sample?.subjects), `Educator has subjects array: [${sample?.subjects?.join(', ')}]`);
    assert(Array.isArray(sample?.grades_taught), `Educator has grades_taught array: [${sample?.grades_taught?.join(', ')}]`);

    // 2. Test Grade 8 filtering
    console.log('\n[2] Testing Grade 8 Filtering...');
    let gr8Status = 200;
    let gr8Data = null;
    await consultationController.getConsultationEducators({ query: { grade: '8' } }, {
      status(c) { gr8Status = c; return this; },
      json(d) { gr8Data = d; return this; }
    });
    assert(gr8Data && gr8Data.educators.length > 0, `Returns Grade 8 educators (count: ${gr8Data?.educators?.length})`);
    const allTeachGr8 = gr8Data.educators.every(e => e.grades_taught.length === 0 || e.grades_taught.includes(8));
    assert(allTeachGr8, 'All filtered educators teach Grade 8');

    // 3. Test Grade 10 filtering
    console.log('\n[3] Testing Grade 10 Filtering...');
    let gr10Data = null;
    await consultationController.getConsultationEducators({ query: { grade: '10' } }, {
      status(c) { return this; },
      json(d) { gr10Data = d; return this; }
    });
    assert(gr10Data && gr10Data.educators.length > 0, `Returns Grade 10 educators (count: ${gr10Data?.educators?.length})`);
    const allTeachGr10 = gr10Data.educators.every(e => e.grades_taught.length === 0 || e.grades_taught.includes(10));
    assert(allTeachGr10, 'All filtered educators teach Grade 10');

    // 4. Test Grade 12 filtering
    console.log('\n[4] Testing Grade 12 Filtering...');
    let gr12Data = null;
    await consultationController.getConsultationEducators({ query: { grade: '12' } }, {
      status(c) { return this; },
      json(d) { gr12Data = d; return this; }
    });
    assert(gr12Data && gr12Data.educators.length > 0, `Returns Grade 12 educators (count: ${gr12Data?.educators?.length})`);
    const allTeachGr12 = gr12Data.educators.every(e => e.grades_taught.length === 0 || e.grades_taught.includes(12));
    assert(allTeachGr12, 'All filtered educators teach Grade 12');

    // 5. Test parentController.getEducators delegation
    console.log('\n[5] Testing parentController.getEducators alias...');
    let parentEduData = null;
    await parentController.getEducators({ query: { grade: '11' } }, {
      status(c) { return this; },
      json(d) { parentEduData = d; return this; }
    });
    assert(parentEduData && parentEduData.success === true, 'parentController.getEducators returns success');
    assert(parentEduData && parentEduData.educators.length > 0, `Returns educators for parents (count: ${parentEduData?.educators?.length})`);

    console.log('\n================================================================');
    console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('================================================================');

    if (failed > 0) process.exit(1);
    process.exit(0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
