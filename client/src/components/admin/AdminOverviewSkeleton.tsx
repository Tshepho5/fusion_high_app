import React from 'react';

export const AdminOverviewSkeleton: React.FC = () => {
  return (
    <div className="space-y-8 animate-fade-in pb-16 select-none" aria-busy="true" aria-label="Loading administrative command center">
      
      {/* 1. Top Executive Banner Skeleton */}
      <div className="p-6 rounded-3xl bg-slate-100/90 dark:bg-surface-dark border border-slate-200/90 dark:border-white/10 shadow-sm relative overflow-hidden shimmer-wave">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="w-28 h-5 rounded-full bg-slate-200 dark:bg-white/10 animate-pulse" />
              <div className="w-20 h-5 rounded-full bg-slate-200 dark:bg-white/10 animate-pulse" />
            </div>
            <div className="w-72 sm:w-96 h-8 rounded-xl bg-slate-300 dark:bg-white/15 animate-pulse" />
            <div className="w-48 sm:w-64 h-4 rounded-lg bg-slate-200 dark:bg-white/10 animate-pulse" />
          </div>

          <div className="flex items-center gap-3">
            <div className="w-32 h-10 rounded-2xl bg-slate-200 dark:bg-white/10 animate-pulse" />
            <div className="w-10 h-10 rounded-2xl bg-slate-200 dark:bg-white/10 animate-pulse" />
          </div>
        </div>
      </div>

      {/* 2. Four Executive Key Metric Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 rounded-3xl bg-white dark:bg-surface-dark border border-slate-200/90 dark:border-white/10 shadow-sm space-y-4 relative overflow-hidden shimmer-wave"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-white/10 animate-pulse" />
              <div className="w-16 h-5 rounded-full bg-slate-100 dark:bg-white/5 animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="w-28 h-8 rounded-xl bg-slate-300 dark:bg-white/15 animate-pulse" />
              <div className="w-36 h-4 rounded-lg bg-slate-200 dark:bg-white/10 animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* 3. School Subjects Intelligence Hub Skeleton */}
      <div className="space-y-4 rounded-3xl bg-slate-100 dark:bg-surface-darker border border-slate-300 dark:border-white/10 p-5 sm:p-6 shadow-sm relative overflow-hidden shimmer-wave">
        {/* Hub Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="w-44 h-5 rounded-full bg-slate-200 dark:bg-white/10 animate-pulse" />
            <div className="w-64 sm:w-80 h-7 rounded-xl bg-slate-300 dark:bg-white/15 animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-48 h-9 rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse" />
            <div className="w-28 h-9 rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse" />
          </div>
        </div>

        {/* Grade Exploration Pills Skeleton */}
        <div className="flex items-center gap-2 overflow-hidden py-1">
          {[1, 2, 3, 4, 5, 6].map((g) => (
            <div
              key={g}
              className="w-24 h-8 rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse shrink-0"
            />
          ))}
        </div>

        {/* Category Filter Pills Skeleton */}
        <div className="flex items-center gap-2 overflow-hidden py-1">
          {[1, 2, 3, 4, 5, 6].map((c) => (
            <div
              key={c}
              className="w-28 h-7 rounded-lg bg-slate-200 dark:bg-white/10 animate-pulse shrink-0"
            />
          ))}
        </div>

        {/* 4 Cards Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-2">
          {[1, 2, 3, 4].map((sub) => (
            <div
              key={sub}
              className="rounded-2xl bg-white dark:bg-surface-dark border border-slate-300 dark:border-white/10 shadow-sm overflow-hidden flex flex-col justify-between"
            >
              {/* Image Banner Placeholder */}
              <div className="h-32 w-full bg-slate-200 dark:bg-white/10 relative overflow-hidden flex items-end p-3">
                <div className="space-y-1.5 w-full">
                  <div className="w-32 h-5 rounded-lg bg-slate-300 dark:bg-white/20 animate-pulse" />
                  <div className="w-24 h-3.5 rounded bg-slate-300 dark:bg-white/20 animate-pulse" />
                </div>
              </div>

              {/* Card Body */}
              <div className="p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-16 h-4 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
                  <div className="w-20 h-5 rounded-md bg-slate-200 dark:bg-white/10 animate-pulse" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-8 rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse" />
                  <div className="h-8 rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse" />
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
                  <div className="w-20 h-4 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
                  <div className="w-16 h-4 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Administrative Control Services Skeleton */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse" />
          <div className="w-60 h-6 rounded-lg bg-slate-300 dark:bg-white/15 animate-pulse" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
            <div
              key={m}
              className="p-4 rounded-2xl bg-white dark:bg-surface-dark border border-slate-200/90 dark:border-white/10 shadow-sm flex flex-col items-center text-center space-y-2.5"
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-white/10 animate-pulse" />
              <div className="w-20 h-3.5 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
