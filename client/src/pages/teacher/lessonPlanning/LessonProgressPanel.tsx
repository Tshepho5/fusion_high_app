import React, { useEffect, useState } from 'react';
import { lessonPlanningService } from '../../../services/api';
import { card } from './lessonPlanningModel';

export const LessonProgressPanel: React.FC<{ onOpenPlan: (id: number) => void }> = ({ onOpenPlan }) => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    lessonPlanningService.getProgress()
      .then(setData)
      .catch((err) => setError(err?.response?.data?.error || 'Progress could not be loaded.'));
  }, []);

  if (error) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Calculating lesson-planning progress…</p>;

  const stats = [
    ['Plans', data.total],
    ['Missing objectives', data.missing_objectives],
    ['Missing evaluation', data.missing_evaluation],
    ['Reflections still open', data.reflections_pending],
    ['Overdue dates', data.attention]
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {stats.map(([title, value]) => (
          <div key={title} className={`${card} p-3`}>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">{title}</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{value}</p>
          </div>
        ))}
      </div>
      <section className={`${card} p-4 space-y-2`}>
        <h2 className="text-sm font-black">By subject</h2>
        {data.by_subject?.length === 0 && <p className="text-sm text-slate-500">No lesson plans have been saved yet.</p>}
        {data.by_subject?.map((row: any) => (
          <p key={`${row.subject_name}-${row.grade}`} className="text-sm text-slate-700 dark:text-slate-200">
            Grade {row.grade} {row.subject_name}: {row.completed} completed, {row.drafts} drafts, {row.total} total
          </p>
        ))}
      </section>
      <section className={`${card} p-4 space-y-2`}>
        <h2 className="text-sm font-black">Needs attention</h2>
        {data.attention_items?.length === 0 && <p className="text-sm text-slate-500">Nothing in the current filters needs attention.</p>}
        {data.attention_items?.map((item: any) => (
          <button key={item.id} type="button" className="block text-left text-sm text-[#168BFF]" onClick={() => onOpenPlan(item.id)}>
            {item.topic || item.subject_name} · {item.class_name} · {item.status}
          </button>
        ))}
      </section>
    </div>
  );
};
