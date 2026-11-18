export const AUTH_STORAGE_KEYS = [
  'token',
  'userRole',
  'user',
  'active_school_profile',
  'active_school_id',
];

export function readAuthValue(key, stores) {
  const list = Array.isArray(stores) ? stores : [stores];
  for (const store of list) {
    if (!store) continue;
    try {
      const value = store.getItem(key);
      if (value != null && value !== '') return value;
    } catch (_) {
      /* private mode or blocked storage */
    }
  }
  return null;
}

export function clearAuthSession(stores) {
  const list = Array.isArray(stores) ? stores : [stores];
  for (const store of list) {
    if (!store) continue;
    for (const key of AUTH_STORAGE_KEYS) {
      try {
        store.removeItem(key);
      } catch (_) {
        /* ignore unavailable storage */
      }
    }
  }
}

/**
 * Persist a sign-in. Remembered sessions stay in persistent storage.
 * Sessions that should end with the browser stay in session storage,
 * and the other store is cleared so an old login cannot linger.
 */
export function writeAuthSession({ remember, entries, persistent, session }) {
  const target = remember ? persistent : session;
  const other = remember ? session : persistent;
  const keys = new Set([...AUTH_STORAGE_KEYS, ...Object.keys(entries || {})]);
  for (const key of keys) {
    const value = entries ? entries[key] : undefined;
    try {
      if (value == null || value === '') target.removeItem(key);
      else target.setItem(key, String(value));
    } catch (_) {
      /* ignore unavailable storage */
    }
    try {
      other.removeItem(key);
    } catch (_) {
      /* ignore unavailable storage */
    }
  }
}

export function storeHoldingToken(persistent, session) {
  try {
    if (persistent && persistent.getItem('token')) return persistent;
  } catch (_) {
    /* ignore */
  }
  try {
    if (session && session.getItem('token')) return session;
  } catch (_) {
    /* ignore */
  }
  return persistent;
}
