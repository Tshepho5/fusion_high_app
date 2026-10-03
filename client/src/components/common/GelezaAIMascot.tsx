import React from 'react';

/** Brand palette from Geleza SA AI design sheet */
export const GELEZA_AI = {
  black: '#000000',
  navy: '#0B1F33',
  cyan: '#13C8D9',
  white: '#FFFFFF',
} as const;

interface GelezaAIMascotProps {
  size?: number;
  className?: string;
  glowing?: boolean;
}

/**
 * Geleza SA AI robot avatar — white shell, cyan eyes / G badge, navy frame.
 * Matches the brand sheet (cyan #13C8D9, navy #0B1F33).
 */
export const GelezaAIMascot: React.FC<GelezaAIMascotProps> = ({
  size = 96,
  className = '',
  glowing = true,
}) => {
  const uid = React.useId().replace(/:/g, '');

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {glowing && (
        <span
          className="absolute inset-0 rounded-full blur-md opacity-70 pointer-events-none"
          style={{ background: `radial-gradient(circle, ${GELEZA_AI.cyan}55 0%, transparent 70%)` }}
        />
      )}
      <svg viewBox="0 0 120 120" className="relative w-full h-full drop-shadow-lg" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id={`gBg_${uid}`} cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#123A55" />
            <stop offset="100%" stopColor={GELEZA_AI.navy} />
          </radialGradient>
          <linearGradient id={`gShell_${uid}`} x1="30%" y1="10%" x2="70%" y2="90%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E8EEF2" />
          </linearGradient>
          <filter id={`gGlow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.2" floodColor={GELEZA_AI.cyan} floodOpacity="0.85" />
          </filter>
        </defs>

        {/* Circular frame */}
        <circle cx="60" cy="60" r="58" fill={`url(#gBg_${uid})`} />
        <circle cx="60" cy="60" r="56" stroke={GELEZA_AI.cyan} strokeOpacity="0.35" strokeWidth="1.5" />

        {/* Shoulders / chest */}
        <path
          d="M28 98 C34 78 46 72 60 72 C74 72 86 78 92 98 L92 110 L28 110 Z"
          fill={GELEZA_AI.navy}
        />
        {/* G badge */}
        <circle cx="60" cy="88" r="11" fill={GELEZA_AI.navy} stroke={GELEZA_AI.cyan} strokeWidth="1.5" filter={`url(#gGlow_${uid})`} />
        <text
          x="60"
          y="93"
          textAnchor="middle"
          fontFamily="system-ui,Segoe UI,sans-serif"
          fontWeight="800"
          fontSize="14"
          fill={GELEZA_AI.cyan}
        >
          G
        </text>

        {/* Headphones ear cups */}
        <ellipse cx="26" cy="58" rx="9" ry="14" fill={GELEZA_AI.navy} stroke={GELEZA_AI.cyan} strokeWidth="2" filter={`url(#gGlow_${uid})`} />
        <ellipse cx="94" cy="58" rx="9" ry="14" fill={GELEZA_AI.navy} stroke={GELEZA_AI.cyan} strokeWidth="2" filter={`url(#gGlow_${uid})`} />
        <path d="M34 42 Q60 28 86 42" stroke={GELEZA_AI.navy} strokeWidth="5" strokeLinecap="round" fill="none" />
        <circle cx="26" cy="58" r="3.5" fill={GELEZA_AI.cyan} />
        <circle cx="94" cy="58" r="3.5" fill={GELEZA_AI.cyan} />

        {/* Head shell */}
        <ellipse cx="60" cy="54" rx="28" ry="26" fill={`url(#gShell_${uid})`} />
        {/* Visor / face plate */}
        <ellipse cx="60" cy="56" rx="20" ry="16" fill={GELEZA_AI.black} />

        {/* Happy cyan eyes */}
        <g filter={`url(#gGlow_${uid})`} stroke={GELEZA_AI.cyan} strokeWidth="2.8" strokeLinecap="round" fill="none">
          <path d="M48 54 Q52 48 56 54" />
          <path d="M64 54 Q68 48 72 54" />
        </g>
        {/* Smile */}
        <path
          d="M52 62 Q60 68 68 62"
          stroke={GELEZA_AI.cyan}
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
          filter={`url(#gGlow_${uid})`}
        />
      </svg>
    </div>
  );
};
