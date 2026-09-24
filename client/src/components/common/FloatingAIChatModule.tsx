import React, { useState, useEffect, useRef } from 'react';
import { HelpSupportModal } from './HelpSupportModal';
import { FusionChatbotMascot } from './FusionChatbotMascot';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

interface FloatingAIChatModuleProps {
  onSelectTab?: (tab: string) => void;
}

export const FloatingAIChatModule: React.FC<FloatingAIChatModuleProps> = ({ onSelectTab }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'ai-support' | 'faq'>('ai-support');
  const [isHovered, setIsHovered] = useState(false);

  // Hidden on side by default so user is never disturbed when navigating modules
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('fusion_ai_fab_expanded');
      return saved === 'true';
    } catch (_) {
      return false;
    }
  });

  // Vertical position along the screen edge (percent or pixels)
  const [posY, setPosY] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('fusion_ai_fab_y');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val > 80 && val < window.innerHeight - 100) return val;
      }
    } catch (_) {}
    return typeof window !== 'undefined' ? Math.max(120, Math.floor(window.innerHeight * 0.65)) : 500;
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initialY: number }>({
    startX: 0,
    startY: 0,
    initialY: 0,
  });
  const hasMovedRef = useRef<boolean>(false);

  const handleToggleExpand = (expand?: boolean) => {
    const nextState = expand !== undefined ? expand : !isExpanded;
    setIsExpanded(nextState);
    try {
      localStorage.setItem('fusion_ai_fab_expanded', nextState ? 'true' : 'false');
    } catch (_) {}
  };

  // Auto-collapse when user scrolls page so they are not disturbed while navigating
  useEffect(() => {
    let scrollTimeout: any = null;
    const handleScroll = () => {
      if (isExpanded) {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          handleToggleExpand(false);
        }, 300);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Also listen to main element scroll if available
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
      clearTimeout(scrollTimeout);
      window.removeEventListener('scroll', handleScroll);
      if (mainEl) mainEl.removeEventListener('scroll', handleScroll);
    };
  }, [isExpanded]);

  // Handle pointer drag on vertical position or swipe-back to hide
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialY: posY,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;

    if (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6) {
      hasMovedRef.current = true;
    }

    // If dragged/swiped toward the right side of the screen, trigger hide back to side
    if (isExpanded && deltaX > 20) {
      handleToggleExpand(false);
      setIsDragging(false);
      return;
    }

    // Update Y position bounded within viewport
    const minY = 80;
    const maxY = Math.max(minY, window.innerHeight - 100);
    const newY = Math.min(Math.max(minY, dragStartRef.current.initialY + deltaY), maxY);
    setPosY(newY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}

    if (hasMovedRef.current) {
      try {
        localStorage.setItem('fusion_ai_fab_y', String(posY));
      } catch (_) {}
    } else {
      // Tap without dragging: if expanded, open chat; if collapsed, expand
      if (isExpanded) {
        setModalTab('ai-support');
        setIsOpen(true);
      } else {
        handleToggleExpand(true);
      }
    }
  };

  return (
    <>
      {/* 24/7 AI Support Modal */}
      <HelpSupportModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        defaultTab={modalTab}
        onSelectTab={onSelectTab}
      />

      {/* Floating Side-Docked Chatbot Container */}
      <aside
        style={{
          top: `${posY}px`,
          touchAction: 'none',
        }}
        className="fixed right-0 z-40 select-none transition-[top] duration-75 ease-out"
        aria-label="24/7 AI Assistant Mascot"
      >
        {/* ========================================================================= */}
        {/* STATE A: COLLAPSED / HIDDEN ON THE SIDE WITH TOUCHABLE ARROW HANDLE      */}
        {/* ========================================================================= */}
        {!isExpanded && (
          <button
            type="button"
            onClick={() => handleToggleExpand(true)}
            className="flex items-center gap-1.5 pl-2.5 pr-2 py-3 rounded-l-2xl bg-[#09131F]/95 hover:bg-[#0F1E30] border-l-2 border-y border-cyan-400/80 shadow-[-6px_6px_25px_rgba(6,182,212,0.45)] text-[#18E2EC] backdrop-blur-xl transition-all duration-300 hover:pl-3.5 group cursor-pointer ring-1 ring-cyan-500/20 active:scale-95"
            title="Touch arrow to open AI Chatbot"
          >
            {/* Arrow indicating slide out */}
            <ChevronLeft className="w-5 h-5 text-cyan-400 group-hover:-translate-x-1 transition-transform animate-pulse" />

            <div className="flex flex-col items-center gap-1">
              <div className="relative">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              </div>
              <span className="text-[9.5px] font-black tracking-wider uppercase [writing-mode:vertical-rl] rotate-180 text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">
                AI Chat
              </span>
            </div>
          </button>
        )}

        {/* ========================================================================= */}
        {/* STATE B: EXPANDED CHATBOT SLID OUT OF THE SIDE                          */}
        {/* ========================================================================= */}
        {isExpanded && (
          <div
            className="flex items-center gap-2 pr-3 animate-slide-in-right"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* Quick Arrow Button to Hide/Scroll back to the side of the screen */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleExpand(false);
              }}
              className="p-1.5 rounded-full bg-[#09131F]/90 hover:bg-[#132230] border border-cyan-500/50 text-cyan-400 hover:text-white shadow-lg transition-all cursor-pointer group active:scale-90"
              title="Touch arrow to hide chatbot back into side of screen"
            >
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Circular AI Mascot Button */}
            <div
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className={`relative cursor-pointer transition-transform duration-200 ${
                isDragging ? 'scale-105' : 'hover:scale-105'
              }`}
              title="Click Mascot to Chat • Drag vertically to move • Swipe right to hide"
            >
              {/* Ambient Halo Glow */}
              <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-[#EC4899]/60 via-[#F43F5E]/40 to-[#18E2EC]/60 opacity-80 blur-md group-hover:opacity-100 group-hover:blur-lg transition-all animate-pulse pointer-events-none" />

              {/* Outer Split Gradient Ring */}
              <div className="relative p-[3px] rounded-full bg-gradient-to-br from-[#EC4899] via-[#F43F5E] to-[#18E2EC] shadow-2xl">
                {/* Inner Circle Face */}
                <div className="relative rounded-full flex items-center justify-center bg-[#181E24]">
                  <FusionChatbotMascot size={64} isHovered={isHovered} />

                  {/* 24/7 Live Pulse Dot */}
                  <span className="absolute top-1 right-1 flex h-3 w-3 pointer-events-none">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-80" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-[#18E2EC] border-2 border-[#181E24]" />
                  </span>
                </div>
              </div>

              {/* Hover Tooltip */}
              {!isDragging && (
                <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 px-3 py-1.5 rounded-xl bg-slate-900/95 text-white text-[11px] font-bold shadow-xl border border-white/15 whitespace-nowrap pointer-events-none opacity-0 hover:opacity-100 transition-opacity duration-200 hidden sm:flex items-center gap-1.5 backdrop-blur-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span>24/7 AI Tutor</span>
                  <span className="text-[9px] font-normal text-slate-400">(Swipe right to hide)</span>
                </div>
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

