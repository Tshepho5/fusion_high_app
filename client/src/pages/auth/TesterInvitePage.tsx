import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { systemControlService } from '../../services/api';

export const TesterInvitePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ email?: string; role_name?: string; school_name?: string; reference_code?: string } | null>(null);

  useEffect(() => {
    if (token) window.history.replaceState({}, '', '/tester-invite');
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    systemControlService.verifyTesterInvite(token)
      .then((result) => {
        if (cancelled) return;
        if (result?.valid) setPreview(result);
        else setError('This invitation link is not valid or has expired.');
      })
      .catch(() => {
        if (!cancelled) setError('This invitation link is not valid or has expired.');
      });
    return () => {
      cancelled = true;
    };
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
      await systemControlService.acceptTesterInvite({ token, password, confirm_password: confirm });
      setDone(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'The tester account could not be activated.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-5">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-cyan-300">Geleza SA</p>
          <h1 className="text-2xl font-black mt-1">Accept tester invitation</h1>
          <p className="text-sm text-slate-400 mt-2">
            Create a password for the {preview?.role_name || 'assigned'} role in {preview?.school_name || 'the tester school'}.
            {preview?.reference_code ? ` Reference ${preview.reference_code}.` : ''}
          </p>
          {preview?.email && <p className="text-xs text-slate-300 mt-2">Account email: {preview.email}</p>}
        </div>
        {done ? (
          <div className="space-y-4">
            <p className="text-sm text-emerald-300">Your tester account is ready. Sign in with the invited email and the password you created.</p>
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
            <button type="submit" disabled={busy || !token} className="w-full rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-60">
              {busy ? 'Saving…' : 'Create password and activate'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
};

export default TesterInvitePage;
