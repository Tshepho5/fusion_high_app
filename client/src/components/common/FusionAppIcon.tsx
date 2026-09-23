import React from 'react';

interface FusionAppIconProps {
  className?: string;
  size?: number | string;
  alt?: string;
}

/**
 * Geleza SA (G~SA) Official App Logo
 * "Geleza Smart, The Future Is Thine"
 */
export const FusionAppIcon: React.FC<FusionAppIconProps> = ({
  className = 'w-10 h-10',
  size,
  alt = 'Geleza SA Logo',
}) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <img
      src="/assets/geleza-logo.png"
      alt={alt}
      className={`inline-block shrink-0 select-none object-contain rounded-2xl shadow-xs transition-transform duration-300 hover:scale-105 ${className}`}
      style={style}
    />
  );
};
