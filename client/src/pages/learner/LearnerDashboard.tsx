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
import { ModulePageHeader } from '../../components/layout/WorkspaceChrome';
import { LearnerMoreHub } from './LearnerMoreHub';
import { LearnerDiscoverHub } from './LearnerDiscoverHub';
import { useSchool } from '../../context/SchoolContext';
import { moduleAllowed } from '../../utils/schoolModules';

export const LearnerDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentSchool, refreshSchools } = useSchool();
  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState<string>(() =>
    moduleAllowed('learner', initialTab, currentSchool.learner_modules, currentSchool.teacher_modules) ? initialTab : 'overview'
  );
  const [tabHistory, setTabHistory] = useState<string[]>([]);

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
    if (tabId !== activeTab) {
      setTabHistory((prev) => [...prev, activeTab].slice(-24));
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
        return 'My Subjects';
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
        return 'School Calendar';
      case 'timetable':
        return 'Weekly Class Timetable';
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

  const placeName = (tabId: string) => {
    const names: Record<string, string> = {
      overview: 'Home',
      home: 'Home',
      more: 'Menu',
      discover: 'Discover',
      subjects: 'Subjects',
      performance: 'Marks',
      'ai-tutor': 'AI Tutor',
      'career-advisor': 'Career Advisor',
      bursaries: 'Bursaries',
      finance: 'Fees',
      'exam-seating': 'Exam Seating',
      sports: 'Sports',
      'inter-school': 'Olympiads',
      textbooks: 'Textbooks',
      assignments: 'Homework',
      arcade: 'Arcade',
      reports: 'Reports',
      calendar: 'Calendar',
      timetable: 'Timetable',
      announcements: 'Notices',
      messages: 'Messages',
      settings: 'Settings',
      profile: 'Profile',
    };
    return names[tabId] || 'Menu';
  };

  const fallbackTarget = () => {
    if (activeTab === 'subjects' || activeTab === 'more' || activeTab === 'discover') return 'overview';
    return 'more';
  };

  const previousTab = tabHistory[tabHistory.length - 1];
  const resolvedBack = previousTab && previousTab !== activeTab ? previousTab : fallbackTarget();
  const backTarget = resolvedBack === activeTab ? 'overview' : resolvedBack;

  const openTab = (tabId: string) => {
    if (!moduleAllowed('learner', tabId, currentSchool.learner_modules, currentSchool.teacher_modules)) {
      setActiveTab('overview');
      setSearchParams({ tab: 'overview' });
      return;
    }
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  const handleBack = () => {
    setTabHistory((prev) => (prev.length ? prev.slice(0, -1) : prev));
    openTab(backTarget);
  };

  const showBack = activeTab !== 'overview' && activeTab !== 'home' && activeTab !== 'messages';
  const openSubjectName = searchParams.get('subject');
  const insideSubject = activeTab === 'subjects' && Boolean(openSubjectName);
  const pageTitle = insideSubject ? openSubjectName! : getTabTitle();

  const leaveSubject = () => {
    setSearchParams({ tab: 'subjects' });
  };

  return (
    <DashboardLayout
      activeTab={activeTab}
      onSelectTab={handleSelectTab}
      title={pageTitle}
    >
      {showBack && (
        <ModulePageHeader
          title={pageTitle}
          parentLabel={insideSubject ? 'Subjects' : placeName(backTarget)}
          backLabel={insideSubject ? 'Back to Subjects' : `Back to ${placeName(backTarget)}`}
          onBack={insideSubject ? leaveSubject : handleBack}
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

      {activeTab === 'calendar' && <SchoolCalendar />}

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
        <LearnerMessages onBack={handleBack} />
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
