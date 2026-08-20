import React from 'react';
import { X, Award, Sparkles, BookOpen, ShieldCheck, Heart } from 'lucide-react';

interface AboutUsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutUsModal: React.FC<AboutUsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-surface-dark border border-brand-500/30 p-6 md:p-8 shadow-2xl overflow-hidden">
        {/* Glow Auras */}
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-brand-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 p-1.5 border border-white/20 shadow-glow-indigo flex items-center justify-center">
              <img src="/assets/FH.png" alt="Fusion High Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h3 className="text-lg font-black font-display text-white">About Fusion High</h3>
              <p className="text-[11px] font-mono text-cyan-300 font-bold uppercase tracking-wider">
                ONE SCHOOL • ONE CONNECTION
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-5 space-y-4 text-xs text-slate-300 leading-relaxed max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
          <p className="text-sm font-medium text-slate-200">
            Welcome to <strong className="text-white font-black font-display">Fusion High School Portal</strong> — a world-class, cloud-connected digital ecosystem designed to empower educators, inspire learners, and bridge seamless collaboration with parents.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-surface-darker/90 border border-white/10 space-y-1">
              <div className="flex items-center gap-2 text-brand-400 font-bold text-xs">
                <BookOpen className="w-4 h-4" />
                <span>CAPS Accredited</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Aligned with South African Curriculum and Assessment Policy Statements (Grades 8 to 12).
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-darker/90 border border-white/10 space-y-1">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                <Sparkles className="w-4 h-4" />
                <span>AI-Powered Learning</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Personalized AI study tutors, dynamic quiz builders, and intelligent lesson planners.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-darker/90 border border-white/10 space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>Instant Safety Alerts</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Holographic QR roll-call scanning with immediate SMS & Email parent confirmation.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-darker/90 border border-white/10 space-y-1">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <Award className="w-4 h-4" />
                <span>Matric Excellence</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Dedicated APS simulators, past exam papers, and university career pathways.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-900/40 via-indigo-900/30 to-cyan-900/30 border border-brand-500/20 flex items-center gap-3">
            <Heart className="w-6 h-6 text-rose-400 shrink-0" />
            <p className="text-[11px] text-slate-300">
              <strong className="text-white">Our Motto:</strong> "Limitless Potential Through Digital Innovation & Disciplined Academic Excellence."
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
          <span className="text-[10px] font-mono text-slate-400">Fusion High App v2.1 • 2026</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
