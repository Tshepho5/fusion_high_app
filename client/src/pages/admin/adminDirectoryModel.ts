/**
 * Administrative module directory.
 * Titles and route ids match the existing admin tabs. Categories only
 * organise those modules; they do not add routes or grant access.
 */

export const ADMIN_FAVORITES_STORAGE_KEY = 'geleza_favorites_admin';
export const ADMIN_RECENT_STORAGE_KEY = 'geleza_recent_admin';
export const ADMIN_RECENT_EVENT = 'geleza_recent_admin_updated';
export const ADMIN_FAVORITES_EVENT = 'geleza_favorites_updated';
export const RECENT_LIMIT = 4;

export const PLATFORM_ONLY_MODULE_IDS = ['school-admissions', 'testers', 'command-center'] as const;

export interface DirectoryCategory {
  id: string;
  label: string;
  icon: 'shield' | 'book' | 'trending' | 'briefcase' | 'messages' | 'trophy' | 'settings';
}

export interface DirectoryModule {
  id: string;
  title: string;
  categoryId: string;
  badge?: string;
  icon:
    | 'building'
    | 'shield'
    | 'users'
    | 'life-buoy'
    | 'book'
    | 'briefcase'
    | 'trophy'
    | 'spreadsheet'
    | 'file'
    | 'trending'
    | 'award'
    | 'clock'
    | 'calendar'
    | 'drive'
    | 'card'
    | 'messages'
    | 'megaphone'
    | 'swords'
    | 'graduation'
    | 'settings';
}

export const ADMIN_DIRECTORY_CATEGORIES: DirectoryCategory[] = [
  { id: 'governance-access', label: 'Governance & Access', icon: 'shield' },
  { id: 'academic-curriculum', label: 'Academic & Curriculum', icon: 'book' },
  { id: 'assessment-performance', label: 'Assessment & Performance', icon: 'trending' },
  { id: 'operations-resources', label: 'Operations & Resources', icon: 'briefcase' },
  { id: 'communication-engagement', label: 'Communication & Engagement', icon: 'messages' },
  { id: 'enrichment-partnerships', label: 'Enrichment & Partnerships', icon: 'trophy' },
  { id: 'system-administration', label: 'System Administration', icon: 'settings' },
];

export const ADMIN_DIRECTORY_MODULES: DirectoryModule[] = [
  { id: 'school-admissions', title: 'School Admissions & Registrations', categoryId: 'governance-access', icon: 'building', badge: 'Admissions' },
  { id: 'testers', title: 'Master Controls & Testers', categoryId: 'governance-access', icon: 'shield', badge: 'Access Gates' },
  { id: 'users', title: 'User Directory & Roles', categoryId: 'governance-access', icon: 'users', badge: 'Staff & Learners' },
  { id: 'command-center', title: 'Multi-School Command', categoryId: 'governance-access', icon: 'building', badge: 'Multi-Campus' },
  { id: 'support-desk', title: 'User Support Desk', categoryId: 'governance-access', icon: 'life-buoy', badge: 'Corrections' },

  { id: 'academic-streams', title: 'Subject Streams', categoryId: 'academic-curriculum', icon: 'book', badge: 'Grades 10-12' },
  { id: 'subjects', title: 'School Curriculum & Subjects', categoryId: 'academic-curriculum', icon: 'book', badge: 'Grades 8-12' },
  { id: 'lesson-planning', title: 'Lesson Planning Oversight', categoryId: 'academic-curriculum', icon: 'book', badge: 'Teachers' },
  { id: 'classes-streams', title: 'Dynamic Classes & Homerooms', categoryId: 'academic-curriculum', icon: 'users', badge: 'Class Teachers' },
  { id: 'staff-invites', title: 'Faculty & Coach Invites', categoryId: 'academic-curriculum', icon: 'briefcase', badge: 'Email Dispatch' },

  { id: 'metrics', title: 'School Performance Metrics', categoryId: 'assessment-performance', icon: 'trophy', badge: 'Official KPIs' },
  { id: 'marks', title: 'CAPS Mark Audits & Report Cards', categoryId: 'assessment-performance', icon: 'spreadsheet', badge: 'Mark Audits' },
  { id: 'reports', title: 'CAPS Report Card Studio', categoryId: 'assessment-performance', icon: 'file', badge: 'Term Reports' },
  { id: 'matric-projector', title: 'Matric Pass Rate Projector', categoryId: 'assessment-performance', icon: 'trending', badge: 'Grade 12 NSC' },
  { id: 'exam-seating', title: 'Exam Seating Master', categoryId: 'assessment-performance', icon: 'award', badge: 'Seating Plan' },

  { id: 'timetable', title: 'Timetable Allocations', categoryId: 'operations-resources', icon: 'clock', badge: 'Schedule' },
  { id: 'calendar', title: 'School Calendar', categoryId: 'operations-resources', icon: 'calendar', badge: 'DBE Schedule' },
  { id: 'leave-relief', title: 'Staff Leave & Relief Duty', categoryId: 'operations-resources', icon: 'briefcase', badge: 'Staff Leave' },
  { id: 'textbooks', title: 'Textbook Inventory', categoryId: 'operations-resources', icon: 'drive', badge: 'Assets' },
  { id: 'finance', title: 'School Fees & Invoicing', categoryId: 'operations-resources', icon: 'card', badge: 'Finances' },

  { id: 'messages', title: 'Communication Hub', categoryId: 'communication-engagement', icon: 'messages', badge: 'Direct Chat' },
  { id: 'announcements', title: 'Official Broadcasts', categoryId: 'communication-engagement', icon: 'megaphone', badge: 'Broadcasts' },
  { id: 'consultations', title: 'Parent-Educator Consultations', categoryId: 'communication-engagement', icon: 'users', badge: 'Meetings' },

  { id: 'inter-school', title: 'Inter-School Derbies & League', categoryId: 'enrichment-partnerships', icon: 'swords', badge: 'Competitions' },
  { id: 'sports', title: 'Sports & Extracurriculars', categoryId: 'enrichment-partnerships', icon: 'trophy', badge: 'Athletics & Teams' },
  { id: 'bursaries', title: 'Tertiary Bursary Engine', categoryId: 'enrichment-partnerships', icon: 'graduation', badge: 'Bursaries' },
  { id: 'import-learners', title: 'Import Learners (SA-SAMS CSV)', categoryId: 'enrichment-partnerships', icon: 'spreadsheet', badge: 'New · CSV' },

  { id: 'settings', title: 'Technical Settings', categoryId: 'system-administration', icon: 'settings', badge: 'System' },
];

const MODULE_IDS = new Set(ADMIN_DIRECTORY_MODULES.map((module) => module.id));

export function isDirectoryModule(id: string): boolean {
  return MODULE_IDS.has(id);
}

export function categoryLabel(categoryId: string): string {
  return ADMIN_DIRECTORY_CATEGORIES.find((category) => category.id === categoryId)?.label ?? '';
}

export function visibleDirectoryModules(isSuperAdmin: boolean): DirectoryModule[] {
  if (isSuperAdmin) return ADMIN_DIRECTORY_MODULES;
  const hidden = new Set<string>(PLATFORM_ONLY_MODULE_IDS);
  return ADMIN_DIRECTORY_MODULES.filter((module) => !hidden.has(module.id));
}

export function directoryMatches(module: Pick<DirectoryModule, 'title' | 'badge' | 'categoryId'>, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    module.title.toLowerCase().includes(needle) ||
    categoryLabel(module.categoryId).toLowerCase().includes(needle) ||
    (module.badge ? module.badge.toLowerCase().includes(needle) : false)
  );
}

export function filterDirectory(modules: DirectoryModule[], query: string): DirectoryModule[] {
  return modules.filter((module) => directoryMatches(module, query));
}

export function modulesInCategory(modules: DirectoryModule[], categoryId: string): DirectoryModule[] {
  return modules.filter((module) => module.categoryId === categoryId);
}

export function readIdList(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string' && item.length > 0);
  } catch {
    return [];
  }
}

export function toggleStoredId(ids: readonly string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
}

export function rememberRecentIds(current: readonly string[], id: string, limit = RECENT_LIMIT): string[] {
  if (!isDirectoryModule(id)) return [...current];
  return [id, ...current.filter((item) => item !== id)].slice(0, limit);
}

export function resolveListedModules(ids: readonly string[], modules: DirectoryModule[]): DirectoryModule[] {
  const byId = new Map(modules.map((module) => [module.id, module]));
  const seen = new Set<string>();
  const resolved: DirectoryModule[] = [];
  ids.forEach((id) => {
    if (seen.has(id)) return;
    const module = byId.get(id);
    if (!module) return;
    seen.add(id);
    resolved.push(module);
  });
  return resolved;
}

interface ListStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function rememberAdminDirectoryVisit(
  id: string,
  storage: ListStorage | null = typeof localStorage === 'undefined' ? null : localStorage
): string[] {
  if (!storage || !isDirectoryModule(id)) return readIdList(storage ? storage.getItem(ADMIN_RECENT_STORAGE_KEY) : null);
  const next = rememberRecentIds(readIdList(storage.getItem(ADMIN_RECENT_STORAGE_KEY)), id);
  storage.setItem(ADMIN_RECENT_STORAGE_KEY, JSON.stringify(next));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ADMIN_RECENT_EVENT));
  }
  return next;
}
