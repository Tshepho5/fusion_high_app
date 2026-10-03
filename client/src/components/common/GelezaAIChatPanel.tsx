import React, { useEffect, useRef, useState } from 'react';
import {
  Paperclip,
  Image as ImageIcon,
  Send,
  MoreVertical,
  RotateCcw,
  Lightbulb,
  BookOpen,
  Calendar,
  TrendingUp,
  Building2,
  MessageCircle,
  Clock,
  Rocket,
  Shield,
  User,
  Heart,
  CheckCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { learnerService } from '../../services/api';
import { GelezaAIMascot, GELEZA_AI } from './GelezaAIMascot';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  suggestions?: string[];
  actionLinks?: Array<{ label: string; tab: string }>;
}

interface GelezaAIChatPanelProps {
  onSelectTab?: (tab: string) => void;
  onClose?: () => void;
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

const QUICK_ACTIONS: Array<{ label: string; icon: React.ElementType; prompt: string }> = [
  { label: 'Explain a topic', icon: Lightbulb, prompt: 'Please explain a difficult subject topic step by step.' },
  { label: 'Help with homework', icon: BookOpen, prompt: 'I need help with my homework. Where should I start?' },
  { label: 'Show my timetable', icon: Calendar, prompt: 'Where is my weekly timetable?' },
  { label: 'Check my grades', icon: TrendingUp, prompt: 'How do I view my CAPS report card and grades?' },
  { label: 'School information', icon: Building2, prompt: 'Tell me about school information, announcements, and policies.' },
  { label: 'General questions', icon: MessageCircle, prompt: 'I have a general question about the Geleza SA portal.' },
];

const KEY_FEATURES = [
  { title: '24/7 Support', desc: 'Get help anytime, day or night.', icon: Clock },
  { title: 'Study Assistance', desc: 'Explain concepts, solve problems, help with assignments.', icon: Rocket },
  { title: 'School Information', desc: 'Timetables, announcements, policies and more.', icon: Building2 },
  { title: 'Personalized', desc: 'Learns from your questions and adapts to your needs.', icon: User },
  { title: 'Safe & Friendly', desc: 'Designed for learners, with your privacy in mind.', icon: Shield },
] as const;

export const GelezaAIChatPanel: React.FC<GelezaAIChatPanelProps> = ({ onSelectTab, onClose }) => {
  const { user, role } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const firstName =
    (user?.full_name || (user as any)?.name || 'there').toString().trim().split(/\s+/)[0] || 'there';

  const storageKey = `fusion_ai_chat_history_${user?.id || 'guest'}_${role || 'user'}`;
  const [inputMessage, setInputMessage] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return [];
  });

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const hasUserMessages = chatMessages.some((m) => m.sender === 'user');
  const showWelcome = !hasUserMessages;

  useEffect(() => {
    try {
      if (chatMessages.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(chatMessages));
      }
    } catch (_) {}
  }, [chatMessages, storageKey]);

  useEffect(() => {
    if (!showWelcome) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, showWelcome, isAiThinking]);

  const handleClearChat = () => {
    setChatMessages([]);
    setShowFeatures(false);
    try {
      localStorage.removeItem(storageKey);
    } catch (_) {}
  };

  const handleSendAiMessage = async (overrideText?: string) => {
    const textToSend = (overrideText || inputMessage).trim();
    if (!textToSend || isAiThinking) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!overrideText) setInputMessage('');
    setIsAiThinking(true);

    try {
      const res = await learnerService.askTutor({
        question: textToSend,
        subject: 'General School System & Academic Help',
        grade: user?.grade || 10,
        stream: (user as any)?.stream || 'General',
        role: role || (user as any)?.role || 'learner',
        fullName: user?.full_name || (user as any)?.name || '',
        conversationHistory: chatMessages.slice(-8),
      });

      const rawReply = res?.reply || res?.answer || res?.response || res?.text || '';
      const responseSuggestions = res?.suggestions || [];
      const responseActionLinks = res?.actionLinks || [];
      const parsed = parseActionLinks(rawReply);
      const combinedActionLinks = [
        ...(Array.isArray(responseActionLinks) ? responseActionLinks : []),
        ...parsed.actionLinks,
      ];
      const uniqueActionLinks = combinedActionLinks.filter(
        (v, i, a) => a.findIndex((t) => t.tab === v.tab) === i
      );

      setChatMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: parsed.cleanedText || rawReply || "I'm here to help. Ask me anything about your studies or the portal.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestions: responseSuggestions.length > 0 ? responseSuggestions : undefined,
          actionLinks: uniqueActionLinks.length > 0 ? uniqueActionLinks : undefined,
        },
      ]);
    } catch (err) {
      console.warn('[AI ASSISTANT WARN]', err);
      let fallbackText =
        "I'm right here with you! You can access marks, subjects, timetables, assignments, and fees from your dashboard.";
      let fallbackLinks: Array<{ label: string; tab: string }> = [];
      const lower = textToSend.toLowerCase();
      if (lower.includes('report') || lower.includes('mark') || lower.includes('grade')) {
        fallbackText =
          'To view your CAPS report card, open the CAPS Report Cards module on your dashboard.';
        fallbackLinks = [{ label: 'View CAPS Report Cards', tab: 'reports' }];
      } else if (lower.includes('timetable') || lower.includes('schedule')) {
        fallbackText = 'Your weekly period schedule is in the Timetable module.';
        fallbackLinks = [{ label: 'Open Timetable', tab: 'timetable' }];
      } else if (lower.includes('homework') || lower.includes('assignment')) {
        fallbackText = 'Pending homework and submissions are in Assignments.';
        fallbackLinks = [{ label: 'Go to Assignments', tab: 'assignments' }];
      }

      setChatMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: fallbackText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actionLinks: fallbackLinks.length > 0 ? fallbackLinks : undefined,
        },
      ]);
    } finally {
      setIsAiThinking(false);
    }
  };

  const onQuickAction = (action: (typeof QUICK_ACTIONS)[number]) => {
    handleSendAiMessage(action.prompt);
  };

  const shellBg = isLight ? 'bg-white' : 'bg-[#0B1F33]';
  const pageBg = isLight
    ? 'bg-gradient-to-b from-[#E8F7FB] via-white to-[#F0FBFD]'
    : 'bg-gradient-to-b from-[#000000] via-[#0B1F33] to-[#000000]';
  const textPrimary = isLight ? 'text-[#0B1F33]' : 'text-white';
  const textMuted = isLight ? 'text-[#0B1F33]/65' : 'text-white/65';
  const pillBg = isLight
    ? 'bg-[#13C8D9]/12 hover:bg-[#13C8D9]/20 border-[#13C8D9]/25'
    : 'bg-white/5 hover:bg-white/10 border-[#13C8D9]/35 shadow-[0_0_12px_rgba(19,200,217,0.12)]';
  const inputBg = isLight ? 'bg-[#0B1F33]/06 border-[#0B1F33]/10' : 'bg-white/8 border-white/10';
  const aiBubble = isLight
    ? 'bg-[#0B1F33]/06 text-[#0B1F33] border border-[#0B1F33]/08'
    : 'bg-white/10 text-white border border-white/10';

  return (
    <div className={`flex-1 flex flex-col min-h-0 ${pageBg} ${textPrimary}`}>
      {/* Header */}
      <div
        className={`px-4 py-3 flex items-center justify-between gap-3 shrink-0 border-b ${
          isLight ? 'border-[#0B1F33]/08 bg-white/80' : 'border-white/10 bg-[#0B1F33]/80'
        } backdrop-blur-md`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <GelezaAIMascot size={40} glowing={false} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-extrabold tracking-tight" style={{ color: GELEZA_AI.cyan }}>
                Geleza SA
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`text-[11px] ${textMuted}`}>AI Assistant</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleClearChat}
            title="New chat"
            className={`p-2 rounded-xl transition-colors ${isLight ? 'hover:bg-[#0B1F33]/06' : 'hover:bg-white/10'}`}
          >
            <RotateCcw className="w-4 h-4" style={{ color: GELEZA_AI.cyan }} />
          </button>
          <button
            type="button"
            onClick={() => setShowFeatures((v) => !v)}
            title="Key features"
            className={`p-2 rounded-xl transition-colors ${isLight ? 'hover:bg-[#0B1F33]/06' : 'hover:bg-white/10'}`}
          >
            <MoreVertical className={`w-4 h-4 ${textMuted}`} />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors ${isLight ? 'hover:bg-[#0B1F33]/06' : 'hover:bg-white/10'}`}
              title="Close"
            >
              <X className={`w-4 h-4 ${textMuted}`} />
            </button>
          )}
        </div>
      </div>

      {/* Key Features sheet */}
      {showFeatures && (
        <div
          className={`mx-4 mt-3 rounded-3xl border p-4 space-y-3 animate-fade-in shrink-0 ${shellBg} ${
            isLight ? 'border-[#13C8D9]/25 shadow-lg' : 'border-[#13C8D9]/30'
          }`}
        >
          <h3 className={`text-base font-extrabold ${textPrimary}`}>Key Features</h3>
          <div className="space-y-3">
            {KEY_FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="flex items-start gap-3">
                  <span
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: `${GELEZA_AI.cyan}22`, color: isLight ? GELEZA_AI.navy : GELEZA_AI.cyan }}
                  >
                    <Icon className="w-4.5 h-4.5 w-5 h-5" />
                  </span>
                  <div>
                    <p className={`text-sm font-bold ${textPrimary}`}>{f.title}</p>
                    <p className={`text-xs ${textMuted}`}>{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <p
            className="pt-2 text-center text-sm font-semibold italic"
            style={{ color: isLight ? GELEZA_AI.navy : GELEZA_AI.cyan }}
          >
            Always here for you! <Heart className="inline w-3.5 h-3.5 fill-current" style={{ color: GELEZA_AI.cyan }} />
          </p>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar px-4 py-4">
        {showWelcome ? (
          <div className="flex flex-col items-center text-center max-w-md mx-auto space-y-4 pt-2 pb-4 animate-fade-in">
            <GelezaAIMascot size={120} />
            <div className="space-y-2">
              <h2 className={`text-2xl font-extrabold tracking-tight ${textPrimary}`}>
                Hello, <span style={{ color: GELEZA_AI.cyan }}>{firstName}</span>! 👋
              </h2>
              <p className={`text-sm leading-relaxed px-2 ${textMuted}`}>
                I&apos;m your AI study assistant. Ask me anything. I&apos;m here to help you learn, solve problems and
                stay on track!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 w-full pt-1">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => onQuickAction(action)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-full border text-left text-[12px] font-semibold transition-all active:scale-[0.98] ${pillBg} ${textPrimary}`}
                  >
                    <Icon className="w-4 h-4 shrink-0" style={{ color: isLight ? GELEZA_AI.navy : GELEZA_AI.cyan }} />
                    <span className="truncate">{action.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-3.5 max-w-xl mx-auto">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && <GelezaAIMascot size={32} glowing={false} className="mb-0.5" />}

                <div
                  className={`max-w-[78%] px-3.5 py-2.5 rounded-[22px] text-[13px] leading-relaxed ${
                    msg.sender === 'user'
                      ? 'text-white rounded-br-md'
                      : `${aiBubble} rounded-bl-md`
                  }`}
                  style={msg.sender === 'user' ? { backgroundColor: GELEZA_AI.cyan } : undefined}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {msg.actionLinks && msg.actionLinks.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {msg.actionLinks.map((action, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            onSelectTab?.(action.tab);
                            onClose?.();
                          }}
                          className="px-2.5 py-1 rounded-full text-[11px] font-bold border"
                          style={{
                            borderColor: `${GELEZA_AI.cyan}66`,
                            color: msg.sender === 'user' ? GELEZA_AI.white : GELEZA_AI.cyan,
                            background: `${GELEZA_AI.cyan}22`,
                          }}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {msg.suggestions.map((sugg, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendAiMessage(sugg)}
                          className="px-2 py-0.5 rounded-full text-[10px] font-medium border border-current/20 opacity-90 hover:opacity-100"
                        >
                          {sugg}
                        </button>
                      ))}
                    </div>
                  )}

                  <span
                    className={`mt-1.5 flex items-center justify-end gap-1 text-[10px] ${
                      msg.sender === 'user' ? 'text-white/80' : textMuted
                    }`}
                  >
                    {msg.timestamp}
                    {msg.sender === 'user' && <CheckCheck className="w-3 h-3" />}
                  </span>
                </div>
              </div>
            ))}

            {isAiThinking && (
              <div className="flex items-center gap-2">
                <GelezaAIMascot size={28} glowing={false} />
                <div className={`px-4 py-2.5 rounded-[22px] rounded-bl-md ${aiBubble}`}>
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: GELEZA_AI.cyan }} />
                    <span
                      className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:120ms]"
                      style={{ background: GELEZA_AI.cyan }}
                    />
                    <span
                      className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:240ms]"
                      style={{ background: GELEZA_AI.cyan }}
                    />
                  </span>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendAiMessage();
        }}
        className={`p-3 sm:p-4 shrink-0 border-t ${isLight ? 'border-[#0B1F33]/08 bg-white/70' : 'border-white/10 bg-black/40'}`}
      >
        <div
          className={`flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-full border ${inputBg}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={() => {
              /* attachment UI reserved — keeps layout matching mockup */
            }}
          />
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={() => {
              /* image UI reserved — keeps layout matching mockup */
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`p-1.5 rounded-full ${isLight ? 'text-[#0B1F33]/55 hover:text-[#0B1F33]' : 'text-white/55 hover:text-white'}`}
            title="Attach file"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className={`p-1.5 rounded-full ${isLight ? 'text-[#0B1F33]/55 hover:text-[#0B1F33]' : 'text-white/55 hover:text-white'}`}
            title="Attach image"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message..."
            className={`flex-1 min-w-0 bg-transparent border-0 outline-none text-sm py-2 ${
              isLight ? 'text-[#0B1F33] placeholder:text-[#0B1F33]/40' : 'text-white placeholder:text-white/40'
            }`}
          />

          <button
            type="submit"
            disabled={!inputMessage.trim() || isAiThinking}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 disabled:opacity-40 transition-transform active:scale-95"
            style={{ backgroundColor: GELEZA_AI.cyan }}
            title="Send"
          >
            <Send className="w-4 h-4 translate-x-px" />
          </button>
        </div>
      </form>
    </div>
  );
};
