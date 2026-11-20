import {
  ADMIN_DIRECTORY_CATEGORIES,
  ADMIN_DIRECTORY_MODULES,
  visibleDirectoryModules,
} from '../../pages/admin/adminDirectoryModel';
import { LEARNER_MODULES, TEACHER_MODULES, moduleAllowed, parentModuleAllowed } from '../../utils/schoolModules';

export interface SidebarLink {
  id: string;
  label: string;
}

export interface SidebarGroup {
  id: string;
  label: string;
  items: SidebarLink[];
}

const TEACHER_GROUPS: Array<{ id: string; label: string; ids: string[] }> = [
  { id: 'assessments', label: 'Grading & Exams', ids: ['assessments', 'assignments', 'exam-seating', 'early-warning'] },
  { id: 'classroom', label: 'Classroom', ids: ['subjects', 'parent', 'attendance', 'conduct', 'textbooks', 'messages'] },
  { id: 'duties', label: 'Admin & Duties', ids: ['my-leave', 'sports', 'ptc'] },
  { id: 'curriculum', label: 'Curriculum & AI', ids: ['lesson-planning', 'ai-tools', 'resources', 'inter-school', 'discover'] },
  { id: 'system', label: 'School System', ids: ['timetable', 'calendar', 'announcements'] },
];

const LEARNER_GROUPS: Array<{ id: string; label: string; ids: string[] }> = [
  { id: 'academics', label: 'Academics & Marks', ids: ['subjects', 'performance', 'reports', 'assignments', 'exam-seating'] },
  { id: 'study-ai', label: 'Study Tools & AI', ids: ['geleza-quiz', 'ai-tutor', 'career-advisor', 'arcade', 'textbooks', 'discover'] },
  { id: 'activities', label: 'Campus Life', ids: ['sports', 'inter-school', 'timetable', 'calendar'] },
  { id: 'finance', label: 'Finance & Bursaries', ids: ['bursaries', 'finance'] },
  { id: 'chat', label: 'Communications', ids: ['messages', 'announcements'] },
];

const PARENT_GROUPS: Array<{ id: string; label: string; ids: string[] }> = [
  { id: 'children', label: 'Children & Academics', ids: ['children', 'reports', 'timetable', 'attendance'] },
  { id: 'finance', label: 'Fees & Bursaries', ids: ['finance', 'bursaries'] },
  { id: 'campus', label: 'School & Activities', ids: ['ptc', 'calendar', 'sports', 'inter-school'] },
  { id: 'chat', label: 'Communications', ids: ['announcements', 'messages'] },
];

const TEACHER_LABELS = new Map<string, string>([
  ['subjects', 'My Subjects & CAPS Workload'],
  ['parent', 'My Children & Academic Performance'],
  ['lesson-planning', 'Lesson Planning & Notes'],
  ...TEACHER_MODULES.map((module) => [module.id, module.label] as const),
]);

const LEARNER_LABELS = new Map<string, string>([
  ['subjects', 'My Enrolled Subjects'],
  ...LEARNER_MODULES.map((module) => [module.id, module.label] as const),
]);

const PARENT_LABELS = new Map<string, string>([
  ['children', 'My Children & Marks'],
  ['reports', 'CAPS Report Cards'],
  ['timetable', 'Student Timetable'],
  ['attendance', 'Attendance Records'],
  ['finance', 'School Fees & Statements'],
  ['bursaries', 'NSFAS & Bursary Hub'],
  ['ptc', 'Parent-Teacher Consultations'],
  ['calendar', 'School Calendar'],
  ['sports', 'Sports & Extracurriculars'],
  ['inter-school', 'Inter-School Competitions'],
  ['announcements', 'School News & Bulletins'],
  ['messages', 'Message Hub & Teacher Chat'],
]);

function grouped(
  spec: Array<{ id: string; label: string; ids: string[] }>,
  labels: Map<string, string>,
  allowed: (id: string) => boolean
): SidebarGroup[] {
  return spec
    .map((group) => ({
      id: group.id,
      label: group.label,
      items: group.ids
        .filter(allowed)
        .map((id) => ({ id, label: labels.get(id) || id })),
    }))
    .filter((group) => group.items.length > 0);
}

export function sidebarGroupsForRole(
  role: string,
  isPlatformAdmin: boolean,
  teacherModules: unknown,
  learnerModules: unknown
): SidebarGroup[] {
  const name = String(role || '').toLowerCase();
  if (name === 'teacher' || name === 'class_teacher') {
    return grouped(TEACHER_GROUPS, TEACHER_LABELS, (id) => moduleAllowed('teacher', id, teacherModules));
  }
  if (name === 'learner') {
    return grouped(LEARNER_GROUPS, LEARNER_LABELS, (id) => moduleAllowed('learner', id, learnerModules, teacherModules));
  }
  if (name === 'parent') {
    return grouped(PARENT_GROUPS, PARENT_LABELS, (id) => parentModuleAllowed(id, learnerModules, teacherModules));
  }
  const modules = visibleDirectoryModules(isPlatformAdmin);
  return ADMIN_DIRECTORY_CATEGORIES
    .map((category) => ({
      id: category.id,
      label: category.label,
      items: modules
        .filter((module) => module.categoryId === category.id && module.id !== 'settings')
        .map((module) => ({ id: module.id, label: module.title })),
    }))
    .filter((group) => group.items.length > 0);
}

export const DIRECTORY_MODULES = ADMIN_DIRECTORY_MODULES;
