const db = require('../db/db');
const adminController = require('../public/src/controller/adminController');

async function runRecycleBinTests() {
  console.log('--- STARTING RECYCLE BIN AUTOMATED TEST SUITE ---');

  // Helper mock response
  const createMockRes = () => {
    return {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      }
    };
  };

  const testEmail = `test_recycle_user_${Date.now()}@geleza.co.za`;
  let testUserId = null;
  let testChildId = null;

  try {
    // 1. Create a dummy test user (Teacher)
    console.log('\n1. Creating test teacher user...');
    const userInsert = await db.query(`
      INSERT INTO users (email, password_hash, full_name, surname, role_id, phone)
      VALUES ($1, 'dummyhash123', 'RecycleTest', 'Teacher', 2, '0712345678')
      RETURNING id, email, full_name;
    `, [testEmail]);
    testUserId = userInsert.rows[0].id;
    console.log(`✓ Test user created with ID: ${testUserId}`);

    // Create corresponding employee entry
    await db.query(`
      INSERT INTO employees (user_id, full_name, surname, email, phone, subjects, grades_taught, classes_taught)
      VALUES ($1, 'RecycleTest', 'Teacher', $2, '0712345678', ARRAY['Mathematics'], ARRAY[10], ARRAY['10A'])
      ON CONFLICT DO NOTHING;
    `, [testUserId, testEmail]);

    // 2. Delete the user through deleteUser controller
    console.log('\n2. Testing deleteUser moving to Recycle Bin...');
    const delUserReq = {
      params: { id: String(testUserId) },
      user: { id: 1, full_name: 'Admin', surname: 'User', email: 'admin@geleza.co.za', school_id: null }
    };
    const delUserRes = createMockRes();

    await adminController.deleteUser(delUserReq, delUserRes);
    console.log(`DeleteUser response status: ${delUserRes.statusCode}, body:`, delUserRes.body);

    if (delUserRes.statusCode !== 200) {
      throw new Error(`deleteUser failed with status ${delUserRes.statusCode}`);
    }

    // Verify user is gone from users table
    const checkUserGone = await db.query('SELECT * FROM users WHERE id = $1', [testUserId]);
    if (checkUserGone.rows.length !== 0) {
      throw new Error('User was not deleted from users table!');
    }
    console.log('✓ User confirmed removed from active users table.');

    // 3. Verify user snapshot is in recycle_bin table
    console.log('\n3. Verifying snapshot in recycle_bin table...');
    const binCheck = await db.query('SELECT * FROM recycle_bin WHERE original_id = $1', [testUserId]);
    if (binCheck.rows.length === 0) {
      throw new Error('User was not snapshotted into recycle_bin!');
    }
    const binItem = binCheck.rows[0];
    console.log(`✓ Record found in recycle_bin: id=${binItem.id}, name=${binItem.name}, role=${binItem.role_name}`);

    // 4. Test getRecycleBin controller
    console.log('\n4. Testing getRecycleBin controller...');
    const getBinReq = { user: { id: 1, role: 'superadmin', school_id: null } };
    const getBinRes = createMockRes();
    await adminController.getRecycleBin(getBinReq, getBinRes);

    if (getBinRes.statusCode !== 200 || !getBinRes.body.items.some(i => i.id === binItem.id)) {
      throw new Error('getRecycleBin did not return the expected deleted item!');
    }
    console.log(`✓ getRecycleBin returned ${getBinRes.body.totalCount} items, including our test user.`);

    // 5. Test restoreFromRecycleBin controller ("Bring Back")
    console.log('\n5. Testing restoreFromRecycleBin controller to bring user back...');
    const restoreReq = {
      params: { id: String(binItem.id) },
      user: { id: 1, school_id: null }
    };
    const restoreRes = createMockRes();
    await adminController.restoreFromRecycleBin(restoreReq, restoreRes);
    console.log(`Restore response status: ${restoreRes.statusCode}, message:`, restoreRes.body?.message);

    if (restoreRes.statusCode !== 200) {
      throw new Error(`restoreFromRecycleBin failed with status ${restoreRes.statusCode}`);
    }

    // Verify user is restored in users table
    const userRestored = await db.query('SELECT * FROM users WHERE email = $1', [testEmail]);
    if (userRestored.rows.length === 0) {
      throw new Error('User was not restored in users table!');
    }
    console.log(`✓ User restored successfully! ID: ${userRestored.rows[0].id}`);

    // Verify item was removed from recycle_bin
    const binAfterRestore = await db.query('SELECT * FROM recycle_bin WHERE id = $1', [binItem.id]);
    if (binAfterRestore.rows.length !== 0) {
      throw new Error('Item was not removed from recycle_bin after restoration!');
    }
    console.log('✓ Recycle bin entry cleared after restoration.');

    // 6. Test Learner Deletion & Restoration
    console.log('\n6. Testing Learner snapshot, delete, and restore...');
    const learnerNum = `LRN_${Date.now()}`;
    const childInsert = await db.query(`
      INSERT INTO children (full_name, surname, learner_number, grade, stream)
      VALUES ('Recycle', 'Learner', $1, 10, 'Science')
      RETURNING id, full_name, surname, learner_number;
    `, [learnerNum]);
    testChildId = childInsert.rows[0].id;
    console.log(`✓ Test child created with ID: ${testChildId}`);

    // Delete learner
    const delLearnerReq = {
      params: { id: String(testChildId) },
      user: { id: 1, full_name: 'Admin', surname: 'User' }
    };
    const delLearnerRes = createMockRes();
    await adminController.deleteLearner(delLearnerReq, delLearnerRes);

    if (delLearnerRes.statusCode !== 200) {
      throw new Error(`deleteLearner failed with status ${delLearnerRes.statusCode}`);
    }
    console.log('✓ Learner deleted and snapshotted.');

    // Find learner bin item
    const learnerBinRes = await db.query('SELECT * FROM recycle_bin WHERE original_id = $1 AND record_type = $2', [testChildId, 'learner']);
    if (learnerBinRes.rows.length === 0) {
      throw new Error('Learner not found in recycle_bin!');
    }
    const learnerBinItem = learnerBinRes.rows[0];

    // Restore learner
    const restoreLearnerReq = {
      params: { id: String(learnerBinItem.id) },
      user: { id: 1 }
    };
    const restoreLearnerRes = createMockRes();
    await adminController.restoreFromRecycleBin(restoreLearnerReq, restoreLearnerRes);

    if (restoreLearnerRes.statusCode !== 200) {
      throw new Error(`Learner restoration failed: ${restoreLearnerRes.body?.error}`);
    }

    const checkChildRestored = await db.query('SELECT * FROM children WHERE learner_number = $1', [learnerNum]);
    if (checkChildRestored.rows.length === 0) {
      throw new Error('Learner was not restored in children table!');
    }
    console.log(`✓ Learner "${checkChildRestored.rows[0].full_name}" restored successfully!`);

    console.log('\nALL RECYCLE BIN TESTS PASSED WITH 100% SUCCESS!');
  } catch (err) {
    console.error('\nTEST ENCOUNTERED ERROR:', err);
    throw err;
  } finally {
    // Cleanup
    if (testUserId) {
      await db.query('DELETE FROM employees WHERE email = $1', [testEmail]).catch(() => {});
      await db.query('DELETE FROM users WHERE email = $1', [testEmail]).catch(() => {});
    }
    if (testChildId) {
      await db.query('DELETE FROM children WHERE id = $1', [testChildId]).catch(() => {});
    }
    await db.query('DELETE FROM recycle_bin WHERE name LIKE $1', ['%Recycle%']).catch(() => {});
  }
}

runRecycleBinTests()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\nTEST FAILED:', err.message);
    process.exit(1);
  });
