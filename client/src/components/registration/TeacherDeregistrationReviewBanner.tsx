import React, { useEffect, useState } from 'react';
import { ClipboardCheck, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { learnerRegistrationService } from '../../services/api';

export const TeacherDeregistrationReviewBanner: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [notesById, setNotesById] = useState<Record<number, string>>({});
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = () => {
    learnerRegistrationService
      .listDeregistrations()
      .then((res) => {
        const list = Array.isArray(res?.requests) ? res.requests : [];
        setRequests(list.filter((r: any) => String(r.status || '').toLowerCase() === 'pending_teacher_review'));
      })
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  if (requests.length === 0 && !feedback) return null;

  const handleReview = async (id: number) => {
    setSubmittingId(id);
    setFeedback(null);
    try {
      const res = await learnerRegistrationService.teacherReviewDeregistration(id, notesById[id] || '');
      setFeedback({
        type: 'success',
        text: res?.message || 'Class teacher review recorded and forwarded to Principal/Administration.'
      });
      load();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.response?.data?.error || 'Could not record class teacher review.'
      });
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <section className="p-4 md:p-5 rounded-3xl bg-white/90 dark:bg-[#0D1520]/90 border border-amber-500/40 shadow-sm backdrop-blur-md space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <ClipboardCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Class Teacher Deregistration / Transfer Review ({requests.length})
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-300">
              Acknowledge requests from learners in your assigned class and forward to the Principal / School Admin for final approval.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
          <Clock className="w-3 h-3" />
          Principal Approval Still Required
        </span>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{feedback.text}</span>
        </div>
      )}

      <div className="space-y-3">
        {requests.map((req) => (
          <div
            key={req.id}
            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 space-y-2.5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div>
                <p className="font-bold text-slate-900 dark:text-white">
                  {req.learner_first_name} {req.learner_surname} &bull; {req.class_name || `Grade ${req.learner_grade}`}
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                  Type: <span className="capitalize font-semibold">{req.request_type}</span> &bull; Reason: {req.reason}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                value={notesById[req.id] || ''}
                onChange={(e) => setNotesById((prev) => ({ ...prev, [req.id]: e.target.value }))}
                placeholder="Optional handover / textbook / register acknowledgement notes..."
                className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-[#111A26] border border-slate-300 dark:border-white/15 text-xs text-slate-900 dark:text-white"
              />
              <button
                type="button"
                disabled={submittingId === req.id}
                onClick={() => handleReview(req.id)}
                className="px-4 py-2 rounded-xl bg-[#168BFF] hover:bg-[#0878E8] text-white text-xs font-bold cursor-pointer disabled:opacity-50 shrink-0"
              >
                {submittingId === req.id ? 'Recording...' : 'Acknowledge & Forward to Principal'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
