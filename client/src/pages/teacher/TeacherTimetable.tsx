import React, { useState, useEffect } from 'react';
import { teacherService, timetableSwapService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  Calendar,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  Edit3,
  BookOpen,
  MapPin,
  Users,
  Repeat,
  Star,
  Check,
  X,
  Sparkles,
  Inbox
} from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const PERIODS = [
  '07:45-08:15',
  '08:15-08:45',
  '08:45-09:15',
  '09:15-09:45',
  '09:45-10:15',
  '10:15-10:45',
  '11:45-12:15',
  '12:15-12:45',
  '12:45-13:15',
  '13:15-13:45'
];

export const TeacherTimetable: React.FC = () => {
  const { user } = useAuth();
  const [timetables, setTimetables] = useState<any[]>([]);
  const [selectedTimetable, setSelectedTimetable] = useState<any | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  const [loading, setLoading] = useState<boolean>(true);
  const [publishing, setPublishing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Swap requests state
  const [swapRequests, setSwapRequests] = useState<any[]>([]);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState<boolean>(false);
  const [isSwapRequestsDrawerOpen, setIsSwapRequestsDrawerOpen] = useState<boolean>(false);
  const [swapSourceSlot, setSwapSourceSlot] = useState<{ day: string; period: string; data: any } | null>(null);
  const [targetSwapDay, setTargetSwapDay] = useState<string>('Monday');
  const [targetSwapPeriod, setTargetSwapPeriod] = useState<string>(PERIODS[0]);
  const [swapReason, setSwapReason] = useState<string>('');
  const [sendingSwap, setSendingSwap] = useState<boolean>(false);

  // Edit slot modal
  const [editingSlot, setEditingSlot] = useState<{ day: string; period: string; data: any } | null>(null);

  const fetchTimetables = () => {
    setLoading(true);
    teacherService.getTimetables()
      .then(res => {
        const list = Array.isArray(res) ? res : [];
        setTimetables(list);
        if (list.length > 0) {
          const current = selectedTimetable ? list.find(t => t.id === selectedTimetable.id) || list[0] : list[0];
          setSelectedTimetable(current);
          const tData = typeof current.timetable_data === 'string' ? JSON.parse(current.timetable_data) : current.timetable_data;
          const classes = Object.keys(tData || {});
          if (classes.length > 0) {
            setSelectedClass(classes[0]);
          }
        }
      })
      .catch(err => {
        console.error('Failed to load teacher timetables:', err);
        setError('Could not load assigned timetables.');
      })
      .finally(() => setLoading(false));
  };

  const fetchSwapRequests = () => {
    timetableSwapService.getSwapRequests()
      .then(res => {
        setSwapRequests(Array.isArray(res) ? res : []);
      })
      .catch(err => console.error('Error fetching swap requests:', err));
  };

  useEffect(() => {
    fetchTimetables();
    fetchSwapRequests();
  }, []);

  const handlePublishToLearners = async () => {
    if (!selectedTimetable) return;
    setPublishing(true);
    setError(null);
    setStatusMessage(null);

    const tData = typeof selectedTimetable.timetable_data === 'string'
      ? JSON.parse(selectedTimetable.timetable_data)
      : selectedTimetable.timetable_data;

    try {
      const res = await teacherService.publishToLearners({
        timetable_id: selectedTimetable.id,
        timetable_data: tData
      });
      setStatusMessage(res.message || 'Timetable published to learners and parents successfully!');
      fetchTimetables();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to publish timetable.');
    } finally {
      setPublishing(false);
    }
  };

  const handleOpenSwapModal = (day: string, period: string, data: any) => {
    setSwapSourceSlot({ day, period, data });
    setTargetSwapDay(day === 'Monday' ? 'Tuesday' : 'Monday');
    setTargetSwapPeriod(PERIODS[1]);
    setSwapReason('');
    setIsSwapModalOpen(true);
  };

  const handleSendSwapRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!swapSourceSlot || !selectedTimetable || !selectedClass) return;

    const tData = typeof selectedTimetable.timetable_data === 'string'
      ? JSON.parse(selectedTimetable.timetable_data)
      : selectedTimetable.timetable_data;

    const targetSlotData = tData?.[selectedClass]?.[targetSwapDay]?.[targetSwapPeriod];
    const targetTeacherName = targetSlotData?.teacher || 'Colleague Educator';

    setSendingSwap(true);
    setError(null);

    try {
      const res = await timetableSwapService.createSwapRequest({
        timetable_id: selectedTimetable.id,
        class_name: selectedClass,
        requester_day: swapSourceSlot.day,
        requester_period: swapSourceSlot.period,
        requester_subject: swapSourceSlot.data?.subject || 'Subject Period',
        target_teacher_name: targetTeacherName,
        target_day: targetSwapDay,
        target_period: targetSwapPeriod,
        target_subject: targetSlotData?.subject || 'Subject Period',
        reason: swapReason
      });

      setStatusMessage(res.message || 'Swap request sent to teacher for review!');
      setIsSwapModalOpen(false);
      fetchSwapRequests();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to send swap request.');
    } finally {
      setSendingSwap(false);
    }
  };

  const handleRespondToSwap = async (id: number, action: 'accepted' | 'declined') => {
    try {
      const res = await timetableSwapService.respondToSwap(id, action);
      setStatusMessage(res.message);
      fetchSwapRequests();
      fetchTimetables();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to process swap response.');
    }
  };

  const handleSaveSlotEdit = () => {
    if (!editingSlot || !selectedClass || !selectedTimetable) return;
    const tData = typeof selectedTimetable.timetable_data === 'string'
      ? JSON.parse(selectedTimetable.timetable_data)
      : { ...selectedTimetable.timetable_data };

    if (!tData[selectedClass]) tData[selectedClass] = {};
    if (!tData[selectedClass][editingSlot.day]) tData[selectedClass][editingSlot.day] = {};
    tData[selectedClass][editingSlot.day][editingSlot.period] = editingSlot.data;

    setSelectedTimetable({
      ...selectedTimetable,
      timetable_data: tData
    });
    setEditingSlot(null);
  };

  if (loading) return <LoadingSpinner text="Fetching assigned class schedules..." />;

  const parsedData = selectedTimetable
    ? (typeof selectedTimetable.timetable_data === 'string' ? JSON.parse(selectedTimetable.timetable_data) : selectedTimetable.timetable_data)
    : null;
  const availableClasses = parsedData ? Object.keys(parsedData) : [];
  const activeClassData = parsedData && selectedClass ? parsedData[selectedClass] : null;
  const isDraftForReview = selectedTimetable?.status === 'draft_teachers';

  const teacherFullName = (user?.full_name || '').toLowerCase().trim();
  const teacherSurname = (user?.surname || '').toLowerCase().trim();

  const isMySlot = (slotTeacher: string) => {
    if (!slotTeacher) return false;
    const lower = slotTeacher.toLowerCase().trim();
    return (
      (teacherFullName && lower.includes(teacherFullName)) ||
      (teacherSurname && lower.includes(teacherSurname)) ||
      lower === 'me'
    );
  };

  const pendingIncomingSwaps = swapRequests.filter(s => s.status === 'pending' && s.target_teacher_id === user?.id);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight flex items-center gap-2">
            <Calendar className="w-6 h-6 text-cyan-400" />
            Educator Timetable & Curriculum Allocations
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Review draft allocations, your assigned subject periods are highlighted. Request period swaps with colleagues if needed.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Swap requests inbox button */}
          <button
            onClick={() => setIsSwapRequestsDrawerOpen(true)}
            className="relative flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-darker hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-bold transition-all"
          >
            <Repeat className="w-3.5 h-3.5 text-brand-400" />
            <span>Swap Requests</span>
            {pendingIncomingSwaps.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] animate-pulse">
                {pendingIncomingSwaps.length}
              </span>
            )}
          </button>

          {selectedTimetable && (
            <button
              onClick={handlePublishToLearners}
              disabled={publishing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{publishing ? 'Publishing...' : 'Publish to Learners & Parents'}</span>
            </button>
          )}
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

      {/* Timetable Selector Tabs */}
      {timetables.length > 0 ? (
        <div className="space-y-6">
          <div className="flex gap-2 p-1.5 rounded-2xl bg-surface-dark border border-white/10 overflow-x-auto">
            {timetables.map((tt) => {
              const isSelected = selectedTimetable?.id === tt.id;
              const isDraft = tt.status === 'draft_teachers';
              return (
                <button
                  key={tt.id}
                  onClick={() => {
                    setSelectedTimetable(tt);
                    const tData = typeof tt.timetable_data === 'string' ? JSON.parse(tt.timetable_data) : tt.timetable_data;
                    const classes = Object.keys(tData || {});
                    if (classes.length > 0) setSelectedClass(classes[0]);
                  }}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    isSelected
                      ? 'bg-gradient-to-r from-brand-600 to-cyan-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>{tt.name}</span>
                  <Badge variant={isDraft ? 'amber' : 'emerald'} size="sm">
                    {isDraft ? 'Review Draft' : 'Active'}
                  </Badge>
                </button>
              );
            })}
          </div>

          {/* Timetable Grid Card */}
          {selectedTimetable && (
            <div className="p-6 rounded-3xl bg-surface-dark border border-white/10 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-brand-600/20 text-cyan-400">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold font-display text-white">{selectedTimetable.name}</h3>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Status: {isDraftForReview ? 'Admin Review Draft • Highlighted slots belong to you' : 'Published & Live on Learner Portals'}
                    </p>
                  </div>
                </div>

                {availableClasses.length > 1 && (
                  <div className="flex gap-1.5">
                    {availableClasses.map((cls) => (
                      <button
                        key={cls}
                        onClick={() => setSelectedClass(cls)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
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

              {/* Period Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                {PERIODS.map((period, pIdx) => {
                  const entry = activeClassData?.[selectedDay]?.[period];
                  const mine = entry && entry.teacher && isMySlot(entry.teacher);

                  return (
                    <div
                      key={period}
                      className={`p-3.5 rounded-2xl flex flex-col justify-between space-y-2 transition-all group ${
                        mine
                          ? 'bg-brand-600/15 border-2 border-brand-500 shadow-glow-indigo ring-1 ring-brand-400/40'
                          : 'bg-surface-darker border border-white/5 hover:border-white/20'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 pb-1 border-b border-white/5">
                          <span className="flex items-center gap-1">
                            {mine && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                            Period {pIdx + 1}
                          </span>
                          <span>{period}</span>
                        </div>

                        {entry && entry.subject ? (
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <p className="font-bold text-white text-xs leading-snug">{entry.subject}</p>
                              {mine && (
                                <Badge variant="cyan" size="sm">Your Class</Badge>
                              )}
                            </div>
                            <p className={`text-[11px] flex items-center gap-1 font-semibold ${mine ? 'text-cyan-300' : 'text-slate-400'}`}>
                              <Users className="w-3 h-3 shrink-0 text-cyan-400" />
                              <span className="truncate">{entry.teacher || 'Educator'}</span>
                            </p>
                            <p className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                              <MapPin className="w-2.5 h-2.5 text-slate-500" />
                              <span>{entry.room || 'Classroom'}</span>
                            </p>
                            {entry.lesson_focus && (
                              <p className="text-[10px] text-slate-500 italic truncate">
                                {entry.lesson_focus}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="mt-4 text-center text-[11px] text-slate-500 italic">
                            Free / Study Period
                          </div>
                        )}
                      </div>

                      <div className="flex gap-1 pt-2 border-t border-white/5">
                        <button
                          onClick={() => setEditingSlot({ day: selectedDay, period, data: entry || { subject: 'Mathematics', teacher: user?.full_name || '', room: `Room 10A` } })}
                          className="flex-1 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors"
                        >
                          <Edit3 className="w-3 h-3 text-cyan-400" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => handleOpenSwapModal(selectedDay, period, entry || { subject: 'Mathematics', teacher: user?.full_name || '' })}
                          className="flex-1 py-1 rounded-lg bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors"
                          title="Exchange this period with a colleague"
                        >
                          <Repeat className="w-3 h-3" />
                          <span>Swap</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-12 text-center text-slate-400 text-xs rounded-3xl bg-surface-dark border border-white/10">
          <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="max-w-md mx-auto">
            No draft timetables assigned by Administration yet. When Administration generates your schedule, it will appear here for review and period exchange.
          </p>
        </div>
      )}

      {/* Period Swap Modal */}
      {isSwapModalOpen && swapSourceSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-surface-dark border border-white/10 p-6 shadow-2xl space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Repeat className="w-4 h-4 text-brand-400" />
              Request Timetable Slot Exchange
            </h4>

            <div className="p-3.5 rounded-2xl bg-surface-darker border border-white/5 text-xs space-y-1">
              <p className="font-bold text-white">Your Selected Period:</p>
              <p className="text-cyan-300 font-mono">
                {swapSourceSlot.day} ({swapSourceSlot.period}) • {swapSourceSlot.data?.subject || 'Subject'}
              </p>
              <p className="text-slate-400 text-[11px]">Class: {selectedClass}</p>
            </div>

            <form onSubmit={handleSendSwapRequest} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Target Day</label>
                  <select
                    value={targetSwapDay}
                    onChange={(e) => setTargetSwapDay(e.target.value)}
                    className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {DAYS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Target Period</label>
                  <select
                    value={targetSwapPeriod}
                    onChange={(e) => setTargetSwapPeriod(e.target.value)}
                    className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                  >
                    {PERIODS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Reason for Exchange (Optional)</label>
                <textarea
                  rows={2}
                  value={swapReason}
                  onChange={(e) => setSwapReason(e.target.value)}
                  placeholder="e.g. Need morning period for Science Lab practical setup..."
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSwapModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-surface-darker text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingSwap}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {sendingSwap ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Swap Request</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Swap Requests Drawer Modal */}
      {isSwapRequestsDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-surface-dark border border-white/10 p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Repeat className="w-4 h-4 text-cyan-400" />
                Teacher-to-Teacher Slot Exchanges
              </h4>
              <button
                onClick={() => setIsSwapRequestsDrawerOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {swapRequests.length > 0 ? (
              <div className="space-y-3">
                {swapRequests.map((req) => {
                  const isIncoming = req.target_teacher_id === user?.id;
                  const isPending = req.status === 'pending';
                  return (
                    <div
                      key={req.id}
                      className={`p-4 rounded-2xl border space-y-2.5 ${
                        isPending
                          ? 'bg-surface-darker border-amber-500/30'
                          : 'bg-surface-darker/60 border-white/5 opacity-80'
                      }`}
                    >
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-white">
                          {isIncoming ? `Request from ${req.requester_name || 'Colleague'}` : `Your Request to ${req.target_name || 'Colleague'}`}
                        </span>
                        <Badge
                          variant={req.status === 'accepted' ? 'emerald' : req.status === 'declined' ? 'rose' : 'amber'}
                          size="sm"
                        >
                          {req.status.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="text-[11px] text-slate-300 space-y-1 bg-surface-dark p-2.5 rounded-xl">
                        <p><strong>Class:</strong> {req.class_name}</p>
                        <p><strong>Offered Slot:</strong> {req.requester_day} ({req.requester_period}) - {req.requester_subject}</p>
                        <p><strong>Target Slot:</strong> {req.target_day} ({req.target_period}) - {req.target_subject}</p>
                        {req.reason && <p className="text-slate-400 italic">"{req.reason}"</p>}
                      </div>

                      {isIncoming && isPending && (
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => handleRespondToSwap(req.id, 'declined')}
                            className="flex-1 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 text-xs font-bold flex items-center justify-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Decline</span>
                          </button>
                          <button
                            onClick={() => handleRespondToSwap(req.id, 'accepted')}
                            className="flex-1 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-sm"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Accept & Swap Slots</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs">
                No active slot exchange requests.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Slot Modal */}
      {editingSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-surface-dark border border-white/10 p-6 shadow-2xl space-y-4">
            <h4 className="text-sm font-bold text-white">
              Adjust Period Details ({editingSlot.day} - {editingSlot.period})
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
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Room / Venue</label>
                <input
                  type="text"
                  value={editingSlot.data?.room || ''}
                  onChange={(e) => setEditingSlot({ ...editingSlot, data: { ...editingSlot.data, room: e.target.value } })}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Lesson Topic / Focus</label>
                <input
                  type="text"
                  value={editingSlot.data?.lesson_focus || ''}
                  onChange={(e) => setEditingSlot({ ...editingSlot, data: { ...editingSlot.data, lesson_focus: e.target.value } })}
                  placeholder="e.g. Chapter 4 Quiz Review"
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
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
