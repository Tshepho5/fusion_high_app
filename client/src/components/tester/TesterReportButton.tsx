import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { systemControlService } from '../../services/api';

const emptyForm = {
  kind: 'issue',
  dashboard: '',
  module: '',
  description: '',
  steps_to_reproduce: '',
  expected_behaviour: '',
  actual_behaviour: '',
  severity: 'medium',
  result: 'fail',
  screenshot_data: ''
};

export const TesterReportButton: React.FC<{ activeTab?: string }> = ({ activeTab }) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm, dashboard: activeTab || '' });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user?.is_tester !== true) return null;

  const onFile = (file?: File) => {
    if (!file) {
      setForm((prev) => ({ ...prev, screenshot_data: '' }));
      return;
    }
    if (!/^image\/(png|jpeg|webp)$/i.test(file.type) || file.size > 260000) {
      setError('Use a PNG, JPEG, or WebP screenshot under 260 KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm((prev) => ({ ...prev, screenshot_data: String(reader.result || '') }));
    reader.readAsDataURL(file);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await systemControlService.createTesterReport(form);
      setMessage(result.message || 'Report recorded.');
      setForm({ ...emptyForm, dashboard: activeTab || '' });
    } catch (err: any) {
      setError(err.response?.data?.error || 'The report could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-40 rounded-full bg-slate-950 text-white text-xs font-bold px-4 py-2 shadow-lg border border-white/10"
      >
        Report a test
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-3">
          <form onSubmit={submit} className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-900 text-slate-100 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black">Testing report</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-xs text-slate-400">Close</button>
            </div>
            <p className="text-[11px] text-slate-400">This report is visible to you and to Geleza SA platform administrators. It does not include another tester's notes.</p>
            <label className="block text-xs font-bold">
              Type
              <select value={form.kind} onChange={(event) => setForm((prev) => ({ ...prev, kind: event.target.value }))} className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2">
                <option value="issue">Problem</option>
                <option value="check">Module result</option>
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs font-bold">
                Dashboard
                <input value={form.dashboard} onChange={(event) => setForm((prev) => ({ ...prev, dashboard: event.target.value }))} className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2" />
              </label>
              <label className="block text-xs font-bold">
                Module
                <input value={form.module} onChange={(event) => setForm((prev) => ({ ...prev, module: event.target.value }))} className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2" />
              </label>
            </div>
            <label className="block text-xs font-bold">
              Description
              <textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 min-h-20" />
            </label>
            {form.kind === 'issue' ? (
              <>
                <label className="block text-xs font-bold">
                  Steps to reproduce
                  <textarea value={form.steps_to_reproduce} onChange={(event) => setForm((prev) => ({ ...prev, steps_to_reproduce: event.target.value }))} className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 min-h-16" />
                </label>
                <label className="block text-xs font-bold">
                  Expected behaviour
                  <textarea value={form.expected_behaviour} onChange={(event) => setForm((prev) => ({ ...prev, expected_behaviour: event.target.value }))} className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 min-h-16" />
                </label>
                <label className="block text-xs font-bold">
                  Actual behaviour
                  <textarea value={form.actual_behaviour} onChange={(event) => setForm((prev) => ({ ...prev, actual_behaviour: event.target.value }))} className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 min-h-16" />
                </label>
                <label className="block text-xs font-bold">
                  Severity
                  <select value={form.severity} onChange={(event) => setForm((prev) => ({ ...prev, severity: event.target.value }))} className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </label>
              </>
            ) : (
              <label className="block text-xs font-bold">
                Result
                <select value={form.result} onChange={(event) => setForm((prev) => ({ ...prev, result: event.target.value }))} className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2">
                  <option value="pass">Pass</option>
                  <option value="fail">Fail</option>
                  <option value="blocked">Blocked</option>
                  <option value="not_implemented">Not implemented</option>
                </select>
              </label>
            )}
            <label className="block text-xs font-bold">
              Screenshot
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => onFile(event.target.files?.[0])} className="mt-1 block w-full text-xs" />
            </label>
            {error && <p className="text-xs text-rose-300">{error}</p>}
            {message && <p className="text-xs text-emerald-300">{message}</p>}
            <button type="submit" disabled={busy} className="w-full rounded-xl bg-cyan-500 text-slate-950 font-bold py-2 text-sm disabled:opacity-60">
              {busy ? 'Saving…' : 'Submit report'}
            </button>
          </form>
        </div>
      )}
    </>
  );
};
