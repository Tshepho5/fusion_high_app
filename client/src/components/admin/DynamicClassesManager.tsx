import React, { useState, useEffect } from 'react';
import {
  Users,
  Building2,
  GraduationCap,
  Plus,
  Trash2,
  Edit,
  Mail,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  UserCheck,
  Send,
  BookOpen,
  Trophy,
  Award
} from 'lucide-react';
import { classStaffService } from '../../services/api';
import api from '../../services/api';

interface DynamicClass {
  id: number;
  name: string;
  grade: number;
  stream: string;
  room_number?: string;
  school_id?: number;
  homeroom_teacher_id?: number;
  teacher_full_name?: string;
  teacher_surname?: string;
  teacher_email?: string;
  learner_count: number;
}

interface StaffInvite {
  id: number;
  email: string;
  full_name?: string;
  surname?: string;
  role_type: 'teacher' | 'sports_coach' | 'hod';
  sace_number?: string;
  subjects_offered?: string[];
  sports_coached?: string[];
  assigned_grades?: number[];
  assigned_classes?: string[];
  status: string;
  created_at: string;
}

const STREAMS = ['General', 'Science', 'Commerce', 'Tourism', 'Technical STEM'];

interface DynamicClassesManagerProps {
  initialTab?: 'classes' | 'invites';
}

export const DynamicClassesManager: React.FC<DynamicClassesManagerProps> = ({ initialTab = 'classes' }) => {
  const [activeTab, setActiveTab] = useState<'classes' | 'invites'>(initialTab);
  const [classes, setClasses] = useState<DynamicClass[]>([]);
  const [invites, setInvites] = useState<StaffInvite[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Add / Edit Class Modal
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClassId, setEditingClassId] = useState<number | null>(null);
  const [classForm, setClassForm] = useState({
    name: '',
    grade: 10,
    stream: 'Science',
    homeroom_teacher_id: '',
    room_number: ''
  });

  // Invite Staff Modal
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    full_name: '',
    surname: '',
    role_type: 'teacher' as 'teacher' | 'sports_coach' | 'hod',
    sace_number: '',
    subjects_offered: [] as string[],
    sports_coached: [] as string[],
    assigned_grades: [10],
    assigned_classes: [] as string[]
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [classList, inviteList, teacherList] = await Promise.all([
        classStaffService.getClasses().catch(() => []),
        classStaffService.getStaffInvites().catch(() => []),
        api.get('/api/admin/teachers').then(r => r.data).catch(() => [])
      ]);
      setClasses(Array.isArray(classList) ? classList : []);
      setInvites(Array.isArray(inviteList) ? inviteList : []);
      setTeachers(Array.isArray(teacherList) ? teacherList : teacherList.teachers || []);
    } catch (err: any) {
      console.error('Failed to load class/staff data:', err);
      setError('Failed to load classes or staff roster.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Save Class (Create or Update)
  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classForm.name.trim()) {
      setError('Please provide a class name (e.g. 10A).');
      return;
    }
    setError(null);
    try {
      if (editingClassId) {
        await classStaffService.updateClass(editingClassId, {
          ...classForm,
          grade: parseInt(classForm.grade.toString(), 10),
          homeroom_teacher_id: classForm.homeroom_teacher_id ? parseInt(classForm.homeroom_teacher_id, 10) : null
        });
        setSuccess(`Class ${classForm.name.toUpperCase()} updated successfully.`);
      } else {
        await classStaffService.createClass({
          ...classForm,
          grade: parseInt(classForm.grade.toString(), 10),
          homeroom_teacher_id: classForm.homeroom_teacher_id ? parseInt(classForm.homeroom_teacher_id, 10) : null
        });
        setSuccess(`Class ${classForm.name.toUpperCase()} provisioned successfully.`);
      }
      setIsClassModalOpen(false);
      setEditingClassId(null);
      setClassForm({ name: '', grade: 10, stream: 'Science', homeroom_teacher_id: '', room_number: '' });
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save class.');
    }
  };

  // Delete Class
  const handleDeleteClass = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to remove class ${name}? This action cannot be undone.`)) return;
    try {
      await classStaffService.deleteClass(id);
      setSuccess(`Class ${name} removed.`);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove class.');
    }
  };

  // Send Staff Invite
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.email.trim() || !inviteForm.email.includes('@')) {
      setError('A valid colleague email address is required.');
      return;
    }
    setError(null);
    try {
      await classStaffService.createStaffInvite(inviteForm);
      setSuccess(`Invitation email successfully dispatched to ${inviteForm.email}.`);
      setIsInviteModalOpen(false);
      setInviteForm({
        email: '',
        full_name: '',
        surname: '',
        role_type: 'teacher',
        sace_number: '',
        subjects_offered: [],
        sports_coached: [],
        assigned_grades: [10],
        assigned_classes: []
      });
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to dispatch staff invitation.');
    }
  };

  // Cancel Staff Invite
  const handleDeleteInvite = async (id: number) => {
    try {
      await classStaffService.deleteStaffInvite(id);
      setSuccess('Invitation cancelled.');
      fetchData();
    } catch (err: any) {
      setError('Failed to cancel invitation.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-100 pb-12">
      
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
              Dynamic Classes & Faculty Onboarding
            </h1>
            <p className="text-xs text-slate-400">
              Configure school grades, streams, and class teachers in real time, and invite educators and sports coaches.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setEditingClassId(null);
              setClassForm({ name: '', grade: 10, stream: 'Science', homeroom_teacher_id: '', room_number: '' });
              setIsClassModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Class</span>
          </button>

          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <Mail className="w-4 h-4 text-cyan-400" />
            <span>Invite Colleague</span>
          </button>
        </div>
      </div>

      {/* Success / Error Alerts */}
      {success && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('classes')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'classes'
              ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Active Classes & Homerooms ({classes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('invites')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'invites'
              ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Colleague & Staff Invites ({invites.length})</span>
        </button>
      </div>

      {/* TAB 1: DYNAMIC CLASSES GRID */}
      {activeTab === 'classes' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {classes.length > 0 ? (
            classes.map((cls) => {
              const teacherName = cls.teacher_full_name
                ? `${cls.teacher_full_name} ${cls.teacher_surname || ''}`.trim()
                : 'No Class Teacher Assigned';

              return (
                <div
                  key={cls.id}
                  className="p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 transition-all shadow-md flex flex-col justify-between space-y-4 group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-800/40">
                        Grade {cls.grade} • {cls.stream}
                      </span>
                      <h3 className="text-2xl font-black text-white mt-1 group-hover:text-cyan-300 transition-colors">
                        Class {cls.name}
                      </h3>
                      {cls.room_number && (
                        <p className="text-[11px] text-slate-400 mt-0.5">Room: {cls.room_number}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingClassId(cls.id);
                          setClassForm({
                            name: cls.name,
                            grade: cls.grade,
                            stream: cls.stream,
                            homeroom_teacher_id: cls.homeroom_teacher_id ? cls.homeroom_teacher_id.toString() : '',
                            room_number: cls.room_number || ''
                          });
                          setIsClassModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title="Edit Class"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteClass(cls.id, cls.name)}
                        className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-300 border border-red-800/30 transition-colors"
                        title="Delete Class"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Homeroom / Class Teacher Details */}
                  <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Homeroom (Class) Teacher
                    </span>
                    <p className={`font-semibold ${cls.teacher_full_name ? 'text-white' : 'text-amber-400 italic'}`}>
                      {teacherName}
                    </p>
                    {cls.teacher_email && (
                      <p className="text-[11px] text-slate-400 truncate">{cls.teacher_email}</p>
                    )}
                  </div>

                  {/* Bottom Stats */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
                    <span className="text-slate-400">Enrolled Learners:</span>
                    <span className="font-mono font-bold text-white px-2 py-0.5 rounded-md bg-slate-800">
                      {cls.learner_count}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full p-12 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3">
              <GraduationCap className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No classes configured yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Create dynamic class sections (e.g. 10A Science, 11B Commerce) and link them to their Class Teachers.
              </p>
              <button
                onClick={() => setIsClassModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition-all shadow-md cursor-pointer"
              >
                + Add First Class
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: STAFF & COLLEAGUE INVITES TABLE */}
      {activeTab === 'invites' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Mail className="w-4 h-4 text-cyan-400" />
              <span>Colleague Invitation Registry</span>
            </h3>
            <span className="text-xs text-slate-400">{invites.length} Invitations Sent</span>
          </div>

          {invites.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-3">Colleague Name & Email</th>
                    <th className="py-3 px-3">Role Designation</th>
                    <th className="py-3 px-3">SACE Number</th>
                    <th className="py-3 px-3">Teaching Subjects / Sports</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {invites.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-white">
                          {inv.full_name ? `${inv.full_name} ${inv.surname || ''}` : 'Colleague'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">{inv.email}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-blue-950/60 text-blue-300 border border-blue-800/40">
                          {inv.role_type === 'sports_coach' ? 'Sports Coach' : (inv.role_type === 'hod' ? 'HOD' : 'Teacher')}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300">
                        {inv.sace_number || 'Pending'}
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {inv.subjects_offered && inv.subjects_offered.length > 0
                          ? inv.subjects_offered.join(', ')
                          : (inv.sports_coached && inv.sports_coached.length > 0 ? inv.sports_coached.join(', ') : 'General Faculty')}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.status === 'accepted' || inv.status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleDeleteInvite(inv.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                          title="Cancel Invite"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              No staff invitations sent yet. Click "Invite Colleague" to bring educators and coaches on board.
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: ADD / EDIT DYNAMIC CLASS */}
      {isClassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-cyan-400" />
                <span>{editingClassId ? 'Edit Class' : 'Create Dynamic Class'}</span>
              </h3>
              <button onClick={() => setIsClassModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClass} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">Class Name (e.g. 10A, 11B-Science) *</label>
                <input
                  type="text"
                  placeholder="e.g. 10A"
                  value={classForm.name}
                  onChange={(e) => setClassForm({ ...classForm, name: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm outline-hidden focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Grade *</label>
                  <select
                    value={classForm.grade}
                    onChange={(e) => setClassForm({ ...classForm, grade: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white outline-hidden focus:border-cyan-400"
                  >
                    {[8, 9, 10, 11, 12].map(g => (
                      <option key={g} value={g} className="bg-slate-900 text-white">Grade {g}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Academic Stream</label>
                  <select
                    value={classForm.stream}
                    onChange={(e) => setClassForm({ ...classForm, stream: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white outline-hidden focus:border-cyan-400"
                  >
                    {STREAMS.map(s => (
                      <option key={s} value={s} className="bg-slate-900 text-white">{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Assign Homeroom / Class Teacher</label>
                <select
                  value={classForm.homeroom_teacher_id}
                  onChange={(e) => setClassForm({ ...classForm, homeroom_teacher_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white outline-hidden focus:border-cyan-400"
                >
                  <option value="" className="bg-slate-900 text-slate-400">-- None (Assign Later) --</option>
                  {teachers.map(t => (
                    <option key={t.id || t.user_id} value={t.id || t.user_id} className="bg-slate-900 text-white">
                      {t.full_name} {t.surname} ({t.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Room Number / Block (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Room 14 / Science Lab B"
                  value={classForm.room_number}
                  onChange={(e) => setClassForm({ ...classForm, room_number: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white outline-hidden focus:border-cyan-400"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsClassModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black shadow-md cursor-pointer"
                >
                  {editingClassId ? 'Save Changes' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: INVITE COLLEAGUE / EDUCATOR */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Mail className="w-5 h-5 text-cyan-400" />
                <span>Invite Colleague to Geleza SA</span>
              </h3>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">First Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Sipho"
                    value={inviteForm.full_name}
                    onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white outline-hidden focus:border-cyan-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Surname</label>
                  <input
                    type="text"
                    placeholder="e.g. Khumalo"
                    value={inviteForm.surname}
                    onChange={(e) => setInviteForm({ ...inviteForm, surname: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white outline-hidden focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Colleague Email Address *</label>
                <input
                  type="email"
                  placeholder="educator@school.co.za"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white outline-hidden focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Role Designation</label>
                  <select
                    value={inviteForm.role_type}
                    onChange={(e) => setInviteForm({ ...inviteForm, role_type: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white outline-hidden focus:border-cyan-400"
                  >
                    <option value="teacher" className="bg-slate-900 text-white">Teacher / Educator</option>
                    <option value="sports_coach" className="bg-slate-900 text-white">Sports Coach</option>
                    <option value="hod" className="bg-slate-900 text-white">Head of Department (HOD)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">SACE Number</label>
                  <input
                    type="text"
                    placeholder="e.g. SACE-849201"
                    value={inviteForm.sace_number}
                    onChange={(e) => setInviteForm({ ...inviteForm, sace_number: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white outline-hidden focus:border-cyan-400"
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                An authenticated invitation email with the school accreditation token will be delivered immediately to this educator, prompting them to set their password and enter the school roster.
              </p>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Official Invitation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
