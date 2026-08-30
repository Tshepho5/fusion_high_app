import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useSchool } from '../../context/SchoolContext';
import { ParticleLogoIntro } from '../../components/landing/ParticleLogoIntro';
import { CircularActionMenu } from '../../components/landing/CircularActionMenu';
import { AboutUsModal } from '../../components/landing/AboutUsModal';
import { TermsAgreementModal } from '../../components/common/TermsAgreementModal';
import { Sparkles, Sun, Moon, RotateCcw, Info, Scale, Compass, ShieldCheck, GraduationCap, Building2 } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { currentSchool, schoolsList, setSchoolById } = useSchool();

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
            <div
              className="w-12 h-12 md:w-14 md:h-14 rounded-2xl p-1.5 border flex items-center justify-center group-hover:scale-105 transition-transform shadow-lg"
              style={{
                backgroundColor: `${currentSchool?.primary_color || '#4f46e5'}20`,
                borderColor: `${currentSchool?.primary_color || '#4f46e5'}50`
              }}
            >
              <GraduationCap className="w-8 h-8" style={{ color: currentSchool?.primary_color || '#818cf8' }} />
            </div>
            <div>
              <span className="font-display text-xl md:text-2xl font-extrabold tracking-tight text-white block leading-tight uppercase">
                {currentSchool?.name || 'FUSION HIGH'}
              </span>
              <span className="text-[10px] md:text-[11px] font-mono tracking-wider text-cyan-400 uppercase font-bold block">
                {currentSchool?.circuit || 'MANKWENG CIRCUIT'} • {currentSchool?.motto || 'LIMITLESS POTENTIAL'}
              </span>
            </div>
          </Link>

          {/* Actions & Navigation Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* School Selector Dropdown */}
            {schoolsList && schoolsList.length > 1 && (
              <div className="relative">
                <select
                  value={currentSchool?.id || 1}
                  onChange={(e) => setSchoolById(Number(e.target.value))}
                  className="bg-white/5 hover:bg-white/10 text-slate-200 border border-white/15 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer max-w-[140px] sm:max-w-[200px] truncate"
                  title="Select Active School"
                >
                  {schoolsList.map((s) => (
                    <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={() => setIsAboutOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 hover:text-white border border-brand-500/30 text-xs font-semibold transition-all"
              title="About School"
            >
              <Info className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">About Us</span>
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
          <div className="w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 mx-auto rounded-3xl bg-surface-dark/95 border border-white/15 p-5 shadow-2xl shadow-indigo-500/10 flex items-center justify-center backdrop-blur-md hover:scale-105 transition-transform duration-500">
            <img src="/assets/FH.png" alt="School Emblem" className="w-full h-full object-contain drop-shadow-2xl" />
          </div>

          {/* CAPS Curriculum Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-dark border border-white/10 text-xs font-semibold text-slate-200 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>South African High School Portal</span>
            <span className="text-slate-500">•</span>
            <span className="text-emerald-400 font-bold">CAPS Aligned</span>
          </div>

          {/* Welcoming Headline */}
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold font-display tracking-tight text-white leading-tight">
            Welcome to{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-indigo-300 to-cyan-400">
              {currentSchool?.name || 'Fusion High'}
            </span>
          </h1>

          {/* Focused Subtitle */}
          <p className="text-xs sm:text-sm md:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            {currentSchool?.motto ? `"${currentSchool.motto}" — ` : ''}
            Empowering students across {currentSchool?.circuit || 'Mankweng Circuit'}, {currentSchool?.province || 'Limpopo'}. One unified digital portal for learners, teachers, and parents.
          </p>

          {/* Real-time Live Database School Statistics */}
          <div className="grid grid-cols-3 gap-3 max-w-xl mx-auto pt-2">
            <div className="p-3.5 rounded-2xl bg-surface-dark/80 border border-white/10 backdrop-blur-sm shadow-md">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-bold">Enrolled Learners</span>
              <span className="text-xl sm:text-2xl font-extrabold font-mono text-cyan-400 mt-1 block">
                {currentSchool?.enrolled_learners_count ?? 0}
              </span>
              <span className="text-[10px] text-slate-500 font-medium block">
                {(currentSchool?.enrolled_learners_count ?? 0) > 0 ? 'Active Students' : 'Awaiting Enrolment'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-dark/80 border border-white/10 backdrop-blur-sm shadow-md">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-bold">Faculty Staff</span>
              <span className="text-xl sm:text-2xl font-extrabold font-mono text-amber-400 mt-1 block">
                {currentSchool?.staff_count ?? 0}
              </span>
              <span className="text-[10px] text-slate-500 font-medium block">
                {(currentSchool?.staff_count ?? 0) > 0 ? 'Active Educators' : 'Ready for Staff'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-dark/80 border border-white/10 backdrop-blur-sm shadow-md">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-bold">Classes & Grades</span>
              <span className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-400 mt-1 block">
                {currentSchool?.classes_count ?? 0}
              </span>
              <span className="text-[10px] text-slate-500 font-medium block">
                {(currentSchool?.classes_count ?? 0) > 0 ? 'Active Stream Classes' : 'Grade 8-12 Ready'}
              </span>
            </div>
          </div>
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
