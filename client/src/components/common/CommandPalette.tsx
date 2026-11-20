import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { useTheme } from '../../context/ThemeContext';
import { sidebarGroupsForRole } from '../layout/sidebarNavigation';
import {
  Search,
  User,
  LayoutDashboard,
  LayoutGrid,
  Moon,
  Sun,
  ArrowRight,
  X,
  Home,
  Settings,
} from 'lucide-react';

interface CommandItem {
  id: string;
  title: string;
  category: string;
  subtitle?: string;
  icon: React.ElementType;
  iconColor: string;
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tabId: string) => void;
  schoolAdminRefined?: boolean;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const { role, account, viewedDashboard } = useAuth();
  const { currentSchool } = useSchool();
  const { theme, toggleTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const isPlatformAdmin = Boolean(account?.is_superadmin) && !viewedDashboard;

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const allCommands = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [
      {
        id: 'tab-overview',
        title: isPlatformAdmin ? 'Platform Overview' : 'Dashboard Home',
        subtitle: 'Return to your primary workspace overview',
        category: 'Primary Navigation',
        icon: Home,
        iconColor: 'text-[#168BFF]',
        action: () => onNavigateTab('overview'),
        keywords: ['home', 'dashboard', 'overview'],
      },
      {
        id: 'tab-more',
        title: isPlatformAdmin ? 'Superadmin Command Centre' : 'All Modules Directory',
        subtitle: 'Browse every module authorized for your role',
        category: 'Primary Navigation',
        icon: LayoutGrid,
        iconColor: 'text-[#168BFF]',
        action: () => onNavigateTab('more'),
        keywords: ['all', 'modules', 'menu', 'directory', 'view all'],
      },
      {
        id: 'tab-profile',
        title: 'My Profile',
        subtitle: 'Identity, profile picture, and account details',
        category: 'Primary Navigation',
        icon: User,
        iconColor: 'text-sky-500',
        action: () => onNavigateTab('profile'),
        keywords: ['profile', 'avatar', 'account', 'photo'],
      },
      {
        id: 'tab-settings',
        title: 'Settings & Preferences',
        subtitle: 'Appearance, font, and technical preferences',
        category: 'Primary Navigation',
        icon: Settings,
        iconColor: 'text-slate-500 dark:text-slate-400',
        action: () => onNavigateTab('settings'),
        keywords: ['settings', 'preferences', 'font', 'theme'],
      },
    ];

    const groups = sidebarGroupsForRole(
      role || '',
      isPlatformAdmin,
      currentSchool.teacher_modules,
      currentSchool.learner_modules
    );

    const seen = new Set<string>(['overview', 'more', 'profile', 'settings']);
    groups.forEach((group) => {
      group.items.forEach((item) => {
        if (seen.has(item.id)) return;
        seen.add(item.id);
        list.push({
          id: `mod-${item.id}`,
          title: item.label,
          subtitle: group.label,
          category: group.label,
          icon: LayoutDashboard,
          iconColor: 'text-[#168BFF]',
          action: () => onNavigateTab(item.id),
          keywords: [item.id, item.label, group.label],
        });
      });
    });

    list.push({
      id: 'act-toggle-theme',
      title: theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      subtitle: 'Toggle between Dark and Light appearance',
      category: 'Quick Actions',
      icon: theme === 'dark' ? Sun : Moon,
      iconColor: 'text-amber-500',
      action: () => toggleTheme(),
      keywords: ['theme', 'dark', 'light', 'mode', 'appearance'],
    });

    return list;
  }, [
    role,
    isPlatformAdmin,
    currentSchool.teacher_modules,
    currentSchool.learner_modules,
    theme,
    onNavigateTab,
    toggleTheme,
  ]);

  const filteredCommands = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allCommands;
    return allCommands.filter((cmd) => {
      const titleMatch = cmd.title.toLowerCase().includes(q);
      const subMatch = cmd.subtitle?.toLowerCase().includes(q);
      const catMatch = cmd.category.toLowerCase().includes(q);
      const kwMatch = cmd.keywords?.some((k) => k.toLowerCase().includes(q));
      return titleMatch || subMatch || catMatch || kwMatch;
    });
  }, [allCommands, query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredCommands.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % (filteredCommands.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  const categories = Array.from(new Set(filteredCommands.map((c) => c.category)));

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/65 px-4 pt-16 backdrop-blur-md animate-fade-in sm:pt-20"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Quick module search"
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-[#C7D1DC] bg-white text-[#101820] shadow-2xl dark:border-white/15 dark:bg-[#0D1520] dark:text-[#F5F7FA]"
      >
        {/* Search Header */}
        <div className="flex items-center gap-3 border-b border-[#C7D1DC] bg-[#F4F6F8] p-4 dark:border-white/10 dark:bg-[#080D14] md:p-5">
          <Search className="h-5 w-5 shrink-0 text-[#168BFF]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search authorized modules or quick actions..."
            className="flex-1 bg-transparent text-sm text-[#101820] placeholder-[#697586] focus:outline-none dark:text-white dark:placeholder-slate-400 md:text-base"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="rounded-lg p-1 text-[#526071] hover:text-[#101820] dark:text-slate-400 dark:hover:text-white"
              title="Clear Search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-xl border border-[#C7D1DC] bg-white px-2.5 py-1 text-xs font-semibold text-[#526071] transition-colors hover:text-[#101820] dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white"
            title="Close Search Window"
          >
            <X className="h-3.5 w-3.5" />
            <span>Close</span>
          </button>
        </div>

        {/* Results Stream */}
        <div className="flex-1 space-y-4 overflow-y-auto p-3 custom-scrollbar">
          {filteredCommands.length > 0 ? (
            categories.map((category) => {
              const items = filteredCommands.filter((c) => c.category === category);
              return (
                <div key={category} className="space-y-1">
                  <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#526071] dark:text-slate-400">
                    {category}
                  </p>
                  {items.map((item) => {
                    const globalIdx = filteredCommands.indexOf(item);
                    const isSelected = globalIdx === selectedIndex;
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          item.action();
                          onClose();
                        }}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        className={`flex w-full items-center justify-between rounded-2xl p-3 text-left transition-all ${
                          isSelected
                            ? 'border border-[#168BFF]/40 bg-[#168BFF]/12 text-[#101820] shadow-xs dark:bg-[#168BFF]/20 dark:text-white'
                            : 'border border-transparent text-[#101820] hover:bg-[#F4F6F8] dark:text-slate-200 dark:hover:bg-white/5'
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3.5">
                          <div className={`shrink-0 rounded-xl border border-[#C7D1DC] bg-white p-2 dark:border-white/10 dark:bg-white/5 ${item.iconColor}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold md:text-sm">
                              {item.title}
                            </p>
                            {item.subtitle && (
                              <p className="truncate text-[11px] text-[#526071] dark:text-slate-400">
                                {item.subtitle}
                              </p>
                            )}
                          </div>
                        </div>

                        <ArrowRight
                          className={`h-4 w-4 shrink-0 transition-transform ${
                            isSelected ? 'translate-x-0.5 text-[#168BFF]' : 'text-slate-400 dark:text-slate-600'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-xs text-[#526071] dark:text-slate-400">
              <Search className="mx-auto mb-2 h-8 w-8 text-slate-400 dark:text-slate-600" />
              <p className="font-bold">No authorized modules match &ldquo;{query}&rdquo;</p>
              <p className="mt-1 text-[11px]">Try searching by module name, category, or &apos;Theme&apos;.</p>
            </div>
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="flex items-center justify-between border-t border-[#C7D1DC] bg-[#F4F6F8] px-4 py-3 text-[11px] text-[#526071] dark:border-white/10 dark:bg-[#080D14] dark:text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-[#C7D1DC] bg-white px-1.5 py-0.5 font-mono text-[10px] dark:border-white/10 dark:bg-white/10 dark:text-slate-300">
                ↑↓
              </kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-[#C7D1DC] bg-white px-1.5 py-0.5 font-mono text-[10px] dark:border-white/10 dark:bg-white/10 dark:text-slate-300">
                ↵
              </kbd>
              <span>Select</span>
            </span>
          </div>

          <span className="font-mono text-[10px] font-semibold text-[#168BFF]">
            GELEZA SA QUICK SEARCH
          </span>
        </div>
      </div>
    </div>
  );
};
