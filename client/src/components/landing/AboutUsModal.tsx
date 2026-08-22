import React, { useState } from 'react';
import { 
  Building, 
  GraduationCap, 
  Sparkles, 
  Users, 
  Trophy, 
  Heart, 
  ShieldCheck, 
  Compass, 
  BookOpen, 
  Award, 
  CheckCircle2, 
  MapPin, 
  Phone, 
  Mail, 
  X,
  Languages,
  Microscope,
  TrendingUp,
  Globe
} from 'lucide-react';

interface AboutUsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutUsModal: React.FC<AboutUsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'vision' | 'academics' | 'technology' | 'culture' | 'leadership'>('vision');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-3xl bg-surface-dark border border-white/15 shadow-2xl shadow-indigo-500/20 text-white flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-brand-950 via-surface-darker to-surface-dark border-b border-white/10 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/15 p-1.5 flex items-center justify-center shadow-lg shrink-0">
              <img src="/assets/FH.png" alt="Fusion High Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold font-display tracking-tight text-white">
                  About Fusion High School
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-brand-500/20 border border-brand-500/30 text-[10px] font-mono text-brand-300 font-bold">
                  EST. 2012
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                One School • Limitless Potential • DBE CAPS Accredited
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 px-5 py-2.5 bg-surface-darker border-b border-white/5 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('vision')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === 'vision' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Our Vision & Mission</span>
          </button>

          <button
            onClick={() => setActiveTab('academics')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === 'academics' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Academic Pillars (CAPS)</span>
          </button>

          <button
            onClick={() => setActiveTab('technology')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === 'technology' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Digital & AI Innovation</span>
          </button>

          <button
            onClick={() => setActiveTab('culture')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === 'culture' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Sports & Culture</span>
          </button>

          <button
            onClick={() => setActiveTab('leadership')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === 'leadership' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Leadership & Campus</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 text-xs leading-relaxed text-slate-300">
          
          {/* TAB 1: VISION & MISSION */}
          {activeTab === 'vision' && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-900/30 to-cyan-900/30 border border-brand-500/30">
                <span className="text-cyan-400 font-mono font-bold uppercase tracking-wider text-[10px]">Our Guiding Motto</span>
                <h3 className="text-xl font-extrabold font-display text-white mt-1">
                  "One School • Limitless Potential"
                </h3>
                <p className="text-slate-300 text-xs mt-1.5 leading-relaxed">
                  Fusion High School was established with a singular mission: to provide world-class, accessible, and technologically empowered secondary education in South Africa that transforms high school learners into visionary leaders, scientists, entrepreneurs, and global innovators.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-surface-darker border border-white/10 space-y-2">
                  <div className="flex items-center gap-2 text-brand-400 font-bold text-sm">
                    <Compass className="w-4 h-4" />
                    <span>Our Strategic Vision</span>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    To be the leading national benchmark for digital-first secondary education in South Africa, achieving a 100% Matric pass rate and 85%+ Bachelor Degree passes through individualized learning, AI tutoring, and ethical leadership.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-surface-darker border border-white/10 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <Heart className="w-4 h-4" />
                    <span>Our Core Values</span>
                  </div>
                  <ul className="text-slate-400 text-xs space-y-1">
                    <li>• <strong>Excellence:</strong> Unwavering commitment to academic rigor.</li>
                    <li>• <strong>Integrity:</strong> Honesty, ethics, and mutual respect.</li>
                    <li>• <strong>Inclusivity:</strong> Embracing all 11 official South African cultures.</li>
                    <li>• <strong>Innovation:</strong> Pioneering AI-assisted pedagogy.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ACADEMIC PILLARS */}
          {activeTab === 'academics' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-cyan-400" />
                  <span>National Curriculum Statement (DBE CAPS) Alignment</span>
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                  We offer a full academic program for both General Education & Training (GET, Grades 8–9) and Further Education & Training (FET, Grades 10–12).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-surface-darker border border-white/10 space-y-1.5">
                  <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
                    <Microscope className="w-4 h-4" />
                    <span>Science & STEM Stream</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Mathematics, Physical Sciences, Life Sciences, Information Technology, and Natural Sciences with state-of-the-art laboratory experimentation.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-darker border border-white/10 space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                    <TrendingUp className="w-4 h-4" />
                    <span>Commerce & Economics</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Accounting, Business Studies, Economics, and EMS fostering entrepreneurial acumen, financial literacy, and corporate leadership.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-darker border border-white/10 space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                    <Globe className="w-4 h-4" />
                    <span>Humanities & Tourism</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Geography, History, Tourism, and Social Sciences cultivating analytical critical thinking and heritage appreciation.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-darker border border-white/10 space-y-1.5">
                  <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
                    <Languages className="w-4 h-4" />
                    <span>11 Official SA Languages</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Home Language (HL) and First Additional Language (FAL) tracks celebrating isiZulu, isiXhosa, Afrikaans, English, Sepedi, Setswana, Sesotho, Xitsonga, siSwati, Tshivenda, and isiNdebele.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DIGITAL & AI INNOVATION */}
          {activeTab === 'technology' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>Next-Generation Digital Learning Ecosystem</span>
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                  Fusion High combines classroom teaching with high-technology software tools:
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="p-3 rounded-2xl bg-surface-darker border border-white/10 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-brand-500/20 text-brand-300 shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs">24/7 AI Voice Tutor</h4>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Learners can verbally speak questions to the AI Tutor in their preferred South African language, receiving step-by-step audio explanations and practice tests.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-surface-darker border border-white/10 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs">Neural Admissions OCR & Smart Registration</h4>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Automated scan clarity evaluation and South African 13-digit ID Luhn algorithm checksum verification for transparent admissions.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-surface-darker border border-white/10 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs">Integrated DBE Past Papers & CAPS Markbooks</h4>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Instant access to official past question papers with marking memos, period attendance tracking with instant parent absence notifications, and digital report cards.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SPORTS & CULTURE */}
          {activeTab === 'culture' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>Sports, Extracurricular & Cultural Life</span>
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                  We believe in nurturing well-rounded individuals through dynamic athletics and cultural societies.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-surface-darker border border-white/10 space-y-1.5">
                  <span className="font-bold text-amber-400 text-xs flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Competitive Athletics</span>
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Soccer (First XI Boys & Girls), Netball, Rugby, Basketball, Track & Field Athletics, Swimming, and Cross Country fixtures.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-surface-darker border border-white/10 space-y-1.5">
                  <span className="font-bold text-cyan-400 text-xs flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5" />
                    <span>Cultural Societies</span>
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Debating Union & Model UN, High School Choir, Drama & Poetry Society, Robotics & Coding Club, Chess Guild, and Environmental Club.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: LEADERSHIP & CAMPUS */}
          {activeTab === 'leadership' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-2xl bg-surface-darker border border-white/10 space-y-2">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider text-cyan-400 font-mono">School Leadership & Governance</h4>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Fusion High School operates under the oversight of our School Governing Body (SGB), Executive Principal, Heads of Departments (HODs), and dedicated educator team certified under the South African Council for Educators (SACE).
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-surface-darker border border-white/10 space-y-2.5">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider text-emerald-400 font-mono">Campus Location & Contact</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] text-slate-400 font-mono">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-brand-400 shrink-0" />
                    <span>Johannesburg, South Africa</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>+27 (0) 11 000 0000</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>admin@fusionhigh.co.za</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-surface-darker border-t border-white/10 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 font-mono">
            Fusion High School • POPIA & CAPS Accredited
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-glow-indigo"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};
