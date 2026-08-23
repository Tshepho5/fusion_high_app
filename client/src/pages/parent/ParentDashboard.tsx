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
