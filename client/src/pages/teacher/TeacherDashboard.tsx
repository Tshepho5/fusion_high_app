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
import { ArrowLeft, ChevronRight, Home } from 'lucide-react';

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
      {/* Universal Module Backtrack Navigation Bar */}
      {activeTab !== 'overview' && (
        <div className="flex items-center justify-between gap-3 p-3 mb-6 rounded-2xl bg-surface-dark border border-white/10 shadow-sm animate-fade-in">
          <button
            onClick={() => handleSelectTab('overview')}
            className="px-3.5 py-1.5 rounded-xl bg-surface-darker hover:bg-white/10 border border-white/10 hover:border-brand-500/40 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-2 transition-all shadow-sm group"
            title="Back to Educator Overview"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Overview</span>
          </button>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            <button
              onClick={() => handleSelectTab('overview')}
              className="hover:text-white flex items-center gap-1 transition-colors"
            >
              <Home className="w-3.5 h-3.5 text-brand-400" />
              <span>Workspace</span>
            </button>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <span className="text-cyan-300 font-bold">{getTabTitle()}</span>
          </div>
        </div>
      )}

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
      {(activeTab === 'ptc' || activeTab === 'consultations') && <ParentTeacherConsultations />}
      {activeTab === 'inter-school' && <InterSchoolCompetitions />}
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
