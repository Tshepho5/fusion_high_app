const db = require('./db');

async function migrateParentApplicationsTwins() {
    try {
        console.log('[MIGRATION] Updating parent_portal_applications schema for twins / multiple learners / optional linking...');

        await db.query(`
            -- Make legacy child fields optional (nullable)
            ALTER TABLE parent_portal_applications ALTER COLUMN child_first_name DROP NOT NULL;
            ALTER TABLE parent_portal_applications ALTER COLUMN child_surname DROP NOT NULL;
            ALTER TABLE parent_portal_applications ALTER COLUMN child_id_number DROP NOT NULL;
            ALTER TABLE parent_portal_applications ALTER COLUMN child_grade DROP NOT NULL;

            -- Add JSONB array for multiple children (twins, siblings, etc.)
            ALTER TABLE parent_portal_applications ADD COLUMN IF NOT EXISTS children_details JSONB DEFAULT '[]'::jsonb;
            ALTER TABLE parent_portal_applications ADD COLUMN IF NOT EXISTS is_twins_or_multiple BOOLEAN DEFAULT FALSE;
            ALTER TABLE parent_portal_applications ADD COLUMN IF NOT EXISTS num_children INTEGER DEFAULT 1;

            -- Populate existing rows where children_details is empty
            UPDATE parent_portal_applications
            SET children_details = jsonb_build_array(
                jsonb_build_object(
                    'firstName', child_first_name,
                    'surname', child_surname,
                    'idNumber', child_id_number,
                    'grade', child_grade,
                    'stream', child_stream,
                    'isTwin', false
                )
            ),
            num_children = 1
            WHERE (children_details IS NULL OR children_details = '[]'::jsonb) AND child_first_name IS NOT NULL;
        `);

        console.log('[MIGRATION SUCCESS] parent_portal_applications schema updated successfully for twins and multiple learners.');
    } catch (err) {
        console.error('[MIGRATION ERROR]', err.message);
        throw err;
    }
}

if (require.main === module) {
    migrateParentApplicationsTwins()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = { migrateParentApplicationsTwins };
