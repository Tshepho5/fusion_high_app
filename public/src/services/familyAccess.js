const db = require('../../../db/db');

/**
 * Loads the caller's role from PostgreSQL. The database is the source of truth.
 */
async function loadActor(user) {
    if (!user || user.id === undefined || user.id === null) return null;

    const roleRes = await db.query(
        `SELECT u.id, u.is_superadmin,
                COALESCE(
                    r.name,
                    CASE
                        WHEN u.role_id::text IN ('1', 'admin') THEN 'admin'
                        WHEN u.role_id::text IN ('2', 'parent') THEN 'parent'
                        WHEN u.role_id::text IN ('3', 'learner') THEN 'learner'
                        WHEN u.role_id::text IN ('4', 'teacher') THEN 'teacher'
                        ELSE NULL
                    END
                ) AS role_name
         FROM users u
         LEFT JOIN roles r ON (u.role_id::text = r.id::text OR LOWER(r.name) = LOWER(u.role_id::text))
         WHERE u.id::text = $1::text
         LIMIT 1`,
        [String(user.id)]
    );

    if (roleRes.rows[0]) {
        return {
            id: roleRes.rows[0].id,
            role: String(roleRes.rows[0].role_name || '').toLowerCase(),
            is_superadmin: Boolean(roleRes.rows[0].is_superadmin)
        };
    }

    const childRes = await db.query(
        `SELECT id FROM children WHERE id::text = $1::text OR learner_user_id::text = $1::text LIMIT 1`,
        [String(user.id)]
    );
    if (childRes.rows[0]) {
        return { id: user.id, role: 'learner', is_superadmin: false };
    }

    return null;
}

/**
 * Parents and learners may only open a child linked to their own account.
 * Admins and teachers keep staff access for class and report workflows.
 */
async function canAccessChild(user, childId) {
    const numericChildId = parseInt(childId, 10);
    if (!numericChildId) return false;

    const actor = await loadActor(user);
    if (!actor || !actor.role) return false;
    if (actor.role === 'admin' || actor.role === 'teacher' || actor.is_superadmin) return true;

    if (actor.role === 'learner') {
        const own = await db.query(
            `SELECT 1 FROM children
             WHERE id = $1 AND (learner_user_id::text = $2::text OR id::text = $2::text)
             LIMIT 1`,
            [numericChildId, String(actor.id)]
        );
        return own.rows.length > 0;
    }

    if (actor.role === 'parent') {
        const linked = await db.query(
            `SELECT 1
             FROM children c
             LEFT JOIN parent_children pc
               ON pc.child_id = c.id AND pc.parent_id::text = $2::text
             WHERE c.id = $1
               AND (
                 c.parent_id::text = $2::text
                 OR c.secondary_parent_id::text = $2::text
                 OR pc.parent_id IS NOT NULL
               )
             LIMIT 1`,
            [numericChildId, String(actor.id)]
        );
        return linked.rows.length > 0;
    }

    return false;
}

async function assertChildAccess(req, res, childId) {
    const allowed = await canAccessChild(req.user, childId);
    if (!allowed) {
        res.status(403).json({ error: 'You can only open records for your own family.' });
        return false;
    }
    return true;
}

async function canAccessInvoice(user, invoice) {
    if (!invoice) return false;
    const actor = await loadActor(user);
    if (!actor || !actor.role) return false;
    if (actor.role === 'admin' || actor.is_superadmin) return true;
    if (actor.role === 'parent' && invoice.parent_id && String(invoice.parent_id) === String(actor.id)) {
        return true;
    }
    if (!invoice.learner_id) return false;
    return canAccessChild(user, invoice.learner_id);
}

module.exports = {
    loadActor,
    canAccessChild,
    assertChildAccess,
    canAccessInvoice
};
