import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  accentColor?: 'indigo' | 'cyan' | 'emerald' | 'amber' | 'rose';
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  accentColor = 'indigo',
  className = '',
}) => {
  const colorMap = {
    indigo: 'from-indigo-500/10 to-indigo-500/0 text-indigo-400 border-indigo-500/20',
    cyan: 'from-cyan-500/10 to-cyan-500/0 text-cyan-400 border-cyan-500/20',
    emerald: 'from-emerald-500/10 to-emerald-500/0 text-emerald-400 border-emerald-500/20',
    amber: 'from-amber-500/10 to-amber-500/0 text-amber-400 border-amber-500/20',
    rose: 'from-rose-500/10 to-rose-500/0 text-rose-400 border-rose-500/20',
  };

  const iconBgMap = {
    indigo: 'bg-indigo-500/10 text-indigo-400',
    cyan: 'bg-cyan-500/10 text-cyan-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-400',
    rose: 'bg-rose-500/10 text-rose-400',
  };

  const glowAuraMap = {
    indigo: 'bg-indigo-500/15',
    cyan: 'bg-cyan-500/15',
    emerald: 'bg-emerald-500/15',
    amber: 'bg-amber-500/15',
    rose: 'bg-rose-500/15',
  };

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl bg-surface-dark/95 border border-white/10 p-5 shadow-lg card-interactive hover:shadow-card-hover transition-all duration-300 ${className}`}
    >
      {/* Dynamic Ambient Aura Backdrop */}
      <div className={`absolute top-[-20%] right-[-20%] w-32 h-32 rounded-full ${glowAuraMap[accentColor]} blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500`} />

      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 group-hover:text-slate-300 transition-colors">
            {title}
          </p>
          <h3 className="text-2xl md:text-3xl font-extrabold font-display text-white tracking-tight">
            {value}
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-1">
              {subtitle}
            </p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2 text-xs font-medium">
              <span
                className={trend.isPositive ? 'text-emerald-400' : 'text-rose-400'}
              >
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl ${iconBgMap[accentColor]}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
};
