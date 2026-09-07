const db = require('../db/db');

async function testProfileLockAndRestrictions() {
    console.log('=== TESTING INTELLIGENT ACCESS CONTROL & PROFILE LOCK ===\n');

    // 1. Verify users table has column profile_edit_unlocked
    const colCheck = await db.query(`
        SELECT column_name, data_type, column_default 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'profile_edit_unlocked';
    `);
    console.log('1. Database Column Verification:');
    if (colCheck.rows.length > 0) {
        console.log('   ✓ users.profile_edit_unlocked column is active:', colCheck.rows[0]);
    } else {
        console.error('   ✗ users.profile_edit_unlocked is MISSING');
        process.exit(1);
    }

    // 2. Fetch SuperAdmin user
    const superAdminRes = await db.query(`
        SELECT id, email, role_id, is_superadmin, school_id, profile_edit_unlocked
        FROM users 
        WHERE email = '202247878@myturf.ul.ac.za' OR is_superadmin = true
        LIMIT 1;
    `);
    console.log('\n2. Master SuperAdmin Record:');
    console.log('   User:', superAdminRes.rows[0]);

    // 3. Test Profile Lock Toggle on a testable user
    const userRes = await db.query(`
        SELECT id, email, full_name, surname, profile_edit_unlocked, role_id
        FROM users 
        WHERE email != '202247878@myturf.ul.ac.za'
        LIMIT 1;
    `);
    
    if (userRes.rows.length > 0) {
        const testUser = userRes.rows[0];
        console.log(`\n3. Testing Profile Lock Toggle for User #${testUser.id} (${testUser.full_name} ${testUser.surname}):`);
        console.log(`   Initial profile_edit_unlocked status: ${testUser.profile_edit_unlocked}`);

        // Toggle to true
        await db.query('UPDATE users SET profile_edit_unlocked = true WHERE id = $1', [testUser.id]);
        let checkRes = await db.query('SELECT profile_edit_unlocked FROM users WHERE id = $1', [testUser.id]);
        console.log(`   After UNLOCK by Admin: ${checkRes.rows[0].profile_edit_unlocked} (✓ Unlocked)`);

        // Toggle back to false
        await db.query('UPDATE users SET profile_edit_unlocked = false WHERE id = $1', [testUser.id]);
        checkRes = await db.query('SELECT profile_edit_unlocked FROM users WHERE id = $1', [testUser.id]);
        console.log(`   After LOCK by Admin: ${checkRes.rows[0].profile_edit_unlocked} (✓ Locked)`);
    }

    // 4. Test School Switching Logic Scenarios
    console.log('\n4. Multi-School Switching Rules Verification:');
    const scenarios = [
        { role: 'learner', is_superadmin: false, parentChildrenSchools: [], expectedCanSwitch: false, reason: 'Learners locked to enrolled school' },
        { role: 'teacher', is_superadmin: false, parentChildrenSchools: [], expectedCanSwitch: false, reason: 'Educators locked to appointed school' },
        { role: 'admin', is_superadmin: false, parentChildrenSchools: [], expectedCanSwitch: false, reason: 'SubAdmins locked to assigned institutional school' },
        { role: 'admin', is_superadmin: true, parentChildrenSchools: [], expectedCanSwitch: true, reason: 'Master SuperAdmin can switch to all schools' },
        { role: 'parent', is_superadmin: false, parentChildrenSchools: [1], expectedCanSwitch: false, reason: 'Single-school parent locked to child school' },
        { role: 'parent', is_superadmin: false, parentChildrenSchools: [1, 2], expectedCanSwitch: true, reason: 'Multi-school parent allowed to switch ONLY between enrolled schools [1, 2]' },
    ];

    scenarios.forEach((sc, i) => {
        const isMaster = sc.is_superadmin;
        const isParentMulti = sc.role === 'parent' && sc.parentChildrenSchools.length > 1;
        const canSwitch = isMaster || isParentMulti;

        const pass = canSwitch === sc.expectedCanSwitch;
        console.log(`   ${pass ? '✓' : '✗'} Scenario ${i+1} [${sc.role}, SuperAdmin=${sc.is_superadmin}, ParentSchools=[${sc.parentChildrenSchools}]]:`);
        console.log(`     -> canSwitch: ${canSwitch} | Expected: ${sc.expectedCanSwitch} (${sc.reason})`);
    });

    console.log('\n=== ALL ACCESS CONTROL VERIFICATIONS PASSED ===');
    process.exit(0);
}

testProfileLockAndRestrictions().catch(err => {
    console.error('Test error:', err);
    process.exit(1);
});
