import React from 'react';

interface FusionAppIconProps {
  className?: string;
  size?: number | string;
}

export const FusionAppIcon: React.FC<FusionAppIconProps> = ({
  className = 'w-32 h-32 sm:w-40 sm:h-40',
  size,
}) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 120"
      fill="none"
      className={`inline-block shrink-0 select-none transition-transform duration-300 hover:scale-105 ${className}`}
      style={style}
    >
      <defs>
        {/* Outer Squircle Gradient */}
        <linearGradient id="appIconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="50%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>

        {/* Inner Shield Gradient */}
        <linearGradient id="innerShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>

        {/* Subtle Ambient Outer Glow Filter */}
        <filter id="iconAmbientGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#06B6D4" floodOpacity="0.45" />
          <feDropShadow dx="0" dy="0" stdDeviation="12" floodColor="#3B82F6" floodOpacity="0.25" />
        </filter>

        {/* Core Diamond Spark Glow */}
        <filter id="coreSparkGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#22D3EE" floodOpacity="0.8" />
        </filter>
      </defs>

      {/* Main Base Squircle with Deep Midnight Tint */}
      <rect
        x="6"
        y="6"
        width="108"
        height="108"
        rx="32"
        fill="#080D1A"
      />

      {/* Outer Luminous Neon Gradient Border */}
      <rect
        x="6"
        y="6"
        width="108"
        height="108"
        rx="32"
        stroke="url(#appIconGrad)"
        strokeWidth="4"
        filter="url(#iconAmbientGlow)"
      />

      {/* Inner Concentric Squircle Frame */}
      <rect
        x="24"
        y="24"
        width="72"
        height="72"
        rx="20"
        stroke="#06B6D4"
        strokeWidth="2.5"
        strokeOpacity="0.85"
        fill="#0D1527"
        fillOpacity="0.6"
      />

      {/* Academic Defense Shield */}
      <path
        d="M60 38 L80 49 V65 C80 77 71 86 60 90 C49 86 40 77 40 65 V49 Z"
        fill="url(#innerShieldGrad)"
        fillOpacity="0.15"
        stroke="url(#innerShieldGrad)"
        strokeWidth="2.75"
        strokeLinejoin="round"
      />

      {/* Modern Central Fusion Diamond Core */}
      <g filter="url(#coreSparkGlow)">
        {/* Top Diamond Facet */}
        <path d="M60 51 L66 62 H54 Z" fill="#818CF8" />
        {/* Bottom Diamond Facet */}
        <path d="M54 62 L60 56 L66 62 L60 73 Z" fill="#22D3EE" />
        {/* Central Pure White Starlight Apex */}
        <circle cx="60" cy="62" r="1.5" fill="#FFFFFF" />
      </g>
    </svg>
  );
};
