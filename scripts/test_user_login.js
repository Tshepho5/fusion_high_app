const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const db = new Pool({
  connectionString: 'postgresql://fusion_high_db_user:hmYNReP72H9Nne5px8hbNbCWVts1xgpD@dpg-da3haqdg1s2s73dkactg-a.oregon-postgres.render.com/fusion_high_db',
  ssl: { rejectUnauthorized: false }
});

async function testLogin(rawIdentifier, rawPassword) {
  const selectCols = `
    u.id, u.email, u.password_hash, u.id_number::text as id_number, u.phone::text as phone, u.full_name, u.surname, 
    u.is_superadmin,
    COALESCE(u.school_id, c.school_id, 1) as school_id,
    COALESCE(r.name, u.role_id::text, 'learner') as role_name,
    c.id as child_id, c.learner_number::text as learner_number, c.grade, c.stream
  `;

  const result = await db.query(
    `SELECT ${selectCols}
     FROM users u
     LEFT JOIN roles r ON (u.role_id::text = r.id::text OR LOWER(r.name) = LOWER(u.role_id::text))
     LEFT JOIN children c ON (c.learner_user_id::text = u.id::text)
     WHERE LOWER(u.email::text) = LOWER($1)
        OR (c.learner_number IS NOT NULL AND LOWER(c.learner_number::text) = LOWER(SPLIT_PART($1, '@', 1)))
        OR (LOWER(SPLIT_PART(u.email::text, '@', 1)) = LOWER(SPLIT_PART($1, '@', 1)))
     ORDER BY (CASE WHEN LOWER(u.email::text) = LOWER($1) THEN 0 ELSE 1 END), u.id ASC
     LIMIT 1`,
    [rawIdentifier]
  );

  if (result.rows.length === 0) {
    console.log('No user found for identifier:', rawIdentifier);
    return;
  }

  const user = result.rows[0];
  console.log('User matched:', user.email, 'id:', user.id, 'role_name:', user.role_name);
  const pwMatch = await bcrypt.compare(rawPassword, user.password_hash);
  console.log('Password comparison result for', rawPassword, ':', pwMatch);
}

async function run() {
  await testLogin('tshepomakola23@gmail.com', '#Butcher#$5$');
  await testLogin('tshepomakola22@gmail.com', '#Butcher#$5$');
  await testLogin('202247878@myturf.ul.ac.za', '#Makola#$5$');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
