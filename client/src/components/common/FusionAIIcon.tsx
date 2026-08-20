import React from 'react';

interface FusionAIIconProps {
  className?: string;
  size?: number | string;
  variant?: 'default' | 'glow' | 'pulse';
}

export const FusionAIIcon: React.FC<FusionAIIconProps> = ({
  className = 'w-5 h-5 text-cyan-400',
  size,
  variant = 'default',
}) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 transition-transform duration-300 ${
        variant === 'pulse' ? 'animate-pulse' : ''
      } ${className}`}
      style={style}
    >
      <defs>
        <linearGradient id="fusionAIGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#06B6D4" />
          <stop offset="0.5" stopColor="#6366F1" />
          <stop offset="1" stopColor="#4F46E5" />
        </linearGradient>
        <linearGradient id="fusionCoreGrad" x1="8" y1="8" x2="16" y2="16" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22D3EE" />
          <stop offset="1" stopColor="#818CF8" />
        </linearGradient>
      </defs>

      {/* Hexagonal Quantum Orbital Shell */}
      <path
        d="M12 2L20.5 6.8V17.2L12 22L3.5 17.2V6.8L12 2Z"
        stroke="url(#fusionAIGrad)"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="2.5 1.5"
        className="opacity-90"
      />

      {/* Tri-Node Neural Synapse Lines */}
      <path
        d="M12 7V12M12 12L7.5 14.5M12 12L16.5 14.5"
        stroke="url(#fusionCoreGrad)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Outer Orbital Orbit Nodes */}
      <circle cx="12" cy="7" r="1.5" fill="#22D3EE" />
      <circle cx="7.5" cy="14.5" r="1.5" fill="#818CF8" />
      <circle cx="16.5" cy="14.5" r="1.5" fill="#6366F1" />

      {/* Central Fusion Spark Core */}
      <circle cx="12" cy="12" r="2.25" fill="url(#fusionCoreGrad)" />
      <circle cx="12" cy="12" r="1" fill="#FFFFFF" />
    </svg>
  );
};
