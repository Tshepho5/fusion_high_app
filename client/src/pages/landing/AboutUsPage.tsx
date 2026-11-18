import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowLeft,
  FileText,
  Building2,
  Target,
  BookOpen,
  ShieldCheck,
  Users,
  Cpu,
  Scale
} from 'lucide-react';

const DOC_META = {
  title: 'About Geleza SA',
  docId: 'GSA-DOC-ABOUT-001',
  version: '2.1',
  effective: '1 January 2026',
  classification: 'Public Information',
};

export const AboutUsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-canvas-dark text-slate-100 flex flex-col">
      <header className="sticky top-0 z-30 px-4 md:px-8 py-4 bg-surface-darker/95 border-b border-white/10 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3.5 group">
            <div className="w-10 h-10 rounded-xl bg-white/5 p-1 border border-white/15 flex items-center justify-center group-hover:scale-105 transition-transform overflow-hidden">
              <img src="/assets/geleza-logo.png" alt="Geleza SA Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-display text-lg font-extrabold tracking-tight text-white block leading-tight">
                GELEZA SA
              </span>
              <span className="text-[10px] font-mono tracking-wider text-cyan-400 uppercase font-bold block">
                Official Documentation
              </span>
            </div>
          </Link>

          <Link
            to="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-4 md:px-8 py-10 w-full">
        <article className="rounded-3xl bg-surface-dark border border-white/10 shadow-2xl overflow-hidden">
          {/* Document masthead */}
          <div className="px-6 md:px-10 py-8 border-b border-white/10 bg-surface-darker/60 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-mono text-cyan-300 font-bold uppercase tracking-wider">
              <FileText className="w-3.5 h-3.5" />
              <span>{DOC_META.docId}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
              {DOC_META.title}
            </h1>
            <p className="text-sm text-slate-400 italic">
              Motto: &ldquo;Geleza Smart, The Future Is Thine.&rdquo;
            </p>
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] pt-2">
              <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
                <dt className="text-slate-500 uppercase tracking-wider font-bold">Version</dt>
                <dd className="text-white font-mono mt-0.5">{DOC_META.version}</dd>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
                <dt className="text-slate-500 uppercase tracking-wider font-bold">Effective date</dt>
                <dd className="text-white font-mono mt-0.5">{DOC_META.effective}</dd>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
                <dt className="text-slate-500 uppercase tracking-wider font-bold">Classification</dt>
                <dd className="text-white font-mono mt-0.5">{DOC_META.classification}</dd>
              </div>
            </dl>
          </div>

          <div className="px-6 md:px-10 py-8 space-y-8 text-sm text-slate-300 leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-2">
                <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>1. Organisation overview</span>
              </h2>
              <p>
                Geleza SA (Geleza South Africa) is a South African digital school management and learning platform
                designed for secondary schools delivering the Curriculum and Assessment Policy Statement (CAPS)
                under the Department of Basic Education (DBE).
              </p>
              <p>
                The platform provides a single, secure environment in which registered schools may administer
                admissions, attendance, assessments, report cards, communications, fees, and learner support tools
                for Grades 8 to 12.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-2">
                <Target className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>2. Purpose and scope</span>
              </h2>
              <p>
                The purpose of Geleza SA is to support schools, educators, learners, and parents with accurate
                academic administration and accessible digital learning services. The platform is intended for
                authorised users only, namely:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
                <li>School administrators and principals</li>
                <li>Educators and academic staff</li>
                <li>Enrolled learners</li>
                <li>Parents and legal guardians linked to enrolled learners</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-2">
                <BookOpen className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>3. Academic alignment</span>
              </h2>
              <p>
                Geleza SA is structured around CAPS requirements for the General Education and Training (GET)
                and Further Education and Training (FET) phases. Subject pathways commonly supported through
                participating schools include:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Science and STEM (Mathematics, Physical Sciences, Life Sciences, Information Technology)</li>
                <li>Commerce (Accounting, Business Studies, Economics, EMS)</li>
                <li>Humanities (Geography, History, Tourism, Life Orientation)</li>
                <li>Languages, including Home Language and First Additional Language options across South Africa&apos;s official languages, as configured by each school</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-2">
                <Cpu className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>4. Platform capabilities</span>
              </h2>
              <p>Core services provided through Geleza SA include, without limitation:</p>
              <ol className="list-decimal pl-5 space-y-1.5">
                <li>School registration, module configuration, and role-based access control</li>
                <li>Learner and parent onboarding, including identity verification where required</li>
                <li>Period attendance, notices, messaging, and parent–teacher consultations</li>
                <li>Assessment capture, CAPS report cards, and academic progress views</li>
                <li>School fee statements and related payment records (where enabled by the school)</li>
                <li>AI-assisted study support tools for authorised learners</li>
              </ol>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-2">
                <Users className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>5. Stakeholder responsibilities</span>
              </h2>
              <p>
                Schools remain responsible for the accuracy of academic records they upload, for staff and learner
                enrolment decisions, and for compliance with their own governing body policies. Geleza SA provides
                the technical systems and safeguards necessary to store, display, and transmit that information
                to authorised parties.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>6. Governance and compliance</span>
              </h2>
              <p>
                Geleza SA is operated with regard to applicable South African law, including the South African
                Schools Act (No. 84 of 1996) and the Protection of Personal Information Act (POPIA No. 4 of 2013).
                Detailed conditions of use are set out in the Geleza SA Terms and Conditions document.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-2">
                <Scale className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>7. Contact</span>
              </h2>
              <p>
                For institutional enquiries, school onboarding, or documentation requests, contact Geleza SA
                Administration through the official channels published on the platform. Operational support for
                registered users is available via Help &amp; Support within each portal.
              </p>
              <p className="text-xs text-slate-500 font-mono pt-2">
                Document end — {DOC_META.docId} · v{DOC_META.version}
              </p>
            </section>
          </div>
        </article>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link
            to="/terms"
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            View Terms and Conditions
          </Link>
          <Link
            to="/register"
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-glow-indigo"
          >
            Create an Account / Apply
          </Link>
        </div>
      </main>

      <footer className="py-6 px-4 border-t border-white/10 bg-surface-darker text-xs text-slate-500 text-center">
        &copy; {new Date().getFullYear()} Geleza SA. All rights reserved. POPIA-aligned · CAPS-oriented platform.
      </footer>
    </div>
  );
};
