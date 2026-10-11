const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../db/db');
const adminController = require('../public/src/controller/adminController');
const parentController = require('../public/src/controller/parentController');

async function runTests() {
    console.log('=== RUNNING TESTS FOR LEARNER DELETE & PARENT ATTENDANCE ===');

    // 1. Test deleteUser parameter safeguard with null / invalid string
    console.log('\n--- 1. Testing deleteUser parameter safeguard ---');
    const mockReqNull = { params: { id: 'null' } };
    let nullStatusCode = 200;
    let nullResponseJson = null;
    const mockResNull = {
        status: (code) => {
            nullStatusCode = code;
            return {
                json: (data) => { nullResponseJson = data; }
            };
        },
        json: (data) => { nullResponseJson = data; }
    };
    await adminController.deleteUser(mockReqNull, mockResNull);
    assert.strictEqual(nullStatusCode, 400, 'Should return 400 when user ID is "null"');
    assert.ok(nullResponseJson.error.includes('valid numeric'), 'Error should state valid numeric ID required');
    console.log('✓ Safeguard passed: deleteUser with id="null" returns 400 cleanly without DB crash.');

    // 2. Test deleteLearner parameter safeguard with null / invalid string
    console.log('\n--- 2. Testing deleteLearner parameter safeguard ---');
    const mockReqLearnerNull = { params: { id: 'null' } };
    let learnerNullStatus = 200;
    let learnerNullJson = null;
    const mockResLearnerNull = {
        status: (code) => {
            learnerNullStatus = code;
            return {
                json: (data) => { learnerNullJson = data; }
            };
        },
        json: (data) => { learnerNullJson = data; }
    };
    await adminController.deleteLearner(mockReqLearnerNull, mockResLearnerNull);
    assert.strictEqual(learnerNullStatus, 400, 'Should return 400 when learner ID is "null"');
    console.log('✓ Safeguard passed: deleteLearner with id="null" returns 400 cleanly.');

    // 3. Test creating a test child and deleting them with deleteLearner
    console.log('\n--- 3. Testing deleteLearner creates and deletes successfully ---');
    const testLearnerNumber = 'TD-' + (Date.now() % 10000000);
    const insertRes = await db.query(`
        INSERT INTO children (full_name, surname, learner_number, grade, stream, school_id)
        VALUES ('TestDelete', 'Learner', $1, 10, 'Science', 1)
        RETURNING id, full_name, surname, learner_number
    `, [testLearnerNumber]);
    const testChildId = insertRes.rows[0].id;
    console.log(`Created test child with id ${testChildId} (${testLearnerNumber})`);

    const mockReqDel = { params: { id: String(testChildId) } };
    let delStatus = 200;
    let delJson = null;
    const mockResDel = {
        status: (code) => {
            delStatus = code;
            return { json: (data) => { delJson = data; } };
        },
        json: (data) => { delJson = data; }
    };
    await adminController.deleteLearner(mockReqDel, mockResDel);
    assert.strictEqual(delStatus, 200, 'Should return 200 for successful learner deletion');
    assert.strictEqual(delJson.success, true, 'Result should have success=true');

    // Verify child is gone from children table
    const checkRes = await db.query('SELECT id FROM children WHERE id = $1', [testChildId]);
    assert.strictEqual(checkRes.rows.length, 0, 'Child should be deleted from children table');
    console.log('✓ deleteLearner passed: child removed cleanly from database.');

    // 4. Test Parent Attendance 0% when child has no attendance records
    console.log('\n--- 4. Testing Parent Attendance 0% when no attendance records exist ---');
    // Create a temporary child with NO attendance
    const zeroAttNumber = 'ZA-' + (Date.now() % 10000000);
    let parentRes = await db.query(`SELECT u.id FROM users u JOIN roles r ON u.role_id = r.id WHERE LOWER(r.name) = 'parent' LIMIT 1`);
    let parentId;
    if (parentRes.rows.length > 0) {
        parentId = parentRes.rows[0].id;
    } else {
        const roleRes = await db.query(`SELECT id FROM roles WHERE LOWER(name) = 'parent' LIMIT 1`);
        const pRoleId = roleRes.rows[0]?.id || 4;
        const pCreate = await db.query(`INSERT INTO users (full_name, surname, email, password_hash, role_id) VALUES ('Test', 'Parent', 'testparent_${Date.now()}@test.co.za', 'hash', $1) RETURNING id`, [pRoleId]);
        parentId = pCreate.rows[0].id;
    }

    const zeroChildRes = await db.query(`
        INSERT INTO children (full_name, surname, learner_number, grade, stream, school_id, parent_id)
        VALUES ('ZeroAttendance', 'Learner', $1, 10, 'Commerce', 1, $2)
        RETURNING id
    `, [zeroAttNumber, parentId]);
    const zeroChildId = zeroChildRes.rows[0].id;

    await db.query(`INSERT INTO parent_children (parent_id, child_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [parentId, zeroChildId]).catch(() => {});

    const mockReqAtt = {
        user: { id: parentId },
        query: { childId: String(zeroChildId) }
    };
    let attJson = null;
    const mockResAtt = {
        status: () => mockResAtt,
        json: (data) => { attJson = data; }
    };
    await parentController.getChildAttendanceOverview(mockReqAtt, mockResAtt);

    assert.ok(attJson, 'Should return attendance json');
    assert.strictEqual(attJson.attendance_rate, 0, 'Attendance rate MUST be 0 when no records exist');
    assert.strictEqual(attJson.stats.attendance_rate, 0, 'Stats attendance rate MUST be 0 when no records exist');
    assert.strictEqual(attJson.days_present, 0, 'Days present should be 0');
    assert.strictEqual(attJson.days_absent, 0, 'Days absent should be 0');
    assert.strictEqual(attJson.late_days, 0, 'Late days should be 0');
    console.log(`✓ Parent Attendance 0% test passed: attendance_rate is ${attJson.attendance_rate}%, not 100%!`);

    // Clean up temporary child
    await db.query('DELETE FROM parent_children WHERE child_id = $1', [zeroChildId]).catch(() => {});
    await db.query('DELETE FROM children WHERE id = $1', [zeroChildId]);

    console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===');
    process.exit(0);
}

runTests().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
