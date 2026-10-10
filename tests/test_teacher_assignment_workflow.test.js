const db = require('../db/db');
const adminController = require('../public/src/controller/adminController');
const staffInviteController = require('../public/src/controller/staffInviteController');
const teacherOverviewController = require('../public/src/controller/teacher/teacherOverviewController');

async function runTest() {
  console.log('=== STARTING TEACHER ASSIGNMENT WORKFLOW TEST ===');

  const testEmail = `test.educator.${Date.now()}@gelezasa.co.za`;
  const schoolId = 14;

  // 1. Create a staff invite with pending status
  const inviteRes = await db.query(`
    INSERT INTO staff_invites (
      school_id, email, full_name, surname, role_type,
      subjects_offered, assigned_grades, assigned_classes,
      status, invite_token
    )
    VALUES ($1, $2, 'Buhle', 'Mthombeni', 'teacher',
      ARRAY['English FAL', 'Life Orientation']::text[],
      ARRAY[10, 11]::int[],
      ARRAY['10A', 'Grade 11 • School 13']::text[],
      'pending', 'test_invite_token_${Date.now()}'
    )
    RETURNING *;
  `, [schoolId, testEmail]);

  const invite = inviteRes.rows[0];
  console.log('1. Created invite with status pending:', invite.id, invite.email, invite.status);

  if (invite.status !== 'pending') {
    throw new Error('Initial status must be pending');
  }

  // 2. Simulate teacher accepting invitation and confirming workload + password
  const confirmReq = {
    body: {
      token: invite.invite_token,
      password: 'Password@2026',
      confirmPassword: 'Password@2026',
      full_name: 'Buhle',
      surname: 'Mthombeni',
      phone: '0610512832',
      id_number: '9201015800085',
      confirmed_subjects: ['English FAL', 'Life Orientation'],
      confirmed_grades: [10, 11],
      confirmed_classes: ['10A', 'Grade 11 • School 13']
    },
    headers: {},
    get: (h) => 'localhost:3000',
    protocol: 'http'
  };

  let confirmStatus = null;
  const confirmRes = {
    json: (data) => {
      confirmStatus = data.status;
      console.log('2. confirmTeacherInvite response:', data);
    },
    status: (code) => ({
      json: (data) => console.log('confirm error code:', code, data)
    })
  };

  await staffInviteController.confirmTeacherInvite(confirmReq, confirmRes);

  // Verify status in DB is now 'applied'
  const appliedCheck = await db.query('SELECT * FROM staff_invites WHERE id = $1', [invite.id]);
  console.log('Status in DB after teacher confirmation:', appliedCheck.rows[0].status);
  if (appliedCheck.rows[0].status !== 'applied') {
    throw new Error('Status after teacher confirmation should be "applied"');
  }

  // 3. School Administrator approves the application
  const approveReq = {
    params: { id: invite.id },
    user: { id: 1, full_name: 'Principal Makola', role: 'admin' },
    headers: {},
    get: (h) => 'localhost:3000',
    protocol: 'http'
  };

  let approvedUser = null;
  const approveRes = {
    json: (data) => {
      console.log('3. approveStaffInvite response:', data.message);
      approvedUser = data.user;
    },
    status: (code) => ({
      json: (data) => console.log('approve error code:', code, data)
    })
  };

  await adminController.approveStaffInvite(approveReq, approveRes);

  // Check user and employee records
  const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [testEmail]);
  if (userCheck.rows.length === 0) throw new Error('User record was not created/updated');
  const teacherUser = userCheck.rows[0];
  console.log('Verified user record created with role_id:', teacherUser.role_id, 'user_id:', teacherUser.id);

  const empCheck = await db.query('SELECT * FROM employees WHERE user_id = $1', [teacherUser.id]);
  if (empCheck.rows.length === 0) throw new Error('Employee record was not created');
  console.log('Verified employee record created:', empCheck.rows[0].subjects, empCheck.rows[0].grades_taught, empCheck.rows[0].classes_taught);

  const taCheck = await db.query('SELECT * FROM teacher_assignments WHERE teacher_id = $1', [teacherUser.id]);
  console.log('Verified teacher_assignments rows created:', taCheck.rows.length);
  taCheck.rows.forEach(r => {
    console.log(`  - Assignment: ${r.subject_name} | Grade ${r.grade_level} | Class ${r.class_name}`);
  });
  if (taCheck.rows.length === 0) throw new Error('No teacher_assignments rows were created');

  // 4. Test Teacher Dashboard Retrieval: getMySubjectsOverview
  const overviewReq = {
    user: { id: teacherUser.id, email: teacherUser.email, school_id: schoolId }
  };

  let overviewCards = [];
  const overviewRes = {
    json: (data) => {
      overviewCards = data;
      console.log('4. getMySubjectsOverview returned cards count:', data.length);
    },
    status: (code) => ({
      json: (data) => console.log('overview error code:', code, data)
    })
  };

  await teacherOverviewController.getMySubjectsOverview(overviewReq, overviewRes);

  if (overviewCards.length === 0) {
    throw new Error('getMySubjectsOverview returned empty array! "No Subjects or Classes Assigned" would show!');
  }

  console.log('Cards returned:');
  overviewCards.forEach(c => {
    console.log(`  - Card: ${c.subject_name} | Grade ${c.grade} | Class ${c.class_name} | Learners: ${c.learner_count}`);
  });

  // 5. Test Teacher Workload: getWorkload
  let workloadData = null;
  const workloadRes = {
    json: (data) => {
      workloadData = data;
      console.log('5. getWorkload returned:', data);
    },
    status: (code) => ({
      json: (data) => console.log('workload error code:', code, data)
    })
  };

  await teacherOverviewController.getWorkload(overviewReq, workloadRes);

  if (!workloadData || workloadData.subjects.length === 0) {
    throw new Error('getWorkload returned empty subjects!');
  }

  // Clean up test records
  await db.query('DELETE FROM teacher_assignments WHERE teacher_id = $1', [teacherUser.id]);
  await db.query('DELETE FROM employees WHERE user_id = $1', [teacherUser.id]);
  await db.query('DELETE FROM users WHERE id = $1', [teacherUser.id]);
  await db.query('DELETE FROM staff_invites WHERE id = $1', [invite.id]);
  console.log('Cleaned up test records successfully.');

  console.log('=== TEST PASSED SUCCESSFULLY! ===');
  process.exit(0);
}

runTest().catch(err => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
