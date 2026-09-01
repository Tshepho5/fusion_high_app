import React from 'react';
import { DollarSign, CheckCircle, ExternalLink, Sparkles, Building, ArrowRight, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BursaryCard {
  id: string;
  name: string;
  sponsor: string;
  annualValue: string;
  minAps: number;
  coverage: string[];
  targetFields: string;
  deadline: string;
  tagColor: string;
}

const BURSARIES: BursaryCard[] = [
  {
    id: 'bursary-1',
    name: 'Telkom Centre of Excellence Tech Bursary',
    sponsor: 'Telkom SA',
    annualValue: 'R135,000 / yr',
    minAps: 34,
    coverage: ['Full Tuition', 'Residence & Meals', 'Laptop + 5G Data', 'Mentorship'],
    targetFields: 'Computer Science, Software Engineering, AI & Data Science',
    deadline: '31 July 2026',
    tagColor: 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10',
  },
  {
    id: 'bursary-2',
    name: 'Vodacom Early Career STEM Scholarship',
    sponsor: 'Vodacom Foundation',
    annualValue: 'R140,000 / yr',
    minAps: 36,
    coverage: ['100% Tuition', 'Accommodation Allowance', 'Tech Device', 'Vacation Work'],
    targetFields: 'Electrical/Electronic Engineering, IT, Cybersecurity, Mathematics',
    deadline: '31 August 2026',
    tagColor: 'border-rose-500/40 text-rose-400 bg-rose-500/10',
  },
  {
    id: 'bursary-3',
    name: 'Sasol Energy & Chemical Engineering Bursary',
    sponsor: 'Sasol South Africa',
    annualValue: 'R150,000 / yr',
    minAps: 35,
    coverage: ['Tuition & Books', 'University Accommodation', 'Monthly Stipend', 'Guaranteed Employment'],
    targetFields: 'Chemical Engineering, Mechanical Engineering, Chemistry, Geology',
    deadline: '28 August 2026',
    tagColor: 'border-indigo-500/40 text-indigo-400 bg-indigo-500/10',
  },
  {
    id: 'bursary-4',
    name: 'Allan Gray Orbis Foundation Fellowship',
    sponsor: 'Allan Gray',
    annualValue: 'Full Cost of Study',
    minAps: 32,
    coverage: ['Comprehensive Tuition', 'Personal Development Coach', 'Book Allowance', 'Entrepreneurship Hub'],
    targetFields: 'Commerce, Engineering, Science, Law, Humanities',
    deadline: '30 April 2026',
    tagColor: 'border-amber-500/40 text-amber-400 bg-amber-500/10',
  },
];

export const BursariesShowcase: React.FC = () => {
  return (
    <section className="relative w-full max-w-5xl mx-auto my-16 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-400">
            <DollarSign className="w-3.5 h-3.5" />
            <span>SOUTH AFRICAN TERTIARY BURSARY ECOSYSTEM</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
            Over <span className="text-emerald-400">R5.2 Million</span> in Bursaries Tracked for Our Learners
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            Our AI continuously tracks closing dates, eligibility thresholds, and minimum APS requirements to match learners with corporate sponsorships.
          </p>
        </div>

        <Link
          to="/login"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 text-xs font-bold transition-all active:scale-95 shrink-0"
        >
          <span>View All 25+ Bursaries</span>
          <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
        </Link>
      </div>

      {/* Bursary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {BURSARIES.map((b) => (
          <div
            key={b.id}
            className="rounded-3xl bg-surface-dark/95 border border-white/10 hover:border-white/20 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-500/5 flex flex-col justify-between space-y-4 group"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className={`inline-block px-2.5 py-0.5 rounded-lg border text-[10px] font-mono font-bold uppercase mb-1.5 ${b.tagColor}`}>
                    {b.sponsor}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold font-display text-white group-hover:text-cyan-300 transition-colors">
                    {b.name}
                  </h3>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold">Value</span>
                  <span className="text-sm sm:text-base font-extrabold text-emerald-400 font-mono">
                    {b.annualValue}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                <strong className="text-slate-200">Focus Fields:</strong> {b.targetFields}
              </p>

              {/* Coverage list */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {b.coverage.map((c, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/8 text-[11px] text-slate-300 font-medium"
                  >
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                    <span>{c}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Card Footer */}
            <div className="border-t border-white/10 pt-3.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-mono">Min APS:</span>
                <span className="font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                  {b.minAps}+
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400 text-[11px]">Closes {b.deadline}</span>
              </div>

              <Link
                to="/login"
                className="font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 group-hover:underline"
              >
                <span>Check Match</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
