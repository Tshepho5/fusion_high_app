/**
 * Decide which portal role a signed-in account may use.
 * A missing role is denied. Learner access is only granted when the
 * account is actually linked to a learner record.
 */
function resolveVerifiedRole({ dbRole, tokenRole, matchedChild } = {}) {
    const fromDb = dbRole ? String(dbRole).toLowerCase().trim() : '';
    if (fromDb) return fromDb;
    if (matchedChild) return 'learner';
    const fromToken = tokenRole ? String(tokenRole).toLowerCase().trim() : '';
    return fromToken || null;
}

module.exports = { resolveVerifiedRole };
