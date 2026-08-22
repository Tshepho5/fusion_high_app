import React, { useState, useEffect } from 'react';
import { extracurricularService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from './LoadingSpinner';
import { Badge } from './Badge';
import {
  Trophy,
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  UserPlus,
  Shield,
  Activity,
  CheckCircle2,
  AlertCircle,
  X,
  Target,
  Edit3
} from 'lucide-react';

export const SportsExtracurriculars: React.FC = () => {
  const { role } = useAuth();
  const isStaff = role === 'admin' || role === 'teacher';

  const [activities, setActivities] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);
  const [activityDetails, setActivityDetails] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modals
  const [isActivityModalOpen, setIsActivityModalOpen] = useState<boolean>(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState<boolean>(false);
  const [isScoreModalOpen, setIsScoreModalOpen] = useState<boolean>(false);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  // Forms
  const [activityForm, setActivityForm] = useState({
    name: '',
    category: 'Sports',
    season: 'Annual',
    venue: 'School Grounds',
    practice_schedule: 'Mondays & Wednesdays 15:30 - 17:00',
    description: ''
  });

  const [eventForm, setEventForm] = useState({
    title: '',
    event_type: 'Match',
    opponent_school: '',
    venue: 'Home Ground',
    event_date: new Date().toISOString().split('T')[0],
    start_time: '15:30',
    notes: ''
  });

  const [scoreForm, setScoreForm] = useState({
    result_score: 'Fusion High 3 - 1 Opponents',
    notes: 'Outstanding teamwork and tactical play.'
  });

  useEffect(() => {
    fetchActivities();
  }, [selectedCategory]);

  const fetchActivities = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await extracurricularService.getActivities(selectedCategory);
      setActivities(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error fetching extracurriculars:', err);
      setError('Could not load sports and extracurricular clubs.');
    } finally {
      setLoading(false);
    }
  };

  const openActivityDetails = async (activity: any) => {
    setSelectedActivity(activity);
    setLoadingDetails(true);
    try {
      const details = await extracurricularService.getActivityDetails(activity.id);
      setActivityDetails(details);
    } catch (err: any) {
      console.error('Error fetching activity details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleJoinActivity = async (activityId: number) => {
    try {
      const res = await extracurricularService.joinActivity({ activity_id: activityId });
      setSuccess(res.message || 'Joined squad successfully!');
      if (selectedActivity && selectedActivity.id === activityId) {
        openActivityDetails(selectedActivity);
      }
      fetchActivities();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to join activity.');
    }
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await extracurricularService.createActivity(activityForm);
      setSuccess('Club/Squad created successfully.');
      setIsActivityModalOpen(false);
      fetchActivities();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create activity.');
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActivity) return;
    try {
      await extracurricularService.createEvent({
        ...eventForm,
        activity_id: selectedActivity.id
      });
      setSuccess('Event fixture created.');
      setIsEventModalOpen(false);
      openActivityDetails(selectedActivity);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create event fixture.');
    }
  };

  const handleUpdateScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return;
    try {
      await extracurricularService.updateEventScore(selectedEventId, scoreForm);
      setSuccess('Match score recorded.');
      setIsScoreModalOpen(false);
      if (selectedActivity) openActivityDetails(selectedActivity);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update score.');
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading sports, clubs, and cultural activities..." />;
  }

  const categories = ['All', 'Sports', 'Cultural', 'Academic'];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            <span>Sports</span>
          </h2>
        </div>

        {isStaff && (
          <button
            onClick={() => setIsActivityModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-glow-amber transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Squad / Club</span>
          </button>
        )}
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

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedCategory === cat
                ? 'bg-amber-500 text-slate-950 shadow-glow-amber'
                : 'bg-surface-dark text-slate-300 border border-white/10 hover:bg-white/5'
            }`}
          >
            {cat} {cat !== 'All' ? 'Clubs & Teams' : ''}
          </button>
        ))}
      </div>

      {/* Activities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activities.map((act) => (
          <div
            key={act.id}
            className="p-6 rounded-3xl bg-surface-dark border border-white/10 hover:border-amber-500/40 shadow-xl transition-all space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant={act.category === 'Sports' ? 'emerald' : act.category === 'Cultural' ? 'indigo' : 'cyan'} size="sm">
                  {act.category}
                </Badge>
                <span className="text-[11px] text-slate-400 font-mono">{act.season} Season</span>
              </div>

              <div>
                <h3 className="text-base font-bold text-white">{act.name}</h3>
                <p className="text-xs text-slate-400 line-clamp-2 mt-1">{act.description || 'Official high school team.'}</p>
              </div>

              <div className="pt-2 border-t border-white/5 space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">{act.venue}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate">{act.practice_schedule}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{act.member_count || 0} Registered Squad Members</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => openActivityDetails(act)}
                className="flex-1 py-2 rounded-xl bg-surface-darker hover:bg-white/10 text-white font-bold text-xs border border-white/10 transition-colors text-center"
              >
                View Squad & Fixtures
              </button>
              {role === 'learner' && (
                <button
                  type="button"
                  onClick={() => handleJoinActivity(act.id)}
                  className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1 shrink-0"
                  title="Join squad"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Join</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Activity Details Modal */}
      {selectedActivity && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-surface-dark border border-white/10 p-6 space-y-6 shadow-2xl animate-fade-in">
            <div className="flex items-start justify-between pb-3 border-b border-white/5">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="amber" size="sm">{selectedActivity.category}</Badge>
                  <span className="text-xs text-slate-400">{selectedActivity.season} Season</span>
                </div>
                <h3 className="text-xl font-bold text-white mt-1">{selectedActivity.name}</h3>
                <p className="text-xs text-slate-400">{selectedActivity.venue} | {selectedActivity.practice_schedule}</p>
              </div>
              <button onClick={() => setSelectedActivity(null)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingDetails ? (
              <LoadingSpinner text="Loading roster and fixtures..." />
            ) : (
              <div className="space-y-6">
                {/* Squad Members Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-400" />
                      <span>Squad Roster ({activityDetails?.members?.length || 0} Members)</span>
                    </h4>
                    {role === 'learner' && (
                      <button
                        onClick={() => handleJoinActivity(selectedActivity.id)}
                        className="px-3 py-1 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1"
                      >
                        <UserPlus className="w-3 h-3" />
                        Join Squad
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {(activityDetails?.members || []).map((m: any) => (
                      <div key={m.id} className="p-2.5 rounded-xl bg-surface-darker border border-white/5 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-white">{m.learner_name} {m.learner_surname}</span>
                          <span className="text-[10px] text-slate-400 block">Grade {m.grade}</span>
                        </div>
                        <Badge variant={m.role === 'Captain' ? 'amber' : m.role === 'Vice-Captain' ? 'cyan' : 'slate'} size="sm">
                          {m.role} {m.jersey_number ? `#${m.jersey_number}` : ''}
                        </Badge>
                      </div>
                    ))}
                    {(!activityDetails?.members || activityDetails.members.length === 0) && (
                      <p className="text-xs text-slate-400 col-span-2 py-3 text-center">No squad members registered yet.</p>
                    )}
                  </div>
                </div>

                {/* Fixtures & Results Section */}
                <div className="space-y-3 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Activity className="w-4 h-4 text-cyan-400" />
                      <span>Match Fixtures & Tournament Results</span>
                    </h4>
                    {isStaff && (
                      <button
                        onClick={() => setIsEventModalOpen(true)}
                        className="px-3 py-1 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Add Fixture
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {(activityDetails?.events || []).map((ev: any) => (
                      <div key={ev.id} className="p-3 rounded-2xl bg-surface-darker border border-white/5 flex items-center justify-between gap-3 text-xs">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{ev.title}</span>
                            <Badge variant="cyan" size="sm">{ev.event_type}</Badge>
                          </div>
                          <p className="text-slate-400 text-[11px]">
                            {new Date(ev.event_date).toLocaleDateString('en-ZA')} at {ev.start_time} | {ev.venue} {ev.opponent_school ? `vs ${ev.opponent_school}` : ''}
                          </p>
                          {ev.notes && <p className="text-[10px] text-slate-400 italic">"{ev.notes}"</p>}
                        </div>

                        <div className="text-right shrink-0">
                          {ev.result_score ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/30">
                              {ev.result_score}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium">Upcoming</span>
                          )}

                          {isStaff && (
                            <button
                              onClick={() => {
                                setSelectedEventId(ev.id);
                                setScoreForm({ result_score: ev.result_score || '', notes: ev.notes || '' });
                                setIsScoreModalOpen(true);
                              }}
                              className="ml-2 p-1 text-slate-400 hover:text-white"
                              title="Update score"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {(!activityDetails?.events || activityDetails.events.length === 0) && (
                      <p className="text-xs text-slate-400 py-3 text-center">No fixtures scheduled yet.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Create Activity */}
      {isActivityModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-surface-dark border border-white/10 p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-white/5 sticky top-0 bg-surface-dark z-10">
              <h3 className="text-base font-bold text-white">Register Sport or Club</h3>
              <button onClick={() => setIsActivityModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateActivity} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Squad / Club Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Under-16 Rugby XV / Robotics & Coding Club"
                  value={activityForm.name}
                  onChange={(e) => setActivityForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Category *</label>
                  <select
                    value={activityForm.category}
                    onChange={(e) => setActivityForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="Sports">Sports</option>
                    <option value="Cultural">Cultural</option>
                    <option value="Academic">Academic</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Season</label>
                  <select
                    value={activityForm.season}
                    onChange={(e) => setActivityForm(prev => ({ ...prev, season: e.target.value }))}
                    className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="Annual">Annual</option>
                    <option value="Winter">Winter Season</option>
                    <option value="Summer">Summer Season</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Venue *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Main Rugby Pitch / Room 14"
                  value={activityForm.venue}
                  onChange={(e) => setActivityForm(prev => ({ ...prev, venue: e.target.value }))}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Practice Times</label>
                <input
                  type="text"
                  placeholder="e.g. Tuesdays & Thursdays 15:30 - 17:00"
                  value={activityForm.practice_schedule}
                  onChange={(e) => setActivityForm(prev => ({ ...prev, practice_schedule: e.target.value }))}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Provide squad details, coach information, or requirements..."
                  value={activityForm.description}
                  onChange={(e) => setActivityForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 p-3 text-white focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10 sticky bottom-0 bg-surface-dark pb-1">
                <button type="button" onClick={() => setIsActivityModalOpen(false)} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-sm transition-all">
                  Register Squad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Event Fixture */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-surface-dark border border-white/10 p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-white/5 sticky top-0 bg-surface-dark z-10">
              <h3 className="text-base font-bold text-white">Add Match / Event Fixture</h3>
              <button onClick={() => setIsEventModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Event Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. League Match vs St Johns / Inter-School Debate"
                  value={eventForm.title}
                  onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Opponent School</label>
                  <input
                    type="text"
                    placeholder="e.g. Pretoria Boys High"
                    value={eventForm.opponent_school}
                    onChange={(e) => setEventForm(prev => ({ ...prev, opponent_school: e.target.value }))}
                    className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Venue</label>
                  <input
                    type="text"
                    value={eventForm.venue}
                    onChange={(e) => setEventForm(prev => ({ ...prev, venue: e.target.value }))}
                    className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={eventForm.event_date}
                    onChange={(e) => setEventForm(prev => ({ ...prev, event_date: e.target.value }))}
                    className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Time *</label>
                  <input
                    type="time"
                    required
                    value={eventForm.start_time}
                    onChange={(e) => setEventForm(prev => ({ ...prev, start_time: e.target.value }))}
                    className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10 sticky bottom-0 bg-surface-dark pb-1">
                <button type="button" onClick={() => setIsEventModalOpen(false)} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold transition-all shadow-sm">
                  Schedule Fixture
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Update Score */}
      {isScoreModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-surface-dark border border-white/10 p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-white/5 sticky top-0 bg-surface-dark z-10">
              <h3 className="text-base font-bold text-white">Record Match Score / Result</h3>
              <button onClick={() => setIsScoreModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateScore} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Final Result Score *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fusion High 28 - 14 Maritzburg"
                  value={scoreForm.result_score}
                  onChange={(e) => setScoreForm(prev => ({ ...prev, result_score: e.target.value }))}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Coach Notes & Highlights</label>
                <textarea
                  rows={2}
                  value={scoreForm.notes}
                  onChange={(e) => setScoreForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 p-3 text-white focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10 sticky bottom-0 bg-surface-dark pb-1">
                <button type="button" onClick={() => setIsScoreModalOpen(false)} className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 font-bold">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold shadow-sm">
                  Save Score
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

