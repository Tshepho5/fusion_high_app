import React, { useState } from 'react';
import {
  Building2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  ArrowLeft,
  School,
  Mail,
  Phone,
  MapPin,
  FileText,
  CreditCard,
  Sparkles,
  BookOpen,
  Award,
  Globe,
  Palette,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { schoolRegistrationService } from '../../services/api';
import { useSchool } from '../../context/SchoolContext';

interface SchoolRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 9 South African Provinces with their official major DBE Education Districts
const SA_PROVINCES: Record<string, string[]> = {
  'Limpopo': [
    'Capricorn South (Polokwane/Mankweng)',
    'Capricorn North (Lebowakgomo/Molepo)',
    'Vhembe East (Thohoyandou)',
    'Vhembe West',
    'Mopani East',
    'Mopani West (Tzaneen)',
    'Sekhukhune South',
    'Waterberg'
  ],
  'Gauteng': [
    'Tshwane South (D4 - Pretoria/Atteridgeville)',
    'Tshwane West (Lotus Gardens/Mabopane)',
    'Tshwane North',
    'Johannesburg East',
    'Johannesburg Central (Soweto)',
    'Johannesburg North',
    'Johannesburg West',
    'Johannesburg South',
    'Ekurhuleni North',
    'Ekurhuleni South',
    'Sedibeng East'
  ],
  'Western Cape': [
    'Metro Central (Cape Town)',
    'Metro East (Khayelitsha)',
    'Metro North (Parow)',
    'Metro South (Mitchells Plain)',
    'Cape Winelands',
    'Eden and Central Karoo',
    'West Coast',
    'Overberg'
  ],
  'KwaZulu-Natal': [
    'eThekwini (Umlazi/Pinetown)',
    'Pietermaritzburg (Umgungundlovu)',
    'King Cetshwayo (Richards Bay)',
    'Ilembe',
    'Ugu',
    'Zululand',
    'Harry Gwala'
  ],
  'Eastern Cape': [
    'Nelson Mandela Bay (Gqeberha)',
    'Buffalo City (East London)',
    'OR Tambo Coastal',
    'OR Tambo Inland (Mthatha)',
    'Sarah Baartman',
    'Amathole'
  ],
  'Mpumalanga': [
    'Ehlanzeni (Mbombela)',
    'Nkangala (eMalahleni)',
    'Gert Sibande (Ermelo)',
    'Bohlabela'
  ],
  'Free State': [
    'Motheo (Bloemfontein)',
    'Lejweleputswa (Welkom)',
    'Fezile Dabi (Sasolburg)',
    'Thabo Mofutsanyana',
    'Xhariep'
  ],
  'North West': [
    'Bojanala Platinum (Rustenburg)',
    'Ngaka Modiri Molema (Mahikeng)',
    'Dr Kenneth Kaunda (Potchefstroom)',
    'Dr Ruth Segomotsi Mompati'
  ],
  'Northern Cape': [
    'Frances Baard (Kimberley)',
    'John Taolo Gaetsewe (Kuruman)',
    'ZF Mgcawu (Upington)',
    'Pixley Ka Seme',
    'Namakwa'
  ]
};

// South African Official Official Languages
const SA_HOME_LANGUAGES = [
  'Sepedi Home Language',
  'isiZulu Home Language',
  'isiXhosa Home Language',
  'English Home Language',
  'English FAL',
  'Afrikaans Home Language',
  'Afrikaans First Additional Language',
  'Setswana Home Language',
  'Sesotho Home Language',
  'Xitsonga Home Language',
  'Tshivenda Home Language',
  'Siswati Home Language',
  'isiNdebele Home Language'
];

// CAPS Secondary Streams & Elective Subjects
const SA_STREAMS = ['General', 'Science', 'Commerce', 'Tourism', 'Technical STEM'];

const SA_SUBJECTS_CATALOG = [
  'Mathematics',
  'Mathematical Literacy',
  'Technical Mathematics',
  'Physical Sciences',
  'Technical Sciences',
  'Life Sciences',
  'Geography',
  'History',
  'Accounting',
  'Business Studies',
  'Economics',
  'Tourism',
  'Agricultural Sciences',
  'Engineering Graphics & Design (EGD)',
  'Information Technology (IT)',
  'Computer Applications Technology (CAT)',
  'Life Orientation'
];

// SA ID Validation (Luhn algorithm)
const validateSAID = (id: string) => {
  const clean = id.replace(/\D/g, '');
  if (clean.length !== 13) return { valid: false, error: 'SA ID must be exactly 13 digits.' };

  let nCheck = 0;
  let bEven = false;
  for (let n = clean.length - 1; n >= 0; n--) {
    let cDigit = clean.charAt(n);
    let nDigit = parseInt(cDigit, 10);
    if (bEven) {
      if ((nDigit *= 2) > 9) nDigit -= 9;
    }
    nCheck += nDigit;
    bEven = !bEven;
  }
  if (nCheck % 10 !== 0) return { valid: false, error: 'Invalid South African ID checksum.' };

  const yy = clean.substring(0, 2);
  const mm = clean.substring(2, 4);
  const dd = clean.substring(4, 6);
  const century = parseInt(yy, 10) <= 26 ? '20' : '19';
  const genderCode = parseInt(clean.substring(6, 10), 10);

  return {
    valid: true,
    dob: `${century}${yy}-${mm}-${dd}`,
    gender: genderCode < 5000 ? 'Female' : 'Male'
  };
};

export const SchoolRegistrationModal: React.FC<SchoolRegistrationModalProps> = ({ isOpen, onClose }) => {
  const schoolCtx = useSchool();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form State
  const [form, setForm] = useState({
    // Step 1: School Identity & DBE Accreditation
    school_name: '',
    emis_number: '',
    province: 'Limpopo',
    district: 'Capricorn South (Polokwane/Mankweng)',
    circuit: 'Polokwane Central Circuit',
    physical_address: '',
    contact_email: '',
    contact_phone: '',
    curriculum_type: 'CAPS (DBE)',
    grade_range: '8-12',

    // Step 2: Academic Catalog & Languages
    offered_streams: ['Science', 'Commerce', 'General'],
    offered_languages: ['English FAL', 'Sepedi Home Language'],
    offered_subjects: [
      'Mathematics',
      'Physical Sciences',
      'Life Sciences',
      'Geography',
      'Accounting',
      'Business Studies',
      'Life Orientation'
    ],

    // Step 3: Principal & Lead Administrator
    principal_first_name: '',
    principal_surname: '',
    principal_id_number: '',
    principal_sace_number: '',
    principal_email: '',
    principal_phone: '',
    password: '',
    confirm_password: '',

    // Step 4: Branding & Fees Checkpoint
    motto: 'Knowledge is Power, Education is Freedom',
    primary_color: '#0284c7',
    secondary_color: '#06b6d4',
    application_fee_paid: 450.00,
    registration_fee_paid: 1500.00,
    payment_reference: `EFT-${Math.floor(10000000 + Math.random() * 90000000)}`
  });

  // Submitted Application Success Data
  const [submittedApp, setSubmittedApp] = useState<any | null>(null);

  if (!isOpen) return null;

  // Clear specific field error when updating value
  const handleFieldChange = (field: string, value: any) => {
    setFieldErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Name Validation: Strictly prevent numbers
  const handleNameInput = (field: 'principal_first_name' | 'principal_surname', value: string) => {
    if (/\d/.test(value)) {
      setFieldErrors(prev => ({ ...prev, [field]: 'Numbers are not allowed in this field. Please use letters only.' }));
      setForm(prev => ({ ...prev, [field]: value.replace(/\d/g, '') }));
      return;
    }
    setFieldErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setError(null);
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Numeric Validation: Clean alphabetic characters where digits are required
  const handleNumericInput = (field: 'emis_number' | 'principal_id_number' | 'principal_phone' | 'contact_phone', value: string) => {
    if (/[a-zA-Z]/.test(value)) {
      setFieldErrors(prev => ({ ...prev, [field]: 'Letters and words are not allowed in this field. Numbers only.' }));
      setForm(prev => ({ ...prev, [field]: value.replace(/[a-zA-Z]/g, '') }));
      return;
    }
    const clean = value.replace(/[^\d+]/g, '');
    setFieldErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setError(null);
    setForm(prev => ({ ...prev, [field]: clean }));
  };

  // Toggle Selection Helper
  const toggleArrayItem = (field: 'offered_streams' | 'offered_languages' | 'offered_subjects', item: string) => {
    setFieldErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setForm(prev => {
      const current = prev[field];
      if (current.includes(item)) {
        if (current.length === 1) return prev; // Keep at least one
        return { ...prev, [field]: current.filter(i => i !== item) };
      }
      return { ...prev, [field]: [...current, item] };
    });
  };

  // Step 1 Validation
  const validateStep1 = () => {
    const errors: Record<string, string> = {};
    if (!form.school_name.trim()) {
      errors.school_name = 'Please enter the official School Name.';
    }
    const cleanEmis = form.emis_number.replace(/\D/g, '');
    if (cleanEmis.length !== 9) {
      errors.emis_number = 'Official EMIS number must be exactly 9 numeric digits.';
    }
    if (!form.physical_address.trim()) {
      errors.physical_address = 'Physical school address is required.';
    }
    if (!form.contact_email.trim() || !form.contact_email.includes('@')) {
      errors.contact_email = 'A valid institutional contact email is required.';
    }
    if (!form.contact_phone.trim()) {
      errors.contact_phone = 'Official school telephone number is required.';
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError('Please correct the highlighted field errors below.');
      return false;
    }
    setError(null);
    return true;
  };

  // Step 2 Validation
  const validateStep2 = () => {
    const errors: Record<string, string> = {};
    if (form.offered_languages.length === 0) {
      errors.offered_languages = 'Please select at least one Home Language offered by the school.';
    }
    if (form.offered_streams.length === 0) {
      errors.offered_streams = 'Please select at least one Academic Stream.';
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError('Please select required curriculum offerings below.');
      return false;
    }
    setError(null);
    return true;
  };

  // Step 3 Validation
  const validateStep3 = () => {
    const errors: Record<string, string> = {};
    if (!form.principal_first_name.trim()) {
      errors.principal_first_name = 'Principal first name is required.';
    }
    if (!form.principal_surname.trim()) {
      errors.principal_surname = 'Principal surname is required.';
    }
    const idCheck = validateSAID(form.principal_id_number);
    if (!idCheck.valid) {
      errors.principal_id_number = idCheck.error || 'Please enter a valid 13-digit South African ID number.';
    }
    if (!form.principal_email.trim() || !form.principal_email.includes('@')) {
      errors.principal_email = 'A valid Principal work email address is required.';
    }
    if (!form.principal_phone.trim()) {
      errors.principal_phone = 'Principal direct cellphone number is required.';
    }
    if (!form.password) {
      errors.password = 'Master password is required.';
    } else if (form.password.length < 6) {
      errors.password = 'Master password must be at least 6 characters.';
    }
    if (!form.confirm_password) {
      errors.confirm_password = 'Confirmation password is required.';
    } else if (form.password !== form.confirm_password) {
      errors.confirm_password = 'Passwords do not match.';
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError('Please verify the Principal identity credentials highlighted below.');
      return false;
    }
    setError(null);
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;
    setStep((prev) => (prev + 1) as any);
  };

  const handlePrev = () => {
    setError(null);
    setStep((prev) => (prev - 1) as any);
  };

  const handleSubmitApplication = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await schoolRegistrationService.apply(form);
      setSubmittedApp(res.application || {
        application_number: res.application_number,
        school_name: form.school_name,
        principal_email: form.principal_email
      });
      // Immediately refresh active school directory in React context
      if (schoolCtx && typeof schoolCtx.refreshSchools === 'function') {
        await schoolCtx.refreshSchools().catch(() => {});
      }
      setStep(5);
    } catch (err: any) {
      console.error('Failed to submit school application:', err);
      setError(err.response?.data?.error || 'Failed to submit school application. Please check details and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl my-auto bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* Modal Top Banner */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-900/40 via-cyan-900/30 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  DBE Multi-School Network
                </span>
                <span className="text-xs text-slate-400">Step {step} of 4</span>
              </div>
              <h2 className="text-lg md:text-xl font-black text-white tracking-tight">
                {step === 5 ? 'Application Submitted' : 'Register Your School on Geleza SA'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator Progress Bar */}
        {step < 5 && (
          <div className="grid grid-cols-4 bg-slate-950/50 border-b border-slate-800 text-center py-2 px-3 text-xs font-semibold">
            <div className={`flex items-center justify-center gap-1.5 ${step === 1 ? 'text-cyan-400 font-bold' : step > 1 ? 'text-emerald-400' : 'text-slate-500'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 1 ? 'bg-cyan-500 text-slate-950 font-black' : step > 1 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>1</span>
              <span className="hidden sm:inline">DBE Identity</span>
            </div>
            <div className={`flex items-center justify-center gap-1.5 ${step === 2 ? 'text-cyan-400 font-bold' : step > 2 ? 'text-emerald-400' : 'text-slate-500'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 2 ? 'bg-cyan-500 text-slate-950 font-black' : step > 2 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>2</span>
              <span className="hidden sm:inline">Curriculum</span>
            </div>
            <div className={`flex items-center justify-center gap-1.5 ${step === 3 ? 'text-cyan-400 font-bold' : step > 3 ? 'text-emerald-400' : 'text-slate-500'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 3 ? 'bg-cyan-500 text-slate-950 font-black' : step > 3 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>3</span>
              <span className="hidden sm:inline">Principal SACE</span>
            </div>
            <div className={`flex items-center justify-center gap-1.5 ${step === 4 ? 'text-cyan-400 font-bold' : 'text-slate-500'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 4 ? 'bg-cyan-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'}`}>4</span>
              <span className="hidden sm:inline">Review & Fees</span>
            </div>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          
          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: SCHOOL IDENTITY & DBE ACCREDITATION */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-500/20 text-xs text-slate-300 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <p>
                  Geleza SA verifies every registered school with the South African Department of Basic Education. Please provide official registration records.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Official School Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Makgoka High School / Fusion Secondary"
                    value={form.school_name}
                    onChange={(e) => handleFieldChange('school_name', e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border text-sm text-white placeholder:text-slate-500 transition-all outline-hidden ${
                      fieldErrors.school_name ? 'border-rose-500 focus:border-rose-400' : 'border-slate-700 focus:border-cyan-400'
                    }`}
                  />
                  {fieldErrors.school_name && (
                    <p className="text-[11px] text-rose-400 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.school_name}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    DBE EMIS Number (9 Digits) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={9}
                    placeholder="e.g. 923240457"
                    value={form.emis_number}
                    onChange={(e) => handleNumericInput('emis_number', e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border text-sm font-mono text-cyan-300 placeholder:text-slate-500 transition-all outline-hidden ${
                      fieldErrors.emis_number ? 'border-rose-500 focus:border-rose-400' : 'border-slate-700 focus:border-cyan-400'
                    }`}
                  />
                  {fieldErrors.emis_number ? (
                    <p className="text-[11px] text-rose-400 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.emis_number}</span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400">Strictly 9 numbers. Letters are rejected.</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Province <span className="text-red-400">*</span></label>
                  <select
                    value={form.province}
                    onChange={(e) => {
                      const newProv = e.target.value;
                      const defaultDistrict = (SA_PROVINCES[newProv] && SA_PROVINCES[newProv][0]) || '';
                      setForm({ ...form, province: newProv, district: defaultDistrict });
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-sm text-white transition-all outline-hidden"
                  >
                    {Object.keys(SA_PROVINCES).map((prov) => (
                      <option key={prov} value={prov} className="bg-slate-900 text-white">{prov}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Education District <span className="text-red-400">*</span></label>
                  <select
                    value={form.district}
                    onChange={(e) => setForm({ ...form, district: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-sm text-white transition-all outline-hidden"
                  >
                    {(SA_PROVINCES[form.province] || []).map((dist) => (
                      <option key={dist} value={dist} className="bg-slate-900 text-white">{dist}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Circuit (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Mankweng Circuit / Molepo Circuit"
                    value={form.circuit}
                    onChange={(e) => handleFieldChange('circuit', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 focus:border-cyan-400 text-sm text-white placeholder:text-slate-500 transition-all outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Physical School Address <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. 556 Mokgobu Street, Mankweng, Polokwane, 0727"
                    value={form.physical_address}
                    onChange={(e) => handleFieldChange('physical_address', e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border text-sm text-white placeholder:text-slate-500 transition-all outline-hidden ${
                      fieldErrors.physical_address ? 'border-rose-500 focus:border-rose-400' : 'border-slate-700 focus:border-cyan-400'
                    }`}
                  />
                  {fieldErrors.physical_address && (
                    <p className="text-[11px] text-rose-400 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.physical_address}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Official School Email <span className="text-red-400">*</span></label>
                  <input
                    type="email"
                    placeholder="admin@school.co.za"
                    value={form.contact_email}
                    onChange={(e) => handleFieldChange('contact_email', e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border text-sm text-white placeholder:text-slate-500 transition-all outline-hidden ${
                      fieldErrors.contact_email ? 'border-rose-500 focus:border-rose-400' : 'border-slate-700 focus:border-cyan-400'
                    }`}
                  />
                  {fieldErrors.contact_email && (
                    <p className="text-[11px] text-rose-400 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.contact_email}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">School Telephone <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    placeholder="+27 15 291 0000"
                    value={form.contact_phone}
                    onChange={(e) => handleNumericInput('contact_phone', e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border text-sm text-white placeholder:text-slate-500 transition-all outline-hidden ${
                      fieldErrors.contact_phone ? 'border-rose-500 focus:border-rose-400' : 'border-slate-700 focus:border-cyan-400'
                    }`}
                  />
                  {fieldErrors.contact_phone && (
                    <p className="text-[11px] text-rose-400 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.contact_phone}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CURRICULUM, HOME LANGUAGES & STREAMS */}
          {step === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 text-xs text-slate-300 flex items-start gap-3">
                <BookOpen className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <p>
                  Indicate the academic streams, official South African Home Languages, and elective subjects offered at your school. This dynamically configures your school's class catalogs.
                </p>
              </div>

              {/* Home Languages Offered */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">
                  Home Languages & First Additional Languages Offered <span className="text-red-400">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {SA_HOME_LANGUAGES.map((lang) => {
                    const selected = form.offered_languages.includes(lang);
                    return (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => toggleArrayItem('offered_languages', lang)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          selected
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm'
                            : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        {selected ? '✓ ' : '+ '}{lang}
                      </button>
                    );
                  })}
                </div>
                {fieldErrors.offered_languages && (
                  <p className="text-[11px] text-rose-400 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldErrors.offered_languages}</span>
                  </p>
                )}
              </div>

              {/* Streams Offered */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="text-xs font-bold text-slate-300">
                  Academic Streams Offered <span className="text-red-400">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {SA_STREAMS.map((str) => {
                    const selected = form.offered_streams.includes(str);
                    return (
                      <button
                        key={str}
                        type="button"
                        onClick={() => toggleArrayItem('offered_streams', str)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          selected
                            ? 'bg-blue-600/30 border-blue-400 text-blue-200 shadow-sm'
                            : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {selected ? '✓ ' : '+ '}{str} Stream
                      </button>
                    );
                  })}
                </div>
                {fieldErrors.offered_streams && (
                  <p className="text-[11px] text-rose-400 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldErrors.offered_streams}</span>
                  </p>
                )}
              </div>

              {/* Elective Subjects Offered */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="text-xs font-bold text-slate-300">
                  Elective Subjects Catalog (Grades 10–12)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SA_SUBJECTS_CATALOG.map((sub) => {
                    const selected = form.offered_subjects.includes(sub);
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => toggleArrayItem('offered_subjects', sub)}
                        className={`p-2 rounded-xl text-xs font-semibold text-left border transition-all cursor-pointer flex items-center justify-between ${
                          selected
                            ? 'bg-slate-800/90 border-cyan-400 text-white'
                            : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="truncate">{sub}</span>
                        {selected && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PRINCIPAL & LEAD ADMINISTRATOR CREDENTIALS */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 text-xs text-slate-300 flex items-start gap-3">
                <Award className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <p>
                  To prevent unauthorized registration, the applicant must be the verified School Principal. Please input your official SACE and National ID credentials.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Principal First Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tsakani"
                    value={form.principal_first_name}
                    onChange={(e) => handleNameInput('principal_first_name', e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border text-sm text-white placeholder:text-slate-500 transition-all outline-hidden ${
                      fieldErrors.principal_first_name ? 'border-rose-500 focus:border-rose-400' : 'border-slate-700 focus:border-cyan-400'
                    }`}
                  />
                  {fieldErrors.principal_first_name && (
                    <p className="text-[11px] text-rose-400 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.principal_first_name}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Principal Surname <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Molepo"
                    value={form.principal_surname}
                    onChange={(e) => handleNameInput('principal_surname', e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border text-sm text-white placeholder:text-slate-500 transition-all outline-hidden ${
                      fieldErrors.principal_surname ? 'border-rose-500 focus:border-rose-400' : 'border-slate-700 focus:border-cyan-400'
                    }`}
                  />
                  {fieldErrors.principal_surname && (
                    <p className="text-[11px] text-rose-400 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.principal_surname}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Principal SA ID Number (13 Digits) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={13}
                    placeholder="e.g. 7803155494081"
                    value={form.principal_id_number}
                    onChange={(e) => handleNumericInput('principal_id_number', e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border text-sm font-mono text-cyan-300 placeholder:text-slate-500 transition-all outline-hidden ${
                      fieldErrors.principal_id_number ? 'border-rose-500 focus:border-rose-400' : 'border-slate-700 focus:border-cyan-400'
                    }`}
                  />
                  {fieldErrors.principal_id_number ? (
                    <p className="text-[11px] text-rose-400 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.principal_id_number}</span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400">Strictly 13 digits verified with Luhn algorithm.</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    SACE Registration Number (Optional / Recommended)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SACE-109284"
                    value={form.principal_sace_number}
                    onChange={(e) => handleFieldChange('principal_sace_number', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 focus:border-cyan-400 text-sm text-white placeholder:text-slate-500 transition-all outline-hidden"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Principal Work Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="principal@school.co.za"
                    value={form.principal_email}
                    onChange={(e) => handleFieldChange('principal_email', e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border text-sm text-white placeholder:text-slate-500 transition-all outline-hidden ${
                      fieldErrors.principal_email ? 'border-rose-500 focus:border-rose-400' : 'border-slate-700 focus:border-cyan-400'
                    }`}
                  />
                  {fieldErrors.principal_email ? (
                    <p className="text-[11px] text-rose-400 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.principal_email}</span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400">Official accreditation notices and onboarding credentials will be dispatched here.</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Principal Direct Cellphone <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="082 123 4567"
                    value={form.principal_phone}
                    onChange={(e) => handleNumericInput('principal_phone', e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border text-sm text-white placeholder:text-slate-500 transition-all outline-hidden ${
                      fieldErrors.principal_phone ? 'border-rose-500 focus:border-rose-400' : 'border-slate-700 focus:border-cyan-400'
                    }`}
                  />
                  {fieldErrors.principal_phone && (
                    <p className="text-[11px] text-rose-400 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.principal_phone}</span>
                    </p>
                  )}
                </div>

                {/* Create Master Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Create Master Password <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create master password (min 6 chars)"
                      value={form.password}
                      onChange={(e) => handleFieldChange('password', e.target.value)}
                      className={`w-full pl-10 pr-11 py-2.5 rounded-xl bg-slate-950/70 border text-sm text-white placeholder:text-slate-500 transition-all outline-hidden ${
                        fieldErrors.password ? 'border-rose-500 focus:border-rose-400' : 'border-slate-700 focus:border-cyan-400'
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

                {/* Confirm Master Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Confirm Master Password <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm master password"
                      value={form.confirm_password}
                      onChange={(e) => handleFieldChange('confirm_password', e.target.value)}
                      className={`w-full pl-10 pr-11 py-2.5 rounded-xl bg-slate-950/70 border text-sm text-white placeholder:text-slate-500 transition-all outline-hidden ${
                        fieldErrors.confirm_password ? 'border-rose-500 focus:border-rose-400' : 'border-slate-700 focus:border-cyan-400'
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
                  {fieldErrors.confirm_password && (
                    <p className="text-[11px] text-rose-400 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.confirm_password}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: BRANDING & APPLICATION FEES CHECKPOINT */}
          {step === 4 && (
            <div className="space-y-5 animate-fade-in">
              {/* Branding Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Palette className="w-4 h-4" />
                  <span>School Identity & Motto</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-3 space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">School Motto</label>
                    <input
                      type="text"
                      placeholder="e.g. Innovate, Lead, Transform"
                      value={form.motto}
                      onChange={(e) => setForm({ ...form, motto: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950/70 border border-slate-700 text-sm text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Primary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={form.primary_color}
                        onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                        className="w-10 h-10 rounded-xl bg-transparent border-0 cursor-pointer"
                      />
                      <span className="text-xs font-mono text-slate-400">{form.primary_color}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Secondary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={form.secondary_color}
                        onChange={(e) => setForm({ ...form, secondary_color: e.target.value })}
                        className="w-10 h-10 rounded-xl bg-transparent border-0 cursor-pointer"
                      />
                      <span className="text-xs font-mono text-slate-400">{form.secondary_color}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fees & Fast-Track Onboarding Invoice */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-cyan-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white">Application & Onboarding Fee</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Fast-Track Verification
                  </span>
                </div>

                <div className="divide-y divide-slate-800 text-xs">
                  <div className="py-2 flex justify-between">
                    <span className="text-slate-400">Institutional Accreditation Fee</span>
                    <span className="font-mono text-white">R {form.application_fee_paid.toFixed(2)}</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-slate-400">School Onboarding & Workspace Setup Fee</span>
                    <span className="font-mono text-white">R {form.registration_fee_paid.toFixed(2)}</span>
                  </div>
                  <div className="py-2.5 flex justify-between text-sm font-black text-cyan-300">
                    <span>Total Due Upon Submission</span>
                    <span>R {(form.application_fee_paid + form.registration_fee_paid).toFixed(2)}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-[11px] text-cyan-200">
                  <strong>Fast-Track Guarantee:</strong> Both fees are logged under reference <code className="text-white font-mono bg-cyan-900/40 px-1 py-0.5 rounded">{form.payment_reference}</code>. Applications with paid fees are expedited for priority review by the Geleza SA Executive desk.
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: SUCCESS RECEIPT & NEXT STEPS */}
          {step === 5 && (
            <div className="space-y-5 text-center py-4 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl font-black text-white">School Successfully Registered!</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Your official school registration for <strong>{form.school_name}</strong> is complete and active on Geleza SA. Parents and learners can now select your school and submit admissions applications immediately.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 max-w-md mx-auto text-left space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Application Number:</span>
                  <span className="font-mono font-bold text-cyan-300">{submittedApp?.application_number || 'GSA-SCH-2026'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">EMIS Number:</span>
                  <span className="font-mono text-white">{form.emis_number}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Principal Recipient:</span>
                  <span className="text-white">{form.principal_email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300">Active & Listed for Applications</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-500/20 text-[11px] text-slate-300 max-w-md mx-auto text-left">
                <strong>Continuous Email Notification:</strong> We have dispatched an official confirmation receipt and master administrator credentials to <code className="text-cyan-300">{form.principal_email}</code>. You can now log into your school portal or direct applicants to submit admissions.
              </div>

              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition-all shadow-md active:scale-95"
              >
                Done
              </button>
            </div>
          )}

        </div>

        {/* Modal Bottom Footer Navigation */}
        {step < 5 && (
          <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={handlePrev}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : <div />}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-md cursor-pointer active:scale-95"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmitApplication}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-xs transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Submit & Pay Application Fee</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
