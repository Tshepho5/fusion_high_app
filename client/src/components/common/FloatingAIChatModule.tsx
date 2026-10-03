import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { HelpSupportModal } from './HelpSupportModal';
import { GelezaAIMascot, GELEZA_AI } from './GelezaAIMascot';
import { useAuth } from '../../context/AuthContext';

/** Hide on landing + auth screens so it does not cover CTAs / Sign In */
const HIDDEN_PATHS = ['/', '/login', '/register', '/forgot-password'];

const Y_KEY = 'fusion_ai_fab_y';
const EXPANDED_KEY = 'fusion_ai_fab_expanded';

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
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    try {
      return localStorage.getItem(EXPANDED_KEY) === 'true';
    } catch (_) {
      return false;
    }
  });

  const [posY, setPosY] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(Y_KEY);
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val > 80 && typeof window !== 'undefined' && val < window.innerHeight - 100) {
          return val;
        }
      }
    } catch (_) {}
    return typeof window !== 'undefined'
      ? Math.max(120, Math.floor(window.innerHeight * 0.55))
      : 400;
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ startY: 0, initialY: 0 });
  const hasMovedRef = useRef(false);
  const posYRef = useRef(posY);
  posYRef.current = posY;

  useEffect(() => {
    const onResize = () => {
      const minY = 80;
      const maxY = Math.max(minY, window.innerHeight - 100);
      setPosY((y) => Math.min(Math.max(minY, y), maxY));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (hideOnAuthPage && isOpen) setIsOpen(false);
  }, [hideOnAuthPage, isOpen]);

  const handleSelectTab = (tab: string) => {
    if (onSelectTab) {
      onSelectTab(tab);
      return;
    }
    if (!isAuthenticated || !role) return;
    navigate(`/dashboard/${role.toLowerCase()}?tab=${encodeURIComponent(tab)}`);
  };

  const toggleExpanded = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(EXPANDED_KEY, String(next));
      } catch (_) {}
      return next;
    });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartRef.current = { startY: e.clientY, initialY: posY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const deltaY = e.clientY - dragStartRef.current.startY;
    if (Math.abs(deltaY) > 6) hasMovedRef.current = true;
    const minY = 80;
    const maxY = Math.max(minY, window.innerHeight - 100);
    setPosY(Math.min(Math.max(minY, dragStartRef.current.initialY + deltaY), maxY));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}
    if (hasMovedRef.current) {
      try {
        localStorage.setItem(Y_KEY, String(posYRef.current));
      } catch (_) {}
    }
  };

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
        style={{ top: `${posY}px`, touchAction: 'none' }}
        className="fixed right-0 z-[70] select-none"
        aria-label="Geleza SA AI Assistant"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Collapsed: only a slim arrow tab on the right edge */}
        {!isExpanded && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (hasMovedRef.current) return;
              toggleExpanded();
            }}
            className="flex items-center justify-center w-7 h-14 rounded-l-xl border border-r-0 shadow-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer"
            style={{
              backgroundColor: `${GELEZA_AI.navy}ee`,
              borderColor: `${GELEZA_AI.cyan}66`,
              color: GELEZA_AI.cyan,
            }}
            title="Show Geleza SA AI Assistant"
            aria-label="Show AI chatbot"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {/* Expanded: mascot + tuck-away arrow */}
        {isExpanded && (
          <div className="flex items-center gap-1.5 pr-2 animate-fade-in">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (hasMovedRef.current) return;
                toggleExpanded();
              }}
              className="p-1.5 rounded-full border shadow-lg transition-all cursor-pointer active:scale-90"
              style={{
                backgroundColor: `${GELEZA_AI.navy}ee`,
                borderColor: `${GELEZA_AI.cyan}66`,
                color: GELEZA_AI.cyan,
              }}
              title="Hide AI chatbot"
              aria-label="Hide AI chatbot"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (hasMovedRef.current) return;
                setIsOpen(true);
              }}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className={`relative w-[64px] h-[64px] cursor-pointer transition-transform duration-200 ${
                isDragging ? 'scale-105' : 'hover:scale-105'
              }`}
              title="Open Geleza SA AI chat"
              aria-label="Open AI chat"
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
                  <GelezaAIMascot size={58} glowing={isHovered} />
                  <span className="absolute top-1 right-1 flex h-2.5 w-2.5 pointer-events-none">
                    <span
                      className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-80"
                      style={{ backgroundColor: GELEZA_AI.cyan }}
                    />
                    <span
                      className="relative inline-flex rounded-full h-2.5 w-2.5 border-2"
                      style={{ backgroundColor: GELEZA_AI.cyan, borderColor: GELEZA_AI.navy }}
                    />
                  </span>
                </div>
              </div>
            </button>
          </div>
        )}
      </aside>
    </>
  );
};
