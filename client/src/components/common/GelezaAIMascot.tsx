import React from 'react';

/** Brand palette from Geleza SA AI design sheet */
export const GELEZA_AI = {
  black: '#000000',
  navy: '#0B1F33',
  cyan: '#168BFF',
  white: '#FFFFFF',
} as const;

interface GelezaAIMascotProps {
  size?: number;
  className?: string;
  glowing?: boolean;
}

/**
 * Geleza SA AI mascot — disabled/neutralized per user request to remove AI/Gemini icons across the app.
 */
export const GelezaAIMascot: React.FC<GelezaAIMascotProps> = () => {
  return null;
};
