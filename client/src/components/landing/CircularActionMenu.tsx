import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LogIn, GraduationCap, UserPlus, X, Plus, Compass } from 'lucide-react';

interface CircularActionMenuProps {
  onReplayIntro?: () => void;
}

export const CircularActionMenu: React.FC<CircularActionMenuProps> = ({ onReplayIntro }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const actions = [
    {
      id: 'signin',
      title: 'Sign In',
      subtitle: 'Portal Login',
      to: '/login',
      isExternal: false,
      icon: LogIn,
      bg: 'bg-indigo-600 hover:bg-indigo-500 text-white',
      border: 'border-indigo-400/40',
      badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      // Radial offset on desktop/tablet: left item (-110px x, -90px y)
      desktopStyle: { transform: isOpen ? 'translate(-115px, -85px) scale(1)' : 'translate(0px, 0px) scale(0)' },
      mobileStyle: { transform: isOpen ? 'translate(-95px, -80px) scale(1)' : 'translate(0px, 0px) scale(0)' }
    },
    {
      id: 'apply',
      title: 'Apply Now',
      subtitle: 'Admissions 2026',
      to: '/application.html',
      isExternal: true,
      icon: GraduationCap,
      bg: 'bg-emerald-600 hover:bg-emerald-500 text-white',
      border: 'border-emerald-400/40',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      // Center item straight up (0px x, -135px y)
      desktopStyle: { transform: isOpen ? 'translate(0px, -130px) scale(1)' : 'translate(0px, 0px) scale(0)' },
      mobileStyle: { transform: isOpen ? 'translate(0px, -120px) scale(1)' : 'translate(0px, 0px) scale(0)' }
    },
    {
      id: 'register',
      title: 'Register',
      subtitle: 'Create Account',
      to: '/register',
      isExternal: false,
      icon: UserPlus,
      bg: 'bg-cyan-600 hover:bg-cyan-500 text-white',
      border: 'border-cyan-400/40',
      badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      // Right item (+110px x, -90px y)
      desktopStyle: { transform: isOpen ? 'translate(115px, -85px) scale(1)' : 'translate(0px, 0px) scale(0)' },
      mobileStyle: { transform: isOpen ? 'translate(95px, -80px) scale(1)' : 'translate(0px, 0px) scale(0)' }
    }
  ];

  return (
    <>
      {/* Dimmed Backdrop when menu is active */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Floating Radial Dock at Bottom Center with comfortable clearance above footer */}
      <div className="fixed bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center select-none pointer-events-auto">
        {/* Animated Circular Action Buttons */}
        <div className="relative flex items-center justify-center">
          {actions.map((action, idx) => {
            const Icon = action.icon;
            const content = (
              <div className="flex flex-col items-center gap-1.5 group cursor-pointer">
                {/* Circular Button */}
                <div
                  className={`w-14 h-14 md:w-16 md:h-16 rounded-full ${action.bg} border-2 ${action.border} shadow-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 active:scale-95`}
                >
                  <Icon className="w-6 h-6 md:w-7 md:h-7" />
                </div>
                {/* Label Pill */}
                <div className={`px-2.5 py-0.5 rounded-full ${action.badge} border text-[11px] font-bold shadow-md whitespace-nowrap group-hover:bg-opacity-40 transition-colors`}>
                  {action.title}
                </div>
              </div>
            );

            return (
              <div
                key={action.id}
                style={action.desktopStyle}
                className={`absolute transition-all duration-300 ease-out ${
                  isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
              >
                {action.isExternal ? (
                  <a href={action.to}>{content}</a>
                ) : (
                  <Link to={action.to} onClick={() => setIsOpen(false)}>
                    {content}
                  </Link>
                )}
              </div>
            );
          })}

          {/* Central Trigger Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`group relative flex items-center gap-2.5 px-6 py-3.5 rounded-full shadow-2xl transition-all duration-300 active:scale-95 ${
              isOpen
                ? 'bg-rose-600 hover:bg-rose-500 text-white ring-4 ring-rose-500/30'
                : 'bg-gradient-to-r from-brand-600 via-indigo-600 to-cyan-600 hover:from-brand-500 hover:to-cyan-500 text-white ring-4 ring-brand-500/20'
            }`}
            aria-label="Toggle Portal Actions Menu"
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-300 ${
                isOpen ? 'rotate-90' : 'rotate-0'
              }`}
            >
              {isOpen ? <X className="w-5 h-5" /> : <Compass className="w-5 h-5 group-hover:rotate-45 transition-transform" />}
            </div>
            <span className="font-extrabold text-xs md:text-sm tracking-wide">
              {isOpen ? 'Close Menu' : 'Get Started'}
            </span>
          </button>
        </div>
      </div>
    </>
  );
};
