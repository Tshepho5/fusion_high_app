const db = require('./db');

async function migrateMessagesSchema() {
    console.log('[MIGRATION] Checking and updating messages table schema...');
    try {
        await db.query(`
            ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;
            ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(255);
            ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(50);
            ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_size VARCHAR(50);
            ALTER TABLE messages ADD COLUMN IF NOT EXISTS voice_duration INTEGER;
        `);
        console.log('[MIGRATION] ✅ messages table schema updated successfully with attachment and voice note columns.');
    } catch (err) {
        console.error('[MIGRATION ERROR] Failed to update messages table schema:', err.message);
        throw err;
    }
}

module.exports = migrateMessagesSchema;

if (require.main === module) {
    migrateMessagesSchema().then(() => process.exit(0)).catch(() => process.exit(1));
}
