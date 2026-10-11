import React, { useState, useEffect } from 'react';
import { reportService, adminService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from './LoadingSpinner';
import {
  Printer,
  Download,
  GraduationCap,
  AlertCircle,
  User,
  School,
  Clock,
  FileCheck
} from 'lucide-react';

interface CapsReportCardProps {
  childId?: string | number;
  initialTerm?: string;
  onNavigateTab?: (tab: string) => void;
  hideControlBar?: boolean;
  previewLearner?: any;
}

export const CapsReportCard: React.FC<CapsReportCardProps> = ({
  childId,
  initialTerm = 'Term 3 2026',
  onNavigateTab,
  hideControlBar = false,
  previewLearner
}) => {
  const { role } = useAuth();
  const [term, setTerm] = useState<string>(initialTerm);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(!previewLearner);
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (previewLearner) {
      setLoading(false);
      return;
    }
    fetchReportData();
  }, [childId, term, previewLearner]);

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

  const handleDownloadPDF = async () => {
    const targetId = childId || previewLearner?.child_id || previewLearner?.id || data?.learner?.id;
    if (!targetId) {
      window.print();
      return;
    }

    setDownloadingPdf(true);
    try {
      const termNum = parseInt(term.replace(/[^0-9]/g, ''), 10) || 3;
      const res = await adminService.downloadLearnerReportPdf(targetId, { term: termNum, academicYear: 2026 });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeName = (learner.full_name || 'Learner').replace(/[^a-zA-Z0-9_-]/g, '_');
      link.download = `GelezaSA_Report_2026_Grade${learner.grade}_Class${learner.class_name}_${safeName}_Term${termNum}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.warn('Backend PDF download error, falling back to browser print:', err);
      window.print();
    } finally {
      setDownloadingPdf(false);
    }
  };

  const getCapsLevelDescriptor = (avg: number | null) => {
    if (avg === null || avg === undefined || isNaN(avg)) return { level: '-', descriptor: 'Not Assessed' };
    if (avg >= 80) return { level: '7', descriptor: 'Outstanding Achievement' };
    if (avg >= 70) return { level: '6', descriptor: 'Meritorious Achievement' };
    if (avg >= 60) return { level: '5', descriptor: 'Substantial Achievement' };
    if (avg >= 50) return { level: '4', descriptor: 'Adequate Achievement' };
    if (avg >= 40) return { level: '3', descriptor: 'Moderate Achievement' };
    if (avg >= 30) return { level: '2', descriptor: 'Elementary Achievement' };
    return { level: '1', descriptor: 'Not Achieved' };
  };

  if (loading) {
    return <LoadingSpinner text="Generating official South African CAPS Report Card..." />;
  }

  // Handle case where parent has no linked children
  if (data?.no_linked_children) {
    return (
      <div className="rounded-3xl p-10 text-center border border-dashed border-white/20 bg-surface-dark/40 max-w-2xl mx-auto my-8 space-y-4 animate-fade-in shadow-xl">
        <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mx-auto shadow-inner">
          <GraduationCap className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-extrabold text-white font-display">No Linked Children Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Link a child in settings to view their official CAPS Term Report Card.
          </p>
        </div>
        <button
          onClick={() => (onNavigateTab ? onNavigateTab('settings') : (window.location.hash = '#settings'))}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
        >
          <User className="w-4 h-4" />
          <span>Link a Child in Settings</span>
        </button>
      </div>
    );
  }

  // Handle unpublished reports for parents/learners
  const isAwaitingPublishing = !previewLearner && (data?.is_published === false || data?.not_published === true) && role !== 'admin' && role !== 'teacher';
  if (isAwaitingPublishing) {
    return (
      <div className="rounded-3xl p-10 text-center border border-dashed border-amber-500/30 bg-surface-dark/60 max-w-2xl mx-auto my-8 space-y-4 animate-fade-in shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
          <Clock className="w-7 h-7 animate-pulse" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-extrabold text-white font-display">Official Report Card Pending Publication</h3>
          <p className="text-xs text-slate-300 max-w-md mx-auto">
            The official South African CAPS Term Report Card for <strong className="text-white">{data?.learner?.full_name || 'this learner'}</strong> has not yet been published by the administration.
          </p>
          <p className="text-[11px] text-slate-400 max-w-md mx-auto">
            Subject marks and principal endorsements are currently being verified by the school administration.
          </p>
        </div>
      </div>
    );
  }

  // Active Report Data (Multi-term structured)
  const reportObj = data?.report_card || {};
  const school = reportObj.school || data?.school || {
    name: 'REGISTERED SCHOOL NAME',
    physical_address: 'School Physical Address',
    postal_address: 'P.O. Box 100, City, Postal Code',
    contact_phone: '012-3456789',
    contact_email: 'admin@school.co.za',
    emis_number: '700000000',
    principal_name: 'Principal'
  };

  const rawLearner = previewLearner || reportObj.learner || data?.learner || {};
  const rawFullName = (rawLearner.full_name || '').trim();
  const rawSurname = (rawLearner.surname || '').trim();
  const cleanDisplayName = rawFullName.toLowerCase().endsWith(rawSurname.toLowerCase())
    ? rawFullName
    : (rawSurname ? `${rawSurname}, ${rawFullName}` : rawFullName);

  const learner = {
    full_name: cleanDisplayName || 'LEARNER NAME',
    surname: rawSurname,
    first_name: rawFullName,
    id_number: rawLearner.id_number || '',
    admission_number: rawLearner.admission_number || rawLearner.learner_number || 'N/A',
    learner_number: rawLearner.learner_number || '',
    dob: rawLearner.dob ? String(rawLearner.dob).substring(0, 10).replace(/-/g, '') : 'N/A',
    grade: rawLearner.grade || 10,
    class_name: rawLearner.class_name || `${rawLearner.grade || 10}A`,
    stream: rawLearner.stream || 'General'
  };

  const meta = reportObj.meta || {
    academic_year: data?.academic_year || 2026,
    current_term: 3,
    closing_date: '2026/09/23',
    reopening_date: '2026/10/06',
    issue_date: new Date().toISOString().substring(0, 10).replace(/-/g, '/')
  };

  // Resolve Subjects list
  let subjects: any[] = [];
  if (Array.isArray(reportObj.subjects) && reportObj.subjects.length > 0) {
    subjects = reportObj.subjects;
  } else if (previewLearner && previewLearner.subjects) {
    // Adapter if previewLearner is passed from admin studio
    const subsDict = previewLearner.subjects;
    subjects = Object.entries(subsDict).map(([sName, markVal]) => {
      const num = markVal !== null && markVal !== undefined && markVal !== '' ? Number(markVal) : null;
      const caps = getCapsLevelDescriptor(num);
      return {
        subject: sName,
        term1: null,
        term2: null,
        term3: { mark: num, level: caps.level, grade_ave: null },
        term4: null,
        final: { mark: num, level: caps.level, grade_ave: null }
      };
    });
  } else if (Array.isArray(data?.subjects) && data.subjects.length > 0) {
    subjects = data.subjects.map((s: any) => ({
      subject: s.subject || s.name,
      term1: s.multi_term?.term1 || null,
      term2: s.multi_term?.term2 || null,
      term3: s.multi_term?.term3 || { mark: s.mark, level: s.level, grade_ave: s.average },
      term4: s.multi_term?.term4 || null,
      final: s.multi_term?.final || { mark: s.mark, level: s.level, grade_ave: s.average }
    }));
  }

  const summary = reportObj.summary || {
    totals: {
      term1: null,
      term2: null,
      term3: subjects.reduce((sum, s) => sum + (s.term3?.mark || 0), 0) || null,
      term4: null,
      final: subjects.reduce((sum, s) => sum + (s.final?.mark || 0), 0) || null
    },
    averages: {
      term1: null,
      term2: null,
      term3: data?.overall_average ?? null,
      term4: null,
      final: data?.overall_average ?? null
    },
    outcome: {
      term1: '-',
      term2: '-',
      term3: 'Achieved',
      term4: '-',
      final: data?.promotion_status || 'Achieved'
    },
    attendance: {
      term1_absent: null,
      term2_absent: null,
      term3_absent: data?.attendance?.days_absent ?? null,
      term4_absent: null,
      total_absent: data?.attendance?.days_absent ?? null
    }
  };

  const remarks = reportObj.remarks || {
    teacher_comment: previewLearner?.teacher_comment || data?.report_card?.endorsements?.teacher_comment || 'Continue working hard and remain focused on academic goals.',
    principal_comment: previewLearner?.principal_comment || data?.report_card?.endorsements?.principal_comment || 'Promoted with commendation.'
  };

  const signatures = reportObj.signatures || {
    educator_name: 'Class Educator',
    hod_name: 'Department Head',
    principal_name: school.principal_name || 'Principal',
    parent_name: 'Parent / Guardian'
  };

  return (
    <div className="space-y-4">
      {/* Print stylesheet for genuine A4 portrait fidelity */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .report-control-bar {
            display: none !important;
          }
          .south-african-report-sheet {
            box-shadow: none !important;
            border: 1.5px solid #000000 !important;
            background: #ffffff !important;
            color: #000000 !important;
            padding: 4mm !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            border-radius: 0 !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
            overflow: visible !important;
          }
        }
      `}</style>

      {/* Control Bar (Hidden on Print) */}
      {!hideControlBar && (
        <div className="report-control-bar flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-surface-dark border border-white/10 shadow-lg print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-extrabold text-white font-display flex items-center gap-2">
                <span>Official South African CAPS Report Card</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 font-bold">
                  A4 PORTRAIT FORMAT
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                School-Branded • Multi-Term Achievement & Attendance Transcript
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="rounded-xl bg-surface-darker border border-white/10 px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="Term 1 2026">Term 1 2026</option>
              <option value="Term 2 2026">Term 2 2026</option>
              <option value="Term 3 2026">Term 3 2026 (Current)</option>
              <option value="Term 4 2026">Term 4 2026 (Final)</option>
            </select>

            <button
              onClick={handleDownloadPDF}
              disabled={downloadingPdf}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              title="Download official South African report card PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-surface-darker hover:bg-white/10 text-slate-200 font-bold text-xs border border-white/10 transition-all active:scale-95 cursor-pointer"
              title="Print document"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 print:hidden">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* OFFICIAL SOUTH AFRICAN SCHOOL LEARNER REPORT CARD SHEET  */}
      {/* A4 PORTRAIT FORMAL LAYOUT MATCHING DBE BENCHMARK         */}
      {/* ======================================================== */}
      <div className="south-african-report-sheet relative bg-white text-slate-900 border-2 border-slate-900 p-5 sm:p-7 shadow-2xl font-sans rounded-xl max-w-4xl mx-auto space-y-3 print:p-0 print:border-0 print:shadow-none print:max-w-none">
        
        {/* 1. Official School Header */}
        <div className="border-b-2 border-slate-900 pb-3 flex items-start justify-between gap-4">
          <div className="space-y-0.5 max-w-xl">
            <h1 className="text-base sm:text-lg font-black tracking-tight text-black uppercase leading-tight font-serif">
              {school.name || 'REGISTERED SCHOOL NAME'}
            </h1>
            {school.physical_address && (
              <p className="text-[11px] text-slate-800 leading-tight">{school.physical_address}</p>
            )}
            {school.postal_address && (
              <p className="text-[11px] text-slate-800 leading-tight">{school.postal_address}</p>
            )}
            <div className="flex flex-wrap items-center gap-x-3 text-[10px] text-slate-700 font-mono pt-0.5">
              {school.contact_phone && <span>Tel: {school.contact_phone}</span>}
              {school.contact_email && <span>Email: {school.contact_email}</span>}
              {school.emis_number && <span>EMIS: {school.emis_number}</span>}
            </div>
          </div>

          {/* School Badge / Logo Placeholder */}
          <div className="shrink-0 flex items-center justify-center">
            {school.logo_url ? (
              <img
                src={school.logo_url}
                alt="School Crest"
                className="w-14 h-14 object-contain rounded border border-slate-300"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-14 h-14 rounded border-2 border-slate-800 flex flex-col items-center justify-center p-1 bg-slate-50 text-slate-900 shadow-sm">
                <FileCheck className="w-5 h-5 text-slate-700 mb-0.5" />
                <span className="text-[9px] font-black uppercase tracking-wider">
                  {(school.name || 'SA').slice(0, 3)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 2. Learner Demographics Grid (3 Columns) */}
        <div className="border border-slate-700 p-2.5 rounded bg-slate-50/60 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
          {/* Column 1 */}
          <div className="space-y-0.5">
            <p className="font-bold text-black truncate">
              Learner: <span className="font-black">{learner.full_name}</span>
            </p>
            <p className="text-slate-800">
              Admission No: <span className="font-semibold">{learner.admission_number}</span>
            </p>
            <p className="text-slate-800">
              Birth Date: <span className="font-mono">{learner.dob}</span>
            </p>
            <p className="text-slate-800">
              School Closes: <span className="font-mono">{meta.closing_date}</span>
            </p>
          </div>

          {/* Column 2 */}
          <div className="space-y-0.5 sm:text-center sm:pt-4">
            <p className="text-slate-800">
              School Reopens: <span className="font-mono font-bold text-black">{meta.reopening_date}</span>
            </p>
          </div>

          {/* Column 3 */}
          <div className="space-y-0.5 sm:text-right">
            <p className="font-bold text-black">
              Grade: <span className="font-black">Grade {String(learner.grade).padStart(2, '0')}</span>
            </p>
            <p className="text-slate-800">
              Class: <span className="font-semibold">{learner.class_name}</span>
            </p>
            <p className="text-slate-800">
              Date: <span className="font-mono">{meta.issue_date}</span>
            </p>
          </div>
        </div>

        {/* 3. Official Multi-Term Academic Results Table */}
        <div className="overflow-x-auto border border-slate-900 rounded">
          <table className="w-full border-collapse text-left text-[11px]">
            <thead>
              {/* Row 1: Super Headers */}
              <tr className="bg-slate-200 border-b border-slate-900 text-black font-bold">
                <th className="p-1.5 border-r border-slate-900 font-extrabold w-[34%]">
                  Subject
                </th>
                <th colSpan={3} className="p-1 text-center border-r border-slate-900">
                  Term 1
                </th>
                <th colSpan={3} className="p-1 text-center border-r border-slate-900">
                  Term 2
                </th>
                <th colSpan={3} className="p-1 text-center border-r border-slate-900">
                  Term 3
                </th>
                <th colSpan={3} className="p-1 text-center">
                  Final for Year
                </th>
              </tr>
              {/* Row 2: Sub Headers */}
              <tr className="bg-slate-100 border-b border-slate-900 text-[10px] text-slate-800 font-bold text-center">
                <th className="border-r border-slate-900"></th>
                <th className="p-1 border-r border-slate-400 w-[5%]">Final %</th>
                <th className="p-1 border-r border-slate-400 w-[5%]">Level</th>
                <th className="p-1 border-r border-slate-900 w-[6%]">Grade Ave %</th>

                <th className="p-1 border-r border-slate-400 w-[5%]">Final %</th>
                <th className="p-1 border-r border-slate-400 w-[5%]">Level</th>
                <th className="p-1 border-r border-slate-900 w-[6%]">Grade Ave %</th>

                <th className="p-1 border-r border-slate-400 w-[5%]">Final %</th>
                <th className="p-1 border-r border-slate-400 w-[5%]">Level</th>
                <th className="p-1 border-r border-slate-900 w-[6%]">Grade Ave %</th>

                <th className="p-1 border-r border-slate-400 w-[5%]">Final %</th>
                <th className="p-1 border-r border-slate-400 w-[5%]">Level</th>
                <th className="p-1 w-[6%]">Grade Ave %</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((sub, idx) => (
                <tr
                  key={idx}
                  className={`border-b border-slate-300 hover:bg-slate-50 ${idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}`}
                >
                  <td className="p-1.5 border-r border-slate-900 font-medium text-black">
                    {sub.subject} (Gr {String(learner.grade).padStart(2, '0')})
                  </td>
                  {/* Term 1 */}
                  <td className="p-1 text-center border-r border-slate-300 font-mono">
                    {sub.term1?.mark !== null && sub.term1?.mark !== undefined ? sub.term1.mark : '-'}
                  </td>
                  <td className="p-1 text-center border-r border-slate-300 font-bold">
                    {sub.term1?.level !== null && sub.term1?.level !== undefined ? sub.term1.level : '-'}
                  </td>
                  <td className="p-1 text-center border-r border-slate-900 font-mono text-slate-700">
                    {sub.term1?.grade_ave !== null && sub.term1?.grade_ave !== undefined ? sub.term1.grade_ave : '-'}
                  </td>
                  {/* Term 2 */}
                  <td className="p-1 text-center border-r border-slate-300 font-mono">
                    {sub.term2?.mark !== null && sub.term2?.mark !== undefined ? sub.term2.mark : '-'}
                  </td>
                  <td className="p-1 text-center border-r border-slate-300 font-bold">
                    {sub.term2?.level !== null && sub.term2?.level !== undefined ? sub.term2.level : '-'}
                  </td>
                  <td className="p-1 text-center border-r border-slate-900 font-mono text-slate-700">
                    {sub.term2?.grade_ave !== null && sub.term2?.grade_ave !== undefined ? sub.term2.grade_ave : '-'}
                  </td>
                  {/* Term 3 */}
                  <td className="p-1 text-center border-r border-slate-300 font-mono">
                    {sub.term3?.mark !== null && sub.term3?.mark !== undefined ? sub.term3.mark : '-'}
                  </td>
                  <td className="p-1 text-center border-r border-slate-300 font-bold">
                    {sub.term3?.level !== null && sub.term3?.level !== undefined ? sub.term3.level : '-'}
                  </td>
                  <td className="p-1 text-center border-r border-slate-900 font-mono text-slate-700">
                    {sub.term3?.grade_ave !== null && sub.term3?.grade_ave !== undefined ? sub.term3.grade_ave : '-'}
                  </td>
                  {/* Final for Year */}
                  <td className="p-1 text-center border-r border-slate-300 font-mono font-bold">
                    {sub.final?.mark !== null && sub.final?.mark !== undefined ? sub.final.mark : '-'}
                  </td>
                  <td className="p-1 text-center border-r border-slate-300 font-black text-black">
                    {sub.final?.level !== null && sub.final?.level !== undefined ? sub.final.level : '-'}
                  </td>
                  <td className="p-1 text-center font-mono text-slate-700">
                    {sub.final?.grade_ave !== null && sub.final?.grade_ave !== undefined ? sub.final.grade_ave : '-'}
                  </td>
                </tr>
              ))}

              {/* Summary Row 1: Learner Total / Average */}
              <tr className="bg-slate-100 border-t-2 border-slate-900 font-bold text-black">
                <td className="p-1.5 border-r border-slate-900 text-right pr-3 font-extrabold">
                  Learner Total / Average:
                </td>
                {/* Term 1 */}
                <td className="p-1 text-center border-r border-slate-300 font-mono">
                  {summary.totals?.term1 ?? '-'}
                </td>
                <td className="p-1 text-center border-r border-slate-300"></td>
                <td className="p-1 text-center border-r border-slate-900 font-mono">
                  {summary.averages?.term1 ?? '-'}
                </td>
                {/* Term 2 */}
                <td className="p-1 text-center border-r border-slate-300 font-mono">
                  {summary.totals?.term2 ?? '-'}
                </td>
                <td className="p-1 text-center border-r border-slate-300"></td>
                <td className="p-1 text-center border-r border-slate-900 font-mono">
                  {summary.averages?.term2 ?? '-'}
                </td>
                {/* Term 3 */}
                <td className="p-1 text-center border-r border-slate-300 font-mono">
                  {summary.totals?.term3 ?? '-'}
                </td>
                <td className="p-1 text-center border-r border-slate-300"></td>
                <td className="p-1 text-center border-r border-slate-900 font-mono">
                  {summary.averages?.term3 ?? '-'}
                </td>
                {/* Final for Year */}
                <td className="p-1 text-center border-r border-slate-300 font-mono">
                  {summary.totals?.final ?? '-'}
                </td>
                <td className="p-1 text-center border-r border-slate-300"></td>
                <td className="p-1 text-center font-mono font-black">
                  {summary.averages?.final ?? '-'}
                </td>
              </tr>

              {/* Summary Row 2: Result */}
              <tr className="bg-slate-100 border-t border-slate-300 font-semibold text-black">
                <td className="p-1.5 border-r border-slate-900 text-right pr-3 font-bold">
                  Result:
                </td>
                <td colSpan={3} className="p-1 text-center border-r border-slate-900">
                  {summary.outcome?.term1 ?? '-'}
                </td>
                <td colSpan={3} className="p-1 text-center border-r border-slate-900">
                  {summary.outcome?.term2 ?? '-'}
                </td>
                <td colSpan={3} className="p-1 text-center border-r border-slate-900 font-bold">
                  {summary.outcome?.term3 ?? '-'}
                </td>
                <td colSpan={3} className="p-1 text-center font-black">
                  {summary.outcome?.final ?? '-'}
                </td>
              </tr>

              {/* Summary Row 3: Days Absent */}
              <tr className="bg-slate-100 border-t border-slate-300 font-medium text-slate-900">
                <td className="p-1.5 border-r border-slate-900 text-right pr-3 font-bold">
                  Days Absent:
                </td>
                <td colSpan={3} className="p-1 text-center border-r border-slate-900 font-mono">
                  {summary.attendance?.term1_absent ?? '-'}
                </td>
                <td colSpan={3} className="p-1 text-center border-r border-slate-900 font-mono">
                  {summary.attendance?.term2_absent ?? '-'}
                </td>
                <td colSpan={3} className="p-1 text-center border-r border-slate-900 font-mono">
                  {summary.attendance?.term3_absent ?? '-'}
                </td>
                <td colSpan={3} className="p-1 text-center font-mono font-bold text-black">
                  {summary.attendance?.total_absent ?? summary.attendance?.term4_absent ?? '-'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 4. General Remarks & Official School Stamp Box */}
        <div className="pt-2 flex flex-col sm:flex-row items-stretch justify-between gap-4">
          {/* General remarks */}
          <div className="flex-1 space-y-1">
            <span className="text-[11px] font-bold text-black uppercase tracking-wider block">
              General Remarks:
            </span>
            <div className="p-2 border-b-2 border-slate-400 italic text-[12px] text-slate-900 min-h-[48px]">
              {remarks.teacher_comment}
            </div>
          </div>

          {/* Official School Stamp Box */}
          <div className="w-56 shrink-0 border-2 border-slate-900 rounded p-2 text-center text-[10px] space-y-0.5 bg-slate-50/50">
            <p className="font-extrabold uppercase tracking-tight text-black">
              {school.name || 'OFFICIAL SCHOOL STAMP'}
            </p>
            <p className="font-mono text-slate-800">{meta.issue_date}</p>
            {school.postal_address && (
              <p className="text-[9px] text-slate-700">{school.postal_address}</p>
            )}
            {school.contact_phone && (
              <p className="text-[9px] text-slate-700 font-mono">TEL {school.contact_phone}</p>
            )}
          </div>
        </div>

        {/* 5. Designated Signatures Section */}
        <div className="pt-3 border-t border-slate-300 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="space-y-1">
            <div className="h-6 flex items-end justify-center">
              <span className="text-xs italic text-slate-600 font-serif">Verified</span>
            </div>
            <div className="border-t border-slate-700 pt-1">
              <p className="text-[10px] font-bold text-black uppercase">Class Educator</p>
              <p className="text-[9px] text-slate-600">{signatures.educator_name}</p>
            </div>
          </div>

          <div className="space-y-1">
            <div className="h-6 flex items-end justify-center">
              <span className="text-xs italic text-slate-600 font-serif">Approved</span>
            </div>
            <div className="border-t border-slate-700 pt-1">
              <p className="text-[10px] font-bold text-black uppercase">DP / HOD</p>
              <p className="text-[9px] text-slate-600">{signatures.hod_name}</p>
            </div>
          </div>

          <div className="space-y-1">
            <div className="h-6 flex items-end justify-center">
              <span className="text-xs italic text-slate-900 font-serif font-bold">Endorsed</span>
            </div>
            <div className="border-t border-slate-700 pt-1">
              <p className="text-[10px] font-bold text-black uppercase">Principal</p>
              <p className="text-[9px] text-slate-600">{signatures.principal_name}</p>
            </div>
          </div>

          <div className="space-y-1">
            <div className="h-6"></div>
            <div className="border-t border-slate-700 pt-1">
              <p className="text-[10px] font-bold text-black uppercase">Parent / Guardian</p>
              <p className="text-[9px] text-slate-600">Acknowledgement</p>
            </div>
          </div>
        </div>

        {/* 6. Footer: Promotion Policy & 7-Point CAPS Rating Scale */}
        <div className="pt-2 border-t border-slate-400 space-y-1 text-[9px] text-slate-800 leading-tight">
          <p className="font-bold text-black">
            {learner.grade <= 6
              ? 'Intermediate Phase Gr 4-6:'
              : (learner.grade <= 9 ? 'Senior Phase Gr 7-9:' : 'FET Phase Gr 10-12:')}{' '}
            <span className="font-normal text-slate-800">
              {learner.grade <= 6
                ? 'The learner must achieve at least: Level 4 in HL; Level 3 in FAL; Level 3 in Mathematics and Level 3 in any other two (2) of the remaining approved subjects.'
                : (learner.grade <= 9
                  ? 'The learner must achieve at least: Level 3 in HL; Level 2 in FAL; Level 2 in Mathematics; Level 3 in any other three (3) subjects and Level 2 in any other two (2) subjects.'
                  : 'National Senior Certificate (CAPS): Home Language >= 40%; 2 other subjects >= 40%; 3 other subjects >= 30%. Bachelor Admission: >= 50% in four designated subjects.')}
            </span>
          </p>

          <p className="text-[8.5px] text-slate-600">
            Level 1 = 0 - 29.99 Not Achieved; Level 2 = 30 - 39.99 Elementary Achievement; Level 3 = 40 - 49.99 Moderate Achievement; Level 4 = 50 - 59.99 Adequate Achievement; Level 5 = 60 - 69.99 Substantial Achievement; Level 6 = 70 - 79.99 Meritorious Achievement; Level 7 = 80 - 100 Outstanding Achievement;
          </p>

          <p className="text-[8px] text-slate-500 font-mono text-center pt-0.5">
            Geleza SA Official Learner Academic Record • Authenticated Multi-School Academic Network
          </p>
        </div>

      </div>
    </div>
  );
};
