import React from 'react';
import { Link } from 'react-router-dom';
import { Scale, ArrowLeft, Shield, Lock, FileText, Sparkles, UserCheck } from 'lucide-react';
import { TermsAgreementModal } from '../../components/common/TermsAgreementModal';

export const TermsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-canvas-dark text-slate-100 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 px-4 md:px-8 py-4 bg-surface-darker/95 border-b border-white/10 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3.5 group">
            <div className="w-10 h-10 rounded-xl bg-white/5 p-1 border border-white/15 flex items-center justify-center group-hover:scale-105 transition-transform">
              <img src="/assets/FH.png" alt="Fusion High Emblem" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-display text-lg font-extrabold tracking-tight text-white block leading-tight">
                FUSION HIGH
              </span>
              <span className="text-[10px] font-mono tracking-wider text-cyan-400 uppercase font-bold block">
                TERMS & CONDITIONS
              </span>
            </div>
          </Link>

          <Link
            to="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 md:px-8 py-10 space-y-8">
        <div className="p-8 rounded-3xl bg-surface-dark border border-white/10 space-y-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-brand-600 to-cyan-500 text-white shadow-glow-indigo">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold font-display text-white">
                Terms and Conditions & Acceptable Use Policy
              </h1>
              <p className="text-xs text-slate-400 font-mono">
                Version 2.1 • Protection of Personal Information Act (POPIA) & DBE CAPS Compliant
              </p>
            </div>
          </div>
        </div>

        {/* Render interactive Terms content component */}
        <div className="p-6 md:p-8 rounded-3xl bg-surface-dark border border-white/10 space-y-6 shadow-xl text-xs sm:text-sm text-slate-300 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>1. Overview & Scope of Service</span>
            </h2>
            <p>
              Fusion High School Management System provides a centralized digital gateway for academic learning, CAPS mark reporting, period attendance, homework management, AI Voice Tutoring, and school administration. Access to this platform requires strict compliance with the South African Schools Act (No. 84 of 1996) and institutional codes of conduct.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>2. Acceptable Use & Account Security</span>
            </h2>
            <p>
              Users must safeguard their login credentials and refrain from unauthorized access, reverse-engineering, scraping, or disrupting school digital services. Any breach of discipline is subject to disciplinary hearings under SGB regulations.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-400" />
              <span>3. Privacy & POPIA Compliance</span>
            </h2>
            <p>
              In accordance with South Africa's POPIA (No. 4 of 2013), personal and academic records are securely stored and processed solely for educational, statutory DBE reporting, and parent communication purposes.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>4. AI Voice Tutoring & Academic Integrity</span>
            </h2>
            <p>
              AI Voice Tutoring tools are provided to assist learners in understanding complex concepts, step-by-step solutions, and exam preparation. Learners must complete assignments and formal assessments with personal honesty.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>5. Child Protection & Parental Oversight</span>
            </h2>
            <p>
              Parents and guardians have full rights to monitor their child's academic progress, attendance records, and teacher communications through the dedicated Parent Portal.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-white/10 bg-surface-darker text-xs text-slate-500 text-center">
        &copy; {new Date().getFullYear()} Fusion High School. POPIA Compliant & DBE CAPS Accredited.
      </footer>
    </div>
  );
};
