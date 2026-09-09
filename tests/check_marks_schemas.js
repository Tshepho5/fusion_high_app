const { pool } = require('../db/db');

async function checkSchemas() {
    const tables = ['marks', 'grades', 'progress', 'assessments', 'assessment_results', 'report_cards'];
    for (const t of tables) {
        const r = await pool.query(
            "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position",
            [t]
        );
        console.log(`=== TABLE: ${t} ===`);
        console.table(r.rows);
    }
    await pool.end();
}

checkSchemas().catch(console.error);
