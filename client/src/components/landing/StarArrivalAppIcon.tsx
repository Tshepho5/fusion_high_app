import React, { useState, useEffect } from 'react';
import { FusionAppIcon } from '../common/FusionAppIcon';

interface StarArrivalAppIconProps {
  className?: string;
  containerClassName?: string;
}

export const StarArrivalAppIcon: React.FC<StarArrivalAppIconProps> = ({
  className = 'w-28 h-28 sm:w-36 sm:h-36',
  containerClassName = 'w-36 h-36 sm:w-44 sm:h-44'
}) => {
  const [animKey, setAnimKey] = useState<number>(0);
  const [isTraveling, setIsTraveling] = useState<boolean>(true);
  const [hasArrived, setHasArrived] = useState<boolean>(false);

  useEffect(() => {
    setIsTraveling(true);
    setHasArrived(false);

    // Exactly 5 seconds (5000ms) star travel animation
    const arrivalTimer = setTimeout(() => {
      setIsTraveling(false);
      setHasArrived(true);
    }, 5000);

    return () => clearTimeout(arrivalTimer);
  }, [animKey]);

  const handleReplay = () => {
    setAnimKey(prev => prev + 1);
  };

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      {/* Outer Cosmic Staging Container - Clickable to Replay Star Arrival */}
      <div
        onClick={handleReplay}
        className={`relative flex items-center justify-center ${containerClassName} cursor-pointer group`}
        title="Click App Icon to replay 5-second star arrival animation"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleReplay();
          }
        }}
      >
        
        {/* 1. Starlight Shockwave Ripple (triggers at 5s upon arrival) */}
        {hasArrived && (
          <div
            key={`shockwave-${animKey}`}
            className="absolute inset-0 rounded-full border-2 border-cyan-400/80 animate-arrival-shockwave pointer-events-none"
          />
        )}

        {/* 2. Celestial Starburst Lens Flare (active while coming from far away) */}
        {isTraveling && (
          <div
            key={`starflare-${animKey}`}
            className="absolute z-20 pointer-events-none flex items-center justify-center"
          >
            {/* Blazing Star Point Flare with Long Diffraction Spikes */}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 animate-star-spikes-5s flex items-center justify-center">
              {/* Horizontal Ray Spike */}
              <div className="absolute w-32 sm:w-48 h-1 bg-gradient-to-r from-transparent via-cyan-200 to-transparent blur-[0.5px] shadow-[0_0_20px_#38bdf8]" />
              {/* Vertical Ray Spike */}
              <div className="absolute h-32 sm:h-48 w-1 bg-gradient-to-b from-transparent via-cyan-200 to-transparent blur-[0.5px] shadow-[0_0_20px_#38bdf8]" />
              {/* Diagonal 45deg Spike */}
              <div className="absolute w-24 sm:w-36 h-0.5 rotate-45 bg-gradient-to-r from-transparent via-white to-transparent blur-[0.5px]" />
              {/* Diagonal -45deg Spike */}
              <div className="absolute w-24 sm:w-36 h-0.5 -rotate-45 bg-gradient-to-r from-transparent via-white to-transparent blur-[0.5px]" />
              {/* Central Intense Brilliant Core */}
              <div className="w-5 h-5 rounded-full bg-white blur-[1px] shadow-[0_0_25px_#ffffff,0_0_50px_#38bdf8,0_0_80px_#6366f1]" />
            </div>

            {/* Radiant Concentric Light Halo Rings */}
            <div className="absolute w-24 h-24 rounded-full border border-cyan-300/40 animate-ping opacity-60 pointer-events-none" />
          </div>
        )}

        {/* 3. The Official FusionAppIcon (Traveling from far like a star over 5 continuous seconds) */}
        <div
          key={`star-icon-${animKey}`}
          className={`relative z-10 flex items-center justify-center transition-transform duration-300 ${
            isTraveling
              ? 'animate-star-arrival-5s pointer-events-none'
              : 'group-hover:scale-105 active:scale-95 group-hover:brightness-110'
          }`}
        >
          <FusionAppIcon className={className} />
        </div>

        {/* 4. Ambient Base Glow Dock (stays after arrival and brightens on hover) */}
        {!isTraveling && (
          <div className="absolute inset-0 -z-10 rounded-3xl bg-blue-500/10 group-hover:bg-cyan-500/20 blur-xl opacity-75 group-hover:opacity-100 transition-all duration-300 pointer-events-none" />
        )}
      </div>
    </div>
  );
};
