import React, { useState, useEffect } from 'react';
import {
  Home,
  Calendar,
  User,
  Compass,
  MessageSquare,
  MoreHorizontal,
  Sparkles,
} from 'lucide-react';
import api from '../../services/api';

export type TeacherPrimaryTab = 'home' | 'calendar' | 'profile' | 'discover' | 'messages' | 'more';

interface TeacherNavigationBarProps {
  activeTab: string;
  onSelectTab: (tabId: string, params?: any) => void;
  className?: string;
}

// Maps specific sub-module tabs back to their primary parent tab
export const getPrimaryTabFromActive = (tab: string): TeacherPrimaryTab => {
  switch (tab) {
    case 'overview':
    case 'home':
    case 'subjects':
    case 'classes':
    case 'workload':
      return 'home';

    case 'calendar':
    case 'timetable':
      return 'calendar';

    case 'profile':
      return 'profile';

    case 'discover':
    case 'resources':
    case 'ai-tools':
    case 'inter-school':
      return 'discover';

    case 'messages':
    case 'announcements':
    case 'ptc':
    case 'consultations':
      return 'messages';

    case 'more':
    case 'assessments':
    case 'assignments':
    case 'attendance':
    case 'conduct':
    case 'my-leave':
    case 'exam-seating':
    case 'sports':
    case 'textbooks':
    case 'settings':
    default:
      return 'more';
  }
};

export const TeacherNavigationBar: React.FC<TeacherNavigationBarProps> = ({
  activeTab,
  onSelectTab,
  className = '',
}) => {
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Poll for unread message count
  useEffect(() => {
    let isMounted = true;
    const fetchUnread = async () => {
      try {
        const res = await api.get('/messages/unread-count');
        if (isMounted && res.data && typeof res.data.count === 'number') {
          setUnreadCount(res.data.count);
        }
      } catch (_) {}
    };

    fetchUnread();
    const timer = setInterval(fetchUnread, 25000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  const primaryTab = getPrimaryTabFromActive(activeTab);

  const navItems: {
    id: TeacherPrimaryTab;
    targetTab: string;
    label: string;
    icon: React.ElementType;
    badge?: number;
    subIndicator?: boolean;
  }[] = [
    {
      id: 'home',
      targetTab: 'overview',
      label: 'Home',
      icon: Home,
    },
    {
      id: 'calendar',
      targetTab: 'calendar',
      label: 'Calendar',
      icon: Calendar,
    },
    {
      id: 'profile',
      targetTab: 'profile',
      label: 'Profile',
      icon: User,
    },
    {
      id: 'discover',
      targetTab: 'discover',
      label: 'Discover',
      icon: Compass,
    },
    {
      id: 'messages',
      targetTab: 'messages',
      label: 'Messages',
      icon: MessageSquare,
      badge: unreadCount,
    },
    {
      id: 'more',
      targetTab: 'more',
      label: 'More',
      icon: MoreHorizontal,
      // If inside a sub-module of "more", show indicator dot
      subIndicator: primaryTab === 'more' && activeTab !== 'more',
    },
  ];

  return (
    <nav
      aria-label="Teacher Workspace Navigation"
      className={`relative select-none ${className}`}
    >
      {/* Outer Floating Bar Container (Sleek Obsidian Pill Bar) */}
      <div className="relative flex items-center justify-between sm:justify-center gap-1 sm:gap-3 p-1.5 sm:p-2 rounded-full bg-[#131418]/95 backdrop-blur-2xl border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.65)] ring-1 ring-white/5 transition-all duration-300">
        {/* Ambient Subtle Crimson Underlay Glow */}
        <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-rose-500/15 via-red-500/15 to-rose-500/15 blur-lg -z-10 pointer-events-none" />
        
        {/* Nav Items */}
        {navItems.map((item) => {
          const IconComp = item.icon;
          const isActive = primaryTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.targetTab)}
              className={`group relative flex flex-col items-center justify-center min-w-[56px] sm:min-w-[72px] md:min-w-[84px] py-1.5 px-2 sm:px-3 rounded-full transition-all duration-300 ease-out cursor-pointer active:scale-95 ${
                isActive
                  ? 'text-[#FF385C] font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
              title={`${item.label} (${isActive ? 'Currently Active' : 'Switch Tab'})`}
            >
              {/* 🌟 Downward Spotlight Glow & Top Emitter Lamp */}
              {isActive && (
                <>
                  {/* 1. Top Glowing Horizontal Light Bar Emitter */}
                  <div className="absolute -top-[2.5px] left-1/2 -translate-x-1/2 w-8 sm:w-10 h-[3px] rounded-full bg-[#FF385C] shadow-[0_0_10px_#ff385c,0_0_20px_#ef4444,0_0_30px_rgba(255,56,92,0.85)] z-20" />

                  {/* 2. Downward Projector Light Beam Cone (Shoots light down onto the active icon) */}
                  <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden rounded-full">
                    <div
                      className="w-full h-full bg-gradient-to-b from-[#FF385C]/35 via-[#FF385C]/12 to-transparent blur-[1px]"
                      style={{
                        clipPath: 'polygon(18% 0%, 82% 0%, 100% 100%, 0% 100%)',
                      }}
                    />
                    {/* Soft Ambient Radial Lamp Bloom */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-14 h-10 bg-[#FF385C]/20 blur-md rounded-full pointer-events-none" />
                  </div>
                </>
              )}

              {/* Icon Container with Hover Animation & Live Badge */}
              <div className="relative flex items-center justify-center">
                <IconComp
                  className={`w-5 h-5 sm:w-5.5 sm:h-5.5 transition-all duration-300 ease-out ${
                    isActive
                      ? 'text-[#FF385C] scale-110 drop-shadow-[0_0_10px_rgba(255,56,92,0.85)]'
                      : 'text-slate-400 group-hover:text-slate-200 group-hover:scale-115 group-hover:-translate-y-0.5'
                  }`}
                />

                {/* Live Unread Badge for Messages */}
                {Boolean(item.badge && item.badge > 0) && (
                  <span className="absolute -top-1 -right-2 px-1 min-w-[16px] h-4 rounded-full bg-[#FF385C] text-white text-[9px] font-black flex items-center justify-center ring-2 ring-[#131418] animate-pulse shadow-sm">
                    {item.badge! > 9 ? '9+' : item.badge}
                  </span>
                )}

                {/* Sub-module Active Indicator on "More" */}
                {item.subIndicator && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#FF385C] ring-2 ring-[#131418] shadow-[0_0_6px_#ff385c]" />
                )}
              </div>

              {/* Text Label with Active State Highlighting */}
              <span
                className={`text-[10px] sm:text-[11px] tracking-wide mt-1 transition-all duration-300 ${
                  isActive
                    ? 'font-black text-[#FF385C] drop-shadow-[0_0_6px_rgba(255,56,92,0.5)] scale-105'
                    : 'font-medium text-slate-400 group-hover:text-slate-200'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
