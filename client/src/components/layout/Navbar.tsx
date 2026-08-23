import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme, AppTheme, AppFont } from '../../context/ThemeContext';
import { userService } from '../../services/api';
import { getProfilePictureUrl } from '../../utils/imageUrl';
import {
  Palette,
  Sun,
  Moon,
  Bell,
  Menu,
  User as UserIcon,
  LogOut,
  Sparkles,
  ShieldAlert,
  GraduationCap,
  Briefcase,
  Users,
  Check,
  Type,
  Search,
  Command,
  FileText,
  Download
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { NotificationDropdown } from './NotificationDropdown';

interface NavbarProps {
  onToggleSidebar?: () => void;
  onOpenCommandPalette?: () => void;
  title?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, onOpenCommandPalette, title }) => {
  const { user, role, logout } = useAuth();
  const { theme, font, setTheme, setFont, toggleTheme } = useTheme();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const getRoleIcon = () => {
    switch (role) {
      case 'admin':
        return <ShieldAlert className="w-4 h-4 text-rose-400" />;
      case 'teacher':
        return <Briefcase className="w-4 h-4 text-cyan-400" />;
      case 'parent':
        return <Users className="w-4 h-4 text-amber-400" />;
      case 'learner':
      default:
        return <GraduationCap className="w-4 h-4 text-indigo-400" />;
    }
  };

  const getRoleBadgeStyle = () => {
    switch (role) {
      case 'admin': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'teacher': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'parent': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'learner':
      default: return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    }
  };

  const THEMES: { id: AppTheme; label: string; bg: string }[] = [
    { id: 'dark', label: 'Dark Theme', bg: 'bg-slate-900 border-indigo-500' },
    { id: 'navy', label: 'Slate Navy', bg: 'bg-[#132247] border-blue-400' },
    { id: 'light', label: 'Light Theme', bg: 'bg-white text-slate-900 border-slate-300' },
  ];

  const FONTS: { id: AppFont; label: string }[] = [
    { id: 'sans', label: 'Modern Sans (Inter)' },
    { id: 'display', label: 'Geometric (Outfit)' },
    { id: 'serif', label: 'Academic (Playfair)' },
    { id: 'mono', label: 'Tech Code (Mono)' },
  ];

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-surface-darker/90 px-4 md:px-8 backdrop-blur-md">
      {/* Left: Mobile Toggle + User Profile Trigger */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors md:hidden"
            aria-label="Toggle navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-sm overflow-hidden shrink-0 border border-white/10">
            {user?.profile_picture_path ? (
              <img src={getProfilePictureUrl(user.profile_picture_path)} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              user?.full_name ? user.full_name.charAt(0).toUpperCase() : (user?.email?.charAt(0).toUpperCase() || 'L')
            )}
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-xs font-bold text-white leading-none truncate max-w-[130px]">
              {user?.full_name || 'Learner'}
            </span>
            <span className="text-[10px] text-slate-400 font-medium capitalize mt-0.5">
              {role === 'learner' ? `Grade ${user?.grade || user?.academic?.grade || '10'}` : (role || 'User')}
            </span>
          </div>
        </div>
      </div>

      {/* Middle: FUSION HIGH Brand Header */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center border border-brand-500/30 shadow-glow-indigo">
          <GraduationCap className="w-4 h-4 text-brand-300" />
        </div>
        <span className="text-sm md:text-base font-extrabold font-display text-white tracking-wide uppercase">
          FUSION HIGH
        </span>
      </div>

      {/* Right: Theme Accent Selector, Mode Toggle, Notifications, Logout */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Quick Search / Command Palette Trigger */}
        {onOpenCommandPalette && (
          <button
            onClick={onOpenCommandPalette}
            className="hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-surface-dark/90 hover:bg-white/5 border border-white/10 hover:border-brand-500/40 text-slate-400 hover:text-white transition-all shadow-sm group hover:shadow-glow-indigo"
            title="Search anywhere (Ctrl + K)"
          >
            <Search className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium">Quick Search...</span>
            <kbd className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white/10 border border-white/10 text-[9px] font-mono text-slate-300">
              <Command className="w-2.5 h-2.5" />
              <span>K</span>
            </kbd>
          </button>
        )}

        {/* Role Pill */}
        <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold uppercase tracking-wider ${getRoleBadgeStyle()}`}>
          {getRoleIcon()}
          <span>{role || 'User'}</span>
        </div>

        {/* Quick Dark/Light Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? <Moon className="w-4 h-4 text-indigo-500" /> : <Sun className="w-4 h-4 text-amber-400" />}
        </button>

        {/* Theme & Font Customizer Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowThemeMenu(!showThemeMenu);
              setShowProfileMenu(false);
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1"
            title="Change Theme & Font Styles"
          >
            <Palette className="w-4 h-4 text-cyan-400" />
          </button>

          {showThemeMenu && (
            <div className="absolute right-0 mt-2 w-64 rounded-3xl bg-surface-dark border border-white/10 p-4 shadow-2xl z-50 animate-fade-in text-xs space-y-3">
              <div>
                <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-2 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-brand-400" />
                  Select Color Theme
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={`p-2 rounded-xl border text-left flex items-center justify-between transition-all ${
                        theme === t.id
                          ? 'border-brand-500 bg-brand-600/20 text-white font-bold'
                          : 'border-white/5 bg-surface-darker text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="text-[11px] truncate">{t.label}</span>
                      {theme === t.id && <Check className="w-3.5 h-3.5 text-brand-400 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-white/10">
                <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-2 flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-cyan-400" />
                  Select Typography Font
                </p>
                <div className="space-y-1">
                  {FONTS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFont(f.id)}
                      className={`w-full p-2 rounded-xl text-left flex items-center justify-between transition-all ${
                        font === f.id
                          ? 'bg-cyan-600/20 text-cyan-300 font-bold border border-cyan-500/30'
                          : 'bg-surface-darker text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="text-[11px]">{f.label}</span>
                      {font === f.id && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Notification Bell Dropdown */}
        <NotificationDropdown />

        {/* Quick Sign Out Action */}
        <button
          onClick={logout}
          className="p-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
