export type LessonStatus = 'draft' | 'scheduled' | 'completed';

export interface Allocation {
  subject_name: string;
  subject_code?: string | null;
  subject_id?: number | null;
  grade: number;
  class_id?: number | null;
  class_name?: string | null;
  stream?: string | null;
}

export interface LessonContext {
  school: {
    id: number;
    name: string;
    emis_number?: string | null;
    physical_address?: string | null;
    contact_email?: string | null;
    contact_phone?: string | null;
    curriculum_type?: string | null;
  };
  teacher: { id: number; full_name?: string; surname?: string; email?: string };
  allocations: Allocation[];
  academic_years: number[];
  terms: number[];
  suggested_year: number;
  suggested_term: number;
  oversight?: boolean;
}

export interface ObjectiveItem { objective: string }
export interface MaterialItem {
  id?: number;
  material_name: string;
  description: string;
  attachment_original_name?: string | null;
  attachment_stored_name?: string | null;
  download_url?: string | null;
}
export interface MethodItem { method_name: string }
export interface ReferenceItem { reference_title: string; author: string; reference_type: string }
export interface StageItem {
  stage_name: string;
  duration_minutes: number | '';
  teacher_activities: string;
  learner_activities: string;
}
export interface EvaluationItem { question: string; question_type: string }
export interface AssignmentItem {
  title: string;
  assignment_content: string;
  due_date: string;
  homework_assignment_id: number | null;
}
export interface ReflectionItem {
  objectives_achieved_flag: boolean | null;
  objectives_achieved: string;
  what_went_well: string;
  challenges: string;
  learners_needing_support: string;
  areas_for_improvement: string;
  recommendations: string;
}

export interface LessonDraft {
  id?: number;
  teacher_id?: number;
  subject_name: string;
  subject_id: number | null;
  class_id: number | null;
  class_name: string;
  grade: number | '';
  academic_year: number;
  term: number;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number | '';
  topic: string;
  sub_topic: string;
  previous_knowledge: string;
  status: LessonStatus;
  timetable_id: number | null;
  timetable_class: string;
  timetable_day: string;
  timetable_period: string;
  objectives: ObjectiveItem[];
  materials: MaterialItem[];
  methods: MethodItem[];
  references: ReferenceItem[];
  stages: StageItem[];
  evaluations: EvaluationItem[];
  assignments: AssignmentItem[];
  reflection: ReflectionItem;
  updated_at?: string;
  school_name?: string;
  teacher_first_name?: string;
  teacher_surname?: string;
}

export const METHOD_OPTIONS = [
  'Discussion',
  'Demonstration',
  'Question and answer',
  'Explanation',
  'Group work',
  'Practical activities'
];

export const MATERIAL_OPTIONS = [
  'Textbook',
  'Charts',
  'Flashcards',
  'Pictures',
  'Whiteboard',
  'Markers',
  'Projector',
  'Real objects'
];

export const QUESTION_TYPES = [
  { id: 'short_answer', label: 'Short answer' },
  { id: 'multiple_choice', label: 'Multiple choice' },
  { id: 'practical', label: 'Practical activity' },
  { id: 'oral', label: 'Oral' },
  { id: 'written', label: 'Written' }
];

export const DEFAULT_STAGE_NAMES = [
  'Introduction',
  'Explanation',
  'Examples and Demonstration',
  "Learners' Participation",
  'Practice',
  'Summary'
];

export const NOTE_HEADINGS = [
  'Detailed explanations',
  'Definitions',
  'Examples',
  'Important points',
  'Classroom activities',
  'Additional teaching resources',
  'References'
];

export const card = 'rounded-2xl border border-slate-200/90 dark:border-[#2C3948] bg-white dark:bg-[#111821]';
export const field = 'w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-[#0D1620] px-3 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-[#168BFF]';
export const label = 'block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1';
export const primaryBtn = 'inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#168BFF] hover:bg-[#0878E8] text-white text-xs font-bold px-3.5 py-2 disabled:opacity-50';
export const quietBtn = 'inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-200 text-xs font-bold px-3.5 py-2 hover:border-[#168BFF] disabled:opacity-50';

export function emptyReflection(): ReflectionItem {
  return {
    objectives_achieved_flag: null,
    objectives_achieved: '',
    what_went_well: '',
    challenges: '',
    learners_needing_support: '',
    areas_for_improvement: '',
    recommendations: ''
  };
}

export function suggestedStages(): StageItem[] {
  return DEFAULT_STAGE_NAMES.map((stage_name) => ({
    stage_name,
    duration_minutes: '',
    teacher_activities: '',
    learner_activities: ''
  }));
}

export function emptyDraft(context?: LessonContext | null, seed?: Partial<LessonDraft>): LessonDraft {
  const first = context?.allocations?.[0];
  return {
    subject_name: seed?.subject_name || first?.subject_name || '',
    subject_id: seed?.subject_id ?? first?.subject_id ?? null,
    class_id: seed?.class_id ?? first?.class_id ?? null,
    class_name: seed?.class_name || first?.class_name || '',
    grade: seed?.grade ?? first?.grade ?? '',
    academic_year: seed?.academic_year || context?.suggested_year || new Date().getFullYear(),
    term: seed?.term || context?.suggested_term || 1,
    scheduled_date: seed?.scheduled_date || '',
    scheduled_time: seed?.scheduled_time || '',
    duration_minutes: seed?.duration_minutes ?? 60,
    topic: seed?.topic || '',
    sub_topic: seed?.sub_topic || '',
    previous_knowledge: '',
    status: 'draft',
    timetable_id: seed?.timetable_id ?? null,
    timetable_class: seed?.timetable_class || seed?.class_name || first?.class_name || '',
    timetable_day: seed?.timetable_day || '',
    timetable_period: seed?.timetable_period || '',
    objectives: [{ objective: '' }],
    materials: [],
    methods: [],
    references: [],
    stages: suggestedStages(),
    evaluations: [],
    assignments: [{ title: '', assignment_content: '', due_date: '', homework_assignment_id: null }],
    reflection: emptyReflection()
  };
}

export function draftFromPlan(plan: any): LessonDraft {
  const time = plan.scheduled_time ? String(plan.scheduled_time).slice(0, 5) : '';
  return {
    id: plan.id,
    teacher_id: plan.teacher_id,
    subject_name: plan.subject_name || '',
    subject_id: plan.subject_id ?? null,
    class_id: plan.class_id ?? null,
    class_name: plan.class_name || '',
    grade: plan.grade,
    academic_year: plan.academic_year,
    term: plan.term,
    scheduled_date: plan.scheduled_date || '',
    scheduled_time: time,
    duration_minutes: plan.duration_minutes ?? '',
    topic: plan.topic || '',
    sub_topic: plan.sub_topic || '',
    previous_knowledge: plan.previous_knowledge || '',
    status: plan.status || 'draft',
    timetable_id: plan.timetable_id ?? null,
    timetable_class: plan.timetable_class || '',
    timetable_day: plan.timetable_day || '',
    timetable_period: plan.timetable_period || '',
    objectives: plan.objectives?.length ? plan.objectives.map((item: any) => ({ objective: item.objective || '' })) : [{ objective: '' }],
    materials: (plan.materials || []).map((item: any) => ({
      id: item.id,
      material_name: item.material_name || '',
      description: item.description || '',
      attachment_original_name: item.attachment_original_name,
      attachment_stored_name: item.attachment_stored_name,
      download_url: item.download_url
    })),
    methods: (plan.methods || []).map((item: any) => ({ method_name: item.method_name })),
    references: (plan.references || []).map((item: any) => ({
      reference_title: item.reference_title || '',
      author: item.author || '',
      reference_type: item.reference_type || 'other'
    })),
    stages: plan.stages?.length
      ? plan.stages.map((item: any) => ({
          stage_name: item.stage_name || '',
          duration_minutes: item.duration_minutes ?? '',
          teacher_activities: item.teacher_activities || '',
          learner_activities: item.learner_activities || ''
        }))
      : suggestedStages(),
    evaluations: (plan.evaluations || []).map((item: any) => ({
      question: item.question || '',
      question_type: item.question_type || 'short_answer'
    })),
    assignments: plan.assignments?.length
      ? plan.assignments.map((item: any) => ({
          title: item.title || '',
          assignment_content: item.assignment_content || '',
          due_date: item.due_date || '',
          homework_assignment_id: item.homework_assignment_id || null
        }))
      : [{ title: '', assignment_content: '', due_date: '', homework_assignment_id: null }],
    reflection: plan.reflection ? {
      objectives_achieved_flag: plan.reflection.objectives_achieved_flag ?? null,
      objectives_achieved: plan.reflection.objectives_achieved || '',
      what_went_well: plan.reflection.what_went_well || '',
      challenges: plan.reflection.challenges || '',
      learners_needing_support: plan.reflection.learners_needing_support || '',
      areas_for_improvement: plan.reflection.areas_for_improvement || '',
      recommendations: plan.reflection.recommendations || ''
    } : emptyReflection(),
    updated_at: plan.updated_at,
    school_name: plan.school_name,
    teacher_first_name: plan.teacher_first_name,
    teacher_surname: plan.teacher_surname
  };
}

export function payloadFromDraft(draft: LessonDraft, saveAs: LessonStatus) {
  return {
    ...draft,
    save_as: saveAs,
    expected_updated_at: draft.updated_at || null,
    objectives: draft.objectives.filter((item) => item.objective.trim()),
    materials: draft.materials.filter((item) => item.material_name.trim()),
    methods: draft.methods.filter((item) => item.method_name.trim()),
    references: draft.references.filter((item) => item.reference_title.trim()),
    stages: draft.stages.filter((item) => item.stage_name.trim()),
    evaluations: draft.evaluations.filter((item) => item.question.trim()),
    assignments: draft.assignments.filter((item) => item.title.trim() || item.assignment_content.trim() || item.homework_assignment_id),
    reflection: draft.reflection
  };
}

export function stageMinutes(stages: StageItem[]) {
  return stages.reduce((sum, stage) => sum + (Number(stage.duration_minutes) || 0), 0);
}

export function moveItem<T>(items: T[], index: number, direction: -1 | 1) {
  const next = index + direction;
  if (next < 0 || next >= items.length) return items;
  const copy = items.slice();
  const [item] = copy.splice(index, 1);
  copy.splice(next, 0, item);
  return copy;
}

export function teacherLabel(teacher?: { full_name?: string; surname?: string } | null) {
  return [teacher?.full_name, teacher?.surname].filter(Boolean).join(' ').trim();
}

export function allocationKey(item: { subject_name?: string; grade?: number | string; class_name?: string | null; class_id?: number | null }) {
  return `${item.subject_name || ''}|${item.grade || ''}|${item.class_id || ''}|${item.class_name || ''}`;
}
