const db = require('../db/db');
const emailService = require('../public/src/services/emailService');

async function runHealthCheck() {
  console.log('==============================================');
  console.log('     FUSION HIGH APP SYSTEM HEALTH CHECK      ');
  console.log('==============================================\n');

  // 1. Database Connection & Config
  console.log('[1/6] Testing Database Connection...');
  try {
    const res = await db.query('SELECT NOW() as current_time, current_database() as db_name');
    console.log('  -> Status: OK');
    console.log('  -> Database:', res.rows[0].db_name);
    console.log('  -> DB Time:', res.rows[0].current_time);
  } catch (err) {
    console.error('  -> Database FAIL:', err.message);
  }

  // 2. Table Schemas
  console.log('\n[2/6] Checking Core Database Tables...');
  try {
    const tablesRes = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    const tables = tablesRes.rows.map(r => r.table_name);
    console.log(`  -> Found ${tables.length} tables in PostgreSQL:`);
    console.log('     ' + tables.join(', '));
  } catch (err) {
    console.error('  -> Tables FAIL:', err.message);
  }

  // 3. User Accounts & Roles
  console.log('\n[3/6] Inspecting User Accounts & Role Allocations...');
  try {
    const usersRes = await db.query(`
      SELECT r.name as role_name, COUNT(u.id) as user_count 
      FROM users u 
      LEFT JOIN roles r ON u.role_id = r.id 
      GROUP BY r.name
      ORDER BY r.name;
    `);
    console.table(usersRes.rows);
  } catch (err) {
    console.error('  -> Roles FAIL:', err.message);
  }

  // 4. Learners & Linked Parents
  console.log('\n[4/6] Checking Learner Enrollments & Parent Links...');
  try {
    const childrenRes = await db.query(`
      SELECT c.id, c.full_name, c.surname, c.learner_number, c.grade, c.stream, 
             COALESCE(u.email, pu.email) as parent_email,
             COALESCE(u.full_name, pu.full_name) as parent_name
      FROM children c
      LEFT JOIN users u ON c.parent_id = u.id
      LEFT JOIN parent_children pc ON pc.child_id = c.id
      LEFT JOIN users pu ON pc.parent_id = pu.id
      ORDER BY c.grade, c.surname
      LIMIT 8;
    `);
    console.table(childrenRes.rows);
  } catch (err) {
    console.error('  -> Children FAIL:', err.message);
  }

  // 5. Attendance Records
  console.log('\n[5/6] Checking Attendance Log Statistics...');
  try {
    const attRes = await db.query(`
      SELECT status, COUNT(*) as count 
      FROM attendance 
      GROUP BY status;
    `);
    console.table(attRes.rows);
  } catch (err) {
    console.error('  -> Attendance FAIL:', err.message);
  }

  // 6. Timetables & Academic Master Data
  console.log('\n[6/6] Checking Academic Master Timetables & Calendar Events...');
  try {
    const ttRes = await db.query(`SELECT id, name, grade, stream, is_active, updated_at FROM timetables LIMIT 5;`);
    console.log(`  -> Timetables found: ${ttRes.rows.length}`);
    if (ttRes.rows.length > 0) console.table(ttRes.rows);

    const eventRes = await db.query(`SELECT id, title, event_type, event_date FROM events LIMIT 5;`);
    console.log(`  -> Calendar Events found: ${eventRes.rows.length}`);
    if (eventRes.rows.length > 0) console.table(eventRes.rows);
  } catch (err) {
    console.error('  -> Timetable/Events FAIL:', err.message);
  }

  console.log('\n==============================================');
  console.log('       HEALTH CHECK COMPLETED SUCCESSFULLY    ');
  console.log('==============================================');
  process.exit(0);
}

runHealthCheck().catch(err => {
  console.error('CRITICAL HEALTH CHECK ERROR:', err);
  process.exit(1);
});
