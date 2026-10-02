import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { authService, userService } from '../services/api';

export type UserRole = 'learner' | 'teacher' | 'admin' | 'parent' | null;

export interface User {
  id: number | string;
  email?: string;
  role: UserRole;
  full_name?: string;
  name?: string;
  surname?: string;
  profile_picture?: string;
  grade?: number;
  learner_number?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { email?: string; learnerNumber?: string; password: string }) => Promise<any>;
  logout: () => void;
  updateUser: (updatedData: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [role, setRole] = useState<UserRole>((localStorage.getItem('userRole') as UserRole) || null);
  const [user, setUserState] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sessionPrompt, setSessionPrompt] = useState<null | 'idle' | 'logout'>(null);
  const [tabBlocked, setTabBlocked] = useState(false);
  const promptKind = useRef<null | 'idle' | 'logout'>(null);
  const resetIdleTimer = useRef<() => void>(() => {});

  const refreshUser = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const data = await userService.getProfile();
      const profileUser = data.user || data;
      setUserState(profileUser);
      localStorage.setItem('user', JSON.stringify(profileUser));
      if (profileUser.role) {
        setRole(profileUser.role.toLowerCase() as UserRole);
        localStorage.setItem('userRole', profileUser.role.toLowerCase());
      }
    } catch (err) {
      console.warn('Failed to refresh user profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      refreshUser();
    } else {
      setIsLoading(false);
      setTabBlocked(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const tabId = sessionStorage.getItem('geleza_tab_id') || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
    sessionStorage.setItem('geleza_tab_id', tabId);
    const lockKey = 'geleza_active_tab';
    const readLock = () => {
      try {
        return JSON.parse(localStorage.getItem(lockKey) || 'null');
      } catch (_) {
        return null;
      }
    };
    const claimTab = () => {
      const current = readLock();
      const heldByAnother = current && current.tabId !== tabId && Date.now() - Number(current.ts || 0) < 8000;
      if (heldByAnother) {
        setTabBlocked(true);
        return;
      }
      localStorage.setItem(lockKey, JSON.stringify({ tabId, ts: Date.now() }));
      setTabBlocked(false);
    };
    claimTab();
    const timer = window.setInterval(claimTab, 3000);
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'token' && event.newValue && event.newValue !== token) {
        try { sessionStorage.setItem('logout_reason', 'session'); } catch (_) {}
        window.location.href = '/login';
        return;
      }
      if (event.key === lockKey) claimTab();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('storage', onStorage);
      const current = readLock();
      if (current?.tabId === tabId) localStorage.removeItem(lockKey);
    };
  }, [token]);

  // After 3 minutes without interaction, ask whether to stay or sign in again.
  useEffect(() => {
    if (!token) return;

    const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000;
    let timeoutId: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      if (promptKind.current) return;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (promptKind.current === 'logout') return;
        promptKind.current = 'idle';
        setSessionPrompt('idle');
      }, INACTIVITY_TIMEOUT_MS);
    };
    resetIdleTimer.current = resetTimer;

    // Initialize timer
    resetTimer();

    // Keep this phone or laptop showing as online, and catch up the moment it reconnects.
    const markOnline = () => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      userService.heartbeat().catch(() => {});
      import('../services/soundNotificationService')
        .then(({ soundNotificationService }) => soundNotificationService.checkNow())
        .catch(() => {});
    };
    markOnline();
    const heartbeatInterval = setInterval(markOnline, 15000);
    window.addEventListener('online', markOnline);
    const onVisible = () => {
      if (document.visibilityState === 'visible') markOnline();
    };
    document.addEventListener('visibilitychange', onVisible);

    // Activity events to detect user interaction
    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    const handleUnload = () => {
      try {
        navigator.sendBeacon?.('/api/user/logout-status');
      } catch (_) {}
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(heartbeatInterval);
      window.removeEventListener('online', markOnline);
      document.removeEventListener('visibilitychange', onVisible);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [token]);

  const login = async (credentials: { email?: string; learnerNumber?: string; password: string }) => {
    setIsLoading(true);
    try {
      const data = await authService.login(credentials);
      const userToken = data.token;
      const userRole = (data.role || 'learner').toLowerCase() as UserRole;
      const userData = data.user || { id: data.id, role: userRole, email: credentials.email };

      setToken(userToken);
      setRole(userRole);
      setUserState(userData);

      localStorage.setItem('token', userToken);
      if (userRole) {
        localStorage.setItem('userRole', userRole);
      }
      localStorage.setItem('user', JSON.stringify(userData));

      // Trigger immediate presence heartbeat on login
      userService.heartbeat().catch(() => {});

      // Auto-sync school profile to school context and CSS root
      if (data.school) {
        localStorage.setItem('active_school_profile', JSON.stringify(data.school));
        localStorage.setItem('active_school_id', String(data.school.id));
        const root = document.documentElement;
        root.style.setProperty('--school-primary', data.school.primary_color || '#4f46e5');
        root.style.setProperty('--school-secondary', data.school.secondary_color || '#06b6d4');
        root.style.setProperty('--school-accent', data.school.accent_color || '#f59e0b');
        root.setAttribute('data-school-slug', data.school.slug || 'fusion-high');
      } else if (data.school_id || userData.school_id) {
        const sid = String(data.school_id || userData.school_id);
        localStorage.setItem('active_school_id', sid);
      }

      return { data, role: userRole };
    } finally {
      setIsLoading(false);
    }
  };

  const finishLogout = async () => {
    promptKind.current = null;
    setSessionPrompt(null);
    try {
      sessionStorage.removeItem('logout_reason');
    } catch (_) {}
    try {
      userService.updateLogoutStatus(true).catch(() => {});
    } catch (_) {}
    try {
      const { soundNotificationService } = await import('../services/soundNotificationService');
      await soundNotificationService.release();
    } catch (_) {}
    setToken(null);
    setRole(null);
    setUserState(null);
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('user');
    localStorage.removeItem('active_school_profile');
    localStorage.removeItem('active_school_id');
    localStorage.removeItem('geleza_active_tab');
    window.location.href = '/login';
  };

  const logout = () => {
    promptKind.current = 'logout';
    setSessionPrompt('logout');
  };

  const staySignedIn = () => {
    promptKind.current = null;
    setSessionPrompt(null);
    resetIdleTimer.current();
  };

  const updateUser = (updatedData: Partial<User>) => {
    if (!user) return;
    const newUserData = { ...user, ...updatedData };
    setUserState(newUserData);
    localStorage.setItem('user', JSON.stringify(newUserData));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
        updateUser,
        refreshUser,
      }}
    >
      {children}
      {tabBlocked && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Already open</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              This account is already signed in on another tab. Close that tab before using Geleza SA here.
            </p>
          </div>
        </div>
      )}
      {sessionPrompt && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="session-choice-title"
            className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900"
          >
            <h2 id="session-choice-title" className="text-lg font-extrabold text-slate-900 dark:text-white">
              {sessionPrompt === 'idle' ? 'Sign in again?' : 'Log out of Geleza SA?'}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {sessionPrompt === 'idle'
                ? 'You have not used Geleza SA for 3 minutes. Do you want to sign in again, or stay on this page?'
                : 'Do you want to log out, or stay signed in?'}
            </p>
            <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                onClick={staySignedIn}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 hover:bg-slate-100 dark:border-white/15 dark:text-white dark:hover:bg-white/10 cursor-pointer"
              >
                Stay
              </button>
              <button
                type="button"
                onClick={finishLogout}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold text-always-white cursor-pointer ${
                  sessionPrompt === 'idle' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {sessionPrompt === 'idle' ? 'Sign in' : 'Log out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
