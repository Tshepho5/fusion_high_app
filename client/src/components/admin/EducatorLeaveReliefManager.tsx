import React, { useState, useEffect } from 'react';
import { leaveReliefService, adminService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Badge } from '../common/Badge';
import {
  UserCheck,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Check,
  X,
  Printer,
  Shield,
  FileText,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';

export const EducatorLeaveReliefManager: React.FC = () => {
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const [activeTab, setActiveTab] = useState<'requests' | 'scheduler' | 'daily-roster' | 'apply'>('requests');
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [dailyRoster, setDailyRoster] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Apply Leave Form
  const [leaveForm, setLeaveForm] = useState({
    teacher_user_id: '',
    leave_type: 'Sick Leave',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    total_days: 1.0,
    reason: '',
    document_url: ''
  });

  // Relief Scheduler Form & Available Teachers
  const [reliefDate, setReliefDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reliefPeriod, setReliefPeriod] = useState<number>(2);
  const [absentTeacherId, setAbsentTeacherId] = useState<string>('');
  const [selectedReliefTeacherId, setSelectedReliefTeacherId] = useState<string>('');
  const [reliefGrade, setReliefGrade] = useState<number>(12);
  const [reliefSubject, setReliefSubject] = useState<string>('Mathematics');
  const [reliefClassroom, setReliefClassroom] = useState<string>('Room 14B');
  const [reliefInstructions, setReliefInstructions] = useState<string>('Supervise Grade 12 past paper question set on Calculus.');
  const [availableTeachers, setAvailableTeachers] = useState<any[]>([]);
  const [searchingRelief, setSearchingRelief] = useState<boolean>(false);

  // Modal: Review Leave
  const [reviewModalOpen, setReviewModalOpen] = useState<boolean>(false);
  const [selectedLeave, setSelectedLeave] = useState<any | null>(null);
  const [adminNotes, setAdminNotes] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, [selectedStatus]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isAdmin) {
        const [reqs, roster, tList] = await Promise.allSettled([
          leaveReliefService.getLeaveRequests(selectedStatus),
          leaveReliefService.getDailyRoster(),
          adminService.getAllTeachers()
        ]);
        if (reqs.status === 'fulfilled') setLeaveRequests(reqs.value || []);
        if (roster.status === 'fulfilled') setDailyRoster(roster.value || []);
        if (tList.status === 'fulfilled') {
          const list = Array.isArray(tList.value) ? tList.value : tList.value.teachers || [];
          setTeachers(list);
          if (list.length > 0 && !absentTeacherId) {
            setAbsentTeacherId(list[0].id.toString());
          }
        }
      } else {
        // Teacher view
        const data = await leaveReliefService.getMyLeave();
        setLeaveRequests(data.my_leave_requests || []);
        setDailyRoster(data.my_relief_duties || []);
      }
    } catch (err: any) {
      console.error('Error loading leave/relief data:', err);
      setError('Could not load leave requests or relief rosters.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const res = await leaveReliefService.applyLeave(leaveForm);
      setSuccess(res.message || 'Leave application submitted.');
      setActiveTab('requests');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit leave application.');
    }
  };

  const handleUpdateStatus = async (status: 'approved' | 'rejected') => {
    if (!selectedLeave) return;
    try {
      const res = await leaveReliefService.updateLeaveStatus(selectedLeave.id, {
        status,
        admin_notes: adminNotes
      });
      setSuccess(res.message || `Leave ${status}.`);
      setReviewModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update leave status.');
    }
  };

  const handleScanAvailableTeachers = async () => {
    setSearchingRelief(true);
    try {
      const list = await leaveReliefService.getAvailableTeachers({
        date: reliefDate,
        period_number: reliefPeriod,
        absent_teacher_id: absentTeacherId ? parseInt(absentTeacherId, 10) : undefined
      });
      setAvailableTeachers(list || []);
      const firstFree = list.find((t: any) => t.is_available);
      if (firstFree) setSelectedReliefTeacherId(firstFree.id.toString());
    } catch (err: any) {
      setError('Failed to scan available substitute educators.');
    } finally {
      setSearchingRelief(false);
    }
  };

  const handleAssignRelief = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!absentTeacherId || !selectedReliefTeacherId) {
      setError('Please select both the absent educator and the substitute educator.');
      return;
    }
    try {
      const res = await leaveReliefService.assignRelief({
        absent_teacher_id: parseInt(absentTeacherId, 10),
        relief_teacher_id: parseInt(selectedReliefTeacherId, 10),
        relief_date: reliefDate,
        period_number: reliefPeriod,
        grade: reliefGrade,
        subject: reliefSubject,
        classroom: reliefClassroom,
        lesson_instructions: reliefInstructions
      });
      setSuccess(res.message || 'Relief duty allocated successfully!');
      const updatedRoster = await leaveReliefService.getDailyRoster(reliefDate);
      setDailyRoster(updatedRoster || []);
      setActiveTab('daily-roster');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to allocate relief duty.');
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading educator leave and relief management..." />;
  }

  const leaveTypes = [
    'Sick Leave',
    'Family Responsibility',
    'Study Leave',
    'Official Workshop / Moderation',
    'Special Leave'
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-brand-400" />
            <span>Educator Leave & Relief Duty Scheduler</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Review educator absence requests, scan timetable periods for free substitute teachers, and prevent unattended classrooms.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('apply')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-glow-indigo transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Apply for Leave</span>
          </button>
        </div>
      </div>

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'requests'
              ? 'bg-brand-600 text-white shadow-glow-indigo'
              : 'bg-surface-dark text-slate-400 hover:text-white border border-white/10'
          }`}
        >
          <span>Leave Applications ({leaveRequests.length})</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => {
              setActiveTab('scheduler');
              handleScanAvailableTeachers();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'scheduler'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-glow-amber'
                : 'bg-surface-dark text-slate-400 hover:text-white border border-white/10'
            }`}
          >
            <span>Smart Relief Period Scheduler</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('daily-roster')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'daily-roster'
              ? 'bg-emerald-600 text-white shadow-glow-emerald'
              : 'bg-surface-dark text-slate-400 hover:text-white border border-white/10'
          }`}
        >
          <span>Daily Relief Duty Manifest ({dailyRoster.length})</span>
        </button>
      </div>

      {/* TAB 1: Leave Applications List */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {isAdmin && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold">Filter Status:</span>
              {['all', 'pending', 'approved', 'rejected'].map(st => (
                <button
                  key={st}
                  onClick={() => setSelectedStatus(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                    selectedStatus === st ? 'bg-brand-600 text-white' : 'bg-surface-dark text-slate-300 border border-white/10'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {leaveRequests.map((l: any) => (
              <div
                key={l.id}
                className="p-6 rounded-3xl bg-surface-dark border border-white/10 hover:border-brand-500/40 shadow-xl transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Badge variant={l.leave_type.includes('Sick') ? 'rose' : l.leave_type.includes('Workshop') ? 'indigo' : 'cyan'} size="sm">
                        {l.leave_type}
                      </Badge>
                      <h3 className="text-base font-bold text-white mt-1">
                        {l.teacher_name ? `${l.teacher_name} ${l.teacher_surname}` : 'My Leave Request'}
                      </h3>
                      {l.teacher_email && <p className="text-[11px] text-slate-400">{l.teacher_email}</p>}
                    </div>

                    <Badge variant={l.status === 'approved' ? 'emerald' : l.status === 'pending' ? 'amber' : 'rose'} size="sm">
                      {l.status}
                    </Badge>
                  </div>

                  <div className="pt-2 border-t border-white/5 space-y-1.5 text-xs text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Duration:</span>
                      <strong className="text-white">
                        {new Date(l.start_date).toLocaleDateString('en-ZA')} to {new Date(l.end_date).toLocaleDateString('en-ZA')} ({l.total_days} days)
                      </strong>
                    </div>
                    {l.reason && (
                      <p className="text-[11px] text-slate-400 italic bg-surface-darker p-2.5 rounded-xl border border-white/5">
                        "{l.reason}"
                      </p>
                    )}
                    {l.admin_notes && (
                      <div className="text-[11px] text-emerald-300 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                        <strong>Principal / Admin Note:</strong> {l.admin_notes}
                      </div>
                    )}
                  </div>
                </div>

                {isAdmin && l.status === 'pending' && (
                  <div className="pt-3 border-t border-white/5 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedLeave(l);
                        setReviewModalOpen(true);
                      }}
                      className="flex-1 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-glow-indigo transition-all text-center"
                    >
                      Review & Approve / Decline
                    </button>
                  </div>
                )}
              </div>
            ))}

            {leaveRequests.length === 0 && (
              <div className="p-8 rounded-3xl bg-surface-dark text-center text-xs text-slate-400 col-span-2 border border-white/10">
                No leave requests found matching this filter.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Smart Relief Period Scheduler */}
      {activeTab === 'scheduler' && isAdmin && (
        <div className="p-6 md:p-8 rounded-3xl bg-surface-dark border border-white/10 space-y-6 shadow-xl">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-400" />
              <span>Timetable Relief Period Allocator</span>
            </h3>
            <p className="text-xs text-slate-400">
              Select the absent educator and affected period. The system automatically scans the Master Timetable to detect free educators with zero timetable clashes.
            </p>
          </div>

          <form onSubmit={handleAssignRelief} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Absent Educator *</label>
                <select
                  value={absentTeacherId}
                  onChange={(e) => setAbsentTeacherId(e.target.value)}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-amber-500"
                >
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.full_name || t.name} {t.surname || ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Relief Date *</label>
                <input
                  type="date"
                  required
                  value={reliefDate}
                  onChange={(e) => setReliefDate(e.target.value)}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Period Number (1 - 8) *</label>
                <select
                  value={reliefPeriod}
                  onChange={(e) => setReliefPeriod(parseInt(e.target.value, 10))}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-amber-500"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(p => (
                    <option key={p} value={p}>Period {p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleScanAvailableTeachers}
                disabled={searchingRelief}
                className="px-4 py-2 rounded-xl bg-surface-darker hover:bg-white/10 text-amber-300 font-bold text-xs border border-amber-500/30 transition-all flex items-center gap-2"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{searchingRelief ? 'Scanning Master Timetable...' : 'Scan Available Free Educators for Period ' + reliefPeriod}</span>
              </button>
            </div>

            {/* Available Educators Cards */}
            {availableTeachers.length > 0 && (
              <div className="space-y-2 pt-2">
                <label className="block text-slate-300 font-bold">Select Free Substitute Educator:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {availableTeachers.map(t => (
                    <div
                      key={t.id}
                      onClick={() => t.is_available && setSelectedReliefTeacherId(t.id.toString())}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between text-xs ${
                        !t.is_available
                          ? 'opacity-40 bg-surface-darker border-white/5 cursor-not-allowed'
                          : selectedReliefTeacherId === t.id.toString()
                          ? 'bg-amber-500/20 border-amber-500 text-white cursor-pointer shadow-glow-amber'
                          : 'bg-surface-darker border-white/10 text-slate-300 hover:border-white/20 cursor-pointer'
                      }`}
                    >
                      <div>
                        <span className="font-bold block">{t.full_name} {t.surname}</span>
                        <span className="text-[10px] text-slate-400">{t.employment_title || 'Subject Educator'}</span>
                      </div>
                      <Badge variant={t.is_available ? 'emerald' : 'rose'} size="sm">
                        {t.is_available ? 'Free Period' : t.is_on_leave ? 'On Leave' : 'Timetable Clash'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Grade Level *</label>
                <select
                  value={reliefGrade}
                  onChange={(e) => setReliefGrade(parseInt(e.target.value, 10))}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-amber-500"
                >
                  <option value={8}>Grade 8</option>
                  <option value={9}>Grade 9</option>
                  <option value={10}>Grade 10</option>
                  <option value={11}>Grade 11</option>
                  <option value={12}>Grade 12 (Matric Candidates)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Subject *</label>
                <input
                  type="text"
                  required
                  value={reliefSubject}
                  onChange={(e) => setReliefSubject(e.target.value)}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Classroom / Venue *</label>
                <input
                  type="text"
                  required
                  value={reliefClassroom}
                  onChange={(e) => setReliefClassroom(e.target.value)}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Lesson Instructions for Substitute *</label>
              <textarea
                rows={2}
                required
                value={reliefInstructions}
                onChange={(e) => setReliefInstructions(e.target.value)}
                placeholder="e.g. Ensure candidates complete past examination question set on Calculus p. 45-50."
                className="w-full rounded-xl bg-surface-darker border border-white/10 p-3 text-white focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center justify-end pt-3">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold shadow-glow-amber transition-all hover:from-amber-500 hover:to-orange-500"
              >
                Confirm Relief Allocation & Dispatch Alert
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: Daily Relief Duty Manifest */}
      {activeTab === 'daily-roster' && (
        <div className="p-6 md:p-8 rounded-3xl bg-surface-dark border border-white/10 space-y-6 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              <span>Daily Relief Roster Manifest</span>
            </h3>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs border border-white/10 flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Roster</span>
            </button>
          </div>

          <div className="space-y-3">
            {dailyRoster.map((r: any) => (
              <div
                key={r.id}
                className="p-4 rounded-2xl bg-surface-darker border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold font-mono">
                      Period {r.period_number}
                    </span>
                    <strong className="text-white text-sm">{r.subject} (Grade {r.grade})</strong>
                    <Badge variant="cyan" size="sm">{r.classroom}</Badge>
                  </div>
                  <p className="text-slate-400">
                    Substitute Educator: <span className="text-emerald-300 font-bold">{r.relief_teacher_name} {r.relief_teacher_surname}</span> (Covering for {r.absent_teacher_name} {r.absent_teacher_surname})
                  </p>
                  {r.lesson_instructions && (
                    <p className="text-[11px] text-slate-300 italic">"{r.lesson_instructions}"</p>
                  )}
                </div>

                <Badge variant={r.status === 'assigned' ? 'amber' : 'emerald'} size="sm">
                  {r.status}
                </Badge>
              </div>
            ))}

            {dailyRoster.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400 rounded-2xl bg-surface-darker border border-white/5">
                No relief duties scheduled for today's school day.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Apply for Leave Form */}
      {activeTab === 'apply' && (
        <div className="p-6 md:p-8 rounded-3xl bg-surface-dark border border-white/10 space-y-6 shadow-xl max-w-2xl">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">Educator Leave Application</h3>
            <p className="text-xs text-slate-400">
              Submit your absence request in compliance with SACE / Basic Conditions of Employment.
            </p>
          </div>

          <form onSubmit={handleApplyLeave} className="space-y-4 text-xs">
            {isAdmin && (
              <div>
                <label className="block text-slate-300 font-bold mb-1">Applying on Behalf of Educator *</label>
                <select
                  value={leaveForm.teacher_user_id}
                  onChange={(e) => setLeaveForm(prev => ({ ...prev, teacher_user_id: e.target.value }))}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Myself</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.full_name || t.name} {t.surname || ''}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-slate-300 font-bold mb-1">Leave Category *</label>
              <select
                value={leaveForm.leave_type}
                onChange={(e) => setLeaveForm(prev => ({ ...prev, leave_type: e.target.value }))}
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
              >
                {leaveTypes.map(lt => (
                  <option key={lt} value={lt}>{lt}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Start Date *</label>
                <input
                  type="date"
                  required
                  value={leaveForm.start_date}
                  onChange={(e) => setLeaveForm(prev => ({ ...prev, start_date: e.target.value }))}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">End Date *</label>
                <input
                  type="date"
                  required
                  value={leaveForm.end_date}
                  onChange={(e) => setLeaveForm(prev => ({ ...prev, end_date: e.target.value }))}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Total Days</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={leaveForm.total_days}
                  onChange={(e) => setLeaveForm(prev => ({ ...prev, total_days: parseFloat(e.target.value) || 1 }))}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Reason / Details</label>
              <textarea
                rows={3}
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Provide medical or workshop details..."
                className="w-full rounded-xl bg-surface-darker border border-white/10 p-3 text-white focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setActiveTab('requests')}
                className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold shadow-glow-indigo transition-all"
              >
                Submit Application
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Review Leave Request */}
      {reviewModalOpen && selectedLeave && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-surface-dark border border-white/10 p-6 space-y-4 shadow-2xl animate-fade-in text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div>
                <h3 className="text-base font-bold text-white">Review Leave Application</h3>
                <p className="text-slate-400">{selectedLeave.teacher_name} {selectedLeave.teacher_surname}</p>
              </div>
              <button onClick={() => setReviewModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 bg-surface-darker p-3 rounded-2xl border border-white/5">
              <div className="flex justify-between">
                <span className="text-slate-400">Category:</span>
                <span className="font-bold text-white">{selectedLeave.leave_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Dates:</span>
                <span className="text-white">{new Date(selectedLeave.start_date).toLocaleDateString('en-ZA')} - {new Date(selectedLeave.end_date).toLocaleDateString('en-ZA')} ({selectedLeave.total_days} days)</span>
              </div>
              {selectedLeave.reason && (
                <div className="pt-1 border-t border-white/5 text-slate-300 italic">
                  "{selectedLeave.reason}"
                </div>
              )}
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Administrative Notes</label>
              <textarea
                rows={2}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Optional feedback or relief instructions..."
                className="w-full rounded-xl bg-surface-darker border border-white/10 p-3 text-white focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => handleUpdateStatus('rejected')}
                className="px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white font-bold border border-rose-500/30"
              >
                Decline Leave
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus('approved')}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-glow-emerald"
              >
                Approve Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
