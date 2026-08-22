import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { LearnerOverview } from './LearnerOverview';
import { LearnerSubjects } from './LearnerSubjects';
import { LearnerAITutor } from './LearnerAITutor';
import { LearnerTimetable } from './LearnerTimetable';
import { LearnerMessages } from './LearnerMessages';
import { LearnerProfile } from './LearnerProfile';
import { CapsReportCard } from '../../components/common/CapsReportCard';
import { AnnouncementsFeed } from '../../components/common/AnnouncementsFeed';
import { SchoolCalendar } from '../../components/common/SchoolCalendar';
import { LearnerCareerAdvisor } from '../../components/learner/LearnerCareerAdvisor';
import { ExamSeatingManager } from '../../components/common/ExamSeatingManager';
import { SportsExtracurriculars } from '../../components/common/SportsExtracurriculars';
import { TextbookAssetTracker } from '../../components/common/TextbookAssetTracker';
import { LearnerAssignments } from '../../components/learner/LearnerAssignments';
import { BursaryScholarshipHub } from '../../components/learner/BursaryScholarshipHub';
import { SchoolFeesManager } from '../../components/finance/SchoolFeesManager';

export const LearnerDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // State passed to AI Tutor when launching from Subjects
  const [tutorContext, setTutorContext] = useState<{
    subject: string;
    topicId?: string;
    topicName?: string;
  }>({
    subject: 'Mathematics',
  });

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

  const handleStartAITopic = (subject: string, topicId: string, topicName: string) => {
    setTutorContext({ subject, topicId, topicName });
    handleSelectTab('ai-tutor');
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'subjects': return 'My Subjects';
      case 'ai-tutor': return 'AI Study Tutor';
      case 'career-advisor': return 'Matric APS & University Career Advisor';
      case 'bursaries': return 'NSFAS & Tertiary Bursary Matching Engine';
      case 'finance': return 'School Fee Statements & Receipts';
      case 'exam-seating': return 'Examination Seating & Candidate Slips';
      case 'sports': return 'Sports & Extracurricular Clubs';
      case 'textbooks': return 'My Issued Textbooks';
      case 'assignments': return 'Homework & Digital Assignments Hub';
      case 'reports': return 'Official CAPS Term Report Card';
      case 'timetable': return 'Weekly Timetable';
      case 'calendar': return 'Academic & Events Calendar';
      case 'announcements': return 'School Notices & Broadcasts';
      case 'messages': return 'Message Center';
      case 'profile': return 'My Profile & Settings';
      case 'overview':
      default: return 'Home';
    }
  };

  return (
    <DashboardLayout
      activeTab={activeTab}
      onSelectTab={handleSelectTab}
      title={getTabTitle()}
    >
      {activeTab === 'overview' && (
        <LearnerOverview onNavigateTab={handleSelectTab} />
      )}
      {activeTab === 'subjects' && (
        <LearnerSubjects onStartAITopic={handleStartAITopic} />
      )}
      {activeTab === 'assignments' && <LearnerAssignments />}
      {activeTab === 'ai-tutor' && (
        <LearnerAITutor
          initialSubject={tutorContext.subject}
          initialTopicId={tutorContext.topicId}
          initialTopicName={tutorContext.topicName}
        />
      )}
      {activeTab === 'career-advisor' && <LearnerCareerAdvisor />}
      {activeTab === 'bursaries' && <BursaryScholarshipHub isParentView={false} />}
      {activeTab === 'finance' && <SchoolFeesManager userRole="learner" />}
      {activeTab === 'exam-seating' && <ExamSeatingManager />}
      {activeTab === 'sports' && <SportsExtracurriculars />}
      {activeTab === 'textbooks' && <TextbookAssetTracker />}
      {activeTab === 'reports' && <CapsReportCard />}
      {activeTab === 'timetable' && <LearnerTimetable />}
      {activeTab === 'calendar' && <SchoolCalendar />}
      {activeTab === 'announcements' && <AnnouncementsFeed />}
      {activeTab === 'messages' && <LearnerMessages />}
      {activeTab === 'profile' && <LearnerProfile />}
    </DashboardLayout>
  );
};
