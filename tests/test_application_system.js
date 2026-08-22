const { validateSAID } = require('../public/src/controller/saIDvalidations');
const applicationService = require('../public/src/services/applicationService');
const db = require('../db/db');
const initApplicationTables = require('../db/init_applications');

async function runTests() {
  console.log('====================================================');
  console.log('RUNNING COMPREHENSIVE APPLICATION SYSTEM TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`PASS: ${testName}`);
      passed++;
    } else {
      console.error(`FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Initialize DB Schema
    console.log('[1/6] Testing Database Initialization...');
    await initApplicationTables();
    assert(true, 'Database application tables initialized without error');

    // 2. Test South African ID Validation and Autofill Algorithm
    console.log('\n[2/6] Testing South African ID Validation & Extraction...');
    
    // Sample Valid SA ID (DOB: 2008-05-15, Female, SA Citizen)
    const validFemaleId = '0805150001087';
    // Let's test with a generated valid checksum
    const testIdCheck = validateSAID('0805155000084');
    console.log('   SA ID Check Result for 0805155000084:', testIdCheck);
    
    // Test invalid length
    const shortId = validateSAID('12345');
    assert(!shortId.isValid, 'Short ID correctly flagged as invalid');

    // Test invalid checksum
    const badCheckId = validateSAID('0805155000089');
    assert(!badCheckId.isValid, 'Invalid checksum correctly rejected');

    // 3. Test Capacity Enforcement
    console.log('\n[3/6] Testing School & Class Capacity Rules (<500 school, <30 class)...');
    const cap = await applicationService.getCapacityStatus();
    console.log(`   Current Total Learners: ${cap.totalCurrentLearners} / ${cap.schoolMaxCapacity}`);
    console.log(`   School Space Remaining: ${cap.schoolRemainingSpace}`);
    
    assert(cap.schoolMaxCapacity === 500, 'School Max Capacity is strictly 500');
    assert(cap.classMaxCapacity === 30, 'Class Max Capacity is strictly 30');
    assert(cap.totalCurrentLearners < 500, 'Current total learners is under 500 capacity limit');

    // Check Class Allocation for Grade 8
    const allocatedGr8 = await applicationService.allocateAvailableClass(8, 'General');
    console.log('   Allocated Grade 8 Class:', allocatedGr8 ? allocatedGr8.name : 'None');
    assert(allocatedGr8 !== null, 'Allocated available class for Grade 8 with < 30 learners');

    // 4. Test Application Numbers & Tokens Generation
    console.log('\n[4/6] Testing Reference and Token Generators...');
    const appNum = applicationService.generateApplicationNumber();
    const token = applicationService.generateCorrectionToken();
    const provLrn = applicationService.generateProvisionalLearnerNumber(8);

    assert(appNum.startsWith('FHS-'), `Application reference formatted properly: ${appNum}`);
    assert(token.length >= 32, `Correction token generated securely: ${token.substring(0, 10)}...`);
    assert(provLrn.length >= 8, `Provisional learner number generated: ${provLrn}`);

    // 5. Test AI Document Verification Simulator
    console.log('\n[5/6] Testing AI Document & Form Consistency Verification...');
    
    // 5a. Mismatched details / missing documents
    const badApp = {
      first_name: 'Thabo',
      surname: 'Molefe',
      id_number: '9999999999999', // invalid ID
      dob: '2008-01-01',
      gender: 'Male',
      citizenship: 'South Africa',
      grade_applied: 10,
      primary_parent_name: 'Lerato',
      primary_parent_surname: 'Molefe',
      primary_parent_id_number: '8001015000080',
      primary_parent_email: 'lerato@example.com',
      primary_parent_phone: '0821234567'
    };

    const badVerify = await applicationService.verifyApplicationWithAI(badApp, []);
    assert(!badVerify.isValid, 'Application with missing documents and bad ID correctly flagged');
    assert(badVerify.issues.length > 0, `Issues detected: ${badVerify.issues.length}`);
    console.log('   Flagged issues sample:', badVerify.issues.map(i => i.message));

    // 5b. Valid complete details
    // Find a valid SA ID for testing: 080515500008 + check digit
    function generateValidSAID(dobYYMMDD, isMale = true) {
      const base = dobYYMMDD + (isMale ? '5000' : '0000') + '08';
      for (let z = 0; z <= 9; z++) {
        const candidate = base + z;
        if (validateSAID(candidate).isValid) return candidate;
      }
      return base + '0';
    }

    const testLearnerId = generateValidSAID('080515', true);
    const testParentId = generateValidSAID('800101', false);
    console.log(`   Generated Valid SA ID for Learner: ${testLearnerId}, Parent: ${testParentId}`);

    const validApp = {
      first_name: 'Sipho',
      surname: 'Khumalo',
      id_number: testLearnerId,
      dob: '2008-05-15',
      gender: 'Male',
      citizenship: 'South Africa',
      grade_applied: 8,
      primary_parent_name: 'Nomsa',
      primary_parent_surname: 'Khumalo',
      primary_parent_id_number: testParentId,
      primary_parent_email: 'nomsa@example.com',
      primary_parent_phone: '0829876543'
    };

    const mockDocs = [
      { document_type: 'learner_id', file_path: 'uploads/test_id.pdf', file_name: 'id.pdf', mime_type: 'application/pdf', size: 1024 },
      { document_type: 'parent_id', file_path: 'uploads/test_parent.pdf', file_name: 'parent.pdf', mime_type: 'application/pdf', size: 1024 },
      { document_type: 'proof_of_residence', file_path: 'uploads/test_res.pdf', file_name: 'res.pdf', mime_type: 'application/pdf', size: 1024 }
    ];

    const goodVerify = await applicationService.verifyApplicationWithAI(validApp, mockDocs);
    console.log('   Valid application verify result: score =', goodVerify.overallScore, 'isValid =', goodVerify.isValid);
    assert(goodVerify.isValid || goodVerify.overallScore >= 70, 'Valid application passed AI verification scoring threshold');

    // 6. Test Multi-Parent DB Table Insertion
    console.log('\n[6/6] Testing Dual-Parent Linking Schema...');
    const parentChildrenTable = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'parent_children'
    `);
    assert(parentChildrenTable.rows.length > 0, 'parent_children junction table exists in database');

    const appTable = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'applications'
    `);
    assert(appTable.rows.length >= 30, `applications table created with ${appTable.rows.length} columns`);

  } catch (err) {
    console.error('💥 Test Execution Error:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`📊 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
