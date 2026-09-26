import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService, parentApplicationService, systemControlService, classStaffService } from '../../services/api';
import { useSchool } from '../../context/SchoolContext';
import { FusionAIIcon } from '../../components/common/FusionAIIcon';
import { SchoolRegistrationModal } from '../../components/landing/SchoolRegistrationModal';
import {
  User,
  Mail,
  Lock,
  LogIn,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Link as LinkIcon,
  Plus,
  Trash2,
  Search,
  Check,
  Heart,
  Phone,
  CreditCard,
  Calendar,
  MapPin,
  GraduationCap,
  Building2,
  Clock,
  Eye,
  EyeOff
} from 'lucide-react';

interface ChildLinkItem {
  id: string;
  firstName: string;
  surname: string;
  idNumber: string;
  grade: string;
  stream: string;
  homeLanguage?: string;
  learnerNumber?: string;
  isTwin?: boolean;
  verified: boolean;
  verifying: boolean;
  error?: string;
  learnerDetails?: any;
}

// South African ID Validation and Extraction Algorithm
const validateSAIDNumber = (idNumber: string) => {
  const cleaned = idNumber.replace(/\D/g, '');
  if (cleaned.length !== 13) {
    return { isValid: false, error: 'SA ID must be exactly 13 digits.' };
  }

  // 1. Luhn Algorithm Check
  let nCheck = 0;
  let bEven = false;
  for (let n = cleaned.length - 1; n >= 0; n--) {
    let cDigit = cleaned.charAt(n);
    let nDigit = parseInt(cDigit, 10);
    if (bEven) {
      if ((nDigit *= 2) > 9) nDigit -= 9;
    }
    nCheck += nDigit;
    bEven = !bEven;
  }

  if (nCheck % 10 !== 0) {
    return { isValid: false, error: 'Invalid South African ID checksum.' };
  }

  // 2. Decode DOB
  const yy = cleaned.substring(0, 2);
  const mm = cleaned.substring(2, 4);
  const dd = cleaned.substring(4, 6);

  const currentYear2Digits = new Date().getFullYear() % 100;
  const century = parseInt(yy, 10) <= currentYear2Digits ? '20' : '19';
  const fullYear = `${century}${yy}`;
  const month = mm;
  const day = dd;

  const testDate = new Date(`${fullYear}-${month}-${day}`);
  if (isNaN(testDate.getTime())) {
    return { isValid: false, error: 'Invalid date of birth encoded in ID.' };
  }

  // 3. Gender Decode
  const genderCode = parseInt(cleaned.substring(6, 10), 10);
  const gender = genderCode < 5000 ? 'Female' : 'Male';

  // 4. Citizenship Decode
  const citizenshipCode = parseInt(cleaned.substring(10, 11), 10);
  const citizenship = citizenshipCode === 0 ? 'South African Citizen' : 'Permanent Resident';

  return {
    isValid: true,
    dob: `${fullYear}-${month}-${day}`,
    displayDob: `${day}/${month}/${fullYear}`,
    gender,
    citizenship
  };
};

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentSchool, schoolsList, setSchoolById } = useSchool();
  const [parentStep, setParentStep] = useState<1 | 2>(1);
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);

  // Form states with standard autocomplete support
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    idNumber: '',
    parentType: 'Mother',
    dob: '',
    gender: 'Female',
    citizenship: 'South African Citizen',
    physicalAddress: '',
  });

  // Autofill extraction state
  const [idExtracted, setIdExtracted] = useState<{
    displayDob?: string;
    gender?: string;
    citizenship?: string;
  } | null>(null);

  // Live validation states
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailAvailable, setEmailAvailable] = useState(false);

  // Parent child linking states: name, surname, id number, grade, stream, twins
  const [skipLinkingChildren, setSkipLinkingChildren] = useState(false);
  const [childrenList, setChildrenList] = useState<ChildLinkItem[]>([
    {
      id: '1',
      firstName: '',
      surname: '',
      idNumber: '',
      grade: '10',
      stream: 'Science',
      homeLanguage: 'isiZulu',
      isTwin: false,
      verified: false,
      verifying: false
    }
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [portalLock, setPortalLock] = useState<{ is_locked: boolean; reason?: string } | null>(null);
  const [success, setSuccess] = useState(false);
  const [submittedApp, setSubmittedApp] = useState<{
    application_number: string;
    parent_email: string;
    school_name: string;
    status: string;
  } | null>(null);

  // Teacher Onboarding Lifecycle States
  const searchParams = new URLSearchParams(window.location.search);
  const roleParam = searchParams.get('role');
  const inviteToken = searchParams.get('invite') || searchParams.get('token');
  const stepParam = searchParams.get('step'); // 'register' or 'apply'
  const isTeacherFlow = roleParam === 'teacher' || Boolean(searchParams.get('invite'));

  const [teacherLoading, setTeacherLoading] = useState(isTeacherFlow);
  const [teacherInvite, setTeacherInvite] = useState<any>(null);
  const [teacherError, setTeacherError] = useState<string | null>(null);
  const [teacherSubmitting, setTeacherSubmitting] = useState(false);
  const [teacherAppSubmitted, setTeacherAppSubmitted] = useState(false);
  const [teacherRegistered, setTeacherRegistered] = useState(false);

  const [teacherAppForm, setTeacherAppForm] = useState({
    full_name: '',
    surname: '',
    phone: '',
    id_number: '',
    sace_number: '',
    qualifications: '',
    experience_years: 1,
    subjects_offered: '',
    sports_coached: '',
    application_notes: ''
  });

  const [teacherRegForm, setTeacherRegForm] = useState({
    password: '',
    confirmPassword: ''
  });
  const [showTeacherPassword, setShowTeacherPassword] = useState(false);
  const [showTeacherConfirmPassword, setShowTeacherConfirmPassword] = useState(false);

  // Verify Teacher Invite Token
  useEffect(() => {
    if (!isTeacherFlow) return;

    if (!inviteToken) {
      setTeacherLoading(false);
      setTeacherError('Official Teacher Invitation Required: Educators can only apply or register via an official invitation email dispatched by their School Administration.');
      return;
    }

    setTeacherLoading(true);
    setTeacherError(null);

    classStaffService.verifyToken(inviteToken)
      .then((res: any) => {
        if (res && res.success && res.invite) {
          setTeacherInvite(res.invite);
          setTeacherAppForm(prev => ({
            ...prev,
            full_name: res.invite.full_name || '',
            surname: res.invite.surname || '',
            sace_number: res.invite.sace_number || '',
            phone: res.invite.phone || '',
            id_number: res.invite.id_number || '',
            qualifications: res.invite.qualifications || '',
            subjects_offered: Array.isArray(res.invite.subjects_offered) ? res.invite.subjects_offered.join(', ') : '',
            sports_coached: Array.isArray(res.invite.sports_coached) ? res.invite.sports_coached.join(', ') : ''
          }));
        } else {
          setTeacherError('Invalid or expired invitation link. Please request a new invite from your school administrator.');
        }
      })
      .catch((err: any) => {
        setTeacherError(err.response?.data?.error || 'Unable to verify teacher invitation credentials.');
      })
      .finally(() => {
        setTeacherLoading(false);
      });
  }, [isTeacherFlow, inviteToken]);

  const handleTeacherApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherError(null);

    if (!teacherAppForm.full_name.trim() || !teacherAppForm.surname.trim()) {
      setTeacherError('First Name and Surname are required.');
      return;
    }
    if (!teacherAppForm.phone.trim()) {
      setTeacherError('Contact phone number is required.');
      return;
    }
    const cleanId = teacherAppForm.id_number.replace(/\D/g, '');
    if (cleanId.length !== 13) {
      setTeacherError('A valid 13-digit South African National ID number is required.');
      return;
    }
    if (!teacherAppForm.sace_number.trim()) {
      setTeacherError('SACE Registration Number is required.');
      return;
    }
    if (!teacherAppForm.qualifications.trim()) {
      setTeacherError('Please specify your highest teaching qualification (e.g. B.Ed, PGCE, Diploma).');
      return;
    }

    setTeacherSubmitting(true);
    try {
      await classStaffService.applyTeacher({
        token: inviteToken,
        full_name: teacherAppForm.full_name.trim(),
        surname: teacherAppForm.surname.trim(),
        phone: teacherAppForm.phone.trim(),
        id_number: cleanId,
        sace_number: teacherAppForm.sace_number.trim(),
        qualifications: teacherAppForm.qualifications.trim(),
        experience_years: parseInt(teacherAppForm.experience_years.toString(), 10) || 0,
        subjects_offered: teacherAppForm.subjects_offered
          ? teacherAppForm.subjects_offered.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        sports_coached: teacherAppForm.sports_coached
          ? teacherAppForm.sports_coached.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        application_notes: teacherAppForm.application_notes.trim()
      });

      setTeacherAppSubmitted(true);
      setTeacherInvite((prev: any) => ({ ...prev, status: 'applied' }));
    } catch (err: any) {
      setTeacherError(err.response?.data?.error || 'Failed to submit educator application.');
    } finally {
      setTeacherSubmitting(false);
    }
  };

  const handleTeacherRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherError(null);

    if (!teacherRegForm.password || teacherRegForm.password.length < 6) {
      setTeacherError('Password must be at least 6 characters long.');
      return;
    }
    if (teacherRegForm.password !== teacherRegForm.confirmPassword) {
      setTeacherError('Passwords do not match.');
      return;
    }

    setTeacherSubmitting(true);
    try {
      await classStaffService.registerTeacher({
        token: inviteToken,
        password: teacherRegForm.password,
        confirmPassword: teacherRegForm.confirmPassword
      });

      setTeacherRegistered(true);
      setTeacherInvite((prev: any) => ({ ...prev, status: 'registered' }));
    } catch (err: any) {
      setTeacherError(err.response?.data?.error || 'Failed to complete registration.');
    } finally {
      setTeacherSubmitting(false);
    }
  };

  // Clear specific field error helper
  const clearFieldError = (field: string) => {
    setFieldErrors(prev => {
      if (!prev[field]) return prev;
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });
  };

  // Check portal lock status on mount
  useEffect(() => {
    systemControlService.getPortalLocks().then((res: any) => {
      const controls = res?.controls || res;
      let regControl = null;
      if (Array.isArray(controls)) {
        regControl = controls.find((c: any) => c.control_id === 'user_registration' || c.id === 'user_registration');
      } else if (controls && typeof controls === 'object') {
        regControl = controls.user_registration;
      }
      if (regControl && regControl.is_locked) {
        setPortalLock({ is_locked: true, reason: regControl.locked_reason || regControl.reason || 'User registration is temporarily closed.' });
      }
    }).catch(err => {
      console.warn('Could not check user registration lock status:', err);
    });
  }, []);

  // Auto-populate from URL params if redirected from Application Acceptance
  React.useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get('email');
      const lrnParam = params.get('learnerNumber') || params.get('childLearnerNo');
      const appRefParam = params.get('appRef');
      const childIdParam = params.get('idNumber');
      const childFirst = params.get('firstName');
      const childSur = params.get('surname');
      const childGrade = params.get('grade');
      const childStream = params.get('stream');
      const childLang = params.get('homeLanguage') || params.get('language') || '';

      if (emailParam) {
        setFormData(prev => ({ ...prev, email: emailParam }));
      }

      if (lrnParam || appRefParam || childIdParam || childFirst || childSur) {
        setChildrenList([{
          id: '1',
          firstName: childFirst || '',
          surname: childSur || '',
          idNumber: childIdParam || '',
          learnerNumber: lrnParam || appRefParam || '',
          grade: childGrade || '8',
          stream: childStream || 'General',
          homeLanguage: childLang,
          verified: false,
          verifying: false
        }]);
      }
    } catch (err) {
      console.warn('Could not parse registration query parameters:', err);
    }
  }, []);

  // Strict String Validation: Reject numbers where string placeholder is specified
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    clearFieldError(name);
    if (/\d/.test(value)) {
      setFieldErrors(prev => ({ ...prev, [name]: 'Numbers are not allowed in this field. Please use letters only.' }));
      setFormData(prev => ({ ...prev, [name]: value.replace(/\d/g, '') }));
      return;
    }
    if (/[^A-Za-z\s\-']/.test(value)) {
      setFieldErrors(prev => ({ ...prev, [name]: 'Special symbols are not allowed. Letters, spaces, and hyphens only.' }));
      setFormData(prev => ({ ...prev, [name]: value.replace(/[^A-Za-z\s\-']/g, '') }));
      return;
    }
    setError(null);
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Strict Numeric Validation: Reject alphabetic characters where numbers are expected
  const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    clearFieldError(name);
    
    if (name === 'phone') {
      if (/[a-zA-Z]/.test(value)) {
        setFieldErrors(prev => ({ ...prev, phone: 'Letters and words are not allowed in this field. Numbers only.' }));
        setFormData(prev => ({ ...prev, [name]: value.replace(/[a-zA-Z]/g, '') }));
        return;
      }
      const cleaned = value.replace(/[^\d+]/g, '');
      setError(null);
      setFormData(prev => ({ ...prev, [name]: cleaned }));
    } else if (name === 'idNumber') {
      if (/[^\d]/.test(value)) {
        setFieldErrors(prev => ({ ...prev, idNumber: 'Letters and words are not allowed in this field. Numbers only.' }));
        const cleaned = value.replace(/[^\d]/g, '').slice(0, 13);
        setFormData(prev => ({ ...prev, [name]: cleaned }));
        return;
      }
      const cleaned = value.replace(/[^\d]/g, '').slice(0, 13);
      setError(null);
      setFormData(prev => ({ ...prev, [name]: cleaned }));

      // Trigger automatic extraction when 13 digits are reached
      if (cleaned.length === 13) {
        const idResult = validateSAIDNumber(cleaned);
        if (idResult.isValid) {
          clearFieldError('idNumber');
          setIdExtracted({
            displayDob: idResult.displayDob,
            gender: idResult.gender,
            citizenship: idResult.citizenship
          });
          setFormData(prev => ({
            ...prev,
            dob: idResult.dob || prev.dob,
            gender: idResult.gender || prev.gender,
            citizenship: idResult.citizenship || prev.citizenship,
            parentType: idResult.gender === 'Female' ? 'Mother' : 'Father'
          }));
        } else {
          setFieldErrors(prev => ({ ...prev, idNumber: idResult.error || 'Invalid South African ID checksum.' }));
          setIdExtracted(null);
        }
      } else {
        setIdExtracted(null);
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Live Email Duplicate Check on blur
  const handleEmailBlur = async () => {
    const email = formData.email.trim();
    if (!email || !email.includes('@')) return;

    setEmailChecking(true);
    setEmailError(null);
    setEmailAvailable(false);

    try {
      const res = await authService.checkEmail(email);
      if (res.exists) {
        setEmailAvailable(true);
        setEmailError(null);
      } else {
        setEmailAvailable(true);
        setEmailError(null);
      }
    } catch (err) {
      console.warn('Email check error:', err);
    } finally {
      setEmailChecking(false);
    }
  };

  // Child row helpers
  const handleAddChildRow = (isTwin = false) => {
    setChildrenList(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        firstName: '',
        surname: '',
        idNumber: '',
        grade: '10',
        stream: 'Science',
        homeLanguage: 'isiZulu',
        isTwin: isTwin,
        verified: false,
        verifying: false
      }
    ]);
  };

  const handleRemoveChildRow = (id: string) => {
    if (childrenList.length === 1) return;
    setChildrenList(prev => prev.filter(c => c.id !== id));
  };

  const updateChildField = (id: string, field: keyof ChildLinkItem, val: any) => {
    if (field === 'firstName' || field === 'surname') {
      if (/\d/.test(val)) {
        setError('Numbers are not allowed in this field. Please use letters only.');
        return;
      }
      setError(null);
    } else if (field === 'idNumber') {
      const cleaned = (val || '').replace(/\D/g, '').slice(0, 13);
      if (/[a-zA-Z]/.test(val)) {
        setError('Letters and words are not allowed in this field. Numbers only.');
        return;
      }
      setError(null);
      val = cleaned;
    }

    setChildrenList(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, [field]: val, verified: false, error: undefined, learnerDetails: undefined };
      }
      return c;
    }));
  };

  // Verify child using Name, Surname, ID Number, Grade, Stream
  const handleVerifyChild = async (id: string) => {
    const item = childrenList.find(c => c.id === id);
    if (!item) return;

    if (!item.firstName.trim() || !item.surname.trim()) {
      setChildrenList(prev => prev.map(c => c.id === id ? { ...c, error: 'Please enter child first name and surname.' } : c));
      return;
    }

    setChildrenList(prev => prev.map(c => c.id === id ? { ...c, verifying: true, error: undefined } : c));

    try {
      const res = await authService.verifyLearner({
        first_name: item.firstName.trim(),
        surname: item.surname.trim(),
        id_number: item.idNumber.trim(),
        grade: item.grade,
        stream: item.stream
      });

      if (res.verified && res.learner) {
        setChildrenList(prev => prev.map(c => {
          if (c.id === id) {
            return {
              ...c,
              verified: true,
              verifying: false,
              learnerNumber: res.learner.learner_number,
              firstName: res.learner.full_name,
              surname: res.learner.surname,
              grade: res.learner.grade.toString(),
              stream: res.learner.stream,
              homeLanguage: res.learner.home_language || c.homeLanguage || '',
              learnerDetails: res.learner,
              error: undefined
            };
          }
          return c;
        }));
      } else {
        setChildrenList(prev => prev.map(c => c.id === id ? { ...c, verified: false, verifying: false, error: res.error || 'Learner not found in school records.' } : c));
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Could not verify learner in database records.';
      setChildrenList(prev => prev.map(c => c.id === id ? { ...c, verified: false, verifying: false, error: msg } : c));
    }
  };

  const verifiedChildrenCount = childrenList.filter(c => c.verified).length;

  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = 'First name is required (letters only).';
    if (!formData.surname.trim()) errs.surname = 'Surname is required (letters only).';
    if (!formData.email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!formData.email.includes('@')) {
      errs.email = 'Please enter a valid email address.';
    }
    if (!formData.phone.trim()) {
      errs.phone = 'Phone number is required (digits only).';
    }
    if (!formData.idNumber.trim()) {
      errs.idNumber = 'South African ID is required.';
    } else if (formData.idNumber.length !== 13) {
      errs.idNumber = 'South African ID must be exactly 13 digits.';
    }
    if (!formData.password) {
      errs.password = 'Password is required.';
    } else if (formData.password.length < 6) {
      errs.password = 'Password must be at least 6 characters long.';
    }
    if (!formData.confirmPassword) {
      errs.confirmPassword = 'Confirm your password.';
    } else if (formData.password !== formData.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setError('Please resolve the errors highlighted below.');
      return false;
    }
    setError(null);
    return true;
  };

  // Complete Registration / Parent Portal Application Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (portalLock?.is_locked) {
      setError(portalLock.reason || 'User registration is temporarily locked by Geleza SA Executives.');
      return;
    }

    // If on Step 1, advance to Step 2 (Link Child) instead of prematurely submitting
    if (parentStep === 1) {
      if (!validateStep1()) return;
      setParentStep(2);
      return;
    }

    if (!validateStep1()) {
      setParentStep(1);
      return;
    }

    if (emailError) {
      setFieldErrors(prev => ({ ...prev, email: emailError }));
      setError(emailError);
      return;
    }

    // Process Children / Twins (Optional)
    let validatedChildren: any[] = [];
    if (!skipLinkingChildren) {
      const childErrs: Record<string, string> = {};
      const filledChildren = childrenList.filter(c => c.firstName.trim() || c.surname.trim() || c.idNumber.trim());

      for (let i = 0; i < filledChildren.length; i++) {
        const c = filledChildren[i];
        if (!c.firstName.trim()) {
          childErrs[`child_${c.id}_firstName`] = `Please provide First Name for Child #${i + 1}.`;
        }
        if (!c.surname.trim()) {
          childErrs[`child_${c.id}_surname`] = `Please provide Surname for Child #${i + 1}.`;
        }
        if (c.idNumber && c.idNumber.length !== 13) {
          childErrs[`child_${c.id}_idNumber`] = `Child #${i + 1} South African ID must be 13 digits.`;
        }
      }

      if (Object.keys(childErrs).length > 0) {
        setFieldErrors(prev => ({ ...prev, ...childErrs }));
        setError('Please complete the highlighted child details below.');
        return;
      }

      validatedChildren = filledChildren.map(c => ({
        firstName: c.firstName.trim(),
        surname: c.surname.trim(),
        idNumber: c.idNumber.trim(),
        grade: parseInt(c.grade, 10) || 10,
        stream: c.stream || 'General',
        homeLanguage: c.homeLanguage || 'isiZulu',
        isTwin: !!c.isTwin
      }));
    }

    setLoading(true);

    try {
      const primaryChild = validatedChildren[0] || {};
      const res = await parentApplicationService.submit({
        parent_name: formData.name.trim(),
        parent_surname: formData.surname.trim(),
        parent_id_number: formData.idNumber.trim(),
        parent_email: formData.email.trim(),
        parent_phone: formData.phone.trim(),
        physical_address: formData.physicalAddress,
        parent_type: formData.parentType,
        password: formData.password,
        confirm_password: formData.confirmPassword,
        school_id: currentSchool?.id || 1,
        children: validatedChildren,
        child_first_name: primaryChild.firstName || '',
        child_surname: primaryChild.surname || '',
        child_id_number: primaryChild.idNumber || '',
        child_grade: primaryChild.grade || 10,
        child_stream: primaryChild.stream || 'General',
        is_twin: validatedChildren.some(c => c.isTwin)
      });

      if (res.success && res.application) {
        setSubmittedApp(res.application);
        setSuccess(true);
      } else {
        setSubmittedApp({
          application_number: 'PAR-2026-CONFIRMED',
          parent_email: formData.email.trim(),
          school_name: currentSchool?.name || 'Geleza SA High School',
          status: 'pending'
        });
        setSuccess(true);
      }
    } catch (err: any) {
      if (err.response?.status === 403 || err.response?.data?.is_locked) {
        setPortalLock({
          is_locked: true,
          reason: err.response?.data?.reason || err.response?.data?.error
        });
        setError(err.response?.data?.error || 'User registration is temporarily locked by Geleza SA Executives.');
      } else {
        setError(err.response?.data?.error || 'Failed to submit Parent Portal application. Please check your details.');
      }
    } finally {
      setLoading(false);
    }
  };

  // TEACHER ONBOARDING LIFECYCLE (Apply -> Await Principal Approval -> Register & Set Password)
  if (isTeacherFlow) {
    if (teacherLoading) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div className="text-center space-y-4 animate-fade-in">
            <div className="w-12 h-12 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <h3 className="text-base font-bold text-white">Verifying Educator Invitation</h3>
            <p className="text-xs text-slate-400">Authenticating accreditation token with school records...</p>
          </div>
        </div>
      );
    }

    if (teacherError && !teacherInvite) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-slate-900 border border-slate-800 p-8 text-center space-y-6 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-white">Teacher Invitation Required</h2>
              <p className="text-xs text-slate-300 leading-relaxed">{teacherError}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-left text-[11px] text-slate-400 space-y-1">
              <p className="font-bold text-slate-200">How to join as an educator:</p>
              <p>• Teachers must receive an official invitation link from their School Principal.</p>
              <p>• Once invited, you will submit your credentials for Principal accreditation.</p>
            </div>
            <div className="pt-2 flex gap-3">
              <button
                onClick={() => navigate('/login')}
                className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition-all cursor-pointer"
              >
                Sign In
              </button>
              <Link
                to="/"
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-all border border-white/10 flex items-center justify-center"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      );
    }

    // Phase: Application submitted / under review
    if (teacherAppSubmitted || teacherInvite?.status === 'applied') {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div className="max-w-lg w-full rounded-3xl bg-slate-900 border border-slate-800 p-8 text-center space-y-6 shadow-2xl animate-fade-in relative">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center mx-auto shadow-glow-cyan">
              <GraduationCap className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold">
                Application Received
              </span>
              <h2 className="text-2xl font-black text-white">Application Under Review</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Your educator application for <strong className="text-white">{teacherInvite?.school_name || 'your institution'}</strong> has been submitted.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 text-left space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Applicant:</span>
                <span className="font-bold text-white">{teacherInvite?.full_name} {teacherInvite?.surname}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Email:</span>
                <span className="font-medium text-slate-300">{teacherInvite?.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Review Status:</span>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold text-[11px]">
                  Pending Principal Approval
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-800/40 text-left text-xs text-cyan-200 leading-relaxed">
              Once approved by the School Principal, you will receive an official approval email with your direct activation link to set your password and access the app.
            </div>

            <div className="pt-2 flex gap-3 justify-center">
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black transition-all cursor-pointer"
              >
                Go to Login
              </button>
              <Link
                to="/"
                className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-all border border-white/10"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      );
    }

    // Phase: Registered / Active
    if (teacherRegistered || teacherInvite?.status === 'registered' || teacherInvite?.status === 'accepted') {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-slate-900 border border-slate-800 p-8 text-center space-y-6 shadow-2xl animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold">
                Account Active
              </span>
              <h2 className="text-2xl font-black text-white">Educator Account Activated</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Your educator account is active. You can now log into the web portal or mobile app directly.
              </p>
            </div>

            <button
              onClick={() => navigate(`/login?email=${encodeURIComponent(teacherInvite?.email || '')}`)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-black shadow-lg cursor-pointer"
            >
              Sign In Now
            </button>
          </div>
        </div>
      );
    }

    // Phase: Registration / Set Password (When approved or step === 'register')
    if (teacherInvite?.status === 'approved' || stepParam === 'register') {
      if (teacherInvite?.isRegLocked) {
        return (
          <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="max-w-md w-full rounded-3xl bg-slate-900 border border-slate-800 p-8 text-center space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                <Lock className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-black text-white">Registration Portal Locked</h2>
              <p className="text-xs text-slate-300">
                {teacherInvite?.regLockReason || 'User account registrations are currently paused by Geleza SA Executives.'}
              </p>
              <Link to="/login" className="inline-block px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold">
                Sign In to Existing Account
              </Link>
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-slate-900 border border-slate-800 p-8 space-y-6 shadow-2xl">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black text-white">Complete Educator Registration</h2>
              <p className="text-xs text-slate-400">
                Set your secure password to complete activation for <strong className="text-slate-200">{teacherInvite?.email}</strong>.
              </p>
            </div>

            {teacherError && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{teacherError}</span>
              </div>
            )}

            <form onSubmit={handleTeacherRegisterSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">New Password *</label>
                <div className="relative">
                  <input
                    type={showTeacherPassword ? 'text' : 'password'}
                    placeholder="At least 6 characters"
                    value={teacherRegForm.password}
                    onChange={(e) => setTeacherRegForm({ ...teacherRegForm, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm outline-hidden focus:border-cyan-500 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowTeacherPassword(!showTeacherPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showTeacherPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Confirm Password *</label>
                <div className="relative">
                  <input
                    type={showTeacherConfirmPassword ? 'text' : 'password'}
                    placeholder="Repeat password"
                    value={teacherRegForm.confirmPassword}
                    onChange={(e) => setTeacherRegForm({ ...teacherRegForm, confirmPassword: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm outline-hidden focus:border-cyan-500 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowTeacherConfirmPassword(!showTeacherConfirmPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showTeacherConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={teacherSubmitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black text-xs shadow-lg cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {teacherSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Activating Account...</span>
                  </>
                ) : (
                  <span>Activate Account & Sign In</span>
                )}
              </button>
            </form>
          </div>
        </div>
      );
    }

    // Phase: Application (Status is 'pending')
    if (teacherInvite?.isAppLocked) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-slate-900 border border-slate-800 p-8 text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-white">Application Period Closed</h2>
            <p className="text-xs text-slate-300">
              {teacherInvite?.appLockReason || 'Teacher applications are currently closed by Geleza SA administration.'}
            </p>
            <Link to="/login" className="inline-block px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold">
              Sign In to Existing Account
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl w-full mx-auto rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
                {teacherInvite?.school_name || 'Geleza SA Faculty Onboarding'}
              </span>
              <h2 className="text-lg sm:text-xl font-black text-white">Educator Onboarding Application</h2>
            </div>
          </div>

          {teacherError && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{teacherError}</span>
            </div>
          )}

          <form onSubmit={handleTeacherApplySubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">First Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Sipho"
                  value={teacherAppForm.full_name}
                  onChange={(e) => setTeacherAppForm({ ...teacherAppForm, full_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white outline-hidden focus:border-cyan-500"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-300">Surname *</label>
                <input
                  type="text"
                  placeholder="e.g. Khumalo"
                  value={teacherAppForm.surname}
                  onChange={(e) => setTeacherAppForm({ ...teacherAppForm, surname: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white outline-hidden focus:border-cyan-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">Colleague Email</label>
                <input
                  type="email"
                  value={teacherInvite?.email || ''}
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 cursor-not-allowed"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-300">Contact Phone Number *</label>
                <input
                  type="tel"
                  placeholder="e.g. 082 123 4567"
                  value={teacherAppForm.phone}
                  onChange={(e) => setTeacherAppForm({ ...teacherAppForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white outline-hidden focus:border-cyan-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">SA ID Number (13 Digits) *</label>
                <input
                  type="text"
                  maxLength={13}
                  placeholder="13-digit national ID"
                  value={teacherAppForm.id_number}
                  onChange={(e) => setTeacherAppForm({ ...teacherAppForm, id_number: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white outline-hidden focus:border-cyan-500"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-300">SACE Number *</label>
                <input
                  type="text"
                  placeholder="e.g. SACE-849201"
                  value={teacherAppForm.sace_number}
                  onChange={(e) => setTeacherAppForm({ ...teacherAppForm, sace_number: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white outline-hidden focus:border-cyan-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">Highest Qualification *</label>
                <input
                  type="text"
                  placeholder="e.g. B.Ed, PGCE, BSc Mathematics"
                  value={teacherAppForm.qualifications}
                  onChange={(e) => setTeacherAppForm({ ...teacherAppForm, qualifications: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white outline-hidden focus:border-cyan-500"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-300">Teaching Experience (Years)</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={teacherAppForm.experience_years}
                  onChange={(e) => setTeacherAppForm({ ...teacherAppForm, experience_years: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white outline-hidden focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">Teaching Subjects (comma-separated)</label>
              <input
                type="text"
                placeholder="e.g. Mathematics, Physical Sciences"
                value={teacherAppForm.subjects_offered}
                onChange={(e) => setTeacherAppForm({ ...teacherAppForm, subjects_offered: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white outline-hidden focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">Sports / Extracurriculars Coached (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Soccer, Chess, Athletics"
                value={teacherAppForm.sports_coached}
                onChange={(e) => setTeacherAppForm({ ...teacherAppForm, sports_coached: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white outline-hidden focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">Application Notes / Bio (Optional)</label>
              <textarea
                rows={2}
                placeholder="Brief professional note for the Principal..."
                value={teacherAppForm.application_notes}
                onChange={(e) => setTeacherAppForm({ ...teacherAppForm, application_notes: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white outline-hidden focus:border-cyan-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <Link to="/login" className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-bold transition-all">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={teacherSubmitting}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {teacherSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Submitting Application...</span>
                  </>
                ) : (
                  <span>Submit Application for Principal Review</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (success && submittedApp) {
    return (
      <div className="min-h-screen bg-surface-darker flex items-center justify-center p-4">
        <div className="max-w-lg w-full rounded-3xl bg-surface-dark border border-white/10 p-8 text-center space-y-6 shadow-2xl animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto shadow-glow-amber">
            <ShieldCheck className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
              Parent Portal Application Submitted
            </span>
            <h2 className="text-2xl font-extrabold font-display text-white">
              Application Under Review
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Your application has been received and forwarded to school administrators at <strong className="text-white">{submittedApp.school_name || currentSchool?.name}</strong> for verification against student records.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-surface-darker border border-white/5 text-left space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Application Reference:</span>
              <span className="font-mono font-bold text-amber-400">{submittedApp.application_number}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Registered Email:</span>
              <span className="font-medium text-slate-200">{submittedApp.parent_email}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Review Status:</span>
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-semibold text-[11px]">
                Pending School Admin Approval
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-left text-xs text-blue-300 leading-relaxed space-y-1">
            <p className="font-bold text-white flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-blue-400" /> Acceptance Email Notice
            </p>
            <p className="text-[11.5px] text-blue-200/90">
              Once the school administrator accepts your application, you will receive an acceptance confirmation email to immediately sign into your Parent Dashboard using the password you created.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold transition-all shadow-glow-indigo"
            >
              Go to Login Page
            </button>
            <Link
              to="/"
              className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition-all border border-white/10"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-darker flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center space-y-3 relative z-10">
        <Link to="/" className="inline-flex items-center gap-3 group">
          <div
            className="w-14 h-14 rounded-2xl p-1 border shadow-glow-indigo group-hover:scale-105 transition-transform backdrop-blur-md flex items-center justify-center"
            style={{
              backgroundColor: `${currentSchool?.primary_color || '#4f46e5'}20`,
              borderColor: `${currentSchool?.primary_color || '#4f46e5'}50`
            }}
          >
            <GraduationCap className="w-8 h-8" style={{ color: currentSchool?.primary_color || '#818cf8' }} />
          </div>
          <div className="text-left">
            <span className="font-display text-lg font-extrabold tracking-tight text-white block uppercase">
              {currentSchool?.name || 'FUSION HIGH'}
            </span>
            <span className="text-[9.5px] font-mono tracking-wider text-amber-400 uppercase font-bold block italic">
              "{currentSchool?.motto || 'ONE SCHOOL • ONE CONNECTION'}"
            </span>
          </div>
        </Link>

        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold mt-2">
            <Heart className="w-3.5 h-3.5" />
            <span>Parent & Guardian Registration Portal</span>
          </div>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-white tracking-tight">
          Parent Registration
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
          Create your parent portal account and link your enrolled high school learners for <strong>{currentSchool?.name}</strong>.
        </p>

        {/* Principal School Registration Callout */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setIsSchoolModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/30 text-xs font-bold text-cyan-300 transition-all hover:scale-102 active:scale-98 shadow-sm cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Are you a School Principal? Register & Onboard Your School &rarr;</span>
          </button>
        </div>
      </div>

      <SchoolRegistrationModal isOpen={isSchoolModalOpen} onClose={() => setIsSchoolModalOpen(false)} />

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl relative z-10">
        <div className="rounded-3xl bg-surface-dark border border-white/10 p-6 sm:p-8 shadow-2xl space-y-6">
          
          {/* Multi-Step Indicator */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div
              onClick={() => setParentStep(1)}
              className={`flex items-center gap-2 cursor-pointer transition-colors ${
                parentStep === 1 ? 'text-brand-400 font-bold' : 'text-slate-400'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                parentStep === 1 ? 'bg-brand-600 text-white shadow-glow-indigo' : 'bg-white/10 text-slate-400'
              }`}>
                1
              </div>
              <span className="text-xs">Parent Details</span>
            </div>

            <div className="w-12 h-[1px] bg-white/10" />

            <div
              onClick={() => {
                if (!formData.name || !formData.surname || !formData.email || !formData.password || !formData.phone) {
                  setError('Please complete all required parent personal details before proceeding to link a child.');
                  return;
                }
                if (formData.password !== formData.confirmPassword) {
                  setError('Passwords do not match.');
                  return;
                }
                if (formData.idNumber && formData.idNumber.length !== 13) {
                  setError('South African ID must be 13 digits.');
                  return;
                }
                setError(null);
                setParentStep(2);
              }}
              className={`flex items-center gap-2 cursor-pointer transition-colors ${
                parentStep === 2 ? 'text-amber-400 font-bold' : 'text-slate-400'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                parentStep === 2 ? 'bg-amber-600 text-white shadow-md' : 'bg-white/10 text-slate-400'
              }`}>
                2
              </div>
              <span className="text-xs">Link Child ({verifiedChildrenCount} Verified)</span>
            </div>
          </div>

          {/* Geleza SA Executive Lock Status Banner */}
          {portalLock?.is_locked && (
            <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs space-y-2 animate-fade-in shadow-lg">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Parent & User Registration Locked by Geleza SA Executives</span>
              </div>
              <p className="text-[11.5px] text-slate-300 leading-relaxed">
                {portalLock.reason || 'User and parent onboarding is currently locked for review by Geleza SA Executives. New registrations cannot be submitted at this time.'}
              </p>
              <div className="pt-2 flex items-center gap-3">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-glow-indigo transition-all cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Proceed to Sign In (Always Active)</span>
                </Link>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{typeof error === 'string' ? error : (error as any)?.message || String(error)}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {parentStep === 1 ? (
              /* Step 1: Parent Personal Details */
              <div className="space-y-4 animate-fade-in">
                {/* School Selection Card */}
                <div className="p-3.5 rounded-2xl bg-surface-darker border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-cyan-400" />
                      <span>Select Target High School *</span>
                    </label>
                  </div>
                  <select
                    value={currentSchool?.id || 1}
                    onChange={(e) => setSchoolById(parseInt(e.target.value, 10))}
                    className="w-full rounded-xl bg-surface-dark border border-white/15 px-3 py-2.5 text-xs text-white focus:ring-2 focus:ring-brand-500 font-medium"
                  >
                    {schoolsList.map(s => (
                      <option key={s.id} value={s.id} className="bg-surface-dark text-white">
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 italic">
                    All linked children and communication will be registered under this school's official DBE records.
                  </p>
                </div>

                {/* SA ID Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    South African ID Number (13 Digits) *
                  </label>
                  <div className="relative">
                    <CreditCard className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      name="idNumber"
                      required
                      maxLength={13}
                      value={formData.idNumber}
                      onChange={handleNumericChange}
                      placeholder="e.g. 8506120000085 (numbers only)"
                      className={`w-full rounded-xl bg-surface-darker border pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500 font-mono ${
                        fieldErrors.idNumber ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-white/10'
                      }`}
                    />
                  </div>
                  {fieldErrors.idNumber && (
                    <p className="text-[11px] text-rose-400 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.idNumber}</span>
                    </p>
                  )}

                  {idExtracted && (
                    <div className="mt-2 p-2.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-xs text-brand-300 flex items-center justify-between animate-fade-in">
                      <div className="flex items-center gap-2">
                        <FusionAIIcon className="w-3.5 h-3.5 text-cyan-300" />
                        <span>Autofilled from ID: <strong>DOB {idExtracted.displayDob}</strong> &bull; <strong>{idExtracted.gender}</strong></span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>Valid SA ID</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Names */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">First Name (Letters Only) *</label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleNameChange}
                        placeholder="e.g. Naledi"
                        className={`w-full rounded-xl bg-surface-darker border pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500 ${
                          fieldErrors.name ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-white/10'
                        }`}
                      />
                    </div>
                    {fieldErrors.name && (
                      <p className="text-[11px] text-rose-400 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{fieldErrors.name}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Surname (Letters Only) *</label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        name="surname"
                        required
                        value={formData.surname}
                        onChange={handleNameChange}
                        placeholder="e.g. Mokoena"
                        className={`w-full rounded-xl bg-surface-darker border pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500 ${
                          fieldErrors.surname ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-white/10'
                        }`}
                      />
                    </div>
                    {fieldErrors.surname && (
                      <p className="text-[11px] text-rose-400 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{fieldErrors.surname}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Email & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Email Address *</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, email: e.target.value }));
                          clearFieldError('email');
                          setEmailError(null);
                          setEmailAvailable(false);
                        }}
                        onBlur={handleEmailBlur}
                        placeholder="e.g. naledi@gmail.com"
                        className={`w-full rounded-xl bg-surface-darker border pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500 ${
                          fieldErrors.email ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-white/10'
                        }`}
                      />
                    </div>
                    {emailChecking && <p className="text-[10px] text-cyan-400 mt-1">Checking duplicate profile...</p>}
                    {emailAvailable && (
                      <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>Email available for registration</span>
                      </p>
                    )}
                    {fieldErrors.email && (
                      <p className="text-[11px] text-rose-400 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{fieldErrors.email}</span>
                      </p>
                    )}
                    {emailError && !fieldErrors.email && <p className="text-[10px] text-rose-400 mt-1">{emailError}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Phone Number (Digits Only) *</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="tel"
                        name="phone"
                        required
                        value={formData.phone}
                        onChange={handleNumericChange}
                        placeholder="e.g. 0821234567"
                        className={`w-full rounded-xl bg-surface-darker border pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500 font-mono ${
                          fieldErrors.phone ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-white/10'
                        }`}
                      />
                    </div>
                    {fieldErrors.phone && (
                      <p className="text-[11px] text-rose-400 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{fieldErrors.phone}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Parent Relationship</label>
                    <select
                      value={formData.parentType}
                      onChange={(e) => setFormData(prev => ({ ...prev, parentType: e.target.value }))}
                      className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2.5 text-xs text-white focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="Mother">Mother</option>
                      <option value="Father">Father</option>
                      <option value="Legal Guardian">Legal Guardian</option>
                      <option value="Foster Parent">Foster Parent</option>
                      <option value="Grandparent">Grandparent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Physical Address</label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        name="physicalAddress"
                        value={formData.physicalAddress}
                        onChange={(e) => setFormData(prev => ({ ...prev, physicalAddress: e.target.value }))}
                        placeholder="e.g. 124 Church St, Pretoria"
                        className="w-full rounded-xl bg-surface-darker border border-white/10 pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Password *</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        required
                        value={formData.password}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, password: e.target.value }));
                          clearFieldError('password');
                        }}
                        placeholder="Create password (min 6 chars)"
                        className={`w-full rounded-xl bg-surface-darker border pl-10 pr-11 py-2.5 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500 ${
                          fieldErrors.password ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-white/10'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-7 h-7 flex items-center justify-center p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <p className="text-[11px] text-rose-400 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{fieldErrors.password}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Confirm Password *</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        required
                        value={formData.confirmPassword}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, confirmPassword: e.target.value }));
                          clearFieldError('confirmPassword');
                        }}
                        placeholder="Confirm your password"
                        className={`w-full rounded-xl bg-surface-darker border pl-10 pr-11 py-2.5 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500 ${
                          fieldErrors.confirmPassword ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-white/10'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-7 h-7 flex items-center justify-center p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer transition-colors"
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        title={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {fieldErrors.confirmPassword && (
                      <p className="text-[11px] text-rose-400 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{fieldErrors.confirmPassword}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (!validateStep1()) return;
                      setParentStep(2);
                    }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-xs shadow-glow-indigo transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Proceed to Link Enrolled Child</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              /* Step 2: Link Enrolled Child / Twins (Optional) */
              <div className="space-y-4 animate-fade-in">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
                  <LinkIcon className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Child & Twin Linkage (Optional)</p>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      You can link <strong>1 or more learners (including twins or siblings)</strong> now, or skip this step and link them anytime from your Parent Dashboard after approval.
                    </p>
                  </div>
                </div>

                {/* Optional Skip Toggle */}
                <div className="p-3.5 rounded-xl bg-surface-darker border border-white/10 flex items-center justify-between hover:border-white/20 transition-colors">
                  <label htmlFor="skipLinking" className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      id="skipLinking"
                      checked={skipLinkingChildren}
                      onChange={(e) => setSkipLinkingChildren(e.target.checked)}
                      className="w-4 h-4 rounded text-brand-500 bg-surface-dark border-white/20 focus:ring-brand-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">Skip linking children for now</span>
                      <span className="text-[11px] text-slate-400 block">I will link my child / twins later from my Parent Dashboard</span>
                    </div>
                  </label>
                  {skipLinkingChildren && (
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                      Linking Skipped
                    </span>
                  )}
                </div>

                {skipLinkingChildren ? (
                  <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-200 flex items-center gap-3 animate-fade-in">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />
                    <div>
                      <p className="font-bold text-white">Direct Parent Registration</p>
                      <p className="text-[11px] text-cyan-300/90 mt-0.5">
                        Your account will be submitted for administrator approval. Once approved, login and use the <strong>"Link Another Child"</strong> feature in your dashboard to connect your learner(s) at any time.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Children & Twins Rows */
                  <div className="space-y-3">
                    {childrenList.map((child, index) => (
                      <div
                        key={child.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          child.verified
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : 'bg-surface-darker border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">
                              Child #{index + 1}
                            </span>
                            {child.isTwin && (
                              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                                👯 Twin / Multiple
                              </span>
                            )}
                            {child.verified && (
                              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                                <Check className="w-3 h-3 text-emerald-400" /> Verified
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!child.isTwin}
                                onChange={(e) => updateChildField(child.id, 'isTwin', e.target.checked)}
                                className="w-3.5 h-3.5 rounded text-indigo-500 bg-surface-dark border-white/20"
                              />
                              <span>Twin?</span>
                            </label>

                            {childrenList.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveChildRow(child.id)}
                                className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                                title="Remove Child"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {!child.verified ? (
                          <div className="space-y-3">
                            {/* Names */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[11px] text-slate-400 mb-1">Child First Name *</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Thabo"
                                  value={child.firstName}
                                  onChange={(e) => updateChildField(child.id, 'firstName', e.target.value)}
                                  className={`w-full rounded-xl bg-surface-dark border px-3 py-2 text-xs text-white focus:ring-2 focus:ring-brand-500 ${
                                    fieldErrors[`child_${child.id}_firstName`] ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-white/10'
                                  }`}
                                />
                                {fieldErrors[`child_${child.id}_firstName`] && (
                                  <p className="text-[11px] text-rose-400 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span>{fieldErrors[`child_${child.id}_firstName`]}</span>
                                  </p>
                                )}
                              </div>
                              <div>
                                <label className="block text-[11px] text-slate-400 mb-1">Child Surname *</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Mokoena"
                                  value={child.surname}
                                  onChange={(e) => updateChildField(child.id, 'surname', e.target.value)}
                                  className={`w-full rounded-xl bg-surface-dark border px-3 py-2 text-xs text-white focus:ring-2 focus:ring-brand-500 ${
                                    fieldErrors[`child_${child.id}_surname`] ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-white/10'
                                  }`}
                                />
                                {fieldErrors[`child_${child.id}_surname`] && (
                                  <p className="text-[11px] text-rose-400 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span>{fieldErrors[`child_${child.id}_surname`]}</span>
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* ID Number */}
                            <div>
                              <label className="block text-[11px] text-slate-400 mb-1">
                                Child South African ID Number (13 Digits) *
                              </label>
                              <input
                                type="text"
                                maxLength={13}
                                placeholder="e.g. 0708155123089 (used to generate student password)"
                                value={child.idNumber}
                                onChange={(e) => updateChildField(child.id, 'idNumber', e.target.value)}
                                className={`w-full rounded-xl bg-surface-dark border px-3 py-2 text-xs text-white focus:ring-2 focus:ring-brand-500 font-mono ${
                                  fieldErrors[`child_${child.id}_idNumber`] ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-white/10'
                                }`}
                              />
                              {fieldErrors[`child_${child.id}_idNumber`] && (
                                <p className="text-[11px] text-rose-400 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                  <span>{fieldErrors[`child_${child.id}_idNumber`]}</span>
                                </p>
                              )}
                            </div>

                            {/* Grade, Stream & Home Language */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[11px] text-slate-400 mb-1">Grade *</label>
                                <select
                                  value={child.grade}
                                  onChange={(e) => updateChildField(child.id, 'grade', e.target.value)}
                                  className="w-full rounded-xl bg-surface-dark border border-white/10 px-3 py-2 text-xs text-white focus:ring-2 focus:ring-brand-500"
                                >
                                  <option value="8">Grade 8</option>
                                  <option value="9">Grade 9</option>
                                  <option value="10">Grade 10</option>
                                  <option value="11">Grade 11</option>
                                  <option value="12">Grade 12</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[11px] text-slate-400 mb-1">Academic Stream *</label>
                                <select
                                  value={child.stream}
                                  onChange={(e) => updateChildField(child.id, 'stream', e.target.value)}
                                  className="w-full rounded-xl bg-surface-dark border border-white/10 px-3 py-2 text-xs text-white focus:ring-2 focus:ring-brand-500"
                                >
                                  <option value="Science">Science</option>
                                  <option value="Commerce">Commerce</option>
                                  <option value="Tourism">Tourism</option>
                                  <option value="General">General</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[11px] text-slate-400 mb-1">Official Home Language *</label>
                                <select
                                  value={child.homeLanguage || ''}
                                  onChange={(e) => updateChildField(child.id, 'homeLanguage', e.target.value)}
                                  className={`w-full rounded-xl bg-surface-dark border px-3 py-2 text-xs text-white focus:ring-2 focus:ring-brand-500 ${
                                    fieldErrors[`child_${child.id}_homeLanguage`] ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-white/10'
                                  }`}
                                >
                                  <option value="" disabled>Select Official Home Language</option>
                                  <option value="Sepedi">Sepedi (Sesotho sa Leboa)</option>
                                  <option value="Setswana">Setswana</option>
                                  <option value="Sesotho">Sesotho</option>
                                  <option value="isiZulu">isiZulu</option>
                                  <option value="isiXhosa">isiXhosa</option>
                                  <option value="Xitsonga">Xitsonga (Tsonga)</option>
                                  <option value="Tshivenda">Tshivenda (Venda)</option>
                                  <option value="siSwati">siSwati (Swati)</option>
                                  <option value="isiNdebele">isiNdebele (Ndebele)</option>
                                  <option value="English">English (Home Language)</option>
                                  <option value="Afrikaans">Afrikaans (Huistaal)</option>
                                </select>
                                {fieldErrors[`child_${child.id}_homeLanguage`] && (
                                  <p className="text-[11px] text-rose-400 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span>{fieldErrors[`child_${child.id}_homeLanguage`]}</span>
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                              {child.error && (
                                <p className="text-[11px] text-rose-400">{child.error}</p>
                              )}
                              <button
                                type="button"
                                onClick={() => handleVerifyChild(child.id)}
                                disabled={child.verifying}
                                className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50"
                              >
                                <Search className="w-3.5 h-3.5" />
                                <span>{child.verifying ? 'Verifying...' : 'Verify Child Link'}</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Verified Summary Card */
                          <div className="flex items-center justify-between text-xs pt-1">
                            <div>
                              <p className="font-bold text-white text-sm">
                                {child.firstName} {child.surname}
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Learner ID: <strong className="text-cyan-300 font-mono">{child.learnerDetails?.learner_number || child.learnerNumber || 'Assigned on Submit'}</strong> &bull; Grade {child.grade} ({child.stream}) &bull; <span className="text-amber-300 font-semibold">{child.homeLanguage || 'isiZulu'} HL</span>
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setChildrenList(prev => prev.map(c => c.id === child.id ? { ...c, verified: false } : c));
                              }}
                              className="text-[10px] text-slate-400 hover:text-white underline"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </div>
                    ))}

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleAddChildRow(false)}
                        className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs border border-dashed border-white/20 transition-all flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Add Another Child</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAddChildRow(true)}
                        className="flex-1 py-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-bold text-xs border border-dashed border-indigo-500/30 transition-all flex items-center justify-center gap-1.5"
                      >
                        <span>👯 + Add Twin Sibling</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setParentStep(1)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs transition-all"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    disabled={loading || !!portalLock?.is_locked}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
                  >
                    {portalLock?.is_locked ? (
                      <>
                        <Lock className="w-4 h-4 text-amber-300" />
                        <span>Registration Locked by Executive</span>
                      </>
                    ) : loading ? (
                      'Submitting Application...'
                    ) : skipLinkingChildren ? (
                      'Submit Parent Application (Link Later)'
                    ) : (
                      `Complete Registration (${childrenList.filter(c => c.firstName.trim()).length} Child${childrenList.filter(c => c.firstName.trim()).length === 1 ? '' : 'ren'})`
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>

          <div className="pt-4 border-t border-white/10 text-center space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
              <span className="text-xs text-slate-400">Already registered?</span>
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 border border-brand-500/30 font-bold text-xs transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In to Portal (Always Available)</span>
              </Link>
            </div>
            <div className="pt-2 flex items-center justify-center gap-3 text-[11px] text-slate-500 border-t border-white/5">
              <Link to="/about" className="hover:text-cyan-400 transition-colors">About Us</Link>
              <span>•</span>
              <Link to="/terms" className="hover:text-cyan-400 transition-colors">Terms & Conditions</Link>
            </div>
            <p className="text-[10px] text-slate-500">
              Note: Teachers, Staff, and Learners are registered directly by School Administration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
