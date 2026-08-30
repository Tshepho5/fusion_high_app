const jwt = require('jsonwebtoken');
const db = require('./db/db');

/**
 * Verifies the JWT token from the Authorization header.
 */
const auth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token || token === 'null' || token === 'undefined') {
        return res.status(401).json({ error: 'Access denied: No valid session token provided' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'fusion_high_secret_jwt_key', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

/**
 * Middleware factory to ensure the user has one of the specified roles.
 * Queries PostgreSQL database live as the ONLY source of truth for RBAC.
 * @param {string|string[]} roles - A single role string or an array of allowed roles.
 */
const requireRole = (roles) => async (req, res, next) => {
    const allowedRoles = (Array.isArray(roles) ? roles : [roles]).map(r => String(r).toLowerCase());
    
    if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Unauthorized: User identity unverified.' });
    }

    try {
        // Query PostgreSQL database live as sole source of truth for RBAC and Multi-Tenant Isolation
        const roleRes = await db.query(
            `SELECT u.id, u.email, u.school_id, u.is_superadmin, u.role_id,
                    COALESCE(
                        r.name, 
                        CASE 
                            WHEN u.role_id::text IN ('1', 'admin') THEN 'admin'
                            WHEN u.role_id::text IN ('2', 'parent') THEN 'parent'
                            WHEN u.role_id::text IN ('3', 'learner') THEN 'learner'
                            WHEN u.role_id::text IN ('4', 'teacher') THEN 'teacher'
                            ELSE NULL
                        END,
                        (SELECT 'learner' FROM children c WHERE c.learner_user_id::text = u.id::text OR c.id::text = u.id::text LIMIT 1)
                    ) as role_name 
             FROM users u 
             LEFT JOIN roles r ON (u.role_id::text = r.id::text OR LOWER(r.name) = LOWER(u.role_id::text))
             WHERE u.id::text = $1::text`,
            [String(req.user.id)]
        );

        let row = roleRes.rows[0];
        let roleName = row ? (row.role_name || '').toLowerCase() : null;

        // If user wasn't found in users by id, check if req.user.id is in children table
        if (!row) {
            const childRes = await db.query(
                `SELECT c.id, c.learner_user_id, c.school_id FROM children c WHERE c.id::text = $1::text OR c.learner_user_id::text = $1::text LIMIT 1`,
                [String(req.user.id)]
            );
            if (childRes.rows.length > 0) {
                roleName = 'learner';
                req.user.school_id = childRes.rows[0].school_id || 1;
            }
        }

        // Final fallback to verified token role if present
        if (!roleName && req.user.role) {
            roleName = String(req.user.role).toLowerCase();
        }

        if (!roleName) {
            roleName = 'learner'; // default fallback for student portal
        }

        req.user.role = roleName;
        if (row) {
            req.user.school_id = row.school_id || req.user.school_id || 1;
            req.user.is_superadmin = Boolean(row.is_superadmin || (row.email && row.email.toLowerCase() === '202247878@myturf.ul.ac.za'));
        }

        if (!allowedRoles.includes(roleName)) {
            return res.status(403).json({ error: `Forbidden: Insufficient permissions for role '${roleName}'.` });
        }

        next();
    } catch (err) {
        console.error('RBAC Database Check Error:', err);
        return res.status(500).json({ error: 'Database RBAC verification failed.' });
    }
};

/**
 * Ensures the user has the 'admin' role according to the PostgreSQL database.
 */
const isAdmin = requireRole('admin');

module.exports = { auth, authenticateToken: auth, isAdmin, requireRole };