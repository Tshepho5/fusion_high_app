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

  // Reusable Downward Spotlight Glow
  const renderSpotlightGlow = (isActive: boolean) => {
    if (!isActive) return null;
    return (
      <>
        {/* 1. Top Glowing Horizontal Light Bar Emitter */}
        <div className="absolute -top-[1.5px] left-1/2 -translate-x-1/2 w-7 sm:w-9 h-[2.5px] sm:h-[3px] rounded-full bg-indigo-600 dark:bg-cyan-300 shadow-[0_0_8px_rgba(79,70,229,0.5)] dark:shadow-[0_0_8px_#38bdf8,0_0_16px_#22d3ee,0_0_24px_#06b6d4] z-20" />

        {/* 2. Downward Projector Light Beam Cone */}
        <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden rounded-xl">
          <div
            className="w-full h-full bg-gradient-to-b from-indigo-500/20 via-indigo-500/10 to-transparent dark:from-cyan-400/45 dark:via-cyan-500/20 dark:to-transparent blur-[1.5px]"
            style={{
              clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)',
            }}
          />
          {/* Ambient Diffuse Core Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-8 bg-indigo-500/15 dark:bg-cyan-400/30 blur-md rounded-full pointer-events-none" />
        </div>
      </>
    );
  };

  return (
    <div className="fixed bottom-3 inset-x-0 md:left-72 z-40 flex justify-center items-center pointer-events-none select-none animate-bounce-in px-2 sm:px-4">
      <div 
        className="pointer-events-auto relative flex items-center justify-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-2xl md:rounded-full bg-white/95 dark:bg-[#0B1120]/95 backdrop-blur-2xl border border-slate-200/90 dark:border-white/15 shadow-2xl shadow-slate-900/15 dark:shadow-black/80 ring-1 ring-slate-900/5 dark:ring-white/10 max-w-full transition-all duration-300"
      >
        {/* Subtle ambient underlay */}
        <div className="absolute -inset-0.5 rounded-2xl md:rounded-full bg-gradient-to-r from-indigo-500/15 via-cyan-500/15 to-indigo-500/15 dark:from-indigo-500/20 dark:via-cyan-500/20 dark:to-indigo-500/20 blur-md -z-10 pointer-events-none" />

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
                  ? 'text-indigo-600 dark:text-cyan-400 font-bold'
                  : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5'
              }`}
              title="Home (Teaching Subjects)"
            >
              {renderSpotlightGlow(primaryTeacherTab === 'home')}
              <Home className={`w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform duration-300 ${primaryTeacherTab === 'home' ? 'text-indigo-600 dark:text-cyan-300 scale-110 drop-shadow-[0_2px_8px_rgba(79,70,229,0.35)] dark:drop-shadow-[0_0_8px_rgba(34,211,238,0.7)]' : 'group-hover:scale-115 group-hover:-translate-y-0.5'}`} />
              <span className={`text-[9px] sm:text-[10px] tracking-tight mt-0.5 ${primaryTeacherTab === 'home' ? 'text-indigo-600 dark:text-cyan-300 font-black' : 'font-semibold'}`}>Home</span>
            </button>

            {/* 2. Calendar */}
            <button
              onClick={() => onSelectTab('calendar')}
              className={`group relative flex flex-col items-center justify-center px-2.5 py-1.5 rounded-xl transition-all duration-300 cursor-pointer ${
                primaryTeacherTab === 'calendar'
                  ? 'text-indigo-600 dark:text-cyan-400 font-bold'
                  : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5'
              }`}
              title="Educator Calendar & Timetable"
            >
              {renderSpotlightGlow(primaryTeacherTab === 'calendar')}
              <Calendar className={`w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform duration-300 ${primaryTeacherTab === 'calendar' ? 'text-indigo-600 dark:text-cyan-300 scale-110 drop-shadow-[0_2px_8px_rgba(79,70,229,0.35)] dark:drop-shadow-[0_0_8px_rgba(34,211,238,0.7)]' : 'group-hover:scale-115 group-hover:-translate-y-0.5'}`} />
              <span className={`text-[9px] sm:text-[10px] tracking-tight mt-0.5 ${primaryTeacherTab === 'calendar' ? 'text-indigo-600 dark:text-cyan-300 font-black' : 'font-semibold'}`}>Calendar</span>
            </button>

            {/* 3. Profile */}
            <button
              onClick={() => onSelectTab('profile')}
              className={`group relative flex flex-col items-center justify-center px-2.5 py-1.5 rounded-xl transition-all duration-300 cursor-pointer ${
                primaryTeacherTab === 'profile'
                  ? 'text-indigo-600 dark:text-cyan-400 font-bold'
                  : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5'
              }`}
              title="Teacher Profile"
            >
              {renderSpotlightGlow(primaryTeacherTab === 'profile')}
              <div className={`w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center overflow-hidden transition-transform duration-300 ${primaryTeacherTab === 'profile' ? 'ring-2 ring-indigo-600 dark:ring-cyan-400 shadow-[0_0_8px_rgba(79,70,229,0.5)] dark:shadow-[0_0_8px_#22d3ee]' : 'group-hover:scale-115 group-hover:-translate-y-0.5'}`}>
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
              <span className={`text-[9px] sm:text-[10px] tracking-tight mt-0.5 ${primaryTeacherTab === 'profile' ? 'text-indigo-600 dark:text-cyan-300 font-black' : 'font-semibold'}`}>Profile</span>
            </button>

            {/* 4. Discover */}
            <button
              onClick={() => onSelectTab('discover')}
              className={`group relative flex flex-col items-center justify-center px-2.5 py-1.5 rounded-xl transition-all duration-300 cursor-pointer ${
                primaryTeacherTab === 'discover'
                  ? 'text-indigo-600 dark:text-cyan-400 font-bold'
                  : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5'
              }`}
              title="Discover Resources & AI Studio"
            >
              {renderSpotlightGlow(primaryTeacherTab === 'discover')}
              <Compass className={`w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform duration-300 ${primaryTeacherTab === 'discover' ? 'text-indigo-600 dark:text-cyan-300 scale-110 drop-shadow-[0_2px_8px_rgba(79,70,229,0.35)] dark:drop-shadow-[0_0_8px_rgba(34,211,238,0.7)]' : 'group-hover:scale-115 group-hover:-translate-y-0.5'}`} />
              <span className={`text-[9px] sm:text-[10px] tracking-tight mt-0.5 ${primaryTeacherTab === 'discover' ? 'text-indigo-600 dark:text-cyan-300 font-black' : 'font-semibold'}`}>Discover</span>
            </button>

            {/* 5. Messages */}
            <button
              onClick={() => onSelectTab('messages')}
              className={`group relative flex flex-col items-center justify-center px-2.5 py-1.5 rounded-xl transition-all duration-300 cursor-pointer ${
                primaryTeacherTab === 'messages'
                  ? 'text-indigo-600 dark:text-cyan-400 font-bold'
                  : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5'
              }`}
              title="Communication Hub"
            >
              {renderSpotlightGlow(primaryTeacherTab === 'messages')}
              <div className="relative">
                <MessageSquare className={`w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform duration-300 ${primaryTeacherTab === 'messages' ? 'text-indigo-600 dark:text-cyan-300 scale-110 drop-shadow-[0_2px_8px_rgba(79,70,229,0.35)] dark:drop-shadow-[0_0_8px_rgba(34,211,238,0.7)]' : 'group-hover:scale-115 group-hover:-translate-y-0.5'}`} />
                {unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-2 px-1 min-w-[14px] h-3.5 rounded-full bg-rose-500 text-white text-[8px] font-black flex items-center justify-center ring-2 ring-white dark:ring-surface-darker animate-pulse shadow-sm">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </div>
              <span className={`text-[9px] sm:text-[10px] tracking-tight mt-0.5 ${primaryTeacherTab === 'messages' ? 'text-indigo-600 dark:text-cyan-300 font-black' : 'font-semibold'}`}>Messages</span>
            </button>

            {/* 6. More */}
            <button
              onClick={() => onSelectTab('more')}
              className={`group relative flex flex-col items-center justify-center px-2.5 py-1.5 rounded-xl transition-all duration-300 cursor-pointer ${
                primaryTeacherTab === 'more'
                  ? 'text-indigo-600 dark:text-cyan-400 font-bold'
                  : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5'
              }`}
              title="More Modules & Functions"
            >
              {renderSpotlightGlow(primaryTeacherTab === 'more')}
              <MoreHorizontal className={`w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform duration-300 ${primaryTeacherTab === 'more' ? 'text-indigo-600 dark:text-cyan-300 scale-110 drop-shadow-[0_2px_8px_rgba(79,70,229,0.35)] dark:drop-shadow-[0_0_8px_rgba(34,211,238,0.7)]' : 'group-hover:scale-115 group-hover:-translate-y-0.5'}`} />
              <span className={`text-[9px] sm:text-[10px] tracking-tight mt-0.5 ${primaryTeacherTab === 'more' ? 'text-indigo-600 dark:text-cyan-300 font-black' : 'font-semibold'}`}>More</span>
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
              className={`group relative flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 cursor-pointer ${
                activeTab === 'overview'
                  ? 'text-indigo-600 dark:text-cyan-400 font-bold'
                  : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5'
              }`}
              title="Home Dashboard"
            >
              {renderSpotlightGlow(activeTab === 'overview')}
              <Home className="w-5 h-5" />
              <span className="text-[9px] font-bold mt-0.5 hidden sm:block">Home</span>
            </button>

            {/* 2. Calendar / Timetable Shortcut */}
            <button
              onClick={() => onSelectTab('calendar')}
              className={`group relative flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 cursor-pointer ${
                activeTab === 'calendar' || activeTab === 'timetable'
                  ? 'text-indigo-600 dark:text-cyan-400 font-bold'
                  : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5'
              }`}
              title="Calendar & Timetable"
            >
              {renderSpotlightGlow(activeTab === 'calendar' || activeTab === 'timetable')}
              <Calendar className="w-5 h-5" />
              <span className="text-[9px] font-bold mt-0.5 hidden sm:block">Calendar</span>
            </button>

            {/* 🌟 3. PROMINENT CENTER MY PROFILE BUTTON */}
            <div className="relative px-1 sm:px-2">
              <button
                onClick={() => onSelectTab('profile')}
                className={`group relative flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-indigo-600 via-brand-600 to-cyan-500 text-white font-extrabold text-xs shadow-lg shadow-indigo-500/40 hover:shadow-cyan-500/50 hover:scale-105 active:scale-95 transition-all duration-200 border border-white/25 cursor-pointer ${
                  activeTab === 'profile' ? 'ring-4 ring-indigo-400/50 dark:ring-cyan-400/50 scale-105' : ''
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
              className={`group relative flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 cursor-pointer ${
                activeTab === 'messages'
                  ? 'text-indigo-600 dark:text-cyan-400 font-bold'
                  : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5'
              }`}
              title="Messages & Chat"
            >
              {renderSpotlightGlow(activeTab === 'messages')}
              <div className="relative">
                <MessageSquare className="w-5 h-5" />
                {unreadMessages > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white dark:ring-surface-darker animate-pulse shadow-sm">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </div>
              <span className="text-[9px] font-bold mt-0.5 hidden sm:block">Chat</span>
            </button>

            {/* 5. Settings Shortcut */}
            <button
              onClick={() => onSelectTab('settings')}
              className={`group relative flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 cursor-pointer ${
                activeTab === 'settings'
                  ? 'text-indigo-600 dark:text-cyan-400 font-bold'
                  : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5'
              }`}
              title="App & Technical Settings"
            >
              {renderSpotlightGlow(activeTab === 'settings')}
              <Settings className="w-5 h-5" />
              <span className="text-[9px] font-bold mt-0.5 hidden sm:block">Settings</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
