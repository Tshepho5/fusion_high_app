import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';
import { LearnerOverview } from './LearnerOverview';
import { LearnerSubjects } from './LearnerSubjects';
import { LearnerAITutor } from './LearnerAITutor';
import { LearnerTimetable } from './LearnerTimetable';
import { LearnerMessages } from './LearnerMessages';
import { LearnerProfile } from './LearnerProfile';
import { LearnerSettings } from './LearnerSettings';
import { SubjectPerformanceView } from './SubjectPerformanceView';
import { CapsReportCard } from '../../components/common/CapsReportCard';
import { AnnouncementsFeed } from '../../components/common/AnnouncementsFeed';
import { SchoolCalendar } from '../../components/common/SchoolCalendar';
import { LearnerCareerAdvisor } from '../../components/learner/LearnerCareerAdvisor';
import { ExamSeatingManager } from '../../components/common/ExamSeatingManager';
import { SportsExtracurriculars } from '../../components/common/SportsExtracurriculars';
import { InterSchoolCompetitions } from '../../components/common/InterSchoolCompetitions';
import { TextbookAssetTracker } from '../../components/common/TextbookAssetTracker';
import { LearnerAssignments } from '../../components/learner/LearnerAssignments';
import { BursaryScholarshipHub } from '../../components/learner/BursaryScholarshipHub';
import { SchoolFeesManager } from '../../components/finance/SchoolFeesManager';
import { FusionArcadeHub } from '../../components/learner/FusionArcadeHub';
import { LearnerNavigationBar, getLearnerPrimaryTabFromActive } from '../../components/learner/LearnerNavigationBar';
import { LearnerMoreHub } from './LearnerMoreHub';
import { LearnerDiscoverHub } from './LearnerDiscoverHub';
import { LearnerCalendarHub } from './LearnerCalendarHub';
import { ArrowLeft, ChevronRight, Home, LayoutGrid, Compass, Calendar, MessageSquare } from 'lucide-react';

export const LearnerDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // State passed to AI Tutor when launching from Subjects
  const [tutorContext, setTutorContext] = useState<{
    subject: string;
    topicId?: string;
    topicName?: string;
  }>({
    subject: 'Mathematics',
  });

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleSelectTab = (tabId: string, subjectName?: string) => {
    setActiveTab(tabId);
    if (subjectName) {
      setSearchParams({ tab: tabId, subject: subjectName });
    } else {
      setSearchParams({ tab: tabId });
    }
  };

  const handleStartAITopic = (subject: string, topicId: string, topicName: string) => {
    setTutorContext({ subject, topicId, topicName });
    handleSelectTab('ai-tutor');
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'home':
      case 'overview':
        return 'Home & Enrolled Subjects';
      case 'subjects':
        return 'My Subjects Workspace';
      case 'performance':
        return 'Subject Academic Performance';
      case 'ai-tutor':
        return 'CAPS AI Study Tutor & Exam Studios';
      case 'career-advisor':
        return 'Matric APS & University Career Advisor';
      case 'bursaries':
        return 'NSFAS & Tertiary Bursary Matching Engine';
      case 'finance':
        return 'School Fee Statements & Receipts';
      case 'exam-seating':
        return 'Examination Seating & Candidate Slips';
      case 'sports':
        return 'Sports & Extracurricular Clubs';
      case 'inter-school':
        return 'Inter-School Derbies, Sports & Academic Olympiads';
      case 'textbooks':
        return 'My Issued Textbooks';
      case 'assignments':
        return 'Homework & Digital Assignments Hub';
      case 'arcade':
        return 'Fusion Arcade & CAPS Study Games';
      case 'reports':
        return 'Official CAPS Term Report Card';
      case 'calendar':
      case 'timetable':
        return 'Class Timetable & School Calendar';
      case 'discover':
        return 'Discover Learning Innovation';
      case 'more':
        return 'More Modules & Quick Functions';
      case 'announcements':
        return 'School Notices & Broadcasts';
      case 'messages':
        return 'Communication Hub';
      case 'settings':
        return 'App & Technical Settings';
      case 'profile':
        return 'My Profile & Digital Student ID Card';
      default:
        return 'Learner Workspace';
    }
  };

  const isSubModule =
    activeTab !== 'overview' &&
    activeTab !== 'home' &&
    activeTab !== 'calendar' &&
    activeTab !== 'profile' &&
    activeTab !== 'messages' &&
    activeTab !== 'more';

  // Determine intelligent backtrack target
  const getBacktrackConfig = () => {
    if (activeTab === 'subjects') {
      return { target: 'overview', label: 'Back to Subjects', parentLabel: 'Home' };
    }
    if (activeTab === 'discover') {
      return { target: 'more', label: 'Back to More Modules', parentLabel: 'More Modules' };
    }
    if (activeTab === 'ai-tutor' || activeTab === 'career-advisor' || activeTab === 'arcade' || activeTab === 'inter-school') {
      return { target: 'discover', label: 'Back to Discover', parentLabel: 'Discover' };
    }
    if (activeTab === 'timetable') {
      return { target: 'calendar', label: 'Back to Calendar', parentLabel: 'Calendar' };
    }
    if (activeTab === 'announcements') {
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
      {/* Universal Breadcrumb & Backtrack Bar for Sub-Modules */}
      {isSubModule && (
        <div className="flex items-center justify-between gap-3 p-3 mb-6 rounded-2xl bg-surface-dark border border-white/10 shadow-sm animate-fade-in">
          <button
            onClick={() => handleSelectTab(backtrack.target)}
            className="px-3.5 py-1.5 rounded-xl bg-surface-darker hover:bg-white/10 border border-white/10 hover:border-brand-500/40 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-2 transition-all shadow-sm group cursor-pointer"
            title={backtrack.label}
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400 group-hover:-translate-x-1 transition-transform" />
            <span>{backtrack.label}</span>
          </button>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            <button
              onClick={() => handleSelectTab(backtrack.target)}
              className="hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
            >
              {backtrack.parentLabel === 'More Modules' && <LayoutGrid className="w-3.5 h-3.5 text-cyan-400" />}
              {backtrack.parentLabel === 'Discover' && <Compass className="w-3.5 h-3.5 text-purple-400" />}
              {backtrack.parentLabel === 'Home' && <Home className="w-3.5 h-3.5 text-brand-400" />}
              {backtrack.parentLabel === 'Messages' && <MessageSquare className="w-3.5 h-3.5 text-sky-400" />}
              {backtrack.parentLabel === 'Calendar' && <Calendar className="w-3.5 h-3.5 text-indigo-400" />}
              <span>{backtrack.parentLabel}</span>
            </button>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <span className="text-cyan-300 font-bold">{getTabTitle()}</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. PRIMARY DOCK TABS                                                      */}
      {/* ========================================================================= */}
      {(activeTab === 'overview' || activeTab === 'home') && (
        <ErrorBoundary fallbackTitle="Home Dashboard Interrupted" fallbackMessage="Could not load your subject hub right now. Your enrolled courses and marks are safe.">
          <LearnerOverview onNavigateTab={handleSelectTab} />
        </ErrorBoundary>
      )}

      {activeTab === 'calendar' && (
        <LearnerCalendarHub initialSubTab="timetable" />
      )}

      {activeTab === 'profile' && (
        <LearnerProfile />
      )}

      {activeTab === 'discover' && (
        <LearnerDiscoverHub
          onNavigateTab={handleSelectTab}
          tutorContext={tutorContext}
        />
      )}

      {activeTab === 'messages' && (
        <LearnerMessages />
      )}

      {activeTab === 'more' && (
        <LearnerMoreHub onNavigateTab={handleSelectTab} />
      )}

      {/* ========================================================================= */}
      {/* 2. SUB-MODULE VIEWS (Zero data loss, directly accessible from More/Links)  */}
      {/* ========================================================================= */}
      {activeTab === 'subjects' && (
        <LearnerSubjects onStartAITopic={handleStartAITopic} />
      )}
      {activeTab === 'arcade' && <FusionArcadeHub />}
      {activeTab === 'performance' && <SubjectPerformanceView />}
      {activeTab === 'assignments' && <LearnerAssignments />}
      {activeTab === 'ai-tutor' && (
        <LearnerAITutor
          initialSubject={tutorContext.subject}
          initialTopicId={tutorContext.topicId}
          initialTopicName={tutorContext.topicName}
        />
      )}
      {activeTab === 'career-advisor' && <LearnerCareerAdvisor />}
      {activeTab === 'bursaries' && <BursaryScholarshipHub isParentView={false} />}
      {activeTab === 'finance' && <SchoolFeesManager userRole="learner" />}
      {activeTab === 'exam-seating' && <ExamSeatingManager />}
      {activeTab === 'sports' && <SportsExtracurriculars />}
      {activeTab === 'inter-school' && <InterSchoolCompetitions />}
      {activeTab === 'textbooks' && <TextbookAssetTracker />}
      {activeTab === 'reports' && <CapsReportCard />}
      {activeTab === 'timetable' && <LearnerTimetable />}
      {activeTab === 'announcements' && <AnnouncementsFeed />}
      {activeTab === 'settings' && <LearnerSettings />}
    </DashboardLayout>
  );
};
