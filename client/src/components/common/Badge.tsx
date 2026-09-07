import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'indigo' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'slate';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'indigo',
  size = 'md',
  className = '',
}) => {
  const variantStyles = {
    indigo: 'bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 font-bold',
    cyan: 'bg-cyan-500/10 dark:bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border-cyan-500/30 font-bold',
    emerald: 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 font-bold',
    amber: 'bg-amber-500/10 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30 font-bold',
    rose: 'bg-rose-500/10 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 font-bold',
    slate: 'bg-slate-500/10 dark:bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30 font-bold',
  };

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 font-semibold tracking-wide',
    md: 'text-xs px-2.5 py-1 font-semibold tracking-normal',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};
