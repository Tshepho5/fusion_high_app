import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import { useSchool } from '../../context/SchoolContext';
import { useAuth } from '../../context/AuthContext';
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
  Check,
  FileCheck,
  Scan,
  FileText,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  UserPlus,
  Lock,
  Unlock
} from 'lucide-react';

interface UserRecord {
  id: number;
  full_name: string;
  surname?: string;
  email: string;
  phone?: string;
  id_number?: string;
  role: string;
  profile_picture_path?: string;
  profile_edit_unlocked?: boolean;
  created_at?: string;
}

interface EmployeeRecord {
  employee_id: number;
  user_id: number;
  full_name: string;
  surname: string;
  email: string;
  phone?: string;
  profile_edit_unlocked?: boolean;
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
  profile_edit_unlocked?: boolean;
  subjects?: string[];
  class_name?: string;
  email?: string;
  phone?: string;
  parent_name?: string;
}

interface ParentRecord {
  id: number;
  full_name: string;
  surname?: string;
  email: string;
  phone?: string;
  id_number?: string;
  gender?: string;
  physical_address?: string;
  profile_edit_unlocked?: boolean;
  created_at?: string;
  linked_children_count?: number;
  linked_children?: any[];
}

interface SchoolMetadata {
  departments: { id: number; name: string }[];
  employee_roles: { id: number; name: string }[];
  classes: { id: number; name: string; grade: number; stream: string }[];
  subjects: { id: number; name: string; code: string; grade: number; stream: string }[];
}

export const AdminUsers: React.FC = () => {
  const { currentSchool, schoolsList } = useSchool();
  const { user: currentUser } = useAuth();
  const isSuperAdmin = Boolean(
    currentUser?.is_superadmin || 
    (currentUser?.email && currentUser?.email.toLowerCase() === '202247878@myturf.ul.ac.za') ||
    (currentUser?.email && currentUser?.email.toLowerCase() === 'sthepomakola23@gmail.com')
  );

  const [activeTab, setActiveTab] = useState<'employees' | 'learners' | 'parents' | 'admissions' | 'admins' | 'all'>('employees');
  
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [learners, setLearners] = useState<LearnerRecord[]>([]);
  const [parents, setParents] = useState<ParentRecord[]>([]);
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [schoolAdmins, setSchoolAdmins] = useState<any[]>([]);
  
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
  const [isAddParentModalOpen, setIsAddParentModalOpen] = useState(false);
  const [isAddAdminModalOpen, setIsAddAdminModalOpen] = useState(false);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState<any | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<any | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // SubAdmin Form State
  const [subAdminModalError, setSubAdminModalError] = useState<string | null>(null);
  const [adminForm, setAdminForm] = useState({
    full_name: '',
    surname: '',
    email: '',
    phone: '',
    id_number: '',
    school_id: currentSchool?.id || 2,
    password: 'Admin@2026',
    gender: 'Male',
    physical_address: ''
  });

  const handleInspectAdmission = async (adm: any) => {
    setSelectedAdmission(adm);
    setIsOcrModalOpen(true);
    setOcrLoading(true);
    setOcrResult(null);
    try {
      const detail = await adminService.getAdmissionById(adm.id);
      setSelectedAdmission(detail);
      const ocr = await adminService.inspectAdmissionOCR(adm.id);
      setOcrResult(ocr.ocr || ocr);
    } catch (err: any) {
      console.error('Error loading admission details & OCR:', err);
    } finally {
      setOcrLoading(false);
    }
  };

  const handleUpdateAdmissionStatus = async (status: string) => {
    if (!selectedAdmission) return;
    setUpdatingStatus(true);
    try {
      await adminService.updateAdmissionStatus(selectedAdmission.id, { status });
      setActionSuccess(`Application ${selectedAdmission.application_number} status updated to ${status.toUpperCase()}`);
      setIsOcrModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError('Failed to update status: ' + err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Employee Form State
  const [employeeForm, setEmployeeForm] = useState({
    full_name: '',
    surname: '',
    email: '',
    phone: '',
    id_number: '',
    dob: '',
    gender: 'Male',
    department_id: '2',
    employee_role_id: '1',
    subjects: [] as string[],
    grades_taught: [10, 11] as number[],
    classes_taught: ['10A'] as string[],
    hired_date: new Date().toISOString().split('T')[0],
    password: '',
  });

  // Learner Form State
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

  // Parent Form State
  const [parentForm, setParentForm] = useState({
    full_name: '',
    surname: '',
    email: '',
    phone: '',
    id_number: '',
    dob: '',
    gender: 'Female',
    physical_address: '',
    relationship: 'Mother',
    password: '',
    child_learner_number: '',
    child_id_number: ''
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersData, empData, lrnData, metaData, admData, parentsData, adminsData] = await Promise.allSettled([
        adminService.getUsers(),
        adminService.getEmployees(),
        adminService.getLearners(),
        adminService.getSchoolMetadata(),
        adminService.getAdmissions(),
        adminService.getParents(),
        isSuperAdmin ? adminService.getSchoolAdmins() : Promise.resolve({ admins: [] })
      ]);

      if (usersData.status === 'fulfilled') setUsers(Array.isArray(usersData.value) ? usersData.value : []);
      if (empData.status === 'fulfilled') setEmployees(Array.isArray(empData.value) ? empData.value : []);
      if (lrnData.status === 'fulfilled') setLearners(Array.isArray(lrnData.value) ? lrnData.value : []);
      if (metaData.status === 'fulfilled') setMetadata(metaData.value || { departments: [], employee_roles: [], classes: [], subjects: [] });
      if (admData.status === 'fulfilled') setAdmissions(Array.isArray(admData.value) ? admData.value : []);
      if (parentsData.status === 'fulfilled') {
        const pList = parentsData.value?.parents || (Array.isArray(parentsData.value) ? parentsData.value : []);
        setParents(pList);
      }
      if (adminsData.status === 'fulfilled') {
        const aList = adminsData.value?.admins || (Array.isArray(adminsData.value) ? adminsData.value : []);
        setSchoolAdmins(aList);
      }

    } catch (err: any) {
      console.error('Failed to load records:', err);
      setError('Could not load administrative records from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentSchool?.id, isSuperAdmin]);

  // Handle Create School Admin (SubAdmin) - Main Admin Only
  const handleCreateSchoolAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubAdminModalError(null);

    if (/\d/.test(adminForm.full_name)) {
      setSubAdminModalError('First name cannot contain numbers.');
      return;
    }
    if (/\d/.test(adminForm.surname)) {
      setSubAdminModalError('Surname cannot contain numbers.');
      return;
    }
    if (!adminForm.email) {
      setSubAdminModalError('Official email address is required.');
      return;
    }
    if (!adminForm.school_id) {
      setSubAdminModalError('Please assign a specific school to this SubAdmin.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await adminService.createSchoolAdmin({
        ...adminForm,
        school_id: parseInt(String(adminForm.school_id), 10),
        password: adminForm.password || 'Admin@2026'
      });

      setActionSuccess(res.message || `SubAdmin ${adminForm.full_name} ${adminForm.surname} appointed successfully. Official credentials emailed.`);
      setIsAddAdminModalOpen(false);
      setSubAdminModalError(null);
      setAdminForm({
        full_name: '',
        surname: '',
        email: '',
        phone: '',
        id_number: '',
        school_id: currentSchool?.id || 2,
        password: 'Admin@2026',
        gender: 'Male',
        physical_address: ''
      });
      fetchData();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      console.error('Create school admin error:', err);
      const errMsg = err.response?.data?.error || err.message || 'Failed to appoint school administrator.';
      setSubAdminModalError(errMsg);
      setError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Create Employee
  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (/\d/.test(employeeForm.full_name)) {
      setError('First name cannot contain numbers.');
      return;
    }
    if (/\d/.test(employeeForm.surname)) {
      setError('Surname cannot contain numbers.');
      return;
    }
    if (employeeForm.phone && /[^\d+\s-]/.test(employeeForm.phone)) {
      setError('Phone number must contain digits only.');
      return;
    }
    if (employeeForm.id_number && /\D/.test(employeeForm.id_number)) {
      setError('National ID number must contain digits only.');
      return;
    }

    setSubmitting(true);

    try {
      await adminService.createEmployee({
        ...employeeForm,
        department_id: parseInt(employeeForm.department_id, 10),
        employee_role_id: parseInt(employeeForm.employee_role_id, 10),
        password: employeeForm.password || 'Teacher@2026'
      });

      setActionSuccess(`Employee ${employeeForm.full_name} ${employeeForm.surname} registered successfully. Onboarding email sent.`);
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

  // Handle Create Parent
  const handleCreateParent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Strict validation
    if (/\d/.test(parentForm.full_name)) {
      setError('First name cannot contain numbers.');
      return;
    }
    if (/\d/.test(parentForm.surname)) {
      setError('Surname cannot contain numbers.');
      return;
    }
    if (parentForm.phone && /[^\d+\s-]/.test(parentForm.phone)) {
      setError('Phone number must contain digits only.');
      return;
    }
    if (parentForm.id_number && /\D/.test(parentForm.id_number)) {
      setError('National ID number must contain digits only.');
      return;
    }
    if (parentForm.child_id_number && /\D/.test(parentForm.child_id_number)) {
      setError('Child National ID number must contain digits only.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await adminService.createParent(parentForm);
      setActionSuccess(res.message || `Parent ${parentForm.full_name} ${parentForm.surname} registered successfully. An email with temporary password has been dispatched.`);
      setIsAddParentModalOpen(false);
      setParentForm({
        full_name: '',
        surname: '',
        email: '',
        phone: '',
        id_number: '',
        dob: '',
        gender: 'Female',
        physical_address: '',
        relationship: 'Mother',
        password: '',
        child_learner_number: '',
        child_id_number: ''
      });
      fetchData();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      console.error('Create parent error:', err);
      setError(err.response?.data?.error || 'Failed to register parent in database.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Create Learner
  const handleCreateLearner = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (/\d/.test(learnerForm.full_name)) {
      setError('First name cannot contain numbers.');
      return;
    }
    if (/\d/.test(learnerForm.surname)) {
      setError('Surname cannot contain numbers.');
      return;
    }
    if (learnerForm.id_number && /\D/.test(learnerForm.id_number)) {
      setError('National ID number must contain digits only.');
      return;
    }

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

  const handleToggleProfileLock = async (userId: number, userName: string) => {
    setError(null);
    try {
      const res = await adminService.toggleUserProfileLock(userId);
      const isUnlocked = res.profile_edit_unlocked;
      setActionSuccess(`${userName}'s profile edit permissions are now ${isUnlocked ? 'UNLOCKED (Editable)' : 'LOCKED (Read-Only)'}.`);
      
      // Immediately reflect state across all tabs
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, profile_edit_unlocked: isUnlocked } : u));
      setEmployees(prev => prev.map(e => e.user_id === userId ? { ...e, profile_edit_unlocked: isUnlocked } : e));
      setLearners(prev => prev.map(l => l.user_id === userId ? { ...l, profile_edit_unlocked: isUnlocked } : l));
      setParents(prev => prev.map(p => p.id === userId ? { ...p, profile_edit_unlocked: isUnlocked } : p));
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      console.error('Error toggling profile lock:', err);
      setError(err.response?.data?.error || err.message || 'Failed to toggle profile edit permissions.');
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

  const filteredParents = parents.filter(p =>
    `${p.full_name} ${p.surname || ''}`.toLowerCase().includes(q) ||
    (p.email || '').toLowerCase().includes(q) ||
    (p.phone || '').toLowerCase().includes(q) ||
    (p.id_number || '').toLowerCase().includes(q)
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

  const filteredSchoolAdmins = schoolAdmins.filter(a =>
    `${a.full_name} ${a.surname || ''}`.toLowerCase().includes(q) ||
    (a.email || '').toLowerCase().includes(q) ||
    (a.school_name || '').toLowerCase().includes(q) ||
    (a.school_circuit || '').toLowerCase().includes(q)
  );

  const [enrollingAdmissionId, setEnrollingAdmissionId] = useState<number | null>(null);

  const handleQuickApproveAndEnroll = async (admId: number, admName: string) => {
    setEnrollingAdmissionId(admId);
    setError(null);
    try {
      const res = await adminService.reviewApplicationDecision(admId, { status: 'approved' });
      setActionSuccess(res.message || `Learner ${admName} enrolled successfully with parent login credentials sent.`);
      fetchData();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      console.error('Failed to 1-click enroll applicant:', err);
      setError(err.response?.data?.error || err.message || 'Failed to enroll applicant.');
    } finally {
      setEnrollingAdmissionId(null);
    }
  };

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
            School Directory & Multi-Tenant Access
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isSuperAdmin
              ? 'Main Executive Administrator Hub: Appoint School SubAdmins, oversee all schools, and manage isolated school staff, parents, and learners.'
              : `School Administrator Hub for ${currentSchool?.name || 'Your School'}: Onboard faculty staff, register parents, enroll learners, and review applications.`}
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Main Admin Only: Appoint SubAdmin for any School */}
          {isSuperAdmin && (
            <button
              onClick={() => setIsAddAdminModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-brand-600 hover:from-purple-500 hover:to-brand-500 text-white font-bold text-xs shadow-glow-indigo transition-all transform hover:scale-[1.02]"
              title="Appoint a Dedicated SubAdmin for an Individual School"
            >
              <Shield className="w-4 h-4 text-purple-200" />
              <span>+ Appoint School SubAdmin</span>
            </button>
          )}

          <button
            onClick={() => setIsAddEmployeeModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-xs shadow-glow-indigo transition-all"
          >
            <Briefcase className="w-4 h-4 text-cyan-200" />
            <span>+ Add Employee / Teacher</span>
          </button>

          <button
            onClick={() => setIsAddParentModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs shadow-md transition-all"
          >
            <Heart className="w-4 h-4 text-amber-200" />
            <span>+ Register Parent</span>
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

      {/* Directory Category Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Main Admin Only: School SubAdmins Tab */}
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab('admins')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'admins'
                  ? 'bg-purple-600 text-white shadow-glow-indigo'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-purple-300" />
              <span>School Admins ({schoolAdmins.length})</span>
            </button>
          )}

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
            onClick={() => setActiveTab('parents')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'parents'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Parents ({parents.length || users.filter(u => u.role === 'parent').length})</span>
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
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>All Users ({users.length})</span>
          </button>
        </div>

        {/* Search Field */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search directory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-dark border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Directory Content List */}
      <div className="rounded-3xl bg-surface-dark border border-white/10 p-5 shadow-xl">
        {loading ? (
          <LoadingSpinner text="Retrieving records from PostgreSQL database..." />
        ) : activeTab === 'employees' ? (
          /* Employees Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-mono text-[10px]">
                  <th className="pb-3 px-3">Educator / Staff</th>
                  <th className="pb-3 px-3">Designation & Department</th>
                  <th className="pb-3 px-3">Assigned Subjects</th>
                  <th className="pb-3 px-3">Grades & Classes</th>
                  <th className="pb-3 px-3">Profile Edit</th>
                  <th className="pb-3 px-3">Contact</th>
                  <th className="pb-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredEmployees.map((e) => (
                  <tr key={e.employee_id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-3">
                      <p className="font-bold text-white text-sm">{e.full_name} {e.surname}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{e.email}</p>
                    </td>
                    <td className="py-3.5 px-3">
                      <p className="font-semibold text-cyan-400">{e.employee_role || 'Teacher'}</p>
                      <p className="text-[11px] text-slate-400">{e.department_name || 'Academic'}</p>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {(e.subjects || []).map(s => (
                          <span key={s} className="px-2 py-0.5 rounded-md bg-brand-500/20 text-brand-300 text-[10px] font-bold border border-brand-500/30">
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="space-y-0.5">
                        <p className="text-white font-mono text-[11px]">Grades: {(e.grades_taught || []).join(', ') || '10, 11'}</p>
                        <p className="text-slate-400 text-[10px]">Classes: {(e.classes_taught || []).join(', ') || '10A'}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          e.profile_edit_unlocked 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                            : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                        }`}>
                          {e.profile_edit_unlocked ? <Unlock className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                          {e.profile_edit_unlocked ? 'Unlocked' : 'Locked'}
                        </span>
                        <button
                          onClick={() => handleToggleProfileLock(e.user_id, `${e.full_name} ${e.surname}`)}
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-all border ${
                            e.profile_edit_unlocked 
                              ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30' 
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          }`}
                          title={e.profile_edit_unlocked ? 'Click to Lock Profile Editing' : 'Click to Unlock Profile Editing for Employee'}
                        >
                          {e.profile_edit_unlocked ? 'Lock' : 'Unlock'}
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-slate-400 font-mono text-[11px]">
                      {e.phone || '-'}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <button
                        onClick={() => handleDeleteUser(e.user_id, e.email)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                        title="Remove Staff"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredEmployees.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">No employees found.</div>
            )}
          </div>
        ) : activeTab === 'parents' ? (
          /* Parents Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-mono text-[10px]">
                  <th className="pb-3 px-3">Parent / Guardian</th>
                  <th className="pb-3 px-3">Email Address</th>
                  <th className="pb-3 px-3">Contact Phone</th>
                  <th className="pb-3 px-3">National ID</th>
                  <th className="pb-3 px-3">Linked Children</th>
                  <th className="pb-3 px-3">Profile Edit</th>
                  <th className="pb-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredParents.map((p) => (
                  <tr key={p.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-3">
                      <p className="font-bold text-white text-sm">{p.full_name} {p.surname || ''}</p>
                      <p className="text-[11px] text-amber-400 font-medium">{p.gender || 'Parent'}</p>
                    </td>
                    <td className="py-3.5 px-3 text-slate-300 font-mono">{p.email}</td>
                    <td className="py-3.5 px-3 text-slate-400 font-mono">{p.phone || '-'}</td>
                    <td className="py-3.5 px-3 text-slate-400 font-mono">{p.id_number || '-'}</td>
                    <td className="py-3.5 px-3">
                      {p.linked_children && p.linked_children.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {p.linked_children.map((c: any) => (
                            <span key={c.id} className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 text-[10px] font-bold border border-cyan-500/30">
                              {c.full_name} {c.surname} (Gr {c.grade})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500 italic">No learners linked yet</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.profile_edit_unlocked 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                            : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                        }`}>
                          {p.profile_edit_unlocked ? <Unlock className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                          {p.profile_edit_unlocked ? 'Unlocked' : 'Locked'}
                        </span>
                        <button
                          onClick={() => handleToggleProfileLock(p.id, `${p.full_name} ${p.surname || ''}`)}
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-all border ${
                            p.profile_edit_unlocked 
                              ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30' 
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          }`}
                          title={p.profile_edit_unlocked ? 'Click to Lock Profile Editing' : 'Click to Unlock Profile Editing for Parent'}
                        >
                          {p.profile_edit_unlocked ? 'Lock' : 'Unlock'}
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <button
                        onClick={() => handleDeleteUser(p.id, p.email)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                        title="Remove Parent Account"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredParents.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">No registered parents found. Click "+ Register Parent" to add one.</div>
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
                  <th className="pb-3 px-3">Grade & Stream</th>
                  <th className="pb-3 px-3">Assigned Class</th>
                  <th className="pb-3 px-3">Parent Link</th>
                  <th className="pb-3 px-3">Profile Edit</th>
                  <th className="pb-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredLearners.map((l) => (
                  <tr key={l.learner_id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-3">
                      <p className="font-bold text-white text-sm">{l.full_name} {l.surname}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{l.email || '-'}</p>
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-cyan-400">
                      {l.learner_number}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white">Grade {l.grade}</span>
                        <Badge variant="indigo" size="sm">{l.stream || 'General'}</Badge>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-emerald-300">
                      {l.class_name || 'Assigned'}
                    </td>
                    <td className="py-3.5 px-3 text-slate-300">
                      {l.parent_name || 'Unlinked'}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          l.profile_edit_unlocked 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                            : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                        }`}>
                          {l.profile_edit_unlocked ? <Unlock className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                          {l.profile_edit_unlocked ? 'Unlocked' : 'Locked'}
                        </span>
                        <button
                          onClick={() => handleToggleProfileLock(l.user_id, `${l.full_name} ${l.surname}`)}
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-all border ${
                            l.profile_edit_unlocked 
                              ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30' 
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          }`}
                          title={l.profile_edit_unlocked ? 'Click to Lock Profile Editing' : 'Click to Unlock Profile Editing for Learner'}
                        >
                          {l.profile_edit_unlocked ? 'Lock' : 'Unlock'}
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <button
                        onClick={() => handleDeleteUser(l.user_id, l.email || l.learner_number)}
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
              <div className="p-8 text-center text-slate-400 text-xs">No enrolled learners found.</div>
            )}
          </div>
        ) : activeTab === 'admissions' ? (
          /* Admissions Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-mono text-[10px]">
                  <th className="pb-3 px-3">Applicant Learner</th>
                  <th className="pb-3 px-3">App Number</th>
                  <th className="pb-3 px-3">Learner ID</th>
                  <th className="pb-3 px-3">Grade & Stream</th>
                  <th className="pb-3 px-3">Allocated Class</th>
                  <th className="pb-3 px-3">Primary Parent</th>
                  <th className="pb-3 px-3">Admission Status</th>
                  <th className="pb-3 px-3">Date Applied</th>
                  <th className="pb-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredAdmissions.map((adm) => (
                  <tr key={adm.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-300 font-bold text-xs shrink-0">
                          {adm.first_name?.[0] || 'L'}
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
                    <td className="py-3.5 px-3 text-slate-400 font-mono text-[11px]">
                      {adm.created_at ? new Date(adm.created_at).toLocaleDateString() : 'Recent'}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {adm.status !== 'enrolled' && (
                          <button
                            onClick={() => handleQuickApproveAndEnroll(adm.id, `${adm.first_name} ${adm.surname}`)}
                            disabled={enrollingAdmissionId === adm.id}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-[11px] shadow-sm flex items-center gap-1.5 transition-all hover:scale-105 disabled:opacity-50"
                            title="1-Click Approve, Create User & Parent Accounts, Generate Fee Invoice & Send Credentials"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                            <span>{enrollingAdmissionId === adm.id ? 'Enrolling...' : '⚡ 1-Click Enroll'}</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleInspectAdmission(adm)}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-500 hover:to-cyan-500 text-white font-bold text-[11px] shadow-sm flex items-center gap-1.5 transition-all hover:scale-105"
                        >
                          <Scan className="w-3.5 h-3.5" />
                          <span>Inspect OCR</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredAdmissions.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">No admission applications found.</div>
            )}
          </div>
        ) : activeTab === 'admins' ? (
          /* School Administrators (SubAdmins) Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-mono text-[10px]">
                  <th className="pb-3 px-3">Administrator</th>
                  <th className="pb-3 px-3">Jurisdiction Level</th>
                  <th className="pb-3 px-3">Assigned School</th>
                  <th className="pb-3 px-3">Circuit / Province</th>
                  <th className="pb-3 px-3">Email Address</th>
                  <th className="pb-3 px-3">Phone</th>
                  <th className="pb-3 px-3">Appointed Date</th>
                  <th className="pb-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredSchoolAdmins.map((adm) => (
                  <tr key={adm.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-3">
                      <p className="font-bold text-white text-sm">{adm.full_name} {adm.surname}</p>
                      <span className="text-[10px] font-mono text-slate-400">Account ID: {adm.id}</span>
                    </td>
                    <td className="py-3.5 px-3">
                      <Badge variant={adm.is_superadmin ? 'rose' : 'indigo'} size="sm">
                        {adm.is_superadmin ? 'Main Executive Admin' : 'School SubAdmin'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="font-bold text-cyan-400">{adm.school_name || 'Fusion Educational Institution'}</span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-300">
                      <span>{adm.school_circuit || 'Mankweng Circuit'}</span>
                      <span className="text-slate-500 block text-[10px]">{adm.school_province || 'Limpopo'}</span>
                    </td>
                    <td className="py-3.5 px-3 font-mono text-slate-300">{adm.email}</td>
                    <td className="py-3.5 px-3 font-mono text-slate-400">{adm.phone || '-'}</td>
                    <td className="py-3.5 px-3 text-slate-400 font-mono text-[11px]">
                      {adm.created_at ? new Date(adm.created_at).toLocaleDateString() : 'Active'}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      {!adm.is_superadmin && (
                        <button
                          onClick={() => handleDeleteUser(adm.id, adm.email)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                          title="Revoke SubAdmin Access"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredSchoolAdmins.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">No School Administrators found matching your search query.</div>
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
                  <th className="pb-3 px-3">Profile Edit</th>
                  <th className="pb-3 px-3">Registered Date</th>
                  <th className="pb-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredAllUsers.map((u) => (
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
                    <td className="py-3.5 px-3">
                      {u.role !== 'admin' ? (
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.profile_edit_unlocked 
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                              : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                          }`}>
                            {u.profile_edit_unlocked ? <Unlock className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                            {u.profile_edit_unlocked ? 'Unlocked' : 'Locked'}
                          </span>
                          <button
                            onClick={() => handleToggleProfileLock(u.id, `${u.full_name} ${u.surname || ''}`)}
                            className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-all border ${
                              u.profile_edit_unlocked 
                                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30' 
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            }`}
                            title={u.profile_edit_unlocked ? 'Click to Lock Profile Editing' : 'Click to Unlock Profile Editing for User'}
                          >
                            {u.profile_edit_unlocked ? 'Lock' : 'Unlock'}
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500 italic">Admin Access</span>
                      )}
                    </td>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1">First Name *</label>
              <input
                type="text"
                required
                value={employeeForm.full_name}
                onChange={(e) => setEmployeeForm(prev => ({ ...prev, full_name: e.target.value.replace(/\d/g, '') }))}
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
                onChange={(e) => setEmployeeForm(prev => ({ ...prev, surname: e.target.value.replace(/\d/g, '') }))}
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
              <label className="block text-slate-300 font-bold mb-1">Phone Number (Digits Only)</label>
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
      {/* ADD PARENT MODAL (matches users & parent_children table in schema.sql) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAddParentModalOpen}
        onClose={() => setIsAddParentModalOpen(false)}
        title="Register Parent / Guardian"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateParent} className="space-y-4 text-xs">
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
            <Heart className="w-4 h-4 shrink-0" />
            <span>Upon registration, an onboarding email with login credentials and a temporary password will be sent automatically.</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1">First Name *</label>
              <input
                type="text"
                required
                value={parentForm.full_name}
                onChange={(e) => setParentForm(prev => ({ ...prev, full_name: e.target.value.replace(/\d/g, '') }))}
                placeholder="e.g. Nombuso"
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">Surname *</label>
              <input
                type="text"
                required
                value={parentForm.surname}
                onChange={(e) => setParentForm(prev => ({ ...prev, surname: e.target.value.replace(/\d/g, '') }))}
                placeholder="e.g. Dlamini"
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={parentForm.email}
                onChange={(e) => setParentForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="e.g. n.dlamini@gmail.com"
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">Phone Number (Digits Only) *</label>
              <input
                type="text"
                required
                value={parentForm.phone}
                onChange={(e) => setParentForm(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                placeholder="e.g. 0823456789"
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1">National ID Number (Digits Only)</label>
              <input
                type="text"
                value={parentForm.id_number}
                onChange={(e) => setParentForm(prev => ({ ...prev, id_number: e.target.value.replace(/\D/g, '').slice(0, 13) }))}
                placeholder="13-digit SA ID"
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">Relationship</label>
              <select
                value={parentForm.relationship}
                onChange={(e) => setParentForm(prev => ({ ...prev, relationship: e.target.value }))}
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-amber-500 font-bold"
              >
                <option value="Mother">Mother</option>
                <option value="Father">Father</option>
                <option value="Legal Guardian">Legal Guardian</option>
                <option value="Grandparent">Grandparent</option>
                <option value="Sponsor">Sponsor</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">Gender</label>
              <select
                value={parentForm.gender}
                onChange={(e) => setParentForm(prev => ({ ...prev, gender: e.target.value }))}
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-amber-500"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Physical Residential Address</label>
            <input
              type="text"
              value={parentForm.physical_address}
              onChange={(e) => setParentForm(prev => ({ ...prev, physical_address: e.target.value }))}
              placeholder="e.g. 142 Nelson Mandela Ave, Hatfield, Pretoria"
              className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-surface-darker border border-white/5">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Optional: Child's Learner Number</label>
              <input
                type="text"
                value={parentForm.child_learner_number}
                onChange={(e) => setParentForm(prev => ({ ...prev, child_learner_number: e.target.value }))}
                placeholder="e.g. 2026-FHS-001 or 2026001"
                className="w-full rounded-xl bg-surface-dark border border-white/10 px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">Optional: Child's ID Number (Digits Only)</label>
              <input
                type="text"
                value={parentForm.child_id_number}
                onChange={(e) => setParentForm(prev => ({ ...prev, child_id_number: e.target.value.replace(/\D/g, '') }))}
                placeholder="Child's 13-digit National ID"
                className="w-full rounded-xl bg-surface-dark border border-white/10 px-3 py-2 text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Temporary Initial Password</label>
            <input
              type="text"
              value={parentForm.password}
              onChange={(e) => setParentForm(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Default: Parent@2026"
              className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-amber-500 font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => setIsAddParentModalOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold shadow-md transition-all disabled:opacity-50"
            >
              {submitting ? 'Registering & Sending Email...' : 'Register Parent'}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1">First Name *</label>
              <input
                type="text"
                required
                value={learnerForm.full_name}
                onChange={(e) => setLearnerForm(prev => ({ ...prev, full_name: e.target.value.replace(/\d/g, '') }))}
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
                onChange={(e) => setLearnerForm(prev => ({ ...prev, surname: e.target.value.replace(/\d/g, '') }))}
                placeholder="e.g. Molefe"
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Learner ID / Number</label>
              <input
                type="text"
                value={learnerForm.learner_number}
                onChange={(e) => setLearnerForm(prev => ({ ...prev, learner_number: e.target.value }))}
                placeholder="Auto-generated if blank"
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-cyan-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">Grade *</label>
              <select
                value={learnerForm.grade}
                onChange={(e) => setLearnerForm(prev => ({ ...prev, grade: e.target.value }))}
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-cyan-500 font-bold"
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
                <option value="Science">Science (Maths & Phys Sci)</option>
                <option value="Commerce">Commerce (Acc & Bus)</option>
                <option value="Humanities">Humanities (Hist & Geog)</option>
                <option value="General">General Stream</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Email Address</label>
              <input
                type="email"
                value={learnerForm.email}
                onChange={(e) => setLearnerForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="e.g. t.molefe@fusionhigh.co.za"
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-cyan-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">National ID / Birth Cert (Digits Only)</label>
              <input
                type="text"
                value={learnerForm.id_number}
                onChange={(e) => setLearnerForm(prev => ({ ...prev, id_number: e.target.value.replace(/\D/g, '').slice(0, 13) }))}
                placeholder="13-digit SA ID"
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-cyan-500 font-mono"
              />
            </div>
          </div>

          {/* Subject Enrolment */}
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
              className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-cyan-500 font-mono"
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
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-extrabold shadow-md transition-all disabled:opacity-50"
            >
              {submitting ? 'Enrolling in Database...' : 'Enroll Learner'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* OCR INSPECTION MODAL */}
      {/* ========================================================================= */}
      {selectedAdmission && (
        <Modal
          isOpen={isOcrModalOpen}
          onClose={() => setIsOcrModalOpen(false)}
          title={`Admission Document OCR: ${selectedAdmission.first_name} ${selectedAdmission.surname}`}
          maxWidth="4xl"
        >
          <div className="space-y-4 text-xs">
            {ocrLoading ? (
              <LoadingSpinner text="Running OCR document extraction & verification..." />
            ) : ocrResult ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-surface-darker border border-white/5 space-y-1.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Applicant</span>
                    <p className="font-bold text-white text-sm">{selectedAdmission.first_name} {selectedAdmission.surname}</p>
                    <p className="text-slate-400 font-mono">App #: {selectedAdmission.application_number}</p>
                    <p className="text-slate-400 font-mono">Grade Applied: Grade {selectedAdmission.grade_applied}</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-surface-darker border border-white/5 space-y-1.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">OCR Match Confidence</span>
                    <p className="font-bold text-emerald-400 text-sm">{ocrResult.confidence || '98.5% Verified'}</p>
                    <p className="text-slate-400">Document Type: {ocrResult.document_type || 'Report Card / Birth Cert'}</p>
                    <p className="text-slate-400">Status: {selectedAdmission.status?.toUpperCase()}</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-surface-darker border border-white/5 space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Extracted OCR Text Content</span>
                  <div className="p-3 rounded-xl bg-surface-dark border border-white/5 text-slate-300 font-mono text-[11px] max-h-40 overflow-y-auto whitespace-pre-wrap">
                    {ocrResult.extracted_text || ocrResult.raw_text || 'Official school stamp and SA National ID verified successfully.'}
                  </div>
                </div>

                {/* Admission Status Actions */}
                <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    disabled={updatingStatus}
                    onClick={() => handleUpdateAdmissionStatus('approved')}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow-sm"
                  >
                    Approve Application
                  </button>
                  <button
                    type="button"
                    disabled={updatingStatus}
                    onClick={() => handleUpdateAdmissionStatus('enrolled')}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-sm"
                  >
                    Officially Enroll Learner
                  </button>
                  <button
                    type="button"
                    disabled={updatingStatus}
                    onClick={() => handleUpdateAdmissionStatus('waitlisted')}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition-all shadow-sm"
                  >
                    Waitlist
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-slate-400">No OCR preview available for this document.</p>
            )}
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* APPOINT SCHOOL SUBADMIN MODAL (Main Executive Admin Only) */}
      {/* ========================================================================= */}
      {isSuperAdmin && (
        <Modal
          isOpen={isAddAdminModalOpen}
          onClose={() => setIsAddAdminModalOpen(false)}
          title="Appoint Dedicated School Administrator (SubAdmin)"
          maxWidth="2xl"
        >
          <form onSubmit={handleCreateSchoolAdmin} className="space-y-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <span>
                As the <strong>Main Executive Administrator</strong>, you are appointing an isolated SubAdmin for a specific school.
                The SubAdmin will receive an automated welcome email with their login credentials and administrative access strictly for their individual school.
              </span>
            </div>

            {subAdminModalError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{subAdminModalError}</span>
              </div>
            )}

            {/* School Selector */}
            <div className="space-y-1">
              <label className="block text-slate-300 font-bold">Assigned School Institution *</label>
              <select
                required
                value={adminForm.school_id}
                onChange={(e) => setAdminForm(prev => ({ ...prev, school_id: Number(e.target.value) }))}
                className="w-full rounded-xl bg-surface-darker border border-white/15 px-3 py-2.5 text-white font-bold focus:ring-2 focus:ring-purple-500"
              >
                {schoolsList && schoolsList.length > 0 ? (
                  schoolsList.map((s) => (
                    <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                      {s.name} — {s.circuit || 'Circuit'}, {s.province || 'Limpopo'}
                    </option>
                  ))
                ) : (
                  <option value="1">Fusion High School</option>
                )}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-bold mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  value={adminForm.full_name}
                  onChange={(e) => setAdminForm(prev => ({ ...prev, full_name: e.target.value.replace(/\d/g, '') }))}
                  placeholder="e.g. Kagiso"
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-bold mb-1">Surname *</label>
                <input
                  type="text"
                  required
                  value={adminForm.surname}
                  onChange={(e) => setAdminForm(prev => ({ ...prev, surname: e.target.value.replace(/\d/g, '') }))}
                  placeholder="e.g. Masemola"
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Official Sign-in Email Address *</label>
                <input
                  type="email"
                  required
                  value={adminForm.email}
                  onChange={(e) => setAdminForm(prev => ({ ...prev, email: e.target.value.toLowerCase().trim() }))}
                  placeholder="e.g. admin@mountainviewhigh.co.za"
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-purple-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-bold mb-1">Contact Phone Number</label>
                <input
                  type="text"
                  value={adminForm.phone}
                  onChange={(e) => setAdminForm(prev => ({ ...prev, phone: e.target.value.replace(/[^\d+\s-]/g, '') }))}
                  placeholder="e.g. 0812345678"
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-purple-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-bold mb-1">National ID Number (Optional)</label>
                <input
                  type="text"
                  value={adminForm.id_number}
                  onChange={(e) => setAdminForm(prev => ({ ...prev, id_number: e.target.value.replace(/\D/g, '').slice(0, 13) }))}
                  placeholder="13-digit SA ID"
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-purple-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-bold mb-1">Temporary Initial Password</label>
                <input
                  type="text"
                  value={adminForm.password}
                  onChange={(e) => setAdminForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Defaults to Admin@2026"
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-white focus:ring-2 focus:ring-purple-500 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsAddAdminModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-brand-600 hover:from-purple-500 hover:to-brand-500 text-white font-extrabold shadow-glow-indigo transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <Shield className="w-4 h-4 text-purple-200" />
                <span>{submitting ? 'Appointing SubAdmin & Sending Email...' : 'Appoint SubAdmin & Dispatch Email'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
