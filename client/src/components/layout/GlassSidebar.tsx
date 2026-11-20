import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  CreditCard,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  HardDrive,
  HelpCircle,
  Home,
  LayoutGrid,
  LifeBuoy,
  LogOut,
  Megaphone,
  MessageSquare,
  Settings,
  ShieldCheck,
  Swords,
  TrendingUp,
  Trophy,
  User,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { FusionAppIcon } from '../common/FusionAppIcon';
import { HelpSupportModal } from '../common/HelpSupportModal';
import { soundNotificationService } from '../../services/soundNotificationService';
import { getModuleIcon } from '../../utils/schoolModules';
import { sidebarGroupsForRole, type SidebarGroup } from './sidebarNavigation';

const COLLAPSE_KEY = 'geleza_sidebar_collapsed';

interface GlassSidebarProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  schoolAdminRefined?: boolean;
}

const ADMIN_ICONS: Record<string, LucideIcon> = {
  'school-admissions': Building2,
  testers: ShieldCheck,
  users: Users,
  'command-center': Building2,
  'support-desk': LifeBuoy,
  'academic-streams': BookOpen,
  subjects: BookOpen,
  'lesson-planning': BookOpen,
  'classes-streams': Users,
  'staff-invites': Briefcase,
  metrics: Trophy,
  marks: FileSpreadsheet,
  reports: FileText,
  'matric-projector': TrendingUp,
  'exam-seating': Award,
  timetable: Clock,
  calendar: Calendar,
  'leave-relief': Briefcase,
  textbooks: HardDrive,
  finance: CreditCard,
  messages: MessageSquare,
  announcements: Megaphone,
  consultations: Users,
  'inter-school': Swords,
  sports: Trophy,
  bursaries: GraduationCap,
  'import-learners': FileSpreadsheet,
  settings: Settings,
};

function iconFor(id: string): LucideIcon {
  return ADMIN_ICONS[id] || getModuleIcon(id);
}

const activeMatch = (activeTab: string, id: string) => {
  if (id === 'overview') return activeTab === 'overview' || activeTab === 'home';
  if (id === 'subjects') return activeTab === 'subjects' || activeTab === 'classes' || activeTab === 'workload';
  if (id === 'parent') return activeTab === 'parent' || activeTab === 'my-children';
  if (id === 'ptc') return activeTab === 'ptc' || activeTab === 'consultations';
  if (id === 'children') return activeTab === 'children' || activeTab === 'marks';
  return activeTab === id;
};

export const GlassSidebar: React.FC<GlassSidebarProps> = ({
  activeTab,
  onSelectTab,
  mobileOpen,
  onCloseMobile,
  schoolAdminRefined = false,
}) => {
  const { user, role, account, viewedDashboard, logout } = useAuth();
  const { currentSchool } = useSchool();
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
  });
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [unread, setUnread] = useState(0);
  const [helpSupportOpen, setHelpSupportOpen] = useState(false);

  const isPlatformAdmin = Boolean(account?.is_superadmin) && !viewedDashboard;
  const groups = useMemo(
    () => sidebarGroupsForRole(role || '', isPlatformAdmin, currentSchool.teacher_modules, currentSchool.learner_modules),
    [role, isPlatformAdmin, currentSchool.teacher_modules, currentSchool.learner_modules]
  );

  useEffect(() => {
    if (user?.id) soundNotificationService.init(user.id);
    return soundNotificationService.subscribe(({ messages }) => setUnread(messages));
  }, [user?.id]);

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      const next = !value;
      try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0'); } catch { /* preference stays in memory */ }
      return next;
    });
  };

  const go = (id: string) => {
    onSelectTab(id);
    onCloseMobile();
  };

  const roleKey = String(role || '').toLowerCase();
  const realSchoolName =
    currentSchool?.name && currentSchool.name !== 'Your school'
      ? currentSchool.name
      : '';

  const schoolSubtitle = isPlatformAdmin
    ? 'Executive Governance'
    : realSchoolName || 'Geleza Smart';

  const homeLabel = isPlatformAdmin ? 'Platform Overview' : 'Dashboard';
  const allModulesLabel = isPlatformAdmin ? 'Command Centre' : 'All Modules';

  const footerPortalMeta = (() => {
    if (isPlatformAdmin) {
      return { title: 'Geleza SA Executive', sub: 'Platform Governance' };
    }
    if (roleKey === 'teacher' || roleKey === 'class_teacher') {
      return { title: 'Educator Portal', sub: realSchoolName || 'Teaching Staff' };
    }
    if (roleKey === 'learner') {
      return {
        title: 'Learner Portal',
        sub: user?.grade ? `Grade ${user.grade}` : (realSchoolName || 'CAPS Student'),
      };
    }
    if (roleKey === 'parent') {
      return { title: 'Family Portal', sub: realSchoolName || 'Guardian Access' };
    }
    return {
      title: 'Geleza SA Portal',
      sub: currentSchool?.emis_number ? `EMIS ${currentSchool.emis_number}` : 'School Admin',
    };
  })();

  return (
    <>
      {schoolAdminRefined && (
        <HelpSupportModal isOpen={helpSupportOpen} onClose={() => setHelpSupportOpen(false)} />
      )}

      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-sm md:hidden"
          aria-label="Close navigation"
          onClick={onCloseMobile}
        />
      )}
      <aside
        className={`geleza-glass-sidebar ${
          schoolAdminRefined ? 'geleza-glass-sidebar--admin' : ''
        } fixed left-3 top-3 z-50 m-0 flex shrink-0 flex-col self-start overflow-hidden rounded-3xl transition-all duration-300`}
        data-open={mobileOpen ? '1' : '0'}
        data-collapsed={collapsed ? '1' : '0'}
        aria-label="Dashboard navigation"
      >
        {/* Top Brand & Collapse Header */}
        <div
          className={`flex shrink-0 items-center gap-2 ${
            schoolAdminRefined
              ? `border-b border-slate-200/70 px-3.5 py-4 dark:border-white/10 ${collapsed ? 'md:flex-col md:px-2 md:py-3.5' : 'justify-between'}`
              : `px-3 pb-2 pt-4 ${collapsed ? 'md:flex-col md:px-2' : 'justify-between'}`
          }`}
        >
          <button
            type="button"
            onClick={() => go('overview')}
            className="flex min-w-0 items-center gap-2.5 rounded-2xl p-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#168BFF]"
            title="Geleza SA"
          >
            <FusionAppIcon className="h-9 w-9 shrink-0 rounded-xl shadow-xs" />
            <span className={`min-w-0 ${collapsed ? 'md:hidden' : ''}`}>
              <span className="block truncate font-display text-sm font-extrabold tracking-tight">
                GELEZA SA
              </span>
              <span className="block truncate text-[10px] font-semibold text-[#168BFF]">
                {schoolSubtitle}
              </span>
            </span>
          </button>

          <div className="flex items-center gap-1">
            {schoolAdminRefined && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300/70 bg-white/70 text-slate-600 hover:bg-white md:hidden dark:border-white/15 dark:bg-white/5 dark:text-slate-200"
                aria-label="Close navigation drawer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={toggleCollapsed}
              className="hidden h-8 w-8 items-center justify-center rounded-full border border-slate-300/75 bg-white/70 text-slate-600 transition-colors hover:border-[#168BFF]/50 hover:bg-white hover:text-[#168BFF] md:inline-flex dark:border-white/15 dark:bg-white/5 dark:text-slate-200 dark:hover:border-[#168BFF]/50 dark:hover:bg-white/10 dark:hover:text-[#7CC4FF]"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {schoolAdminRefined ? (
                collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />
              ) : (
                collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Scrollable Navigation Region */}
        <nav
          className={`min-h-0 flex-1 overflow-y-auto custom-scrollbar [scrollbar-width:thin] ${
            schoolAdminRefined ? 'space-y-1 px-2.5 py-3.5' : 'mt-2 space-y-1 px-2 pb-3'
          }`}
        >
          {schoolAdminRefined && !collapsed && (
            <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Main Navigation
            </p>
          )}

          <NavButton
            collapsed={collapsed}
            icon={Home}
            label={schoolAdminRefined ? homeLabel : 'Home'}
            active={activeMatch(activeTab, 'overview')}
            refined={schoolAdminRefined}
            onClick={() => go('overview')}
          />
          <NavButton
            collapsed={collapsed}
            icon={LayoutGrid}
            label={schoolAdminRefined ? allModulesLabel : 'All modules'}
            active={activeTab === 'more'}
            refined={schoolAdminRefined}
            onClick={() => go('more')}
          />

          {groups.map((group) => {
            const open = openGroups[group.id] !== false;
            return (
              <GroupBlock
                key={group.id}
                group={group}
                collapsed={collapsed}
                open={open}
                activeTab={activeTab}
                unread={unread}
                refined={schoolAdminRefined}
                onToggle={() =>
                  setOpenGroups((current) => ({ ...current, [group.id]: current[group.id] === false }))
                }
                onSelect={go}
              />
            );
          })}
        </nav>

        {/* Bottom Utility Actions */}
        <div
          className={`shrink-0 space-y-1 border-t border-slate-200/75 dark:border-white/10 ${
            schoolAdminRefined ? 'px-2.5 py-3.5' : 'px-2 pb-4 pt-3'
          }`}
        >
          {!schoolAdminRefined && (
            <NavButton
              collapsed={collapsed}
              icon={User}
              label="Profile"
              active={activeTab === 'profile'}
              refined={false}
              onClick={() => go('profile')}
            />
          )}
          <NavButton
            collapsed={collapsed}
            icon={Settings}
            label={schoolAdminRefined ? 'Settings & Preferences' : 'Settings'}
            active={activeTab === 'settings'}
            refined={schoolAdminRefined}
            onClick={() => go('settings')}
          />
          {schoolAdminRefined && (
            <NavButton
              collapsed={collapsed}
              icon={HelpCircle}
              label="Help & Support"
              active={false}
              refined={schoolAdminRefined}
              onClick={() => {
                setHelpSupportOpen(true);
                onCloseMobile();
              }}
            />
          )}
          <NavButton
            collapsed={collapsed}
            icon={LogOut}
            label={schoolAdminRefined ? 'Logout' : 'Log out'}
            active={false}
            refined={schoolAdminRefined}
            danger={schoolAdminRefined}
            onClick={logout}
          />

          {schoolAdminRefined && !collapsed && (
            <div className="mt-2 flex items-center gap-2 rounded-2xl border border-slate-200/75 bg-slate-50/80 px-3 py-2 text-[11px] dark:border-white/10 dark:bg-white/[0.04]">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
              <div className="min-w-0 leading-tight">
                <p className="truncate font-bold text-slate-800 dark:text-slate-100">
                  {footerPortalMeta.title}
                </p>
                <p className="truncate font-mono text-[10px] text-slate-500 dark:text-slate-400">
                  {footerPortalMeta.sub}
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

const GroupBlock: React.FC<{
  group: SidebarGroup;
  collapsed: boolean;
  open: boolean;
  activeTab: string;
  unread: number;
  refined: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
}> = ({ group, collapsed, open, activeTab, unread, refined, onToggle, onSelect }) => {
  const hasActiveChild = group.items.some((item) => activeMatch(activeTab, item.id));

  return (
    <div className={refined ? 'pt-2.5' : 'pt-2'}>
      {collapsed && refined && (
        <div className="mx-auto mb-1.5 hidden h-px w-8 bg-slate-200/80 md:block dark:bg-white/10" aria-hidden="true" />
      )}
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors ${
          hasActiveChild && !open
            ? 'text-[#0878E8] dark:text-[#7CC4FF]'
            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
        } ${collapsed ? 'md:hidden' : ''}`}
        aria-expanded={open}
      >
        <span className="truncate">{group.label}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${open ? '' : '-rotate-90'}`} />
      </button>
      {(open || collapsed) && (
        <div className={refined ? 'mt-0.5 space-y-0.5' : collapsed ? 'md:block' : ''}>
          {group.items.map((item) => (
            <NavButton
              key={item.id}
              collapsed={collapsed}
              icon={iconFor(item.id)}
              label={item.label}
              active={activeMatch(activeTab, item.id)}
              badge={item.id === 'messages' ? unread : 0}
              refined={refined}
              onClick={() => onSelect(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const NavButton: React.FC<{
  collapsed: boolean;
  icon: LucideIcon;
  label: string;
  active: boolean;
  badge?: number;
  refined: boolean;
  danger?: boolean;
  onClick: () => void;
}> = ({ collapsed, icon: Icon, label, active, badge = 0, refined, danger = false, onClick }) => {
  const activeStyle = refined
    ? 'bg-[#168BFF] font-semibold text-white shadow-sm shadow-[#168BFF]/25'
    : 'bg-[#168BFF]/15 font-semibold text-[#0878E8] dark:text-[#7CC4FF]';

  const inactiveStyle = danger
    ? 'text-slate-700 hover:bg-red-50 hover:text-red-600 dark:text-slate-200 dark:hover:bg-red-500/15 dark:hover:text-red-400'
    : 'text-slate-700 hover:bg-slate-900/[0.05] hover:text-slate-950 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white';

  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={collapsed ? label : undefined}
      aria-current={active ? 'page' : undefined}
      className={`group relative flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left text-[13px] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#168BFF] ${
        collapsed ? 'md:justify-center md:px-0' : ''
      } ${active ? activeStyle : inactiveStyle}`}
    >
      <span className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl">
        <Icon className="h-[18px] w-[18px]" />
        {badge > 0 && collapsed && (
          <span
            data-theme-preserve="true"
            className="absolute -right-1 -top-1 min-w-[16px] rounded-full bg-rose-500 px-1 text-center text-[9px] font-bold leading-4 text-white text-always-white"
          >
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </span>
      <span className={`min-w-0 flex-1 truncate ${collapsed ? 'md:hidden' : ''}`}>{label}</span>
      {badge > 0 && !collapsed && (
        <span
          data-theme-preserve="true"
          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
            active
              ? 'bg-white/25 text-white text-always-white'
              : 'bg-rose-500 text-white text-always-white'
          }`}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
};
