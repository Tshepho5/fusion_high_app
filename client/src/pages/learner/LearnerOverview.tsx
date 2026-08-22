import React, { useState, useEffect } from 'react';
import { learnerService } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { FusionAIIcon } from '../../components/common/FusionAIIcon';
import {
  GraduationCap,
  BookOpen,
  CalendarCheck,
  Megaphone,
  Award,
  ArrowRight,
  Bot,
  FileText,
  MessageSquare,
  CheckCircle2,
  Check,
  Languages,
  Trophy
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getProfilePictureUrl } from '../../utils/imageUrl';

interface LearnerOverviewProps {
  onNavigateTab: (tabId: string) => void;
}

export const LearnerOverview: React.FC<LearnerOverviewProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Read state persistence in localStorage
  const readStorageKey = `fusion_read_announcements_${user?.id || 'guest'}`;
  const [readIds, setReadIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(readStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const dismissAnnouncement = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    const updated = [...readIds, id];
    setReadIds(updated);
    try {
      localStorage.setItem(readStorageKey, JSON.stringify(updated));
    } catch (err) {
      console.warn('Could not save read state', err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profData, annData, attData] = await Promise.allSettled([
          learnerService.getProfile(),
          learnerService.getAnnouncements(),
          learnerService.getAttendance(),
        ]);

        if (profData.status === 'fulfilled') setProfile(profData.value);
        if (annData.status === 'fulfilled') {
          const list = Array.isArray(annData.value) ? annData.value : annData.value.announcements || [];
          setAnnouncements(list);
        }
        if (attData.status === 'fulfilled') setAttendance(attData.value);
      } catch (err) {
        console.error('Failed to load learner overview data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <LoadingSpinner text="Loading your workspace..." />;
  }

  const learnerName = profile?.full_name || user?.full_name || profile?.name || 'Learner';
  const grade = profile?.grade || user?.grade || profile?.academic?.grade || '10';
  const stream = profile?.stream || user?.stream || profile?.academic?.stream || 'General';
  const homeLang = profile?.home_language || user?.home_language || 'isiZulu';
  const learnerNumber = profile?.learner_number || user?.learner_number || profile?.academic?.learner_number || '2026-001';
  const attendanceRate = attendance?.percentage !== undefined ? `${attendance.percentage}%` : (attendance?.presentRate || '100%');
  const profilePic = profile?.profile_picture_path || user?.profile_picture_path || profile?.profile_picture || user?.profile_picture;

  const unreadAnnouncements = announcements.filter(a => !readIds.includes(a.id));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Compact High-Efficiency Welcome Banner with Integrated Metadata & Icons */}
      <div className="relative overflow-hidden rounded-3xl bg-surface-dark border border-white/10 p-5 md:p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            {/* User Profile Avatar */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl border-2 border-brand-400/40 bg-surface-darker shadow-md overflow-hidden flex items-center justify-center text-white font-black text-2xl md:text-3xl">
                {profilePic ? (
                  <img
                    src={getProfilePictureUrl(profilePic)}
                    alt={learnerName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span>{learnerName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-surface-dark rounded-full shadow-sm" title="Online" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight">
                Hello, {learnerName}
              </h2>

              {/* Integrated Personalization Metadata under Welcome with Icons */}
              <div className="flex items-center gap-2 flex-wrap text-xs text-slate-300">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-darker border border-white/10 font-semibold text-indigo-300">
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                  Grade {grade} ({stream})
                </span>

                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-darker border border-white/10 font-semibold text-cyan-300 font-mono">
                  <Award className="w-3.5 h-3.5 text-cyan-400" />
                  Learner ID: {learnerNumber}
                </span>

                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-darker border border-white/10 font-semibold text-emerald-300">
                  <CalendarCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Attendance: {attendanceRate}
                </span>

                <button
                  onClick={() => onNavigateTab('announcements')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-darker hover:bg-white/10 border border-white/10 font-semibold text-amber-300 transition-colors"
                >
                  <Megaphone className="w-3.5 h-3.5 text-amber-400" />
                  Notices: {unreadAnnouncements.length} Unread
                </button>

                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-darker border border-white/10 font-semibold text-slate-300">
                  <Languages className="w-3.5 h-3.5 text-slate-400" />
                  {homeLang} HL
                </span>
              </div>
            </div>
          </div>

          {/* Quick Study Center Action */}
          <button
            onClick={() => onNavigateTab('study-center')}
            className="flex items-center gap-2 self-start md:self-auto px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 shrink-0"
          >
            <FusionAIIcon className="w-4 h-4 text-cyan-200" />
            <span>Launch AI Tutor</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: Learning Launchpad & School Notices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compact Learning Launchpad (2 cols on large screen) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-sm font-bold font-display text-white tracking-tight flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span>Learning Launchpad</span>
            </h3>
            <span className="text-[11px] text-slate-400">Quick Access</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {/* Subject AI Tutors */}
            <div
              onClick={() => onNavigateTab('subjects')}
              className="group p-4 rounded-2xl bg-surface-dark border border-white/10 hover:border-brand-500/40 transition-all cursor-pointer space-y-1.5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-brand-500/15 text-brand-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Bot className="w-4 h-4" />
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
              </div>
              <h4 className="text-xs font-bold text-white group-hover:text-brand-300 transition-colors">
                Subject AI Tutors
              </h4>
              <p className="text-[11px] text-slate-400 leading-tight">
                Practice quizzes, step-by-step math breakdowns & tutor.
              </p>
            </div>

            {/* My Subjects */}
            <div
              onClick={() => onNavigateTab('subjects')}
              className="group p-4 rounded-2xl bg-surface-dark border border-white/10 hover:border-cyan-500/40 transition-all cursor-pointer space-y-1.5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <BookOpen className="w-4 h-4" />
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
              </div>
              <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                My Subjects & Past Papers
              </h4>
              <p className="text-[11px] text-slate-400 leading-tight">
                Textbooks, curriculum modules & past exams.
              </p>
            </div>

            {/* Assignments & Tasks */}
            <div
              onClick={() => onNavigateTab('assignments')}
              className="group p-4 rounded-2xl bg-surface-dark border border-white/10 hover:border-amber-500/40 transition-all cursor-pointer space-y-1.5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FileText className="w-4 h-4" />
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
              </div>
              <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                Assignments & Tasks
              </h4>
              <p className="text-[11px] text-slate-400 leading-tight">
                Submit teacher homework & check graded tasks.
              </p>
            </div>

            {/* Teacher Messages */}
            <div
              onClick={() => onNavigateTab('messages')}
              className="group p-4 rounded-2xl bg-surface-dark border border-white/10 hover:border-emerald-500/40 transition-all cursor-pointer space-y-1.5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
              </div>
              <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                Teacher Messages
              </h4>
              <p className="text-[11px] text-slate-400 leading-tight">
                Direct inbox with educators & classroom queries.
              </p>
            </div>

            {/* Report Card */}
            <div
              onClick={() => onNavigateTab('reports')}
              className="group p-4 rounded-2xl bg-surface-dark border border-white/10 hover:border-indigo-500/40 transition-all cursor-pointer space-y-1.5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Award className="w-4 h-4" />
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
              </div>
              <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                CAPS Report Card
              </h4>
              <p className="text-[11px] text-slate-400 leading-tight">
                Official term marks, averages & level ratings.
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
                Sports & Clubs
              </h4>
              <p className="text-[11px] text-slate-400 leading-tight">
                Extracurricular teams, fixtures & house standings.
              </p>
            </div>
          </div>
        </div>

        {/* Compact School Notices Feed */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold font-display text-white tracking-tight">
                School Notices
              </h3>
              {unreadAnnouncements.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {unreadAnnouncements.length} New
                </span>
              )}
            </div>
            <button
              onClick={() => onNavigateTab('announcements')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
            >
              View All
            </button>
          </div>

          <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
            {unreadAnnouncements.length > 0 ? (
              unreadAnnouncements.map((ann, idx) => (
                <div
                  key={ann.id || idx}
                  className="rounded-2xl bg-surface-dark border border-white/10 p-3.5 hover:border-white/20 transition-all space-y-1.5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                      {ann.priority === 'Urgent' ? 'Urgent Notice' : (ann.category || 'School Broadcast')}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {ann.created_at ? new Date(ann.created_at).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' }) : 'Recent'}
                      </span>
                      <button
                        onClick={(e) => dismissAnnouncement(e, ann.id)}
                        className="text-[10px] text-slate-400 hover:text-emerald-400 font-medium px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-1"
                        title="Mark as read"
                      >
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Read</span>
                      </button>
                    </div>
                  </div>
                  <h4 className="text-xs font-bold text-white">
                    {ann.title || 'Important Notice'}
                  </h4>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {ann.content || ann.message || 'Check notice board for details.'}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-surface-dark/60 border border-white/5 p-6 text-center space-y-1.5">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                <p className="text-xs font-bold text-slate-300">All Notices Caught Up</p>
                <p className="text-[11px] text-slate-500">
                  No unread school broadcasts at this time.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
