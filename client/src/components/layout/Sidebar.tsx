import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useSchool } from '../../context/SchoolContext';
import { getProfilePictureUrl } from '../../utils/imageUrl';
import { AboutUsModal } from './AboutUsModal';
import { ContactUsModal } from './ContactUsModal';
import { HelpSupportModal } from '../common/HelpSupportModal';
import { FusionAppIcon } from '../common/FusionAppIcon';
import {
  User,
  Info,
  Phone,
  LogOut,
  X,
  Sparkles,
  LayoutGrid,
  ShieldCheck,
  ChevronRight,
  Headphones,
  HelpCircle,
  Bot,
  GraduationCap,
  Gamepad2,
  Settings
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenMainMenu?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpen,
  onClose,
  onOpenMainMenu,
}) => {
  const { user, role, logout } = useAuth();
  const { theme } = useTheme();
  const { currentSchool } = useSchool();
  const isLight = theme === 'light';

  const [aboutUsOpen, setAboutUsOpen] = useState(false);
  const [contactUsOpen, setContactUsOpen] = useState(false);

  return (
    <>
      {/* Modals for About Us & Contact Us */}
      <AboutUsModal isOpen={aboutUsOpen} onClose={() => setAboutUsOpen(false)} />
      <ContactUsModal isOpen={contactUsOpen} onClose={() => setContactUsOpen(false)} />

      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md md:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Streamlined Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 h-full min-h-screen md:h-screen md:sticky md:top-0 flex-col border-r border-white/10 bg-surface-darker/95 backdrop-blur-2xl transition-[transform,background-color,border-color] duration-300 ease-in-out md:translate-x-0 select-none shadow-xl ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-20 items-center justify-between px-5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-2xl p-0.5 border border-brand-500/30 shadow-sm shrink-0 overflow-hidden"
              style={{
                backgroundColor: `${currentSchool?.primary_color || '#4f46e5'}20`,
                borderColor: `${currentSchool?.primary_color || '#4f46e5'}40`
              }}
            >
              <FusionAppIcon className="w-9 h-9" />
            </div>
            <div className="min-w-0">
              <span className="font-display text-sm font-extrabold tracking-tight text-white block truncate leading-tight uppercase">
                {currentSchool?.name || 'FUSION HIGH'}
              </span>
              <span className="text-[8.5px] font-mono uppercase tracking-wider text-cyan-400 font-bold block truncate">
                {currentSchool?.motto || 'ONE SCHOOL • ONE CONNECTION'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 md:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Profile Card */}
        <div className="mx-4 my-3 p-3 rounded-2xl bg-surface-dark/90 border border-white/10 hover:border-brand-500/40 transition-all duration-300 hover:shadow-glow-indigo flex items-center gap-3 group shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600/40 to-cyan-500/40 border border-brand-500/30 flex items-center justify-center text-white font-bold text-sm overflow-hidden shrink-0 group-hover:scale-105 transition-transform relative">
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
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
              {user?.full_name || user?.name || user?.email || 'User'}
            </p>
            <p className="text-[10px] text-brand-400 capitalize font-medium flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {role} Account
            </p>
          </div>
        </div>

        {/* Quick Launch Button to Open Main Menu Grid */}
        <div className="px-4 mb-2">
          <button
            onClick={() => {
              if (onOpenMainMenu) onOpenMainMenu();
              onClose();
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-brand-600/40 via-indigo-600/30 to-cyan-600/30 border border-brand-500/40 hover:border-cyan-400 hover:shadow-glow-cyan transition-all text-white font-bold text-xs group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-cyan-400/20 text-cyan-300 flex items-center justify-center group-hover:rotate-45 transition-transform">
                <LayoutGrid className="w-3.5 h-3.5" />
              </div>
              <span className="font-display tracking-wide">Explore Main Menu</span>
            </div>
            <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
          </button>
        </div>

        {/* Navigation Area with FUSION SUPPORT HUB */}
        <nav className="flex-1 px-4 py-2 space-y-3 overflow-y-auto custom-scrollbar">
          
          {/* Section 1: Account Navigation */}
          <div className="space-y-1">
            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-extrabold px-3 py-0.5">
              My Workspace
            </p>

            <button
              onClick={() => {
                onSelectTab('profile');
                onClose();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'profile'
                  ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-glow-indigo border border-brand-400/40'
                  : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-brand-400" />
                <span>My Profile</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-50" />
            </button>

            <button
              onClick={() => {
                onSelectTab('settings');
                onClose();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'settings'
                  ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-glow-indigo border border-brand-400/40'
                  : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Settings className="w-4 h-4 text-cyan-400" />
                <span>Technical Settings</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-50" />
            </button>

            {role === 'learner' && (
              <button
                onClick={() => {
                  onSelectTab('arcade');
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  activeTab === 'arcade'
                    ? 'bg-gradient-to-r from-amber-600 to-brand-600 text-white shadow-glow-indigo border border-amber-400/40'
                    : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Gamepad2 className="w-4 h-4 text-amber-400" />
                  <span>Fusion Arcade (Games)</span>
                </div>
                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[8px] font-bold">XP</span>
              </button>
            )}
          </div>

          {/* School Info & Contact Links */}
          <div className="space-y-1 pt-2">
            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-extrabold px-3 py-0.5">
              Institutional Info
            </p>

            <button
              onClick={() => {
                setAboutUsOpen(true);
                onClose();
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer border border-transparent"
            >
              <div className="flex items-center gap-2.5">
                <Info className="w-3.5 h-3.5 text-cyan-400" />
                <span>About Fusion High</span>
              </div>
              <span className="text-[9px] font-mono text-cyan-400/80 uppercase font-bold">Info</span>
            </button>

            <button
              onClick={() => {
                setContactUsOpen(true);
                onClose();
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer border border-transparent"
            >
              <div className="flex items-center gap-2.5">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Contact Us & Admin</span>
              </div>
              <span className="text-[9px] font-mono text-emerald-400/80 uppercase font-bold">Help</span>
            </button>
          </div>

        </nav>

        {/* Clean Footer with Slogan & Logout that transitions seamlessly with theme */}
        <div className="p-4 pt-3 pb-6 border-t border-white/10 space-y-2 shrink-0 bg-surface-darker/95 mt-auto transition-colors duration-300">
          <div data-sidebar-slogan="true" className="p-2 rounded-xl bg-surface-dark/80 border border-white/10 text-center shadow-xs transition-colors duration-300">
            <p className="text-[9.5px] font-mono text-cyan-300 font-extrabold tracking-tight">
              "Connecting Today, Empowering Tomorrow."
            </p>
          </div>

          <button
            onClick={logout}
            data-logout-button="true"
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-xs font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-600 hover:text-white border border-rose-500/20 hover:border-rose-500/40 hover:shadow-glow-rose transition-all duration-200 group/logout cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-rose-400 group-hover/logout:text-white transition-colors shrink-0" />
            <span className="text-rose-400 group-hover/logout:text-white font-bold transition-colors">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
