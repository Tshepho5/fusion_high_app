import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { ParticleLogoIntro } from '../../components/landing/ParticleLogoIntro';
import { CircularActionMenu } from '../../components/landing/CircularActionMenu';
import { Sparkles, Sun, Moon, RotateCcw } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  // 4-second particle logo assembly animation state (runs automatically on load)
  const [showIntro, setShowIntro] = useState<boolean>(true);

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

      {/* Clean Minimal Navigation Header */}
      <header className="sticky top-0 z-30 px-4 md:px-8 py-3.5 bg-surface-darker/95 border-b border-white/10 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Logo & School Title */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-white/5 p-1 border border-white/15 flex items-center justify-center group-hover:scale-105 transition-transform">
              <img src="/assets/FH.png" alt="Fusion High Emblem" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-display text-lg font-extrabold tracking-tight text-white block leading-tight">
                FUSION HIGH
              </span>
              <span className="text-[9px] font-mono tracking-wider text-cyan-400 uppercase font-bold block">
                ONE SCHOOL • LIMITLESS POTENTIAL
              </span>
            </div>
          </Link>

          {/* Actions & Theme Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleReplayIntro}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition-all"
              title="Watch Intro Animation"
            >
              <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Intro Animation</span>
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
      <main className="flex-1 flex flex-col justify-center items-center px-4 md:px-8 text-center pb-28">
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
          {/* School Emblem Large Display */}
          <div className="w-44 h-44 md:w-56 md:h-56 mx-auto rounded-3xl bg-surface-dark border border-white/10 p-4 shadow-xl flex items-center justify-center">
            <img src="/assets/FH.png" alt="Fusion High School Emblem" className="w-full h-full object-contain drop-shadow-md" />
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
      <footer className="py-4 px-4 border-t border-white/5 bg-surface-darker text-[11px] text-slate-500 text-center">
        &copy; {new Date().getFullYear()} Fusion High School. DBE CAPS Aligned & POPIA Compliant.
      </footer>
    </div>
  );
};
