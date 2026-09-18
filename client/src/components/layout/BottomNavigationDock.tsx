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
  Plus,
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

  // Reusable Clean Active Glow (No muddy obscuring trapezoid beam)
  const renderSpotlightGlow = (isActive: boolean) => {
    if (!isActive) return null;
    return (
      <>
        {/* 1. Top Glowing Horizontal Light Indicator */}
        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-6 sm:w-8 h-[2.5px] rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e,0_0_14px_rgba(244,63,94,0.6)] z-10" />

        {/* 2. Soft, Transparent Luminous Backdrop */}
        <div className="absolute inset-0 rounded-2xl bg-rose-500/15 border border-rose-500/25 pointer-events-none -z-10" />
      </>
    );
  };

  return (
    <div className="fixed bottom-3 inset-x-0 md:left-72 z-40 flex justify-center items-center pointer-events-none select-none animate-bounce-in px-2 sm:px-4">
      <div 
        className="pointer-events-auto relative flex items-center justify-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#131418]/95 backdrop-blur-2xl border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.65)] ring-1 ring-white/5 max-w-full transition-all duration-300"
      >
        {/* Subtle ambient underlay */}
        <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-rose-500/15 via-red-500/15 to-rose-500/15 blur-lg -z-10 pointer-events-none" />

        {isTeacher ? (
          /* ================================================================= */
          /* 🎓 TEACHER NAVIGATION BAR (Home, Calendar, Profile, Discover, Messages, More) */
          /* ================================================================= */
          <>
            {/* 1. Home (Subjects) */}
            <button
              onClick={() => onSelectTab('overview')}
              className={`group relative flex flex-col items-center justify-center px-2.5 py-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                primaryTeacherTab === 'home'
                  ? 'text-[#FF385C] font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
              title="Home (Teaching Subjects)"
            >
              {renderSpotlightGlow(primaryTeacherTab === 'home')}
              <Home className={`w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform duration-300 ${primaryTeacherTab === 'home' ? 'text-[#FF385C] scale-110 drop-shadow-[0_0_10px_rgba(255,56,92,0.85)]' : 'group-hover:scale-115 group-hover:-translate-y-0.5'}`} />
              <span className={`text-[9px] sm:text-[10px] tracking-tight mt-0.5 ${primaryTeacherTab === 'home' ? 'text-[#FF385C] font-black drop-shadow-[0_0_6px_rgba(255,56,92,0.5)]' : 'font-semibold'}`}>Home</span>
            </button>

            {/* 2. Calendar */}
            <button
              onClick={() => onSelectTab('calendar')}
              className={`group relative flex flex-col items-center justify-center px-2.5 py-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                primaryTeacherTab === 'calendar'
                  ? 'text-[#FF385C] font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
              title="Educator Calendar & Timetable"
            >
              {renderSpotlightGlow(primaryTeacherTab === 'calendar')}
              <Calendar className={`w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform duration-300 ${primaryTeacherTab === 'calendar' ? 'text-[#FF385C] scale-110 drop-shadow-[0_0_10px_rgba(255,56,92,0.85)]' : 'group-hover:scale-115 group-hover:-translate-y-0.5'}`} />
              <span className={`text-[9px] sm:text-[10px] tracking-tight mt-0.5 ${primaryTeacherTab === 'calendar' ? 'text-[#FF385C] font-black drop-shadow-[0_0_6px_rgba(255,56,92,0.5)]' : 'font-semibold'}`}>Calendar</span>
            </button>

            {/* 3. Profile */}
            <button
              onClick={() => onSelectTab('profile')}
              className={`group relative flex flex-col items-center justify-center px-2.5 py-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                primaryTeacherTab === 'profile'
                  ? 'text-[#FF385C] font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
              title="Teacher Profile"
            >
              {renderSpotlightGlow(primaryTeacherTab === 'profile')}
              <div className={`w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden transition-transform duration-300 ${primaryTeacherTab === 'profile' ? 'ring-2 ring-[#FF385C] shadow-[0_0_8px_rgba(255,56,92,0.6)]' : 'group-hover:scale-115 group-hover:-translate-y-0.5'}`}>
                {(user?.profile_picture || user?.profile_picture_path) ? (
                  <img
                    src={getProfilePictureUrl(user.profile_picture || user.profile_picture_path)}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                  />
                ) : (
                  <User className="w-3.5 h-3.5 text-slate-300" />
                )}
              </div>
              <span className={`text-[9px] sm:text-[10px] tracking-tight mt-0.5 ${primaryTeacherTab === 'profile' ? 'text-[#FF385C] font-black drop-shadow-[0_0_6px_rgba(255,56,92,0.5)]' : 'font-semibold'}`}>Profile</span>
            </button>

            {/* 4. Discover */}
            <button
              onClick={() => onSelectTab('discover')}
              className={`group relative flex flex-col items-center justify-center px-2.5 py-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                primaryTeacherTab === 'discover'
                  ? 'text-[#FF385C] font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
              title="Discover Resources & AI Studio"
            >
              {renderSpotlightGlow(primaryTeacherTab === 'discover')}
              <Compass className={`w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform duration-300 ${primaryTeacherTab === 'discover' ? 'text-[#FF385C] scale-110 drop-shadow-[0_0_10px_rgba(255,56,92,0.85)]' : 'group-hover:scale-115 group-hover:-translate-y-0.5'}`} />
              <span className={`text-[9px] sm:text-[10px] tracking-tight mt-0.5 ${primaryTeacherTab === 'discover' ? 'text-[#FF385C] font-black drop-shadow-[0_0_6px_rgba(255,56,92,0.5)]' : 'font-semibold'}`}>Discover</span>
            </button>

            {/* 5. Messages */}
            <button
              onClick={() => onSelectTab('messages')}
              className={`group relative flex flex-col items-center justify-center px-2.5 py-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                primaryTeacherTab === 'messages'
                  ? 'text-[#FF385C] font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
              title="Communication Hub"
            >
              {renderSpotlightGlow(primaryTeacherTab === 'messages')}
              <div className="relative">
                <MessageSquare className={`w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform duration-300 ${primaryTeacherTab === 'messages' ? 'text-[#FF385C] scale-110 drop-shadow-[0_0_10px_rgba(255,56,92,0.85)]' : 'group-hover:scale-115 group-hover:-translate-y-0.5'}`} />
                {unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-2 px-1 min-w-[14px] h-3.5 rounded-full bg-[#FF385C] text-white text-[8px] font-black flex items-center justify-center ring-2 ring-[#131418] animate-pulse shadow-sm">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </div>
              <span className={`text-[9px] sm:text-[10px] tracking-tight mt-0.5 ${primaryTeacherTab === 'messages' ? 'text-[#FF385C] font-black drop-shadow-[0_0_6px_rgba(255,56,92,0.5)]' : 'font-semibold'}`}>Messages</span>
            </button>

            {/* 6. More */}
            <button
              onClick={() => onSelectTab('more')}
              className={`group relative flex flex-col items-center justify-center px-2.5 py-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                primaryTeacherTab === 'more'
                  ? 'text-[#FF385C] font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
              title="More Modules & Functions"
            >
              {renderSpotlightGlow(primaryTeacherTab === 'more')}
              <MoreHorizontal className={`w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform duration-300 ${primaryTeacherTab === 'more' ? 'text-[#FF385C] scale-110 drop-shadow-[0_0_10px_rgba(255,56,92,0.85)]' : 'group-hover:scale-115 group-hover:-translate-y-0.5'}`} />
              <span className={`text-[9px] sm:text-[10px] tracking-tight mt-0.5 ${primaryTeacherTab === 'more' ? 'text-[#FF385C] font-black drop-shadow-[0_0_6px_rgba(255,56,92,0.5)]' : 'font-semibold'}`}>More</span>
            </button>
          </>
        ) : (
          /* ================================================================= */
          /* DEFAULT NON-TEACHER NAVIGATION DOCK (Learners, Parents, etc.)     */
          /* ================================================================= */
          <>
            {/* 1. Home / Overview Shortcut */}
            <button
              onClick={() => onSelectTab('overview')}
              className={`group relative flex flex-col items-center justify-center px-2.5 py-1.5 rounded-2xl transition-all duration-200 cursor-pointer ${
                activeTab === 'overview'
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
              title="Home Dashboard"
            >
              {renderSpotlightGlow(activeTab === 'overview')}
              <Home className={`w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform duration-200 ${activeTab === 'overview' ? 'text-rose-400 scale-110' : 'group-hover:scale-110'}`} />
              <span className={`text-[9px] sm:text-[10px] tracking-tight mt-0.5 ${activeTab === 'overview' ? 'text-white font-bold' : 'font-semibold'}`}>Home</span>
            </button>

            {/* 2. Calendar / Timetable Shortcut */}
            <button
              onClick={() => onSelectTab('calendar')}
              className={`group relative flex flex-col items-center justify-center px-2.5 py-1.5 rounded-2xl transition-all duration-200 cursor-pointer ${
                activeTab === 'calendar' || activeTab === 'timetable'
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
              title="Calendar & Timetable"
            >
              {renderSpotlightGlow(activeTab === 'calendar' || activeTab === 'timetable')}
              <Calendar className={`w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform duration-200 ${activeTab === 'calendar' || activeTab === 'timetable' ? 'text-rose-400 scale-110' : 'group-hover:scale-110'}`} />
              <span className={`text-[9px] sm:text-[10px] tracking-tight mt-0.5 ${activeTab === 'calendar' || activeTab === 'timetable' ? 'text-white font-bold' : 'font-semibold'}`}>Calendar</span>
            </button>

            {/* 🌟 3. CENTER MORE / MODULES BUTTON */}
            <button
              onClick={() => onSelectTab('more')}
              className={`group relative flex flex-col items-center justify-center px-2.5 py-1.5 rounded-2xl transition-all duration-200 cursor-pointer ${
                activeTab === 'more'
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
              title="More Modules & Functions"
            >
              {renderSpotlightGlow(activeTab === 'more')}
              <Plus className={`w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform duration-200 ${activeTab === 'more' ? 'text-rose-400 scale-110' : 'group-hover:scale-110'}`} />
              <span className={`text-[9px] sm:text-[10px] tracking-tight mt-0.5 ${activeTab === 'more' ? 'text-white font-bold' : 'font-semibold'}`}>More</span>
            </button>

            {/* 4. Messages / Chat Shortcut */}
            <button
              onClick={() => onSelectTab('messages')}
              className={`group relative flex flex-col items-center justify-center px-2.5 py-1.5 rounded-2xl transition-all duration-200 cursor-pointer ${
                activeTab === 'messages'
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
              title="Messages & Chat"
            >
              {renderSpotlightGlow(activeTab === 'messages')}
              <div className="relative">
                <MessageSquare className={`w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform duration-200 ${activeTab === 'messages' ? 'text-rose-400 scale-110' : 'group-hover:scale-110'}`} />
                {unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-2 px-1 min-w-[14px] h-3.5 rounded-full bg-rose-500 text-white text-[8px] font-black flex items-center justify-center ring-2 ring-[#131418] animate-pulse shadow-sm">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </div>
              <span className={`text-[9px] sm:text-[10px] tracking-tight mt-0.5 ${activeTab === 'messages' ? 'text-white font-bold' : 'font-semibold'}`}>Messages</span>
            </button>

            {/* 🌟 5. FAR RIGHT PROFILE BUTTON */}
            <button
              onClick={() => onSelectTab('profile')}
              className={`group relative flex flex-col items-center justify-center px-2.5 py-1.5 rounded-2xl transition-all duration-200 cursor-pointer ${
                activeTab === 'profile'
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
              title="My Profile & Account"
            >
              {renderSpotlightGlow(activeTab === 'profile')}
              <div className={`w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full overflow-hidden border transition-transform duration-200 flex items-center justify-center relative ${
                activeTab === 'profile'
                  ? 'border-rose-400 scale-110 ring-2 ring-rose-500/50'
                  : 'border-slate-700 group-hover:scale-110'
              }`}>
                {(user?.profile_picture || user?.profile_picture_path) ? (
                  <img
                    src={getProfilePictureUrl(user.profile_picture || user.profile_picture_path)}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                  />
                ) : (
                  <User className="w-3.5 h-3.5 text-slate-300" />
                )}
              </div>
              <span className={`text-[9px] sm:text-[10px] tracking-tight mt-0.5 ${activeTab === 'profile' ? 'text-white font-bold' : 'font-semibold'}`}>Profile</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
