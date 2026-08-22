import React, { useState, useMemo, useEffect } from 'react';
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
  ChevronRight,
  LayoutGrid,
  List,
  Layers,
  Filter,
  CheckCircle2,
  CreditCard,
  FileSpreadsheet
} from 'lucide-react';

type ViewMode = 'launchpad' | 'cards' | 'list';
type CategoryFilter = 'all' | 'academic' | 'operations' | 'campus' | 'chat';

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
  const [category, setCategory] = useState<CategoryFilter>('all');
  
  // Persistent view mode (Launchpad App Grid / Detailed Cards / Compact List)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('fusion_main_menu_view') as ViewMode) || 'cards';
  });

  const handleSetViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('fusion_main_menu_view', mode);
  };

  const getRoleModules = () => {
    switch (role) {
      case 'teacher':
        return [
          { id: 'overview', label: 'Educator Analytics', desc: 'Class performance metrics, daily pass rates & learner overview', category: 'academic', icon: LayoutDashboard, gradient: 'from-blue-600 to-indigo-600' },
          { id: 'subjects', label: 'My Subjects', desc: 'Subject curricula, CAPS past papers & learning resources', category: 'academic', icon: BookOpen, gradient: 'from-cyan-600 to-blue-600' },
          { id: 'assignments', label: 'Homework & Submissions', desc: 'Publish homework briefs, review learner uploads & sign off marks', category: 'academic', icon: BookOpen, gradient: 'from-brand-600 to-indigo-600', badge: 'AI Live' },
          { id: 'classes', label: 'Class Registers & Marks', desc: '60fps continuous Camera QR scanner & mark entry registers', category: 'operations', icon: Users, gradient: 'from-emerald-600 to-teal-600', badge: 'QR LIVE' },
          { id: 'ai-tools', label: 'AI Lesson & Test Builder', desc: 'CAPS lesson plans & instant exam test papers with memorandums', category: 'academic', icon: FusionAIIcon, gradient: 'from-purple-600 to-pink-600', badge: 'AI' },
          { id: 'ptc', label: 'Parent Conferences (PTC)', desc: '15-minute educator consultation calendar & appointment slots', category: 'chat', icon: Users, gradient: 'from-amber-600 to-orange-600' },
          { id: 'conduct', label: 'Merits & Conduct Logs', desc: 'Badge awards, XP points & disciplinary records', category: 'operations', icon: Award, gradient: 'from-yellow-600 to-amber-600' },
          { id: 'my-leave', label: 'Leave & Relief Duty', desc: 'Staff relief allocations & educator leave management', category: 'operations', icon: UserCheck, gradient: 'from-rose-600 to-red-600' },
          { id: 'exam-seating', label: 'Exam Seating Planner', desc: 'Hall seating grids & learner admission tickets', category: 'operations', icon: Grid, gradient: 'from-indigo-600 to-purple-600' },
          { id: 'sports', label: 'Sports & Extracurriculars', desc: 'Athletics, match fixtures, team rosters & tournaments', category: 'campus', icon: Trophy, gradient: 'from-green-600 to-emerald-600' },
          { id: 'textbooks', label: 'Textbook Inventory', desc: 'Asset barcode scanning & classroom textbook distribution', category: 'operations', icon: BookMarked, gradient: 'from-teal-600 to-cyan-600' },
          { id: 'timetable', label: 'Teacher Timetable', desc: 'Weekly teaching periods & room allocations', category: 'operations', icon: Clock, gradient: 'from-sky-600 to-blue-600' },
          { id: 'calendar', label: 'School Calendar', desc: 'Term dates, exams & official school events', category: 'campus', icon: Calendar, gradient: 'from-violet-600 to-indigo-600' },
          { id: 'announcements', label: 'Broadcast Notices', desc: 'Publish announcements to learners and parents', category: 'campus', icon: Megaphone, gradient: 'from-fuchsia-600 to-purple-600' },
          { id: 'messages', label: 'Communication Hub', desc: 'Direct messages with parents, learners & colleagues', category: 'chat', icon: MessageSquare, gradient: 'from-brand-600 to-cyan-600', badge: 'CHAT' },
        ];
      case 'admin':
        return [
          { id: 'overview', label: 'School Analytics Hub', desc: 'Overall school enrollment, attendance & pass rates', category: 'academic', icon: LayoutDashboard, gradient: 'from-blue-600 to-indigo-600' },
          { id: 'marks', label: 'Academic Assessment Audits', desc: 'Grade mark schedules, SBA verification & DBE reports', category: 'academic', icon: FileSpreadsheet, gradient: 'from-emerald-600 to-teal-600', badge: 'CAPS' },
          { id: 'finance', label: 'School Fees & Finance', desc: 'Tuition invoicing, payment receipts & collection analytics', category: 'operations', icon: CreditCard, gradient: 'from-emerald-600 to-teal-600', badge: 'ZAR' },
          { id: 'users', label: 'User Directory', desc: 'Manage teachers, parents, learners & staff accounts', category: 'operations', icon: Users, gradient: 'from-cyan-600 to-blue-600' },
          { id: 'matric-projector', label: 'Matric Pass Projector', desc: 'Grade 12 Bachelor pass & distinction forecast analytics', category: 'academic', icon: GraduationCap, gradient: 'from-purple-600 to-pink-600', badge: 'Gr12' },
          { id: 'bursaries', label: 'Bursary Opportunities', desc: 'National tertiary scholarship catalog & learner applications', category: 'academic', icon: GraduationCap, gradient: 'from-amber-600 to-orange-600' },
          { id: 'leave-relief', label: 'Staff Leave & Relief', desc: 'Educator substitute allocations & daily duty roster', category: 'operations', icon: UserCheck, gradient: 'from-rose-600 to-red-600' },
          { id: 'timetable', label: 'Timetable Master', desc: 'Automated clash-free AI school timetable generation', category: 'operations', icon: Clock, gradient: 'from-sky-600 to-blue-600' },
          { id: 'exam-seating', label: 'Exam Seating Master', desc: 'Examination hall desk allocations & card printing', category: 'operations', icon: Grid, gradient: 'from-indigo-600 to-purple-600' },
          { id: 'sports', label: 'Sports & Clubs Hub', desc: 'School athletic fixtures, scores & club rosters', category: 'campus', icon: Trophy, gradient: 'from-green-600 to-emerald-600' },
          { id: 'textbooks', label: 'Textbook Inventory', desc: 'Comprehensive textbook catalog & return tracking', category: 'operations', icon: BookMarked, gradient: 'from-teal-600 to-cyan-600' },
          { id: 'calendar', label: 'School Calendar', desc: 'Official school calendar dates & academic terms', category: 'campus', icon: Calendar, gradient: 'from-violet-600 to-indigo-600' },
          { id: 'announcements', label: 'Broadcast Notices', desc: 'Broadcast notices to all grades, streams & parents', category: 'campus', icon: Megaphone, gradient: 'from-fuchsia-600 to-purple-600' },
          { id: 'messages', label: 'School Chat Hub', desc: 'Institution-wide communication management', category: 'chat', icon: MessageSquare, gradient: 'from-brand-600 to-cyan-600' },
        ];
      case 'parent':
        return [
          { id: 'overview', label: 'Family Dashboard', desc: 'Child academic summary, attendance & school alerts', category: 'academic', icon: LayoutDashboard, gradient: 'from-blue-600 to-indigo-600' },
          { id: 'children', label: 'Linked Learners', desc: 'Overview of all your enrolled children at Fusion High', category: 'academic', icon: GraduationCap, gradient: 'from-cyan-600 to-blue-600' },
          { id: 'finance', label: 'School Fees & PayFast', desc: 'Tuition statements, itemized levies & Instant EFT settlements', category: 'operations', icon: CreditCard, gradient: 'from-emerald-600 to-teal-600', badge: 'PAY' },
          { id: 'bursaries', label: 'NSFAS & Bursaries', desc: 'Tertiary scholarships, funding coverage & checklist tracker', category: 'academic', icon: GraduationCap, gradient: 'from-amber-600 to-orange-600', badge: 'FUND' },
          { id: 'reports', label: 'CAPS Report Cards', desc: 'Official term report cards & educator remarks', category: 'academic', icon: Award, gradient: 'from-emerald-600 to-teal-600', badge: 'PDF' },
          { id: 'ptc', label: 'Parent Conferences (PTC)', desc: 'Book consultations with your child’s subject teachers', category: 'chat', icon: Users, gradient: 'from-amber-600 to-orange-600' },
          { id: 'attendance', label: 'Attendance Records', desc: 'Real-time daily presence, late & absence history', category: 'operations', icon: CalendarCheck, gradient: 'from-rose-600 to-red-600' },
          { id: 'sports', label: 'Sports & Fixtures', desc: 'Extracurricular fixtures, match scores & teams', category: 'campus', icon: Trophy, gradient: 'from-green-600 to-emerald-600' },
          { id: 'timetable', label: 'Child Timetable', desc: 'Weekly class schedule & classroom periods', category: 'operations', icon: Clock, gradient: 'from-sky-600 to-blue-600' },
          { id: 'calendar', label: 'School Calendar', desc: 'School events, exam dates & term holidays', category: 'campus', icon: Calendar, gradient: 'from-violet-600 to-indigo-600' },
          { id: 'announcements', label: 'School Notices', desc: 'Urgent notices, newsletters & circulars', category: 'campus', icon: Megaphone, gradient: 'from-fuchsia-600 to-purple-600' },
          { id: 'messages', label: 'Teacher Chat', desc: 'Direct secure messaging with classroom educators', category: 'chat', icon: MessageSquare, gradient: 'from-brand-600 to-cyan-600', badge: 'CHAT' },
        ];
      case 'learner':
      default:
        return [
          { id: 'overview', label: 'Learner Home', desc: 'Daily academic schedule, tasks & achievements', category: 'academic', icon: Home, gradient: 'from-blue-600 to-indigo-600' },
          { id: 'subjects', label: 'My Subjects & AI Tutor', desc: 'Syllabus, topics, interactive AI tutor & study notes', category: 'academic', icon: BookOpen, gradient: 'from-cyan-600 to-blue-600', badge: 'AI' },
          { id: 'assignments', label: 'Homework & Submissions', desc: 'Download worksheets, upload solutions & get AI concept pre-grading', category: 'academic', icon: BookOpen, gradient: 'from-brand-600 to-indigo-600', badge: 'AI Live' },
          { id: 'career-advisor', label: 'Matric APS & Careers', desc: 'APS point calculator, university requirements & fields', category: 'academic', icon: Compass, gradient: 'from-purple-600 to-pink-600', badge: 'Gr12 APS' },
          { id: 'bursaries', label: 'NSFAS & Bursaries', desc: 'AI tertiary bursary matches, document checklists & funding', category: 'academic', icon: GraduationCap, gradient: 'from-amber-600 to-orange-600', badge: 'FUND' },
          { id: 'finance', label: 'Fee Statements', desc: 'Official school fee statements & settled payment receipts', category: 'operations', icon: CreditCard, gradient: 'from-emerald-600 to-teal-600' },
          { id: 'reports', label: 'CAPS Report Cards', desc: 'Term mark sheets, subject levels & official transcripts', category: 'academic', icon: Award, gradient: 'from-emerald-600 to-teal-600', badge: 'PDF' },
          { id: 'exam-seating', label: 'Exam Seating & Card', desc: 'Personal exam hall allocation & student smart ID card', category: 'operations', icon: Grid, gradient: 'from-indigo-600 to-purple-600' },
          { id: 'sports', label: 'Sports & Clubs', desc: 'House athletics, extracurricular teams & events', category: 'campus', icon: Trophy, gradient: 'from-green-600 to-emerald-600' },
          { id: 'textbooks', label: 'My Textbooks', desc: 'Issued textbooks, digital study e-books & guides', category: 'operations', icon: BookMarked, gradient: 'from-teal-600 to-cyan-600' },
          { id: 'timetable', label: 'Weekly Timetable', desc: 'Classroom periods, room numbers & educator timetable', category: 'operations', icon: Clock, gradient: 'from-sky-600 to-blue-600' },
          { id: 'calendar', label: 'School Calendar', desc: 'Academic terms, test weeks & school holidays', category: 'campus', icon: Calendar, gradient: 'from-violet-600 to-indigo-600' },
          { id: 'announcements', label: 'Announcements', desc: 'School alerts, sports updates & event notices', category: 'campus', icon: Megaphone, gradient: 'from-fuchsia-600 to-purple-600' },
          { id: 'messages', label: 'Teacher Messages', desc: 'Direct private chats with subject teachers', category: 'chat', icon: MessageSquare, gradient: 'from-brand-600 to-cyan-600', badge: 'CHAT' },
        ];
    }
  };

  const modules = useMemo(() => getRoleModules(), [role]);

  const filteredModules = useMemo(() => {
    let list = modules;
    if (category !== 'all') {
      list = list.filter((m) => m.category === category);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (m) => m.label.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q)
      );
    }
    return list;
  }, [modules, category, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 md:left-72 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-5xl max-h-[92vh] rounded-3xl bg-surface-dark/95 border border-brand-500/30 p-5 md:p-7 shadow-2xl shadow-brand-500/10 flex flex-col overflow-hidden mx-auto">
        {/* Glow Auras */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-brand-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-cyan-400 p-0.5 shadow-glow-cyan flex items-center justify-center shrink-0">
              <div className="w-full h-full rounded-[14px] bg-slate-950/80 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-cyan-300 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg md:text-xl font-black font-display text-white tracking-tight">
                  Main Navigation Menu
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-brand-500/20 border border-brand-500/40 text-brand-300 text-[10px] font-mono font-extrabold uppercase">
                  {role} Hub
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Launch any workspace module or switch view presentation mode.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search modules..."
                className="w-full pl-9 pr-3 py-1.5 bg-surface-darker/90 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 🌟 VIEW MODE SELECTOR (Launchpad Grid / Detailed Cards / Compact List) */}
            <div className="flex items-center p-1 rounded-xl bg-surface-darker border border-white/10 shrink-0">
              <button
                onClick={() => handleSetViewMode('launchpad')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === 'launchpad'
                    ? 'bg-brand-600 text-white shadow-glow-indigo'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Launchpad App Icon Grid"
              >
                <Grid className="w-4 h-4" />
                <span className="text-[10px] hidden md:inline">Icons</span>
              </button>

              <button
                onClick={() => handleSetViewMode('cards')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === 'cards'
                    ? 'bg-brand-600 text-white shadow-glow-indigo'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Detailed Feature Cards"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="text-[10px] hidden md:inline">Cards</span>
              </button>

              <button
                onClick={() => handleSetViewMode('list')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === 'list'
                    ? 'bg-brand-600 text-white shadow-glow-indigo'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Compact List View"
              >
                <List className="w-4 h-4" />
                <span className="text-[10px] hidden md:inline">List</span>
              </button>
            </div>

            {/* Close Modal Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              title="Close Menu (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 pt-3 pb-2 overflow-x-auto custom-scrollbar shrink-0 text-xs">
          <span className="text-slate-500 font-mono text-[10px] uppercase font-bold flex items-center gap-1 shrink-0">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          {[
            { id: 'all', label: 'All Modules' },
            { id: 'academic', label: 'Academics & AI' },
            { id: 'operations', label: 'School Operations' },
            { id: 'campus', label: 'Campus & Events' },
            { id: 'chat', label: 'Communications' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id as CategoryFilter)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 ${
                category === cat.id
                  ? 'bg-white/15 text-cyan-300 border border-cyan-400/40 shadow-glow-cyan'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* 🌟 MAIN MODULES PRESENTATION (3 View Modes) */}
        <div className="mt-3 flex-1 overflow-y-auto custom-scrollbar pr-1">
          {/* ======================================================== */}
          {/* MODE 1: LAUNCHPAD APP ICON GRID (iOS / macOS Style)      */}
          {/* ======================================================== */}
          {viewMode === 'launchpad' && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4 p-2">
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
                    className={`group relative flex flex-col items-center justify-center p-3.5 rounded-3xl text-center border transition-all duration-300 hover:scale-105 active:scale-95 ${
                      isActive
                        ? 'bg-brand-600/20 border-cyan-400 shadow-glow-cyan'
                        : 'bg-surface-darker/60 hover:bg-surface-darker/90 border-white/5 hover:border-white/20'
                    }`}
                  >
                    {item.badge && (
                      <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-white/20 text-white font-mono font-black text-[8px] uppercase tracking-wider">
                        {item.badge}
                      </span>
                    )}

                    <div
                      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl bg-gradient-to-tr ${item.gradient} text-white flex items-center justify-center shadow-xl group-hover:shadow-2xl group-hover:scale-110 transition-all duration-300 relative`}
                    >
                      <Icon className="w-7 h-7 sm:w-8 sm:h-8 drop-shadow-md" />
                      {isActive && (
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-cyan-400 ring-2 ring-slate-900 flex items-center justify-center">
                          <CheckCircle2 className="w-3 h-3 text-slate-950" />
                        </span>
                      )}
                    </div>

                    <span className="text-xs font-black text-white mt-2.5 line-clamp-1 group-hover:text-cyan-300 transition-colors font-display">
                      {item.label}
                    </span>
                    <span className="text-[10px] text-slate-400 capitalize line-clamp-1 mt-0.5">
                      {item.category}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* ======================================================== */}
          {/* MODE 2: DETAILED FEATURE CARDS (Card Grid)               */}
          {/* ======================================================== */}
          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 p-1">
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

                      <h4 className="text-sm font-black text-white mt-3 group-hover:text-cyan-300 transition-colors font-display">
                        {item.label}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug line-clamp-2">
                        {item.desc}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between pt-2 border-t border-white/5 text-[10px] text-slate-400 group-hover:text-cyan-300 font-bold">
                      <span className="capitalize">{item.category} Module</span>
                      <ChevronRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* ======================================================== */}
          {/* MODE 3: COMPACT LIST VIEW                                */}
          {/* ======================================================== */}
          {viewMode === 'list' && (
            <div className="space-y-2 p-1">
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
                    className={`group w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${
                      isActive
                        ? 'bg-brand-600/30 border-cyan-400 text-white shadow-glow-cyan'
                        : 'bg-surface-darker/70 hover:bg-surface-darker border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${item.gradient} text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-white truncate group-hover:text-cyan-300">
                            {item.label}
                          </h4>
                          {item.badge && (
                            <span className="px-1.5 py-0.2 rounded bg-white/10 text-white font-mono text-[8px] font-bold">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          {item.desc}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pl-2">
                      <span className="text-[9px] font-mono text-slate-500 uppercase font-bold hidden sm:inline">
                        {item.category}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-300 group-hover:translate-x-1 transition-all" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {filteredModules.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm font-bold text-slate-300">No modules found matching "{searchQuery}"</p>
              <p className="text-xs text-slate-500 mt-1">Try searching for subjects, marks, reports, or calendar.</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-medium">{filteredModules.length} Modules Active</span>
          </div>
          <span className="font-mono text-[10px] text-slate-500 hidden sm:inline">
            Press ESC or click anywhere outside to close
          </span>
        </div>
      </div>
    </div>
  );
};
