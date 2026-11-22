import React, { useState, useEffect } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
import api from '../../services/api';

let inMemoryToken = '';

function readInitialToken(searchParams: URLSearchParams): string {
  const fromUrl = searchParams.get('token') || new URLSearchParams(window.location.search).get('token') || '';
  if (fromUrl) {
    inMemoryToken = fromUrl;
    return fromUrl;
  }
  return inMemoryToken;
}

export const ActivateAccountPage: React.FC = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isVerifyEmailRoute = location.pathname === '/verify-email' || searchParams.get('mode') === 'verify';
  const initialPurpose = searchParams.get('purpose') || '';
  const [token] = useState(() => readInitialToken(searchParams));

  const [inspecting, setInspecting] = useState(Boolean(token));
  const [tokenInfo, setTokenInfo] = useState<{
    valid: boolean;
    purpose?: string;
    requires_password?: boolean;
    role?: string;
    learner_number?: string | null;
  } | null>(null);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);
  const [doneLearnerNumber, setDoneLearnerNumber] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [resendEmail, setResendEmail] = useState('');
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  // Immediately strip raw token from the browser address bar
  useEffect(() => {
    if (token && window.location.search.includes('token=')) {
      window.history.replaceState({}, '', location.pathname);
    }
  }, [token, location.pathname]);

  // Inspect token or auto-complete email verification when landing on /verify-email?token=...
  useEffect(() => {
    if (!token) {
      setInspecting(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        if (isVerifyEmailRoute) {
          const res = await api.post('/api/auth/verify-email', { token });
          if (cancelled) return;
          inMemoryToken = '';
          setDone(true);
          setDoneMessage(
            res.data?.message ||
              'Your email address has been verified. You can now sign in with your email and password.'
          );
          setInspecting(false);
          return;
        }

        const inspectRes = await api.post('/api/auth/activate/inspect', { token });
        if (cancelled) return;
        const info = inspectRes.data;
        setTokenInfo(info);
        if (info?.purpose === 'parent_email_verify' && info?.requires_password === false) {
          const verifyRes = await api.post('/api/auth/verify-email', { token });
          if (cancelled) return;
          inMemoryToken = '';
          setDone(true);
          setDoneMessage(
            verifyRes.data?.message ||
              'Your email address has been verified. You can now sign in with your email and password.'
          );
        }
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.response?.data?.error || 'This link is invalid or has expired. Please request a new one below.');
        setTokenInfo({ valid: false });
      } finally {
        if (!cancelled) setInspecting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, isVerifyEmailRoute]);

  const effectivePurpose = tokenInfo?.purpose || initialPurpose;
  const isLearnerHandoff =
    effectivePurpose === 'learner_parent_handoff' || effectivePurpose === 'learner_password_reset_handoff';
  const isLearnerActivation = effectivePurpose === 'learner_email_activation' || isLearnerHandoff;
  const learnerNumberDisplay = doneLearnerNumber || tokenInfo?.learner_number || null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!token) {
      setError('Open the activation link from your email or Parent Dashboard handoff. No valid link token is present.');
      return;
    }
    if (!password || !confirm) {
      setError('Please enter and confirm your private password.');
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const response = await api.post('/api/auth/activate', {
        token,
        password,
        confirm_password: confirm,
        learner_number: tokenInfo?.learner_number || undefined
      });
      inMemoryToken = '';
      setDone(true);
      setDoneLearnerNumber(response.data?.learner_number || tokenInfo?.learner_number || null);
      setDoneMessage(
        response.data?.message ||
          (isLearnerActivation
            ? 'Your private Learner password is ready. Sign in using your Official Learner Number and your new password.'
            : 'Your password is ready. Sign in with your registered email address.')
      );
    } catch (err: any) {
      setError(err.response?.data?.error || 'The password could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  const resend = async (event: React.FormEvent) => {
    event.preventDefault();
    setResendMessage(null);
    const cleanEmail = resendEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setResendMessage('Please enter a valid registered email address.');
      return;
    }
    try {
      const endpoint = isVerifyEmailRoute ? '/api/auth/verify-email/resend' : '/api/auth/activation/resend';
      const response = await api.post(endpoint, { email: cleanEmail });
      setResendMessage(
        response.data?.message || 'If that account is waiting for verification or activation, a new link has been sent.'
      );
    } catch {
      setResendMessage('If that account is waiting for verification or activation, a new link has been sent.');
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-7 space-y-5 shadow-2xl">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-cyan-300 font-bold">Geleza SA Secure Onboarding</p>
          <h1 className="text-2xl font-black mt-1">
            {isVerifyEmailRoute
              ? 'Verify your email address'
              : isLearnerHandoff
                ? effectivePurpose === 'learner_password_reset_handoff'
                  ? 'Learner Private Password Reset'
                  : 'Learner Private Password Setup'
                : isLearnerActivation
                  ? 'Activate Your Learner Account'
                  : 'Create your password'}
          </h1>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">
            {isVerifyEmailRoute
              ? 'Confirming your Parent email ownership before enabling Portal login.'
              : isLearnerHandoff
                ? 'This short-lived (15-minute), single-use screen is for the Learner personally. The Learner must enter and confirm their own private password without sharing it.'
                : isLearnerActivation
                  ? 'Personally create and confirm your private Learner password. Afterwards you will sign in using your Official Learner Number and your password.'
                  : 'This secure activation link works once for your invited Geleza SA account.'}
          </p>
        </div>

        {learnerNumberDisplay && (
          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-3.5 flex items-center justify-between gap-2">
            <span className="text-xs text-cyan-200 font-semibold">Official Learner Number</span>
            <span className="font-mono text-sm font-black text-cyan-300" data-testid="activation-learner-number">
              {learnerNumberDisplay}
            </span>
          </div>
        )}

        {inspecting ? (
          <div className="py-6 text-center text-sm text-slate-300">Checking your secure link…</div>
        ) : done ? (
          <div className="space-y-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <div className="flex items-start gap-2.5 text-emerald-300">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm font-semibold leading-relaxed">{doneMessage}</p>
            </div>
            {learnerNumberDisplay && (
              <p className="text-xs text-slate-200">
                Sign in with Official Learner Number <strong className="font-mono text-cyan-300">{learnerNumberDisplay}</strong> and your new private password.
              </p>
            )}
            <Link
              to="/login"
              className="inline-flex items-center justify-center w-full rounded-xl bg-cyan-500 hover:bg-cyan-400 px-4 py-2.5 text-sm font-bold text-slate-950 transition-colors"
            >
              Go to Sign In
            </Link>
          </div>
        ) : isVerifyEmailRoute ? (
          <div className="space-y-3">
            {error && (
              <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {!token && (
              <p className="text-xs text-slate-400">
                Open the verification link from your Application Received email, or request a fresh verification link below.
              </p>
            )}
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3.5">
            {isLearnerHandoff && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-amber-300" />
                <span>
                  <strong>Privacy check:</strong> Make sure the Learner is entering this password personally. Parents must not choose or see the Learner&apos;s password.
                </span>
              </div>
            )}

            <label className="block text-xs font-bold text-slate-200">
              <span className="flex items-center gap-1.5 mb-1">
                <Lock className="w-3.5 h-3.5 text-cyan-300" />
                Private Password
              </span>
              <div className="relative">
                <input
                  id="activate-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  placeholder="Create a strong private password"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 pr-10 text-sm text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </label>

            <label className="block text-xs font-bold text-slate-200">
              <span className="flex items-center gap-1.5 mb-1">
                <Lock className="w-3.5 h-3.5 text-cyan-300" />
                Confirm Private Password
              </span>
              <div className="relative">
                <input
                  id="activate-confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  autoComplete="new-password"
                  placeholder="Re-enter your private password"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 pr-10 text-sm text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? 'Hide confirmation password' : 'Show confirmation password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </label>

            <p className="text-[11px] text-slate-400">
              Use at least 8 characters, including an uppercase letter, a lowercase letter, a number, and a symbol.
            </p>
            {error && (
              <p className="text-sm text-rose-300 font-semibold" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy || tokenInfo?.valid === false}
              className="w-full rounded-xl bg-cyan-500 hover:bg-cyan-400 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {busy ? 'Saving…' : 'Save Private Password'}
            </button>
          </form>
        )}

        {!isLearnerHandoff && (
          <form onSubmit={resend} className="space-y-2.5 border-t border-slate-800 pt-4">
            <p className="text-xs text-slate-400">
              Need a new email verification or activation link? Enter your registered email address below.
            </p>
            <input
              type="email"
              value={resendEmail}
              onChange={(event) => setResendEmail(event.target.value)}
              placeholder="Your registered email address"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
            <div className="flex items-center justify-between gap-2">
              <button
                type="submit"
                className="rounded-xl border border-slate-700 hover:border-cyan-400 px-3 py-2 text-xs font-bold text-slate-200 cursor-pointer"
              >
                Send new link
              </button>
              <Link to="/login" className="text-xs font-bold text-cyan-300 hover:underline">
                Back to Sign In
              </Link>
            </div>
            {resendMessage && <p className="text-xs text-slate-300">{resendMessage}</p>}
          </form>
        )}
      </section>
    </main>
  );
};

export default ActivateAccountPage;
