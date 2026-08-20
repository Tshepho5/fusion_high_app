import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  LayoutGrid,
  Home,
  MessageSquare,
  Sparkles,
  Calendar,
  Layers
} from 'lucide-react';

interface BottomNavigationDockProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  onOpenMainMenu: () => void;
  isMainMenuOpen: boolean;
}

export const BottomNavigationDock: React.FC<BottomNavigationDockProps> = ({
  activeTab,
  onSelectTab,
  onOpenMainMenu,
  isMainMenuOpen,
}) => {
  const { role } = useAuth();
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

  return (
    <div className="fixed bottom-4 inset-x-0 md:left-72 z-40 flex justify-center items-center pointer-events-none select-none animate-bounce-in px-4">
      <div className="pointer-events-auto relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-full bg-surface-darker/90 backdrop-blur-2xl border border-white/15 shadow-2xl shadow-black/80 ring-1 ring-white/10 max-w-full">
        {/* Subtle glowing underlay */}
        <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-brand-500/20 via-cyan-500/20 to-brand-500/20 blur-md -z-10 pointer-events-none" />

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

        {/* 2. Calendar / Events Shortcut */}
        <button
          onClick={() => onSelectTab('calendar')}
          className={`flex flex-col items-center justify-center p-2 rounded-full transition-all duration-200 ${
            activeTab === 'calendar'
              ? 'text-cyan-400 bg-white/10 shadow-glow-cyan'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
          title="School Calendar"
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[9px] font-bold mt-0.5 hidden sm:block">Calendar</span>
        </button>

        {/* 🌟 3. PROMINENT CENTER MAIN MENU BUTTON */}
        <div className="relative px-1 sm:px-2">
          <button
            onClick={onOpenMainMenu}
            className={`group relative flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-brand-600 via-indigo-600 to-cyan-500 text-white font-extrabold text-xs shadow-lg shadow-brand-500/40 hover:shadow-cyan-500/50 hover:scale-105 active:scale-95 transition-all duration-200 border border-white/25 ${
              isMainMenuOpen ? 'ring-4 ring-cyan-400/50 scale-105' : ''
            }`}
            title="Open Main Menu (All Modules)"
          >
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <LayoutGrid className="w-4 h-4 text-white group-hover:rotate-45 transition-transform duration-300" />
            </div>
            <span className="tracking-wide uppercase font-display font-black text-[11px] sm:text-xs">
              Main Menu
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

        {/* 5. Role-Specific Core Action (Subjects / Classes / Children) */}
        <button
          onClick={() => {
            if (role === 'teacher') onSelectTab('classes');
            else if (role === 'parent') onSelectTab('children');
            else if (role === 'admin') onSelectTab('users');
            else onSelectTab('subjects');
          }}
          className={`flex flex-col items-center justify-center p-2 rounded-full transition-all duration-200 ${
            ['classes', 'children', 'users', 'subjects'].includes(activeTab)
              ? 'text-cyan-400 bg-white/10 shadow-glow-cyan'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
          title={role === 'teacher' ? 'Class Registers' : role === 'parent' ? 'Children' : role === 'admin' ? 'Users' : 'My Subjects'}
        >
          <Layers className="w-5 h-5" />
          <span className="text-[9px] font-bold mt-0.5 hidden sm:block">
            {role === 'teacher' ? 'Register' : role === 'parent' ? 'Children' : role === 'admin' ? 'Users' : 'Subjects'}
          </span>
        </button>
      </div>
    </div>
  );
};
