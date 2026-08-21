import React, { useState, useEffect } from 'react';
import { teacherService } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { TeacherNextClassAlert } from '../../components/teacher/TeacherNextClassAlert';
import {
  Briefcase,
  Users,
  CalendarCheck,
  FileSpreadsheet,
  Sparkles,
  BookOpen,
  ArrowRight,
  Clock,
  MessageSquare,
  Trophy,
  ClipboardList
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

  if (loading) return <LoadingSpinner text="Loading educator workspace..." />;

  const teacherName = stats?.teacher_name || user?.full_name || 'Educator';
  const profilePic = user?.profile_picture || stats?.profile_picture;
  const subjectsList = workload?.subjects || ['Mathematics', 'Physical Sciences'];
  const classesList = workload?.classes_taught || ['10A', '10B', '11A'];
  const pendingGrading = stats?.assessments_awaiting_marking ?? 0;
  const totalLearners = stats?.total_learners ?? 128;
  const classesToday = stats?.classes_today ?? 4;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Compact High-Efficiency Welcome Banner with Integrated Metadata & Icons */}
      <div className="relative overflow-hidden rounded-3xl bg-surface-dark border border-white/10 p-5 md:p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            {/* User Profile Avatar */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl border-2 border-cyan-400/40 bg-surface-darker shadow-md overflow-hidden flex items-center justify-center text-white font-black text-2xl md:text-3xl">
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

            <div className="space-y-1.5">
              <h2 className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight">
                Welcome, {teacherName}
              </h2>

              {/* Integrated Personalization Metadata under Welcome with Icons */}
              <div className="flex items-center gap-2 flex-wrap text-xs text-slate-300">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-darker border border-white/10 font-semibold text-cyan-300">
                  <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
                  Educator Workspace
                </span>

                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-darker border border-white/10 font-semibold text-indigo-300">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                  {subjectsList.join(', ')}
                </span>

                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-darker border border-white/10 font-semibold text-emerald-300">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  {totalLearners} Learners
                </span>

                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-darker border border-white/10 font-semibold text-amber-300">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  {classesToday} Classes Today
                </span>

                {pendingGrading > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 font-semibold text-rose-300">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-rose-400" />
                    {pendingGrading} Pending Marking
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick AI Lesson & Test Builder Action */}
          <button
            onClick={() => onNavigateTab('ai-tools')}
            className="flex items-center gap-2 self-start md:self-auto px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 shrink-0"
          >
            <Sparkles className="w-4 h-4 text-cyan-200" />
            <span>AI Lesson & Test Builder</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Priority Next Class Alert & Action Launcher */}
      <TeacherNextClassAlert onNavigateTab={onNavigateTab} />

      {/* Streamlined Educator Launchpad */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-1">
          <h3 className="text-sm font-bold font-display text-white tracking-tight flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-cyan-400" />
            <span>Educator Launchpad</span>
          </h3>
          <span className="text-[11px] text-slate-400">Classroom Management</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {/* Attendance */}
          <div
            onClick={() => onNavigateTab('attendance')}
            className="group p-4 rounded-2xl bg-surface-dark border border-white/10 hover:border-emerald-500/40 transition-all cursor-pointer space-y-1.5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <CalendarCheck className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
            </div>
            <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
              Mark Attendance Register
            </h4>
            <p className="text-[11px] text-slate-400 leading-tight">
              Record daily or period student attendance.
            </p>
          </div>

          {/* Marks & Assessments */}
          <div
            onClick={() => onNavigateTab('marks')}
            className="group p-4 rounded-2xl bg-surface-dark border border-white/10 hover:border-cyan-500/40 transition-all cursor-pointer space-y-1.5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
            </div>
            <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
              Assessment Marks
            </h4>
            <p className="text-[11px] text-slate-400 leading-tight">
              Enter term marks, test results & CAPS weighting.
            </p>
          </div>

          {/* Assignments */}
          <div
            onClick={() => onNavigateTab('assignments')}
            className="group p-4 rounded-2xl bg-surface-dark border border-white/10 hover:border-indigo-500/40 transition-all cursor-pointer space-y-1.5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <BookOpen className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
            </div>
            <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
              Assignments & Homework
            </h4>
            <p className="text-[11px] text-slate-400 leading-tight">
              Create student tasks & review submissions.
            </p>
          </div>

          {/* Messages */}
          <div
            onClick={() => onNavigateTab('messages')}
            className="group p-4 rounded-2xl bg-surface-dark border border-white/10 hover:border-amber-500/40 transition-all cursor-pointer space-y-1.5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <MessageSquare className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
            </div>
            <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
              Learner & Parent Messages
            </h4>
            <p className="text-[11px] text-slate-400 leading-tight">
              Direct inbox for inquiries and parent updates.
            </p>
          </div>

          {/* AI Tools */}
          <div
            onClick={() => onNavigateTab('ai-tools')}
            className="group p-4 rounded-2xl bg-surface-dark border border-white/10 hover:border-brand-500/40 transition-all cursor-pointer space-y-1.5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-brand-500/15 text-brand-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Sparkles className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
            </div>
            <h4 className="text-xs font-bold text-white group-hover:text-brand-300 transition-colors">
              AI Question & Lesson Generator
            </h4>
            <p className="text-[11px] text-slate-400 leading-tight">
              Generate CAPS-aligned exam papers & memorandums.
            </p>
          </div>

          {/* Sports & Extra-Curriculars */}
          <div
            onClick={() => onNavigateTab('sports')}
            className="group p-4 rounded-2xl bg-surface-dark border border-white/10 hover:border-rose-500/40 transition-all cursor-pointer space-y-1.5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Trophy className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
            </div>
            <h4 className="text-xs font-bold text-white group-hover:text-rose-300 transition-colors">
              Sports & Extracurriculars
            </h4>
            <p className="text-[11px] text-slate-400 leading-tight">
              Manage school sports fixtures, rosters & results.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
