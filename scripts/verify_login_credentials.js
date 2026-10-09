require('dotenv').config();
const db = require('../db/db');
const bcrypt = require('bcryptjs');

async function testCredentials() {
  console.log('--- TESTING CLOUD DATABASE USER CREDENTIALS ---');
  
  const testAccounts = [
    { label: 'SuperAdmin 1 (Makola)', email: 'admin@gelezasa.co.za', candidatePass: '#Makola#$5$' },
    { label: 'SuperAdmin 1 (pwd123)', email: 'admin@gelezasa.co.za', candidatePass: 'password123' },
    { label: 'SuperAdmin 2', email: '202247878@myturf.ul.ac.za', candidatePass: '#Makola#$5$' },
    { label: 'SuperAdmin 3', email: 'admin@fusionhigh.co.za', candidatePass: '#Makola#$5$' },
    { label: 'Admin (Exec)', email: 'exec@gelezasa.co.za', candidatePass: 'password123' },
    { label: 'Principal 1', email: 'principal@makgoka.co.za', candidatePass: 'password123' },
    { label: 'Principal 2', email: 'principal@mountainview.co.za', candidatePass: 'password123' },
    { label: 'Teacher (Science)', email: 'teacher.science@gelezasa.co.za', candidatePass: 'password123' },
    { label: 'Teacher (Commerce)', email: 'teacher.commerce@gelezasa.co.za', candidatePass: 'password123' },
    { label: 'Parent 1', email: 'parent.walters@gelezasa.co.za', candidatePass: 'password123' },
    { label: 'Parent 2', email: 'parent.modiba@gelezasa.co.za', candidatePass: 'password123' },
    { label: 'Learner 1', email: 'learner.walters@gelezasa.co.za', candidatePass: 'password123' },
    { label: 'Learner 2', email: 'learner.modiba@gelezasa.co.za', candidatePass: 'password123' }
  ];

  for (const acc of testAccounts) {
    try {
      const res = await db.query(
        `SELECT u.id, u.email, u.password_hash, u.is_superadmin, u.school_id, r.name as role_name 
         FROM users u 
         LEFT JOIN roles r ON u.role_id = r.id 
         WHERE LOWER(u.email) = LOWER($1) LIMIT 1`,
        [acc.email]
      );

      if (res.rows.length === 0) {
        console.log(`❌ [NOT FOUND] ${acc.label} (${acc.email}) not found in database.`);
        continue;
      }

      const user = res.rows[0];
      const match = await bcrypt.compare(acc.candidatePass, user.password_hash);
      
      if (match) {
        console.log(`✅ [LOGIN OK] ${acc.label} (${acc.email}) -> Role: ${user.role_name}, SuperAdmin: ${user.is_superadmin}, School: ${user.school_id}`);
      } else {
        console.log(`⚠️ [PASSWORD MISMATCH] ${acc.label} (${acc.email}) password "${acc.candidatePass}" failed bcrypt check.`);
      }
    } catch (err) {
      console.error(`💥 Error testing ${acc.email}:`, err.message);
    }
  }

  process.exit(0);
}

testCredentials().catch(e => {
  console.error(e);
  process.exit(1);
});
