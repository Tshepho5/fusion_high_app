import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getProfilePictureUrl } from '../../utils/imageUrl';
import {
  Menu,
  ChevronDown,
  User,
  LogOut,
  Sun,
  Moon
} from 'lucide-react';

import { useTheme } from '../../context/ThemeContext';
import { NotificationDropdown } from './NotificationDropdown';
import { FusionAppIcon } from '../common/FusionAppIcon';

interface NavbarProps {
  onToggleSidebar?: () => void;
  onOpenCommandPalette?: () => void;
  title?: string;
  onNavigateHome?: () => void;
  onSelectTab?: (tabId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, onOpenCommandPalette, title, onNavigateHome, onSelectTab }) => {
  const { user, role, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleHomeClick = () => {
    if (onNavigateHome) {
      onNavigateHome();
    } else if (onSelectTab) {
      onSelectTab('overview');
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 dark:border-[#1B2E3D] bg-white/95 dark:bg-[#09131F]/95 px-4 md:px-8 backdrop-blur-md transition-colors">
      {/* Left: Branding & App Icon (Brings user back to Home page when clicked) */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleHomeClick}
          className="flex items-center gap-2.5 group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-xl p-1 -m-1 transition-all"
          title="Return to Home Dashboard"
        >
          <FusionAppIcon className="w-8 h-8 rounded-xl shadow-xs transition-transform duration-200 group-hover:scale-105" />
          <div className="hidden sm:flex flex-col text-left leading-none">
            <span className="font-display font-extrabold text-sm tracking-tight text-slate-800 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
              GELEZA SA
            </span>
            <span className="text-[9px] text-cyan-600 dark:text-cyan-400 font-semibold tracking-normal mt-0.5">
              Geleza Smart, The Future Is Thine
            </span>
          </div>
        </button>
      </div>



      {/* Right: Notification Bell and User Profile Avatar at top corner */}
      <div className="flex items-center gap-3">
        {/* Notification Bell Dropdown */}
        <NotificationDropdown />

        {/* User Profile Avatar & Dropdown at Top Corner */}
        <div className="relative" ref={profileMenuRef}>
          <button
            type="button"
            onClick={() => setShowProfileMenu(prev => !prev)}
            className="flex items-center gap-2 pl-2 border-l border-slate-200/80 dark:border-white/10 cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-lg p-1"
            title="Profile & Session Menu"
          >
            <div className="w-8 h-8 rounded-full bg-[#0080FF] flex items-center justify-center text-white font-bold text-xs shadow-xs overflow-hidden shrink-0 border border-sky-400/40 relative">
              <span className="select-none">
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
              </span>
              {(user?.profile_picture || user?.profile_picture_path) && (
                <img
                  src={getProfilePictureUrl(user.profile_picture || user.profile_picture_path)}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                />
              )}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-900 dark:text-white leading-none truncate max-w-[130px]">
                {user?.full_name || 'My Profile'}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium capitalize mt-0.5">
                {role === 'learner' ? `Grade ${user?.grade || user?.academic?.grade || '12'}` : (role || 'User')}
              </span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 hidden sm:block ml-0.5 transition-transform duration-200 ${showProfileMenu ? 'rotate-180 text-cyan-500' : ''}`} />
          </button>

          {/* Profile Dropdown Menu */}
          {showProfileMenu && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-white dark:bg-[#121B2B] border border-slate-200/90 dark:border-white/15 shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
              <div className="px-3 py-2.5 border-b border-slate-100 dark:border-white/10 mb-1">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {user?.full_name || 'User Profile'}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {user?.email || `${(role || 'user').toLowerCase()}@geleza-sa.co.za`}
                </p>
                <div className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-[9px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wide font-mono">
                  {role || 'Portal User'}
                </div>
              </div>

              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    if (onSelectTab) onSelectTab('profile');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer"
                >
                  <User className="w-4 h-4 text-cyan-500" />
                  <span>View Profile</span>
                </button>

                {/* THEME TOGGLE: Strictly Dark Mode and Light Mode only (No Navy) */}
                <div className="px-3 py-2 border-t border-b border-slate-100 dark:border-white/10 my-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Theme Mode</span>
                    <span className="text-[9px] font-mono font-bold text-cyan-500 uppercase">{theme} mode</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setTheme('light')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        theme === 'light'
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-black'
                          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                      }`}
                      title="Switch to Light Mode"
                    >
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                      <span>Light</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme('dark')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        theme === 'dark'
                          ? 'bg-slate-800 text-cyan-400 shadow-sm border border-cyan-500/30 font-black'
                          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                      }`}
                      title="Switch to Dark Mode"
                    >
                      <Moon className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Dark</span>
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
