import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../../services/api';
import { FusionAIIcon } from '../../components/common/FusionAIIcon';
import {
  Mail,
  KeyRound,
  ArrowRight,
  CheckCircle,
  Lock,
  Clock,
  RefreshCw,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  Check
} from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Distinct steps: 'request' -> 'verify' (with 60s timer) -> 'reset' (no timer, view password toggles)
  const [step, setStep] = useState<'request' | 'verify' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [backupOtp, setBackupOtp] = useState<string | null>(null);
  const [verifiedOtp, setVerifiedOtp] = useState('');

  // Password fields and visibility toggles
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Timer state: 60 seconds countdown
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [timerActive, setTimerActive] = useState<boolean>(false);

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Initialize from direct email link parameters
  useEffect(() => {
    const urlEmail = searchParams.get('email');
    const urlOtp = searchParams.get('otp');
    const urlStep = searchParams.get('step');

    if (urlEmail) {
      setEmail(urlEmail);
    }
    if (urlOtp) {
      setOtp(urlOtp);
    }
    if (urlEmail && (urlStep === 'verify' || urlOtp)) {
      setStep('verify');
      setTimeLeft(60);
      setTimerActive(true);
      setMessage('Opened from your recovery email. Please verify your 4-digit code (valid for 60 seconds):');
    }
  }, [searchParams]);

  // 60-Second Countdown Timer (Active ONLY on 'verify' step)
  useEffect(() => {
    let interval: any = null;
    if (step === 'verify' && timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (step === 'verify' && timeLeft === 0 && timerActive) {
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [step, timerActive, timeLeft]);

  // Format seconds as MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Step 1: Request OTP (Instant dispatch + local display backup)
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await authService.forgotPassword({ email: email.trim().toLowerCase() });
      if (res.otp) {
        setBackupOtp(res.otp);
        setOtp(res.otp);
      }
      setMessage('A 4-digit security code has been generated (valid for 60 seconds).');
      setStep('verify');
      setTimeLeft(60);
      setTimerActive(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send recovery code. Please check your email.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP Code (60s countdown)
  const handleResendOtp = async () => {
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    setResending(true);
    setError(null);
    try {
      const res = await authService.forgotPassword({ email: email.trim().toLowerCase() });
      if (res.otp) {
        setBackupOtp(res.otp);
        setOtp(res.otp);
      }
      setMessage('A fresh OTP code has been dispatched (valid for 60 seconds).');
      setTimeLeft(60);
      setTimerActive(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  };

  // Step 2: Verify OTP (Timer stops immediately upon success)
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!otp || otp.trim().length < 4) {
      setError('Please enter the 4-digit OTP code.');
      return;
    }

    setLoading(true);

    try {
      await authService.verifyOtp({
        email: email.trim().toLowerCase(),
        otp: otp.trim()
      });

      // Stop the timer completely
      setTimerActive(false);
      setVerifiedOtp(otp.trim());
      setMessage('OTP verified successfully. You can now take your time to create a strong new password.');
      // Advance to Step 3 (Reset password with NO timer)
      setStep('reset');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid or expired OTP code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset Password (No time limit)
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);

    try {
      const res = await authService.resetPassword({
        email: email.trim().toLowerCase(),
        otp: verifiedOtp || otp.trim(),
        newPassword
      });

      setMessage(res.message || 'Password updated successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-canvas-dark text-slate-100 selection:bg-brand-600 selection:text-white justify-center items-center p-6 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md rounded-3xl bg-surface-dark border border-white/10 p-8 shadow-2xl animate-fade-in relative z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-cyan-500 shadow-glow-indigo text-white font-black text-xl mb-3">
            F
          </div>
          <h2 className="text-2xl font-extrabold font-display text-white tracking-tight">
            {step === 'reset' ? 'Create New Password' : 'Account Recovery'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {step === 'request' && 'Enter your registered email to receive a 60-second recovery code'}
            {step === 'verify' && 'Enter the 4-digit code sent to your email (60-second limit)'}
            {step === 'reset' && 'Create your new password. Take your time to set a secure password.'}
          </p>
        </div>

        {/* Stepper Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full transition-all ${
            step === 'request'
              ? 'bg-brand-600 text-white shadow-glow-indigo'
              : 'bg-white/5 text-slate-400'
          }`}>
            <span>1. Email</span>
          </div>

          <div className="w-4 h-[1px] bg-white/10" />

          <div className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full transition-all ${
            step === 'verify'
              ? 'bg-amber-600 text-white shadow-md'
              : step === 'reset'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-white/5 text-slate-400'
          }`}>
            <span>2. Verify OTP</span>
            {step === 'reset' && <Check className="w-3 h-3 text-emerald-400" />}
          </div>

          <div className="w-4 h-[1px] bg-white/10" />

          <div className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full transition-all ${
            step === 'reset'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white/5 text-slate-400'
          }`}>
            <span>3. New Password</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-3 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-3 animate-fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 1: Request OTP */}
        {/* ========================================================================= */}
        {step === 'request' && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Registered Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. parent@gmail.com"
                  required
                  className="w-full rounded-xl bg-surface-darker border border-white/10 pl-10 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold py-3 px-4 text-xs tracking-wide shadow-glow-indigo transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Send 60s Recovery Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: Verify OTP (with strictly 60s countdown) */}
        {/* ========================================================================= */}
        {step === 'verify' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4 animate-fade-in">
            {backupOtp && (
              <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs flex items-center justify-between gap-3 animate-fade-in">
                <div className="flex items-center gap-2">
                  <FusionAIIcon className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Security Code: <strong className="text-white font-mono text-sm tracking-widest bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-400/30">{backupOtp}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => setOtp(backupOtp)}
                  className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[10px] transition-colors"
                >
                  Fill Code
                </button>
              </div>
            )}

            {/* Target Account Email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Account Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full rounded-xl bg-surface-darker/60 border border-white/10 pl-10 pr-4 py-2.5 text-xs text-slate-300 font-mono"
                />
              </div>
            </div>

            {/* OTP Code with 60s Countdown Timer */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  4-Digit OTP Code
                </label>
                
                <div className={`inline-flex items-center gap-1.5 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                  timeLeft > 15
                    ? 'bg-brand-500/10 text-brand-300 border-brand-500/30'
                    : timeLeft > 0
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 animate-pulse'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}>
                  <Clock className="w-3 h-3" />
                  <span>{timeLeft > 0 ? `Expires: ${formatTime(timeLeft)}` : 'Expired'}</span>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="e.g. 4829"
                  maxLength={4}
                  required
                  className="w-full rounded-xl bg-surface-darker border border-white/10 pl-10 pr-4 py-2.5 text-lg font-mono tracking-widest text-center text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 font-bold"
                />
              </div>

              {/* Progress bar visualizer */}
              <div className="w-full bg-surface-darker h-1.5 rounded-full overflow-hidden mt-1.5 border border-white/5">
                <div
                  className={`h-full transition-all duration-1000 ${
                    timeLeft > 15 ? 'bg-gradient-to-r from-brand-500 to-cyan-400' : 'bg-rose-500'
                  }`}
                  style={{ width: `${(timeLeft / 60) * 100}%` }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || timeLeft === 0 || otp.length < 4}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold py-3 px-4 text-xs tracking-wide shadow-md transition-all disabled:opacity-40"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Verify OTP Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Resend button */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setStep('request')}
                className="text-[11px] text-slate-400 hover:text-white transition-colors"
              >
                ← Change Email
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resending || (timeLeft > 0 && timeLeft < 50)}
                className="flex items-center gap-1 text-[11px] text-brand-400 hover:text-brand-300 font-bold transition-colors disabled:opacity-40"
              >
                <RefreshCw className={`w-3 h-3 ${resending ? 'animate-spin' : ''}`} />
                <span>{resending ? 'Sending...' : 'Resend Code (60s)'}</span>
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: Reset Password (NO time interval, View Password toggles) */}
        {/* ========================================================================= */}
        {step === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4 animate-fade-in">
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Identity Verified. You can now set your new password without any time limit.</span>
            </div>

            {/* New Password with View Password Toggle */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                New Password *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 chars, uppercase, lowercase & symbol"
                  required
                  className="w-full rounded-xl bg-surface-darker border border-white/10 pl-10 pr-11 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition-colors"
                  title={showNewPassword ? 'Hide password' : 'View password'}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password with View Password Toggle */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Confirm New Password *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password to confirm"
                  required
                  className="w-full rounded-xl bg-surface-darker border border-white/10 pl-10 pr-11 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition-colors"
                  title={showConfirmPassword ? 'Hide password' : 'View password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !newPassword || !confirmPassword}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold py-3 px-4 text-xs tracking-wide shadow-md transition-all disabled:opacity-40"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Save New Password & Replace Old</span>
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-white/10 text-center">
          <Link to="/login" className="text-xs font-bold text-brand-400 hover:text-brand-300">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
