import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { LogIn, GraduationCap, UserPlus, X, ChevronUp, Lock, ShieldAlert } from 'lucide-react';
import { systemControlService } from '../../services/api';

interface GetStartedCircularMenuProps {
  className?: string;
}

export const GetStartedCircularMenu: React.FC<GetStartedCircularMenuProps> = ({
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [portalControls, setPortalControls] = useState<Record<string, any>>({});
  const [lockedAlert, setLockedAlert] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Load gatekeeper portal locks
  useEffect(() => {
    systemControlService.getPortalLocks().then(res => {
      if (res.success && res.controls) {
        setPortalControls(res.controls);
      }
    }).catch(() => {});
  }, []);

  // Close on Escape or click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const isApplyLocked = Boolean(portalControls.parent_application?.is_locked);
  const isRegisterLocked = Boolean(portalControls.user_registration?.is_locked);

  const items = [
    {
      id: 'signin',
      title: 'Sign In',
      subtitle: 'Portal Login',
      to: '/login',
      isExternal: false,
      isLocked: false,
      icon: LogIn,
      // Radiant Indigo theme - Always Open!
      gradient: 'from-indigo-600 to-blue-600',
      border: 'border-indigo-400',
      glow: 'shadow-[0_0_30px_rgba(99,102,241,0.7),0_10px_25px_rgba(0,0,0,0.6)]',
      hoverGlow: 'hover:shadow-[0_0_55px_rgba(99,102,241,0.95),0_20px_35px_rgba(0,0,0,0.85)]',
      pillBg: 'bg-indigo-950/80 border-indigo-500/40 text-indigo-200 group-hover:text-white group-hover:border-indigo-400',
      desktopTransform: isOpen ? 'translate(-115px, -85px) scale(1)' : 'translate(0px, 0px) scale(0)',
      mobileTransform: isOpen ? 'translate(-95px, -70px) scale(1)' : 'translate(0px, 0px) scale(0)'
    },
    {
      id: 'apply',
      title: isApplyLocked ? 'Apply (Locked)' : 'Apply',
      subtitle: isApplyLocked ? 'Admissions Closed' : '2026 Admissions',
      to: '/application.html',
      isExternal: true,
      isLocked: isApplyLocked,
      lockReason: portalControls.parent_application?.locked_reason || 'Admissions application intake is currently closed by Geleza SA Administrators.',
      icon: isApplyLocked ? Lock : GraduationCap,
      // Radiant Emerald / Rose if locked
      gradient: isApplyLocked ? 'from-rose-700 to-slate-800' : 'from-emerald-600 to-teal-600',
      border: isApplyLocked ? 'border-rose-400/80' : 'border-emerald-400',
      glow: isApplyLocked ? 'shadow-[0_0_20px_rgba(244,63,94,0.4)]' : 'shadow-[0_0_30px_rgba(16,185,129,0.7),0_10px_25px_rgba(0,0,0,0.6)]',
      hoverGlow: 'hover:shadow-[0_0_55px_rgba(16,185,129,0.95),0_20px_35px_rgba(0,0,0,0.85)]',
      pillBg: isApplyLocked ? 'bg-rose-950/90 border-rose-500/50 text-rose-300' : 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200 group-hover:text-white group-hover:border-emerald-400',
      desktopTransform: isOpen ? 'translate(0px, -135px) scale(1)' : 'translate(0px, 0px) scale(0)',
      mobileTransform: isOpen ? 'translate(0px, -115px) scale(1)' : 'translate(0px, 0px) scale(0)'
    },
    {
      id: 'register',
      title: isRegisterLocked ? 'Register (Locked)' : 'Registration',
      subtitle: isRegisterLocked ? 'Admins Closed' : 'Parent & Staff',
      to: '/register',
      isExternal: false,
      isLocked: isRegisterLocked,
      lockReason: portalControls.user_registration?.locked_reason || 'User registration is currently closed by Geleza SA Administrators.',
      icon: isRegisterLocked ? Lock : UserPlus,
      // Radiant Cyan / Amber if locked
      gradient: isRegisterLocked ? 'from-amber-700 to-slate-800' : 'from-cyan-600 to-sky-600',
      border: isRegisterLocked ? 'border-amber-400/80' : 'border-cyan-400',
      glow: isRegisterLocked ? 'shadow-[0_0_20px_rgba(245,158,11,0.4)]' : 'shadow-[0_0_30px_rgba(6,182,212,0.7),0_10px_25px_rgba(0,0,0,0.6)]',
      hoverGlow: 'hover:shadow-[0_0_55px_rgba(6,182,212,0.95),0_20px_35px_rgba(0,0,0,0.85)]',
      pillBg: isRegisterLocked ? 'bg-amber-950/90 border-amber-500/50 text-amber-300' : 'bg-cyan-950/80 border-cyan-500/40 text-cyan-200 group-hover:text-white group-hover:border-cyan-400',
      desktopTransform: isOpen ? 'translate(115px, -85px) scale(1)' : 'translate(0px, 0px) scale(0)',
      mobileTransform: isOpen ? 'translate(95px, -70px) scale(1)' : 'translate(0px, 0px) scale(0)'
    }
  ];

  const handleItemClick = (e: React.MouseEvent, item: any) => {
    if (item.isLocked && item.id === 'apply') {
      e.preventDefault();
      setLockedAlert(item.lockReason || 'Application intake is currently closed by Geleza SA Administrators.');
      return;
    }
    setIsOpen(false);
  };

  return (
    <div ref={menuRef} className={`relative flex flex-col items-center justify-center select-none ${className}`}>
      
      {/* Dimmed Background Overlay when circular menu is open */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 animate-fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Locked Alert Modal for Application button */}
      {lockedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <Lock className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 inline-flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-rose-400" />
                Admissions Window Closed
              </span>
              <h3 className="text-base font-black text-white">
                Application Intake Locked
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {lockedAlert}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setLockedAlert(null)}
                className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs transition-colors"
              >
                Close
              </button>
              <Link
                to="/login"
                onClick={() => {
                  setLockedAlert(null);
                  setIsOpen(false);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Go to Login</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Circular Orbit & Action Buttons Container */}
      <div className="relative flex items-center justify-center z-40">
        
        {/* Glowing Circular Orbit Halo Ring (visible when opened) */}
        {isOpen && (
          <div className="absolute w-64 h-64 sm:w-72 sm:h-72 rounded-full border-2 border-dashed border-cyan-400/40 bg-gradient-to-b from-indigo-950/50 via-cyan-950/30 to-transparent backdrop-blur-md shadow-[0_0_50px_rgba(6,182,212,0.3)] animate-fade-in pointer-events-none flex items-center justify-center">
            {/* Concentric inner orbit pulse */}
            <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-full border border-indigo-500/30 animate-pulse-subtle" />
          </div>
        )}

        {/* The 3 Circular Glowing Action Buttons */}
        {items.map((item) => {
          const IconComp = item.icon;
          const isDesktop = typeof window !== 'undefined' ? window.innerWidth >= 640 : true;
          const transformStyle = isDesktop ? item.desktopTransform : item.mobileTransform;

          const buttonContent = (
            <div className="flex flex-col items-center gap-1.5 group cursor-pointer transition-all duration-300">
              
              {/* Circular Button Orb with Neon Glow & Hover Shadow */}
              <div
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br ${item.gradient} border-2 ${item.border} ${item.glow} ${item.hoverGlow} flex items-center justify-center text-white transition-all duration-300 transform-gpu group-hover:scale-115 active:scale-95 group-hover:-translate-y-1 relative overflow-hidden`}
              >
                {/* Specular light shimmer on top */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-black/20 pointer-events-none" />
                <IconComp className="w-6 h-6 sm:w-7 sm:h-7 drop-shadow-md group-hover:scale-110 transition-transform duration-300 relative z-10" />
                {item.isLocked && (
                  <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-rose-500 border border-white flex items-center justify-center">
                    <Lock className="w-2 h-2 text-white" />
                  </div>
                )}
              </div>

              {/* Title & Badge with High Contrast Glow */}
              <div
                className={`px-2.5 py-0.5 rounded-full border text-[11px] sm:text-xs font-black tracking-wide shadow-lg backdrop-blur-md transition-all duration-300 whitespace-nowrap group-hover:scale-105 ${item.pillBg}`}
              >
                {item.title}
              </div>
            </div>
          );

          return (
            <div
              key={item.id}
              style={{ transform: transformStyle }}
              className={`absolute transition-all duration-400 ease-out z-40 ${
                isOpen
                  ? 'opacity-100 pointer-events-auto'
                  : 'opacity-0 pointer-events-none'
              }`}
            >
              {item.isExternal ? (
                <a href={item.to} onClick={(e) => handleItemClick(e, item)}>
                  {buttonContent}
                </a>
              ) : (
                <Link to={item.to} onClick={(e) => handleItemClick(e, item)}>
                  {buttonContent}
                </Link>
              )}
            </div>
          );
        })}

        {/* Central "Get Started" Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`relative z-50 flex items-center gap-2.5 px-8 py-4 rounded-full font-display font-extrabold text-sm sm:text-base tracking-wide transition-all duration-300 active:scale-95 border-2 ${
            isOpen
              ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 shadow-[0_0_35px_rgba(244,63,94,0.7)]'
              : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white border-cyan-400/50 shadow-[0_0_30px_rgba(37,99,235,0.65),0_10px_25px_rgba(0,0,0,0.5)] hover:shadow-[0_0_45px_rgba(6,182,212,0.85)] hover:scale-105'
          }`}
          aria-expanded={isOpen}
          aria-label="Get Started"
        >
          {isOpen && (
            <div className="w-5 h-5 rounded-full flex items-center justify-center">
              <X className="w-5 h-5 text-white" />
            </div>
          )}

          <span>{isOpen ? 'Close Actions' : 'Get Started'}</span>

          {!isOpen && (
            <ChevronUp className="w-4 h-4 text-cyan-200/80 animate-bounce" />
          )}
        </button>
      </div>
    </div>
  );
};
