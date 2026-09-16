import React, { useState, useEffect, useRef } from 'react';
import { HelpSupportModal } from './HelpSupportModal';
import { FusionChatbotMascot } from './FusionChatbotMascot';

interface FloatingAIChatModuleProps {
  onSelectTab?: (tab: string) => void;
}

export const FloatingAIChatModule: React.FC<FloatingAIChatModuleProps> = ({ onSelectTab }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'ai-support' | 'faq'>('ai-support');
  const [isHovered, setIsHovered] = useState(false);

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
    const defaultX = typeof window !== 'undefined' ? Math.max(16, window.innerWidth - 88) : 1200;
    const defaultY = typeof window !== 'undefined' ? Math.max(16, window.innerHeight - 150) : 700;
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
        const maxX = Math.max(16, window.innerWidth - 84);
        const maxY = Math.max(16, window.innerHeight - 84);
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

    const maxX = Math.max(16, window.innerWidth - 84);
    const maxY = Math.max(16, window.innerHeight - 84);

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
        onSelectTab={onSelectTab}
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
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed top-0 left-0 z-40 select-none group cursor-grab active:cursor-grabbing transition-shadow duration-200 ${
          isDragging ? 'scale-110 shadow-2xl' : 'hover:scale-105'
        }`}
        title="Fusion AI Mascot • Click to Chat • Drag to Move"
      >
        {/* Ambient Halo Glow */}
        <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-red-500 via-rose-500 to-indigo-600 opacity-60 blur-md group-hover:opacity-100 group-hover:blur-lg transition-all animate-pulse pointer-events-none" />

        {/* Circular Action Button with Mascot */}
        <div className="relative rounded-full shadow-2xl flex items-center justify-center ring-2 ring-white/20 group-hover:ring-cyan-400/80 transition-all bg-[#0B0F19]">
          
          <FusionChatbotMascot
            size={68}
            isHovered={isHovered}
          />

          {/* 24/7 Live Pulse Dot */}
          <span className="absolute top-1 right-1 flex h-3 w-3 pointer-events-none">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-[#0B0F19]" />
          </span>
        </div>

        {/* Hover Pill Tooltip (Only visible if not dragging) */}
        {!isDragging && (
          <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 px-3 py-1.5 rounded-xl bg-slate-900/95 text-white text-[11px] font-bold shadow-xl border border-white/15 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 hidden sm:flex items-center gap-1.5 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>Fusion AI Assistant</span>
            <span className="text-[9px] font-normal text-slate-400">(Drag to move)</span>
          </div>
        )}
      </div>
    </>
  );
};

