import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  Home,
  MessageSquare,
  Calendar,
  User,
  Settings,
  Compass,
  MoreHorizontal,
} from 'lucide-react';
import { getProfilePictureUrl } from '../../utils/imageUrl';
import { getPrimaryTabFromActive } from '../teacher/TeacherNavigationBar';

interface BottomNavigationDockProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  onOpenMainMenu?: () => void;
  isMainMenuOpen?: boolean;
}

export const BottomNavigationDock: React.FC<BottomNavigationDockProps> = ({
  activeTab,
  onSelectTab,
}) => {
  const { user } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState<number>(0);

  // Poll unread messages for live badge on bottom dock
  useEffect(() => {
    let isMounted = true;
    const fetchUnread = async () => {
      try {
        const res = await api.get('/messages/unread-count');
        if (isMounted && res.data && typeof res.data.count === 'number') {
          setUnreadMessages(res.data.count);
        }
      } catch (_) {}
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 20000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const isTeacher = user?.role === 'teacher';
  const primaryTeacherTab = isTeacher ? getPrimaryTabFromActive(activeTab) : null;

  return (
    <div className="fixed bottom-3 inset-x-0 md:left-72 z-40 flex justify-center items-center pointer-events-none select-none animate-bounce-in px-2 sm:px-4">
      <div 
        data-theme-preserve="true" 
        className="pointer-events-auto relative flex items-center justify-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-2xl md:rounded-full bg-[#0B1120]/95 backdrop-blur-2xl border border-white/15 shadow-2xl shadow-black/80 ring-1 ring-white/10 max-w-full"
      >
        {/* Subtle glowing underlay */}
        <div className="absolute -inset-0.5 rounded-2xl md:rounded-full bg-gradient-to-r from-indigo-500/20 via-cyan-500/20 to-indigo-500/20 blur-md -z-10 pointer-events-none" />

        {isTeacher ? (
          /* ================================================================= */
          /* 🎓 TEACHER NAVIGATION BAR (Home, Calendar, Profile, Discover, Messages, More) */
          /* ================================================================= */
          <>
            {/* 1. Home (Subjects) */}
            <button
              onClick={() => onSelectTab('overview')}
              className={`group relative flex flex-col items-center justify-center px-2.5 py-1.5 rounded-xl transition-all duration-300 cursor-pointer ${
                primaryTeacherTab === 'home'
                  ? 'text-cyan-400 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title="Home (Teaching Subjects)"
            >
              {primaryTeacherTab === 'home' && (
                <div className="absolute inset-0 rounded-xl bg-cyan-500/20 border border-cyan-400/40 shadow-[0_0_12px_rgba(6,182,212,0.3)] -z-10 animate-fade-in" />
              )}
              {primaryTeacherTab === 'home' && (
                <div className="absolute -top-1 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee] animate-pulse" />
              )}
              <Home className="w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform duration-300 group-hover:scale-115 group-hover:-translate-y-0.5" />
              <span className="text-[9px] sm:text-[10px] tracking-tight mt-0.5">Home</span>
            </button>

            {/* 2. Calendar */}
            <button
              onClick={() => onSelectTab('calendar')}
              className={`group relative flex flex-col items-center justify-center px-2.5 py-1.5 rounded-xl transition-all duration-300 cursor-pointer ${
                primaryTeacherTab === 'calendar'
                  ? 'text-cyan-400 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title="Educator Calendar & Timetable"
            >
              {primaryTeacherTab === 'calendar' && (
                <div className="absolute inset-0 rounded-xl bg-cyan-500/20 border border-cyan-400/40 shadow-[0_0_12px_rgba(6,182,212,0.3)] -z-10 animate-fade-in" />
              )}
              {primaryTeacherTab === 'calendar' && (
                <div className="absolute -top-1 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee] animate-pulse" />
              )}
              <Calendar className="w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform duration-300 group-hover:scale-115 group-hover:-translate-y-0.5" />
              <span className="text-[9px] sm:text-[10px] tracking-tight mt-0.5">Calendar</span>
            </button>

            {/* 3. Profile */}
            <button
              onClick={() => onSelectTab('profile')}
              className={`group relative flex flex-col items-center justify-center px-2.5 py-1.5 rounded-xl transition-all duration-300 cursor-pointer ${
                primaryTeacherTab === 'profile'
                  ? 'text-cyan-400 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title="Teacher Profile"
            >
              {primaryTeacherTab === 'profile' && (
                <div className="absolute inset-0 rounded-xl bg-cyan-500/20 border border-cyan-400/40 shadow-[0_0_12px_rgba(6,182,212,0.3)] -z-10 animate-fade-in" />
              )}
              {primaryTeacherTab === 'profile' && (
                <div className="absolute -top-1 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee] animate-pulse" />
              )}
              <div className="w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full bg-white/10 flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-115 group-hover:-translate-y-0.5">
                {(user?.profile_picture || user?.profile_picture_path) ? (
                  <img
                    src={getProfilePictureUrl(user.profile_picture || user.profile_picture_path)}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                  />
                ) : (
                  <User className="w-3.5 h-3.5" />
                )}
              </div>
              <span className="text-[9px] sm:text-[10px] tracking-tight mt-0.5">Profile</span>
            </button>

            {/* 4. Discover */}
            <button
              onClick={() => onSelectTab('discover')}
              className={`group relative flex flex-col items-center justify-center px-2.5 py-1.5 rounded-xl transition-all duration-300 cursor-pointer ${
                primaryTeacherTab === 'discover'
                  ? 'text-cyan-400 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title="Discover Resources & AI Studio"
            >
              {primaryTeacherTab === 'discover' && (
                <div className="absolute inset-0 rounded-xl bg-cyan-500/20 border border-cyan-400/40 shadow-[0_0_12px_rgba(6,182,212,0.3)] -z-10 animate-fade-in" />
              )}
              {primaryTeacherTab === 'discover' && (
                <div className="absolute -top-1 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee] animate-pulse" />
              )}
              <Compass className="w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform duration-300 group-hover:scale-115 group-hover:-translate-y-0.5" />
              <span className="text-[9px] sm:text-[10px] tracking-tight mt-0.5">Discover</span>
            </button>

            {/* 5. Messages */}
            <button
              onClick={() => onSelectTab('messages')}
              className={`group relative flex flex-col items-center justify-center px-2.5 py-1.5 rounded-xl transition-all duration-300 cursor-pointer ${
                primaryTeacherTab === 'messages'
                  ? 'text-cyan-400 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title="Communication Hub"
            >
              {primaryTeacherTab === 'messages' && (
                <div className="absolute inset-0 rounded-xl bg-cyan-500/20 border border-cyan-400/40 shadow-[0_0_12px_rgba(6,182,212,0.3)] -z-10 animate-fade-in" />
              )}
              {primaryTeacherTab === 'messages' && (
                <div className="absolute -top-1 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee] animate-pulse" />
              )}
              <div className="relative">
                <MessageSquare className="w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform duration-300 group-hover:scale-115 group-hover:-translate-y-0.5" />
                {unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-2 px-1 min-w-[14px] h-3.5 rounded-full bg-rose-500 text-white text-[8px] font-black flex items-center justify-center ring-2 ring-surface-darker animate-pulse">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </div>
              <span className="text-[9px] sm:text-[10px] tracking-tight mt-0.5">Messages</span>
            </button>

            {/* 6. More */}
            <button
              onClick={() => onSelectTab('more')}
              className={`group relative flex flex-col items-center justify-center px-2.5 py-1.5 rounded-xl transition-all duration-300 cursor-pointer ${
                primaryTeacherTab === 'more'
                  ? 'text-cyan-400 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title="More Modules & Functions"
            >
              {primaryTeacherTab === 'more' && (
                <div className="absolute inset-0 rounded-xl bg-cyan-500/20 border border-cyan-400/40 shadow-[0_0_12px_rgba(6,182,212,0.3)] -z-10 animate-fade-in" />
              )}
              {primaryTeacherTab === 'more' && (
                <div className="absolute -top-1 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee] animate-pulse" />
              )}
              <MoreHorizontal className="w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform duration-300 group-hover:scale-115 group-hover:-translate-y-0.5" />
              <span className="text-[9px] sm:text-[10px] tracking-tight mt-0.5">More</span>
            </button>
          </>
        ) : (
          /* ================================================================= */
          /* DEFAULT NON-TEACHER NAVIGATION DOCK                               */
          /* ================================================================= */
          <>
            {/* 1. Home / Overview Shortcut */}
            <button
              onClick={() => onSelectTab('overview')}
              className={`flex flex-col items-center justify-center p-2 rounded-full transition-all duration-200 ${
                activeTab === 'overview'
                  ? 'text-cyan-400 bg-white/10 shadow-glow-cyan'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title="Home Dashboard"
            >
              <Home className="w-5 h-5" />
              <span className="text-[9px] font-bold mt-0.5 hidden sm:block">Home</span>
            </button>

            {/* 2. Calendar / Timetable Shortcut */}
            <button
              onClick={() => onSelectTab('calendar')}
              className={`flex flex-col items-center justify-center p-2 rounded-full transition-all duration-200 ${
                activeTab === 'calendar' || activeTab === 'timetable'
                  ? 'text-cyan-400 bg-white/10 shadow-glow-cyan'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title="Calendar & Timetable"
            >
              <Calendar className="w-5 h-5" />
              <span className="text-[9px] font-bold mt-0.5 hidden sm:block">Calendar</span>
            </button>

            {/* 🌟 3. PROMINENT CENTER MY PROFILE BUTTON */}
            <div className="relative px-1 sm:px-2">
              <button
                onClick={() => onSelectTab('profile')}
                className={`group relative flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-indigo-600 via-brand-600 to-cyan-500 text-white font-extrabold text-xs shadow-lg shadow-indigo-500/40 hover:shadow-cyan-500/50 hover:scale-105 active:scale-95 transition-all duration-200 border border-white/25 ${
                  activeTab === 'profile' ? 'ring-4 ring-cyan-400/50 scale-105' : ''
                }`}
                title="My Profile & Account"
              >
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 overflow-hidden relative">
                  <User className="w-3.5 h-3.5 text-white select-none" />
                  {(user?.profile_picture || user?.profile_picture_path) && (
                    <img
                      src={getProfilePictureUrl(user.profile_picture || user.profile_picture_path)}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                    />
                  )}
                </div>
                <span className="tracking-wide uppercase font-display font-black text-[11px] sm:text-xs">
                  My Profile
                </span>
              </button>
            </div>

            {/* 4. Messages / Chat Shortcut */}
            <button
              onClick={() => onSelectTab('messages')}
              className={`relative flex flex-col items-center justify-center p-2 rounded-full transition-all duration-200 ${
                activeTab === 'messages'
                  ? 'text-cyan-400 bg-white/10 shadow-glow-cyan'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title="Messages & Chat"
            >
              <MessageSquare className="w-5 h-5" />
              {unreadMessages > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-surface-darker animate-pulse">
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </span>
              )}
              <span className="text-[9px] font-bold mt-0.5 hidden sm:block">Chat</span>
            </button>

            {/* 5. Settings Shortcut */}
            <button
              onClick={() => onSelectTab('settings')}
              className={`flex flex-col items-center justify-center p-2 rounded-full transition-all duration-200 ${
                activeTab === 'settings'
                  ? 'text-cyan-400 bg-white/10 shadow-glow-cyan'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title="App & Technical Settings"
            >
              <Settings className="w-5 h-5" />
              <span className="text-[9px] font-bold mt-0.5 hidden sm:block">Settings</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
