const db = require('./db');

async function createAiConversationsTables() {
    console.log('[DB MIGRATION] Initializing AI Tutor Conversations & Messages tables...');
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS learner_ai_conversations (
                id SERIAL PRIMARY KEY,
                learner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                subject_name VARCHAR(100) NOT NULL,
                grade INTEGER NOT NULL,
                stream VARCHAR(50) DEFAULT 'General',
                topic VARCHAR(255) DEFAULT 'General Subject Help',
                title VARCHAR(255) DEFAULT 'New Consultation',
                language VARCHAR(50) DEFAULT 'english',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS learner_ai_messages (
                id SERIAL PRIMARY KEY,
                conversation_id INTEGER NOT NULL REFERENCES learner_ai_conversations(id) ON DELETE CASCADE,
                sender VARCHAR(10) NOT NULL CHECK (sender IN ('user', 'ai', 'system')),
                message_text TEXT NOT NULL,
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_ai_conv_learner_subject ON learner_ai_conversations(learner_user_id, subject_name);
            CREATE INDEX IF NOT EXISTS idx_ai_conv_updated ON learner_ai_conversations(updated_at DESC);
            CREATE INDEX IF NOT EXISTS idx_ai_msg_conv_id ON learner_ai_messages(conversation_id, created_at ASC);
        `);
        console.log('[DB MIGRATION] ✅ learner_ai_conversations and learner_ai_messages tables verified successfully.');
    } catch (err) {
        console.error('[DB MIGRATION ERROR] Failed to create AI conversation tables:', err);
        throw err;
    }
}

if (require.main === module) {
    createAiConversationsTables()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = createAiConversationsTables;
