import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useSchool } from '../../context/SchoolContext';
import { FusionAppIcon } from '../../components/common/FusionAppIcon';
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
  UserPlus,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { currentSchool } = useSchool();

  const isLight = theme === 'light';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inactivityNotice, setInactivityNotice] = useState<string | null>(null);

  useEffect(() => {
    try {
      const reason = sessionStorage.getItem('logout_reason');
      if (reason === 'inactivity') {
        sessionStorage.removeItem('logout_reason');
        setInactivityNotice('You were automatically logged out due to 1 minute and 30 seconds of inactivity. Please sign in to resume your session.');
      }
    } catch (_) {}
  }, []);

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
    <div className="min-h-screen relative flex flex-col justify-between overflow-x-hidden select-none font-sans">
      {/* ================= 1. FULLSCREEN PHOTO BACKGROUND ================= */}
      <div className="fixed inset-0 z-0">
        <img
          src="/assets/fusion-login-bg.jpg"
          alt="Fusion High School Campus & Learners"
          className="w-full h-full object-cover object-center scale-[1.01] transition-transform duration-1000"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/assets/landing-bg.png';
          }}
        />
        {/* Dynamic Film Overlay: crystal bright in light mode, cinematic evening in dark mode */}
        <div
          className={`absolute inset-0 transition-colors duration-500 ${
            isLight
              ? 'bg-gradient-to-b from-sky-950/20 via-black/10 to-black/35 backdrop-blur-[0.5px]'
              : 'bg-gradient-to-b from-slate-950/65 via-black/50 to-black/80 backdrop-blur-[1.5px]'
          }`}
        />
      </div>

      {/* ================= 2. TOP HEADER (REMAINS VISIBLE) ================= */}
      <header className="relative z-30 flex items-center justify-between px-4 sm:px-8 md:px-12 pt-5 pb-3 max-w-7xl mx-auto w-full">
        {/* Back to Home Navigation Pill */}
        <Link
          to="/"
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold shadow-lg backdrop-blur-md transition-all active:scale-95 border ${
            isLight
              ? 'bg-white/80 hover:bg-white text-slate-900 border-white/70 shadow-black/10'
              : 'bg-black/40 hover:bg-black/60 text-white border-white/25 shadow-black/30'
          }`}
        >
          <ArrowLeft className={`w-4 h-4 ${isLight ? 'text-blue-600' : 'text-cyan-300'}`} />
          <span>Back to Home</span>
        </Link>

        {/* Center Institutional Badge (Visible on larger screens) */}
        <div
          className={`hidden sm:flex items-center gap-2.5 px-4 py-1.5 rounded-full backdrop-blur-md shadow-lg border ${
            isLight
              ? 'bg-white/80 border-white/70 text-slate-900'
              : 'bg-black/40 border-white/25 text-white'
          }`}
        >
          <div className="w-6 h-6 rounded-full overflow-hidden bg-blue-500/15 p-0.5 flex items-center justify-center">
            <FusionAppIcon className="w-5 h-5" />
          </div>
          <span className="text-xs font-extrabold tracking-wider uppercase">
            GELEZA SA
          </span>
        </div>

        {/* Theme Switcher Pill Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold shadow-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer border ${
            isLight
              ? 'bg-white/80 hover:bg-white text-slate-900 border-white/70 shadow-black/10'
              : 'bg-black/40 hover:bg-black/60 text-white border-white/25 shadow-black/30'
          }`}
          title="Toggle Theme"
        >
          {isLight ? (
            <>
              <Sun className="w-4 h-4 text-amber-500" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-cyan-300" />
              <span>Dark Mode</span>
            </>
          )}
        </button>
      </header>

      {/* ================= 3. CENTERED ULTRA-TRANSPARENT LOGIN FORM ================= */}
      <main className="relative z-20 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-md animate-fade-in relative">
          
          {/* Subtle Ambient Card Glow */}
          <div
            className={`absolute -inset-2 rounded-[38px] blur-2xl pointer-events-none opacity-50 transition-colors duration-500 ${
              isLight
                ? 'bg-gradient-to-r from-sky-400/20 via-blue-500/15 to-amber-300/20'
                : 'bg-gradient-to-r from-cyan-500/25 via-blue-600/20 to-purple-600/25'
            }`}
          />

          {/* Ultra-Transparent Frosted Glassmorphism Card */}
          <div
            className={`relative rounded-[32px] p-6 sm:p-9 backdrop-blur-2xl transition-all duration-300 shadow-2xl border ${
              isLight
                ? 'bg-white/60 hover:bg-white/70 border-white/80 shadow-[0_25px_60px_rgba(0,0,0,0.2)] ring-1 ring-white/60 text-slate-900'
                : 'bg-slate-950/45 hover:bg-slate-950/55 border-white/20 shadow-[0_25px_60px_rgba(0,0,0,0.65)] ring-1 ring-white/15 text-white'
            }`}
          >
            {/* Header: Crest Icon & Portal Title */}
            <div className="text-center flex flex-col items-center space-y-1.5">
              <div
                className={`w-16 h-16 rounded-2xl p-1 border shadow-md flex items-center justify-center backdrop-blur-md ${
                  isLight
                    ? 'bg-white/80 border-slate-200/80 shadow-blue-500/10'
                    : 'bg-white/10 border-white/25 shadow-black/20'
                }`}
              >
                <FusionAppIcon className="w-13 h-13" />
              </div>

              <h1
                className={`font-display text-2xl font-black tracking-tight mt-1 ${
                  isLight ? 'text-slate-900' : 'text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]'
                }`}
              >
                {currentSchool?.name || 'Geleza SA'}
              </h1>

              {/* Subtitle with Flanking Lines */}
              <div className="flex items-center justify-center gap-2 w-full pt-0.5">
                <div className={`h-[1.5px] w-8 ${isLight ? 'bg-sky-500/60' : 'bg-cyan-400/60'}`} />
                <span
                  className={`text-[10px] sm:text-xs font-bold tracking-normal italic ${
                    isLight ? 'text-sky-700' : 'text-cyan-300 drop-shadow-md'
                  }`}
                >
                  "{currentSchool?.motto || 'Geleza Smart, The Future Is Thine'}"
                </span>
                <div className={`h-[1.5px] w-8 ${isLight ? 'bg-sky-500/60' : 'bg-cyan-400/60'}`} />
              </div>
            </div>

            {/* Inactivity Notice Banner */}
            {inactivityNotice && (
              <div className="mt-4 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-700 dark:text-amber-200 text-xs flex items-center gap-2.5 backdrop-blur-md shadow-sm animate-fade-in">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <span className="font-bold leading-snug">
                  {inactivityNotice}
                </span>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-700 dark:text-rose-200 text-xs flex items-center gap-2.5 backdrop-blur-md shadow-sm animate-fade-in">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                <span className="font-bold leading-snug">
                  {typeof error === 'string' ? error : (error as any)?.message || String(error)}
                </span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {/* Email / Learner ID Input */}
              <div className="space-y-1.5">
                <label
                  className={`text-xs font-bold flex items-center gap-1.5 ${
                    isLight ? 'text-slate-900' : 'text-slate-100 drop-shadow-sm'
                  }`}
                >
                  <Mail className={`w-3.5 h-3.5 ${isLight ? 'text-blue-600' : 'text-cyan-300'}`} />
                  <span>Email or Learner ID</span>
                </label>
                <div className="relative">
                  <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${isLight ? 'text-blue-600' : 'text-cyan-300'}`}>
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter email or learner ID (e.g. 1001)"
                    required
                    autoComplete="username"
                    className={`w-full pl-11 pr-4 py-3.5 rounded-2xl text-xs sm:text-sm font-bold backdrop-blur-md border transition-all focus:outline-none focus:ring-2 shadow-xs ${
                      isLight
                        ? 'bg-white/80 hover:bg-white focus:bg-white border-slate-300 text-slate-950 placeholder:text-slate-500 focus:ring-blue-500/30 focus:border-blue-600'
                        : 'bg-black/35 hover:bg-black/45 focus:bg-black/55 border-white/25 text-white placeholder:text-slate-400 focus:ring-cyan-400 focus:border-cyan-300'
                    }`}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label
                  className={`text-xs font-bold flex items-center gap-1.5 ${
                    isLight ? 'text-slate-900' : 'text-slate-100 drop-shadow-sm'
                  }`}
                >
                  <Lock className={`w-3.5 h-3.5 ${isLight ? 'text-blue-600' : 'text-cyan-300'}`} />
                  <span>Password</span>
                </label>
                <div className="relative">
                  <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${isLight ? 'text-blue-600' : 'text-cyan-300'}`}>
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    className={`w-full pl-11 pr-11 py-3.5 rounded-2xl text-xs sm:text-sm font-bold backdrop-blur-md border transition-all focus:outline-none focus:ring-2 shadow-xs ${
                      isLight
                        ? 'bg-white/80 hover:bg-white focus:bg-white border-slate-300 text-slate-950 placeholder:text-slate-500 focus:ring-blue-500/30 focus:border-blue-600'
                        : 'bg-black/35 hover:bg-black/45 focus:bg-black/55 border-white/25 text-white placeholder:text-slate-400 focus:ring-cyan-400 focus:border-cyan-300'
                    }`}
                  />
                  {/* View Password Toggle Icon (Clearly visible in both Light and Dark modes) */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg cursor-pointer transition-colors ${
                      isLight
                        ? 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/60'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password Row */}
              <div className="flex items-center justify-between pt-1 px-1 text-xs">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <button
                    type="button"
                    onClick={() => setRememberMe(!rememberMe)}
                    className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                      rememberMe
                        ? isLight
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                          : 'bg-cyan-500 border-cyan-400 text-slate-950 font-bold shadow-sm'
                        : isLight
                        ? 'bg-white/90 border-slate-300 hover:bg-white'
                        : 'bg-white/20 border-white/50 hover:bg-white/30'
                    }`}
                  >
                    {rememberMe && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>
                  <span
                    className={`font-bold text-[11px] ${
                      isLight ? 'text-slate-900' : 'text-white drop-shadow-sm'
                    }`}
                  >
                    Remember Me
                  </span>
                </label>

                <Link
                  to="/forgot-password"
                  className={`font-bold text-[11px] underline underline-offset-2 transition-colors ${
                    isLight
                      ? 'text-blue-600 hover:text-blue-800'
                      : 'text-cyan-300 hover:text-white drop-shadow-sm'
                  }`}
                >
                  Forgot Password?
                </Link>
              </div>

              {/* Submit Button: Light Mode uses vibrant royal blue; Dark Mode uses glowing cyan */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3.5 px-6 rounded-full font-black text-sm transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-2 border shadow-lg ${
                  isLight
                    ? 'bg-gradient-to-r from-blue-600 via-sky-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white border-blue-400/30 shadow-blue-600/30'
                    : 'bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 hover:from-cyan-300 hover:to-sky-400 text-slate-950 border-cyan-200 shadow-cyan-500/40'
                }`}
              >
                {loading ? (
                  <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${isLight ? 'border-white' : 'border-slate-950'}`} />
                ) : (
                  <>
                    <span>Sign In to Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* OR Divider */}
            <div className="relative my-5 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className={`w-full border-t ${isLight ? 'border-slate-300/80' : 'border-white/20'}`} />
              </div>
              <span
                className={`relative px-3 text-[10px] font-black uppercase tracking-widest rounded-full border backdrop-blur-md ${
                  isLight
                    ? 'bg-white/85 text-slate-600 border-slate-300/80'
                    : 'bg-black/50 text-cyan-300 border-white/20'
                }`}
              >
                OR
              </span>
            </div>

            {/* Secondary Register Pill Button */}
            <Link
              to="/register"
              className={`w-full py-3 px-6 rounded-full border backdrop-blur-md font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.98] ${
                isLight
                  ? 'bg-white/70 hover:bg-white/90 border-slate-300 text-slate-800'
                  : 'bg-black/35 hover:bg-black/50 border-white/25 text-white'
              }`}
            >
              <UserPlus className={`w-3.5 h-3.5 ${isLight ? 'text-blue-600' : 'text-cyan-300'}`} />
              <span>
                Need a new account?{' '}
                <span className={`underline font-extrabold ml-0.5 ${isLight ? 'text-blue-600' : 'text-cyan-300'}`}>
                  Apply / Register Here
                </span>
              </span>
            </Link>
          </div>
        </div>
      </main>

      {/* ================= 4. SUBTLE FOOTER ================= */}
      <footer className="relative z-20 py-3.5 text-center text-[11px] font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
        &copy; {new Date().getFullYear()} Geleza SA. All rights reserved.
      </footer>
    </div>
  );
};
