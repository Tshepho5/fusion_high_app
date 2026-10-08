import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  X,
  Search,
  Bot,
  ChevronDown,
  ChevronUp,
  Headphones,
  BookOpen,
  ShieldCheck,
  GraduationCap,
  Users,
  CreditCard,
  LifeBuoy,
  Clock,
  Sparkles,
  Smile,
  ThumbsUp,
  Compass,
  CheckCircle2,
  Lightbulb,
  Phone,
  Mail,
  Send,
  AlertCircle
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { GelezaAIChatPanel } from './GelezaAIChatPanel';
import { GELEZA_AI } from './GelezaAIMascot';
import { useAuth } from '../../context/AuthContext';
import { supportService } from '../../services/api';

interface HelpSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'faq' | 'ai-support' | 'contact';
  onSelectTab?: (tab: string) => void;
}

const SUPPORT_CATEGORIES = [
  { value: 'wrong_email', label: 'Wrong email address on application / account' },
  { value: 'wrong_phone', label: 'Wrong phone number' },
  { value: 'wrong_id_number', label: 'Wrong ID number' },
  { value: 'wrong_learner_details', label: 'Wrong learner / child details' },
  { value: 'wrong_parent_details', label: 'Wrong parent / guardian details' },
  { value: 'application_correction', label: 'Other application form correction' },
  { value: 'login_access', label: 'Login or account access problem' },
  { value: 'account_profile', label: 'Profile / personal details' },
  { value: 'fees_payments', label: 'Fees or payments' },
  { value: 'technical', label: 'Technical / app issue' },
  { value: 'other', label: 'Other support request' }
];

/**
 * 🌟 Dynamic Theme-Adaptive Animated Mascot (Fusion High AI Assistant)
 * Features:
 * - Helmet featuring the Fusion High Crest on forehead.
 * - Expressive welcoming animated face with blinking glowing eyes and rosy cheeks.
 * - Ear antenna communication lights and animated waving hand.
 * - Dynamically adapts colors, materials, and glow to Dark, Navy, and Light themes!
 */
export const AnimatedSupportMascot: React.FC<{
  isThinking?: boolean;
  isWaving?: boolean;
  size?: 'sm' | 'md' | 'lg';
}> = ({ isThinking = false, isWaving = true, size = 'md' }) => {
  const { theme } = useTheme();

  // Dynamic Theme Palette Styles for Mascot
  const themeStyles = {
    dark: {
      aura: 'from-indigo-600/30 via-cyan-500/20 to-purple-600/30',
      helmetBg: 'from-slate-800 via-slate-900 to-indigo-950',
      helmetBorder: 'border-cyan-400/70 shadow-glow-indigo',
      visorBg: 'from-slate-950/95 via-indigo-950/90 to-slate-950/95',
      visorBorder: 'border-cyan-400/50 shadow-[0_0_12px_rgba(34,211,238,0.3)]',
      eyeColor: '#22d3ee',
      eyeGlow: '0 0 10px #22d3ee, 0 0 20px #06b6d4',
      badgeBg: 'from-indigo-600 to-cyan-500',
      badgeBorder: 'border-cyan-300',
      antennaColor: 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]',
      cheeksColor: 'bg-pink-400/70',
      mouthColor: 'border-cyan-300 bg-cyan-400/20',
      handBg: 'from-indigo-500 to-cyan-400 border-cyan-300',
      statusText: 'text-cyan-300 bg-cyan-500/20 border-cyan-500/30'
    },
    light: {
      aura: 'from-brand-500/20 via-sky-400/20 to-indigo-500/20',
      helmetBg: 'from-slate-100 via-white to-slate-200',
      helmetBorder: 'border-indigo-500/40 shadow-xl',
      visorBg: 'from-slate-900 via-indigo-950 to-slate-900',
      visorBorder: 'border-sky-400/60 shadow-[0_0_10px_rgba(56,189,248,0.3)]',
      eyeColor: '#38bdf8',
      eyeGlow: '0 0 10px #38bdf8, 0 0 15px #60a5fa',
      badgeBg: 'from-brand-600 to-indigo-600',
      badgeBorder: 'border-white',
      antennaColor: 'bg-indigo-600 shadow-[0_0_8px_#4f46e5]',
      cheeksColor: 'bg-rose-400/80',
      mouthColor: 'border-sky-300 bg-sky-400/30',
      handBg: 'from-white to-slate-100 border-indigo-400',
      statusText: 'text-brand-600 bg-brand-50 border-brand-200'
    }
  };

  const currentThemeStyle = themeStyles[theme] || themeStyles.dark;
  const isLight = theme === 'light';

  return (
    <div className="relative flex flex-col items-center justify-center select-none py-1.5 animate-mascot-bob">
      {/* Ambient Glow Aura */}
      <div
        className={`absolute w-28 h-28 rounded-full bg-gradient-to-tr ${currentThemeStyle.aura} blur-xl animate-pulse pointer-events-none`}
      />

      <div className="relative flex items-center justify-center">
        
        {/* Left Ear Antenna with pulsing beacon light */}
        <div className="absolute -left-3 top-3 flex items-center">
          <div className="w-2.5 h-4 rounded-l-md bg-slate-700 border border-white/20 relative">
            <div className={`absolute -left-1 top-1 w-2 h-2 rounded-full ${currentThemeStyle.antennaColor} animate-ping`} />
            <div className={`absolute -left-1 top-1 w-2 h-2 rounded-full ${currentThemeStyle.antennaColor}`} />
          </div>
        </div>

        {/* Right Ear Antenna with waving arm attached */}
        <div className="absolute -right-3 top-3 flex items-center">
          <div className="w-2.5 h-4 rounded-r-md bg-slate-700 border border-white/20 relative">
            <div className={`absolute -right-1 top-1 w-2 h-2 rounded-full ${currentThemeStyle.antennaColor} animate-ping`} />
            <div className={`absolute -right-1 top-1 w-2 h-2 rounded-full ${currentThemeStyle.antennaColor}`} />
          </div>
        </div>

        {/* Waving Hand & Arm */}
        <div
          className={`absolute -right-8 -top-3 z-30 transition-all duration-300 origin-bottom-left ${
            isWaving ? 'animate-wave' : ''
          }`}
        >
          <div
            className={`w-7 h-7 rounded-2xl bg-gradient-to-br ${currentThemeStyle.handBg} border shadow-lg flex items-center justify-center text-sm transform rotate-12`}
          >
            ✋
          </div>
        </div>

        {/* Outer Protective Space/School Helmet */}
        <div
          className={`relative w-24 h-24 rounded-full bg-gradient-to-b ${currentThemeStyle.helmetBg} border-2 ${currentThemeStyle.helmetBorder} flex flex-col items-center justify-center overflow-hidden transition-all duration-300 shadow-2xl`}
        >
          {/* Top Head Aerodynamic Crest Highlight */}
          <div className="absolute top-0 w-12 h-2 bg-white/20 rounded-b-lg blur-[0.5px]" />

          {/* Forehead Emblem: Fusion High School Graduation Cap Badge */}
          <div
            className={`absolute top-2 z-20 flex items-center justify-center px-2 py-0.5 rounded-full bg-gradient-to-r ${currentThemeStyle.badgeBg} border ${currentThemeStyle.badgeBorder} shadow-md`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-white animate-pulse" />
            <span className="text-[8px] font-black text-white ml-1 tracking-wider uppercase">FUSION</span>
          </div>

          {/* High-Tech Glowing Visor */}
          <div
            className={`w-18 h-14 mt-4 rounded-2xl bg-gradient-to-b ${currentThemeStyle.visorBg} border ${currentThemeStyle.visorBorder} flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300`}
            style={{ width: '4.8rem', height: '3.4rem' }}
          >
            {/* Visor Sunlight/Star Glare Reflection */}
            <div className="absolute top-1 left-2 w-10 h-2 rounded-full bg-white/25 transform -rotate-12 blur-[1px]" />
            <div className="absolute top-3 left-4 w-4 h-1 rounded-full bg-white/20 transform -rotate-12 blur-[0.5px]" />

            {/* Welcoming Smiling Character Face inside Visor */}
            <div className="flex flex-col items-center justify-center gap-1.5 z-10 pt-1">
              
              {/* Expressive Glowing Eyes */}
              <div className="flex items-center gap-3.5">
                {isThinking ? (
                  <>
                    <div
                      className="w-3 h-3 rounded-full animate-spin border-2 border-dashed"
                      style={{ borderColor: currentThemeStyle.eyeColor, boxShadow: currentThemeStyle.eyeGlow }}
                    />
                    <div
                      className="w-3 h-3 rounded-full animate-spin border-2 border-dashed"
                      style={{ borderColor: currentThemeStyle.eyeColor, boxShadow: currentThemeStyle.eyeGlow }}
                    />
                  </>
                ) : (
                  <>
                    {/* Happy Expressive Arched Glowing Eyes with Blinking */}
                    <div className="relative flex flex-col items-center animate-mascot-blink">
                      {/* Eyebrow */}
                      <div className="w-3 h-0.5 rounded-full bg-white/40 -mb-0.5 transform -rotate-6" />
                      <div
                        className="w-3.5 h-2 rounded-t-full transform scale-y-125 transition-transform"
                        style={{
                          backgroundColor: currentThemeStyle.eyeColor,
                          boxShadow: currentThemeStyle.eyeGlow
                        }}
                      />
                    </div>

                    <div className="relative flex flex-col items-center animate-mascot-blink">
                      {/* Eyebrow */}
                      <div className="w-3 h-0.5 rounded-full bg-white/40 -mb-0.5 transform rotate-6" />
                      <div
                        className="w-3.5 h-2 rounded-t-full transform scale-y-125 transition-transform"
                        style={{
                          backgroundColor: currentThemeStyle.eyeColor,
                          boxShadow: currentThemeStyle.eyeGlow
                        }}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Glowing Rosy Cheeks & Big Cheerful Smile */}
              <div className="flex items-center justify-center relative w-10 mt-0.5">
                {/* Blushing Cheeks */}
                <div className={`absolute left-0 w-2 h-1.5 rounded-full ${currentThemeStyle.cheeksColor} blur-[1px]`} />
                <div className={`absolute right-0 w-2 h-1.5 rounded-full ${currentThemeStyle.cheeksColor} blur-[1px]`} />

                {/* Animated Smile */}
                {isThinking ? (
                  <div
                    className="w-2.5 h-1 rounded-full animate-pulse"
                    style={{ backgroundColor: currentThemeStyle.eyeColor }}
                  />
                ) : (
                  <div
                    className={`w-4 h-2 rounded-b-full border-b-2 border-x ${currentThemeStyle.mouthColor} transform transition-transform hover:scale-110`}
                    style={{
                      boxShadow: `0 0 6px ${currentThemeStyle.eyeColor}`
                    }}
                  />
                )}
              </div>

            </div>

          </div>

          {/* Helmet Chin Guard & Voice Communicator */}
          <div className="absolute bottom-1 flex items-center gap-1">
            <div className="w-1.5 h-1 rounded-full bg-slate-600" />
            <div className="w-5 h-1 rounded-full bg-slate-500" />
            <div className="w-1.5 h-1 rounded-full bg-slate-600" />
          </div>
        </div>
      </div>

      {/* Mascot Name Badge & Status */}
      <div className="flex items-center gap-2 mt-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
        <span
          className={`text-xs font-extrabold font-display tracking-wide ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}
        >
          Geleza SA AI Assistant
        </span>
        <span
          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${currentThemeStyle.statusText}`}
        >
          24/7 ONLINE
        </span>
      </div>
    </div>
  );
};

/** Official FAQ reference — Geleza SA Support Documentation (GSA-DOC-FAQ-001) */
const FAQ_CATEGORIES = [
  {
    id: 'general',
    name: 'Section A — Platform overview',
    icon: LifeBuoy,
    faqs: [
      {
        q: 'What is Geleza SA?',
        a: 'Geleza SA (Geleza South Africa) is a digital school management and learning platform for South African secondary schools. It supports CAPS-aligned administration, including attendance, assessments, report cards, communications, fees (where enabled), and authorised study tools for Grades 8–12.'
      },
      {
        q: 'Who may use Geleza SA?',
        a: 'Access is limited to authorised users of a registered school: administrators, educators, enrolled learners, and parents or legal guardians linked to those learners. Unauthorised use is prohibited under the Geleza SA Terms and Conditions.'
      },
      {
        q: 'How do I change between dark and light appearance?',
        a: 'Open Settings from your portal and use the Dark Mode control under App Settings. Your preference is saved for subsequent sessions on that device.'
      },
      {
        q: 'Where can I read the official policies?',
        a: 'The About Geleza SA document and the Terms and Conditions are available from the public website (About Us and Terms pages). Registered users may also open Help & Support for FAQs and the AI assistant.'
      },
      {
        q: 'I entered the wrong email, phone, or details on my application. What should I do?',
        a: 'Open Help & Support → Contact Admin and describe the mistake. Include your application reference (for example PAR-2026-XXXXX) and the correct details. Your school administrator or Geleza SA support can correct eligible application and account fields so you can continue without re-applying from scratch.'
      }
    ]
  },
  {
    id: 'learner',
    name: 'Section B — Learners',
    icon: GraduationCap,
    faqs: [
      {
        q: 'How do I open a subject workspace?',
        a: 'From the learner home or Subjects module, select the relevant subject. You will see subject resources, past papers, and related study tools that your school has made available.'
      },
      {
        q: 'Where do I find my learner number and profile details?',
        a: 'Open My Profile. Your learner number, grade, and contact details appear there. Official marks appear only after your school uploads verified assessment data.'
      },
      {
        q: 'Why do my marks show as pending?',
        a: 'Geleza SA does not invent placeholder marks. Term marks and averages are displayed only after educators or administrators upload verified SBA or term results for your school.'
      },
      {
        q: 'How does the Geleza SA AI Assistant work?',
        a: 'The Geleza SA AI Assistant provides CAPS-oriented study guidance when enabled for your account. It is a support tool for understanding and revision; formal assessments must still be completed according to your school’s academic integrity rules.'
      }
    ]
  },
  {
    id: 'parent',
    name: 'Section C — Parents and guardians',
    icon: Users,
    faqs: [
      {
        q: 'How do I link a learner to my parent account?',
        a: 'In the Parent Portal, open the linked-learners or account-linking module. Enter the learner’s official learner number issued by the school and the learner’s 13-digit South African identity number. Linking is confirmed only when the details match school records.'
      },
      {
        q: 'Where can I view a CAPS report card?',
        a: 'Open the CAPS Report Cards module (where enabled by the school). Report cards show subject results and CAPS achievement levels only when the school has published them for the relevant term.'
      },
      {
        q: 'How do I arrange a parent–teacher consultation?',
        a: 'Open Parent–Teacher Consultations, select the educator and an available timeslot, and confirm the booking. Availability is controlled by the school’s published schedule.'
      }
    ]
  },
  {
    id: 'finance',
    name: 'Section D — Fees and bursaries',
    icon: CreditCard,
    faqs: [
      {
        q: 'How do I view school fee statements?',
        a: 'Open the School Fees module (where enabled). Statements, balances, and payment instructions are determined by your school. Geleza SA displays the records the school has authorised for your account.'
      },
      {
        q: 'Where can Grade 12 learners find bursary information?',
        a: 'Open the Bursaries or tertiary funding catalogue module on your dashboard (where enabled) to review funding opportunities, eligibility notes, and any application links published by Geleza SA or your school.'
      }
    ]
  },
  {
    id: 'access',
    name: 'Section E — Access and sessions',
    icon: ShieldCheck,
    faqs: [
      {
        q: 'Can I sign in on a new device if I am already signed in elsewhere?',
        a: 'Yes. Signing in on a new device replaces the previous active session. The earlier device or tab is signed out automatically for account security.'
      },
      {
        q: 'What should I do if I forget my password?',
        a: 'Use Forgot Password on the sign-in page and follow the email recovery steps. For unknown learner numbers or enrolment issues, contact your school administration.'
      }
    ]
  }
];

export const HelpSupportModal: React.FC<HelpSupportModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'faq',
  onSelectTab
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const { user, role } = useAuth();

  const [activeTab, setActiveTab] = useState<'faq' | 'ai-support' | 'contact'>(defaultTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<string | null>('general-0');
  const [ticketForm, setTicketForm] = useState({
    requester_name: '',
    requester_email: '',
    requester_phone: '',
    category: 'wrong_email',
    subject: '',
    description: '',
    related_application_number: ''
  });
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [ticketSuccess, setTicketSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [fieldHints, setFieldHints] = useState<Record<string, string>>({});

  const setHint = (field: string, message?: string) => {
    setFieldHints((h) => {
      const next = { ...h };
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });
  };

  /** Strip anything that is not a letter / space / apostrophe / hyphen */
  const lettersOnlyName = (value: string) => {
    const cleaned = value.replace(/[^a-zA-ZÀ-ÿ\s'-]/g, '');
    if (/[0-9]/.test(value)) {
      setHint('requester_name', 'Numbers are not allowed in your name. Use letters only.');
    } else if (cleaned !== value) {
      setHint('requester_name', 'Only letters, spaces, apostrophes and hyphens are allowed.');
    } else {
      setHint('requester_name');
    }
    return cleaned;
  };

  /** Strip anything that is not a digit; max 10 */
  const digitsOnlyPhone = (value: string) => {
    if (/[a-zA-Z]/.test(value)) {
      setHint('requester_phone', 'Letters are not allowed in a phone number. Digits only.');
    } else if (/[^\d]/.test(value) && value.length > 0) {
      setHint('requester_phone', 'Phone accepts digits only (e.g. 0812345678).');
    } else {
      setHint('requester_phone');
    }
    return value.replace(/\D/g, '').slice(0, 10);
  };

  const normalizeAppRef = (value: string) =>
    value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20);

  /** Block invalid keystrokes before they enter the field */
  const blockNonLettersKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const nav = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
    if (nav.includes(e.key)) return;
    if (e.key.length === 1 && !/^[a-zA-ZÀ-ÿ\s'-]$/.test(e.key)) {
      e.preventDefault();
      setHint('requester_name', 'Numbers and symbols are not allowed in your name.');
    }
  };

  const blockNonDigitKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const nav = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
    if (nav.includes(e.key)) return;
    if (e.key.length === 1 && !/^\d$/.test(e.key)) {
      e.preventDefault();
      setHint('requester_phone', 'Letters and symbols are not allowed. Digits only.');
    }
  };

  const pasteLettersOnly = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = lettersOnlyName(e.clipboardData.getData('text') || '');
    setTicketForm((p) => ({ ...p, requester_name: text }));
  };

  const pasteDigitsOnly = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = digitsOnlyPhone(e.clipboardData.getData('text') || '');
    setTicketForm((p) => ({ ...p, requester_phone: text }));
  };

  const validateTicketForm = () => {
    const errors: Record<string, string> = {};
    const name = ticketForm.requester_name.trim();
    const email = ticketForm.requester_email.trim().toLowerCase();
    const phone = ticketForm.requester_phone.trim();
    const subject = ticketForm.subject.trim();
    const description = ticketForm.description.trim();
    const appRef = ticketForm.related_application_number.trim();

    if (!name || name.length < 2) {
      errors.requester_name = 'Please enter your full name (letters only).';
    } else if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(name)) {
      errors.requester_name = 'Name may only contain letters, spaces, apostrophes and hyphens.';
    } else if (/\d/.test(name)) {
      errors.requester_name = 'Numbers are not allowed in your name.';
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.requester_email = 'Enter a valid email address we can reply to.';
    }

    if (phone) {
      if (!/^\d{10}$/.test(phone)) {
        errors.requester_phone = 'Phone must be exactly 10 digits (e.g. 0812345678).';
      }
    }

    if (appRef) {
      if (!/^PAR-\d{4}-\d{5}$/i.test(appRef) && !/^[A-Z]{2,5}-\d{4}-\d{4,6}$/i.test(appRef)) {
        errors.related_application_number = 'Use a valid reference format, e.g. PAR-2026-48192.';
      }
    }

    if (!subject || subject.length < 4) {
      errors.subject = 'Subject must be at least 4 characters.';
    }

    if (!description || description.length < 10) {
      errors.description = 'Please describe the problem in at least 10 characters, including the correct details.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  useEffect(() => {
    if (defaultTab) setActiveTab(defaultTab);
  }, [defaultTab, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const name = [user?.full_name || user?.name, user?.surname].filter(Boolean).join(' ').trim();
    const phoneRaw = String(user?.phone || '').replace(/\D/g, '').slice(0, 10);
    setTicketForm((prev) => ({
      ...prev,
      requester_name: prev.requester_name || lettersOnlyName(name) || '',
      requester_email: prev.requester_email || (user?.email || '').toLowerCase(),
      requester_phone: prev.requester_phone || phoneRaw
    }));
    setTicketError(null);
    setTicketSuccess(null);
    setFieldErrors({});
    setFieldHints({});
  }, [isOpen, user]);

  const submitSupportTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setTicketError(null);
    setTicketSuccess(null);
    if (!validateTicketForm()) {
      setTicketError('Please fix the highlighted fields before sending.');
      return;
    }
    setTicketSubmitting(true);
    try {
      const res = await supportService.submit({
        requester_name: ticketForm.requester_name.trim(),
        requester_email: ticketForm.requester_email.trim().toLowerCase(),
        requester_phone: ticketForm.requester_phone.trim() || undefined,
        category: ticketForm.category,
        subject: ticketForm.subject.trim(),
        description: ticketForm.description.trim(),
        related_application_number: ticketForm.related_application_number.trim() || undefined,
        school_id: user?.school_id,
        requester_role: role || undefined,
        related_application_type: 'parent_portal'
      });
      setTicketSuccess(
        `Request received. Ticket ${res.ticket?.ticket_number || ''} — school admin or Geleza SA will assist you.`
      );
      setTicketForm((prev) => ({
        ...prev,
        subject: '',
        description: '',
        related_application_number: ''
      }));
      setFieldErrors({});
      setFieldHints({});
    } catch (err: any) {
      setTicketError(err.response?.data?.error || err.message || 'Could not submit your request.');
    } finally {
      setTicketSubmitting(false);
    }
  };

  const inputClass = (field: string) => {
    const hasErr = Boolean(fieldErrors[field]);
    return `w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none ${
      hasErr
        ? 'border-rose-500 focus:border-rose-500'
        : 'focus:border-cyan-500'
    } ${
      isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-surface-darker border-white/10 text-white'
    } ${hasErr ? (isLight ? 'border-rose-500' : 'border-rose-500') : ''}`;
  };

  if (!isOpen) return null;

  // Dedicated phone-style AI assistant shell (matches Geleza SA mockups)
  if (activeTab === 'ai-support') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/75 backdrop-blur-md animate-fade-in overflow-hidden">
        <div
          className={`relative w-full max-w-[430px] h-[94vh] max-h-[860px] rounded-[2.5rem] border-2 shadow-2xl flex flex-col overflow-hidden transition-all ${
            isLight
              ? 'bg-[#F8FAFC] border-cyan-400/40 shadow-cyan-500/10'
              : 'bg-[#050D17] border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.2)]'
          }`}
        >
          <GelezaAIChatPanel onSelectTab={onSelectTab} onClose={onClose} />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in overflow-hidden">
      <div
        className={`relative w-full max-w-4xl h-[90vh] max-h-[750px] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900'
            : 'bg-surface-dark border-white/10 text-slate-100'
        }`}
      >
        {/* Top Header */}
        <div
          className={`p-4 sm:p-5 border-b flex items-center justify-between gap-4 shrink-0 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-surface-darker border-white/10'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-cyan-500 flex items-center justify-center text-white shadow-glow-indigo shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold font-display tracking-wide">
                  Geleza SA Support Documentation
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-[10px] font-bold text-cyan-400 font-mono">
                  GSA-DOC-FAQ-001
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Official FAQs and AI assistance for registered Geleza SA users
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${
              isLight ? 'text-slate-400 hover:text-slate-900 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title="Close Help Center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Switcher */}
        <div
          className={`flex items-center gap-2 px-5 py-2.5 border-b shrink-0 ${
            isLight ? 'bg-slate-100/80 border-slate-200' : 'bg-surface-dark border-white/5'
          }`}
        >
          <button
            onClick={() => setActiveTab('faq')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'faq'
                ? 'bg-indigo-600 text-white shadow-md'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>View FAQs</span>
          </button>

          <button
            onClick={() => setActiveTab('ai-support')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Bot className="w-4 h-4 text-cyan-300" />
            <span>24/7 AI Help & Support</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>

          <button
            onClick={() => setActiveTab('contact')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'contact'
                ? 'bg-cyan-600 text-white shadow-md'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <LifeBuoy className="w-4 h-4" />
            <span>Contact Admin</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          
          {/* TAB 1: VIEW FAQS */}
          {activeTab === 'faq' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
              
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search documentation (e.g. report card, link learner, session, fees)..."
                  className={`w-full pl-10 pr-4 py-2.5 rounded-2xl border text-xs focus:outline-none focus:border-indigo-500 ${
                    isLight
                      ? 'bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-400'
                      : 'bg-surface-darker border-white/10 text-white placeholder-slate-500'
                  }`}
                />
              </div>

              {/* FAQ Accordions by Category */}
              <div className="space-y-4">
                {FAQ_CATEGORIES.map((category) => {
                  const CategoryIcon = category.icon;
                  const filteredFaqs = category.faqs.filter(
                    (f) =>
                      !searchQuery.trim() ||
                      f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      f.a.toLowerCase().includes(searchQuery.toLowerCase())
                  );

                  if (filteredFaqs.length === 0) return null;

                  return (
                    <div key={category.id} className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-cyan-500 uppercase tracking-wider">
                        <CategoryIcon className="w-4 h-4" />
                        <span>{category.name}</span>
                      </div>

                      <div className="space-y-2">
                        {filteredFaqs.map((faq, idx) => {
                          const faqKey = `${category.id}-${idx}`;
                          const isExpanded = expandedFaq === faqKey;

                          return (
                            <div
                              key={faqKey}
                              className={`rounded-2xl border overflow-hidden transition-all ${
                                isLight
                                  ? 'bg-slate-50 border-slate-200'
                                  : 'bg-surface-darker border-white/5'
                              }`}
                            >
                              <button
                                onClick={() => setExpandedFaq(isExpanded ? null : faqKey)}
                                className={`w-full p-3.5 sm:p-4 text-left flex items-center justify-between gap-3 text-xs font-bold transition-colors ${
                                  isLight ? 'text-slate-900 hover:text-indigo-600' : 'text-white hover:text-indigo-300'
                                }`}
                              >
                                <span>{faq.q}</span>
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                                )}
                              </button>

                              {isExpanded && (
                                <div
                                  className={`px-4 pb-4 text-xs leading-relaxed border-t pt-3 animate-fade-in ${
                                    isLight
                                      ? 'text-slate-600 border-slate-200'
                                      : 'text-slate-300 border-white/5'
                                  }`}
                                >
                                  {faq.a}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Still need help callout */}
              <div
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
                  isLight
                    ? 'bg-indigo-50 border-indigo-200 text-slate-900'
                    : 'bg-indigo-500/10 border-indigo-500/20 text-white'
                }`}
              >
                <div>
                  <h4 className="text-xs font-bold">Couldn't find what you're looking for?</h4>
                  <p className={`text-[11px] mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Contact school admin / Geleza SA for application mistakes, or chat with the AI assistant.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <button
                    onClick={() => setActiveTab('contact')}
                    className="px-4 py-2 rounded-xl bg-cyan-600 text-white font-bold text-xs shadow-md hover:scale-105 transition-all flex items-center gap-1.5"
                  >
                    <LifeBuoy className="w-4 h-4" />
                    <span>Contact Admin</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('ai-support')}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-cyan-500 text-white font-bold text-xs shadow-md hover:scale-105 transition-all flex items-center gap-1.5"
                  >
                    <Bot className="w-4 h-4" />
                    <span>AI Help</span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'contact' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
              <div
                className={`p-4 rounded-2xl border ${
                  isLight ? 'bg-cyan-50 border-cyan-200' : 'bg-cyan-500/10 border-cyan-500/25'
                }`}
              >
                <h3 className={`text-sm font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Request help from school admin or Geleza SA
                </h3>
                <p className={`text-[11px] mt-1 leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Use this form if you entered the wrong email, phone, ID, or learner details on an application,
                  or if you need help with login or your account. Your school principal / admin can correct
                  eligible records; Geleza SA can also assist.
                </p>
              </div>

              {ticketSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{ticketSuccess}</span>
                </div>
              )}
              {ticketError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{ticketError}</span>
                </div>
              )}

              <form onSubmit={submitSupportTicket} className="space-y-3" noValidate>
                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="block space-y-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Full name</span>
                    <input
                      required
                      autoComplete="name"
                      inputMode="text"
                      pattern="[A-Za-zÀ-ÿ\s'-]+"
                      title="Letters only — no numbers"
                      value={ticketForm.requester_name}
                      onKeyDown={blockNonLettersKey}
                      onPaste={pasteLettersOnly}
                      onBeforeInput={(e) => {
                        const data = (e as unknown as InputEvent).data;
                        if (data && /[0-9]/.test(data)) {
                          e.preventDefault();
                          setHint('requester_name', 'Numbers are not allowed in your name. Use letters only.');
                        }
                      }}
                      onChange={(e) => {
                        const requester_name = lettersOnlyName(e.target.value);
                        setTicketForm((p) => ({ ...p, requester_name }));
                        setFieldErrors((err) => {
                          const next = { ...err };
                          delete next.requester_name;
                          return next;
                        });
                      }}
                      className={inputClass('requester_name')}
                    />
                    {(fieldErrors.requester_name || fieldHints.requester_name) && (
                      <p className="text-[11px] font-semibold text-rose-400">
                        {fieldErrors.requester_name || fieldHints.requester_name}
                      </p>
                    )}
                  </label>
                  <label className="block space-y-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Contact email (for reply)</span>
                    <input
                      required
                      type="email"
                      autoComplete="email"
                      value={ticketForm.requester_email}
                      onChange={(e) => {
                        setTicketForm((p) => ({ ...p, requester_email: e.target.value.toLowerCase().trim() }));
                        setFieldErrors((err) => {
                          const next = { ...err };
                          delete next.requester_email;
                          return next;
                        });
                      }}
                      className={`${inputClass('requester_email')} font-mono`}
                    />
                    {fieldErrors.requester_email && (
                      <p className="text-[11px] font-semibold text-rose-400">{fieldErrors.requester_email}</p>
                    )}
                  </label>
                  <label className="block space-y-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Phone</span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      placeholder="0812345678"
                      maxLength={10}
                      pattern="[0-9]{10}"
                      title="10 digits only — no letters"
                      value={ticketForm.requester_phone}
                      onKeyDown={blockNonDigitKey}
                      onPaste={pasteDigitsOnly}
                      onBeforeInput={(e) => {
                        const data = (e as unknown as InputEvent).data;
                        if (data && /[^\d]/.test(data)) {
                          e.preventDefault();
                          setHint('requester_phone', 'Letters and symbols are not allowed. Digits only.');
                        }
                      }}
                      onChange={(e) => {
                        const requester_phone = digitsOnlyPhone(e.target.value);
                        setTicketForm((p) => ({ ...p, requester_phone }));
                        setFieldErrors((err) => {
                          const next = { ...err };
                          delete next.requester_phone;
                          return next;
                        });
                      }}
                      className={`${inputClass('requester_phone')} font-mono`}
                    />
                    {(fieldErrors.requester_phone || fieldHints.requester_phone) && (
                      <p className="text-[11px] font-semibold text-rose-400">
                        {fieldErrors.requester_phone || fieldHints.requester_phone}
                      </p>
                    )}
                  </label>
                  <label className="block space-y-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Application ref (optional)</span>
                    <input
                      placeholder="e.g. PAR-2026-48192"
                      value={ticketForm.related_application_number}
                      onChange={(e) => {
                        setTicketForm((p) => ({
                          ...p,
                          related_application_number: normalizeAppRef(e.target.value)
                        }));
                        setFieldErrors((err) => {
                          const next = { ...err };
                          delete next.related_application_number;
                          return next;
                        });
                      }}
                      className={`${inputClass('related_application_number')} font-mono`}
                    />
                    {fieldErrors.related_application_number && (
                      <p className="text-[11px] font-semibold text-rose-400">{fieldErrors.related_application_number}</p>
                    )}
                  </label>
                </div>

                <label className="block space-y-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>What went wrong?</span>
                  <select
                    value={ticketForm.category}
                    onChange={(e) => setTicketForm((p) => ({ ...p, category: e.target.value }))}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-cyan-500 ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-surface-darker border-white/10 text-white'
                    }`}
                  >
                    {SUPPORT_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Subject</span>
                  <input
                    required
                    placeholder="Short summary of the problem"
                    value={ticketForm.subject}
                    onChange={(e) => {
                      setTicketForm((p) => ({ ...p, subject: e.target.value }));
                      setFieldErrors((err) => {
                        const next = { ...err };
                        delete next.subject;
                        return next;
                      });
                    }}
                    className={inputClass('subject')}
                  />
                  {fieldErrors.subject && (
                    <p className="text-[11px] font-semibold text-rose-400">{fieldErrors.subject}</p>
                  )}
                </label>

                <label className="block space-y-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Details</span>
                  <textarea
                    required
                    rows={4}
                    placeholder="Explain the mistake (e.g. I typed the wrong email on my parent application). Include the correct details we should use."
                    value={ticketForm.description}
                    onChange={(e) => {
                      setTicketForm((p) => ({ ...p, description: e.target.value }));
                      setFieldErrors((err) => {
                        const next = { ...err };
                        delete next.description;
                        return next;
                      });
                    }}
                    className={`${inputClass('description')} resize-y min-h-[100px]`}
                  />
                  {fieldErrors.description && (
                    <p className="text-[11px] font-semibold text-rose-400">{fieldErrors.description}</p>
                  )}
                </label>

                <button
                  type="submit"
                  disabled={ticketSubmitting}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-brand-600 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {ticketSubmitting ? 'Sending…' : 'Send to school / Geleza SA admin'}
                </button>

                <p className={`text-[10px] flex items-center gap-1.5 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                  <Mail className="w-3 h-3" />
                  You can also email support@gelezasa.co.za with your application reference.
                </p>
              </form>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
