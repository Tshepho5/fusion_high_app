import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Briefcase,
  MessageSquare,
  BookOpen,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  Clock,
  Award,
  HardDrive,
  Trophy,
  Calendar,
  CreditCard,
  Building2,
  Settings,
  Search,
  ArrowRight,
  ChevronDown,
  GraduationCap,
  Star,
  Swords,
  Megaphone,
  ShieldCheck,
  LifeBuoy,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  ADMIN_DIRECTORY_CATEGORIES,
  ADMIN_FAVORITES_EVENT,
  ADMIN_FAVORITES_STORAGE_KEY,
  ADMIN_RECENT_EVENT,
  ADMIN_RECENT_STORAGE_KEY,
  type DirectoryCategory,
  type DirectoryModule,
  filterDirectory,
  modulesInCategory,
  readIdList,
  rememberAdminDirectoryVisit,
  resolveListedModules,
  toggleStoredId,
  visibleDirectoryModules,
} from './adminDirectoryModel';

interface AdminMoreHubProps {
  onNavigateTab: (tabId: string, params?: any) => void;
}

const MODULE_ICONS: Record<DirectoryModule['icon'], React.ElementType> = {
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

const CATEGORY_ICONS: Record<DirectoryCategory['icon'], React.ElementType> = {
  shield: ShieldCheck,
  book: BookOpen,
  trending: TrendingUp,
  briefcase: Briefcase,
  messages: MessageSquare,
  trophy: Trophy,
  settings: Settings,
};

function readStoredIds(key: string): string[] {
  try {
    return readIdList(localStorage.getItem(key));
  } catch {
    return [];
  }
}

function writeStoredIds(key: string, ids: string[], eventName: string) {
  try {
    localStorage.setItem(key, JSON.stringify(ids));
    window.dispatchEvent(new Event(eventName));
  } catch {
    /* Preference storage can be unavailable in private browsing. */
  }
}

export const AdminMoreHub: React.FC<AdminMoreHubProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const isSuperAdmin = !!user?.is_superadmin;
  const [searchQuery, setSearchQuery] = useState('');
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => readStoredIds(ADMIN_FAVORITES_STORAGE_KEY));
  const [recentIds, setRecentIds] = useState<string[]>(() => readStoredIds(ADMIN_RECENT_STORAGE_KEY));
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ADMIN_DIRECTORY_CATEGORIES.map((category) => [category.id, true]))
  );

  useEffect(() => {
    const syncFavorites = () => setFavoriteIds(readStoredIds(ADMIN_FAVORITES_STORAGE_KEY));
    const syncRecent = () => setRecentIds(readStoredIds(ADMIN_RECENT_STORAGE_KEY));
    window.addEventListener(ADMIN_FAVORITES_EVENT, syncFavorites);
    window.addEventListener('storage', syncFavorites);
    window.addEventListener(ADMIN_RECENT_EVENT, syncRecent);
    window.addEventListener('storage', syncRecent);
    return () => {
      window.removeEventListener(ADMIN_FAVORITES_EVENT, syncFavorites);
      window.removeEventListener('storage', syncFavorites);
      window.removeEventListener(ADMIN_RECENT_EVENT, syncRecent);
      window.removeEventListener('storage', syncRecent);
    };
  }, []);

  const availableModules = useMemo(() => visibleDirectoryModules(isSuperAdmin), [isSuperAdmin]);
  const filteredModules = useMemo(
    () => filterDirectory(availableModules, searchQuery),
    [availableModules, searchQuery]
  );
  const searching = searchQuery.trim().length > 0;
  const favoriteModules = useMemo(
    () => filterDirectory(resolveListedModules(favoriteIds, availableModules), searchQuery),
    [favoriteIds, availableModules, searchQuery]
  );
  const recentModules = useMemo(
    () => filterDirectory(resolveListedModules(recentIds, availableModules), searchQuery),
    [recentIds, availableModules, searchQuery]
  );

  const openModule = (id: string) => {
    const next = rememberAdminDirectoryVisit(id);
    if (next.length > 0) setRecentIds(next);
    onNavigateTab(id);
  };

  const toggleFavorite = (event: React.MouseEvent, id: string) => {
    event.stopPropagation();
    const updated = toggleStoredId(favoriteIds, id);
    setFavoriteIds(updated);
    writeStoredIds(ADMIN_FAVORITES_STORAGE_KEY, updated, ADMIN_FAVORITES_EVENT);
  };

  useEffect(() => {
    if (!searching) return;
    setExpanded((current) => {
      const next = { ...current };
      ADMIN_DIRECTORY_CATEGORIES.forEach((category) => {
        if (modulesInCategory(filteredModules, category.id).length > 0) next[category.id] = true;
      });
      return next;
    });
  }, [searching, filteredModules]);

  const jumpToCategory = (categoryId: string) => {
    setExpanded((current) => ({ ...current, [categoryId]: true }));
    window.requestAnimationFrame(() => {
      document.getElementById(`directory-category-${categoryId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  };

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100">
      <div className="p-5 sm:p-6 rounded-3xl bg-[#E5EBF1] dark:bg-[#080B10] border border-[#C7D1DC] dark:border-[#2C3948] shadow-sm">
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl xl:text-4xl font-black font-display text-[#101820] dark:text-[#F5F7FA] tracking-tight">
            {isSuperAdmin ? 'Superadmin Command Centre' : 'Main Navigation Menu'}
          </h1>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#168BFF]/10 text-[#168BFF] border border-[#168BFF]/30 uppercase tracking-wider">
            Executive Portal
          </span>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-[#526071] dark:text-[#AAB5C2]">
          {isSuperAdmin
            ? 'Manage schools, academic operations, users and platform services from one central workspace.'
            : 'Open the administrative tools assigned to this school.'}
        </p>

        <div className="relative mt-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#697586] dark:text-[#8794A5] pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search modules or categories"
            aria-label="Search modules or categories"
            className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-white dark:bg-[#171F29] border border-[#C7D1DC] dark:border-[#2C3948] text-sm text-[#101820] dark:text-[#F5F7FA] placeholder-[#697586] dark:placeholder-[#8794A5] focus:outline-none focus:border-[#168BFF] focus:ring-2 focus:ring-[#168BFF]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[#526071] dark:text-[#AAB5C2] hover:text-[#101820] dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#168BFF]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-6 lg:items-start">
        <nav aria-label="Module categories" className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-1 lg:sticky lg:top-0 lg:self-start">
          {ADMIN_DIRECTORY_CATEGORIES.map((category) => {
            const count = modulesInCategory(availableModules, category.id).length;
            const Icon = CATEGORY_ICONS[category.icon];
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => jumpToCategory(category.id)}
                className="shrink-0 lg:w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white dark:bg-[#111821] border border-[#C7D1DC] dark:border-[#2C3948] text-left hover:border-[#168BFF]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#168BFF]"
              >
                <Icon className="w-4 h-4 shrink-0 text-[#101820] dark:text-[#F5F7FA]" />
                <span className="min-w-0 text-xs font-bold leading-snug text-[#101820] dark:text-[#F5F7FA]">{category.label}</span>
                <span className="ml-auto text-[10px] font-bold text-[#526071] dark:text-[#AAB5C2]">{count}</span>
              </button>
            );
          })}
        </nav>

        <div className="min-w-0 space-y-6">
          <PreferenceRow
            title="My Favourites"
            icon={Star}
            iconClassName="fill-amber-400 text-amber-400"
            emptyTitle="No favourites yet"
            emptyDetail="Star a module to keep it here. Starred modules also stay in their categories."
            modules={favoriteModules}
            hiddenBySearch={searching && favoriteIds.length > 0 && favoriteModules.length === 0}
            favoriteIds={favoriteIds}
            onOpen={openModule}
            onToggleFavorite={toggleFavorite}
          />

          <PreferenceRow
            title="Recently Used"
            icon={Clock}
            iconClassName="text-[#168BFF]"
            emptyTitle="No recent modules"
            emptyDetail="Modules you open will appear here."
            modules={recentModules}
            hiddenBySearch={searching && recentIds.length > 0 && recentModules.length === 0}
            favoriteIds={favoriteIds}
            onOpen={openModule}
            onToggleFavorite={toggleFavorite}
            compact
          />

          {filteredModules.length === 0 ? (
            <div className="p-8 text-center rounded-3xl bg-[#F4F6F8] dark:bg-[#111821] border border-[#C7D1DC] dark:border-[#2C3948]">
              <p className="text-sm font-bold text-[#101820] dark:text-[#F5F7FA]">No modules match “{searchQuery.trim()}”</p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-3 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#168BFF] text-white hover:bg-[#0878E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#168BFF]"
              >
                Clear search
              </button>
            </div>
          ) : (
            ADMIN_DIRECTORY_CATEGORIES.map((category) => {
              const modules = modulesInCategory(filteredModules, category.id);
              if (modules.length === 0) return null;
              const open = expanded[category.id] !== false;
              const Icon = CATEGORY_ICONS[category.icon];
              const availableCount = modulesInCategory(availableModules, category.id).length;
              return (
                <section
                  key={category.id}
                  id={`directory-category-${category.id}`}
                  aria-labelledby={`directory-category-label-${category.id}`}
                  className="scroll-mt-4 rounded-3xl border border-[#C7D1DC] dark:border-[#2C3948] bg-[#E5EBF1]/70 dark:bg-[#080B10]/80"
                >
                  <button
                    type="button"
                    id={`directory-category-label-${category.id}`}
                    aria-expanded={open}
                    aria-controls={`directory-category-panel-${category.id}`}
                    onClick={() => setExpanded((current) => ({ ...current, [category.id]: !open }))}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#168BFF]"
                  >
                    <span className="w-9 h-9 rounded-xl bg-white dark:bg-[#171F29] border border-[#C7D1DC] dark:border-[#2C3948] flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-[#101820] dark:text-[#F5F7FA]" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-black font-display text-[#101820] dark:text-[#F5F7FA]">{category.label}</span>
                      <span className="block text-[11px] font-bold text-[#526071] dark:text-[#AAB5C2]">
                        {availableCount} {availableCount === 1 ? 'module' : 'modules'}
                      </span>
                    </span>
                    <ChevronDown className={`ml-auto w-4 h-4 text-[#697586] dark:text-[#8794A5] transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {open && (
                    <div id={`directory-category-panel-${category.id}`} className="px-3 pb-3 sm:px-4 sm:pb-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                        {modules.map((module) => (
                          <ModuleCard
                            key={module.id}
                            module={module}
                            isFavourite={favoriteIds.includes(module.id)}
                            onOpen={openModule}
                            onToggleFavorite={toggleFavorite}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

function PreferenceRow({
  title,
  icon: Icon,
  iconClassName,
  emptyTitle,
  emptyDetail,
  modules,
  hiddenBySearch,
  favoriteIds,
  onOpen,
  onToggleFavorite,
  compact = false,
}: {
  title: string;
  icon: React.ElementType;
  iconClassName: string;
  emptyTitle: string;
  emptyDetail: string;
  modules: DirectoryModule[];
  hiddenBySearch: boolean;
  favoriteIds: string[];
  onOpen: (id: string) => void;
  onToggleFavorite: (event: React.MouseEvent, id: string) => void;
  compact?: boolean;
}) {
  return (
    <section aria-label={title} className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${iconClassName}`} />
        <h2 className="text-sm font-black font-display text-[#101820] dark:text-[#F5F7FA]">{title}</h2>
      </div>
      {modules.length === 0 ? (
        <div className="px-4 py-3 rounded-2xl bg-[#F4F6F8] dark:bg-[#111821] border border-[#C7D1DC] dark:border-[#2C3948]">
          <p className="text-xs font-bold text-[#101820] dark:text-[#F5F7FA]">{hiddenBySearch ? 'Nothing in this list matches the search' : emptyTitle}</p>
          {!hiddenBySearch && <p className="mt-1 text-xs text-[#526071] dark:text-[#AAB5C2]">{emptyDetail}</p>}
        </div>
      ) : (
        <div className={`grid gap-3 ${compact ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'}`}>
          {modules.map((module) => (
            <ModuleCard
              key={`${title}-${module.id}`}
              module={module}
              isFavourite={favoriteIds.includes(module.id)}
              onOpen={onOpen}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ModuleCard({
  module,
  isFavourite,
  onOpen,
  onToggleFavorite,
}: {
  module: DirectoryModule;
  isFavourite: boolean;
  onOpen: (id: string) => void;
  onToggleFavorite: (event: React.MouseEvent, id: string) => void;
}) {
  const Icon = MODULE_ICONS[module.icon];
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(module.id)}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(module.id);
        }
      }}
      title={module.title}
      className="h-full min-h-[92px] p-4 rounded-2xl bg-[#F4F6F8] dark:bg-[#111821] border border-[#C7D1DC] dark:border-[#2C3948] hover:border-[#168BFF]/60 dark:hover:border-[#168BFF]/60 hover:bg-white dark:hover:bg-[#171F29] transition-all flex items-center justify-between text-left group cursor-pointer card-interactive shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#168BFF]"
    >
      <div className="flex items-center gap-3.5 min-w-0 pr-2">
        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#171F29] border border-[#C7D1DC] dark:border-[#2C3948] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-xs">
          <Icon className="w-6 h-6 text-[#101820] dark:text-[#F5F7FA] group-hover:text-[#168BFF] transition-colors" />
        </div>
        <h3 className="text-xs sm:text-sm font-bold text-[#101820] dark:text-[#F5F7FA] group-hover:text-[#168BFF] transition-colors leading-snug line-clamp-2">
          {module.title}
        </h3>
      </div>
      <div className="flex items-center gap-1.5 shrink-0 ml-2">
        <button
          type="button"
          onClick={(event) => onToggleFavorite(event, module.id)}
          aria-label={isFavourite ? `Remove ${module.title} from favourites` : `Add ${module.title} to favourites`}
          aria-pressed={isFavourite}
          title={isFavourite ? 'Remove from Home Favorites' : 'Add to Home Favorites'}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#168BFF] ${
            isFavourite
              ? 'text-amber-400 hover:text-amber-500'
              : 'text-slate-300 dark:text-slate-600 hover:text-amber-400 dark:hover:text-amber-400'
          }`}
        >
          <Star className={`w-4 h-4 ${isFavourite ? 'fill-amber-400' : ''}`} />
        </button>
        <ArrowRight className="w-4 h-4 text-[#697586] dark:text-[#8794A5] group-hover:text-[#168BFF] group-hover:translate-x-0.5 transition-all" />
      </div>
    </div>
  );
}
