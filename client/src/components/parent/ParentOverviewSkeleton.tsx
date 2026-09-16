import React from 'react';

export const ParentOverviewSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-16 select-none" aria-busy="true" aria-label="Loading family portal">
      
      {/* 1. Linked Children Horizontal Carousel Skeleton */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse" />
            <div className="w-36 h-5 rounded-lg bg-slate-300 dark:bg-white/15 animate-pulse" />
          </div>
          <div className="w-24 h-7 rounded-lg bg-slate-200 dark:bg-white/10 animate-pulse" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2].map((c) => (
            <div
              key={c}
              className="p-4 rounded-2xl bg-white dark:bg-surface-dark border border-slate-200/90 dark:border-white/10 shadow-sm relative overflow-hidden shimmer-wave space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="w-28 h-5 rounded bg-slate-300 dark:bg-white/15 animate-pulse" />
                  <div className="w-20 h-3.5 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
                </div>
                <div className="w-16 h-5 rounded-full bg-slate-100 dark:bg-white/5 animate-pulse" />
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                <div className="h-6 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
                <div className="h-6 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
                <div className="h-6 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Selected Child Key Performance Stats Skeleton */}
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

      {/* 3. Parent Modules Grid Skeleton */}
      <div className="space-y-3.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-white/10 animate-pulse" />
          <div className="w-40 h-5 rounded-lg bg-slate-300 dark:bg-white/15 animate-pulse" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((m) => (
            <div
              key={m}
              className="p-3.5 rounded-2xl bg-white dark:bg-surface-dark border border-slate-200/90 dark:border-white/10 shadow-sm flex items-center gap-3 relative overflow-hidden shimmer-wave"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse shrink-0" />
              <div className="w-20 h-4 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
