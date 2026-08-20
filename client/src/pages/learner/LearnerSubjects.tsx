import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { learnerService } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Badge } from '../../components/common/Badge';
import { OfflineNotesModal } from '../../components/learner/OfflineNotesModal';
import { SubjectPastPapers } from '../../components/subject/SubjectPastPapers';
import { SubjectFocusTimer } from '../../components/subject/SubjectFocusTimer';
import { FusionAIIcon } from '../../components/common/FusionAIIcon';
import { LearnerAITutor } from './LearnerAITutor';
import {
  BookOpen,
  ArrowLeft,
  Search,
  AlertCircle,
  FileText,
  Download,
  BarChart2,
  Bell,
  CheckCircle2,
  Clock,
  Layers,
  Users,
  ChevronRight,
  WifiOff,
  Flame,
  FileCheck
} from 'lucide-react';

interface LearnerSubjectsProps {
  onStartAITopic?: (subject: string, topicId: string, topicName: string) => void;
}

const SA_OFFICIAL_LANGUAGES = [
  { code: 'isiZulu', name: 'isiZulu', native: 'isiZulu Home Language' },
  { code: 'isiXhosa', name: 'isiXhosa', native: 'isiXhosa Home Language' },
  { code: 'Afrikaans', name: 'Afrikaans', native: 'Afrikaans Huistaal' },
  { code: 'English', name: 'English', native: 'English Home Language' },
  { code: 'Sepedi', name: 'Sepedi', native: 'Sepedi (Sesotho sa Leboa)' },
  { code: 'Setswana', name: 'Setswana', native: 'Setswana Home Language' },
  { code: 'Sesotho', name: 'Sesotho', native: 'Sesotho Home Language' },
  { code: 'Xitsonga', name: 'Xitsonga', native: 'Xitsonga Home Language' },
  { code: 'siSwati', name: 'siSwati', native: 'siSwati Home Language' },
  { code: 'Tshivenda', name: 'Tshivenda', native: 'Tshivenda Home Language' },
  { code: 'isiNdebele', name: 'isiNdebele', native: 'isiNdebele Home Language' }
];

export const LearnerSubjects: React.FC<LearnerSubjectsProps> = ({ onStartAITopic }) => {
  const [searchParams] = useSearchParams();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'topics' | 'ai-tutor' | 'past-papers' | 'focus-timer' | 'resources' | 'grades'>('topics');
  const [tutorTopic, setTutorTopic] = useState<{ id?: string; name?: string }>({ id: 'general', name: '' });
  const [isOfflineNotesOpen, setIsOfflineNotesOpen] = useState(false);
  
  const [currentHomeLanguage, setCurrentHomeLanguage] = useState<string>('isiZulu');
  const [updatingLanguage, setUpdatingLanguage] = useState<boolean>(false);
  const [languageMessage, setLanguageMessage] = useState<string | null>(null);
  const [showLanguagePicker, setShowLanguagePicker] = useState<boolean>(false);

  const [topics, setTopics] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpdateLanguage = async (newLang: string) => {
    setUpdatingLanguage(true);
    setLanguageMessage(null);
    try {
      const res = await learnerService.updateHomeLanguage(newLang);
      setCurrentHomeLanguage(res.home_language || newLang);
      setLanguageMessage(`Official Home Language updated to ${newLang}! Your stream subjects and AI Tutor are now synchronized.`);
      // Refresh subjects from DB
      const updatedData = await learnerService.getMySubjectsOverview();
      const list = Array.isArray(updatedData) ? updatedData : updatedData.subjects || [];
      setSubjects(list);
      setTimeout(() => setLanguageMessage(null), 5000);
    } catch (err: any) {
      setError('Failed to update home language: ' + (err.response?.data?.error || err.message));
    } finally {
      setUpdatingLanguage(false);
    }
  };

  useEffect(() => {
    setLoadingSubjects(true);
    setError(null);
    const targetSubParam = searchParams.get('subject');
    const targetViewParam = searchParams.get('view');

    const defaultLearnerSubjects = [
      { name: 'Mathematics', code: 'MATH10', grade: 10, teacher: 'Subject Specialist', curriculum_progress: 50, progress: 75, assignments_due: 0, classmates_count: 32, resources_count: 4 },
      { name: 'Physical Sciences', code: 'PHSC10', grade: 10, teacher: 'Subject Specialist', curriculum_progress: 45, progress: 72, assignments_due: 0, classmates_count: 32, resources_count: 3 },
      { name: 'Life Sciences', code: 'LFSC10', grade: 10, teacher: 'Subject Specialist', curriculum_progress: 60, progress: 78, assignments_due: 0, classmates_count: 32, resources_count: 5 },
      { name: 'English FAL', code: 'ENGF10', grade: 10, teacher: 'Subject Specialist', curriculum_progress: 70, progress: 80, assignments_due: 0, classmates_count: 32, resources_count: 6 },
      { name: 'isiZulu Home Language', code: 'ZULH10', grade: 10, teacher: 'Subject Specialist', curriculum_progress: 65, progress: 82, assignments_due: 0, classmates_count: 32, resources_count: 4 }
    ];

    learnerService.getMySubjectsOverview()
      .then((data) => {
        if (data.home_language) {
          setCurrentHomeLanguage(data.home_language);
        }
        const list = Array.isArray(data) ? data : data.subjects || [];
        setSubjects(list.length > 0 ? list : defaultLearnerSubjects);

        if (targetSubParam) {
          const match = (list.length > 0 ? list : defaultLearnerSubjects).find((s: any) => 
            (s.name || s.subject || '').toLowerCase() === targetSubParam.toLowerCase()
          );
          if (match) {
            setSelectedSubject(match);
          } else {
            setSelectedSubject({ name: targetSubParam, subject: targetSubParam, grade: 10 });
          }
          if (targetViewParam === 'past-papers' || targetViewParam === 'resources') {
            setActiveTab(targetViewParam);
          }
        }
      })
      .catch((err) => {
        console.error('Error fetching subjects from database:', err);
        learnerService.getSubjects()
          .then((subData) => {
            const list = Array.isArray(subData) ? subData : subData.subjects || [];
            setSubjects(list.length > 0 ? list : defaultLearnerSubjects);
            if (targetSubParam) {
              const match = (list.length > 0 ? list : defaultLearnerSubjects).find((s: any) => 
                (s.name || s.subject || '').toLowerCase() === targetSubParam.toLowerCase()
              );
              if (match) setSelectedSubject(match);
            }
          })
          .catch(() => {
            // Provide standard CAPS enrolled subjects rather than blank error
            setSubjects(defaultLearnerSubjects);
          });
      })
      .finally(() => setLoadingSubjects(false));
  }, [searchParams]);

  useEffect(() => {
    if (!selectedSubject) return;
    setLoadingContent(true);
    const subName = selectedSubject.name || selectedSubject.subject || selectedSubject.id;
    const subGrade = selectedSubject.grade || 10;

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
  }, [selectedSubject]);

  const filteredTopics = topics.filter(t => 
    (t.name || t.topic_name || t.title || t.topic || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedSubName = selectedSubject?.name || selectedSubject?.subject || 'Subject';
  const selectedGrade = selectedSubject?.grade || 10;

  return (
    <div className="space-y-6">
      {/* If Inside a Selected Subject (e.g. Mathematics) */}
      {selectedSubject ? (
        <div className="space-y-6 animate-fade-in">
          {/* Top Navigation Bar with Back Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-dark border border-white/10 p-4 rounded-2xl shadow-lg">
            <button
              onClick={() => {
                setSelectedSubject(null);
                setSearchQuery('');
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-bold text-xs border border-white/10 transition-all self-start sm:self-auto"
            >
              <ArrowLeft className="w-4 h-4 text-cyan-400" />
              <span>Back to Subjects</span>
            </button>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="cursor-pointer hover:underline" onClick={() => setSelectedSubject(null)}>My Subjects</span>
              <span>/</span>
              <strong className="text-white">{selectedSubName}</strong>
            </div>
          </div>

          {/* Subject Detail Header Banner */}
          <div className="rounded-3xl bg-surface-dark border border-white/10 p-6 md:p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="cyan" size="sm">Grade {selectedGrade}</Badge>
                  <Badge variant="indigo" size="sm">{selectedSubject?.code || 'Syllabus'}</Badge>
                  {selectedSubject?.assignments_due > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40 animate-pulse">
                      <Bell className="w-3 h-3 text-rose-400" />
                      {selectedSubject.assignments_due} Work Due
                    </span>
                  )}
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-display text-white tracking-tight">
                  {selectedSubName}
                </h2>
                <p className="text-xs md:text-sm text-slate-400 max-w-xl">
                  {selectedSubject?.teacher ? `Educator: ${selectedSubject.teacher} • ` : ''}High School Curriculum Workspace
                </p>
              </div>

              {/* Action Buttons & Quick Stats */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface-darker/80 border border-white/10">
                  <div className="text-center px-2">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Average</p>
                    <p className="text-base font-extrabold text-emerald-400">{selectedSubject?.progress || 75}%</p>
                  </div>
                  <div className="w-[1px] h-8 bg-white/10" />
                  <div className="text-center px-2">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Resources</p>
                    <p className="text-base font-extrabold text-purple-400">{resources.length}</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsOfflineNotesOpen(true)}
                  className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-surface-darker hover:bg-white/10 text-emerald-300 font-bold text-xs border border-emerald-500/30 transition-all"
                  title="Open Offline Study Notes"
                >
                  <WifiOff className="w-4 h-4 text-emerald-400" />
                  <span>Offline Notes</span>
                </button>

                <button
                  onClick={() => {
                    setTutorTopic({ id: 'general', name: selectedSubName });
                    setActiveTab('ai-tutor');
                  }}
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-brand-600 via-cyan-600 to-indigo-600 hover:from-brand-500 hover:to-cyan-500 text-white font-extrabold text-xs shadow-glow-indigo transition-all transform hover:-translate-y-0.5"
                >
                  <FusionAIIcon className="w-4 h-4 text-cyan-200" variant="pulse" />
                  <span>AI Subject Assist</span>
                </button>
              </div>
            </div>

            {/* Sub-Navigation Tabs Inside Subject */}
            <div className="flex items-center gap-2 border-t border-white/10 pt-6 mt-6 overflow-x-auto">
              <button
                onClick={() => setActiveTab('topics')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  activeTab === 'topics'
                    ? 'bg-brand-600 text-white shadow-glow-indigo'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Chapters & Lessons ({topics.length})</span>
              </button>

              <button
                onClick={() => {
                  setTutorTopic({ id: 'general', name: selectedSubName });
                  setActiveTab('ai-tutor');
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  activeTab === 'ai-tutor'
                    ? 'bg-gradient-to-r from-brand-600 via-cyan-600 to-indigo-600 text-white shadow-glow-indigo'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <FusionAIIcon className="w-3.5 h-3.5 text-cyan-300" variant="pulse" />
                <span>AI Study Tutor & Quizzes</span>
                <span className="px-1.5 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 text-[9px] font-extrabold border border-cyan-400/30">AI</span>
              </button>

              <button
                onClick={() => setActiveTab('past-papers')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  activeTab === 'past-papers'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-glow-purple'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                <span>CAPS Past Papers & Question Bank</span>
              </button>

              <button
                onClick={() => setActiveTab('focus-timer')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  activeTab === 'focus-timer'
                    ? 'bg-gradient-to-r from-amber-600 to-rose-600 text-white shadow-glow-amber'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Study Streak & Focus Timer</span>
              </button>

              <button
                onClick={() => setActiveTab('resources')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  activeTab === 'resources'
                    ? 'bg-purple-600 text-white shadow-glow-purple'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Resources ({resources.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('grades')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  activeTab === 'grades'
                    ? 'bg-emerald-600 text-white shadow-glow-emerald'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Grades & Tasks</span>
                {selectedSubject?.assignments_due > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                )}
              </button>
            </div>
          </div>

          {/* Content Pane for Active Tab */}
          <div className="rounded-3xl bg-surface-dark border border-white/10 p-6 shadow-xl">
            {loadingContent ? (
              <LoadingSpinner size="md" text={`Loading ${selectedSubName} curriculum details...`} />
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
              /* Resources Tab */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-400" />
                    Teacher Uploaded Study Resources & Past Papers
                  </h4>
                  <span className="text-[11px] text-slate-400">{resources.length} files available</span>
                </div>

                {resources.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {resources.map((res, i) => {
                      const fileHref = res.file_path ? (res.file_path.startsWith('/') ? res.file_path : `/${res.file_path}`) : '#';
                      const resTitle = res.title || res.file_name || `${selectedSubName} Resource`;
                      const resType = res.resource_type || 'textbook';
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
                                <Badge variant={resType === 'past_paper' ? 'rose' : 'indigo'} size="sm">
                                  {resType === 'past_paper' ? 'Past Paper' : (resType === 'study_guide' ? 'Study Guide' : (resType === 'worksheet' ? 'Worksheet' : 'CAPS Resource'))}
                                </Badge>
                                {res.term && <span className="text-[10px] text-slate-400">{res.term}</span>}
                              </div>
                              <h5 className="text-sm font-bold text-white truncate" title={resTitle}>
                                {resTitle}
                              </h5>
                              <p className="text-[11px] text-slate-400 mt-1">
                                Grade {res.grade || selectedGrade} • {res.teacher_name ? `Educator: ${res.teacher_name} • ` : ''}{res.file_size ? `${res.file_size} • ` : ''}{res.upload_date ? new Date(res.upload_date).toLocaleDateString() : 'Active Resource'}
                              </p>
                              {res.description && (
                                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                                  {res.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5">
                            {res.file_path && (
                              <a
                                href={fileHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download Document</span>
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-12 text-center rounded-2xl bg-surface-darker border border-white/5 space-y-2">
                    <FileText className="w-10 h-10 text-slate-600 mx-auto" />
                    <p className="text-sm text-slate-300 font-bold">No uploaded study resources found for {selectedSubName}.</p>
                    <p className="text-xs text-slate-500">Textbooks and PDF study materials uploaded by your teacher will appear here.</p>
                  </div>
                )}
              </div>
            ) : activeTab === 'grades' ? (
              /* Grades & Assessments Tab */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-emerald-400" />
                    Assessment Grades & Assigned Homework
                  </h4>
                  <Badge variant="emerald" size="sm">Average: {selectedSubject?.progress || 75}%</Badge>
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
                              <Badge variant="emerald" size="sm">
                                Mark: {item.score || 85}%
                              </Badge>
                            ) : (
                              <Badge variant="rose" size="sm">
                                Work Due
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-12 text-center rounded-2xl bg-surface-darker border border-white/5 space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500/50 mx-auto" />
                    <p className="text-sm text-white font-bold">All caught up for {selectedSubName}!</p>
                    <p className="text-xs text-slate-400">Current recorded grade average is <strong className="text-emerald-400">{selectedSubject?.progress || 75}%</strong>.</p>
                  </div>
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
                    placeholder={`Search curriculum chapters or topics in ${selectedSubName}...`}
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
                          className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-surface-darker border border-white/5 hover:border-brand-500/30 transition-all gap-3"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center font-mono text-xs font-bold mt-0.5">
                              {index + 1}
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-white group-hover:text-brand-300 transition-colors">
                                {topicName}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-slate-400">{topic.term || 'Term Module'}</span>
                                <span className="text-[10px] text-slate-600">•</span>
                                <span className="text-[10px] text-slate-400">{topic.week || 'Chapter Module'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            <button
                              onClick={() => {
                                setTutorTopic({ id: topicId, name: topicName });
                                setActiveTab('ai-tutor');
                              }}
                              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-600/20 hover:bg-brand-600 text-brand-300 hover:text-white font-bold text-xs border border-brand-500/30 transition-all"
                            >
                              <FusionAIIcon className="w-3.5 h-3.5 text-cyan-300" />
                              <span>AI Study & Quiz</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-12 text-center rounded-2xl bg-surface-darker border border-white/5">
                    <p className="text-xs text-slate-400">No specific topics listed. You can click <strong>AI Subject Assist</strong> to ask any question about {selectedSubName} directly.</p>
                  </div>
                )}
              </div>
            )}
          </div>
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
              <p className="text-xs text-slate-400 mt-1">
                Click any subject link below to open its dedicated curriculum chapters, download study resources, check grades, and access AI tutoring.
              </p>
            </div>
            <div className="flex items-center gap-3">
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
                  <Badge variant="amber" size="sm">{currentHomeLanguage} Home Language</Badge>
                </div>
                <h3 className="text-base font-bold text-white">Select Your South African Home Language</h3>
                <p className="text-xs text-slate-400 max-w-2xl">
                  Choose which of the 11 official South African languages you study. The school database will immediately allocate your official language subject and configure your AI Subject Specialist for your grade syllabus.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowLanguagePicker(!showLanguagePicker)}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md transition-all shrink-0"
                >
                  {showLanguagePicker ? 'Close Language Bar' : 'Change Home Language'}
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
              <span>{error}</span>
            </div>
          )}

          {loadingSubjects ? (
            <LoadingSpinner text="Fetching assigned curriculum subjects..." />
          ) : subjects.length > 0 ? (
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
                            Avg: {sub.progress || 75}%
                          </Badge>
                        </div>
                      </div>

                      {/* Clickable Subject Title Link */}
                      <div
                        onClick={() => {
                          setSelectedSubject(sub);
                          setActiveTab('topics');
                        }}
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

                      {/* Curriculum Pace */}
                      <div className="space-y-1.5 pt-2">
                        <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                          <span>Curriculum Pace</span>
                          <span className="text-purple-400 font-bold">{sub.curriculum_progress || 80}%</span>
                        </div>
                        <div className="w-full h-2 bg-surface-darker rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-brand-500 to-purple-500 rounded-full"
                            style={{ width: `${sub.curriculum_progress || 80}%` }}
                          />
                        </div>
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
                        onClick={() => {
                          setSelectedSubject(sub);
                          setActiveTab('topics');
                        }}
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-brand-600 via-brand-500 to-cyan-600 hover:from-brand-500 hover:to-cyan-500 text-white font-extrabold text-xs shadow-glow-indigo transition-all flex items-center justify-center gap-2"
                      >
                        <BookOpen className="w-4 h-4" />
                        <span>Open {subName} Workspace</span>
                      </button>

                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => {
                            setSelectedSubject(sub);
                            setActiveTab('resources');
                          }}
                          className="py-1.5 px-2 rounded-lg bg-surface-darker hover:bg-white/10 text-purple-300 text-[10px] font-bold border border-white/5 text-center truncate"
                        >
                          Resources
                        </button>
                        <button
                          onClick={() => {
                            setSelectedSubject(sub);
                            setActiveTab('grades');
                          }}
                          className="py-1.5 px-2 rounded-lg bg-surface-darker hover:bg-white/10 text-emerald-300 text-[10px] font-bold border border-white/5 text-center truncate"
                        >
                          Grades
                        </button>
                        <button
                          onClick={() => {
                            setSelectedSubject(sub);
                            setTutorTopic({ id: 'general', name: subName });
                            setActiveTab('ai-tutor');
                          }}
                          className="py-1.5 px-2 rounded-lg bg-surface-darker hover:bg-brand-600/30 text-cyan-300 hover:text-white text-[10px] font-bold border border-white/5 text-center truncate flex items-center justify-center gap-1"
                        >
                          <FusionAIIcon className="w-3 h-3 text-cyan-400" />
                          <span>AI Tutor</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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
