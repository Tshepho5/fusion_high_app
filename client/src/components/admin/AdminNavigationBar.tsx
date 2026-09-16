import React, { useState, useEffect } from 'react';
import {
  Home,
  Calendar,
  User,
  Compass,
  MessageSquare,
  MoreHorizontal,
  Shield,
} from 'lucide-react';
import api from '../../services/api';

export type AdminPrimaryTab = 'home' | 'calendar' | 'profile' | 'discover' | 'messages' | 'more';

interface AdminNavigationBarProps {
  activeTab: string;
  onSelectTab: (tabId: string, params?: any) => void;
  className?: string;
}

// Maps specific admin sub-module tabs back to their primary parent tab
export const getAdminPrimaryTabFromActive = (tab: string): AdminPrimaryTab => {
  switch (tab) {
    case 'overview':
    case 'home':
      return 'home';

    case 'calendar':
      return 'calendar';

    case 'profile':
      return 'profile';

    case 'discover':
    case 'command-center':
    case 'inter-school':
    case 'bursaries':
      return 'discover';

    case 'messages':
    case 'announcements':
    case 'consultations':
      return 'messages';

    case 'more':
    case 'users':
    case 'subjects':
    case 'reports':
    case 'marks':
    case 'finance':
    case 'timetable':
    case 'matric-projector':
    case 'leave-relief':
    case 'exam-seating':
    case 'sports':
    case 'textbooks':
    case 'settings':
    default:
      return 'more';
  }
};

export const AdminNavigationBar: React.FC<AdminNavigationBarProps> = ({
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

  const primaryTab = getAdminPrimaryTabFromActive(activeTab);

  const navItems: {
    id: AdminPrimaryTab;
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
      subIndicator: primaryTab === 'more' && activeTab !== 'more',
    },
  ];

  return (
    <nav
      aria-label="Admin Control Navigation"
      className={`relative select-none ${className}`}
    >
      {/* Outer Floating Bar Container */}
      <div className="relative flex items-center justify-between sm:justify-center gap-1 sm:gap-3 p-1.5 sm:p-2 rounded-2xl md:rounded-full bg-white/95 dark:bg-[#0B1120]/95 backdrop-blur-2xl border border-slate-200/90 dark:border-white/15 shadow-2xl shadow-slate-900/15 dark:shadow-black/70 ring-1 ring-slate-900/5 dark:ring-white/10 transition-all duration-300">
        {/* Ambient Subtle Underlay Glow */}
        <div className="absolute -inset-0.5 rounded-2xl md:rounded-full bg-gradient-to-r from-indigo-500/15 via-cyan-500/15 to-indigo-500/15 dark:from-indigo-500/25 dark:via-cyan-500/25 dark:to-indigo-500/25 blur-md -z-10 pointer-events-none" />

        {/* Nav Items */}
        {navItems.map((item) => {
          const IconComp = item.icon;
          const isActive = primaryTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.targetTab)}
              className={`group relative flex flex-col items-center justify-center min-w-[56px] sm:min-w-[72px] md:min-w-[84px] py-1.5 px-2 sm:px-3 rounded-xl sm:rounded-full transition-all duration-300 ease-out cursor-pointer active:scale-95 ${
                isActive
                  ? 'text-indigo-600 dark:text-cyan-400 font-bold'
                  : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-cyan-200 dark:hover:bg-white/5'
              }`}
              title={`${item.label} (${isActive ? 'Currently Active' : 'Switch Tab'})`}
            >
              {/* 🌟 Downward Spotlight Glow & Top Emitter Lamp */}
              {isActive && (
                <>
                  {/* 1. Top Glowing Horizontal Light Bar Emitter */}
                  <div className="absolute -top-[1.5px] left-1/2 -translate-x-1/2 w-8 sm:w-10 h-[3px] rounded-full bg-indigo-600 dark:bg-cyan-300 shadow-[0_0_8px_rgba(79,70,229,0.5),0_0_16px_rgba(99,102,241,0.3)] dark:shadow-[0_0_10px_#38bdf8,0_0_20px_#22d3ee,0_0_30px_#06b6d4] z-20" />

                  {/* 2. Downward Projector Light Beam Cone (Shoots light down onto the active icon) */}
                  <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden rounded-xl sm:rounded-full">
                    <div
                      className="w-full h-full bg-gradient-to-b from-indigo-500/20 via-indigo-500/10 to-transparent dark:from-cyan-400/45 dark:via-cyan-500/20 dark:to-transparent blur-[1.5px]"
                      style={{
                        clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)',
                      }}
                    />
                    {/* Soft Ambient Radial Lamp Bloom */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-14 h-10 bg-indigo-500/15 dark:bg-cyan-400/30 blur-md rounded-full pointer-events-none" />
                  </div>
                </>
              )}

              {/* Icon Container with Hover Animation & Live Badge */}
              <div className="relative flex items-center justify-center">
                <IconComp
                  className={`w-5 h-5 sm:w-5.5 sm:h-5.5 transition-all duration-300 ease-out ${
                    isActive
                      ? 'text-indigo-600 dark:text-cyan-400 scale-110 drop-shadow-[0_2px_8px_rgba(79,70,229,0.35)] dark:drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]'
                      : 'text-slate-600 group-hover:text-indigo-600 dark:text-slate-400 dark:group-hover:text-white group-hover:scale-115 group-hover:-translate-y-0.5'
                  }`}
                />

                {/* Live Unread Badge for Messages */}
                {Boolean(item.badge && item.badge > 0) && (
                  <span className="absolute -top-1 -right-2 px-1 min-w-[16px] h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white dark:ring-[#0B1120] animate-pulse shadow-sm">
                    {item.badge! > 9 ? '9+' : item.badge}
                  </span>
                )}

                {/* Sub-module Active Indicator on "More" */}
                {item.subIndicator && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-indigo-600 dark:bg-cyan-400 ring-2 ring-white dark:ring-[#0B1120] shadow-[0_0_6px_rgba(79,70,229,0.5)] dark:shadow-[0_0_6px_#22d3ee]" />
                )}
              </div>

              {/* Text Label with Active State Highlighting */}
              <span
                className={`text-[10px] sm:text-[11px] tracking-wide mt-1 transition-all duration-300 ${
                  isActive
                    ? 'font-black text-indigo-600 dark:text-cyan-300 dark:drop-shadow-[0_0_6px_rgba(34,211,238,0.4)] scale-105'
                    : 'font-semibold text-slate-600 group-hover:text-indigo-600 dark:font-medium dark:text-slate-400 dark:group-hover:text-slate-200'
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
