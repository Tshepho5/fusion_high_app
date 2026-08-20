import React, { useState, useEffect } from 'react';
import { teacherService } from '../../services/api';
import { StatCard } from '../../components/common/StatCard';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Badge } from '../../components/common/Badge';
import { TeacherNextClassAlert } from '../../components/teacher/TeacherNextClassAlert';
import {
  Briefcase,
  Users,
  CalendarCheck,
  FileSpreadsheet,
  Sparkles,
  BookOpen,
  ArrowRight,
  Clock
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { getProfilePictureUrl } from '../../utils/imageUrl';

interface TeacherOverviewProps {
  onNavigateTab: (tabId: string) => void;
}

export const TeacherOverview: React.FC<TeacherOverviewProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [workload, setWorkload] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      teacherService.getOverview(),
      teacherService.getWorkload(),
    ])
      .then(([overRes, workRes]) => {
        if (overRes.status === 'fulfilled') setStats(overRes.value);
        if (workRes.status === 'fulfilled') setWorkload(workRes.value);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Loading teacher workspace..." />;

  const teacherName = stats?.teacher_name || user?.full_name || 'Educator';
  const profilePic = user?.profile_picture || stats?.profile_picture;
  const subjectsList = workload?.subjects || ['Mathematics', 'Physical Sciences'];
  const classesList = workload?.classes_taught || ['10A', '10B', '11A'];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-900 via-surface-dark to-surface-dark border border-cyan-500/20 p-6 md:p-8">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 md:gap-5">
            {/* User Profile Avatar */}
            <div className="relative shrink-0">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl border-2 border-cyan-400/40 bg-gradient-to-tr from-cyan-600 to-indigo-600 shadow-glow-cyan overflow-hidden flex items-center justify-center text-white font-black text-xl md:text-2xl ring-4 ring-cyan-500/20">
                {profilePic ? (
                  <img
                    src={getProfilePictureUrl(profilePic)}
                    alt={teacherName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span>{teacherName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-surface-dark rounded-full shadow-sm" title="Active" />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Badge variant="cyan" size="sm">Teacher Workspace</Badge>
                <Badge variant="indigo" size="sm">Academic Year 2026</Badge>
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold font-display text-white tracking-tight">
                Welcome, {teacherName}
              </h2>
              <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-xl">
                Manage your class registers, enter term assessments, or use AI tools to generate lesson plans and customized test papers.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('ai-tools')}
            className="flex items-center gap-2 self-start md:self-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-500 hover:to-cyan-500 text-white font-bold text-xs tracking-wide shadow-glow-indigo transition-all"
          >
            <Sparkles className="w-4 h-4 text-cyan-200" />
            <span>AI Lesson & Test Builder</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Real-time Priority Next Class Alert & Action Launcher */}
      <TeacherNextClassAlert onNavigateTab={onNavigateTab} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-container">
        <StatCard
          title="Assigned Subjects"
          value={subjectsList.length}
          subtitle="Subject Disciplines"
          icon={BookOpen}
          accentColor="indigo"
        />
        <StatCard
          title="Total Learners"
          value={stats?.total_learners || 128}
          subtitle="Enrolled Across Classes"
          icon={Users}
          accentColor="cyan"
        />
        <StatCard
          title="Classes Today"
          value={stats?.classes_today || 4}
          subtitle="Daily Schedule"
          icon={Clock}
          accentColor="emerald"
        />
        <StatCard
          title="Pending Marking"
          value={stats?.assessments_awaiting_marking || 2}
          subtitle="Assessments to Grade"
          icon={FileSpreadsheet}
          accentColor="amber"
        />
      </div>

      {/* Quick Access Modules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger-container">
        <div
          onClick={() => onNavigateTab('attendance')}
          className="cursor-pointer group rounded-3xl bg-surface-dark border border-white/10 p-6 hover:border-emerald-500/40 transition-all shadow-xl card-interactive"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <Badge variant="emerald" size="sm">Daily Register</Badge>
          </div>
          <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
            Mark Class Attendance
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Quickly record learner presence, late arrivals, and generate attendance compliance logs.
          </p>
        </div>

        <div
          onClick={() => onNavigateTab('assessments')}
          className="cursor-pointer group rounded-3xl bg-surface-dark border border-white/10 p-6 hover:border-brand-500/40 transition-all shadow-xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-2xl bg-brand-500/10 text-brand-400 group-hover:scale-110 transition-transform">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <Badge variant="indigo" size="sm">Term 1 - 4</Badge>
          </div>
          <h3 className="text-sm font-bold text-white group-hover:text-brand-300 transition-colors">
            Assessments & Marks
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Input marks for tests, assignments, exams, and track pass rates across all streams.
          </p>
        </div>

        <div
          onClick={() => onNavigateTab('ai-tools')}
          className="cursor-pointer group rounded-3xl bg-surface-dark border border-white/10 p-6 hover:border-cyan-500/40 transition-all shadow-xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
              <Sparkles className="w-6 h-6 text-cyan-300" />
            </div>
            <Badge variant="cyan" size="sm">Smart AI</Badge>
          </div>
          <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
            AI Lesson & Test Builder
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Generate complete lesson plans, differentiated worksheets, and examination papers with memorandums.
          </p>
        </div>
      </div>
    </div>
  );
};
