import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
  variant?: 'skeleton' | 'spinner' | 'auto';
}

/**
 * Universal Loading Component:
 * - When size === 'sm': renders a compact, glowing mini-spinner for buttons and inline tags.
 * - When size === 'md' | 'lg' (or default for tabs and page data loading):
 *   renders the modern layout-accurate Shimmer Skeleton Screen with wave shimmer sweeps
 *   and an adaptive status badge showing the current loading task.
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  text,
  className = '',
  variant = 'auto',
}) => {
  // If explicitly 'spinner' or size is small ('sm'), render compact micro loader
  if (variant === 'spinner' || (size === 'sm' && variant !== 'skeleton')) {
    return (
      <div className={`inline-flex items-center justify-center gap-2 select-none ${className}`}>
        <div className="w-4 h-4 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 dark:border-cyan-400/20 dark:border-t-cyan-400 animate-spin" />
        {text && (
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium animate-pulse">
            {text}
          </span>
        )}
      </div>
    );
  }

  // Universal Layout-Accurate Shimmer Skeleton Screen for pages, tabs, and data loading
  return (
    <div
      className={`space-y-6 sm:space-y-8 animate-fade-in pb-16 select-none w-full ${className}`}
      aria-busy="true"
      aria-label={text || 'Loading portal data'}
    >
      {/* Optional Top Floating Status Pill Badge */}
      {text && (
        <div className="flex items-center justify-center pt-2">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/95 dark:bg-[#0F172A]/95 border border-slate-200 dark:border-white/10 shadow-lg backdrop-blur-md">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-80" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500 dark:bg-cyan-400" />
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-tight">
              {text}
            </span>
          </div>
        </div>
      )}

      {/* 1. Top Greeting / Section Header Skeleton */}
      <div className="p-6 rounded-3xl bg-slate-100/90 dark:bg-surface-dark border border-slate-200/90 dark:border-white/10 shadow-sm relative overflow-hidden shimmer-wave">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="w-24 h-5 rounded-full bg-slate-200 dark:bg-white/10 animate-pulse" />
              <div className="w-20 h-5 rounded-full bg-slate-200 dark:bg-white/10 animate-pulse" />
            </div>
            <div className="w-64 sm:w-96 h-8 rounded-xl bg-slate-300 dark:bg-white/15 animate-pulse" />
            <div className="w-40 sm:w-64 h-4 rounded-lg bg-slate-200 dark:bg-white/10 animate-pulse" />
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-28 h-9 rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse" />
            <div className="w-28 h-9 rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse" />
          </div>
        </div>
      </div>

      {/* 2. Four Metric Cards Skeleton Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 rounded-3xl bg-white dark:bg-surface-dark border border-slate-200/90 dark:border-white/10 shadow-sm space-y-4 relative overflow-hidden shimmer-wave"
          >
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-2xl bg-slate-200 dark:bg-white/10 animate-pulse" />
              <div className="w-14 h-5 rounded-full bg-slate-100 dark:bg-white/5 animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="w-24 h-7 rounded-xl bg-slate-300 dark:bg-white/15 animate-pulse" />
              <div className="w-32 h-3.5 rounded-lg bg-slate-200 dark:bg-white/10 animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* 3. Main Data Content Area Skeleton Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 Cols): Cards / Content Grid Skeleton */}
        <div className="lg:col-span-2 space-y-4 rounded-3xl bg-slate-100/90 dark:bg-surface-darker/80 border border-slate-300/80 dark:border-white/10 p-5 sm:p-6 shadow-sm relative overflow-hidden shimmer-wave">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/5">
            <div className="space-y-1.5">
              <div className="w-32 h-4 rounded-full bg-slate-200 dark:bg-white/10 animate-pulse" />
              <div className="w-56 h-6 rounded-xl bg-slate-300 dark:bg-white/15 animate-pulse" />
            </div>
            <div className="w-24 h-8 rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className="rounded-2xl bg-white dark:bg-surface-dark border border-slate-300 dark:border-white/10 shadow-sm overflow-hidden flex flex-col justify-between"
              >
                <div className="h-28 w-full bg-slate-200 dark:bg-white/10 p-3 flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <div className="w-16 h-5 rounded-full bg-slate-300 dark:bg-white/20 animate-pulse" />
                    <div className="w-12 h-5 rounded-full bg-slate-300 dark:bg-white/20 animate-pulse" />
                  </div>
                  <div className="w-32 h-5 rounded-lg bg-slate-300 dark:bg-white/20 animate-pulse" />
                </div>
                <div className="p-3.5 space-y-2.5">
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 animate-pulse" />
                  <div className="flex justify-between items-center pt-1">
                    <div className="w-20 h-3.5 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
                    <div className="w-16 h-4 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (1 Col): Secondary Panel Skeleton */}
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-surface-dark border border-slate-200/90 dark:border-white/10 shadow-sm space-y-4 relative overflow-hidden shimmer-wave">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
              <div className="w-36 h-5 rounded-lg bg-slate-300 dark:bg-white/15 animate-pulse" />
              <div className="w-14 h-4 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((t) => (
                <div key={t} className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 dark:bg-surface-darker/60 border border-slate-100 dark:border-white/5">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="w-28 h-4 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
                    <div className="w-20 h-3 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
                  </div>
                  <div className="w-12 h-4 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
