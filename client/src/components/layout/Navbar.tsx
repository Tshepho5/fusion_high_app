import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme, AppTheme, AppFont } from '../../context/ThemeContext';
import { useSchool } from '../../context/SchoolContext';
import { getProfilePictureUrl } from '../../utils/imageUrl';
import {
  Palette,
  Sun,
  Moon,
  Menu,
  GraduationCap,
  Briefcase,
  Users,
  ShieldAlert,
  Check,
  Type,
  Search,
  Command,
  Building2,
  ChevronDown
} from 'lucide-react';

import { NotificationDropdown } from './NotificationDropdown';

interface NavbarProps {
  onToggleSidebar?: () => void;
  onOpenCommandPalette?: () => void;
  title?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, onOpenCommandPalette, title }) => {
  const { user, role } = useAuth();
  const { theme, font, setTheme, setFont, toggleTheme } = useTheme();
  const { currentSchool, schoolsList, setSchoolById } = useSchool();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showSchoolMenu, setShowSchoolMenu] = useState(false);

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
      {/* Left: Mobile Toggle + User Profile Avatar */}
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

      {/* Middle: Dynamic Multi-School Header & Switcher */}
      {(() => {
        const isMasterAdmin = Boolean(user?.is_superadmin || (user?.email && user.email.toLowerCase() === '202247878@myturf.ul.ac.za'));
        const userRole = (role || user?.role || '').toLowerCase();

        // Enrolled schools for a parent (if children attend different schools)
        const parentEnrolledSchoolIds: number[] = (user?.enrolled_schools && Array.isArray(user.enrolled_schools) && user.enrolled_schools.length > 0)
          ? user.enrolled_schools.map((id: any) => Number(id))
          : (user?.children && Array.isArray(user.children) && user.children.length > 0)
          ? [...new Set(user.children.map((c: any) => Number(c.school_id)).filter(Boolean))] as number[]
          : [];

        // Determine if this user has permission to switch schools:
        // 1. SuperAdmin: can switch to any school
        // 2. Parent: can switch ONLY IF they have children enrolled in different schools (> 1 distinct schools)
        // 3. Teachers, Learners, Institutional Admins: strictly locked to their single school
        const isParentWithMultipleSchools = userRole === 'parent' && parentEnrolledSchoolIds.length > 1;
        const canSwitch = isMasterAdmin || isParentWithMultipleSchools;

        // Filter the available schools to switch between:
        // - For SuperAdmin: all partner schools
        // - For Parent: ONLY the schools where their children are enrolled
        const availableSchools = isMasterAdmin 
          ? schoolsList 
          : isParentWithMultipleSchools 
          ? schoolsList.filter(s => parentEnrolledSchoolIds.includes(s.id))
          : [];

        const switcherTooltip = isMasterAdmin
          ? 'Master Superadmin: Click to switch and monitor any school'
          : isParentWithMultipleSchools
          ? `Multi-School Parent: Switch between your children's ${parentEnrolledSchoolIds.length} enrolled schools`
          : userRole === 'parent'
          ? `Parent Portal: Scoped to your child's enrolled school (${currentSchool?.name || 'Assigned School'})`
          : userRole === 'teacher'
          ? `Educator Portal: Scoped to your appointed school (${currentSchool?.name || 'Assigned School'})`
          : userRole === 'learner'
          ? `Student Portal: Scoped to your enrolled school (${currentSchool?.name || 'Assigned School'})`
          : `Institutional Admin: Strictly scoped to ${currentSchool?.name || 'your school'}`;

        return (
          <div className="relative">
            <button
              onClick={() => {
                if (canSwitch) setShowSchoolMenu(!showSchoolMenu);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-dark/80 border border-white/10 transition-all text-left shadow-sm group ${
                canSwitch ? 'hover:bg-surface-dark hover:border-brand-500/40 cursor-pointer' : 'cursor-default opacity-95'
              }`}
              title={switcherTooltip}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center border shadow-sm transition-transform group-hover:scale-105"
                style={{
                  backgroundColor: `${currentSchool?.primary_color || '#4f46e5'}20`,
                  borderColor: `${currentSchool?.primary_color || '#4f46e5'}50`
                }}
              >
                <GraduationCap className="w-4 h-4" style={{ color: currentSchool?.primary_color || '#818cf8' }} />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs md:text-sm font-extrabold font-display text-white tracking-wide uppercase line-clamp-1 max-w-[180px] md:max-w-[260px]">
                    {currentSchool?.name || 'Fusion High School'}
                  </span>
                  {isMasterAdmin ? (
                    <span className="hidden md:inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                      Master Admin
                    </span>
                  ) : role === 'admin' ? (
                    <span className="hidden md:inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                      School Admin
                    </span>
                  ) : isParentWithMultipleSchools ? (
                    <span className="hidden md:inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                      {parentEnrolledSchoolIds.length} Schools
                    </span>
                  ) : null}
                </div>
                <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                  <span>{currentSchool?.circuit || 'Mankweng Circuit'}</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-cyan-400 font-bold">EMIS {currentSchool?.emis_number || '911220001'}</span>
                </span>
              </div>
              {canSwitch && (
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showSchoolMenu ? 'rotate-180 text-brand-400' : ''}`} />
              )}
            </button>

        {/* Multi-School Switcher Dropdown */}
        {showSchoolMenu && canSwitch && (
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 md:w-96 rounded-2xl bg-surface-dark border border-white/15 shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl"
            onMouseLeave={() => setShowSchoolMenu(false)}
          >
            <div className="px-3 py-2 border-b border-white/10 mb-1.5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                  {isMasterAdmin ? 'Enrolled Partner Schools (Limpopo & Gauteng)' : "Your Children's Enrolled Schools"}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {isMasterAdmin ? 'Select a high school to switch institutional branding' : 'Switch institutional view to monitor your enrolled child'}
                </p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 font-mono font-bold">
                {availableSchools.length} Schools
              </span>
            </div>

            <div className="space-y-1 max-h-72 overflow-y-auto custom-scrollbar">
              {availableSchools.map(school => {
                const isSelected = currentSchool?.id === school.id;
                return (
                  <button
                    key={school.id}
                    onClick={() => {
                      setSchoolById(school.id);
                      setShowSchoolMenu(false);
                    }}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all ${
                      isSelected
                        ? 'bg-brand-500/20 border border-brand-500/40 text-white shadow-glow-indigo'
                        : 'hover:bg-white/5 text-slate-300 hover:text-white border border-transparent'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border"
                      style={{
                        backgroundColor: `${school.primary_color}25`,
                        borderColor: `${school.primary_color}60`
                      }}
                    >
                      <GraduationCap className="w-4 h-4" style={{ color: school.primary_color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate text-white">{school.name}</p>
                      <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                        <span>{school.circuit}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-amber-400 italic">"{school.motto}"</span>
                      </p>
                    </div>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-glow-emerald shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  })()}

      {/* Right: Quick Search, Role, Dark/Light Mode, Theme Palette, Notifications */}
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
            onClick={() => setShowThemeMenu(!showThemeMenu)}
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
      </div>
    </header>
  );
};
