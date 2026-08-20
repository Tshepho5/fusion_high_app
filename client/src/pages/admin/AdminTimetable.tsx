import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
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
  '07:15-08:15',
  '08:15-09:15',
  '09:15-10:15',
  '11:00-12:00',
  '12:00-13:00',
  '13:00-14:00'
];

export const AdminTimetable: React.FC = () => {
  const [grade, setGrade] = useState<number>(10);
  const [stream, setStream] = useState<string>('General');
  const [generating, setGenerating] = useState<boolean>(false);
  const [publishing, setPublishing] = useState<boolean>(false);
  const [timetableData, setTimetableData] = useState<any | null>(null);
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
        setTimetablesList(Array.isArray(res) ? res : []);
      })
      .catch(err => {
        console.error('Failed to load timetables:', err);
      })
      .finally(() => setLoadingList(false));
  };

  useEffect(() => {
    fetchTimetablesList();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setStatusMessage(null);
    try {
      const res = await adminService.generateTimetable({ grade, stream });
      setTimetableData(res.timetable_data);
      const firstClass = Object.keys(res.timetable_data || {})[0] || `Grade ${grade}A`;
      setSelectedClass(firstClass);
      setStatusMessage(`Preview generated with ${res.filled_count || 0} scheduled periods.`);
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
        generation_details: { grade, stream },
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
    setTimetableData((prev: any) => {
      const copy = { ...prev };
      if (!copy[selectedClass]) copy[selectedClass] = {};
      if (!copy[selectedClass][editingSlot.day]) copy[selectedClass][editingSlot.day] = {};
      copy[selectedClass][editingSlot.day][editingSlot.period] = editingSlot.data;
      return copy;
    });
    setEditingSlot(null);
  };

  const availableClasses = timetableData ? Object.keys(timetableData) : [];
  const activeClassData = timetableData && selectedClass ? timetableData[selectedClass] : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight flex items-center gap-2">
            <Calendar className="w-6 h-6 text-cyan-400" />
            Timetable Generator & Allocation Studio
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Generate balanced schedules and publish directly to assigned teachers for curriculum review.
          </p>
        </div>
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
          <span>{error}</span>
        </div>
      )}

      {/* Generator Control Card */}
      <div className="p-6 rounded-3xl bg-surface-dark border border-white/10 shadow-xl space-y-4">
        <h3 className="text-sm font-bold font-display text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-400" />
          Generate New School Schedule
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Select Grade
            </label>
            <select
              value={grade}
              onChange={(e) => setGrade(parseInt(e.target.value, 10))}
              className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value={8}>Grade 8</option>
              <option value={9}>Grade 9</option>
              <option value={10}>Grade 10</option>
              <option value={11}>Grade 11</option>
              <option value={12}>Grade 12</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Academic Stream
            </label>
            <select
              value={stream}
              onChange={(e) => setStream(e.target.value)}
              className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="General">General Stream</option>
              <option value="Science">Science (Maths & Physical Sciences)</option>
              <option value="Commerce">Commerce (Accounting & Business)</option>
              <option value="Tourism">Services & Tourism</option>
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
                  <span>Generate AI Schedule</span>
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
              <Badge variant="cyan" size="sm">Grade {grade} ({stream})</Badge>
              {availableClasses.length > 1 && (
                <div className="flex gap-1.5 ml-2">
                  {availableClasses.map((cls) => (
                    <button
                      key={cls}
                      onClick={() => setSelectedClass(cls)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                        selectedClass === cls
                          ? 'bg-brand-600 text-white shadow-sm'
                          : 'bg-surface-darker text-slate-400 hover:text-white'
                      }`}
                    >
                      {cls}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handlePublishToTeachers}
              disabled={publishing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-brand-600 hover:from-emerald-500 text-white font-bold text-xs shadow-md transition-all self-start sm:self-auto disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{publishing ? 'Publishing...' : 'Publish Master Timetable (Live)'}</span>
            </button>
          </div>

          {/* Day Selector Tabs */}
          <div className="flex gap-2 p-1.5 rounded-2xl bg-surface-darker border border-white/5 overflow-x-auto">
            {DAYS.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedDay === day
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {day}
              </button>
            ))}
          </div>

          {/* Period Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {PERIODS.map((period, pIdx) => {
              const entry = activeClassData?.[selectedDay]?.[period];
              return (
                <div
                  key={period}
                  className="p-3.5 rounded-2xl bg-surface-darker border border-white/5 flex flex-col justify-between space-y-2 hover:border-brand-500/30 transition-all group"
                >
                  <div>
                    <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 pb-1 border-b border-white/5">
                      <span>Period {pIdx + 1}</span>
                      <span>{period}</span>
                    </div>
                    {entry && entry.subject ? (
                      <div className="mt-2 space-y-1">
                        <p className="font-bold text-white text-xs leading-snug">{entry.subject}</p>
                        <p className="text-[11px] text-cyan-300 flex items-center gap-1">
                          <Users className="w-3 h-3 text-cyan-400" />
                          <span>{entry.teacher || 'Assigned Educator'}</span>
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">{entry.room || 'Main Classroom'}</p>
                      </div>
                    ) : (
                      <div className="mt-4 text-center text-[11px] text-slate-500 italic">
                        Free Period / Study Slot
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setEditingSlot({ day: selectedDay, period, data: entry || { subject: 'Mathematics', teacher: '', room: `Room ${grade}A` } })}
                    className="w-full py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors"
                  >
                    <Edit3 className="w-3 h-3" />
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
                <div key={tt.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-white/5 px-3 rounded-xl transition-colors">
                  <div>
                    <p className="font-bold text-white text-xs">{tt.name}</p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Grade {tt.grade || 10} ({tt.stream || 'General'}) • Last Updated: {new Date(tt.updated_at || tt.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={isTeacherDraft ? 'amber' : 'emerald'} size="sm">
                      {isTeacherDraft ? 'Pending Teacher Review' : 'Published to Learners'}
                    </Badge>
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
