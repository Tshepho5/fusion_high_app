const db = require('../db/db');

async function checkCols() {
    const res = await db.query(`SELECT column_name, is_nullable, column_default, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position`);
    console.log('Columns of users table:');
    console.table(res.rows);
    process.exit(0);
}

checkCols();
