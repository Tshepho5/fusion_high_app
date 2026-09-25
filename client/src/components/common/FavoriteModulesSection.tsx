import React, { useState, useEffect, useMemo } from 'react';
import {
  Star,
  Plus,
  X,
  Search,
  ArrowRight,
  Sparkles,
  LayoutGrid,
  Check,
  MessageSquare,
  CalendarCheck,
  FileSpreadsheet,
  FileText,
  Award,
  Briefcase,
  Trophy,
  BookOpen,
  Clock,
  Calendar,
  Megaphone,
  Settings,
  Users,
  ShieldCheck,
  Layers,
  GraduationCap,
  CreditCard,
  User,
  HardDrive,
  Gamepad2,
  BookMarked,
  Swords,
  Bot,
  UserCheck,
  TrendingUp,
  Building2,
  HelpCircle,
  FolderOpen
} from 'lucide-react';

export interface CatalogModule {
  id: string;
  title: string;
  description: string;
  category: string;
  categoryLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  color?: string;
  iconBg?: string;
}

// Master catalogs per user role
export const ROLE_MODULE_CATALOGS: Record<string, CatalogModule[]> = {
  teacher: [
    {
      id: 'messages',
      title: 'Message Hub',
      description: 'Real-time messages with learners, parents, and educator staff.',
      category: 'communications',
      categoryLabel: 'Communications',
      icon: MessageSquare,
      badge: 'Real-Time',
      color: 'text-sky-400',
      iconBg: 'bg-sky-500/15 border-sky-500/30'
    },
    {
      id: 'attendance',
      title: 'Daily Attendance Register',
      description: 'Record morning roll-call and period-by-period class attendance.',
      category: 'classroom',
      categoryLabel: 'Classroom',
      icon: CalendarCheck,
      badge: 'Daily Roll',
      color: 'text-teal-400',
      iconBg: 'bg-teal-500/15 border-teal-500/30'
    },
    {
      id: 'assessments',
      title: 'CAPS Marksheets & Tasks',
      description: 'SBA weightings, test marks, and formal DBE assessments.',
      category: 'academics',
      categoryLabel: 'Academics',
      icon: FileSpreadsheet,
      badge: 'Marksheet',
      color: 'text-emerald-400',
      iconBg: 'bg-emerald-500/15 border-emerald-500/30'
    },
    {
      id: 'ai-tools',
      title: 'AI Lesson & Test Studio',
      description: 'Generate CAPS lesson plans, test papers, and automated rubrics.',
      category: 'ai',
      categoryLabel: 'AI Studio',
      icon: Sparkles,
      badge: 'AI Powered',
      color: 'text-purple-400',
      iconBg: 'bg-purple-500/15 border-purple-500/30'
    },
    {
      id: 'assignments',
      title: 'Digital Homework & Tasks',
      description: 'Create homework tasks with file attachments and voice notes.',
      category: 'academics',
      categoryLabel: 'Academics',
      icon: FileText,
      badge: 'Homework',
      color: 'text-pink-400',
      iconBg: 'bg-pink-500/15 border-pink-500/30'
    },
    {
      id: 'conduct',
      title: 'Merits & Disciplinary Conduct',
      description: 'Award academic merits, log disciplinary incidents, and detention.',
      category: 'classroom',
      categoryLabel: 'Classroom',
      icon: ShieldCheck,
      badge: 'Conduct',
      color: 'text-amber-400',
      iconBg: 'bg-amber-500/15 border-amber-500/30'
    },
    {
      id: 'timetable',
      title: 'Educator Timetable & Swaps',
      description: 'Weekly period schedule and educator period swap requests.',
      category: 'schedule',
      categoryLabel: 'Schedule',
      icon: Clock,
      badge: 'Periods',
      color: 'text-blue-400',
      iconBg: 'bg-blue-500/15 border-blue-500/30'
    },
    {
      id: 'resources',
      title: 'Past Papers & CAPS Vault',
      description: 'Download DBE past examination papers, exemplars, and memos.',
      category: 'academics',
      categoryLabel: 'Academics',
      icon: Layers,
      badge: 'CAPS Vault',
      color: 'text-violet-400',
      iconBg: 'bg-violet-500/15 border-violet-500/30'
    },
    {
      id: 'ptc',
      title: 'Parent Consultations',
      description: 'Schedule and manage appointments with learner guardians.',
      category: 'communications',
      categoryLabel: 'Communications',
      icon: Users,
      badge: 'PTC',
      color: 'text-sky-400',
      iconBg: 'bg-sky-500/15 border-sky-500/30'
    },
    {
      id: 'my-leave',
      title: 'Staff Leave & Relief Duties',
      description: 'Submit leave applications and view assigned relief periods.',
      category: 'admin',
      categoryLabel: 'Staff Duty',
      icon: Briefcase,
      badge: 'Duties',
      color: 'text-rose-400',
      iconBg: 'bg-rose-500/15 border-rose-500/30'
    },
    {
      id: 'exam-seating',
      title: 'Exam Seating Allocations',
      description: 'Room and candidate seat assignments for term exams.',
      category: 'academics',
      categoryLabel: 'Academics',
      icon: Award,
      badge: 'Exams',
      color: 'text-indigo-400',
      iconBg: 'bg-indigo-500/15 border-indigo-500/30'
    },
    {
      id: 'textbooks',
      title: 'Textbook & Asset Tracker',
      description: 'Issue, audit, and collect school-owned learning materials.',
      category: 'admin',
      categoryLabel: 'Assets',
      icon: BookOpen,
      badge: 'Assets',
      color: 'text-cyan-400',
      iconBg: 'bg-cyan-500/15 border-cyan-500/30'
    },
    {
      id: 'sports',
      title: 'Sports & Extracurriculars',
      description: 'Athletics, rugby, soccer, netball, chess, and club fixtures.',
      category: 'activities',
      categoryLabel: 'Campus Life',
      icon: Trophy,
      badge: 'Clubs',
      color: 'text-yellow-400',
      iconBg: 'bg-yellow-500/15 border-yellow-500/30'
    },
    {
      id: 'calendar',
      title: 'Academic & School Calendar',
      description: 'Official DBE term dates, public holidays, and school events.',
      category: 'schedule',
      categoryLabel: 'Schedule',
      icon: Calendar,
      badge: 'Official',
      color: 'text-blue-400',
      iconBg: 'bg-blue-500/15 border-blue-500/30'
    },
    {
      id: 'announcements',
      title: 'School Notices & Broadcasts',
      description: 'Urgent notices, circulars, and departmental memos.',
      category: 'communications',
      categoryLabel: 'Communications',
      icon: Megaphone,
      badge: 'Notices',
      color: 'text-cyan-400',
      iconBg: 'bg-cyan-500/15 border-cyan-500/30'
    },
    {
      id: 'settings',
      title: 'Technical Settings',
      description: 'Configure font family, theme appearance, and account options.',
      category: 'system',
      categoryLabel: 'System',
      icon: Settings,
      badge: 'Settings',
      color: 'text-slate-400',
      iconBg: 'bg-slate-500/15 border-slate-500/30'
    }
  ],
  learner: [
    {
      id: 'messages',
      title: 'Message Hub',
      description: 'Direct real-time chat with your teachers and study peers.',
      category: 'communications',
      categoryLabel: 'Communications',
      icon: MessageSquare,
      badge: 'Chat',
      color: 'text-sky-400',
      iconBg: 'bg-sky-500/15 border-sky-500/30'
    },
    {
      id: 'ai-tutor',
      title: 'AI 24/7 Voice Tutor',
      description: 'Interactive study partner across South Africa’s official languages.',
      category: 'study-ai',
      categoryLabel: 'Study & AI',
      icon: Bot,
      badge: 'AI Tutor',
      color: 'text-purple-400',
      iconBg: 'bg-purple-500/15 border-purple-500/30'
    },
    {
      id: 'assignments',
      title: 'Homework & Tasks',
      description: 'Submit homework files, audio answers, and view teacher grading.',
      category: 'academics',
      categoryLabel: 'Academics',
      icon: FileText,
      badge: 'Homework',
      color: 'text-pink-400',
      iconBg: 'bg-pink-500/15 border-pink-500/30'
    },
    {
      id: 'reports',
      title: 'CAPS Report Cards',
      description: 'Official DBE term reports with subject marks and principal signature.',
      category: 'academics',
      categoryLabel: 'Academics',
      icon: Award,
      badge: 'Reports',
      color: 'text-emerald-400',
      iconBg: 'bg-emerald-500/15 border-emerald-500/30'
    },
    {
      id: 'performance',
      title: 'Academic Analytics',
      description: 'Track your subject mark averages, trends, and target grades.',
      category: 'academics',
      categoryLabel: 'Academics',
      icon: TrendingUp,
      badge: 'Progress',
      color: 'text-indigo-400',
      iconBg: 'bg-indigo-500/15 border-indigo-500/30'
    },
    {
      id: 'career-advisor',
      title: 'Matric APS & Career Advisor',
      description: 'Calculate university APS points and explore degree pathways.',
      category: 'study-ai',
      categoryLabel: 'Study & AI',
      icon: User,
      badge: 'Matric',
      color: 'text-teal-400',
      iconBg: 'bg-teal-500/15 border-teal-500/30'
    },
    {
      id: 'bursaries',
      title: 'NSFAS & Tertiary Bursaries',
      description: 'Find matching government bursaries and tertiary scholarships.',
      category: 'finance',
      categoryLabel: 'Funding',
      icon: GraduationCap,
      badge: 'Bursaries',
      color: 'text-amber-400',
      iconBg: 'bg-amber-500/15 border-amber-500/30'
    },
    {
      id: 'timetable',
      title: 'Class Timetable',
      description: 'Your weekly school periods, room numbers, and educator schedule.',
      category: 'schedule',
      categoryLabel: 'Schedule',
      icon: Clock,
      badge: 'Periods',
      color: 'text-blue-400',
      iconBg: 'bg-blue-500/15 border-blue-500/30'
    },
    {
      id: 'arcade',
      title: 'Fusion Arcade Games',
      description: 'Gamified CAPS revision, quiz tournaments, and XP badges.',
      category: 'study-ai',
      categoryLabel: 'Study & AI',
      icon: Gamepad2,
      badge: 'Study Games',
      color: 'text-violet-400',
      iconBg: 'bg-violet-500/15 border-violet-500/30'
    },
    {
      id: 'sports',
      title: 'Sports & Extracurriculars',
      description: 'Athletics, rugby, soccer, netball, chess, and club fixtures.',
      category: 'activities',
      categoryLabel: 'Activities',
      icon: Trophy,
      badge: 'Clubs',
      color: 'text-yellow-400',
      iconBg: 'bg-yellow-500/15 border-yellow-500/30'
    },
    {
      id: 'textbooks',
      title: 'My Issued Textbooks',
      description: 'Track school textbooks and curriculum assets assigned to you.',
      category: 'study-ai',
      categoryLabel: 'Study & AI',
      icon: BookMarked,
      badge: 'Books',
      color: 'text-cyan-400',
      iconBg: 'bg-cyan-500/15 border-cyan-500/30'
    },
    {
      id: 'announcements',
      title: 'School Notices',
      description: 'Official school broadcasts, assembly notices, and news.',
      category: 'communications',
      categoryLabel: 'Communications',
      icon: Megaphone,
      badge: 'Notices',
      color: 'text-sky-400',
      iconBg: 'bg-sky-500/15 border-sky-500/30'
    }
  ],
  admin: [
    {
      id: 'command-center',
      title: 'Multi-School Command',
      description: 'Comparative analytics and institutional performance across schools.',
      category: 'governance',
      categoryLabel: 'Governance',
      icon: Building2,
      badge: 'SuperAdmin',
      color: 'text-purple-400',
      iconBg: 'bg-purple-500/15 border-purple-500/30'
    },
    {
      id: 'inter-school',
      title: 'Inter-School Derbies & League',
      description: 'Inter-school fixtures, tournaments, athletics derbies, and olympiads.',
      category: 'activities',
      categoryLabel: 'Campus Life',
      icon: Swords,
      badge: 'Derbies',
      color: 'text-amber-400',
      iconBg: 'bg-amber-500/15 border-amber-500/30'
    },
    {
      id: 'consultations',
      title: 'Parent-Educator Consultations',
      description: 'Schedule and manage appointments between educators and parents.',
      category: 'communications',
      categoryLabel: 'Communications',
      icon: Users,
      badge: 'Meetings',
      color: 'text-cyan-400',
      iconBg: 'bg-cyan-500/15 border-cyan-500/30'
    },
    {
      id: 'subjects',
      title: 'School Curriculum & Subjects',
      description: 'CAPS syllabus structure, department heads, and subject allocations.',
      category: 'academics',
      categoryLabel: 'Academics',
      icon: BookOpen,
      badge: 'CAPS Matrix',
      color: 'text-blue-400',
      iconBg: 'bg-blue-500/15 border-blue-500/30'
    },
    {
      id: 'marks',
      title: 'CAPS Mark Audits & Report Cards',
      description: 'Audit school-wide marks, SBA task weightings, and report cards.',
      category: 'academics',
      categoryLabel: 'Academics',
      icon: FileSpreadsheet,
      badge: 'Mark Audits',
      color: 'text-emerald-400',
      iconBg: 'bg-emerald-500/15 border-emerald-500/30'
    },
    {
      id: 'users',
      title: 'User Directory & Roles',
      description: 'Manage educators, learners, parents, access credentials, and roles.',
      category: 'governance',
      categoryLabel: 'Governance',
      icon: Users,
      badge: 'Directory',
      color: 'text-indigo-400',
      iconBg: 'bg-indigo-500/15 border-indigo-500/30'
    },
    {
      id: 'finance',
      title: 'School Fees & Invoicing',
      description: 'Generate term fee invoices, track receipts, and balance accounts.',
      category: 'finance',
      categoryLabel: 'Finances',
      icon: CreditCard,
      badge: 'Accounts',
      color: 'text-teal-400',
      iconBg: 'bg-teal-500/15 border-teal-500/30'
    },
    {
      id: 'timetable',
      title: 'Timetable Allocations',
      description: 'Master clash-free school timetable allocations for classes and staff.',
      category: 'operations',
      categoryLabel: 'Operations',
      icon: Clock,
      badge: 'Scheduling',
      color: 'text-sky-400',
      iconBg: 'bg-sky-500/15 border-sky-500/30'
    },
    {
      id: 'matric-projector',
      title: 'Matric Pass Rate Projector',
      description: 'Grade 12 NSC projected pass rates and subject risk indicators.',
      category: 'academics',
      categoryLabel: 'Academics',
      icon: TrendingUp,
      badge: 'Grade 12 NSC',
      color: 'text-pink-400',
      iconBg: 'bg-pink-500/15 border-pink-500/30'
    },
    {
      id: 'leave-relief',
      title: 'Staff Leave & Relief Duty',
      description: 'Manage educator leave requests, substitute cover, and relief timetable.',
      category: 'governance',
      categoryLabel: 'Governance',
      icon: Briefcase,
      badge: 'Relief Duty',
      color: 'text-amber-400',
      iconBg: 'bg-amber-500/15 border-amber-500/30'
    },
    {
      id: 'exam-seating',
      title: 'Exam Seating Master',
      description: 'Room and candidate seat assignments for term exams and matric.',
      category: 'operations',
      categoryLabel: 'Operations',
      icon: Award,
      badge: 'Exams',
      color: 'text-indigo-400',
      iconBg: 'bg-indigo-500/15 border-indigo-500/30'
    },
    {
      id: 'bursaries',
      title: 'Tertiary Bursary Engine',
      description: 'NSFAS and tertiary bursary opportunities matching database.',
      category: 'finance',
      categoryLabel: 'Finances',
      icon: GraduationCap,
      badge: 'Funding',
      color: 'text-purple-400',
      iconBg: 'bg-purple-500/15 border-purple-500/30'
    },
    {
      id: 'textbooks',
      title: 'Textbook Inventory',
      description: 'Issue, track, and audit school-owned learning material assets.',
      category: 'operations',
      categoryLabel: 'Operations',
      icon: HardDrive,
      badge: 'Assets',
      color: 'text-cyan-400',
      iconBg: 'bg-cyan-500/15 border-cyan-500/30'
    },
    {
      id: 'sports',
      title: 'Sports & Extracurriculars',
      description: 'Manage school sports codes, leagues, club fixtures, and results.',
      category: 'activities',
      categoryLabel: 'Campus Life',
      icon: Trophy,
      badge: 'Clubs & Teams',
      color: 'text-green-400',
      iconBg: 'bg-green-500/15 border-green-500/30'
    },
    {
      id: 'calendar',
      title: 'School Calendar',
      description: 'Official DBE term schedule, public holidays, and school calendar.',
      category: 'operations',
      categoryLabel: 'Operations',
      icon: Calendar,
      badge: 'Calendar',
      color: 'text-violet-400',
      iconBg: 'bg-violet-500/15 border-violet-500/30'
    },
    {
      id: 'announcements',
      title: 'Official Broadcasts',
      description: 'School-wide urgent circulars, broadcast bulletins, and notices.',
      category: 'communications',
      categoryLabel: 'Communications',
      icon: Megaphone,
      badge: 'Broadcasts',
      color: 'text-fuchsia-400',
      iconBg: 'bg-fuchsia-500/15 border-fuchsia-500/30'
    },
    {
      id: 'messages',
      title: 'Communication Hub',
      description: 'Direct institutional messaging with educators, parents, and learners.',
      category: 'communications',
      categoryLabel: 'Communications',
      icon: MessageSquare,
      badge: 'Direct Chat',
      color: 'text-sky-400',
      iconBg: 'bg-sky-500/15 border-sky-500/30'
    },
    {
      id: 'settings',
      title: 'Technical Settings',
      description: 'Configure institutional parameters, branding, and system options.',
      category: 'governance',
      categoryLabel: 'Governance',
      icon: Settings,
      badge: 'Settings',
      color: 'text-slate-400',
      iconBg: 'bg-slate-500/15 border-slate-500/30'
    }
  ],
  parent: [
    {
      id: 'messages',
      title: 'Message Hub',
      description: 'Direct communications with your child’s teachers and educators.',
      category: 'communications',
      categoryLabel: 'Communications',
      icon: MessageSquare,
      badge: 'Chat',
      color: 'text-sky-400',
      iconBg: 'bg-sky-500/15 border-sky-500/30'
    },
    {
      id: 'finance',
      title: 'School Fees & Receipts',
      description: 'Instant digital fee statements, official payment receipts, and balance.',
      category: 'finance',
      categoryLabel: 'Finance',
      icon: CreditCard,
      badge: 'Statements',
      color: 'text-emerald-400',
      iconBg: 'bg-emerald-500/15 border-emerald-500/30'
    },
    {
      id: 'ptc',
      title: 'Parent-Teacher Consultations',
      description: 'Book 1-on-1 term review slots with subject educators.',
      category: 'academics',
      categoryLabel: 'Academics',
      icon: Users,
      badge: 'Meetings',
      color: 'text-purple-400',
      iconBg: 'bg-purple-500/15 border-purple-500/30'
    },
    {
      id: 'attendance',
      title: 'Attendance & Absence Logs',
      description: 'Monitor daily attendance roll-call and absence excuses.',
      category: 'academics',
      categoryLabel: 'Academics',
      icon: CalendarCheck,
      badge: 'Attendance',
      color: 'text-teal-400',
      iconBg: 'bg-teal-500/15 border-teal-500/30'
    },
    {
      id: 'reports',
      title: 'Official CAPS Report Cards',
      description: 'Download signed term report cards with detailed comments.',
      category: 'academics',
      categoryLabel: 'Academics',
      icon: Award,
      badge: 'Reports',
      color: 'text-amber-400',
      iconBg: 'bg-amber-500/15 border-amber-500/30'
    },
    {
      id: 'bursaries',
      title: 'Tertiary Bursary Finder',
      description: 'Explore verified South African tertiary bursaries for your child.',
      category: 'finance',
      categoryLabel: 'Finance',
      icon: GraduationCap,
      badge: 'Funding',
      color: 'text-indigo-400',
      iconBg: 'bg-indigo-500/15 border-indigo-500/30'
    },
    {
      id: 'calendar',
      title: 'School Events Calendar',
      description: 'Official DBE term dates, parent meetings, and sport fixtures.',
      category: 'school',
      categoryLabel: 'School Life',
      icon: Calendar,
      badge: 'Dates',
      color: 'text-blue-400',
      iconBg: 'bg-blue-500/15 border-blue-500/30'
    },
    {
      id: 'announcements',
      title: 'School Notices & Bulletins',
      description: 'Official school announcements, circulars, and principal letters.',
      category: 'communications',
      categoryLabel: 'Communications',
      icon: Megaphone,
      badge: 'Notices',
      color: 'text-cyan-400',
      iconBg: 'bg-cyan-500/15 border-cyan-500/30'
    }
  ]
};

const DEFAULT_FAVORITE_IDS: Record<string, string[]> = {
  teacher: ['messages', 'attendance', 'assessments', 'ai-tools'],
  learner: ['messages', 'assignments', 'ai-tutor', 'reports'],
  admin: ['command-center', 'users', 'marks', 'finance', 'timetable', 'messages'],
  parent: ['messages', 'finance', 'ptc', 'attendance']
};

interface FavoriteModulesSectionProps {
  role: 'teacher' | 'learner' | 'admin' | 'parent';
  onNavigateTab: (tabId: string) => void;
  className?: string;
}

export const FavoriteModulesSection: React.FC<FavoriteModulesSectionProps> = ({
  role,
  onNavigateTab,
  className = ''
}) => {
  const storageKey = `geleza_favorites_${role}`;
  const catalog = useMemo(() => ROLE_MODULE_CATALOGS[role] || ROLE_MODULE_CATALOGS.teacher, [role]);

  // Load saved favorite IDs with sensible defaults
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return DEFAULT_FAVORITE_IDS[role] || ['messages', 'attendance', 'assessments'];
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Save to localStorage whenever favorites change
  const saveFavorites = (newIds: string[]) => {
    setFavoriteIds(newIds);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newIds));
      window.dispatchEvent(new Event('geleza_favorites_updated'));
    } catch (_) {}
  };

  // Sync across tabs/windows
  useEffect(() => {
    const handleSync = () => {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setFavoriteIds(parsed);
        }
      } catch (_) {}
    };
    window.addEventListener('geleza_favorites_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('geleza_favorites_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [storageKey]);

  // Quick remove single favorite with 1-click
  const handleRemoveFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = favoriteIds.filter((favId) => favId !== id);
    saveFavorites(updated);
  };

  // Toggle favorite in modal
  const handleToggleFavorite = (id: string) => {
    if (favoriteIds.includes(id)) {
      saveFavorites(favoriteIds.filter((favId) => favId !== id));
    } else {
      saveFavorites([...favoriteIds, id]);
    }
  };

  // Resolved favorite module objects
  const favoriteModules = useMemo(() => {
    return favoriteIds
      .map((id) => catalog.find((m) => m.id === id))
      .filter((m): m is CatalogModule => Boolean(m));
  }, [favoriteIds, catalog]);

  // Categories available for filtering in modal
  const categories = useMemo(() => {
    const set = new Set<string>();
    catalog.forEach((m) => set.add(m.category));
    return ['all', ...Array.from(set)];
  }, [catalog]);

  // Filtered modules in modal
  const modalFilteredModules = useMemo(() => {
    return catalog.filter((m) => {
      const matchesCategory = selectedCategory === 'all' || m.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        m.title.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        (m.badge && m.badge.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [catalog, selectedCategory, searchQuery]);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 1. Header Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 dark:text-amber-400 flex items-center justify-center border border-amber-500/25 shadow-xs">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-extrabold font-display text-slate-900 dark:text-white tracking-tight">
                Favorite Modules
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/25 font-mono">
                {favoriteModules.length} Pinned
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            title="Add or remove favorite modules from your home page"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Favorites</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('more')}
            className="hidden sm:flex px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 text-xs font-semibold transition-all items-center gap-1 cursor-pointer active:scale-95"
            title="Browse all modules in the Menu page"
          >
            <span>All in Menu</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 2. Favorites Grid or Empty State */}
      {favoriteModules.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {favoriteModules.map((mod) => {
            const IconComp = mod.icon;
            return (
              <div
                key={mod.id}
                onClick={() => onNavigateTab(mod.id)}
                className="group relative p-3.5 rounded-2xl bg-white dark:bg-[#0F1A24] border border-slate-200/90 dark:border-[#1B2E3D] hover:border-cyan-500/50 dark:hover:border-cyan-500/40 hover:shadow-lg dark:hover:shadow-cyan-950/20 transition-all cursor-pointer flex flex-col justify-between gap-3 overflow-hidden"
              >
                {/* Remove Quick Button (Stop Propagation) */}
                <button
                  type="button"
                  onClick={(e) => handleRemoveFavorite(e, mod.id)}
                  title="Remove from home page favorites"
                  className="absolute top-2.5 right-2.5 w-6 h-6 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-rose-500 hover:text-white text-slate-400 dark:text-slate-400 border border-slate-200/80 dark:border-white/10 flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 active:scale-90 cursor-pointer z-10"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {/* Top Info */}
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                      mod.iconBg || 'bg-cyan-500/15 border-cyan-500/30'
                    }`}
                  >
                    <IconComp
                      className={`w-4.5 h-4.5 ${mod.color || 'text-cyan-600 dark:text-cyan-400'}`}
                    />
                  </div>
                  <div className="pr-6">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors line-clamp-1">
                      {mod.title}
                    </h3>
                    {mod.badge && (
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block line-clamp-1">
                        {mod.badge}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Launch Link */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-[#1B2E3D]/60 text-[11px] text-slate-400 dark:text-slate-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-300">
                  <span className="font-semibold text-[10px] uppercase tracking-wider">Launch</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1 text-cyan-500" />
                </div>
              </div>
            );
          })}

          {/* Add Module Quick Tile */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="p-3.5 rounded-2xl border-2 border-dashed border-slate-200 dark:border-[#1B2E3D] hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all flex flex-col items-center justify-center gap-2 text-center group cursor-pointer min-h-[92px]"
            title="Click to add more favorite modules"
          >
            <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-white/5 group-hover:bg-cyan-500/20 text-slate-400 dark:text-slate-400 group-hover:text-cyan-500 flex items-center justify-center transition-colors">
              <Plus className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
              Add More
            </span>
          </button>
        </div>
      ) : (
        /* Empty State */
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0F1A24] border border-slate-200/90 dark:border-[#1B2E3D] flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                No favorite modules added yet
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Pin your most-used modules here on the home page for instant 1-click access.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Favorite Modules</span>
          </button>
        </div>
      )}

      {/* 3. Interactive Modal: Add / Manage Favorite Modules */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[88vh] rounded-3xl bg-white dark:bg-[#0B151F] border border-slate-200 dark:border-[#1B2E3D] shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-white animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-[#1B2E3D] flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-[#0F1A24]/70">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold font-display">
                    Add Favorite Modules to Home Page
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Select the modules you want displayed on your home page dashboard.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search & Filter Toolbar */}
            <div className="p-3.5 sm:px-5 border-b border-slate-100 dark:border-[#1B2E3D] space-y-2.5 bg-slate-50/30 dark:bg-[#0F1A24]/40">
              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search modules by name, topic, or keyword..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-[#070D14] border border-slate-200 dark:border-[#1B2E3D] text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg font-bold capitalize transition-all shrink-0 cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-cyan-500 text-slate-950 shadow-xs'
                        : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                    }`}
                  >
                    {cat === 'all' ? 'All Modules' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Modules Selection List */}
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-2">
              {modalFilteredModules.length > 0 ? (
                modalFilteredModules.map((mod) => {
                  const isFav = favoriteIds.includes(mod.id);
                  const IconComp = mod.icon;
                  return (
                    <div
                      key={mod.id}
                      onClick={() => handleToggleFavorite(mod.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isFav
                          ? 'bg-cyan-500/10 border-cyan-500/40 shadow-xs'
                          : 'bg-white dark:bg-[#0F1A24]/60 border-slate-200/90 dark:border-[#1B2E3D] hover:border-slate-300 dark:hover:border-cyan-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                            mod.iconBg || 'bg-cyan-500/15 border-cyan-500/30'
                          }`}
                        >
                          <IconComp
                            className={`w-4.5 h-4.5 ${mod.color || 'text-cyan-600 dark:text-cyan-400'}`}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                              {mod.title}
                            </h4>
                            {mod.badge && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10">
                                {mod.badge}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Toggle Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(mod.id);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                          isFav
                            ? 'bg-cyan-500 hover:bg-cyan-600 text-slate-950 shadow-xs'
                            : 'bg-slate-100 hover:bg-cyan-500/15 dark:bg-white/5 dark:hover:bg-cyan-500/15 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10'
                        }`}
                      >
                        {isFav ? (
                          <>
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Added</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No modules match your search query.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:px-5 border-t border-slate-200 dark:border-[#1B2E3D] flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-[#0F1A24]/70">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                {favoriteIds.length} module{favoriteIds.length === 1 ? '' : 's'} on Home page
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    onNavigateTab('more');
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  Browse Full Menu
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
