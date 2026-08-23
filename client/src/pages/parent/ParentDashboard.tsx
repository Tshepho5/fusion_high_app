import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { ParentOverview } from './ParentOverview';
import { ParentChildren } from './ParentChildren';
import { ParentTimetable } from './ParentTimetable';
import { ParentAttendance } from './ParentAttendance';
import { CapsReportCard } from '../../components/common/CapsReportCard';
import { AnnouncementsFeed } from '../../components/common/AnnouncementsFeed';
import { SchoolCalendar } from '../../components/common/SchoolCalendar';
import { LearnerMessages } from '../learner/LearnerMessages';
import { LearnerProfile } from '../learner/LearnerProfile';
import { LearnerSettings } from '../learner/LearnerSettings';
import { ParentPTC } from '../../components/parent/ParentPTC';
import { SportsExtracurriculars } from '../../components/common/SportsExtracurriculars';
import { SchoolFeesManager } from '../../components/finance/SchoolFeesManager';
import { BursaryScholarshipHub } from '../../components/learner/BursaryScholarshipHub';
import { ArrowLeft, ChevronRight, Home } from 'lucide-react';

export const ParentDashboard: React.FC = () => {
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
      case 'children':
      case 'marks': return 'Child Academic Reports & Marks';
      case 'finance': return 'School Fees, Statements & Online Payments';
      case 'bursaries': return 'NSFAS & Tertiary Bursaries Matching Hub';
      case 'reports': return 'Official CAPS Term Report Card';
      case 'ptc': return 'Parent-Teacher Conferences (PTC)';
      case 'sports': return 'Sports, Clubs & Match Fixtures';
      case 'timetable': return 'Child Weekly Class Timetable';
      case 'calendar': return 'School & Class Calendar';
      case 'attendance': return 'Child Attendance & Punctuality Records';
      case 'announcements': return 'School Notices & Broadcasts';
      case 'messages': return 'Teacher Communications';
      case 'settings': return 'App & Technical Settings';
      case 'profile': return 'Parent Profile';
      case 'overview':
      default: return 'Family Learning Hub';
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
            className="px-3.5 py-1.5 rounded-xl bg-surface-darker hover:bg-white/10 border border-white/10 hover:border-amber-500/40 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-2 transition-all shadow-sm group"
            title="Back to Parent Portal Overview"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Overview</span>
          </button>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            <button
              onClick={() => handleSelectTab('overview')}
              className="hover:text-white flex items-center gap-1 transition-colors"
            >
              <Home className="w-3.5 h-3.5 text-amber-400" />
              <span>Portal</span>
            </button>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <span className="text-amber-300 font-bold">{getTabTitle()}</span>
          </div>
        </div>
      )}

      {activeTab === 'overview' && (
        <ParentOverview onNavigateTab={handleSelectTab} />
      )}
      {(activeTab === 'children' || activeTab === 'marks') && <ParentChildren />}
      {activeTab === 'finance' && <SchoolFeesManager userRole="parent" />}
      {activeTab === 'bursaries' && <BursaryScholarshipHub isParentView={true} />}
      {activeTab === 'reports' && <CapsReportCard />}
      {activeTab === 'ptc' && <ParentPTC />}
      {activeTab === 'sports' && <SportsExtracurriculars />}
      {activeTab === 'timetable' && <ParentTimetable />}
      {activeTab === 'calendar' && <SchoolCalendar />}
      {activeTab === 'attendance' && <ParentAttendance />}
      {activeTab === 'announcements' && <AnnouncementsFeed />}
      {activeTab === 'messages' && <LearnerMessages />}
      {activeTab === 'profile' && <LearnerProfile />}
      {activeTab === 'settings' && <LearnerSettings />}
    </DashboardLayout>
  );
};
