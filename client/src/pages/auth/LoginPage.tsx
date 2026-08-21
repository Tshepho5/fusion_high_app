import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setError('Please enter your email or learner number, and password.');
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
      navigate(`/dashboard/${role || 'learner'}`);
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
              Sign In to Fusion High
            </h1>
          </div>
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
              <label className="block text-xs font-bold text-slate-300">
                Email or Learner ID
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
                  placeholder="Enter your password"
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
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
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
