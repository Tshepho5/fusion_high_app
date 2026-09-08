import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { CosmicCanvasBackground } from '../../components/landing/CosmicCanvasBackground';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  Check,
  Sun,
  Moon,
} from 'lucide-react';
import { StarArrivalAppIcon } from '../../components/landing/StarArrivalAppIcon';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const isLight = theme === 'light';
  const isNavy = theme === 'navy';

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
      className={`min-h-screen ${
        isLight
          ? 'bg-slate-50 text-slate-900'
          : isNavy
          ? 'bg-[#0A1124] text-slate-100'
          : 'bg-[#070B14] text-slate-100'
      } flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-blue-600 selection:text-white relative overflow-hidden transition-colors duration-300`}
    >
      {/* Dynamic Ambient Background */}
      <CosmicCanvasBackground particleCount={isLight ? 25 : 40} interactive={true} />

      {/* Ambient Radial Glows */}
      <div
        className={`absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 ${
          isLight ? 'bg-blue-500/10' : 'bg-blue-600/10'
        } rounded-full blur-3xl pointer-events-none`}
      />

      {/* Header Navigation Controls */}
      <div className="absolute top-5 left-5 right-5 z-20 flex items-center justify-between pointer-events-none">
        <Link
          to="/"
          className={`pointer-events-auto flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 shadow-sm backdrop-blur-md ${
            isLight
              ? 'bg-white/80 hover:bg-white text-slate-700 hover:text-slate-950 border border-slate-200/80'
              : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
          }`}
        >
          <ArrowLeft className={`w-3.5 h-3.5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
          <span>Back to Home</span>
        </Link>

        <button
          type="button"
          onClick={toggleTheme}
          className={`pointer-events-auto p-2 rounded-xl text-xs font-semibold transition-all active:scale-95 shadow-sm backdrop-blur-md flex items-center gap-1.5 ${
            isLight
              ? 'bg-white/80 hover:bg-white text-slate-700 hover:text-slate-950 border border-slate-200/80'
              : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
          }`}
          title="Switch Theme"
          aria-label="Toggle Theme"
        >
          {isLight ? (
            <Moon className="w-4 h-4 text-blue-600" />
          ) : (
            <Sun className="w-4 h-4 text-amber-400" />
          )}
        </button>
      </div>

      {/* Main Login Screen Container */}
      <div className="w-full max-w-md my-auto relative z-10 animate-fade-in space-y-5">
        {/* Institutional App Icon with 5-Second Star Arrival Animation */}
        <div className="text-center space-y-2 flex flex-col items-center">
          <StarArrivalAppIcon
            className="w-16 h-16 sm:w-20 sm:h-20"
            containerClassName="w-20 h-20 sm:w-24 sm:h-24"
          />

          <h1
            className={`text-2xl sm:text-3xl font-black font-display tracking-tight ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}
          >
            Portal Gateway
          </h1>
          <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Sign in to access your Fusion High academic portal
          </p>
        </div>

        {/* Login Form Container */}
        <div
          className={`rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-4 transition-colors ${
            isLight
              ? 'bg-white/95 border border-slate-200/80 shadow-slate-200/60'
              : isNavy
              ? 'bg-[#111C38]/90 border border-blue-900/40'
              : 'bg-[#0F172A]/90 border border-slate-700/60'
          }`}
        >
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5 animate-fade-in shadow-sm">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse shrink-0" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email / Identifier Input */}
            <div
              className={`p-3.5 rounded-2xl border transition-all space-y-1 ${
                isLight
                  ? 'bg-slate-50 border-slate-200 focus-within:bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20'
                  : isNavy
                  ? 'bg-[#0D162D]/90 border-blue-800/40 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400/30'
                  : 'bg-[#111923]/90 border-slate-700/60 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/30'
              }`}
            >
              <label
                className={`block text-[10px] font-mono uppercase tracking-wider font-bold ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                Email or Learner ID
              </label>
              <div className="flex items-center gap-2.5">
                <Mail
                  className={`w-4 h-4 shrink-0 ${isLight ? 'text-blue-600' : 'text-blue-400'}`}
                />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter email or learner ID (e.g. 1001)"
                  required
                  autoComplete="username"
                  className={`w-full bg-transparent border-none p-0 text-xs sm:text-sm font-medium focus:outline-none ${
                    isLight
                      ? 'text-slate-900 placeholder:text-slate-400'
                      : 'text-white placeholder:text-slate-400'
                  }`}
                />
              </div>
            </div>

            {/* Password Input */}
            <div
              className={`p-3.5 rounded-2xl border transition-all space-y-1 ${
                isLight
                  ? 'bg-slate-50 border-slate-200 focus-within:bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20'
                  : isNavy
                  ? 'bg-[#0D162D]/90 border-blue-800/40 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400/30'
                  : 'bg-[#111923]/90 border-slate-700/60 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/30'
              }`}
            >
              <label
                className={`block text-[10px] font-mono uppercase tracking-wider font-bold ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                Password
              </label>
              <div className="flex items-center gap-2.5">
                <Lock
                  className={`w-4 h-4 shrink-0 ${isLight ? 'text-blue-600' : 'text-blue-400'}`}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className={`w-full bg-transparent border-none p-0 text-xs sm:text-sm font-medium focus:outline-none ${
                    isLight
                      ? 'text-slate-900 placeholder:text-slate-400'
                      : 'text-white placeholder:text-slate-400'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`p-1 transition-colors ${
                    isLight
                      ? 'text-slate-400 hover:text-blue-600'
                      : 'text-slate-400 hover:text-blue-300'
                  }`}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Options Row: Remember Me & Forgotten Password */}
            <div className="flex items-center justify-between pt-1 px-1 text-xs">
              <label
                className={`flex items-center gap-2 cursor-pointer select-none ${
                  isLight ? 'text-slate-700' : 'text-slate-300'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setRememberMe(!rememberMe)}
                  className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                    rememberMe
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : isLight
                      ? 'bg-white border-slate-300'
                      : 'bg-transparent border-slate-600'
                  }`}
                >
                  {rememberMe && <Check className="w-3 h-3 stroke-[3]" />}
                </button>
                <span className="font-medium text-[11px]">Remember Me</span>
              </label>

              <Link
                to="/forgot-password"
                className={`font-semibold transition-colors text-[11px] ${
                  isLight
                    ? 'text-blue-600 hover:text-blue-700'
                    : 'text-slate-400 hover:text-blue-300'
                }`}
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
        <div
          className={`text-center space-y-2 text-xs ${
            isLight ? 'text-slate-500' : 'text-slate-400'
          }`}
        >
          <p>
            Need a new account?{' '}
            <Link
              to="/register"
              className={`font-bold underline underline-offset-4 ${
                isLight
                  ? 'text-blue-600 hover:text-blue-700'
                  : 'text-blue-400 hover:text-blue-300'
              }`}
            >
              Apply / Register Here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

