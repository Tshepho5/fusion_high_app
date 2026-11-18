const db = require('../../../db/db');

const TEACHER_MODULES = [
  'assessments', 'assignments', 'exam-seating', 'early-warning', 'attendance', 'conduct',
  'textbooks', 'my-leave', 'sports', 'ptc', 'ai-tools', 'resources', 'inter-school',
  'discover', 'timetable', 'calendar', 'announcements', 'messages'
];

const LEARNER_MODULES = [
  'performance', 'reports', 'assignments', 'exam-seating', 'discover', 'ai-tutor',
  'career-advisor', 'arcade', 'textbooks', 'sports', 'inter-school', 'timetable',
  'calendar', 'messages', 'announcements', 'bursaries', 'finance'
];

const LEARNER_FOLLOWS_TEACHER = {
  assessments: ['performance', 'reports'],
  assignments: ['assignments'],
  'exam-seating': ['exam-seating'],
  textbooks: ['textbooks'],
  sports: ['sports'],
  'inter-school': ['inter-school'],
  timetable: ['timetable'],
  calendar: ['calendar'],
  announcements: ['announcements'],
  messages: ['messages']
};

const LEARNER_CHOICE_IDS = ['discover', 'ai-tutor', 'career-advisor', 'arcade', 'bursaries', 'finance'];

let columnsReady = false;

async function ensureSchoolModuleColumns() {
  if (columnsReady) return;
  try {
    await db.query('ALTER TABLE schools ADD COLUMN IF NOT EXISTS teacher_modules JSONB');
    await db.query('ALTER TABLE schools ADD COLUMN IF NOT EXISTS learner_modules JSONB');
    await db.query('ALTER TABLE school_applications ADD COLUMN IF NOT EXISTS teacher_modules JSONB');
    await db.query('ALTER TABLE school_applications ADD COLUMN IF NOT EXISTS learner_modules JSONB');
    columnsReady = true;
  } catch (err) {
    console.warn('[SCHOOL MODULES] ensureSchoolModuleColumns warning:', err.message);
  }
}

function cleanModuleList(value, allowed) {
  const source = Array.isArray(value) ? value : allowed;
  const chosen = new Set(source.map((item) => String(item)));
  return allowed.filter((id) => chosen.has(id));
}

function linkSchoolModules(teacherValue, learnerValue) {
  const teacher = cleanModuleList(teacherValue, TEACHER_MODULES);
  const requestedLearner = cleanModuleList(learnerValue, LEARNER_MODULES);
  const received = new Set();
  for (const teacherId of teacher) {
    for (const learnerId of LEARNER_FOLLOWS_TEACHER[teacherId] || []) received.add(learnerId);
  }
  const learner = LEARNER_MODULES.filter((id) => {
    if (received.has(id)) return true;
    return LEARNER_CHOICE_IDS.includes(id) && requestedLearner.includes(id);
  });
  return { teacher, learner };
}

module.exports = {
  TEACHER_MODULES,
  LEARNER_MODULES,
  ensureSchoolModuleColumns,
  cleanModuleList,
  linkSchoolModules
};
