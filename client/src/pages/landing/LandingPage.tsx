import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
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
  Clock,
  MessageSquare,
  ChevronRight,
  Sun,
  Moon,
  QrCode,
  FileText,
  Bot,
  Layers,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { isAuthenticated, role } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-canvas-dark text-slate-100 flex flex-col selection:bg-brand-500 selection:text-white relative overflow-hidden transition-colors duration-300">
      {/* Subtle Background Glows */}
      <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-brand-600/10 blur-[130px] pointer-events-none" />
      <div className="absolute top-[35%] right-[-5%] w-[450px] h-[450px] rounded-full bg-cyan-500/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-indigo-700/10 blur-[140px] pointer-events-none" />

      {/* Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff04_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Clean Navigation Header */}
      <header className="sticky top-0 z-50 px-4 md:px-8 py-3.5 backdrop-blur-xl bg-surface-darker/80 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & School Name */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-white/5 p-1 border border-white/15 flex items-center justify-center shadow-glow-indigo group-hover:scale-105 transition-transform backdrop-blur-md">
              <img src="/assets/FH.png" alt="Fusion High Emblem" className="w-full h-full object-contain drop-shadow-md" />
            </div>
            <div>
              <span className="font-display text-lg font-extrabold tracking-tight text-white block leading-tight">
                FUSION HIGH
              </span>
              <span className="text-[9px] font-mono tracking-wider text-cyan-400 uppercase font-bold block">
                ONE SCHOOL • LIMITLESS POTENTIAL
              </span>
            </div>
          </Link>

          {/* Quick Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
            <a href="#portals" className="hover:text-white transition-colors">Portals</a>
            <a href="#features" className="hover:text-white transition-colors">Key Features</a>
            <a href="#admissions" className="hover:text-white transition-colors">Admissions</a>
          </nav>

          {/* Action CTAs & Theme Toggle */}
          <div className="flex items-center gap-2.5">
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

            <a
              href="/application.html"
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-extrabold transition-all"
            >
              <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Admissions</span>
            </a>

            {isAuthenticated ? (
              <button
                onClick={() => navigate(`/dashboard/${role || 'learner'}`)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-500 text-white font-bold text-xs shadow-glow-indigo transition-all"
              >
                <span>Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-2 rounded-xl bg-surface-dark hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-bold transition-all"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-500 text-white text-xs font-bold shadow-glow-indigo transition-all"
                >
                  <span>Register</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section: Simple, Clean & Powerful */}
      <section className="pt-14 md:pt-20 pb-16 px-4 md:px-8 max-w-5xl mx-auto flex flex-col items-center text-center space-y-6">
        {/* Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-dark border border-brand-500/30 text-xs font-semibold text-slate-200 shadow-md">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Next-Gen South African High School Platform</span>
          <span className="text-slate-500">•</span>
          <span className="text-emerald-400 font-bold">CAPS Aligned</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold font-display tracking-tight text-white leading-tight">
          One Connected Platform for{' '}
          <span className="bg-gradient-to-r from-brand-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">
            Learners, Teachers & Parents
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Manage daily QR attendance, CAPS curriculum marks, official report cards, personalized timetables, and instant parent notifications in real time.
        </p>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 pt-2 w-full justify-center max-w-md">
          <a
            href="/application.html"
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 group"
          >
            <GraduationCap className="w-4 h-4 text-emerald-100 group-hover:scale-110 transition-transform" />
            <span>Apply for Admission (Gr 8–12)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>

          <Link
            to="/login"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-surface-dark hover:bg-white/10 text-white border border-white/15 hover:border-cyan-400/50 text-xs font-bold transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Portal Login</span>
          </Link>
        </div>

        {/* 4 Quick Stat Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full pt-6 max-w-3xl">
          <div className="p-3.5 rounded-2xl bg-surface-dark border border-white/10 text-center">
            <p className="text-xl font-black font-display text-white">Grades 8–12</p>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">CAPS Curriculum</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-surface-dark border border-white/10 text-center">
            <p className="text-xl font-black font-display text-cyan-400">Live QR</p>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">Attendance Tracker</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-surface-dark border border-white/10 text-center">
            <p className="text-xl font-black font-display text-emerald-400">Instant</p>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">Parent Alerts</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-surface-dark border border-white/10 text-center">
            <p className="text-xl font-black font-display text-amber-400">POPIA</p>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">Verified & Secure</p>
          </div>
        </div>
      </section>

      {/* Role Portals Section */}
      <section id="portals" className="py-12 px-4 md:px-8 max-w-6xl mx-auto w-full space-y-8">
        <div className="text-center space-y-1.5">
          <h2 className="text-2xl md:text-3xl font-extrabold font-display text-white">
            Dedicated Portals for Everyone
          </h2>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">
            Tailored workspaces designed for smooth collaboration between school and home.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Learner Portal */}
          <div className="p-5 rounded-3xl bg-surface-dark border border-white/10 hover:border-brand-500/40 transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-brand-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Learner Portal</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Access daily timetables, Grade 8-12 past papers, textbook library, and AI revision aids.
                </p>
              </div>
            </div>
            <Link
              to="/login"
              className="text-xs font-bold text-brand-400 hover:text-brand-300 flex items-center gap-1 pt-2 border-t border-white/5"
            >
              <span>Explore Learner Tools</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Teacher Portal */}
          <div className="p-5 rounded-3xl bg-surface-dark border border-white/10 hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Teacher Portal</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Fast QR roll-call scanner, markbook captures, AI quiz generator, and relief timetable manager.
                </p>
              </div>
            </div>
            <Link
              to="/login"
              className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 pt-2 border-t border-white/5"
            >
              <span>Explore Teacher Tools</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Parent Portal */}
          <div className="p-5 rounded-3xl bg-surface-dark border border-white/10 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Parent Portal</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Live daily attendance notifications, downloadable term report cards, and teacher messaging.
                </p>
              </div>
            </div>
            <Link
              to="/login"
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 pt-2 border-t border-white/5"
            >
              <span>Explore Parent Tools</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Admin Command */}
          <div className="p-5 rounded-3xl bg-surface-dark border border-white/10 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Administration</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Master timetable generator, educator allocations, admission queue, and school broadcasts.
                </p>
              </div>
            </div>
            <Link
              to="/login"
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 pt-2 border-t border-white/5"
            >
              <span>Explore Admin Tools</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Core Platform Capabilities */}
      <section id="features" className="py-12 px-4 md:px-8 max-w-6xl mx-auto w-full space-y-8">
        <div className="text-center space-y-1.5">
          <h2 className="text-2xl md:text-3xl font-extrabold font-display text-white">
            Built for Academic Excellence
          </h2>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">
            Key capabilities powering South African high schools from registration to matriculation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 rounded-3xl bg-surface-dark border border-white/10 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <QrCode className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Smart QR Attendance & Instant Alerts</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Educators scan learner cards in seconds. Parents receive instant push notifications and emails whether their child is present, late, or absent.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-surface-dark border border-white/10 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">DBE-Compliant CAPS Report Cards</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Generate standardized term report cards with subject aggregates, APS calculations, educator remarks, and official school seals.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-surface-dark border border-white/10 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Bot className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">AI Academic Tutor & Quiz Generator</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Curriculum-aligned practice questions, step-by-step explanations, and automated assessment drafting tailored to Grade 8–12 subjects.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-surface-dark border border-white/10 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Digital Admissions & Document Verification</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Paperless online enrolment with South African 13-digit ID verification, previous report uploads, and automated applicant review.
            </p>
          </div>
        </div>
      </section>

      {/* Admissions Callout Banner */}
      <section id="admissions" className="py-10 px-4 md:px-8 max-w-5xl mx-auto w-full">
        <div className="p-8 md:p-10 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-surface-dark to-slate-900 border border-emerald-500/30 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
              Enrolment Open
            </div>
            <h3 className="text-xl md:text-2xl font-bold font-display text-white">
              Ready to Join Fusion High School?
            </h3>
            <p className="text-xs text-slate-400 max-w-md">
              Apply online for Grade 8 admissions or Grade 9–12 transfers in just a few minutes.
            </p>
          </div>

          <a
            href="/application.html"
            className="px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 shrink-0"
          >
            <span>Start Online Application</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* Clean Minimalist Footer */}
      <footer className="mt-auto py-8 px-4 md:px-8 border-t border-white/10 bg-surface-darker text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/assets/FH.png" alt="Fusion High Emblem" className="w-6 h-6 object-contain" />
            <span className="font-bold text-white">Fusion High School</span>
            <span className="text-slate-600">|</span>
            <span className="text-[11px] text-slate-400">DBE CAPS Aligned & POPIA Compliant</span>
          </div>

          <p className="text-[11px] text-slate-500 text-center sm:text-right">
            &copy; {new Date().getFullYear()} Fusion High School. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};
