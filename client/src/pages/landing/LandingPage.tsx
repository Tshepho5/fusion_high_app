import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useSchool } from '../../context/SchoolContext';
import { CosmicCanvasBackground } from '../../components/landing/CosmicCanvasBackground';
import { ParticleLogoIntro } from '../../components/landing/ParticleLogoIntro';
import { CircularActionMenu } from '../../components/landing/CircularActionMenu';
import { AboutUsModal } from '../../components/landing/AboutUsModal';
import { TermsAgreementModal } from '../../components/common/TermsAgreementModal';
import {
  Sparkles,
  Sun,
  Moon,
  RotateCcw,
  Info,
  Scale,
  GraduationCap,
  ArrowRight,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { currentSchool, schoolsList, setSchoolById } = useSchool();

  const [showIntro, setShowIntro] = useState<boolean>(false);
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);
  const [isTermsOpen, setIsTermsOpen] = useState<boolean>(false);

  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  const handleReplayIntro = () => {
    setShowIntro(true);
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-slate-950 relative overflow-hidden transition-colors duration-300">
      {/* Dynamic Cosmic Starfield */}
      <CosmicCanvasBackground particleCount={50} interactive={true} />

      {/* 4-Second Particle Logo Assembly Intro Animation (on replay) */}
      {showIntro && <ParticleLogoIntro onComplete={handleIntroComplete} />}

      {/* Modals */}
      <AboutUsModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      <TermsAgreementModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} isMandatoryGate={false} />

      {/* Clean Global Header */}
      <header className="relative z-30 px-4 md:px-8 py-3.5 bg-[#090D18]/90 border-b border-white/10 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Logo & Platform Name */}
          <Link to="/" className="flex items-center gap-3.5 group">
            <div
              className="w-11 h-11 md:w-12 md:h-12 rounded-2xl p-1.5 border flex items-center justify-center group-hover:scale-105 transition-transform shadow-md shadow-cyan-500/10 bg-brand-600/20 border-cyan-500/40"
            >
              <GraduationCap className="w-7 h-7 text-cyan-400" />
            </div>
            <div>
              <span className="font-display text-lg md:text-xl font-extrabold tracking-tight text-white block leading-tight uppercase group-hover:text-cyan-300 transition-colors">
                FUSION HIGH SCHOOLS
              </span>
              <span className="text-[10px] md:text-[11px] font-mono tracking-wider text-cyan-400 uppercase font-bold block">
                NATIONAL ACADEMIC PORTAL • CAPS ALIGNED
              </span>
            </div>
          </Link>

          {/* Header Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsAboutOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 text-xs font-semibold transition-all"
            >
              <Info className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">About</span>
            </button>

            <button
              onClick={() => setIsTermsOpen(true)}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition-all"
            >
              <Scale className="w-3.5 h-3.5 text-slate-400" />
              <span>Policies</span>
            </button>

            <button
              onClick={handleReplayIntro}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition-all"
              title="Watch Intro Animation"
            >
              <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
              <span>Intro</span>
            </button>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all border border-white/10"
              title={`Switch Theme`}
              aria-label="Toggle Theme"
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4 text-indigo-400" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
            </button>

            <Link
              to="/login"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-300 to-teal-300 hover:from-cyan-300 hover:to-teal-200 text-slate-950 font-black text-xs shadow-md shadow-cyan-500/20 transition-all active:scale-95 ml-1"
            >
              <span>Enter Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Clean Centered Hero */}
      <main className="flex-1 relative z-10 flex flex-col justify-center items-center px-4 sm:px-6 py-10 max-w-4xl mx-auto w-full text-center">
        <div className="space-y-6 animate-fade-in w-full">
          {/* 3D Shooting Star App Icon & Badge */}
          <div className="space-y-5 flex flex-col items-center justify-center [perspective:1200px]">
            <div className="w-32 h-32 sm:w-44 sm:h-44 relative flex items-center justify-center animate-shooting-star-3d select-none">
              {/* Glowing Ambient Halo */}
              <div className="absolute -inset-3 rounded-full bg-gradient-to-tr from-cyan-500/50 via-indigo-500/40 to-blue-600/30 blur-2xl animate-pulse" />
              
              {/* 3D App Icon */}
              <div className="relative w-full h-full flex items-center justify-center hover:scale-105 transition-transform duration-300">
                <img
                  src="/assets/fusion-app-icon.png"
                  alt="Fusion High Official App Icon"
                  className="w-full h-full object-contain drop-shadow-[0_0_35px_rgba(6,182,212,0.9)]"
                />
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-dark/90 border border-cyan-500/30 text-xs font-semibold text-slate-200 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
              <span>Multi-School Academic Network</span>
              <span className="text-slate-500">•</span>
              <span className="text-emerald-400 font-bold">CAPS Aligned</span>
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-3 max-w-2xl mx-auto">
            <h1 className="text-3xl sm:text-5xl font-black font-display tracking-tight text-white leading-tight">
              South Africa's Unified{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-300 to-emerald-400">
                High Schools Portal
              </span>
            </h1>
          </div>
        </div>
      </main>

      {/* Floating Circular Action Menu */}
      <CircularActionMenu onReplayIntro={handleReplayIntro} />

      {/* Clean Minimal 1-Line Footer */}
      <footer className="py-4 px-4 border-t border-white/10 bg-[#060912] text-xs text-slate-400 w-full relative z-20">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-center sm:text-left">
            &copy; {new Date().getFullYear()} Fusion High Schools Academic Network. DBE CAPS Aligned & POPIA Compliant.
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <button onClick={() => setIsAboutOpen(true)} className="hover:text-cyan-300 transition-colors">
              About Us
            </button>
            <span className="text-slate-700">•</span>
            <button onClick={() => setIsTermsOpen(true)} className="hover:text-cyan-300 transition-colors">
              Terms & Conditions
            </button>
            <span className="text-slate-700">•</span>
            <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-bold">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
