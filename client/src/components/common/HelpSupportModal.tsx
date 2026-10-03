import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  X,
  Search,
  Bot,
  ChevronDown,
  ChevronUp,
  Headphones,
  BookOpen,
  ShieldCheck,
  GraduationCap,
  Users,
  CreditCard,
  LifeBuoy,
  Clock,
  Sparkles,
  Smile,
  ThumbsUp,
  Compass,
  CheckCircle2,
  Lightbulb,
  Phone,
  Mail
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { GelezaAIChatPanel } from './GelezaAIChatPanel';
import { GELEZA_AI } from './GelezaAIMascot';

interface HelpSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'faq' | 'ai-support';
  onSelectTab?: (tab: string) => void;
}

/**
 * 🌟 Dynamic Theme-Adaptive Animated Mascot (Fusion High AI Assistant)
 * Features:
 * - Helmet featuring the Fusion High Crest on forehead.
 * - Expressive welcoming animated face with blinking glowing eyes and rosy cheeks.
 * - Ear antenna communication lights and animated waving hand.
 * - Dynamically adapts colors, materials, and glow to Dark, Navy, and Light themes!
 */
export const AnimatedSupportMascot: React.FC<{
  isThinking?: boolean;
  isWaving?: boolean;
  size?: 'sm' | 'md' | 'lg';
}> = ({ isThinking = false, isWaving = true, size = 'md' }) => {
  const { theme } = useTheme();

  // Dynamic Theme Palette Styles for Mascot
  const themeStyles = {
    dark: {
      aura: 'from-indigo-600/30 via-cyan-500/20 to-purple-600/30',
      helmetBg: 'from-slate-800 via-slate-900 to-indigo-950',
      helmetBorder: 'border-cyan-400/70 shadow-glow-indigo',
      visorBg: 'from-slate-950/95 via-indigo-950/90 to-slate-950/95',
      visorBorder: 'border-cyan-400/50 shadow-[0_0_12px_rgba(34,211,238,0.3)]',
      eyeColor: '#22d3ee',
      eyeGlow: '0 0 10px #22d3ee, 0 0 20px #06b6d4',
      badgeBg: 'from-indigo-600 to-cyan-500',
      badgeBorder: 'border-cyan-300',
      antennaColor: 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]',
      cheeksColor: 'bg-pink-400/70',
      mouthColor: 'border-cyan-300 bg-cyan-400/20',
      handBg: 'from-indigo-500 to-cyan-400 border-cyan-300',
      statusText: 'text-cyan-300 bg-cyan-500/20 border-cyan-500/30'
    },
    light: {
      aura: 'from-brand-500/20 via-sky-400/20 to-indigo-500/20',
      helmetBg: 'from-slate-100 via-white to-slate-200',
      helmetBorder: 'border-indigo-500/40 shadow-xl',
      visorBg: 'from-slate-900 via-indigo-950 to-slate-900',
      visorBorder: 'border-sky-400/60 shadow-[0_0_10px_rgba(56,189,248,0.3)]',
      eyeColor: '#38bdf8',
      eyeGlow: '0 0 10px #38bdf8, 0 0 15px #60a5fa',
      badgeBg: 'from-brand-600 to-indigo-600',
      badgeBorder: 'border-white',
      antennaColor: 'bg-indigo-600 shadow-[0_0_8px_#4f46e5]',
      cheeksColor: 'bg-rose-400/80',
      mouthColor: 'border-sky-300 bg-sky-400/30',
      handBg: 'from-white to-slate-100 border-indigo-400',
      statusText: 'text-brand-600 bg-brand-50 border-brand-200'
    }
  };

  const currentThemeStyle = themeStyles[theme] || themeStyles.dark;
  const isLight = theme === 'light';

  return (
    <div className="relative flex flex-col items-center justify-center select-none py-1.5 animate-mascot-bob">
      {/* Ambient Glow Aura */}
      <div
        className={`absolute w-28 h-28 rounded-full bg-gradient-to-tr ${currentThemeStyle.aura} blur-xl animate-pulse pointer-events-none`}
      />

      <div className="relative flex items-center justify-center">
        
        {/* Left Ear Antenna with pulsing beacon light */}
        <div className="absolute -left-3 top-3 flex items-center">
          <div className="w-2.5 h-4 rounded-l-md bg-slate-700 border border-white/20 relative">
            <div className={`absolute -left-1 top-1 w-2 h-2 rounded-full ${currentThemeStyle.antennaColor} animate-ping`} />
            <div className={`absolute -left-1 top-1 w-2 h-2 rounded-full ${currentThemeStyle.antennaColor}`} />
          </div>
        </div>

        {/* Right Ear Antenna with waving arm attached */}
        <div className="absolute -right-3 top-3 flex items-center">
          <div className="w-2.5 h-4 rounded-r-md bg-slate-700 border border-white/20 relative">
            <div className={`absolute -right-1 top-1 w-2 h-2 rounded-full ${currentThemeStyle.antennaColor} animate-ping`} />
            <div className={`absolute -right-1 top-1 w-2 h-2 rounded-full ${currentThemeStyle.antennaColor}`} />
          </div>
        </div>

        {/* Waving Hand & Arm */}
        <div
          className={`absolute -right-8 -top-3 z-30 transition-all duration-300 origin-bottom-left ${
            isWaving ? 'animate-wave' : ''
          }`}
        >
          <div
            className={`w-7 h-7 rounded-2xl bg-gradient-to-br ${currentThemeStyle.handBg} border shadow-lg flex items-center justify-center text-sm transform rotate-12`}
          >
            ✋
          </div>
        </div>

        {/* Outer Protective Space/School Helmet */}
        <div
          className={`relative w-24 h-24 rounded-full bg-gradient-to-b ${currentThemeStyle.helmetBg} border-2 ${currentThemeStyle.helmetBorder} flex flex-col items-center justify-center overflow-hidden transition-all duration-300 shadow-2xl`}
        >
          {/* Top Head Aerodynamic Crest Highlight */}
          <div className="absolute top-0 w-12 h-2 bg-white/20 rounded-b-lg blur-[0.5px]" />

          {/* Forehead Emblem: Fusion High School Graduation Cap Badge */}
          <div
            className={`absolute top-2 z-20 flex items-center justify-center px-2 py-0.5 rounded-full bg-gradient-to-r ${currentThemeStyle.badgeBg} border ${currentThemeStyle.badgeBorder} shadow-md`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-white animate-pulse" />
            <span className="text-[8px] font-black text-white ml-1 tracking-wider uppercase">FUSION</span>
          </div>

          {/* High-Tech Glowing Visor */}
          <div
            className={`w-18 h-14 mt-4 rounded-2xl bg-gradient-to-b ${currentThemeStyle.visorBg} border ${currentThemeStyle.visorBorder} flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300`}
            style={{ width: '4.8rem', height: '3.4rem' }}
          >
            {/* Visor Sunlight/Star Glare Reflection */}
            <div className="absolute top-1 left-2 w-10 h-2 rounded-full bg-white/25 transform -rotate-12 blur-[1px]" />
            <div className="absolute top-3 left-4 w-4 h-1 rounded-full bg-white/20 transform -rotate-12 blur-[0.5px]" />

            {/* Welcoming Smiling Character Face inside Visor */}
            <div className="flex flex-col items-center justify-center gap-1.5 z-10 pt-1">
              
              {/* Expressive Glowing Eyes */}
              <div className="flex items-center gap-3.5">
                {isThinking ? (
                  <>
                    <div
                      className="w-3 h-3 rounded-full animate-spin border-2 border-dashed"
                      style={{ borderColor: currentThemeStyle.eyeColor, boxShadow: currentThemeStyle.eyeGlow }}
                    />
                    <div
                      className="w-3 h-3 rounded-full animate-spin border-2 border-dashed"
                      style={{ borderColor: currentThemeStyle.eyeColor, boxShadow: currentThemeStyle.eyeGlow }}
                    />
                  </>
                ) : (
                  <>
                    {/* Happy Expressive Arched Glowing Eyes with Blinking */}
                    <div className="relative flex flex-col items-center animate-mascot-blink">
                      {/* Eyebrow */}
                      <div className="w-3 h-0.5 rounded-full bg-white/40 -mb-0.5 transform -rotate-6" />
                      <div
                        className="w-3.5 h-2 rounded-t-full transform scale-y-125 transition-transform"
                        style={{
                          backgroundColor: currentThemeStyle.eyeColor,
                          boxShadow: currentThemeStyle.eyeGlow
                        }}
                      />
                    </div>

                    <div className="relative flex flex-col items-center animate-mascot-blink">
                      {/* Eyebrow */}
                      <div className="w-3 h-0.5 rounded-full bg-white/40 -mb-0.5 transform rotate-6" />
                      <div
                        className="w-3.5 h-2 rounded-t-full transform scale-y-125 transition-transform"
                        style={{
                          backgroundColor: currentThemeStyle.eyeColor,
                          boxShadow: currentThemeStyle.eyeGlow
                        }}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Glowing Rosy Cheeks & Big Cheerful Smile */}
              <div className="flex items-center justify-center relative w-10 mt-0.5">
                {/* Blushing Cheeks */}
                <div className={`absolute left-0 w-2 h-1.5 rounded-full ${currentThemeStyle.cheeksColor} blur-[1px]`} />
                <div className={`absolute right-0 w-2 h-1.5 rounded-full ${currentThemeStyle.cheeksColor} blur-[1px]`} />

                {/* Animated Smile */}
                {isThinking ? (
                  <div
                    className="w-2.5 h-1 rounded-full animate-pulse"
                    style={{ backgroundColor: currentThemeStyle.eyeColor }}
                  />
                ) : (
                  <div
                    className={`w-4 h-2 rounded-b-full border-b-2 border-x ${currentThemeStyle.mouthColor} transform transition-transform hover:scale-110`}
                    style={{
                      boxShadow: `0 0 6px ${currentThemeStyle.eyeColor}`
                    }}
                  />
                )}
              </div>

            </div>

          </div>

          {/* Helmet Chin Guard & Voice Communicator */}
          <div className="absolute bottom-1 flex items-center gap-1">
            <div className="w-1.5 h-1 rounded-full bg-slate-600" />
            <div className="w-5 h-1 rounded-full bg-slate-500" />
            <div className="w-1.5 h-1 rounded-full bg-slate-600" />
          </div>
        </div>
      </div>

      {/* Mascot Name Badge & Status */}
      <div className="flex items-center gap-2 mt-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
        <span
          className={`text-xs font-extrabold font-display tracking-wide ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}
        >
          Geleza SA AI Assistant
        </span>
        <span
          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${currentThemeStyle.statusText}`}
        >
          24/7 ONLINE
        </span>
      </div>
    </div>
  );
};

// Comprehensive School FAQs Data
const FAQ_CATEGORIES = [
  {
    id: 'general',
    name: 'General & Navigation',
    icon: LifeBuoy,
    faqs: [
      {
        q: 'What is Geleza SA Portal?',
        a: 'Geleza SA (G~SA) Portal is the official digital school management platform. It manages South African CAPS curriculum delivery, SBA marksheet auditing, daily attendance roll-call, term report cards, digital assignments, and 24/7 AI tutoring tools.'
      },
      {
        q: 'How do I change between Dark and Light themes?',
        a: 'Click your profile picture in the top-right corner to toggle between Dark Mode and Light Mode.'
      },
      {
        q: 'How do I switch the module view (Standard Grid, Compact App Tiles, List View)?',
        a: 'On your dashboard, locate the 3 view selector icons directly to the right of the "Functions & Quick Tools" title. Click any icon to instantly switch your layout.'
      }
    ]
  },
  {
    id: 'learner',
    name: 'Learner & Academics',
    icon: GraduationCap,
    faqs: [
      {
        q: 'How do I access single-subject curriculum workspaces?',
        a: 'Click on any subject card in your horizontal subjects carousel at the top of the Learner Dashboard. The system will open that exact subject\'s chapter notes, past papers, and AI practice worksheets.'
      },
      {
        q: 'Where do I find my Term Average and Learner Number?',
        a: 'Your academic metadata (Current Grade, Learner Number, Stream, Term Average, and Attendance Rate) is located inside the "My Profile" tab in your bottom navigation dock.'
      },
      {
        q: 'How does the AI Tutor work?',
        a: 'The AI Tutor is available 24/7 in your AI Tools and Study Studio. You can ask step-by-step math solutions, physics calculations, or essay drafting tips aligned with the South African CAPS curriculum.'
      }
    ]
  },
  {
    id: 'parent',
    name: 'Parent & Guardian Portal',
    icon: Users,
    faqs: [
      {
        q: 'How do I link my child to my parent account?',
        a: 'Navigate to "My Account & Link Child" in your Parent Portal. Enter your child\'s official Learner Number (e.g. 2026-FHS-001) and their 13-digit South African National ID number.'
      },
      {
        q: 'Where can I download my child\'s official CAPS Report Card?',
        a: 'Open the "CAPS Report Cards" module in your Parent Portal to view term averages, subject level codes (1–7), teacher comments, and print/download the official transcript.'
      },
      {
        q: 'How do I book a Parent-Teacher Conference (PTC)?',
        a: 'Click the "Parent-Teacher Conferences" module, select your child\'s subject educator, pick an available 15-minute slot, and confirm your appointment.'
      }
    ]
  },
  {
    id: 'finance',
    name: 'School Fees & Bursaries',
    icon: CreditCard,
    faqs: [
      {
        q: 'How do I view and pay school fee invoices?',
        a: 'Click the "School Fee Statements" module in your portal to view your statement balance, download tax invoices, and pay online.'
      },
      {
        q: 'Where can Grade 12 learners find NSFAS and tertiary bursaries?',
        a: 'Open the "Tertiary Bursaries Catalog" module on your dashboard to see active university funding, eligibility criteria, and direct application links.'
      }
    ]
  }
];

export const HelpSupportModal: React.FC<HelpSupportModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'faq',
  onSelectTab
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [activeTab, setActiveTab] = useState<'faq' | 'ai-support'>(defaultTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<string | null>('general-0');

  useEffect(() => {
    if (defaultTab) setActiveTab(defaultTab);
  }, [defaultTab, isOpen]);

  if (!isOpen) return null;

  // Dedicated phone-style AI assistant shell (matches Geleza SA mockups)
  if (activeTab === 'ai-support') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md animate-fade-in overflow-hidden">
        <div
          className={`relative w-full max-w-md h-[92vh] max-h-[820px] rounded-[2rem] border shadow-2xl flex flex-col overflow-hidden ${
            isLight ? 'bg-white border-[#13C8D9]/25' : 'bg-[#0B1F33] border-[#13C8D9]/30'
          }`}
        >
          <div
            className={`flex items-center justify-between px-3 py-2 border-b shrink-0 ${
              isLight ? 'border-[#0B1F33]/08 bg-white/90' : 'border-white/10 bg-black/30'
            }`}
          >
            <button
              type="button"
              onClick={() => setActiveTab('faq')}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${
                isLight
                  ? 'border-[#0B1F33]/15 text-[#0B1F33] hover:bg-[#0B1F33]/05'
                  : 'border-white/15 text-white/80 hover:bg-white/10'
              }`}
            >
              FAQs
            </button>
            <span className="text-[11px] font-bold" style={{ color: GELEZA_AI.cyan }}>
              Geleza SA AI
            </span>
            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-xl ${isLight ? 'text-[#0B1F33]/50 hover:bg-[#0B1F33]/06' : 'text-white/50 hover:bg-white/10'}`}
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <GelezaAIChatPanel onSelectTab={onSelectTab} onClose={onClose} />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in overflow-hidden">
      <div
        className={`relative w-full max-w-4xl h-[90vh] max-h-[750px] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900'
            : 'bg-surface-dark border-white/10 text-slate-100'
        }`}
      >
        {/* Top Header */}
        <div
          className={`p-4 sm:p-5 border-b flex items-center justify-between gap-4 shrink-0 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-surface-darker border-white/10'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-cyan-500 flex items-center justify-center text-white shadow-glow-indigo shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold font-display tracking-wide">
                  Geleza SA Support Hub & 24/7 AI Guide
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-[10px] font-bold text-cyan-400">
                  Geleza SA
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Instant assistance and frequently asked questions
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${
              isLight ? 'text-slate-400 hover:text-slate-900 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title="Close Help Center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Switcher */}
        <div
          className={`flex items-center gap-2 px-5 py-2.5 border-b shrink-0 ${
            isLight ? 'bg-slate-100/80 border-slate-200' : 'bg-surface-dark border-white/5'
          }`}
        >
          <button
            onClick={() => setActiveTab('faq')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'faq'
                ? 'bg-indigo-600 text-white shadow-md'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>View FAQs</span>
          </button>

          <button
            onClick={() => setActiveTab('ai-support')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Bot className="w-4 h-4 text-cyan-300" />
            <span>24/7 AI Help & Support</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          
          {/* TAB 1: VIEW FAQS */}
          {activeTab === 'faq' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
              
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search frequently asked questions (e.g. report card, link child, timetable)..."
                  className={`w-full pl-10 pr-4 py-2.5 rounded-2xl border text-xs focus:outline-none focus:border-indigo-500 ${
                    isLight
                      ? 'bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-400'
                      : 'bg-surface-darker border-white/10 text-white placeholder-slate-500'
                  }`}
                />
              </div>

              {/* FAQ Accordions by Category */}
              <div className="space-y-4">
                {FAQ_CATEGORIES.map((category) => {
                  const CategoryIcon = category.icon;
                  const filteredFaqs = category.faqs.filter(
                    (f) =>
                      !searchQuery.trim() ||
                      f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      f.a.toLowerCase().includes(searchQuery.toLowerCase())
                  );

                  if (filteredFaqs.length === 0) return null;

                  return (
                    <div key={category.id} className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-cyan-500 uppercase tracking-wider">
                        <CategoryIcon className="w-4 h-4" />
                        <span>{category.name}</span>
                      </div>

                      <div className="space-y-2">
                        {filteredFaqs.map((faq, idx) => {
                          const faqKey = `${category.id}-${idx}`;
                          const isExpanded = expandedFaq === faqKey;

                          return (
                            <div
                              key={faqKey}
                              className={`rounded-2xl border overflow-hidden transition-all ${
                                isLight
                                  ? 'bg-slate-50 border-slate-200'
                                  : 'bg-surface-darker border-white/5'
                              }`}
                            >
                              <button
                                onClick={() => setExpandedFaq(isExpanded ? null : faqKey)}
                                className={`w-full p-3.5 sm:p-4 text-left flex items-center justify-between gap-3 text-xs font-bold transition-colors ${
                                  isLight ? 'text-slate-900 hover:text-indigo-600' : 'text-white hover:text-indigo-300'
                                }`}
                              >
                                <span>{faq.q}</span>
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                                )}
                              </button>

                              {isExpanded && (
                                <div
                                  className={`px-4 pb-4 text-xs leading-relaxed border-t pt-3 animate-fade-in ${
                                    isLight
                                      ? 'text-slate-600 border-slate-200'
                                      : 'text-slate-300 border-white/5'
                                  }`}
                                >
                                  {faq.a}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Still need help callout */}
              <div
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
                  isLight
                    ? 'bg-indigo-50 border-indigo-200 text-slate-900'
                    : 'bg-indigo-500/10 border-indigo-500/20 text-white'
                }`}
              >
                <div>
                  <h4 className="text-xs font-bold">Couldn't find what you're looking for?</h4>
                  <p className={`text-[11px] mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Our 24/7 AI Support Bot is ready to answer questions and guide you in real-time.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('ai-support')}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-cyan-500 text-white font-bold text-xs shadow-md shrink-0 hover:scale-105 transition-all flex items-center gap-1.5"
                >
                  <Bot className="w-4 h-4" />
                  <span>Chat with AI Mascot</span>
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
