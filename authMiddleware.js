const jwt = require('jsonwebtoken');
const db = require('./db/db');
const { resolveVerifiedRole } = require('./utils/resolveVerifiedRole');

const SESSION_COOKIE = 'geleza_session';

const sessionCookieOptions = () => ({
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
});

function readSessionToken(req) {
    const raw = req.headers.cookie;
    if (!raw) return null;
    for (const part of raw.split(';')) {
        const idx = part.indexOf('=');
        if (idx === -1) continue;
        if (part.slice(0, idx).trim() !== SESSION_COOKIE) continue;
        const value = part.slice(idx + 1).trim();
        try {
            return decodeURIComponent(value);
        } catch (_) {
            return value;
        }
    }
    return null;
}

function attachSessionCookie(res, token) {
    if (token) res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
}

function clearSessionCookie(res) {
    res.clearCookie(SESSION_COOKIE, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
    });
}

/**
 * Verifies the JWT from the Authorization header or the sign-in cookie.
 */
const auth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const bearer = authHeader && authHeader.split(' ')[1];
    const token = (bearer && bearer !== 'null' && bearer !== 'undefined') ? bearer : readSessionToken(req);

    if (!token || token === 'null' || token === 'undefined') {
        return res.status(401).json({ error: 'Access denied: No valid session token provided' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
        return res.status(500).json({ error: 'Server signing secret is not configured.' });
    }

    jwt.verify(token, secret, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        attachSessionCookie(res, token);
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
        let matchedChild = false;

        // If user wasn't found in users by id, check if req.user.id is in children table
        if (!row) {
            const childRes = await db.query(
                `SELECT c.id, c.learner_user_id, c.school_id FROM children c WHERE c.id::text = $1::text OR c.learner_user_id::text = $1::text LIMIT 1`,
                [String(req.user.id)]
            );
            if (childRes.rows.length > 0) {
                matchedChild = true;
                req.user.school_id = childRes.rows[0].school_id || 1;
            }
        }

        const roleName = resolveVerifiedRole({
            dbRole: row ? row.role_name : null,
            tokenRole: req.user.role,
            matchedChild,
        });

        if (!roleName) {
            return res.status(403).json({ error: 'Forbidden: Account role could not be verified.' });
        }

        req.user.role = roleName;
        if (row) {
            req.user.school_id = row.school_id || req.user.school_id || 1;
            req.user.is_superadmin = Boolean(row.is_superadmin);
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

module.exports = { auth, authenticateToken: auth, isAdmin, requireRole, attachSessionCookie, clearSessionCookie, resolveVerifiedRole };
