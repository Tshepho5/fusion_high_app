const { pool } = require('../db/db');
const authController = require('../public/src/controller/authController');
const parentController = require('../public/src/controller/parentController');
const userController = require('../public/src/controller/userController');
const emailService = require('../public/src/services/emailService');

async function runTests() {
    console.log('--- STARTING VERIFICATION TEST SUITE ---');
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
        // TEST 1: Check Database Schema for Messages
        console.log('\n[TEST 1] Verifying Messages Table Columns...');
        const colRes = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'messages'
        `);
        const columns = colRes.rows.map(r => r.column_name);
        assert(columns.includes('attachment_url'), 'messages table has attachment_url');
        assert(columns.includes('attachment_name'), 'messages table has attachment_name');
        assert(columns.includes('attachment_type'), 'messages table has attachment_type');
        assert(columns.includes('file_size'), 'messages table has file_size');
        assert(columns.includes('voice_duration'), 'messages table has voice_duration');

        // TEST 2: Test Password Generation Formula From SA ID (indices 0, 3, 6, 9, 12)
        console.log('\n[TEST 2] Testing Learner Password Generation from South African ID...');
        // ID: 0504125890088
        // idx 0: '0', idx 3: '4', idx 6: '5', idx 9: '0', idx 12: '8' -> '04508'
        const testId1 = '0504125890088';
        const pw1 = authController.generateLearnerPasswordFromID(testId1);
        assert(pw1 === '04508', `SA ID ${testId1} generates '${pw1}' (expected '04508')`);

        // ID: 0801015029087
        // idx 0: '0', idx 3: '1', idx 6: '5', idx 9: '9', idx 12: '7' -> '01597'
        const testId2 = '0801015029087';
        const pw2 = authController.generateLearnerPasswordFromID(testId2);
        assert(pw2 === '01597', `SA ID ${testId2} generates '${pw2}' (expected '01597')`);

        // TEST 3: Test Unique Learner Number Generator
        console.log('\n[TEST 3] Testing Unique Official Learner Number Generation...');
        const num1 = await authController.generateOfficialLearnerNumber();
        console.log(`Generated Learner Number 1: ${num1}`);
        const currentYear = new Date().getFullYear();
        assert(num1.startsWith(String(currentYear)), `Learner number starts with ${currentYear}`);
        assert(num1.length === 8, `Learner number has standard 8 digits (${num1})`);

        // TEST 4: Test Email Template Generation
        console.log('\n[TEST 4] Testing Child Linkage & Credentials Email Template...');
        const tpl = emailService.templates.childLinkageWithCredentials({
            parentName: 'Test Parent',
            childName: 'Sipho',
            surname: 'Nkosi',
            learnerNumber: num1,
            loginEmail: `${num1}@fusion.high`,
            password: pw1,
            grade: 10,
            stream: 'Science',
            subjects: ['Mathematics', 'Physical Sciences', 'Life Sciences', 'English FAL'],
            baseUrl: 'http://localhost:3000'
        });
        assert(tpl.subject.includes(num1), `Email subject includes learner number (${tpl.subject})`);
        assert(tpl.body.includes(pw1), `Email body contains the generated password '${pw1}'`);
        assert(tpl.body.includes(`${num1}@fusion.high`), `Email body contains the portal email`);
        assert(tpl.body.includes('Curriculum Subjects'), `Email body lists curriculum subjects`);

        // TEST 5: Test Parent Link Sibling API Controller End-to-End
        console.log('\n[TEST 5] Testing Parent Link Sibling Controller with Mock Request/Response...');
        // Find or create a parent user
        let parentUserRes = await pool.query(`
            SELECT u.id, u.email, u.full_name, u.surname 
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE LOWER(r.name) = 'parent'
            LIMIT 1
        `);

        let testParentId;
        let testParentEmail;
        if (parentUserRes.rows.length > 0) {
            testParentId = parentUserRes.rows[0].id;
            testParentEmail = parentUserRes.rows[0].email;
        } else {
            const insParent = await pool.query(`
                INSERT INTO users (email, password_hash, role_id, full_name, surname)
                VALUES ('test_parent_auto@fusionhigh.co.za', '$2b$10$abcdefghijklmnopqrstuu', 4, 'Automated', 'Parent')
                RETURNING id, email
            `);
            testParentId = insParent.rows[0].id;
            testParentEmail = insParent.rows[0].email;
        }

        // Intercept emailService.send to verify email dispatch
        let sentEmailDetails = null;
        const originalSend = emailService.send;
        emailService.send = async (to, subject, body) => {
            sentEmailDetails = { to, subject, body };
            return true;
        };

        // ID: 0703155129084 -> idx 0:'0', 3:'3', 6:'5', 9:'9', 12:'4' -> '03594'
        const testChildUniqueId = '0703155129084';
        const reqMock = {
            user: { id: testParentId, role: 'parent' },
            protocol: 'http',
            get: () => 'localhost:3000',
            body: {
                first_name: 'TestChild' + Date.now().toString().slice(-4),
                surname: 'Makola',
                id_number: testChildUniqueId,
                dob: '2007-03-15',
                gender: 'Male',
                grade: 10,
                stream: 'Science',
                home_language: 'Sepedi'
            }
        };

        let resStatus = 200;
        let resJson = null;
        const resMock = {
            status: (code) => { resStatus = code; return resMock; },
            json: (data) => { resJson = data; return resMock; }
        };

        await parentController.linkSibling(reqMock, resMock);

        assert(resStatus === 200 || resStatus === 201, `linkSibling returned successful HTTP status (${resStatus})`);
        assert(resJson && resJson.credentials, 'linkSibling returned credentials in response');
        assert(resJson.credentials.generated_password === '03594', `Password derived correctly as '03594' (was '${resJson?.credentials?.generated_password}')`);
        assert(resJson.credentials.learner_number.startsWith(String(currentYear)), `Learner number generated: ${resJson?.credentials?.learner_number}`);
        assert(sentEmailDetails !== null, 'emailService.send was triggered');
        assert(sentEmailDetails && sentEmailDetails.to === testParentEmail, `Email dispatched to parent email: ${testParentEmail}`);
        assert(sentEmailDetails && sentEmailDetails.body.includes(resJson.credentials.generated_password), 'Dispatched email body contains the generated password');

        // Restore emailService.send
        emailService.send = originalSend;

        // TEST 6: Test Communication Hub Sending & Receiving Across Dashboards
        console.log('\n[TEST 6] Testing Communication Hub Cross-Dashboard Messaging...');
        // Find an admin or teacher to send to
        const recipientRes = await pool.query(`
            SELECT u.id, u.email, u.full_name, r.name as role_name
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id != $1
            LIMIT 1
        `, [testParentId]);

        if (recipientRes.rows.length > 0) {
            const recipient = recipientRes.rows[0];
            const testMsgContent = 'Hello from verification test! ' + Date.now();
            const msgReqMock = {
                user: { id: testParentId, role: 'parent' },
                body: {
                    recipient_id: recipient.id,
                    subject: 'Testing Cross-Dashboard Chat Center',
                    content: testMsgContent
                }
            };

            let msgStatus = 200;
            let msgJson = null;
            const msgResMock = {
                status: (code) => { msgStatus = code; return msgResMock; },
                json: (data) => { msgJson = data; return msgResMock; }
            };

            await userController.sendMessage(msgReqMock, msgResMock);
            assert(msgStatus === 200 || msgStatus === 201, `sendMessage returned status ${msgStatus}`);
            assert(msgJson && msgJson.message, 'sendMessage returned success message object');

            // Verify in database
            const dbMsg = await pool.query(`
                SELECT id, sender_id, recipient_id, body, subject, created_at 
                FROM messages 
                WHERE sender_id = $1 AND recipient_id = $2 
                ORDER BY created_at DESC LIMIT 1
            `, [testParentId, recipient.id]);

            assert(dbMsg.rows.length > 0, 'Message successfully persisted in database');
            assert(dbMsg.rows[0].body === testMsgContent, 'Message body matches sent content exactly');

            // Test getConversationHistory
            const convReqMock = {
                user: { id: recipient.id, role: recipient.role_name.toLowerCase() },
                params: { recipientId: testParentId }
            };
            let convJson = null;
            const convResMock = {
                status: (code) => convResMock,
                json: (data) => { convJson = data; return convResMock; }
            };
            await userController.getConversationHistory(convReqMock, convResMock);
            const foundMsg = (convJson || []).find(m => m.body === testMsgContent);
            assert(foundMsg !== undefined, 'Recipient successfully received message in conversation history');
        } else {
            console.warn('⚠️ No other user found to test messaging with.');
        }

        console.log(`\n========================================`);
        console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
        console.log(`========================================\n`);

    } catch (err) {
        console.error('Fatal test error:', err);
        failed++;
    } finally {
        await pool.end();
        process.exit(failed > 0 ? 1 : 0);
    }
}

runTests();
