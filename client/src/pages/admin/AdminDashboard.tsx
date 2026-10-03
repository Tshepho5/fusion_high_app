import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { AdminOverview } from './AdminOverview';
import { AdminUsers } from './AdminUsers';
import { AdminSupportDesk } from './AdminSupportDesk';
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
import { SchoolSubjectsManager } from '../../components/admin/SchoolSubjectsManager';
import { ReportCardStudio } from '../../components/admin/ReportCardStudio';
import { SchoolFeesManager } from '../../components/finance/SchoolFeesManager';
import { BursaryScholarshipHub } from '../../components/learner/BursaryScholarshipHub';
import { MultiSchoolCommandCenter } from '../../components/admin/MultiSchoolCommandCenter';
import { InterSchoolCompetitions } from '../../components/common/InterSchoolCompetitions';
import { ParentTeacherConsultations } from '../../components/parent/ParentTeacherConsultations';
import { DynamicClassesManager } from '../../components/admin/DynamicClassesManager';
import { AdminMoreHub } from './AdminMoreHub';
import { AdminDiscoverHub } from './AdminDiscoverHub';
import { AdminCalendarHub } from './AdminCalendarHub';
import { AdminMessagesHub } from './AdminMessagesHub';
import { ModulePageHeader } from '../../components/layout/WorkspaceChrome';
import { MasterAdminExecutiveHub } from '../../components/admin/MasterAdminExecutiveHub';
import { SchoolPerformanceMetricsView } from '../../components/admin/SchoolPerformanceMetricsView';

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

  const handleSelectTab = (tabId: string, params?: any) => {
    setActiveTab(tabId);
    const newParams: Record<string, string> = { tab: tabId };
    if (params) {
      Object.keys(params).forEach((key) => {
        if (params[key] !== undefined && params[key] !== null) {
          newParams[key] = String(params[key]);
        }
      });
    }
    setSearchParams(newParams);
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'home':
      case 'overview':
        return 'School Executive Analytics';
      case 'calendar':
        return 'Master School Calendar & Events';
      case 'timetable':
        return 'Master Timetable Allocations';
      case 'profile':
        return 'Admin Institutional Profile & Identity';
      case 'discover':
        return 'Inter-School & Provincial Leadership Hub';
      case 'command-center':
        return 'Multi-School Command Center & Comparative Analytics';
      case 'inter-school':
        return 'Inter-School Derbies, Sports & Academic Olympiads';
      case 'bursaries':
        return 'National Tertiary Bursaries Catalog';
      case 'messages':
        return 'Institutional Messaging Center';
      case 'announcements':
        return 'Official Broadcasts & Institutional Notices';
      case 'consultations':
        return 'Parent-Educator Academic Consultation Schedule';
      case 'more':
        return 'Administrative Operations & Module Directory';
      case 'users':
        return 'User Directory & Role Permissions';
      case 'support-desk':
        return 'User Support Desk & Application Corrections';
      case 'subjects':
        return 'School Curriculum & Subject Registers';
      case 'reports':
        return 'CAPS Official Report Card Studio & Publishing';
      case 'marks':
        return 'CAPS Academic Assessment & SBA Mark Audits';
      case 'finance':
        return 'School Fees, Invoicing & Collection Analytics';
      case 'matric-projector':
        return 'Matric Candidate Pass Rate Projector (Grade 12)';
      case 'leave-relief':
        return 'Educator Leave & Relief Duty Scheduler';
      case 'exam-seating':
        return 'Examination Seating Master Planner';
      case 'sports':
        return 'Sports & Extracurriculars Management';
      case 'textbooks':
        return 'Textbook & Learning Asset Inventory';
      case 'classes-streams':
        return 'Dynamic Classes & Homeroom Teacher Allocations';
      case 'staff-invites':
        return 'Faculty & Sports Coach Invitations';
      case 'testers':
      case 'portal-controls':
        return 'Executive Master Controls & Beta Testers Hub';
      case 'metrics':
        return 'School Performance Metrics & Indicators';
      case 'settings':
        return 'App & Technical Settings';
      default:
        return 'Administrative Control Center';
    }
  };

  // Back button on every module; Home has no back
  const showBack = activeTab !== 'overview' && activeTab !== 'home';

  // Determine intelligent backtrack target
  const getBacktrackConfig = () => {
    if (activeTab === 'more') {
      return { target: 'overview', label: 'Back to Home', parentLabel: 'Home' };
    }
    if (activeTab === 'command-center' || activeTab === 'inter-school' || activeTab === 'bursaries') {
      return { target: 'discover', label: 'Back to Discover', parentLabel: 'Discover' };
    }
    if (activeTab === 'announcements' || activeTab === 'consultations') {
      return { target: 'messages', label: 'Back to Messages', parentLabel: 'Messages' };
    }
    if (activeTab === 'timetable') {
      return { target: 'calendar', label: 'Back to Calendar', parentLabel: 'Calendar' };
    }
    if (activeTab === 'calendar' || activeTab === 'profile' || activeTab === 'discover' || activeTab === 'messages') {
      return { target: 'overview', label: 'Back to Home', parentLabel: 'Home' };
    }
    return { target: 'more', label: 'Back to Menu', parentLabel: 'Menu' };
  };

  const backtrack = getBacktrackConfig();

  return (
    <DashboardLayout
      activeTab={activeTab}
      onSelectTab={handleSelectTab}
      title={getTabTitle()}
    >
      {showBack && (
        <ModulePageHeader
          title={getTabTitle()}
          parentLabel={backtrack.parentLabel}
          backLabel={backtrack.label}
          onBack={() => handleSelectTab(backtrack.target)}
        />
      )}

      {/* ========================================================================= */}
      {/* 1. PRIMARY TABS                                                          */}
      {/* ========================================================================= */}
      {(activeTab === 'overview' || activeTab === 'home') && (
        <AdminOverview onNavigateTab={handleSelectTab} />
      )}

      {activeTab === 'calendar' && (
        <AdminCalendarHub initialSubTab="calendar" />
      )}

      {activeTab === 'profile' && (
        <LearnerProfile />
      )}

      {activeTab === 'discover' && (
        <AdminDiscoverHub onNavigateTab={handleSelectTab} />
      )}

      {activeTab === 'messages' && (
        <AdminMessagesHub initialSubTab="messages" />
      )}

      {activeTab === 'more' && (
        <AdminMoreHub onNavigateTab={handleSelectTab} />
      )}

      {/* ========================================================================= */}
      {/* 2. SUB-MODULE VIEWS (Direct URL / More Hub Access with Full Persistence)   */}
      {/* ========================================================================= */}
      {activeTab === 'command-center' && <MultiSchoolCommandCenter />}
      {activeTab === 'inter-school' && <InterSchoolCompetitions />}
      {activeTab === 'consultations' && <ParentTeacherConsultations />}
      {activeTab === 'users' && <AdminUsers />}
      {activeTab === 'support-desk' && <AdminSupportDesk />}
      {activeTab === 'subjects' && (
        <SchoolSubjectsManager onOpenReportCardStudio={(g, s) => handleSelectTab('reports')} />
      )}
      {activeTab === 'reports' && <ReportCardStudio />}
      {activeTab === 'marks' && <AcademicAssessmentAudits />}
      {activeTab === 'finance' && <SchoolFeesManager userRole="admin" />}
      {activeTab === 'bursaries' && <BursaryScholarshipHub />}
      {activeTab === 'matric-projector' && <MatricPassRateProjector />}
      {activeTab === 'leave-relief' && <EducatorLeaveReliefManager />}
      {activeTab === 'timetable' && <AdminTimetable />}
      {activeTab === 'exam-seating' && <ExamSeatingManager />}
      {activeTab === 'sports' && <SportsExtracurriculars />}
      {activeTab === 'textbooks' && <TextbookAssetTracker forcedRole="admin" />}
      {activeTab === 'classes-streams' && <DynamicClassesManager initialTab="classes" />}
      {activeTab === 'staff-invites' && <DynamicClassesManager initialTab="invites" />}
      {activeTab === 'announcements' && <AnnouncementsFeed />}
      {(activeTab === 'testers' || activeTab === 'portal-controls') && (
        <MasterAdminExecutiveHub onNavigateTab={handleSelectTab} />
      )}
      {activeTab === 'metrics' && (
        <SchoolPerformanceMetricsView onNavigateTab={handleSelectTab} />
      )}
      {activeTab === 'settings' && <LearnerSettings />}
    </DashboardLayout>
  );
};
