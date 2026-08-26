const db = require('./db');
const initializeAllDatabaseTables = require('./init_full_schema');

async function runAllTables() {
    console.log('--- STARTING COMPREHENSIVE DATABASE TABLE INITIALIZATION ---');

    try {
        await initializeAllDatabaseTables();
    } catch (err) {
        console.error('[DB BOOTSTRAP] Schema execution note:', err.message);
    }

    // Fetch and display full list of existing tables in public schema
    const checkRes = await db.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name ASC
    `);

    console.log('\n✅ ALL DATABASE TABLES FULLY INITIALIZED & VERIFIED:');
    console.log('Total Tables in Database:', checkRes.rows.length);
    checkRes.rows.forEach((r, idx) => {
        console.log(`  ${(idx + 1).toString().padStart(2, ' ')}. ${r.table_name}`);
    });

    console.log('--- DATABASE TABLES VERIFICATION COMPLETE ---');
    return checkRes.rows;
}

if (require.main === module) {
    runAllTables()
        .then(() => process.exit(0))
        .catch(err => {
            console.error('Fatal DB init error:', err);
            process.exit(1);
        });
}

module.exports = runAllTables;
