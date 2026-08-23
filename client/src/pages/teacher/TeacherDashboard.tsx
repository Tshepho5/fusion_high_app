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
import { TeacherPTC } from '../../components/teacher/TeacherPTC';
import { TeacherConduct } from '../../components/teacher/TeacherConduct';
import { ExamSeatingManager } from '../../components/common/ExamSeatingManager';
import { SportsExtracurriculars } from '../../components/common/SportsExtracurriculars';
import { TextbookAssetTracker } from '../../components/common/TextbookAssetTracker';
import { EducatorLeaveReliefManager } from '../../components/admin/EducatorLeaveReliefManager';
import { TeacherAssignments } from '../../components/teacher/TeacherAssignments';

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
      case 'subjects':
      case 'classes':
      case 'workload':
        return 'My Subjects & CAPS Workload';
      case 'resources': return 'Learning Resources & Past Papers Studio';
      case 'ai-tools': return 'AI Lesson & Test Builder';
      case 'ptc': return 'Parent-Teacher Conferences (PTC)';
      case 'conduct': return 'Merit & Disciplinary Management';
      case 'my-leave': return 'Educator Leave & Relief Duty';
      case 'exam-seating': return 'Examination Seating Planner';
      case 'sports': return 'Sports & Extracurricular Clubs';
      case 'textbooks': return 'Textbook & Learning Asset Inventory';
      case 'timetable': return 'Educator Timetable & Curriculum Allocations';
      case 'calendar': return 'Academic & Events Calendar';
      case 'attendance': return 'Class Attendance Register';
      case 'assessments': return 'Marks & Assessments';
      case 'assignments': return 'Homework & Digital Assignment Submission Hub';
      case 'announcements': return 'School Notices & Broadcasts';
      case 'messages': return 'Communication Hub';
      case 'settings': return 'App & Technical Settings';
      case 'profile': return 'Teacher Profile';
      case 'overview':
      default: return 'Educator Workspace';
    }
  };

  return (
    <DashboardLayout
      activeTab={activeTab}
      onSelectTab={handleSelectTab}
      title={getTabTitle()}
    >
      {activeTab === 'overview' && (
        <TeacherOverview onNavigateTab={handleSelectTab} />
      )}
      {(activeTab === 'subjects' || activeTab === 'classes' || activeTab === 'workload') && (
        <TeacherSubjects onNavigateTab={handleSelectTab} />
      )}
      {activeTab === 'assignments' && <TeacherAssignments />}
      {activeTab === 'resources' && (
        <TeacherResources onNavigateTab={handleSelectTab} />
      )}
      {activeTab === 'ai-tools' && <TeacherAITools />}
      {activeTab === 'ptc' && <TeacherPTC />}
      {activeTab === 'conduct' && <TeacherConduct />}
      {activeTab === 'my-leave' && <EducatorLeaveReliefManager />}
      {activeTab === 'exam-seating' && <ExamSeatingManager />}
      {activeTab === 'sports' && <SportsExtracurriculars />}
      {activeTab === 'textbooks' && <TextbookAssetTracker />}
      {activeTab === 'timetable' && <TeacherTimetable />}
      {activeTab === 'calendar' && <SchoolCalendar />}
      {activeTab === 'attendance' && <TeacherAttendance />}
      {activeTab === 'assessments' && <TeacherAssessments />}
      {activeTab === 'announcements' && <AnnouncementsFeed />}
      {activeTab === 'messages' && <LearnerMessages />}
      {activeTab === 'profile' && <LearnerProfile />}
      {activeTab === 'settings' && <LearnerSettings />}
    </DashboardLayout>
  );
};
