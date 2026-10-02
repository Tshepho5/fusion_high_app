function serverMessage(err) {
  const data = err && err.response && err.response.data;
  if (!data) return '';
  if (typeof data === 'string') return data;
  if (typeof data.error === 'string') return data.error;
  if (data.error && typeof data.error.message === 'string') return data.error.message;
  if (typeof data.message === 'string') return data.message;
  return '';
}

/**
 * Turn a failed sign-in into a message the user can act on.
 * Field blame is reserved for credential failures so a timeout
 * or a locked portal does not look like a wrong password.
 */
export function describeLoginFailure(err) {
  const status = err && err.response ? err.response.status : undefined;
  const message = serverMessage(err);

  if (!err || !err.response) {
    const raw = String((err && (err.code || err.message)) || '');
    const timedOut = raw === 'ECONNABORTED' || /timeout/i.test(raw);
    return {
      message: timedOut
        ? 'The sign-in request timed out. Check your connection and try again.'
        : 'We could not reach Geleza SA. Check your connection and try again.',
      blameFields: false,
    };
  }

  if (status === 429) {
    return {
      message: message || 'Too many sign-in attempts. Please wait a few minutes and try again.',
      blameFields: false,
    };
  }

  if (status === 403 || status === 423) {
    return {
      message: message || 'This account cannot sign in right now. Contact the school office if you need access.',
      blameFields: false,
    };
  }

  if (typeof status === 'number' && status >= 500) {
    return {
      message: 'Geleza SA could not complete sign-in. Please try again in a moment.',
      blameFields: false,
    };
  }

  return {
    message: message || 'Invalid credentials. Please verify your details.',
    blameFields: true,
  };
}
