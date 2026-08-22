import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle2, Lock, FileText, AlertCircle, Scale, BookOpen, UserCheck, Sparkles, ChevronRight, X } from 'lucide-react';

interface TermsAgreementModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  isMandatoryGate?: boolean;
}

export const TERMS_STORAGE_KEY = 'fusion_terms_accepted_v2_1';

export const TermsAgreementModal: React.FC<TermsAgreementModalProps> = ({
  isOpen: controlledIsOpen,
  onClose,
  isMandatoryGate = false
}) => {
  const [hasAccepted, setHasAccepted] = useState<boolean>(() => {
    return localStorage.getItem(TERMS_STORAGE_KEY) === 'true';
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'acceptable_use' | 'privacy_popia' | 'ai_academic' | 'child_safety'>('overview');
  
  // Agreement Checkboxes
  const [checkAcademic, setCheckAcademic] = useState<boolean>(false);
  const [checkPopia, setCheckPopia] = useState<boolean>(false);
  const [checkAcceptableUse, setCheckAcceptableUse] = useState<boolean>(false);

  // If used as a mandatory gate and not accepted yet, show automatically
  const shouldShow = controlledIsOpen !== undefined ? controlledIsOpen : (!hasAccepted && isMandatoryGate);

  useEffect(() => {
    const accepted = localStorage.getItem(TERMS_STORAGE_KEY) === 'true';
    setHasAccepted(accepted);
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem(TERMS_STORAGE_KEY, 'true');
    localStorage.setItem('fusion_terms_accepted_timestamp', new Date().toISOString());
    setHasAccepted(true);
    if (onClose) onClose();
  };

  if (!shouldShow) return null;

  const allChecked = checkAcademic && checkPopia && checkAcceptableUse;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-3xl bg-surface-dark border border-brand-500/40 shadow-2xl shadow-brand-500/20 text-white flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-brand-950 via-surface-darker to-surface-dark border-b border-white/10 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-brand-600 to-cyan-500 text-white shadow-glow-indigo shrink-0">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold font-display tracking-wide text-white">
                  Terms of Service & Acceptable Use Policy
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-[10px] font-mono text-cyan-300 font-bold">
                  v2.1 POPIA
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Fusion High School Management System • South African National DBE Standards
              </p>
            </div>
          </div>

          {/* Close button only enabled if user has already accepted before or not in mandatory gate */}
          {hasAccepted && onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Close Terms"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Mandatory Gate Notice Banner if not accepted */}
        {!hasAccepted && (
          <div className="px-5 py-2.5 bg-amber-500/15 border-b border-amber-500/30 flex items-center gap-2 text-amber-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              <strong>Mandatory Agreement Required:</strong> All learners, educators, parents, and administrative staff must review and agree to these terms before accessing the portal.
            </span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 px-5 py-2.5 bg-surface-darker border-b border-white/5 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
              activeTab === 'overview' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            1. Overview & Scope
          </button>
          <button
            onClick={() => setActiveTab('acceptable_use')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
              activeTab === 'acceptable_use' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            2. Acceptable Use
          </button>
          <button
            onClick={() => setActiveTab('privacy_popia')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
              activeTab === 'privacy_popia' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            3. Privacy & POPIA
          </button>
          <button
            onClick={() => setActiveTab('ai_academic')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
              activeTab === 'ai_academic' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            4. AI & Academic Integrity
          </button>
          <button
            onClick={() => setActiveTab('child_safety')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
              activeTab === 'child_safety' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            5. Child Protection
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs leading-relaxed text-slate-300">
          {activeTab === 'overview' && (
            <div className="space-y-3 animate-fade-in">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>1. Purpose, Legal Scope & Authorization</span>
              </h3>
              <p>
                Welcome to <strong>Fusion High School Management System (v2.1)</strong>. These Terms and Conditions govern the access, utilization, and interactions within the digital educational environment provided by Fusion High School for all registered <strong>Learners, Teachers, Parents/Legal Guardians, and Administrative Staff</strong>.
              </p>
              <p>
                By clicking <em>"I Agree & Continue"</em>, logging into an account, or submitting an application, you enter into a legally binding agreement under the laws of the <strong>Republic of South Africa</strong>, including the <em>South African Schools Act (No. 84 of 1996)</em>, the <em>National Curriculum Statement (CAPS)</em>, and the <em>Protection of Personal Information Act (POPIA No. 4 of 2013)</em>.
              </p>
              <div className="p-3 rounded-2xl bg-surface-darker border border-white/10 space-y-1 text-slate-400">
                <p className="font-bold text-white text-[11px]">Key Governance Principles:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>Zero tolerance for cyberbullying, harassment, or unauthorized account access.</li>
                  <li>Strict protection of learner academic, attendance, and biometric/identity records.</li>
                  <li>Ethical utilization of AI Tutoring tools as study aids, not automated cheating devices.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'acceptable_use' && (
            <div className="space-y-3 animate-fade-in">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>2. Acceptable Use Policy & Disciplinary Regulations</span>
              </h3>
              <p>
                Every user is assigned a role-based credential (Learner, Teacher, Parent, Admin). You agree to:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-300">
                <li><strong>Account Confidentiality:</strong> Never share your passwords, OTP codes, or student login badges with third parties.</li>
                <li><strong>Digital Etiquette:</strong> Respectful, professional communication in all messaging threads, voice notes, and homework submissions.</li>
                <li><strong>System Integrity:</strong> Never attempt SQL injections, reverse-engineering, denial of service attacks, or scraping of school databases.</li>
                <li><strong>Device & Asset Care:</strong> Responsible usage of school-issued textbooks, lab equipment, and digital tablets.</li>
              </ul>
              <p className="text-rose-300 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                <strong>Violation Penalty:</strong> Breaches of acceptable use may result in immediate suspension of digital portal access, detention logging in the conduct book, or disciplinary hearings in accordance with the School Code of Conduct.
              </p>
            </div>
          )}

          {activeTab === 'privacy_popia' && (
            <div className="space-y-3 animate-fade-in">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-400" />
                <span>3. POPIA Compliance & Personal Data Processing</span>
              </h3>
              <p>
                In compliance with South Africa's <em>Protection of Personal Information Act (POPIA)</em>, Fusion High School acts as the Responsible Party for all personal information collected:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="p-3 rounded-2xl bg-surface-darker border border-white/10 space-y-1">
                  <p className="font-bold text-white text-[11px]">Information Collected:</p>
                  <p className="text-[11px] text-slate-400">
                    Learner & Parent Full Names, South African ID Numbers, Home Addresses, Contact Information, Academic Marks, Daily Attendance Records, and Uploaded Identity Documents.
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-surface-darker border border-white/10 space-y-1">
                  <p className="font-bold text-white text-[11px]">Purpose of Processing:</p>
                  <p className="text-[11px] text-slate-400">
                    Statutory DBE CAPS reporting, university APS tracking, emergency parent absence alerts, term report compilation, and secure parent-teacher communication.
                  </p>
                </div>
              </div>
              <p className="text-slate-400">
                We implement salted bcrypt password hashing, encrypted JWT session tokens, and strict database connection security. Your personal information is never sold to commercial third parties.
              </p>
            </div>
          )}

          {activeTab === 'ai_academic' && (
            <div className="space-y-3 animate-fade-in">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>4. AI Voice Tutor & Academic Honesty Protocol</span>
              </h3>
              <p>
                The platform features advanced <strong>AI Voice Tutoring (Speech-to-Text and Text-to-Speech)</strong>, automated homework evaluation, and assessment generators:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-300">
                <li><strong>Educational Purpose:</strong> The AI Voice Tutor is designed as an interactive 24/7 study partner to explain complex formulas, offer practice questions, and clarify concepts across South Africa's 11 official languages.</li>
                <li><strong>Academic Honesty:</strong> Learners must produce their own homework, project answers, and test responses. Plagiarism or blindly submitting AI-generated text without personal comprehension is strictly prohibited.</li>
                <li><strong>Curriculum Guardrails:</strong> AI responses are calibrated against the CAPS curriculum and DBE examination standards.</li>
              </ul>
            </div>
          )}

          {activeTab === 'child_safety' && (
            <div className="space-y-3 animate-fade-in">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>5. Child Safety, Parental Consent & Rights</span>
              </h3>
              <p>
                As an institution catering to minor learners (Grades 8 to 12), Fusion High School enforces child safeguarding standards:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-300">
                <li>Parents and legal guardians retain full rights to inspect their child's academic marks, attendance roster, and disciplinary logs via the <strong>Parent Portal</strong>.</li>
                <li>Learners under the age of 18 are enrolled under the authorized consent of their registered primary parent or guardian.</li>
                <li>Direct messaging with educators is archived and auditable by school administrators to maintain child protection norms.</li>
              </ul>
            </div>
          )}
        </div>

        {/* Agreement Checkboxes & Action Buttons Footer */}
        <div className="p-5 bg-surface-darker border-t border-white/10 space-y-3">
          {!hasAccepted ? (
            <>
              <div className="space-y-2 text-xs">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={checkAcademic}
                    onChange={(e) => setCheckAcademic(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-white/20 text-brand-600 focus:ring-brand-500 bg-surface-dark cursor-pointer"
                  />
                  <span className="text-slate-300">
                    I agree to uphold <strong>Academic Integrity</strong> and use the AI Voice Tutor and past papers strictly for ethical learning.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={checkPopia}
                    onChange={(e) => setCheckPopia(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-white/20 text-brand-600 focus:ring-brand-500 bg-surface-dark cursor-pointer"
                  />
                  <span className="text-slate-300">
                    I consent to <strong>POPIA Compliant</strong> educational data processing (attendance, marks, and communication).
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={checkAcceptableUse}
                    onChange={(e) => setCheckAcceptableUse(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-white/20 text-brand-600 focus:ring-brand-500 bg-surface-dark cursor-pointer"
                  />
                  <span className="text-slate-300">
                    I have read and agree to abide by the <strong>Fusion High Acceptable Use Policy & Disciplinary Rules</strong>.
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <span className="text-[11px] text-slate-400 font-mono">
                  {allChecked ? '✓ All required terms checked' : 'Please check all 3 boxes above'}
                </span>
                
                <button
                  type="button"
                  disabled={!allChecked}
                  onClick={handleAcceptAll}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-extrabold shadow-glow-indigo transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>I Agree & Unlock Portal</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold font-mono">
                <CheckCircle2 className="w-4 h-4" />
                <span>You have accepted the Fusion High Terms & Conditions (v2.1)</span>
              </div>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors"
                >
                  Close Window
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
