import React, { useState, useEffect } from 'react';
import { ptcService, parentService } from '../../services/api';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Badge } from '../common/Badge';
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Users,
  MessageSquare,
  X,
  Plus
} from 'lucide-react';

export const ParentPTC: React.FC = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Booking Modal State
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [parentNotes, setParentNotes] = useState<string>('');
  const [bookingInProgress, setBookingInProgress] = useState<boolean>(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [bookData, slotData, childData] = await Promise.allSettled([
        ptcService.getParentBookings(),
        ptcService.getAvailableSlots(),
        parentService.getChildren()
      ]);

      if (bookData.status === 'fulfilled') setBookings(Array.isArray(bookData.value) ? bookData.value : []);
      if (slotData.status === 'fulfilled') setAvailableSlots(Array.isArray(slotData.value) ? slotData.value : []);
      if (childData.status === 'fulfilled') {
        const cList = Array.isArray(childData.value) ? childData.value : [];
        setChildren(cList);
        if (cList.length > 0) {
          setSelectedChildId(cList[0].id.toString());
          const subs = cList[0].subjects || [];
          if (subs.length > 0) setSelectedSubject(subs[0]);
        }
      }
    } catch (err: any) {
      console.error('Error fetching PTC data:', err);
      setError('Could not load conference bookings and available slots.');
    } finally {
      setLoading(false);
    }
  };

  const handleBookSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !selectedChildId || !selectedSubject) return;

    setBookingInProgress(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await ptcService.bookSlot({
        slot_id: selectedSlot.id,
        child_id: parseInt(selectedChildId, 10),
        subject: selectedSubject,
        parent_notes: parentNotes
      });
      setSuccess(res.message || 'Consultation successfully booked!');
      setSelectedSlot(null);
      setParentNotes('');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to book conference slot.');
    } finally {
      setBookingInProgress(false);
    }
  };

  const handleCancelBooking = async (id: number) => {
    if (!window.confirm('Are you sure you want to cancel this consultation booking?')) return;
    try {
      await ptcService.cancelBooking(id);
      setBookings(prev => prev.filter(b => b.id !== id));
      setSuccess('Consultation booking cancelled.');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to cancel booking.');
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading consultation schedules..." />;
  }

  const activeChild = children.find(c => c.id.toString() === selectedChildId) || children[0];
  const activeChildSubjects = activeChild?.subjects || ['Mathematics', 'Physical Sciences', 'Life Sciences', 'English FAL'];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight flex items-center gap-2">
          <Users className="w-6 h-6 text-brand-400" />
          <span>Parent-Teacher Consultations (PTC)</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Connect directly with your children's subject educators. Select an available time slot below to book a focused 15-minute consultation.
        </p>
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

      {/* Your Confirmed Consultations */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Your Confirmed Consultations ({bookings.filter(b => b.status !== 'cancelled').length})</span>
        </h3>

        {bookings.filter(b => b.status !== 'cancelled').length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bookings.filter(b => b.status !== 'cancelled').map((booking) => (
              <div
                key={booking.id}
                className="p-6 rounded-3xl bg-surface-dark border border-emerald-500/30 shadow-xl space-y-4 relative overflow-hidden"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="emerald" size="sm">Confirmed</Badge>
                      <Badge variant="cyan" size="sm">{booking.subject}</Badge>
                    </div>
                    <h4 className="text-base font-bold text-white">
                      Educator: {booking.teacher_name} {booking.teacher_surname}
                    </h4>
                    <p className="text-xs text-slate-300">
                      Learner: <strong>{booking.learner_name} {booking.learner_surname}</strong> (Grade {booking.learner_grade})
                    </p>
                  </div>

                  <button
                    onClick={() => handleCancelBooking(booking.id)}
                    className="text-xs text-rose-400 hover:text-rose-300 p-1.5 rounded-xl hover:bg-rose-500/10 transition-colors"
                    title="Cancel consultation"
                  >
                    Cancel
                  </button>
                </div>

                <div className="pt-3 border-t border-white/5 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Calendar className="w-3.5 h-3.5 text-brand-400" />
                    <span>{new Date(booking.date).toLocaleDateString('en-ZA', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{booking.start_time} - {booking.end_time}</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-1.5 text-slate-400 text-[11px]">
                    {booking.meeting_type === 'online_video' ? (
                      <>
                        <Video className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="truncate">Meeting Link: <a href={booking.meeting_location_or_link} target="_blank" rel="noreferrer" className="text-cyan-400 underline">{booking.meeting_location_or_link}</a></span>
                      </>
                    ) : (
                      <>
                        <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Room: {booking.meeting_location_or_link}</span>
                      </>
                    )}
                  </div>
                </div>

                {booking.parent_notes && (
                  <p className="text-[11px] text-slate-400 italic bg-surface-darker p-2.5 rounded-xl border border-white/5">
                    " {booking.parent_notes} "
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-3xl bg-surface-dark border border-white/5 text-center text-xs text-slate-400">
            You do not have any upcoming parent-teacher conferences booked yet. Choose an open slot below to book.
          </div>
        )}
      </div>

      {/* Available Slots */}
      <div className="rounded-3xl bg-surface-dark border border-white/10 p-6 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span>Available Educator Consultation Slots ({availableSlots.length})</span>
        </h3>

        {availableSlots.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableSlots.map((slot) => (
              <div
                key={slot.id}
                className="p-5 rounded-2xl bg-surface-darker border border-white/5 hover:border-brand-500/40 transition-all space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="cyan" size="sm">
                      {new Date(slot.date).toLocaleDateString('en-ZA', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </Badge>
                    <span className="text-xs font-bold text-white font-mono">{slot.start_time}</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Educator: {slot.teacher_name} {slot.teacher_surname}</h4>
                    <p className="text-[11px] text-slate-400">{slot.teacher_subjects?.join(', ') || 'Subject Specialist'}</p>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    {slot.meeting_type === 'online_video' ? (
                      <span className="text-purple-300 font-semibold flex items-center gap-1">
                        <Video className="w-3 h-3" /> Online Video
                      </span>
                    ) : (
                      <span className="text-amber-300 font-semibold flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {slot.meeting_location_or_link}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className="w-full py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-glow-indigo transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Book Consultation</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">No open consultation slots available at this moment. Check back soon.</p>
        )}
      </div>

      {/* Modal: Book Slot */}
      {selectedSlot && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-surface-dark border border-white/10 p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div>
                <h3 className="text-base font-bold text-white">Book Parent-Teacher Conference</h3>
                <p className="text-xs text-slate-400">
                  With <strong>{selectedSlot.teacher_name} {selectedSlot.teacher_surname}</strong> on {new Date(selectedSlot.date).toLocaleDateString()} at {selectedSlot.start_time}
                </p>
              </div>
              <button
                onClick={() => setSelectedSlot(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBookSlot} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Select Learner *</label>
                <select
                  value={selectedChildId}
                  onChange={(e) => {
                    setSelectedChildId(e.target.value);
                    const ch = children.find(c => c.id.toString() === e.target.value);
                    if (ch && ch.subjects?.length > 0) setSelectedSubject(ch.subjects[0]);
                  }}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                >
                  {children.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} {c.surname} (Grade {c.grade})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Subject to Discuss *</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                >
                  {activeChildSubjects.map((s: string) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Inquiry / Topic Notes (Optional)</label>
                <textarea
                  rows={3}
                  value={parentNotes}
                  onChange={(e) => setParentNotes(e.target.value)}
                  placeholder="e.g. Would like feedback on recent term test and study strategies for Paper 2."
                  className="w-full rounded-xl bg-surface-darker border border-white/10 p-3 text-white focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedSlot(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingInProgress}
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold shadow-glow-indigo transition-all disabled:opacity-50"
                >
                  {bookingInProgress ? 'Booking...' : 'Confirm Consultation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
