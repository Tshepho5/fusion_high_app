'use strict';

const crypto = require('crypto');

const MAX_RESET_ATTEMPTS = 5;
const RESET_OTP_TTL_MINUTES = 15;
const EMAIL_VERIFY_TTL_MINUTES = 72 * 60;
const LEARNER_EMAIL_ACTIVATION_TTL_MINUTES = 72 * 60;
const LEARNER_HANDOFF_TTL_MINUTES = 15;

const PRODUCTION_FRONTEND_ORIGIN = 'https://fusion-high-app.web.app';
const PRODUCTION_ALLOWED_ORIGINS = Object.freeze([
  'https://fusion-high-app.web.app',
  'https://fusion-high-app.firebaseapp.com'
]);

const NON_ENUMERATING_LOGIN_ERROR = 'Invalid login credentials. Please check your email or learner number and password.';
const NON_ENUMERATING_RECOVERY_MESSAGE = 'If an eligible verified account matches those details, a password reset code has been sent to its verified email address.';
const NON_ENUMERATING_VERIFICATION_RESEND_MESSAGE = 'If an account is awaiting email verification, a new verification link has been sent.';

const ALLOWLISTED_NEXT_PATHS = Object.freeze([
  '/application.html',
  '/dashboard/parent',
  '/dashboard/learner',
  '/dashboard/teacher',
  '/dashboard/admin',
  '/activate',
  '/verify-email'
]);

const TOKEN_PURPOSES = Object.freeze({
  PARENT_EMAIL_VERIFY: 'parent_email_verify',
  PARENT_ACTIVATION: 'parent_activation',
  LEARNER_EMAIL_ACTIVATION: 'learner_email_activation',
  LEARNER_PARENT_HANDOFF: 'learner_parent_handoff',
  LEARNER_PASSWORD_RESET_HANDOFF: 'learner_password_reset_handoff',
  PRINCIPAL_ACTIVATION: 'principal_activation',
  LEGACY_PARENT_ACTIVATION: 'legacy_parent_activation'
});

function hashSecretValue(raw) {
  return crypto.createHash('sha256').update(String(raw || '')).digest('hex');
}

function verifySecretHash(raw, expectedHash) {
  if (!raw || !expectedHash || typeof expectedHash !== 'string') return false;
  const candidate = hashSecretValue(raw);
  const a = Buffer.from(candidate, 'utf8');
  const b = Buffer.from(String(expectedHash).trim(), 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function generateSecureToken() {
  const token = crypto.randomBytes(32).toString('base64url');
  return { token, hash: hashSecretValue(token) };
}

function generateResetOtp() {
  return crypto.randomInt(0, 10000000000).toString().padStart(10, '0');
}

function normalizeIdDigitsOrCode(value) {
  return String(value || '').trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

function normalizeLearnerNumber(value) {
  return String(value || '').trim().replace(/\s+/g, '').toUpperCase();
}

function classifyLoginIdentifier(rawIdentifier) {
  const trimmed = String(rawIdentifier || '').trim();
  if (!trimmed) return { kind: 'invalid', normalized: '' };
  if (trimmed.includes('@')) {
    return { kind: 'email', normalized: trimmed.toLowerCase() };
  }
  const normalized = normalizeLearnerNumber(trimmed);
  if (!/^[A-Z0-9-]{4,32}$/.test(normalized)) {
    return { kind: 'invalid', normalized: '' };
  }
  return { kind: 'learner_number', normalized };
}

function isSafeNextPath(rawNext) {
  if (typeof rawNext !== 'string') return null;
  const trimmed = rawNext.trim();
  if (!trimmed || trimmed.length > 300) return null;
  if (/[\u0000-\u001F\u007F\\]/.test(trimmed)) return null;
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return null;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return null;

  let parsed;
  try {
    parsed = new URL(trimmed, 'https://geleza.local');
  } catch (_) {
    return null;
  }
  if (parsed.origin !== 'https://geleza.local') return null;
  const pathname = parsed.pathname;
  if (!ALLOWLISTED_NEXT_PATHS.includes(pathname)) return null;
  if (parsed.search.includes('://') || parsed.search.toLowerCase().includes('javascript:')) return null;
  return `${pathname}${parsed.search}`;
}

function isInternalPlaceholderEmail(email) {
  const lower = String(email || '').trim().toLowerCase();
  if (!lower || !lower.includes('@')) return true;
  return (
    lower.endsWith('.geleza.local') ||
    lower.endsWith('@geleza.local') ||
    lower.endsWith('@fusion.high') ||
    lower.endsWith('@fusionhigh.co.za') ||
    lower.endsWith('.invalid')
  );
}

function evaluateEmailVerificationAccess(userRow = {}) {
  const rawStatus = String(userRow.email_verification_status || '').trim().toLowerCase();
  const hasPassword = Boolean(userRow.password_hash);
  const hasVerifiedAt = Boolean(userRow.email_verified_at);
  const hasPasswordSetAt = Boolean(userRow.password_set_at);

  let status = rawStatus;
  if (!status) {
    if (hasVerifiedAt || (hasPassword && hasPasswordSetAt)) {
      status = 'verified';
    } else if (hasPassword) {
      status = 'legacy_unverified';
    } else {
      status = 'pending_verification';
    }
  }

  if (status === 'verified') {
    return {
      status: 'verified',
      allowedToLogin: hasPassword,
      canUseSelfServiceEmailRecovery: hasPassword && !isInternalPlaceholderEmail(userRow.email)
    };
  }

  if (status === 'legacy_unverified') {
    return {
      status: 'legacy_unverified',
      allowedToLogin: hasPassword,
      canUseSelfServiceEmailRecovery: false
    };
  }

  return {
    status: 'pending_verification',
    allowedToLogin: false,
    canUseSelfServiceEmailRecovery: false,
    code: 'email_verification_required'
  };
}

function isRenderBackendOrigin(urlStr) {
  try {
    const parsed = new URL(urlStr);
    return parsed.hostname.endsWith('.onrender.com');
  } catch (_) {
    return false;
  }
}

function resolveFrontendOrigin(req = null, env = process.env) {
  const candidates = [
    env.FRONTEND_URL,
    env.APP_URL,
    env.CLIENT_URL
  ].filter(Boolean).map((v) => String(v).trim().replace(/\/+$/, ''));

  const isProd = env.NODE_ENV === 'production' && env.GELEZA_STAGING !== '1';

  for (const c of candidates) {
    try {
      const parsed = new URL(c);
      if (isProd && isRenderBackendOrigin(c)) continue;
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return `${parsed.protocol}//${parsed.host}`;
      }
    } catch (_) {}
  }

  if (req && typeof req.get === 'function') {
    const originHeader = req.get('origin');
    if (originHeader) {
      try {
        const parsed = new URL(originHeader);
        if (!isProd || !isRenderBackendOrigin(originHeader)) {
          return `${parsed.protocol}//${parsed.host}`;
        }
      } catch (_) {}
    }
  }

  if (isProd) {
    return PRODUCTION_FRONTEND_ORIGIN;
  }

  if (req && typeof req.get === 'function') {
    const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
    const host = req.get('x-forwarded-host') || req.get('host');
    if (host && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) {
      return `${proto}://${host}`;
    }
  }

  return PRODUCTION_FRONTEND_ORIGIN;
}

function buildAllowedCorsOrigins(env = process.env) {
  const origins = new Set(PRODUCTION_ALLOWED_ORIGINS);
  const rawList = String(
    env.CORS_ORIGINS ||
      'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173,http://localhost:4000,http://127.0.0.1:4000'
  );
  for (const entry of rawList.split(',')) {
    const trimmed = entry.trim().replace(/\/+$/, '');
    if (trimmed) origins.add(trimmed);
  }
  for (const key of ['FRONTEND_URL', 'APP_URL', 'CLIENT_URL']) {
    const val = String(env[key] || '').trim().replace(/\/+$/, '');
    if (val) origins.add(val);
  }
  return origins;
}

function isOriginAllowed(origin, env = process.env) {
  if (!origin) return true;
  const clean = String(origin).trim().replace(/\/+$/, '');
  const allowlist = buildAllowedCorsOrigins(env);
  if (allowlist.has(clean)) return true;
  try {
    const parsed = new URL(clean);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    if (
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '[::1]'
    ) {
      return true;
    }
  } catch (_) {
    return false;
  }
  return false;
}

function maskEmailAddress(email) {
  const clean = String(email || '').trim();
  const parts = clean.split('@');
  if (parts.length !== 2) return '***';
  const local = parts[0];
  const prefix = local.length > 2 ? local.slice(0, 2) : local.slice(0, 1);
  return `${prefix}***@${parts[1]}`;
}

module.exports = {
  MAX_RESET_ATTEMPTS,
  RESET_OTP_TTL_MINUTES,
  EMAIL_VERIFY_TTL_MINUTES,
  LEARNER_EMAIL_ACTIVATION_TTL_MINUTES,
  LEARNER_HANDOFF_TTL_MINUTES,
  PRODUCTION_FRONTEND_ORIGIN,
  PRODUCTION_ALLOWED_ORIGINS,
  NON_ENUMERATING_LOGIN_ERROR,
  NON_ENUMERATING_RECOVERY_MESSAGE,
  NON_ENUMERATING_VERIFICATION_RESEND_MESSAGE,
  ALLOWLISTED_NEXT_PATHS,
  TOKEN_PURPOSES,
  hashSecretValue,
  verifySecretHash,
  generateSecureToken,
  generateResetOtp,
  normalizeIdDigitsOrCode,
  normalizeLearnerNumber,
  classifyLoginIdentifier,
  isSafeNextPath,
  isInternalPlaceholderEmail,
  evaluateEmailVerificationAccess,
  resolveFrontendOrigin,
  buildAllowedCorsOrigins,
  isOriginAllowed,
  maskEmailAddress
};
