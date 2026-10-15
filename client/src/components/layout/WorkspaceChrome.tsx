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
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#168BFF]">
        {dateLabel}
      </p>
      <h1 className="mt-1 text-2xl md:text-3xl xl:text-4xl font-display font-extrabold tracking-tight text-[#101820] dark:text-[#F5F7FA]">
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
  backLabel,
  onBack,
}) => {
  return (
    <header className="mb-4 flex items-center animate-fade-in">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-[#111821] border border-[#C7D1DC] dark:border-[#2C3948] px-3.5 py-1.5 text-xs font-bold text-[#526071] dark:text-[#AAB5C2] hover:text-[#101820] dark:hover:text-[#F5F7FA] hover:border-[#168BFF]/50 transition-colors cursor-pointer shadow-sm"
        title={backLabel}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>{backLabel}</span>
      </button>
    </header>
  );
};
