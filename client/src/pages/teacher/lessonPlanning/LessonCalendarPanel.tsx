import React, { useCallback, useEffect, useRef, useState } from 'react';
import { lessonPlanningService } from '../../../services/api';
import { EmptyState } from '../../../components/common/EmptyState';
import { LessonDraft, card, field, primaryBtn, quietBtn } from './lessonPlanningModel';

interface LessonCalendarPanelProps {
  onPrepare: (seed: Partial<LessonDraft>) => void;
  onOpenPlan: (id: number) => void;
  readOnly?: boolean;
}

export const LessonCalendarPanel: React.FC<LessonCalendarPanelProps> = ({ onPrepare, onOpenPlan, readOnly }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 6);
    return date.toISOString().slice(0, 10);
  });

  const loadRequest = useRef(0);

  const load = useCallback(async () => {
    const request = ++loadRequest.current;
    setLoading(true);
    setError(null);
    try {
      const next = await lessonPlanningService.getCalendar({ from, to });
      if (request !== loadRequest.current) return;
      setData(next);
    } catch (err: any) {
      if (request !== loadRequest.current) return;
      setError(err?.response?.data?.error || 'The lesson calendar could not be loaded.');
    } finally {
      if (request === loadRequest.current) setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  async function reschedule(plan: any) {
    const nextDate = window.prompt('New lesson date (YYYY-MM-DD)', plan.scheduled_date || from);
    if (!nextDate) return;
    const full = await lessonPlanningService.getPlan(plan.id);
    await lessonPlanningService.updatePlan(plan.id, { ...full, scheduled_date: nextDate, save_as: 'scheduled', expected_updated_at: full.updated_at });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-xs text-slate-500">From<input type="date" className={field} value={from} onChange={(event) => setFrom(event.target.value)} /></label>
        <label className="text-xs text-slate-500">To<input type="date" className={field} value={to} onChange={(event) => setTo(event.target.value)} /></label>
        <button type="button" className={primaryBtn} onClick={load}>Show dates</button>
      </div>
      {error && <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading the timetable and lesson dates…</p>}
      {data && (
        <>
          <section className={`${card} p-4 space-y-2`}>
            <h2 className="text-sm font-black text-slate-900 dark:text-white">Lessons in this range</h2>
            {data.plans.length === 0 && <p className="text-sm text-slate-500">No lesson plans are dated in this range.</p>}
            {data.plans.map((plan: any) => (
              <div key={plan.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 dark:border-white/10 pt-2">
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{plan.topic || plan.subject_name}</p>
                  <p className="text-xs text-slate-500">{plan.scheduled_date} {plan.scheduled_time || ''} · {plan.subject_name} · {plan.class_name} · {plan.status}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" className={quietBtn} onClick={() => onOpenPlan(plan.id)}>Open</button>
                  {!readOnly && <button type="button" className={quietBtn} onClick={() => reschedule(plan).catch((err) => setError(err?.response?.data?.error || 'The date could not be changed.'))}>Reschedule</button>}
                </div>
              </div>
            ))}
          </section>
          <section className={`${card} p-4 space-y-2`}>
            <h2 className="text-sm font-black text-slate-900 dark:text-white">Timetable periods without a lesson plan</h2>
            {data.unprepared.length === 0 && (
              <EmptyState title="No unplanned periods" description="Every timetable period matched to you already has a lesson plan linked, or your school timetable has no periods under your name." />
            )}
            {data.unprepared.map((slot: any) => (
              <div key={`${slot.timetable_id}-${slot.class_name}-${slot.day}-${slot.period}`} className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 dark:border-white/10 pt-2">
                <p className="text-sm text-slate-700 dark:text-slate-200">
                  {slot.day} · {slot.period} · {slot.subject || 'Subject'} · {slot.class_name} {slot.room ? `· ${slot.room}` : ''}
                </p>
                {!readOnly && (
                <button
                  type="button"
                  className={primaryBtn}
                  onClick={() => onPrepare({
                    subject_name: slot.subject,
                    class_name: slot.class_name,
                    grade: slot.grade,
                    timetable_id: slot.timetable_id,
                    timetable_day: slot.day,
                    timetable_period: slot.period,
                    timetable_class: slot.class_name,
                    scheduled_date: from
                  })}
                >
                  Prepare plan
                </button>
                )}
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
};
