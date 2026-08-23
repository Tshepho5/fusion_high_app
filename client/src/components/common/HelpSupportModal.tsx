import React, { useState, useEffect, useRef } from 'react';
import {
  HelpCircle,
  X,
  Search,
  MessageSquare,
  Bot,
  Send,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Headphones,
  BookOpen,
  ShieldCheck,
  GraduationCap,
  Users,
  CreditCard,
  LifeBuoy,
  RefreshCw,
  CheckCircle2,
  PhoneCall,
  Mail,
  Clock,
  ThumbsUp,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { learnerService } from '../../services/api';

interface HelpSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'faq' | 'ai-support';
}

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  suggestedAction?: {
    label: string;
    tabId: string;
  };
}

// Interactive Animated Mascot Character Component with Helmet & Fusion High Icon
const AnimatedSupportMascot: React.FC<{ isThinking?: boolean; isWaving?: boolean; mood?: 'happy' | 'thinking' | 'talking' }> = ({
  isThinking = false,
  isWaving = true,
  mood = 'happy'
}) => {
  return (
    <div className="relative flex flex-col items-center justify-center select-none py-2">
      {/* Glow aura */}
      <div className="absolute w-24 h-24 rounded-full bg-gradient-to-tr from-brand-600/30 to-cyan-400/30 blur-xl animate-pulse pointer-events-none" />

      <div className="relative flex items-center justify-center">
        {/* Waving Hand (Left or Right) */}
        <div className={`absolute -right-7 -top-1 transition-all duration-300 origin-bottom-left ${isWaving ? 'animate-wave' : ''}`}>
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 border border-white/30 shadow-md flex items-center justify-center text-white text-xs transform rotate-12">
            ✋
          </div>
        </div>

        {/* Outer Helmet */}
        <div className="relative w-20 h-20 rounded-full bg-gradient-to-b from-slate-800 via-slate-900 to-indigo-950 border-2 border-cyan-400/60 shadow-glow-indigo flex flex-col items-center justify-center overflow-hidden group">
          
          {/* Forehead App Badge / Icon on Helmet */}
          <div className="absolute top-1.5 z-20 flex items-center justify-center px-1.5 py-0.5 rounded-full bg-gradient-to-r from-brand-600 to-cyan-500 border border-white/40 shadow-sm shadow-cyan-500/50">
            <GraduationCap className="w-3 h-3 text-white animate-pulse" />
            <span className="text-[7px] font-black text-white ml-0.5 tracking-tighter">FUSION</span>
          </div>

          {/* Helmet Glass Visor */}
          <div className="w-16 h-12 mt-3 rounded-2xl bg-gradient-to-b from-slate-950/90 via-indigo-950/80 to-slate-950/90 border border-cyan-500/40 shadow-inner flex flex-col items-center justify-center relative overflow-hidden">
            
            {/* Visor Glare Reflection */}
            <div className="absolute top-0 left-1 w-10 h-2 rounded-full bg-white/20 transform -rotate-12 blur-[1px]" />

            {/* Welcoming Smiling Face inside Helmet */}
            <div className="flex flex-col items-center justify-center gap-1.5 z-10">
              
              {/* Cheerful Glowing Eyes */}
              <div className="flex items-center gap-3">
                {isThinking ? (
                  <>
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shadow-glow-indigo" />
                    <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping shadow-glow-indigo" style={{ animationDelay: '200ms' }} />
                  </>
                ) : (
                  <>
                    {/* Happy curved arch eye */}
                    <div className="w-2.5 h-1.5 rounded-t-full bg-cyan-300 shadow-[0_0_8px_#22d3ee] transform scale-y-125" />
                    <div className="w-2.5 h-1.5 rounded-t-full bg-cyan-300 shadow-[0_0_8px_#22d3ee] transform scale-y-125" />
                  </>
                )}
              </div>

              {/* Glowing Rosy Cheeks & Big Happy Smile */}
              <div className="flex items-center justify-center relative w-8">
                <div className="absolute left-0 w-1.5 h-1 rounded-full bg-pink-400/60 blur-[1px]" />
                <div className="absolute right-0 w-1.5 h-1 rounded-full bg-pink-400/60 blur-[1px]" />
                {isThinking ? (
                  <div className="w-2 h-1 rounded-full bg-cyan-300 animate-pulse" />
                ) : (
                  <div className="w-3.5 h-2 rounded-b-full border-b-2 border-x border-cyan-300 bg-cyan-400/20 shadow-[0_0_6px_#22d3ee]" />
                )}
              </div>

            </div>

          </div>

          {/* Helmet Chin Guard & Audio Mic */}
          <div className="absolute bottom-1 w-6 h-1 rounded-full bg-slate-700 border border-cyan-500/30" />
        </div>
      </div>

      {/* Mascot Name Badge & Status */}
      <div className="flex items-center gap-1.5 mt-1.5">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[11px] font-extrabold font-display text-white tracking-wide">
          Fusion AI Support Bot
        </span>
        <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-bold border border-cyan-500/30">
          24/7 ONLINE
        </span>
      </div>
    </div>
  );
};

// Official School FAQs Data
const FAQ_CATEGORIES = [
  {
    id: 'general',
    name: 'General & Navigation',
    icon: LifeBuoy,
    faqs: [
      {
        q: 'What is Fusion High School Portal?',
        a: 'Fusion High School Portal is the official digital school management system for learners, educators, parents, and administrators. It connects South African CAPS curriculum delivery, digital marksheet auditing, SBA grading, attendance registers, and AI study tools.'
      },
      {
        q: 'How do I change between Light, Dark, and Slate Navy themes?',
        a: 'Click the Color Palette icon in the top header or navigate to Technical Settings in your bottom dock to choose your preferred theme and font family (Inter, Outfit, Playfair, Mono).'
      },
      {
        q: 'How do I switch the module view (Standard Grid, Compact App Tiles, List View)?',
        a: 'On your dashboard, look for the 3 view selector icons directly to the right of the "Functions & Quick Tools" title. Click any icon to instantly switch your layout.'
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
  defaultTab = 'faq'
}) => {
  const { user, role } = useAuth();
  const [activeTab, setActiveTab] = useState<'faq' | 'ai-support'>(defaultTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<string | null>('general-0');

  // AI Chat State
  const [inputMessage, setInputMessage] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'ai',
      text: `Hello ${user?.full_name || 'there'}! 👋 I am your 24/7 Fusion High AI Assistant. How can I assist you with your portal, subjects, or school services today?`,
      timestamp: 'Just now'
    }
  ]);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (defaultTab) setActiveTab(defaultTab);
  }, [defaultTab, isOpen]);

  useEffect(() => {
    if (activeTab === 'ai-support') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  if (!isOpen) return null;

  const handleSendAiMessage = async (overrideText?: string) => {
    const textToSend = (overrideText || inputMessage).trim();
    if (!textToSend || isAiThinking) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!overrideText) setInputMessage('');
    setIsAiThinking(true);

    try {
      // Query learner ask-tutor endpoint or generate structured school help response
      const res = await learnerService.askTutor({
        question: textToSend,
        subject: 'General School System Help & Support',
        grade: user?.grade || 10
      });

      const replyText = res?.answer || res?.response || res?.text ||
        `I understand you're asking about "${textToSend}". At Fusion High, you can manage this directly through your portal modules. Let me know if you need step-by-step guidance!`;

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChatMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      // Helpful fallback response
      let fallbackText = `I'm here to assist with any questions about Fusion High School! You can access all your academic marks, subjects carousel, class timetables, and fee statements from the main dashboard.`;
      
      const lower = textToSend.toLowerCase();
      if (lower.includes('report') || lower.includes('marks') || lower.includes('grade')) {
        fallbackText = `To view your CAPS report card, open the "CAPS Report Cards" or "Subject Performance" module on your dashboard. It displays official DBE Levels 1–7 and term marks.`;
      } else if (lower.includes('password') || lower.includes('login') || lower.includes('sign in')) {
        fallbackText = `You can update your security credentials in "Technical Settings" or click "Forgot Password" on the login screen to receive an OTP.`;
      } else if (lower.includes('parent') || lower.includes('link')) {
        fallbackText = `Parents can link learners in the Parent Portal using the learner's official number (e.g. 2026-FHS-001) and their 13-digit National ID number.`;
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: fallbackText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsAiThinking(false);
    }
  };

  const quickPrompts = [
    'How do I view my CAPS report card?',
    'How do parents link a child?',
    'Where is my weekly timetable?',
    'How do I contact my subject educator?'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in overflow-hidden">
      <div className="relative w-full max-w-4xl h-[90vh] max-h-[750px] rounded-3xl bg-surface-dark border border-white/10 shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-surface-darker border-b border-white/10 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-cyan-500 flex items-center justify-center text-white shadow-glow-indigo shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold font-display text-white tracking-wide">
                  Help, FAQs & 24/7 AI Support
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-[10px] font-bold text-cyan-300">
                  Fusion High
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Instant assistance, frequently asked questions, and interactive 24/7 AI guide
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Close Help Center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Switcher */}
        <div className="flex items-center gap-2 px-5 py-2.5 bg-surface-dark border-b border-white/5 shrink-0">
          <button
            onClick={() => setActiveTab('faq')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'faq'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>View FAQs</span>
          </button>

          <button
            onClick={() => setActiveTab('ai-support')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'ai-support'
                ? 'bg-gradient-to-r from-brand-600 to-cyan-500 text-white shadow-glow-indigo'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Bot className="w-4 h-4 text-cyan-300" />
            <span>24/7 AI Help & Support</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>
        </div>

        {/* Modal Body Container */}
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
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-surface-darker border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500"
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
                      <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
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
                              className="rounded-2xl bg-surface-darker border border-white/5 overflow-hidden transition-all"
                            >
                              <button
                                onClick={() => setExpandedFaq(isExpanded ? null : faqKey)}
                                className="w-full p-3.5 sm:p-4 text-left flex items-center justify-between gap-3 text-xs font-bold text-white hover:text-indigo-300 transition-colors"
                              >
                                <span>{faq.q}</span>
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                                )}
                              </button>

                              {isExpanded && (
                                <div className="px-4 pb-4 text-xs text-slate-300 leading-relaxed border-t border-white/5 pt-3 animate-fade-in">
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
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-white">Couldn't find what you're looking for?</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Our 24/7 AI Support Bot is ready to answer questions and navigate the system with you.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('ai-support')}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-cyan-500 text-white font-bold text-xs shadow-md shrink-0 hover:scale-105 transition-all flex items-center gap-1.5"
                >
                  <Bot className="w-4 h-4" />
                  <span>Chat with AI Support</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: 24/7 AI HELP & SUPPORT CHAT TOOL */}
          {activeTab === 'ai-support' && (
            <div className="flex-1 flex flex-col min-h-0 bg-surface-darker/60">
              
              {/* Mascot Header Ribbon */}
              <div className="p-3 bg-surface-dark border-b border-white/5 flex items-center justify-between gap-4 shrink-0 px-5">
                <AnimatedSupportMascot isThinking={isAiThinking} isWaving={true} />
                
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-[11px] text-slate-400">School Admin Office</span>
                  <span className="text-xs font-bold text-cyan-300">support@fusionhigh.co.za</span>
                  <span className="text-[10px] text-slate-400">Tel: +27 (0)11 555 0192</span>
                </div>
              </div>

              {/* Chat Messages Feed */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 custom-scrollbar min-h-0">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2.5 max-w-[85%] ${
                      msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                    }`}
                  >
                    {/* Avatar */}
                    {msg.sender === 'ai' ? (
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-500 border border-white/20 flex items-center justify-center text-white shrink-0 shadow-sm">
                        <Bot className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-xl bg-indigo-600 border border-white/20 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
                        {user?.full_name?.charAt(0) || 'U'}
                      </div>
                    )}

                    {/* Speech Bubble */}
                    <div
                      className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-indigo-600 text-white rounded-tr-none shadow-md'
                          : 'bg-surface-dark border border-white/10 text-slate-200 rounded-tl-none shadow-sm'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                      <span className="block text-[9px] text-slate-400 mt-1.5 text-right font-mono">
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                ))}

                {isAiThinking && (
                  <div className="flex items-center gap-2 text-xs text-cyan-400 animate-pulse p-2">
                    <Bot className="w-4 h-4" />
                    <span>Fusion AI is thinking and preparing your answer...</span>
                  </div>
                )}

                <div ref={chatBottomRef} />
              </div>

              {/* Quick Prompt Chips */}
              <div className="px-4 py-2 bg-surface-dark border-t border-white/5 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
                <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  Suggestions:
                </span>
                {quickPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendAiMessage(prompt)}
                    className="px-2.5 py-1 rounded-xl bg-surface-darker hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-[11px] font-medium shrink-0 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Input Area */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendAiMessage();
                }}
                className="p-3 sm:p-4 bg-surface-darker border-t border-white/10 flex items-center gap-2 shrink-0"
              >
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask any question about Fusion High School or the portal..."
                  className="flex-1 px-4 py-2.5 rounded-2xl bg-surface-dark border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isAiThinking}
                  className="p-2.5 sm:px-4 sm:py-2.5 rounded-2xl bg-gradient-to-r from-brand-600 to-cyan-500 hover:from-brand-500 hover:to-cyan-400 text-white font-bold text-xs shadow-glow-indigo transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </form>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
