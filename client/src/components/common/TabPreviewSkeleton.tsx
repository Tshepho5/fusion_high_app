import React from 'react';

type PreviewKind = 'dashboard' | 'tiles' | 'list' | 'table' | 'chat' | 'form';

function previewKind(tab: string): PreviewKind {
  const id = tab.toLowerCase();
  if (/(message|chat|tutor|consult)/.test(id)) return 'chat';
  if (/(timetable|calendar|attendance|seating)/.test(id)) return 'table';
  if (/(profile|setting)/.test(id)) return 'form';
  if (id === 'more' || /module/.test(id)) return 'tiles';
  if (/(subject|assess|assign|class|resource|conduct|user|mark|paper)/.test(id)) return 'list';
  return 'dashboard';
}

function Bone({ className }: { className: string }) {
  return <div className={`rounded-lg bg-slate-200/90 dark:bg-white/10 animate-pulse ${className}`} />;
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm dark:border-white/10 dark:bg-surface-dark shimmer-wave ${className}`}>
      {children}
    </div>
  );
}

function Header({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="space-y-2 min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">{title}</p>
        <Bone className="h-7 w-48 sm:w-72" />
        <Bone className="h-3.5 w-32 sm:w-48" />
      </div>
      <Bone className="h-9 w-24 shrink-0 rounded-xl" />
    </div>
  );
}

export const TabPreviewSkeleton: React.FC<{ tab: string; title?: string }> = ({ tab, title }) => {
  const kind = previewKind(tab);
  const label = title || 'this page';

  return (
    <div className="w-full animate-tab-preview space-y-5 pb-8 select-none" aria-busy="true" aria-label={`Preparing ${label}`}>
      {kind === 'dashboard' && (
        <>
          <Card className="p-5 sm:p-6"><Header title={label} /></Card>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((item) => (
              <Card key={item} className="p-4 space-y-3">
                <Bone className="h-10 w-10 rounded-2xl" />
                <Bone className="h-6 w-16" />
                <Bone className="h-3 w-24" />
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 p-5 space-y-3">
              <Bone className="h-5 w-40" />
              <Bone className="h-36 w-full rounded-2xl" />
            </Card>
            <Card className="p-5 space-y-3">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <Bone className="h-10 w-10 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Bone className="h-3.5 w-28" />
                    <Bone className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </Card>
          </div>
        </>
      )}

      {kind === 'tiles' && (
        <>
          <Card className="p-5 sm:p-6"><Header title={label} /></Card>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }, (_, item) => (
              <Card key={item} className="p-4 flex flex-col items-center gap-3">
                <Bone className="h-12 w-12 rounded-2xl" />
                <Bone className="h-3.5 w-20" />
              </Card>
            ))}
          </div>
        </>
      )}

      {kind === 'list' && (
        <>
          <Card className="p-5 sm:p-6"><Header title={label} /></Card>
          <Card className="p-3 sm:p-4 space-y-2">
            {Array.from({ length: 6 }, (_, item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3 dark:border-white/5">
                <Bone className="h-11 w-11 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Bone className="h-4 w-40" />
                  <Bone className="h-3 w-24" />
                </div>
                <Bone className="h-6 w-14 rounded-full" />
              </div>
            ))}
          </Card>
        </>
      )}

      {kind === 'table' && (
        <>
          <Card className="p-5 sm:p-6"><Header title={label} /></Card>
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 5 }, (_, item) => (
              <Bone key={item} className="h-9 w-20 shrink-0 rounded-xl" />
            ))}
          </div>
          <Card className="p-4 space-y-2">
            {Array.from({ length: 6 }, (_, item) => (
              <div key={item} className="grid grid-cols-4 gap-2">
                <Bone className="h-10" />
                <Bone className="col-span-2 h-10" />
                <Bone className="h-10" />
              </div>
            ))}
          </Card>
        </>
      )}

      {kind === 'chat' && (
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-3 min-h-[420px]">
          <Card className="p-3 space-y-2">
            <Bone className="h-9 w-full rounded-xl" />
            {Array.from({ length: 6 }, (_, item) => (
              <div key={item} className="flex items-center gap-2 p-2">
                <Bone className="h-9 w-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Bone className="h-3 w-24" />
                  <Bone className="h-2.5 w-16" />
                </div>
              </div>
            ))}
          </Card>
          <Card className="p-4 flex flex-col gap-3">
            <Bone className="h-5 w-36" />
            <Bone className="ml-auto h-12 w-2/3 rounded-2xl" />
            <Bone className="h-12 w-1/2 rounded-2xl" />
            <Bone className="ml-auto h-10 w-1/3 rounded-2xl" />
            <Bone className="mt-auto h-11 w-full rounded-2xl" />
          </Card>
        </div>
      )}

      {kind === 'form' && (
        <Card className="p-5 sm:p-6 space-y-5">
          <div className="flex items-center gap-4">
            <Bone className="h-16 w-16 rounded-full shrink-0" />
            <div className="space-y-2">
              <Bone className="h-6 w-40" />
              <Bone className="h-3.5 w-28" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 6 }, (_, item) => (
              <div key={item} className="space-y-2">
                <Bone className="h-3 w-20" />
                <Bone className="h-11 w-full rounded-xl" />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
