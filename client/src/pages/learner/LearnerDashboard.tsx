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
import { LearnerNavigationBar } from '../../components/learner/LearnerNavigationBar';
import { ModulePageHeader } from '../../components/layout/WorkspaceChrome';
import { LearnerMoreHub } from './LearnerMoreHub';
import { LearnerDiscoverHub } from './LearnerDiscoverHub';
import { LearnerCalendarHub } from './LearnerCalendarHub';
import { useSchool } from '../../context/SchoolContext';
import { moduleAllowed } from '../../utils/schoolModules';

export const LearnerDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentSchool, refreshSchools } = useSchool();
  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState<string>(() =>
    moduleAllowed('learner', initialTab, currentSchool.learner_modules, currentSchool.teacher_modules) ? initialTab : 'overview'
  );

  useEffect(() => {
    refreshSchools();
  }, []);

  // State passed to AI Tutor when launching from Subjects
  const [tutorContext, setTutorContext] = useState<{
    subject: string;
    topicId?: string;
    topicName?: string;
  }>({
    subject: 'Mathematics',
  });

  useEffect(() => {
    const tabParam = searchParams.get('tab') || activeTab || 'overview';
    if (!moduleAllowed('learner', tabParam, currentSchool.learner_modules, currentSchool.teacher_modules)) {
      if (activeTab !== 'overview') setActiveTab('overview');
      if (searchParams.get('tab') && searchParams.get('tab') !== 'overview') {
        setSearchParams({ tab: 'overview' });
      }
      return;
    }
    if (tabParam !== activeTab) setActiveTab(tabParam);
  }, [searchParams, currentSchool.learner_modules, currentSchool.teacher_modules, activeTab]);

  const handleSelectTab = (tabId: string, subjectName?: string) => {
    if (!moduleAllowed('learner', tabId, currentSchool.learner_modules, currentSchool.teacher_modules)) {
      setActiveTab('overview');
      setSearchParams({ tab: 'overview' });
      return;
    }
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
      customBottomDock={
        <div className="fixed bottom-4 inset-x-0 z-[60] flex justify-center px-2 sm:px-4 pointer-events-none">
          <LearnerNavigationBar
            activeTab={activeTab}
            onSelectTab={handleSelectTab}
            className="pointer-events-auto w-full max-w-xl xl:max-w-4xl 2xl:max-w-5xl"
          />
        </div>
      }
    >
      {isSubModule && (
        <ModulePageHeader
          title={getTabTitle()}
          parentLabel={backtrack.parentLabel}
          backLabel={backtrack.label}
          onBack={() => handleSelectTab(backtrack.target)}
        />
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
