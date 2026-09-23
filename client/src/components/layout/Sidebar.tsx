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
  Home,
  User,
  Settings,
  HelpCircle,
  LogOut,
  X,
  ChevronRight,
  Menu,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenMainMenu?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpen,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { user, role, logout } = useAuth();
  const { theme } = useTheme();
  const { currentSchool } = useSchool();
  const isLight = theme === 'light';

  const [aboutUsOpen, setAboutUsOpen] = useState(false);
  const [contactUsOpen, setContactUsOpen] = useState(false);
  const [helpSupportOpen, setHelpSupportOpen] = useState(false);

  // Active check for Home
  const isHomeActive = ['overview', 'home', 'subjects', 'calendar', 'timetable', 'messages', 'announcements'].includes(activeTab);
  const isProfileActive = activeTab === 'profile';
  const isSettingsActive = activeTab === 'settings';

  return (
    <>
      {/* Modals */}
      <AboutUsModal isOpen={aboutUsOpen} onClose={() => setAboutUsOpen(false)} />
      <ContactUsModal isOpen={contactUsOpen} onClose={() => setContactUsOpen(false)} />
      <HelpSupportModal isOpen={helpSupportOpen} onClose={() => setHelpSupportOpen(false)} />

      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md md:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Modern Improved Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full min-h-screen md:h-screen md:sticky md:top-0 flex-col border-r transition-all duration-300 ease-in-out select-none shadow-xl ${
          // Background & Border Tokens from design: #080D18, #202B3D
          isLight
            ? 'bg-white border-slate-200/90 text-slate-900'
            : 'bg-[#080D18] border-[#202B3D] text-slate-100'
        } ${
          isCollapsed ? 'md:w-20' : 'md:w-72'
        } ${
          isOpen ? 'translate-x-0 w-72 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* ================= HEADER SECTION ================= */}
        <div
          className={`flex h-20 items-center shrink-0 px-4 border-b ${
            isLight ? 'border-slate-200/80' : 'border-[#202B3D]'
          } ${isCollapsed ? 'justify-center' : 'justify-between'}`}
        >
          {isCollapsed ? (
            // Collapsed Header: Expand Hamburger Button
            <button
              onClick={onToggleCollapse}
              className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                isLight
                  ? 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
                  : 'text-slate-300 hover:text-white hover:bg-[#111827]'
              }`}
              title="Expand Sidebar"
              aria-label="Expand Sidebar"
            >
              <Menu className="w-5 h-5 text-cyan-400" />
            </button>
          ) : (
            // Expanded Header: Logo + Title + Collapse Chevron
            <>
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-2xl p-0.5 border shadow-sm shrink-0 overflow-hidden"
                  style={{
                    backgroundColor: isLight ? '#EBF5FF' : '#111827',
                    borderColor: isLight ? '#BFDBFE' : '#202B3D',
                  }}
                >
                  <FusionAppIcon className="w-9 h-9" />
                </div>
                <div className="min-w-0">
                  <span
                    className={`font-display text-sm font-extrabold tracking-tight block truncate leading-tight uppercase ${
                      isLight ? 'text-slate-900' : 'text-white'
                    }`}
                  >
                    {currentSchool?.name || 'GELEZA SA'}
                  </span>
                  <span className="text-[8.5px] font-mono uppercase tracking-wider text-cyan-400 font-bold block truncate">
                    {currentSchool?.motto || 'GELEZA SMART, THE FUTURE IS THINE'}
                  </span>
                </div>
              </div>

              {/* Desktop Collapse Button / Mobile Close Button */}
              <div className="flex items-center">
                {onToggleCollapse && (
                  <button
                    onClick={onToggleCollapse}
                    className={`hidden md:flex p-1.5 rounded-xl border transition-all cursor-pointer ${
                      isLight
                        ? 'text-slate-500 hover:text-slate-900 border-slate-200 hover:bg-slate-100'
                        : 'text-slate-400 hover:text-white border-[#202B3D] hover:bg-[#111827]'
                    }`}
                    title="Collapse Sidebar"
                    aria-label="Collapse Sidebar"
                  >
                    <ChevronRight className="w-4 h-4 transition-transform group-hover:scale-110" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 md:hidden"
                  aria-label="Close Sidebar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* ================= USER PROFILE CARD ================= */}
        {isCollapsed ? (
          // Collapsed Profile: Centered Avatar
          <div className="py-4 flex flex-col items-center shrink-0">
            <button
              onClick={() => {
                onSelectTab('profile');
                onClose();
              }}
              className="relative group p-1 rounded-2xl hover:scale-105 transition-transform cursor-pointer"
              title={`${user?.full_name || 'Learner'} (Profile)`}
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md overflow-hidden relative">
                <span className="select-none">
                  {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'L'}
                </span>
                {(user?.profile_picture || user?.profile_picture_path) && (
                  <img
                    src={getProfilePictureUrl(user.profile_picture || user.profile_picture_path)}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                )}
              </div>
              <span className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-[#22C55E] ring-2 ring-[#080D18]" />
            </button>
          </div>
        ) : (
          // Expanded Profile Card matching Image 1
          <div className="mx-4 my-3">
            <div
              onClick={() => {
                onSelectTab('profile');
                onClose();
              }}
              className={`p-3 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between group shadow-sm ${
                isLight
                  ? 'bg-slate-50 hover:bg-slate-100/90 border-slate-200'
                  : 'bg-[#111827] hover:bg-[#162032] border-[#202B3D] hover:border-cyan-500/40'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md overflow-hidden shrink-0 relative">
                  <span className="select-none">
                    {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'L'}
                  </span>
                  {(user?.profile_picture || user?.profile_picture_path) && (
                    <img
                      src={getProfilePictureUrl(user.profile_picture || user.profile_picture_path)}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  )}
                </div>

                <div className="min-w-0">
                  <p
                    className={`text-xs font-bold truncate transition-colors ${
                      isLight ? 'text-slate-900 group-hover:text-blue-600' : 'text-white group-hover:text-cyan-300'
                    }`}
                  >
                    {user?.full_name || 'Learner'}
                  </p>
                  <p className="text-[10px] text-slate-400 capitalize font-medium flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                    {role === 'learner' ? `Grade ${user?.grade || user?.academic?.grade || '12'}` : 'Learner Account'}
                  </p>
                </div>
              </div>

              <ChevronRight
                className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${
                  isLight ? 'text-slate-400' : 'text-slate-500'
                }`}
              />
            </div>
          </div>
        )}

        {/* ================= NAVIGATION ITEMS ================= */}
        <nav className={`flex-1 overflow-y-auto custom-scrollbar py-2 ${isCollapsed ? 'px-2 space-y-3' : 'px-4 space-y-1.5'}`}>
          {/* 1. HOME */}
          {isCollapsed ? (
            <div className="flex justify-center">
              <button
                onClick={() => {
                  onSelectTab('overview');
                  onClose();
                }}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                  isHomeActive
                    ? isLight
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                      : 'bg-[#22D3EE] text-slate-950 font-bold shadow-[0_0_16px_rgba(34,211,238,0.5)]'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
                    : 'text-slate-400 hover:text-white hover:bg-[#111827]'
                }`}
                title="Home"
                aria-label="Home"
              >
                <Home className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                onSelectTab('overview');
                onClose();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer group ${
                isHomeActive
                  ? isLight
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 border border-blue-600'
                    : 'bg-[#22D3EE] text-slate-950 font-black shadow-[0_0_18px_rgba(34,211,238,0.45)] border border-cyan-300'
                  : isLight
                  ? 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 border border-transparent'
                  : 'text-slate-300 hover:text-white hover:bg-[#111827] border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Home className={`w-4 h-4 ${isHomeActive ? (isLight ? 'text-white' : 'text-slate-950') : isLight ? 'text-slate-500' : 'text-slate-400'}`} />
                <span>Home</span>
              </div>
              <ChevronRight
                className={`w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 ${
                  isHomeActive ? (isLight ? 'text-white/80' : 'text-slate-950/80') : 'opacity-40'
                }`}
              />
            </button>
          )}

          {/* 2. MY PROFILE */}
          {isCollapsed ? (
            <div className="flex justify-center">
              <button
                onClick={() => {
                  onSelectTab('profile');
                  onClose();
                }}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                  isProfileActive
                    ? isLight
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-[#22D3EE] text-slate-950 font-bold shadow-md'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
                    : 'text-slate-400 hover:text-white hover:bg-[#111827]'
                }`}
                title="My Profile"
                aria-label="My Profile"
              >
                <User className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                onSelectTab('profile');
                onClose();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer group ${
                isProfileActive
                  ? isLight
                    ? 'bg-blue-600 text-white shadow-md border border-blue-600'
                    : 'bg-[#22D3EE] text-slate-950 font-black shadow-[0_0_18px_rgba(34,211,238,0.45)] border border-cyan-300'
                  : isLight
                  ? 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 border border-transparent'
                  : 'text-slate-300 hover:text-white hover:bg-[#111827] border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <User className={`w-4 h-4 ${isProfileActive ? (isLight ? 'text-white' : 'text-slate-950') : isLight ? 'text-slate-500' : 'text-slate-400'}`} />
                <span>My Profile</span>
              </div>
            </button>
          )}

          {/* 3. SETTINGS & PREFERENCES */}
          {isCollapsed ? (
            <div className="flex justify-center">
              <button
                onClick={() => {
                  onSelectTab('settings');
                  onClose();
                }}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                  isSettingsActive
                    ? isLight
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-[#22D3EE] text-slate-950 font-bold shadow-md'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
                    : 'text-slate-400 hover:text-white hover:bg-[#111827]'
                }`}
                title="Settings & Preferences"
                aria-label="Settings & Preferences"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                onSelectTab('settings');
                onClose();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer group ${
                isSettingsActive
                  ? isLight
                    ? 'bg-blue-600 text-white shadow-md border border-blue-600'
                    : 'bg-[#22D3EE] text-slate-950 font-black shadow-[0_0_18px_rgba(34,211,238,0.45)] border border-cyan-300'
                  : isLight
                  ? 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 border border-transparent'
                  : 'text-slate-300 hover:text-white hover:bg-[#111827] border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Settings className={`w-4 h-4 ${isSettingsActive ? (isLight ? 'text-white' : 'text-slate-950') : isLight ? 'text-slate-500' : 'text-slate-400'}`} />
                <span>Settings & Preferences</span>
              </div>
            </button>
          )}

          {/* 4. HELP & SUPPORT */}
          {isCollapsed ? (
            <div className="flex justify-center">
              <button
                onClick={() => {
                  setHelpSupportOpen(true);
                  onClose();
                }}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                  isLight
                    ? 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
                    : 'text-slate-400 hover:text-white hover:bg-[#111827]'
                }`}
                title="Help & Support"
                aria-label="Help & Support"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setHelpSupportOpen(true);
                onClose();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer group ${
                isLight
                  ? 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
                  : 'text-slate-300 hover:text-white hover:bg-[#111827]'
              }`}
            >
              <div className="flex items-center gap-3">
                <HelpCircle className={`w-4 h-4 ${isLight ? 'text-slate-500' : 'text-slate-400'}`} />
                <span>Help & Support</span>
              </div>
            </button>
          )}

          {/* 5. LOGOUT */}
          {isCollapsed ? (
            <div className="flex justify-center pt-2">
              <button
                onClick={logout}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                  isLight
                    ? 'text-rose-600 hover:bg-rose-50'
                    : 'text-slate-400 hover:text-rose-400 hover:bg-[#111827]'
                }`}
                title="Logout"
                aria-label="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              onClick={logout}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer group mt-1 ${
                isLight
                  ? 'text-slate-700 hover:text-rose-600 hover:bg-rose-50'
                  : 'text-slate-300 hover:text-rose-400 hover:bg-[#111827]'
              }`}
            >
              <div className="flex items-center gap-3">
                <LogOut className={`w-4 h-4 ${isLight ? 'text-slate-500 group-hover:text-rose-600' : 'text-slate-400 group-hover:text-rose-400'}`} />
                <span>Logout</span>
              </div>
            </button>
          )}
        </nav>

        {/* ================= BOTTOM FOOTER WAVE ================= */}
        <div className="relative mt-auto pt-6 pb-5 px-4 overflow-hidden shrink-0">
          {/* Ambient Wave Graphic Graphic matching Image 1 */}
          <div className="absolute inset-0 pointer-events-none opacity-40">
            <svg
              viewBox="0 0 288 80"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full object-cover"
              preserveAspectRatio="none"
            >
              <path
                d="M0 45C50 25 110 65 170 40C230 15 260 50 288 35V80H0V45Z"
                fill="url(#sidebarWaveGrad)"
              />
              <defs>
                <linearGradient id="sidebarWaveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0284C7" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#00B2FE" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#22D3EE" stopOpacity="0.9" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {!isCollapsed ? (
            <div className="relative z-10 text-center py-1">
              <span className="slogan-script-text text-xl font-bold tracking-wide text-white drop-shadow-[0_2px_8px_rgba(2,132,199,0.5)] block">
                Learn • Grow • Achieve
              </span>
            </div>
          ) : (
            <div className="relative z-10 flex justify-center py-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
