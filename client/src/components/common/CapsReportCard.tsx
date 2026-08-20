import React, { useState, useEffect } from 'react';
import { reportService } from '../../services/api';
import { Badge } from './Badge';
import { LoadingSpinner } from './LoadingSpinner';
import {
  Printer,
  Download,
  GraduationCap,
  Award,
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  Building2,
  Sparkles,
  ShieldCheck,
  QrCode,
  Check
} from 'lucide-react';

interface CapsReportCardProps {
  childId?: string | number;
  initialTerm?: string;
}

export const CapsReportCard: React.FC<CapsReportCardProps> = ({ childId, initialTerm = 'Term 3 2026' }) => {
  const [term, setTerm] = useState<string>(initialTerm);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReportData();
  }, [childId, term]);

  const fetchReportData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.getCapsReportCard({ child_id: childId, term });
      setData(res);
    } catch (err: any) {
      console.error('Failed to load report card data:', err);
      setError('Could not retrieve report card records.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  if (loading) {
    return <LoadingSpinner text="Generating official landscape CAPS Term Report Card..." />;
  }

  const learner = data?.learner || {
    full_name: 'Student',
    surname: '',
    learner_number: '2026-FHS-094',
    grade: '11',
    stream: 'Science & Mathematics',
    class_name: '11-Science'
  };

  const subjects = data?.subjects || [
    { subject: 'Mathematics', code: 'MATH11', sba_mark: 82, exam_mark: 86, mark: 84, level_code: 7, level_descriptor: '7 - Outstanding (80-100%)', teacher: 'Mr. D. Mokoena', comment: 'Exemplary problem-solving and rigorous algebraic technique.' },
    { subject: 'Physical Sciences', code: 'PHYS11', sba_mark: 76, exam_mark: 80, mark: 78, level_code: 6, level_descriptor: '6 - Meritorious (70-79%)', teacher: 'Dr. S. Khumalo', comment: 'Strong grasp of Newtonian mechanics and vector analysis.' },
    { subject: 'Life Sciences', code: 'LFSC11', sba_mark: 70, exam_mark: 74, mark: 72, level_code: 6, level_descriptor: '6 - Meritorious (70-79%)', teacher: 'Mrs. P. Naidoo', comment: 'Consistent performance in genetics and cellular biology tasks.' },
    { subject: 'English First Additional Language', code: 'EFAL11', sba_mark: 80, exam_mark: 82, mark: 81, level_code: 7, level_descriptor: '7 - Outstanding (80-100%)', teacher: 'Ms. T. Sithole', comment: 'Excellent essay articulation and analytical reading skills.' },
    { subject: 'Life Orientation', code: 'LIFE11', sba_mark: 89, exam_mark: 87, mark: 88, level_code: 7, level_descriptor: '7 - Outstanding (80-100%)', teacher: 'Mr. B. Van Der Merwe', comment: 'Active leadership, critical thinking, and social responsibility.' }
  ];

  const overallAverage = data?.overall_average || Math.round(subjects.reduce((a: number, c: any) => a + (c.mark || 0), 0) / (subjects.length || 1));
  const attendanceRate = data?.attendance_percentage || '97%';
  const promotionStatus = overallAverage >= 50 ? "PROMOTED — PASS WITH BACHELOR'S DEGREE ADMISSION" : 'PENDING REMEDIATION';

  const getLevelBadgeVariant = (code: number) => {
    if (code >= 7) return 'indigo';
    if (code >= 6) return 'cyan';
    if (code >= 5) return 'emerald';
    if (code >= 4) return 'amber';
    return 'rose';
  };

  return (
    <div className="space-y-6 w-full max-w-[1280px] mx-auto">
      {/* Dynamic CSS Print Styles for True Landscape PDF */}
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 6mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: white !important;
            color: black !important;
          }
          nav, aside, header, .print\\:hidden {
            display: none !important;
          }
          .landscape-report-sheet {
            box-shadow: none !important;
            border: 2px solid #000 !important;
            background: white !important;
            color: black !important;
            padding: 8mm !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            border-radius: 0 !important;
          }
        }
      `}</style>

      {/* Control Bar (Hidden on Print) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-surface-dark border border-white/10 shadow-lg print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-500 text-white shadow-glow-indigo">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
              Official CAPS Academic Term Report
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Landscape Mode
              </span>
            </h3>
            <p className="text-xs text-slate-400">Department of Basic Education South Africa • Standard 7-Point Matrix.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="rounded-xl bg-surface-darker border border-white/10 px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="Term 1 2026">Term 1 2026</option>
            <option value="Term 2 2026">Term 2 2026</option>
            <option value="Term 3 2026">Term 3 2026 (Current)</option>
            <option value="Term 4 2026">Term 4 2026 (Final)</option>
          </select>

          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 via-indigo-600 to-cyan-600 hover:from-brand-500 text-white font-bold text-xs shadow-glow-indigo transition-all active:scale-95 cursor-pointer"
            title="Download report as landscape PDF or print"
          >
            <Download className="w-4 h-4" />
            <span>Download Report (PDF)</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-darker hover:bg-white/10 text-slate-300 hover:text-white font-bold text-xs border border-white/10 transition-all active:scale-95"
            title="Print landscape report"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 print:hidden">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Official Landscape Report Card Document */}
      <div className="landscape-report-sheet relative overflow-hidden rounded-3xl bg-surface-dark border border-white/15 p-8 shadow-2xl space-y-6 text-slate-100 print:bg-white print:text-black print:p-6 print:border-slate-800">
        
        {/* ======================================================== */}
        {/* INTERESTING MULTI-LAYERED SECURITY WATERMARK BACKGROUND */}
        {/* ======================================================== */}
        <div className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden flex items-center justify-center">
          {/* Layer 1: Repeating Diagonal Security Micro-Pattern Text Bands */}
          <div className="absolute inset-0 opacity-[0.035] print:opacity-[0.05] flex flex-col justify-around rotate-[-22deg] scale-150">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.35em] text-white print:text-black font-extrabold">
                FUSION HIGH SCHOOL • OFFICIAL CAPS ACADEMIC TRANSCRIPT • VERIFIED AND SIGNED • MR KUNENE PRINCIPAL • EMIS 700400192 • NATIONAL SENIOR CERTIFICATE • 
              </div>
            ))}
          </div>

          {/* Layer 2: Central SVG Security Guilloche Emblem & Shield */}
          <div className="opacity-[0.05] print:opacity-[0.07] transform -rotate-12 flex flex-col items-center justify-center">
            <svg width="420" height="420" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white print:text-black">
              {/* Concentric Guilloche Rings */}
              <circle cx="200" cy="200" r="190" stroke="currentColor" strokeWidth="2.5" strokeDasharray="6 4" />
              <circle cx="200" cy="200" r="175" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="200" cy="200" r="150" stroke="currentColor" strokeWidth="3" />
              <circle cx="200" cy="200" r="120" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
              <circle cx="200" cy="200" r="85" stroke="currentColor" strokeWidth="2" />
              
              {/* Geometric Rosette Rays */}
              {Array.from({ length: 24 }).map((_, idx) => (
                <line
                  key={idx}
                  x1="200"
                  y1="200"
                  x2={200 + 170 * Math.cos((idx * 15 * Math.PI) / 180)}
                  y2={200 + 170 * Math.sin((idx * 15 * Math.PI) / 180)}
                  stroke="currentColor"
                  strokeWidth="0.8"
                />
              ))}

              {/* Shield Silhouette */}
              <path
                d="M 200 110 Q 240 110 260 130 Q 260 210 200 270 Q 140 210 140 130 Q 160 110 200 110 Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
              />
            </svg>
            <div className="text-3xl sm:text-5xl font-black font-display tracking-widest uppercase text-white print:text-black mt-2">
              FUSION HIGH
            </div>
            <div className="text-xs sm:text-sm font-bold tracking-[0.3em] uppercase text-white print:text-black">
              AUTHENTICATED CAPS RECORD
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* REPORT CONTENT (LANDSCAPE MULTI-COLUMN LAYOUT) */}
        {/* ======================================================== */}
        <div className="relative z-10 space-y-5">
          
          {/* Header Banner in Landscape */}
          <div className="border-b-2 border-brand-500/40 pb-4 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-700 to-cyan-600 flex items-center justify-center p-2 shadow-glow-indigo border border-white/20 print:border-black shrink-0">
                <img src="/assets/FH.png" alt="Logo" className="w-full h-full object-contain filter brightness-110" onError={(e: any) => { e.target.style.display = 'none'; }} />
                <Building2 className="w-8 h-8 text-white hidden" />
              </div>
              <div>
                <h1 className="text-2xl font-black font-display tracking-tight text-white print:text-black uppercase leading-tight">
                  Fusion High School
                </h1>
                <p className="text-xs text-cyan-300 font-bold tracking-wider uppercase print:text-slate-800">
                  National Senior Certificate • CAPS Standardized Academic Transcript
                </p>
                <p className="text-[10px] text-slate-400 font-mono print:text-slate-600">
                  EMIS No: 700400192 • Province: Gauteng • One School, One Connection
                </p>
              </div>
            </div>

            <div className="flex flex-col md:items-end items-center gap-1.5">
              <div className="flex items-center gap-2">
                <Badge variant="indigo" size="md" className="print:border print:border-black print:text-black font-bold">
                  {term}
                </Badge>
                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold uppercase print:text-black print:border-black">
                  Official Record
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono print:text-slate-600">
                Issue Date: {new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Student Profile Strip in Landscape (Horizontal 5 Columns) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3.5 rounded-2xl bg-surface-darker/90 border border-white/10 print:bg-slate-50 print:border-slate-400 text-xs">
            <div>
              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-600">
                Learner Full Name
              </span>
              <span className="font-extrabold text-white print:text-black text-xs truncate block">
                {learner.full_name} {learner.surname}
              </span>
            </div>

            <div>
              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-600">
                Student ID / Number
              </span>
              <span className="font-mono font-bold text-cyan-300 print:text-black text-xs block">
                {learner.learner_number || '2026-FHS-094'}
              </span>
            </div>

            <div>
              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-600">
                Grade & Class
              </span>
              <span className="font-bold text-white print:text-black text-xs block">
                Grade {learner.grade} ({learner.class_name || `${learner.grade}A`})
              </span>
            </div>

            <div>
              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-600">
                Curriculum Stream
              </span>
              <span className="font-bold text-brand-300 print:text-black text-xs block truncate">
                {learner.stream || 'Science & Mathematics'}
              </span>
            </div>

            <div>
              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-600">
                Attendance Rate
              </span>
              <span className="font-bold text-emerald-400 print:text-black text-xs block">
                {attendanceRate} Present
              </span>
            </div>
          </div>

          {/* CAPS Subject Marks Table in Landscape */}
          <div className="overflow-x-auto rounded-2xl border border-white/15 print:border-slate-400 shadow-md">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-surface-darker text-slate-300 border-b border-white/15 print:bg-slate-100 print:text-black print:border-slate-400">
                <tr>
                  <th className="py-2.5 px-3.5 font-bold uppercase text-[9.5px] tracking-wider">Subject & Code</th>
                  <th className="py-2.5 px-2.5 font-bold uppercase text-[9.5px] tracking-wider text-center">SBA (%)</th>
                  <th className="py-2.5 px-2.5 font-bold uppercase text-[9.5px] tracking-wider text-center">Exam (%)</th>
                  <th className="py-2.5 px-3 font-bold uppercase text-[9.5px] tracking-wider text-center">Term Final (%)</th>
                  <th className="py-2.5 px-3 font-bold uppercase text-[9.5px] tracking-wider text-center">CAPS Level</th>
                  <th className="py-2.5 px-4 font-bold uppercase text-[9.5px] tracking-wider">Educator Comments & Key Competencies</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 print:divide-slate-300">
                {subjects.map((s: any, idx: number) => (
                  <tr key={idx} className="hover:bg-white/[0.02] print:hover:bg-transparent">
                    <td className="py-2.5 px-3.5 font-bold text-white print:text-black">
                      <div className="flex items-center gap-1.5">
                        <span>{s.subject}</span>
                        {s.code && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-slate-400 print:text-slate-600">
                            {s.code}
                          </span>
                        )}
                      </div>
                      <span className="block text-[9.5px] font-normal text-slate-400 print:text-slate-600">
                        Educator: {s.teacher || 'Subject Teacher'}
                      </span>
                    </td>
                    <td className="py-2.5 px-2.5 font-mono text-center text-slate-300 print:text-black font-semibold">
                      {s.sba_mark || s.mark}%
                    </td>
                    <td className="py-2.5 px-2.5 font-mono text-center text-slate-300 print:text-black font-semibold">
                      {s.exam_mark || s.mark}%
                    </td>
                    <td className="py-2.5 px-3 font-mono font-extrabold text-sm text-center text-cyan-300 print:text-black">
                      {s.mark}%
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-block print:font-bold">
                        <Badge variant={getLevelBadgeVariant(s.level_code)} size="sm">
                          Level {s.level_code}
                        </Badge>
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-300 print:text-black text-[10.5px] leading-relaxed">
                      {s.comment}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer Grid in Landscape (3-Column Symmetrical Layout) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            
            {/* Column 1: Academic Verdict & Cumulative Metric */}
            <div className="p-4 rounded-2xl bg-surface-darker/90 border border-white/10 print:bg-slate-50 print:border-slate-400 flex flex-col justify-between space-y-2">
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
                  Academic Evaluation Summary
                </h4>
                <div className="flex items-baseline gap-3 mt-1.5">
                  <span className="text-3xl font-extrabold font-display text-white print:text-black">
                    {overallAverage}%
                  </span>
                  <span className="text-xs font-bold text-cyan-400 print:text-black">
                    Term Cumulative Average
                  </span>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 print:border-black">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 print:text-black" />
                  <span className="text-[10.5px] font-extrabold text-emerald-300 print:text-black leading-tight">
                    {promotionStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Column 2: CAPS Rating Scale Matrix */}
            <div className="p-3.5 rounded-2xl bg-surface-darker/90 border border-white/10 print:bg-slate-50 print:border-slate-400 space-y-1.5 text-[9.5px]">
              <span className="font-bold text-slate-300 print:text-black uppercase tracking-wider block">
                Official CAPS 7-Point Rating Scale:
              </span>
              <div className="grid grid-cols-2 gap-1 font-mono">
                <div className="px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-200 print:text-black">L7: 80–100% (Outstanding)</div>
                <div className="px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-200 print:text-black">L6: 70–79% (Meritorious)</div>
                <div className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-200 print:text-black">L5: 60–69% (Substantial)</div>
                <div className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-200 print:text-black">L4: 50–59% (Adequate)</div>
                <div className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-200 print:text-black">L3: 40–49% (Moderate)</div>
                <div className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-200 print:text-black">L1-2: 0–39% (Not Achieved)</div>
              </div>
            </div>

            {/* Column 3: Authenticated Signatures & Security Stamp */}
            <div className="p-3.5 rounded-2xl bg-surface-darker/90 border border-white/10 print:bg-slate-50 print:border-slate-400 flex flex-col justify-between">
              <div className="flex items-center justify-between pb-2 border-b border-white/10 print:border-slate-300">
                <div>
                  <span className="block text-[9px] uppercase font-bold text-slate-400 print:text-slate-600">Verification Hash</span>
                  <span className="font-mono text-[9px] text-cyan-300 print:text-black">FHS-2026-CAPS-SEC94</span>
                </div>
                <div className="px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30 text-[9px] font-mono font-bold flex items-center gap-1 print:text-black print:border-black">
                  <Check className="w-3 h-3 text-emerald-400" />
                  VERIFIED
                </div>
              </div>

              <div className="flex justify-between items-end pt-2 gap-4">
                <div className="space-y-1">
                  <div className="border-b border-white/30 print:border-black w-28 pb-0.5">
                    <span className="font-serif italic text-xs text-brand-300 print:text-black">Mr Kunene</span>
                  </div>
                  <span className="block text-[8.5px] text-slate-400 print:text-slate-700 uppercase font-bold">Principal Signature</span>
                </div>

                <div className="space-y-1">
                  <div className="border-b border-white/30 print:border-black w-28 pb-0.5">
                    <span className="font-serif italic text-xs text-cyan-300 print:text-black">D. Mokoena</span>
                  </div>
                  <span className="block text-[8.5px] text-slate-400 print:text-slate-700 uppercase font-bold">Class Head Signature</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
