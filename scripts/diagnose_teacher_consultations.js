const db = require('../db/db');

async function diagnose() {
    console.log('--- DIAGNOSING TEACHER_CONSULTATIONS & RELATED TABLES ---');

    // 1. Column types
    const cols = await db.query(`
        SELECT table_name, column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name IN ('teacher_consultations', 'users', 'children', 'employees') 
        ORDER BY table_name, ordinal_position;
    `);
    console.table(cols.rows);

    // 2. Constraints on teacher_consultations
    const constraints = await db.query(`
        SELECT 
            con.conname AS constraint_name,
            con.contype AS constraint_type,
            cl.relname AS table_name,
            ref_cl.relname AS referenced_table
        FROM pg_constraint con
        JOIN pg_class cl ON con.conrelid = cl.oid
        LEFT JOIN pg_class ref_cl ON con.confrelid = ref_cl.oid
        WHERE cl.relname = 'teacher_consultations';
    `);
    console.log('\nExisting Constraints on teacher_consultations:');
    console.table(constraints.rows);

    // 3. Test insert and query on teacher_consultations
    console.log('\nTesting query on teacher_consultations:');
    const qRes = await db.query('SELECT * FROM teacher_consultations LIMIT 5');
    console.log('Query success! Row count:', qRes.rows.length);

    console.log('--- DIAGNOSIS COMPLETE ---');
    process.exit(0);
}

diagnose().catch(err => {
    console.error('Diagnosis error:', err);
    process.exit(1);
});
