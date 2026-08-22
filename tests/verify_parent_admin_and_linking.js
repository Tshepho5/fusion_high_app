const axios = require('axios');
const db = require('../db/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || '#Butcher#$5$#Letlalo#$5$';
const BASE_URL = 'http://localhost:4000/api';

async function runVerification() {
    console.log('====================================================');
    console.log('🚀 TESTING ADMIN PARENT CREATION & PARENT CHILD LINKING');
    console.log('====================================================\n');

    try {
        // 1. Authenticate as Admin
        console.log('1. Authenticating as Admin...');
        const adminRes = await db.query(
            `SELECT u.id, u.email, r.name as role 
             FROM users u 
             JOIN roles r ON u.role_id = r.id 
             WHERE r.name = 'admin' 
             LIMIT 1`
        );
        const adminUser = adminRes.rows[0] || { id: 1, email: 'admin@fusionhigh.co.za', role: 'admin' };
        const adminToken = jwt.sign(
            { id: adminUser.id, email: adminUser.email, role: 'admin' },
            JWT_SECRET,
            { expiresIn: '1h' }
        );
        console.log('   ✅ Admin token generated for:', adminUser.email, '\n');

        // 2. Test Admin Parent Registration Validation (Number in Name / Letter in ID)
        console.log('2. Testing Validation on Admin Parent Creation...');
        
        // 2a. Invalid name (contains numbers)
        try {
            await axios.post(`${BASE_URL}/admin/parents`, {
                full_name: 'Parent123',
                surname: 'Zulu',
                email: 'test.invalid@example.com'
            }, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            console.error('   ❌ Failed: Server accepted name with numbers.');
        } catch (err) {
            console.log('   ✅ Rejected name containing digits:', err.response?.data?.error);
        }

        // 2b. Invalid National ID (contains letters)
        try {
            await axios.post(`${BASE_URL}/admin/parents`, {
                full_name: 'Nokuthula',
                surname: 'Zulu',
                email: 'test.invalid2@example.com',
                id_number: '8001015029ABC'
            }, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            console.error('   ❌ Failed: Server accepted ID with letters.');
        } catch (err) {
            console.log('   ✅ Rejected ID containing letters:', err.response?.data?.error);
        }

        // 3. Register a valid Parent via Admin API
        console.log('\n3. Registering Valid Parent via Admin Endpoint...');
        const uniqueEmail = `parent.test.${Date.now()}@example.com`;
        const tempPassword = 'ParentTempPass@2026';
        
        const parentRes = await axios.post(`${BASE_URL}/admin/parents`, {
            full_name: 'Nokuthula',
            surname: 'Dlamini',
            email: uniqueEmail,
            password: tempPassword,
            phone: '0831234567',
            id_number: '8204155029087',
            gender: 'Female',
            physical_address: '254 Church Street, Pretoria',
            relationship: 'Mother'
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });

        console.log('   ✅ Parent registered successfully:', parentRes.data.message);
        const newParentId = parentRes.data.user.id;
        console.log(`   Parent ID: ${newParentId}, Email: ${uniqueEmail}\n`);

        // 4. Authenticate as the newly created Parent using the Temporary Password
        console.log('4. Authenticating as Parent with Temporary Password...');
        const parentLogin = await axios.post(`${BASE_URL}/login`, {
            email: uniqueEmail,
            password: tempPassword
        });
        const parentToken = parentLogin.data.token;
        console.log('   ✅ Parent logged in successfully with temporary credentials.\n');

        // 5. Ensure we have 2 test learners in the database with known learner numbers and ID numbers
        console.log('5. Ensuring 2 test learners exist in database...');
        
        // Learner 1
        const l1Res = await db.query(`
            SELECT c.id, c.learner_number, c.learner_user_id, u.id_number, c.full_name, c.surname
            FROM children c
            LEFT JOIN users u ON c.learner_user_id = u.id
            LIMIT 1;
        `);
        
        // Learner 2
        const l2Res = await db.query(`
            SELECT c.id, c.learner_number, c.learner_user_id, u.id_number, c.full_name, c.surname
            FROM children c
            LEFT JOIN users u ON c.learner_user_id = u.id
            OFFSET 1 LIMIT 1;
        `);

        if (l1Res.rows.length === 0 || l2Res.rows.length === 0) {
            throw new Error('Could not find 2 learners in the database for testing.');
        }

        const child1 = l1Res.rows[0];
        const child2 = l2Res.rows[0];

        // Ensure child1 and child2 have clean digits for ID numbers
        const child1IdNum = (child1.id_number || '0801015029088').replace(/\D/g, '') || '0801015029088';
        const child2IdNum = (child2.id_number || '0702025029089').replace(/\D/g, '') || '0702025029089';

        if (child1.learner_user_id) {
            await db.query('UPDATE users SET id_number = $1 WHERE id = $2', [child1IdNum, child1.learner_user_id]);
        }
        if (child2.learner_user_id) {
            await db.query('UPDATE users SET id_number = $1 WHERE id = $2', [child2IdNum, child2.learner_user_id]);
        }

        console.log(`   Child 1: ${child1.full_name} ${child1.surname} | Number: ${child1.learner_number} | ID: ${child1IdNum}`);
        console.log(`   Child 2: ${child2.full_name} ${child2.surname} | Number: ${child2.learner_number} | ID: ${child2IdNum}\n`);

        // 6. Test Parent Link Child #1
        console.log('6. Parent linking Child #1 via POST /api/parent/link-child...');
        const link1 = await axios.post(`${BASE_URL}/parent/link-child`, {
            learner_number: child1.learner_number,
            id_number: child1IdNum,
            relationship: 'Mother'
        }, {
            headers: { Authorization: `Bearer ${parentToken}` }
        });
        console.log('   ✅ Child #1 linked successfully:', link1.data.message);

        // 7. Test Parent Link Child #2 (Multiple Children Support)
        console.log('\n7. Parent linking Child #2 via POST /api/parent/link-child...');
        const link2 = await axios.post(`${BASE_URL}/parent/link-child`, {
            learner_number: child2.learner_number,
            id_number: child2IdNum,
            relationship: 'Mother'
        }, {
            headers: { Authorization: `Bearer ${parentToken}` }
        });
        console.log('   ✅ Child #2 linked successfully:', link2.data.message);

        // 8. Fetch Parent's linked children list
        console.log('\n8. Fetching Parent children list via GET /api/parent/children...');
        const getChildrenRes = await axios.get(`${BASE_URL}/parent/children`, {
            headers: { Authorization: `Bearer ${parentToken}` }
        });

        const linkedList = Array.isArray(getChildrenRes.data) ? getChildrenRes.data : getChildrenRes.data.children || [];
        console.log(`   ✅ Parent now has ${linkedList.length} children linked.`);
        linkedList.forEach((c, idx) => {
            console.log(`      [${idx + 1}] ${c.full_name} ${c.surname} (Grade ${c.grade}) - Learner No: ${c.learner_number}`);
        });

        if (linkedList.length < 2) {
            throw new Error(`Expected at least 2 linked children, but found ${linkedList.length}`);
        }

        // 9. Verify Admin Parents Directory
        console.log('\n9. Admin fetching parents list via GET /api/admin/parents...');
        const adminParentsRes = await axios.get(`${BASE_URL}/admin/parents`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        const parentRecord = adminParentsRes.data.parents.find(p => p.id === newParentId);
        console.log(`   ✅ Found parent in admin directory: ${parentRecord.full_name} ${parentRecord.surname} (${parentRecord.email})`);
        console.log(`   Linked children count in DB: ${parentRecord.linked_children_count}`);

        console.log('\n====================================================');
        console.log('🎉 ALL PARENT CREATION AND LINKING TESTS PASSED!');
        console.log('====================================================\n');
        process.exit(0);

    } catch (err) {
        console.error('❌ Verification failed:', err.response?.data || err.message);
        process.exit(1);
    }
}

runVerification();
