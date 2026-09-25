import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useSchool } from '../../context/SchoolContext';
import { CosmicCanvasBackground } from '../../components/landing/CosmicCanvasBackground';
import { ParticleLogoIntro } from '../../components/landing/ParticleLogoIntro';
import { AboutUsModal } from '../../components/landing/AboutUsModal';
import { TermsAgreementModal } from '../../components/common/TermsAgreementModal';
import { StarArrivalAppIcon } from '../../components/landing/StarArrivalAppIcon';
import { FusionAppIcon } from '../../components/common/FusionAppIcon';
import { GetStartedCircularMenu } from '../../components/landing/GetStartedCircularMenu';
import {
  Sun,
  Moon,
  Info,
  Scale,
  GraduationCap,
  HelpCircle,
  Building2,
  Lock,
  ShieldAlert,
  LogIn,
  AlertCircle
} from 'lucide-react';
import { HelpSupportModal } from '../../components/common/HelpSupportModal';
import { SchoolRegistrationModal } from '../../components/landing/SchoolRegistrationModal';
import { systemControlService } from '../../services/api';

// Sequence phases:
// 1. 'icon_arrival': Exactly 5 seconds while the app icon travels from deep space
// 2. 'typing_welcome': Welcome message types out letter-by-letter
// 3. 'typing_heading': "South Africa's Unified High Schools" types out letter-by-letter
// 4. 'ready': Typing is done, slogan fades in, and the "Get Started" button appears
type SequencePhase = 'icon_arrival' | 'typing_welcome' | 'typing_heading' | 'ready';

const TARGET_WELCOME = 'Welcome to Geleza SA';
const TARGET_HEADING = "South Africa's Unified High Schools";
const SPLIT_INDEX = 23; // "South Africa's Unified " has 23 characters

export const LandingPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { currentSchool, schoolsList, setSchoolById } = useSchool();

  const [showIntro, setShowIntro] = useState<boolean>(false);
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);
  const [isTermsOpen, setIsTermsOpen] = useState<boolean>(false);
  const [isFaqOpen, setIsFaqOpen] = useState<boolean>(false);
  const [isSchoolRegisterOpen, setIsSchoolRegisterOpen] = useState<boolean>(false);

  // Executive Portal Control Lock State
  const [schoolRegLock, setSchoolRegLock] = useState<{ is_locked: boolean; locked_reason?: string } | null>(null);
  const [showLockedModal, setShowLockedModal] = useState<boolean>(false);

  useEffect(() => {
    systemControlService.getPortalLocks().then(res => {
      if (res.success && res.controls?.school_registration) {
        setSchoolRegLock(res.controls.school_registration);
      }
    }).catch(() => {});
  }, []);

  const handleRegisterSchoolClick = () => {
    if (schoolRegLock?.is_locked) {
      setShowLockedModal(true);
    } else {
      setIsSchoolRegisterOpen(true);
    }
  };

  // Animation sequence states
  const [phase, setPhase] = useState<SequencePhase>('icon_arrival');
  const [welcomeText, setWelcomeText] = useState<string>('');
  const [headingText, setHeadingText] = useState<string>('');

  // 1. App icon done after 5 seconds -> transition to typing welcome message
  const handleArrivalComplete = () => {
    setPhase('typing_welcome');
  };

  // Icon replayed -> reset entire sequence
  const handleIconReplay = () => {
    setPhase('icon_arrival');
    setWelcomeText('');
    setHeadingText('');
  };

  // Instant skip for convenience/accessibility
  const handleSkipAnimation = () => {
    setPhase('ready');
    setWelcomeText(TARGET_WELCOME);
    setHeadingText(TARGET_HEADING);
  };

  // 2. Typewriter for Welcome Message
  useEffect(() => {
    if (phase !== 'typing_welcome') return;
    setWelcomeText('');
    let idx = 0;
    const timer = setInterval(() => {
      idx++;
      setWelcomeText(TARGET_WELCOME.slice(0, idx));
      if (idx >= TARGET_WELCOME.length) {
        clearInterval(timer);
        setTimeout(() => {
          setPhase('typing_heading');
        }, 160);
      }
    }, 45);

    return () => clearInterval(timer);
  }, [phase]);

  // 3. Typewriter for "South Africa's Unified High Schools"
  useEffect(() => {
    if (phase !== 'typing_heading') return;
    setHeadingText('');
    let idx = 0;
    const timer = setInterval(() => {
      idx++;
      setHeadingText(TARGET_HEADING.slice(0, idx));
      if (idx >= TARGET_HEADING.length) {
        clearInterval(timer);
        setTimeout(() => {
          setPhase('ready');
        }, 220);
      }
    }, 38);

    return () => clearInterval(timer);
  }, [phase]);

  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  const handleReplayIntro = () => {
    setShowIntro(true);
  };

  return (
    <div
      data-theme-preserve="true"
      className="min-h-screen text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white relative overflow-hidden transition-colors duration-300"
    >
      {/* 1. Official Landing Page Background Art */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat -z-30 pointer-events-none transform scale-100 transition-transform duration-1000 ease-out"
        style={{
          backgroundImage: "url('/assets/landing-bg.png'), url('/assets/Landing%20page.png')",
          backgroundAttachment: 'fixed',
        }}
      />

      {/* 2. Adaptive Optical Contrast Scrim & Ambient Vignette (ensures text is 100% crisp without disturbance) */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-slate-950/75 to-slate-950/90 backdrop-blur-[1.5px] -z-20 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(15,23,42,0.4)_0%,rgba(2,6,23,0.85)_100%)] -z-20 pointer-events-none" />

      {/* 3. Dynamic Ambient Starlight & Constellation Canvas */}
      <CosmicCanvasBackground particleCount={35} interactive={true} />

      {/* 4-Second Particle Logo Assembly Intro Animation (on replay) */}
      {showIntro && <ParticleLogoIntro onComplete={handleIntroComplete} />}

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
                {schoolRegLock?.locked_reason || 'School registration is currently locked by Geleza SA Executives.'}
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

      {/* Prestigious Global Header */}
      <header className="relative z-30 px-4 md:px-8 py-3.5 bg-slate-950/85 border-b border-white/10 backdrop-blur-xl shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Logo & Platform Name */}
          <Link to="/" className="flex items-center gap-3.5 group">
            <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl p-1 border border-blue-500/30 bg-blue-950/60 flex items-center justify-center group-hover:scale-105 transition-transform shadow-md">
              <FusionAppIcon className="w-8 h-8 md:w-9 md:h-9" />
            </div>
            <div>
              <span className="font-display text-base md:text-lg font-black tracking-tight text-white block leading-tight uppercase group-hover:text-blue-300 transition-colors drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
                GELEZA SA
              </span>
            </div>
          </Link>

          {/* Header Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Login button must ALWAYS be there */}
            <Link
              to="/login"
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all hover:scale-105 active:scale-95 shadow-sm"
              title="Portal Login (Always Active)"
            >
              <LogIn className="w-3.5 h-3.5 text-cyan-300" />
              <span>Login</span>
            </Link>

            {/* Controlled School Registration CTA */}
            <button
              onClick={handleRegisterSchoolClick}
              className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full font-bold text-xs border transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                schoolRegLock?.is_locked
                  ? 'bg-slate-800/90 hover:bg-slate-800 text-slate-300 border-rose-500/40 shadow-xs'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-[0_0_15px_rgba(56,189,248,0.35)] border-cyan-400/40'
              }`}
              title={schoolRegLock?.is_locked ? 'Controlled by Geleza SA Executives (Locked)' : 'Register School'}
            >
              {schoolRegLock?.is_locked ? (
                <Lock className="w-3.5 h-3.5 text-rose-400" />
              ) : (
                <Building2 className="w-3.5 h-3.5 text-cyan-200" />
              )}
              <span>Register School</span>
              {schoolRegLock?.is_locked && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-500/30 text-rose-300 border border-rose-500/40">
                  Locked
                </span>
              )}
            </button>

            <button
              onClick={() => setIsAboutOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-100 hover:text-white border border-white/15 text-xs font-medium backdrop-blur-md transition-all shadow-sm"
            >
              <Info className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">About</span>
            </button>

            <button
              onClick={() => setIsTermsOpen(true)}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white border border-white/15 text-xs font-medium backdrop-blur-md transition-all shadow-sm"
            >
              <Scale className="w-3.5 h-3.5 text-slate-300" />
              <span>Policies</span>
            </button>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-200 hover:text-white hover:bg-white/15 transition-all border border-white/15 bg-white/5 backdrop-blur-md shadow-sm"
              title={`Switch Theme`}
              aria-label="Toggle Theme"
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4 text-cyan-400" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Centered Hero */}
      <main className="flex-1 relative z-10 flex flex-col justify-center items-center px-4 sm:px-6 py-8 md:py-12 max-w-4xl mx-auto w-full text-center">
        <div className="space-y-6 animate-fade-in w-full flex flex-col items-center">
          
          {/* Official Fusion High Vector App Icon with 5-Second Star Arrival Animation */}
          <div className="space-y-4 flex flex-col items-center justify-center">
            <StarArrivalAppIcon
              className="w-28 h-28 sm:w-36 sm:h-36"
              onArrivalComplete={handleArrivalComplete}
              onReplay={handleIconReplay}
            />

            {/* Step 1: Welcome Message Badge (Types out letter-by-letter after 5-second icon arrival) */}
            <div
              className={`inline-flex items-center px-4 py-1.5 rounded-full bg-slate-950/85 border border-cyan-500/40 text-xs font-semibold text-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.6)] backdrop-blur-md transition-all duration-500 ${
                phase === 'icon_arrival'
                  ? 'opacity-0 scale-90 pointer-events-none'
                  : 'opacity-100 scale-100'
              }`}
            >
              <span className="text-cyan-300 font-bold tracking-wide drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                {welcomeText}
                {phase === 'typing_welcome' && (
                  <span className="inline-block w-1 h-3 bg-cyan-400 ml-1 animate-pulse align-middle" />
                )}
              </span>
            </div>
          </div>

          {/* Step 2: Main Heading - "South Africa's Unified High Schools" (Types out letter-by-letter with high optical contrast) */}
          <div className="min-h-[72px] sm:min-h-[96px] md:min-h-[110px] flex items-center justify-center max-w-3xl mx-auto">
            {phase !== 'icon_arrival' && (
              <h1 className="text-3xl sm:text-5xl md:text-5xl font-black font-display tracking-tight text-white leading-tight drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">
                {/* Prefix: "South Africa's Unified " */}
                <span className="drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] text-slate-50">{headingText.slice(0, SPLIT_INDEX)}</span>
                
                {/* Radiant Highlight: "High Schools" */}
                {headingText.length > SPLIT_INDEX && (
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-blue-400 to-cyan-300 drop-shadow-[0_2px_14px_rgba(37,99,235,0.7)] font-black">
                    {headingText.slice(SPLIT_INDEX)}
                  </span>
                )}

                {/* Blinking Typewriter Cursor */}
                {phase === 'typing_heading' && (
                  <span className="inline-block w-1 sm:w-1.5 h-6 sm:h-9 md:h-11 bg-cyan-400 ml-1.5 animate-pulse align-middle shadow-[0_0_12px_#38bdf8]" />
                )}
              </h1>
            )}
          </div>

          {/* Slogan Badge - Fades in gently after typing completes with protected text backdrop */}
          <div
            className={`transition-all duration-700 ease-out ${
              phase === 'ready'
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 -translate-y-2 pointer-events-none'
            }`}
          >
            <div className="inline-block px-4 py-1.5 rounded-full bg-slate-950/65 border border-white/10 backdrop-blur-md shadow-md">
              <p className="text-xs sm:text-sm text-slate-200 font-mono tracking-wide drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                Geleza Smart, The Future Is Thine
              </p>
            </div>
          </div>

          {/* Step 3: Glowing Circular "Get Started" Action Menu - Appears AFTER typing is complete */}
          <div
            className={`w-full flex flex-col items-center justify-center pt-2 transition-all duration-700 ease-out transform-gpu ${
              phase === 'ready'
                ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
                : 'opacity-0 translate-y-8 scale-90 pointer-events-none'
            }`}
          >
            <GetStartedCircularMenu className="pt-2" />
          </div>

          {/* Discreet Skip Option during intro animation */}
          {phase !== 'ready' && (
            <button
              type="button"
              onClick={handleSkipAnimation}
              className="text-[11px] font-mono text-slate-400 hover:text-cyan-400 transition-colors pt-2 underline underline-offset-4 cursor-pointer drop-shadow-sm bg-slate-950/40 px-3 py-1 rounded-full backdrop-blur-sm border border-white/5"
              title="Skip intro animation"
            >
              Skip intro animation →
            </button>
          )}

        </div>
      </main>

      {/* Clean Minimal 1-Line Footer */}
      <footer className="py-4 px-4 border-t border-white/10 bg-[#060912] text-xs text-slate-400 w-full relative z-20">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-center sm:text-left text-slate-400">
            &copy; {new Date().getFullYear()} Geleza SA Academic Network.
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <button onClick={() => setIsAboutOpen(true)} className="hover:text-blue-300 transition-colors text-slate-400">
              About Us
            </button>
            <span className="text-slate-700">•</span>
            <button onClick={() => setIsTermsOpen(true)} className="hover:text-blue-300 transition-colors text-slate-400">
              Terms & Conditions
            </button>
            <span className="text-slate-700">•</span>
            <button
              onClick={() => setIsFaqOpen(true)}
              className="hover:text-blue-300 transition-colors text-slate-400 flex items-center gap-1"
            >
              <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
              <span>View FAQs</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
