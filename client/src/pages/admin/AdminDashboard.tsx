import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { AdminOverview } from './AdminOverview';
import { AdminUsers } from './AdminUsers';
import { AdminTimetable } from './AdminTimetable';
import { AnnouncementsFeed } from '../../components/common/AnnouncementsFeed';
import { SchoolCalendar } from '../../components/common/SchoolCalendar';
import { LearnerMessages } from '../learner/LearnerMessages';
import { LearnerProfile } from '../learner/LearnerProfile';
import { LearnerSettings } from '../learner/LearnerSettings';
import { ExamSeatingManager } from '../../components/common/ExamSeatingManager';
import { SportsExtracurriculars } from '../../components/common/SportsExtracurriculars';
import { TextbookAssetTracker } from '../../components/common/TextbookAssetTracker';
import { MatricPassRateProjector } from '../../components/admin/MatricPassRateProjector';
import { EducatorLeaveReliefManager } from '../../components/admin/EducatorLeaveReliefManager';
import { AcademicAssessmentAudits } from '../../components/admin/AcademicAssessmentAudits';
import { SchoolFeesManager } from '../../components/finance/SchoolFeesManager';
import { BursaryScholarshipHub } from '../../components/learner/BursaryScholarshipHub';
import { MultiSchoolCommandCenter } from '../../components/admin/MultiSchoolCommandCenter';
import { InterSchoolCompetitions } from '../../components/common/InterSchoolCompetitions';
import { ParentTeacherConsultations } from '../../components/parent/ParentTeacherConsultations';
import { ArrowLeft, ChevronRight, Home } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'command-center': return 'Multi-School Command Center & Comparative Analytics';
      case 'inter-school': return 'Inter-School Derbies, Sports & Academic Olympiads';
      case 'consultations': return 'Parent-Educator Academic Consultation Schedule';
      case 'users': return 'User Directory & Permissions';
      case 'finance': return 'School Fees, Invoicing & Collection Analytics';
      case 'marks': return 'CAPS Academic Assessment & SBA Mark Audits';
      case 'bursaries': return 'National Tertiary Bursaries Catalog';
      case 'matric-projector': return 'Matric Candidate Pass Rate Projector (Grade 12)';
      case 'leave-relief': return 'Educator Leave & Relief Duty Scheduler';
      case 'timetable': return 'School Timetable Allocations';
      case 'exam-seating': return 'Examination Seating Master Planner';
      case 'sports': return 'Sports & Extracurriculars Management';
      case 'textbooks': return 'Textbook & Learning Asset Inventory';
      case 'calendar': return 'School Calendar & Events Management';
      case 'announcements': return 'Official Broadcasts & Notices';
      case 'messages': return 'School Chat Hub & Communications';
      case 'settings': return 'App & Technical Settings';
      case 'profile': return 'Admin Settings';
      case 'overview':
      default: return 'School Executive Analytics';
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
            title="Back to Executive Overview"
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
              <span>Admin Hub</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-cyan-300 font-bold">{getTabTitle()}</span>
          </div>
        </div>
      )}

      {activeTab === 'overview' && (
        <AdminOverview onNavigateTab={handleSelectTab} />
      )}
      {activeTab === 'command-center' && <MultiSchoolCommandCenter />}
      {activeTab === 'inter-school' && <InterSchoolCompetitions />}
      {activeTab === 'consultations' && <ParentTeacherConsultations />}
      {activeTab === 'users' && <AdminUsers />}
      {activeTab === 'marks' && <AcademicAssessmentAudits />}
      {activeTab === 'finance' && <SchoolFeesManager userRole="admin" />}
      {activeTab === 'bursaries' && <BursaryScholarshipHub />}
      {activeTab === 'matric-projector' && <MatricPassRateProjector />}
      {activeTab === 'leave-relief' && <EducatorLeaveReliefManager />}
      {activeTab === 'timetable' && <AdminTimetable />}
      {activeTab === 'exam-seating' && <ExamSeatingManager />}
      {activeTab === 'sports' && <SportsExtracurriculars />}
      {activeTab === 'textbooks' && <TextbookAssetTracker />}
      {activeTab === 'calendar' && <SchoolCalendar />}
      {activeTab === 'announcements' && <AnnouncementsFeed />}
      {activeTab === 'messages' && <LearnerMessages />}
      {activeTab === 'profile' && <LearnerProfile />}
      {activeTab === 'settings' && <LearnerSettings />}
    </DashboardLayout>
  );
};
