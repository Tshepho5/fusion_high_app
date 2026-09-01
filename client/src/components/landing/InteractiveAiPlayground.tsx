import React, { useState } from 'react';
import { Bot, Sparkles, Send, BookOpen, Lightbulb, Calculator, Atom, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PresetPrompt {
  id: string;
  category: string;
  icon: React.ReactNode;
  question: string;
  answer: string;
  badgeColor: string;
}

const PRESET_PROMPTS: PresetPrompt[] = [
  {
    id: 'phys-1',
    category: 'Physical Sciences (Grade 11/12)',
    icon: <Atom className="w-3.5 h-3.5" />,
    question: 'How do I apply Newton\'s Second Law on an inclined plane?',
    answer: `### 🚀 Step-by-Step CAPS Method:

1. **Resolve Gravitational Force ($F_g = mg$):**
   - **Parallel component ($F_{g\\parallel}$):** Pulls the object down the slope $\\rightarrow F_{g\\parallel} = mg \\sin(\\theta)$
   - **Perpendicular component ($F_{g\\perp}$):** Balances Normal Force ($F_N$) $\\rightarrow F_{g\\perp} = mg \\cos(\\theta)$

2. **Set up the Net Force Equation ($F_{\\text{net}} = ma$):**
   - $F_{\\text{net}} = F_{\\text{applied}} - F_{g\\parallel} - f_k = ma$
   
3. **Pro-Tip for Matric Exams:** Always draw a free-body diagram showing $F_N$, $F_g$, $f_k$, and $F_{\\text{applied}}$ before writing equations!`,
    badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  },
  {
    id: 'maths-1',
    category: 'Pure Mathematics (Grade 12)',
    icon: <Calculator className="w-3.5 h-3.5" />,
    question: 'How do I find the local maximum of f(x) = -2x³ + 6x² + 18x - 5?',
    answer: `### 📐 Calculus Optimization Steps:

1. **Find First Derivative $f'(x)$:**
   $$f'(x) = -6x^2 + 12x + 18$$

2. **Set $f'(x) = 0$ for Stationary Points:**
   $$-6(x^2 - 2x - 3) = 0 \\implies (x - 3)(x + 1) = 0$$
   Stationary points at **$x = 3$** and **$x = -1$**.

3. **Second Derivative Test ($f''(x) = -12x + 12$):**
   - At $x = 3$: $f''(3) = -12(3) + 12 = -24 < 0$ $\\rightarrow$ **Local Maximum!**
   - Point value: $f(3) = -2(27) + 6(9) + 18(3) - 5 = 49$.

**Maximum coordinate is $(3, 49)$.**`,
    badgeColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
  },
  {
    id: 'aps-1',
    category: 'Matric APS & University Guide',
    icon: <BookOpen className="w-3.5 h-3.5" />,
    question: 'What APS score and subjects do I need for BSc Computer Science in South Africa?',
    answer: `### 🎓 South African University APS Requirements:

- **Target APS:** **34 - 38+** (Excluding Life Orientation)
- **Essential Subjects:**
  - **Mathematics (Pure):** Minimum Level 6 (70%+) or Level 7 (80%+)
  - **Physical Sciences / Information Technology:** Minimum Level 5 (60%+)
  - **English (Home or FAL):** Minimum Level 5 (60%+)
  
💡 **Scholarship Opportunity:** With an APS of 36+, you qualify for Telkom, Vodacom, and Sasol full-ride bursaries tracked directly in Fusion High!`,
    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  },
  {
    id: 'lit-1',
    category: 'English Home Language (FET)',
    icon: <Lightbulb className="w-3.5 h-3.5" />,
    question: 'What are the main themes of corruption and tragedy in Shakespeare\'s Hamlet?',
    answer: `### 🎭 CAPS Key Thematic Analysis:

1. **"Something is rotten in the state of Denmark":**
   - Claudius’s fratricide represents moral corruption poisoning the entire kingdom and social order.
2. **Action vs. Inaction & Procrastination:**
   - Hamlet\'s philosophical paralysis contrasted with Laertes\' impulsive revenge.
3. **Appearance vs. Reality:**
   - Deception, madness (real vs. feigned), and the motif of spies (Polonius, Rosencrantz, Guildenstern).`,
    badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  }
];

export const InteractiveAiPlayground: React.FC = () => {
  const [selectedPrompt, setSelectedPrompt] = useState<PresetPrompt>(PRESET_PROMPTS[0]);
  const [customInput, setCustomInput] = useState('');
  const [chatLog, setChatLog] = useState<{ query: string; response: string; category?: string }[]>([
    {
      query: PRESET_PROMPTS[0].question,
      response: PRESET_PROMPTS[0].answer,
      category: PRESET_PROMPTS[0].category,
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const handleSelectPreset = (preset: PresetPrompt) => {
    setSelectedPrompt(preset);
    setIsTyping(true);
    setTimeout(() => {
      setChatLog([
        {
          query: preset.question,
          response: preset.answer,
          category: preset.category,
        },
      ]);
      setIsTyping(false);
    }, 300);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;

    const userText = customInput.trim();
    setCustomInput('');
    setIsTyping(true);

    // Simulate smart CAPS-aligned response
    setTimeout(() => {
      let simulatedResponse = `### 💡 Fusion AI Tutor Analysis:

Great question regarding **"${userText}"**!

Here is how to master this concept according to the **DBE CAPS syllabus**:
1. **Core Concept:** Break the problem into fundamental principles and definitions.
2. **Standard Formula / Method:** State your knowns, unknowns, and appropriate working.
3. **Matric Exam Insight:** Show all steps clearly to earn full method marks.

*Log into your Fusion High learner portal for unlimited AI tutoring, step-by-step homework breakdowns, and personalized past paper practice!*`;

      if (userText.toLowerCase().includes('aps') || userText.toLowerCase().includes('score')) {
        simulatedResponse = `### 📊 South African APS Scoring Formula:
- **Level 7 (80 - 100%):** 7 Points
- **Level 6 (70 - 79%):** 6 Points
- **Level 5 (60 - 69%):** 5 Points
- **Level 4 (50 - 59%):** 4 Points
*(Calculated across your best 6 subjects, excluding Life Orientation).*

Use the built-in **Fusion High APS Calculator** inside your dashboard to forecast university degrees!`;
      }

      setChatLog((prev) => [
        {
          query: userText,
          response: simulatedResponse,
          category: 'Live CAPS AI Tutor',
        },
        ...prev.slice(0, 2),
      ]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <section className="relative w-full max-w-5xl mx-auto my-12 px-4 sm:px-6">
      {/* Decorative Glow Ambient Backdrop */}
      <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-indigo-500/20 to-purple-500/20 rounded-3xl blur-2xl opacity-60 pointer-events-none" />

      <div className="relative rounded-3xl bg-surface-dark/95 border border-white/15 p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-cyan-500/10 space-y-6">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[11px] font-bold text-cyan-300">
              <Bot className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>LIVE AI TUTOR EXPEDITION</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white tracking-tight">
              Test Drive Your 24/7 Personal CAPS AI Tutor
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Instant explanations for South African Matric, Physical Sciences, Pure Maths, Literature & University Admissions.
            </p>
          </div>

          <Link
            to="/login"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all active:scale-95 shrink-0"
          >
            <span>Unlock Full AI Portal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Preset Sample Prompt Buttons */}
        <div className="space-y-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
            Click a CAPS Subject Topic to Test:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {PRESET_PROMPTS.map((prompt) => {
              const isSelected = selectedPrompt.id === prompt.id;
              return (
                <button
                  key={prompt.id}
                  onClick={() => handleSelectPreset(prompt)}
                  className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                    isSelected
                      ? 'bg-white/10 border-cyan-400 shadow-md shadow-cyan-500/10'
                      : 'bg-white/5 hover:bg-white/8 border-white/10 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`p-1.5 rounded-lg border text-xs ${prompt.badgeColor}`}>
                      {prompt.icon}
                    </span>
                    <span className="text-[11px] font-bold font-mono text-slate-300 truncate">
                      {prompt.category.split(' ')[0]} {prompt.category.split(' ')[1]}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-200 line-clamp-2 leading-snug">
                    {prompt.question}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Conversation Stream Output */}
        <div className="space-y-3">
          {chatLog.map((chat, idx) => (
            <div
              key={idx}
              className="space-y-3 rounded-2xl bg-surface-darker/90 border border-white/10 p-4 sm:p-5 transition-all animate-fade-in"
            >
              {/* Question Header */}
              <div className="flex items-center gap-2.5 text-xs text-cyan-300 font-semibold border-b border-white/5 pb-2.5">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span className="font-mono text-slate-400">Question:</span>
                <span className="text-white font-medium italic">"{chat.query}"</span>
              </div>

              {/* AI Markdown-like Response */}
              <div className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans prose prose-invert max-w-none">
                {isTyping && idx === 0 ? (
                  <div className="flex items-center gap-2 text-cyan-400 py-3 font-mono text-xs">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    <span>Analyzing South African CAPS syllabus & synthesizing answer...</span>
                  </div>
                ) : (
                  <div className="whitespace-pre-line space-y-2">
                    {chat.response}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Custom Input Bar */}
        <form onSubmit={handleCustomSubmit} className="relative flex items-center">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Type your own homework question or topic (e.g., 'Explain Stoichiometry' or 'Calculus rules')..."
            className="w-full bg-white/5 hover:bg-white/8 focus:bg-white/10 text-xs sm:text-sm text-white placeholder:text-slate-400 rounded-2xl pl-4 pr-24 py-3.5 border border-white/15 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all font-medium"
          />
          <button
            type="submit"
            disabled={!customInput.trim() || isTyping}
            className="absolute right-1.5 top-1.5 bottom-1.5 px-4 rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <span>Ask</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </section>
  );
};
