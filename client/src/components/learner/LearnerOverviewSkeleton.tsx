import React from 'react';

export const LearnerOverviewSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-16 select-none" aria-busy="true" aria-label="Loading student portal">
      
      {/* 1. Student Greeting & Profile Banner Skeleton */}
      <div className="p-6 rounded-3xl bg-slate-100/90 dark:bg-surface-dark border border-slate-200/90 dark:border-white/10 shadow-sm relative overflow-hidden shimmer-wave">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-white/10 animate-pulse shrink-0" />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-24 h-5 rounded-full bg-slate-200 dark:bg-white/10 animate-pulse" />
                <div className="w-16 h-5 rounded-full bg-slate-200 dark:bg-white/10 animate-pulse" />
              </div>
              <div className="w-56 sm:w-80 h-7 rounded-xl bg-slate-300 dark:bg-white/15 animate-pulse" />
              <div className="w-40 sm:w-60 h-4 rounded-lg bg-slate-200 dark:bg-white/10 animate-pulse" />
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-28 h-9 rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse" />
            <div className="w-28 h-9 rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse" />
          </div>
        </div>
      </div>

      {/* 2. Four Academic Key Metric Stat Cards Skeleton */}
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

      {/* 3. Today's Schedule & Enrolled Subjects Skeleton Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 Cols): Enrolled Subjects Cards */}
        <div className="lg:col-span-2 space-y-4 rounded-3xl bg-slate-100 dark:bg-surface-darker border border-slate-300 dark:border-white/10 p-5 sm:p-6 shadow-sm relative overflow-hidden shimmer-wave">
          <div className="flex items-center justify-between">
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

        {/* Right Column (1 Col): Today's Classes & Assignments */}
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
