import React, { useEffect, useState } from 'react';
import { ChevronRight, LayoutGrid, ShieldCheck, type LucideIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getProfilePictureUrl } from '../../utils/imageUrl';
import { formatAdminDisplayName, getAdminInitials } from '../../pages/admin/schoolAdminHomeModel';

export interface WelcomeMetaPill {
  label: string;
  icon?: LucideIcon;
  mono?: boolean;
}

export interface WelcomeAction {
  label: string;
  icon?: LucideIcon;
  primary?: boolean;
  onClick: () => void;
}

interface DashboardWelcomeBannerProps {
  roleLabel: string;
  roleIcon?: LucideIcon;
  subtitle: string;
  metaPills?: WelcomeMetaPill[];
  actions?: WelcomeAction[];
  onOpenProfile?: () => void;
  onOpenAllModules?: () => void;
  allModulesLabel?: string;
}

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Role-adaptable Welcome Banner anchored to the actual DASHBOARD OWNER (`useAuth().user`).
 * When a Superadmin inspects another user's dashboard, `useAuth().user` is strictly isolated
 * to the target user (never inheriting the Superadmin's avatar or personal fields).
 */
export const DashboardWelcomeBanner: React.FC<DashboardWelcomeBannerProps> = ({
  roleLabel,
  roleIcon: RoleIcon = ShieldCheck,
  subtitle,
  metaPills = [],
  actions,
  onOpenProfile,
  onOpenAllModules,
  allModulesLabel = 'All Modules',
}) => {
  const { user } = useAuth();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [deviceOnline, setDeviceOnline] = useState(
    () => typeof navigator === 'undefined' || navigator.onLine
  );

  const rawAvatarPath = user?.profile_picture || user?.profile_picture_path || '';
  const avatarUrl = rawAvatarPath ? getProfilePictureUrl(rawAvatarPath) : '';

  useEffect(() => {
    setAvatarFailed(false);
  }, [avatarUrl, user?.id]);

  useEffect(() => {
    const onOnline = () => setDeviceOnline(true);
    const onOffline = () => setDeviceOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const displayName = formatAdminDisplayName(user);
  const initials = getAdminInitials(user);
  const now = new Date();
  const greeting = greetingForHour(now.getHours());
  const dateLabel = now.toLocaleDateString('en-ZA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <section
      aria-label="Welcome"
      className="relative overflow-hidden rounded-3xl border border-[#C7D1DC]/90 bg-white/85 p-5 shadow-sm backdrop-blur-md transition-colors dark:border-white/10 dark:bg-[#0D1520]/85 sm:p-6"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Accent Stripe + Dashboard Owner Profile Avatar + Greeting Copy */}
        <div className="flex min-w-0 items-start gap-4 sm:items-center sm:gap-5">
          <div
            aria-hidden="true"
            className="hidden h-16 w-1 shrink-0 rounded-full bg-[#168BFF] sm:block"
          />

          <button
            type="button"
            onClick={onOpenProfile}
            disabled={!onOpenProfile}
            className="group relative shrink-0 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#168BFF] disabled:cursor-default"
            title={onOpenProfile ? `View profile for ${displayName}` : displayName}
            aria-label={onOpenProfile ? `Open profile for ${displayName}` : displayName}
          >
            <div
              data-theme-preserve="true"
              className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border-2 border-[#168BFF]/30 bg-[#168BFF] text-lg font-extrabold text-white text-always-white shadow-md transition-transform duration-200 group-hover:scale-[1.03] sm:h-[72px] sm:w-[72px] sm:text-xl"
            >
              <span className="select-none tracking-tight text-white text-always-white">
                {initials}
              </span>
              {avatarUrl && !avatarFailed && (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={() => setAvatarFailed(true)}
                />
              )}
            </div>
            <span
              className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white dark:border-[#0D1520] ${
                deviceOnline ? 'bg-emerald-500' : 'bg-slate-400'
              }`}
              title={deviceOnline ? 'Online' : 'Offline'}
            />
          </button>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-semibold">
              <span className="uppercase tracking-[0.14em] text-[#168BFF]">
                {dateLabel}
              </span>
              <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[#168BFF]/25 bg-[#168BFF]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#0878E8] dark:text-[#7CC4FF]">
                <RoleIcon className="h-3 w-3 shrink-0" />
                <span>{roleLabel}</span>
              </span>
            </div>

            <h1 className="font-display text-2xl font-extrabold tracking-tight text-[#101820] dark:text-[#F5F7FA] sm:text-3xl">
              <span className="font-semibold text-[#526071] dark:text-[#AAB5C2]">
                {greeting},{' '}
              </span>
              <span className="break-words">{displayName}</span>
            </h1>

            <p className="text-xs text-[#526071] dark:text-[#AAB5C2] sm:text-sm">
              {subtitle}
            </p>

            {metaPills.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1.5">
                {metaPills.map((pill, idx) => {
                  const PillIcon = pill.icon;
                  return (
                    <span
                      key={`${pill.label}-${idx}`}
                      className={`inline-flex items-center gap-1.5 rounded-xl border border-[#C7D1DC] bg-[#F4F6F8] px-2.5 py-1 text-[11px] font-semibold text-[#101820] dark:border-white/10 dark:bg-white/5 dark:text-slate-200 ${
                        pill.mono ? 'font-mono' : ''
                      }`}
                    >
                      {PillIcon && <PillIcon className="h-3.5 w-3.5 shrink-0 text-[#168BFF]" />}
                      <span className="max-w-[240px] truncate">{pill.label}</span>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Role-Appropriate Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 lg:shrink-0">
          {actions ? (
            actions.map((action, idx) => {
              const ActionIcon = action.icon;
              return (
                <button
                  key={`${action.label}-${idx}`}
                  type="button"
                  onClick={action.onClick}
                  data-theme-preserve={action.primary ? 'true' : undefined}
                  className={
                    action.primary
                      ? 'inline-flex items-center gap-1.5 rounded-xl bg-[#168BFF] px-4 py-2 text-xs font-bold text-white text-always-white shadow-sm shadow-[#168BFF]/25 transition-colors hover:bg-[#0878E8]'
                      : 'inline-flex items-center gap-1.5 rounded-xl border border-[#C7D1DC] bg-[#F4F6F8] px-3.5 py-2 text-xs font-bold text-[#101820] transition-colors hover:border-[#168BFF]/50 hover:bg-white dark:border-white/15 dark:bg-white/5 dark:text-slate-100 dark:hover:border-[#168BFF]/50 dark:hover:bg-white/10'
                  }
                >
                  {ActionIcon && <ActionIcon className="h-3.5 w-3.5 shrink-0" />}
                  <span>{action.label}</span>
                </button>
              );
            })
          ) : (
            <>
              {onOpenProfile && (
                <button
                  type="button"
                  onClick={onOpenProfile}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#C7D1DC] bg-[#F4F6F8] px-3.5 py-2 text-xs font-bold text-[#101820] transition-colors hover:border-[#168BFF]/50 hover:bg-white dark:border-white/15 dark:bg-white/5 dark:text-slate-100 dark:hover:border-[#168BFF]/50 dark:hover:bg-white/10"
                >
                  <span>My Profile</span>
                  <ChevronRight className="h-3.5 w-3.5 text-[#526071] dark:text-slate-400" />
                </button>
              )}
              {onOpenAllModules && (
                <button
                  type="button"
                  onClick={onOpenAllModules}
                  data-theme-preserve="true"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#168BFF] px-4 py-2 text-xs font-bold text-white text-always-white shadow-sm shadow-[#168BFF]/25 transition-colors hover:bg-[#0878E8]"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span>{allModulesLabel}</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
};
