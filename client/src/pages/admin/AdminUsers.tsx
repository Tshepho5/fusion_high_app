import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  Users,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  GraduationCap,
  Heart,
  Shield,
  Building,
  BookOpen,
  Calendar,
  Phone,
  Mail,
  UserCheck,
  Check
} from 'lucide-react';

interface UserRecord {
  id: number;
  full_name: string;
  surname?: string;
  email: string;
  phone?: string;
  role: string;
  profile_picture_path?: string;
  created_at?: string;
}

interface EmployeeRecord {
  employee_id: number;
  user_id: number;
  full_name: string;
  surname: string;
  email: string;
  phone?: string;
  department_name?: string;
  employee_role?: string;
  subjects?: string[];
  grades_taught?: number[];
  classes_taught?: string[];
  hired_date?: string;
}

interface LearnerRecord {
  learner_id: number;
  user_id: number;
  full_name: string;
  surname: string;
  learner_number: string;
  grade: number;
  stream: string;
  subjects?: string[];
  class_name?: string;
  email?: string;
  phone?: string;
  parent_name?: string;
}

interface SchoolMetadata {
  departments: { id: number; name: string }[];
  employee_roles: { id: number; name: string }[];
  classes: { id: number; name: string; grade: number; stream: string }[];
  subjects: { id: number; name: string; code: string; grade: number; stream: string }[];
}

export const AdminUsers: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'employees' | 'learners' | 'parents' | 'admissions'>('employees');
  
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [learners, setLearners] = useState<LearnerRecord[]>([]);
  const [admissions, setAdmissions] = useState<any[]>([]);
  
  const [metadata, setMetadata] = useState<SchoolMetadata>({
    departments: [],
    employee_roles: [],
    classes: [],
    subjects: []
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modals
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [isAddLearnerModalOpen, setIsAddLearnerModalOpen] = useState(false);

  // Employee Form State (matches employees + users table in schema.sql)
  const [employeeForm, setEmployeeForm] = useState({
    full_name: '',
    surname: '',
    email: '',
    phone: '',
    id_number: '',
    dob: '',
    gender: 'Male',
    department_id: '2', // Academic default
    employee_role_id: '1', // Teacher default
    subjects: [] as string[],
    grades_taught: [10, 11] as number[],
    classes_taught: ['10A'] as string[],
    hired_date: new Date().toISOString().split('T')[0],
    password: '',
  });

  // Learner Form State (matches children + users table in schema.sql)
  const [learnerForm, setLearnerForm] = useState({
    full_name: '',
    surname: '',
    email: '',
    phone: '',
    id_number: '',
    dob: '',
    gender: 'Male',
    learner_number: '',
    grade: '10',
    class_id: '',
    stream: 'Science',
    subjects: [] as string[],
    password: '',
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersData, empData, lrnData, metaData, admData] = await Promise.allSettled([
        adminService.getUsers(),
        adminService.getEmployees(),
        adminService.getLearners(),
        adminService.getSchoolMetadata(),
        adminService.getAdmissions()
      ]);

      if (usersData.status === 'fulfilled') setUsers(Array.isArray(usersData.value) ? usersData.value : []);
      if (empData.status === 'fulfilled') setEmployees(Array.isArray(empData.value) ? empData.value : []);
      if (lrnData.status === 'fulfilled') setLearners(Array.isArray(lrnData.value) ? lrnData.value : []);
      if (metaData.status === 'fulfilled') setMetadata(metaData.value || { departments: [], employee_roles: [], classes: [], subjects: [] });
      if (admData.status === 'fulfilled') setAdmissions(Array.isArray(admData.value) ? admData.value : []);

    } catch (err: any) {
      console.error('Failed to load records:', err);
      setError('Could not load administrative records from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle Create Employee
  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await adminService.createEmployee({
        ...employeeForm,
        department_id: parseInt(employeeForm.department_id, 10),
        employee_role_id: parseInt(employeeForm.employee_role_id, 10),
        password: employeeForm.password || 'Teacher@2026'
      });

      setActionSuccess(`Employee ${employeeForm.full_name} ${employeeForm.surname} registered successfully.`);
      setIsAddEmployeeModalOpen(false);
      setEmployeeForm({
        full_name: '',
        surname: '',
        email: '',
        phone: '',
        id_number: '',
        dob: '',
        gender: 'Male',
        department_id: '2',
        employee_role_id: '1',
        subjects: [],
        grades_taught: [10, 11],
        classes_taught: ['10A'],
        hired_date: new Date().toISOString().split('T')[0],
        password: '',
      });
      fetchData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      console.error('Create employee error:', err);
      setError(err.response?.data?.error || 'Failed to create employee in database.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Create Learner
  const handleCreateLearner = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await adminService.createLearner({
        ...learnerForm,
        grade: parseInt(learnerForm.grade, 10),
        class_id: learnerForm.class_id ? parseInt(learnerForm.class_id, 10) : undefined,
        password: learnerForm.password || 'Learner@2026'
      });

      setActionSuccess(`Learner ${learnerForm.full_name} ${learnerForm.surname} enrolled successfully.`);
      setIsAddLearnerModalOpen(false);
      setLearnerForm({
        full_name: '',
        surname: '',
        email: '',
        phone: '',
        id_number: '',
        dob: '',
        gender: 'Male',
        learner_number: '',
        grade: '10',
        class_id: '',
        stream: 'Science',
        subjects: [],
        password: '',
      });
      fetchData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      console.error('Create learner error:', err);
      setError(err.response?.data?.error || 'Failed to enroll learner in database.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: number, email: string) => {
    if (!window.confirm(`Are you sure you want to remove user "${email}" and all their associated records from the database?`)) {
      return;
    }
    setError(null);
    try {
      await adminService.deleteUser(userId);
      setActionSuccess(`User ${email} removed.`);
      fetchData();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete user.');
    }
  };

  // Filtered Lists
  const q = searchQuery.toLowerCase();
  
  const filteredEmployees = employees.filter(e =>
    `${e.full_name} ${e.surname}`.toLowerCase().includes(q) ||
    (e.email || '').toLowerCase().includes(q) ||
    (e.department_name || '').toLowerCase().includes(q) ||
    (e.employee_role || '').toLowerCase().includes(q)
  );

  const filteredLearners = learners.filter(l =>
    `${l.full_name} ${l.surname}`.toLowerCase().includes(q) ||
    (l.learner_number || '').toLowerCase().includes(q) ||
    (l.class_name || '').toLowerCase().includes(q) ||
    (l.stream || '').toLowerCase().includes(q)
  );

  const filteredParents = users.filter(u =>
    (u.role || '').toLowerCase() === 'parent' &&
    (`${u.full_name} ${u.surname}`.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q))
  );

  const filteredAdmissions = admissions.filter(a =>
    `${a.first_name} ${a.surname}`.toLowerCase().includes(q) ||
    (a.application_number || '').toLowerCase().includes(q) ||
    (a.provisional_learner_number || '').toLowerCase().includes(q) ||
    (a.status || '').toLowerCase().includes(q) ||
    (a.primary_parent_name || '').toLowerCase().includes(q)
  );

  const filteredAllUsers = users.filter(u =>
    `${u.full_name} ${u.surname}`.toLowerCase().includes(q) ||
    (u.email || '').toLowerCase().includes(q) ||
    (u.role || '').toLowerCase().includes(q)
  );

  const toggleSubjectForEmployee = (subName: string) => {
    setEmployeeForm(prev => {
      const exists = prev.subjects.includes(subName);
      return {
        ...prev,
        subjects: exists ? prev.subjects.filter(s => s !== subName) : [...prev.subjects, subName]
      };
    });
  };

  const toggleSubjectForLearner = (subName: string) => {
    setLearnerForm(prev => {
      const exists = prev.subjects.includes(subName);
      return {
        ...prev,
        subjects: exists ? prev.subjects.filter(s => s !== subName) : [...prev.subjects, subName]
      };
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-400" />
            School Directory & Enrollment
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Register teachers and staff, enroll learners, and manage system accounts directly in the PostgreSQL database.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsAddEmployeeModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-xs shadow-glow-indigo transition-all"
          >
            <Briefcase className="w-4 h-4 text-cyan-200" />
            <span>+ Add Employee / Teacher</span>
          </button>

          <button
            onClick={() => setIsAddLearnerModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold text-xs shadow-md transition-all"
          >
            <GraduationCap className="w-4 h-4 text-white" />
            <span>+ Enroll Learner</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Directory Category Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('employees')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'employees'
                ? 'bg-brand-600 text-white shadow-glow-indigo'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Employees & Teachers ({employees.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('learners')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'learners'
                ? 'bg-cyan-600 text-white shadow-glow-cyan'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Learners ({learners.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('admissions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'admissions'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Admissions ({admissions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('parents')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'parents'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Parents ({filteredParents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>All System Accounts ({users.length})</span>
          </button>
        </div>

        {/* Search Filter */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl bg-surface-dark border border-white/10 pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Main Table Content */}
      <div className="rounded-3xl bg-surface-dark border border-white/10 p-6 shadow-xl">
        {loading ? (
          <LoadingSpinner text="Fetching directory records from database..." />
        ) : activeTab === 'employees' ? (
          /* Employees Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-mono text-[10px]">
                  <th className="pb-3 px-3">Educator / Staff</th>
                  <th className="pb-3 px-3">Role & Department</th>
                  <th className="pb-3 px-3">Contact</th>
                  <th className="pb-3 px-3">Assigned Subjects</th>
                  <th className="pb-3 px-3">Classes</th>
                  <th className="pb-3 px-3">Hired Date</th>
                  <th className="pb-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.employee_id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center font-bold text-xs">
                          {(emp.full_name || 'T').charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-white">{emp.full_name} {emp.surname}</p>
                          <p className="text-[10px] text-slate-400">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="space-y-1">
                        <Badge variant="cyan" size="sm">{emp.employee_role || 'Teacher'}</Badge>
                        <p className="text-[10px] text-slate-400">{emp.department_name || 'Academic'}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-slate-300 font-mono">
                      {emp.phone || '-'}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {emp.subjects && emp.subjects.length > 0 ? (
                          emp.subjects.map((sub, i) => (
                            <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-surface-darker text-slate-300 border border-white/5">
                              {sub}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 text-[10px]">None assigned</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-slate-300 font-mono text-[11px]">
                      {emp.classes_taught && emp.classes_taught.length > 0 ? emp.classes_taught.join(', ') : 'All'}
                    </td>
                    <td className="py-3.5 px-3 text-slate-400 text-[11px]">
                      {emp.hired_date ? new Date(emp.hired_date).toLocaleDateString() : 'Permanent'}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <button
                        onClick={() => handleDeleteUser(emp.user_id, emp.email)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                        title="Remove Employee"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredEmployees.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">No employees found matching query.</div>
            )}
          </div>
        ) : activeTab === 'learners' ? (
          /* Learners Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-mono text-[10px]">
                  <th className="pb-3 px-3">Learner</th>
                  <th className="pb-3 px-3">Learner ID</th>
                  <th className="pb-3 px-3">Grade & Class</th>
                  <th className="pb-3 px-3">Stream</th>
                  <th className="pb-3 px-3">Parent / Guardian</th>
                  <th className="pb-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredLearners.map((lrn) => (
                  <tr key={lrn.learner_id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-xs">
                          {(lrn.full_name || 'L').charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-white">{lrn.full_name} {lrn.surname}</p>
                          <p className="text-[10px] text-slate-400">{lrn.email || 'Enrolled'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-cyan-400">
                      {lrn.learner_number}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="font-bold text-white">Grade {lrn.grade}</span>
                      <span className="text-slate-400 text-[10px] ml-1">({lrn.class_name || `${lrn.grade}A`})</span>
                    </td>
                    <td className="py-3.5 px-3">
                      <Badge variant="indigo" size="sm">{lrn.stream || 'General'}</Badge>
                    </td>
                    <td className="py-3.5 px-3 text-slate-300">
                      {lrn.parent_name ? (
                        <span className="text-emerald-400 font-semibold">{lrn.parent_name}</span>
                      ) : (
                        <span className="text-slate-500 text-[10px]">Unlinked</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <button
                        onClick={() => handleDeleteUser(lrn.user_id, lrn.email || lrn.learner_number)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                        title="Remove Learner"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredLearners.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">No learners found matching query.</div>
            )}
          </div>
        ) : activeTab === 'admissions' ? (
          /* Admissions Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-mono text-[10px]">
                  <th className="pb-3 px-3">Applicant Name</th>
                  <th className="pb-3 px-3">App Reference</th>
                  <th className="pb-3 px-3">Provisional Learner No</th>
                  <th className="pb-3 px-3">Grade & Stream</th>
                  <th className="pb-3 px-3">Assigned Class</th>
                  <th className="pb-3 px-3">Parent Contact</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3 text-right">Applied Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredAdmissions.map((adm) => (
                  <tr key={adm.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">
                          {(adm.first_name || 'A').charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-white">{adm.first_name} {adm.surname}</p>
                          <p className="text-[10px] text-slate-400 font-mono">ID: {adm.id_number || 'Under 16'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-brand-300">
                      {adm.application_number}
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-cyan-400">
                      {adm.provisional_learner_number || '-'}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white">Grade {adm.grade_applied}</span>
                        <Badge variant="indigo" size="sm">{adm.stream || 'General'}</Badge>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-emerald-300">
                      {adm.assigned_class_name || (adm.assigned_class_id ? `Class #${adm.assigned_class_id}` : 'Auto-Allocated')}
                    </td>
                    <td className="py-3.5 px-3">
                      <p className="text-white font-medium">{adm.primary_parent_name} {adm.primary_parent_surname}</p>
                      <p className="text-[10px] text-slate-400">{adm.primary_parent_email}</p>
                    </td>
                    <td className="py-3.5 px-3">
                      <Badge
                        variant={
                          adm.status === 'enrolled'
                            ? 'emerald'
                            : adm.status === 'approved'
                            ? 'cyan'
                            : adm.status === 'waitlisted'
                            ? 'amber'
                            : 'rose'
                        }
                        size="sm"
                      >
                        {adm.status?.toUpperCase() || 'SUBMITTED'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-3 text-right text-slate-400 font-mono text-[11px]">
                      {adm.created_at ? new Date(adm.created_at).toLocaleDateString() : 'Recent'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredAdmissions.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">No admission applications found.</div>
            )}
          </div>
        ) : (
          /* All Users Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-mono text-[10px]">
                  <th className="pb-3 px-3">User</th>
                  <th className="pb-3 px-3">Role</th>
                  <th className="pb-3 px-3">Email</th>
                  <th className="pb-3 px-3">Phone</th>
                  <th className="pb-3 px-3">Registered Date</th>
                  <th className="pb-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(activeTab === 'parents' ? filteredParents : filteredAllUsers).map((u) => (
                  <tr key={u.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-3 font-bold text-white">
                      {u.full_name} {u.surname}
                    </td>
                    <td className="py-3.5 px-3">
                      <Badge variant={u.role === 'admin' ? 'rose' : u.role === 'teacher' ? 'cyan' : u.role === 'parent' ? 'amber' : 'indigo'} size="sm">
                        {u.role}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-3 text-slate-300 font-mono">{u.email}</td>
                    <td className="py-3.5 px-3 text-slate-400 font-mono">{u.phone || '-'}</td>
                    <td className="py-3.5 px-3 text-slate-400">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'Active'}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <button
                        onClick={() => handleDeleteUser(u.id, u.email)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                        title="Delete User Account"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* ADD EMPLOYEE MODAL (matches employees table in schema.sql) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAddEmployeeModalOpen}
        onClose={() => setIsAddEmployeeModalOpen(false)}
        title="Register New Employee / Teacher"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateEmployee} className="space-y-4 text-xs">
          <div className="p-3 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs flex items-center gap-2">
            <Briefcase className="w-4 h-4 shrink-0" />
            <span>Creates an official employee profile in the <code className="text-white font-mono font-bold">employees</code> and <code className="text-white font-mono font-bold">users</code> database tables.</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1">First Name *</label>
              <input
                type="text"
                required
                value={employeeForm.full_name}
                onChange={(e) => setEmployeeForm(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="e.g. Sipho"
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">Surname *</label>
              <input
                type="text"
                required
                value={employeeForm.surname}
                onChange={(e) => setEmployeeForm(prev => ({ ...prev, surname: e.target.value }))}
                placeholder="e.g. Ndlovu"
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={employeeForm.email}
                onChange={(e) => setEmployeeForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="e.g. s.ndlovu@fusionhigh.co.za"
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-brand-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">Phone Number</label>
              <input
                type="text"
                value={employeeForm.phone}
                onChange={(e) => setEmployeeForm(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                placeholder="e.g. 0812345678"
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-brand-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Department</label>
              <select
                value={employeeForm.department_id}
                onChange={(e) => setEmployeeForm(prev => ({ ...prev, department_id: e.target.value }))}
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-brand-500"
              >
                {metadata.departments.length > 0 ? (
                  metadata.departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))
                ) : (
                  <>
                    <option value="2">Academic</option>
                    <option value="1">Administration</option>
                    <option value="4">IT</option>
                    <option value="3">Maintenance</option>
                  </>
                )}
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">Role / Designation</label>
              <select
                value={employeeForm.employee_role_id}
                onChange={(e) => setEmployeeForm(prev => ({ ...prev, employee_role_id: e.target.value }))}
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-brand-500"
              >
                {metadata.employee_roles.length > 0 ? (
                  metadata.employee_roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))
                ) : (
                  <>
                    <option value="1">Teacher</option>
                    <option value="2">Principal</option>
                    <option value="3">Vice_Principal</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Subjects Taught Selection */}
          <div className="space-y-1.5">
            <label className="block text-slate-300 font-bold">Assigned Subjects (Click to Toggle)</label>
            <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl bg-surface-darker border border-white/10 max-h-32 overflow-y-auto">
              {[
                'Mathematics', 'Physical Sciences', 'Life Sciences', 'Accounting', 
                'Business Studies', 'Economics', 'Tourism', 'Mathematical Literacy', 
                'English FAL', 'Home Language', 'Life Orientation', 'Natural Sciences'
              ].map(sub => {
                const isSelected = employeeForm.subjects.includes(sub);
                return (
                  <button
                    type="button"
                    key={sub}
                    onClick={() => toggleSubjectForEmployee(sub)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1 ${
                      isSelected
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-3 h-3 text-cyan-300" />
                        <span>{sub}</span>
                      </>
                    ) : (
                      <span>+ {sub}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Hire Date</label>
              <input
                type="date"
                value={employeeForm.hired_date}
                onChange={(e) => setEmployeeForm(prev => ({ ...prev, hired_date: e.target.value }))}
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">Initial Password</label>
              <input
                type="text"
                value={employeeForm.password}
                onChange={(e) => setEmployeeForm(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Default: Teacher@2026"
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => setIsAddEmployeeModalOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-extrabold shadow-glow-indigo transition-all disabled:opacity-50"
            >
              {submitting ? 'Saving to Database...' : 'Register Employee'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* ADD LEARNER MODAL (matches children + users table in schema.sql) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAddLearnerModalOpen}
        onClose={() => setIsAddLearnerModalOpen(false)}
        title="Enroll New Learner"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateLearner} className="space-y-4 text-xs">
          <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs flex items-center gap-2">
            <Shield className="w-4 h-4 shrink-0" />
            <span>Admin registers learner details only. Parents will link their child using the unique Learner Number upon parent registration.</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1">First Name *</label>
              <input
                type="text"
                required
                value={learnerForm.full_name}
                onChange={(e) => setLearnerForm(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="e.g. Thabo"
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">Surname *</label>
              <input
                type="text"
                required
                value={learnerForm.surname}
                onChange={(e) => setLearnerForm(prev => ({ ...prev, surname: e.target.value }))}
                placeholder="e.g. Mokoena"
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Learner ID Number *</label>
              <input
                type="text"
                value={learnerForm.learner_number}
                onChange={(e) => setLearnerForm(prev => ({ ...prev, learner_number: e.target.value }))}
                placeholder="e.g. 2026-095"
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-cyan-500 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">Grade *</label>
              <select
                value={learnerForm.grade}
                onChange={(e) => setLearnerForm(prev => ({ ...prev, grade: e.target.value }))}
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-cyan-500"
              >
                <option value="8">Grade 8</option>
                <option value="9">Grade 9</option>
                <option value="10">Grade 10</option>
                <option value="11">Grade 11</option>
                <option value="12">Grade 12</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">Academic Stream</label>
              <select
                value={learnerForm.stream}
                onChange={(e) => setLearnerForm(prev => ({ ...prev, stream: e.target.value }))}
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-cyan-500"
              >
                <option value="Science">Science</option>
                <option value="Commerce">Commerce</option>
                <option value="Tourism">Tourism</option>
                <option value="General">General</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Assigned Class</label>
              <select
                value={learnerForm.class_id}
                onChange={(e) => setLearnerForm(prev => ({ ...prev, class_id: e.target.value }))}
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">Auto-assign based on Grade ({learnerForm.grade}A)</option>
                {metadata.classes.filter(c => c.grade === parseInt(learnerForm.grade, 10)).map(c => (
                  <option key={c.id} value={c.id}>Class {c.name} ({c.stream})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">Learner Email (Optional)</label>
              <input
                type="email"
                value={learnerForm.email}
                onChange={(e) => setLearnerForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Auto-generated if blank"
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-cyan-500 font-mono"
              />
            </div>
          </div>

          {/* Subjects Selection */}
          <div className="space-y-1.5">
            <label className="block text-slate-300 font-bold">Enrolled Subjects (Click to Toggle)</label>
            <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl bg-surface-darker border border-white/10 max-h-32 overflow-y-auto">
              {[
                'Mathematics', 'Physical Sciences', 'Life Sciences', 'Accounting', 
                'Business Studies', 'Economics', 'Tourism', 'Mathematical Literacy', 
                'English FAL', 'Home Language', 'Life Orientation', 'Natural Sciences'
              ].map(sub => {
                const isSelected = learnerForm.subjects.includes(sub);
                return (
                  <button
                    type="button"
                    key={sub}
                    onClick={() => toggleSubjectForLearner(sub)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1 ${
                      isSelected
                        ? 'bg-cyan-600 text-white shadow-sm'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-3 h-3 text-cyan-200" />
                        <span>{sub}</span>
                      </>
                    ) : (
                      <span>+ {sub}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Initial Password</label>
            <input
              type="text"
              value={learnerForm.password}
              onChange={(e) => setLearnerForm(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Default: Learner@2026"
              className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => setIsAddLearnerModalOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-extrabold shadow-md transition-all disabled:opacity-50"
            >
              {submitting ? 'Enrolling in Database...' : 'Enroll Learner'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
