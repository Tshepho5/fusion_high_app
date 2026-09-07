const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const p = new Pool({
  connectionString: 'postgresql://fusion_high_db_user:hmYNReP72H9Nne5px8hbNbCWVts1xgpD@dpg-da3haqdg1s2s73dkactg-a.oregon-postgres.render.com/fusion_high_db',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const r = await p.query('SELECT id, email, full_name, password_hash, role_id FROM users');
  console.log('Total users in cloud DB:', r.rows.length);
  for (const u of r.rows) {
    const isPw123 = await bcrypt.compare('password123', u.password_hash || '');
    const isMakola = await bcrypt.compare('#Makola#$5$', u.password_hash || '');
    const isButcher = await bcrypt.compare('#Butcher#$5$', u.password_hash || '');
    console.log(`User: ${u.email} (role: ${u.role_id}) -> password123: ${isPw123}, #Makola#$5$: ${isMakola}, #Butcher#$5$: ${isButcher}`);
  }
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
