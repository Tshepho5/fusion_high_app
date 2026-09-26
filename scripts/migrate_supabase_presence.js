const { Pool } = require('pg');

const supabaseConnectionString = process.env.SUPABASE_DATABASE_URL || 
  'postgresql://postgres:%23Butcher%23%245%24@db.kmcipnycnqndcajwxpmj.supabase.co:5432/postgres';

async function migrateSupabase() {
  console.log('Connecting to remote Supabase database...');
  const pool = new Pool({
    connectionString: supabaseConnectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  });

  try {
    const res = await pool.query('SELECT NOW() as now;');
    console.log('Connected to Supabase! Current DB time:', res.rows[0].now);

    console.log('Adding presence columns to remote users table...');
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE;
      UPDATE users SET last_seen_at = CURRENT_TIMESTAMP WHERE last_seen_at IS NULL;
    `);
    console.log('✓ Successfully added last_seen_at and is_online to remote Supabase users table!');

    // Also verify schools table has offered_languages, bank details etc.
    await pool.query(`
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS offered_languages TEXT[] DEFAULT ARRAY['English', 'Sepedi', 'isiZulu'];
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS offered_subjects TEXT[];
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100) DEFAULT 'First National Bank (FNB)';
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS account_holder VARCHAR(255) DEFAULT 'School Admissions';
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS account_number VARCHAR(50) DEFAULT '62849102841';
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS branch_code VARCHAR(20) DEFAULT '250655';
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS account_type VARCHAR(50) DEFAULT 'Cheque / Current';
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS application_fee NUMERIC(10,2) DEFAULT 250.00;
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS registration_fee NUMERIC(10,2) DEFAULT 1500.00;
    `);
    console.log('✓ Successfully verified remote schools table columns.');

  } catch (err) {
    console.error('Supabase migration error:', err.message);
  } finally {
    await pool.end();
  }
}

migrateSupabase();
