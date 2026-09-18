import React, { useState, useEffect } from 'react';
import {
  Home,
  Calendar,
  User,
  MessageSquare,
  Plus,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getProfilePictureUrl } from '../../utils/imageUrl';

export type LearnerPrimaryTab = 'home' | 'calendar' | 'profile' | 'messages' | 'more';

interface LearnerNavigationBarProps {
  activeTab: string;
  onSelectTab: (tabId: string, params?: any) => void;
  className?: string;
}

// Maps sub-module tabs back to their primary dock parent tab
export const getLearnerPrimaryTabFromActive = (tab: string): LearnerPrimaryTab => {
  switch (tab) {
    case 'overview':
    case 'home':
    case 'subjects':
      return 'home';

    case 'calendar':
    case 'timetable':
      return 'calendar';

    case 'profile':
      return 'profile';

    case 'messages':
    case 'announcements':
      return 'messages';

    case 'discover':
    case 'ai-tutor':
    case 'career-advisor':
    case 'arcade':
    case 'inter-school':
    case 'more':
    case 'performance':
    case 'assignments':
    case 'reports':
    case 'finance':
    case 'bursaries':
    case 'exam-seating':
    case 'textbooks':
    case 'sports':
    case 'settings':
    default:
      return 'more';
  }
};

export const LearnerNavigationBar: React.FC<LearnerNavigationBarProps> = ({
  activeTab,
  onSelectTab,
  className = '',
}) => {
  const { user } = useAuth();
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

  const primaryTab = getLearnerPrimaryTabFromActive(activeTab);

  // Balanced 5-Item Dock:
  // Home (far left) -> Calendar -> More (+) (dead center) -> Messages -> Profile (far right)
  const navItems: {
    id: LearnerPrimaryTab;
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
      id: 'more',
      targetTab: 'more',
      label: 'More',
      icon: Plus,
      subIndicator: primaryTab === 'more' && activeTab !== 'more',
    },
    {
      id: 'messages',
      targetTab: 'messages',
      label: 'Messages',
      icon: MessageSquare,
      badge: unreadCount,
    },
    {
      id: 'profile',
      targetTab: 'profile',
      label: 'Profile',
      icon: User,
    },
  ];

  return (
    <nav
      aria-label="Learner Workspace Navigation"
      className={`relative select-none ${className}`}
    >
      {/* Outer Floating Bar Container (Light White Pill / Dark Midnight Navy Pill) */}
      <div className="relative flex items-center justify-between sm:justify-center gap-1 sm:gap-2.5 p-1.5 sm:p-2 rounded-full bg-white/95 dark:bg-[#060F1E]/95 backdrop-blur-2xl border border-slate-200/90 dark:border-[#172D4A] shadow-[0_16px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.7)] transition-all duration-300">
        {/* Ambient Subtle Crimson Underlay Glow (Dark mode only) */}
        <div className="hidden dark:block absolute -inset-0.5 rounded-full bg-gradient-to-r from-rose-500/15 via-red-500/15 to-rose-500/15 blur-lg -z-10 pointer-events-none" />

        {/* Nav Items */}
        {navItems.map((item) => {
          const IconComp = item.icon;
          const isActive = primaryTab === item.id;
          const isMore = item.id === 'more';

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.targetTab)}
              className={`group relative flex flex-col items-center justify-center min-w-[54px] sm:min-w-[70px] md:min-w-[80px] py-1.5 px-2 sm:px-3 rounded-2xl transition-all duration-200 ease-out cursor-pointer active:scale-95 ${
                isActive
                  ? isMore
                    ? 'bg-[#FF2D55] text-white shadow-[0_4px_14px_rgba(255,45,85,0.4)] dark:bg-[#071325] dark:border dark:border-[#FF2D55] dark:shadow-[0_0_15px_rgba(255,45,85,0.3)]'
                    : 'text-slate-900 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/70 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-white/5'
              }`}
              title={`${item.label} (${isActive ? 'Currently Active' : 'Switch Tab'})`}
            >
              {/* ✨ Clean Active Indicator for regular items */}
              {isActive && !isMore && (
                <>
                  {/* Top Glowing Indicator Pill */}
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 w-6 sm:w-8 h-[2.5px] rounded-full bg-blue-600 dark:bg-rose-500 shadow-[0_0_8px_#3b82f6] dark:shadow-[0_0_8px_#f43f5e] z-10" />

                  {/* Semi-Transparent Pill Backdrop */}
                  <div className="absolute inset-0 rounded-2xl bg-blue-50/80 dark:bg-rose-500/15 border border-blue-200/60 dark:border-rose-500/30 pointer-events-none -z-10" />
                </>
              )}

              {/* ✨ Special Top glowing line on More button in Dark Mode */}
              {isActive && isMore && (
                <div className="hidden dark:block absolute top-1 left-1/2 -translate-x-1/2 w-6 sm:w-8 h-[2.5px] rounded-full bg-[#FF2D55] shadow-[0_0_8px_#FF2D55,0_0_14px_rgba(255,45,85,0.6)] z-10" />
              )}

              {/* Icon Container with Hover Animation & Live Badge */}
              <div className="relative flex items-center justify-center mt-0.5">
                {item.id === 'profile' && (user?.profile_picture || user?.profile_picture_path) ? (
                  <div
                    className={`w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full overflow-hidden border transition-all duration-200 ${
                      isActive
                        ? 'border-blue-500 dark:border-rose-400 ring-2 ring-blue-400/50 dark:ring-rose-500/50 scale-105'
                        : 'border-slate-300 dark:border-slate-600 group-hover:border-slate-500 dark:group-hover:border-slate-400 group-hover:scale-105'
                    }`}
                  >
                    <img
                      src={getProfilePictureUrl(user.profile_picture || user.profile_picture_path)}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                    />
                  </div>
                ) : (
                  <IconComp
                    className={`w-5 h-5 sm:w-5.5 sm:h-5.5 transition-all duration-200 ${
                      isActive
                        ? isMore
                          ? 'text-white dark:text-[#FF2D55] scale-110 drop-shadow-[0_2px_6px_rgba(255,45,85,0.4)]'
                          : 'text-blue-600 dark:text-rose-400 scale-110'
                        : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 group-hover:scale-110'
                    }`}
                  />
                )}

                {/* Live Unread Badge for Messages */}
                {Boolean(item.badge && item.badge > 0) && (
                  <span className="absolute -top-1 -right-2 px-1 min-w-[16px] h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white dark:ring-[#060F1E] animate-pulse shadow-sm">
                    {item.badge! > 9 ? '9+' : item.badge}
                  </span>
                )}

                {/* Sub-module Active Indicator on "More" */}
                {item.subIndicator && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-[#060F1E] shadow-[0_0_6px_#f43f5e]" />
                )}
              </div>

              {/* Text Label with Active State Highlighting */}
              <span
                className={`text-[10px] sm:text-[11px] tracking-wide mt-1 transition-all duration-200 ${
                  isActive
                    ? isMore
                      ? 'font-bold text-white'
                      : 'font-bold text-blue-600 dark:text-white'
                    : 'font-medium text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200'
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
