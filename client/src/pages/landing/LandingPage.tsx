import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useSchool } from '../../context/SchoolContext';
import { AboutUsModal } from '../../components/landing/AboutUsModal';
import { TermsAgreementModal } from '../../components/common/TermsAgreementModal';
import { FusionAppIcon } from '../../components/common/FusionAppIcon';
import { GelezaSplashWaves } from '../../components/landing/GelezaSplashWaves';
import { GetStartedCircularMenu } from '../../components/landing/GetStartedCircularMenu';
import {
  Sun,
  Moon,
  Info,
  Scale,
  HelpCircle,
  Building2,
  Lock,
  ShieldAlert,
  LogIn
} from 'lucide-react';
import { HelpSupportModal } from '../../components/common/HelpSupportModal';
import { SchoolRegistrationModal } from '../../components/landing/SchoolRegistrationModal';
import { systemControlService } from '../../services/api';
import { intakeClosed, intakeReason } from '../../utils/admissionGate';

export const LandingPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { currentSchool, schoolsList, setSchoolById } = useSchool();

  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);
  const [isTermsOpen, setIsTermsOpen] = useState<boolean>(false);
  const [isFaqOpen, setIsFaqOpen] = useState<boolean>(false);
  const [isSchoolRegisterOpen, setIsSchoolRegisterOpen] = useState<boolean>(false);

  // Executive Portal Control Lock State
  const [schoolRegLock, setSchoolRegLock] = useState<{ is_locked?: boolean; effectively_closed?: boolean; locked_reason?: string; public_reason?: string } | null>(null);
  const [showLockedModal, setShowLockedModal] = useState<boolean>(false);

  useEffect(() => {
    systemControlService.getPortalLocks().then(res => {
      if (res.success && res.controls?.school_registration) {
        setSchoolRegLock(res.controls.school_registration);
      }
    }).catch(() => {});
  }, []);

  const schoolIntakeClosed = intakeClosed(schoolRegLock);

  return (
    <div
      className="min-h-screen text-slate-900 dark:text-white flex flex-col justify-between selection:bg-cyan-600 selection:text-white relative overflow-hidden transition-colors duration-300 bg-[#f4f8fb] dark:bg-[#070b14]"
    >
      <GelezaSplashWaves />

      {/* Modals */}
      <AboutUsModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      <TermsAgreementModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} isMandatoryGate={false} />
      <HelpSupportModal isOpen={isFaqOpen} onClose={() => setIsFaqOpen(false)} defaultTab="faq" />
      <SchoolRegistrationModal isOpen={isSchoolRegisterOpen} onClose={() => setIsSchoolRegisterOpen(false)} />

      {/* Geleza SA Executive Lock Advisory Modal */}
      {showLockedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <Lock className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 inline-flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-rose-400" />
                Executive Gatekeeper Active
              </span>
              <h3 className="text-lg font-black text-white font-display">
                Institutional Registration Locked
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {intakeReason(schoolRegLock, 'School registration is currently closed.')}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 text-left space-y-1">
              <p className="font-bold text-slate-200">How to proceed:</p>
              <p>• Institutional school registration is opened during scheduled accreditation windows.</p>
              <p>• If your school received an onboarding invitation, contact Geleza SA Executive Support.</p>
              <p>• Registered schools and users can access their portal uninterrupted.</p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLockedModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
              <Link
                to="/login"
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Go to Login</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Global Header (Adapts smoothly to light & dark mode) */}
      <header className="relative z-30 px-4 md:px-8 py-3.5 bg-transparent transition-colors duration-300">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Logo & Platform Name */}
          <Link to="/" className="flex items-center gap-3.5 group">
            <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl p-1 border border-blue-500/30 bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center group-hover:scale-105 transition-transform shadow-md">
              <FusionAppIcon className="w-8 h-8 md:w-9 md:h-9" />
            </div>
            <div>
              <span className="font-display text-base md:text-lg font-black tracking-tight text-slate-900 dark:text-white block leading-tight uppercase group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors drop-shadow-xs dark:drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
                GELEZA SA
              </span>
            </div>
          </Link>

          {/* Header Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Controlled School Registration CTA: Only appears when NOT locked by admin */}
            <button
              onClick={() => {
                if (schoolIntakeClosed) setShowLockedModal(true);
                else setIsSchoolRegisterOpen(true);
              }}
              className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full font-bold text-xs border transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                schoolIntakeClosed
                  ? 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-white/10 dark:text-slate-200 dark:border-white/15'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-[0_0_15px_rgba(56,189,248,0.35)] border-cyan-400/40'
              }`}
              title={schoolIntakeClosed ? 'School applications are closed' : 'Register School'}
            >
              {schoolIntakeClosed ? <Lock className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5 text-cyan-100" />}
              <span>{schoolIntakeClosed ? 'School applications closed' : 'Register School'}</span>
            </button>

            <button
              onClick={() => setIsAboutOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 hover:text-slate-900 dark:text-slate-100 dark:hover:text-white border border-slate-200 dark:border-white/15 text-xs font-semibold backdrop-blur-md transition-all shadow-xs cursor-pointer"
            >
              <Info className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
              <span className="hidden sm:inline">About</span>
            </button>

            <button
              onClick={() => setIsTermsOpen(true)}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white border border-slate-200 dark:border-white/15 text-xs font-semibold backdrop-blur-md transition-all shadow-xs cursor-pointer"
            >
              <Scale className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
              <span>Policies</span>
            </button>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white bg-slate-100 hover:bg-slate-200/80 dark:bg-white/10 dark:hover:bg-white/15 transition-all border border-slate-200 dark:border-white/15 backdrop-blur-md shadow-xs cursor-pointer"
              title="Switch Theme"
              aria-label="Toggle Theme"
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4 text-slate-700" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 relative z-10 flex flex-col justify-center items-center px-4 sm:px-6 py-6 max-w-5xl mx-auto w-full text-center">
        <div className="space-y-8 w-full flex flex-col items-center">
          <div className="space-y-3">
            <h1 className="font-display text-5xl sm:text-7xl md:text-8xl font-medium tracking-tight text-slate-900 dark:text-white">
              Geleza SA
            </h1>
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.35em] text-cyan-800/80 dark:text-cyan-200/80">
              Geleza Smart, The Future Is Thine
            </p>
          </div>
          <GetStartedCircularMenu />
        </div>
      </main>

      {/* Clean Minimal 1-Line Footer (Adapts cleanly to light and dark modes) */}
      <footer className="py-4 px-4 bg-transparent text-xs text-slate-600 dark:text-slate-400 w-full relative z-20 transition-colors duration-300">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-center sm:text-left text-slate-600 dark:text-slate-400 font-medium">
            &copy; {new Date().getFullYear()} Geleza SA Academic Network.
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <button onClick={() => setIsAboutOpen(true)} className="hover:text-blue-600 dark:hover:text-blue-300 transition-colors text-slate-600 dark:text-slate-400 cursor-pointer">
              About Us
            </button>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <button onClick={() => setIsTermsOpen(true)} className="hover:text-blue-600 dark:hover:text-blue-300 transition-colors text-slate-600 dark:text-slate-400 cursor-pointer">
              Terms & Conditions
            </button>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <button
              onClick={() => setIsFaqOpen(true)}
              className="hover:text-blue-600 dark:hover:text-blue-300 transition-colors text-slate-600 dark:text-slate-400 flex items-center gap-1 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>View FAQs</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

