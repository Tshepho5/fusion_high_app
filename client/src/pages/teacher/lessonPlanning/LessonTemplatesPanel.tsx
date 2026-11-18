import React, { useEffect, useState } from 'react';
import { lessonPlanningService } from '../../../services/api';
import { EmptyState } from '../../../components/common/EmptyState';
import { LessonContext, allocationKey, card, field, label, primaryBtn, quietBtn } from './lessonPlanningModel';

export const LessonTemplatesPanel: React.FC<{
  context: LessonContext;
  readOnly?: boolean;
  onCreated: (plan: any) => void;
}> = ({ context, readOnly, onCreated }) => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [allocation, setAllocation] = useState(context.allocations[0] ? allocationKey(context.allocations[0]) : '');
  const [topic, setTopic] = useState('');
  const [date, setDate] = useState('');

  async function load() {
    setLoading(true);
    try {
      const result = await lessonPlanningService.listTemplates();
      setTemplates(result.templates || []);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Templates could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createBlank() {
    await lessonPlanningService.createTemplate({
      template_name: name || 'Untitled template',
      visibility: 'private',
      template_content: { objectives: [], stages: [], materials: [], methods: [], evaluations: [], assignments: [] }
    });
    setName('');
    setNotice('Template created. School and teacher details are added only when you use it.');
    load();
  }

  async function useTemplate() {
    if (!selected) return;
    const match = context.allocations.find((item) => allocationKey(item) === allocation);
    if (!match) {
      setError('Choose one of your allocated classes before using a template.');
      return;
    }
    const plan = await lessonPlanningService.applyTemplate(selected, {
      subject_name: match.subject_name,
      subject_id: match.subject_id,
      grade: match.grade,
      class_id: match.class_id,
      class_name: match.class_name,
      academic_year: context.suggested_year,
      term: context.suggested_term,
      topic,
      scheduled_date: date,
      save_as: 'draft'
    });
    onCreated(plan);
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>}
      {notice && <p className="text-sm text-emerald-700 dark:text-emerald-300">{notice}</p>}
      {!readOnly && (
        <div className={`${card} p-4 flex flex-wrap gap-2 items-end`}>
          <label className="flex-1 min-w-[180px]"><span className={label}>New template name</span><input className={field} value={name} onChange={(event) => setName(event.target.value)} /></label>
          <button type="button" className={primaryBtn} onClick={() => createBlank().catch((err) => setError(err?.response?.data?.error || 'Template could not be created.'))}>Create template</button>
        </div>
      )}
      {loading && <p className="text-sm text-slate-500">Loading templates…</p>}
      {!loading && templates.length === 0 && (
        <EmptyState title="No templates" description="Save a lesson plan as a template, or create an empty one. Templates keep structure only." />
      )}
      <div className="space-y-2">
        {templates.map((template) => (
          <label key={template.id} className={`${card} p-3 flex items-start gap-3`}>
            <input type="radio" name="template" checked={selected === template.id} onChange={() => setSelected(template.id)} />
            <span>
              <span className="block text-sm font-bold text-slate-900 dark:text-white">{template.template_name}</span>
              <span className="block text-xs text-slate-500">{template.visibility === 'school' ? 'School' : 'Private'} · {[template.teacher_first_name, template.teacher_surname].filter(Boolean).join(' ')}</span>
            </span>
            {!readOnly && (
              <button type="button" className={`${quietBtn} ml-auto`} onClick={async () => {
                if (!window.confirm('Delete this template?')) return;
                await lessonPlanningService.deleteTemplate(template.id);
                load();
              }}>Delete</button>
            )}
          </label>
        ))}
      </div>
      {selected && !readOnly && (
        <div className={`${card} p-4 space-y-3`}>
          <h2 className="text-sm font-black">Use template for a new lesson</h2>
          <label>
            <span className={label}>Your class</span>
            <select className={field} value={allocation} onChange={(event) => setAllocation(event.target.value)}>
              {context.allocations.map((item) => (
                <option key={allocationKey(item)} value={allocationKey(item)}>{item.subject_name} · Grade {item.grade} · {item.class_name}</option>
              ))}
            </select>
          </label>
          <label><span className={label}>Topic</span><input className={field} value={topic} onChange={(event) => setTopic(event.target.value)} /></label>
          <label><span className={label}>Date</span><input type="date" className={field} value={date} onChange={(event) => setDate(event.target.value)} /></label>
          <button type="button" className={primaryBtn} onClick={() => useTemplate().catch((err) => setError(err?.response?.data?.error || 'The template could not be used.'))}>Create lesson from template</button>
        </div>
      )}
    </div>
  );
};
