import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  Users,
  GraduationCap,
  Briefcase,
  CalendarCheck,
  Award,
  Clock,
  ArrowRight,
  BookOpen
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

  if (loading) return <LoadingSpinner text="Loading database statistics..." />;

  const adminName = user?.full_name ? `${user.full_name} ${user.surname || ''}`.trim() : 'Administrator';
  const profilePic = user?.profile_picture;
  const totalLearners = stats?.enrolled_learners ?? stats?.total_learners ?? stats?.totalLearners ?? stats?.learner ?? 0;
  const totalTeachers = (stats?.role_counts && stats.role_counts.teacher) ?? stats?.totalTeachers ?? stats?.total_teachers ?? stats?.teacher ?? 0;
  const totalClasses = stats?.total_classes ?? stats?.classes ?? 0;
  const overallAttendance = stats?.overall_attendance !== undefined ? `${stats.overall_attendance}%` : (stats?.attendance_rate !== undefined ? `${stats.attendance_rate}%` : 'N/A');

  return (
    <div className="space-y-6">
      {/* Executive Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-surface-dark to-surface-dark border border-rose-500/20 p-6 md:p-8">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 md:gap-5">
            {/* User Profile Avatar */}
            <div className="relative shrink-0">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl border-2 border-rose-400/40 bg-gradient-to-tr from-rose-600 to-amber-600 shadow-md overflow-hidden flex items-center justify-center text-white font-black text-xl md:text-2xl ring-4 ring-rose-500/20">
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

            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Badge variant="rose" size="sm">Administration Hub</Badge>
                <Badge variant="cyan" size="sm">PostgreSQL Live Data</Badge>
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold font-display text-white tracking-tight">
                Welcome, {adminName}
              </h2>
              <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-xl">
                Live metrics across enrolled learners, registered teaching staff, attendance distributions, and active classes.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('users')}
            className="flex items-center gap-2 self-start md:self-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-brand-600 hover:from-rose-500 hover:to-brand-500 text-white font-bold text-xs tracking-wide shadow-md transition-all"
          >
            <Users className="w-4 h-4" />
            <span>Manage User Directory</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 stagger-container">
        <StatCard
          title="Total Enrolled"
          value={totalLearners}
          subtitle="Enrolled Learner Records"
          icon={GraduationCap}
          accentColor="indigo"
        />
        <StatCard
          title="Admissions & Apps"
          value={stats?.total_admissions !== undefined ? stats.total_admissions : 0}
          subtitle={`${stats?.pending_admissions || 0} Pending Review`}
          icon={Users}
          accentColor="rose"
        />
        <StatCard
          title="Active Teachers"
          value={totalTeachers}
          subtitle="Employees Table Records"
          icon={Briefcase}
          accentColor="cyan"
        />
        <StatCard
          title="Classes Configured"
          value={totalClasses}
          subtitle="Classes Table Records"
          icon={BookOpen}
          accentColor="emerald"
        />
        <StatCard
          title="Overall Attendance"
          value={overallAttendance}
          subtitle="Attendance Logs"
          icon={CalendarCheck}
          accentColor="amber"
        />
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger-container">
        <div
          onClick={() => onNavigateTab('users')}
          className="cursor-pointer group rounded-3xl bg-surface-dark border border-white/10 p-6 hover:border-brand-500/40 transition-all shadow-xl card-interactive"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-2xl bg-brand-500/10 text-brand-400 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <Badge variant="indigo" size="sm">Users Table</Badge>
          </div>
          <h3 className="text-sm font-bold text-white group-hover:text-brand-300 transition-colors">
            User Accounts & Roles
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Browse and add accounts for Learners, Teachers, Parents, and Administrators.
          </p>
        </div>

        <div
          onClick={() => onNavigateTab('timetable')}
          className="cursor-pointer group rounded-3xl bg-surface-dark border border-white/10 p-6 hover:border-cyan-500/40 transition-all shadow-xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
              <Clock className="w-6 h-6" />
            </div>
            <Badge variant="cyan" size="sm">Timetables</Badge>
          </div>
          <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
            Master Timetable Allocations
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            View active timetable schedules stored in the database.
          </p>
        </div>

        <div
          onClick={() => onNavigateTab('announcements')}
          className="cursor-pointer group rounded-3xl bg-surface-dark border border-white/10 p-6 hover:border-rose-500/40 transition-all shadow-xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-400 group-hover:scale-110 transition-transform">
              <Award className="w-6 h-6" />
            </div>
            <Badge variant="rose" size="sm">Announcements</Badge>
          </div>
          <h3 className="text-sm font-bold text-white group-hover:text-rose-300 transition-colors">
            Official Broadcast Notices
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Publish school notices to parents, teachers, and learners.
          </p>
        </div>
      </div>
    </div>
  );
};
