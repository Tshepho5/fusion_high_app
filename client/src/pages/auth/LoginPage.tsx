import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  GraduationCap,
  Briefcase,
  Users,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  KeyRound
} from 'lucide-react';

type UserRoleTab = 'learner' | 'teacher' | 'parent' | 'admin';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [activeRole, setActiveRole] = useState<UserRoleTab>('learner');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Time-aware greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const roleConfig = {
    learner: {
      title: 'Learner Portal',
      placeholder: 'Learner Number or Email (e.g. 2026001)',
      icon: GraduationCap,
      accent: 'text-indigo-400',
      activeTab: 'bg-indigo-600 text-white shadow-sm',
      demoUser: 'learner@fusionhigh.co.za',
      demoPass: 'Learner@123'
    },
    teacher: {
      title: 'Educator Portal',
      placeholder: 'Teacher Email (e.g. teacher@fusionhigh.co.za)',
      icon: Briefcase,
      accent: 'text-cyan-400',
      activeTab: 'bg-cyan-600 text-white shadow-sm',
      demoUser: 'teacher@fusionhigh.co.za',
      demoPass: 'Teacher@123'
    },
    parent: {
      title: 'Parent Portal',
      placeholder: 'Parent Email or ID Number',
      icon: Users,
      accent: 'text-emerald-400',
      activeTab: 'bg-emerald-600 text-white shadow-sm',
      demoUser: 'parent@fusionhigh.co.za',
      demoPass: 'Parent@123'
    },
    admin: {
      title: 'Admin Command',
      placeholder: 'Administrator Email',
      icon: ShieldCheck,
      accent: 'text-amber-400',
      activeTab: 'bg-amber-600 text-white shadow-sm',
      demoUser: 'admin@fusionhigh.co.za',
      demoPass: 'Admin@123'
    }
  };

  const handleRoleChange = (role: UserRoleTab) => {
    setActiveRole(role);
    setError(null);
  };

  const handleQuickFill = (role: UserRoleTab) => {
    setActiveRole(role);
    setIdentifier(roleConfig[role].demoUser);
    setPassword(roleConfig[role].demoPass);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setError('Please enter your identifier and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const isEmail = identifier.includes('@');
      const credentials = isEmail
        ? { email: identifier.trim(), password }
        : { learnerNumber: identifier.trim(), password };

      const { role } = await login(credentials);
      navigate(`/dashboard/${role || activeRole}`);
    } catch (err: any) {
      console.error('Login error:', err);
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Invalid credentials. Please verify your details.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const CurrentRoleIcon = roleConfig[activeRole].icon;

  return (
    <div className="min-h-screen bg-canvas-dark text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-brand-500 selection:text-white relative overflow-hidden">
      {/* Back to Home Button */}
      <div className="absolute top-5 left-5 z-20">
        <Link
          to="/"
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-dark hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition-all active:scale-95 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 text-cyan-400" />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Main Login Container */}
      <div className="w-full max-w-md my-auto relative z-10 animate-fade-in space-y-6">
        {/* Emblem & Greeting Header */}
        <div className="text-center space-y-3">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-surface-dark border border-white/10 p-2.5 shadow-md flex items-center justify-center">
            <img src="/assets/FH.png" alt="Fusion High Emblem" className="w-full h-full object-contain drop-shadow-sm" />
          </div>
          <div>
            <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest font-semibold block">
              {getGreeting()} • Welcome Back
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight mt-0.5">
              Fusion High Portal
            </h1>
          </div>
        </div>

        {/* Interactive Role Switcher Tabs */}
        <div className="grid grid-cols-4 p-1 rounded-2xl bg-surface-darker border border-white/10 gap-1 shadow-inner">
          {(['learner', 'teacher', 'parent', 'admin'] as UserRoleTab[]).map((roleKey) => {
            const Icon = roleConfig[roleKey].icon;
            const isActive = activeRole === roleKey;
            return (
              <button
                key={roleKey}
                type="button"
                onClick={() => handleRoleChange(roleKey)}
                className={`py-2 px-1 rounded-xl text-[11px] font-bold flex flex-col items-center gap-1 transition-all capitalize ${
                  isActive
                    ? roleConfig[roleKey].activeTab
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[10px]">{roleKey}</span>
              </button>
            );
          })}
        </div>

        {/* Card Form */}
        <div className="p-6 sm:p-7 rounded-3xl bg-surface-dark border border-white/10 shadow-xl space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse shrink-0" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Identifier Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>Account Identifier</span>
                <span className={`text-[10px] font-mono font-medium ${roleConfig[activeRole].accent}`}>
                  {roleConfig[activeRole].title}
                </span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <CurrentRoleIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={roleConfig[activeRole].placeholder}
                  required
                  className="w-full rounded-xl bg-surface-darker border border-white/10 pl-10 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-300">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your security password"
                  required
                  className="w-full rounded-xl bg-surface-darker border border-white/10 pl-10 pr-10 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-extrabold py-3 px-4 text-xs shadow-md transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to {roleConfig[activeRole].title}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill Shortcut Chips */}
          <div className="pt-3 border-t border-white/5 text-center space-y-2">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 block">
              Quick Test Autofill
            </span>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {(['learner', 'teacher', 'parent', 'admin'] as UserRoleTab[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleQuickFill(r)}
                  className="px-2.5 py-1 rounded-lg bg-surface-darker hover:bg-white/10 border border-white/5 hover:border-white/15 text-[10px] font-bold text-slate-300 transition-all capitalize active:scale-95"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Actions Links */}
        <div className="text-center space-y-2 text-xs text-slate-400">
          <p>
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-cyan-400 hover:text-cyan-300">
              Register here
            </Link>
          </p>
          <p>
            Applying for admission?{' '}
            <a href="/application.html" className="font-bold text-emerald-400 hover:text-emerald-300">
              Submit Grade 8–12 Application
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};
