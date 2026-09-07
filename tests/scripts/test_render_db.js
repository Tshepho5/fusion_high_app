const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const db = new Pool({
  connectionString: 'postgresql://fusion_high_db_user:hmYNReP72H9Nne5px8hbNbCWVts1xgpD@dpg-da3haqdg1s2s73dkactg-a.oregon-postgres.render.com/fusion_high_db',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const email = 'tshepomakola23@gmail.com';
  const password = '#Butcher#$5$';

  const selectCols = `
    u.id, u.email, u.password_hash, u.id_number::text as id_number, u.phone::text as phone, u.full_name, u.surname, 
    u.is_superadmin,
    COALESCE(u.school_id, c.school_id, 1) as school_id,
    COALESCE(r.name, u.role_id::text, 'learner') as role_name,
    c.id as child_id, c.learner_number::text as learner_number, c.grade, c.stream
  `;

  const query = `
    SELECT ${selectCols}
    FROM users u
    LEFT JOIN roles r ON (u.role_id::text = r.id::text OR LOWER(r.name) = LOWER(u.role_id::text))
    LEFT JOIN children c ON (c.learner_user_id::text = u.id::text)
    WHERE LOWER(u.email::text) = LOWER($1)
       OR (c.learner_number IS NOT NULL AND LOWER(c.learner_number::text) = LOWER(SPLIT_PART($1, '@', 1)))
       OR (LOWER(SPLIT_PART(u.email::text, '@', 1)) = LOWER(SPLIT_PART($1, '@', 1)))
       OR (LOWER($1) IN ('admin@fusionhigh.co.za', 'admin@fusion.high') AND LOWER(COALESCE(r.name, u.role_id::text, '')) = 'admin')
    ORDER BY (CASE WHEN LOWER(u.email::text) = LOWER($1) THEN 0 
                   WHEN (c.learner_number IS NOT NULL AND LOWER(c.learner_number::text) = LOWER(SPLIT_PART($1, '@', 1))) THEN 1
                   ELSE 2 END), u.id ASC
    LIMIT 1
  `;

  const { rows } = await db.query(query, [email]);
  console.log('Result count:', rows.length);
  if (rows.length > 0) {
    const u = rows[0];
    console.log('User found:', { id: u.id, email: u.email, role_name: u.role_name, is_superadmin: u.is_superadmin });
    const match = await bcrypt.compare(password, u.password_hash);
    console.log('Password match:', match);
  }
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
