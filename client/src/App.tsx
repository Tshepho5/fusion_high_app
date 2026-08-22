import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { PwaInstallPrompt } from './components/common/PwaInstallPrompt';

// Code-split route components for performance optimization & faster initial bundle loading
const LandingPage = lazy(() => import('./pages/landing/LandingPage').then(m => ({ default: m.LandingPage })));
const AboutUsPage = lazy(() => import('./pages/landing/AboutUsPage').then(m => ({ default: m.AboutUsPage })));
const TermsPage = lazy(() => import('./pages/landing/TermsPage').then(m => ({ default: m.TermsPage })));
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage').then(m => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const LearnerDashboard = lazy(() => import('./pages/learner/LearnerDashboard').then(m => ({ default: m.LearnerDashboard })));
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard').then(m => ({ default: m.TeacherDashboard })));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const ParentDashboard = lazy(() => import('./pages/parent/ParentDashboard').then(m => ({ default: m.ParentDashboard })));
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

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
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

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          <PwaInstallPrompt />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};
