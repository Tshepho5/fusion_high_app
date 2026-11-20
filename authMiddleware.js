const jwt = require('jsonwebtoken');
const db = require('./db/db');
const {
    accountUnavailable,
    applyAccount,
    hasDatabaseSuperadmin,
    loadAuthoritativeAccount
} = require('./lib/authoritativeAccess');
const { canOpenRegisteredSchoolDashboard } = require('./public/src/services/schoolScope');

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

let sessionColumnReady = false;

async function ensureActiveSessionColumn() {
    if (sessionColumnReady) return;
    await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS active_session_id TEXT');
    await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS session_seen_at TIMESTAMP');
    sessionColumnReady = true;
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

    jwt.verify(token, secret, async (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        try {
            await ensureActiveSessionColumn();
            const loaded = await loadAuthoritativeAccount(db.query, user.id);
            if (loaded.state !== 'active') {
                clearSessionCookie(res);
                return res.status(401).json({
                    error: accountUnavailable(loaded.state),
                    code: loaded.state === 'missing' ? 'account_missing' : loaded.state
                });
            }
            const activeSessionId = loaded.account.active_session_id;
            if (!user.sid || !activeSessionId || activeSessionId !== user.sid) {
                clearSessionCookie(res);
                return res.status(401).json({
                    error: 'You were signed out because this account signed in on another device or tab.',
                    code: 'session_replaced'
                });
            }
            db.query(
                'UPDATE users SET session_seen_at = NOW(), last_seen_at = NOW(), is_online = TRUE WHERE id::text = $1::text',
                [String(user.id)]
            ).catch(() => {});
            req.user = {
                id: loaded.account.id,
                role: loaded.account.role,
                email: loaded.account.email,
                full_name: user.full_name,
                school_id: loaded.account.school_id,
                is_superadmin: hasDatabaseSuperadmin(loaded.account),
                sid: user.sid,
                authoritative: true
            };
            await openRegisteredSchoolDashboard(req);
            attachSessionCookie(res, token);
            next();
        } catch (sessionErr) {
            console.error('[AUTH SESSION]', sessionErr.message);
            return res.status(500).json({ error: 'Could not confirm this sign-in.' });
        }
    });
};

async function openRegisteredSchoolDashboard(req) {
    if (!['GET', 'HEAD'].includes(String(req.method || '').toUpperCase())) return;
    const path = String(req.originalUrl || req.url || '');
    if (
        path.startsWith('/api/profile') ||
        path.startsWith('/api/auth') ||
        path.startsWith('/api/admin/users/profile/') ||
        path.includes('heartbeat') ||
        path.includes('logout')
    ) return;
    const viewId = parseInt(req.headers['x-view-user-id'], 10);
    const schoolId = parseInt(req.headers['x-school-id'], 10);
    if (!Number.isInteger(viewId) || viewId <= 0) return;
    if (String(req.headers['x-geleza-directory'] || '').toLowerCase() !== 'school') return;
    const school = await db.query('SELECT id FROM schools WHERE id = $1 AND is_active = TRUE', [schoolId]);
    if (!school.rows.length) return;
    const loaded = await loadAuthoritativeAccount(db.query, viewId);
    if (loaded.state !== 'active' || !loaded.account) return;
    const target = {
        id: loaded.account.id,
        school_id: loaded.account.school_id,
        role: loaded.account.role,
        is_superadmin: loaded.account.is_superadmin === true
    };
    if (!canOpenRegisteredSchoolDashboard({
        executive: req.user,
        target,
        schoolActive: true,
        schoolId
    })) return;
    req.executive = { ...req.user };
    req.user = {
        id: loaded.account.id,
        role: String(loaded.account.role || '').toLowerCase(),
        email: loaded.account.email,
        full_name: loaded.account.full_name || '',
        surname: loaded.account.surname || '',
        school_id: loaded.account.school_id,
        is_superadmin: false,
        sid: req.user.sid,
        authoritative: true,
        viewing: true
    };
}

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
        const loaded = await loadAuthoritativeAccount(db.query, req.user.id);
        if (loaded.state === 'deleted' || loaded.state === 'deactivated') {
            return res.status(401).json({ error: accountUnavailable(loaded.state), code: loaded.state });
        }

        let roleName = null;
        if (loaded.state === 'active') {
            applyAccount(req, loaded.account);
            roleName = loaded.account.role;
        } else {
            const childRes = await db.query(
                `SELECT c.id, c.learner_user_id, c.school_id FROM children c WHERE c.id::text = $1::text OR c.learner_user_id::text = $1::text LIMIT 1`,
                [String(req.user.id)]
            );
            if (childRes.rows.length > 0 && String(req.user.role || '').toLowerCase() === 'learner') {
                roleName = 'learner';
                req.user.role = 'learner';
                req.user.is_superadmin = false;
                req.user.authoritative = true;
                req.user.school_id = childRes.rows[0].school_id || null;
            }
        }

        if (!roleName) {
            return res.status(401).json({ error: accountUnavailable(loaded.state), code: loaded.state || 'missing' });
        }

        if (hasDatabaseSuperadmin(loaded.account)) {
            return next();
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

module.exports = { auth, authenticateToken: auth, isAdmin, requireRole, attachSessionCookie, clearSessionCookie, ensureActiveSessionColumn };
