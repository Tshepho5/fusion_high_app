import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../../services/api';
import { FusionAIIcon } from '../../components/common/FusionAIIcon';
import {
  Mail,
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
  const whatsappRecoveryEnabled = false;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Distinct steps: 'request' -> 'verify' (with 2-minute timer) -> 'reset' (no timer, view password toggles)
  const [step, setStep] = useState<'request' | 'verify' | 'reset'>('request');
  const [channel, setChannel] = useState<'email' | 'whatsapp'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [verifiedOtp, setVerifiedOtp] = useState('');

  // Password fields and visibility toggles
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Timer state: 300 seconds (5 minutes) countdown
  const [timeLeft, setTimeLeft] = useState<number>(300);
  const [timerActive, setTimerActive] = useState<boolean>(false);

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Enforce Zero-Trust: Load email and transition to verify screen, but NEVER autofill OTP
  useEffect(() => {
    const urlEmail = searchParams.get('email');
    const urlStep = searchParams.get('step');

    if (urlEmail) {
      setEmail(urlEmail);
      if (urlStep === 'verify') {
        setStep('verify');
        setOtp('');
        setTimeLeft(300);
        setTimerActive(true);
        setMessage(null);
      }
    }
  }, [searchParams]);

  // 5-Minute (300-Second) Countdown Timer (Active ONLY on 'verify' step)
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

  // Format seconds as MM:SS (e.g., 05:00, 04:30)
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Step 1: Request OTP (Dispatches email, NEVER auto-fills in the form, user must type it from email)
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (channel === 'whatsapp' && !/^0\d{9}$/.test(phone) && !/^27\d{9}$/.test(phone)) {
      setError('Enter the full mobile number saved on the account. Use 10 digits starting with 0.');
      return;
    }
    setLoading(true);
    try {
      const res = await authService.forgotPassword(
        channel === 'whatsapp'
          ? { identifier: phone.trim(), channel: 'whatsapp' }
          : { email: email.trim(), channel: 'email' }
      );
      if (res.email) setEmail(res.email);
      setOtp('');
      setMessage(null);
      setStep('verify');
      setTimeLeft(300);
      setTimerActive(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send recovery code. Please check your email or learner details.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP Code (Restarts 5-minute countdown, leaves input for manual entry)
  const handleResendOtp = async () => {
    if (channel === 'whatsapp' && !/^0\d{9}$/.test(phone) && !/^27\d{9}$/.test(phone)) {
      setError('Enter the full mobile number saved on the account. Use 10 digits starting with 0.');
      return;
    }
    if (channel !== 'whatsapp' && !email.trim()) {
      setError('Please enter your email, learner number, or ID number.');
      return;
    }
    setResending(true);
    setError(null);
    try {
      const res = await authService.forgotPassword(
        channel === 'whatsapp'
          ? { identifier: phone.trim(), channel: 'whatsapp' }
          : { email: email.trim(), channel: 'email' }
      );
      if (res.email) setEmail(res.email);
      setOtp('');
      setMessage(null);
      setTimeLeft(300);
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

    if (!otp || otp.trim().length !== 10) {
      setError(channel === 'whatsapp'
        ? 'Please enter the 10-digit code received on WhatsApp.'
        : 'Please enter the 10-digit code received in your email.');
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
      setMessage('OTP verified successfully. You can now set your new password.');
      // Advance to Step 3 (Reset password with NO timer)
      setStep('reset');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid or expired OTP code. Please check your email or click Resend Code.');
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

  const focusOtp = (index: number) => {
    const box = otpRefs.current[Math.max(0, Math.min(index, 9))];
    box?.focus();
    box?.select();
  };

  const writeOtp = (value: string, focusIndex?: number) => {
    const clean = value.replace(/\D/g, '').slice(0, 10);
    setOtp(clean);
    if (error) setError(null);
    window.setTimeout(() => focusOtp(focusIndex ?? Math.min(clean.length, 9)), 0);
  };

  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-[#070B14] text-slate-900 dark:text-slate-100 selection:bg-blue-600 selection:text-white justify-center items-center p-4 sm:p-6 relative overflow-hidden transition-colors duration-300">
      {/* Ambient Radial Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl animate-fade-in relative z-10 transition-colors duration-300">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white font-black text-xl mb-3 shadow-md shadow-blue-600/20">
            F
          </div>
          <h2 className="text-2xl font-extrabold font-display text-slate-900 dark:text-white tracking-tight">
            {step === 'reset' ? 'Create New Password' : 'Account Recovery'}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            {step === 'request' && (whatsappRecoveryEnabled
              ? 'Choose email or WhatsApp to receive a 5-minute recovery code'
              : 'Enter your registered email to receive a 5-minute recovery code')}
            {step === 'verify' && 'Enter the 10-digit code'}
            {step === 'reset' && 'Create your new password. Take your time to set a secure password.'}
          </p>
        </div>

        {/* Stepper Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full transition-all ${
            step === 'request'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}>
            <span>1. Choose</span>
          </div>

          <div className="w-4 h-[1px] bg-slate-300 dark:bg-slate-700" />

          <div className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full transition-all ${
            step === 'verify'
              ? 'bg-amber-600 text-white shadow-sm'
              : step === 'reset'
              ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}>
            <span>2. Verify OTP</span>
            {step === 'reset' && <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
          </div>

          <div className="w-4 h-[1px] bg-slate-300 dark:bg-slate-700" />

          <div className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full transition-all ${
            step === 'reset'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}>
            <span>3. New Password</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex flex-col gap-2 animate-fade-in">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span className="font-semibold">{typeof error === 'string' ? error : (error as any)?.message || String(error)}</span>
            </div>
            {typeof error === 'string' && error.toLowerCase().includes('does not exist') && (
              <div className="pl-7 pt-1">
                <Link to="/register" className="inline-flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 hover:underline">
                  Don't have an account? Register for a new account &rarr;
                </Link>
              </div>
            )}
          </div>
        )}

        {message && step !== 'verify' && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-3 animate-fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 1: Request OTP */}
        {/* ========================================================================= */}
        {step === 'request' && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            {whatsappRecoveryEnabled && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setChannel('email'); setError(null); }}
                className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors cursor-pointer ${
                  channel === 'email'
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                Email
              </button>
              <button
                type="button"
                onClick={() => { setChannel('whatsapp'); setError(null); }}
                className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors cursor-pointer ${
                  channel === 'whatsapp'
                    ? 'bg-[#128C7E] border-[#128C7E] text-white text-always-white'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                WhatsApp
              </button>
            </div>
            )}
            {whatsappRecoveryEnabled && channel === 'whatsapp' ? (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                WhatsApp mobile number
              </label>
              <div className="relative">
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  spellCheck={false}
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value.replace(/\D/g, '').slice(0, 11));
                    if (error) setError(null);
                  }}
                  placeholder="e.g. 0821234567"
                  required
                  className={`w-full rounded-xl bg-slate-50 dark:bg-slate-900 border px-4 py-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#128C7E] focus:border-[#128C7E] ${
                    error && step === 'request' ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-slate-300 dark:border-slate-700'
                  }`}
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">The recovery code is sent to this number on WhatsApp.</p>
              {error && step === 'request' && (
                <p className="text-[11px] text-rose-500 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{typeof error === 'string' ? error : (error as any)?.message || String(error)}</span>
                </p>
              )}
            </div>
            ) : (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Registered Email, Learner Number, or ID Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="e.g. parent@gmail.com, 20262246, or 0309106133080"
                  required
                  className={`w-full rounded-xl bg-slate-50 dark:bg-slate-900 border pl-10 pr-4 py-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    error && step === 'request' ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-slate-300 dark:border-slate-700'
                  }`}
                />
              </div>
              {error && step === 'request' && (
                <p className="text-[11px] text-rose-500 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{typeof error === 'string' ? error : (error as any)?.message || String(error)}</span>
                </p>
              )}
            </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 text-xs tracking-wide shadow-md shadow-blue-600/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Send 5-Minute Recovery Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: Verify OTP (with 5-minute countdown, user types manually) */}
        {/* ========================================================================= */}
        {step === 'verify' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4 animate-fade-in">
            <div>
              <div className="flex items-center justify-end mb-2">
                <div className={`inline-flex items-center gap-1.5 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                  timeLeft > 60
                    ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30'
                    : timeLeft > 0
                    ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30 animate-pulse'
                    : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30'
                }`}>
                  <Clock className="w-3 h-3" />
                  <span>{timeLeft > 0 ? formatTime(timeLeft) : 'Expired'}</span>
                </div>
              </div>

              <div className="flex justify-between gap-1" role="group" aria-label="10-digit code">
                {Array.from({ length: 10 }, (_, index) => (
                  <input
                    key={index}
                    ref={(el) => { otpRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    aria-label={`Digit ${index + 1}`}
                    value={otp[index] || ''}
                    autoFocus={index === 0}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      if (!raw) return;
                      const boxes = Array.from({ length: 10 }, (_, i) => otp[i] || '');
                      raw.split('').forEach((digit, offset) => {
                        if (index + offset < 10) boxes[index + offset] = digit;
                      });
                      setOtp(boxes.join('').replace(/\D/g, '').slice(0, 10));
                      if (error) setError(null);
                      window.setTimeout(() => focusOtp(Math.min(index + raw.length, 9)), 0);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace') {
                        e.preventDefault();
                        const boxes = Array.from({ length: 10 }, (_, i) => otp[i] || '');
                        if (boxes[index]) {
                          boxes[index] = '';
                          setOtp(boxes.join(''));
                        } else if (index > 0) {
                          boxes[index - 1] = '';
                          setOtp(boxes.join(''));
                          focusOtp(index - 1);
                        }
                        if (error) setError(null);
                      } else if (e.key === 'ArrowLeft' && index > 0) {
                        e.preventDefault();
                        focusOtp(index - 1);
                      } else if (e.key === 'ArrowRight' && index < 9) {
                        e.preventDefault();
                        focusOtp(index + 1);
                      }
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      writeOtp(e.clipboardData.getData('text'));
                    }}
                    className={`w-0 flex-1 min-w-0 h-11 rounded-lg border bg-slate-50 dark:bg-slate-900 text-center text-base font-bold font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      error && step === 'verify' ? 'border-rose-500' : 'border-slate-300 dark:border-slate-700'
                    }`}
                  />
                ))}
              </div>
              {error && step === 'verify' && (
                <p className="text-[11px] text-rose-500 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{typeof error === 'string' ? error : (error as any)?.message || String(error)}</span>
                </p>
              )}

              {/* Progress bar visualizer (300 seconds total) */}
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5 border border-slate-300 dark:border-slate-700">
                <div
                  className={`h-full transition-all duration-1000 ${
                    timeLeft > 60 ? 'bg-blue-600' : 'bg-rose-500'
                  }`}
                  style={{ width: `${(timeLeft / 300) * 100}%` }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || timeLeft === 0 || otp.length !== 10}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-4 text-xs tracking-wide shadow-md transition-all disabled:opacity-40 cursor-pointer"
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
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setStep('request')}
                className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
              >
                ← {channel === 'whatsapp' ? 'Change number' : 'Change email'}
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resending || (timeLeft > 0 && timeLeft > 270)}
                className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold transition-colors disabled:opacity-40"
              >
                <RefreshCw className={`w-3 h-3 ${resending ? 'animate-spin' : ''}`} />
                <span>{resending ? 'Sending...' : 'Resend Code (5 mins)'}</span>
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: Reset Password (NO time interval, View Password toggles) */}
        {/* ========================================================================= */}
        {step === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4 animate-fade-in">
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-400 text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Identity Verified. You can now set your new password without any time limit.</span>
            </div>

            {/* New Password with View Password Toggle */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                New Password *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Min 8 chars, uppercase, lowercase & symbol"
                  required
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 pl-10 pr-11 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-7 h-7 flex items-center justify-center p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
                  title={showNewPassword ? 'Hide password' : 'View password'}
                  aria-label={showNewPassword ? 'Hide password' : 'View password'}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password with View Password Toggle */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Confirm New Password *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Re-enter new password to confirm"
                  required
                  className={`w-full rounded-xl bg-slate-50 dark:bg-slate-900 border pl-10 pr-11 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    error && step === 'reset' ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-slate-300 dark:border-slate-700'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-7 h-7 flex items-center justify-center p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
                  title={showConfirmPassword ? 'Hide password' : 'View password'}
                  aria-label={showConfirmPassword ? 'Hide password' : 'View password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {error && step === 'reset' && (
                <p className="text-[11px] text-rose-500 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{typeof error === 'string' ? error : (error as any)?.message || String(error)}</span>
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !newPassword || !confirmPassword}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 px-4 text-xs tracking-wide shadow-md transition-all disabled:opacity-40"
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

        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
          <Link to="/login" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
