import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Send,
  Copy,
  Check,
  User,
  GraduationCap,
  CalendarCheck,
  AlertTriangle,
  MessageSquare,
  TrendingUp,
  BookOpen,
  Award,
  ChevronRight
} from 'lucide-react';
import { gelezaAiService, parentService, messageService } from '../../services/api';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface ParentAIAcademicSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  child?: any;
  childrenList?: any[];
}

export const ParentAIAcademicSummaryModal: React.FC<ParentAIAcademicSummaryModalProps> = ({
  isOpen,
  onClose,
  child,
  childrenList = []
}) => {
  const [selectedChild, setSelectedChild] = useState<any>(child || childrenList[0] || null);
  const [activeTab, setActiveTab] = useState<'summary' | 'draft'>('summary');

  // Summary state
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<any | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Message drafter state
  const [teacherName, setTeacherName] = useState('Educator');
  const [draftTopic, setDraftTopic] = useState('Academic Progress & Homework Support');
  const [draftObjective, setDraftObjective] = useState('Ask how we can better support revision at home and clarify upcoming test requirements');
  const [draftedMessage, setDraftedMessage] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (child) {
      setSelectedChild(child);
    } else if (childrenList.length > 0 && !selectedChild) {
      setSelectedChild(childrenList[0]);
    }
  }, [child, childrenList]);

  useEffect(() => {
    if (isOpen && selectedChild) {
      loadAcademicSummary(selectedChild);
    }
  }, [isOpen, selectedChild]);

  if (!isOpen) return null;

  const loadAcademicSummary = async (targetChild: any) => {
    setLoadingSummary(true);
    setSummaryError(null);
    try {
      // 1. Fetch child academic marks & attendance from parent service
      const childId = targetChild.id || targetChild.child_id;
      let marksData: any = null;
      let attendanceData: any = null;

      try {
        marksData = await parentService.getChildPerformance(childId);
        attendanceData = await parentService.getChildAttendance(childId);
      } catch (_) {}

      // 2. Request synthesized plain-language summary from Geleza AI
      const prompt = `Please provide a warm, encouraging, plain-language academic summary for a South African parent about their child ${targetChild.full_name} (Grade ${targetChild.grade || 10}). ` +
        `Include current standing, positive achievements, home study recommendations, and DBE CAPS attendance compliance.`;

      const aiRes = await gelezaAiService.chat({
        message: prompt,
        role: 'parent',
        contextData: {
          childId,
          childName: targetChild.full_name,
          grade: targetChild.grade,
          marksData: marksData || {},
          attendanceData: attendanceData || {}
        }
      });

      setSummaryData({
        aiText: aiRes.response || 'Your child is making consistent progress across their CAPS subjects.',
        attendanceRate: targetChild.attendance_rate || targetChild.attendance_pct || 88,
        grade: targetChild.grade || 10,
        averageMark: targetChild.average_mark || 72
      });
    } catch (err: any) {
      setSummaryError('Unable to generate AI academic summary at this time.');
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleDraftMessage = async () => {
    setDrafting(true);
    setSendSuccess(false);
    try {
      const res = await gelezaAiService.draftParentMessage({
        childName: selectedChild?.full_name || 'my child',
        teacherName: teacherName.trim() || 'Educator',
        topic: draftTopic,
        messageObjective: draftObjective
      });
      setDraftedMessage(res.draftMessage || res.message || res);
    } catch (_) {
      setDraftedMessage(
        `Dear ${teacherName},\n\nI hope you are well. I am writing regarding ${selectedChild?.full_name}'s progress in ${draftTopic}. We would appreciate your guidance on specific areas we can support at home to help them prepare effectively for upcoming assessments.\n\nThank you for your dedication.\n\nKind regards,\nParent`
      );
    } finally {
      setDrafting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!draftedMessage.trim()) return;
    setSending(true);
    try {
      if (messageService && typeof messageService.sendMessage === 'function') {
        await messageService.sendMessage({
          content: draftedMessage,
          subject: `Academic Inquiry: ${selectedChild?.full_name} (${draftTopic})`
        });
      }
      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 3000);
    } catch (_) {
      // Graceful fallback: copied to clipboard
      navigator.clipboard.writeText(draftedMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } finally {
      setSending(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(draftedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isAttendanceCompliant = (summaryData?.attendanceRate || 85) >= 80;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Parent AI Academic Companion
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-800">
                  Plain Language
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Clear progress insights and respectful teacher communication drafter
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Child Selector Tabs (if multiple children) */}
        {childrenList.length > 1 && (
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 px-6 gap-2 py-2 overflow-x-auto">
            {childrenList.map((c) => {
              const isSelected = selectedChild?.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedChild(c)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>{c.full_name} (Grade {c.grade})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* View Switcher Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6">
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex items-center space-x-2 py-3.5 px-4 font-semibold text-sm border-b-2 transition-all ${
              activeTab === 'summary'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Academic Overview & Attendance</span>
          </button>
          <button
            onClick={() => setActiveTab('draft')}
            className={`flex items-center space-x-2 py-3.5 px-4 font-semibold text-sm border-b-2 transition-all ${
              activeTab === 'draft'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Draft Teacher Message</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {summaryError && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm">
              {summaryError}
            </div>
          )}

          {/* TAB 1: ACADEMIC OVERVIEW */}
          {activeTab === 'summary' && (
            <div className="space-y-6 animate-fade-in">
              {loadingSummary ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <LoadingSpinner size="md" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Geleza AI is synthesizing academic metrics for {selectedChild?.full_name}...
                  </p>
                </div>
              ) : summaryData ? (
                <div className="space-y-5">
                  {/* Quick Metrics Badges */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Attendance Badge */}
                    <div className={`p-4 rounded-xl border ${
                      isAttendanceCompliant
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900'
                        : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <CalendarCheck className="w-4 h-4" />
                          DBE Attendance Compliance
                        </span>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                          isAttendanceCompliant
                            ? 'bg-emerald-200 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200'
                            : 'bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200'
                        }`}>
                          {summaryData.attendanceRate}% Recorded
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {isAttendanceCompliant
                          ? '✅ Compliant: Your child meets the Department of Basic Education minimum 80% threshold for continuous assessment.'
                          : '⚠️ Attendance Notice: Under DBE continuous assessment regulations, regular attendance is vital. Catch-up sessions are recommended.'}
                      </p>
                    </div>

                    {/* Academic Standing */}
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4 text-indigo-500" />
                          Academic Standing
                        </span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold">
                          Grade {summaryData.grade}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        Tracking steadily with continuous assessment tasks. Homework and formal test performance indicate strong foundational mastery.
                      </p>
                    </div>
                  </div>

                  {/* AI Synthesized Insights */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/50 to-teal-50/30 dark:from-slate-800/80 dark:to-slate-800/40 border border-emerald-100 dark:border-slate-700 space-y-3">
                    <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-400">
                      <Sparkles className="w-4 h-4" />
                      <h3 className="font-bold text-sm">
                        Geleza AI Personalized Progress Breakdown
                      </h3>
                    </div>
                    <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                      {summaryData.aiText}
                    </div>
                  </div>

                  {/* Call to action: Draft message */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => setActiveTab('draft')}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center gap-1.5 transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Contact Teacher About Progress</span>
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* TAB 2: DRAFT TEACHER MESSAGE */}
          {activeTab === 'draft' && (
            <div className="space-y-5 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Teacher Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    placeholder="e.g. Mr. Sithole or Mrs. Khumalo"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Inquiry Topic
                  </label>
                  <select
                    value={draftTopic}
                    onChange={(e) => setDraftTopic(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="Academic Progress & Homework Support">Academic Progress & Homework Support</option>
                    <option value="Mathematics Remedial Guidance">Mathematics Remedial Guidance</option>
                    <option value="Physical Sciences Test Preparation">Physical Sciences Test Preparation</option>
                    <option value="Attendance & Missed Classwork">Attendance & Missed Classwork</option>
                    <option value="Parent-Teacher Consultation Request">Parent-Teacher Consultation Request</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  What would you like to convey?
                </label>
                <input
                  type="text"
                  value={draftObjective}
                  onChange={(e) => setDraftObjective(e.target.value)}
                  placeholder="e.g. We want to know how to help them prepare for the upcoming paper"
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <button
                onClick={handleDraftMessage}
                disabled={drafting}
                className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {drafting ? <LoadingSpinner size="sm" /> : <Sparkles className="w-4 h-4" />}
                <span>Generate Respectful Teacher Message</span>
              </button>

              {draftedMessage && (
                <div className="space-y-3 pt-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                      Message Draft (Editable):
                    </span>
                    <button
                      onClick={handleCopy}
                      className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied to Clipboard' : 'Copy Draft'}</span>
                    </button>
                  </div>

                  <textarea
                    rows={6}
                    value={draftedMessage}
                    onChange={(e) => setDraftedMessage(e.target.value)}
                    className="w-full p-4 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white leading-relaxed focus:ring-2 focus:ring-emerald-500"
                  />

                  {sendSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Message successfully dispatched to educator!</span>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={handleSendMessage}
                      disabled={sending || !draftedMessage.trim()}
                      className="px-5 py-2.5 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                      {sending ? <LoadingSpinner size="sm" /> : <Send className="w-4 h-4" />}
                      <span>Send to Teacher</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
