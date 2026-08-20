import React, { useState, useEffect } from 'react';
import { ptcService } from '../../services/api';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Badge } from '../common/Badge';
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Users,
  MessageSquare,
  X,
  UserCheck
} from 'lucide-react';

export const TeacherPTC: React.FC = () => {
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal for creating new slots
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    start_time: '14:30',
    end_time: '14:45',
    slot_duration_minutes: 15,
    meeting_type: 'in_person',
    meeting_location_or_link: 'Staffroom / Classroom 12B'
  });
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    fetchSlots();
  }, []);

  const fetchSlots = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ptcService.getTeacherSlots();
      setSlots(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error fetching teacher slots:', err);
      setError('Failed to load consultation slots.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await ptcService.createSlots(formData);
      setSuccess('Consultation availability slot opened successfully.');
      setIsModalOpen(false);
      fetchSlots();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create slot.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSlot = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this consultation slot?')) return;
    try {
      await ptcService.deleteSlot(id);
      setSlots(prev => prev.filter(s => s.id !== id));
      setSuccess('Slot removed successfully.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete slot.');
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading Parent-Teacher Conference schedules..." />;
  }

  const bookedSlots = slots.filter(s => s.booking_id && s.booking_status === 'confirmed');
  const openSlots = slots.filter(s => !s.booking_id);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-400" />
            <span>Parent-Teacher Conferences (PTC)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Set your consultation availability slots so parents can book dedicated 15-minute academic check-ins for their learners.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-xs shadow-glow-indigo transition-all self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Open New Consultation Slot</span>
        </button>
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

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-surface-dark border border-white/10 space-y-1">
          <span className="text-xs text-slate-400 font-bold uppercase">Booked Consultations</span>
          <div className="text-3xl font-black text-emerald-400 font-display">{bookedSlots.length}</div>
          <span className="text-[11px] text-slate-400">Scheduled with Parents</span>
        </div>
        <div className="p-5 rounded-3xl bg-surface-dark border border-white/10 space-y-1">
          <span className="text-xs text-slate-400 font-bold uppercase">Open Slots</span>
          <div className="text-3xl font-black text-cyan-400 font-display">{openSlots.length}</div>
          <span className="text-[11px] text-slate-400">Available for Booking</span>
        </div>
        <div className="p-5 rounded-3xl bg-surface-dark border border-white/10 space-y-1 col-span-2 md:col-span-1">
          <span className="text-xs text-slate-400 font-bold uppercase">Total Slots</span>
          <div className="text-3xl font-black text-white font-display">{slots.length}</div>
          <span className="text-[11px] text-slate-400">Active Slots Managed</span>
        </div>
      </div>

      {/* Booked Consultations List */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-emerald-400" />
          <span>Confirmed Parent Bookings ({bookedSlots.length})</span>
        </h3>

        {bookedSlots.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bookedSlots.map((slot) => (
              <div
                key={slot.id}
                className="p-6 rounded-3xl bg-surface-dark border border-emerald-500/30 space-y-4 shadow-xl relative overflow-hidden"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="emerald" size="sm">Confirmed</Badge>
                      <Badge variant="cyan" size="sm">{slot.subject || 'Academic Consultation'}</Badge>
                    </div>
                    <h4 className="text-base font-bold text-white">
                      Learner: {slot.learner_name} {slot.learner_surname} (Grade {slot.learner_grade})
                    </h4>
                    <p className="text-xs text-slate-300 font-medium">
                      Parent: <strong>{slot.parent_name} {slot.parent_surname}</strong> ({slot.parent_phone || slot.parent_email})
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/5 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Calendar className="w-3.5 h-3.5 text-brand-400" />
                    <span>{new Date(slot.date).toLocaleDateString('en-ZA', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{slot.start_time} - {slot.end_time}</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-1.5 text-slate-400 text-[11px]">
                    {slot.meeting_type === 'online_video' ? (
                      <>
                        <Video className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="truncate">Link: {slot.meeting_location_or_link}</span>
                      </>
                    ) : (
                      <>
                        <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Room: {slot.meeting_location_or_link}</span>
                      </>
                    )}
                  </div>
                </div>

                {slot.parent_notes && (
                  <div className="p-3 rounded-2xl bg-surface-darker text-xs text-slate-300 border border-white/5 space-y-1">
                    <span className="font-bold text-amber-400 flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      Parent Inquiry Notes:
                    </span>
                    <p className="italic">{slot.parent_notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-3xl bg-surface-dark border border-white/5 text-center text-xs text-slate-400">
            No parent consultation bookings confirmed yet. Open slots below are visible to parents.
          </div>
        )}
      </div>

      {/* Available Slots Table */}
      <div className="rounded-3xl bg-surface-dark border border-white/10 p-6 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span>Your Open Consultation Availability Slots</span>
        </h3>

        {openSlots.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {openSlots.map((slot) => (
              <div
                key={slot.id}
                className="p-4 rounded-2xl bg-surface-darker border border-white/5 flex items-center justify-between gap-3"
              >
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-brand-400" />
                    <span className="font-bold text-white">{new Date(slot.date).toLocaleDateString()}</span>
                  </div>
                  <div className="text-slate-400">
                    {slot.start_time} - {slot.end_time} ({slot.slot_duration_minutes}m)
                  </div>
                  <div className="text-[11px] text-cyan-300 font-medium truncate max-w-[180px]">
                    {slot.meeting_type === 'online_video' ? 'Online Video' : slot.meeting_location_or_link}
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteSlot(slot.id)}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Remove slot"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">No open availability slots currently created.</p>
        )}
      </div>

      {/* Modal: Open Consultation Slot */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-surface-dark border border-white/10 p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-t border-white/5">
              <h3 className="text-base font-bold text-white">Create Consultation Availability</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSlot} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Consultation Date *</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={formData.start_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                    className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">End Time *</label>
                  <input
                    type="time"
                    required
                    value={formData.end_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                    className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Meeting Format *</label>
                <select
                  value={formData.meeting_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, meeting_type: e.target.value }))}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                >
                  <option value="in_person">In-Person (School Classroom / Staffroom)</option>
                  <option value="online_video">Online Video Call (Zoom / Google Meet)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  {formData.meeting_type === 'online_video' ? 'Video Meeting Link *' : 'Room / Location *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={formData.meeting_type === 'online_video' ? 'e.g. https://meet.google.com/xyz' : 'e.g. Classroom 10B / Science Lab'}
                  value={formData.meeting_location_or_link}
                  onChange={(e) => setFormData(prev => ({ ...prev, meeting_location_or_link: e.target.value }))}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold shadow-glow-indigo transition-all disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Open Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
