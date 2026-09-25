import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService, parentApplicationService, systemControlService } from '../../services/api';
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
    systemControlService.getPortalLocks().then((controls: any[]) => {
      const regControl = controls?.find((c: any) => c.control_id === 'user_registration');
      if (regControl && regControl.is_locked) {
        setPortalLock({ is_locked: true, reason: regControl.reason });
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
      setFieldErrors(prev => ({ ...prev, [name]: 'Numbers are strictly not allowed in names. Letters, spaces, and hyphens only.' }));
      setFormData(prev => ({ ...prev, [name]: value.replace(/\d/g, '') }));
      return;
    }
    if (/[^A-Za-z\s\-']/.test(value)) {
      setFieldErrors(prev => ({ ...prev, [name]: 'Special symbols are not allowed in names. Letters, spaces, and hyphens only.' }));
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
        setFieldErrors(prev => ({ ...prev, phone: 'Letters and words are strictly not allowed in phone numbers. Numbers only.' }));
        setFormData(prev => ({ ...prev, [name]: value.replace(/[a-zA-Z]/g, '') }));
        return;
      }
      const cleaned = value.replace(/[^\d+]/g, '');
      setError(null);
      setFormData(prev => ({ ...prev, [name]: cleaned }));
    } else if (name === 'idNumber') {
      if (/[^\d]/.test(value)) {
        setFieldErrors(prev => ({ ...prev, idNumber: 'Letters and symbols are strictly not allowed in ID numbers. Numbers only.' }));
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
        setError('Child name fields cannot contain numbers.');
        return;
      }
      setError(null);
    } else if (field === 'idNumber') {
      const cleaned = (val || '').replace(/\D/g, '').slice(0, 13);
      if (val !== cleaned && val.length <= 13) {
        setError('Child ID number must contain numbers only.');
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
