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
    return {
      id,
      role,
      schoolId,
      full_name: String(parsed.full_name || 'School user'),
      surname: parsed.surname ? String(parsed.surname) : '',
      email: parsed.email ? String(parsed.email) : ''
    };
  } catch (_) {
    return null;
  }
}

export function startDashboardView(view: DashboardView) {
  sessionStorage.setItem(DASHBOARD_VIEW_KEY, JSON.stringify(view));
  window.dispatchEvent(new Event(DASHBOARD_VIEW_EVENT));
}

export function stopDashboardView() {
  sessionStorage.removeItem(DASHBOARD_VIEW_KEY);
  window.dispatchEvent(new Event(DASHBOARD_VIEW_EVENT));
}
