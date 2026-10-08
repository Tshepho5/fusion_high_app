import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { AdminOverview } from './AdminOverview';
import { AdminUsers } from './AdminUsers';
import { AdminSupportDesk } from './AdminSupportDesk';
import { AdminLearnerImport } from './AdminLearnerImport';
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
import { SchoolAdmissionsManager } from '../../components/admin/SchoolAdmissionsManager';
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
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = Boolean(user?.is_superadmin);
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
      case 'school-admissions':
      case 'school-applications':
        return 'School Admissions & Campus Registrations';
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
      case 'import-learners':
        return 'Import Learners from SA-SAMS CSV';
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
      {(activeTab === 'school-admissions' || activeTab === 'school-applications') && (
        isSuperAdmin ? (
          <SchoolAdmissionsManager onNavigateTab={handleSelectTab} />
        ) : (
          <div className="p-8 text-center bg-white dark:bg-surface-dark rounded-3xl border border-slate-200 dark:border-white/10 space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Geleza SA Platform Administrator Access Only</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              School registration review and campus accreditation is managed exclusively by Geleza SA platform executives. School administrators focus on managing their registered institution.
            </p>
            <button
              onClick={() => handleSelectTab('overview')}
              className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-xs shadow-md"
            >
              Return to School Dashboard
            </button>
          </div>
        )
      )}
      {activeTab === 'command-center' && (
        isSuperAdmin ? (
          <MultiSchoolCommandCenter onNavigateTab={handleSelectTab} />
        ) : (
          <div className="p-8 text-center bg-white dark:bg-surface-dark rounded-3xl border border-slate-200 dark:border-white/10 space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Geleza SA Platform Command Access Only</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Multi-school provincial cross-monitoring is reserved for Geleza SA platform leadership.
            </p>
            <button
              onClick={() => handleSelectTab('overview')}
              className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-xs shadow-md"
            >
              Return to School Dashboard
            </button>
          </div>
        )
      )}
      {activeTab === 'inter-school' && <InterSchoolCompetitions />}
      {activeTab === 'consultations' && <ParentTeacherConsultations />}
      {activeTab === 'users' && <AdminUsers />}
      {activeTab === 'import-learners' && <AdminLearnerImport />}
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
        isSuperAdmin ? (
          <MasterAdminExecutiveHub onNavigateTab={handleSelectTab} />
        ) : (
          <div className="p-8 text-center bg-white dark:bg-surface-dark rounded-3xl border border-slate-200 dark:border-white/10 space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Platform Controls Restricted</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              System access gates and platform controls are managed exclusively by Geleza SA platform administrators.
            </p>
            <button
              onClick={() => handleSelectTab('overview')}
              className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-xs shadow-md"
            >
              Return to School Dashboard
            </button>
          </div>
        )
      )}
      {activeTab === 'metrics' && (
        <SchoolPerformanceMetricsView onNavigateTab={handleSelectTab} />
      )}
      {activeTab === 'settings' && <LearnerSettings />}
    </DashboardLayout>
  );
};
