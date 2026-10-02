export const AUTH_STORAGE_KEYS: string[];

interface AuthStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function readAuthValue(key: string, stores: AuthStore | Array<AuthStore | null | undefined>): string | null;
export function clearAuthSession(stores: AuthStore | Array<AuthStore | null | undefined>): void;
export function writeAuthSession(options: {
  remember: boolean;
  entries?: Record<string, string | null | undefined>;
  persistent: AuthStore;
  session: AuthStore;
}): void;
export function storeHoldingToken(persistent: AuthStore, session: AuthStore): AuthStore;
