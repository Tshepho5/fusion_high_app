import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  User,
  GraduationCap,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  MapPin,
  Mail,
  Phone,
  BookOpen
} from 'lucide-react';
import { consultationService, parentService, adminService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';

interface Consultation {
  id: number;
  subject: string;
  consultation_date: string;
  start_time: string;
  end_time: string;
  venue_or_link: string;
  status: string;
  parent_notes?: string;
  teacher_notes?: string;
  teacher_first_name: string;
  teacher_surname: string;
  teacher_email: string;
  teacher_phone: string;
  parent_first_name: string;
  parent_surname: string;
  parent_email: string;
  parent_phone?: string;
  child_first_name: string;
  child_surname: string;
  child_grade: number;
}

interface Slot {
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export const ParentTeacherConsultations: React.FC = () => {
  const { user } = useAuth();
  const isParent = user?.role === 'parent';
  const isTeacher = user?.role === 'teacher';

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Booking Form State
  const [isBookModalOpen, setIsBookModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [childrenList, setChildrenList] = useState<any[]>([]);
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [checkingSlots, setCheckingSlots] = useState<boolean>(false);

  const [form, setForm] = useState({
    child_id: '',
    teacher_id: '',
    subject: 'Academic Progress Consultation',
    consultation_date: new Date().toISOString().split('T')[0],
    start_time: '',
    end_time: '',
    parent_notes: ''
  });

  const fetchConsultations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await consultationService.getMyConsultations();
      if (res.success) {
        setConsultations(res.consultations || []);
      }
    } catch (err: any) {
      console.error('Error fetching consultations:', err);
      setError(err.response?.data?.error || err.message || 'Failed to retrieve consultations.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [kidsResult, teachResult] = await Promise.allSettled([
        parentService.getChildren(),
        consultationService.getEducators()
      ]);

      let kids: any[] = [];
      if (kidsResult.status === 'fulfilled') {
        const res = kidsResult.value;
        kids = Array.isArray(res) ? res : res?.children || [];
        setChildrenList(kids);
      }

      let teachers: any[] = [];
      if (teachResult.status === 'fulfilled') {
        const res = teachResult.value;
        teachers = Array.isArray(res) ? res : res?.educators || res?.teachers || [];
        setTeachersList(teachers);
      } else {
        // Fallback for admin users
        try {
          const adminTeachRes = await adminService.getAllTeachers();
          teachers = Array.isArray(adminTeachRes) ? adminTeachRes : adminTeachRes?.teachers || [];
          setTeachersList(teachers);
        } catch {}
      }

      if (kids.length > 0) {
        setForm(prev => ({
          ...prev,
          child_id: prev.child_id || String(kids[0].id)
        }));
      }
    } catch (e) {
      console.warn('Dependency fetch error:', e);
    }
  };

  // Selected learner and active grade
  const selectedChild = childrenList.find(k => String(k.id) === String(form.child_id)) || childrenList[0];
  const selectedChildGrade = selectedChild ? Number(selectedChild.grade) : null;

  // Filter educators corresponding to the selected learner's grade
  const filteredTeachers = React.useMemo(() => {
    if (!selectedChildGrade || isNaN(selectedChildGrade)) {
      return teachersList;
    }
    return teachersList.filter((t: any) => {
      const grades = t.grades_taught || t.grades || [];
      if (!Array.isArray(grades) || grades.length === 0) {
        return true;
      }
      return grades.map(Number).includes(selectedChildGrade);
    });
  }, [teachersList, selectedChildGrade]);

  const handleChildChange = (newChildId: string) => {
    const newChild = childrenList.find(k => String(k.id) === String(newChildId));
    const newGrade = newChild ? Number(newChild.grade) : null;

    const currentTeacher = teachersList.find(t => String(t.id || t.user_id) === String(form.teacher_id));
    const teacherGrades = currentTeacher ? (currentTeacher.grades_taught || currentTeacher.grades || []) : [];
    const isStillValid = currentTeacher && (!newGrade || teacherGrades.length === 0 || teacherGrades.map(Number).includes(newGrade));

    setForm(prev => ({
      ...prev,
      child_id: newChildId,
      teacher_id: isStillValid ? prev.teacher_id : '',
      start_time: isStillValid ? prev.start_time : '',
      end_time: isStillValid ? prev.end_time : ''
    }));

    if (!isStillValid) {
      setAvailableSlots([]);
    }
  };

  useEffect(() => {
    fetchConsultations();
    fetchDependencies();
  }, []);

  const handleCheckSlots = async (teacherId: string, date: string) => {
    if (!teacherId || !date) return;
    setCheckingSlots(true);
    try {
      const res = await consultationService.getAvailableSlots(teacherId, date);
      if (res.success) {
        setAvailableSlots(res.slots || []);
      }
    } catch (e: any) {
      console.error('Error checking slots:', e);
    } finally {
      setCheckingSlots(false);
    }
  };

  const handleSelectSlot = (slot: Slot) => {
    if (!slot.is_available) return;
    setForm(prev => ({
      ...prev,
      start_time: slot.start_time,
      end_time: slot.end_time
    }));
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.start_time || !form.end_time) {
      setError('Please select an available consultation time slot.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await consultationService.bookConsultation(form);
      if (res.success) {
        setActionSuccess(res.message || 'Consultation session scheduled successfully! Confirmation emails dispatched.');
        setIsBookModalOpen(false);
        setForm({
          child_id: childrenList[0]?.id ? String(childrenList[0].id) : '',
          teacher_id: '',
          subject: 'Academic Progress Consultation',
          consultation_date: new Date().toISOString().split('T')[0],
          start_time: '',
          end_time: '',
          parent_notes: ''
        });
        fetchConsultations();
        setTimeout(() => setActionSuccess(null), 5000);
      }
    } catch (err: any) {
      console.error('Error booking consultation:', err);
      setError(err.response?.data?.error || err.message || 'Failed to book consultation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-extrabold uppercase tracking-wider border border-cyan-500/30 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-cyan-400" />
              Parent-Educator Virtual & In-Person Sessions
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight flex items-center gap-2 mt-1">
            <MessageSquare className="w-6 h-6 text-brand-400" />
            Educator Consultation Scheduler
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Book 20-minute dedicated academic review sessions with subject teachers with automated email confirmations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isParent && (
            <button
              onClick={() => {
                if (!form.child_id && childrenList.length > 0) {
                  setForm(prev => ({ ...prev, child_id: String(childrenList[0].id) }));
                }
                if (teachersList.length === 0) {
                  fetchDependencies();
                }
                setIsBookModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-500 hover:to-cyan-500 text-white font-bold text-xs shadow-glow-cyan transition-all transform hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              <span>+ Book Educator Consultation</span>
            </button>
          )}

          <button
            onClick={fetchConsultations}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors border border-white/10"
            title="Refresh Consultations"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 animate-fade-in shadow-lg">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Consultations List */}
      <div className="rounded-3xl bg-surface-dark border border-white/10 p-5 shadow-xl">
        {loading ? (
          <LoadingSpinner text="Retrieving consultation schedule..." />
        ) : consultations.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <Calendar className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p className="font-bold text-white text-sm">No Scheduled Consultations</p>
            <p>
              {isParent
                ? 'Click "+ Book Educator Consultation" to choose a teacher and reserve a time slot.'
                : 'No upcoming parent consultation appointments scheduled at this time.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {consultations.map((c) => {
              const isPast = new Date(c.consultation_date) < new Date();
              return (
                <div
                  key={c.id}
                  className="p-4 rounded-2xl bg-surface-darker border border-white/10 shadow-md space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <span className="font-extrabold text-white text-sm">{c.subject}</span>
                    <Badge
                      variant={
                        c.status === 'completed'
                          ? 'emerald'
                          : c.status === 'cancelled'
                          ? 'rose'
                          : 'cyan'
                      }
                      size="sm"
                    >
                      {c.status?.toUpperCase() || 'SCHEDULED'}
                    </Badge>
                  </div>

                  {isTeacher ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-2.5 rounded-xl bg-surface-dark/60 border border-white/5 space-y-1">
                        <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
                          <User className="w-3 h-3" />
                          Parent / Guardian
                        </span>
                        <p className="font-bold text-white text-sm">
                          {c.parent_first_name} {c.parent_surname}
                        </p>
                        <div className="text-[11px] text-slate-300 font-mono space-y-0.5 pt-0.5">
                          {c.parent_email && (
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <Mail className="w-3 h-3 text-slate-500" />
                              <span className="truncate">{c.parent_email}</span>
                            </div>
                          )}
                          {c.parent_phone && (
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <Phone className="w-3 h-3 text-slate-500" />
                              <span>{c.parent_phone}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-surface-dark/60 border border-white/5 space-y-1">
                        <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1">
                          <GraduationCap className="w-3 h-3" />
                          Registered Learner
                        </span>
                        <p className="font-bold text-cyan-300 text-sm">
                          {c.child_first_name} {c.child_surname}
                        </p>
                        <span className="text-[11px] text-slate-400 block">
                          Grade {c.child_grade || 10} • Academic Review
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Educator</span>
                        <p className="font-bold text-white mt-0.5">
                          {c.teacher_first_name} {c.teacher_surname}
                        </p>
                        <span className="text-[10px] text-slate-400 font-mono block">{c.teacher_email}</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Learner</span>
                        <p className="font-bold text-cyan-300 mt-0.5">
                          {c.child_first_name} {c.child_surname}
                        </p>
                        <span className="text-[10px] text-slate-400 block">Grade {c.child_grade || 10}</span>
                      </div>
                    </div>
                  )}

                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-1 text-[11px]">
                    <div className="flex items-center gap-2 text-slate-300 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-brand-400" />
                      <span>{new Date(c.consultation_date).toLocaleDateString()}</span>
                      <Clock className="w-3.5 h-3.5 text-brand-400 ml-2" />
                      <span>{c.start_time} - {c.end_time}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      <span>{c.venue_or_link || 'School Educator Office'}</span>
                    </div>
                  </div>

                  {c.parent_notes && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-slate-200 space-y-0.5">
                      <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider block">
                        Parent Consultation Note / Agenda
                      </span>
                      <p className="text-[11px] italic text-slate-300">
                        "{c.parent_notes}"
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BOOK CONSULTATION MODAL */}
      <Modal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        title="Schedule Parent-Educator Academic Consultation"
        maxWidth="2xl"
      >
        <form onSubmit={handleBook} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Select Learner *</label>
              <select
                required
                value={form.child_id}
                onChange={(e) => handleChildChange(e.target.value)}
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-brand-500"
              >
                {childrenList.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.full_name} {k.surname} (Grade {k.grade})
                  </option>
                ))}
              </select>
              {selectedChildGrade && (
                <span className="text-[10.5px] text-cyan-400 font-mono mt-1 block">
                  Enrolled Grade: {selectedChildGrade} {selectedChild?.stream ? `• ${selectedChild.stream}` : ''}
                </span>
              )}
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Select Subject Educator *</label>
              <select
                required
                value={form.teacher_id}
                onChange={(e) => {
                  const tId = e.target.value;
                  setForm(prev => ({ ...prev, teacher_id: tId, start_time: '', end_time: '' }));
                  if (tId) {
                    handleCheckSlots(tId, form.consultation_date);
                  } else {
                    setAvailableSlots([]);
                  }
                }}
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-brand-500"
              >
                <option value="">-- Choose an Educator --</option>
                {filteredTeachers.map((t) => {
                  const subList = Array.isArray(t.subjects) && t.subjects.length > 0
                    ? t.subjects.join(', ')
                    : (t.role || 'Subject Educator');
                  const gradeList = Array.isArray(t.grades_taught) && t.grades_taught.length > 0
                    ? ` (Gr ${t.grades_taught.join(', ')})`
                    : '';
                  return (
                    <option key={t.id || t.user_id} value={t.id || t.user_id}>
                      {t.name || `${t.full_name || ''} ${t.surname || ''}`.trim()} — {subList}{gradeList}
                    </option>
                  );
                })}
                {filteredTeachers.length === 0 && (
                  <option disabled value="">No educators available for Grade {selectedChildGrade}</option>
                )}
              </select>
              <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                {filteredTeachers.length} educator{filteredTeachers.length === 1 ? '' : 's'} instructing Grade {selectedChildGrade || 'all'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Consultation Date *</label>
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={form.consultation_date}
                onChange={(e) => {
                  const d = e.target.value;
                  setForm(prev => ({ ...prev, consultation_date: d }));
                  if (form.teacher_id) handleCheckSlots(form.teacher_id, d);
                }}
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-brand-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Discussion Subject / Topic</label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => setForm(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="e.g. Mathematics Term 1 Test Progress"
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Time Slot Picker */}
          <div className="space-y-1.5">
            <label className="block text-slate-300 font-bold">
              Available 20-Minute Time Slots {checkingSlots && '(Checking availability...)'}
            </label>
            {availableSlots.length > 0 ? (
              <div className="grid grid-cols-4 gap-2 p-3 rounded-2xl bg-surface-darker border border-white/10">
                {availableSlots.map((slot) => {
                  const isSelected = form.start_time === slot.start_time;
                  return (
                    <button
                      type="button"
                      key={slot.start_time}
                      disabled={!slot.is_available}
                      onClick={() => handleSelectSlot(slot)}
                      className={`py-2 px-2 rounded-xl font-mono text-[11px] font-bold transition-all ${
                        !slot.is_available
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 cursor-not-allowed opacity-50'
                          : isSelected
                          ? 'bg-cyan-600 text-white shadow-glow-cyan'
                          : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {slot.start_time} - {slot.end_time}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-surface-darker border border-white/5 text-slate-400 text-center">
                Select an educator above to display open consultation time slots.
              </div>
            )}
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Agenda / Questions for the Teacher (Optional)</label>
            <textarea
              rows={2}
              value={form.parent_notes}
              onChange={(e) => setForm(prev => ({ ...prev, parent_notes: e.target.value }))}
              placeholder="e.g. Would like to discuss homework completion and test preparation strategies."
              className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => setIsBookModalOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !form.start_time}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-500 hover:to-cyan-500 text-white font-extrabold shadow-glow-cyan transition-all disabled:opacity-50"
            >
              {submitting ? 'Booking & Emailing...' : 'Confirm Consultation Booking'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ParentTeacherConsultations;
