import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { CommandPalette } from '../common/CommandPalette';
import { BottomNavigationDock } from './BottomNavigationDock';
import { MainMenuLauncherModal } from './MainMenuLauncherModal';

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
  const [mainMenuOpen, setMainMenuOpen] = useState(false);

  // Global key listener for Ctrl+K or Cmd+K or Ctrl+M for Main Menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setMainMenuOpen((prev) => !prev);
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

      {/* Full-Screen Main Menu Launcher Modal */}
      <MainMenuLauncherModal
        isOpen={mainMenuOpen}
        onClose={() => setMainMenuOpen(false)}
        activeTab={activeTab}
        onSelectTab={onSelectTab}
      />

      {/* Streamlined Minimalist Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenMainMenu={() => setMainMenuOpen(true)}
      />

      {/* Main Content Column with Fixed Top Header and Isolated Scroll Container */}
      <div className="flex flex-1 flex-col h-screen overflow-hidden min-w-0 z-10 relative">
        <Navbar
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          title={title}
        />

        <main
          key={activeTab}
          className={`flex-1 overflow-y-auto min-h-0 custom-scrollbar ${
            activeTab === 'messages' ? 'p-2 md:p-4 pb-24 md:pb-28' : 'p-4 md:p-8 py-6 pb-28 md:pb-32'
          } max-w-7xl w-full mx-auto animate-fade-in flex flex-col`}
        >
          {children}
        </main>

        {/* 🌟 Centered Floating Main Menu Bottom Dock */}
        <BottomNavigationDock
          activeTab={activeTab}
          onSelectTab={onSelectTab}
          onOpenMainMenu={() => setMainMenuOpen((prev) => !prev)}
          isMainMenuOpen={mainMenuOpen}
        />
      </div>
    </div>
  );
};
