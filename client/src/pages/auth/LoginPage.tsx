import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Sparkles,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  GraduationCap,
  ShieldCheck,
  BookOpen
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setError('Please enter your email or learner number, and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Determine if identifier is email or learner number
      const isEmail = identifier.includes('@');
      const credentials = isEmail
        ? { email: identifier.trim(), password }
        : { learnerNumber: identifier.trim(), password };

      const { role } = await login(credentials);
      navigate(`/dashboard/${role || 'learner'}`);
    } catch (err: any) {
      console.error('Login error:', err);
      const msg = err.response?.data?.error || err.response?.data?.message || 'Invalid credentials. Please verify your login details.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const setDemoAccount = (email: string, pass: string) => {
    setIdentifier(email);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="flex min-h-screen bg-canvas-dark text-slate-100 selection:bg-brand-600 selection:text-white">
      {/* Left Brand Showcase (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-surface-darker via-surface-dark to-brand-900/40 border-r border-white/10 relative overflow-hidden">
        {/* Background decorative glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-brand-600/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-brand-cyan/10 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 p-1 border border-white/15 shadow-glow-indigo">
              <img src="/assets/FH.png" alt="Fusion High Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-display text-xl font-extrabold tracking-tight text-white block">
                FUSION HIGH
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold block">
                ONE SCHOOL • ONE CONNECTION • LIMITLESS POTENTIAL
              </span>
            </div>
          </div>

          <h2 className="text-4xl font-extrabold font-display tracking-tight text-white leading-tight mb-4">
            The next generation LMS with <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-cyan-400">AI Tutor</span>.
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-md">
            Complete South African CAPS curriculum alignment, real-time assessment marking, intelligent textbook comprehension, and interactive student guidance.
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="relative z-10 grid grid-cols-2 gap-4 my-8">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <Sparkles className="w-6 h-6 text-cyan-400 mb-2" />
            <h4 className="text-xs font-bold text-white mb-1">AI Study Companion</h4>
            <p className="text-[11px] text-slate-400">Step-by-step math breakdowns and custom quiz generator.</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <ShieldCheck className="w-6 h-6 text-brand-400 mb-2" />
            <h4 className="text-xs font-bold text-white mb-1">Role Architecture</h4>
            <p className="text-[11px] text-slate-400">Dedicated portals for Teachers, Learners, Parents & Admins.</p>
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-500 font-mono">
          © 2026 Fusion High. Built with Google Antigravity & Stitch.
        </div>
      </div>

      {/* Right Login Form */}
      <div className="flex flex-1 flex-col justify-center items-center p-6 md:p-12 relative">
        <div className="w-full max-w-md">
          {/* Back to Landing Page */}
          <div className="mb-6">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-dark/80 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 text-xs font-semibold transition-all hover:border-white/10"
            >
              <span>← Back to Home</span>
            </Link>
          </div>

          <div className="text-center mb-8">
            <div className="inline-flex lg:hidden h-14 w-14 items-center justify-center rounded-2xl bg-white/5 p-1 border border-white/15 shadow-glow-indigo mb-4">
              <img src="/assets/FH.png" alt="Fusion High Logo" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold font-display text-white tracking-tight">
              Welcome back
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Enter your credentials to access your Fusion High workspace
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-3 animate-fade-in">
              <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Email or Learner Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. learner@fusionhigh.co.za or 2026001"
                  required
                  className="w-full rounded-xl bg-surface-dark border border-white/10 pl-10 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors"
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
                  placeholder="Enter your password"
                  required
                  className="w-full rounded-xl bg-surface-dark border border-white/10 pl-10 pr-10 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 text-white font-bold py-3 px-4 text-xs tracking-wide shadow-glow-indigo transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-xs text-slate-400">
              Don't have an account yet?{' '}
              <Link to="/register" className="font-bold text-brand-400 hover:text-brand-300">
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
