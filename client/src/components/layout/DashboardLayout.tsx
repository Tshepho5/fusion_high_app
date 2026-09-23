import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './Navbar';
import { CommandPalette } from '../common/CommandPalette';
import { BottomNavigationDock } from './BottomNavigationDock';
import { FloatingAIChatModule } from '../common/FloatingAIChatModule';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorBoundary } from '../common/ErrorBoundary';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onSelectTab: (tabId: string, params?: any) => void;
  title?: string;
  customBottomDock?: React.ReactNode;
  hideBottomDock?: boolean;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activeTab,
  onSelectTab,
  title,
  customBottomDock,
  hideBottomDock = false,
}) => {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Tab transition state to display the shimmer skeleton whenever user switches tabs
  const [isTabTransitioning, setIsTabTransitioning] = useState(false);
  const prevTabRef = useRef(activeTab);

  useEffect(() => {
    if (prevTabRef.current !== activeTab) {
      prevTabRef.current = activeTab;
      setIsTabTransitioning(true);
      const timer = setTimeout(() => {
        setIsTabTransitioning(false);
      }, 240);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  // Global key listener for Ctrl+K or Cmd+K or Ctrl+M for Main Menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        onSelectTab(activeTab === 'more' ? 'overview' : 'more');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, onSelectTab]);

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-[#CBDDE3] via-[#DBE7EC] to-[#EBF2F5] dark:from-[#060D14] dark:via-[#09131F] dark:to-[#0B1520] text-slate-900 dark:text-slate-100 selection:bg-cyan-500 selection:text-white relative transition-colors duration-300">
      {/* SVG Fluid Waves Backdrop Layer */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-90 dark:opacity-80" aria-hidden="true">
        <svg className="w-full h-full object-cover min-w-[1440px] min-h-[900px]" viewBox="0 0 1440 900" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="reactWaveGradTop" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#13C8D9" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#0891B2" stopOpacity="0.08" />
            </linearGradient>
            <linearGradient id="reactWaveGradMid" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#0E7490" stopOpacity="0.06" />
            </linearGradient>
            <linearGradient id="reactWaveGradBottom" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#13C8D9" stopOpacity="0.16" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
          <path d="M0,0 C360,110 520,30 840,85 C1180,140 1320,35 1440,65 L1440,0 Z" fill="url(#reactWaveGradTop)" />
          <path d="M0,230 C380,320 660,150 1020,270 C1240,340 1380,250 1440,290 L1440,560 C1320,490 1060,570 740,490 C420,410 180,520 0,470 Z" fill="url(#reactWaveGradMid)" />
          <path d="M0,640 C200,620 360,720 520,800 C680,880 850,890 1100,900 L0,900 Z" fill="url(#reactWaveGradBottom)" />
        </svg>
      </div>

      {/* Background Ambient Neon Glow Orbs */}
      <div className="fixed top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[130px] pointer-events-none animate-orb-float" />
      <div className="fixed bottom-[-10%] right-[10%] w-[450px] h-[450px] rounded-full bg-teal-500/10 blur-[120px] pointer-events-none animate-orb-float" style={{ animationDelay: '-5s' }} />

      {/* Global Command Palette / Quick Search Modal */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigateTab={onSelectTab}
      />

      {/* Main Content Column with Fixed Top Header and Isolated Scroll Container */}
      <div className="flex flex-1 flex-col h-screen overflow-hidden min-w-0 z-10 relative">
        {/* Laser Shimmer Top Progress Bar when switching tabs */}
        {isTabTransitioning && (
          <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-transparent via-cyan-400 to-indigo-500 z-50 animate-pulse pointer-events-none" />
        )}

        <Navbar
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          title={title}
          onNavigateHome={() => onSelectTab('overview')}
          onSelectTab={onSelectTab}
        />

        <main
          key={activeTab}
          className={`flex-1 overflow-y-auto min-h-0 custom-scrollbar ${activeTab === 'messages' ? 'p-2 md:p-4 pb-24 md:pb-28' : 'p-4 md:p-8 py-6 pb-28 md:pb-32'
            } max-w-7xl w-full mx-auto animate-fade-in flex flex-col`}
        >
          {isTabTransitioning ? (
            <LoadingSpinner text={`Loading ${title || 'Workspace'}...`} />
          ) : (
            <ErrorBoundary fallbackTitle={`Error Loading ${title || 'Module'}`}>
              {children}
            </ErrorBoundary>
          )}
        </main>

        {/* 🌟 Centered Floating Bottom Navigation Dock */}
        {!hideBottomDock && (
          customBottomDock !== undefined ? (
            customBottomDock
          ) : (
            <BottomNavigationDock
              activeTab={activeTab}
              onSelectTab={onSelectTab}
            />
          )
        )}

        {/* 🤖 Movable Circular 24/7 AI Chat Module on all Dashboards */}
        <FloatingAIChatModule onSelectTab={onSelectTab} />
      </div>
    </div>
  );
};
