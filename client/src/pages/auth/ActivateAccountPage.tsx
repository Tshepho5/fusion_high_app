import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../services/api';

export const ActivateAccountPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (token) window.history.replaceState({}, '', '/activate');
  }, [token]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!token) {
      setError('Open the invitation link from the email. This page does not have a valid invitation.');
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await api.post('/api/activate', { token, password, confirm_password: confirm });
      setDone(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'The password could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  const resend = async (event: React.FormEvent) => {
    event.preventDefault();
    setResendMessage(null);
    try {
      const response = await api.post('/api/activation/resend', { email: resendEmail });
      setResendMessage(response.data?.message || 'If that account is waiting for a password, a new invitation has been sent.');
    } catch {
      setResendMessage('If that account is waiting for a password, a new invitation has been sent.');
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-5">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-cyan-300">Geleza SA</p>
          <h1 className="text-2xl font-black mt-1">Create your password</h1>
          <p className="text-sm text-slate-400 mt-2">This invitation works once and only for the principal account it was sent to.</p>
        </div>
        {done ? (
          <div className="space-y-4">
            <p className="text-sm text-emerald-300">Your password is ready. Sign in with the principal email address.</p>
            <Link to="/login" className="inline-flex rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950">Go to sign in</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <label className="block text-xs font-bold">
              Password
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
            </label>
            <label className="block text-xs font-bold">
              Confirm password
              <input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
            </label>
            <p className="text-[11px] text-slate-400">Use at least 8 characters, with an uppercase letter, a lowercase letter, a number, and a symbol.</p>
            {error && <p className="text-sm text-rose-300">{error}</p>}
            <button type="submit" disabled={busy} className="w-full rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-60">
              {busy ? 'Saving…' : 'Create password'}
            </button>
          </form>
        )}
        <form onSubmit={resend} className="space-y-2 border-t border-slate-800 pt-4">
          <p className="text-xs text-slate-400">Need a new link? Enter the principal email. A new link replaces the old one.</p>
          <input type="email" value={resendEmail} onChange={(event) => setResendEmail(event.target.value)} placeholder="Principal email" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
          <button type="submit" className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold">Send a new invitation</button>
          {resendMessage && <p className="text-xs text-slate-300">{resendMessage}</p>}
        </form>
      </section>
    </main>
  );
};

export default ActivateAccountPage;
