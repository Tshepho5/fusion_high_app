import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  Check,
  Clock,
  CreditCard,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  HardDrive,
  LifeBuoy,
  Megaphone,
  MessageSquare,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Swords,
  TrendingUp,
  Trophy,
  Users,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import {
  ADMIN_DIRECTORY_CATEGORIES,
  ADMIN_FAVORITES_EVENT,
  ADMIN_FAVORITES_STORAGE_KEY,
  type DirectoryModule,
  filterDirectory,
  readIdList,
  rememberAdminDirectoryVisit,
  toggleStoredId,
  visibleDirectoryModules,
} from '../../pages/admin/adminDirectoryModel';
import {
  DEFAULT_SCHOOL_ADMIN_QUICK_ACCESS_IDS,
  resolveSchoolAdminQuickAccessModules,
} from '../../pages/admin/schoolAdminHomeModel';

interface SchoolAdminQuickAccessProps {
  onNavigateTab: (tabId: string, params?: any) => void;
}

const MODULE_ICONS: Record<DirectoryModule['icon'], LucideIcon> = {
  building: Building2,
  shield: ShieldCheck,
  users: Users,
  'life-buoy': LifeBuoy,
  book: BookOpen,
  briefcase: Briefcase,
  trophy: Trophy,
  spreadsheet: FileSpreadsheet,
  file: FileText,
  trending: TrendingUp,
  award: Award,
  clock: Clock,
  calendar: Calendar,
  drive: HardDrive,
  card: CreditCard,
  messages: MessageSquare,
  megaphone: Megaphone,
  swords: Swords,
  graduation: GraduationCap,
  settings: Settings,
};

function readStoredFavoriteIds(): string[] {
  try {
    return readIdList(localStorage.getItem(ADMIN_FAVORITES_STORAGE_KEY));
  } catch {
    return [];
  }
}

function persistFavoriteIds(ids: string[]) {
  try {
    localStorage.setItem(ADMIN_FAVORITES_STORAGE_KEY, JSON.stringify(ids));
    window.dispatchEvent(new Event(ADMIN_FAVORITES_EVENT));
  } catch {
    /* Storage can be restricted in private browsing. */
  }
}

export const SchoolAdminQuickAccess: React.FC<SchoolAdminQuickAccessProps> = ({
  onNavigateTab,
}) => {
  const authorizedModules = useMemo(() => visibleDirectoryModules(false), []);
  const [storedIds, setStoredIds] = useState<string[]>(readStoredFavoriteIds);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    const sync = () => setStoredIds(readStoredFavoriteIds());
    window.addEventListener(ADMIN_FAVORITES_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(ADMIN_FAVORITES_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const quickAccessModules = useMemo(
    () => resolveSchoolAdminQuickAccessModules(storedIds, authorizedModules),
    [storedIds, authorizedModules]
  );

  const activePinnedIds = useMemo(
    () => quickAccessModules.map((module) => module.id),
    [quickAccessModules]
  );

  const handleOpenModule = (moduleId: string) => {
    rememberAdminDirectoryVisit(moduleId);
    onNavigateTab(moduleId);
  };

  const handleTogglePin = (moduleId: string) => {
    // Seed from the currently visible defaults if user has not saved a custom list yet
    const baseIds =
      storedIds.filter((id) => authorizedModules.some((m) => m.id === id)).length > 0
        ? storedIds.filter((id) => authorizedModules.some((m) => m.id === id))
        : [...DEFAULT_SCHOOL_ADMIN_QUICK_ACCESS_IDS];

    const updated = toggleStoredId(baseIds, moduleId);
    setStoredIds(updated);
    persistFavoriteIds(updated);
  };

  const modalCategories = useMemo(
    () =>
      ADMIN_DIRECTORY_CATEGORIES.filter((category) =>
        authorizedModules.some((module) => module.categoryId === category.id)
      ),
    [authorizedModules]
  );

  const modalModules = useMemo(() => {
    const byCategory =
      selectedCategory === 'all'
        ? authorizedModules
        : authorizedModules.filter((module) => module.categoryId === selectedCategory);
    return filterDirectory(byCategory, searchQuery);
  }, [authorizedModules, selectedCategory, searchQuery]);

  return (
    <section aria-label="Quick Access" className="space-y-3.5">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#168BFF]/25 bg-[#168BFF]/10 text-[#168BFF]">
            <Zap className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-base font-extrabold tracking-tight text-[#101820] dark:text-[#F5F7FA] sm:text-lg">
              Quick Access
            </h2>
            <span className="rounded-full border border-[#C7D1DC] bg-[#F4F6F8] px-2 py-0.5 font-mono text-[10px] font-bold text-[#526071] dark:border-white/10 dark:bg-white/5 dark:text-[#AAB5C2]">
              {quickAccessModules.length} of {authorizedModules.length}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCustomizeOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#C7D1DC] bg-white/80 px-3 py-1.5 text-xs font-bold text-[#526071] transition-colors hover:border-[#168BFF]/50 hover:text-[#101820] dark:border-white/15 dark:bg-white/5 dark:text-[#AAB5C2] dark:hover:border-[#168BFF]/50 dark:hover:text-white"
            title="Choose which authorized school modules appear in Quick Access"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Customize</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('more')}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#168BFF]/35 bg-[#168BFF]/10 px-3.5 py-1.5 text-xs font-bold text-[#0878E8] transition-colors hover:bg-[#168BFF] hover:text-white dark:text-[#7CC4FF] dark:hover:bg-[#168BFF] dark:hover:text-white"
            title="View all authorized school modules"
          >
            <span>View All</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Access Card Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {quickAccessModules.map((module) => {
          const Icon = MODULE_ICONS[module.icon] || BookOpen;
          return (
            <button
              key={module.id}
              type="button"
              onClick={() => handleOpenModule(module.id)}
              className="group flex min-h-[104px] flex-col items-center justify-center gap-2.5 rounded-2xl border border-[#C7D1DC]/90 bg-white/85 px-3 py-4 text-center shadow-sm backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-[#168BFF]/60 hover:bg-white hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#168BFF] dark:border-white/10 dark:bg-[#0D1520]/85 dark:hover:border-[#168BFF]/60 dark:hover:bg-[#131F2E]"
              title={module.title}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#168BFF]/20 bg-[#168BFF]/10 text-[#168BFF] transition-transform duration-200 group-hover:scale-105 group-hover:bg-[#168BFF] group-hover:text-white">
                <Icon className="h-5 w-5" />
              </span>
              <span className="line-clamp-2 text-xs font-bold leading-snug text-[#101820] transition-colors group-hover:text-[#0878E8] dark:text-[#F5F7FA] dark:group-hover:text-[#7CC4FF]">
                {module.title}
              </span>
            </button>
          );
        })}
      </div>

      {/* Customize Quick Access Modal (Authorized School Admin Modules Only) */}
      {customizeOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-md sm:p-5"
          onClick={() => setCustomizeOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="customize-quick-access-title"
            className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-[#C7D1DC] bg-white text-[#101820] shadow-2xl dark:border-white/15 dark:bg-[#0D1520] dark:text-[#F5F7FA]"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-3 border-b border-[#C7D1DC] bg-[#F4F6F8] px-5 py-4 dark:border-white/10 dark:bg-[#080D14]">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#168BFF]/30 bg-[#168BFF]/10 text-[#168BFF]">
                  <Zap className="h-4 w-4" />
                </span>
                <div>
                  <h3 id="customize-quick-access-title" className="font-display text-sm font-extrabold sm:text-base">
                    Customize Quick Access
                  </h3>
                  <p className="text-[11px] text-[#526071] dark:text-[#AAB5C2]">
                    Pin your most-used authorized school modules to the home page.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCustomizeOpen(false)}
                aria-label="Close customize modal"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#C7D1DC] bg-white text-[#526071] transition-colors hover:text-[#101820] dark:border-white/10 dark:bg-white/5 dark:text-[#AAB5C2] dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Search & Category Filter */}
            <div className="space-y-2.5 border-b border-[#C7D1DC] bg-[#F4F6F8]/60 px-5 py-3.5 dark:border-white/10 dark:bg-[#0A111A]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#697586] dark:text-[#8794A5]" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search authorized school modules..."
                  aria-label="Search authorized school modules"
                  className="w-full rounded-xl border border-[#C7D1DC] bg-white py-2 pl-9 pr-4 text-xs text-[#101820] placeholder-[#697586] focus:border-[#168BFF] focus:outline-none dark:border-white/15 dark:bg-[#131D2A] dark:text-[#F5F7FA] dark:placeholder-[#8794A5]"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`shrink-0 rounded-lg px-2.5 py-1 font-bold transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-[#168BFF] text-white'
                      : 'border border-[#C7D1DC] bg-white text-[#526071] hover:text-[#101820] dark:border-white/10 dark:bg-white/5 dark:text-[#AAB5C2] dark:hover:text-white'
                  }`}
                >
                  All ({authorizedModules.length})
                </button>
                {modalCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedCategory(category.id)}
                    className={`shrink-0 rounded-lg px-2.5 py-1 font-bold transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-[#168BFF] text-white'
                        : 'border border-[#C7D1DC] bg-white text-[#526071] hover:text-[#101820] dark:border-white/10 dark:bg-white/5 dark:text-[#AAB5C2] dark:hover:text-white'
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Module Toggle List */}
            <div className="flex-1 space-y-2 overflow-y-auto p-4 custom-scrollbar sm:p-5">
              {modalModules.length === 0 ? (
                <p className="py-10 text-center text-xs text-[#526071] dark:text-[#AAB5C2]">
                  No authorized modules match &ldquo;{searchQuery.trim()}&rdquo;.
                </p>
              ) : (
                modalModules.map((module) => {
                  const Icon = MODULE_ICONS[module.icon] || BookOpen;
                  const pinned = activePinnedIds.includes(module.id);
                  return (
                    <button
                      key={module.id}
                      type="button"
                      onClick={() => handleTogglePin(module.id)}
                      className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-3 text-left transition-colors ${
                        pinned
                          ? 'border-[#168BFF]/50 bg-[#168BFF]/10'
                          : 'border-[#C7D1DC] bg-white hover:border-[#168BFF]/40 dark:border-white/10 dark:bg-[#131D2A] dark:hover:border-[#168BFF]/40'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#C7D1DC] bg-[#F4F6F8] text-[#101820] dark:border-white/10 dark:bg-[#0D1520] dark:text-[#F5F7FA]">
                          <Icon className="h-4 w-4 text-[#168BFF]" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-[#101820] dark:text-[#F5F7FA] sm:text-sm">
                            {module.title}
                          </p>
                          {module.badge && (
                            <p className="truncate text-[10px] font-medium text-[#526071] dark:text-[#AAB5C2]">
                              {module.badge}
                            </p>
                          )}
                        </div>
                      </div>
                      <span
                        data-theme-preserve={pinned ? 'true' : undefined}
                        className={`inline-flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold ${
                          pinned
                            ? 'bg-[#168BFF] text-white text-always-white'
                            : 'border border-[#C7D1DC] bg-[#F4F6F8] text-[#526071] dark:border-white/10 dark:bg-white/5 dark:text-[#AAB5C2]'
                        }`}
                      >
                        {pinned ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Pinned</span>
                          </>
                        ) : (
                          <>
                            <Plus className="h-3.5 w-3.5" />
                            <span>Pin</span>
                          </>
                        )}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between gap-3 border-t border-[#C7D1DC] bg-[#F4F6F8] px-5 py-3.5 dark:border-white/10 dark:bg-[#080D14]">
              <span className="text-xs font-semibold text-[#526071] dark:text-[#AAB5C2]">
                {activePinnedIds.length} module{activePinnedIds.length === 1 ? '' : 's'} pinned
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCustomizeOpen(false);
                    onNavigateTab('more');
                  }}
                  className="rounded-xl border border-[#C7D1DC] bg-white px-3.5 py-1.5 text-xs font-bold text-[#101820] transition-colors hover:border-[#168BFF]/50 dark:border-white/15 dark:bg-white/5 dark:text-slate-100"
                >
                  Open All Modules
                </button>
                <button
                  type="button"
                  onClick={() => setCustomizeOpen(false)}
                  className="rounded-xl bg-[#168BFF] px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#0878E8]"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
