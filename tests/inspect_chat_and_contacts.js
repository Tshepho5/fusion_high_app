const db = require('../db/db');

async function inspect() {
    try {
        console.log('--- Inspecting DB for Chat & Roles ---');
        const roles = await db.query('SELECT * FROM roles');
        console.log('Roles:', roles.rows);

        const testUsers = await db.query(`
            SELECT u.id, u.email, u.full_name, u.surname, r.name as role_name 
            FROM users u 
            JOIN roles r ON u.role_id = r.id 
            LIMIT 8
        `);
        console.log('Users sample:', testUsers.rows);

        const msgCols = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'messages'
        `);
        console.log('Messages columns:', msgCols.rows.map(c => `${c.column_name} (${c.data_type})`));

        // Now test getCommunicationContacts query for each role
        const rolesToTest = ['parent', 'learner', 'teacher', 'admin'];
        for (const role of rolesToTest) {
            const userRes = await db.query(`
                SELECT u.id, u.email, r.name as role_name 
                FROM users u 
                JOIN roles r ON u.role_id = r.id 
                WHERE LOWER(r.name) = $1 
                LIMIT 1
            `, [role]);

            if (userRes.rows.length === 0) {
                console.log(`No user found for role ${role}`);
                continue;
            }

            const testUser = userRes.rows[0];
            console.log(`\nTesting getCommunicationContacts for ${role} (id: ${testUser.id}, email: ${testUser.email}):`);

            // Run getCommunicationContacts logic
            const userController = require('../public/src/controller/userController');
            const req = { user: { id: testUser.id, role: role } };
            let resultData = null;
            let errorData = null;
            const res = {
                json: (d) => { resultData = d; },
                status: (code) => ({
                    json: (e) => { errorData = { code, e }; }
                })
            };

            await userController.getCommunicationContacts(req, res);
            if (errorData) {
                console.error(`❌ getCommunicationContacts FAILED for ${role}:`, errorData);
            } else {
                console.log(`✅ getCommunicationContacts SUCCESS for ${role}. Returned ${resultData?.length || 0} contacts.`);
                if (resultData && resultData.length > 0) {
                    console.log('   Sample contact:', resultData[0].full_name, resultData[0].surname, `(${resultData[0].tag_name})`);
                }
            }
        }

    } catch (err) {
        console.error('Inspection error:', err);
    } finally {
        process.exit(0);
    }
}

inspect();
