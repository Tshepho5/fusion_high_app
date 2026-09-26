const axios = require('axios');
const db = require('../db/db');

const BASE_URL = 'http://127.0.0.1:4000';
axios.defaults.timeout = 30000;

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

async function runComprehensivePipelineTests() {
  console.log('================================================================');
  console.log('COMPREHENSIVE ADMISSION, REGISTRATION & SCENARIOS VERIFICATION');
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

  // 1. Language Compatibility & Referrals Test
  await test('Check Language Offering (Supported Language): Makgoka High offers Sepedi', async () => {
    const res = await axios.get(`${BASE_URL}/api/schools/check-language?school_id=3&language=Sepedi`);
    if (!res.data.is_offered) throw new Error('Expected Sepedi to be offered at Makgoka High');
    if (!res.data.banking_details || !res.data.banking_details.account_number) {
      throw new Error('Expected banking details to be returned for Makgoka High');
    }
  });

  await test('Check Language Offering (Unsupported Language & Referrals): Saulridge does not offer Tshivenda', async () => {
    const res = await axios.get(`${BASE_URL}/api/schools/check-language?school_id=8&language=Tshivenda`);
    if (res.data.is_offered !== false) throw new Error('Expected Tshivenda to NOT be offered at Saulridge');
    if (!Array.isArray(res.data.referrals) || res.data.referrals.length === 0) {
      throw new Error('Expected referrals to other schools offering Tshivenda');
    }
    console.log(`     Referrals found: ${res.data.referrals.map(r => r.name).join(', ')}`);
  });

  // 2. Scenario 1: Neither Parent nor Learner in system
  const learnerIdScenario1PayNow = generateValidSAID('080915', true);
  const parentIdScenario1PayNow = generateValidSAID('800210', false);
  let appNumberPayNow = '';
  let appIdPayNow = null;

  await test('Scenario 1: Submit Application with Instant Fee Payment (Pay Now = true)', async () => {
    const res = await axios.post(`${BASE_URL}/api/applications/apply`, {
      first_name: 'Kgothatso',
      surname: 'Mathabatha',
      id_number: learnerIdScenario1PayNow,
      dob: '2008-09-15',
      gender: 'Male',
      citizenship: 'South Africa',
      phone: '0712345678',
      physical_address: 'Turfloop Unit C, Mankweng, 0727',
      grade_applied: '10',
      stream: 'Science',
      home_language: 'Sepedi',
      primary_parent_name: 'Mmapula',
      primary_parent_surname: 'Mathabatha',
      primary_parent_relationship: 'Mother',
      primary_parent_id_number: parentIdScenario1PayNow,
      primary_parent_phone: '0821234567',
      primary_parent_email: `mmapula.test.${Date.now()}@example.com`,
      primary_parent_address: 'Turfloop Unit C, Mankweng, 0727',
      school_id: 4, // Turfloop High
      pay_now: true,
      payment_method: 'card'
    });

    if (!res.data.applicationNumber) throw new Error('No application number returned');
    appNumberPayNow = res.data.applicationNumber;
    if (res.data.application_fee_status !== 'paid') {
      throw new Error(`Expected fee status to be paid, got ${res.data.application_fee_status}`);
    }

    // Verify DB
    const dbCheck = await db.query('SELECT id, application_fee_status FROM applications WHERE application_number = $1', [appNumberPayNow]);
    appIdPayNow = dbCheck.rows[0].id;
    if (dbCheck.rows[0].application_fee_status !== 'paid') throw new Error('Database status not marked paid');
    console.log(`     Created & Paid Application: ${appNumberPayNow} (ID: ${appIdPayNow})`);
  });

  const learnerIdScenario1EFT = generateValidSAID('090420', false);
  const parentIdScenario1EFT = generateValidSAID('820614', true);
  let appNumberEFT = '';
  let appIdEFT = null;

  await test('Scenario 1: Submit Application with 7-Day EFT Banking Flow (Pay Now = false)', async () => {
    const res = await axios.post(`${BASE_URL}/api/applications/apply`, {
      first_name: 'Boitumelo',
      surname: 'Chauke',
      id_number: learnerIdScenario1EFT,
      dob: '2009-04-20',
      gender: 'Female',
      citizenship: 'South Africa',
      phone: '0729876543',
      physical_address: 'Lotus Gardens Ext 2, Pretoria, 0008',
      grade_applied: '9',
      home_language: 'English',
      primary_parent_name: 'Sipho',
      primary_parent_surname: 'Chauke',
      primary_parent_relationship: 'Father',
      primary_parent_id_number: parentIdScenario1EFT,
      primary_parent_phone: '0834567890',
      primary_parent_email: `sipho.chauke.${Date.now()}@example.com`,
      primary_parent_address: 'Lotus Gardens Ext 2, Pretoria, 0008',
      school_id: 7, // Fusion Secondary Lotus
      pay_now: false,
      payment_method: 'eft'
    });

    if (!res.data.applicationNumber) throw new Error('No application number returned');
    appNumberEFT = res.data.applicationNumber;
    if (res.data.application_fee_status !== 'unpaid' && res.data.application_fee_status !== 'pending') {
      throw new Error(`Expected fee status to be unpaid or pending, got ${res.data.application_fee_status}`);
    }
    if (!res.data.banking_details || !res.data.banking_details.account_number) {
      throw new Error('Expected banking details in response');
    }

    const dbCheck = await db.query('SELECT id, application_fee_status, application_fee_due_date FROM applications WHERE application_number = $1', [appNumberEFT]);
    appIdEFT = dbCheck.rows[0].id;
    if (!dbCheck.rows[0].application_fee_due_date) throw new Error('No due date set');
    console.log(`     Created Pending EFT Application: ${appNumberEFT} (Due: ${dbCheck.rows[0].application_fee_due_date.toISOString().split('T')[0]})`);
  });

  // 3. Automated 3-Day Reminder Cron Test
  await test('Automated Reminder Cron: Dispatches 3-day deadline notification', async () => {
    // Artificially move due date to 2 days from now for testing
    await db.query(`UPDATE applications SET application_fee_due_date = NOW() + INTERVAL '2 days', application_fee_reminder_sent = FALSE WHERE id = $1`, [appIdEFT]);
    
    const cronRes = await axios.post(`${BASE_URL}/api/applications/cron/reminders`);
    if (!cronRes.data.success) throw new Error('Cron execution did not report success');
    
    // Check if reminder flag was set
    const chk = await db.query('SELECT application_fee_reminder_sent FROM applications WHERE id = $1', [appIdEFT]);
    if (!chk.rows[0].application_fee_reminder_sent) throw new Error('Reminder flag was not set to TRUE');
    console.log(`     Cron reminded application #${appIdEFT} successfully.`);
  });

  // 4. Admin Decision & Registration Fee Finalization
  await test('Registration Fee Payment & Learner Final Allocation', async () => {
    // Approve application first
    await db.query(`UPDATE applications SET status = 'approved', application_fee_status = 'paid' WHERE id = $1`, [appIdEFT]);

    const regRes = await axios.post(`${BASE_URL}/api/applications/${appIdEFT}/pay-registration-fee`, {
      payment_method: 'card',
      payment_reference: `DEMO-REG-PAY-${Date.now()}`
    });

    if (!regRes.data.success) throw new Error(regRes.data.error || 'Registration failed');
    if (!regRes.data.learner_number) throw new Error('No learner number returned');
    if (!Array.isArray(regRes.data.subjects) || regRes.data.subjects.length === 0) {
      throw new Error('No CAPS subjects allocated');
    }
    console.log(`     Finalized Enrollment: Learner #${regRes.data.learner_number} assigned to ${regRes.data.class_name} with ${regRes.data.subjects.length} CAPS subjects.`);
  });

  // 5. Scenario 3: Parent is NOT in system, Learner IS in system (Verify Child Lookup)
  await test('Scenario 3: Verify Child Lookup for Enrolled Learner', async () => {
    // Pick an existing learner from children table
    const childRec = await db.query('SELECT * FROM children WHERE learner_number IS NOT NULL LIMIT 1');
    if (childRec.rows.length === 0) {
      console.log('     (Skipping lookup test - no enrolled children in test DB)');
      return;
    }

    const testChild = childRec.rows[0];
    const verifyRes = await axios.post(`${BASE_URL}/api/auth/parent-applications/verify-child`, {
      school_id: testChild.school_id || 1,
      learner_number: testChild.learner_number,
      surname: testChild.surname
    });

    if (!verifyRes.data.found) throw new Error('Expected child to be found');
    if (verifyRes.data.child.full_name !== testChild.full_name) {
      throw new Error(`Name mismatch: expected ${testChild.full_name}, got ${verifyRes.data.child.full_name}`);
    }
    console.log(`     Verified Enrolled Learner: ${verifyRes.data.child.full_name} ${verifyRes.data.child.surname} (Grade ${verifyRes.data.child.grade})`);
  });

  await test('Scenario 3: Lookup Non-Existent Child Rejection (Strict Error Display)', async () => {
    try {
      await axios.post(`${BASE_URL}/api/auth/parent-applications/verify-child`, {
        school_id: 1,
        learner_number: '999999999',
        surname: 'NonExistent'
      });
      throw new Error('Should have failed with 404');
    } catch (e) {
      if (e.response?.status !== 404) throw e;
      if (!e.response.data.error.includes('No enrolled learner found')) {
        throw new Error(`Unexpected error message: ${e.response.data.error}`);
      }
      console.log(`     Correctly rejected non-existent learner with: "${e.response.data.error}"`);
    }
  });

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  await db.pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

runComprehensivePipelineTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
