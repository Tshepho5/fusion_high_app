import React from 'react';
import {
  ArrowRight,
  Bell,
  BookOpen,
  Briefcase,
  CalendarCheck,
  Clock,
  GraduationCap,
  Inbox,
  Megaphone,
  type LucideIcon,
} from 'lucide-react';
import {
  type AdminHomeNotification,
  normalizeSchoolAdminStats,
} from '../../pages/admin/schoolAdminHomeModel';

interface SchoolAdminStatsRowProps {
  stats: any;
  onNavigateTab: (tabId: string, params?: any) => void;
}

interface SchoolAdminActivityPanelsProps {
  stats: any;
  notifications: AdminHomeNotification[];
  unreadNotifications: number;
  onNavigateTab: (tabId: string, params?: any) => void;
}

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return '';
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return '';
  const diffMs = Date.now() - parsed.getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return parsed.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
}

interface StatCardSpec {
  id: string;
  label: string;
  value: string;
  sublabel: string;
  hasData: boolean;
  icon: LucideIcon;
  iconStyle: string;
  targetTab: string;
}

export const SchoolAdminStatsRow: React.FC<SchoolAdminStatsRowProps> = ({
  stats,
  onNavigateTab,
}) => {
  const normalized = normalizeSchoolAdminStats(stats);

  const cards: StatCardSpec[] = [
    {
      id: 'learners',
      label: 'Enrolled Learners',
      value: normalized.totalLearners !== null ? normalized.totalLearners.toLocaleString('en-ZA') : 'No records yet',
      sublabel: 'Active CAPS learners',
      hasData: normalized.totalLearners !== null,
      icon: GraduationCap,
      iconStyle: 'border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-400',
      targetTab: 'users',
    },
    {
      id: 'teachers',
      label: 'Teaching Staff',
      value: normalized.totalTeachers !== null ? normalized.totalTeachers.toLocaleString('en-ZA') : 'No records yet',
      sublabel: 'Registered educators',
      hasData: normalized.totalTeachers !== null,
      icon: Briefcase,
      iconStyle: 'border-indigo-500/25 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
      targetTab: 'users',
    },
    {
      id: 'classes',
      label: 'Class Units',
      value: normalized.totalClasses !== null ? normalized.totalClasses.toLocaleString('en-ZA') : 'No records yet',
      sublabel: 'Configured classes',
      hasData: normalized.totalClasses !== null,
      icon: BookOpen,
      iconStyle: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      targetTab: 'classes-streams',
    },
    {
      id: 'attendance',
      label: 'School Attendance',
      value: normalized.attendanceRate !== null ? `${normalized.attendanceRate}%` : 'Awaiting capture',
      sublabel: 'Recorded attendance rate',
      hasData: normalized.attendanceRate !== null,
      icon: CalendarCheck,
      iconStyle: 'border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400',
      targetTab: 'marks',
    },
  ];

  return (
    <section aria-label="School Summary Statistics">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onNavigateTab(card.targetTab)}
              className="group flex items-center gap-4 rounded-2xl border border-[#C7D1DC]/90 bg-white/85 p-4 text-left shadow-sm backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-[#168BFF]/55 hover:bg-white hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#168BFF] dark:border-white/10 dark:bg-[#0D1520]/85 dark:hover:border-[#168BFF]/55 dark:hover:bg-[#131F2E]"
            >
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-transform duration-200 group-hover:scale-105 ${card.iconStyle}`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate font-display font-extrabold tracking-tight text-[#101820] dark:text-[#F5F7FA] ${
                    card.hasData ? 'text-2xl' : 'text-sm font-bold text-[#526071] dark:text-[#AAB5C2]'
                  }`}
                >
                  {card.value}
                </p>
                <p className="truncate text-xs font-bold text-[#101820] dark:text-slate-200">
                  {card.label}
                </p>
                <p className="truncate text-[11px] text-[#526071] dark:text-[#AAB5C2]">
                  {card.sublabel}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-[#697586] opacity-60 transition-all group-hover:translate-x-0.5 group-hover:text-[#168BFF] group-hover:opacity-100 dark:text-[#8794A5]" />
            </button>
          );
        })}
      </div>
    </section>
  );
};

export const SchoolAdminActivityPanels: React.FC<SchoolAdminActivityPanelsProps> = ({
  stats,
  notifications,
  unreadNotifications,
  onNavigateTab,
}) => {
  const { recentAnnouncements } = normalizeSchoolAdminStats(stats);

  return (
    <section
      aria-label="Recent School Broadcasts and Notifications"
      className="grid grid-cols-1 gap-4 lg:grid-cols-2"
    >
      {/* Left: Recent Official Broadcasts (Real DB announcements for this school) */}
      <div className="flex flex-col rounded-3xl border border-[#C7D1DC]/90 bg-white/85 p-5 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-[#0D1520]/85">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#168BFF]/25 bg-[#168BFF]/10 text-[#168BFF]">
              <Megaphone className="h-4 w-4" />
            </span>
            <h2 className="font-display text-sm font-extrabold tracking-tight text-[#101820] dark:text-[#F5F7FA] sm:text-base">
              Recent School Broadcasts
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('announcements')}
            className="inline-flex items-center gap-1 rounded-full border border-[#C7D1DC] bg-[#F4F6F8] px-3 py-1 text-[11px] font-bold text-[#526071] transition-colors hover:border-[#168BFF]/50 hover:text-[#168BFF] dark:border-white/10 dark:bg-white/5 dark:text-[#AAB5C2] dark:hover:text-[#7CC4FF]"
          >
            <span>View All</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {recentAnnouncements.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-[#C7D1DC] bg-[#F4F6F8]/70 px-4 py-8 text-center dark:border-white/10 dark:bg-white/[0.02]">
            <Megaphone className="mb-2 h-6 w-6 text-[#697586] dark:text-[#8794A5]" />
            <p className="text-xs font-bold text-[#101820] dark:text-[#F5F7FA]">
              No announcements published yet
            </p>
            <p className="mt-1 max-w-xs text-[11px] text-[#526071] dark:text-[#AAB5C2]">
              Official school notices you publish for staff, learners, and parents will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentAnnouncements.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigateTab('announcements')}
                className="group flex w-full items-start justify-between gap-3 rounded-2xl border border-[#C7D1DC]/70 bg-[#F4F6F8]/70 p-3 text-left transition-colors hover:border-[#168BFF]/50 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-[#168BFF]/50 dark:hover:bg-white/[0.06]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-[#101820] group-hover:text-[#0878E8] dark:text-[#F5F7FA] dark:group-hover:text-[#7CC4FF]">
                    {item.title}
                  </p>
                  {item.content && (
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-[#526071] dark:text-[#AAB5C2]">
                      {item.content}
                    </p>
                  )}
                  <p className="mt-1 text-[10px] font-medium text-[#697586] dark:text-[#8794A5]">
                    {item.author_name}
                  </p>
                </div>
                {item.created_at && (
                  <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[10px] text-[#697586] dark:text-[#8794A5]">
                    <Clock className="h-3 w-3" />
                    {formatRelativeTime(item.created_at)}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: School Notifications (Real user notifications from notificationService) */}
      <div className="flex flex-col rounded-3xl border border-[#C7D1DC]/90 bg-white/85 p-5 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-[#0D1520]/85">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Bell className="h-4 w-4" />
            </span>
            <h2 className="font-display text-sm font-extrabold tracking-tight text-[#101820] dark:text-[#F5F7FA] sm:text-base">
              Notifications
            </h2>
            {unreadNotifications > 0 && (
              <span
                data-theme-preserve="true"
                className="rounded-full bg-[#168BFF] px-2 py-0.5 text-[10px] font-bold text-white text-always-white"
              >
                {unreadNotifications > 99 ? '99+' : unreadNotifications}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('announcements')}
            className="inline-flex items-center gap-1 rounded-full border border-[#C7D1DC] bg-[#F4F6F8] px-3 py-1 text-[11px] font-bold text-[#526071] transition-colors hover:border-[#168BFF]/50 hover:text-[#168BFF] dark:border-white/10 dark:bg-white/5 dark:text-[#AAB5C2] dark:hover:text-[#7CC4FF]"
          >
            <span>Notices</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {notifications.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-[#C7D1DC] bg-[#F4F6F8]/70 px-4 py-8 text-center dark:border-white/10 dark:bg-white/[0.02]">
            <Inbox className="mb-2 h-6 w-6 text-[#697586] dark:text-[#8794A5]" />
            <p className="text-xs font-bold text-[#101820] dark:text-[#F5F7FA]">
              No school notifications right now
            </p>
            <p className="mt-1 max-w-xs text-[11px] text-[#526071] dark:text-[#AAB5C2]">
              Official school alerts, circulars, and educator updates will show here automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {notifications.map((notif) => (
              <button
                key={notif.id}
                type="button"
                onClick={() => onNavigateTab(notif.target_tab || 'announcements')}
                className={`group flex w-full items-start justify-between gap-3 rounded-2xl border p-3 text-left transition-colors ${
                  notif.is_read
                    ? 'border-[#C7D1DC]/70 bg-[#F4F6F8]/60 hover:border-[#168BFF]/40 hover:bg-white dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.05]'
                    : 'border-[#168BFF]/35 bg-[#168BFF]/[0.06] hover:border-[#168BFF]/60 dark:border-[#168BFF]/35 dark:bg-[#168BFF]/10'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {!notif.is_read && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-[#168BFF]" aria-hidden="true" />
                    )}
                    <p className="truncate text-xs font-bold text-[#101820] group-hover:text-[#0878E8] dark:text-[#F5F7FA] dark:group-hover:text-[#7CC4FF]">
                      {notif.title}
                    </p>
                  </div>
                  {notif.message && (
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-[#526071] dark:text-[#AAB5C2]">
                      {notif.message}
                    </p>
                  )}
                </div>
                {notif.created_at && (
                  <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[10px] text-[#697586] dark:text-[#8794A5]">
                    <Clock className="h-3 w-3" />
                    {formatRelativeTime(notif.created_at)}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
