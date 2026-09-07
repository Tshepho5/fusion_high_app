const db = require('../db/db');

async function auditDatabase() {
  console.log('================================================================');
  console.log('          DATABASE SCHEMA AND DATA INTEGRITY AUDIT              ');
  console.log('================================================================\n');

  try {
    // 1. Get all public tables
    const tablesRes = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log(`Found ${tablesRes.rows.length} tables in PostgreSQL database:`);
    for (const row of tablesRes.rows) {
      const tName = row.table_name;
      const countRes = await db.query(`SELECT COUNT(*) as count FROM "${tName}"`);
      const colsRes = await db.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `, [tName]);

      const colsList = colsRes.rows.map(c => `${c.column_name} (${c.data_type})`).join(', ');
      console.log(`\n Table: "${tName}" (Rows: ${countRes.rows[0].count})`);
      console.log(`   Columns: ${colsList}`);
    }

  } catch (err) {
    console.error('Database audit error:', err);
  } finally {
    process.exit(0);
  }
}

auditDatabase();
