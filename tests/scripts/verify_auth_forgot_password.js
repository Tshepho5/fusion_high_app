// tests/scripts/verify_auth_forgot_password.js
const db = require('../../db/db');
const authController = require('../../public/src/controller/authController');
const applicationController = require('../../public/src/controller/applicationController');

async function runTests() {
  console.log('================================================================');
  console.log('🔒 VERIFYING AUTHENTICATION & PASSWORD RESET OTP LOGIC');
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
    // 1. Test non-existent email accounts (Must NOT receive OTP, Must return 404 with error message)
    console.log('[1] Testing Non-Existent Accounts for Password Reset...');
    const nonExistentInputs = [
      'nobody123456789@gmail.com',
      'fake_unregistered_parent@yahoo.com',
      'notanaccount@fusionhigh.co.za',
      'random_learner_999999999',
      '9999999999999'
    ];

    for (const input of nonExistentInputs) {
      let statusCode = 200;
      let jsonResult = null;
      const req = { body: { email: input } };
      const res = {
        status(code) { statusCode = code; return this; },
        json(data) { jsonResult = data; return this; }
      };

      await authController.forgotPassword(req, res);

      assert(statusCode === 404, `Input "${input}" returns HTTP 404`);
      assert(jsonResult && jsonResult.error && jsonResult.error.toLowerCase().includes('does not exist'), 
             `Input "${input}" error states account does not exist (received: "${jsonResult?.error}")`);
    }

    // 2. Verify no OTP or reset_code was generated in DB for non-existent account
    console.log('\n[2] Verifying no reset codes were orphaned or set...');
    const badCodeCheck = await db.query(
      `SELECT id, email FROM users WHERE LOWER(email) IN ($1, $2) AND reset_code IS NOT NULL`,
      ['nobody123456789@gmail.com', 'fake_unregistered_parent@yahoo.com']
    );
    assert(badCodeCheck.rows.length === 0, 'No reset codes generated for non-existent users');

    // 3. Test existing account
    console.log('\n[3] Testing Existing Account for Password Reset...');
    // Find a real user in the DB
    const realUserRes = await db.query(`SELECT id, email FROM users WHERE email LIKE '%@%' LIMIT 1`);
    if (realUserRes.rows.length > 0) {
      const realUser = realUserRes.rows[0];
      let realStatusCode = 0;
      let realResult = null;
      const realReq = {
        body: { email: realUser.email },
        get: (h) => (h === 'origin' ? 'https://fusion-high-app.web.app' : 'localhost:4000')
      };
      const realRes = {
        status(code) { realStatusCode = code; return this; },
        json(data) { realResult = data; return this; }
      };

      await authController.forgotPassword(realReq, realRes);
      assert(realStatusCode === 200, `Existing user "${realUser.email}" returns HTTP 200 (actual: ${realStatusCode})`);
      assert(realResult && realResult.message && realResult.delivery_email, `Returns masked delivery email: ${realResult?.delivery_email}`);

      // Check DB has reset_code
      const updatedUser = await db.query(`SELECT reset_code, reset_expiry FROM users WHERE id = $1`, [realUser.id]);
      assert(updatedUser.rows[0].reset_code !== null, `reset_code is properly set in DB (${updatedUser.rows[0].reset_code})`);

      // 4. Test verifyOTP with wrong code
      console.log('\n[4] Testing OTP Verification...');
      let verifyBadStatus = 0;
      let verifyBadResult = null;
      await authController.verifyOTP({
        body: { email: realUser.email, code: '0000' }
      }, {
        status(c) { verifyBadStatus = c; return this; },
        json(d) { verifyBadResult = d; return this; }
      });
      assert(verifyBadStatus === 400, 'Invalid OTP code correctly rejected with HTTP 400');

      // Test verifyOTP with correct code
      let verifyGoodStatus = 200;
      let verifyGoodResult = null;
      await authController.verifyOTP({
        body: { email: realUser.email, code: updatedUser.rows[0].reset_code }
      }, {
        status(c) { verifyGoodStatus = c; return this; },
        json(d) { verifyGoodResult = d; return this; }
      });
      assert(verifyGoodStatus === 200, 'Valid OTP code correctly accepted with HTTP 200');
    }

    // 5. Test children table is_active column (Fix for Enrollment issue in user screenshot)
    console.log('\n[5] Verifying children table is_active column for application enrollment...');
    const colCheck = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'children' AND column_name = 'is_active'
    `);
    assert(colCheck.rows.length > 0, 'children table now has is_active column');

    console.log('\n================================================================');
    console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('================================================================');

    if (failed > 0) process.exit(1);
    process.exit(0);
  } catch (err) {
    console.error('💥 Test execution error:', err);
    process.exit(1);
  }
}

runTests();
