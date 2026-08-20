import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme, AppTheme, AppFont } from '../../context/ThemeContext';
import {
  Sparkles,
  BookOpen,
  Calendar,
  Users,
  Award,
  GraduationCap,
  Briefcase,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Clock,
  MessageSquare,
  ChevronRight,
  Layers,
  Star,
  Activity,
  Zap,
  Lock,
  Globe,
  Sun,
  Moon,
  Palette,
  Type,
  Check,
  Calculator,
  Atom,
  Dna,
  TrendingUp,
  Terminal,
  Compass,
  PenTool,
  Landmark,
  Scale
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { isAuthenticated, role } = useAuth();
  const { theme, font, setTheme, setFont, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Theme dropdown state
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  // Active role showcase tab
  const [activeFeatureTab, setActiveFeatureTab] = useState<'learner' | 'teacher' | 'parent' | 'admin'>('learner');

  // Close theme menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setShowThemeMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const THEMES: { id: AppTheme; label: string; bg: string }[] = [
    { id: 'dark', label: 'Midnight Dark', bg: 'bg-slate-900 border-indigo-500' },
    { id: 'navy', label: 'Executive Navy', bg: 'bg-[#0a1936] border-blue-400' },
    { id: 'cyberpunk', label: 'Cyberpunk Neon', bg: 'bg-[#0e0e24] border-cyan-400' },
    { id: 'light', label: 'Classic Light', bg: 'bg-white text-slate-900 border-slate-300' },
  ];

  const FONTS: { id: AppFont; label: string }[] = [
    { id: 'sans', label: 'Modern Sans (Inter)' },
    { id: 'display', label: 'Geometric (Outfit)' },
    { id: 'serif', label: 'Academic (Playfair)' },
    { id: 'mono', label: 'Tech Code (Mono)' },
  ];

  // High school subjects for the moving ribbon
  const MARQUEE_SUBJECTS = [
    { name: 'Mathematics Gr 8-12', icon: Calculator, color: 'text-indigo-400', highlight: 'Calculus & Geometry' },
    { name: 'Physical Sciences', icon: Atom, color: 'text-cyan-400', highlight: 'Physics & Chemistry' },
    { name: 'Life Sciences', icon: Dna, color: 'text-emerald-400', highlight: 'Genetics & Evolution' },
    { name: 'Accounting & EMS', icon: Scale, color: 'text-amber-400', highlight: 'Debtors & Ledgers' },
    { name: 'Information Tech (IT)', icon: Terminal, color: 'text-blue-400', highlight: 'OOP, DB & Coding' },
    { name: 'Business Studies', icon: TrendingUp, color: 'text-purple-400', highlight: 'Corporate Governance' },
    { name: 'Geography', icon: Compass, color: 'text-teal-400', highlight: 'GIS & Climatology' },
    { name: 'English Home Lang', icon: BookOpen, color: 'text-rose-400', highlight: 'Literature & Essays' },
    { name: 'Engineering Graphics', icon: PenTool, color: 'text-yellow-400', highlight: 'Isometric Drafting' },
    { name: 'Tourism & History', icon: Landmark, color: 'text-orange-400', highlight: 'Heritage & Society' },
  ];

  const ROLE_SHOWCASES = {
    learner: {
      title: 'Learner Workspace',
      badge: 'STUDENT PORTAL',
      badgeColor: 'bg-brand-500/20 text-brand-300 border-brand-500/30',
      description: 'Everything learners need to stay on track: personalized timetables, textbook library, homework, and CAPS revision markbooks.',
      highlights: [
        'Live period-by-period class timetable with venue indicators',
        'Direct access to Grade 8-12 CAPS textbooks and learning materials',
        'Instant homework submissions and term mark tracking',
        'Built-in academic support and test revision aids'
      ],
      previewStats: [
        { label: 'Curriculum Subjects', value: '48 Topics' },
        { label: 'Class Timetable', value: 'Live Periods' },
        { label: 'Attendance Rate', value: '98.5%' },
      ],
      portalRoute: '/dashboard/learner'
    },
    teacher: {
      title: 'Educator & Faculty Workspace',
      badge: 'FACULTY PORTAL',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      description: 'Streamline lesson planning, submit term marks, manage daily attendance, and initiate seamless period swaps with peers.',
      highlights: [
        'Automated lesson planning aligned to school term schedules',
        'Teacher-to-teacher period exchange workflow with atomic database sync',
        'Real-time class attendance registers and mark book submissions',
        'Instant multi-grade test paper preparation tools'
      ],
      previewStats: [
        { label: 'Prep Time Saved', value: '75%' },
        { label: 'Classes Managed', value: 'Grades 8 - 12' },
        { label: 'Mark Record Sync', value: 'Instant' },
      ],
      portalRoute: '/dashboard/teacher'
    },
    parent: {
      title: 'Parent & Guardian Portal',
      badge: 'FAMILY ENGAGEMENT',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      description: 'Keep track of your child’s academic performance, monitor daily gate attendance, and access official CAPS term reports.',
      highlights: [
        'Multi-child linking under a single parent account',
        'Live daily attendance logs, arrival punctuality, and notifications',
        'Download and print official term report cards with school seal',
        'Direct communication with subject teachers and school management'
      ],
      previewStats: [
        { label: 'Linked Children', value: 'Multi-Child' },
        { label: 'Attendance Alerts', value: 'Real-Time' },
        { label: 'Report Status', value: 'CAPS Certified' },
      ],
      portalRoute: '/dashboard/parent'
    },
    admin: {
      title: 'Institutional Administration',
      badge: 'ADMIN COMMAND',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      description: 'Master Timetable Allocator, teacher workload balancer, user directory management, and school-wide broadcast studio.',
      highlights: [
        'Master Timetable Allocator with automatic teacher workload balancing',
        'Publish schedules for teacher review before learner release',
        'Comprehensive user directory with role-based permissions',
        'Instant multi-channel announcement broadcasts to all portals'
      ],
      previewStats: [
        { label: 'Enrolled Learners', value: '1,250+' },
        { label: 'Active Educators', value: '42 Staff' },
        { label: 'Timetable Status', value: 'Master Schedule' },
      ],
      portalRoute: '/dashboard/admin'
    }
  };

  const currentShowcase = ROLE_SHOWCASES[activeFeatureTab];

  return (
    <div className="min-h-screen bg-canvas-dark text-slate-100 flex flex-col selection:bg-brand-500 selection:text-white relative overflow-hidden transition-colors duration-300">
      {/* Background Atmosphere & Ambient Glows */}
      <div className="absolute top-[-10%] left-[15%] w-[550px] h-[550px] rounded-full bg-brand-600/15 blur-[140px] pointer-events-none animate-pulse-glow" />
      <div className="absolute top-[30%] right-[-8%] w-[500px] h-[500px] rounded-full bg-cyan-500/15 blur-[140px] pointer-events-none animate-float-slow" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-indigo-700/15 blur-[150px] pointer-events-none animate-pulse-glow" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Header Navigation with Theme Switcher */}
      <header className="sticky top-0 z-50 px-4 md:px-8 py-3.5 backdrop-blur-xl bg-surface-darker/80 border-b border-white/10 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand Logo with Official FH Emblem & Slogan */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-white/5 p-1 border border-white/15 flex items-center justify-center shadow-glow-indigo group-hover:scale-105 transition-transform backdrop-blur-md">
              <img src="/assets/FH.png" alt="Fusion High Logo" className="w-full h-full object-contain drop-shadow-md" />
            </div>
            <div>
              <span className="font-display text-lg font-extrabold tracking-tight text-white block leading-tight">
                FUSION HIGH
              </span>
              <span className="text-[9px] font-mono tracking-wider text-cyan-400 uppercase font-bold block">
                ONE SCHOOL • ONE CONNECTION • LIMITLESS POTENTIAL
              </span>
            </div>
          </Link>

          {/* Quick Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
            <a href="#showcase" className="hover:text-white transition-colors">Portals & Roles</a>
            <a href="#features" className="hover:text-white transition-colors">Platform Features</a>
            <a href="#curriculum" className="hover:text-white transition-colors">CAPS Curriculum</a>
          </nav>

          {/* Controls: Theme & Auth CTAs */}
          <div className="flex items-center gap-2.5">
            {/* Quick Dark/Light Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all border border-white/10"
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
              aria-label="Toggle Theme"
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4 text-indigo-500" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
            </button>

            {/* Theme & Font Customizer Dropdown */}
            <div className="relative" ref={themeMenuRef}>
              <button
                onClick={() => setShowThemeMenu(!showThemeMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-dark hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-semibold transition-all hover:border-brand-500/50"
                title="Change Color Theme & Typography"
              >
                <Palette className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline capitalize">{theme}</span>
              </button>

              {showThemeMenu && (
                <div className="absolute right-0 mt-2 w-72 rounded-3xl bg-surface-dark border border-white/15 p-4 shadow-2xl z-50 animate-fade-in text-xs space-y-3.5 backdrop-blur-2xl">
                  <div>
                    <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-2 flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-brand-400" />
                      Select Color Theme
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {THEMES.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setTheme(t.id)}
                          className={`p-2 rounded-xl border text-left flex items-center justify-between transition-all ${
                            theme === t.id
                              ? 'border-brand-500 bg-brand-600/20 text-white font-bold shadow-glow-indigo'
                              : 'border-white/10 bg-surface-darker text-slate-400 hover:text-white hover:border-white/20'
                          }`}
                        >
                          <span className="text-[11px] truncate">{t.label}</span>
                          {theme === t.id && <Check className="w-3.5 h-3.5 text-brand-400 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/10">
                    <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-2 flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5 text-cyan-400" />
                      Select Typography Font
                    </p>
                    <div className="space-y-1.5">
                      {FONTS.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setFont(f.id)}
                          className={`w-full p-2 rounded-xl text-left flex items-center justify-between transition-all ${
                            font === f.id
                              ? 'bg-cyan-600/20 text-cyan-300 font-bold border border-cyan-500/30'
                              : 'bg-surface-darker text-slate-400 hover:text-white border border-white/5'
                          }`}
                        >
                          <span className="text-[11px]">{f.label}</span>
                          {font === f.id && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Admissions Quick Apply Button */}
            <a
              href="/application.html"
              className="hidden lg:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-extrabold transition-all hover:scale-105 shadow-sm"
              title="Apply for Grade 8 or Grade 9-12 Admissions"
            >
              <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Apply for Admission</span>
              <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-1.5 py-0.2 rounded-full font-mono">Gr 8–12</span>
            </a>

            {/* Auth CTA */}
            {isAuthenticated ? (
              <button
                onClick={() => navigate(`/dashboard/${role || 'learner'}`)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-500 text-white font-bold text-xs shadow-glow-indigo transition-all hover:scale-105"
              >
                <span>Enter Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-2 rounded-xl bg-surface-dark hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-bold transition-all hover:border-white/20"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-500 text-white text-xs font-bold shadow-glow-indigo transition-all hover:scale-105"
                >
                  <span>Get Started</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Moving Subjects Ribbon Right Under Header */}
      <section className="w-full py-2.5 bg-surface-darker/90 border-b border-white/10 relative overflow-hidden backdrop-blur-md z-40">
        <div className="flex space-x-6 animate-marquee whitespace-nowrap">
          {[...MARQUEE_SUBJECTS, ...MARQUEE_SUBJECTS].map((sub, i) => {
            const IconComponent = sub.icon;
            return (
              <div
                key={i}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-surface-dark/90 border border-white/10 text-xs font-semibold text-slate-300 hover:border-brand-500/40 transition-colors shadow-sm group"
              >
                <div className="p-1 rounded-lg bg-white/5 flex items-center justify-center">
                  <IconComponent className={`w-3.5 h-3.5 ${sub.color}`} />
                </div>
                <span className="text-white font-bold">{sub.name}</span>
                <span className="text-slate-500">•</span>
                <span className="text-cyan-300 text-[11px] font-mono">{sub.highlight}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Hero Section */}
      <section className="relative pt-12 md:pt-20 pb-16 px-4 md:px-8 max-w-7xl mx-auto flex flex-col items-center text-center space-y-8">
        {/* Floating Decorative Glass Telemetry Badges */}
        <div className="hidden xl:block absolute left-2 top-28 p-3.5 rounded-2xl bg-surface-dark/90 border border-white/10 shadow-2xl backdrop-blur-xl animate-float text-left space-y-1 max-w-[210px]">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[10px] font-bold text-emerald-400 font-mono">GATE LOG 07:42 AM</span>
          </div>
          <p className="text-xs text-white font-bold">Attendance Verified</p>
          <p className="text-[10px] text-slate-400">Grade 11A • Science Lab</p>
        </div>

        <div className="hidden xl:block absolute right-2 top-24 p-3.5 rounded-2xl bg-surface-dark/90 border border-brand-500/30 shadow-glow-indigo backdrop-blur-xl animate-float-delayed text-left space-y-1 max-w-[220px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-300 font-mono">CAPS LEVEL 7</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xs text-white font-bold">88% Distinction Aggregate</p>
          <p className="text-[10px] text-slate-400">Term 3 Report Sealed</p>
        </div>

        {/* Release & Admissions Pill */}
        <div className="inline-flex flex-wrap items-center justify-center gap-2.5 px-4 py-1.5 rounded-full bg-surface-dark/90 border border-emerald-500/40 text-xs font-medium text-slate-200 shadow-lg shadow-emerald-500/10 animate-fade-in backdrop-blur-md">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-emerald-300 font-extrabold tracking-wide">ADMISSIONS OPEN</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-300">Grade 8 & Grades 9–12 Transfers</span>
          <span className="text-slate-500">•</span>
          <span className="text-cyan-300 font-bold">&lt; 30 Learners / Class Limit</span>
        </div>

        {/* Hero Title */}
        <div className="space-y-4 max-w-4xl">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black font-display tracking-tight text-white leading-[1.1]">
            The Modern Operating System for{' '}
            <span className="bg-gradient-to-r from-brand-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
              South African High Schools
            </span>
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Unifying learners, educators, parents, and school executives with automated CAPS lesson planning, live class timetables, AI document verification, and verified attendance tracking.
          </p>
        </div>

        {/* Hero Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 pt-2 w-full justify-center max-w-2xl">
          {/* PRIMARY HERO CTA: APPLY FOR ADMISSION */}
          <a
            href="/application.html"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-extrabold text-sm shadow-xl shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2.5 group"
          >
            <GraduationCap className="w-5 h-5 text-emerald-100 group-hover:scale-110 transition-transform" />
            <span>Apply for Admission (Gr 8–12)</span>
            <ArrowRight className="w-4 h-4 text-emerald-100" />
          </a>

          {/* SECONDARY CTA: LAUNCH PORTAL */}
          <Link
            to="/login"
            className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-surface-dark/90 hover:bg-white/10 text-white border border-white/15 hover:border-cyan-400/50 text-sm font-bold transition-all flex items-center justify-center gap-2 backdrop-blur-md"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Portal Login</span>
          </Link>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full pt-6 max-w-4xl">
          <div className="p-4 rounded-3xl bg-surface-dark/80 border border-white/10 backdrop-blur-md shadow-lg text-center space-y-1 hover:border-brand-500/50 transition-all">
            <p className="text-2xl md:text-3xl font-black font-display text-white">100%</p>
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">CAPS DBE Aligned</p>
          </div>
          <div className="p-4 rounded-3xl bg-surface-dark/80 border border-white/10 backdrop-blur-md shadow-lg text-center space-y-1 hover:border-cyan-500/50 transition-all">
            <p className="text-2xl md:text-3xl font-black font-display text-cyan-400">4 Portals</p>
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Learner, Staff, Parent, Admin</p>
          </div>
          <div className="p-4 rounded-3xl bg-surface-dark/80 border border-white/10 backdrop-blur-md shadow-lg text-center space-y-1 hover:border-emerald-500/50 transition-all">
            <p className="text-2xl md:text-3xl font-black font-display text-emerald-400">Real-Time</p>
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Attendance & Gate Logs</p>
          </div>
          <div className="p-4 rounded-3xl bg-surface-dark/80 border border-white/10 backdrop-blur-md shadow-lg text-center space-y-1 hover:border-amber-500/50 transition-all">
            <p className="text-2xl md:text-3xl font-black font-display text-amber-400">POPIA</p>
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">13-Digit SA ID Security</p>
          </div>
        </div>
      </section>

      {/* Role Showcase Tabs */}
      <section id="showcase" className="py-16 px-4 md:px-8 max-w-7xl mx-auto w-full space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl md:text-4xl font-extrabold font-display text-white">
            Tailored Portals for Every Stakeholder
          </h2>
          <p className="text-xs md:text-sm text-slate-400 max-w-xl mx-auto">
            Choose a profile below to preview the dedicated tools built for learners, teachers, parents, and administrators.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex justify-center">
          <div className="flex gap-2 p-1.5 rounded-3xl bg-surface-dark border border-white/10 backdrop-blur-md overflow-x-auto max-w-full shadow-lg">
            <button
              onClick={() => setActiveFeatureTab('learner')}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all ${
                activeFeatureTab === 'learner'
                  ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-glow-indigo scale-105'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Learners</span>
            </button>
            <button
              onClick={() => setActiveFeatureTab('teacher')}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all ${
                activeFeatureTab === 'teacher'
                  ? 'bg-gradient-to-r from-brand-600 to-cyan-600 text-white shadow-glow-cyan scale-105'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Teachers</span>
            </button>
            <button
              onClick={() => setActiveFeatureTab('parent')}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all ${
                activeFeatureTab === 'parent'
                  ? 'bg-gradient-to-r from-brand-600 to-amber-600 text-white shadow-glow-amber scale-105'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Parents</span>
            </button>
            <button
              onClick={() => setActiveFeatureTab('admin')}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all ${
                activeFeatureTab === 'admin'
                  ? 'bg-gradient-to-r from-brand-600 to-rose-600 text-white shadow-glow-rose scale-105'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>School Admins</span>
            </button>
          </div>
        </div>

        {/* Selected Role Card */}
        <div className="p-8 md:p-10 rounded-3xl bg-surface-dark/90 border border-white/10 shadow-2xl backdrop-blur-xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-fade-in">
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-2">
              <span className={`px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider font-bold border ${currentShowcase.badgeColor}`}>
                {currentShowcase.badge}
              </span>
              <h3 className="text-2xl md:text-3xl font-extrabold font-display text-white">
                {currentShowcase.title}
              </h3>
              <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                {currentShowcase.description}
              </p>
            </div>

            <div className="space-y-3">
              {currentShowcase.highlights.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 text-xs text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <Link
                to={currentShowcase.portalRoute}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-500 text-white font-bold text-xs shadow-md transition-all hover:scale-105"
              >
                <span>Launch {currentShowcase.title}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="p-6 rounded-3xl bg-surface-darker border border-white/10 shadow-inner space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-white/5 pb-2">
                Live Portal Highlights
              </h4>
              <div className="space-y-3">
                {currentShowcase.previewStats.map((stat, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 rounded-2xl bg-surface-dark border border-white/5">
                    <span className="text-xs text-slate-400">{stat.label}</span>
                    <span className="text-xs font-bold text-cyan-300 font-mono">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Platform Features */}
      <section id="features" className="py-16 px-4 md:px-8 max-w-7xl mx-auto w-full space-y-10">
        <div className="text-center space-y-2">
          <h2 className="text-2xl md:text-4xl font-extrabold font-display text-white">
            Engineered for Modern Education
          </h2>
          <p className="text-xs md:text-sm text-slate-400 max-w-xl mx-auto">
            Everything high schools require to operate efficiently, securely, and seamlessly.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-surface-dark border border-white/10 hover:border-brand-500/40 shadow-xl space-y-3 transition-all hover:-translate-y-1">
            <div className="w-12 h-12 rounded-2xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold font-display text-white">Live Class Timetable</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Period-by-period class timetables, venue allocations, and teacher schedules accessible across learner, parent, and staff portals.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-surface-dark border border-white/10 hover:border-brand-500/40 shadow-xl space-y-3 transition-all hover:-translate-y-1">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold font-display text-white">Interactive School Calendar</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Monthly school events, class test dates, sports fixtures, and exam calendars filtered by grade and user role with audience targeting.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-surface-dark border border-white/10 hover:border-brand-500/40 shadow-xl space-y-3 transition-all hover:-translate-y-1">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold font-display text-white">CAPS 7-Level Grading & Reports</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Standardized South African 7-Level achievement calculation with clean PDF and print report card generation with official school stamp.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-surface-dark border border-white/10 hover:border-brand-500/40 shadow-xl space-y-3 transition-all hover:-translate-y-1">
            <div className="w-12 h-12 rounded-2xl bg-amber-600/20 text-amber-400 flex items-center justify-center">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold font-display text-white">Unified Communication Hub</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Instant messaging between educators, learners, and parents with role permissions, profile avatars, and school notice broadcasts.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-surface-dark border border-white/10 hover:border-brand-500/40 shadow-xl space-y-3 transition-all hover:-translate-y-1">
            <div className="w-12 h-12 rounded-2xl bg-rose-600/20 text-rose-400 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold font-display text-white">Strict SA ID & POPIA Security</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              13-digit SA ID number validation, Luhn algorithm verification, automatic bcrypt password hashing, and role isolation.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-surface-dark border border-white/10 hover:border-brand-500/40 shadow-xl space-y-3 transition-all hover:-translate-y-1">
            <div className="w-12 h-12 rounded-2xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold font-display text-white">Digital Textbook & Study Library</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Streamlined textbook viewer and CAPS curriculum learning assets categorized across Science, Commerce, and General streams.
            </p>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section id="curriculum" className="py-16 px-4 md:px-8 max-w-5xl mx-auto w-full text-center">
        <div className="p-10 md:p-12 rounded-3xl bg-gradient-to-tr from-brand-700/40 via-surface-dark to-cyan-900/40 border border-brand-500/30 shadow-glow-indigo relative overflow-hidden space-y-6">
          <h2 className="text-2xl md:text-4xl font-extrabold font-display text-white">
            Experience Fusion High School 2.1
          </h2>
          <p className="text-xs md:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            Ready to experience modern high school management? Sign in with your learner number, educator credentials, or parent account.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <a
              href="/application.html"
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-extrabold text-sm shadow-xl shadow-emerald-500/25 transition-all hover:scale-105 flex items-center gap-2"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Apply for Admission (Gr 8–12)</span>
            </a>
            <Link
              to="/login"
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-500 text-white font-extrabold text-sm shadow-glow-indigo transition-all hover:scale-105"
            >
              Sign In to Your Workspace
            </Link>
            <Link
              to="/register"
              className="px-5 py-3.5 rounded-2xl bg-surface-darker text-slate-300 hover:text-white border border-white/10 hover:border-white/20 text-sm font-bold transition-all"
            >
              Parent Registration
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/10 py-8 px-4 md:px-8 bg-surface-darker/90 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/5 p-0.5 border border-white/10 flex items-center justify-center">
              <img src="/assets/FH.png" alt="Fusion High Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-bold text-white block">FUSION HIGH SCHOOL</span>
              <span className="text-[10px] text-cyan-400 font-mono">Connecting Today, Empowering Tomorrow.</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 text-center sm:text-right">
            Compliant with Department of Basic Education CAPS Curriculum Standards & POPIA Data Protection.
          </p>
        </div>
      </footer>
    </div>
  );
};
