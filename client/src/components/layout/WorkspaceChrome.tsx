import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const greetingForHour = (hour: number) => {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

export const HomeGreeting: React.FC = () => {
  const { user } = useAuth();
  const firstName = (user?.full_name || '').trim().split(/\s+/)[0] || 'there';
  const now = new Date();
  const dateLabel = now.toLocaleDateString('en-ZA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <header className="pt-1">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">
        {dateLabel}
      </p>
      <h1 className="mt-1 text-2xl md:text-3xl xl:text-4xl font-display font-extrabold tracking-tight text-[#1C252C] dark:text-white">
        {greetingForHour(now.getHours())}, {firstName}
      </h1>
    </header>
  );
};

interface ModulePageHeaderProps {
  title: string;
  parentLabel: string;
  backLabel: string;
  onBack: () => void;
}

export const ModulePageHeader: React.FC<ModulePageHeaderProps> = ({
  title,
  parentLabel,
  backLabel,
  onBack,
}) => {
  return (
    <header className="mb-4 flex items-center justify-between gap-3 animate-fade-in">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 rounded-full bg-white/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-cyan-700 dark:hover:text-cyan-300 hover:border-cyan-400/50 transition-colors cursor-pointer shadow-sm"
        title={backLabel}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>{backLabel}</span>
      </button>
      <p className="hidden sm:block text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300 truncate">
        {parentLabel}
        <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
        <span className="text-slate-500 dark:text-slate-400 normal-case tracking-normal font-bold">{title}</span>
      </p>
    </header>
  );
};
