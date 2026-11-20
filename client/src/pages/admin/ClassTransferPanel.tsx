import React, { useEffect, useState } from 'react';
import { adminService, classStaffService } from '../../services/api';

type LearnerRow = { id: number; full_name?: string; surname?: string; learner_number?: string; grade?: number; class_name?: string };
type ClassRow = { id: number; name: string; grade?: number; stream?: string };

export const ClassTransferPanel: React.FC = () => {
  const [learners, setLearners] = useState<LearnerRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [learnerId, setLearnerId] = useState('');
  const [classId, setClassId] = useState('');
  const [effectiveOn, setEffectiveOn] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminService.getLearners().then((rows) => setLearners(Array.isArray(rows) ? rows : [])).catch(() => setLearners([]));
    classStaffService.getClasses().then((rows) => {
      const list = Array.isArray(rows) ? rows : (rows && rows.classes) || [];
      setClasses(list);
    }).catch(() => setClasses([]));
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const result = await adminService.transferLearner(learnerId, {
        destination_class_id: Number(classId),
        effective_on: effectiveOn,
        reason
      });
      setMessage(result.message || 'Transfer saved.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'The transfer was not saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
      <h3 className="text-sm font-bold text-white">Transfer a learner to another class</h3>
      <p className="text-xs text-slate-400">Earlier marks, attendance, and released reports stay with the class where they were recorded.</p>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-xs text-slate-300">
          Learner
          <select aria-label="Learner to transfer" value={learnerId} onChange={(event) => setLearnerId(event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white">
            <option value="">Choose a learner</option>
            {learners.map((learner) => (
              <option key={learner.id} value={learner.id}>
                {`${learner.full_name || ''} ${learner.surname || ''}`.trim()} {learner.class_name ? `(${learner.class_name})` : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-300">
          Destination class
          <select aria-label="Destination class" value={classId} onChange={(event) => setClassId(event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white">
            <option value="">Choose a class</option>
            {classes.map((row) => (
              <option key={row.id} value={row.id}>{row.name} {row.stream ? `(${row.stream})` : ''}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-300">
          Effective date
          <input aria-label="Transfer effective date" type="date" value={effectiveOn} onChange={(event) => setEffectiveOn(event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
        </label>
        <label className="text-xs text-slate-300">
          Reason
          <input aria-label="Transfer reason" value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
        </label>
      </div>
      <button type="submit" disabled={saving} className="rounded-xl bg-brand-500 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
        {saving ? 'Saving transfer...' : 'Transfer learner'}
      </button>
      {message && <p className="text-xs text-emerald-300">{message}</p>}
      {error && <p className="text-xs text-rose-300">{error}</p>}
    </form>
  );
};
