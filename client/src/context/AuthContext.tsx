import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
    }
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

  const logout = () => {
    setToken(null);
    setRole(null);
    setUserState(null);
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('user');
    window.location.href = '/login';
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
