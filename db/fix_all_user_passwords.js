const db = require('./db');
const bcrypt = require('bcryptjs');

/**
 * Ensures all users in the database have valid, working bcrypt password hashes.
 * If a user has an invalid/dummy seed hash (e.g. from schema.sql placeholders),
 * it resets their hash to a standard valid bcrypt hash of 'password123'.
 */
async function fixAllUserPasswords() {
    try {
        console.log('[AUTH FIX] Verifying all user password hashes in database...');
        const res = await db.query('SELECT id, email, password_hash, id_number, role_id FROM users');
        const defaultHash = await bcrypt.hash('password123', 10);
        let updatedCount = 0;

        for (const user of res.rows) {
            let needsUpdate = false;

            // Check if hash is missing, malformed, or a known schema.sql placeholder
            if (!user.password_hash || !user.password_hash.startsWith('$2')) {
                needsUpdate = true;
            } else if (
                user.password_hash.includes('ABcdeu7i9') || // Known dummy salt in schema.sql
                user.password_hash.length < 50
            ) {
                needsUpdate = true;
            }

            if (needsUpdate) {
                // If user has an ID number, we can use their ID number or default 'password123'
                await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [defaultHash, user.id]);
                updatedCount++;
            }
        }

        console.log(`[AUTH FIX] Password verification complete. Updated ${updatedCount} users to working bcrypt hashes.`);
    } catch (err) {
        console.error('[AUTH FIX ERROR] Failed to verify user passwords:', err.message);
    }
}

module.exports = { fixAllUserPasswords };

if (require.main === module) {
    fixAllUserPasswords().then(() => process.exit(0)).catch(() => process.exit(1));
}
