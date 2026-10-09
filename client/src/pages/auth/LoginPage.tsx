import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { FusionAppIcon } from '../../components/common/FusionAppIcon';
import { GelezaSplashWaves } from '../../components/landing/GelezaSplashWaves';
import { CAMPUS_WEATHER_FALLBACK, cachedForecast, projectWeather, startCampusForecast, type CampusWeather, type ForecastPayload } from '../../utils/campusWeather';
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
  AlertCircle,
  ShieldCheck,
  Fingerprint,
  Sparkles
} from 'lucide-react';
import { startAuthentication, browserSupportsWebAuthn, platformAuthenticatorIsAvailable } from '@simplewebauthn/browser';
import { authService } from '../../services/api';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, establishSession } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const isLight = theme === 'light';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [accountReady, setAccountReady] = useState(false);
  const [checkingAccount, setCheckingAccount] = useState(false);
  const [fingerprintSupported, setFingerprintSupported] = useState(false);
  const [fingerprintAvailable, setFingerprintAvailable] = useState(false);
  const [fingerprintBusy, setFingerprintBusy] = useState(false);
  const forecastRef = useRef<ForecastPayload | null>(cachedForecast());
  const [weather, setWeather] = useState<CampusWeather>(() => {
    const cached = forecastRef.current;
    return cached ? projectWeather(cached) : CAMPUS_WEATHER_FALLBACK;
  });

  useEffect(() => {
    const apply = (payload: ForecastPayload) => {
      forecastRef.current = payload;
      setWeather(projectWeather(payload));
    };
    let stop = startCampusForecast(apply);
    const timer = window.setInterval(() => {
      stop();
      stop = startCampusForecast(apply);
    }, 10 * 60 * 1000);
    return () => {
      stop();
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!browserSupportsWebAuthn()) return;
    setFingerprintSupported(true);
    platformAuthenticatorIsAvailable()
      .then((ready) => {
        if (!cancelled) setFingerprintAvailable(ready);
      })
      .catch(() => {
        if (!cancelled) setFingerprintAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      const reason = sessionStorage.getItem('logout_reason');
      sessionStorage.removeItem('logout_reason');
      if (reason === 'session') {
        setError('You were signed out because this account signed in on another device or tab. Sign in again here to continue.');
      }
    } catch (_) {}
  }, []);

  const confirmAccount = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setAccountReady(true);
      return true;
    }
    setCheckingAccount(true);
    try {
      const result = await authService.checkLoginAccount(trimmed);
      if (result?.exists) {
        setAccountReady(true);
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next.identifier;
          return next;
        });
        return true;
      }
      // If server explicitly confirms no account exists, we can show a hint but do not lock the form
      setAccountReady(true);
      return true;
    } catch (_err: any) {
      // Network/offline resilience: never lock out user on pre-check failures
      setAccountReady(true);
      return true;
    } finally {
      setCheckingAccount(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedId = identifier.trim();
    const trimmedPass = password.trim();

    if (!trimmedId) {
      setFieldErrors((prev) => ({ ...prev, identifier: 'Please enter your email or learner ID.' }));
      setError('Please enter your email or learner ID before submitting.');
      return;
    }

    if (!trimmedPass) {
      setFieldErrors((prev) => ({ ...prev, password: 'Please enter your password.' }));
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    setError(null);
    setFieldErrors({});

    try {
      const credentials = {
        email: trimmedId,
        identifier: trimmedId,
        learnerNumber: trimmedId,
        password: trimmedPass,
      };

      const { role } = await login(credentials);
      navigate(`/dashboard/${role || 'learner'}`);
    } catch (err: any) {
      console.error('Login error:', err);
      const code = err.response?.data?.code;
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Sign-in could not be completed. Please verify your credentials and network connection.';

      if (code === 'account_not_found') {
        setFieldErrors({ identifier: msg });
        setError(msg);
      } else if (code === 'password_incorrect') {
        setFieldErrors({ password: msg });
        setError('The email or learner ID is recognized, but the password is incorrect.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFingerprintLogin = async () => {
    setFingerprintBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      const started = await authService.fingerprintLoginOptions();
      const assertion = await startAuthentication({ optionsJSON: started.options });
      const data = await authService.fingerprintLoginVerify({
        challengeId: started.challengeId,
        response: assertion,
      });
      const { role } = await establishSession(data);
      navigate(`/dashboard/${role || 'learner'}`);
    } catch (err: any) {
      const cancelled = err?.name === 'NotAllowedError' || err?.code === 'ERROR_CEREMONY_ABORTED';
      const message = cancelled
        ? 'Fingerprint sign-in was cancelled. Email and password are still here.'
        : err?.response?.data?.error ||
          'Fingerprint sign-in is not turned on for this device. Sign in with email and password, then enable the scanner in Settings.';
      setError(message);
    } finally {
      setFingerprintBusy(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-between overflow-x-hidden select-none font-sans bg-[#f6f1e6] dark:bg-[#07080d]">
      <GelezaSplashWaves weather={weather} />

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
                : 'bg-gradient-to-r from-[#18E2EC]/20 via-sky-500/10 to-[#13C8D9]/20'
            }`}
          />

          {/* Ultra-Transparent Frosted Glassmorphism Card */}
          <div
            className={`relative rounded-[32px] p-6 sm:p-9 backdrop-blur-2xl transition-all duration-300 shadow-2xl border ${
              isLight
                ? 'bg-white/45 hover:bg-white/55 border-white/70 shadow-[0_20px_50px_rgba(0,0,0,0.16)] ring-1 ring-white/50 text-[#0F172A]'
                : 'bg-slate-950/20 hover:bg-slate-950/30 border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.45)] ring-1 ring-white/10 text-white'
            }`}
          >
            <div
              className={`login-card-rim ${
                fieldErrors.identifier
                  ? 'login-card-rim--stopped'
                  : accountReady
                    ? 'login-card-rim--lap'
                    : 'login-card-rim--quiet'
              } ${isLight ? 'login-card-rim--light' : 'login-card-rim--dark'}`}
              aria-hidden="true"
            />
            {/* Header: Crest Icon & Portal Title */}
            <div className="text-center flex flex-col items-center space-y-1.5">
              <div className="relative group flex items-center justify-center my-1">
                {/* Ambient glow backdrop matching Landing Page */}
                <div
                  className={`absolute inset-0 rounded-2xl blur-xl transition-all duration-500 pointer-events-none ${
                    isLight
                      ? 'bg-blue-400/25 group-hover:bg-cyan-400/40'
                      : 'bg-cyan-500/20 group-hover:bg-cyan-400/35'
                  }`}
                />
                
                {/* Sleek Framed Icon Wrapper */}
                <div
                  className={`relative w-16 h-16 sm:w-18 sm:h-18 rounded-2xl p-1.5 border shadow-xl flex items-center justify-center backdrop-blur-md transition-transform duration-300 group-hover:scale-105 ${
                    isLight
                      ? 'bg-white/35 border-white/50 shadow-blue-500/10'
                      : 'bg-slate-950/40 border-cyan-500/25 shadow-[0_8px_25px_rgba(0,0,0,0.45)]'
                  }`}
                >
                  <FusionAppIcon className="w-13 h-13 sm:w-15 sm:h-15 drop-shadow-[0_2px_8px_rgba(56,189,248,0.35)]" />
                </div>
              </div>

              <h1
                className={`font-display text-2xl font-black tracking-tight mt-1 ${
                  isLight ? 'text-slate-900' : 'text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]'
                }`}
              >
                Geleza SA
              </h1>

              {/* Subtitle with Flanking Lines */}
              <div className="flex items-center justify-center gap-2 w-full pt-0.5">
                <div className={`h-[1.5px] w-8 ${isLight ? 'bg-[#0F172A]/70' : 'bg-cyan-400/60'}`} />
                <span
                  className={`text-[10px] sm:text-xs font-bold tracking-normal italic ${
                    isLight ? 'text-[#0F172A]' : 'text-cyan-300 drop-shadow-md'
                  }`}
                >
                  "Geleza Smart, The Future Is Thine"
                </span>
                <div className={`h-[1.5px] w-8 ${isLight ? 'bg-[#0F172A]/70' : 'bg-cyan-400/60'}`} />
              </div>
            </div>

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
                    isLight ? 'text-[#0F172A]' : 'text-slate-100 drop-shadow-sm'
                  }`}
                >
                  <Mail className={`w-3.5 h-3.5 ${isLight ? 'text-[#0F172A]' : 'text-cyan-300'}`} />
                  <span>Email or Learner ID</span>
                </label>
                <div className="relative">
                  <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${isLight ? 'text-[#0F172A]' : 'text-cyan-300'}`}>
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      setAccountReady(false);
                      setError(null);
                      setFieldErrors((prev) => {
                        const updated = { ...prev };
                        delete updated.identifier;
                        delete updated.password;
                        return updated;
                      });
                    }}
                    onBlur={() => {
                      if (identifier.trim()) confirmAccount(identifier);
                    }}
                    placeholder="Enter email or learner ID (e.g. 1001)"
                    required
                    autoComplete="username"
                    className={`w-full pl-11 pr-4 py-3.5 rounded-2xl text-xs sm:text-sm font-bold backdrop-blur-md border transition-all focus:outline-none focus:ring-2 shadow-xs ${
                      fieldErrors.identifier
                        ? 'border-rose-500 ring-2 ring-rose-500/20'
                        : isLight
                        ? 'bg-white/35 hover:bg-white/50 focus:bg-white/55 border-white/50 text-slate-950 placeholder:text-slate-600 focus:ring-blue-500/30 focus:border-blue-600'
                        : 'bg-black/35 hover:bg-black/45 focus:bg-black/55 border-white/25 text-white placeholder:text-slate-400 focus:ring-cyan-400 focus:border-cyan-300'
                    }`}
                  />
                </div>
                {fieldErrors.identifier && (
                  <p className="text-[11px] text-rose-500 dark:text-rose-400 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldErrors.identifier}</span>
                  </p>
                )}
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label
                  className={`text-xs font-bold flex items-center gap-1.5 ${
                    isLight ? 'text-[#0F172A]' : 'text-slate-100 drop-shadow-sm'
                  }`}
                >
                  <Lock className={`w-3.5 h-3.5 ${isLight ? 'text-[#0F172A]' : 'text-cyan-300'}`} />
                  <span>Password</span>
                </label>
                <div className="relative">
                  <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${isLight ? 'text-[#0F172A]' : 'text-cyan-300'}`}>
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    disabled={loading}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) {
                        setFieldErrors(prev => {
                          const updated = { ...prev };
                          delete updated.password;
                          return updated;
                        });
                      }
                    }}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    className={`w-full h-[52px] pl-11 pr-12 rounded-2xl text-xs sm:text-sm font-bold backdrop-blur-md border transition-colors focus:outline-none focus:ring-2 shadow-xs disabled:cursor-not-allowed disabled:opacity-60 ${
                      fieldErrors.password
                        ? 'border-rose-500 ring-2 ring-rose-500/20'
                        : isLight
                        ? 'bg-white/35 hover:bg-white/50 focus:bg-white/55 border-white/50 text-slate-950 placeholder:text-slate-600 focus:ring-blue-500/30 focus:border-blue-600'
                        : 'bg-black/35 hover:bg-black/45 focus:bg-black/55 border-white/25 text-white placeholder:text-slate-400 focus:ring-cyan-400 focus:border-cyan-300'
                    }`}
                  />
                  <button
                    type="button"
                    disabled={loading}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => setShowPassword((current) => !current)}
                    className={`absolute top-0 right-1 z-10 flex h-[52px] w-10 items-center justify-center rounded-lg ${
                      isLight
                        ? 'text-[#0F172A] hover:bg-white/70'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    } disabled:cursor-not-allowed disabled:opacity-40`}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4 shrink-0" /> : <Eye className="h-4 w-4 shrink-0" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-[11px] text-rose-500 dark:text-rose-400 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldErrors.password}</span>
                  </p>
                )}
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
                        ? 'bg-white/30 border-white/60 hover:bg-white/45'
                        : 'bg-white/20 border-white/50 hover:bg-white/30'
                    }`}
                  >
                    {rememberMe && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>
                  <span
                    className={`font-bold text-[11px] ${
                      isLight ? 'text-[#0F172A]' : 'text-white drop-shadow-sm'
                    }`}
                  >
                    Remember Me
                  </span>
                </label>

                <Link
                  to="/forgot-password"
                  className={`font-bold text-[11px] underline underline-offset-2 px-2 py-1 rounded-full transition-colors ${
                    isLight
                      ? 'text-[#0F172A] bg-white/85 hover:bg-white hover:text-[#1D4ED8]'
                      : 'text-cyan-300 hover:text-white drop-shadow-sm'
                  }`}
                >
                  Forgot Password?
                </Link>
              </div>

              {/* Submit Button: Always present, active, and prominent */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3.5 px-6 rounded-full font-black text-sm transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-2 border shadow-lg ${
                  accountReady && !fieldErrors.identifier ? 'login-sign-in-pulse' : ''
                } ${
                  isLight
                    ? 'login-sign-in--light bg-blue-600 hover:bg-blue-700 text-always-white border-blue-500/40 shadow-blue-600/30'
                    : 'login-sign-in--dark bg-gradient-to-r from-[#18E2EC] to-[#13C8D9] hover:from-[#5eecf4] hover:to-[#18E2EC] text-slate-950 border-[#18E2EC]/60 shadow-[#13C8D9]/40'
                }`}
              >
                {loading ? (
                  <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${isLight ? 'border-white' : 'border-slate-950'}`} />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Sign In to Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {fingerprintSupported && !fingerprintAvailable && (
                <p className={`text-[11px] text-center font-semibold ${isLight ? 'text-slate-700' : 'text-white/80'}`}>
                  Turn on this device’s fingerprint scanner in its settings to use fingerprint sign-in.
                </p>
              )}

              {fingerprintAvailable && (
                <button
                  type="button"
                  onClick={handleFingerprintLogin}
                  disabled={loading || fingerprintBusy}
                  className={`w-full py-3 px-6 rounded-full font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 border ${
                    isLight
                      ? 'bg-white/80 text-slate-900 border-white/70 hover:bg-white'
                      : 'bg-black/35 text-white border-white/25 hover:bg-black/50'
                  }`}
                >
                  {fingerprintBusy ? (
                    <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${isLight ? 'border-slate-900' : 'border-white'}`} />
                  ) : (
                    <Fingerprint className="w-4 h-4" />
                  )}
                  <span>Sign in with fingerprint</span>
                </button>
              )}

              {/* Quick Testing Credentials Panel */}
              <div className="pt-3 border-t border-white/20 dark:border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Testing Credentials (1-Click)
                  </span>
                  <span className={`text-[10px] font-mono font-bold ${isLight ? 'text-blue-700' : 'text-cyan-300'}`}>
                    pwd: password123
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { role: 'Admin', email: 'admin@gelezasa.co.za', badge: 'SuperAdmin' },
                    { role: 'Teacher', email: 'teacher.science@gelezasa.co.za', badge: 'Science' },
                    { role: 'Learner', email: 'learner.walters@gelezasa.co.za', badge: 'Grade 10' },
                    { role: 'Parent', email: 'parent.walters@gelezasa.co.za', badge: 'Guardian' }
                  ].map((acc) => (
                    <button
                      key={acc.role}
                      type="button"
                      onClick={() => {
                        setIdentifier(acc.email);
                        setPassword('password123');
                        setAccountReady(true);
                        setError(null);
                        setFieldErrors({});
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-left text-xs transition-all border flex items-center justify-between ${
                        isLight
                          ? 'bg-white/90 hover:bg-white text-slate-900 border-slate-300 shadow-xs hover:border-blue-500'
                          : 'bg-slate-900/70 hover:bg-slate-800 text-slate-100 border-white/15 hover:border-cyan-400'
                      }`}
                    >
                      <span className="font-bold text-[11px] truncate">{acc.role}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-medium ${
                        isLight ? 'bg-blue-100 text-blue-800' : 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/40'
                      }`}>
                        {acc.badge}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </form>
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
