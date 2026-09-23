import React, { useState, useEffect } from 'react';
import {
  Home,
  Calendar,
  User,
  MessageSquare,
  Plus,
  LayoutGrid,
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
      label: 'Menu',
      icon: LayoutGrid,
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
      {/* Outer Floating Bar Container (Deep Navy Dock) */}
      <div className="relative flex items-center justify-between sm:justify-center gap-1 sm:gap-2.5 p-1.5 sm:p-2 rounded-full bg-[#0D1620]/95 backdrop-blur-2xl border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.65)] ring-1 ring-white/5 transition-all duration-300">
        {/* Ambient Subtle Cyan Underlay Glow */}
        <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-cyan-500/15 via-teal-500/15 to-cyan-500/15 blur-lg -z-10 pointer-events-none" />

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
                  ? 'text-[#18E2EC] font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
              title={`${item.label} (${isActive ? 'Currently Active' : 'Switch Tab'})`}
            >
              {/* ✨ Clean Active Indicator for regular items */}
              {isActive && (
                <>
                  {/* Top Glowing Indicator Pill */}
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 w-6 sm:w-8 h-[2.5px] rounded-full bg-[#13C8D9] shadow-[0_0_8px_#13c8d9,0_0_14px_rgba(24,226,236,0.6)] z-10" />

                  {/* Semi-Transparent Pill Backdrop */}
                  <div className="absolute inset-0 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 pointer-events-none -z-10" />
                </>
              )}

              {/* Icon Container with Hover Animation & Live Badge */}
              <div className="relative flex items-center justify-center mt-0.5">
                {item.id === 'profile' && (user?.profile_picture || user?.profile_picture_path) ? (
                  <div
                    className={`w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full overflow-hidden border transition-all duration-200 ${
                      isActive
                        ? 'border-[#18E2EC] ring-2 ring-cyan-500/50 scale-105'
                        : 'border-slate-600 group-hover:border-slate-400 group-hover:scale-105'
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
                        ? 'text-[#18E2EC] scale-110 drop-shadow-[0_0_8px_rgba(24,226,236,0.7)]'
                        : 'text-slate-400 group-hover:text-slate-200 group-hover:scale-110'
                    }`}
                  />
                )}

                {/* Live Unread Badge for Messages */}
                {Boolean(item.badge && item.badge > 0) && (
                  <span className="absolute -top-1 -right-2 px-1 min-w-[16px] h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-[#0D1620] animate-pulse shadow-sm">
                    {item.badge! > 9 ? '9+' : item.badge}
                  </span>
                )}

                {/* Sub-module Active Indicator on "More" */}
                {item.subIndicator && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#18E2EC] ring-2 ring-[#0D1620] shadow-[0_0_6px_#18e2ec]" />
                )}
              </div>

              {/* Text Label */}
              <span
                className={`text-[10px] sm:text-[11px] tracking-wide mt-1 transition-all duration-200 ${
                  isActive
                    ? 'font-bold text-[#18E2EC]'
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
