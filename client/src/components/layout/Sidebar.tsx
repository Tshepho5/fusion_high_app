import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { getProfilePictureUrl } from '../../utils/imageUrl';
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
  LogOut,
  X,
  User,
  GraduationCap,
  Calendar,
  Home,
  FileText,
  Compass,
  Grid,
  Trophy,
  BookMarked,
  UserCheck
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpen,
  onClose,
}) => {
  const { user, role, logout } = useAuth();

  const getNavItems = () => {
    switch (role) {
      case 'teacher':
        return [
          { id: 'overview', label: 'Educator Analytics', icon: LayoutDashboard },
          { id: 'subjects', label: 'My Subjects', icon: BookOpen },
          { id: 'classes', label: 'Class Registers & Marks', icon: Users },
          { id: 'ai-tools', label: 'AI Lesson & Test Builder', icon: FusionAIIcon, badge: 'AI' },
          { id: 'ptc', label: 'Parent Conferences (PTC)', icon: Users },
          { id: 'conduct', label: 'Merits & Conduct', icon: Award },
          { id: 'my-leave', label: 'Leave & Relief Duty', icon: UserCheck },
          { id: 'exam-seating', label: 'Exam Seating Planner', icon: Grid },
          { id: 'sports', label: 'Sports & Clubs', icon: Trophy },
          { id: 'textbooks', label: 'Textbook Inventory', icon: BookMarked },
          { id: 'timetable', label: 'Teacher Timetable', icon: Clock },
          { id: 'calendar', label: 'School Calendar', icon: Calendar },
          { id: 'announcements', label: 'Announcements', icon: Megaphone },
          { id: 'messages', label: 'Communication Hub', icon: MessageSquare },
          { id: 'profile', label: 'Teacher Profile', icon: User },
        ];
      case 'admin':
        return [
          { id: 'overview', label: 'School Analytics', icon: LayoutDashboard },
          { id: 'users', label: 'User Directory', icon: Users },
          { id: 'matric-projector', label: 'Matric Pass Projector', icon: GraduationCap, badge: 'Gr12' },
          { id: 'leave-relief', label: 'Staff Leave & Relief', icon: UserCheck },
          { id: 'timetable', label: 'Timetable Master', icon: Clock },
          { id: 'exam-seating', label: 'Exam Seating Master', icon: Grid },
          { id: 'sports', label: 'Sports & Clubs Hub', icon: Trophy },
          { id: 'textbooks', label: 'Textbook Inventory', icon: BookMarked },
          { id: 'calendar', label: 'School Calendar', icon: Calendar },
          { id: 'announcements', label: 'Broadcast Notices', icon: Megaphone },
          { id: 'messages', label: 'School Chat Hub', icon: MessageSquare },
          { id: 'profile', label: 'Admin Settings', icon: User },
        ];
      case 'parent':
        return [
          { id: 'overview', label: 'Family Portal', icon: LayoutDashboard },
          { id: 'children', label: 'Linked Learners', icon: GraduationCap },
          { id: 'reports', label: 'CAPS Report Cards', icon: Award, badge: 'PDF' },
          { id: 'ptc', label: 'Parent Conferences (PTC)', icon: Users },
          { id: 'sports', label: 'Sports & Fixtures', icon: Trophy },
          { id: 'timetable', label: 'Child Timetable', icon: Clock },
          { id: 'calendar', label: 'School Calendar', icon: Calendar },
          { id: 'attendance', label: 'Attendance Records', icon: CalendarCheck },
          { id: 'announcements', label: 'School Notices', icon: Megaphone },
          { id: 'messages', label: 'Teacher Chat', icon: MessageSquare },
          { id: 'profile', label: 'Parent Profile', icon: User },
        ];
      case 'learner':
      default:
        return [
          { id: 'overview', label: 'Home', icon: Home },
          { id: 'subjects', label: 'My Subjects', icon: BookOpen },
          { id: 'career-advisor', label: 'Matric APS & Careers', icon: Compass, badge: 'APS' },
          { id: 'exam-seating', label: 'Exam Seating & Cards', icon: Grid },
          { id: 'sports', label: 'Sports & Clubs', icon: Trophy },
          { id: 'textbooks', label: 'My Textbooks', icon: BookMarked },
          { id: 'reports', label: 'CAPS Report Card', icon: Award, badge: 'PDF' },
          { id: 'timetable', label: 'Weekly Timetable', icon: Clock },
          { id: 'calendar', label: 'School Calendar', icon: Calendar },
          { id: 'announcements', label: 'Announcements', icon: Megaphone },
          { id: 'messages', label: 'Message Center', icon: MessageSquare },
          { id: 'profile', label: 'Learner Profile', icon: User },
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md md:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Sidebar Aside */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 h-full min-h-screen md:h-screen md:sticky md:top-0 flex-col border-r border-white/10 bg-surface-darker/95 backdrop-blur-2xl transition-transform duration-300 ease-in-out md:translate-x-0 select-none shadow-xl ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-20 items-center justify-between px-5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 p-1 border border-white/15 shadow-glow-indigo shrink-0">
              <img src="/assets/FH.png" alt="Fusion High Logo" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <span className="font-display text-base font-extrabold tracking-tight text-white block truncate leading-tight">
                FUSION HIGH
              </span>
              <span className="text-[8.5px] font-mono uppercase tracking-wider text-cyan-400 font-bold block truncate">
                ONE SCHOOL • ONE CONNECTION
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 md:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Quick Info Box with Rich Glow & Hover */}
        <div className="mx-4 my-3 p-3 rounded-2xl bg-surface-dark/90 border border-white/10 hover:border-brand-500/40 transition-all duration-300 hover:shadow-glow-indigo flex items-center gap-3 group shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600/40 to-cyan-500/40 border border-brand-500/30 flex items-center justify-center text-white font-bold text-sm overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
            {user?.profile_picture_path ? (
              <img src={getProfilePictureUrl(user.profile_picture_path)} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
              {user?.full_name || user?.name || user?.email || 'User'}
            </p>
            <p className="text-[10px] text-brand-400 capitalize font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {role} Workspace
            </p>
          </div>
        </div>

        {/* Navigation List with Scrolling and Clean Padding */}
        <nav className="flex-1 overflow-y-auto min-h-0 px-3.5 py-2 space-y-1.5 custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onClose();
                }}
                className={`group relative flex w-full items-center justify-between rounded-2xl px-4 py-3 text-xs font-semibold transition-all duration-200 overflow-hidden ${
                  isActive
                    ? 'bg-gradient-to-r from-brand-600 via-brand-500 to-indigo-600 text-white shadow-glow-indigo-lg font-bold border border-brand-400/40 translate-x-1'
                    : 'text-slate-400 hover:text-white hover:bg-gradient-to-r hover:from-white/10 hover:via-brand-600/15 hover:to-cyan-600/10 hover:border hover:border-brand-500/30 hover:shadow-glow-indigo hover:translate-x-1.5'
                }`}
              >
                {/* Left Active/Hover Glowing Pill Indicator */}
                {isActive ? (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-7 bg-white rounded-r-full shadow-[0_0_12px_#fff]" />
                ) : (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-cyan-400 rounded-r-full opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-[0_0_10px_#06B6D4]" />
                )}

                <div className="flex items-center gap-3 z-10 pl-1">
                  <Icon
                    className={`w-4 h-4 transition-all duration-200 ${
                      isActive
                        ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]'
                        : 'text-slate-400 group-hover:text-cyan-300 group-hover:drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]'
                    }`}
                  />
                  <span className="tracking-wide">{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`z-10 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider transition-all ${
                      isActive
                        ? 'bg-white/20 text-white shadow-sm'
                        : 'bg-brand-500/20 text-brand-400 border border-brand-500/30 group-hover:bg-brand-500/30 group-hover:text-cyan-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Dedicated Padded Footer with Slogan & Locked Sign Out */}
        <div className="p-4 pt-3 pb-6 border-t border-white/10 space-y-2.5 shrink-0 bg-surface-darker/95 mt-auto">
          <div className="p-2.5 rounded-xl bg-surface-dark/80 border border-white/5 text-center">
            <p className="text-[9px] font-mono text-cyan-300 font-bold tracking-tight">
              "Connecting Today, Empowering Tomorrow."
            </p>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-xs font-semibold text-rose-400 hover:text-white hover:bg-rose-600/20 hover:border hover:border-rose-500/30 hover:shadow-glow-rose hover:translate-x-1 transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
