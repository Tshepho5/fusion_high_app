import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { CommandPalette } from '../common/CommandPalette';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  title?: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activeTab,
  onSelectTab,
  title,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Global key listener for Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-canvas-dark text-slate-100 selection:bg-brand-600 selection:text-white relative">
      {/* Background Ambient Neon Glow Orbs */}
      <div className="fixed top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-brand-600/10 blur-[130px] pointer-events-none animate-orb-float" />
      <div className="fixed bottom-[-10%] right-[10%] w-[450px] h-[450px] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none animate-orb-float" style={{ animationDelay: '-5s' }} />

      {/* Global Command Palette / Quick Search Modal */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigateTab={onSelectTab}
      />

      {/* Sidebar navigation - isolated, stationary, independent scroll */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Column with Fixed Top Header and Isolated Scroll Container */}
      <div className="flex flex-1 flex-col h-screen overflow-hidden min-w-0 z-10">
        <Navbar
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          title={title}
        />

        <main
          key={activeTab}
          className={`flex-1 overflow-y-auto min-h-0 custom-scrollbar ${
            activeTab === 'messages' ? 'p-2 md:p-4' : 'p-4 md:p-8 py-6 pb-16'
          } max-w-7xl w-full mx-auto animate-fade-in flex flex-col`}
        >
          {children}
        </main>
      </div>
    </div>
  );
};
