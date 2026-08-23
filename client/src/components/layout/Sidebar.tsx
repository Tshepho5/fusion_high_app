import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getProfilePictureUrl } from '../../utils/imageUrl';
import { AboutUsModal } from './AboutUsModal';
import { ContactUsModal } from './ContactUsModal';
import { HelpSupportModal } from '../common/HelpSupportModal';
import {
  User,
  Info,
  Phone,
  LogOut,
  X,
  Sparkles,
  LayoutGrid,
  ShieldCheck,
  Palette,
  ChevronRight,
  Headphones,
  HelpCircle,
  Bot
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
  const [aboutUsOpen, setAboutUsOpen] = useState(false);
  const [contactUsOpen, setContactUsOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [helpModalTab, setHelpModalTab] = useState<'faq' | 'ai-support'>('faq');

  const handleOpenHelp = (tab: 'faq' | 'ai-support') => {
    setHelpModalTab(tab);
    setHelpModalOpen(true);
    onClose();
  };

  return (
    <>
      {/* Modals for About Us, Contact Us & 24/7 AI Support */}
      <AboutUsModal isOpen={aboutUsOpen} onClose={() => setAboutUsOpen(false)} />
      <ContactUsModal isOpen={contactUsOpen} onClose={() => setContactUsOpen(false)} />
      <HelpSupportModal isOpen={helpModalOpen} onClose={() => setHelpModalOpen(false)} defaultTab={helpModalTab} />

      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md md:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Streamlined Minimalist Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 h-full min-h-screen md:h-screen md:sticky md:top-0 flex-col border-r border-white/10 bg-surface-darker/95 backdrop-blur-2xl transition-transform duration-300 ease-in-out md:translate-x-0 select-none shadow-xl ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-20 items-center justify-between px-5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 p-1 border border-white/15 shadow-glow-indigo shrink-0">
              <img src="/assets/FH.png" alt="Fusion High Logo" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <span className="font-display text-base font-extrabold tracking-tight text-white block truncate leading-tight">
                FUSION HIGH
              </span>
              <span className="text-[8.5px] font-mono uppercase tracking-wider text-cyan-400 font-bold block truncate">
                ONE SCHOOL • ONE CONNECTION
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
        <div className="mx-4 my-4 p-3.5 rounded-2xl bg-surface-dark/90 border border-white/10 hover:border-brand-500/40 transition-all duration-300 hover:shadow-glow-indigo flex items-center gap-3 group shrink-0">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-brand-600/40 to-cyan-500/40 border border-brand-500/30 flex items-center justify-center text-white font-bold text-sm overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
            {user?.profile_picture_path ? (
              <img src={getProfilePictureUrl(user.profile_picture_path)} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'
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
        <div className="px-4 mb-3">
          <button
            onClick={() => {
              if (onOpenMainMenu) onOpenMainMenu();
              onClose();
            }}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-gradient-to-r from-brand-600/40 via-indigo-600/30 to-cyan-600/30 border border-brand-500/40 hover:border-cyan-400 hover:shadow-glow-cyan transition-all text-white font-bold text-xs group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-cyan-400/20 text-cyan-300 flex items-center justify-center group-hover:rotate-45 transition-transform">
                <LayoutGrid className="w-4 h-4" />
              </div>
              <span className="font-display tracking-wide">Explore Main Menu</span>
            </div>
            <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
          </button>
        </div>

        {/* Minimal Essential Sidebar Navigation */}
        <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto custom-scrollbar">
          <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-extrabold px-3 py-1">
            Account & Support
          </p>

          {/* 1. My Profile & Settings */}
          <button
            onClick={() => {
              onSelectTab('profile');
              onClose();
            }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
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

          {/* 2. 24/7 AI Help & Support */}
          <button
            onClick={() => handleOpenHelp('ai-support')}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold bg-gradient-to-r from-brand-600/30 to-cyan-500/30 border border-cyan-500/40 text-cyan-300 hover:text-white hover:shadow-glow-cyan transition-all"
          >
            <div className="flex items-center gap-3">
              <Bot className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span>24/7 AI Help & Support</span>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[8px] font-bold">24/7</span>
          </button>

          {/* 3. View FAQs */}
          <button
            onClick={() => handleOpenHelp('faq')}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-all"
          >
            <div className="flex items-center gap-3">
              <HelpCircle className="w-4 h-4 text-indigo-400" />
              <span>View FAQs</span>
            </div>
            <span className="text-[9px] font-mono text-indigo-400/80 uppercase font-bold">FAQs</span>
          </button>

          {/* 4. About Us */}
          <button
            onClick={() => {
              setAboutUsOpen(true);
              onClose();
            }}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-all"
          >
            <div className="flex items-center gap-3">
              <Info className="w-4 h-4 text-cyan-400" />
              <span>About Fusion High</span>
            </div>
            <span className="text-[9px] font-mono text-cyan-400/80 uppercase font-bold">Info</span>
          </button>

          {/* 5. Contact Us */}
          <button
            onClick={() => {
              setContactUsOpen(true);
              onClose();
            }}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-all"
          >
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-emerald-400" />
              <span>Contact Us</span>
            </div>
            <span className="text-[9px] font-mono text-emerald-400/80 uppercase font-bold">Help</span>
          </button>
        </nav>

        {/* Clean Footer with Slogan & Logout */}
        <div className="p-4 pt-3 pb-6 border-t border-white/10 space-y-2.5 shrink-0 bg-surface-darker/95 mt-auto">
          <div className="p-2.5 rounded-xl bg-surface-dark/80 border border-white/5 text-center">
            <p className="text-[9px] font-mono text-cyan-300 font-bold tracking-tight">
              "Connecting Today, Empowering Tomorrow."
            </p>
          </div>

          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-xs font-bold text-rose-400 hover:text-white hover:bg-rose-600/20 hover:border hover:border-rose-500/30 hover:shadow-glow-rose transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
