/**
 * Password resets no longer run automatically.
 * Earlier versions rewrote weak hashes and forced specific accounts to superadmin
 * every time the server started. That is disabled so existing credentials stay as stored.
 */
async function fixAllUserPasswords() {
    console.log('[AUTH FIX] Automatic password resets are disabled. Existing passwords were left unchanged.');
    return { updatedCount: 0, disabled: true };
}

module.exports = { fixAllUserPasswords };

if (require.main === module) {
    fixAllUserPasswords().then(() => process.exit(0)).catch(() => process.exit(1));
}
