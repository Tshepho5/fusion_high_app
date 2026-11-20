import {
  ADMIN_DIRECTORY_MODULES,
  type DirectoryModule,
  visibleDirectoryModules,
} from './adminDirectoryModel.ts';

export const DEFAULT_SCHOOL_ADMIN_QUICK_ACCESS_IDS = [
  'reports',
  'marks',
  'timetable',
  'messages',
  'announcements',
  'users',
] as const;

export interface AdminIdentityLike {
  full_name?: string | null;
  name?: string | null;
  surname?: string | null;
  email?: string | null;
  role?: string | null;
  job_title?: string | null;
  title?: string | null;
}

export interface NormalizedSchoolAdminStats {
  totalLearners: number | null;
  totalTeachers: number | null;
  totalClasses: number | null;
  attendanceRate: number | null;
  recentAnnouncements: Array<{
    id: number | string;
    title: string;
    content: string;
    author_name: string;
    created_at: string;
  }>;
}

export interface AdminHomeNotification {
  id: number | string;
  title: string;
  message: string;
  type: string;
  target_tab?: string;
  is_read: boolean;
  created_at: string;
}

/**
 * Formats the authenticated School Admin's display name without duplicating the surname
 * when `full_name` already contains it.
 */
export function formatAdminDisplayName(user?: AdminIdentityLike | null): string {
  const base = String(user?.full_name || user?.name || '').trim();
  const surname = String(user?.surname || '').trim();

  if (!base && !surname) return 'School Administrator';
  if (!surname) return base;
  if (!base) return surname;

  const lowerBase = base.toLowerCase();
  const lowerSurname = surname.toLowerCase();
  if (lowerBase === lowerSurname || lowerBase.endsWith(` ${lowerSurname}`)) {
    return base;
  }
  return `${base} ${surname}`;
}

/**
 * Computes up to two monogram initials for the avatar fallback when no profile photo exists.
 */
export function getAdminInitials(user?: AdminIdentityLike | null): string {
  const displayName = formatAdminDisplayName(user);
  const parts = displayName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'SA';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

/**
 * Resolves the School Admin's Quick Access module list strictly from authorized School Admin
 * modules (never exposing platform-only / Superadmin modules or nonexistent ids).
 */
export function resolveSchoolAdminQuickAccessModules(
  storedIds: readonly string[],
  authorizedModules: DirectoryModule[] = visibleDirectoryModules(false)
): DirectoryModule[] {
  const byId = new Map(authorizedModules.map((module) => [module.id, module]));
  const pickUnique = (ids: readonly string[]) => {
    const seen = new Set<string>();
    const resolved: DirectoryModule[] = [];
    for (const id of ids) {
      if (seen.has(id)) continue;
      const found = byId.get(id);
      if (!found) continue;
      seen.add(id);
      resolved.push(found);
    }
    return resolved;
  };

  if (storedIds.length > 0) {
    const fromStored = pickUnique(storedIds);
    if (fromStored.length > 0) return fromStored;
  }

  return pickUnique(DEFAULT_SCHOOL_ADMIN_QUICK_ACCESS_IDS);
}

/**
 * Normalizes real `/api/admin/stats` output without fabricating numbers or trends.
 * Missing or zero counts resolve to `null` so the UI renders honest empty states.
 */
export function normalizeSchoolAdminStats(raw: any): NormalizedSchoolAdminStats {
  const parsePositiveInt = (...candidates: unknown[]): number | null => {
    for (const value of candidates) {
      if (value === null || value === undefined || value === '') continue;
      const num = Number(value);
      if (Number.isFinite(num) && num > 0) return Math.round(num);
    }
    return null;
  };

  const recentAnnouncements = Array.isArray(raw?.recent_announcements)
    ? raw.recent_announcements
        .filter((item: any) => item && (item.title || item.content))
        .slice(0, 4)
        .map((item: any) => ({
          id: item.id ?? `${item.title}-${item.created_at || ''}`,
          title: String(item.title || 'School Notice').trim(),
          content: String(item.content || '').trim(),
          author_name: String(item.author_name || 'School Administration').trim(),
          created_at: String(item.created_at || ''),
        }))
    : [];

  return {
    totalLearners: parsePositiveInt(
      raw?.enrolled_learners,
      raw?.total_learners,
      raw?.totalLearners,
      raw?.learner
    ),
    totalTeachers: parsePositiveInt(
      raw?.teacher,
      raw?.role_counts?.teacher,
      raw?.total_teachers,
      raw?.totalTeachers
    ),
    totalClasses: parsePositiveInt(raw?.total_classes, raw?.classes, raw?.totalClasses),
    attendanceRate: parsePositiveInt(raw?.overall_attendance, raw?.attendance_rate, raw?.attendanceRate),
    recentAnnouncements,
  };
}

/**
 * Filters notifications to match NotificationDropdown's official notices & alerts rules
 * (excluding chat/security/password-reset notifications).
 */
export function filterSchoolAdminNotifications(items: unknown, limit = 4): AdminHomeNotification[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item: any) => {
      if (!item || typeof item !== 'object') return false;
      const type = String(item.type || '').toLowerCase();
      const title = String(item.title || '').toLowerCase();
      return (
        type !== 'chat' &&
        type !== 'message' &&
        type !== 'security' &&
        !title.startsWith('password reset')
      );
    })
    .slice(0, limit)
    .map((item: any) => ({
      id: item.id ?? `${item.title}-${item.created_at || ''}`,
      title: String(item.title || 'School Alert').trim(),
      message: String(item.message || '').trim(),
      type: String(item.type || 'announcement'),
      target_tab: item.target_tab ? String(item.target_tab) : undefined,
      is_read: Boolean(item.is_read),
      created_at: String(item.created_at || ''),
    }));
}

export function getAuthorizedSchoolAdminModuleCount(): number {
  return visibleDirectoryModules(false).length;
}

export function isAuthorizedSchoolAdminModule(moduleId: string): boolean {
  return visibleDirectoryModules(false).some((module) => module.id === moduleId);
}

export { ADMIN_DIRECTORY_MODULES };
