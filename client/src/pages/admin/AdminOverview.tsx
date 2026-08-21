import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  Users,
  GraduationCap,
  Briefcase,
  CalendarCheck,
  Award,
  Clock,
  ArrowRight,
  BookOpen,
  ShieldCheck,
  FileSpreadsheet,
  Megaphone,
  UserPlus
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { getProfilePictureUrl } from '../../utils/imageUrl';

interface AdminOverviewProps {
  onNavigateTab: (tabId: string) => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getOverviewStats()
      .then((res) => setStats(res))
      .catch((err) => {
        console.error('Failed to load admin stats:', err);
        setStats(null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Loading admin metrics..." />;

  const adminName = user?.full_name ? `${user.full_name} ${user.surname || ''}`.trim() : 'Administrator';
  const profilePic = user?.profile_picture;
  const totalLearners = stats?.enrolled_learners ?? stats?.total_learners ?? stats?.totalLearners ?? stats?.learner ?? 0;
  const totalTeachers = (stats?.role_counts && stats.role_counts.teacher) ?? stats?.totalTeachers ?? stats?.total_teachers ?? stats?.teacher ?? 0;
  const totalClasses = stats?.total_classes ?? stats?.classes ?? 0;
  const overallAttendance = stats?.overall_attendance !== undefined ? `${stats.overall_attendance}%` : (stats?.attendance_rate !== undefined ? `${stats.attendance_rate}%` : 'N/A');
  const pendingAdmissions = stats?.pending_admissions ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Compact High-Efficiency Welcome Banner with Integrated Metadata & Icons */}
      <div className="relative overflow-hidden rounded-3xl bg-surface-dark border border-white/10 p-5 md:p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            {/* User Profile Avatar */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl border-2 border-rose-400/40 bg-surface-darker shadow-md overflow-hidden flex items-center justify-center text-white font-black text-2xl md:text-3xl">
                {profilePic ? (
                  <img
                    src={getProfilePictureUrl(profilePic)}
                    alt={adminName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span>{adminName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-surface-dark rounded-full shadow-sm" title="Active" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight">
                Welcome, {adminName}
              </h2>

              {/* Integrated Personalization Metadata under Welcome with Icons */}
              <div className="flex items-center gap-2 flex-wrap text-xs text-slate-300">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-darker border border-white/10 font-semibold text-rose-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
                  Administration Hub
                </span>

                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-darker border border-white/10 font-semibold text-indigo-300">
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                  {totalLearners} Learners
                </span>

                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-darker border border-white/10 font-semibold text-cyan-300">
                  <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
                  {totalTeachers} Staff
                </span>

                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-darker border border-white/10 font-semibold text-emerald-300">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                  {totalClasses} Classes
                </span>

                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-darker border border-white/10 font-semibold text-amber-300">
                  <CalendarCheck className="w-3.5 h-3.5 text-amber-400" />
                  Attendance: {overallAttendance}
                </span>

                {pendingAdmissions > 0 && (
                  <button
                    onClick={() => onNavigateTab('admissions')}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 font-semibold text-rose-300 hover:bg-rose-500/25 transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-rose-400" />
                    {pendingAdmissions} Applications Pending
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Manage Users Action */}
          <button
            onClick={() => onNavigateTab('users')}
            className="flex items-center gap-2 self-start md:self-auto px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 shrink-0"
          >
            <Users className="w-4 h-4 text-cyan-200" />
            <span>Manage User Directory</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Streamlined Admin Command Launchpad */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-1">
          <h3 className="text-sm font-bold font-display text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-rose-400" />
            <span>Administration Launchpad</span>
          </h3>
          <span className="text-[11px] text-slate-400">School Command</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {/* User Management */}
          <div
            onClick={() => onNavigateTab('users')}
            className="group p-4 rounded-2xl bg-surface-dark border border-white/10 hover:border-brand-500/40 transition-all cursor-pointer space-y-1.5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-brand-500/15 text-brand-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Users className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
            </div>
            <h4 className="text-xs font-bold text-white group-hover:text-brand-300 transition-colors">
              User Accounts & Roles
            </h4>
            <p className="text-[11px] text-slate-400 leading-tight">
              Manage Learners, Teachers, Parents & Admins.
            </p>
          </div>

          {/* Admissions */}
          <div
            onClick={() => onNavigateTab('admissions')}
            className="group p-4 rounded-2xl bg-surface-dark border border-white/10 hover:border-rose-500/40 transition-all cursor-pointer space-y-1.5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <UserPlus className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
            </div>
            <h4 className="text-xs font-bold text-white group-hover:text-rose-300 transition-colors">
              Admissions & Applications
            </h4>
            <p className="text-[11px] text-slate-400 leading-tight">
              Review Grade 8–12 applications & approve entries.
            </p>
          </div>

          {/* Classes */}
          <div
            onClick={() => onNavigateTab('classes')}
            className="group p-4 rounded-2xl bg-surface-dark border border-white/10 hover:border-cyan-500/40 transition-all cursor-pointer space-y-1.5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <BookOpen className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
            </div>
            <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
              Class Allocations & Streams
            </h4>
            <p className="text-[11px] text-slate-400 leading-tight">
              Configure grade rooms & assign subject educators.
            </p>
          </div>

          {/* Timetable */}
          <div
            onClick={() => onNavigateTab('timetable')}
            className="group p-4 rounded-2xl bg-surface-dark border border-white/10 hover:border-amber-500/40 transition-all cursor-pointer space-y-1.5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Clock className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
            </div>
            <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
              Master School Timetable
            </h4>
            <p className="text-[11px] text-slate-400 leading-tight">
              Period scheduling & educator relief rosters.
            </p>
          </div>

          {/* Marks & Assessment Audits */}
          <div
            onClick={() => onNavigateTab('marks')}
            className="group p-4 rounded-2xl bg-surface-dark border border-white/10 hover:border-emerald-500/40 transition-all cursor-pointer space-y-1.5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
            </div>
            <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
              Academic Assessment Audits
            </h4>
            <p className="text-[11px] text-slate-400 leading-tight">
              Grade mark schedules, SBA verification & reports.
            </p>
          </div>

          {/* Broadcast Notices */}
          <div
            onClick={() => onNavigateTab('announcements')}
            className="group p-4 rounded-2xl bg-surface-dark border border-white/10 hover:border-indigo-500/40 transition-all cursor-pointer space-y-1.5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Megaphone className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
            </div>
            <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
              Official Broadcast Notices
            </h4>
            <p className="text-[11px] text-slate-400 leading-tight">
              Publish school-wide announcements & emergency alerts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
