import {
  FileSpreadsheet,
  FileCheck,
  Grid3X3,
  AlertTriangle,
  CalendarCheck,
  Award,
  BookOpen,
  Clock,
  Trophy,
  Users,
  Sparkles,
  FolderArchive,
  Swords,
  Compass,
  Calendar,
  CalendarDays,
  Megaphone,
  MessageSquare,
  TrendingUp,
  GraduationCap,
  FileText,
  Bot,
  Briefcase,
  Gamepad2,
  Coins,
  CreditCard,
  Bell,
  type LucideIcon
} from 'lucide-react';

export interface SchoolModuleOption {
  id: string;
  label: string;
  icon?: LucideIcon;
}

export const MODULE_ICONS: Record<string, LucideIcon> = {
  // Teacher modules
  assessments: FileSpreadsheet,
  assignments: FileCheck,
  'exam-seating': Grid3X3,
  'early-warning': AlertTriangle,
  attendance: CalendarCheck,
  conduct: Award,
  textbooks: BookOpen,
  'my-leave': Clock,
  sports: Trophy,
  ptc: Users,
  'ai-tools': Sparkles,
  resources: FolderArchive,
  'inter-school': Swords,
  discover: Compass,
  timetable: Calendar,
  calendar: CalendarDays,
  announcements: Megaphone,
  messages: MessageSquare,

  // Learner-specific modules
  performance: TrendingUp,
  reports: GraduationCap,
  'ai-tutor': Bot,
  'career-advisor': Briefcase,
  arcade: Gamepad2,
  bursaries: Coins,
  finance: CreditCard,
};

export function getModuleIcon(id: string): LucideIcon {
  return MODULE_ICONS[id] || (id === 'announcements' ? Bell : id === 'reports' ? GraduationCap : BookOpen);
}

export const TEACHER_MODULES: SchoolModuleOption[] = [
  { id: 'assessments', label: 'SBA marksheets', icon: FileSpreadsheet },
  { id: 'assignments', label: 'Mark homework', icon: FileCheck },
  { id: 'exam-seating', label: 'Plan exam seating', icon: Grid3X3 },
  { id: 'early-warning', label: 'Early-warning radar', icon: AlertTriangle },
  { id: 'attendance', label: 'Take attendance', icon: CalendarCheck },
  { id: 'conduct', label: 'Merits and conduct', icon: Award },
  { id: 'textbooks', label: 'Issue textbooks', icon: BookOpen },
  { id: 'my-leave', label: 'Leave and relief', icon: Clock },
  { id: 'sports', label: 'Coach sports and clubs', icon: Trophy },
  { id: 'ptc', label: 'Parent meetings', icon: Users },
  { id: 'ai-tools', label: 'AI lesson studio', icon: Sparkles },
  { id: 'resources', label: 'Past papers vault', icon: FolderArchive },
  { id: 'inter-school', label: 'Run inter-school events', icon: Swords },
  { id: 'discover', label: 'Discover studios', icon: Compass },
  { id: 'timetable', label: 'Teaching timetable', icon: Calendar },
  { id: 'calendar', label: 'School calendar', icon: CalendarDays },
  { id: 'announcements', label: 'Staff notices', icon: Megaphone },
  { id: 'messages', label: 'Staff messages', icon: MessageSquare },
];

export const LEARNER_MODULES: SchoolModuleOption[] = [
  { id: 'performance', label: 'My marks', icon: TrendingUp },
  { id: 'reports', label: 'My report cards', icon: GraduationCap },
  { id: 'assignments', label: 'Submit homework', icon: FileText },
  { id: 'exam-seating', label: 'My exam seat', icon: Grid3X3 },
  { id: 'discover', label: 'Discover studios', icon: Compass },
  { id: 'ai-tutor', label: 'AI study tutor', icon: Bot },
  { id: 'career-advisor', label: 'Career advisor', icon: Briefcase },
  { id: 'arcade', label: 'Study games', icon: Gamepad2 },
  { id: 'textbooks', label: 'My textbooks', icon: BookOpen },
  { id: 'sports', label: 'Join sports and clubs', icon: Trophy },
  { id: 'inter-school', label: 'Inter-school events', icon: Swords },
  { id: 'timetable', label: 'My timetable', icon: Calendar },
  { id: 'calendar', label: 'School calendar', icon: CalendarDays },
  { id: 'messages', label: 'Messages to teachers', icon: MessageSquare },
  { id: 'announcements', label: 'School notices', icon: Bell },
  { id: 'bursaries', label: 'Bursaries', icon: Coins },
  { id: 'finance', label: 'My fee statements', icon: CreditCard },
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

const PARENT_ALWAYS = new Set(['overview', 'home', 'children', 'profile', 'settings', 'more']);

const PARENT_FROM_LEARNER: Record<string, string> = {
  reports: 'reports',
  performance: 'performance',
  timetable: 'timetable',
  finance: 'finance',
  bursaries: 'bursaries',
  sports: 'sports',
  calendar: 'calendar',
  announcements: 'announcements',
  messages: 'messages',
  'inter-school': 'inter-school',
  assignments: 'assignments',
  textbooks: 'textbooks',
  discover: 'discover',
};

const PARENT_FROM_TEACHER: Record<string, string> = {
  attendance: 'attendance',
  ptc: 'ptc',
  conduct: 'conduct',
};

export function parentModuleAllowed(
  moduleId: string,
  learnerSelected: unknown,
  teacherSelected: unknown
): boolean {
  if (PARENT_ALWAYS.has(moduleId)) return true;
  const learnerId = PARENT_FROM_LEARNER[moduleId];
  if (learnerId) return moduleAllowed('learner', learnerId, learnerSelected, teacherSelected);
  const teacherId = PARENT_FROM_TEACHER[moduleId];
  if (teacherId) return moduleAllowed('teacher', teacherId, teacherSelected);
  return false;
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
