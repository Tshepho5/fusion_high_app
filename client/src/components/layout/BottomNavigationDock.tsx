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
            className="absolute inset-0 rounded-full p-[4px] bg-gradient-to-br from-[#F472B6] via-[#7C3AED] to-[#22D3EE] shadow-[0_0_24px_rgba(34,211,238,0.7)] cursor-pointer active:scale-95 transition-transform"
          >
            <span className="flex h-full w-full items-center justify-center rounded-full bg-[#070B14] text-center">
              {onModulesPage ? (
                <span className="text-[11px] xl:text-xs font-black leading-tight text-white text-always-white">
                  Tap to<br />close
                </span>
              ) : (
                <span className="text-lg xl:text-xl font-black tracking-tight text-[#18E2EC] drop-shadow-[0_0_12px_rgba(24,226,236,0.95)]">
                  Menu
                </span>
              )}
            </span>
          </button>
        </div>
      </div>
    </>
  );
};
