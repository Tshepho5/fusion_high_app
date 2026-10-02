import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { authService, userService } from '../services/api';
import { clearAuthSession, readAuthValue, storeHoldingToken, writeAuthSession } from '../utils/authStorage';

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
  login: (credentials: { email?: string; learnerNumber?: string; password: string }, options?: { remember?: boolean }) => Promise<any>;
  logout: () => void;
  updateUser: (updatedData: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function readStoredUser(): User | null {
  const saved = readAuthValue('user', [localStorage, sessionStorage]);
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => readAuthValue('token', [localStorage, sessionStorage]));
  const [role, setRole] = useState<UserRole>((readAuthValue('userRole', [localStorage, sessionStorage]) as UserRole) || null);
  const [user, setUserState] = useState<User | null>(readStoredUser);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sessionPrompt, setSessionPrompt] = useState<null | 'idle' | 'logout'>(null);
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
      const holder = storeHoldingToken(localStorage, sessionStorage);
      try {
        holder.setItem('user', JSON.stringify(profileUser));
        if (profileUser.role) {
          holder.setItem('userRole', String(profileUser.role).toLowerCase());
        }
      } catch (_) {}
      if (profileUser.role) {
        setRole(profileUser.role.toLowerCase() as UserRole);
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
    }
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

    // Send heartbeat periodically to maintain online status while user is active in the app
    userService.heartbeat().catch(() => {});
    const heartbeatInterval = setInterval(() => {
      userService.heartbeat().catch(() => {});
    }, 25000);

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
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [token]);

  const login = async (
    credentials: { email?: string; learnerNumber?: string; password: string },
    options?: { remember?: boolean }
  ) => {
    setIsLoading(true);
    try {
      const data = await authService.login(credentials);
      const userToken = data.token;
      const rawRole = data.role || data.user?.role;
      if (!rawRole || !userToken) {
        const missing = new Error('This account has no portal role assigned. Ask the school office to finish setup.');
        (missing as any).response = { status: 403, data: { error: missing.message } };
        throw missing;
      }
      const userRole = String(rawRole).toLowerCase() as UserRole;
      const userData = data.user || { id: data.id, role: userRole, email: credentials.email };
      const remember = options?.remember !== false;
      const schoolId = data.school?.id || data.school_id || userData.school_id;

      setToken(userToken);
      setRole(userRole);
      setUserState(userData);

      writeAuthSession({
        remember,
        persistent: localStorage,
        session: sessionStorage,
        entries: {
          token: userToken,
          userRole,
          user: JSON.stringify(userData),
          active_school_profile: data.school ? JSON.stringify(data.school) : '',
          active_school_id: schoolId ? String(schoolId) : '',
        },
      });

      // Trigger immediate presence heartbeat on login
      userService.heartbeat().catch(() => {});

      if (data.school) {
        const root = document.documentElement;
        root.style.setProperty('--school-primary', data.school.primary_color || '#4f46e5');
        root.style.setProperty('--school-secondary', data.school.secondary_color || '#06b6d4');
        root.style.setProperty('--school-accent', data.school.accent_color || '#f59e0b');
        root.setAttribute('data-school-slug', data.school.slug || 'fusion-high');
      }

      return { data, role: userRole };
    } finally {
      setIsLoading(false);
    }
  };

  const finishLogout = () => {
    promptKind.current = null;
    setSessionPrompt(null);
    try {
      sessionStorage.removeItem('logout_reason');
    } catch (_) {}
    try {
      userService.updateLogoutStatus().catch(() => {});
    } catch (_) {}
    setToken(null);
    setRole(null);
    setUserState(null);
    clearAuthSession([localStorage, sessionStorage]);
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
