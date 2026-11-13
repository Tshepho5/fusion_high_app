import React, { useEffect, useMemo, useRef, useState } from 'react';
import { assignmentService, lessonPlanningService } from '../../../services/api';
import { EmptyState } from '../../../components/common/EmptyState';
import {
  Allocation,
  AssignmentItem,
  LessonContext,
  LessonDraft,
  LessonStatus,
  MATERIAL_OPTIONS,
  METHOD_OPTIONS,
  MaterialItem,
  QUESTION_TYPES,
  ReferenceItem,
  allocationKey,
  card,
  draftFromPlan,
  emptyDraft,
  field,
  label,
  moveItem,
  payloadFromDraft,
  primaryBtn,
  quietBtn,
  stageMinutes,
  teacherLabel
} from './lessonPlanningModel';

interface LessonPlanEditorProps {
  context: LessonContext;
  planId?: number | null;
  seed?: Partial<LessonDraft> | null;
  readOnly?: boolean;
  onSaved: (plan: any) => void;
  onBack: () => void;
}

const sections = [
  ['general', 'General'],
  ['objectives', 'Objectives'],
  ['previous', 'Previous knowledge'],
  ['materials', 'Materials'],
  ['methods', 'Methods'],
  ['references', 'References'],
  ['presentation', 'Presentation'],
  ['evaluation', 'Evaluation'],
  ['assignment', 'Assignment'],
  ['reflection', 'Reflection']
] as const;

export const LessonPlanEditor: React.FC<LessonPlanEditorProps> = ({
  context,
  planId,
  seed,
  readOnly = false,
  onSaved,
  onBack
}) => {
  const [draft, setDraft] = useState<LessonDraft>(() => emptyDraft(context, seed || undefined));
  const [loading, setLoading] = useState(Boolean(planId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateVisibility, setTemplateVisibility] = useState<'private' | 'school'>('private');
  const [homeworkOptions, setHomeworkOptions] = useState<any[]>([]);
  const [ai, setAi] = useState<null | { action: string; title: string; suggestions: any; warnings: string[] }>(null);
  const [replaceArmed, setReplaceArmed] = useState(false);
  const [activeSection, setActiveSection] = useState('general');
  const savedSignature = useRef('');

  useEffect(() => {
    if (!planId) {
      setDraft(emptyDraft(context, seed || undefined));
      return;
    }
    let active = true;
    setLoading(true);
    lessonPlanningService.getPlan(planId)
      .then((plan) => {
        if (!active) return;
        const next = draftFromPlan(plan);
        savedSignature.current = JSON.stringify({ ...next, updated_at: undefined });
        setDraft(next);
      })
      .catch((err) => { if (active) setError(err?.response?.data?.error || 'The lesson plan could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [planId]);

  useEffect(() => {
    if (!draft.subject_name || !draft.grade) return;
    lessonPlanningService.getHomeworkOptions({ subject: draft.subject_name, grade: draft.grade })
      .then((rows) => setHomeworkOptions(Array.isArray(rows) ? rows : []))
      .catch(() => setHomeworkOptions([]));
  }, [draft.subject_name, draft.grade]);

  useEffect(() => {
    if (readOnly || !draft.id || loading) return;
    const signature = JSON.stringify({ ...draft, updated_at: undefined });
    if (signature === savedSignature.current) return;
    const timer = window.setTimeout(() => {
      persist('draft', true).then(() => {
        savedSignature.current = signature;
      });
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [draft, readOnly, loading]);

  const subjects = useMemo(() => {
    const names = new Map<string, Allocation>();
    context.allocations.forEach((item) => {
      if (!names.has(item.subject_name)) names.set(item.subject_name, item);
    });
    return Array.from(names.values());
  }, [context.allocations]);

  const classesForSubject = context.allocations.filter((item) => (
    item.subject_name === draft.subject_name && Number(item.grade) === Number(draft.grade)
  ));
  const gradesForSubject = Array.from(new Set(
    context.allocations.filter((item) => item.subject_name === draft.subject_name).map((item) => Number(item.grade))
  ));

  const allocated = stageMinutes(draft.stages);
  const duration = Number(draft.duration_minutes) || 0;
  const overTime = duration > 0 && allocated > duration;
  const locked = readOnly;

  function chooseAllocation(key: string) {
    const match = context.allocations.find((item) => allocationKey(item) === key);
    if (!match) return;
    setDraft((current) => ({
      ...current,
      subject_name: match.subject_name,
      subject_id: match.subject_id || null,
      grade: Number(match.grade),
      class_id: match.class_id || null,
      class_name: match.class_name || ''
    }));
  }

  async function persist(saveAs: LessonStatus, silent = false) {
    if (locked) return;
    setSaving(true);
    if (!silent) setError(null);
    try {
      const payload = payloadFromDraft(draft, saveAs);
      const sent = JSON.stringify({ ...draft, updated_at: undefined });
      const saved = draft.id
        ? await lessonPlanningService.updatePlan(draft.id, payload)
        : await lessonPlanningService.createPlan(payload);
      const next = draftFromPlan(saved);
      savedSignature.current = sent;
      setDraft((current) => {
        const currentSignature = JSON.stringify({ ...current, updated_at: undefined });
        if (currentSignature !== sent) {
          return { ...current, id: next.id, updated_at: next.updated_at, teacher_id: next.teacher_id };
        }
        return next;
      });
      if (!silent) {
        const message = saveAs === 'completed'
          ? 'Lesson marked as completed.'
          : saveAs === 'scheduled'
            ? 'Lesson plan scheduled.'
            : 'Lesson plan saved.';
        setNotice(message);
        onSaved(saved);
      }
    } catch (err: any) {
      if (!silent || err?.response?.status !== 409) {
        setError(err?.response?.data?.error || 'The lesson plan could not be saved.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function downloadPdf() {
    if (!draft.id) {
      setError('Save the lesson plan before downloading a PDF.');
      return;
    }
    const response = await lessonPlanningService.downloadPlanPdf(draft.id);
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(draft.topic || 'lesson-plan').replace(/[^\w.-]+/g, '_')}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function uploadMaterial(index: number, file: File) {
    if (!draft.id) {
      setError('Save the draft before attaching a file.');
      return;
    }
    const form = new FormData();
    form.append('file', file);
    form.append('material_name', draft.materials[index]?.material_name || file.name);
    const saved = await lessonPlanningService.uploadMaterial(draft.id, form);
    setDraft((current) => {
      const materials = current.materials.slice();
      materials[index] = {
        ...materials[index],
        id: saved.id,
        material_name: materials[index].material_name || saved.material_name,
        attachment_original_name: saved.attachment_original_name,
        attachment_stored_name: saved.attachment_stored_name,
        download_url: saved.download_url
      };
      return { ...current, materials };
    });
  }

  async function publishHomework(index: number) {
    const item = draft.assignments[index];
    if (!item?.due_date) {
      setError('Add a due date before publishing this assignment to the homework hub.');
      return;
    }
    const allocation = context.allocations.find((row) => row.subject_name === draft.subject_name && Number(row.grade) === Number(draft.grade));
    const form = new FormData();
    form.append('title', item.title || draft.topic || 'Lesson assignment');
    form.append('description', item.assignment_content || '');
    form.append('subject', draft.subject_name);
    form.append('grade', String(draft.grade));
    form.append('stream', allocation?.stream || 'General');
    form.append('due_date', item.due_date);
    form.append('due_time', '23:59');
    form.append('total_marks', '50');
    const created = await assignmentService.createAssignment(form);
    const homeworkId = created?.assignment?.id;
    if (!homeworkId) throw new Error('The homework hub did not return a record.');
    setDraft((current) => {
      const assignments = current.assignments.slice();
      assignments[index] = { ...assignments[index], homework_assignment_id: homeworkId };
      return { ...current, assignments };
    });
    setNotice('Assignment published through the existing homework hub. Save the lesson to keep the link.');
  }

  async function askAi(action: string, title: string) {
    setError(null);
    setReplaceArmed(false);
    try {
      const result = await lessonPlanningService.assist({
        action,
        subject_name: draft.subject_name,
        grade: draft.grade,
        class_name: draft.class_name,
        topic: draft.topic,
        sub_topic: draft.sub_topic,
        duration_minutes: draft.duration_minutes,
        previous_knowledge: draft.previous_knowledge,
        objectives: draft.objectives,
        materials: draft.materials,
        methods: draft.methods
      });
      setAi({
        action,
        title,
        suggestions: result.suggestions,
        warnings: result.warnings || []
      });
    } catch (err: any) {
      setError(err?.response?.data?.error || 'The assistant could not respond.');
    }
  }

  function applyAi(replace: boolean) {
    if (!ai?.suggestions) return;
    if (replace && !replaceArmed) {
      setReplaceArmed(true);
      return;
    }
    const suggestions = ai.suggestions;
    setDraft((current) => {
      const next = { ...current };
      if (ai.action === 'objectives' || ai.action === 'improve_objectives') {
        const incoming = (suggestions.objectives || []).map((objective: string) => ({ objective }));
        next.objectives = replace ? incoming : [...current.objectives, ...incoming];
      } else if (ai.action === 'previous_knowledge' && suggestions.previous_knowledge) {
        next.previous_knowledge = replace || !current.previous_knowledge
          ? suggestions.previous_knowledge
          : `${current.previous_knowledge}\n\n${suggestions.previous_knowledge}`;
      } else if (ai.action === 'materials') {
        const incoming = (suggestions.materials || []).map((item: any) => ({
          material_name: item.material_name || '',
          description: item.description || ''
        }));
        next.materials = replace ? incoming : [...current.materials, ...incoming];
      } else if (ai.action === 'methods') {
        const incoming = (suggestions.methods || []).map((method: string) => ({ method_name: method }));
        next.methods = replace ? incoming : [...current.methods, ...incoming];
      } else if (ai.action === 'stages') {
        const incoming = (suggestions.stages || []).map((item: any) => ({
          stage_name: item.stage_name || '',
          duration_minutes: item.duration_minutes ?? '',
          teacher_activities: item.teacher_activities || '',
          learner_activities: item.learner_activities || ''
        }));
        next.stages = replace ? incoming : [...current.stages, ...incoming];
      } else if (ai.action === 'evaluation') {
        const incoming = (suggestions.evaluations || []).map((item: any) => ({
          question: item.question || '',
          question_type: item.question_type || 'short_answer'
        }));
        next.evaluations = replace ? incoming : [...current.evaluations, ...incoming];
      } else if (ai.action === 'assignment' && suggestions.assignment) {
        const incoming: AssignmentItem = {
          title: suggestions.assignment.title || '',
          assignment_content: suggestions.assignment.assignment_content || '',
          due_date: '',
          homework_assignment_id: null
        };
        next.assignments = replace ? [incoming] : [...current.assignments, incoming];
      }
      return next;
    });
    setAi(null);
    setReplaceArmed(false);
    setNotice(replace ? 'Assistant suggestion replaced the section. Review it before saving.' : 'Assistant suggestion added. Review it before saving.');
  }

  async function saveTemplate() {
    if (!draft.id) {
      setError('Save the lesson plan before creating a template.');
      return;
    }
    await lessonPlanningService.saveAsTemplate(draft.id, {
      template_name: templateName || draft.topic || 'Lesson template',
      visibility: templateVisibility
    });
    setTemplateOpen(false);
    setNotice('Template saved without school or teacher details.');
  }

  if (loading) {
    return <div className={`${card} p-8 text-sm text-slate-500`}>Loading lesson plan…</div>;
  }

  if (!context.allocations.length && !draft.id) {
    return (
      <EmptyState
        title="No teaching allocation"
        description="Lesson plans can only be created for subjects and classes assigned to your account. Ask the school administrator to allocate a class if this list is empty."
        actionLabel="Back"
        onAction={onBack}
      />
    );
  }

  return (
    <div className="space-y-4 pb-16">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={quietBtn} onClick={onBack}>Back</button>
        <button type="button" className={primaryBtn} disabled={locked || saving} onClick={() => persist('draft')}>
          {saving ? 'Saving…' : 'Save draft'}
        </button>
        <button
          type="button"
          className={quietBtn}
          disabled={locked || saving}
          onClick={() => {
            if (!draft.scheduled_date) {
              setNotice(null);
              setError('Choose a lesson date before scheduling.');
              return;
            }
            persist('scheduled');
          }}
        >
          Save and schedule
        </button>
        <button type="button" className={quietBtn} disabled={locked || saving} onClick={() => persist('completed')}>Mark as completed</button>
        <button type="button" className={quietBtn} onClick={() => setPreview(true)}>Preview</button>
        <button type="button" className={quietBtn} onClick={downloadPdf}>Download PDF</button>
        <button type="button" className={quietBtn} disabled={locked} onClick={() => setTemplateOpen(true)}>Save as template</button>
      </div>
      {error && <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>}
      {notice && <p className="text-sm text-emerald-700 dark:text-emerald-300">{notice}</p>}
      {overTime && (
        <p className="text-sm text-amber-700 dark:text-amber-300">
          Presentation time is {allocated} minutes. The lesson duration is {duration} minutes. You can still save this draft.
        </p>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {sections.map(([id, title]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setActiveSection(id);
              document.getElementById(`lesson-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${activeSection === id ? 'bg-[#168BFF] text-white' : 'bg-slate-100 text-slate-600 dark:bg-[#0D1620] dark:text-slate-300'}`}
          >
            {title}
          </button>
        ))}
      </div>

      <section id="lesson-general" className={`${card} p-4 space-y-3`}>
        <h2 className="text-sm font-black text-slate-900 dark:text-white">1. General information</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <span className={label}>School</span>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{context.school.name}</p>
          </div>
          <div>
            <span className={label}>Teacher</span>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{teacherLabel(context.teacher)}</p>
          </div>
          <label>
            <span className={label}>Subject and class</span>
            <select
              className={field}
              disabled={locked}
              value={allocationKey(draft)}
              onChange={(event) => chooseAllocation(event.target.value)}
            >
              <option value="">Select an allocated class</option>
              {context.allocations.map((item) => (
                <option key={allocationKey(item)} value={allocationKey(item)}>
                  {item.subject_name} · Grade {item.grade}{item.class_name ? ` · ${item.class_name}` : ''}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={label}>Grade</span>
            <select className={field} disabled={locked} value={String(draft.grade)} onChange={(event) => setDraft({ ...draft, grade: Number(event.target.value) })}>
              {gradesForSubject.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
            </select>
          </label>
          <label>
            <span className={label}>Class</span>
            <select
              className={field}
              disabled={locked}
              value={draft.class_name}
              onChange={(event) => {
                const match = classesForSubject.find((item) => item.class_name === event.target.value);
                setDraft({ ...draft, class_name: event.target.value, class_id: match?.class_id || null });
              }}
            >
              {classesForSubject.map((item) => (
                <option key={allocationKey(item)} value={item.class_name || ''}>{item.class_name || 'Allocated class'}</option>
              ))}
            </select>
          </label>
          <label>
            <span className={label}>Academic year</span>
            <select className={field} disabled={locked} value={draft.academic_year} onChange={(event) => setDraft({ ...draft, academic_year: Number(event.target.value) })}>
              {context.academic_years.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <label>
            <span className={label}>Term</span>
            <select className={field} disabled={locked} value={draft.term} onChange={(event) => setDraft({ ...draft, term: Number(event.target.value) })}>
              {context.terms.map((term) => <option key={term} value={term}>Term {term}</option>)}
            </select>
          </label>
          <label>
            <span className={label}>Date</span>
            <input type="date" className={field} disabled={locked} value={draft.scheduled_date} onChange={(event) => setDraft({ ...draft, scheduled_date: event.target.value })} />
          </label>
          <label>
            <span className={label}>Time</span>
            <input type="time" className={field} disabled={locked} value={draft.scheduled_time} onChange={(event) => setDraft({ ...draft, scheduled_time: event.target.value })} />
          </label>
          <label>
            <span className={label}>Duration (minutes)</span>
            <input type="number" min={1} max={300} className={field} disabled={locked} value={draft.duration_minutes} onChange={(event) => setDraft({ ...draft, duration_minutes: event.target.value === '' ? '' : Number(event.target.value) })} />
          </label>
          <label className="sm:col-span-2">
            <span className={label}>Topic</span>
            <input className={field} disabled={locked} value={draft.topic} onChange={(event) => setDraft({ ...draft, topic: event.target.value })} />
          </label>
          <label className="sm:col-span-2">
            <span className={label}>Sub-topic</span>
            <input className={field} disabled={locked} value={draft.sub_topic} onChange={(event) => setDraft({ ...draft, sub_topic: event.target.value })} />
          </label>
        </div>
        {subjects.length === 0 && <p className="text-xs text-slate-500">No subjects are allocated to this account.</p>}
      </section>

      <section id="lesson-objectives" className={`${card} p-4 space-y-3`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-black text-slate-900 dark:text-white">2. Instructional objectives</h2>
          <button type="button" className={quietBtn} disabled={locked} onClick={() => askAi('objectives', 'Suggested objectives')}>Assist</button>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">By the end of the lesson, learners should be able to:</p>
        {draft.objectives.map((item, index) => (
          <div key={`objective-${index}`} className="flex gap-2">
            <textarea className={field} rows={2} disabled={locked} value={item.objective} onChange={(event) => {
              const objectives = draft.objectives.slice();
              objectives[index] = { objective: event.target.value };
              setDraft({ ...draft, objectives });
            }} />
            <div className="flex flex-col gap-1">
              <button type="button" className={quietBtn} disabled={locked} onClick={() => setDraft({ ...draft, objectives: moveItem(draft.objectives, index, -1) })}>Up</button>
              <button type="button" className={quietBtn} disabled={locked} onClick={() => setDraft({ ...draft, objectives: moveItem(draft.objectives, index, 1) })}>Down</button>
              <button type="button" className={quietBtn} disabled={locked} onClick={() => setDraft({ ...draft, objectives: draft.objectives.filter((_, itemIndex) => itemIndex !== index) })}>Delete</button>
            </div>
          </div>
        ))}
        <div className="flex gap-2">
          <button type="button" className={quietBtn} disabled={locked} onClick={() => setDraft({ ...draft, objectives: [...draft.objectives, { objective: '' }] })}>Add objective</button>
          <button type="button" className={quietBtn} disabled={locked} onClick={() => askAi('improve_objectives', 'Clearer objectives')}>Improve wording</button>
        </div>
      </section>

      <section id="lesson-previous" className={`${card} p-4 space-y-3`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-black text-slate-900 dark:text-white">3. Previous knowledge</h2>
          <button type="button" className={quietBtn} disabled={locked} onClick={() => askAi('previous_knowledge', 'Previous knowledge')}>Assist</button>
        </div>
        <textarea className={field} rows={5} disabled={locked} value={draft.previous_knowledge} onChange={(event) => setDraft({ ...draft, previous_knowledge: event.target.value })} placeholder="What learners already know, and how it connects to this lesson." />
      </section>

      <section id="lesson-materials" className={`${card} p-4 space-y-3`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-black text-slate-900 dark:text-white">4. Instructional materials</h2>
          <button type="button" className={quietBtn} disabled={locked} onClick={() => askAi('materials', 'Suggested materials')}>Assist</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {MATERIAL_OPTIONS.map((name) => (
            <button key={name} type="button" className={quietBtn} disabled={locked} onClick={() => setDraft({ ...draft, materials: [...draft.materials, { material_name: name, description: '' }] })}>{name}</button>
          ))}
        </div>
        {draft.materials.map((item, index) => (
          <MaterialRow key={`material-${index}`} item={item} locked={locked} onChange={(next) => {
            const materials = draft.materials.slice();
            materials[index] = next;
            setDraft({ ...draft, materials });
          }} onDelete={() => setDraft({ ...draft, materials: draft.materials.filter((_, itemIndex) => itemIndex !== index) })} onUpload={(file) => uploadMaterial(index, file)} />
        ))}
        <button type="button" className={quietBtn} disabled={locked} onClick={() => setDraft({ ...draft, materials: [...draft.materials, { material_name: '', description: '' }] })}>Add custom material</button>
      </section>

      <section id="lesson-methods" className={`${card} p-4 space-y-3`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-black text-slate-900 dark:text-white">5. Teaching methods</h2>
          <button type="button" className={quietBtn} disabled={locked} onClick={() => askAi('methods', 'Suggested methods')}>Assist</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {METHOD_OPTIONS.map((name) => {
            const selected = draft.methods.some((item) => item.method_name === name);
            return (
              <button
                key={name}
                type="button"
                disabled={locked}
                className={selected ? primaryBtn : quietBtn}
                onClick={() => setDraft({
                  ...draft,
                  methods: selected
                    ? draft.methods.filter((item) => item.method_name !== name)
                    : [...draft.methods, { method_name: name }]
                })}
              >
                {name}
              </button>
            );
          })}
        </div>
        <button type="button" className={quietBtn} disabled={locked} onClick={() => setDraft({ ...draft, methods: [...draft.methods, { method_name: '' }] })}>Add custom method</button>
        {draft.methods.filter((item) => !METHOD_OPTIONS.includes(item.method_name)).map((item, index) => (
          <input key={`custom-method-${index}`} className={field} disabled={locked} value={item.method_name} onChange={(event) => {
            const methods = draft.methods.slice();
            const customIndex = draft.methods.findIndex((method, methodIndex) => method === item && methodIndex >= 0);
            const target = methods.findIndex((method) => method === item);
            if (target >= 0) methods[target] = { method_name: event.target.value };
            setDraft({ ...draft, methods });
            void customIndex;
          }} />
        ))}
      </section>

      <section id="lesson-references" className={`${card} p-4 space-y-3`}>
        <h2 className="text-sm font-black text-slate-900 dark:text-white">6. Reference materials</h2>
        {draft.references.map((item, index) => (
          <div key={`reference-${index}`} className="grid sm:grid-cols-4 gap-2">
            <input className={field} disabled={locked} placeholder="Title" value={item.reference_title} onChange={(event) => updateReference(draft, index, { reference_title: event.target.value }, setDraft)} />
            <input className={field} disabled={locked} placeholder="Author" value={item.author} onChange={(event) => updateReference(draft, index, { author: event.target.value }, setDraft)} />
            <select className={field} disabled={locked} value={item.reference_type} onChange={(event) => updateReference(draft, index, { reference_type: event.target.value }, setDraft)}>
              <option value="textbook">Textbook</option>
              <option value="curriculum">Curriculum document</option>
              <option value="teacher_guide">Teacher guide</option>
              <option value="resource">Educational resource</option>
              <option value="other">Other</option>
            </select>
            <button type="button" className={quietBtn} disabled={locked} onClick={() => setDraft({ ...draft, references: draft.references.filter((_, itemIndex) => itemIndex !== index) })}>Delete</button>
          </div>
        ))}
        <button type="button" className={quietBtn} disabled={locked} onClick={() => setDraft({ ...draft, references: [...draft.references, { reference_title: '', author: '', reference_type: 'textbook' }] })}>Add reference</button>
      </section>

      <section id="lesson-presentation" className={`${card} p-4 space-y-3`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-black text-slate-900 dark:text-white">7. Lesson presentation</h2>
          <button type="button" className={quietBtn} disabled={locked} onClick={() => askAi('stages', 'Presentation stages')}>Assist</button>
        </div>
        <p className="text-xs text-slate-500">Allocated time: {allocated} min{duration ? ` of ${duration} min` : ''}.</p>
        <div className="hidden md:grid md:grid-cols-12 gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          <span className="col-span-2">Stage</span>
          <span className="col-span-1">Min</span>
          <span className="col-span-4">Teacher's activities</span>
          <span className="col-span-4">Learners' activities</span>
        </div>
        {draft.stages.map((stage, index) => (
          <div key={`stage-${index}`} className="grid md:grid-cols-12 gap-2 border-t border-slate-200 dark:border-white/10 pt-2">
            <input className={`${field} md:col-span-2`} disabled={locked} value={stage.stage_name} onChange={(event) => updateStage(draft, index, { stage_name: event.target.value }, setDraft)} />
            <input type="number" className={`${field} md:col-span-1`} disabled={locked} value={stage.duration_minutes} onChange={(event) => updateStage(draft, index, { duration_minutes: event.target.value === '' ? '' : Number(event.target.value) }, setDraft)} />
            <textarea className={`${field} md:col-span-4`} rows={3} disabled={locked} value={stage.teacher_activities} onChange={(event) => updateStage(draft, index, { teacher_activities: event.target.value }, setDraft)} />
            <textarea className={`${field} md:col-span-4`} rows={3} disabled={locked} value={stage.learner_activities} onChange={(event) => updateStage(draft, index, { learner_activities: event.target.value }, setDraft)} />
            <div className="md:col-span-1 flex md:flex-col gap-1">
              <button type="button" className={quietBtn} disabled={locked} onClick={() => setDraft({ ...draft, stages: moveItem(draft.stages, index, -1) })}>Up</button>
              <button type="button" className={quietBtn} disabled={locked} onClick={() => setDraft({ ...draft, stages: moveItem(draft.stages, index, 1) })}>Down</button>
              <button type="button" className={quietBtn} disabled={locked} onClick={() => setDraft({ ...draft, stages: draft.stages.filter((_, itemIndex) => itemIndex !== index) })}>Delete</button>
            </div>
          </div>
        ))}
        <button type="button" className={quietBtn} disabled={locked} onClick={() => setDraft({ ...draft, stages: [...draft.stages, { stage_name: '', duration_minutes: '', teacher_activities: '', learner_activities: '' }] })}>Add stage</button>
      </section>

      <section id="lesson-evaluation" className={`${card} p-4 space-y-3`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-black text-slate-900 dark:text-white">8. Evaluation</h2>
          <button type="button" className={quietBtn} disabled={locked} onClick={() => askAi('evaluation', 'Evaluation questions')}>Assist</button>
        </div>
        {draft.evaluations.length === 0 && <p className="text-sm text-slate-500">No evaluation questions yet.</p>}
        {draft.evaluations.map((item, index) => (
          <div key={`evaluation-${index}`} className="grid sm:grid-cols-6 gap-2">
            <textarea className={`${field} sm:col-span-4`} rows={2} disabled={locked} value={item.question} onChange={(event) => {
              const evaluations = draft.evaluations.slice();
              evaluations[index] = { ...item, question: event.target.value };
              setDraft({ ...draft, evaluations });
            }} />
            <select className={`${field} sm:col-span-1`} disabled={locked} value={item.question_type} onChange={(event) => {
              const evaluations = draft.evaluations.slice();
              evaluations[index] = { ...item, question_type: event.target.value };
              setDraft({ ...draft, evaluations });
            }}>
              {QUESTION_TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
            </select>
            <button type="button" className={quietBtn} disabled={locked} onClick={() => setDraft({ ...draft, evaluations: draft.evaluations.filter((_, itemIndex) => itemIndex !== index) })}>Delete</button>
          </div>
        ))}
        <button type="button" className={quietBtn} disabled={locked} onClick={() => setDraft({ ...draft, evaluations: [...draft.evaluations, { question: '', question_type: 'short_answer' }] })}>Add question</button>
      </section>

      <section id="lesson-assignment" className={`${card} p-4 space-y-3`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-black text-slate-900 dark:text-white">9. Assignment</h2>
          <button type="button" className={quietBtn} disabled={locked} onClick={() => askAi('assignment', 'Assignment suggestion')}>Assist</button>
        </div>
        <p className="text-xs text-slate-500">Publishing uses the existing homework hub. Learners are notified only when you publish there.</p>
        {draft.assignments.map((item, index) => (
          <div key={`assignment-${index}`} className="space-y-2 border-t border-slate-200 dark:border-white/10 pt-3">
            <input className={field} disabled={locked} placeholder="Title" value={item.title} onChange={(event) => updateAssignment(draft, index, { title: event.target.value }, setDraft)} />
            <textarea className={field} rows={4} disabled={locked} placeholder="Task linked to the lesson objectives" value={item.assignment_content} onChange={(event) => updateAssignment(draft, index, { assignment_content: event.target.value }, setDraft)} />
            <div className="grid sm:grid-cols-2 gap-2">
              <input type="date" className={field} disabled={locked} value={item.due_date} onChange={(event) => updateAssignment(draft, index, { due_date: event.target.value }, setDraft)} />
              <select className={field} disabled={locked} value={item.homework_assignment_id || ''} onChange={(event) => updateAssignment(draft, index, { homework_assignment_id: event.target.value ? Number(event.target.value) : null }, setDraft)}>
                <option value="">Link an existing homework record</option>
                {homeworkOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.title}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={quietBtn} disabled={locked || Boolean(item.homework_assignment_id)} onClick={() => publishHomework(index).catch((err) => setError(err?.response?.data?.error || err.message))}>Publish to homework hub</button>
              {item.homework_assignment_id && <span className="text-xs text-emerald-700 dark:text-emerald-300">Linked to homework #{item.homework_assignment_id}</span>}
              <button type="button" className={quietBtn} disabled={locked} onClick={() => setDraft({ ...draft, assignments: draft.assignments.filter((_, itemIndex) => itemIndex !== index) })}>Delete</button>
            </div>
          </div>
        ))}
        <button type="button" className={quietBtn} disabled={locked} onClick={() => setDraft({ ...draft, assignments: [...draft.assignments, { title: '', assignment_content: '', due_date: '', homework_assignment_id: null }] })}>Add assignment</button>
      </section>

      <section id="lesson-reflection" className={`${card} p-4 space-y-3`}>
        <h2 className="text-sm font-black text-slate-900 dark:text-white">10. Teacher's reflection</h2>
        <p className="text-xs text-slate-500">Complete this after teaching. Objectives are not marked achieved unless you say so.</p>
        <label>
          <span className={label}>Were the lesson objectives achieved?</span>
          <select
            className={field}
            disabled={locked}
            value={draft.reflection.objectives_achieved_flag === null ? '' : draft.reflection.objectives_achieved_flag ? 'yes' : 'no'}
            onChange={(event) => setDraft({
              ...draft,
              reflection: {
                ...draft.reflection,
                objectives_achieved_flag: event.target.value === '' ? null : event.target.value === 'yes'
              }
            })}
          >
            <option value="">Not recorded</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
        {([
          ['objectives_achieved', 'Notes on the objectives'],
          ['what_went_well', 'What went well'],
          ['challenges', 'Difficulties encountered'],
          ['learners_needing_support', 'Learners or concepts needing support'],
          ['areas_for_improvement', 'What needs improvement'],
          ['recommendations', 'Recommendations for the next lesson']
        ] as const).map(([key, title]) => (
          <label key={key}>
            <span className={label}>{title}</span>
            <textarea className={field} rows={3} disabled={locked} value={draft.reflection[key]} onChange={(event) => setDraft({ ...draft, reflection: { ...draft.reflection, [key]: event.target.value } })} />
          </label>
        ))}
      </section>

      {ai && (
        <div className={`${card} p-4 space-y-3`}>
          <h3 className="text-sm font-black">{ai.title}</h3>
          {ai.warnings.map((warning) => <p key={warning} className="text-sm text-amber-700 dark:text-amber-300">{warning}</p>)}
          <pre className="whitespace-pre-wrap text-xs text-slate-700 dark:text-slate-200 max-h-60 overflow-auto">{JSON.stringify(ai.suggestions, null, 2)}</pre>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={primaryBtn} onClick={() => applyAi(false)}>Add to my section</button>
            <button type="button" className={quietBtn} onClick={() => applyAi(true)}>{replaceArmed ? 'Confirm replace' : 'Replace my text'}</button>
            <button type="button" className={quietBtn} onClick={() => setAi(null)}>Dismiss</button>
          </div>
          {replaceArmed && <p className="text-xs text-amber-700 dark:text-amber-300">Confirm replace only if you want the suggestion to overwrite this section.</p>}
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 overflow-auto" onClick={() => setPreview(false)}>
          <div className={`${card} max-w-3xl mx-auto p-5 space-y-2`} onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">{draft.topic || 'Untitled lesson'}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">{context.school.name} · {teacherLabel(context.teacher)} · {draft.subject_name} · Grade {draft.grade} {draft.class_name}</p>
            <p className="text-sm">By the end of the lesson, learners should be able to:</p>
            <ul className="list-disc pl-5 text-sm space-y-1">
              {draft.objectives.filter((item) => item.objective.trim()).map((item) => <li key={item.objective}>{item.objective}</li>)}
            </ul>
            <button type="button" className={quietBtn} onClick={() => setPreview(false)}>Close</button>
          </div>
        </div>
      )}

      {templateOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 flex items-center justify-center">
          <div className={`${card} w-full max-w-md p-4 space-y-3`}>
            <h3 className="font-black">Save as template</h3>
            <input className={field} value={templateName} placeholder="Template name" onChange={(event) => setTemplateName(event.target.value)} />
            <select className={field} value={templateVisibility} onChange={(event) => setTemplateVisibility(event.target.value as 'private' | 'school')}>
              <option value="private">Only me</option>
              <option value="school">Teachers at my school</option>
            </select>
            <div className="flex gap-2">
              <button type="button" className={primaryBtn} onClick={() => saveTemplate().catch((err) => setError(err?.response?.data?.error || 'Template could not be saved.'))}>Save template</button>
              <button type="button" className={quietBtn} onClick={() => setTemplateOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function updateStage(draft: LessonDraft, index: number, patch: Partial<LessonDraft['stages'][number]>, setDraft: (draft: LessonDraft) => void) {
  const stages = draft.stages.slice();
  stages[index] = { ...stages[index], ...patch };
  setDraft({ ...draft, stages });
}

function updateReference(draft: LessonDraft, index: number, patch: Partial<ReferenceItem>, setDraft: (draft: LessonDraft) => void) {
  const references = draft.references.slice();
  references[index] = { ...references[index], ...patch };
  setDraft({ ...draft, references });
}

function updateAssignment(draft: LessonDraft, index: number, patch: Partial<AssignmentItem>, setDraft: (draft: LessonDraft) => void) {
  const assignments = draft.assignments.slice();
  assignments[index] = { ...assignments[index], ...patch };
  setDraft({ ...draft, assignments });
}

function MaterialRow({
  item,
  locked,
  onChange,
  onDelete,
  onUpload
}: {
  item: MaterialItem;
  locked: boolean;
  onChange: (item: MaterialItem) => void;
  onDelete: () => void;
  onUpload: (file: File) => void;
}) {
  return (
    <div className="grid sm:grid-cols-6 gap-2">
      <input className={`${field} sm:col-span-2`} disabled={locked} value={item.material_name} onChange={(event) => onChange({ ...item, material_name: event.target.value })} />
      <input className={`${field} sm:col-span-2`} disabled={locked} placeholder="Description" value={item.description} onChange={(event) => onChange({ ...item, description: event.target.value })} />
      <label className={`${quietBtn} sm:col-span-1 cursor-pointer`}>
        {item.attachment_original_name ? 'Replace file' : 'Attach'}
        <input type="file" className="hidden" disabled={locked} onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onUpload(file);
        }} />
      </label>
      <button type="button" className={quietBtn} disabled={locked} onClick={onDelete}>Delete</button>
    </div>
  );
}
