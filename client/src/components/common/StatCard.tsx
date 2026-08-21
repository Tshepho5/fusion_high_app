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
  const iconBgMap = {
    indigo: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    cyan: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    rose: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-surface-dark border border-white/10 p-4 sm:p-5 shadow-md card-interactive ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">
            {title}
          </p>
          <h3 className="text-xl sm:text-2xl font-extrabold font-mono text-white tracking-tight">
            {value}
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-400 truncate">
              {subtitle}
            </p>
          )}
        </div>

        {Icon && (
          <div className={`p-2.5 rounded-xl border shrink-0 ${iconBgMap[accentColor]}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {trend && (
        <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center gap-1.5 text-[11px] font-semibold">
          <span className={trend.isPositive ? 'text-emerald-400' : 'text-rose-400'}>
            {trend.isPositive ? '↑' : '↓'} {trend.value}
          </span>
          <span className="text-slate-500 font-normal">vs last term</span>
        </div>
      )}
    </div>
  );
};
