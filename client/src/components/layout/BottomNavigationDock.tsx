import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  Home,
  MessageSquare,
  Calendar,
  User,
} from 'lucide-react';
import { getProfilePictureUrl } from '../../utils/imageUrl';

interface BottomNavigationDockProps {
  activeTab: string;
  onSelectTab: (tabId: string, params?: any) => void;
  onOpenMainMenu?: () => void;
  isMainMenuOpen?: boolean;
}

export const BottomNavigationDock: React.FC<BottomNavigationDockProps> = ({
  activeTab,
  onSelectTab,
  onOpenMainMenu,
  isMainMenuOpen = false,
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

  const isHomeActive = activeTab === 'overview' || activeTab === 'home';
  const isCalendarActive = activeTab === 'calendar' || activeTab === 'timetable';
  const isMessagesActive = activeTab === 'messages' || activeTab === 'announcements';
  const isProfileActive = activeTab === 'profile';
  const isMenuOpenOrActive = isMainMenuOpen || activeTab === 'more';

  // Handler for center hero button
  const handleCenterButtonClick = () => {
    if (isMenuOpenOrActive) {
      // If menu is open or on more tab, close it and return to Home page
      if (onOpenMainMenu && isMainMenuOpen) {
        onOpenMainMenu();
      }
      onSelectTab('overview');
    } else {
      // Open the Main Menu
      if (onOpenMainMenu) {
        onOpenMainMenu();
      } else {
        onSelectTab('more');
      }
    }
  };

  // Reusable Top Glow Indicator for standard tabs
  const renderSpotlightGlow = (isActive: boolean) => {
    if (!isActive) return null;
    return (
      <>
        {/* Top Glowing Horizontal Light Indicator */}
        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-6 sm:w-8 h-[2.5px] rounded-full bg-[#13C8D9] shadow-[0_0_8px_#13c8d9,0_0_14px_rgba(24,226,236,0.6)] z-10" />
        {/* Soft, Transparent Luminous Backdrop */}
        <div className="absolute inset-0 rounded-2xl bg-cyan-500/15 border border-cyan-500/25 pointer-events-none -z-10" />
      </>
    );
  };

  return (
    <div className="fixed bottom-3 inset-x-0 md:left-72 z-40 flex justify-center items-center pointer-events-none select-none animate-bounce-in px-2 sm:px-4">
      <div className="pointer-events-auto relative flex items-center justify-between sm:justify-center gap-1 sm:gap-3 px-3 sm:px-6 py-2 rounded-full bg-[#0D1620]/95 backdrop-blur-2xl border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.65)] ring-1 ring-white/5 max-w-full transition-all duration-300">
        {/* Ambient Subtle Cyan Underlay Glow */}
        <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-cyan-500/15 via-teal-500/15 to-cyan-500/15 blur-lg -z-10 pointer-events-none" />

        {/* 1. Home Button */}
        <button
          onClick={() => {
            if (isMainMenuOpen && onOpenMainMenu) onOpenMainMenu();
            onSelectTab('overview');
          }}
          className={`group relative flex flex-col items-center justify-center min-w-[52px] sm:min-w-[68px] py-1.5 px-2 rounded-full transition-all duration-300 cursor-pointer ${
            isHomeActive && !isMenuOpenOrActive
              ? 'text-[#18E2EC] font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
          title="Home Dashboard"
        >
          {renderSpotlightGlow(isHomeActive && !isMenuOpenOrActive)}
          <Home className={`w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform duration-300 ${isHomeActive && !isMenuOpenOrActive ? 'text-[#18E2EC] scale-110 drop-shadow-[0_0_10px_rgba(24,226,236,0.85)]' : 'group-hover:scale-115 group-hover:-translate-y-0.5'}`} />
          <span className={`text-[9px] sm:text-[10px] tracking-tight mt-0.5 ${isHomeActive && !isMenuOpenOrActive ? 'text-[#18E2EC] font-black drop-shadow-[0_0_6px_rgba(24,226,236,0.5)]' : 'font-semibold'}`}>Home</span>
        </button>

        {/* 2. Calendar Button */}
        <button
          onClick={() => {
            if (isMainMenuOpen && onOpenMainMenu) onOpenMainMenu();
            onSelectTab('calendar');
          }}
          className={`group relative flex flex-col items-center justify-center min-w-[52px] sm:min-w-[68px] py-1.5 px-2 rounded-full transition-all duration-300 cursor-pointer ${
            isCalendarActive && !isMenuOpenOrActive
              ? 'text-[#18E2EC] font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
          title="Calendar & Timetable"
        >
          {renderSpotlightGlow(isCalendarActive && !isMenuOpenOrActive)}
          <Calendar className={`w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform duration-300 ${isCalendarActive && !isMenuOpenOrActive ? 'text-[#18E2EC] scale-110 drop-shadow-[0_0_10px_rgba(24,226,236,0.85)]' : 'group-hover:scale-115 group-hover:-translate-y-0.5'}`} />
          <span className={`text-[9px] sm:text-[10px] tracking-tight mt-0.5 ${isCalendarActive && !isMenuOpenOrActive ? 'text-[#18E2EC] font-black drop-shadow-[0_0_6px_rgba(24,226,236,0.5)]' : 'font-semibold'}`}>Calendar</span>
        </button>

        {/* 🌟 3. CENTER HERO MENU / CLOSE BUTTON (Exact match of Images 1, 2, and 3) */}
        <div className="relative mx-1 sm:mx-2 flex items-center justify-center">
          {/* Petals Halo when Open (Image 3) */}
          {isMenuOpenOrActive && (
            <div className="absolute inset-0 -m-4 sm:-m-5 pointer-events-none flex items-center justify-center animate-pulse">
              {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                <div
                  key={deg}
                  className="absolute w-8 h-16 sm:w-9 sm:h-18 rounded-full bg-gradient-to-t from-cyan-400/40 via-teal-400/20 to-transparent blur-[0.5px] border border-cyan-300/40 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                  style={{
                    transform: `rotate(${deg}deg) translateY(-14px)`,
                    transformOrigin: 'center center',
                  }}
                />
              ))}
            </div>
          )}

          {/* Cyan Floor Pedestal Bloom (Image 1) */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-14 sm:w-16 h-4 bg-cyan-400/40 blur-md rounded-full pointer-events-none" />

          {/* Elevated Circular Button */}
          <button
            onClick={handleCenterButtonClick}
            className={`group relative -mt-4 sm:-mt-5 w-14 h-14 sm:w-16 sm:h-16 rounded-full transition-all duration-300 cursor-pointer active:scale-90 flex items-center justify-center ${
              isMenuOpenOrActive
                ? 'bg-gradient-to-tr from-[#E11D48] via-[#A855F7] to-[#06B6D4] p-[2.5px] shadow-[0_0_24px_rgba(6,182,212,0.9)] scale-105 ring-2 ring-cyan-400/80'
                : 'bg-gradient-to-tr from-[#E11D48] via-[#8B5CF6] to-[#06B6D4] p-[2.5px] shadow-[0_0_18px_rgba(6,182,212,0.65)] hover:scale-105'
            }`}
            title={isMenuOpenOrActive ? 'Click to close and return to Home' : 'Open All Modules Menu'}
          >
            {/* Inner Dark Circular Face */}
            <div className="w-full h-full rounded-full bg-[#080E16] flex flex-col items-center justify-center p-1 relative overflow-hidden transition-all duration-300">
              {/* Subtle radial sheen */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

              {isMenuOpenOrActive ? (
                /* STATE B: "Tap to close" / "Close" (Image 3) */
                <span className="text-[10px] sm:text-[11px] font-black leading-tight text-white drop-shadow-[0_0_8px_rgba(24,226,236,0.95)] text-center tracking-tight animate-fade-in">
                  Tap to<br />close
                </span>
              ) : (
                /* STATE A: "Menu" (Image 2) */
                <span className="text-sm sm:text-base font-black text-[#18E2EC] tracking-tight drop-shadow-[0_0_10px_rgba(24,226,236,0.95)] group-hover:text-cyan-200 transition-colors animate-fade-in">
                  Menu
                </span>
              )}
            </div>
          </button>
        </div>

        {/* 4. Messages Button */}
        <button
          onClick={() => {
            if (isMainMenuOpen && onOpenMainMenu) onOpenMainMenu();
            onSelectTab('messages');
          }}
          className={`group relative flex flex-col items-center justify-center min-w-[52px] sm:min-w-[68px] py-1.5 px-2 rounded-full transition-all duration-300 cursor-pointer ${
            isMessagesActive && !isMenuOpenOrActive
              ? 'text-[#18E2EC] font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
          title="Communication Hub"
        >
          {renderSpotlightGlow(isMessagesActive && !isMenuOpenOrActive)}
          <div className="relative">
            <MessageSquare className={`w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform duration-300 ${isMessagesActive && !isMenuOpenOrActive ? 'text-[#18E2EC] scale-110 drop-shadow-[0_0_10px_rgba(24,226,236,0.85)]' : 'group-hover:scale-115 group-hover:-translate-y-0.5'}`} />
            {unreadMessages > 0 && (
              <span className="absolute -top-1 -right-2 px-1 min-w-[14px] h-3.5 rounded-full bg-rose-500 text-white text-[8px] font-black flex items-center justify-center ring-2 ring-[#0D1620] animate-pulse shadow-sm">
                {unreadMessages > 9 ? '9+' : unreadMessages}
              </span>
            )}
          </div>
          <span className={`text-[9px] sm:text-[10px] tracking-tight mt-0.5 ${isMessagesActive && !isMenuOpenOrActive ? 'text-[#18E2EC] font-black drop-shadow-[0_0_6px_rgba(24,226,236,0.5)]' : 'font-semibold'}`}>Messages</span>
        </button>

        {/* 5. Profile Button */}
        <button
          onClick={() => {
            if (isMainMenuOpen && onOpenMainMenu) onOpenMainMenu();
            onSelectTab('profile');
          }}
          className={`group relative flex flex-col items-center justify-center min-w-[52px] sm:min-w-[68px] py-1.5 px-2 rounded-full transition-all duration-300 cursor-pointer ${
            isProfileActive && !isMenuOpenOrActive
              ? 'text-[#18E2EC] font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
          title="My Profile"
        >
          {renderSpotlightGlow(isProfileActive && !isMenuOpenOrActive)}
          <div className={`w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden transition-transform duration-300 ${isProfileActive && !isMenuOpenOrActive ? 'ring-2 ring-[#18E2EC] shadow-[0_0_8px_rgba(24,226,236,0.6)]' : 'group-hover:scale-115 group-hover:-translate-y-0.5'}`}>
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
          <span className={`text-[9px] sm:text-[10px] tracking-tight mt-0.5 ${isProfileActive && !isMenuOpenOrActive ? 'text-[#18E2EC] font-black drop-shadow-[0_0_6px_rgba(24,226,236,0.5)]' : 'font-semibold'}`}>Profile</span>
        </button>
      </div>
    </div>
  );
};
