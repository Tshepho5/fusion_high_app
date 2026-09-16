import React from 'react';

interface FusionAppIconProps {
  className?: string;
  size?: number | string;
}

/**
 * Fusion High Official Emblem Icon
 * Featuring:
 * 1. Graduation Mortarboard on Top Crest
 * 2. Heraldic Academic Shield
 * 3. Stylized "FH" Monogram in Electric Cobalt & Midnight Indigo
 * 4. Open Academic Book at Base with Layered Pages
 * 5. Branching Electronic Circuit Traces with Glowing Digital Nodes
 */
export const FusionAppIcon: React.FC<FusionAppIconProps> = ({
  className = 'w-32 h-32 sm:w-40 sm:h-40',
  size,
}) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 160 160"
      fill="none"
      className={`inline-block shrink-0 select-none transition-transform duration-300 hover:scale-105 ${className}`}
      style={style}
    >
      <defs>
        {/* Primary Blue Gradients */}
        <linearGradient id="fhPrimaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E3A8A" />
          <stop offset="50%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>

        <linearGradient id="fhLetterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>

        <linearGradient id="fhDarkStem" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>

        <linearGradient id="fhCircuitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>

        <linearGradient id="fhShieldBackdrop" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#F0F9FF" stopOpacity="0.98" />
        </linearGradient>

        {/* Ambient Glow Filters */}
        <filter id="fhSpineAura" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#38BDF8" floodOpacity="0.9" />
          <feDropShadow dx="0" dy="2" stdDeviation="8" floodColor="#2563EB" floodOpacity="0.5" />
        </filter>

        <filter id="fhShieldShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#0F172A" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* ================================================================= */}
      {/* 1. DIGITAL CIRCUIT TRACES & PCB NODES (Branching Left and Right)  */}
      {/* ================================================================= */}
      <g stroke="url(#fhCircuitGrad)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.95">
        {/* Left Circuit Tracks */}
        <path d="M42 46 H26 V32 H16" />
        <path d="M40 60 H22 L14 52" />
        <path d="M40 76 H24 L14 88 H8" />
        <path d="M44 92 L28 106 H16" />

        {/* Right Circuit Tracks */}
        <path d="M118 46 H134 V32 H144" />
        <path d="M120 60 H138 L146 52" />
        <path d="M120 76 H136 L146 88 H152" />
        <path d="M116 92 L132 106 H144" />
      </g>

      {/* Digital Circuit Terminal Nodes (Glowing Dots) */}
      <g fill="#0284C7" stroke="#FFFFFF" strokeWidth="1.2">
        {/* Left Terminal Nodes */}
        <circle cx="16" cy="32" r="3.2" />
        <circle cx="14" cy="52" r="3.2" />
        <circle cx="8" cy="88" r="3.2" />
        <circle cx="16" cy="106" r="3.2" />

        {/* Right Terminal Nodes */}
        <circle cx="144" cy="32" r="3.2" />
        <circle cx="146" cy="52" r="3.2" />
        <circle cx="152" cy="88" r="3.2" />
        <circle cx="144" cy="106" r="3.2" />
      </g>

      {/* ================================================================= */}
      {/* 2. HERALDIC ACADEMIC SHIELD CONTAINER                             */}
      {/* ================================================================= */}
      <g filter="url(#fhShieldShadow)">
        {/* Shield Outer Bold Border */}
        <path
          d="M42 38 L80 32 L118 38 V80 C118 104 98 120 80 128 C62 120 42 104 42 80 Z"
          fill="url(#fhShieldBackdrop)"
          stroke="#0F172A"
          strokeWidth="4.5"
          strokeLinejoin="round"
        />

        {/* Inner Border Accent Line */}
        <path
          d="M48 42 L80 37 L112 42 V78 C112 99 95 113 80 121 C65 113 48 99 48 78 Z"
          fill="none"
          stroke="#1E3A8A"
          strokeWidth="1.2"
          strokeOpacity="0.4"
        />
      </g>

      {/* ================================================================= */}
      {/* 3. STYLIZED MONOGRAM "FH" (Fusion High)                          */}
      {/* ================================================================= */}
      <g id="fhMonogram">
        {/* Letter "F" - Left side (Deep Midnight Blue) */}
        <path
          d="M58 52 H80 V61 H68 V69 H78 V77 H68 V96 H58 Z"
          fill="url(#fhDarkStem)"
        />

        {/* Letter "H" - Right side (Electric Cobalt Blue) */}
        <path
          d="M72 69 H86 V52 H96 V96 H86 V77 H72 Z"
          fill="url(#fhLetterGrad)"
        />

        {/* Modern Athletic Slant Facet Highlight on "F" */}
        <polygon points="58,52 68,52 68,96 58,96" fill="#1E293B" opacity="0.3" />
        {/* Modern Athletic Slant Facet Highlight on "H" */}
        <polygon points="86,52 96,52 96,96 86,96" fill="#38BDF8" opacity="0.3" />
      </g>

      {/* ================================================================= */}
      {/* 4. GRADUATION CAP / MORTARBOARD ON TOP CREST                      */}
      {/* ================================================================= */}
      <g id="fhGradCap" filter="url(#fhShieldShadow)">
        {/* Mortarboard Diamond Top */}
        <polygon
          points="80,10 118,24 80,36 42,24"
          fill="#0F172A"
          stroke="#1E3A8A"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Diamond Inner Rim Highlight */}
        <polygon
          points="80,13 113,24 80,33 47,24"
          fill="#1E293B"
          opacity="0.8"
        />

        {/* Cap Skullcap Base */}
        <path
          d="M56 29 Q80 37 104 29 V34 Q80 43 56 34 Z"
          fill="#0F172A"
        />

        {/* Tassel Button Core */}
        <circle cx="80" cy="24" r="2.2" fill="#38BDF8" />

        {/* Tassel Cord & Hanging Brush */}
        <path
          d="M80 24 Q96 26 98 36 V45"
          fill="none"
          stroke="#0284C7"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Tassel End Brush */}
        <rect x="96" y="44" width="4" height="6" rx="1.5" fill="#38BDF8" />
      </g>

      {/* ================================================================= */}
      {/* 5. OPEN ACADEMIC BOOK AT THE BASE                                 */}
      {/* ================================================================= */}
      <g id="fhOpenBook">
        {/* Radiant Blue Glow from Book Spine */}
        <ellipse cx="80" cy="132" rx="16" ry="6" fill="#38BDF8" filter="url(#fhSpineAura)" opacity="0.8" />

        {/* Left Book Pages (Multiple Curved Layer Folds) */}
        <path
          d="M80 134 C58 126 38 128 20 137 C34 122 56 116 80 122 Z"
          fill="#0F172A"
        />
        <path
          d="M80 128 C60 120 42 122 26 130 C40 117 60 112 80 117 Z"
          fill="#1E3A8A"
        />
        <path
          d="M80 122 C62 115 46 116 32 123 C44 112 62 108 80 112 Z"
          fill="#38BDF8"
        />

        {/* Right Book Pages (Multiple Curved Layer Folds) */}
        <path
          d="M80 134 C102 126 122 128 140 137 C126 122 104 116 80 122 Z"
          fill="#0F172A"
        />
        <path
          d="M80 128 C100 120 118 122 134 130 C120 117 100 112 80 117 Z"
          fill="#1E3A8A"
        />
        <path
          d="M80 122 C98 115 114 116 128 123 C116 112 98 108 80 112 Z"
          fill="#38BDF8"
        />

        {/* Central Book Spine Clasp & Light Ray */}
        <path
          d="M77 135 Q80 138 83 135 V118 Q80 116 77 118 Z"
          fill="#FFFFFF"
        />
        <circle cx="80" cy="120" r="1.5" fill="#38BDF8" />
      </g>
    </svg>
  );
};
