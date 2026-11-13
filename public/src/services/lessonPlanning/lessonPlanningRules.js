/**
 * Pure lesson-planning rules. No database and no sample school records.
 */

const STATUSES = ['draft', 'scheduled', 'completed'];
const QUESTION_TYPES = ['short_answer', 'multiple_choice', 'practical', 'oral', 'written'];
const REFERENCE_TYPES = ['textbook', 'curriculum', 'teacher_guide', 'resource', 'other'];
const NOTE_STATUSES = ['draft', 'saved'];
const AI_ACTIONS = [
  'objectives',
  'improve_objectives',
  'previous_knowledge',
  'materials',
  'methods',
  'stages',
  'evaluation',
  'assignment',
  'lesson_notes',
  'gaps'
];

const LIMITS = {
  topic: 500,
  subTopic: 500,
  text: 8000,
  objective: 2000,
  name: 255,
  method: 150,
  stage: 150,
  title: 255,
  items: 40
};

function cleanText(value, max) {
  if (value == null) return '';
  const text = String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, max);
}

function cleanMultiline(value, max) {
  if (value == null) return '';
  const text = String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/\r\n/g, '\n')
    .trim();
  return text.slice(0, max);
}

function cleanInt(value) {
  if (value === '' || value == null) return null;
  const n = parseInt(value, 10);
  return Number.isInteger(n) ? n : null;
}

function normalise(value) {
  return cleanText(value, 200).toLowerCase();
}

function currentAcademicYear(date = new Date()) {
  return date.getFullYear();
}

function suggestedTerm(date = new Date()) {
  const month = date.getMonth() + 1;
  if (month <= 3) return 1;
  if (month <= 6) return 2;
  if (month <= 9) return 3;
  return 4;
}

function sumStageMinutes(stages) {
  return (Array.isArray(stages) ? stages : []).reduce((total, stage) => {
    const minutes = cleanInt(stage && stage.duration_minutes);
    return total + (minutes && minutes > 0 ? minutes : 0);
  }, 0);
}

function timeWarning(durationMinutes, stages) {
  const allocated = sumStageMinutes(stages);
  const duration = cleanInt(durationMinutes);
  if (!duration || duration <= 0 || allocated === 0) {
    return { allocated, duration: duration || 0, exceeds: false };
  }
  return { allocated, duration, exceeds: allocated > duration };
}

function allocationMatches(allocations, input) {
  const subject = normalise(input.subject_name);
  const grade = cleanInt(input.grade);
  const className = normalise(input.class_name);
  const classId = cleanInt(input.class_id);
  if (!subject || !grade) return false;
  return (allocations || []).some((row) => {
    if (normalise(row.subject_name) !== subject) return false;
    if (cleanInt(row.grade) !== grade) return false;
    const rowClass = normalise(row.class_name);
    const rowId = cleanInt(row.class_id);
    if (!rowClass && !rowId) return true;
    if (classId && rowId && classId === rowId) return true;
    if (className && rowClass && className === rowClass) return true;
    return false;
  });
}

function canReadPlan(actor, plan) {
  if (!actor || !plan) return false;
  if (!actor.schoolId || Number(plan.school_id) !== Number(actor.schoolId)) return false;
  if (actor.isSuperadmin || actor.role === 'admin') return true;
  return Number(plan.teacher_id) === Number(actor.userId);
}

function canWritePlan(actor, plan) {
  if (!canReadPlan(actor, plan)) return false;
  return Number(plan.teacher_id) === Number(actor.userId);
}

function listScope(actor) {
  if (!actor || !actor.schoolId) return null;
  if (actor.isSuperadmin || actor.role === 'admin') {
    return { schoolId: Number(actor.schoolId), teacherId: null };
  }
  return { schoolId: Number(actor.schoolId), teacherId: Number(actor.userId) };
}

function asArray(value) {
  if (Array.isArray(value)) return value.slice(0, LIMITS.items);
  return [];
}

function normalisePlanInput(body) {
  const source = body && typeof body === 'object' ? body : {};
  const saveAs = STATUSES.includes(source.save_as) ? source.save_as : null;
  const objectives = asArray(source.objectives).map((item) => ({
    objective: cleanMultiline(item && (item.objective || item), LIMITS.objective)
  })).filter((item) => item.objective);

  const materials = asArray(source.materials).map((item) => ({
    id: cleanInt(item && item.id),
    material_name: cleanText(item && item.material_name, LIMITS.name),
    description: cleanMultiline(item && item.description, LIMITS.text),
    attachment_original_name: item && item.attachment_original_name ? cleanText(item.attachment_original_name, 255) : null,
    attachment_stored_name: item && item.attachment_stored_name ? cleanText(item.attachment_stored_name, 255) : null
  })).filter((item) => item.material_name);

  const methods = asArray(source.methods).map((item) => ({
    method_name: cleanText(item && (item.method_name || item), LIMITS.method)
  })).filter((item) => item.method_name);

  const references = asArray(source.references).map((item) => {
    const type = cleanText(item && item.reference_type, 80).toLowerCase();
    return {
      reference_title: cleanText(item && item.reference_title, LIMITS.name),
      author: cleanText(item && item.author, LIMITS.name),
      reference_type: REFERENCE_TYPES.includes(type) ? type : (type ? 'other' : 'other')
    };
  }).filter((item) => item.reference_title);

  const stages = asArray(source.stages).map((item) => ({
    stage_name: cleanText(item && item.stage_name, LIMITS.stage),
    duration_minutes: (() => {
      const minutes = cleanInt(item && item.duration_minutes);
      return minutes && minutes > 0 ? minutes : null;
    })(),
    teacher_activities: cleanMultiline(item && item.teacher_activities, LIMITS.text),
    learner_activities: cleanMultiline(item && item.learner_activities, LIMITS.text)
  })).filter((item) => item.stage_name);

  const evaluations = asArray(source.evaluations).map((item) => {
    const type = cleanText(item && item.question_type, 40).toLowerCase();
    return {
      question: cleanMultiline(item && item.question, LIMITS.text),
      question_type: QUESTION_TYPES.includes(type) ? type : 'short_answer'
    };
  }).filter((item) => item.question);

  const assignments = asArray(source.assignments).map((item) => ({
    title: cleanText(item && item.title, LIMITS.title),
    assignment_content: cleanMultiline(item && item.assignment_content, LIMITS.text),
    due_date: cleanDate(item && item.due_date),
    homework_assignment_id: cleanInt(item && (item.homework_assignment_id || item.existing_assignment_id))
  })).filter((item) => item.title || item.assignment_content || item.homework_assignment_id);

  const reflectionSource = source.reflection && typeof source.reflection === 'object' ? source.reflection : {};
  const reflection = {
    objectives_achieved_flag: reflectionSource.objectives_achieved_flag === true
      ? true
      : reflectionSource.objectives_achieved_flag === false
        ? false
        : null,
    objectives_achieved: cleanMultiline(reflectionSource.objectives_achieved, LIMITS.text),
    what_went_well: cleanMultiline(reflectionSource.what_went_well, LIMITS.text),
    challenges: cleanMultiline(reflectionSource.challenges, LIMITS.text),
    learners_needing_support: cleanMultiline(reflectionSource.learners_needing_support, LIMITS.text),
    areas_for_improvement: cleanMultiline(reflectionSource.areas_for_improvement, LIMITS.text),
    recommendations: cleanMultiline(reflectionSource.recommendations, LIMITS.text)
  };
  const hasReflection = Object.entries(reflection).some(([key, value]) => key !== 'objectives_achieved_flag' && value);

  return {
    subject_name: cleanText(source.subject_name, 150),
    subject_id: cleanInt(source.subject_id),
    class_id: cleanInt(source.class_id),
    class_name: cleanText(source.class_name, 100),
    grade: cleanInt(source.grade),
    academic_year: cleanInt(source.academic_year),
    term: cleanInt(source.term),
    scheduled_date: cleanDate(source.scheduled_date),
    scheduled_time: cleanTime(source.scheduled_time),
    duration_minutes: cleanInt(source.duration_minutes),
    topic: cleanText(source.topic, LIMITS.topic),
    sub_topic: cleanText(source.sub_topic, LIMITS.subTopic),
    previous_knowledge: cleanMultiline(source.previous_knowledge, LIMITS.text),
    save_as: saveAs,
    expected_updated_at: source.expected_updated_at ? String(source.expected_updated_at) : null,
    timetable_id: cleanInt(source.timetable_id),
    timetable_class: cleanText(source.timetable_class, 100),
    timetable_day: cleanText(source.timetable_day, 20),
    timetable_period: cleanText(source.timetable_period, 50),
    objectives,
    materials,
    methods,
    references,
    stages,
    evaluations,
    assignments,
    reflection: hasReflection || reflection.objectives_achieved_flag !== null ? reflection : null
  };
}

function cleanDate(value) {
  if (!value) return null;
  const text = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function cleanTime(value) {
  if (!value) return null;
  const text = String(value).slice(0, 5);
  return /^\d{2}:\d{2}$/.test(text) ? text : null;
}

function resolveStatus(input, existingStatus) {
  if (input.save_as === 'completed') return 'completed';
  if (input.save_as === 'draft') return 'draft';
  if (input.save_as === 'scheduled') return 'scheduled';
  if (existingStatus && STATUSES.includes(existingStatus)) return existingStatus;
  return input.scheduled_date ? 'scheduled' : 'draft';
}

function validatePlanInput(input, { forComplete = false } = {}) {
  const errors = [];
  if (!input.subject_name) errors.push('Subject is required.');
  if (!input.grade || input.grade < 1 || input.grade > 12) errors.push('Grade is required.');
  if (!input.class_name && !input.class_id) errors.push('Class is required.');
  if (!input.academic_year || input.academic_year < 2000 || input.academic_year > 2100) errors.push('Academic year is required.');
  if (!input.term || input.term < 1 || input.term > 4) errors.push('Academic term must be 1 to 4.');
  if (input.duration_minutes != null && (input.duration_minutes < 1 || input.duration_minutes > 300)) {
    errors.push('Lesson duration must be between 1 and 300 minutes.');
  }
  if (forComplete && !input.topic) errors.push('A topic is required before a lesson can be marked completed.');
  return errors;
}

function preparationGaps(plan) {
  const gaps = [];
  const objectives = plan.objectives || [];
  const evaluations = plan.evaluations || [];
  const stages = plan.stages || [];
  if (!plan.topic) gaps.push('Topic has not been entered.');
  if (!objectives.length) gaps.push('No instructional objectives have been added.');
  if (!evaluations.length) gaps.push('No evaluation questions have been added.');
  const timing = timeWarning(plan.duration_minutes, stages);
  if (timing.exceeds) {
    gaps.push(`Presentation time (${timing.allocated} min) is longer than the lesson duration (${timing.duration} min).`);
  }
  if (plan.status === 'completed') {
    const reflection = plan.reflection;
    const written = reflection && (
      reflection.what_went_well || reflection.challenges || reflection.recommendations || reflection.objectives_achieved
    );
    if (!written) gaps.push('This completed lesson does not have a teacher reflection yet.');
  }
  return gaps;
}

function buildTemplateContent(plan) {
  return {
    duration_minutes: cleanInt(plan.duration_minutes),
    previous_knowledge: plan.previous_knowledge || '',
    objectives: (plan.objectives || []).map((item) => ({ objective: item.objective })),
    materials: (plan.materials || []).map((item) => ({
      material_name: item.material_name,
      description: item.description || ''
    })),
    methods: (plan.methods || []).map((item) => ({ method_name: item.method_name })),
    references: (plan.references || []).map((item) => ({
      reference_title: item.reference_title,
      author: item.author || '',
      reference_type: item.reference_type || 'other'
    })),
    stages: (plan.stages || []).map((item) => ({
      stage_name: item.stage_name,
      duration_minutes: item.duration_minutes,
      teacher_activities: item.teacher_activities || '',
      learner_activities: item.learner_activities || ''
    })),
    evaluations: (plan.evaluations || []).map((item) => ({
      question: item.question,
      question_type: item.question_type || 'short_answer'
    })),
    assignments: (plan.assignments || []).map((item) => ({
      title: item.title || '',
      assignment_content: item.assignment_content || ''
    }))
  };
}

function templateHasIdentity(content) {
  const blocked = ['school_name', 'teacher_name', 'teacher_id', 'school_id', 'teacher_first_name', 'teacher_surname'];
  return Object.keys(content || {}).some((key) => blocked.includes(String(key).toLowerCase()));
}

function applyTemplateContent(content, identity) {
  const base = content && typeof content === 'object' ? content : {};
  return normalisePlanInput({
    ...base,
    subject_name: identity.subject_name,
    subject_id: identity.subject_id,
    class_id: identity.class_id,
    class_name: identity.class_name,
    grade: identity.grade,
    academic_year: identity.academic_year,
    term: identity.term,
    scheduled_date: identity.scheduled_date,
    duration_minutes: identity.duration_minutes || base.duration_minutes,
    topic: identity.topic,
    sub_topic: identity.sub_topic,
    save_as: 'draft',
    timetable_id: null
  });
}

function buildAiRequest(action, input) {
  if (!AI_ACTIONS.includes(action)) {
    return { ok: false, warnings: ['That assistant action is not available.'] };
  }
  const subject = cleanText(input.subject_name, 150);
  const topic = cleanText(input.topic, 500);
  const grade = cleanInt(input.grade);
  const warnings = [];
  if (!subject) warnings.push('Choose a subject before asking for assistance.');
  if (!topic) warnings.push('Enter a topic before asking for assistance.');
  if (!grade) warnings.push('Choose a grade before asking for assistance.');
  if ((action === 'improve_objectives' || action === 'evaluation' || action === 'gaps') && !(input.objectives || []).length && action !== 'evaluation') {
    if (action === 'improve_objectives') warnings.push('Add at least one objective to improve.');
  }
  if (warnings.length) return { ok: false, warnings };

  const facts = {
    subject,
    grade,
    class_name: cleanText(input.class_name, 100),
    topic,
    sub_topic: cleanText(input.sub_topic, 500),
    duration_minutes: cleanInt(input.duration_minutes),
    objectives: (input.objectives || []).map((item) => cleanMultiline(item.objective || item, 500)).filter(Boolean).slice(0, 12),
    previous_knowledge: cleanMultiline(input.previous_knowledge, 1500),
    materials: (input.materials || []).map((item) => cleanText(item.material_name || item, 120)).filter(Boolean).slice(0, 12),
    methods: (input.methods || []).map((item) => cleanText(item.method_name || item, 120)).filter(Boolean).slice(0, 12)
  };

  const shapes = {
    objectives: '{"objectives":["measurable objective"],"warnings":[]}',
    improve_objectives: '{"objectives":["clearer measurable objective"],"warnings":[]}',
    previous_knowledge: '{"previous_knowledge":"connection to prior learning","warnings":[]}',
    materials: '{"materials":[{"material_name":"","description":""}],"warnings":[]}',
    methods: '{"methods":["method"],"warnings":[]}',
    stages: '{"stages":[{"stage_name":"","duration_minutes":5,"teacher_activities":"","learner_activities":""}],"warnings":[]}',
    evaluation: '{"evaluations":[{"question":"","question_type":"short_answer"}],"warnings":[]}',
    assignment: '{"assignment":{"title":"","assignment_content":""},"warnings":[]}',
    lesson_notes: '{"introduction":"","sections":[{"heading":"","body":""}],"summary":"","warnings":[]}',
    gaps: '{"gaps":["specific missing preparation"],"warnings":[]}'
  };

  const prompt = [
    `Action: ${action}`,
    'Write content only for the lesson facts below. Change the wording when the topic, subject, or grade changes.',
    'Do not claim official curriculum compliance. Do not invent policy document titles or page numbers.',
    'If the facts are too thin for a useful suggestion, return a warning instead of generic filler.',
    `Return JSON in this shape: ${shapes[action]}`,
    `Lesson facts: ${JSON.stringify(facts)}`
  ].join('\n');

  return { ok: true, warnings: [], prompt, facts };
}

function parseAiJson(text) {
  if (!text) return null;
  const fenced = String(text).replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = fenced.indexOf('{');
  const end = fenced.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(fenced.slice(start, end + 1));
  } catch (_) {
    return null;
  }
}

function paginate(page, limit) {
  const p = Math.max(1, cleanInt(page) || 1);
  const l = Math.min(50, Math.max(1, cleanInt(limit) || 20));
  return { page: p, limit: l, offset: (p - 1) * l };
}

function likeTerm(value) {
  const cleaned = cleanText(value, 80).replace(/[%_]/g, '');
  return cleaned ? `%${cleaned}%` : null;
}

module.exports = {
  STATUSES,
  QUESTION_TYPES,
  NOTE_STATUSES,
  AI_ACTIONS,
  cleanText,
  cleanMultiline,
  cleanInt,
  cleanDate,
  currentAcademicYear,
  suggestedTerm,
  sumStageMinutes,
  timeWarning,
  allocationMatches,
  canReadPlan,
  canWritePlan,
  listScope,
  normalisePlanInput,
  resolveStatus,
  validatePlanInput,
  preparationGaps,
  buildTemplateContent,
  templateHasIdentity,
  applyTemplateContent,
  buildAiRequest,
  parseAiJson,
  paginate,
  likeTerm
};
