import React, { useEffect, useState } from 'react';
import { Building2, ChevronRight, GraduationCap, LayoutGrid, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { getProfilePictureUrl } from '../../utils/imageUrl';
import { formatAdminDisplayName, getAdminInitials } from '../../pages/admin/schoolAdminHomeModel';

interface SchoolAdminWelcomeBannerProps {
  onNavigateTab: (tabId: string, params?: any) => void;
}

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export const SchoolAdminWelcomeBanner: React.FC<SchoolAdminWelcomeBannerProps> = ({
  onNavigateTab,
}) => {
  const { user } = useAuth();
  const { currentSchool } = useSchool();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [deviceOnline, setDeviceOnline] = useState(
    () => typeof navigator === 'undefined' || navigator.onLine
  );

  const rawAvatarPath = user?.profile_picture || user?.profile_picture_path || '';
  const avatarUrl = rawAvatarPath ? getProfilePictureUrl(rawAvatarPath) : '';

  useEffect(() => {
    setAvatarFailed(false);
  }, [avatarUrl]);

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

  const roleTitle = String(user?.job_title || user?.title || 'School Administrator').trim();
  const schoolName = currentSchool?.name && currentSchool.name !== 'Your school'
    ? currentSchool.name
    : '';
  const curriculumLabel = currentSchool?.curriculum_type || 'CAPS (DBE)';
  const gradeRangeLabel = currentSchool?.grade_range ? `Grades ${currentSchool.grade_range}` : '';

  return (
    <section
      aria-label="Welcome"
      className="relative overflow-hidden rounded-3xl border border-[#C7D1DC]/90 bg-white/85 p-5 shadow-sm backdrop-blur-md transition-colors dark:border-white/10 dark:bg-[#0D1520]/85 sm:p-6"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Accent Stripe + Profile Avatar + Greeting Copy */}
        <div className="flex min-w-0 items-start gap-4 sm:items-center sm:gap-5">
          {/* Brand Vertical Accent Bar */}
          <div
            aria-hidden="true"
            className="hidden h-16 w-1 shrink-0 rounded-full bg-[#168BFF] sm:block"
          />

          {/* School Admin Profile Avatar (positioned in Welcome section) */}
          <button
            type="button"
            onClick={() => onNavigateTab('profile')}
            className="group relative shrink-0 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#168BFF]"
            title="View and manage your profile"
            aria-label={`Open profile for ${displayName}`}
          >
            <div
              data-theme-preserve="true"
              className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border-2 border-[#168BFF]/30 bg-[#168BFF] text-lg font-extrabold text-white text-always-white shadow-md transition-transform duration-200 group-hover:scale-[1.03] sm:h-[72px] sm:w-[72px] sm:text-xl"
            >
              <span className="select-none tracking-tight text-white text-always-white">{initials}</span>
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

          {/* Greeting & School Context */}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-semibold">
              <span className="uppercase tracking-[0.14em] text-[#168BFF]">
                {dateLabel}
              </span>
              <span className="hidden text-slate-300 dark:text-slate-600 sm:inline">•</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[#168BFF]/25 bg-[#168BFF]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#0878E8] dark:text-[#7CC4FF]">
                <ShieldCheck className="h-3 w-3 shrink-0" />
                <span>{roleTitle}</span>
              </span>
            </div>

            <h1 className="font-display text-2xl font-extrabold tracking-tight text-[#101820] dark:text-[#F5F7FA] sm:text-3xl">
              <span className="font-semibold text-[#526071] dark:text-[#AAB5C2]">
                {greeting},{' '}
              </span>
              <span className="break-words">{displayName}</span>
            </h1>

            <p className="text-xs text-[#526071] dark:text-[#AAB5C2] sm:text-sm">
              {schoolName
                ? `Manage ${schoolName} efficiently with Geleza SA.`
                : 'Manage your school operations and academic records with Geleza SA.'}
            </p>

            {/* School Metadata Pills (Real School Context Only) */}
            {(schoolName || currentSchool?.emis_number || gradeRangeLabel) && (
              <div className="flex flex-wrap items-center gap-2 pt-1.5">
                {schoolName && (
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#C7D1DC] bg-[#F4F6F8] px-2.5 py-1 text-[11px] font-semibold text-[#101820] dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                    <Building2 className="h-3.5 w-3.5 text-[#168BFF]" />
                    <span className="max-w-[240px] truncate">{schoolName}</span>
                  </span>
                )}
                {gradeRangeLabel && (
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#C7D1DC] bg-[#F4F6F8] px-2.5 py-1 text-[11px] font-semibold text-[#526071] dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                    <GraduationCap className="h-3.5 w-3.5 text-[#168BFF]" />
                    <span>
                      {curriculumLabel} • {gradeRangeLabel}
                    </span>
                  </span>
                )}
                {currentSchool?.emis_number && (
                  <span className="inline-flex items-center rounded-xl border border-[#C7D1DC] bg-[#F4F6F8] px-2.5 py-1 font-mono text-[11px] font-semibold text-[#526071] dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                    EMIS {currentSchool.emis_number}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Clean Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 lg:shrink-0">
          <button
            type="button"
            onClick={() => onNavigateTab('profile')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#C7D1DC] bg-[#F4F6F8] px-3.5 py-2 text-xs font-bold text-[#101820] transition-colors hover:border-[#168BFF]/50 hover:bg-white dark:border-white/15 dark:bg-white/5 dark:text-slate-100 dark:hover:border-[#168BFF]/50 dark:hover:bg-white/10"
          >
            <span>My Profile</span>
            <ChevronRight className="h-3.5 w-3.5 text-[#526071] dark:text-slate-400" />
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('more')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#168BFF] px-4 py-2 text-xs font-bold text-white shadow-sm shadow-[#168BFF]/25 transition-colors hover:bg-[#0878E8]"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>All Modules</span>
          </button>
        </div>
      </div>
    </section>
  );
};
