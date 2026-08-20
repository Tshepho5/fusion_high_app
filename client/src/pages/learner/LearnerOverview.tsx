import React, { useState, useEffect } from 'react';
import { learnerService } from '../../services/api';
import { StatCard } from '../../components/common/StatCard';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Badge } from '../../components/common/Badge';
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
  Check
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
    return <LoadingSpinner text="Loading your dashboard..." />;
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
      {/* Welcome Banner with Profile Picture */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-900 via-surface-dark to-surface-dark border border-brand-500/20 p-6 md:p-8">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 md:gap-5">
            {/* User Profile Avatar */}
            <div className="relative shrink-0">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl border-2 border-brand-400/40 bg-gradient-to-tr from-brand-600 to-indigo-600 shadow-glow-indigo overflow-hidden flex items-center justify-center text-white font-black text-xl md:text-2xl ring-4 ring-brand-500/20">
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
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-surface-dark rounded-full shadow-sm" title="Active" />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <Badge variant="cyan" size="sm">Academic Year 2026</Badge>
                <Badge variant="indigo" size="sm">Grade {grade}</Badge>
                <Badge variant="slate" size="sm">{stream} Stream</Badge>
                <Badge variant="amber" size="sm">{homeLang} HL</Badge>
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold font-display text-white tracking-tight">
                Hello, {learnerName}
              </h2>
              <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-xl">
                Ready to learn today? Your AI Tutor is active and aligned with your textbooks for instant homework help and exam preparation.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('study-center')}
            className="flex items-center gap-2 self-start md:self-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-500 hover:to-cyan-500 text-white font-bold text-xs tracking-wide shadow-glow-indigo transition-all active:scale-[0.98]"
          >
            <FusionAIIcon className="w-4 h-4 text-cyan-200" />
            <span>Launch AI Tutor</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-container">
        <StatCard
          title="Current Grade"
          value={`Grade ${grade}`}
          subtitle={`${stream} Stream`}
          icon={GraduationCap}
          accentColor="indigo"
        />
        <StatCard
          title="Learner ID"
          value={learnerNumber}
          subtitle="Registered Learner"
          icon={Award}
          accentColor="cyan"
        />
        <StatCard
          title="Attendance"
          value={attendanceRate}
          subtitle={`${attendance?.presentDays || 0} / ${attendance?.totalDays || 0} Days Present`}
          icon={CalendarCheck}
          accentColor="emerald"
        />
        <StatCard
          title="School Notices"
          value={`${unreadAnnouncements.length} Unread`}
          subtitle={unreadAnnouncements.length === 0 ? 'All Caught Up' : 'Requires Attention'}
          icon={Megaphone}
          accentColor="amber"
        />
      </div>

      {/* Two Column Section: Quick Actions & Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Learning Launchpad */}
        <div className="space-y-4">
          <h3 className="text-base font-bold font-display text-white tracking-tight flex items-center gap-2">
            <FusionAIIcon className="w-4 h-4 text-brand-400" />
            Learning Launchpad
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              onClick={() => onNavigateTab('subjects')}
              className="group p-5 rounded-2xl bg-surface-dark border border-white/10 hover:border-brand-500/40 hover:bg-brand-500/5 transition-all cursor-pointer space-y-2"
            >
              <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Bot className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white group-hover:text-brand-300 transition-colors flex items-center justify-between">
                <span>Subject AI Tutors</span>
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h4>
              <p className="text-xs text-slate-400">
                Practice quizzes, step-by-step math breakdowns, and CAPS study tutor inside each subject.
              </p>
            </div>

            <div
              onClick={() => onNavigateTab('subjects')}
              className="group p-5 rounded-2xl bg-surface-dark border border-white/10 hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all cursor-pointer space-y-2"
            >
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors flex items-center justify-between">
                <span>My Subjects</span>
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h4>
              <p className="text-xs text-slate-400">
                Access subject learning materials, textbook chapters, and assessment overviews.
              </p>
            </div>

            <div
              onClick={() => onNavigateTab('assignments')}
              className="group p-5 rounded-2xl bg-surface-dark border border-white/10 hover:border-amber-500/40 hover:bg-amber-500/5 transition-all cursor-pointer space-y-2"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors flex items-center justify-between">
                <span>Assignments & Tasks</span>
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h4>
              <p className="text-xs text-slate-400">
                Submit teacher homework, track due dates, and review graded submissions.
              </p>
            </div>

            <div
              onClick={() => onNavigateTab('messages')}
              className="group p-5 rounded-2xl bg-surface-dark border border-white/10 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all cursor-pointer space-y-2"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors flex items-center justify-between">
                <span>Teacher Messages</span>
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h4>
              <p className="text-xs text-slate-400">
                Directly communicate with educators, query marks, or receive classroom notices.
              </p>
            </div>
          </div>
        </div>

        {/* School Announcements with dedicated space, padding, and read dismiss */}
        <div className="py-2 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-cyan-400" />
              <h3 className="text-base font-bold font-display text-white tracking-tight">
                School Notices
              </h3>
              {unreadAnnouncements.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-500/20 text-brand-300 border border-brand-500/30">
                  {unreadAnnouncements.length} New
                </span>
              )}
            </div>
            <button
              onClick={() => onNavigateTab('announcements')}
              className="text-xs text-brand-400 hover:text-brand-300 font-semibold"
            >
              View All Notices
            </button>
          </div>

          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar py-1">
            {unreadAnnouncements.length > 0 ? (
              unreadAnnouncements.map((ann, idx) => (
                <div
                  key={ann.id || idx}
                  className="rounded-2xl bg-surface-dark border border-white/10 p-4 hover:border-white/20 transition-all space-y-2 relative group shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400">
                      {ann.priority === 'Urgent' ? 'Urgent Notice' : (ann.category || 'School Broadcast')}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {ann.created_at ? new Date(ann.created_at).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' }) : 'Recent'}
                      </span>
                      <button
                        onClick={(e) => dismissAnnouncement(e, ann.id)}
                        className="text-[11px] text-slate-400 hover:text-emerald-400 font-medium px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-1"
                        title="Mark notice as read and dismiss from overview"
                      >
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Mark Read</span>
                      </button>
                    </div>
                  </div>
                  <h4 className="text-xs font-bold text-white">
                    {ann.title || 'Important Notice'}
                  </h4>
                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                    {ann.content || ann.message || 'Check the announcements board for details.'}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-surface-dark/60 border border-white/5 p-8 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400/80 mx-auto" />
                <p className="text-xs font-bold text-slate-300">All Notices Read</p>
                <p className="text-[11px] text-slate-500">
                  You are all caught up on announcements. Click "View All Notices" to access the full notice board.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
