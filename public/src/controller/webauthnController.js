const crypto = require('crypto');
const db = require('../../../db/db');
const authController = require('./authController');
const {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} = require('@simplewebauthn/server');

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

const STATIC_ORIGINS = [
    'https://fusion-high-app.web.app',
    'https://fusion-high-app.firebaseapp.com',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4000',
    'http://127.0.0.1:4000',
];

let schemaReady = null;

function allowedOrigins() {
    const extras = [process.env.APP_URL, process.env.CLIENT_URL, ...(process.env.CORS_ORIGINS || '').split(',')];
    return new Set(
        [...STATIC_ORIGINS, ...extras]
            .map((origin) => String(origin || '').trim())
            .filter(Boolean)
    );
}

function requestOrigin(req) {
    let origin = String(req.headers.origin || '').trim();
    if (!origin && req.headers.referer) {
        try {
            origin = new URL(String(req.headers.referer)).origin;
        } catch (_) {}
    }
    if (!allowedOrigins().has(origin)) return null;
    try {
        const url = new URL(origin);
        if (!url.hostname) return null;
        return { origin, rpID: url.hostname };
    } catch (_) {
        return null;
    }
}

function deviceLabel(req) {
    const ua = String(req.headers['user-agent'] || '');
    if (/android/i.test(ua)) return 'Android device';
    if (/iphone|ipad/i.test(ua)) return 'Apple device';
    if (/windows/i.test(ua)) return 'Windows device';
    if (/mac os/i.test(ua)) return 'Mac';
    if (/linux/i.test(ua)) return 'Linux device';
    return 'This device';
}

function bytesToBase64Url(value) {
    return Buffer.from(value).toString('base64url');
}

function base64UrlToBytes(value) {
    return new Uint8Array(Buffer.from(String(value), 'base64url'));
}

async function ensureSchema() {
    if (!schemaReady) {
        schemaReady = db.query(`
            CREATE TABLE IF NOT EXISTS webauthn_credentials (
                id SERIAL PRIMARY KEY,
                user_id TEXT NOT NULL,
                credential_id TEXT NOT NULL UNIQUE,
                public_key TEXT NOT NULL,
                counter BIGINT NOT NULL DEFAULT 0,
                transports TEXT,
                device_label TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS webauthn_credentials_user_idx ON webauthn_credentials (user_id);
            CREATE TABLE IF NOT EXISTS webauthn_challenges (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                challenge TEXT NOT NULL,
                kind TEXT NOT NULL,
                origin TEXT NOT NULL,
                rp_id TEXT NOT NULL,
                expires_at TIMESTAMPTZ NOT NULL
            );
        `).catch((err) => {
            schemaReady = null;
            throw err;
        });
    }
    await schemaReady;
    await db.query('DELETE FROM webauthn_challenges WHERE expires_at < NOW()');
}

async function saveChallenge({ userId, challenge, kind, origin, rpID }) {
    const id = crypto.randomUUID();
    const expires = new Date(Date.now() + CHALLENGE_TTL_MS);
    await db.query(
        `INSERT INTO webauthn_challenges (id, user_id, challenge, kind, origin, rp_id, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, userId ? String(userId) : null, challenge, kind, origin, rpID, expires]
    );
    return id;
}

async function takeChallenge(id, kind) {
    const result = await db.query(
        `DELETE FROM webauthn_challenges
         WHERE id = $1 AND kind = $2 AND expires_at >= NOW()
         RETURNING user_id, challenge, origin, rp_id`,
        [String(id || ''), kind]
    );
    return result.rows[0] || null;
}

exports.registerOptions = async (req, res) => {
    const place = requestOrigin(req);
    if (!place) {
        return res.status(400).json({ error: 'Fingerprint sign-in can only be turned on from the Geleza SA website.' });
    }
    try {
        await ensureSchema();
        const userId = String(req.user.id);
        const account = await authController.loadSessionUser(userId);
        if (!account) {
            return res.status(404).json({ error: 'This account could not be found.' });
        }
        const existing = await db.query(
            'SELECT credential_id, transports FROM webauthn_credentials WHERE user_id = $1',
            [userId]
        );
        const userName = account.email || account.learner_number || `user-${userId}`;
        const displayName = `${account.full_name || ''} ${account.surname || ''}`.trim() || userName;
        const options = await generateRegistrationOptions({
            rpName: 'Geleza SA',
            rpID: place.rpID,
            userName,
            userDisplayName: displayName,
            userID: new Uint8Array(Buffer.from(userId, 'utf8')),
            attestationType: 'none',
            preferredAuthenticatorType: 'localDevice',
            authenticatorSelection: {
                authenticatorAttachment: 'platform',
                residentKey: 'required',
                userVerification: 'required',
            },
            excludeCredentials: existing.rows.map((row) => ({
                id: row.credential_id,
                transports: row.transports ? row.transports.split(',').filter(Boolean) : undefined,
            })),
        });
        const challengeId = await saveChallenge({
            userId,
            challenge: options.challenge,
            kind: 'register',
            origin: place.origin,
            rpID: place.rpID,
        });
        return res.json({ options, challengeId });
    } catch (err) {
        console.error('Fingerprint registration options error:', err);
        return res.status(500).json({ error: 'Fingerprint setup could not start. Try again.' });
    }
};

exports.registerVerify = async (req, res) => {
    try {
        await ensureSchema();
        const saved = await takeChallenge(req.body?.challengeId, 'register');
        if (!saved || String(saved.user_id) !== String(req.user.id)) {
            return res.status(400).json({ error: 'Fingerprint setup expired. Start it again from Settings.' });
        }
        const verification = await verifyRegistrationResponse({
            response: req.body?.response,
            expectedChallenge: saved.challenge,
            expectedOrigin: saved.origin,
            expectedRPID: saved.rp_id,
            requireUserVerification: true,
        });
        if (!verification.verified || !verification.registrationInfo?.userVerified) {
            return res.status(401).json({ error: 'The fingerprint was not confirmed. Try again.' });
        }
        const credential = verification.registrationInfo.credential;
        const transports = Array.isArray(credential.transports) ? credential.transports.join(',') : '';
        await db.query(
            `INSERT INTO webauthn_credentials (user_id, credential_id, public_key, counter, transports, device_label)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (credential_id) DO UPDATE
             SET public_key = EXCLUDED.public_key,
                 counter = EXCLUDED.counter,
                 transports = EXCLUDED.transports,
                 device_label = EXCLUDED.device_label`,
            [
                String(req.user.id),
                credential.id,
                bytesToBase64Url(credential.publicKey),
                Number(credential.counter || 0),
                transports,
                deviceLabel(req),
            ]
        );
        return res.json({ enabled: true, deviceLabel: deviceLabel(req) });
    } catch (err) {
        console.error('Fingerprint registration verify error:', err);
        return res.status(400).json({ error: 'This device could not save the fingerprint sign-in. Turn on the scanner in the device settings, then try again.' });
    }
};

exports.loginOptions = async (req, res) => {
    const place = requestOrigin(req);
    if (!place) {
        return res.status(400).json({ error: 'Fingerprint sign-in is available on the Geleza SA website.' });
    }
    try {
        await ensureSchema();
        const options = await generateAuthenticationOptions({
            rpID: place.rpID,
            userVerification: 'required',
        });
        const challengeId = await saveChallenge({
            challenge: options.challenge,
            kind: 'login',
            origin: place.origin,
            rpID: place.rpID,
        });
        return res.json({ options, challengeId });
    } catch (err) {
        console.error('Fingerprint login options error:', err);
        return res.status(500).json({ error: 'Fingerprint sign-in could not start. Try again.' });
    }
};

exports.loginVerify = async (req, res) => {
    try {
        await ensureSchema();
        const saved = await takeChallenge(req.body?.challengeId, 'login');
        if (!saved) {
            return res.status(400).json({ error: 'Fingerprint sign-in expired. Try again.' });
        }
        const credentialId = req.body?.response?.id;
        if (!credentialId) {
            return res.status(400).json({ error: 'No fingerprint was provided.' });
        }
        const stored = await db.query(
            'SELECT user_id, credential_id, public_key, counter, transports FROM webauthn_credentials WHERE credential_id = $1 LIMIT 1',
            [String(credentialId)]
        );
        if (stored.rows.length === 0) {
            return res.status(401).json({
                error: 'This fingerprint is not turned on for Geleza SA. Sign in with email and password, then enable it in Settings.',
                code: 'fingerprint_not_registered',
            });
        }
        const row = stored.rows[0];
        const verification = await verifyAuthenticationResponse({
            response: req.body.response,
            expectedChallenge: saved.challenge,
            expectedOrigin: saved.origin,
            expectedRPID: saved.rp_id,
            requireUserVerification: true,
            credential: {
                id: row.credential_id,
                publicKey: base64UrlToBytes(row.public_key),
                counter: Number(row.counter || 0),
                transports: row.transports ? row.transports.split(',').filter(Boolean) : undefined,
            },
        });
        if (!verification.verified || !verification.authenticationInfo?.userVerified) {
            return res.status(401).json({ error: 'The fingerprint did not match. Try again, or sign in with email and password.' });
        }
        await db.query(
            'UPDATE webauthn_credentials SET counter = $1 WHERE credential_id = $2',
            [Number(verification.authenticationInfo.newCounter || 0), row.credential_id]
        );
        const user = await authController.loadSessionUser(row.user_id);
        if (!user) {
            return res.status(401).json({ error: 'The account for this fingerprint is no longer available.' });
        }
        return authController.issueLoginSession(user, res);
    } catch (err) {
        console.error('Fingerprint login verify error:', err);
        return res.status(401).json({ error: 'Fingerprint sign-in could not be completed. Use email and password, or try the fingerprint again.' });
    }
};

exports.status = async (req, res) => {
    try {
        await ensureSchema();
        const result = await db.query(
            `SELECT credential_id, device_label, created_at
             FROM webauthn_credentials
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [String(req.user.id)]
        );
        return res.json({
            enabled: result.rows.length > 0,
            devices: result.rows.map((row) => ({
                id: row.credential_id,
                label: row.device_label || 'This device',
                createdAt: row.created_at,
            })),
        });
    } catch (err) {
        console.error('Fingerprint status error:', err);
        return res.status(500).json({ error: 'Fingerprint status could not be loaded.' });
    }
};

exports.disable = async (req, res) => {
    try {
        await ensureSchema();
        const credentialId = req.body?.credentialId ? String(req.body.credentialId) : '';
        if (credentialId) {
            await db.query(
                'DELETE FROM webauthn_credentials WHERE user_id = $1 AND credential_id = $2',
                [String(req.user.id), credentialId]
            );
        } else {
            await db.query('DELETE FROM webauthn_credentials WHERE user_id = $1', [String(req.user.id)]);
        }
        const left = await db.query(
            'SELECT COUNT(*)::int AS total FROM webauthn_credentials WHERE user_id = $1',
            [String(req.user.id)]
        );
        return res.json({ enabled: Number(left.rows[0]?.total || 0) > 0 });
    } catch (err) {
        console.error('Fingerprint disable error:', err);
        return res.status(500).json({ error: 'Fingerprint sign-in could not be turned off.' });
    }
};
