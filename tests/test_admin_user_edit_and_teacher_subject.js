const { pool } = require('../db/db');
const adminController = require('../public/src/controller/adminController');
const teacherLearnersController = require('../public/src/controller/teacher/teacherLearnersController');
const emailService = require('../public/src/services/emailService');

function mockResponse() {
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
}

async function runSuite() {
    console.log('================================================================');
    console.log('🧪 VERIFYING ADMIN USER/TEACHER EDIT & MARKS PERSISTENCE');
    console.log('================================================================\n');

    let passed = 0;
    let failed = 0;

    function assert(cond, desc) {
        if (cond) {
            console.log(`✅ PASS: ${desc}`);
            passed++;
        } else {
            console.error(`❌ FAIL: ${desc}`);
            failed++;
        }
    }

    try {
        // --- 1. VERIFY DATABASE SCHEMA MIGRATIONS ---
        console.log('[1] Verifying Database Schema for Marks & Progress...');
        const marksCols = (await pool.query(`
            SELECT column_name FROM information_schema.columns WHERE table_name = 'marks'
        `)).rows.map(r => r.column_name);

        assert(marksCols.includes('is_published'), 'marks table has is_published');
        assert(marksCols.includes('assessment_name'), 'marks table has assessment_name');
        assert(marksCols.includes('max_score'), 'marks table has max_score');
        assert(marksCols.includes('percentage'), 'marks table has percentage');
        assert(marksCols.includes('child_id'), 'marks table has child_id');

        const progCols = (await pool.query(`
            SELECT column_name FROM information_schema.columns WHERE table_name = 'progress'
        `)).rows.map(r => r.column_name);

        assert(progCols.includes('is_published'), 'progress table has is_published');
        assert(progCols.includes('assessment_name'), 'progress table has assessment_name');
        assert(progCols.includes('total_marks'), 'progress table has total_marks');
        assert(progCols.includes('score'), 'progress table has score');

        // --- 2. VERIFY ADMIN GET USER PROFILE DETAILS ---
        console.log('\n[2] Testing Admin Get User Profile Details...');
        // Find a teacher user
        const teacherUserRes = await pool.query(`
            SELECT u.id, u.email, u.full_name, u.surname, r.name as role
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE r.name = 'teacher'
            LIMIT 1
        `);

        if (teacherUserRes.rows.length === 0) {
            throw new Error('No teacher user found in database to test.');
        }

        const teacherUser = teacherUserRes.rows[0];
        console.log(`Found teacher user: ID ${teacherUser.id} (${teacherUser.full_name} ${teacherUser.surname})`);

        const reqTeacherProfile = { params: { id: teacherUser.id } };
        const resTeacherProfile = mockResponse();
        await adminController.getUserProfileDetails(reqTeacherProfile, resTeacherProfile);

        assert(resTeacherProfile.statusCode === 200, 'GET user profile status is 200');
        assert(resTeacherProfile.body && resTeacherProfile.body.profile, 'Profile object returned');
        assert(resTeacherProfile.body.profile.role === 'teacher', 'Profile role identified as teacher');
        assert(Array.isArray(resTeacherProfile.body.profile.subjects), 'Teacher profile has subjects array');
        assert(Array.isArray(resTeacherProfile.body.profile.grades_taught), 'Teacher profile has grades_taught array');

        // --- 3. VERIFY ADMIN UPDATE USER PROFILE ---
        console.log('\n[3] Testing Admin Update User Profile...');
        const updatedPhone = '0829998877';
        const updatedName = teacherUser.full_name || 'Educator';
        const reqUpdate = {
            params: { id: teacherUser.id },
            body: {
                name: updatedName,
                surname: teacherUser.surname || 'Teacher',
                email: teacherUser.email,
                phone: updatedPhone,
                role: 'teacher',
                subjects: ['Mathematics', 'Mathematical Literacy'],
                grades_taught: ['10', '11'],
                classes_taught: ['10A', '11B']
            }
        };
        const resUpdate = mockResponse();
        await adminController.updateUserProfile(reqUpdate, resUpdate);

        assert(resUpdate.statusCode === 200, 'PUT updateUserProfile returned 200');
        assert(resUpdate.body && resUpdate.body.success === true, 'Update returned success: true');

        // Verify in DB
        const verifyUserDb = await pool.query('SELECT phone FROM users WHERE id = $1', [teacherUser.id]);
        assert(verifyUserDb.rows[0].phone === updatedPhone, 'User phone updated in users table');

        const verifyEmpDb = await pool.query('SELECT subjects, grades_taught, classes_taught FROM employees WHERE user_id = $1', [teacherUser.id]);
        assert(verifyEmpDb.rows[0].subjects.includes('Mathematics'), 'Employee subjects saved in employees table');
        assert(verifyEmpDb.rows[0].grades_taught.map(Number).includes(10), 'Employee grades_taught saved in employees table');

        // --- 4. VERIFY TEACHER SUBJECT ASSIGNMENT & EMAIL NOTIFICATION ---
        console.log('\n[4] Testing Teacher Subject Assignment & Automatic Email Trigger...');
        // Add a brand new subject: 'Life Sciences'
        const newSubject = 'Life Sciences';
        const reqAddSubject = {
            params: { id: teacherUser.id },
            body: {
                subjects: ['Mathematics', 'Mathematical Literacy', newSubject],
                grades_taught: ['10', '11', '12'],
                classes_taught: ['10A', '11B', '12A']
            }
        };
        const resAddSubject = mockResponse();
        await adminController.updateTeacherSubjects(reqAddSubject, resAddSubject);

        assert(resAddSubject.statusCode === 200, 'updateTeacherSubjects returned 200');
        assert(resAddSubject.body && resAddSubject.body.newly_added_subjects.includes(newSubject), 'Newly added subjects includes Life Sciences');

        // Check in employees table
        const empSubjRes = await pool.query('SELECT subjects, subject_codes FROM employees WHERE user_id = $1', [teacherUser.id]);
        assert(empSubjRes.rows[0].subjects.includes(newSubject), 'Life Sciences now in employees.subjects');
        assert(Array.isArray(empSubjRes.rows[0].subject_codes) && empSubjRes.rows[0].subject_codes.length > 0, 'subject_codes updated');

        // Check if an in-app message was generated for the teacher
        const msgRes = await pool.query(`
            SELECT * FROM messages 
            WHERE recipient_id = $1 
            ORDER BY created_at DESC 
            LIMIT 1
        `, [teacherUser.id]);
        assert(msgRes.rows.length > 0, 'In-app message created for the educator');
        assert((msgRes.rows[0].body || msgRes.rows[0].content).includes(newSubject), 'In-app notification specifies newly assigned subject');

        // Verify email template renders properly
        const testTemplate = emailService.templates.teacherSubjectAssignment({
            teacherName: `${teacherUser.full_name} ${teacherUser.surname}`,
            newSubjects: [newSubject],
            allSubjects: ['Mathematics', 'Mathematical Literacy', newSubject],
            gradesTaught: ['10', '11', '12']
        });
        assert(testTemplate.subject.includes(newSubject), 'Email template subject includes new subject name');
        assert((testTemplate.html || testTemplate.body).includes(newSubject), 'Email template HTML body includes new subject name');
        assert((testTemplate.html || testTemplate.body).includes('Mark Register & DBE Gradebook'), 'Email highlights Mark Register capability');

        // --- 5. VERIFY CLASS MARK SHEET: DRAFT VS PUBLISHED UPSERT ---
        console.log('\n[5] Testing Class Mark Register: Draft vs Published Upsert...');
        // Find an enrolled child for testing
        const childRes = await pool.query(`
            SELECT id, full_name, surname, grade FROM children LIMIT 1
        `);
        if (childRes.rows.length === 0) {
            throw new Error('No learners found in database to test mark saving.');
        }
        const testChild = childRes.rows[0];
        const testGrade = parseInt(testChild.grade || '10', 10);
        const testSubject = 'Life Sciences';
        const testTerm = 'Term 3 2026';
        const testAssessment = 'Practical Investigation: Cell Biology';

        // Step A: Save Draft
        console.log('-> Step A: Saving mark as DRAFT (is_published = false)...');
        const reqDraftMarks = {
            body: {
                subject: testSubject,
                grade: testGrade,
                term: testTerm,
                assessment_name: testAssessment,
                total_mark: 100,
                is_published: false,
                marks: [
                    { child_id: testChild.id, grade: 78 }
                ]
            }
        };
        const resDraftMarks = mockResponse();
        await teacherLearnersController.saveClassMarks(reqDraftMarks, resDraftMarks);

        assert(resDraftMarks.statusCode === 200, 'Save draft marks returned 200');
        assert(resDraftMarks.body && resDraftMarks.body.success === true, 'Save draft success is true');
        assert(resDraftMarks.body.is_published === false, 'Result indicates is_published = false');

        // Verify draft in DB
        const draftProg = await pool.query(`
            SELECT score, is_published, assessment_name 
            FROM progress 
            WHERE child_id = $1 AND subject = $2 AND term = $3 AND assessment_name = $4
        `, [testChild.id, testSubject, testTerm, testAssessment]);

        assert(draftProg.rows.length === 1, 'Exactly 1 progress record saved for draft');
        assert(parseFloat(draftProg.rows[0].score) === 78, 'Draft score recorded as 78');
        assert(draftProg.rows[0].is_published === false, 'Progress record has is_published = false');

        // Step B: Retrieve Class List and verify draft mark is retrieved
        console.log('-> Step B: Retrieving class list with stored draft marks...');
        const reqClassList = {
            query: {
                subject: testSubject,
                grade: testGrade,
                term: testTerm,
                assessment_name: testAssessment
            }
        };
        const resClassList = mockResponse();
        await teacherLearnersController.getClassList(reqClassList, resClassList);

        assert(resClassList.statusCode === 200, 'getClassList returned 200');
        const matchedLearner = (resClassList.body || []).find(l => l.id === testChild.id);
        assert(matchedLearner !== undefined, 'Test learner found in class list');
        assert(parseFloat(matchedLearner.current_mark) === 78, 'Class list returns retrieved current_mark of 78');
        assert(matchedLearner.is_published === false, 'Class list returns is_published = false for draft');

        // Step C: Update and PUBLISH marks (UPSERT)
        console.log('-> Step C: Updating and PUBLISHING marks (is_published = true)...');
        const reqPublishMarks = {
            body: {
                subject: testSubject,
                grade: testGrade,
                term: testTerm,
                assessment_name: testAssessment,
                total_mark: 100,
                is_published: true,
                marks: [
                    { child_id: testChild.id, grade: 85 } // updated score from 78 to 85
                ]
            }
        };
        const resPublishMarks = mockResponse();
        await teacherLearnersController.saveClassMarks(reqPublishMarks, resPublishMarks);

        assert(resPublishMarks.statusCode === 200, 'Publish marks returned 200');
        assert(resPublishMarks.body && resPublishMarks.body.is_published === true, 'Result indicates is_published = true');

        // Verify in DB - should NOT have created duplicate records
        const pubProg = await pool.query(`
            SELECT score, is_published, assessment_name 
            FROM progress 
            WHERE child_id = $1 AND subject = $2 AND term = $3 AND assessment_name = $4
        `, [testChild.id, testSubject, testTerm, testAssessment]);

        assert(pubProg.rows.length === 1, 'No duplicate progress rows created (clean UPSERT)');
        assert(parseFloat(pubProg.rows[0].score) === 85, 'Score cleanly updated from 78 to 85');
        assert(pubProg.rows[0].is_published === true, 'Progress record now marked is_published = true');

        const termNum = parseInt(testTerm.replace(/[^0-9]/g, ''), 10) || 3;
        const pubMarks = await pool.query(`
            SELECT percentage, is_published, assessment_name 
            FROM marks 
            WHERE child_id = $1 AND (subject = $2 OR subject_name = $2) AND term = $3 AND assessment_name = $4
        `, [testChild.id, testSubject, termNum, testAssessment]);

        assert(pubMarks.rows.length === 1, 'No duplicate marks rows created (clean UPSERT in marks table)');
        assert(parseFloat(pubMarks.rows[0].percentage) === 85, 'Marks percentage cleanly updated to 85');
        assert(pubMarks.rows[0].is_published === true, 'Marks record now marked is_published = true');

        // Step D: Retrieve Class List again and verify published mark is retrieved
        console.log('-> Step D: Retrieving class list with stored PUBLISHED marks...');
        const resClassListPub = mockResponse();
        await teacherLearnersController.getClassList(reqClassList, resClassListPub);

        assert(resClassListPub.statusCode === 200, 'getClassList returned 200');
        const matchedLearnerPub = (resClassListPub.body || []).find(l => l.id === testChild.id);
        assert(parseFloat(matchedLearnerPub.current_mark) === 85, 'Class list returns retrieved updated mark of 85');
        assert(matchedLearnerPub.is_published === true, 'Class list returns is_published = true');

    } catch (err) {
        console.error('💥 Unexpected test exception:', err);
        failed++;
    } finally {
        console.log('\n================================================================');
        console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
        console.log('================================================================');
        await new Promise(r => setTimeout(r, 600));
        await pool.end();
        process.exit(failed > 0 ? 1 : 0);
    }
}

runSuite();
