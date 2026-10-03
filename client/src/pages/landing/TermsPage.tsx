import React from 'react';
import { Link } from 'react-router-dom';
import { Scale, ArrowLeft, FileText } from 'lucide-react';

const DOC_META = {
  title: 'Terms and Conditions & Acceptable Use Policy',
  docId: 'GSA-DOC-TERMS-001',
  version: '2.1',
  effective: '1 January 2026',
  jurisdiction: 'Republic of South Africa',
};

export const TermsPage: React.FC = () => {
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
                Legal Documentation
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
          <div className="px-6 md:px-10 py-8 border-b border-white/10 bg-surface-darker/60 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-brand-600 to-cyan-500 text-white shrink-0">
                <Scale className="w-5 h-5" />
              </div>
              <div className="min-w-0 space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-mono text-cyan-300 font-bold uppercase tracking-wider">
                  <FileText className="w-3.5 h-3.5" />
                  <span>{DOC_META.docId}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
                  {DOC_META.title}
                </h1>
                <p className="text-xs text-slate-400">
                  This document sets out the binding terms under which users may access and use the Geleza SA
                  School Management System.
                </p>
              </div>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
              <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
                <dt className="text-slate-500 uppercase tracking-wider font-bold">Version</dt>
                <dd className="text-white font-mono mt-0.5">{DOC_META.version}</dd>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
                <dt className="text-slate-500 uppercase tracking-wider font-bold">Effective date</dt>
                <dd className="text-white font-mono mt-0.5">{DOC_META.effective}</dd>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
                <dt className="text-slate-500 uppercase tracking-wider font-bold">Jurisdiction</dt>
                <dd className="text-white font-mono mt-0.5">{DOC_META.jurisdiction}</dd>
              </div>
            </dl>
          </div>

          <div className="px-6 md:px-10 py-8 space-y-8 text-sm text-slate-300 leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-base font-bold text-white border-b border-white/10 pb-2">
                1. Definitions
              </h2>
              <p>For the purposes of this document:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  <strong className="text-white">&ldquo;Geleza SA&rdquo;</strong> means Geleza South Africa and the
                  digital school management and learning platform operated under that name.
                </li>
                <li>
                  <strong className="text-white">&ldquo;Platform&rdquo;</strong> means the websites, portals,
                  applications, and related services provided by Geleza SA.
                </li>
                <li>
                  <strong className="text-white">&ldquo;User&rdquo;</strong> means any authorised administrator,
                  educator, learner, parent, or guardian who accesses the Platform.
                </li>
                <li>
                  <strong className="text-white">&ldquo;School&rdquo;</strong> means an educational institution
                  registered on Geleza SA to administer its academic and operational records.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-bold text-white border-b border-white/10 pb-2">
                2. Acceptance of terms
              </h2>
              <p>
                By creating an account, signing in, submitting an application, or otherwise using the Platform,
                the User agrees to be bound by these Terms and Conditions. If the User does not agree, access
                to the Platform must not be used.
              </p>
              <p>
                These Terms are governed by the laws of the Republic of South Africa, including the South African
                Schools Act (No. 84 of 1996), the National Curriculum Statement (CAPS), and the Protection of
                Personal Information Act (POPIA No. 4 of 2013).
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-bold text-white border-b border-white/10 pb-2">
                3. Scope of service
              </h2>
              <p>
                Geleza SA provides a centralised digital environment for school administration and learning
                support. Services may include, as enabled by each School: admissions, attendance, assessments,
                CAPS report cards, homework and resources, messaging, parent–teacher consultations, school fee
                records, and AI-assisted study tools.
              </p>
              <p>
                Geleza SA does not replace the statutory authority of a School&apos;s governing body or the
                Department of Basic Education. Academic decisions and official records remain the responsibility
                of the School that uploads or approves them.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-bold text-white border-b border-white/10 pb-2">
                4. Accounts and acceptable use
              </h2>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Users must keep login credentials confidential and must not share accounts.</li>
                <li>
                  Users must not attempt unauthorised access, reverse engineering, scraping, disruption of
                  services, or interference with another User&apos;s records.
                </li>
                <li>
                  Signing in on a new device may replace any previous active session for the same account.
                  The previous session will be signed out automatically.
                </li>
                <li>
                  Misuse of the Platform may result in suspension or termination of access and may be referred
                  to the School for disciplinary action under its applicable policies.
                </li>
              </ol>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-bold text-white border-b border-white/10 pb-2">
                5. Personal information and POPIA
              </h2>
              <p>
                Geleza SA processes personal information for legitimate educational and administrative purposes,
                including identity verification, academic record-keeping, attendance, communications, and
                statutory reporting where required.
              </p>
              <p>
                Personal information is handled in accordance with POPIA. Schools and Users must only submit
                information that they are lawfully entitled to process. Requests relating to access, correction,
                or deletion of personal information should be directed through the School and/or Geleza SA
                Administration, as applicable.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-bold text-white border-b border-white/10 pb-2">
                6. Academic integrity and AI tools
              </h2>
              <p>
                AI study assistants and related tools are provided to support understanding and revision. They
                do not replace formal assessment. Learners must complete assignments, tests, and examinations
                honestly and in accordance with School assessment rules. Schools may restrict or audit AI tool
                use where required for academic integrity.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-bold text-white border-b border-white/10 pb-2">
                7. Child protection and parental oversight
              </h2>
              <p>
                Parent and guardian accounts are intended to support oversight of linked learners, including
                progress, attendance, notices, and approved communications. Adults responsible for learners
                must ensure that account use remains appropriate and protective of the learner&apos;s interests.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-bold text-white border-b border-white/10 pb-2">
                8. Fees and third-party services
              </h2>
              <p>
                Where school fee or payment features are enabled, statements and payment instructions are
                determined by the School. Geleza SA is not a bank and does not set school fee amounts unless
                expressly contracted otherwise. Third-party payment processors, where used, are subject to their
                own terms.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-bold text-white border-b border-white/10 pb-2">
                9. Availability and limitation of liability
              </h2>
              <p>
                Geleza SA endeavours to maintain reliable service but does not warrant uninterrupted availability.
                To the extent permitted by South African law, Geleza SA is not liable for indirect or consequential
                loss arising from use of, or inability to use, the Platform. Nothing in these Terms excludes
                liability that cannot lawfully be excluded.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-bold text-white border-b border-white/10 pb-2">
                10. Amendments
              </h2>
              <p>
                Geleza SA may update these Terms from time to time. The version and effective date shown in this
                document will be revised accordingly. Continued use of the Platform after an update constitutes
                acceptance of the revised Terms, except where acceptance is expressly required again at sign-in.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-bold text-white border-b border-white/10 pb-2">
                11. Contact
              </h2>
              <p>
                Questions regarding these Terms may be directed to Geleza SA Administration through the official
                contact channels published on the Platform, or via Help &amp; Support for registered Users.
              </p>
              <p className="text-xs text-slate-500 font-mono pt-2">
                Document end — {DOC_META.docId} · v{DOC_META.version} · Effective {DOC_META.effective}
              </p>
            </section>
          </div>
        </article>

        <div className="mt-8 text-center">
          <Link to="/about" className="text-xs font-semibold text-cyan-400 hover:text-cyan-300">
            Read the About Geleza SA documentation
          </Link>
        </div>
      </main>

      <footer className="py-6 px-4 border-t border-white/10 bg-surface-darker text-xs text-slate-500 text-center">
        &copy; {new Date().getFullYear()} Geleza SA. All rights reserved. POPIA-aligned legal documentation.
      </footer>
    </div>
  );
};
