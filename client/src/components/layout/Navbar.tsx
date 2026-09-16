import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { getProfilePictureUrl } from '../../utils/imageUrl';
import {
  Menu,
  Search,
  Command,
  Building2,
  ChevronDown,
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
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, onOpenCommandPalette, title }) => {
  const { user, role } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { currentSchool, schoolsList, setSchoolById } = useSchool();
  const [showSchoolMenu, setShowSchoolMenu] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-[#0F172A]/95 px-4 md:px-8 backdrop-blur-md transition-colors">
      {/* Left: Mobile Toggle + User Profile Avatar */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5 transition-colors md:hidden"
            aria-label="Toggle navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-sm overflow-hidden shrink-0 border border-white/10 relative">
            <span className="select-none">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : (user?.email?.charAt(0).toUpperCase() || 'L')}
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
          <div className="hidden sm:flex flex-col">
            <span className="text-xs font-bold text-slate-900 dark:text-white leading-none truncate max-w-[130px]">
              {user?.full_name || 'Learner'}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium capitalize mt-0.5">
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
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-[#151E32]/90 border border-slate-200/90 dark:border-white/10 transition-all text-left shadow-xs group ${
                canSwitch ? 'hover:bg-slate-200/90 dark:hover:bg-[#1E293B] hover:border-brand-500/40 cursor-pointer' : 'cursor-default opacity-95'
              }`}
              title={switcherTooltip}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center border shadow-sm transition-transform group-hover:scale-105 overflow-hidden"
                style={{
                  backgroundColor: `${currentSchool?.primary_color || '#4f46e5'}20`,
                  borderColor: `${currentSchool?.primary_color || '#4f46e5'}50`
                }}
              >
                <FusionAppIcon className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs md:text-sm font-extrabold font-display text-slate-900 dark:text-white tracking-wide uppercase line-clamp-1 max-w-[180px] md:max-w-[260px]">
                    {currentSchool?.name || 'Fusion High School'}
                  </span>
                  {isMasterAdmin ? (
                    <span className="hidden md:inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30 font-mono">
                      Master Admin
                    </span>
                  ) : role === 'admin' ? (
                    <span className="hidden md:inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30 font-mono">
                      School Admin
                    </span>
                  ) : isParentWithMultipleSchools ? (
                    <span className="hidden md:inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 font-mono">
                      {parentEnrolledSchoolIds.length} Schools
                    </span>
                  ) : null}
                </div>
                {currentSchool?.motto && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400/90 font-medium italic truncate max-w-[200px] block">
                    "{currentSchool.motto}"
                  </span>
                )}
              </div>
              {canSwitch && (
                <ChevronDown className={`w-3.5 h-3.5 text-slate-500 dark:text-slate-400 transition-transform ${showSchoolMenu ? 'rotate-180 text-brand-500' : ''}`} />
              )}
            </button>

        {/* Multi-School Switcher Dropdown */}
        {showSchoolMenu && canSwitch && (
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 md:w-96 rounded-2xl bg-white dark:bg-[#151E32] border border-slate-200/90 dark:border-white/15 shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl"
            onMouseLeave={() => setShowSchoolMenu(false)}
          >
            <div className="px-3 py-2 border-b border-slate-200/80 dark:border-white/10 mb-1.5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-cyan-400" />
                  {isMasterAdmin ? 'Enrolled Partner Schools (Limpopo & Gauteng)' : "Your Children's Enrolled Schools"}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {isMasterAdmin ? 'Select a high school to switch institutional branding' : 'Switch institutional view to monitor your enrolled child'}
                </p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-600 dark:text-brand-300 font-mono font-bold">
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
                        ? 'bg-brand-500/10 dark:bg-brand-500/20 border border-brand-500/40 text-brand-600 dark:text-white shadow-glow-indigo'
                        : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-transparent'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border overflow-hidden"
                      style={{
                        backgroundColor: `${school.primary_color}25`,
                        borderColor: `${school.primary_color}60`
                      }}
                    >
                      <FusionAppIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate text-slate-900 dark:text-white">{school.name}</p>
                      {school.motto && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400/90 italic truncate font-medium">
                          "{school.motto}"
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 shadow-glow-emerald shrink-0" />
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
            className="hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-slate-100/90 dark:bg-[#151E32]/90 hover:bg-slate-200/90 dark:hover:bg-white/5 border border-slate-200/90 dark:border-white/10 hover:border-brand-500/40 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all shadow-xs group hover:shadow-glow-indigo"
            title="Search anywhere (Ctrl + K)"
          >
            <Search className="w-3.5 h-3.5 text-indigo-600 dark:text-cyan-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium">Quick Search...</span>
            <kbd className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-[9px] font-mono text-slate-600 dark:text-slate-300">
              <Command className="w-2.5 h-2.5" />
              <span>K</span>
            </kbd>
          </button>
        )}

        {/* 1-Click Executive Theme Switcher (Light / Dark / Navy) */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100/90 dark:bg-[#151E32]/90 hover:bg-slate-200/90 dark:hover:bg-white/10 border border-slate-200/90 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all shadow-xs cursor-pointer group"
          title={`Switch Theme (Current: ${theme === 'light' ? 'Light Mode' : theme === 'navy' ? 'Slate Navy' : 'Dark Mode'})`}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? (
            <>
              <Moon className="w-4 h-4 text-indigo-600 transition-transform group-hover:-rotate-12" />
              <span className="text-[11px] font-semibold text-slate-700 hidden lg:inline">Dark</span>
            </>
          ) : theme === 'navy' ? (
            <>
              <Sun className="w-4 h-4 text-amber-400 transition-transform group-hover:rotate-45" />
              <span className="text-[11px] font-semibold text-slate-300 hidden lg:inline">Light</span>
            </>
          ) : (
            <>
              <Sun className="w-4 h-4 text-amber-400 transition-transform group-hover:rotate-45" />
              <span className="text-[11px] font-semibold text-slate-300 hidden lg:inline">Light</span>
            </>
          )}
        </button>

        {/* Notification Bell Dropdown */}
        <NotificationDropdown />
      </div>
    </header>
  );
};
