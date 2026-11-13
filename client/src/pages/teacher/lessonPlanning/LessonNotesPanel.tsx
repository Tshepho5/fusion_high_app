import React, { useEffect, useState } from 'react';
import { lessonPlanningService } from '../../../services/api';
import { EmptyState } from '../../../components/common/EmptyState';
import {
  LessonContext,
  NOTE_HEADINGS,
  allocationKey,
  card,
  field,
  label,
  primaryBtn,
  quietBtn
} from './lessonPlanningModel';

interface NoteDraft {
  id?: number;
  lesson_plan_id: number | null;
  subject_name: string;
  class_id: number | null;
  class_name: string;
  grade: number | '';
  title: string;
  topic: string;
  sub_topic: string;
  introduction: string;
  content: string;
  summary: string;
  status: 'draft' | 'saved';
  updated_at?: string;
  sections: { id?: number; heading: string; body: string; attachment_original_name?: string | null; attachment_stored_name?: string | null; download_url?: string | null }[];
}

function blankNote(context: LessonContext): NoteDraft {
  const first = context.allocations[0];
  return {
    lesson_plan_id: null,
    subject_name: first?.subject_name || '',
    class_id: first?.class_id || null,
    class_name: first?.class_name || '',
    grade: first?.grade || '',
    title: '',
    topic: '',
    sub_topic: '',
    introduction: '',
    content: '',
    summary: '',
    status: 'draft',
    sections: NOTE_HEADINGS.map((heading) => ({ heading, body: '' }))
  };
}

export const LessonNotesPanel: React.FC<{ context: LessonContext; readOnly?: boolean }> = ({ context, readOnly }) => {
  const [notes, setNotes] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [draft, setDraft] = useState<NoteDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  async function load(search = query) {
    setLoading(true);
    try {
      const [noteRes, planRes] = await Promise.all([
        lessonPlanningService.listNotes(search ? { q: search } : {}),
        lessonPlanningService.listPlans({ limit: 50 })
      ]);
      setNotes(noteRes.notes || []);
      setPlans(planRes.plans || []);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Lesson notes could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(''); }, []);

  async function save(status: 'draft' | 'saved') {
    if (!draft || readOnly) return;
    setError(null);
    const payload = { ...draft, status, expected_updated_at: draft.updated_at || null };
    const saved = draft.id
      ? await lessonPlanningService.updateNote(draft.id, payload)
      : await lessonPlanningService.createNote(payload);
    setDraft(noteFromRecord(saved));
    setNotice(status === 'saved' ? 'Lesson note saved.' : 'Draft saved.');
    load(query);
  }

  async function attach(sectionIndex: number, file: File) {
    if (!draft?.id) {
      setError('Save the note before attaching a diagram.');
      return;
    }
    const section = draft.sections[sectionIndex];
    if (!section.id) {
      setError('Save the note so this section can receive a file.');
      return;
    }
    const form = new FormData();
    form.append('file', file);
    form.append('section_id', String(section.id));
    const saved = await lessonPlanningService.uploadNoteFile(draft.id, form);
    const sections = draft.sections.slice();
    sections[sectionIndex] = { ...section, ...saved };
    setDraft({ ...draft, sections });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input className={`${field} max-w-xs`} value={query} placeholder="Search notes" onChange={(event) => setQuery(event.target.value)} />
        <button type="button" className={quietBtn} onClick={() => load(query)}>Search</button>
        {!readOnly && <button type="button" className={primaryBtn} onClick={() => setDraft(blankNote(context))}>New lesson note</button>}
      </div>
      {error && <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>}
      {notice && <p className="text-sm text-emerald-700 dark:text-emerald-300">{notice}</p>}
      {loading && <p className="text-sm text-slate-500">Loading lesson notes…</p>}
      {!loading && notes.length === 0 && !draft && (
        <EmptyState title="No lesson notes" description="Lesson notes hold the content you intend to teach. They stay empty until you write one." />
      )}
      <div className="grid lg:grid-cols-[280px_1fr] gap-4">
        <div className="space-y-2">
          {notes.map((note) => (
            <button key={note.id} type="button" className={`${card} w-full p-3 text-left`} onClick={async () => setDraft(noteFromRecord(await lessonPlanningService.getNote(note.id)))}>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{note.title}</p>
              <p className="text-xs text-slate-500">{note.subject_name} · Grade {note.grade} · {note.status}</p>
            </button>
          ))}
        </div>
        {draft && (
          <div className={`${card} p-4 space-y-3`}>
            <label><span className={label}>Title</span><input className={field} disabled={readOnly} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
            <label>
              <span className={label}>Subject and class</span>
              <select className={field} disabled={readOnly} value={allocationKey(draft)} onChange={(event) => {
                const match = context.allocations.find((item) => allocationKey(item) === event.target.value);
                if (!match) return;
                setDraft({ ...draft, subject_name: match.subject_name, grade: Number(match.grade), class_name: match.class_name || '', class_id: match.class_id || null });
              }}>
                {context.allocations.map((item) => (
                  <option key={allocationKey(item)} value={allocationKey(item)}>{item.subject_name} · Grade {item.grade} · {item.class_name}</option>
                ))}
              </select>
            </label>
            <label>
              <span className={label}>Linked lesson plan</span>
              <select className={field} disabled={readOnly} value={draft.lesson_plan_id || ''} onChange={(event) => setDraft({ ...draft, lesson_plan_id: event.target.value ? Number(event.target.value) : null })}>
                <option value="">Not linked</option>
                {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.topic || plan.subject_name} · {plan.class_name}</option>)}
              </select>
            </label>
            <div className="grid sm:grid-cols-2 gap-2">
              <label><span className={label}>Topic</span><input className={field} disabled={readOnly} value={draft.topic} onChange={(event) => setDraft({ ...draft, topic: event.target.value })} /></label>
              <label><span className={label}>Sub-topic</span><input className={field} disabled={readOnly} value={draft.sub_topic} onChange={(event) => setDraft({ ...draft, sub_topic: event.target.value })} /></label>
            </div>
            <label><span className={label}>Introduction</span><textarea className={field} rows={3} disabled={readOnly} value={draft.introduction} onChange={(event) => setDraft({ ...draft, introduction: event.target.value })} /></label>
            <label><span className={label}>Detailed content</span><textarea className={field} rows={5} disabled={readOnly} value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} /></label>
            {draft.sections.map((section, index) => (
              <div key={`${section.heading}-${index}`} className="space-y-1">
                <input className={field} disabled={readOnly} value={section.heading} onChange={(event) => {
                  const sections = draft.sections.slice();
                  sections[index] = { ...section, heading: event.target.value };
                  setDraft({ ...draft, sections });
                }} />
                <textarea className={field} rows={3} disabled={readOnly} value={section.body} onChange={(event) => {
                  const sections = draft.sections.slice();
                  sections[index] = { ...section, body: event.target.value };
                  setDraft({ ...draft, sections });
                }} />
                <div className="flex flex-wrap gap-2 items-center">
                  <label className={`${quietBtn} cursor-pointer`}>
                    Diagram or file
                    <input type="file" className="hidden" disabled={readOnly} onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) attach(index, file).catch((err) => setError(err?.response?.data?.error || 'Upload failed.'));
                    }} />
                  </label>
                  {section.attachment_original_name && <span className="text-xs text-slate-500">{section.attachment_original_name}</span>}
                  <button type="button" className={quietBtn} disabled={readOnly} onClick={() => setDraft({ ...draft, sections: draft.sections.filter((_, itemIndex) => itemIndex !== index) })}>Remove section</button>
                </div>
              </div>
            ))}
            <label><span className={label}>Summary</span><textarea className={field} rows={3} disabled={readOnly} value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} /></label>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={quietBtn} disabled={readOnly} onClick={() => setDraft({ ...draft, sections: [...draft.sections, { heading: 'Section', body: '' }] })}>Add section</button>
              <button type="button" className={quietBtn} disabled={readOnly} onClick={() => save('draft').catch((err) => setError(err?.response?.data?.error || 'Save failed.'))}>Save draft</button>
              <button type="button" className={primaryBtn} disabled={readOnly} onClick={() => save('saved').catch((err) => setError(err?.response?.data?.error || 'Save failed.'))}>Save note</button>
              {draft.id && !readOnly && (
                <button type="button" className={quietBtn} onClick={async () => {
                  if (!window.confirm('Delete this lesson note?')) return;
                  await lessonPlanningService.deleteNote(draft.id!);
                  setDraft(null);
                  load(query);
                }}>Delete</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function noteFromRecord(note: any): NoteDraft {
  return {
    id: note.id,
    lesson_plan_id: note.lesson_plan_id,
    subject_name: note.subject_name,
    class_id: note.class_id,
    class_name: note.class_name || '',
    grade: note.grade,
    title: note.title || '',
    topic: note.topic || '',
    sub_topic: note.sub_topic || '',
    introduction: note.introduction || '',
    content: note.content || '',
    summary: note.summary || '',
    status: note.status || 'draft',
    updated_at: note.updated_at,
    sections: (note.sections || []).map((section: any) => ({
      id: section.id,
      heading: section.heading || '',
      body: section.body || '',
      attachment_original_name: section.attachment_original_name,
      attachment_stored_name: section.attachment_stored_name,
      download_url: section.download_url
    }))
  };
}
