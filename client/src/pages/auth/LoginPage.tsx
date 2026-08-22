import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Zap,
  ArrowLeft,
  Check
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setError('Please enter your email or learner ID, and password.');
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

  const handleQuickFill = (email: string, pass: string) => {
    setIdentifier(email);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#061720] via-[#081b24] to-[#030d12] text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-cyan-400 selection:text-slate-950 relative overflow-hidden">
      {/* Ambient Radial Glow Overlays */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Back to Home Link */}
      <div className="absolute top-5 left-5 z-20">
        <Link
          to="/"
          className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#111923]/80 hover:bg-white/10 text-slate-300 hover:text-white border border-slate-700/50 text-xs font-semibold transition-all active:scale-95 shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Main Login Screen Container */}
      <div className="w-full max-w-sm sm:max-w-md my-auto relative z-10 animate-fade-in space-y-5">
        {/* Glowing Circular Energy Emblem */}
        <div className="text-center space-y-3">
          <div className="relative mx-auto w-20 h-20 rounded-full bg-gradient-to-b from-cyan-500/20 to-teal-500/10 border-2 border-cyan-400/80 flex items-center justify-center shadow-[0_0_35px_rgba(6,182,212,0.55)] transition-all group hover:scale-105">
            <Zap className="w-10 h-10 text-cyan-300 fill-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.85)]" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight drop-shadow-md">
            Log In
          </h1>
        </div>

        {/* Login Form */}
        <div className="space-y-4">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-fade-in shadow-sm">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse shrink-0" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Email / Identifier Neo-Glass Input */}
            <div className="p-3.5 rounded-2xl bg-[#111923]/90 border border-slate-700/60 focus-within:border-cyan-400 focus-within:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all space-y-1">
              <label className="block text-[11px] font-semibold text-slate-400">Email or Learner ID</label>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-cyan-400 shrink-0" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter your email or learner ID"
                  required
                  className="w-full bg-transparent border-none p-0 text-xs text-white placeholder-slate-500 focus:outline-none font-medium"
                />
              </div>
            </div>

            {/* Password Neo-Glass Input */}
            <div className="p-3.5 rounded-2xl bg-[#111923]/90 border border-slate-700/60 focus-within:border-cyan-400 focus-within:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all space-y-1">
              <label className="block text-[11px] font-semibold text-slate-400">Password</label>
              <div className="flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-cyan-400 shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-transparent border-none p-0 text-xs text-white placeholder-slate-500 focus:outline-none font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-cyan-300 transition-colors p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Options Row: Remember Me & Forgotten Password */}
            <div className="flex items-center justify-between pt-1 px-1 text-xs">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
                <button
                  type="button"
                  onClick={() => setRememberMe(!rememberMe)}
                  className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                    rememberMe ? 'bg-cyan-500 border-cyan-400 text-slate-950' : 'bg-transparent border-slate-600'
                  }`}
                >
                  {rememberMe && <Check className="w-3 h-3 stroke-[3]" />}
                </button>
                <span className="font-medium text-slate-300">Remember Me</span>
              </label>

              <Link
                to="/forgot-password"
                className="font-semibold text-slate-300 hover:text-cyan-300 transition-colors"
              >
                Forgotten Password?
              </Link>
            </div>

            {/* Vibrant Cyan Glowing Pill CTA Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-full bg-gradient-to-r from-cyan-400 via-cyan-300 to-teal-300 hover:from-cyan-300 hover:to-teal-200 text-slate-950 font-black text-sm shadow-[0_0_30px_rgba(34,211,238,0.55)] transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
              ) : (
                <span>Log In</span>
              )}
            </button>
          </form>

          {/* Social SSO Buttons */}
          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              className="w-full py-2.5 px-4 rounded-full bg-[#101721]/80 hover:bg-[#151f2c] text-white border border-slate-700/60 font-semibold text-xs transition-all flex items-center justify-center gap-2.5 active:scale-[0.98]"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Log In with Google</span>
            </button>
          </div>
        </div>

        {/* Footer Registration Link */}
        <div className="text-center space-y-3 pt-2 text-xs text-slate-400">
          <p>
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-cyan-400 hover:text-cyan-300">
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
