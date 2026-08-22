import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Building, 
  GraduationCap, 
  Sparkles, 
  Trophy, 
  Heart, 
  ShieldCheck, 
  Compass, 
  BookOpen, 
  Award, 
  MapPin, 
  Phone, 
  Mail, 
  Languages,
  Microscope,
  TrendingUp,
  Globe,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';

export const AboutUsPage: React.FC = () => {
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
                ABOUT OUR SCHOOL
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
      <main className="flex-1 max-w-5xl mx-auto px-4 md:px-8 py-10 space-y-10">
        {/* Hero Banner */}
        <div className="p-8 md:p-10 rounded-3xl bg-gradient-to-r from-brand-950 via-surface-darker to-surface-dark border border-brand-500/30 text-center space-y-4 shadow-2xl relative overflow-hidden">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-500/20 border border-brand-500/30 text-xs font-mono text-cyan-300 font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ESTABLISHED 2012 • DBE CAPS ACCREDITED</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold font-display text-white tracking-tight">
            "One School • Limitless Potential"
          </h1>

          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Fusion High School is a premier South African educational institution dedicated to delivering academic excellence, character development, and technological empowerment across Grades 8 through 12.
          </p>
        </div>

        {/* Vision & Mission Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-surface-dark border border-white/10 space-y-3 shadow-xl">
            <div className="flex items-center gap-3 text-brand-400 font-bold text-lg font-display">
              <Compass className="w-6 h-6" />
              <span>Our Vision</span>
            </div>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              To be the benchmark for transformative secondary education in South Africa—empowering learners to excel academically, embrace cultural diversity, and lead with ethical integrity in an AI-driven global society.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-surface-dark border border-white/10 space-y-3 shadow-xl">
            <div className="flex items-center gap-3 text-emerald-400 font-bold text-lg font-display">
              <Heart className="w-6 h-6" />
              <span>Our Mission & Values</span>
            </div>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              To nurture every learner's unique strengths through CAPS curriculum mastery, personalized AI voice tutoring, state-of-the-art sciences, commerce, creative arts, and inclusive multilingual heritage across all 11 official languages.
            </p>
          </div>
        </div>

        {/* Academic Streams */}
        <div className="space-y-4">
          <h2 className="text-xl font-extrabold font-display text-white flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-cyan-400" />
            <span>Academic Streams & CAPS Pathways (Grades 8–12)</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-surface-dark border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
                <Microscope className="w-4 h-4" />
                <span>Science & STEM</span>
              </div>
              <p className="text-slate-400 text-xs">
                Mathematics, Physical Sciences, Life Sciences, Natural Sciences, and Information Technology.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-surface-dark border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                <TrendingUp className="w-4 h-4" />
                <span>Commerce & Finance</span>
              </div>
              <p className="text-slate-400 text-xs">
                Accounting, Business Studies, Economics, and Economic Management Sciences (EMS).
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-surface-dark border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                <Globe className="w-4 h-4" />
                <span>Humanities & Tourism</span>
              </div>
              <p className="text-slate-400 text-xs">
                Geography, History, Tourism, Social Sciences, and Life Orientation.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-surface-dark border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
                <Languages className="w-4 h-4" />
                <span>11 SA Languages</span>
              </div>
              <p className="text-slate-400 text-xs">
                Home Language & FAL in isiZulu, isiXhosa, Afrikaans, English, Sepedi, Setswana, Sesotho, Xitsonga, siSwati, Tshivenda, isiNdebele.
              </p>
            </div>
          </div>
        </div>

        {/* Technology & Innovation */}
        <div className="p-6 md:p-8 rounded-3xl bg-surface-dark border border-white/10 space-y-4 shadow-xl">
          <h2 className="text-xl font-extrabold font-display text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <span>Digital-First School Management Platform</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-surface-darker border border-white/5 space-y-1">
              <h4 className="font-bold text-white">AI Voice Tutor</h4>
              <p className="text-slate-400">Verbal speech-to-text dictation and natural text-to-speech explanations in South African languages.</p>
            </div>
            <div className="p-4 rounded-2xl bg-surface-darker border border-white/5 space-y-1">
              <h4 className="font-bold text-white">Neural Admissions OCR</h4>
              <p className="text-slate-400">Automated Home Affairs 13-digit ID Luhn algorithm check and scan clarity verification.</p>
            </div>
            <div className="p-4 rounded-2xl bg-surface-darker border border-white/5 space-y-1">
              <h4 className="font-bold text-white">Real-Time Parent Alerts</h4>
              <p className="text-slate-400">Instant period-by-period attendance tracking with automated email alerts for unexcused absences.</p>
            </div>
          </div>
        </div>

        {/* Contact Footer */}
        <div className="p-6 rounded-3xl bg-surface-darker border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div>
            <h4 className="font-bold text-white">Fusion High School Administration</h4>
            <p className="text-slate-400">Johannesburg, Gauteng, South Africa • POPIA Compliant & DBE Registered</p>
          </div>
          <Link
            to="/register"
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold transition-all shadow-glow-indigo"
          >
            Create an Account / Apply
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-white/10 bg-surface-darker text-xs text-slate-500 text-center">
        &copy; {new Date().getFullYear()} Fusion High School. All Rights Reserved. DBE CAPS Accredited.
      </footer>
    </div>
  );
};
