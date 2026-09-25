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
import {
  ArrowLeft,
  ChevronRight,
  Home,
  LayoutGrid,
  Compass,
  Calendar,
  MessageSquare,
} from 'lucide-react';

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
      case 'settings':
        return 'App & Technical Settings';
      default:
        return 'Administrative Control Center';
    }
  };

  const isSubModule =
    activeTab !== 'overview' &&
    activeTab !== 'home' &&
    activeTab !== 'calendar' &&
    activeTab !== 'profile' &&
    activeTab !== 'discover' &&
    activeTab !== 'messages' &&
    activeTab !== 'more';

  // Determine intelligent backtrack target
  const getBacktrackConfig = () => {
    if (activeTab === 'command-center' || activeTab === 'inter-school' || activeTab === 'bursaries') {
      return { target: 'discover', label: 'Back to Discover', parentLabel: 'Discover', icon: Compass };
    }
    if (activeTab === 'announcements' || activeTab === 'consultations') {
      return { target: 'messages', label: 'Back to Messages', parentLabel: 'Messages', icon: MessageSquare };
    }
    if (activeTab === 'timetable') {
      return { target: 'calendar', label: 'Back to Calendar', parentLabel: 'Calendar', icon: Calendar };
    }
    return { target: 'more', label: 'Back to Menu', parentLabel: 'Menu', icon: LayoutGrid };
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
        <div className="flex items-center justify-between gap-3 p-3 mb-6 rounded-2xl bg-white dark:bg-surface-dark border border-slate-200/90 dark:border-white/10 shadow-sm animate-fade-in">
          <button
            onClick={() => handleSelectTab(backtrack.target)}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-surface-darker hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 hover:border-cyan-500/40 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white font-bold text-xs flex items-center gap-2 transition-all shadow-sm group cursor-pointer"
            title={backtrack.label}
          >
            <ArrowLeft className="w-4 h-4 text-cyan-600 dark:text-cyan-400 group-hover:-translate-x-1 transition-transform" />
            <span>{backtrack.label}</span>
          </button>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
            <button
              onClick={() => handleSelectTab(backtrack.target)}
              className="hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <backtrack.icon className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>{backtrack.parentLabel}</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />
            <span className="text-cyan-600 dark:text-cyan-300 font-bold">{getTabTitle()}</span>
          </div>
        </div>
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
      {activeTab === 'settings' && <LearnerSettings />}
    </DashboardLayout>
  );
};
