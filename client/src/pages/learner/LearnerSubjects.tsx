import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { learnerService } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { OfflineNotesModal } from '../../components/learner/OfflineNotesModal';
import { SubjectPastPapers } from '../../components/subject/SubjectPastPapers';
import { SubjectFocusTimer } from '../../components/subject/SubjectFocusTimer';
import { Subject3DCoverFlow } from '../../components/subject/Subject3DCoverFlow';
import { LearnerAITutor } from './LearnerAITutor';
import { LearnerAssignments } from '../../components/learner/LearnerAssignments';
import { FusionArcadeHub } from '../../components/learner/FusionArcadeHub';
import {
  BookOpen,
  ArrowLeft,
  Search,
  AlertCircle,
  FileText,
  Download,
  Bell,
  CheckCircle2,
  Clock,
  Users,
  ChevronRight,
  WifiOff,
  Sparkles,
  Layers,
  LayoutGrid
} from 'lucide-react';

interface LearnerSubjectsProps {
  onStartAITopic?: (subject: string, topicId: string, topicName: string) => void;
}

const SA_OFFICIAL_LANGUAGES = [
  { code: 'Sepedi', name: 'Sepedi', native: 'Sepedi (Sesotho sa Leboa)' },
  { code: 'Sesotho', name: 'Sesotho', native: 'Sesotho Home Language' },
  { code: 'Setswana', name: 'Setswana', native: 'Setswana Home Language' },
  { code: 'siSwati', name: 'siSwati', native: 'siSwati Home Language' },
  { code: 'Tshivenda', name: 'Tshivenda', native: 'Tshivenda Home Language' },
  { code: 'Xitsonga', name: 'Xitsonga', native: 'Xitsonga Home Language' },
  { code: 'Afrikaans', name: 'Afrikaans', native: 'Afrikaans Huistaal' },
  { code: 'English', name: 'English', native: 'English Home Language' },
  { code: 'isiNdebele', name: 'isiNdebele', native: 'isiNdebele Home Language' },
  { code: 'isiXhosa', name: 'isiXhosa', native: 'isiXhosa Home Language' },
  { code: 'isiZulu', name: 'isiZulu', native: 'isiZulu Home Language' }
];

export const LearnerSubjects: React.FC<LearnerSubjectsProps> = ({ onStartAITopic }) => {
  const { user } = useAuth();
  const learnerEnrolledGrade = Number(user?.grade) || 11;

  const [searchParams, setSearchParams] = useSearchParams();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'topics' | 'homework' | 'ai-tutor' | 'past-papers' | 'focus-timer' | 'resources' | 'grades' | 'arcade'>('topics');
  const [tutorTopic, setTutorTopic] = useState<{ id?: string; name?: string }>({ id: 'general', name: '' });
  const [isOfflineNotesOpen, setIsOfflineNotesOpen] = useState(false);
  
  const [currentHomeLanguage, setCurrentHomeLanguage] = useState<string>('');
  const [updatingLanguage, setUpdatingLanguage] = useState<boolean>(false);
  const [languageMessage, setLanguageMessage] = useState<string | null>(null);
  const [showLanguagePicker, setShowLanguagePicker] = useState<boolean>(true);

  const [topics, setTopics] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subjectsRef = useRef<any[]>([]);

  const [subjectsViewMode, setSubjectsViewMode] = useState<'3d-flow' | 'grid'>(() => {
    try {
      const saved = localStorage.getItem('learner_subjects_view_mode');
      if (saved === 'grid' || saved === '3d-flow') return saved;
    } catch {}
    return '3d-flow';
  });

  const handleSetSubjectsViewMode = (mode: '3d-flow' | 'grid') => {
    setSubjectsViewMode(mode);
    try {
      localStorage.setItem('learner_subjects_view_mode', mode);
    } catch {}
  };

  const handleUpdateLanguage = async (newLang: string) => {
    setUpdatingLanguage(true);
    setLanguageMessage(null);
    setError(null);
    try {
      const res = await learnerService.updateHomeLanguage(newLang);
      setCurrentHomeLanguage(res.home_language || newLang);
      setLanguageMessage(`Official Home Language saved as ${newLang}! Your stream subjects and AI Tutor are permanently synchronized.`);
      
      if (res.subjects && Array.isArray(res.subjects)) {
        const mapped = res.subjects.map((subName: string) => ({
          name: subName,
          code: (subName.substring(0, 4) + (learnerEnrolledGrade || 10)).toUpperCase().replace(/[^A-Z0-9]/g, ''),
          grade: learnerEnrolledGrade,
          teacher: 'To Be Assigned',
          assignments_due: 0,
        }));
        subjectsRef.current = mapped;
        setSubjects(mapped);
      }

      try {
        const updatedData = await learnerService.getMySubjectsOverview();
        const list = Array.isArray(updatedData) ? updatedData : updatedData.subjects || [];
        if (list.length > 0) {
          subjectsRef.current = list;
          setSubjects(list);
        }
      } catch (_) {}

      setTimeout(() => setLanguageMessage(null), 5000);
    } catch (err: any) {
      setError('Failed to update home language: ' + (err.response?.data?.error || err.message));
    } finally {
      setUpdatingLanguage(false);
    }
  };

  const rememberSubjects = (list: any[]) => {
    subjectsRef.current = list;
    setSubjects(list);
  };

  const applySubjectFromUrl = (list: any[], targetSubParam: string | null, targetViewParam: string | null) => {
    if (!targetSubParam) {
      setSelectedSubject(null);
      return;
    }
    const match = list.find((s: any) =>
      (s.name || s.subject || '').toLowerCase() === targetSubParam.toLowerCase()
    );
    const next = match || {
      name: targetSubParam,
      subject: targetSubParam,
      grade: list[0]?.grade || learnerEnrolledGrade
    };
    setSelectedSubject((current: any) => {
      const currentName = (current?.name || current?.subject || '').toLowerCase();
      const nextName = (next.name || next.subject || '').toLowerCase();
      if (current && currentName === nextName) return current;
      return next;
    });
    if (targetViewParam === 'past-papers' || targetViewParam === 'resources') {
      setActiveTab(targetViewParam);
    }
  };

  useEffect(() => {
    setError(null);
    const targetSubParam = searchParams.get('subject');
    const targetViewParam = searchParams.get('view');

    if (subjectsRef.current.length > 0) {
      applySubjectFromUrl(subjectsRef.current, targetSubParam, targetViewParam);
      return;
    }

    setLoadingSubjects(true);

    learnerService.getMySubjectsOverview()
      .then((data) => {
        if (data.home_language) {
          setCurrentHomeLanguage(data.home_language);
          setShowLanguagePicker(false);
        } else {
          setShowLanguagePicker(true);
        }
        const list = Array.isArray(data) ? data : data.subjects || [];
        rememberSubjects(list);
        applySubjectFromUrl(list, targetSubParam, targetViewParam);
      })
      .catch((err) => {
        console.error('Error fetching subjects from database:', err);
        learnerService.getSubjects()
          .then((subData) => {
            const list = Array.isArray(subData) ? subData : subData.subjects || [];
            rememberSubjects(list);
            applySubjectFromUrl(list, targetSubParam, targetViewParam);
          })
          .catch(() => {
            rememberSubjects([]);
            applySubjectFromUrl([], targetSubParam, targetViewParam);
          });
      })
      .finally(() => setLoadingSubjects(false));
  }, [searchParams, learnerEnrolledGrade]);

  useEffect(() => {
    if (!selectedSubject) return;
    setLoadingContent(true);
    const subName = selectedSubject.name || selectedSubject.subject || selectedSubject.id;
    const subGrade = Number(selectedSubject.grade) || learnerEnrolledGrade;

    Promise.allSettled([
      learnerService.getTopics(subName, subGrade),
      learnerService.getSubjectResources(subName, subGrade),
      learnerService.getAssignments({ subject: subName, grade: subGrade })
    ]).then(([topicsRes, resourcesRes, assignRes]) => {
      if (topicsRes.status === 'fulfilled') {
        const tData = topicsRes.value;
        setTopics(Array.isArray(tData) ? tData : tData.topics || []);
      } else {
        setTopics([]);
      }

      if (resourcesRes.status === 'fulfilled') {
        const rData = resourcesRes.value;
        setResources(Array.isArray(rData) ? rData : rData.resources || rData.textbooks || []);
      } else {
        setResources([]);
      }

      if (assignRes.status === 'fulfilled') {
        const aData = assignRes.value;
        setAssignments(Array.isArray(aData) ? aData : aData.assignments || []);
      } else {
        setAssignments([]);
      }
    }).finally(() => setLoadingContent(false));
  }, [selectedSubject, learnerEnrolledGrade]);

  const filteredTopics = topics.filter(t => 
    (t.name || t.topic_name || t.title || t.topic || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedSubName = selectedSubject?.name || selectedSubject?.subject || 'Subject';
  const selectedGrade = Number(selectedSubject?.grade) || learnerEnrolledGrade;
  const rawMark = selectedSubject?.progress ?? selectedSubject?.curriculum_progress;
  const hasMark = rawMark !== undefined && rawMark !== null && rawMark !== '' && Number.isFinite(Number(rawMark));
  const markLabel = hasMark ? `${Number(rawMark)}%` : 'No mark yet';
  const openWorkCount = assignments.filter((item) => {
    const isDone = item.status === 'graded' || item.status === 'completed' || item.score !== undefined;
    return !isDone;
  }).length;
  const dueCount = Number(selectedSubject?.assignments_due) > 0
    ? Number(selectedSubject.assignments_due)
    : openWorkCount;
  const primaryView = activeTab === 'topics' || activeTab === 'homework' || activeTab === 'grades' || activeTab === 'resources';

  const showPrimary = (tab: 'topics' | 'homework' | 'grades' | 'resources') => {
    setActiveTab(tab);
    const subject = searchParams.get('subject');
    if (subject) {
      if (tab === 'resources') {
        setSearchParams({ tab: 'subjects', subject, view: 'resources' });
      } else {
        setSearchParams({ tab: 'subjects', subject });
      }
    }
  };

  const showTool = (tab: 'past-papers' | 'resources' | 'ai-tutor' | 'focus-timer' | 'arcade') => {
    if (tab === 'ai-tutor') {
      setTutorTopic({ id: 'general', name: selectedSubName });
    }
    setActiveTab(tab);
    if (tab === 'past-papers' || tab === 'resources') {
      setSearchParams({ tab: 'subjects', subject: selectedSubName, view: tab });
    }
  };

  const openSubject = (sub: any, view: 'topics' | 'resources' | 'grades' | 'ai-tutor' = 'topics') => {
    const name = sub.name || sub.subject || 'Subject';
    setSelectedSubject(sub);
    setSearchQuery('');
    if (view === 'ai-tutor') {
      setTutorTopic({ id: 'general', name });
      setActiveTab('ai-tutor');
      setSearchParams({ tab: 'subjects', subject: name });
      return;
    }
    if (view === 'resources') {
      setActiveTab('resources');
      setSearchParams({ tab: 'subjects', subject: name, view: 'resources' });
      return;
    }
    setActiveTab(view === 'grades' ? 'grades' : 'topics');
    setSearchParams({ tab: 'subjects', subject: name });
  };

  const purposeClass = (active: boolean) =>
    `text-left rounded-2xl border px-3 py-4 sm:px-4 transition-colors cursor-pointer ${
      active
        ? 'bg-white dark:bg-[#142230] border-cyan-400 shadow-sm'
        : 'bg-white/80 dark:bg-white/[0.04] border-slate-200 dark:border-white/10 hover:border-cyan-400/50'
    }`;

  return (
    <div className="space-y-6">
      {selectedSubject ? (
        <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
          {primaryView ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Grade {selectedGrade}
                  {selectedSubject?.teacher ? ` · ${selectedSubject.teacher}` : ''}
                </p>
                <h2 className="text-3xl sm:text-4xl font-extrabold font-display tracking-tight text-[#1C252C] dark:text-white">
                  {selectedSubName}
                </h2>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-xl">
                  Learn the lessons, hand in the work, and check your mark.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <button type="button" onClick={() => showPrimary('topics')} className={purposeClass(activeTab === 'topics')}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Learn</p>
                  <p className="mt-1 text-base sm:text-lg font-bold text-[#1C252C] dark:text-white">Lessons</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {topics.length > 0 ? `${topics.length} chapters` : 'Syllabus'}
                  </p>
                </button>
                <button type="button" onClick={() => showPrimary('resources')} className={purposeClass(activeTab === 'resources')}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">Resources</p>
                  <p className="mt-1 text-base sm:text-lg font-bold text-[#1C252C] dark:text-white">Notes & Files</p>
                  <p className="mt-1 text-xs text-purple-600 dark:text-purple-400 font-medium">
                    {resources.length > 0 ? `${resources.length} available` : 'Teacher files'}
                  </p>
                </button>
                <button type="button" onClick={() => showPrimary('homework')} className={purposeClass(activeTab === 'homework')}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Do</p>
                  <p className="mt-1 text-base sm:text-lg font-bold text-[#1C252C] dark:text-white">Work due</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {dueCount > 0 ? `${dueCount} to hand in` : 'Nothing due'}
                  </p>
                </button>
                <button type="button" onClick={() => showPrimary('grades')} className={purposeClass(activeTab === 'grades')}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Check</p>
                  <p className="mt-1 text-base sm:text-lg font-bold text-[#1C252C] dark:text-white">My mark</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{markLabel}</p>
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => showPrimary('topics')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-cyan-700 dark:hover:text-cyan-300 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to {selectedSubName}</span>
            </button>
          )}

          <div>
            {loadingContent ? (
              <LoadingSpinner size="md" text={`Loading ${selectedSubName} curriculum details...`} />
            ) : activeTab === 'arcade' ? (
              /* Embedded Subject Games & 1v1 Arena Tab */
              <div className="space-y-4">
                <FusionArcadeHub initialSubject={selectedSubName} />
              </div>
            ) : activeTab === 'homework' ? (
              /* Embedded Homework & Submissions Portal Tab */
              <div className="space-y-4">
                <LearnerAssignments filterSubject={selectedSubName} />
              </div>
            ) : activeTab === 'ai-tutor' ? (
              /* Embedded AI Subject Tutor & Quizzes Tab */
              <div className="space-y-4">
                <LearnerAITutor
                  initialSubject={selectedSubName}
                  initialTopicId={tutorTopic.id || 'general'}
                  initialTopicName={tutorTopic.name || selectedSubName}
                />
              </div>
            ) : activeTab === 'past-papers' ? (
              /* Past Papers & Question Bank Tab */
              <SubjectPastPapers
                subject={selectedSubName}
                grade={selectedGrade}
                onSolveWithAI={(prompt) => {
                  setTutorTopic({ id: 'exam-practice', name: prompt });
                  setActiveTab('ai-tutor');
                }}
              />
            ) : activeTab === 'focus-timer' ? (
              /* Study Streak & Focus Timer Tab */
              <SubjectFocusTimer
                subject={selectedSubName}
                grade={selectedGrade}
              />
            ) : activeTab === 'resources' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-[#1C252C] dark:text-white">Notes and files</h3>
                  <span className="text-sm text-slate-500 dark:text-slate-400">{resources.length} files</span>
                </div>

                {resources.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {resources.map((res, i) => {
                      const fileHref = res.file_path 
                        ? (res.file_path.startsWith('/') ? res.file_path : `/${res.file_path}`) 
                        : `/api/resources/${res.id || i}/download`;
                      const resTitle = res.title || res.file_name || `${selectedSubName} Resource`;
                      const resType = res.resource_type || 'past_paper';
                      return (
                        <div
                          key={res.id || i}
                          className="p-5 rounded-2xl bg-surface-darker border border-white/5 hover:border-purple-500/30 transition-all flex flex-col justify-between gap-4"
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400 shrink-0">
                              {resType === 'past_paper' ? <FileText className="w-6 h-6 text-rose-400" /> : <BookOpen className="w-6 h-6 text-purple-400" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant={resType === 'past_paper' ? 'rose' : (resType === 'study_guide' ? 'emerald' : 'indigo')} size="sm">
                                  {resType === 'past_paper' ? 'Past Exam Paper' : (resType === 'study_guide' ? 'Study Guide' : (resType === 'worksheet' ? 'Worksheet' : 'CAPS Resource'))}
                                </Badge>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-slate-300 font-mono">Grade {res.grade || selectedGrade}</span>
                                {res.term && <span className="text-[10px] text-slate-400">{res.term}</span>}
                              </div>
                              <h5 className="text-sm font-bold text-white" title={resTitle}>
                                {resTitle}
                              </h5>
                              <p className="text-[11px] text-slate-400 mt-1">
                                {res.teacher_name ? `Educator: ${res.teacher_name} ${res.teacher_surname || ''} • ` : 'Department of Basic Education • '}{res.file_size ? `${res.file_size} • ` : ''}{res.year ? `Exam Year ${res.year}` : (res.upload_date ? new Date(res.upload_date).toLocaleDateString() : 'Active Resource')}
                              </p>
                              {res.description && (
                                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                                  {res.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/5">
                            <button
                              onClick={() => {
                                setTutorTopic({ id: 'exam-practice', name: `Help me practice with ${resTitle}` });
                                setActiveTab('ai-tutor');
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-300 font-bold text-xs border border-cyan-500/20 transition-all cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Solve with AI</span>
                            </button>

                            <a
                              href={fileHref}
                              download={res.file_name || `${resTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all hover:scale-105 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download PDF</span>
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center rounded-2xl bg-surface-darker border border-white/5 space-y-3">
                    <FileText className="w-10 h-10 text-purple-400 mx-auto" />
                    <p className="text-sm text-slate-200 font-bold">Official Question Papers & Study Materials for Grade {selectedGrade} {selectedSubName}</p>
                    <button
                      onClick={() => setActiveTab('past-papers')}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all mt-2"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Open Grade {selectedGrade} Question Bank</span>
                    </button>
                  </div>
                )}
              </div>
            ) : activeTab === 'grades' ? (
              <div className="space-y-4">
                <div className="flex items-end justify-between gap-3">
                  <h3 className="text-lg font-bold text-[#1C252C] dark:text-white">My mark</h3>
                  <p className="text-2xl font-extrabold text-[#1C252C] dark:text-white">{markLabel}</p>
                </div>

                {assignments.length > 0 ? (
                  <div className="space-y-3">
                    {assignments.map((item, idx) => {
                      const isDone = item.status === 'graded' || item.status === 'completed' || item.score !== undefined;
                      return (
                        <div
                          key={item.id || idx}
                          className="p-4 rounded-2xl bg-surface-darker border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2.5 rounded-xl ${isDone ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                              {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                            </div>
                            <div>
                              <h5 className="text-xs font-bold text-white">{item.title || `Assessment ${idx + 1}`}</h5>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                <span>{item.type || 'Homework / Quiz'}</span>
                                <span>•</span>
                                <span>Due: {item.due_date || 'Term Assessment'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-auto">
                            {isDone ? (
                              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-300">
                                {item.score !== undefined && item.score !== null ? `${item.score}%` : 'Marked'}
                              </span>
                            ) : (
                              <span className="text-sm font-semibold text-rose-600 dark:text-rose-300">Due</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    className="py-4"
                    title={hasMark ? 'Waiting for task-level marks' : 'No verified marks yet'}
                    description={
                      hasMark
                        ? `Your overall mark for ${selectedSubName} is ${markLabel}. Individual task marks will appear here once your teacher records and the school publishes them in Geleza SA.`
                        : `Geleza SA does not show placeholder scores. Marks for ${selectedSubName} will appear here after your school uploads verified SBA or term results.`
                    }
                  />
                )}
              </div>
            ) : (
              /* Topics / Chapters Tab (Default) */
              <div className="space-y-4">
                {/* Search within Subject */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Find a lesson in ${selectedSubName}`}
                    className="w-full rounded-xl bg-surface-darker border border-white/10 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                {filteredTopics.length > 0 ? (
                  <div className="space-y-3">
                    {filteredTopics.map((topic, index) => {
                      const topicId = topic.id || `topic-${index}`;
                      const topicName = topic.name || topic.topic_name || topic.title || topic.topic || `Topic ${index + 1}`;
                      return (
                        <div
                          key={topicId}
                          className="group flex items-center justify-between gap-3 py-3 border-b border-slate-200/80 dark:border-white/10"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <span className="mt-0.5 w-6 text-sm font-semibold text-slate-400">{index + 1}</span>
                            <div className="min-w-0">
                              <h4 className="text-base font-semibold text-[#1C252C] dark:text-white truncate">
                                {topicName}
                              </h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {topic.term || 'This term'}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setTutorTopic({ id: topicId, name: topicName });
                              setActiveTab('ai-tutor');
                            }}
                            className="shrink-0 text-sm font-semibold text-cyan-700 dark:text-cyan-300 hover:underline cursor-pointer"
                          >
                            Study
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-10 text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400">No lessons posted for {selectedSubName} yet. You can still ask a question or open past papers.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {primaryView && (
            <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
              <button type="button" onClick={() => showTool('past-papers')} className="text-sm font-semibold text-slate-500 hover:text-cyan-700 dark:text-slate-400 dark:hover:text-cyan-300 cursor-pointer">Past papers</button>
              <button type="button" onClick={() => showTool('resources')} className="text-sm font-semibold text-slate-500 hover:text-cyan-700 dark:text-slate-400 dark:hover:text-cyan-300 cursor-pointer">Notes and files</button>
              <button type="button" onClick={() => showTool('ai-tutor')} className="text-sm font-semibold text-slate-500 hover:text-cyan-700 dark:text-slate-400 dark:hover:text-cyan-300 cursor-pointer">Ask AI</button>
              <button type="button" onClick={() => setIsOfflineNotesOpen(true)} className="text-sm font-semibold text-slate-500 hover:text-cyan-700 dark:text-slate-400 dark:hover:text-cyan-300 cursor-pointer">Offline notes</button>
              <button type="button" onClick={() => showTool('focus-timer')} className="text-sm font-semibold text-slate-500 hover:text-cyan-700 dark:text-slate-400 dark:hover:text-cyan-300 cursor-pointer">Focus timer</button>
              <button type="button" onClick={() => showTool('arcade')} className="text-sm font-semibold text-slate-500 hover:text-cyan-700 dark:text-slate-400 dark:hover:text-cyan-300 cursor-pointer">Games</button>
            </div>
          )}
        </div>
      ) : (
        /* Main Subjects Grid Page (When No Specific Subject is Selected) */
        <div className="space-y-6 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-brand-400" />
                My Subjects
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* View Switcher: 3D Flow vs Grid */}
              <div className="flex items-center p-1 rounded-2xl bg-surface-dark border border-white/10 shadow-sm">
                <button
                  type="button"
                  onClick={() => handleSetSubjectsViewMode('3d-flow')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    subjectsViewMode === '3d-flow'
                      ? 'bg-gradient-to-r from-brand-600 to-cyan-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                  title="3D Perspective Cover Flow View"
                >
                  <Layers className="w-3.5 h-3.5 text-cyan-300" />
                  <span>3D Flow</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSetSubjectsViewMode('grid')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    subjectsViewMode === 'grid'
                      ? 'bg-gradient-to-r from-brand-600 to-cyan-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                  title="Standard Grid View"
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-brand-300" />
                  <span>Grid</span>
                </button>
              </div>

              <button
                onClick={() => setIsOfflineNotesOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-surface-dark border border-emerald-500/30 text-emerald-300 hover:bg-white/5 font-bold text-xs shadow-md transition-all"
              >
                <WifiOff className="w-4 h-4 text-emerald-400" />
                <span>Offline Study Notes</span>
              </button>
              <Badge variant="indigo" size="sm">Grade {subjects[0]?.grade || 10} Syllabus</Badge>
            </div>
          </div>

          {/* Official South African Home Language Selector Card */}
          <div className="rounded-3xl bg-gradient-to-r from-brand-900/40 via-surface-dark to-surface-dark border border-brand-500/20 p-5 shadow-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Official Curriculum Language</span>
                  <Badge variant={currentHomeLanguage ? "amber" : "rose"} size="sm">
                    {currentHomeLanguage ? `${currentHomeLanguage} Home Language` : 'Action Required: Select Language'}
                  </Badge>
                </div>
                <h3 className="text-base font-bold text-white">
                  {currentHomeLanguage ? `Selected Home Language: ${currentHomeLanguage}` : 'Select Your South African Home Language'}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowLanguagePicker(!showLanguagePicker)}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md transition-all shrink-0"
                >
                  {showLanguagePicker ? 'Hide Language Bar' : (currentHomeLanguage ? 'Change Home Language' : 'Choose Language')}
                </button>
              </div>
            </div>

            {languageMessage && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{languageMessage}</span>
              </div>
            )}

            {/* 11 Languages Interactive Selector Bar */}
            {showLanguagePicker && (
              <div className="mt-4 pt-4 border-t border-white/10 space-y-2 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-semibold">Click an official language to update database:</span>
                  {updatingLanguage && (
                    <span className="text-xs text-brand-300 animate-pulse font-bold">Updating school database...</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {SA_OFFICIAL_LANGUAGES.map((lang) => {
                    const isSelected = currentHomeLanguage.toLowerCase() === lang.code.toLowerCase();
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        disabled={updatingLanguage}
                        onClick={() => handleUpdateLanguage(lang.code)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 shadow-glow-amber ring-2 ring-amber-300 font-extrabold'
                            : 'bg-surface-darker text-slate-300 border border-white/10 hover:border-brand-500/50 hover:bg-brand-500/10'
                        }`}
                      >
                        {lang.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{typeof error === 'string' ? error : (error as any)?.message || String(error)}</span>
            </div>
          )}

          {loadingSubjects ? (
            <LoadingSpinner text="Fetching assigned curriculum subjects..." />
          ) : subjects.length > 0 ? (
            subjectsViewMode === '3d-flow' ? (
              <Subject3DCoverFlow
                subjects={subjects}
                role="learner"
                onOpenSubject={(sub) => openSubject(sub)}
                onAction={(action, sub) => {
                  if (action === 'ai-tutor') {
                    openSubject(sub, 'ai-tutor');
                  } else if (action === 'resources' || action === 'past-papers') {
                    openSubject(sub, 'resources');
                  } else if (action === 'focus-timer') {
                    openSubject(sub, 'topics');
                    showTool('focus-timer');
                  } else if (action === 'marks') {
                    openSubject(sub, 'grades');
                  }
                }}
                title="CAPS Curriculum 3D Flow"
                subtitle="Interactive 3D Perspective Exploration • Tap any subject or swipe to rotate"
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {subjects.map((sub, index) => {
                  const subName = sub.name || sub.subject || `Subject ${index + 1}`;
                  const subCode = sub.code || 'Syllabus';
                  const hasWorkDue = (sub.assignments_due && Number(sub.assignments_due) > 0);

                  return (
                    <div
                      key={sub.id || subName || index}
                      className="group rounded-3xl bg-surface-dark border border-white/10 p-6 hover:border-brand-500/40 transition-all shadow-xl flex flex-col justify-between gap-5 relative overflow-hidden"
                    >
                      <div className="space-y-4">
                        {/* Top Badges */}
                        <div className="flex items-center justify-between">
                          <Badge variant="indigo" size="sm">
                            Grade {sub.grade || 10} • {subCode}
                          </Badge>
                          <div className="flex items-center gap-2">
                            {hasWorkDue && (
                              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40 animate-pulse">
                                <Bell className="w-2.5 h-2.5 text-rose-400" />
                                {sub.assignments_due} Work Due
                              </span>
                            )}
                            <Badge variant="emerald" size="sm">
                              {sub.term_mark != null || sub.mark != null || sub.percentage != null
                                ? `Avg: ${sub.term_mark ?? sub.mark ?? sub.percentage}%`
                                : 'Marks pending'}
                            </Badge>
                          </div>
                        </div>

                        {/* Clickable Subject Title Link */}
                        <div
                          onClick={() => openSubject(sub)}
                          className="cursor-pointer space-y-1"
                        >
                          <h3 className="text-xl font-bold font-display text-white group-hover:text-cyan-300 transition-colors flex items-center justify-between">
                            <span>{subName}</span>
                            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transform group-hover:translate-x-1 transition-transform" />
                          </h3>
                          <p className="text-xs text-slate-400">
                            Teacher: <strong className="text-slate-200">{sub.teacher || 'Subject Specialist'}</strong>
                          </p>
                        </div>

                        {/* Classmates & Resources Pill */}
                        <div className="flex items-center justify-between text-[11px] text-slate-400 bg-surface-darker p-2.5 rounded-xl border border-white/5">
                          <span className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-indigo-400" />
                            {sub.classmates_count || 1} Learners
                          </span>
                          <span className="flex items-center gap-1.5 text-purple-300">
                            <FileText className="w-3.5 h-3.5" />
                            {sub.resources_count || 0} Resources
                          </span>
                        </div>
                      </div>

                      {/* Primary Link Button into Subject */}
                      <div className="space-y-2 pt-2 border-t border-white/5">
                        <button
                          onClick={() => openSubject(sub)}
                          className="w-full py-3 px-4 rounded-xl bg-[#1C252C] hover:bg-[#24303a] text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <span>Open {subName}</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <div className="p-12 text-center text-slate-400 text-xs rounded-3xl bg-surface-dark border border-white/10">
              No enrolled subjects found in database.
            </div>
          )}
        </div>
      )}

      {/* Offline Study Notes Modal */}
      <OfflineNotesModal
        isOpen={isOfflineNotesOpen}
        onClose={() => setIsOfflineNotesOpen(false)}
        defaultSubject={selectedSubject ? (selectedSubject.name || selectedSubject.subject) : 'General'}
      />
    </div>
  );
};
