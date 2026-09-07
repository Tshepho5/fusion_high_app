import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useSchool } from '../../context/SchoolContext';
import { CosmicCanvasBackground } from '../../components/landing/CosmicCanvasBackground';
import { ParticleLogoIntro } from '../../components/landing/ParticleLogoIntro';
import { AboutUsModal } from '../../components/landing/AboutUsModal';
import { TermsAgreementModal } from '../../components/common/TermsAgreementModal';
import { FusionAppIcon } from '../../components/common/FusionAppIcon';
import {
  Sparkles,
  Sun,
  Moon,
  RotateCcw,
  Info,
  Scale,
  GraduationCap,
  ArrowRight,
  LogIn,
  UserPlus,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';
import { HelpSupportModal } from '../../components/common/HelpSupportModal';

export const LandingPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { currentSchool, schoolsList, setSchoolById } = useSchool();

  const [showIntro, setShowIntro] = useState<boolean>(false);
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);
  const [isTermsOpen, setIsTermsOpen] = useState<boolean>(false);
  const [isFaqOpen, setIsFaqOpen] = useState<boolean>(false);

  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  const handleReplayIntro = () => {
    setShowIntro(true);
  };

  return (
    <div
      data-theme-preserve="true"
      className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white relative overflow-hidden transition-colors duration-300"
    >
      {/* Dynamic Ambient Starlight Background */}
      <CosmicCanvasBackground particleCount={40} interactive={true} />

      {/* 4-Second Particle Logo Assembly Intro Animation (on replay) */}
      {showIntro && <ParticleLogoIntro onComplete={handleIntroComplete} />}

      {/* Modals */}
      <AboutUsModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      <TermsAgreementModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} isMandatoryGate={false} />
      <HelpSupportModal isOpen={isFaqOpen} onClose={() => setIsFaqOpen(false)} defaultTab="faq" />

      {/* Prestigious Global Header */}
      <header className="relative z-30 px-4 md:px-8 py-3.5 bg-[#090D18]/90 border-b border-white/10 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Logo & Platform Name */}
          <Link to="/" className="flex items-center gap-3.5 group">
            <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl p-1.5 border border-blue-500/30 bg-blue-950/40 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
              <GraduationCap className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <span className="font-display text-base md:text-lg font-black tracking-tight text-white block leading-tight uppercase group-hover:text-blue-300 transition-colors">
                FUSION HIGH SCHOOLS
              </span>
              <span className="text-[9px] md:text-[10px] font-mono tracking-wider text-blue-400 uppercase font-semibold block">
                NATIONAL ACADEMIC NETWORK • CAPS ALIGNED
              </span>
            </div>
          </Link>

          {/* Header Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsAboutOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 text-xs font-medium transition-all"
            >
              <Info className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">About</span>
            </button>

            <button
              onClick={() => setIsTermsOpen(true)}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-medium transition-all"
            >
              <Scale className="w-3.5 h-3.5 text-slate-400" />
              <span>Policies</span>
            </button>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-all border border-white/10"
              title={`Switch Theme`}
              aria-label="Toggle Theme"
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4 text-blue-400" />
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
          
          {/* Official Fusion High Vector App Icon */}
          <div className="space-y-4 flex flex-col items-center justify-center">
            <div className="relative flex items-center justify-center select-none">
              <FusionAppIcon className="w-28 h-28 sm:w-36 sm:h-36" />
            </div>

            {/* Accreditation Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs font-semibold text-slate-300 shadow-sm backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Multi-School Academic Network</span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-400 font-bold">DBE CAPS Aligned</span>
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-3 max-w-2xl mx-auto">
            <h1 className="text-3xl sm:text-5xl md:text-5xl font-black font-display tracking-tight text-white leading-tight">
              South Africa's Unified{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-200 to-sky-300">
                High Schools Portal
              </span>
            </h1>
          </div>

          {/* Clear Institutional Action Buttons */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/login"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-blue-600/25 transition-all active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In to Portal</span>
            </Link>

            <a
              href="/application.html"
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold transition-all active:scale-95"
            >
              <GraduationCap className="w-4 h-4 text-emerald-400" />
              <span>2026 Admissions</span>
            </a>

            <Link
              to="/register"
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition-all active:scale-95"
            >
              <UserPlus className="w-4 h-4 text-blue-400" />
              <span>Parent Registration</span>
            </Link>
          </div>

        </div>
      </main>

      {/* Clean Minimal 1-Line Footer */}
      <footer className="py-4 px-4 border-t border-white/10 bg-[#060912] text-xs text-slate-400 w-full relative z-20">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-center sm:text-left text-slate-400">
            &copy; {new Date().getFullYear()} Fusion High Schools Academic Network. DBE CAPS Aligned & POPIA Compliant.
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
            <span className="text-slate-700">•</span>
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-bold">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
