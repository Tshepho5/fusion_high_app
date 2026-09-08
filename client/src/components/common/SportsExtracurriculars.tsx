import React, { useState, useEffect } from 'react';
import { extracurricularService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from './LoadingSpinner';
import { Badge } from './Badge';
import { Modal } from './Modal';
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
  Edit3,
  Check,
  Send,
  Megaphone,
  UserCheck,
  Award,
  Bus,
  Shirt,
  CalendarPlus,
  Sparkles,
  Search
} from 'lucide-react';

export const SportsExtracurriculars: React.FC = () => {
  const { user, role } = useAuth();
  const isStaff = role === 'admin' || role === 'teacher';

  const [activities, setActivities] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [filterOnlyMyCoached, setFilterOnlyMyCoached] = useState<boolean>(false);
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);
  const [activityDetails, setActivityDetails] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Available Coaches
  const [availableCoaches, setAvailableCoaches] = useState<any[]>([]);

  // Modals
  const [isActivityModalOpen, setIsActivityModalOpen] = useState<boolean>(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState<boolean>(false);
  const [isScoreModalOpen, setIsScoreModalOpen] = useState<boolean>(false);
  const [isAssignCoachModalOpen, setIsAssignCoachModalOpen] = useState<boolean>(false);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [targetActivityForCoach, setTargetActivityForCoach] = useState<any | null>(null);

  // Action Loading States
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Forms
  const [activityForm, setActivityForm] = useState({
    name: '',
    category: 'Sports',
    season: 'Annual',
    venue: 'School Sports Ground',
    practice_schedule: 'Mondays & Wednesdays 15:30 - 17:00',
    description: '',
    coach_user_id: user?.role === 'teacher' ? String(user.id) : ''
  });

  const [eventForm, setEventForm] = useState({
    title: '',
    event_type: 'Match',
    opponent_school: '',
    venue: 'Home Ground',
    event_date: new Date().toISOString().split('T')[0],
    start_time: '15:30',
    bus_transport_info: 'Team Bus departs from main gate at 14:30',
    required_kit: 'Official First-Team Match Kit & Running Shoes',
    notes: ''
  });

  const [scoreForm, setScoreForm] = useState({
    result_score: 'Fusion High 3 - 1 Opponents',
    notes: 'Outstanding teamwork, tactical coordination and sportsmanship.'
  });

  const [coachSelectId, setCoachSelectId] = useState<string>('');

  useEffect(() => {
    fetchActivities();
    if (isStaff) {
      fetchCoaches();
    }
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

  const fetchCoaches = async () => {
    try {
      const data = await extracurricularService.getAvailableCoaches();
      setAvailableCoaches(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching coaches:', err);
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
      await extracurricularService.createActivity({
        ...activityForm,
        coach_user_id: activityForm.coach_user_id ? parseInt(activityForm.coach_user_id, 10) : user?.id
      });
      setSuccess('Club or Sports Squad created successfully.');
      setIsActivityModalOpen(false);
      fetchActivities();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create activity.');
    }
  };

  const handleAssignCoachSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetActivityForCoach) return;
    try {
      const payload = coachSelectId ? { coach_user_id: parseInt(coachSelectId, 10) } : { coach_user_id: null };
      const res = await extracurricularService.assignCoach(targetActivityForCoach.id, payload);
      setSuccess(res.message || 'Coach assignment updated.');
      setIsAssignCoachModalOpen(false);
      fetchActivities();
      if (selectedActivity && selectedActivity.id === targetActivityForCoach.id) {
        openActivityDetails(selectedActivity);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to assign coach.');
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
      setSuccess('Event fixture arranged and saved as Draft. Please review and confirm schedule.');
      setIsEventModalOpen(false);
      openActivityDetails(selectedActivity);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create event fixture.');
    }
  };

  const handleConfirmSchedule = async (eventId: number) => {
    setActionLoadingId(`confirm-${eventId}`);
    try {
      const res = await extracurricularService.confirmEvent(eventId);
      setSuccess(res.message || 'Schedule confirmed! You can now publish notifications.');
      if (selectedActivity) openActivityDetails(selectedActivity);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to confirm schedule.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePublishNotifications = async (eventId: number) => {
    setActionLoadingId(`publish-${eventId}`);
    try {
      const res = await extracurricularService.publishEventNotifications(eventId);
      setSuccess(`Published! Notified ${res.notified_parents_count || 0} parents and whole school community.`);
      if (selectedActivity) openActivityDetails(selectedActivity);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to publish notifications.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAddToCalendar = async (eventId: number) => {
    setActionLoadingId(`calendar-${eventId}`);
    try {
      const res = await extracurricularService.addEventToCalendar(eventId);
      setSuccess(res.message || 'Fixture added to School Calendar under Sports.');
      if (selectedActivity) openActivityDetails(selectedActivity);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add to school calendar.');
    } finally {
      setActionLoadingId(null);
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
    return <LoadingSpinner text="Loading sports squads, clubs, and fixtures..." />;
  }

  const categories = ['All', 'Sports', 'Cultural', 'Academic'];

  // Filter activities based on category and optional "My Coached Sports"
  const displayedActivities = activities.filter(act => {
    if (filterOnlyMyCoached && !act.is_my_coached_sport) {
      return false;
    }
    return true;
  });

  const myCoachedCount = activities.filter(a => a.is_my_coached_sport).length;

  return (
    <div className="space-y-6 animate-fade-in text-slate-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <span>Sports & Extracurriculars</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Official sports codes, match fixture arrangements, coach schedules, and school notifications.
          </p>
        </div>

        {isStaff && (
          <button
            onClick={() => {
              setActivityForm({
                name: '',
                category: 'Sports',
                season: 'Annual',
                venue: 'School Sports Ground',
                practice_schedule: 'Mondays & Wednesdays 15:30 - 17:00',
                description: '',
                coach_user_id: user?.role === 'teacher' ? String(user.id) : ''
              });
              setIsActivityModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-glow-amber transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Register Sport or Squad</span>
          </button>
        )}
      </div>

      {/* Alerts */}
      {success && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between gap-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Category Pills & Coach Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-white/5">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-slate-950 shadow-glow-amber'
                  : 'bg-surface-dark text-slate-300 border border-white/10 hover:bg-white/5'
              }`}
            >
              {cat} {cat !== 'All' ? 'Clubs & Teams' : ''}
            </button>
          ))}
        </div>

        {/* Coach filter for teachers */}
        {role === 'teacher' && myCoachedCount > 0 && (
          <button
            onClick={() => setFilterOnlyMyCoached(prev => !prev)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border shrink-0 ${
              filterOnlyMyCoached
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-glow-cyan'
                : 'bg-surface-dark border-white/10 text-slate-300 hover:bg-white/5'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>My Coached Teams ({myCoachedCount})</span>
          </button>
        )}
      </div>

      {/* Activities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedActivities.map((act) => (
          <div
            key={act.id}
            className="p-5 rounded-3xl bg-surface-dark border border-white/10 hover:border-amber-500/40 shadow-xl transition-all space-y-4 flex flex-col justify-between group"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Badge variant={act.category === 'Sports' ? 'emerald' : act.category === 'Cultural' ? 'indigo' : 'cyan'} size="sm">
                  {act.category}
                </Badge>
                <div className="flex items-center gap-1.5">
                  {act.is_my_coached_sport && (
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold border border-cyan-500/30 flex items-center gap-1">
                      <Shield className="w-2.5 h-2.5" />
                      You Coach
                    </span>
                  )}
                  <span className="text-[11px] text-slate-400 font-mono">{act.season}</span>
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">{act.name}</h3>
                <p className="text-xs text-slate-400 line-clamp-2 mt-1">{act.description || 'Official school extracurricular team.'}</p>
              </div>

              <div className="pt-2 border-t border-white/5 space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 text-[11px] flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                    Coach / In-Charge:
                  </span>
                  <span className="font-semibold text-white truncate">
                    {act.coach_name ? `${act.coach_name} ${act.coach_surname || ''}` : 'Unassigned'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">{act.venue || 'School Grounds'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate">{act.practice_schedule || 'Tuesdays & Thursdays'}</span>
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
                className="flex-1 py-2 px-3 rounded-xl bg-surface-darker hover:bg-white/10 text-white font-bold text-xs border border-white/10 transition-colors text-center"
              >
                View Squad & Fixtures
              </button>

              {isStaff && (
                <button
                  type="button"
                  onClick={() => {
                    setTargetActivityForCoach(act);
                    setCoachSelectId(act.coach_user_id ? String(act.coach_user_id) : '');
                    setIsAssignCoachModalOpen(true);
                  }}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-indigo-300 border border-white/10 transition-colors"
                  title="Assign Coach"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                </button>
              )}

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

        {displayedActivities.length === 0 && (
          <div className="col-span-full p-8 rounded-3xl bg-surface-dark border border-white/5 text-center space-y-2">
            <Trophy className="w-8 h-8 text-slate-500 mx-auto" />
            <h4 className="text-sm font-bold text-white">No sports or extracurricular clubs found</h4>
            <p className="text-xs text-slate-400">
              {filterOnlyMyCoached
                ? 'You are not assigned as coach for any sports yet. Click on any squad to volunteer or assign yourself as Coach!'
                : 'No activities match the selected category filter.'}
            </p>
          </div>
        )}
      </div>

      {/* 1. ACTIVITY DETAILS & FIXTURES MODAL */}
      {selectedActivity && (
        <Modal
          isOpen={!!selectedActivity}
          onClose={() => setSelectedActivity(null)}
          title={`Squad Hub: ${selectedActivity.name}`}
          maxWidth="4xl"
          alignTop={true}
        >
          {loadingDetails ? (
            <div className="py-8">
              <LoadingSpinner text="Loading roster and fixtures..." />
            </div>
          ) : (
            <div className="space-y-4 text-slate-200">
              {/* Header Overview Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-surface-darker to-surface-dark border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="amber" size="sm">{selectedActivity.category}</Badge>
                    <span className="text-[11px] text-slate-400 font-mono">{selectedActivity.season} Season</span>
                    {activityDetails?.activity?.coach_name && (
                      <Badge variant="indigo" size="sm">
                        Coach: {activityDetails.activity.coach_name} {activityDetails.activity.coach_surname || ''}
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-white font-display">{selectedActivity.name}</h3>
                  <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                    <MapPin className="w-3 h-3 text-amber-400" />
                    <span>{selectedActivity.venue || 'School Grounds'}</span>
                    <span>•</span>
                    <Clock className="w-3 h-3 text-cyan-400" />
                    <span>{selectedActivity.practice_schedule || 'Tuesdays & Thursdays'}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {isStaff && (
                    <button
                      onClick={() => {
                        setTargetActivityForCoach(selectedActivity);
                        setCoachSelectId(selectedActivity.coach_user_id ? String(selectedActivity.coach_user_id) : '');
                        setIsAssignCoachModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-indigo-300 border border-indigo-500/30 font-bold text-xs flex items-center gap-1.5 transition-all"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{selectedActivity.coach_name ? 'Change Coach' : 'Assign Coach'}</span>
                    </button>
                  )}
                  {role === 'learner' && (
                    <button
                      onClick={() => handleJoinActivity(selectedActivity.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Join Squad</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Squad Roster Section */}
              <div className="p-4 rounded-2xl bg-surface-darker/70 border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Squad Roster ({activityDetails?.members?.length || 0} Members)</span>
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {(activityDetails?.members || []).map((m: any) => (
                    <div key={m.id} className="p-2.5 rounded-xl bg-surface-dark border border-white/5 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <p className="font-bold text-white truncate">{m.learner_name} {m.learner_surname}</p>
                        <p className="text-[10px] text-slate-400">Grade {m.grade} {m.jersey_number ? `• #${m.jersey_number}` : ''}</p>
                      </div>
                      <Badge variant={m.role === 'Captain' ? 'amber' : m.role === 'Vice-Captain' ? 'indigo' : 'slate'} size="sm">
                        {m.role}
                      </Badge>
                    </div>
                  ))}
                  {(!activityDetails?.members || activityDetails.members.length === 0) && (
                    <p className="text-xs text-slate-500 col-span-full py-2 text-center italic">No squad members registered yet.</p>
                  )}
                </div>
              </div>

              {/* Fixtures & Event Scheduling Section */}
              <div className="p-4 rounded-2xl bg-surface-darker/70 border border-white/5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <Activity className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Match Fixtures, Tournaments & Event Schedules</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Coaches arrange events, confirm schedule dates, publish school/parent notifications, and sync with the school calendar.
                    </p>
                  </div>
                  {isStaff && (
                    <button
                      onClick={() => {
                        setEventForm({
                          title: '',
                          event_type: 'Match',
                          opponent_school: '',
                          venue: selectedActivity.venue || 'School Sports Ground',
                          event_date: new Date().toISOString().split('T')[0],
                          start_time: '15:30',
                          bus_transport_info: 'Team Bus departs from main gate at 14:30',
                          required_kit: 'Official First-Team Match Kit & Running Shoes',
                          notes: ''
                        });
                        setIsEventModalOpen(true);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shrink-0 transition-all active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Arrange New Fixture</span>
                    </button>
                  )}
                </div>

                {/* Fixtures List */}
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                  {(activityDetails?.events || []).map((ev: any) => {
                    const isDraft = !ev.is_confirmed && ev.status !== 'Confirmed' && ev.status !== 'Published' && ev.status !== 'Completed';
                    const isConfirmed = ev.is_confirmed || ev.status === 'Confirmed';
                    const isPublished = ev.is_published || ev.status === 'Published';
                    const isOnCalendar = ev.added_to_calendar;

                    return (
                      <div key={ev.id} className="p-3.5 rounded-2xl bg-surface-dark border border-white/5 hover:border-white/10 transition-all space-y-3 text-xs">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-sm text-white">{ev.title}</span>
                              <Badge variant="cyan" size="sm">{ev.event_type}</Badge>
                              
                              {/* Status Badge */}
                              {isDraft && (
                                <Badge variant="amber" size="sm">Draft Schedule</Badge>
                              )}
                              {isConfirmed && !isPublished && (
                                <Badge variant="indigo" size="sm">Confirmed</Badge>
                              )}
                              {isPublished && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30 flex items-center gap-1">
                                  <Megaphone className="w-2.5 h-2.5" />
                                  Published to School & Parents
                                </span>
                              )}
                              {isOnCalendar && (
                                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-[10px] border border-cyan-500/30 flex items-center gap-1">
                                  <Calendar className="w-2.5 h-2.5" />
                                  On School Calendar
                                </span>
                              )}
                            </div>

                            <p className="text-slate-300 text-xs flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-amber-300">
                                {new Date(ev.event_date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} at {ev.start_time}
                              </span>
                              <span>•</span>
                              <span>{ev.venue}</span>
                              {ev.opponent_school && (
                                <>
                                  <span>•</span>
                                  <span className="text-cyan-300 font-medium">vs {ev.opponent_school}</span>
                                </>
                              )}
                            </p>

                            {(ev.bus_transport_info || ev.required_kit) && (
                              <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap pt-0.5">
                                {ev.bus_transport_info && (
                                  <span className="flex items-center gap-1">
                                    <Bus className="w-3 h-3 text-amber-400" />
                                    {ev.bus_transport_info}
                                  </span>
                                )}
                                {ev.required_kit && (
                                  <span className="flex items-center gap-1">
                                    <Shirt className="w-3 h-3 text-emerald-400" />
                                    {ev.required_kit}
                                  </span>
                                )}
                              </div>
                            )}

                            {ev.notes && <p className="text-[11px] text-slate-400 italic">"{ev.notes}"</p>}
                          </div>

                          {/* Result score display */}
                          <div className="shrink-0 text-right">
                            {ev.result_score ? (
                              <div className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 font-extrabold text-xs border border-emerald-500/30">
                                {ev.result_score}
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-medium">Scheduled</span>
                            )}
                          </div>
                        </div>

                        {/* Coach Control Bar */}
                        {isStaff && (
                          <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* 1. Confirm Schedule */}
                              {isDraft && (
                                <button
                                  type="button"
                                  disabled={actionLoadingId === `confirm-${ev.id}`}
                                  onClick={() => handleConfirmSchedule(ev.id)}
                                  className="px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>{actionLoadingId === `confirm-${ev.id}` ? 'Confirming...' : 'Confirm Schedule'}</span>
                                </button>
                              )}

                              {/* 2. Publish to School Notifications & Parents */}
                              {!isPublished && (
                                <button
                                  type="button"
                                  disabled={actionLoadingId === `publish-${ev.id}`}
                                  onClick={() => handlePublishNotifications(ev.id)}
                                  className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                                >
                                  <Megaphone className="w-3 h-3" />
                                  <span>{actionLoadingId === `publish-${ev.id}` ? 'Publishing...' : 'Publish to School & Parents'}</span>
                                </button>
                              )}

                              {/* 3. Add to Calendar Button */}
                              {!isOnCalendar ? (
                                <button
                                  type="button"
                                  disabled={actionLoadingId === `calendar-${ev.id}`}
                                  onClick={() => handleAddToCalendar(ev.id)}
                                  className="px-2.5 py-1 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[11px] flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                                >
                                  <CalendarPlus className="w-3 h-3" />
                                  <span>{actionLoadingId === `calendar-${ev.id}` ? 'Adding...' : 'Add to Calendar'}</span>
                                </button>
                              ) : (
                                <span className="text-[11px] text-cyan-300 font-semibold flex items-center gap-1">
                                  <Check className="w-3 h-3 text-cyan-400" />
                                  <span>Synced with School Calendar</span>
                                </span>
                              )}
                            </div>

                            {/* Record / Edit Score */}
                            <button
                              onClick={() => {
                                setSelectedEventId(ev.id);
                                setScoreForm({ result_score: ev.result_score || '', notes: ev.notes || '' });
                                setIsScoreModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-[11px] flex items-center gap-1 transition-colors"
                            >
                              <Edit3 className="w-3 h-3 text-amber-400" />
                              <span>{ev.result_score ? 'Update Score' : 'Record Score'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {(!activityDetails?.events || activityDetails.events.length === 0) && (
                    <div className="py-4 text-center text-xs text-slate-500 italic">
                      No fixtures scheduled yet. Click "Arrange New Fixture" above to add the first match or event.
                    </div>
                  )}
                </div>
              </div>

              {/* Close Hub */}
              <div className="flex items-center justify-end pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setSelectedActivity(null)}
                  className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* 2. REGISTER SQUAD / CLUB MODAL */}
      <Modal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        title="Register Sport Squad or Club"
        maxWidth="md"
        alignTop={true}
      >
        <form onSubmit={handleCreateActivity} className="space-y-3.5 text-xs text-slate-200">
          <div>
            <label className="block text-slate-300 font-bold mb-1">Squad / Club Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Under-16 Soccer Boys / First Team Rugby / Chess Club"
              value={activityForm.name}
              onChange={(e) => setActivityForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-amber-500 placeholder:text-slate-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Category *</label>
              <select
                value={activityForm.category}
                onChange={(e) => setActivityForm(prev => ({ ...prev, category: e.target.value }))}
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-amber-500"
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
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-amber-500"
              >
                <option value="Annual">Annual</option>
                <option value="Winter">Winter Season</option>
                <option value="Summer">Summer Season</option>
              </select>
            </div>
          </div>

          {/* Coach Assignment */}
          <div>
            <label className="block text-slate-300 font-bold mb-1">Assign Coach / In-Charge (Optional)</label>
            <select
              value={activityForm.coach_user_id}
              onChange={(e) => setActivityForm(prev => ({ ...prev, coach_user_id: e.target.value }))}
              className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-amber-500"
            >
              <option value="">-- Assign Later / No Coach --</option>
              {availableCoaches.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} {c.surname} ({c.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Venue *</label>
            <input
              type="text"
              required
              placeholder="e.g. Main Soccer Field / School Sports Grounds"
              value={activityForm.venue}
              onChange={(e) => setActivityForm(prev => ({ ...prev, venue: e.target.value }))}
              className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Practice Times</label>
            <input
              type="text"
              placeholder="e.g. Mondays & Wednesdays 15:30 - 17:00"
              value={activityForm.practice_schedule}
              onChange={(e) => setActivityForm(prev => ({ ...prev, practice_schedule: e.target.value }))}
              className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Description</label>
            <textarea
              rows={2}
              placeholder="Provide squad details, goals, or requirements..."
              value={activityForm.description}
              onChange={(e) => setActivityForm(prev => ({ ...prev, description: e.target.value }))}
              className="w-full rounded-xl bg-surface-darker border border-white/10 p-2.5 text-white focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={() => setIsActivityModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-sm transition-all active:scale-95"
            >
              Register Squad
            </button>
          </div>
        </form>
      </Modal>

      {/* 3. ARRANGE EVENT FIXTURE MODAL */}
      <Modal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        title={`Arrange Fixture: ${selectedActivity?.name || 'Sport'}`}
        maxWidth="md"
        alignTop={true}
      >
        <form onSubmit={handleCreateEvent} className="space-y-3.5 text-xs text-slate-200">
          <div>
            <label className="block text-slate-300 font-bold mb-1">Event Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. League Match vs Pretoria Boys / Inter-School Derby"
              value={eventForm.title}
              onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
              className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 placeholder:text-slate-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Event Type *</label>
              <select
                value={eventForm.event_type}
                onChange={(e) => setEventForm(prev => ({ ...prev, event_type: e.target.value }))}
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500"
              >
                <option value="Match">Match Fixture</option>
                <option value="Tournament">Tournament / Derby</option>
                <option value="Friendly">Friendly Match</option>
                <option value="Practice">Special Training Session</option>
                <option value="Trials">Squad Trials</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">Opponent School</label>
              <input
                type="text"
                placeholder="e.g. St Johns / Westville High"
                value={eventForm.opponent_school}
                onChange={(e) => setEventForm(prev => ({ ...prev, opponent_school: e.target.value }))}
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Event Date *</label>
              <input
                type="date"
                required
                value={eventForm.event_date}
                onChange={(e) => setEventForm(prev => ({ ...prev, event_date: e.target.value }))}
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">Start Time *</label>
              <input
                type="time"
                required
                value={eventForm.start_time}
                onChange={(e) => setEventForm(prev => ({ ...prev, start_time: e.target.value }))}
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Venue *</label>
            <input
              type="text"
              required
              placeholder="e.g. Home Ground / Opponent Stadium"
              value={eventForm.venue}
              onChange={(e) => setEventForm(prev => ({ ...prev, venue: e.target.value }))}
              className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Transport & Logistics</label>
            <input
              type="text"
              placeholder="e.g. Team Bus departs from gate 2 at 14:30"
              value={eventForm.bus_transport_info}
              onChange={(e) => setEventForm(prev => ({ ...prev, bus_transport_info: e.target.value }))}
              className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Required Kit</label>
            <input
              type="text"
              placeholder="e.g. First-Team Home Kit, shin guards, water bottle"
              value={eventForm.required_kit}
              onChange={(e) => setEventForm(prev => ({ ...prev, required_kit: e.target.value }))}
              className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Notes / Instructions</label>
            <textarea
              rows={2}
              placeholder="Tactical preparation notes, spectating information, etc."
              value={eventForm.notes}
              onChange={(e) => setEventForm(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full rounded-xl bg-surface-darker border border-white/10 p-2.5 text-white focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={() => setIsEventModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all active:scale-95 shadow-sm"
            >
              Save Fixture as Draft
            </button>
          </div>
        </form>
      </Modal>

      {/* 4. ASSIGN COACH MODAL */}
      <Modal
        isOpen={isAssignCoachModalOpen}
        onClose={() => setIsAssignCoachModalOpen(false)}
        title={`Assign Coach: ${targetActivityForCoach?.name || 'Sport'}`}
        maxWidth="sm"
        alignTop={true}
      >
        <form onSubmit={handleAssignCoachSubmit} className="space-y-4 text-xs text-slate-200">
          <p className="text-slate-400">
            Select an educator to assign as head coach for this sports squad. As coach, they can arrange fixtures, confirm schedules, and dispatch school notifications.
          </p>

          <div>
            <label className="block text-slate-300 font-bold mb-1.5">Select Teacher</label>
            <select
              value={coachSelectId}
              onChange={(e) => setCoachSelectId(e.target.value)}
              className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- No Coach (Unassign) --</option>
              {availableCoaches.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} {c.surname} ({c.email})
                </option>
              ))}
            </select>
          </div>

          {role === 'teacher' && (
            <button
              type="button"
              onClick={() => setCoachSelectId(String(user?.id))}
              className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <Shield className="w-3 h-3" />
              <span>Assign myself as Coach</span>
            </button>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={() => setIsAssignCoachModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all active:scale-95 shadow-sm"
            >
              Save Coach Assignment
            </button>
          </div>
        </form>
      </Modal>

      {/* 5. RECORD MATCH SCORE MODAL */}
      <Modal
        isOpen={isScoreModalOpen}
        onClose={() => setIsScoreModalOpen(false)}
        title="Record Match Score & Highlights"
        maxWidth="md"
        alignTop={true}
      >
        <form onSubmit={handleUpdateScore} className="space-y-3.5 text-xs text-slate-200">
          <div>
            <label className="block text-slate-300 font-bold mb-1">Final Result Score *</label>
            <input
              type="text"
              required
              placeholder="e.g. Fusion High 28 - 14 Maritzburg College / Fusion High 3 - 1 St Johns"
              value={scoreForm.result_score}
              onChange={(e) => setScoreForm(prev => ({ ...prev, result_score: e.target.value }))}
              className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Coach Notes & Player Highlights</label>
            <textarea
              rows={3}
              value={scoreForm.notes}
              onChange={(e) => setScoreForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Notable goals, tries, standout defensive players, or sportsmanship awards..."
              className="w-full rounded-xl bg-surface-darker border border-white/10 p-2.5 text-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={() => setIsScoreModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-sm transition-all active:scale-95"
            >
              Save Official Score
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
