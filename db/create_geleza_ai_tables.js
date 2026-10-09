const db = require('./db');

async function createGelezaAiTables() {
    console.log('[DB MIGRATION] Initializing Geleza AI universal conversations & messages tables...');
    try {
        let userIdType = 'INTEGER';
        try {
            const colRes = await db.query(`
                SELECT data_type 
                FROM information_schema.columns 
                WHERE table_name = 'users' AND column_name = 'id' 
                LIMIT 1
            `);
            if (colRes.rows.length > 0) {
                const dt = colRes.rows[0].data_type.toLowerCase();
                if (dt.includes('text') || dt.includes('char') || dt.includes('varchar')) {
                    userIdType = 'TEXT';
                }
            }
        } catch (_) {}

        await db.query(`
            CREATE TABLE IF NOT EXISTS geleza_ai_conversations (
                id SERIAL PRIMARY KEY,
                user_id ${userIdType} NULL,
                role VARCHAR(50) NOT NULL DEFAULT 'learner',
                school_id INTEGER NULL,
                module VARCHAR(50) NOT NULL DEFAULT 'chat',
                title VARCHAR(255) DEFAULT 'New Conversation',
                context_data JSONB DEFAULT '{}',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS geleza_ai_messages (
                id SERIAL PRIMARY KEY,
                conversation_id INTEGER NOT NULL REFERENCES geleza_ai_conversations(id) ON DELETE CASCADE,
                sender VARCHAR(20) NOT NULL CHECK (sender IN ('user', 'assistant', 'system', 'tool')),
                content TEXT NOT NULL,
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS geleza_ai_feedback (
                id SERIAL PRIMARY KEY,
                message_id INTEGER REFERENCES geleza_ai_messages(id) ON DELETE CASCADE,
                user_id ${userIdType} NULL,
                rating VARCHAR(10) CHECK (rating IN ('up', 'down')),
                feedback_text TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_geleza_ai_conv_user ON geleza_ai_conversations(user_id, role);
            CREATE INDEX IF NOT EXISTS idx_geleza_ai_conv_school ON geleza_ai_conversations(school_id);
            CREATE INDEX IF NOT EXISTS idx_geleza_ai_conv_updated ON geleza_ai_conversations(updated_at DESC);
            CREATE INDEX IF NOT EXISTS idx_geleza_ai_msg_conv ON geleza_ai_messages(conversation_id, created_at ASC);
        `);
        console.log('[DB MIGRATION] ✅ Geleza AI tables and indexes verified successfully.');
    } catch (err) {
        console.error('[DB MIGRATION ERROR] Failed to initialize Geleza AI tables:', err.message);
        throw err;
    }
}

if (require.main === module) {
    createGelezaAiTables()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = createGelezaAiTables;
