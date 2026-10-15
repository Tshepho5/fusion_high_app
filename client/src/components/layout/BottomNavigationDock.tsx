import React, { useEffect, useState } from 'react';

interface BottomNavigationDockProps {
  activeTab: string;
  onSelectTab: (tabId: string, params?: any) => void;
}

function useMenuSize() {
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1280);
  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= 1280);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return wide ? 118 : 96;
}

export const BottomNavigationDock: React.FC<BottomNavigationDockProps> = ({
  activeTab,
  onSelectTab,
}) => {
  const size = useMenuSize();
  const onModulesPage = activeTab === 'more';

  return (
    <>
      <div className="fixed bottom-4 left-1/2 z-[60] -translate-x-1/2 pointer-events-none">
        <div className="relative pointer-events-auto" style={{ width: size, height: size }}>
          <button
            type="button"
            onClick={() => onSelectTab(onModulesPage ? 'overview' : 'more')}
            aria-label={onModulesPage ? 'Tap to close' : 'Menu'}
            className={`absolute inset-0 rounded-full cursor-pointer active:scale-95 transition-all flex items-center justify-center ${
              onModulesPage
                ? 'bg-[#168BFF] hover:bg-[#0878E8] shadow-[0_0_28px_rgba(22,139,255,0.75)]'
                : 'p-[4px] bg-gradient-to-br from-[#168BFF] via-[#0878E8] to-[#168BFF] shadow-[0_0_24px_rgba(22,139,255,0.6)]'
            }`}
          >
            {onModulesPage ? (
              <div className="flex flex-col items-center justify-center text-center text-white">
                <svg className="w-5 h-5 mb-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                <span className="text-[11px] xl:text-xs font-black leading-tight tracking-tight">
                  Tap to<br />close
                </span>
              </div>
            ) : (
              <span className="flex h-full w-full items-center justify-center rounded-full bg-[#080B10] text-center">
                <span className="text-lg xl:text-xl font-black tracking-tight text-[#168BFF] drop-shadow-[0_0_12px_rgba(22,139,255,0.85)]">
                  Menu
                </span>
              </span>
            )}
          </button>
        </div>
      </div>
    </>
  );
};
