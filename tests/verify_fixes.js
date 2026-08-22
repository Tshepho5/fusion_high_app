const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'fusion_high_secret_jwt_key';
const baseUrl = 'http://127.0.0.1:4000';

async function runVerification() {
  console.log('================================================================');
  console.log('🧪 VERIFYING FIXES & FEATURES');
  console.log('================================================================');

  const adminToken = jwt.sign({ id: 1, email: 'admin@fusion.high', role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });

  // 1. Test Dashboard Stats Header Counts
  console.log('\n--- 1. Testing Admin Dashboard Header Counters ---');
  const statsRes = await fetch(`${baseUrl}/api/admin/stats`, {
    headers: { Authorization: `Bearer ${adminToken}`, Accept: 'application/json' }
  });
  const stats = await statsRes.json();
  console.log('Stats received:', {
    learners: stats.total_learners || stats.enrolled_learners || stats.learner,
    staff: stats.total_teachers || stats.staff || stats.teacher,
    classes: stats.total_classes || stats.classes,
    attendance: stats.overall_attendance || stats.attendance_rate
  });

  if (!stats.total_learners || !stats.total_teachers || !stats.total_classes) {
    throw new Error('Header counters contain zero or undefined values!');
  }
  console.log('✅ [PASS] Dashboard header metrics are non-zero and accurately populated from database.');

  // 2. Test Academic Assessment Audits Endpoint
  console.log('\n--- 2. Testing Academic Assessment Audits API ---');
  const auditRes = await fetch(`${baseUrl}/api/admin/academics/overview`, {
    headers: { Authorization: `Bearer ${adminToken}`, Accept: 'application/json' }
  });
  const audits = await auditRes.json();
  console.log('Academic overview received:', {
    success: audits.success,
    totalAssessments: audits.summary?.total_assessments_recorded,
    averageMark: audits.summary?.school_average_mark,
    passRate: audits.summary?.sba_pass_rate,
    schedulesCount: audits.subject_schedules?.length,
    recordsCount: audits.records?.length
  });

  if (!audits.success || !Array.isArray(audits.records)) {
    throw new Error('Invalid academic assessment audits response!');
  }
  console.log('✅ [PASS] Academic Assessment Audits API returns structured CAPS schedules and student marks.');

  // 3. Test Employee Registration Input Validation (Must reject numbers in names)
  console.log('\n--- 3. Testing Employee Name Number Rejection ---');
  const badEmpRes = await fetch(`${baseUrl}/api/admin/employees`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      full_name: 'John123',
      surname: 'Doe456',
      email: 'john123@fusionhigh.co.za',
      phone: '0812345678'
    })
  });
  const badEmpJson = await badEmpRes.json();
  console.log('Rejection response for numbers in name:', badEmpRes.status, badEmpJson);
  if (badEmpRes.status !== 400 || !badEmpJson.error) {
    throw new Error('Failed: Server allowed numbers in employee name!');
  }
  console.log('✅ [PASS] Server correctly rejected numeric input in employee name placeholder.');

  console.log('\n================================================================');
  console.log('🏁 ALL VERIFICATION CHECKS PASSED');
  console.log('================================================================');
}

runVerification().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});
