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
import { GelezaEarlyWarningRadar } from '../../components/teacher/GelezaEarlyWarningRadar';
import { ModulePageHeader } from '../../components/layout/WorkspaceChrome';
import { TeacherMoreHub } from './TeacherMoreHub';
import { TeacherDiscoverHub } from './TeacherDiscoverHub';
import { useSchool } from '../../context/SchoolContext';
import { moduleAllowed } from '../../utils/schoolModules';

export const TeacherDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentSchool, refreshSchools } = useSchool();
  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState<string>(() =>
    moduleAllowed('teacher', initialTab, currentSchool.teacher_modules) ? initialTab : 'overview'
  );
  const [tabHistory, setTabHistory] = useState<string[]>([]);

  useEffect(() => {
    refreshSchools();
  }, []);

  useEffect(() => {
    const tabParam = searchParams.get('tab') || activeTab || 'overview';
    if (!moduleAllowed('teacher', tabParam, currentSchool.teacher_modules)) {
      if (activeTab !== 'overview') setActiveTab('overview');
      if (searchParams.get('tab') && searchParams.get('tab') !== 'overview') {
        setSearchParams({ tab: 'overview' });
      }
      return;
    }
    if (tabParam !== activeTab) setActiveTab(tabParam);
  }, [searchParams, currentSchool.teacher_modules, activeTab]);

  const handleSelectTab = (tabId: string, params?: any) => {
    if (!moduleAllowed('teacher', tabId, currentSchool.teacher_modules)) {
      setActiveTab('overview');
      setSearchParams({ tab: 'overview' });
      return;
    }
    if (tabId !== activeTab) {
      setTabHistory((prev) => [...prev, activeTab].slice(-24));
    }
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
        return 'Academic Calendar';
      case 'timetable':
        return 'Educator Timetable';
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
      case 'early-warning':
        return 'Geleza AI Early-Warning Academic Radar';
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

  const placeName = (tabId: string) => {
    const names: Record<string, string> = {
      overview: 'Home',
      home: 'Home',
      more: 'Menu',
      discover: 'Discover',
      subjects: 'Subjects',
      classes: 'Subjects',
      workload: 'Subjects',
      resources: 'Past Papers',
      'ai-tools': 'AI Studio',
      calendar: 'Calendar',
      timetable: 'Timetable',
      messages: 'Messages',
      announcements: 'Notices',
      ptc: 'Consultations',
      consultations: 'Consultations',
      'inter-school': 'Olympiads',
      conduct: 'Conduct',
      'my-leave': 'Leave',
      'exam-seating': 'Exam Seating',
      sports: 'Sports',
      textbooks: 'Textbooks',
      attendance: 'Attendance',
      assessments: 'Marksheets',
      'early-warning': 'Early Warning',
      assignments: 'Homework',
      settings: 'Settings',
      profile: 'Profile',
    };
    return names[tabId] || 'Menu';
  };

  const fallbackTarget = () => {
    if (
      activeTab === 'subjects' ||
      activeTab === 'classes' ||
      activeTab === 'workload' ||
      activeTab === 'more' ||
      activeTab === 'discover'
    ) {
      return 'overview';
    }
    return 'more';
  };

  const previousTab = tabHistory[tabHistory.length - 1];
  const resolvedBack = previousTab && previousTab !== activeTab ? previousTab : fallbackTarget();
  const backTarget = resolvedBack === activeTab ? 'overview' : resolvedBack;

  const openTab = (tabId: string) => {
    if (!moduleAllowed('teacher', tabId, currentSchool.teacher_modules)) {
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

  return (
    <DashboardLayout
      activeTab={activeTab}
      onSelectTab={handleSelectTab}
      title={getTabTitle()}
    >

      {showBack && (
        <ModulePageHeader
          title={getTabTitle()}
          parentLabel={placeName(backTarget)}
          backLabel={`Back to ${placeName(backTarget)}`}
          onBack={handleBack}
        />
      )}

      {/* ========================================================================= */}
      {/* 1. PRIMARY TABS                                                          */}
      {/* ========================================================================= */}
      {(activeTab === 'overview' || activeTab === 'home') && (
        <TeacherOverview onNavigateTab={handleSelectTab} />
      )}

      {activeTab === 'calendar' && <SchoolCalendar />}

      {activeTab === 'profile' && (
        <LearnerProfile />
      )}

      {activeTab === 'discover' && (
        <TeacherDiscoverHub onNavigateTab={handleSelectTab} />
      )}

      {activeTab === 'messages' && (
        <LearnerMessages onBack={handleBack} />
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
      {activeTab === 'attendance' && (
        <TeacherAttendance initialClass={searchParams.get('class') || undefined} />
      )}
      {activeTab === 'assessments' && <TeacherAssessments />}
      {activeTab === 'early-warning' && <GelezaEarlyWarningRadar onNavigateTab={handleSelectTab} />}
      {activeTab === 'announcements' && <AnnouncementsFeed />}
      {activeTab === 'settings' && <LearnerSettings />}
    </DashboardLayout>
  );
};
