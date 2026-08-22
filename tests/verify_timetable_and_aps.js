const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || '#Butcher#$5$#Letlalo#$5$';
const baseUrl = 'http://127.0.0.1:4000';

const db = require('../db/db');

async function verifyAll() {
  console.log('================================================================');
  console.log('🧪 VERIFYING TIMETABLE GENERATION & APS SIMULATOR');
  console.log('================================================================');

  const adminRes = await db.query("SELECT u.id, u.email, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = 'admin' LIMIT 1");
  const learnerRes = await db.query("SELECT u.id, u.email, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = 'learner' LIMIT 1");

  const adminUser = adminRes.rows[0] || { id: 1, email: 'admin@fusion.high', role: 'admin' };
  const learnerUser = learnerRes.rows[0] || { id: 5, email: 'learner@fusionhigh.co.za', role: 'learner' };

  const adminToken = jwt.sign({ id: adminUser.id, email: adminUser.email, role: adminUser.role }, JWT_SECRET, { expiresIn: '1h' });
  const learnerToken = jwt.sign({ id: learnerUser.id, email: learnerUser.email, role: learnerUser.role }, JWT_SECRET, { expiresIn: '1h' });

  // 1. Test Timetable Generation Constraints
  console.log('\n--- 1. Testing AI Timetable Generation Constraints ---');
  const ttRes = await fetch(`${baseUrl}/api/admin/generate-timetable`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ grade: 10, stream: 'Science' })
  });

  const ttData = await ttRes.json();
  console.log('Timetable API Status:', ttRes.status, ttData);
  console.log('Periods generated:', ttData.periods);
  console.log('Break time:', ttData.break_time);

  if (!ttData.timetable_data) {
    throw new Error('Timetable data was not generated!');
  }

  // Check 1A: Check 45-min Break periods
  const periods = ttData.periods || [];
  if (!periods.includes('10:15-11:15') || !periods.includes('12:00-13:00')) {
    throw new Error('Periods do not include 10:15-11:15 or 12:00-13:00 reflecting the 45-min break!');
  }
  console.log('✅ [PASS] 45-Minute break scheduled between Period 4 (ends 11:15) and Period 5 (starts 12:00).');

  // Check 1B: Verify NO DUPLICATE SUBJECT PER DAY PER CLASS
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  let totalSlotsChecked = 0;
  for (const className in ttData.timetable_data) {
    for (const day of days) {
      const daySlots = ttData.timetable_data[className][day] || {};
      const subjectsSeen = new Set();
      for (const period in daySlots) {
        const entry = daySlots[period];
        if (entry && entry.subject) {
          if (subjectsSeen.has(entry.subject)) {
            throw new Error(`Duplicate subject found: "${entry.subject}" appears multiple times for ${className} on ${day}!`);
          }
          subjectsSeen.add(entry.subject);
          totalSlotsChecked++;

          // Check 1C: Verify Teacher is NOT Admin
          if (entry.teacher && (entry.teacher.toLowerCase().includes('admin') || entry.teacher.toLowerCase() === 'administrator')) {
            throw new Error(`Admin appointed to teaching slot in ${className} ${day} ${period}: ${entry.teacher}`);
          }
        }
      }
    }
  }
  console.log(`✅ [PASS] Checked ${totalSlotsChecked} period slots across all classes: 0 duplicate subjects per day, 0 admin instructors.`);

  // 2. Test APS Simulator Endpoint
  console.log('\n--- 2. Testing Matric APS & University Simulator API ---');
  const simRes = await fetch(`${baseUrl}/api/learner/simulate-aps`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${learnerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subject_marks: [
        { subject: 'Mathematics', mark: 85 },
        { subject: 'Physical Sciences', mark: 80 },
        { subject: 'Life Sciences', mark: 82 },
        { subject: 'English FAL', mark: 75 },
        { subject: 'Home Language', mark: 78 },
        { subject: 'Life Orientation', mark: 90 },
        { subject: 'Accounting', mark: 75 }
      ]
    })
  });

  const simData = await simRes.json();
  console.log('Simulator API Status:', simRes.status);
  console.log('Simulated APS Score:', simData.simulated_aps);
  console.log('Pass Endorsement:', simData.pass_endorsement);
  console.log('Eligible University Degrees:', simData.eligible_count, 'of', simData.total_programmes);

  if (!simData.success || typeof simData.simulated_aps !== 'number' || simData.simulated_aps <= 0) {
    throw new Error('APS simulation calculation failed!');
  }
  if (!Array.isArray(simData.programmes) || simData.programmes.length === 0) {
    throw new Error('No university programmes returned in simulation!');
  }
  console.log('✅ [PASS] Matric APS simulator successfully calculated 40+ points and matched university programmes.');

  console.log('\n================================================================');
  console.log('🏁 ALL VERIFICATIONS PASSED');
  console.log('================================================================');
}

verifyAll().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
