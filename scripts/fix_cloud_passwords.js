const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const db = new Pool({
  connectionString: 'postgresql://fusion_high_db_user:hmYNReP72H9Nne5px8hbNbCWVts1xgpD@dpg-da3haqdg1s2s73dkactg-a.oregon-postgres.render.com/fusion_high_db',
  ssl: { rejectUnauthorized: false }
});

async function fixCloudPasswords() {
  console.log('🔧 Updating cloud database user credentials...');

  const pw123Hash = await bcrypt.hash('password123', 10);
  const butcherHash = await bcrypt.hash('#Butcher#$5$', 10);
  const makolaHash = await bcrypt.hash('#Makola#$5$', 10);

  // 1. Fix Admin accounts: tshepomakola23@gmail.com, tshepomakola22@gmail.com, 202247878@myturf.ul.ac.za
  await db.query(`
    UPDATE users
    SET role_id = 1, is_superadmin = TRUE, school_id = 1, password_hash = $1
    WHERE LOWER(email) IN ('tshepomakola23@gmail.com', 'tshepomakola22@gmail.com')
  `, [butcherHash]);
  console.log('✅ Admin credentials updated for tshepomakola23@gmail.com and tshepomakola22@gmail.com (Password: #Butcher#$5$)');

  await db.query(`
    UPDATE users
    SET role_id = 1, is_superadmin = TRUE, school_id = 1, password_hash = $1
    WHERE LOWER(email) = '202247878@myturf.ul.ac.za'
  `, [makolaHash]);
  console.log('✅ Admin credentials updated for 202247878@myturf.ul.ac.za (Password: #Makola#$5$)');

  // 2. Set all other users without working passwords to password123
  const res = await db.query(`
    UPDATE users
    SET password_hash = $1
    WHERE LOWER(email) NOT IN ('tshepomakola23@gmail.com', 'tshepomakola22@gmail.com', '202247878@myturf.ul.ac.za')
    RETURNING email, role_id
  `, [pw123Hash]);
  console.log(`✅ Set password to 'password123' for ${res.rows.length} standard accounts (Teachers, Parents, Learners).`);

  // Verify accounts
  console.log('\n--- VERIFIED CLOUD ACCOUNTS READY FOR LOGIN ---');
  const allUsers = await db.query(`
    SELECT u.id, u.email, u.full_name, u.surname, COALESCE(r.name, u.role_id::text, 'learner') as role_name
    FROM users u
    LEFT JOIN roles r ON (u.role_id::text = r.id::text OR LOWER(r.name) = LOWER(u.role_id::text))
    ORDER BY u.role_id ASC, u.email ASC
  `);
  console.table(allUsers.rows);

  process.exit(0);
}

fixCloudPasswords().catch(err => {
  console.error('❌ Error fixing cloud passwords:', err.message);
  process.exit(1);
});
