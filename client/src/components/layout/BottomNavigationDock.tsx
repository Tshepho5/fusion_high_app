import React from 'react';

interface BottomNavigationDockProps {
  activeTab: string;
  onSelectTab: (tabId: string, params?: any) => void;
}

export const BottomNavigationDock: React.FC<BottomNavigationDockProps> = ({
  activeTab,
  onSelectTab,
}) => {
  const isMenuOpenOrActive = activeTab === 'more';

  // Handler for center hero button
  const handleCenterButtonClick = () => {
    if (isMenuOpenOrActive) {
      // Return to Home page
      onSelectTab('overview');
    } else {
      // Navigate to dedicated Menu page
      onSelectTab('more');
    }
  };

  return (
    <div className="fixed bottom-5 inset-x-0 z-[60] flex justify-center items-center pointer-events-none select-none animate-bounce-in px-4">
      {/* 🌟 CENTER HERO MENU / TAP TO CLOSE CIRCULAR BUTTON (Image 1 & Image 2) */}
      <div className="pointer-events-auto relative flex items-center justify-center">
        {/* Flower Petals Halo when Open (Image 2) */}
        {isMenuOpenOrActive && (
          <div className="absolute inset-0 -m-5 sm:-m-6 pointer-events-none flex items-center justify-center animate-pulse">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <div
                key={deg}
                className="absolute w-9 h-18 sm:w-11 sm:h-22 rounded-full bg-gradient-to-t from-cyan-400/50 via-teal-400/30 to-transparent blur-[0.5px] border border-cyan-300/40 shadow-[0_0_16px_rgba(6,182,212,0.5)]"
                style={{
                  transform: `rotate(${deg}deg) translateY(-18px)`,
                  transformOrigin: 'center center',
                }}
              />
            ))}
          </div>
        )}

        {/* Ambient Cyan Floor Pedestal Bloom */}
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-16 sm:w-20 h-5 bg-cyan-400/50 blur-lg rounded-full pointer-events-none" />

        {/* Elevated Hero Circular Button */}
        <button
          type="button"
          onClick={handleCenterButtonClick}
          className={`group relative w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full transition-all duration-300 cursor-pointer active:scale-90 flex items-center justify-center ${
            isMenuOpenOrActive
              ? 'bg-gradient-to-tr from-[#E11D48] via-[#A855F7] to-[#06B6D4] p-[2.5px] shadow-[0_0_28px_rgba(6,182,212,0.95)] scale-105 ring-2 ring-cyan-400/80'
              : 'bg-gradient-to-tr from-[#E11D48] via-[#2563EB] to-[#06B6D4] p-[2.5px] shadow-[0_0_22px_rgba(6,182,212,0.75)] hover:scale-105'
          }`}
          title={isMenuOpenOrActive ? 'Tap to close and return to Home' : 'Open Menu'}
        >
          {/* Inner Dark Circular Face */}
          <div className="w-full h-full rounded-full bg-[#080E16] flex flex-col items-center justify-center p-1 relative overflow-hidden transition-all duration-300">
            {/* Subtle radial sheen */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

            {isMenuOpenOrActive ? (
              /* STATE B: "Tap to close" at the center (Image 2) */
              <span className="text-[10px] sm:text-[11px] font-black leading-tight text-white drop-shadow-[0_0_8px_rgba(24,226,236,0.95)] text-center tracking-tight animate-fade-in">
                Tap to<br />close
              </span>
            ) : (
              /* STATE A: "Menu" (Image 1) */
              <span className="text-base sm:text-lg font-black text-[#18E2EC] tracking-tight drop-shadow-[0_0_12px_rgba(24,226,236,0.95)] group-hover:text-cyan-200 transition-colors animate-fade-in">
                Menu
              </span>
            )}
          </div>
        </button>
      </div>
    </div>
  );
};
