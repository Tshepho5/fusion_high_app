export interface SchoolModuleOption {
  id: string;
  label: string;
}

export const TEACHER_MODULES: SchoolModuleOption[] = [
  { id: 'assessments', label: 'SBA marksheets' },
  { id: 'assignments', label: 'Mark homework' },
  { id: 'exam-seating', label: 'Plan exam seating' },
  { id: 'early-warning', label: 'Early-warning radar' },
  { id: 'attendance', label: 'Take attendance' },
  { id: 'conduct', label: 'Merits and conduct' },
  { id: 'textbooks', label: 'Issue textbooks' },
  { id: 'my-leave', label: 'Leave and relief' },
  { id: 'sports', label: 'Coach sports and clubs' },
  { id: 'ptc', label: 'Parent meetings' },
  { id: 'ai-tools', label: 'AI lesson studio' },
  { id: 'resources', label: 'Past papers vault' },
  { id: 'inter-school', label: 'Run inter-school events' },
  { id: 'discover', label: 'Discover studios' },
  { id: 'timetable', label: 'Teaching timetable' },
  { id: 'calendar', label: 'School calendar' },
  { id: 'announcements', label: 'Staff notices' },
  { id: 'messages', label: 'Staff messages' },
];

export const LEARNER_MODULES: SchoolModuleOption[] = [
  { id: 'performance', label: 'My marks' },
  { id: 'reports', label: 'My report cards' },
  { id: 'assignments', label: 'Submit homework' },
  { id: 'exam-seating', label: 'My exam seat' },
  { id: 'discover', label: 'Discover studios' },
  { id: 'ai-tutor', label: 'AI study tutor' },
  { id: 'career-advisor', label: 'Career advisor' },
  { id: 'arcade', label: 'Study games' },
  { id: 'textbooks', label: 'My textbooks' },
  { id: 'sports', label: 'Join sports and clubs' },
  { id: 'inter-school', label: 'Inter-school events' },
  { id: 'timetable', label: 'My timetable' },
  { id: 'calendar', label: 'School calendar' },
  { id: 'messages', label: 'Messages to teachers' },
  { id: 'announcements', label: 'School notices' },
  { id: 'bursaries', label: 'Bursaries' },
  { id: 'finance', label: 'My fee statements' },
];

const ALWAYS_ON: Record<'teacher' | 'learner', string[]> = {
  teacher: ['overview', 'home', 'settings', 'profile', 'more', 'subjects', 'classes', 'workload'],
  learner: ['overview', 'home', 'settings', 'profile', 'more', 'subjects'],
};

/** Learner portal items that open because a teacher module sends something to learners. */
export const LEARNER_FOLLOWS_TEACHER: Record<string, string[]> = {
  assessments: ['performance', 'reports'],
  assignments: ['assignments'],
  'exam-seating': ['exam-seating'],
  textbooks: ['textbooks'],
  sports: ['sports'],
  'inter-school': ['inter-school'],
  timetable: ['timetable'],
  calendar: ['calendar'],
  announcements: ['announcements'],
  messages: ['messages'],
};

const LEARNER_CHOICE_IDS = ['discover', 'ai-tutor', 'career-advisor', 'arcade', 'bursaries', 'finance'];

export const LEARNER_CHOICE_MODULES = LEARNER_MODULES.filter((module) => LEARNER_CHOICE_IDS.includes(module.id));

const FOLLOWED_SOURCES = new Map<string, string[]>();
for (const [teacherId, learnerIds] of Object.entries(LEARNER_FOLLOWS_TEACHER)) {
  for (const learnerId of learnerIds) {
    const sources = FOLLOWED_SOURCES.get(learnerId) || [];
    sources.push(teacherId);
    FOLLOWED_SOURCES.set(learnerId, sources);
  }
}

export const defaultTeacherModules = () => TEACHER_MODULES.map((module) => module.id);
export const defaultLearnerModules = () => LEARNER_MODULES.map((module) => module.id);

export function modulesReceivedByLearners(teacherIds: string[]): SchoolModuleOption[] {
  const ids = new Set<string>();
  for (const teacherId of teacherIds) {
    for (const learnerId of LEARNER_FOLLOWS_TEACHER[teacherId] || []) ids.add(learnerId);
  }
  return LEARNER_MODULES.filter((module) => ids.has(module.id));
}

export function linkSchoolModules(teacherIds: string[], learnerIds: string[]) {
  const teacher = TEACHER_MODULES.map((module) => module.id).filter((id) => teacherIds.includes(id));
  const received = new Set(modulesReceivedByLearners(teacher).map((module) => module.id));
  const choices = new Set(LEARNER_CHOICE_IDS.filter((id) => learnerIds.includes(id)));
  const learner = LEARNER_MODULES.map((module) => module.id).filter((id) => received.has(id) || choices.has(id));
  return { teacher, learner };
}

export function readModuleList(value: unknown): string[] | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : null;
    } catch {
      return null;
    }
  }
  return null;
}

export function moduleAllowed(
  role: 'teacher' | 'learner',
  moduleId: string,
  selected: unknown,
  partnerSelected?: unknown
): boolean {
  if (ALWAYS_ON[role].includes(moduleId)) return true;
  const mine = role === 'teacher' ? TEACHER_MODULES : LEARNER_MODULES;
  const other = role === 'teacher' ? LEARNER_MODULES : TEACHER_MODULES;
  const inMine = mine.some((module) => module.id === moduleId);
  const otherRoleOnly = !inMine && other.some((module) => module.id === moduleId);
  if (otherRoleOnly) return false;
  if (role === 'learner') {
    const sources = FOLLOWED_SOURCES.get(moduleId);
    if (sources) {
      const teacherChosen = readModuleList(partnerSelected);
      if (!teacherChosen) return true;
      return sources.some((teacherId) => teacherChosen.includes(teacherId));
    }
  }
  if (!inMine) return true;
  const chosen = readModuleList(selected);
  if (!chosen) return true;
  return chosen.includes(moduleId);
}
