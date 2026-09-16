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
        <div className="absolute -inset-0.5 rounded-2xl md:rounded-full bg-gradient-to-r from-purple-500/15 via-indigo-500/15 to-cyan-500/15 dark:from-purple-500/25 dark:via-indigo-500/25 dark:to-cyan-500/25 blur-md -z-10 pointer-events-none" />

        {/* Nav Items */}
        {navItems.map((item) => {
          const IconComp = item.icon;
          const isActive = primaryTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.targetTab)}
              className={`relative flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl md:rounded-full text-xs sm:text-sm font-bold transition-all duration-250 cursor-pointer group ${
                isActive
                  ? 'text-white font-extrabold shadow-md'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              {/* Active Tab Background Pill with Glow Effect */}
              {isActive && (
                <span
                  className="absolute inset-0 rounded-xl md:rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 shadow-[0_0_18px_rgba(99,102,241,0.5)] -z-10 animate-fade-in"
                  style={{
                    boxShadow: '0 0 16px 2px rgba(99, 102, 241, 0.45)',
                  }}
                />
              )}

              {/* Icon */}
              <div className="relative">
                <IconComp
                  className={`w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform duration-200 ${
                    isActive
                      ? 'scale-110 text-white'
                      : 'group-hover:scale-110 group-hover:text-slate-900 dark:group-hover:text-white'
                  }`}
                />

                {/* Sub-module active indicator badge dot */}
                {item.subIndicator && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-purple-400 ring-2 ring-white dark:ring-[#0B1120] animate-pulse" />
                )}

                {/* Unread Message Counter Badge */}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-mono font-bold flex items-center justify-center ring-2 ring-white dark:ring-[#0B1120] shadow-sm animate-pulse">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className={`transition-all duration-200 ${
                  isActive
                    ? 'inline text-white font-black'
                    : 'hidden sm:inline opacity-80 group-hover:opacity-100 font-semibold'
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
