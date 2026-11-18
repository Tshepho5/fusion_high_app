import React, { useEffect, useState } from 'react';
import { lessonPlanningService } from '../../../services/api';
import { EmptyState } from '../../../components/common/EmptyState';
import { LessonPlanEditor } from './LessonPlanEditor';
import { LessonNotesPanel } from './LessonNotesPanel';
import { LessonCalendarPanel } from './LessonCalendarPanel';
import { LessonTemplatesPanel } from './LessonTemplatesPanel';
import { LessonProgressPanel } from './LessonProgressPanel';
import { LessonContext, LessonDraft, card, field, primaryBtn, quietBtn } from './lessonPlanningModel';

type Section = 'dashboard' | 'editor' | 'plans' | 'notes' | 'calendar' | 'templates' | 'progress';

const NAV: { id: Section; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'editor', label: 'Create lesson plan' },
  { id: 'plans', label: 'My lesson plans' },
  { id: 'notes', label: 'Lesson notes' },
  { id: 'calendar', label: 'Lesson calendar' },
  { id: 'templates', label: 'Templates' },
  { id: 'progress', label: 'Progress' }
];

interface TeacherLessonPlanningProps {
  mode?: 'teacher' | 'oversight';
}

export const TeacherLessonPlanning: React.FC<TeacherLessonPlanningProps> = ({ mode = 'teacher' }) => {
  const [section, setSection] = useState<Section>('dashboard');
  const [context, setContext] = useState<LessonContext | null>(null);
  const [contextError, setContextError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ subject: '', grade: '', class_name: '', term: '', academic_year: '', date: '', status: '' });
  const [planId, setPlanId] = useState<number | null>(null);
  const [seed, setSeed] = useState<Partial<LessonDraft> | null>(null);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  async function loadContext() {
    const result = await lessonPlanningService.getContext();
    setContext(result);
    return result;
  }

  async function loadLists(nextFilters = filters) {
    const params = Object.fromEntries(Object.entries(nextFilters).filter(([, value]) => value !== ''));
    const [board, list] = await Promise.all([
      lessonPlanningService.getDashboard(params),
      lessonPlanningService.listPlans({ ...params, limit: 20 })
    ]);
    setDashboard(board);
    setPlans(list.plans || []);
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadContext()
      .then(() => loadLists())
      .catch((err) => { if (active) setContextError(err?.response?.data?.error || 'Lesson planning could not be opened.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function openNew(nextSeed?: Partial<LessonDraft>) {
    setPlanId(null);
    setSeed(nextSeed || null);
    setSection('editor');
  }

  function openPlan(id: number) {
    setPlanId(id);
    setSeed(null);
    setSection('editor');
  }

  const readOnly = mode === 'oversight';
  const subjectOptions = Array.from(new Set((context?.allocations || []).map((item) => item.subject_name)));
  const classOptions = Array.from(new Set((context?.allocations || []).map((item) => item.class_name).filter(Boolean)));

  if (loading) return <p className="text-sm text-slate-500 p-4">Loading lesson planning…</p>;
  if (contextError || !context) {
    return <EmptyState title="Lesson planning is unavailable" description={contextError || 'Your account could not be matched to a school.'} />;
  }

  const figures = dashboard ? [
    ['Total lesson plans', dashboard.total],
    ['Drafts', dashboard.drafts],
    ['Scheduled', dashboard.scheduled],
    ['Completed', dashboard.completed],
    ['Upcoming', dashboard.upcoming],
    ['Needs attention', dashboard.attention]
  ] : [];

  return (
    <div className="space-y-4 text-slate-800 dark:text-slate-100 pb-16">
      <div className="flex gap-2 overflow-x-auto">
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSection(item.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${section === item.id ? 'bg-[#168BFF] text-white' : 'bg-slate-100 text-slate-600 dark:bg-[#0D1620] dark:text-slate-300'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {section === 'dashboard' && (
        <div className="space-y-4">
          <div className={`${card} p-4 grid sm:grid-cols-3 lg:grid-cols-4 gap-2`}>
            <select className={field} value={filters.subject} onChange={(event) => setFilters({ ...filters, subject: event.target.value })}>
              <option value="">All subjects</option>
              {subjectOptions.map((subject) => <option key={subject}>{subject}</option>)}
            </select>
            <input className={field} placeholder="Grade" value={filters.grade} onChange={(event) => setFilters({ ...filters, grade: event.target.value })} />
            <select className={field} value={filters.class_name} onChange={(event) => setFilters({ ...filters, class_name: event.target.value })}>
              <option value="">All classes</option>
              {classOptions.map((name) => <option key={name}>{name}</option>)}
            </select>
            <select className={field} value={filters.term} onChange={(event) => setFilters({ ...filters, term: event.target.value })}>
              <option value="">All terms</option>
              {context.terms.map((term) => <option key={term} value={term}>Term {term}</option>)}
            </select>
            <select className={field} value={filters.academic_year} onChange={(event) => setFilters({ ...filters, academic_year: event.target.value })}>
              <option value="">All years</option>
              {context.academic_years.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
            <input type="date" className={field} value={filters.date} onChange={(event) => setFilters({ ...filters, date: event.target.value })} />
            <select className={field} value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
            </select>
            <button type="button" className={primaryBtn} onClick={() => loadLists().catch((err) => setError(err?.response?.data?.error || 'Filters could not be applied.'))}>Apply filters</button>
          </div>
          {error && <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {figures.map(([title, value]) => (
              <div key={String(title)} className={`${card} p-3`}>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">{title}</p>
                <p className="text-2xl font-black">{value ?? '—'}</p>
              </div>
            ))}
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <section className={`${card} p-4 space-y-2`}>
              <h2 className="text-sm font-black">Needs attention</h2>
              {dashboard?.attention_items?.length ? dashboard.attention_items.map((item: any) => (
                <button key={item.id} type="button" className="block text-left text-sm" onClick={() => openPlan(item.id)}>
                  {item.topic || 'Untitled'} · {item.subject_name} · {item.class_name} · {item.status}
                </button>
              )) : <p className="text-sm text-slate-500">No lesson plans need attention for these filters.</p>}
            </section>
            <section className={`${card} p-4 space-y-2`}>
              <h2 className="text-sm font-black">Recently updated</h2>
              {dashboard?.recent?.length ? dashboard.recent.map((item: any) => (
                <button key={item.id} type="button" className="block text-left text-sm" onClick={() => openPlan(item.id)}>
                  {item.topic || 'Untitled'} · {item.subject_name} · {item.status}
                </button>
              )) : <p className="text-sm text-slate-500">You have not saved a lesson plan yet.</p>}
            </section>
          </div>
          {!readOnly && <button type="button" className={primaryBtn} onClick={() => openNew()}>Create lesson plan</button>}
        </div>
      )}

      {section === 'editor' && (
        <LessonPlanEditor
          key={`${planId || 'new'}-${seed?.timetable_period || ''}`}
          context={context}
          planId={planId}
          seed={seed}
          readOnly={readOnly}
          onSaved={() => loadLists().catch(() => undefined)}
          onBack={() => setSection('plans')}
        />
      )}

      {section === 'plans' && (
        <div className="space-y-3">
          {!readOnly && <button type="button" className={primaryBtn} onClick={() => openNew()}>Create lesson plan</button>}
          {plans.length === 0 && <EmptyState title="No lesson plans" description="Plans you save for your classes will appear here." actionLabel={readOnly ? undefined : 'Create lesson plan'} onAction={readOnly ? undefined : () => openNew()} />}
          {plans.map((plan) => (
            <article key={plan.id} className={`${card} p-4 flex flex-wrap items-center justify-between gap-3`}>
              <div>
                <h3 className="text-sm font-black">{plan.topic || 'Untitled lesson'}</h3>
                <p className="text-xs text-slate-500">{plan.subject_name} · Grade {plan.grade} · {plan.class_name} · Term {plan.term} {plan.academic_year} · {plan.status}</p>
                {mode === 'oversight' && <p className="text-xs text-slate-500">{plan.teacher_first_name} {plan.teacher_surname}</p>}
              </div>
              <div className="flex gap-2">
                <button type="button" className={quietBtn} onClick={() => openPlan(plan.id)}>Open</button>
                {!readOnly && <button type="button" className={quietBtn} onClick={async () => {
                  try {
                    const copy = await lessonPlanningService.duplicatePlan(plan.id);
                    openPlan(copy.id);
                  } catch (err: any) {
                    setError(err?.response?.data?.error || 'The lesson plan could not be duplicated.');
                  }
                }}>Duplicate</button>}
                {!readOnly && <button type="button" className={quietBtn} onClick={() => setPendingDelete(plan.id)}>Delete</button>}
              </div>
            </article>
          ))}
        </div>
      )}

      {section === 'notes' && <LessonNotesPanel context={context} readOnly={readOnly} />}
      {section === 'calendar' && (
        <LessonCalendarPanel
          readOnly={readOnly}
          onPrepare={(next) => openNew(next)}
          onOpenPlan={openPlan}
        />
      )}
      {section === 'templates' && (
        <LessonTemplatesPanel
          context={context}
          readOnly={readOnly}
          onCreated={(plan) => openPlan(plan.id)}
        />
      )}
      {section === 'progress' && <LessonProgressPanel onOpenPlan={openPlan} />}

      {pendingDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className={`${card} max-w-sm p-4 space-y-3`}>
            <h3 className="font-black">Delete this lesson plan?</h3>
            <p className="text-sm text-slate-500">The lesson plan and its notes structure on the plan are removed. A published homework task stays in the homework hub.</p>
            <div className="flex gap-2">
              <button type="button" className={primaryBtn} onClick={async () => {
                try {
                  await lessonPlanningService.deletePlan(pendingDelete);
                  setPendingDelete(null);
                  await loadLists();
                } catch (err: any) {
                  setPendingDelete(null);
                  setError(err?.response?.data?.error || 'The lesson plan could not be deleted.');
                }
              }}>Delete</button>
              <button type="button" className={quietBtn} onClick={() => setPendingDelete(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
