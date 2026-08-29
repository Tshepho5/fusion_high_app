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
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Unauthorized: User identity unverified.' });
    }

    try {
        // Query PostgreSQL database live as sole source of truth for RBAC
        const roleRes = await db.query(
            `SELECT r.name as role_name 
             FROM users u 
             LEFT JOIN roles r ON (u.role_id::text = r.id::text OR LOWER(r.name) = LOWER(u.role_id::text))
             WHERE u.id::text = $1::text`,
            [String(req.user.id)]
        );

        if (roleRes.rows.length === 0) {
            return res.status(401).json({ error: 'Unauthorized: User account not found in database.' });
        }

        const dbRole = roleRes.rows[0].role_name;
        req.user.role = dbRole; // Enforce live role from PostgreSQL database

        if (!allowedRoles.includes(dbRole)) {
            return res.status(403).json({ error: `Forbidden: Insufficient permissions for role '${dbRole}'.` });
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