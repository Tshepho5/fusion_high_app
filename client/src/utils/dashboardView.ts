export const DASHBOARD_VIEW_KEY = 'geleza_view_user';
export const DASHBOARD_VIEW_EVENT = 'geleza-dashboard-view';

export type DashboardRole = 'admin' | 'teacher' | 'parent' | 'learner';

export interface DashboardView {
  id: number;
  role: DashboardRole;
  schoolId: number;
  full_name: string;
  surname?: string;
  email?: string;
  profile_picture?: string | null;
  profile_picture_path?: string | null;
  grade?: number | null;
  learner_number?: string | null;
}

export interface DashboardOwnerCandidate {
  id: number | string;
  email?: string;
  role: DashboardRole | null;
  full_name?: string;
  name?: string;
  surname?: string;
  profile_picture?: string | null;
  profile_picture_path?: string | null;
  grade?: number;
  learner_number?: string;
  school_id?: number | string | null;
  is_superadmin?: boolean;
  [key: string]: any;
}

export function dashboardRole(value: unknown): DashboardRole | null {
  const role = String(value || '').trim().toLowerCase();
  if (!role) return null;
  if (role.includes('parent')) return 'parent';
  if (role.includes('learn') || role.includes('student') || role.includes('pupil')) return 'learner';
  if (role.includes('teach') || role.includes('educator') || role.includes('hod')) return 'teacher';
  if (role.includes('admin') || role.includes('principal')) return 'admin';
  return null;
}

function cleanPicture(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function readDashboardView(): DashboardView | null {
  try {
    const raw = sessionStorage.getItem(DASHBOARD_VIEW_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const id = Number(parsed?.id);
    const schoolId = Number(parsed?.schoolId);
    const role = dashboardRole(parsed?.role);
    if (!Number.isInteger(id) || id <= 0 || !role) return null;
    if (!Number.isInteger(schoolId) || schoolId <= 0) return null;
    const workspace = sessionStorage.getItem('geleza_school_workspace');
    if (!workspace || Number(workspace) !== schoolId) return null;
    const pic = cleanPicture(parsed.profile_picture) || cleanPicture(parsed.profile_picture_path);
    const gradeNum = parsed.grade !== undefined && parsed.grade !== null && parsed.grade !== ''
      ? Number(parsed.grade)
      : null;
    return {
      id,
      role,
      schoolId,
      full_name: String(parsed.full_name || 'School user'),
      surname: parsed.surname ? String(parsed.surname) : '',
      email: parsed.email ? String(parsed.email) : '',
      profile_picture: pic,
      profile_picture_path: cleanPicture(parsed.profile_picture_path) || pic,
      grade: Number.isFinite(gradeNum as number) ? gradeNum : null,
      learner_number: parsed.learner_number ? String(parsed.learner_number) : null,
    };
  } catch (_) {
    return null;
  }
}

export function startDashboardView(view: DashboardView) {
  const pic = cleanPicture(view.profile_picture) || cleanPicture(view.profile_picture_path);
  sessionStorage.setItem(
    DASHBOARD_VIEW_KEY,
    JSON.stringify({
      ...view,
      profile_picture: pic,
      profile_picture_path: cleanPicture(view.profile_picture_path) || pic,
    })
  );
  window.dispatchEvent(new Event(DASHBOARD_VIEW_EVENT));
}

export function stopDashboardView() {
  sessionStorage.removeItem(DASHBOARD_VIEW_KEY);
  window.dispatchEvent(new Event(DASHBOARD_VIEW_EVENT));
}

/**
 * Builds the effective dashboard owner identity.
 *
 * CRITICAL IDENTITY ISOLATION RULE:
 * When a Superadmin inspects another user's dashboard (`activeView`), the returned
 * dashboard owner object MUST NEVER spread the Superadmin's own account fields
 * (especially `profile_picture`, `profile_picture_path`, phone, address, or privileges).
 * Missing target profile pictures stay `null` so initials fallback renders cleanly.
 */
export function buildDashboardOwnerUser<T extends DashboardOwnerCandidate>(
  account: T | null,
  activeView: DashboardView | null,
  resolvedTargetProfile?: Partial<DashboardOwnerCandidate> | null
): T | null {
  if (!account) return null;
  if (!activeView || !account.is_superadmin) return account;

  const targetMatches =
    resolvedTargetProfile &&
    Number(resolvedTargetProfile.id) === Number(activeView.id);
  const target = targetMatches ? resolvedTargetProfile : null;

  const targetPicture =
    cleanPicture(target?.profile_picture) ||
    cleanPicture(target?.profile_picture_path) ||
    cleanPicture(activeView.profile_picture) ||
    cleanPicture(activeView.profile_picture_path) ||
    null;

  const owner: DashboardOwnerCandidate = {
    id: activeView.id,
    role: activeView.role,
    full_name: String(target?.full_name || activeView.full_name || 'School user'),
    name: String(target?.full_name || activeView.full_name || 'School user'),
    surname: String(target?.surname ?? activeView.surname ?? ''),
    email: String(target?.email ?? activeView.email ?? ''),
    school_id: activeView.schoolId,
    is_superadmin: false,
    profile_picture: targetPicture,
    profile_picture_path: targetPicture,
    phone: target?.phone || undefined,
    physical_address: target?.physical_address || undefined,
    gender: target?.gender || undefined,
    dob: target?.dob || undefined,
    id_number: target?.id_number || undefined,
    grade: (target?.grade ?? activeView.grade) ?? undefined,
    stream: target?.stream || undefined,
    learner_number: (target?.learner_number ?? activeView.learner_number) || undefined,
    class_name: target?.class_name || undefined,
    subjects: target?.subjects || undefined,
    grades_taught: target?.grades_taught || undefined,
    classes_taught: target?.classes_taught || undefined,
    is_viewed_dashboard: true,
  };

  return owner as T;
}
