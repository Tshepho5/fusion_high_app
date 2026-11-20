import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  HardDrive,
  Home,
  LayoutGrid,
  LifeBuoy,
  LogOut,
  Megaphone,
  MessageSquare,
  Settings,
  ShieldCheck,
  Swords,
  Trophy,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { FusionAppIcon } from '../common/FusionAppIcon';
import { soundNotificationService } from '../../services/soundNotificationService';
import { getModuleIcon } from '../../utils/schoolModules';
import { sidebarGroupsForRole, type SidebarGroup } from './sidebarNavigation';

const COLLAPSE_KEY = 'geleza_sidebar_collapsed';

interface GlassSidebarProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const ADMIN_ICONS: Record<string, LucideIcon> = {
  'school-admissions': Building2,
  testers: ShieldCheck,
  users: Users,
  'command-center': Building2,
  'support-desk': LifeBuoy,
  'classes-streams': Users,
  metrics: Trophy,
  marks: FileSpreadsheet,
  reports: FileText,
  timetable: Calendar,
  calendar: Calendar,
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
}) => {
  const { user, role, account, viewedDashboard, logout } = useAuth();
  const { currentSchool } = useSchool();
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
  });
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [unread, setUnread] = useState(0);

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

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm md:hidden"
          aria-label="Close navigation"
          onClick={onCloseMobile}
        />
      )}
      <aside
        className="geleza-glass-sidebar fixed left-3 top-3 z-50 m-0 flex shrink-0 flex-col self-start overflow-hidden rounded-3xl transition-transform duration-300"
        data-open={mobileOpen ? '1' : '0'}
        data-collapsed={collapsed ? '1' : '0'}
        aria-label="Dashboard navigation"
      >
        <div className={`flex shrink-0 items-center gap-2 px-3 pb-2 pt-4 ${collapsed ? 'md:flex-col md:px-2' : 'justify-between'}`}>
          <button type="button" onClick={() => go('overview')} className="flex min-w-0 items-center gap-2 rounded-2xl p-1 text-left" title="Geleza SA">
            <FusionAppIcon className="h-9 w-9 shrink-0 rounded-xl" />
            <span className={`min-w-0 ${collapsed ? 'md:hidden' : ''}`}>
              <span className="block truncate text-sm font-extrabold tracking-tight">GELEZA SA</span>
              <span className="block truncate text-[10px] font-semibold text-[#168BFF]">
                {currentSchool?.name || 'Geleza Smart'}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="hidden h-8 w-8 items-center justify-center rounded-full border border-slate-300/70 bg-white/60 text-slate-600 hover:bg-white md:inline-flex dark:border-white/15 dark:bg-white/5 dark:text-slate-200"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-3 [scrollbar-width:thin]">
          <NavButton
            collapsed={collapsed}
            icon={Home}
            label="Home"
            active={activeMatch(activeTab, 'overview')}
            onClick={() => go('overview')}
          />
          <NavButton
            collapsed={collapsed}
            icon={LayoutGrid}
            label="All modules"
            active={activeTab === 'more'}
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
              onToggle={() => setOpenGroups((current) => ({ ...current, [group.id]: current[group.id] === false }))}
              onSelect={go}
            />
            );
          })}
        </nav>

        <div className="shrink-0 space-y-1 border-t border-slate-200/70 px-2 pb-4 pt-3 dark:border-white/10">
          <NavButton collapsed={collapsed} icon={User} label="Profile" active={activeTab === 'profile'} onClick={() => go('profile')} />
          <NavButton collapsed={collapsed} icon={Settings} label="Settings" active={activeTab === 'settings'} onClick={() => go('settings')} />
          <NavButton collapsed={collapsed} icon={LogOut} label="Log out" active={false} onClick={logout} />
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
  onToggle: () => void;
  onSelect: (id: string) => void;
}> = ({ group, collapsed, open, activeTab, unread, onToggle, onSelect }) => (
  <div className="pt-2">
    <button
      type="button"
      onClick={onToggle}
      className={`flex w-full items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 ${collapsed ? 'md:hidden' : ''}`}
      aria-expanded={open}
    >
      <span className="truncate">{group.label}</span>
      <ChevronDown className={`h-3.5 w-3.5 transition ${open ? '' : '-rotate-90'}`} />
    </button>
    {(open || collapsed) && (
      <div className={collapsed ? 'md:block' : ''}>
        {group.items.map((item) => (
          <NavButton
            key={item.id}
            collapsed={collapsed}
            icon={iconFor(item.id)}
            label={item.label}
            active={activeMatch(activeTab, item.id)}
            badge={item.id === 'messages' ? unread : 0}
            onClick={() => onSelect(item.id)}
          />
        ))}
      </div>
    )}
  </div>
);

const NavButton: React.FC<{
  collapsed: boolean;
  icon: LucideIcon;
  label: string;
  active: boolean;
  badge?: number;
  onClick: () => void;
}> = ({ collapsed, icon: Icon, label, active, badge = 0, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    title={label}
    aria-current={active ? 'page' : undefined}
    className={`group relative flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left text-sm transition ${collapsed ? 'md:justify-center md:px-0' : ''} ${
      active
        ? 'bg-[#168BFF]/15 font-semibold text-[#0878E8] dark:text-[#7CC4FF]'
        : 'text-slate-700 hover:bg-white/70 dark:text-slate-200 dark:hover:bg-white/10'
    }`}
  >
    <span className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center">
      <Icon className="h-[18px] w-[18px]" />
      {badge > 0 && (
        <span className="absolute -right-1 -top-1 min-w-[16px] rounded-full bg-[#168BFF] px-1 text-center text-[9px] font-bold leading-4 text-white">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </span>
    <span className={`truncate ${collapsed ? 'md:hidden' : ''}`}>{label}</span>
  </button>
);
