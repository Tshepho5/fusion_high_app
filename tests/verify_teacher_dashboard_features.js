const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || '#Butcher#$5$#Letlalo#$5$';
const baseUrl = 'http://127.0.0.1:4000';
const db = require('../db/db');

async function verifyTeacherFeatures() {
  console.log('================================================================');
  console.log('🧪 VERIFYING TEACHER DASHBOARD ENHANCEMENTS');
  console.log('================================================================');

  // 1. Get demo teacher from DB
  const teacherRes = await db.query(
    `SELECT u.id, u.email, r.name as role 
     FROM users u 
     JOIN roles r ON u.role_id = r.id 
     WHERE r.name = 'teacher' 
     LIMIT 1`
  );

  const teacherUser = teacherRes.rows[0] || { id: 4, email: 'teacher@fusionhigh.co.za', role: 'teacher' };
  const teacherToken = jwt.sign(
    { id: teacherUser.id, email: teacherUser.email, role: teacherUser.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // 1. Verify Teacher Workload & Assigned Classes / Subjects
  console.log('\n--- 1. Testing Teacher Workload & Assigned Classes ---');
  const overviewRes = await fetch(`${baseUrl}/api/teacher/workload`, {
    headers: { Authorization: `Bearer ${teacherToken}` }
  });
  const overviewData = await overviewRes.json();
  console.log('Teacher Workload API Status:', overviewRes.status);
  console.log('Assigned Subjects:', overviewData.subjects);
  console.log('Assigned Grades:', overviewData.grades_taught);
  console.log('Assigned Classes:', overviewData.classes_taught);

  if (overviewRes.status !== 200) {
    throw new Error('Failed to retrieve teacher workload!');
  }
  console.log('✅ [PASS] Teacher assigned subjects and classes loaded.');

  // 2. Test Attendance Saving API
  console.log('\n--- 2. Testing Class Attendance Saving ---');
  const attRes = await fetch(`${baseUrl}/api/teacher/attendance`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${teacherToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      class_name: '10A',
      subject: 'Mathematics',
      date: new Date().toISOString().split('T')[0],
      records: [
        { id: 1, learner_number: '2026001', status: 'present' },
        { id: 2, learner_number: '2026002', status: 'late' },
        { id: 3, learner_number: '2026003', status: 'absent' }
      ]
    })
  });
  const attData = await attRes.json();
  console.log('Attendance Save API Status:', attRes.status);
  console.log('Attendance Save Message:', attData.message || attData);

  if (attRes.status !== 200 && attRes.status !== 201) {
    throw new Error('Attendance saving failed!');
  }
  console.log('✅ [PASS] Class attendance register successfully saved.');

  // 3. Test Formal Marks Saving & DBE Progress Recording
  console.log('\n--- 3. Testing Formal Assessment Marks Recording ---');
  const marksRes = await fetch(`${baseUrl}/api/teacher/marks/save`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${teacherToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subject: 'Mathematics',
      class: '10A',
      term: 'Term 3 2026',
      assessment_name: 'Formal Controlled Test 1',
      total_mark: 50,
      marks: [
        { child_id: 1, grade: 84, mark_obtained: 42 },
        { child_id: 2, grade: 76, mark_obtained: 38 },
        { child_id: 3, grade: 90, mark_obtained: 45 }
      ]
    })
  });
  const marksData = await marksRes.json();
  console.log('Marks Save API Status:', marksRes.status);
  console.log('Marks Response:', marksData.message || marksData);

  if (marksRes.status !== 200 && marksRes.status !== 201) {
    throw new Error('Marks saving failed!');
  }
  console.log('✅ [PASS] Formal assessment marks recorded into database.');

  console.log('\n================================================================');
  console.log('🏁 ALL TEACHER DASHBOARD TESTS PASSED SUCCESSFULLY');
  console.log('================================================================');
  process.exit(0);
}

verifyTeacherFeatures().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
