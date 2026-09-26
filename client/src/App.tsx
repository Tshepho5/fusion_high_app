import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SchoolProvider } from './context/SchoolContext';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { PwaInstallPrompt } from './components/common/PwaInstallPrompt';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Robust dynamic import wrapper with automatic cache-purge & page reload on chunk load failure.
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<any>,
  chunkKey: string
) {
  return lazy(async () => {
    const hasRetried = sessionStorage.getItem(`chunk_retry_${chunkKey}`);
    try {
      const module = await factory();
      sessionStorage.removeItem(`chunk_retry_${chunkKey}`);
      const component = module[chunkKey] || module.default || module;
      return { default: component as T };
    } catch (err: any) {
      console.warn(`[ChunkLoadRecovery] Stale chunk detected for ${chunkKey}. Purging caches & reloading...`, err);
      if (!hasRetried) {
        sessionStorage.setItem(`chunk_retry_${chunkKey}`, 'true');
        if ('caches' in window) {
          try {
            const cacheKeys = await caches.keys();
            await Promise.all(cacheKeys.map(k => caches.delete(k)));
          } catch (_) {}
        }
        window.location.reload();
        return new Promise(() => {}); // prevent throwing while reload takes over
      }
      throw err;
    }
  });
}

// Code-split route components with automatic recovery against outdated build chunks
const LandingPage = lazyWithRetry(() => import('./pages/landing/LandingPage'), 'LandingPage');
const AboutUsPage = lazyWithRetry(() => import('./pages/landing/AboutUsPage'), 'AboutUsPage');
const TermsPage = lazyWithRetry(() => import('./pages/landing/TermsPage'), 'TermsPage');
const LoginPage = lazyWithRetry(() => import('./pages/auth/LoginPage'), 'LoginPage');
const RegisterPage = lazyWithRetry(() => import('./pages/auth/RegisterPage'), 'RegisterPage');
const ForgotPasswordPage = lazyWithRetry(() => import('./pages/auth/ForgotPasswordPage'), 'ForgotPasswordPage');
const LearnerDashboard = lazyWithRetry(() => import('./pages/learner/LearnerDashboard'), 'LearnerDashboard');
const TeacherDashboard = lazyWithRetry(() => import('./pages/teacher/TeacherDashboard'), 'TeacherDashboard');
const AdminDashboard = lazyWithRetry(() => import('./pages/admin/AdminDashboard'), 'AdminDashboard');
const ParentDashboard = lazyWithRetry(() => import('./pages/parent/ParentDashboard'), 'ParentDashboard');
import { TermsAgreementModal } from './components/common/TermsAgreementModal';

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRole?: string }> = ({
  children,
  allowedRole,
}) => {
  const { isAuthenticated, isLoading, role } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-canvas-dark">
        <LoadingSpinner size="lg" text="Authenticating session..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Strict Role-Based Access Control (RBAC):
  // Ensure users only access their authorized role dashboard
  const userRole = (role || 'learner').toLowerCase();
  if (allowedRole && userRole !== allowedRole.toLowerCase() && userRole !== 'admin') {
    return <Navigate to={`/dashboard/${userRole}`} replace />;
  }

  return <>{children}</>;
};

// Smart fallback redirect: If logged in, stay on the dashboard instead of being booted to the Landing Page
const SmartCatchAll: React.FC = () => {
  const { isAuthenticated, role, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-canvas-dark">
        <LoadingSpinner size="lg" text="Loading portal..." />
      </div>
    );
  }
  if (isAuthenticated && role) {
    return <Navigate to={`/dashboard/${role.toLowerCase()}`} replace />;
  }
  return <Navigate to="/" replace />;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <SchoolProvider>
        <AuthProvider>
          <Router>
            {/* Global Mandatory Terms & Conditions Agreement Gate (Requires acceptance before using app) */}
            <TermsAgreementModal isMandatoryGate={true} />

          <Suspense
            fallback={
              <div className="flex h-screen w-screen items-center justify-center bg-canvas-dark">
                <LoadingSpinner size="lg" text="Loading portal..." />
              </div>
            }
          >
            <ErrorBoundary fallbackTitle="Application Error" fallbackMessage="An issue was detected while rendering the application. Please reload or return to the main dashboard.">
              <Routes>
                {/* Landing & Public Pages */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/about" element={<AboutUsPage />} />
                <Route path="/terms" element={<TermsPage />} />

                {/* Auth Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />

                {/* Dashboard Routes */}
                <Route
                  path="/dashboard/learner"
                  element={
                    <ProtectedRoute allowedRole="learner">
                      <LearnerDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/teacher"
                  element={
                    <ProtectedRoute allowedRole="teacher">
                      <TeacherDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/admin"
                  element={
                    <ProtectedRoute allowedRole="admin">
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/parent"
                  element={
                    <ProtectedRoute allowedRole="parent">
                      <ParentDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Catch-all smart redirect: Authenticated users stay in their dashboard */}
                <Route path="*" element={<SmartCatchAll />} />
              </Routes>
            </ErrorBoundary>
          </Suspense>
          <PwaInstallPrompt />
        </Router>
      </AuthProvider>
    </SchoolProvider>
  </ThemeProvider>
  );
};
