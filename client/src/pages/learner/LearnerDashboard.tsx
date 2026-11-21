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
import { GelezaAIStudyHubModule } from '../../components/learner/GelezaAIStudyHubModule';
import { useSchool } from '../../context/SchoolContext';
import { moduleAllowed } from '../../utils/schoolModules';
import { LearnerRegistrationPanel } from '../../components/registration/LearnerRegistrationPanel';
import { ApplicantTrackingPanel } from '../../components/applications/ApplicantTrackingPanel';
import { learnerService } from '../../services/api';

const RESTRICTED_APPLICANT_TABS = new Set(['applications', 'registration', 'profile', 'settings']);

export const LearnerDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentSchool, refreshSchools } = useSchool();
  const [accessStatus, setAccessStatus] = useState<{
    loaded: boolean;
    mode: string;
    isRestrictedApplicant: boolean;
    hasActiveEnrollment: boolean;
    hasApprovedApplication?: boolean;
    reason?: string | null;
  }>({
    loaded: false,
    mode: 'enrolled',
    isRestrictedApplicant: false,
    hasActiveEnrollment: true,
    reason: null
  });
  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState<string>(() =>
    moduleAllowed('learner', initialTab, currentSchool.learner_modules, currentSchool.teacher_modules) ? initialTab : 'overview'
  );
  const [tabHistory, setTabHistory] = useState<string[]>([]);

  const loadAccessStatus = React.useCallback(async () => {
    try {
      const res = await learnerService.getAccessStatus();
      const restricted = Boolean(res?.isRestrictedApplicant);
      setAccessStatus({
        loaded: true,
        mode: res?.mode || (restricted ? 'restricted_applicant' : 'enrolled'),
        isRestrictedApplicant: restricted,
        hasActiveEnrollment: !restricted,
        hasApprovedApplication: Boolean(res?.hasApprovedApplication),
        reason: res?.reason || null
      });
    } catch (_) {
      setAccessStatus({
        loaded: true,
        mode: 'restricted_applicant',
        isRestrictedApplicant: true,
        hasActiveEnrollment: false,
        reason: 'Unable to confirm active school enrolment. Showing Applicant Tracking Workspace until enrolment is verified.'
      });
    }
  }, []);

  useEffect(() => {
    refreshSchools();
    loadAccessStatus();
  }, [loadAccessStatus]);

  // State passed to AI Tutor when launching from Subjects
  const [tutorContext, setTutorContext] = useState<{
    subject: string;
    topicId?: string;
    topicName?: string;
  }>({
    subject: 'Mathematics',
  });

  useEffect(() => {
    if (!accessStatus.loaded) return;
    const tabParam = searchParams.get('tab') || activeTab || 'overview';
    if (accessStatus.isRestrictedApplicant) {
      if (!RESTRICTED_APPLICANT_TABS.has(tabParam)) {
        if (activeTab !== 'applications') setActiveTab('applications');
        if (searchParams.get('tab') !== 'applications') {
          setSearchParams({ tab: 'applications' });
        }
        return;
      }
      if (tabParam !== activeTab) setActiveTab(tabParam);
      return;
    }
    if (!moduleAllowed('learner', tabParam, currentSchool.learner_modules, currentSchool.teacher_modules)) {
      if (activeTab !== 'overview') setActiveTab('overview');
      if (searchParams.get('tab') && searchParams.get('tab') !== 'overview') {
        setSearchParams({ tab: 'overview' });
      }
      return;
    }
    if (tabParam !== activeTab) setActiveTab(tabParam);
  }, [searchParams, currentSchool.learner_modules, currentSchool.teacher_modules, activeTab, accessStatus.loaded, accessStatus.isRestrictedApplicant]);

  const handleSelectTab = (tabId: string, subjectName?: string) => {
    if (accessStatus.isRestrictedApplicant && !RESTRICTED_APPLICANT_TABS.has(tabId)) {
      setActiveTab('applications');
      setSearchParams({ tab: 'applications' });
      return;
    }
    if (!accessStatus.isRestrictedApplicant && !moduleAllowed('learner', tabId, currentSchool.learner_modules, currentSchool.teacher_modules)) {
      setActiveTab('overview');
      setSearchParams({ tab: 'overview' });
      return;
    }
    if (tabId !== activeTab) {
      setTabHistory((prev) => [...prev, activeTab].slice(-24));
    }
    setActiveTab(tabId);
    if (tabId === 'registration' && subjectName) {
      setSearchParams({ tab: tabId, applicationId: subjectName });
    } else if (subjectName) {
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
      case 'geleza-quiz':
        return 'Geleza AI Study Hub & Practice Quizzes';
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
      case 'registration':
        return 'Learner Registration & Transfers';
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
      'geleza-quiz': 'Geleza AI Hub',
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
      registration: 'Registration',
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

  // Back button on every module (including Messages / Menu); Home has no back
  const showBack = activeTab !== 'overview' && activeTab !== 'home';
  const openSubjectName = searchParams.get('subject');
  const insideSubject = activeTab === 'subjects' && Boolean(openSubjectName);
  const pageTitle = insideSubject ? openSubjectName! : getTabTitle();

  const leaveSubject = () => {
    setSearchParams({ tab: 'subjects' });
  };

  if (!accessStatus.loaded) {
    return (
      <DashboardLayout
        activeTab="applications"
        onSelectTab={handleSelectTab}
        title="Loading Learner Workspace"
      >
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-sm text-slate-500 dark:text-slate-300">
          <div className="w-8 h-8 rounded-full border-2 border-[#168BFF] border-t-transparent animate-spin" />
          <p>Verifying enrolment and workspace access...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (accessStatus.loaded && accessStatus.isRestrictedApplicant) {
    const restrictedTab = RESTRICTED_APPLICANT_TABS.has(activeTab) ? activeTab : 'applications';
    return (
      <DashboardLayout
        activeTab={restrictedTab}
        onSelectTab={handleSelectTab}
        title={restrictedTab === 'registration' ? 'Learner Registration' : 'Applicant Tracking Dashboard'}
      >
        <div className="space-y-5">
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
            <p className="font-semibold text-amber-800 dark:text-amber-200">
              {accessStatus.reason || 'Restricted Applicant Dashboard — Full learner modules (Subjects, Timetable, Assignments, Reports) unlock automatically after registration is completed.'}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {(['applications', 'registration', 'profile', 'settings'] as const).map((tabKey) => (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => handleSelectTab(tabKey)}
                  className={`px-3 py-1.5 rounded-xl font-bold capitalize cursor-pointer ${
                    restrictedTab === tabKey
                      ? 'bg-[#168BFF] text-white'
                      : 'bg-white/80 dark:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10'
                  }`}
                >
                  {tabKey === 'applications' ? 'Application Tracker' : tabKey}
                </button>
              ))}
            </div>
          </div>

          {restrictedTab === 'applications' && (
            <ApplicantTrackingPanel
              roleLabel="Applicant"
              isRestrictedMode={true}
              onStartRegistration={(appId) => handleSelectTab('registration', String(appId))}
            />
          )}
          {restrictedTab === 'registration' && (
            <LearnerRegistrationPanel
              initialApplicationId={searchParams.get('applicationId')}
              roleLabel="Learner"
              onRegistrationCompleted={loadAccessStatus}
            />
          )}
          {restrictedTab === 'profile' && <LearnerProfile />}
          {restrictedTab === 'settings' && <LearnerSettings />}
        </div>
      </DashboardLayout>
    );
  }

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
      {activeTab === 'geleza-quiz' && (
        <GelezaAIStudyHubModule initialSubject={tutorContext.subject || 'Mathematics'} />
      )}
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
      {activeTab === 'registration' && (
        <LearnerRegistrationPanel
          initialApplicationId={searchParams.get('applicationId')}
          roleLabel="Learner"
        />
      )}
    </DashboardLayout>
  );
};
