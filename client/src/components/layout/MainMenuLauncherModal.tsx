import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FusionAIIcon } from '../common/FusionAIIcon';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  CalendarCheck,
  Award,
  Clock,
  Megaphone,
  MessageSquare,
  User,
  GraduationCap,
  Calendar,
  Home,
  Compass,
  Grid,
  Trophy,
  BookMarked,
  UserCheck,
  Search,
  X,
  Sparkles,
  ChevronRight
} from 'lucide-react';

interface MainMenuLauncherModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onSelectTab: (tabId: string) => void;
}

export const MainMenuLauncherModal: React.FC<MainMenuLauncherModalProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
}) => {
  const { role } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const getRoleModules = () => {
    switch (role) {
      case 'teacher':
        return [
          { id: 'overview', label: 'Educator Analytics', desc: 'Class performance metrics & student overview', icon: LayoutDashboard, gradient: 'from-blue-600 to-indigo-600' },
          { id: 'subjects', label: 'My Subjects', desc: 'Subject past papers, curricula & syllabus', icon: BookOpen, gradient: 'from-cyan-600 to-blue-600' },
          { id: 'classes', label: 'Class Registers & Marks', desc: '60fps Camera QR scanner & mark entry sheets', icon: Users, gradient: 'from-emerald-600 to-teal-600', badge: 'QR LIVE' },
          { id: 'ai-tools', label: 'AI Lesson & Test Builder', desc: 'CAPS lesson plans & instant exam test papers', icon: FusionAIIcon, gradient: 'from-purple-600 to-pink-600', badge: 'AI' },
          { id: 'ptc', label: 'Parent Conferences (PTC)', desc: '15-minute educator consultation calendar', icon: Users, gradient: 'from-amber-600 to-orange-600' },
          { id: 'conduct', label: 'Merits & Conduct Logs', desc: 'Badge awards, XP points & disciplinary records', icon: Award, gradient: 'from-yellow-600 to-amber-600' },
          { id: 'my-leave', label: 'Leave & Relief Duty', desc: 'Staff relief allocations & educator leave', icon: UserCheck, gradient: 'from-rose-600 to-red-600' },
          { id: 'exam-seating', label: 'Exam Seating Planner', desc: 'Hall seating grids & student admission tickets', icon: Grid, gradient: 'from-indigo-600 to-purple-600' },
          { id: 'sports', label: 'Sports & Extracurriculars', desc: 'Athletics, fixtures, team rosters & tournaments', icon: Trophy, gradient: 'from-green-600 to-emerald-600' },
          { id: 'textbooks', label: 'Textbook Inventory', desc: 'Asset barcode scanning & classroom book issues', icon: BookMarked, gradient: 'from-teal-600 to-cyan-600' },
          { id: 'timetable', label: 'Teacher Timetable', desc: 'Weekly teaching periods & room allocations', icon: Clock, gradient: 'from-sky-600 to-blue-600' },
          { id: 'calendar', label: 'School Calendar', desc: 'Term dates, exams & official school events', icon: Calendar, gradient: 'from-violet-600 to-indigo-600' },
          { id: 'announcements', label: 'Broadcast Notices', desc: 'Publish announcements to learners and parents', icon: Megaphone, gradient: 'from-fuchsia-600 to-purple-600' },
          { id: 'messages', label: 'Communication Hub', desc: 'Direct messages with parents, learners & staff', icon: MessageSquare, gradient: 'from-brand-600 to-cyan-600', badge: 'CHAT' },
        ];
      case 'admin':
        return [
          { id: 'overview', label: 'School Analytics Hub', desc: 'Overall school enrollment, attendance & pass rates', icon: LayoutDashboard, gradient: 'from-blue-600 to-indigo-600' },
          { id: 'users', label: 'User Directory', desc: 'Manage teachers, parents, learners & staff roles', icon: Users, gradient: 'from-cyan-600 to-blue-600' },
          { id: 'matric-projector', label: 'Matric Pass Projector', desc: 'Grade 12 Bachelor pass & distinction forecast', icon: GraduationCap, gradient: 'from-purple-600 to-pink-600', badge: 'Gr12' },
          { id: 'leave-relief', label: 'Staff Leave & Relief', desc: 'Educator substitute allocations & daily roster', icon: UserCheck, gradient: 'from-rose-600 to-red-600' },
          { id: 'timetable', label: 'Timetable Master', desc: 'Automated clash-free AI school timetable generation', icon: Clock, gradient: 'from-sky-600 to-blue-600' },
          { id: 'exam-seating', label: 'Exam Seating Master', desc: 'Examination hall desk allocations & card print', icon: Grid, gradient: 'from-indigo-600 to-purple-600' },
          { id: 'sports', label: 'Sports & Clubs Hub', desc: 'School athletic fixtures, scores & club rosters', icon: Trophy, gradient: 'from-green-600 to-emerald-600' },
          { id: 'textbooks', label: 'Textbook Inventory', desc: 'Comprehensive textbook catalog & return tracking', icon: BookMarked, gradient: 'from-teal-600 to-cyan-600' },
          { id: 'calendar', label: 'School Calendar', desc: 'Official school calendar dates & academic terms', icon: Calendar, gradient: 'from-violet-600 to-indigo-600' },
          { id: 'announcements', label: 'Broadcast Notices', desc: 'Broadcast notices to all grades, streams & parents', icon: Megaphone, gradient: 'from-fuchsia-600 to-purple-600' },
          { id: 'messages', label: 'School Chat Hub', desc: 'Institution-wide communication management', icon: MessageSquare, gradient: 'from-brand-600 to-cyan-600' },
        ];
      case 'parent':
        return [
          { id: 'overview', label: 'Family Dashboard', desc: 'Child academic summary, attendance & alerts', icon: LayoutDashboard, gradient: 'from-blue-600 to-indigo-600' },
          { id: 'children', label: 'Linked Learners', desc: 'Overview of all your enrolled children', icon: GraduationCap, gradient: 'from-cyan-600 to-blue-600' },
          { id: 'reports', label: 'CAPS Report Cards', desc: 'Official term report cards & educator remarks', icon: Award, gradient: 'from-emerald-600 to-teal-600', badge: 'PDF' },
          { id: 'ptc', label: 'Parent Conferences (PTC)', desc: 'Book consultations with your child’s teachers', icon: Users, gradient: 'from-amber-600 to-orange-600' },
          { id: 'attendance', label: 'Attendance Records', desc: 'Real-time daily presence, late & absence history', icon: CalendarCheck, gradient: 'from-rose-600 to-red-600' },
          { id: 'sports', label: 'Sports & Fixtures', desc: 'Extracurricular fixtures, match scores & teams', icon: Trophy, gradient: 'from-green-600 to-emerald-600' },
          { id: 'timetable', label: 'Child Timetable', desc: 'Weekly class schedule & classroom periods', icon: Clock, gradient: 'from-sky-600 to-blue-600' },
          { id: 'calendar', label: 'School Calendar', desc: 'School events, exam dates & term holidays', icon: Calendar, gradient: 'from-violet-600 to-indigo-600' },
          { id: 'announcements', label: 'School Notices', desc: 'Urgent notices, newsletters & circulars', icon: Megaphone, gradient: 'from-fuchsia-600 to-purple-600' },
          { id: 'messages', label: 'Teacher Chat', desc: 'Direct secure messaging with classroom educators', icon: MessageSquare, gradient: 'from-brand-600 to-cyan-600', badge: 'CHAT' },
        ];
      case 'learner':
      default:
        return [
          { id: 'overview', label: 'Learner Home', desc: 'Daily academic schedule, tasks & achievements', icon: Home, gradient: 'from-blue-600 to-indigo-600' },
          { id: 'subjects', label: 'My Subjects & AI Tutor', desc: 'Syllabus, topics, interactive AI tutor & study notes', icon: BookOpen, gradient: 'from-cyan-600 to-blue-600', badge: 'AI' },
          { id: 'career-advisor', label: 'Matric APS & Careers', desc: 'APS point calculator, university requirements & fields', icon: Compass, gradient: 'from-purple-600 to-pink-600', badge: 'Gr12 APS' },
          { id: 'reports', label: 'CAPS Report Cards', desc: 'Term mark sheets, subject levels & official transcripts', icon: Award, gradient: 'from-emerald-600 to-teal-600', badge: 'PDF' },
          { id: 'exam-seating', label: 'Exam Seating & Card', desc: 'Personal exam hall allocation & student smart ID card', icon: Grid, gradient: 'from-indigo-600 to-purple-600' },
          { id: 'sports', label: 'Sports & Clubs', desc: 'House athletics, extracurricular teams & events', icon: Trophy, gradient: 'from-green-600 to-emerald-600' },
          { id: 'textbooks', label: 'My Textbooks', desc: 'Issued textbooks, digital study e-books & guides', icon: BookMarked, gradient: 'from-teal-600 to-cyan-600' },
          { id: 'timetable', label: 'Weekly Timetable', desc: 'Classroom periods, room numbers & educator timetable', icon: Clock, gradient: 'from-sky-600 to-blue-600' },
          { id: 'calendar', label: 'School Calendar', desc: 'Academic terms, test weeks & school holidays', icon: Calendar, gradient: 'from-violet-600 to-indigo-600' },
          { id: 'announcements', label: 'Announcements', desc: 'School alerts, sports updates & event notices', icon: Megaphone, gradient: 'from-fuchsia-600 to-purple-600' },
          { id: 'messages', label: 'Teacher Messages', desc: 'Direct private chats with subject teachers', icon: MessageSquare, gradient: 'from-brand-600 to-cyan-600', badge: 'CHAT' },
        ];
    }
  };

  const modules = useMemo(() => getRoleModules(), [role]);

  const filteredModules = useMemo(() => {
    if (!searchQuery.trim()) return modules;
    const q = searchQuery.toLowerCase();
    return modules.filter(
      (m) => m.label.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q)
    );
  }, [modules, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[88vh] rounded-3xl bg-surface-dark/95 border border-brand-500/30 p-6 md:p-8 shadow-2xl shadow-brand-500/10 flex flex-col overflow-hidden">
        {/* Glow Auras */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-brand-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-cyan-400 p-0.5 shadow-glow-cyan flex items-center justify-center shrink-0">
              <div className="w-full h-full rounded-[14px] bg-slate-950/80 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-cyan-300 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-extrabold font-display text-white tracking-tight">
                  Main Navigation Hub
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-brand-500/20 border border-brand-500/40 text-brand-300 text-[10px] font-mono font-extrabold uppercase">
                  {role} Portal
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Select any school module to jump directly into the workspace.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Search */}
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search modules (e.g. marks, reports)..."
                className="w-full pl-9 pr-3.5 py-2 bg-surface-darker/90 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                autoFocus
              />
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              title="Close Menu (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modules Grid */}
        <div className="mt-6 flex-1 overflow-y-auto custom-scrollbar pr-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredModules.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onClose();
                }}
                className={`group relative p-4 rounded-2xl text-left border transition-all duration-200 flex flex-col justify-between overflow-hidden ${
                  isActive
                    ? 'bg-gradient-to-br from-brand-600/30 via-indigo-600/20 to-cyan-600/20 border-cyan-400 shadow-glow-cyan'
                    : 'bg-surface-darker/80 hover:bg-surface-darker border-white/10 hover:border-white/20 hover:scale-[1.02] shadow-md'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div
                      className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${item.gradient} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex items-center gap-1.5">
                      {item.badge && (
                        <span className="px-2 py-0.5 rounded-md bg-white/10 text-white font-mono font-bold text-[9px] uppercase tracking-wider border border-white/15">
                          {item.badge}
                        </span>
                      )}
                      {isActive && (
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                      )}
                    </div>
                  </div>

                  <h4 className="text-sm font-extrabold text-white mt-3 group-hover:text-cyan-300 transition-colors">
                    {item.label}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug line-clamp-2">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between pt-2 border-t border-white/5 text-[10px] text-slate-400 group-hover:text-cyan-300 font-bold">
                  <span>Open Module</span>
                  <ChevronRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>{filteredModules.length} Modules Available</span>
          <span className="font-mono text-[11px] text-slate-500">Tip: Press ESC anytime to exit</span>
        </div>
      </div>
    </div>
  );
};
