import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { LogIn, GraduationCap, UserPlus, Lock, ShieldAlert, Building2 } from 'lucide-react';
import { systemControlService } from '../../services/api';
import { intakeClosed, intakeReason } from '../../utils/admissionGate';

interface GetStartedCircularMenuProps {
  className?: string;
  onRegisterSchool?: () => void;
}

export const GetStartedCircularMenu: React.FC<GetStartedCircularMenuProps> = ({
  className = '',
  onRegisterSchool
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

  const isSchoolLocked = intakeClosed(portalControls.school_registration);
  const schoolReason = intakeReason(portalControls.school_registration, 'School registration is currently closed.');
  const isApplyLocked = intakeClosed(portalControls.parent_application);
  const isRegisterLocked = intakeClosed(portalControls.parent_registration) || intakeClosed(portalControls.user_registration);
  const applyReason = intakeReason(portalControls.parent_application, 'New family applications are closed.');
  const registerReason = intakeReason(portalControls.parent_registration, intakeReason(portalControls.user_registration, 'Parent registration is closed.'));

  const items = [
    {
      id: 'signin',
      title: 'Sign In',
      subtitle: 'Portal Login',
      to: '/login',
      isExternal: false,
      closed: false,
      closedMessage: '',
      icon: LogIn,
      gradient: 'from-indigo-600 to-blue-600',
      border: 'border-indigo-400',
      glow: 'shadow-[0_0_30px_rgba(99,102,241,0.7),0_10px_25px_rgba(0,0,0,0.6)]',
      hoverGlow: 'hover:shadow-[0_0_55px_rgba(99,102,241,0.95),0_20px_35px_rgba(0,0,0,0.85)]',
      pillBg: 'bg-indigo-950/80 border-indigo-500/40 text-indigo-200 group-hover:text-white group-hover:border-indigo-400',
    },
    {
      id: 'apply',
      title: isApplyLocked ? 'Apply closed' : 'Apply',
      subtitle: '2026 Admissions',
      to: '/application.html',
      isExternal: true,
      closed: isApplyLocked,
      closedMessage: applyReason,
      icon: isApplyLocked ? Lock : GraduationCap,
      gradient: isApplyLocked ? 'from-slate-600 to-slate-700' : 'from-emerald-600 to-teal-600',
      border: isApplyLocked ? 'border-slate-400' : 'border-emerald-400',
      glow: isApplyLocked ? 'shadow-[0_0_20px_rgba(15,23,42,0.45)]' : 'shadow-[0_0_30px_rgba(16,185,129,0.7),0_10px_25px_rgba(0,0,0,0.6)]',
      hoverGlow: 'hover:shadow-[0_0_55px_rgba(16,185,129,0.95),0_20px_35px_rgba(0,0,0,0.85)]',
      pillBg: isApplyLocked ? 'bg-slate-950/80 border-slate-500/40 text-slate-200' : 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200 group-hover:text-white group-hover:border-emerald-400',
    },
    {
      id: 'school',
      title: isSchoolLocked ? 'School closed' : 'Register School',
      subtitle: 'New campus',
      to: '',
      isExternal: false,
      closed: isSchoolLocked,
      closedMessage: schoolReason,
      action: 'school' as const,
      icon: isSchoolLocked ? Lock : Building2,
      gradient: isSchoolLocked ? 'from-slate-600 to-slate-700' : 'from-[#8a6424] to-[#c6a15b]',
      border: isSchoolLocked ? 'border-slate-400' : 'border-[#e7c56a]',
      glow: isSchoolLocked ? 'shadow-[0_0_20px_rgba(15,23,42,0.45)]' : 'shadow-[0_0_30px_rgba(198,161,91,0.7),0_10px_25px_rgba(0,0,0,0.6)]',
      hoverGlow: 'hover:shadow-[0_0_55px_rgba(231,197,106,0.95),0_20px_35px_rgba(0,0,0,0.85)]',
      pillBg: isSchoolLocked ? 'bg-slate-950/80 border-slate-500/40 text-slate-200' : 'bg-[#2a2112]/80 border-[#c6a15b]/40 text-[#f6e6b4] group-hover:text-white group-hover:border-[#e7c56a]',
    },
    {
      id: 'register',
      title: isRegisterLocked ? 'Registration closed' : 'Registration',
      subtitle: 'Parent & Staff',
      to: '/register',
      isExternal: false,
      closed: isRegisterLocked,
      closedMessage: registerReason,
      icon: isRegisterLocked ? Lock : UserPlus,
      gradient: isRegisterLocked ? 'from-slate-600 to-slate-700' : 'from-cyan-600 to-sky-600',
      border: isRegisterLocked ? 'border-slate-400' : 'border-cyan-400',
      glow: isRegisterLocked ? 'shadow-[0_0_20px_rgba(15,23,42,0.45)]' : 'shadow-[0_0_30px_rgba(6,182,212,0.7),0_10px_25px_rgba(0,0,0,0.6)]',
      hoverGlow: 'hover:shadow-[0_0_55px_rgba(6,182,212,0.95),0_20px_35px_rgba(0,0,0,0.85)]',
      pillBg: isRegisterLocked ? 'bg-slate-950/80 border-slate-500/40 text-slate-200' : 'bg-cyan-950/80 border-cyan-500/40 text-cyan-200 group-hover:text-white group-hover:border-cyan-400',
    },
  ];

  const getItemTransform = (index: number, total: number) => {
    if (!isOpen) return 'translate(-50%, 24px) scale(0)';
    if (total === 4) {
      const spots = [
        'translate(calc(-50% - 168px), -16px) scale(1)',
        'translate(calc(-50% - 72px), -112px) scale(1)',
        'translate(calc(-50% + 72px), -112px) scale(1)',
        'translate(calc(-50% + 168px), -16px) scale(1)'
      ];
      return spots[index] || 'translate(-50%, -108px) scale(1)';
    }
    if (total === 1) return 'translate(-50%, -108px) scale(1)';
    if (total === 2) {
      return index === 0
        ? 'translate(calc(-50% - 150px), -36px) scale(1)'
        : 'translate(calc(-50% + 150px), -36px) scale(1)';
    }
    if (index === 0) return 'translate(calc(-50% - 168px), -28px) scale(1)';
    if (index === 1) return 'translate(-50%, -118px) scale(1)';
    return 'translate(calc(-50% + 168px), -28px) scale(1)';
  };

  const openItem = (item: { closed?: boolean; closedMessage?: string; to: string; isExternal: boolean; action?: 'school' }) => {
    if (item.closed) {
      setLockedAlert(item.closedMessage || 'This intake is closed.');
      return;
    }
    setIsOpen(false);
    if (item.action === 'school') {
      onRegisterSchool?.();
      return;
    }
    window.location.assign(item.to);
  };

  return (
    <div ref={menuRef} className={`relative flex flex-col items-center justify-center select-none ${className}`}>
      
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
      <div className="relative z-40 mx-auto h-[250px] w-full max-w-[440px]">
        {isOpen && (
          <div className="pointer-events-none absolute bottom-5 left-1/2 h-[200px] w-[min(400px,100%)] -translate-x-1/2 rounded-t-full border-2 border-b-0 border-dashed border-cyan-400/70" />
        )}

        {/* Circular Glowing Action Buttons */}
        {items.map((item, index) => {
          const IconComp = item.icon;
          const transformStyle = getItemTransform(index, items.length);

          const buttonContent = (
            <div className="flex flex-col items-center gap-1.5 group cursor-pointer transition-all duration-300">
              
              {/* Circular Button Orb with Neon Glow & Hover Shadow */}
              <div
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br ${item.gradient} border-2 ${item.border} ${item.glow} ${item.hoverGlow} flex items-center justify-center text-white transition-all duration-300 transform-gpu group-hover:scale-115 active:scale-95 group-hover:-translate-y-1 relative overflow-hidden`}
              >
                {/* Specular light shimmer on top */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-black/20 pointer-events-none" />
                <IconComp className="w-6 h-6 sm:w-7 sm:h-7 drop-shadow-md group-hover:scale-110 transition-transform duration-300 relative z-10" />
              </div>

              {/* Title & Badge with High Contrast Glow */}
              <div
                className={`px-2.5 py-0.5 rounded-full border text-[11px] sm:text-xs font-black tracking-wide shadow-lg transition-all duration-300 whitespace-nowrap group-hover:scale-105 ${item.pillBg}`}
              >
                {item.title}
              </div>
            </div>
          );

          return (
            <div
              key={item.id}
              style={{ transform: transformStyle }}
              className={`absolute left-1/2 bottom-16 transition-all duration-400 ease-out z-40 ${
                isOpen
                  ? 'opacity-100 pointer-events-auto'
                  : 'opacity-0 pointer-events-none'
              }`}
            >
              <button type="button" onClick={() => openItem(item)} className="bg-transparent border-0 p-0">
                {buttonContent}
              </button>
            </div>
          );
        })}

        {/* Central "Get Started" Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute left-1/2 bottom-0 -translate-x-1/2 z-50 flex w-[210px] h-[52px] items-center justify-center rounded-full font-display font-extrabold text-sm sm:text-base tracking-wide border-2 whitespace-nowrap bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white border-cyan-400/50 shadow-[0_0_30px_rgba(37,99,235,0.65),0_10px_25px_rgba(0,0,0,0.5)]"
          aria-expanded={isOpen}
          aria-label="Get Started"
        >
          <span>Get Started</span>
        </button>
      </div>
    </div>
  );
};
