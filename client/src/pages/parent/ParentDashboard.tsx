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
import { ParentTeacherConsultations } from '../../components/parent/ParentTeacherConsultations';
import { InterSchoolCompetitions } from '../../components/common/InterSchoolCompetitions';
import { SportsExtracurriculars } from '../../components/common/SportsExtracurriculars';
import { SchoolFeesManager } from '../../components/finance/SchoolFeesManager';
import { BursaryScholarshipHub } from '../../components/learner/BursaryScholarshipHub';
import { ParentMoreHub } from './ParentMoreHub';
import { ModulePageHeader } from '../../components/layout/WorkspaceChrome';

const CHILD_SCOPED_TABS = new Set(['children', 'marks', 'reports', 'attendance', 'timetable', 'finance']);

export const ParentDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [tabHistory, setTabHistory] = useState<Array<{ tab: string; child: string }>>([]);
  const selectedChildId = searchParams.get('child') || searchParams.get('child_id') || '';

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams, activeTab]);

  const handleSelectTab = (tabId: string, childOrParams?: string | number | Record<string, any>) => {
    let nextChild = selectedChildId;
    if (typeof childOrParams === 'string' || typeof childOrParams === 'number') {
      nextChild = String(childOrParams);
    } else if (childOrParams && typeof childOrParams === 'object') {
      const fromParams = childOrParams.child ?? childOrParams.childId ?? childOrParams.child_id;
      if (fromParams !== undefined && fromParams !== null && fromParams !== '') {
        nextChild = String(fromParams);
      }
    }

    if (tabId !== activeTab) {
      setTabHistory((prev) => [...prev, { tab: activeTab, child: selectedChildId }].slice(-24));
    }
    setActiveTab(tabId);
    const nextParams: Record<string, string> = { tab: tabId };
    if (nextChild && CHILD_SCOPED_TABS.has(tabId)) {
      nextParams.child = nextChild;
    }
    setSearchParams(nextParams);
  };

  const placeName = (tabId: string) => {
    const names: Record<string, string> = {
      overview: 'Home',
      home: 'Home',
      more: 'Menu',
      children: 'Children',
      marks: 'Marks',
      finance: 'Fees',
      bursaries: 'Bursaries',
      reports: 'Reports',
      ptc: 'Consultations',
      consultations: 'Consultations',
      'inter-school': 'Olympiads',
      sports: 'Sports',
      timetable: 'Timetable',
      calendar: 'Calendar',
      attendance: 'Attendance',
      announcements: 'Notices',
      messages: 'Messages',
      settings: 'Settings',
      profile: 'Profile',
    };
    return names[tabId] || 'Menu';
  };

  const fallbackTarget = () => {
    if (activeTab === 'more' || activeTab === 'children' || activeTab === 'marks') return 'overview';
    return 'more';
  };

  const previous = tabHistory[tabHistory.length - 1];
  const resolvedBack = previous && previous.tab !== activeTab ? previous.tab : fallbackTarget();
  const backTarget = resolvedBack === activeTab ? 'overview' : resolvedBack;

  const openTab = (tabId: string, childId: string) => {
    setActiveTab(tabId);
    const nextParams: Record<string, string> = { tab: tabId };
    if (childId && CHILD_SCOPED_TABS.has(tabId)) nextParams.child = childId;
    setSearchParams(nextParams);
  };

  const handleBack = () => {
    const childId = previous?.child || selectedChildId;
    setTabHistory((prev) => (prev.length ? prev.slice(0, -1) : prev));
    openTab(backTarget, childId);
  };

  const showBack = activeTab !== 'overview' && activeTab !== 'messages';

  const getTabTitle = () => {
    switch (activeTab) {
      case 'children':
      case 'marks': return 'Child Academic Reports & Marks';
      case 'finance': return 'School Fees, Statements & Online Payments';
      case 'bursaries': return 'NSFAS & Tertiary Bursaries Matching Hub';
      case 'reports': return 'Official CAPS Term Report Card';
      case 'ptc':
      case 'consultations': return 'Parent-Teacher Consultations & Conferences';
      case 'inter-school': return 'Inter-School Derbies, Sports & Academic Olympiads';
      case 'sports': return 'Sports, Clubs & Match Fixtures';
      case 'timetable': return 'Child Weekly Class Timetable';
      case 'calendar': return 'School & Class Calendar';
      case 'attendance': return 'Child Attendance & Punctuality Records';
      case 'announcements': return 'School Notices & Broadcasts';
      case 'messages': return 'Teacher Communications';
      case 'settings': return 'App & Technical Settings';
      case 'profile': return 'Parent Profile';
      case 'more': return 'Main Navigation Menu';
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
      {showBack && (
        <ModulePageHeader
          title={getTabTitle()}
          parentLabel={placeName(backTarget)}
          backLabel={`Back to ${placeName(backTarget)}`}
          onBack={handleBack}
        />
      )}

      {activeTab === 'overview' && (
        <ParentOverview onNavigateTab={handleSelectTab} />
      )}
      {activeTab === 'more' && (
        <ParentMoreHub onNavigateTab={handleSelectTab} />
      )}
      {(activeTab === 'children' || activeTab === 'marks') && <ParentChildren childId={selectedChildId} />}
      {activeTab === 'finance' && <SchoolFeesManager userRole="parent" childId={selectedChildId || undefined} />}
      {activeTab === 'bursaries' && <BursaryScholarshipHub isParentView={true} />}
      {activeTab === 'reports' && <CapsReportCard childId={selectedChildId || undefined} onNavigateTab={handleSelectTab} />}
      {(activeTab === 'ptc' || activeTab === 'consultations') && <ParentTeacherConsultations />}
      {activeTab === 'inter-school' && <InterSchoolCompetitions />}
      {activeTab === 'sports' && <SportsExtracurriculars />}
      {activeTab === 'timetable' && <ParentTimetable childId={selectedChildId} onNavigateTab={handleSelectTab} />}
      {activeTab === 'calendar' && <SchoolCalendar />}
      {activeTab === 'attendance' && <ParentAttendance childId={selectedChildId} onNavigateTab={handleSelectTab} />}
      {activeTab === 'announcements' && <AnnouncementsFeed />}
      {activeTab === 'messages' && <LearnerMessages onBack={handleBack} />}
      {activeTab === 'profile' && <LearnerProfile />}
      {activeTab === 'settings' && <LearnerSettings />}
    </DashboardLayout>
  );
};
