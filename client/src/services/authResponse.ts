export const INVALID_AUTH_RESPONSE = 'The authentication service returned an invalid response.';

const SESSION_PATHS = new Set([
  '/api/login',
  '/api/auth/login',
  '/api/webauthn/login/verify',
]);

const JSON_AUTH_PATHS = new Set([
  ...SESSION_PATHS,
  '/api/register',
  '/api/auth/register',
  '/api/activate',
  '/api/activation/resend',
  '/api/forgot-password',
  '/api/verify-otp',
  '/api/reset-password',
  '/api/webauthn/login/options',
  '/api/check-login-account',
]);

export class InvalidAuthResponseError extends Error {
  response: { status: number; data: { error: string; code: string } };

  constructor() {
    super(INVALID_AUTH_RESPONSE);
    this.name = 'InvalidAuthResponseError';
    this.response = {
      status: 502,
      data: { error: INVALID_AUTH_RESPONSE, code: 'invalid_auth_response' },
    };
  }
}

export const isSessionToken = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  const token = value.trim();
  if (token.length < 20) return false;
  if (token === 'undefined' || token === 'null') return false;
  if (token.startsWith('<') || /<!doctype|<html/i.test(token)) return false;
  return true;
};

export const authRequestPath = (url?: string): string => {
  if (!url) return '';
  const withoutQuery = url.split('?')[0];
  if (!withoutQuery.startsWith('http')) return withoutQuery;
  try {
    return new URL(withoutQuery).pathname;
  } catch {
    return withoutQuery;
  }
};

export const requiresAuthJson = (url?: string): boolean => JSON_AUTH_PATHS.has(authRequestPath(url));

const parseAuthBody = (data: unknown): Record<string, unknown> => {
  let body = data;
  if (typeof body === 'string') {
    const trimmed = body.trim();
    if (!trimmed || trimmed.startsWith('<') || /<!doctype|<html/i.test(trimmed)) {
      throw new InvalidAuthResponseError();
    }
    try {
      body = JSON.parse(trimmed);
    } catch {
      throw new InvalidAuthResponseError();
    }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new InvalidAuthResponseError();
  }
  return body as Record<string, unknown>;
};

export const acceptAuthResponse = (url: string | undefined, data: unknown): unknown => {
  const path = authRequestPath(url);
  if (!JSON_AUTH_PATHS.has(path)) return data;
  const body = parseAuthBody(data);
  if (SESSION_PATHS.has(path) && !isSessionToken(body.token)) {
    throw new InvalidAuthResponseError();
  }
  return body;
};

export const canEnterDashboard = (data: unknown): boolean => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  return isSessionToken((data as { token?: unknown }).token);
};
