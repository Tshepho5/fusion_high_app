import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { TeacherOverview } from './TeacherOverview';
import { TeacherSubjects } from './TeacherSubjects';
import { TeacherResources } from './TeacherResources';
import { TeacherAITools } from './TeacherAITools';
import { TeacherAttendance } from './TeacherAttendance';
import { TeacherAssessments } from './TeacherAssessments';
import { TeacherTimetable } from './TeacherTimetable';
import { AnnouncementsFeed } from '../../components/common/AnnouncementsFeed';
import { SchoolCalendar } from '../../components/common/SchoolCalendar';
import { LearnerMessages } from '../learner/LearnerMessages';
import { LearnerProfile } from '../learner/LearnerProfile';
import { LearnerSettings } from '../learner/LearnerSettings';
import { ParentTeacherConsultations } from '../../components/parent/ParentTeacherConsultations';
import { InterSchoolCompetitions } from '../../components/common/InterSchoolCompetitions';
import { TeacherConduct } from '../../components/teacher/TeacherConduct';
import { ExamSeatingManager } from '../../components/common/ExamSeatingManager';
import { SportsExtracurriculars } from '../../components/common/SportsExtracurriculars';
import { TextbookAssetTracker } from '../../components/common/TextbookAssetTracker';
import { EducatorLeaveReliefManager } from '../../components/admin/EducatorLeaveReliefManager';
import { TeacherAssignments } from '../../components/teacher/TeacherAssignments';
import { TeacherNavigationBar, getPrimaryTabFromActive } from '../../components/teacher/TeacherNavigationBar';
import { TeacherMoreHub } from './TeacherMoreHub';
import { TeacherDiscoverHub } from './TeacherDiscoverHub';
import { TeacherCalendarHub } from './TeacherCalendarHub';
import { ArrowLeft, ChevronRight, Home, LayoutGrid, Compass, Calendar, MessageSquare, User } from 'lucide-react';

export const TeacherDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleSelectTab = (tabId: string, params?: any) => {
    setActiveTab(tabId);
    const newParams: any = { tab: tabId };
    if (params) {
      if (params.subject) newParams.subject = params.subject;
      if (params.grade) newParams.grade = params.grade;
      if (params.class) newParams.class = params.class;
      if (params.tool) newParams.tool = params.tool;
    }
    setSearchParams(newParams);
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'home':
      case 'overview':
        return 'Educator Workspace & Assigned Subjects';
      case 'subjects':
      case 'classes':
      case 'workload':
        return 'My Subjects & CAPS Workload';
      case 'discover':
        return 'Discover Teaching Innovation';
      case 'resources':
        return 'Learning Resources & Past Papers Studio';
      case 'ai-tools':
        return 'AI Lesson & Test Builder';
      case 'calendar':
      case 'timetable':
        return 'Educator Timetable & Academic Calendar';
      case 'more':
        return 'More Modules & Educator Functions';
      case 'ptc':
      case 'consultations':
        return 'Parent-Teacher Consultations & Conferences';
      case 'inter-school':
        return 'Inter-School Derbies, Sports & Academic Olympiads';
      case 'conduct':
        return 'Merit & Disciplinary Management';
      case 'my-leave':
        return 'Educator Leave & Relief Duty';
      case 'exam-seating':
        return 'Examination Seating Planner';
      case 'sports':
        return 'Sports & Extracurricular Clubs';
      case 'textbooks':
        return 'Textbook & Learning Asset Inventory';
      case 'attendance':
        return 'Class Attendance Register';
      case 'assessments':
        return 'Marks & Assessments';
      case 'assignments':
        return 'Homework & Digital Assignment Submission Hub';
      case 'announcements':
        return 'School Notices & Broadcasts';
      case 'messages':
        return 'Communication Hub';
      case 'settings':
        return 'App & Technical Settings';
      case 'profile':
        return 'Educator Profile';
      default:
        return 'Educator Workspace';
    }
  };

  const primaryCategory = getPrimaryTabFromActive(activeTab);
  const isSubModule = activeTab !== 'overview' && activeTab !== 'home' && activeTab !== 'calendar' && activeTab !== 'profile' && activeTab !== 'discover' && activeTab !== 'messages' && activeTab !== 'more';

  // Determine intelligent backtrack target
  const getBacktrackConfig = () => {
    if (activeTab === 'subjects' || activeTab === 'classes' || activeTab === 'workload') {
      return { target: 'overview', label: 'Back to Subjects', parentLabel: 'Home' };
    }
    if (activeTab === 'resources' || activeTab === 'ai-tools' || activeTab === 'inter-school') {
      return { target: 'discover', label: 'Back to Discover', parentLabel: 'Discover' };
    }
    if (activeTab === 'announcements' || activeTab === 'ptc') {
      return { target: 'messages', label: 'Back to Messages', parentLabel: 'Messages' };
    }
    return { target: 'more', label: 'Back to More Modules', parentLabel: 'More Modules' };
  };

  const backtrack = getBacktrackConfig();

  return (
    <DashboardLayout
      activeTab={activeTab}
      onSelectTab={handleSelectTab}
      title={getTabTitle()}
    >
      {/* 🌟 Modern Teacher Floating Navigation Bar (Home, Calendar, Profile, Discover, Messages, More) */}
      <div className="sticky top-0 z-30 mb-6 pb-1 pt-1 backdrop-blur-md bg-canvas-dark/40">
        <TeacherNavigationBar
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          className="max-w-xl mx-auto w-full"
        />
      </div>

      {/* Universal Breadcrumb & Backtrack Bar for Sub-Modules */}
      {isSubModule && (
        <div className="flex items-center justify-between gap-3 p-3 mb-6 rounded-2xl bg-surface-dark border border-white/10 shadow-sm animate-fade-in">
          <button
            onClick={() => handleSelectTab(backtrack.target)}
            className="px-3.5 py-1.5 rounded-xl bg-surface-darker hover:bg-white/10 border border-white/10 hover:border-cyan-500/40 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-2 transition-all shadow-sm group cursor-pointer"
            title={backtrack.label}
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400 group-hover:-translate-x-1 transition-transform" />
            <span>{backtrack.label}</span>
          </button>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            <button
              onClick={() => handleSelectTab(backtrack.target)}
              className="hover:text-white flex items-center gap-1 transition-colors"
            >
              {backtrack.parentLabel === 'More Modules' && <LayoutGrid className="w-3.5 h-3.5 text-cyan-400" />}
              {backtrack.parentLabel === 'Discover' && <Compass className="w-3.5 h-3.5 text-purple-400" />}
              {backtrack.parentLabel === 'Home' && <Home className="w-3.5 h-3.5 text-indigo-400" />}
              {backtrack.parentLabel === 'Messages' && <MessageSquare className="w-3.5 h-3.5 text-sky-400" />}
              <span>{backtrack.parentLabel}</span>
            </button>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <span className="text-cyan-300 font-bold">{getTabTitle()}</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. PRIMARY TABS                                                          */}
      {/* ========================================================================= */}
      {(activeTab === 'overview' || activeTab === 'home') && (
        <TeacherOverview onNavigateTab={handleSelectTab} />
      )}

      {activeTab === 'calendar' && (
        <TeacherCalendarHub initialSubTab="timetable" />
      )}

      {activeTab === 'profile' && (
        <LearnerProfile />
      )}

      {activeTab === 'discover' && (
        <TeacherDiscoverHub onNavigateTab={handleSelectTab} />
      )}

      {activeTab === 'messages' && (
        <LearnerMessages />
      )}

      {activeTab === 'more' && (
        <TeacherMoreHub onNavigateTab={handleSelectTab} />
      )}

      {/* ========================================================================= */}
      {/* 2. SUB-MODULE VIEWS (Zero data loss, directly accessible from More/Links)  */}
      {/* ========================================================================= */}
      {(activeTab === 'subjects' || activeTab === 'classes' || activeTab === 'workload') && (
        <TeacherSubjects onNavigateTab={handleSelectTab} />
      )}
      {activeTab === 'assignments' && (
        <TeacherAssignments
          initialSubject={searchParams.get('subject') || undefined}
          initialGrade={searchParams.get('grade') || undefined}
          autoOpenCreate={searchParams.get('create') === 'true'}
        />
      )}
      {activeTab === 'resources' && (
        <TeacherResources onNavigateTab={handleSelectTab} />
      )}
      {activeTab === 'ai-tools' && <TeacherAITools />}
      {(activeTab === 'ptc' || activeTab === 'consultations') && <ParentTeacherConsultations />}
      {activeTab === 'inter-school' && <InterSchoolCompetitions />}
      {activeTab === 'conduct' && <TeacherConduct />}
      {activeTab === 'my-leave' && <EducatorLeaveReliefManager />}
      {activeTab === 'exam-seating' && <ExamSeatingManager />}
      {activeTab === 'sports' && <SportsExtracurriculars />}
      {activeTab === 'textbooks' && (
        <TextbookAssetTracker
          forcedRole="teacher"
          initialSubject={searchParams.get('subject') || undefined}
          initialGrade={searchParams.get('grade') || undefined}
        />
      )}
      {activeTab === 'timetable' && <TeacherTimetable />}
      {activeTab === 'attendance' && <TeacherAttendance />}
      {activeTab === 'assessments' && <TeacherAssessments />}
      {activeTab === 'announcements' && <AnnouncementsFeed />}
      {activeTab === 'settings' && <LearnerSettings />}
    </DashboardLayout>
  );
};
