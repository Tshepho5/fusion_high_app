const fs = require('fs');
const path = require('path');
const db = require('../db/db');

async function runSchema() {
  console.log('[DB] Reading schema.sql...');
  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  console.log('[DB] Executing entire schema.sql...');
  try {
    await db.query(sql);
    console.log('✅ [SUCCESS] entire schema.sql executed directly without errors!');
  } catch (err) {
    console.error('❌ [ERROR] Executing schema.sql:', err.message);
  }

  // Count all tables
  const tablesRes = await db.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name ASC;
  `);

  console.log(`\n[ACTIVE DATABASE TABLES in FUSION_DB: ${tablesRes.rows.length} Total]:`);
  console.table(tablesRes.rows);

  const usersCount = await db.query('SELECT COUNT(*) FROM users;');
  const childrenCount = await db.query('SELECT COUNT(*) FROM children;');
  const employeesCount = await db.query('SELECT COUNT(*) FROM employees;');
  const classesCount = await db.query('SELECT COUNT(*) FROM classes;');
  const subjectsCount = await db.query('SELECT COUNT(*) FROM subjects;');

  console.log('\n[RECORD AUDIT]:');
  console.log(`  Users:      ${usersCount.rows[0].count}`);
  console.log(`  Children:   ${childrenCount.rows[0].count}`);
  console.log(`  Employees:  ${employeesCount.rows[0].count}`);
  console.log(`  Classes:    ${classesCount.rows[0].count}`);
  console.log(`  Subjects:   ${subjectsCount.rows[0].count}`);

  process.exit(0);
}

runSchema().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
