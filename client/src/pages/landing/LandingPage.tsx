import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { ParticleLogoIntro } from '../../components/landing/ParticleLogoIntro';
import { CircularActionMenu } from '../../components/landing/CircularActionMenu';
import { AboutUsModal } from '../../components/landing/AboutUsModal';
import { TermsAgreementModal } from '../../components/common/TermsAgreementModal';
import { Sparkles, Sun, Moon, RotateCcw, Info, Scale, Compass, ShieldCheck } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  // 4-second particle logo assembly animation state (runs automatically on load)
  const [showIntro, setShowIntro] = useState<boolean>(true);
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);
  const [isTermsOpen, setIsTermsOpen] = useState<boolean>(false);

  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  const handleReplayIntro = () => {
    setShowIntro(true);
  };

  return (
    <div className="min-h-screen bg-canvas-dark text-slate-100 flex flex-col selection:bg-brand-500 selection:text-white relative overflow-hidden transition-colors duration-300">
      {/* 4-Second Particle Logo Assembly Intro Animation */}
      {showIntro && <ParticleLogoIntro onComplete={handleIntroComplete} />}

      {/* About Us Interactive Modal */}
      <AboutUsModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />

      {/* Terms & Conditions Modal */}
      <TermsAgreementModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} isMandatoryGate={false} />

      {/* Clean Navigation Header */}
      <header className="sticky top-0 z-30 px-4 md:px-8 py-3.5 bg-surface-darker/95 border-b border-white/10 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Logo & School Title */}
          <Link to="/" className="flex items-center gap-3.5 group">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/5 p-1.5 border border-white/15 flex items-center justify-center group-hover:scale-105 transition-transform shadow-lg shadow-indigo-500/10">
              <img src="/assets/FH.png" alt="Fusion High Emblem" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-display text-xl md:text-2xl font-extrabold tracking-tight text-white block leading-tight">
                FUSION HIGH
              </span>
              <span className="text-[10px] md:text-[11px] font-mono tracking-wider text-cyan-400 uppercase font-bold block">
                ONE SCHOOL • LIMITLESS POTENTIAL
              </span>
            </div>
          </Link>

          {/* Actions & Navigation Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsAboutOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 hover:text-white border border-brand-500/30 text-xs font-semibold transition-all"
              title="About Fusion High School"
            >
              <Info className="w-3.5 h-3.5 text-cyan-400" />
              <span>About Us</span>
            </button>

            <button
              onClick={() => setIsTermsOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition-all"
              title="Terms & Conditions"
            >
              <Scale className="w-3.5 h-3.5 text-slate-400" />
              <span>Terms & Policy</span>
            </button>

            <button
              onClick={handleReplayIntro}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition-all"
              title="Watch Intro Animation"
            >
              <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
              <span>Intro</span>
            </button>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all border border-white/10"
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
              aria-label="Toggle Theme"
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4 text-indigo-500" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Clean Centered Content */}
      <main className="flex-1 flex flex-col justify-center items-center px-4 md:px-8 text-center pb-36 sm:pb-44">
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
          {/* School Emblem Large Display */}
          <div className="w-56 h-56 md:w-72 md:h-72 lg:w-80 lg:h-80 mx-auto rounded-3xl bg-surface-dark/95 border border-white/15 p-6 shadow-2xl shadow-indigo-500/10 flex items-center justify-center backdrop-blur-md hover:scale-105 transition-transform duration-500">
            <img src="/assets/FH.png" alt="Fusion High School Emblem" className="w-full h-full object-contain drop-shadow-2xl" />
          </div>

          {/* CAPS Curriculum Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-dark border border-white/10 text-xs font-semibold text-slate-200 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>South African High School Portal</span>
            <span className="text-slate-500">•</span>
            <span className="text-emerald-400 font-bold">CAPS Aligned</span>
          </div>

          {/* Welcoming Headline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold font-display tracking-tight text-white leading-tight">
            Welcome to{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-indigo-300 to-cyan-400">
              Fusion High
            </span>
          </h1>

          {/* Focused Subtitle */}
          <p className="text-sm sm:text-base md:text-lg text-slate-300 max-w-xl mx-auto leading-relaxed">
            One unified digital portal for learners, teachers, and parents. Click below to sign in, submit admissions, or create an account.
          </p>
        </div>
      </main>

      {/* Bottom Middle Floating Action Button with 3 Circular Options */}
      <CircularActionMenu onReplayIntro={handleReplayIntro} />

      {/* Clean Minimal Footer */}
      <footer className="py-4 px-4 border-t border-white/5 bg-surface-darker text-[11px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3 max-w-6xl mx-auto w-full">
        <div>
          &copy; {new Date().getFullYear()} Fusion High School. DBE CAPS Aligned & POPIA Compliant.
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsAboutOpen(true)}
            className="hover:text-cyan-400 transition-colors font-semibold"
          >
            About Us
          </button>
          <span>•</span>
          <button
            onClick={() => setIsTermsOpen(true)}
            className="hover:text-cyan-400 transition-colors font-semibold"
          >
            Terms & Conditions
          </button>
          <span>•</span>
          <Link to="/about" className="hover:text-cyan-400 transition-colors">
            School Info
          </Link>
        </div>
      </footer>
    </div>
  );
};
