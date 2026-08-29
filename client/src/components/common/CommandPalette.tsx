import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Search,
  Sparkles,
  BookOpen,
  Calendar,
  Clock,
  MessageSquare,
  Users,
  Award,
  User,
  LayoutDashboard,
  ShieldCheck,
  Briefcase,
  GraduationCap,
  Megaphone,
  Moon,
  Sun,
  Palette,
  ArrowRight,
  Command,
  X,
  Home
} from 'lucide-react';

interface CommandItem {
  id: string;
  title: string;
  category: 'Pages & Portals' | 'CAPS Subjects & Study' | 'Smart AI Tools' | 'Quick Actions';
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
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const { role } = useAuth();
  const { toggleTheme, setTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Global key listener for Ctrl+K / Cmd+K and Esc
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const getCommands = (): CommandItem[] => {
    const list: CommandItem[] = [];

    // --- Pages & Portals ---
    if (role === 'learner') {
      list.push(
        {
          id: 'tab-overview',
          title: 'Home',
          subtitle: 'Academic summary, attendance overview & recent marks',
          category: 'Pages & Portals',
          icon: Home,
          iconColor: 'text-indigo-400',
          action: () => onNavigateTab('overview'),
          keywords: ['home', 'dashboard', 'marks', 'overview']
        },
        {
          id: 'tab-subjects',
          title: 'My Subjects',
          subtitle: 'Study materials, chapters, textbooks & curriculum topics',
          category: 'Pages & Portals',
          icon: BookOpen,
          iconColor: 'text-cyan-400',
          action: () => onNavigateTab('subjects'),
          keywords: ['textbooks', 'books', 'syllabus', 'modules', 'caps', 'subjects']
        },
        {
          id: 'tab-ai-tutor',
          title: 'AI Study Tutor & Quizzes',
          subtitle: 'Step-by-step math solver, practice quizzes & study companion',
          category: 'Smart AI Tools',
          icon: Sparkles,
          iconColor: 'text-amber-400',
          action: () => onNavigateTab('ai-tutor'),
          keywords: ['ai', 'tutor', 'quiz', 'math', 'solver', 'practice', 'study']
        },
        {
          id: 'tab-timetable',
          title: 'Weekly Class Timetable',
          subtitle: 'View today periods, subjects, rooms and educators',
          category: 'Pages & Portals',
          icon: Clock,
          iconColor: 'text-emerald-400',
          action: () => onNavigateTab('timetable'),
          keywords: ['schedule', 'periods', 'classes', 'venues']
        },
        {
          id: 'tab-calendar',
          title: 'School & Class Events Calendar',
          subtitle: 'Exam dates, sports fixtures, test schedules & holidays',
          category: 'Pages & Portals',
          icon: Calendar,
          iconColor: 'text-rose-400',
          action: () => onNavigateTab('calendar'),
          keywords: ['events', 'exams', 'tests', 'sports', 'fixtures']
        },
        {
          id: 'tab-messages',
          title: 'Message Center & Teacher Chat',
          subtitle: 'Chat directly with teachers, classmates & administration',
          category: 'Pages & Portals',
          icon: MessageSquare,
          iconColor: 'text-emerald-400',
          action: () => onNavigateTab('messages'),
          keywords: ['chat', 'teacher', 'inbox', 'messages', 'talk']
        },
        {
          id: 'tab-announcements',
          title: 'School Announcements & Notices',
          subtitle: 'Official broadcasts from the principal and school leadership',
          category: 'Pages & Portals',
          icon: Megaphone,
          iconColor: 'text-yellow-400',
          action: () => onNavigateTab('announcements'),
          keywords: ['notices', 'broadcast', 'news', 'principal']
        },
        {
          id: 'tab-profile',
          title: 'Learner Profile & Avatar',
          subtitle: 'Upload profile picture, change password & personal details',
          category: 'Pages & Portals',
          icon: User,
          iconColor: 'text-blue-400',
          action: () => onNavigateTab('profile'),
          keywords: ['profile', 'avatar', 'picture', 'photo', 'password']
        }
      );
    } else if (role === 'teacher') {
      list.push(
        {
          id: 'tab-overview',
          title: 'Educator Analytics Dashboard',
          subtitle: 'Class averages, workload metrics and lesson plans',
          category: 'Pages & Portals',
          icon: LayoutDashboard,
          iconColor: 'text-brand-400',
          action: () => onNavigateTab('overview'),
          keywords: ['teacher', 'overview', 'dashboard', 'analytics']
        },
        {
          id: 'tab-classes',
          title: 'Class Registers & Mark Allocation',
          subtitle: 'Mark daily learner attendance and record assessment scores',
          category: 'Pages & Portals',
          icon: Users,
          iconColor: 'text-cyan-400',
          action: () => onNavigateTab('classes'),
          keywords: ['roll', 'register', 'attendance', 'marks', 'assessment']
        },
        {
          id: 'tab-ai-tools',
          title: 'AI Lesson & Test Builder',
          subtitle: 'Generate DBE CAPS compliant lesson plans, tests and rubrics',
          category: 'Smart AI Tools',
          icon: Sparkles,
          iconColor: 'text-amber-400',
          action: () => onNavigateTab('ai-tools'),
          keywords: ['ai', 'lesson', 'plan', 'test', 'rubric', 'caps', 'generator']
        },
        {
          id: 'tab-calendar',
          title: 'School Event Calendar',
          subtitle: 'View term dates, exams, holidays & school fixtures',
          category: 'Pages & Portals',
          icon: Calendar,
          iconColor: 'text-rose-400',
          action: () => onNavigateTab('calendar'),
          keywords: ['events', 'publish', 'schedule', 'fixtures']
        },
        {
          id: 'tab-messages',
          title: 'Teacher Chat & Communications',
          subtitle: 'Direct messaging with students, parents & fellow teachers',
          category: 'Pages & Portals',
          icon: MessageSquare,
          iconColor: 'text-emerald-400',
          action: () => onNavigateTab('messages'),
          keywords: ['chat', 'inbox', 'messages']
        }
      );
    } else if (role === 'parent') {
      list.push(
        {
          id: 'tab-overview',
          title: 'Family Portal Dashboard',
          subtitle: 'Overview of all linked children academic progress',
          category: 'Pages & Portals',
          icon: LayoutDashboard,
          iconColor: 'text-amber-400',
          action: () => onNavigateTab('overview'),
          keywords: ['children', 'progress', 'family']
        },
        {
          id: 'tab-marks',
          title: 'Academic Reports & 7-Level Grades',
          subtitle: 'Official term marks, CAPS level ratings and performance',
          category: 'Pages & Portals',
          icon: Award,
          iconColor: 'text-indigo-400',
          action: () => onNavigateTab('marks'),
          keywords: ['report', 'card', 'marks', 'grades', 'levels']
        },
        {
          id: 'tab-attendance',
          title: 'Child Attendance Records',
          subtitle: 'Daily presence, arrival punctuality and absentee logs',
          category: 'Pages & Portals',
          icon: Users,
          iconColor: 'text-emerald-400',
          action: () => onNavigateTab('attendance'),
          keywords: ['attendance', 'absent', 'present', 'daily']
        },
        {
          id: 'tab-messages',
          title: 'Teacher Chat',
          subtitle: 'Direct communication line with subject educators',
          category: 'Pages & Portals',
          icon: MessageSquare,
          iconColor: 'text-emerald-400',
          action: () => onNavigateTab('messages'),
          keywords: ['chat', 'teacher', 'message', 'talk']
        }
      );
    } else if (role === 'admin') {
      list.push(
        {
          id: 'tab-overview',
          title: 'School Analytics & Leadership Hub',
          subtitle: 'Enrolment statistics, attendance percentages & audit metrics',
          category: 'Pages & Portals',
          icon: LayoutDashboard,
          iconColor: 'text-rose-400',
          action: () => onNavigateTab('overview'),
          keywords: ['analytics', 'metrics', 'school', 'admin']
        },
        {
          id: 'tab-users',
          title: 'Master User Directory & Permissions',
          subtitle: 'Manage teachers, learners, parents and administrative roles',
          category: 'Pages & Portals',
          icon: Users,
          iconColor: 'text-indigo-400',
          action: () => onNavigateTab('users'),
          keywords: ['users', 'learners', 'teachers', 'parents', 'accounts']
        },
        {
          id: 'tab-timetable',
          title: 'AI Master Timetable Allocator',
          subtitle: 'Generate conflict-free schedules and publish to teachers',
          category: 'Smart AI Tools',
          icon: Clock,
          iconColor: 'text-amber-400',
          action: () => onNavigateTab('timetable'),
          keywords: ['timetable', 'generate', 'publish', 'allocator', 'periods']
        },
        {
          id: 'tab-calendar',
          title: 'School Calendar Management',
          subtitle: 'Schedule terms, exams, sports days and holidays',
          category: 'Pages & Portals',
          icon: Calendar,
          iconColor: 'text-emerald-400',
          action: () => onNavigateTab('calendar'),
          keywords: ['calendar', 'events', 'holidays', 'terms']
        },
        {
          id: 'tab-announcements',
          title: 'Official School Broadcast Studio',
          subtitle: 'Dispatch notifications and notices to all user portals',
          category: 'Pages & Portals',
          icon: Megaphone,
          iconColor: 'text-cyan-400',
          action: () => onNavigateTab('announcements'),
          keywords: ['broadcast', 'notices', 'announcement', 'publish']
        },
        {
          id: 'tab-messages',
          title: 'School Chat Hub',
          subtitle: 'Direct communication channels across the entire school',
          category: 'Pages & Portals',
          icon: MessageSquare,
          iconColor: 'text-emerald-400',
          action: () => onNavigateTab('messages'),
          keywords: ['chat', 'whatsapp', 'messages']
        }
      );
    }

    // --- CAPS Subjects & Topics ---
    list.push(
      {
        id: 'subj-math',
        title: 'Mathematics (Grade 10-12)',
        subtitle: 'Functions, Trigonometry, Calculus, Euclidean Geometry & Statistics',
        category: 'CAPS Subjects & Study',
        icon: BookOpen,
        iconColor: 'text-cyan-400',
        action: () => onNavigateTab('subjects'),
        keywords: ['math', 'mathematics', 'calculus', 'algebra', 'geometry']
      },
      {
        id: 'subj-phsc',
        title: 'Physical Sciences (Physics & Chemistry)',
        subtitle: 'Newtonian Mechanics, Chemical Bonding, Doppler Effect & Organic Chemistry',
        category: 'CAPS Subjects & Study',
        icon: BookOpen,
        iconColor: 'text-indigo-400',
        action: () => onNavigateTab('subjects'),
        keywords: ['physics', 'chemistry', 'science', 'physical']
      },
      {
        id: 'subj-lfsc',
        title: 'Life Sciences (Biology)',
        subtitle: 'DNA & RNA Code of Life, Genetics, Evolution & Endocrine System',
        category: 'CAPS Subjects & Study',
        icon: BookOpen,
        iconColor: 'text-emerald-400',
        action: () => onNavigateTab('subjects'),
        keywords: ['biology', 'dna', 'genetics', 'evolution', 'life']
      },
      {
        id: 'subj-acc',
        title: 'Accounting & Financial Management',
        subtitle: 'GAAP Principles, Balance Sheets, Ledger Adjustments & Cash Budgets',
        category: 'CAPS Subjects & Study',
        icon: BookOpen,
        iconColor: 'text-amber-400',
        action: () => onNavigateTab('subjects'),
        keywords: ['accounting', 'finance', 'ledger', 'balance', 'budget']
      }
    );

    // --- Quick Theme & Accessibility Actions ---
    list.push(
      {
        id: 'act-toggle-theme',
        title: 'Toggle Dark / Light Mode',
        subtitle: 'Switch between Dark and Light workspace',
        category: 'Quick Actions',
        icon: Moon,
        iconColor: 'text-yellow-400',
        action: () => toggleTheme(),
        keywords: ['theme', 'dark', 'light', 'mode', 'color']
      },
      {
        id: 'act-navy',
        title: 'Apply Slate Navy Theme',
        subtitle: 'Classic school slate navy blue theme',
        category: 'Quick Actions',
        icon: Palette,
        iconColor: 'text-blue-400',
        action: () => setTheme('navy'),
        keywords: ['navy', 'blue', 'slate', 'theme']
      }
    );

    return list;
  };

  const allCommands = getCommands();

  const filteredCommands = allCommands.filter((cmd) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    const titleMatch = cmd.title.toLowerCase().includes(q);
    const subMatch = cmd.subtitle?.toLowerCase().includes(q);
    const catMatch = cmd.category.toLowerCase().includes(q);
    const kwMatch = cmd.keywords?.some((k) => k.toLowerCase().includes(q));
    return titleMatch || subMatch || catMatch || kwMatch;
  });

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

  // Group filtered commands by category
  const categories = Array.from(new Set(filteredCommands.map((c) => c.category)));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/75 backdrop-blur-xl animate-fade-in">
      <div
        className="w-full max-w-2xl rounded-3xl bg-surface-darker/95 border border-brand-500/30 shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-fade-in relative"
        style={{
          boxShadow: '0 0 50px -10px rgba(99, 102, 241, 0.4), 0 25px 50px -12px rgba(0, 0, 0, 0.7)'
        }}
      >
        {/* Search Header */}
        <div className="p-4 md:p-5 border-b border-white/10 flex items-center gap-3 bg-surface-dark/90">
          <Search className="w-5 h-5 text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search tabs, CAPS topics, AI tools, or actions... (e.g. 'Math', 'Timetable', 'AI')"
            className="flex-1 bg-transparent text-sm md:text-base text-white placeholder-slate-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
              title="Clear Search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold border border-white/10 transition-colors"
            title="Close Search Window"
          >
            <X className="w-3.5 h-3.5" />
            <span>Close</span>
          </button>
        </div>

        {/* Results Stream */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 divide-y divide-white/5">
          {filteredCommands.length > 0 ? (
            categories.map((category) => {
              const items = filteredCommands.filter((c) => c.category === category);
              return (
                <div key={category} className="pt-2 first:pt-0 space-y-1">
                  <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {category}
                  </p>
                  {items.map((item) => {
                    const globalIdx = filteredCommands.indexOf(item);
                    const isSelected = globalIdx === selectedIndex;
                    const Icon = item.icon;

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          item.action();
                          onClose();
                        }}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-gradient-to-r from-brand-600/30 via-brand-500/20 to-cyan-500/20 border border-brand-500/40 text-white shadow-md translate-x-1'
                            : 'hover:bg-white/5 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className={`p-2 rounded-xl bg-white/5 border border-white/10 shrink-0 ${item.iconColor}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs md:text-sm font-bold text-white truncate">
                              {item.title}
                            </p>
                            {item.subtitle && (
                              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                {item.subtitle}
                              </p>
                            )}
                          </div>
                        </div>

                        <ArrowRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'text-cyan-400 translate-x-0.5' : 'text-slate-600'}`} />
                      </div>
                    );
                  })}
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-slate-500 text-xs">
              <Search className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p className="font-bold text-slate-400">No results found for &ldquo;{query}&rdquo;</p>
              <p className="text-[11px] text-slate-500 mt-1">Try searching for &apos;Math&apos;, &apos;Timetable&apos;, &apos;Tutor&apos;, or &apos;Theme&apos;.</p>
            </div>
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="p-3 bg-surface-dark border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px] text-slate-300">↑↓</kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px] text-slate-300">↵</kbd>
              <span>Select</span>
            </span>
          </div>

          <span className="text-[10px] font-mono text-cyan-400">
            FUSION HIGH QUICK COMMAND 2.1
          </span>
        </div>
      </div>
    </div>
  );
};
