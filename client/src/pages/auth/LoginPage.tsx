import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { CosmicCanvasBackground } from '../../components/landing/CosmicCanvasBackground';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  Check,
  GraduationCap,
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
      const trimmedId = identifier.trim();
      const credentials = {
        email: trimmedId,
        identifier: trimmedId,
        learnerNumber: trimmedId,
        password,
      };

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
    <div
      data-theme-preserve="true"
      className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-blue-600 selection:text-white relative overflow-hidden"
    >
      {/* Dynamic Ambient Background */}
      <CosmicCanvasBackground particleCount={40} interactive={true} />

      {/* Ambient Radial Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Back to Home Link */}
      <div className="absolute top-5 left-5 z-20">
        <Link
          to="/"
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-semibold transition-all active:scale-95 shadow-sm backdrop-blur-md"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-blue-400" />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Main Login Screen Container */}
      <div className="w-full max-w-md my-auto relative z-10 animate-fade-in space-y-5">
        {/* Institutional Crest */}
        <div className="text-center space-y-2">
          <div className="relative mx-auto w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-950/70 border border-blue-500/30 flex items-center justify-center shadow-lg shadow-blue-600/15 transition-all">
            <GraduationCap className="w-7 h-7 sm:w-8 sm:h-8 text-blue-400" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight">
            Portal Gateway
          </h1>
          <p className="text-xs text-slate-400">
            Sign in to access your Fusion High academic portal
          </p>
        </div>

        {/* Login Form Container */}
        <div className="rounded-3xl bg-[#0F172A]/90 border border-slate-700/60 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-fade-in shadow-sm">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse shrink-0" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" data-theme-preserve="true">
            {/* Email / Identifier Input */}
            <div
              className="p-3.5 rounded-2xl bg-[#111923]/90 border border-slate-700/60 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/30 transition-all space-y-1"
              data-theme-preserve="true"
            >
              <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                Email or Learner ID
              </label>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter email or learner ID (e.g. 1001)"
                  required
                  style={{ color: '#ffffff', backgroundColor: 'transparent' }}
                  className="w-full bg-transparent border-none p-0 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none font-medium"
                />
              </div>
            </div>

            {/* Password Input */}
            <div
              className="p-3.5 rounded-2xl bg-[#111923]/90 border border-slate-700/60 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/30 transition-all space-y-1"
              data-theme-preserve="true"
            >
              <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                Password
              </label>
              <div className="flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-blue-400 shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{ color: '#ffffff', backgroundColor: 'transparent' }}
                  className="w-full bg-transparent border-none p-0 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-blue-300 transition-colors p-1"
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
                    rememberMe ? 'bg-blue-600 border-blue-500 text-white' : 'bg-transparent border-slate-600'
                  }`}
                >
                  {rememberMe && <Check className="w-3 h-3 stroke-[3]" />}
                </button>
                <span className="font-medium text-slate-300 text-[11px]">Remember Me</span>
              </label>

              <Link
                to="/forgot-password"
                className="font-semibold text-slate-400 hover:text-blue-300 transition-colors text-[11px]"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Refined Institutional Primary Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/20 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Portal</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Registration Link */}
        <div className="text-center space-y-2 text-xs text-slate-400">
          <p>
            Need a new account?{' '}
            <Link to="/register" className="font-bold text-blue-400 hover:text-blue-300 underline underline-offset-4">
              Apply / Register Here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
