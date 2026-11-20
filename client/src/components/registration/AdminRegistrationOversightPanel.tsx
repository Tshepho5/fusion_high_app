import React, { useEffect, useState, useCallback } from 'react';
import {
  FileCheck2,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  RefreshCw,
  LogOut,
  AlertTriangle
} from 'lucide-react';
import { learnerRegistrationService } from '../../services/api';

export const AdminRegistrationOversightPanel: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [deregistrations, setDeregistrations] = useState<any[]>([]);
  const [notesById, setNotesById] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await learnerRegistrationService.getSchoolDashboard();
      setRegistrations(Array.isArray(res?.registrations) ? res.registrations : []);
      setDeregistrations(Array.isArray(res?.deregistration_requests) ? res.deregistration_requests : []);
    } catch (_) {
      setRegistrations([]);
      setDeregistrations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDownloadLetter = async (applicationId: number, appNo?: string) => {
    setDownloadingId(applicationId);
    try {
      const blob = await learnerRegistrationService.downloadAcceptanceLetterBlob(applicationId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Acceptance_Letter_${String(appNo || applicationId).replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.response?.data?.error || 'Could not download acceptance letter PDF.' });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeregDecision = async (id: number, decision: 'approve' | 'reject') => {
    setBusyId(id);
    setFeedback(null);
    try {
      const res = await learnerRegistrationService.adminDecideDeregistration(id, decision, notesById[id] || '');
      setFeedback({
        type: 'success',
        text: res?.message || `Deregistration request ${decision}d.`
      });
      await loadData();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.response?.data?.error || 'Could not process deregistration decision.'
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mt-6 space-y-6">
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* 1. Integrated Learner Registration Tracking & Acceptance Letters */}
      <section className="p-5 rounded-3xl bg-white/90 dark:bg-[#0D1520]/90 border border-slate-200 dark:border-white/10 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-[#168BFF]" />
              Integrated Learner Registration Status &amp; Consent Audit ({registrations.length})
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Track accepted learners completing registration inside their Parent/Learner dashboard, class allocation, subject selection, and Terms &amp; Conditions consent.
            </p>
          </div>
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {registrations.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No approved admission applications are currently tracked in this school&apos;s registration register.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 uppercase text-[10px]">
                  <th className="pb-2.5 px-2">Learner</th>
                  <th className="pb-2.5 px-2">Grade &amp; Class</th>
                  <th className="pb-2.5 px-2">Registration</th>
                  <th className="pb-2.5 px-2">Subjects</th>
                  <th className="pb-2.5 px-2">Terms Consent</th>
                  <th className="pb-2.5 px-2 text-right">Acceptance Letter</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-white/5">
                {registrations.map((reg) => {
                  const completed = reg.registration_status === 'completed';
                  return (
                    <tr key={reg.application_id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                      <td className="py-3 px-2">
                        <p className="font-bold text-slate-900 dark:text-white">
                          {reg.first_name} {reg.surname}
                        </p>
                        <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          {reg.application_number}
                        </p>
                      </td>
                      <td className="py-3 px-2 text-slate-700 dark:text-slate-300">
                        <p className="font-semibold">
                          Grade {reg.grade_applied} &bull; {reg.class_name || 'Unallocated'}
                        </p>
                        {reg.class_teacher_name && (
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            Class Teacher: {reg.class_teacher_name}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            completed
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {completed ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {completed ? 'Completed' : 'Awaiting Parent/Learner'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-slate-700 dark:text-slate-300">
                        {Array.isArray(reg.selected_subjects) && reg.selected_subjects.length > 0
                          ? `${reg.selected_subjects.length} selected`
                          : 'Pending'}
                      </td>
                      <td className="py-3 px-2 text-slate-700 dark:text-slate-300">
                        {reg.terms_accepted ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-semibold">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            {reg.terms_accepted_at ? new Date(reg.terms_accepted_at).toLocaleDateString() : 'Recorded'}
                          </span>
                        ) : (
                          <span className="text-slate-400">Not yet accepted</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <button
                          type="button"
                          disabled={downloadingId === reg.application_id}
                          onClick={() => handleDownloadLetter(reg.application_id, reg.application_number)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-[11px] font-bold text-slate-800 dark:text-white cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          PDF
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 2. Controlled Deregistration & Transfer Approvals Queue */}
      <section className="p-5 rounded-3xl bg-white/90 dark:bg-[#0D1520]/90 border border-slate-200 dark:border-white/10 space-y-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <LogOut className="w-4 h-4 text-amber-500" />
            Controlled Deregistration &amp; Transfer Approvals ({deregistrations.length})
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Approving deregistration closes active school enrollment cleanly while preserving all historical marks, attendance, and report cards.
          </p>
        </div>

        {deregistrations.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No deregistration or transfer requests recorded for this school.
          </p>
        ) : (
          <div className="space-y-3">
            {deregistrations.map((req) => {
              const isOpen = ['pending_teacher_review', 'pending_admin_approval'].includes(String(req.status).toLowerCase());
              const waitingForTeacher =
                String(req.status).toLowerCase() === 'pending_teacher_review' && Boolean(req.assigned_class_teacher_id);
              return (
                <div
                  key={req.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="text-xs space-y-0.5">
                      <p className="font-bold text-slate-900 dark:text-white">
                        {req.learner_first_name} {req.learner_surname} &bull; Grade {req.learner_grade}
                        {req.class_name ? ` (${req.class_name})` : ''}
                      </p>
                      <p className="text-slate-600 dark:text-slate-300">
                        <span className="capitalize font-semibold">{req.request_type}</span> &bull; Reason: {req.reason}
                        {req.target_school_name ? ` • Destination: ${req.target_school_name}` : ''}
                      </p>
                      {req.teacher_notes && (
                        <p className="text-[11px] text-sky-700 dark:text-sky-300">
                          Class Teacher Review: {req.teacher_notes}
                        </p>
                      )}
                    </div>
                    <span className="self-start px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-slate-200 uppercase">
                      {String(req.status || '').replace(/_/g, ' ')}
                    </span>
                  </div>

                  {isOpen && (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={notesById[req.id] || ''}
                        onChange={(e) => setNotesById((prev) => ({ ...prev, [req.id]: e.target.value }))}
                        placeholder="Principal / Administration decision notes..."
                        className="flex-1 px-3 py-1.5 rounded-xl bg-white dark:bg-[#111A26] border border-slate-300 dark:border-white/15 text-xs text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        disabled={busyId === req.id || waitingForTeacher}
                        onClick={() => handleDeregDecision(req.id, 'approve')}
                        title={waitingForTeacher ? 'Awaiting Class Teacher review before Principal approval' : 'Approve deregistration and preserve historical records'}
                        className="inline-flex items-center justify-center gap-1 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busyId === req.id}
                        onClick={() => handleDeregDecision(req.id, 'reject')}
                        className="inline-flex items-center justify-center gap-1 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
