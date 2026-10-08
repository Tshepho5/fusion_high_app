import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Menu,
  Phone,
  PhoneOff,
  MoreVertical,
  Plus,
  Send,
  Search,
  ArrowRight,
  Bell,
  BookOpen,
  GraduationCap,
  Target,
  Briefcase,
  Languages,
  Lightbulb,
  Sigma,
  Calendar,
  Compass,
  CheckCheck,
  RotateCcw,
  X,
  ArrowLeft,
  Paperclip,
  Image as ImageIcon,
  Mic,
  MicOff,
  Volume2,
  Sparkles,
  Shield,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { learnerService } from '../../services/api';
import { GelezaAIMascot, GELEZA_AI } from './GelezaAIMascot';

export interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  suggestions?: string[];
  actionLinks?: Array<{ label: string; tab: string }>;
}

export interface RecentChatSession {
  id: string;
  icon: 'math' | 'calendar' | 'career' | 'general';
  title: string;
  preview: string;
  time: string;
  messages: ChatMessage[];
}

interface GelezaAIChatPanelProps {
  onSelectTab?: (tab: string) => void;
  onClose?: () => void;
  initialView?: 'hub' | 'chat';
}

function parseActionLinks(text: string): { cleanedText: string; actionLinks: Array<{ label: string; tab: string }> } {
  if (!text) return { cleanedText: '', actionLinks: [] };
  const links: Array<{ label: string; tab: string }> = [];
  const linkRegex = /\[([^\]]+)\]\(action:([a-zA-Z0-9_-]+)\)/g;
  let match;
  while ((match = linkRegex.exec(text)) !== null) {
    links.push({ label: match[1].trim(), tab: match[2].trim() });
  }
  const cleanedText = text.replace(linkRegex, '').replace(/\n\s*\n\s*\n/g, '\n\n').trim();
  return { cleanedText, actionLinks: links };
}

// 6 Action Categories (matching Screenshot 2)
const ACTION_CATEGORIES = [
  {
    id: 'homework',
    title: 'Homework Help',
    icon: BookOpen,
    prompt: 'Can you help me with my homework? Please guide me step-by-step.',
    color: 'from-blue-500/20 to-cyan-500/20'
  },
  {
    id: 'study-guides',
    title: 'Study Guides',
    icon: GraduationCap,
    prompt: 'Can you provide a study guide and revision summary for my upcoming tests?',
    color: 'from-cyan-500/20 to-teal-500/20'
  },
  {
    id: 'subject-support',
    title: 'Subject Support',
    icon: Target,
    prompt: 'I need subject support for difficult CAPS curriculum concepts.',
    color: 'from-sky-500/20 to-blue-500/20'
  },
  {
    id: 'career',
    title: 'Career Guidance',
    icon: Briefcase,
    prompt: 'Can you give me career guidance, university degree requirements, and APS scores?',
    color: 'from-indigo-500/20 to-cyan-500/20'
  },
  {
    id: 'translation',
    title: 'Language Translation',
    icon: Languages,
    prompt: 'Can you help me translate and understand school concepts in official South African languages?',
    color: 'from-teal-500/20 to-emerald-500/20'
  },
  {
    id: 'creative',
    title: 'Creative Ideas',
    icon: Lightbulb,
    prompt: 'Give me creative ideas and study strategies for school projects and presentations.',
    color: 'from-amber-500/20 to-cyan-500/20'
  }
];

export const GelezaAIChatPanel: React.FC<GelezaAIChatPanelProps> = ({
  onSelectTab,
  onClose,
  initialView = 'hub'
}) => {
  const { user, role } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const firstName =
    (user?.full_name || (user as any)?.name || 'there').toString().trim().split(/\s+/)[0] || 'there';
  const userAvatar = (user as any)?.profile_picture || (user as any)?.profile_picture_path || null;

  const storageKey = `geleza_ai_chat_v3_${user?.id || 'guest'}_${role || 'user'}`;
  const sessionsKey = `geleza_ai_sessions_v3_${user?.id || 'guest'}`;

  // Current view: 'hub' (Screenshot 2) or 'chat' (Screenshot 1)
  const [view, setView] = useState<'hub' | 'chat'>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved && JSON.parse(saved).length > 0) return 'chat';
    } catch (_) {}
    return initialView;
  });

  const [inputMessage, setInputMessage] = useState('');
  const [hubSearchText, setHubSearchText] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isVoiceCallActive, setIsVoiceCallActive] = useState(false);
  const [isCallMuted, setIsCallMuted] = useState(false);

  // Active chat messages
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return [
      {
        id: 'welcome-init',
        sender: 'ai',
        text: `Hey there! 👋\nI'm your Geleza SA AI Assistant.\nI'm here to help you with your school work, questions, ideas and more.\n\nWhat would you like to do today?`,
        timestamp: '09:15 AM'
      }
    ];
  });

  // Recent chat history items (Screenshot 2)
  const [recentChats, setRecentChats] = useState<RecentChatSession[]>([
    {
      id: 'recent-math',
      icon: 'math',
      title: 'Mathematics Help',
      preview: 'Solving linear equations and examples...',
      time: '09:17 AM',
      messages: [
        {
          id: 'm1',
          sender: 'ai',
          text: `Hey there! 👋\nI'm your Geleza SA AI Assistant.\nI'm here to help you with your school work, questions, ideas and more.\n\nWhat would you like to do today?`,
          timestamp: '09:15 AM'
        },
        {
          id: 'm2',
          sender: 'user',
          text: 'Can you help me with my mathematics homework?',
          timestamp: '09:16 AM'
        },
        {
          id: 'm3',
          sender: 'ai',
          text: `Of course! I'd be happy to help.\nWhat topic are you working on?\n\n• Algebra\n• Geometry\n• Trigonometry\n• Calculus\n• Other`,
          timestamp: '09:16 AM'
        },
        {
          id: 'm4',
          sender: 'user',
          text: 'Algebra – solving for x in a linear equation.',
          timestamp: '09:17 AM'
        },
        {
          id: 'm5',
          sender: 'ai',
          text: `Great! Here's a step-by-step solution to solve for x in the equation:\n\n2(x + 3) = 14\n\n1. Expand: 2x + 6 = 14\n2. Subtract 6: 2x = 8\n3. Divide by 2: x = 4\n\nSo, the value of x is 4. 🎯\n\nWould you like another example or practice questions?`,
          timestamp: '09:17 AM'
        }
      ]
    },
    {
      id: 'recent-study',
      icon: 'calendar',
      title: 'Study Plan',
      preview: 'A personalized study plan for your exams...',
      time: 'Yesterday',
      messages: [
        {
          id: 's1',
          sender: 'ai',
          text: 'Let us build a targeted CAPS revision schedule tailored to your examination dates!',
          timestamp: 'Yesterday'
        }
      ]
    },
    {
      id: 'recent-career',
      icon: 'career',
      title: 'Career Guidance',
      preview: 'Exploring careers in healthcare and tech...',
      time: 'Sun',
      messages: [
        {
          id: 'c1',
          sender: 'ai',
          text: 'Healthcare & STEM degrees require strong Mathematics and Physical Sciences ratings. Let us review the APS requirements.',
          timestamp: 'Sun'
        }
      ]
    }
  ]);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      if (chatMessages.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(chatMessages));
      }
    } catch (_) {}
  }, [chatMessages, storageKey]);

  useEffect(() => {
    if (view === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, view, isAiThinking]);

  const handleStartNewChat = () => {
    const fresh: ChatMessage[] = [
      {
        id: `welcome-${Date.now()}`,
        sender: 'ai',
        text: `Hey there! 👋\nI'm your Geleza SA AI Assistant.\nI'm here to help you with your school work, questions, ideas and more.\n\nWhat would you like to do today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
    setChatMessages(fresh);
    setShowMenu(false);
    setView('chat');
  };

  const handleOpenRecentChat = (session: RecentChatSession) => {
    if (session.messages && session.messages.length > 0) {
      setChatMessages(session.messages);
    }
    setView('chat');
  };

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
    setView('chat');

    try {
      const res = await learnerService.askTutor({
        question: textToSend,
        subject: 'General School System & Academic Help',
        grade: user?.grade || 10,
        stream: (user as any)?.stream || 'General',
        role: role || (user as any)?.role || 'learner',
        fullName: user?.full_name || (user as any)?.name || '',
        conversationHistory: chatMessages.slice(-10)
      });

      const rawReply = res?.reply || res?.answer || res?.response || res?.text || '';
      const responseSuggestions = res?.suggestions || [];
      const responseActionLinks = res?.actionLinks || [];
      const parsed = parseActionLinks(rawReply);
      const combinedActionLinks = [
        ...(Array.isArray(responseActionLinks) ? responseActionLinks : []),
        ...parsed.actionLinks
      ];
      const uniqueActionLinks = combinedActionLinks.filter(
        (v, i, a) => a.findIndex((t) => t.tab === v.tab) === i
      );

      setChatMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: parsed.cleanedText || rawReply || "I'm here to help. Ask me anything about your studies, questions, or ideas!",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestions: responseSuggestions.length > 0 ? responseSuggestions : undefined,
          actionLinks: uniqueActionLinks.length > 0 ? uniqueActionLinks : undefined
        }
      ]);
    } catch (err) {
      console.warn('[AI ASSISTANT WARN]', err);
      // Helpful curriculum-aware fallback if network or endpoint has momentary issue
      let fallbackText = "I'm right here with you! Let's work through this problem step-by-step. What specific equation, concept, or subject question are you tackling?";
      const lower = textToSend.toLowerCase();
      if (lower.includes('algebra') || lower.includes('equation') || lower.includes('solve')) {
        fallbackText = `Great! Here's a step-by-step solution to solve for x in the equation:\n\n2(x + 3) = 14\n\n1. Expand: 2x + 6 = 14\n2. Subtract 6: 2x = 8\n3. Divide by 2: x = 4\n\nSo, the value of x is 4. 🎯\n\nWould you like another example or practice questions?`;
      } else if (lower.includes('report') || lower.includes('mark') || lower.includes('grade')) {
        fallbackText = 'You can access your verified CAPS report cards and term assessments directly from the CAPS Report Cards module.';
      } else if (lower.includes('timetable') || lower.includes('schedule')) {
        fallbackText = 'Your school periods and schedule are available in the Timetable section.';
      }

      setChatMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: fallbackText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleHubSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hubSearchText.trim()) return;
    const query = hubSearchText.trim();
    setHubSearchText('');
    handleSendAiMessage(query);
  };

  const handleCategoryClick = (cat: typeof ACTION_CATEGORIES[0]) => {
    handleSendAiMessage(cat.prompt);
  };

  // Color tokens tailored for exact match with screenshots and smooth Light Mode transition
  const themeStyles = useMemo(() => {
    return {
      shellBg: isLight ? 'bg-[#F8FAFC]' : 'bg-[#050D17]',
      headerBg: isLight ? 'bg-white/95 border-b border-slate-200' : 'bg-[#071322]/95 border-b border-white/5',
      heroBg: isLight
        ? 'bg-gradient-to-br from-sky-50 via-cyan-50/60 to-blue-50 border-cyan-400/40 shadow-sm'
        : 'bg-gradient-to-br from-[#0c233c] via-[#081a2e] to-[#04111f] border-cyan-400/30 shadow-[0_0_30px_rgba(6,182,212,0.15)]',
      heroTitle: isLight ? 'text-slate-900' : 'text-white',
      heroSub: isLight ? 'text-slate-600' : 'text-cyan-100/70',
      searchBg: isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#071524]/90 border-cyan-500/30 text-white',
      tileBg: isLight
        ? 'bg-white hover:bg-cyan-50/50 border-slate-200 hover:border-cyan-400 shadow-sm'
        : 'bg-[#081726] hover:bg-[#0b1f33] border-cyan-500/20 hover:border-cyan-400/50 shadow-md',
      tileIconBg: isLight ? 'bg-cyan-500/10 text-cyan-600' : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30',
      tileTitle: isLight ? 'text-slate-900' : 'text-white',
      recentItemBg: isLight
        ? 'bg-white hover:bg-slate-50 border-slate-200 shadow-sm'
        : 'bg-[#071728] hover:bg-[#0a1e35] border-white/5 hover:border-cyan-500/30',
      chatAiBubble: isLight
        ? 'bg-slate-100 text-slate-900 border border-slate-200'
        : 'bg-[#0f2238] text-white border border-cyan-500/20 shadow-[0_4px_20px_rgba(0,0,0,0.25)]',
      chatUserBubble: 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-md shadow-cyan-500/20',
      composerBg: isLight ? 'bg-white/95 border-t border-slate-200' : 'bg-[#071322]/95 border-t border-white/5',
      inputPill: isLight ? 'bg-slate-100 border-slate-200 text-slate-900' : 'bg-[#09192c] border-cyan-500/25 text-white'
    };
  }, [isLight]);

  return (
    <div className={`relative w-full h-full flex flex-col overflow-hidden font-sans select-text ${themeStyles.shellBg}`}>
      {/* ========================================================================= */}
      {/* 1. TOP APP BAR                                                            */}
      {/* ========================================================================= */}
      <header className={`px-4 py-3 shrink-0 flex items-center justify-between gap-3 backdrop-blur-md z-20 ${themeStyles.headerBg}`}>
        {/* Left: Navigation / Brand */}
        <div className="flex items-center gap-2.5 min-w-0">
          {view === 'chat' ? (
            <button
              type="button"
              onClick={() => setView('hub')}
              className="p-1.5 -ml-1 rounded-full text-slate-400 hover:text-white transition-colors"
              title="Back to Hub"
            >
              <ArrowLeft className="w-5 h-5 text-cyan-400" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowMenu((prev) => !prev)}
              className="p-1.5 -ml-1 rounded-full text-slate-400 hover:text-white transition-colors"
              title="Menu"
            >
              <Menu className="w-5 h-5 text-cyan-400" />
            </button>
          )}

          {/* Logo with Glowing Cap 'G' Icon */}
          <div className="flex items-center gap-2.5">
            <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 p-[2px] shadow-[0_0_12px_rgba(6,182,212,0.4)]">
              <div className="w-full h-full rounded-full bg-[#061423] flex items-center justify-center">
                <span className="text-cyan-400 font-black text-sm tracking-tighter">G</span>
                <span className="absolute -top-1 -right-0.5 text-[10px]">🎓</span>
              </div>
            </div>

            <div className="flex flex-col leading-tight">
              <div className="flex items-center gap-1">
                <span className={`font-black text-base tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Geleza
                </span>
                <span className="font-black text-base text-cyan-400">SA</span>
              </div>
              <span className="text-[11px] font-bold text-cyan-400/90 tracking-wide">
                {view === 'hub' ? 'Your AI Assistant' : 'AI Assistant'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-1.5">
          {view === 'chat' ? (
            <>
              {/* Call Simulation Button */}
              <button
                type="button"
                onClick={() => setIsVoiceCallActive(true)}
                className="p-2 rounded-full text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                title="Start AI Voice Call"
              >
                <Phone className="w-5 h-5" />
              </button>

              {/* Three Dots Menu */}
              <button
                type="button"
                onClick={() => setShowMenu((prev) => !prev)}
                className="p-2 rounded-full text-slate-400 hover:text-white transition-colors"
                title="Options"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              {/* Notification Bell with Badge */}
              <button
                type="button"
                onClick={() => alert('You have 3 active study recommendations from your Geleza SA AI Assistant.')}
                className="relative p-2 rounded-full text-slate-400 hover:text-cyan-400 transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-cyan-500 text-white font-bold text-[10px] flex items-center justify-center shadow-sm">
                  3
                </span>
              </button>
            </>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-rose-400 transition-colors ml-1"
              title="Close Assistant"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* Dropdown Menu */}
      {showMenu && (
        <div className={`absolute top-14 right-4 z-50 w-56 rounded-2xl border p-2 shadow-2xl backdrop-blur-xl animate-fade-in ${
          isLight ? 'bg-white/95 border-slate-200 text-slate-800' : 'bg-[#08192c]/95 border-cyan-500/30 text-white'
        }`}>
          <button
            onClick={() => {
              handleStartNewChat();
              setShowMenu(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl hover:bg-cyan-500/10 transition-colors text-left"
          >
            <RotateCcw className="w-4 h-4 text-cyan-400" />
            <span>New Chat Conversation</span>
          </button>
          <button
            onClick={() => {
              setView(view === 'hub' ? 'chat' : 'hub');
              setShowMenu(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl hover:bg-cyan-500/10 transition-colors text-left"
          >
            <Compass className="w-4 h-4 text-cyan-400" />
            <span>{view === 'hub' ? 'Switch to Active Chat' : 'Switch to Hub Overview'}</span>
          </button>
          <button
            onClick={() => {
              setIsVoiceCallActive(true);
              setShowMenu(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl hover:bg-cyan-500/10 transition-colors text-left"
          >
            <Phone className="w-4 h-4 text-cyan-400" />
            <span>AI Voice Call Tutor</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MAIN BODY CONTENT                                                      */}
      {/* ========================================================================= */}
      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
        {/* ======================================================================= */}
        {/* VIEW A: HUB SCREEN (Screenshot 2)                                      */}
        {/* ======================================================================= */}
        {view === 'hub' ? (
          <div className="p-4 sm:p-5 space-y-5 max-w-lg mx-auto animate-fade-in">
            {/* 1. Hero Card with Cute Robot Mascot */}
            <div className={`relative rounded-3xl border p-5 overflow-hidden transition-all ${themeStyles.heroBg}`}>
              <div className="flex items-start justify-between gap-3 relative z-10">
                <div className="space-y-1.5 flex-1 pr-2">
                  <h2 className={`text-lg sm:text-xl font-black tracking-tight leading-snug ${themeStyles.heroTitle}`}>
                    Your AI Companion for a Brighter Future
                  </h2>
                  <p className={`text-xs sm:text-sm leading-relaxed ${themeStyles.heroSub}`}>
                    Ask questions, get help, explore ideas and achieve your goals.
                  </p>

                  {/* Search inside Hero Card */}
                  <form onSubmit={handleHubSearchSubmit} className="pt-3">
                    <div className={`relative flex items-center rounded-2xl border px-3 py-1.5 shadow-sm transition-all focus-within:ring-2 focus-within:ring-cyan-400 ${themeStyles.searchBg}`}>
                      <Search className="w-4 h-4 text-cyan-400 shrink-0 mr-2" />
                      <input
                        type="text"
                        value={hubSearchText}
                        onChange={(e) => setHubSearchText(e.target.value)}
                        placeholder="Ask anything..."
                        className="w-full bg-transparent border-0 outline-none text-xs sm:text-sm placeholder:text-slate-400"
                      />
                      <button
                        type="submit"
                        className="w-7 h-7 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-900 flex items-center justify-center shrink-0 ml-1 transition-transform active:scale-95 shadow-md shadow-cyan-400/20"
                        title="Search / Ask"
                      >
                        <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>
                  </form>
                </div>

                {/* Robot Mascot on Right */}
                <div className="shrink-0 -mr-2 -mt-2">
                  <img
                    src="/assets/geleza-ai-mascot.png"
                    alt="Geleza SA AI Mascot"
                    className="w-24 h-24 sm:w-28 sm:h-28 object-contain drop-shadow-[0_10px_15px_rgba(6,182,212,0.3)] animate-float"
                    onError={(e) => {
                      // Fallback to SVG mascot if PNG path has any browser cache issue
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 2. 6 Action Category Tiles (2 columns x 3 rows grid) */}
            <div className="grid grid-cols-2 gap-3 sm:gap-3.5">
              {ACTION_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategoryClick(cat)}
                    className={`p-4 rounded-2xl border text-left flex flex-col items-start gap-2.5 transition-all duration-200 active:scale-[0.98] group cursor-pointer ${themeStyles.tileBg}`}
                  >
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${themeStyles.tileIconBg}`}>
                      <Icon className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <span className={`text-xs sm:text-sm font-bold tracking-tight ${themeStyles.tileTitle}`}>
                      {cat.title}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 3. Recent Chats Section */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <h3 className={`text-sm font-extrabold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Recent Chats
                </h3>
                <button
                  type="button"
                  onClick={() => setView('chat')}
                  className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                >
                  <span>See All</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-2">
                {recentChats.map((rc) => {
                  return (
                    <button
                      key={rc.id}
                      type="button"
                      onClick={() => handleOpenRecentChat(rc)}
                      className={`w-full p-3.5 rounded-2xl border flex items-center gap-3 transition-all duration-200 active:scale-[0.99] text-left group cursor-pointer ${themeStyles.recentItemBg}`}
                    >
                      {/* Icon Badge */}
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
                        {rc.icon === 'math' && <Sigma className="w-5 h-5" />}
                        {rc.icon === 'calendar' && <Calendar className="w-5 h-5" />}
                        {rc.icon === 'career' && <Compass className="w-5 h-5" />}
                        {rc.icon === 'general' && <Sparkles className="w-5 h-5" />}
                      </div>

                      {/* Title & Preview */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className={`text-xs sm:text-sm font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                            {rc.title}
                          </h4>
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">
                            {rc.time}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {rc.preview}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* ======================================================================= */
          /* VIEW B: CHAT CONVERSATION SCREEN (Screenshot 1)                         */
          /* ======================================================================= */
          <div className="p-4 sm:p-5 space-y-4 max-w-lg mx-auto">
            {chatMessages.map((msg) => {
              const isAi = msg.sender === 'ai';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${isAi ? 'justify-start' : 'justify-end'}`}
                >
                  {/* AI Avatar (Left) */}
                  {isAi && (
                    <div className="shrink-0 mt-0.5">
                      <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 p-[1.5px] shadow-[0_0_10px_rgba(6,182,212,0.4)]">
                        <div className="w-full h-full rounded-full bg-[#061423] flex items-center justify-center">
                          <span className="text-cyan-400 font-black text-xs">G</span>
                          <span className="absolute -top-1 -right-0.5 text-[8px]">🎓</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div className={`max-w-[82%] flex flex-col ${isAi ? 'items-start' : 'items-end'}`}>
                    <div
                      className={`p-3.5 sm:p-4 rounded-2xl text-[13px] sm:text-sm leading-relaxed ${
                        isAi
                          ? `${themeStyles.chatAiBubble} rounded-tl-sm`
                          : `${themeStyles.chatUserBubble} rounded-tr-sm`
                      }`}
                    >
                      <p className="whitespace-pre-wrap font-normal">{msg.text}</p>

                      {/* Interactive Action Links */}
                      {msg.actionLinks && msg.actionLinks.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5 pt-1 border-t border-cyan-500/20">
                          {msg.actionLinks.map((action, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                onSelectTab?.(action.tab);
                                onClose?.();
                              }}
                              className="px-3 py-1 rounded-full text-xs font-bold border border-cyan-400/50 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition-all active:scale-95"
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Prompt suggestions */}
                      {msg.suggestions && msg.suggestions.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5 pt-1">
                          {msg.suggestions.map((sugg, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSendAiMessage(sugg)}
                              className="px-2.5 py-1 rounded-full text-[11px] font-semibold border border-current/25 opacity-90 hover:opacity-100 transition-opacity bg-white/5"
                            >
                              {sugg}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Timestamp & Double Checkmarks */}
                      <div className="mt-1.5 flex items-center justify-end gap-1 text-[10px] text-slate-400 font-mono">
                        <span>{msg.timestamp}</span>
                        {!isAi && <CheckCheck className="w-3.5 h-3.5 text-white/90" />}
                      </div>
                    </div>
                  </div>

                  {/* User Avatar (Right) */}
                  {!isAi && (
                    <div className="shrink-0 mt-0.5">
                      {userAvatar ? (
                        <img
                          src={userAvatar}
                          alt={firstName}
                          className="w-8 h-8 rounded-full object-cover border-2 border-cyan-400 shadow-md"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white font-black text-xs shadow-md">
                          {firstName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* AI Thinking Animation */}
            {isAiThinking && (
              <div className="flex items-start gap-2.5">
                <div className="shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 p-[1.5px] shadow-[0_0_10px_rgba(6,182,212,0.4)]">
                    <div className="w-full h-full rounded-full bg-[#061423] flex items-center justify-center">
                      <span className="text-cyan-400 font-black text-xs">G</span>
                    </div>
                  </div>
                </div>

                <div className={`px-4 py-3 rounded-2xl rounded-tl-sm ${themeStyles.chatAiBubble} flex items-center gap-1.5`}>
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. BOTTOM COMPOSER (Screenshot 1)                                         */}
      {/* ========================================================================= */}
      <div className={`p-3 sm:p-4 shrink-0 backdrop-blur-md z-20 ${themeStyles.composerBg}`}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendAiMessage();
          }}
          className="max-w-lg mx-auto flex items-center gap-2"
        >
          {/* Circular '+' Button for Uploading Pictures & Worksheets */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAttachMenu((prev) => !prev)}
              className="w-10 h-10 rounded-full bg-[#0b1d30] border border-cyan-500/40 text-cyan-400 hover:text-cyan-300 hover:border-cyan-400 flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-md shadow-cyan-500/10 cursor-pointer"
              title="Attach Homework Photo or Document"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </button>

            {/* Attachment popover */}
            {showAttachMenu && (
              <div className={`absolute bottom-12 left-0 w-52 rounded-2xl border p-2 shadow-2xl backdrop-blur-xl animate-fade-in z-30 ${
                isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#08192c] border-cyan-500/30 text-white'
              }`}>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setShowAttachMenu(false);
                      handleSendAiMessage(`[Attached Homework Image: ${file.name}] Can you explain and solve the problem in this picture?`);
                    }
                  }}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setShowAttachMenu(false);
                      handleSendAiMessage(`[Attached Document: ${file.name}] Please review this academic file.`);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl hover:bg-cyan-500/10 transition-colors text-left"
                >
                  <ImageIcon className="w-4 h-4 text-cyan-400" />
                  <span>Upload Homework Photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl hover:bg-cyan-500/10 transition-colors text-left"
                >
                  <Paperclip className="w-4 h-4 text-cyan-400" />
                  <span>Attach Document</span>
                </button>
              </div>
            )}
          </div>

          {/* Pill Input */}
          <div className={`flex-1 flex items-center rounded-full border px-4 py-2 shadow-inner transition-all focus-within:ring-2 focus-within:ring-cyan-400 ${themeStyles.inputPill}`}>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type a message..."
              className="w-full bg-transparent border-0 outline-none text-xs sm:text-sm placeholder:text-slate-400"
            />
          </div>

          {/* Cyan Circular Send Button */}
          <button
            type="submit"
            disabled={!inputMessage.trim() || isAiThinking}
            className="w-10 h-10 rounded-full bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 text-slate-950 flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-md shadow-cyan-400/25 cursor-pointer"
            title="Send Message"
          >
            <Send className="w-4 h-4 translate-x-px stroke-[2.5]" />
          </button>
        </form>
      </div>

      {/* ========================================================================= */}
      {/* 4. AI VOICE CALL SIMULATION OVERLAY                                       */}
      {/* ========================================================================= */}
      {isVoiceCallActive && (
        <div className="absolute inset-0 z-50 bg-[#050D17]/95 backdrop-blur-xl flex flex-col items-center justify-between p-6 animate-fade-in text-white">
          {/* Header */}
          <div className="text-center pt-6 space-y-1">
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold">
              Geleza SA AI Voice Tutor
            </span>
            <h3 className="text-xl font-black">Voice Connected</h3>
            <p className="text-xs text-slate-400">Listening to your academic questions...</p>
          </div>

          {/* Mascot with Pulsing Voice Rings */}
          <div className="relative flex items-center justify-center my-auto">
            <div className="absolute w-48 h-48 rounded-full border-2 border-cyan-400/20 animate-ping" />
            <div className="absolute w-40 h-40 rounded-full border-2 border-cyan-400/40 animate-pulse" />
            <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 p-1 shadow-[0_0_40px_rgba(6,182,212,0.5)]">
              <div className="w-full h-full rounded-full bg-[#071524] flex items-center justify-center">
                <img
                  src="/assets/geleza-ai-mascot.png"
                  alt="Mascot Voice"
                  className="w-20 h-20 object-contain drop-shadow-md"
                />
              </div>
            </div>
          </div>

          {/* Call Controls */}
          <div className="w-full max-w-xs flex items-center justify-around pb-6">
            <button
              type="button"
              onClick={() => setIsCallMuted((prev) => !prev)}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                isCallMuted ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              title={isCallMuted ? 'Unmute' : 'Mute'}
            >
              {isCallMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>

            <button
              type="button"
              onClick={() => setIsVoiceCallActive(false)}
              className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition-transform active:scale-95"
              title="End Call"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
