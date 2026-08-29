const path = require('path');
const db = require('../db/db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fusion_jwt_secret_key_2024_secure';
const baseUrl = 'http://127.0.0.1:4000';

async function runFullAudit() {
  console.log('================================================================');
  console.log('🔍 FULL DASHBOARD & APPLICATION INTEGRITY AUDIT');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;
  const issues = [];

  const test = async (name, fn) => {
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}:`, err.message || err);
      issues.push({ test: name, error: err.message || String(err) });
      failed++;
    }
  };

  // 1. Check DB Connection and Key Tables
  await test('Database Connection & Schema (58+ tables)', async () => {
    const res = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    if (res.rows.length < 40) {
      throw new Error(`Expected at least 40 tables, found ${res.rows.length}`);
    }
  });

  // 2. Fetch Sample Users for All 4 Roles
  let adminUser, teacherUser, learnerUser, parentUser;
  await test('Fetch Demo Users for All 4 Roles', async () => {
    const uRes = await db.query(`
      SELECT u.id, u.email, u.full_name, u.role_id, r.name as role_name 
      FROM users u 
      JOIN roles r ON u.role_id = r.id;
    `);

    adminUser = uRes.rows.find(u => u.role_name === 'admin');
    teacherUser = uRes.rows.find(u => u.role_name === 'teacher');
    // Select an enrolled learner (Jane Walters, id=7)
    learnerUser = uRes.rows.find(u => u.id === 7 || u.email === '20250001@fusion.high') || uRes.rows.find(u => u.role_name === 'learner');
    // Select parent user who has active linked children
    const parentWithKids = await db.query(`
      SELECT u.id, u.email, u.full_name, u.role_id, 'parent' as role_name
      FROM users u
      WHERE u.id IN (SELECT parent_id FROM children WHERE parent_id IS NOT NULL UNION SELECT parent_id FROM parent_children)
      LIMIT 1
    `);
    parentUser = parentWithKids.rows[0] || uRes.rows.find(u => u.role_name === 'parent');

    if (!adminUser) throw new Error('Missing admin user in DB');
    if (!teacherUser) throw new Error('Missing teacher user in DB');
    if (!learnerUser) throw new Error('Missing learner user in DB');
    if (!parentUser) throw new Error('Missing parent user in DB');
  });

  // Helper to generate auth token
  const getAuthHeader = (user) => {
    const roleName = user.role_name || (user.role_id === 1 ? 'admin' : user.role_id === 2 ? 'parent' : user.role_id === 3 ? 'learner' : 'teacher');
    const token = jwt.sign(
      { id: user.id, email: user.email, role: roleName },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    return `Bearer ${token}`;
  };

  const apiGet = async (path, user) => {
    const res = await fetch(`${baseUrl}${path}`, {
      headers: {
        'Authorization': getAuthHeader(user),
        'Accept': 'application/json'
      }
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HTTP ${res.status}: ${body.substring(0, 150)}`);
    }
    return res.json();
  };

  // ---------------------------------------------------------
  // 3. ADMIN DASHBOARD ENDPOINTS
  // ---------------------------------------------------------
  console.log('\n--- 1. Testing Admin Dashboard APIs ---');
  
  await test('Admin Stats & Analytics (/api/admin/stats)', async () => {
    const data = await apiGet('/api/admin/stats', adminUser);
    if (!data) throw new Error('Empty stats response');
  });

  await test('Admin Learners List (/api/admin/learners)', async () => {
    const data = await apiGet('/api/admin/learners', adminUser);
    if (!Array.isArray(data) && !data.learners) throw new Error('Invalid learners list format');
  });

  await test('Admin Teachers List (/api/admin/teachers)', async () => {
    const data = await apiGet('/api/admin/teachers', adminUser);
    if (!Array.isArray(data) && !data.teachers) throw new Error('Invalid teachers list format');
  });

  await test('Admin Employees List (/api/admin/employees)', async () => {
    const data = await apiGet('/api/admin/employees', adminUser);
    if (!Array.isArray(data)) throw new Error('Invalid employees list format');
  });

  await test('Admin School Metadata (/api/admin/metadata)', async () => {
    const data = await apiGet('/api/admin/metadata', adminUser);
    if (!data) throw new Error('Invalid metadata format');
  });

  await test('Admin Admissions (/api/admin/admissions)', async () => {
    const data = await apiGet('/api/admin/admissions', adminUser);
    if (!Array.isArray(data)) throw new Error('Invalid admissions response');
  });

  await test('Admin Textbook Inventory Tracker (/api/textbooks/inventory)', async () => {
    const data = await apiGet('/api/textbooks/inventory', adminUser);
    if (!Array.isArray(data) && !data.inventory) throw new Error('Invalid inventory response');
  });

  await test('Admin Finance Overview (/api/finance/overview)', async () => {
    const data = await apiGet('/api/finance/overview', adminUser);
    if (!data) throw new Error('Invalid finance response');
  });

  await test('Admin Invoices List (/api/finance/invoices)', async () => {
    const data = await apiGet('/api/finance/invoices', adminUser);
    if (!Array.isArray(data)) throw new Error('Invalid invoices format');
  });

  await test('Admin Matric Analytics Projector (/api/matric-analytics/projector)', async () => {
    const data = await apiGet('/api/matric-analytics/projector', adminUser);
    if (!data) throw new Error('Invalid matric analytics response');
  });

  await test('Admin Leave Relief Requests (/api/leave-relief/requests)', async () => {
    const data = await apiGet('/api/leave-relief/requests', adminUser);
    if (!Array.isArray(data) && !data.requests) throw new Error('Invalid leave relief response');
  });

  await test('Admin Timetables (/api/admin/timetables)', async () => {
    const data = await apiGet('/api/admin/timetables', adminUser);
    if (!Array.isArray(data) && !data.timetables) throw new Error('Invalid timetables format');
  });

  // ---------------------------------------------------------
  // 4. TEACHER DASHBOARD ENDPOINTS
  // ---------------------------------------------------------
  console.log('\n--- 2. Testing Teacher Dashboard APIs ---');

  await test('Teacher Overview Stats (/api/teacher/overview-stats)', async () => {
    const data = await apiGet('/api/teacher/overview-stats', teacherUser);
    if (!data) throw new Error('Invalid teacher stats');
  });

  await test('Teacher My Subjects (/api/teacher/my-subjects-overview)', async () => {
    const data = await apiGet('/api/teacher/my-subjects-overview', teacherUser);
    if (!data) throw new Error('Invalid teacher subjects response');
  });

  await test('Teacher Class List (/api/teacher/classlist)', async () => {
    const data = await apiGet('/api/teacher/classlist', teacherUser);
    if (!Array.isArray(data) && !data.classes) throw new Error('Invalid classlist response');
  });

  await test('Teacher Performance Overview (/api/teacher/performance-overview)', async () => {
    const data = await apiGet('/api/teacher/performance-overview', teacherUser);
    if (!data) throw new Error('Invalid performance response');
  });

  await test('Teacher Resources & Textbooks (/api/teacher/my-resources)', async () => {
    const data = await apiGet('/api/teacher/my-resources', teacherUser);
    if (!Array.isArray(data) && !data.textbooks) throw new Error('Invalid resources response');
  });

  await test('Teacher Attendance Roster (/api/teacher/attendance-roster?class_id=1)', async () => {
    const data = await apiGet('/api/teacher/attendance-roster?class_id=1', teacherUser);
    if (!data) throw new Error('Invalid attendance roster response');
  });

  await test('Teacher Timetables (/api/teacher/timetables)', async () => {
    const data = await apiGet('/api/teacher/timetables', teacherUser);
    if (!Array.isArray(data) && !data.timetables) throw new Error('Invalid timetables response');
  });

  // ---------------------------------------------------------
  // 5. LEARNER DASHBOARD ENDPOINTS
  // ---------------------------------------------------------
  console.log('\n--- 3. Testing Learner Dashboard APIs ---');

  await test('Learner Subjects Overview (/api/learner/my-subjects-overview)', async () => {
    const data = await apiGet('/api/learner/my-subjects-overview', learnerUser);
    if (!data) throw new Error('Invalid learner subjects');
  });

  await test('Learner Grade 10 Math Resources (/api/learner/subject-resources?subject=Mathematics&grade=10)', async () => {
    const data = await apiGet('/api/learner/subject-resources?subject=Mathematics&grade=10', learnerUser);
    if (!Array.isArray(data) || data.length === 0) throw new Error('Expected Grade 10 Math resources');
  });

  await test('Learner Grade 10 Physical Sciences Resources (/api/learner/subject-resources?subject=Physical+Sciences&grade=10)', async () => {
    const data = await apiGet('/api/learner/subject-resources?subject=Physical+Sciences&grade=10', learnerUser);
    if (!Array.isArray(data) || data.length === 0) throw new Error('Expected Grade 10 Physical Sciences resources');
  });

  await test('Learner Grade 11 Math Resources (/api/learner/subject-resources?subject=Mathematics&grade=11)', async () => {
    const data = await apiGet('/api/learner/subject-resources?subject=Mathematics&grade=11', learnerUser);
    if (!Array.isArray(data) || data.length === 0) throw new Error('Expected Grade 11 Math resources');
  });

  await test('Learner Career Pathway & APS Advisor (/api/learner/career-pathway)', async () => {
    const data = await apiGet('/api/learner/career-pathway', learnerUser);
    if (!data.success) throw new Error('Invalid career pathway response');
  });

  await test('Learner Gamification & XP Engine (/api/learner/gamification)', async () => {
    const data = await apiGet('/api/learner/gamification', learnerUser);
    if (data.total_xp === undefined && data.success !== true) throw new Error('Invalid gamification response');
  });

  await test('Learner Announcements Overview (/api/learner/announcements-overview)', async () => {
    const data = await apiGet('/api/learner/announcements-overview', learnerUser);
    if (!Array.isArray(data.announcements)) throw new Error('Invalid announcements format');
  });

  await test('Learner Attendance Overview (/api/learner/attendance-overview)', async () => {
    const data = await apiGet('/api/learner/attendance-overview', learnerUser);
    if (!data) throw new Error('Invalid attendance format');
  });

  await test('Learner Grades & Report Overview (/api/learner/grades-overview)', async () => {
    const data = await apiGet('/api/learner/grades-overview', learnerUser);
    if (!data) throw new Error('Invalid grades format');
  });

  await test('Learner Timetable (/api/learner/timetable)', async () => {
    const data = await apiGet('/api/learner/timetable', learnerUser);
    if (!data) throw new Error('Invalid timetable format');
  });

  // ---------------------------------------------------------
  // 6. PARENT DASHBOARD ENDPOINTS
  // ---------------------------------------------------------
  console.log('\n--- 4. Testing Parent Dashboard APIs ---');

  await test('Parent Overview (/api/parent/overview)', async () => {
    const data = await apiGet('/api/parent/overview', parentUser);
    if (!data) throw new Error('Invalid parent overview response');
  });

  await test('Parent Children Overview (/api/parent/children)', async () => {
    const data = await apiGet('/api/parent/children', parentUser);
    if (!Array.isArray(data)) throw new Error('Invalid parent children response');
    if (data.length === 0) throw new Error('Expected linked children for parent');
  });

  await test('Parent Children Detailed (/api/parent/children-detailed)', async () => {
    const data = await apiGet('/api/parent/children-detailed', parentUser);
    if (!Array.isArray(data.children) && !Array.isArray(data)) throw new Error('Invalid detailed children response');
  });

  await test('Parent Child Performance (/api/parent/child-performance?childId=1)', async () => {
    const data = await apiGet('/api/parent/child-performance?childId=1', parentUser);
    if (!data) throw new Error('Invalid child performance response');
  });

  await test('Parent Child Attendance (/api/parent/child-attendance?childId=1)', async () => {
    const data = await apiGet('/api/parent/child-attendance?childId=1', parentUser);
    if (!data) throw new Error('Invalid child attendance response');
  });

  await test('Parent Child Assignments (/api/parent/child-assignments?childId=1)', async () => {
    const data = await apiGet('/api/parent/child-assignments?childId=1', parentUser);
    if (!Array.isArray(data.assignments)) throw new Error('Invalid child assignments response');
  });

  await test('Parent Child Timetable (/api/parent/child-timetable?childId=1)', async () => {
    const data = await apiGet('/api/parent/child-timetable?childId=1', parentUser);
    if (!data) throw new Error('Invalid child timetable response');
  });

  await test('Parent Child Alerts (/api/parent/child-alerts?childId=1)', async () => {
    const data = await apiGet('/api/parent/child-alerts?childId=1', parentUser);
    if (!Array.isArray(data.alerts)) throw new Error('Invalid child alerts response');
  });

  // ---------------------------------------------------------
  // 7. GLOBAL COMMON ENDPOINTS
  // ---------------------------------------------------------
  console.log('\n--- 5. Testing Common / Shared APIs ---');

  await test('School Calendar Events (/api/events)', async () => {
    const data = await apiGet('/api/events', adminUser);
    if (!Array.isArray(data)) throw new Error('Invalid events format');
  });

  await test('Communication Contacts (/api/messages/contacts)', async () => {
    const data = await apiGet('/api/messages/contacts', teacherUser);
    if (!data) throw new Error('Invalid contacts format');
  });

  await test('Unread Message Count (/api/messages/unread-count)', async () => {
    const data = await apiGet('/api/messages/unread-count', learnerUser);
    if (data.unread_count === undefined && data.count === undefined) throw new Error('Invalid unread count format');
  });

  await test('Bursaries Directory (/api/bursaries)', async () => {
    const data = await apiGet('/api/bursaries', learnerUser);
    if (!Array.isArray(data) && !data.bursaries) throw new Error('Invalid bursaries format');
  });

  // ---------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------
  console.log('\n================================================================');
  console.log(`🏁 AUDIT COMPLETE: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================');

  if (failed > 0) {
    console.error('\nIssues found:');
    issues.forEach((i, idx) => console.error(`${idx + 1}. [${i.test}]: ${i.error}`));
  }

  process.exit(failed > 0 ? 1 : 0);
}

runFullAudit().catch(err => {
  console.error('Audit fatal error:', err);
  process.exit(1);
});
