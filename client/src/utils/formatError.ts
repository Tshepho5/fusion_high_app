/**
 * Safely formats any error (string, Error, AxiosError, Vercel/Firebase edge payload)
 * into a user-facing string so that React never attempts to render a raw object
 * child with keys {code, message}.
 */
export const formatError = (error: any, fallback = 'An unexpected error occurred.'): string => {
  if (error == null) return fallback;
  if (typeof error === 'string') return error || fallback;
  if (typeof error.message === 'string') return error.message;
  if (typeof error.error === 'string') return error.error;
  if (error.error && typeof error.error.message === 'string') return error.error.message;
  if (error.error && typeof error.error.code === 'string') {
    return `${error.error.code}: ${error.error.message || ''}`.trim();
  }
  if (error.response?.data) {
    const data = error.response.data;
    if (typeof data === 'string') return data;
    if (typeof data.error === 'string') return data.error;
    if (data.error && typeof data.error.message === 'string') return data.error.message;
    if (typeof data.message === 'string') return data.message;
    if (data.code && typeof data.code === 'string') {
      return `${data.code}: ${data.message || ''}`.trim();
    }
  }
  if (error.code && typeof error.code === 'string') {
    return `${error.code}${error.message ? ': ' + error.message : ''}`;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error) || fallback;
  }
};

export const safeErrorString = (err: any, fallback = ''): string => {
  return formatError(err, fallback);
};
