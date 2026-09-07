import React, { useState, useEffect, useRef } from 'react';
import { Bot, Sparkles, MessageSquare, X } from 'lucide-react';
import { HelpSupportModal } from './HelpSupportModal';

export const FloatingAIChatModule: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'ai-support' | 'faq'>('ai-support');

  // Position state (persisted in localStorage if desired)
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('fusion_ai_fab_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch (_) {}
    // Default initial bottom-right position
    const defaultX = typeof window !== 'undefined' ? Math.max(16, window.innerWidth - 80) : 1200;
    const defaultY = typeof window !== 'undefined' ? Math.max(16, window.innerHeight - 140) : 700;
    return { x: defaultX, y: defaultY };
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0,
  });
  const hasMovedRef = useRef<boolean>(false);

  // Keep within bounds on window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        const maxX = Math.max(16, window.innerWidth - 76);
        const maxY = Math.max(16, window.innerHeight - 76);
        return {
          x: Math.min(Math.max(16, prev.x), maxX),
          y: Math.min(Math.max(16, prev.y), maxY),
        };
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only primary button
    if (e.button !== 0) return;
    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;

    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      hasMovedRef.current = true;
    }

    const maxX = Math.max(16, window.innerWidth - 76);
    const maxY = Math.max(16, window.innerHeight - 76);

    const newX = Math.min(Math.max(16, dragStartRef.current.posX + deltaX), maxX);
    const newY = Math.min(Math.max(16, dragStartRef.current.posY + deltaY), maxY);

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}

    // If dragged, save position
    if (hasMovedRef.current) {
      try {
        localStorage.setItem('fusion_ai_fab_pos', JSON.stringify(position));
      } catch (_) {}
    } else {
      // Clicked without dragging -> open AI chat modal
      setModalTab('ai-support');
      setIsOpen(true);
    }
  };

  return (
    <>
      {/* 24/7 AI Support Modal */}
      <HelpSupportModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        defaultTab={modalTab}
      />

      {/* Floating Draggable Movable Circle AI Module */}
      <div
        style={{
          transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
          touchAction: 'none',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`fixed top-0 left-0 z-50 select-none group cursor-grab active:cursor-grabbing transition-shadow duration-200 ${
          isDragging ? 'scale-105 shadow-2xl' : 'hover:scale-105'
        }`}
        title="24/7 AI Assistant • Drag to move anywhere"
      >
        {/* Glow Halo */}
        <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 opacity-70 blur-md group-hover:opacity-100 group-hover:blur-lg transition-all animate-pulse-subtle pointer-events-none" />

        {/* Circular Action Button */}
        <div className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-900 via-brand-600 to-cyan-500 border-2 border-cyan-300/80 shadow-2xl flex items-center justify-center text-white overflow-hidden ring-2 ring-white/20">
          
          {/* Animated Background Shimmer */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />

          {/* AI Bot Icon with Sparkle */}
          <div className="relative flex items-center justify-center">
            <Bot className="w-7 h-7 text-white drop-shadow-md group-hover:rotate-12 transition-transform" />
            <Sparkles className="w-3.5 h-3.5 text-cyan-200 absolute -top-1 -right-1 animate-pulse" />
          </div>

          {/* 24/7 Live Pulse Dot */}
          <span className="absolute top-1 right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-white" />
          </span>
        </div>

        {/* Hover Pill Tooltip */}
        <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 px-3 py-1.5 rounded-xl bg-slate-900/95 text-white text-[11px] font-bold shadow-xl border border-white/15 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 hidden sm:flex items-center gap-1.5 backdrop-blur-md">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span>24/7 AI Assistant</span>
          <span className="text-[9px] font-normal text-slate-400">(Drag to move)</span>
        </div>
      </div>
    </>
  );
};
