import React, { useState, useEffect } from 'react';
import { adminService, classStaffService } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  Calendar,
  Clock,
  Sparkles,
  Send,
  CheckCircle2,
  Users,
  AlertCircle,
  Eye,
  Trash2,
  Edit3,
  Layers,
  BookOpen
} from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const PERIODS = [
  '08:00 - 09:00',
  '09:00 - 10:00',
  '10:00 - 11:00',
  '11:45 - 12:45',
  '12:45 - 13:45',
  '13:45 - 14:45'
];

export const AdminTimetable: React.FC = () => {
  const [grade, setGrade] = useState<number | ''>('');
  const [stream, setStream] = useState<string>('');
  const [academicYear, setAcademicYear] = useState<string>('');
  const [schoolClasses, setSchoolClasses] = useState<any[]>([]);
  const [targetSubject, setTargetSubject] = useState<string>('');
  const [generating, setGenerating] = useState<boolean>(false);
  const [publishing, setPublishing] = useState<boolean>(false);
  const [timetableData, setTimetableData] = useState<any | null>(null);
  const [activeTimetableName, setActiveTimetableName] = useState<string>('');
  const [activeTimetableId, setActiveTimetableId] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [timetablesList, setTimetablesList] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Slot editor modal state
  const [editingSlot, setEditingSlot] = useState<{ day: string; period: string; data: any } | null>(null);

  const fetchTimetablesList = () => {
    setLoadingList(true);
    adminService.getTimetables()
      .then(res => {
        const list = Array.isArray(res) ? res : [];
        setTimetablesList(list);
        if (list.length > 0 && !timetableData) {
          const activeOrFirst = list.find(t => t.is_active) || list[0];
          if (activeOrFirst && activeOrFirst.timetable_data) {
            setTimetableData(activeOrFirst.timetable_data);
            setActiveTimetableName(activeOrFirst.name || `Grade ${activeOrFirst.grade} Timetable`);
            setActiveTimetableId(activeOrFirst.id);
            setGrade(activeOrFirst.grade || '');
            setStream(activeOrFirst.stream && !/multi-stream/i.test(String(activeOrFirst.stream)) ? activeOrFirst.stream : '');
            const firstClass = Object.keys(activeOrFirst.timetable_data || {})[0] || '';
            setSelectedClass(firstClass);
          }
        }
      })
      .catch(err => {
        console.error('Failed to load timetables:', err);
      })
      .finally(() => setLoadingList(false));
  };

  // FET Educators (Grades 10, 11, 12 - non Grade 8/9 only)
  const [fetTeachers, setFetTeachers] = useState<any[]>([]);
  const [loadingFetTeachers, setLoadingFetTeachers] = useState<boolean>(false);
  const [editingTeacherSubjects, setEditingTeacherSubjects] = useState<{ id: number; name: string; subjects: string[] } | null>(null);
  const [newSubjectInput, setNewSubjectInput] = useState<string>('');
  const [savingTeacherSubjects, setSavingTeacherSubjects] = useState<boolean>(false);

  const fetchFetTeachers = () => {
    setLoadingFetTeachers(true);
    adminService.getAllTeachers()
      .then((res) => {
        const list = Array.isArray(res) ? res : res.teachers || [];
        // Filter teachers who teach Grade 10, 11, 12 (or not exclusively 8 and 9)
        const fetList = list.filter((t: any) => {
          const grades = Array.isArray(t.grades_taught) ? t.grades_taught : [];
          if (grades.length === 0) return true;
          return grades.some((g: number) => g >= 10);
        });
        setFetTeachers(fetList);
      })
      .catch((err) => console.error('Failed to load FET educators:', err))
      .finally(() => setLoadingFetTeachers(false));
  };

  useEffect(() => {
    fetchTimetablesList();
    fetchFetTeachers();
    classStaffService.getClasses()
      .then((rows) => setSchoolClasses(Array.isArray(rows) ? rows : []))
      .catch(() => setSchoolClasses([]));
  }, []);

  const handleSelectStoredTimetable = (tt: any) => {
    if (!tt || !tt.timetable_data) return;
    setTimetableData(tt.timetable_data);
    setActiveTimetableName(tt.name || `Grade ${tt.grade} Timetable`);
    setActiveTimetableId(tt.id);
    setGrade(tt.grade || '');
    setStream(tt.stream && !/multi-stream/i.test(String(tt.stream)) ? tt.stream : '');
    const firstClass = Object.keys(tt.timetable_data || {})[0] || '';
    setSelectedClass(firstClass);
    setStatusMessage(`Now viewing "${tt.name}".`);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDeleteTimetable = async (id: number, name: string) => {
    setDeletingId(id);
    setError(null);
    try {
      await adminService.deleteTimetable(id);
      setStatusMessage(`Timetable "${name}" deleted. Associated slots are now fully free for new schedule generation.`);
      if (activeTimetableId === id) {
        setTimetableData(null);
        setActiveTimetableName('');
        setActiveTimetableId(null);
      }
      setTimetablesList(prev => prev.filter(t => t.id !== id));
      fetchTimetablesList();
    } catch (err: any) {
      console.error('Failed to delete timetable:', err);
      setError(err.response?.data?.error || err.message || 'Failed to delete timetable.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveTeacherSubjects = async () => {
    if (!editingTeacherSubjects) return;
    setSavingTeacherSubjects(true);
    try {
      await adminService.updateTeacherSubjects(editingTeacherSubjects.id, {
        subjects: editingTeacherSubjects.subjects
      });
      setStatusMessage(`Updated subject specializations for ${editingTeacherSubjects.name}. The AI Scheduler will now allocate these subjects strictly to this educator.`);
      setEditingTeacherSubjects(null);
      fetchFetTeachers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update teacher subjects.');
    } finally {
      setSavingTeacherSubjects(false);
    }
  };

  const [generatingSchoolWide, setGeneratingSchoolWide] = useState(false);

  const handleGenerateSchoolWide = async () => {
    if (!academicYear) {
      setError('Choose an academic year before preparing a proposal.');
      return;
    }
    setGeneratingSchoolWide(true);
    setError(null);
    setStatusMessage(null);
    try {
      const res = await adminService.generateSchoolWideTimetable({ academic_year: Number(academicYear) });
      if (!res || res.saved !== false || !Array.isArray(res.proposals) || res.proposals.length === 0) {
        setError(res?.error || 'No timetable proposal was produced.');
        return;
      }
      const first = res.proposals[0];
      setTimetableData(first.timetable_data);
      setGrade(first.grade);
      setStream(first.streams && first.streams[0] ? first.streams[0] : '');
      setActiveTimetableName(`Unsaved proposal for grade ${first.grade}`);
      setActiveTimetableId(null);
      setSelectedClass(Object.keys(first.timetable_data || {})[0] || '');
      const skipped = Array.isArray(res.skipped) && res.skipped.length
        ? ` Some grades were left out: ${res.skipped.map((item: any) => item.grade).join(', ')}.`
        : '';
      setStatusMessage(`${res.message || 'Proposal prepared. Nothing was saved.'}${skipped}`);
    } catch (err: any) {
      console.error('Failed to generate school-wide timetables:', err);
      setError(err.response?.data?.error || err.message || 'Failed to generate school-wide timetables.');
    } finally {
      setGeneratingSchoolWide(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setStatusMessage(null);
    try {
      if (!academicYear || !grade || !stream) {
        setError('Choose the academic year, grade, and stream recorded for this school.');
        return;
      }
      const res = await adminService.generateTimetable({
        grade,
        stream,
        academic_year: Number(academicYear),
        target_subject: targetSubject || undefined
      });
      if (!res || res.saved !== false || !res.timetable_data || !res.filled_count) {
        setError(res?.error || 'No timetable proposal was produced.');
        return;
      }
      setTimetableData(res.timetable_data);
      setActiveTimetableName(`Unsaved proposal for grade ${grade} (${stream})`);
      setActiveTimetableId(null);
      const firstClass = Object.keys(res.timetable_data || {})[0] || '';
      setSelectedClass(firstClass);
      const gapNote = Array.isArray(res.gaps) && res.gaps.length ? ` ${res.gaps.length} periods could not be filled.` : '';
      setStatusMessage(`${res.message || 'Proposal prepared. Nothing was saved.'}${gapNote}`);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to generate timetable.');
    } finally {
      setGenerating(false);
    }
  };

  const handlePublishToTeachers = async () => {
    if (!timetableData) return;
    setPublishing(true);
    setError(null);
    setStatusMessage(null);
    try {
      const res = await adminService.publishToTeachers({
        timetable_data: timetableData,
        generation_details: { grade, stream, academic_year: Number(academicYear) },
        name: `Grade ${grade} (${stream}) Master Timetable`
      });
      setStatusMessage(res.message || 'Timetable published to assigned teachers for review!');
      fetchTimetablesList();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to publish to teachers.');
    } finally {
      setPublishing(false);
    }
  };

  const handleSaveSlotEdit = () => {
    if (!editingSlot || !selectedClass) return;
    const { day, period, subject, teacher, room, duration, lesson_focus } = editingSlot.data;
    setTimetableData((prev: any) => {
      if (!prev) return prev;
      const copy = JSON.parse(JSON.stringify(prev));
      if (!copy[selectedClass]) copy[selectedClass] = {};
      if (!copy[selectedClass][editingSlot.day]) copy[selectedClass][editingSlot.day] = {};
      copy[selectedClass][editingSlot.day][editingSlot.period] = {
        subject,
        teacher,
        room,
        duration: duration || '1 Hour (60 min)',
        lesson_focus: lesson_focus || ''
      };
      return copy;
    });
    setEditingSlot(null);
    setStatusMessage(`Updated period ${editingSlot.period} on ${editingSlot.day} for ${selectedClass}.`);
  };

  const handleClearSlot = (day: string, period: string) => {
    if (!selectedClass) return;
    setTimetableData((prev: any) => {
      if (!prev) return prev;
      const copy = JSON.parse(JSON.stringify(prev));
      if (copy[selectedClass] && copy[selectedClass][day]) {
        delete copy[selectedClass][day][period];
      }
      return copy;
    });
    setStatusMessage(`Cleared period ${period} on ${day} for ${selectedClass}.`);
  };

  const availableClasses = timetableData ? Object.keys(timetableData) : [];
  const activeClassData = timetableData && selectedClass ? timetableData[selectedClass] : null;
  const configuredGrades = [...new Set(schoolClasses.map((row) => Number(row.grade)).filter((value) => Number.isInteger(value)))].sort((a, b) => a - b);
  const configuredStreams = [...new Set(schoolClasses.filter((row) => Number(row.grade) === Number(grade) && row.stream).map((row) => String(row.stream)))];
  const classesMissingStream = schoolClasses.filter((row) => !row.stream).length;

  return (
    <div className="space-y-6">
      {/* Header & 1-Click Autonomous Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-brand-900/40 via-surface-dark to-surface-dark border border-white/10 shadow-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Calendar className="w-6 h-6 text-brand-400" />
            <h2 className="text-xl font-bold font-display text-white">AI Timetable & Master Scheduling</h2>
          </div>
        </div>

        <button
          onClick={handleGenerateSchoolWide}
          disabled={generatingSchoolWide || !academicYear}
          className="py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-xs shadow-glow-emerald transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
        >
          {generatingSchoolWide ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Preparing a proposal...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-emerald-200" />
              <span>Prepare an unsaved proposal for this school's classes</span>
            </>
          )}
        </button>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{typeof error === 'string' ? error : (error as any)?.message || String(error)}</span>
        </div>
      )}

      {/* Generator Control Card */}
      <div className="p-6 rounded-3xl bg-surface-dark border border-white/10 shadow-xl space-y-4">
        <h3 className="text-sm font-bold font-display text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-400" />
          Single Grade Custom Schedule Generator
        </h3>

        {(schoolClasses.length === 0 || classesMissingStream > 0 || !academicYear) && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200 space-y-1">
            {schoolClasses.length === 0 && <p>No classes are recorded for this school.</p>}
            {classesMissingStream > 0 && <p>{classesMissingStream} class record{classesMissingStream === 1 ? '' : 's'} have no stream.</p>}
            {!academicYear && <p>Choose an academic year. Subject offerings are read for that year.</p>}
            <p>A proposal is not saved, and it cannot be built until classes, streams, subject offerings, and teacher assignments exist.</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Academic year
            </label>
            <input
              type="number"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Select Grade
            </label>
            <select
              value={grade}
              onChange={(e) => {
                setGrade(e.target.value ? parseInt(e.target.value, 10) : '');
                setStream('');
                setTargetSubject('');
              }}
              className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Choose a recorded grade</option>
              {configuredGrades.map((value) => (
                <option key={value} value={value}>Grade {value}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Academic Stream
            </label>
            <select
              value={stream}
              onChange={(e) => {
                setStream(e.target.value);
                setTargetSubject('');
              }}
              className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Choose a recorded stream</option>
              {configuredStreams.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-500 text-white font-bold text-xs shadow-glow-indigo transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {generating ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-cyan-200" />
                  <span>Generate Schedule</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Timetable Interactive Grid & Publisher */}
      {timetableData && (
        <div className="p-6 rounded-3xl bg-surface-dark border border-white/10 shadow-xl space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="cyan" size="sm">{activeTimetableName || `Grade ${grade} (${stream})`}</Badge>
              <Badge variant="emerald" size="sm">60-Min Periods</Badge>
              <Badge variant="indigo" size="sm">45-Min Nutrition Break</Badge>
            </div>

            <div className="flex items-center gap-2">
              {activeTimetableId ? (
                <button
                  onClick={() => handleDeleteTimetable(activeTimetableId, activeTimetableName || 'Selected Timetable')}
                  disabled={deletingId === activeTimetableId}
                  className="px-4 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 font-bold text-xs shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{deletingId === activeTimetableId ? 'Archiving...' : 'Archive timetable'}</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setTimetableData(null);
                    setActiveTimetableName('');
                    setStatusMessage('Cleared draft from preview.');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-700/40 hover:bg-slate-700 text-slate-300 border border-white/10 font-bold text-xs shadow-lg transition-all flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Clear Draft</span>
                </button>
              )}

              <button
                onClick={handlePublishToTeachers}
                disabled={publishing || !academicYear || !grade || !stream}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {publishing ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Save draft for review</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Class & Day Filter Tabs */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Class:</span>
              {availableClasses.map((cName) => (
                <button
                  key={cName}
                  onClick={() => setSelectedClass(cName)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    selectedClass === cName
                      ? 'bg-brand-600 text-white shadow-glow-indigo'
                      : 'bg-surface-darker text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  {cName}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {DAYS.map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDay(d)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    selectedDay === d
                      ? 'bg-cyan-600 text-white'
                      : 'bg-surface-darker text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* 1-Hour Schedule Periods Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PERIODS.map((period, idx) => {
              const entry = activeClassData?.[selectedDay]?.[period];
              const isAfternoon = idx >= 3;

              return (
                <div
                  key={period}
                  className="p-4 rounded-2xl bg-surface-darker border border-white/10 space-y-3 relative group hover:border-brand-500/30 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] font-mono text-slate-300 font-bold">
                      Period {idx + 1} ({period})
                    </span>
                    <Badge variant={isAfternoon ? 'indigo' : 'cyan'} size="sm">
                      {isAfternoon ? 'Afternoon' : 'Morning'}
                    </Badge>
                  </div>

                  <div>
                    {entry ? (
                      <div className="space-y-1">
                        <p className="font-extrabold text-white text-sm">{entry.subject}</p>
                        <p className="text-xs text-brand-300 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          <span>{entry.teacher || 'Assigned Educator'}</span>
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {entry.room || 'Room not recorded'} • {entry.duration || '1 Hour (60 min)'}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4 text-center text-[11px] text-slate-500 italic">
                        Free Period / Study Slot
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setEditingSlot({ day: selectedDay, period, data: entry || { subject: '', teacher: '', room: '' } })}
                    className="w-full py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-[10px] font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Slot</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stored Timetables History List */}
      <div className="p-6 rounded-3xl bg-surface-dark border border-white/10 shadow-xl space-y-4">
        <h3 className="text-sm font-bold font-display text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          Existing School Timetables in Database
        </h3>

        {loadingList ? (
          <LoadingSpinner text="Loading timetables list..." />
        ) : timetablesList.length > 0 ? (
          <div className="divide-y divide-white/5">
            {timetablesList.map((tt) => {
              const isTeacherDraft = tt.status === 'draft_teachers';
              return (
                <div key={tt.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/5 px-3 rounded-xl transition-colors">
                  <div>
                    <p className="font-bold text-white text-xs">{tt.name}</p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Grade {tt.grade || 10} ({tt.stream || 'General'}) • Last Updated: {new Date(tt.updated_at || tt.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Badge variant={isTeacherDraft ? 'amber' : 'emerald'} size="sm">
                      {isTeacherDraft ? 'Pending Teacher Review' : 'Published to Learners'}
                    </Badge>
                    <button
                      onClick={() => handleSelectStoredTimetable(tt)}
                      className="px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>
                    <button
                      onClick={() => handleDeleteTimetable(tt.id, tt.name || `Grade ${tt.grade} Timetable`)}
                      disabled={deletingId === tt.id}
                      className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{deletingId === tt.id ? 'Deleting...' : 'Delete'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 text-xs">
            No timetables stored in database yet. Generate a new schedule above.
          </div>
        )}
      </div>

      {/* Manual / Optional FET Educator Subject Allocations (Grades 10 - 12) */}
      <div className="rounded-3xl bg-surface-dark border border-white/10 p-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">FET Educator Subject Allocations (Grades 10 - 12)</h3>
            </div>
          </div>
          <Badge variant="indigo" size="sm">
            {fetTeachers.length} FET Educators
          </Badge>
        </div>

        {loadingFetTeachers ? (
          <div className="p-6 flex justify-center">
            <LoadingSpinner size="md" />
          </div>
        ) : fetTeachers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fetTeachers.map((teacher: any) => {
              const subjects = Array.isArray(teacher.subjects) ? teacher.subjects : [];
              const grades = Array.isArray(teacher.grades_taught) ? teacher.grades_taught : [];
              return (
                <div key={teacher.id || teacher.user_id} className="p-4 rounded-2xl bg-surface-darker/60 border border-white/5 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-xs font-bold text-white">{teacher.full_name} {teacher.surname}</p>
                      <Badge variant="cyan" size="sm">Grades {grades.join(', ') || '10-12'}</Badge>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono mb-2">{teacher.email}</p>
                    
                    <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                      {subjects.length > 0 ? (
                        subjects.map((s: string, sIdx: number) => (
                          <span key={sIdx} className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-500 italic">No subjects assigned yet</span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setEditingTeacherSubjects({
                        id: teacher.user_id || teacher.id,
                        name: `${teacher.full_name} ${teacher.surname}`,
                        subjects: [...subjects]
                      });
                      setNewSubjectInput('');
                    }}
                    className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Manage Subjects</span>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 text-center text-slate-500 text-xs">
            No FET teachers registered yet.
          </div>
        )}
      </div>

      {/* Edit Teacher Subjects Modal */}
      {editingTeacherSubjects && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-surface-dark border border-white/10 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">
                  Assign Subjects: {editingTeacherSubjects.name}
                </h4>
                <p className="text-[11px] text-slate-400">
                  Select or add subjects strictly taught by this educator.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase">Add a subject this school offers</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Subject name"
                  value={newSubjectInput}
                  onChange={(e) => setNewSubjectInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newSubjectInput.trim()) {
                      e.preventDefault();
                      if (!editingTeacherSubjects.subjects.includes(newSubjectInput.trim())) {
                        setEditingTeacherSubjects({
                          ...editingTeacherSubjects,
                          subjects: [...editingTeacherSubjects.subjects, newSubjectInput.trim()]
                        });
                      }
                      setNewSubjectInput('');
                    }
                  }}
                  className="flex-1 rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs text-white placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newSubjectInput.trim() && !editingTeacherSubjects.subjects.includes(newSubjectInput.trim())) {
                      setEditingTeacherSubjects({
                        ...editingTeacherSubjects,
                        subjects: [...editingTeacherSubjects.subjects, newSubjectInput.trim()]
                      });
                      setNewSubjectInput('');
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-surface-darker hover:bg-white/10 text-white border border-white/10 text-xs font-bold"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Active Allocated Subjects Display */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase">Currently Assigned ({editingTeacherSubjects.subjects.length})</label>
              <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 rounded-xl bg-surface-darker/80 border border-white/5">
                {editingTeacherSubjects.subjects.length > 0 ? (
                  editingTeacherSubjects.subjects.map((sub, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold"
                    >
                      <span>{sub}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTeacherSubjects({
                            ...editingTeacherSubjects,
                            subjects: editingTeacherSubjects.subjects.filter((_, i) => i !== idx)
                          });
                        }}
                        className="hover:text-rose-400 text-slate-400 text-xs font-bold ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500 italic p-1">No subjects assigned.</span>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingTeacherSubjects(null)}
                className="flex-1 py-2.5 rounded-xl bg-surface-darker text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTeacherSubjects}
                disabled={savingTeacherSubjects}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {savingTeacherSubjects ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Save Specializations</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Slot Modal */}
      {editingSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-surface-dark border border-white/10 p-6 shadow-2xl space-y-4">
            <h4 className="text-sm font-bold text-white">
              Edit Period ({editingSlot.day} - {editingSlot.period})
            </h4>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Subject</label>
                <input
                  type="text"
                  value={editingSlot.data?.subject || ''}
                  onChange={(e) => setEditingSlot({ ...editingSlot, data: { ...editingSlot.data, subject: e.target.value } })}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Educator Name</label>
                <input
                  type="text"
                  value={editingSlot.data?.teacher || ''}
                  onChange={(e) => setEditingSlot({ ...editingSlot, data: { ...editingSlot.data, teacher: e.target.value } })}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Room / Lab</label>
                <input
                  type="text"
                  value={editingSlot.data?.room || ''}
                  onChange={(e) => setEditingSlot({ ...editingSlot, data: { ...editingSlot.data, room: e.target.value } })}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingSlot(null)}
                className="flex-1 py-2 rounded-xl bg-surface-darker text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSlotEdit}
                className="flex-1 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs"
              >
                Save Slot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
