import React, { useState } from 'react';
import { LearnerMessages } from '../learner/LearnerMessages';
import { AnnouncementsFeed } from '../../components/common/AnnouncementsFeed';
import { ParentTeacherConsultations } from '../../components/parent/ParentTeacherConsultations';
import { MessageSquare, Megaphone, Users } from 'lucide-react';

interface AdminMessagesHubProps {
  initialSubTab?: 'messages' | 'announcements' | 'consultations';
}

export const AdminMessagesHub: React.FC<AdminMessagesHubProps> = ({
  initialSubTab = 'messages',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'messages' | 'announcements' | 'consultations'>(initialSubTab);

  return (
    <div className="space-y-6 animate-fade-in text-slate-900 dark:text-slate-100 pb-16">
      {/* Top Header & Switcher */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-surface-dark border border-slate-200/90 dark:border-white/10 shadow-sm relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-xs font-semibold">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Communications & Broadcasts</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black font-display text-slate-900 dark:text-white tracking-tight">
            Institutional Messaging Center
          </h1>
        </div>

        {/* Sub-Tab Navigation Bar */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-surface-darker rounded-2xl border border-slate-200 dark:border-white/10 shrink-0 self-start sm:self-center">
          <button
            onClick={() => setActiveSubTab('messages')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'messages'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/30'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white/5'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Direct Chat</span>
          </button>

          <button
            onClick={() => setActiveSubTab('announcements')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'announcements'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/30'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white/5'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Official Notices</span>
          </button>

          <button
            onClick={() => setActiveSubTab('consultations')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'consultations'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/30'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Parent Consultations</span>
          </button>
        </div>
      </div>

      {/* Content Rendering */}
      <div>
        {activeSubTab === 'messages' && <LearnerMessages />}
        {activeSubTab === 'announcements' && <AnnouncementsFeed />}
        {activeSubTab === 'consultations' && <ParentTeacherConsultations />}
      </div>
    </div>
  );
};
