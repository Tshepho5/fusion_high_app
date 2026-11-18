import React from 'react';
import { Inbox } from 'lucide-react';

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  className?: string;
};

/** Guided empty state so new schools don't look broken when data is not published yet. */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  className = ''
}) => (
  <div
    className={`rounded-2xl border border-dashed border-slate-300/70 dark:border-slate-600/70 bg-slate-50/70 dark:bg-slate-900/40 px-5 py-8 text-center ${className}`}
    role="status"
  >
    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-300">
      {icon || <Inbox className="h-6 w-6" aria-hidden />}
    </div>
    <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
      {description}
    </p>
    {actionLabel && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="mt-4 inline-flex items-center justify-center rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium px-4 py-2 transition-colors"
      >
        {actionLabel}
      </button>
    )}
  </div>
);
