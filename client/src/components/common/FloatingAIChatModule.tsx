import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { HelpSupportModal } from './HelpSupportModal';
import { GelezaAIMascot, GELEZA_AI } from './GelezaAIMascot';
import { useAuth } from '../../context/AuthContext';

/** Hide the FAB on landing + auth screens so it does not cover CTAs / Sign In */
const HIDDEN_PATHS = ['/', '/login', '/register', '/forgot-password'];

const FAB_SIZE = 72;
const MARGIN = 16;
const POS_KEY = 'fusion_ai_fab_pos';

function defaultPos() {
  if (typeof window === 'undefined') return { x: 300, y: 500 };
  return {
    x: Math.max(MARGIN, window.innerWidth - FAB_SIZE - MARGIN),
    y: Math.max(MARGIN, window.innerHeight - FAB_SIZE - MARGIN - 24),
  };
}

function clampPos(x: number, y: number) {
  const maxX = Math.max(MARGIN, window.innerWidth - FAB_SIZE - MARGIN);
  const maxY = Math.max(MARGIN, window.innerHeight - FAB_SIZE - MARGIN);
  return {
    x: Math.min(Math.max(MARGIN, x), maxX),
    y: Math.min(Math.max(MARGIN, y), maxY),
  };
}

interface FloatingAIChatModuleProps {
  onSelectTab?: (tab: string) => void;
}

export const FloatingAIChatModule: React.FC<FloatingAIChatModuleProps> = ({ onSelectTab }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, role } = useAuth();
  const hideOnAuthPage = HIDDEN_PATHS.some((path) =>
    path === '/'
      ? location.pathname === '/'
      : location.pathname === path || location.pathname.startsWith(`${path}/`)
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [pos, setPos] = useState(() => {
    try {
      const saved = localStorage.getItem(POS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
          return clampPos(parsed.x, parsed.y);
        }
      }
    } catch (_) {}
    return defaultPos();
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ startX: 0, startY: 0, originX: 0, originY: 0 });
  const hasMovedRef = useRef(false);
  const posRef = useRef(pos);
  posRef.current = pos;

  // Keep FAB on-screen when the window resizes
  useEffect(() => {
    const onResize = () => setPos((p) => clampPos(p.x, p.y));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleSelectTab = (tab: string) => {
    if (onSelectTab) {
      onSelectTab(tab);
      return;
    }
    if (!isAuthenticated || !role) return;
    const base = `/dashboard/${role.toLowerCase()}`;
    navigate(`${base}?tab=${encodeURIComponent(tab)}`);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: pos.x,
      originY: pos.y,
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
    setPos(
      clampPos(dragStartRef.current.originX + deltaX, dragStartRef.current.originY + deltaY)
    );
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}

    if (hasMovedRef.current) {
      try {
        localStorage.setItem(POS_KEY, JSON.stringify(posRef.current));
      } catch (_) {}
    } else {
      setIsOpen(true);
    }
  };

  useEffect(() => {
    if (hideOnAuthPage && isOpen) setIsOpen(false);
  }, [hideOnAuthPage, isOpen]);

  if (hideOnAuthPage) return null;

  return (
    <>
      <HelpSupportModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        defaultTab="ai-support"
        onSelectTab={handleSelectTab}
      />

      <aside
        style={{
          left: `${pos.x}px`,
          top: `${pos.y}px`,
          touchAction: 'none',
          width: FAB_SIZE,
          height: FAB_SIZE,
        }}
        className={`fixed z-[70] select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        aria-label="Geleza SA AI Assistant"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title="Click to chat • Drag to move"
      >
        <div
          className={`relative w-full h-full transition-transform duration-200 ${
            isDragging ? 'scale-110' : 'hover:scale-105'
          }`}
        >
          <div
            className="absolute -inset-1 rounded-full opacity-80 blur-md pointer-events-none animate-pulse"
            style={{ background: `radial-gradient(circle, ${GELEZA_AI.cyan}66 0%, transparent 70%)` }}
          />
          <div
            className="relative w-full h-full p-[3px] rounded-full shadow-2xl"
            style={{ background: `linear-gradient(135deg, ${GELEZA_AI.cyan}, ${GELEZA_AI.navy})` }}
          >
            <div
              className="relative w-full h-full rounded-full flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: GELEZA_AI.navy }}
            >
              <GelezaAIMascot size={64} glowing={isHovered || isDragging} />
              <span className="absolute top-1 right-1 flex h-3 w-3 pointer-events-none">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-80"
                  style={{ backgroundColor: GELEZA_AI.cyan }}
                />
                <span
                  className="relative inline-flex rounded-full h-3 w-3 border-2"
                  style={{ backgroundColor: GELEZA_AI.cyan, borderColor: GELEZA_AI.navy }}
                />
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
