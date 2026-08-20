import React, { useState, useEffect } from 'react';
import { parentService, conductService } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { FusionAIIcon } from '../../components/common/FusionAIIcon';
import {
  GraduationCap,
  Award,
  CalendarCheck,
  FileText,
  Printer,
  ShieldCheck,
  AlertCircle,
  TrendingUp,
  Target,
  CheckCircle2,
  BookOpen,
  ArrowUpRight,
  Sparkles,
  Users,
  Check,
  Trophy,
  AlertTriangle,
  UserPlus,
  Link,
  Plus,
  Copy,
  X,
  Key,
  Mail
} from 'lucide-react';
import { getProfilePictureUrl } from '../../utils/imageUrl';

const SA_OFFICIAL_LANGUAGES = [
  'isiZulu', 'isiXhosa', 'Afrikaans', 'English', 'Sepedi',
  'Setswana', 'Sesotho', 'Xitsonga', 'siSwati', 'Tshivenda', 'isiNdebele'
];

export const ParentChildren: React.FC = () => {
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [performanceData, setPerformanceData] = useState<any | null>(null);
  const [progressRecords, setProgressRecords] = useState<any[]>([]);
  const [conductData, setConductData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingChildData, setLoadingChildData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Link Sibling Modal States
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkTab, setLinkTab] = useState<'enroll_sibling' | 'activate_existing'>('enroll_sibling');
  const [submittingLink, setSubmittingLink] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<any | null>(null);

  // Sibling Form Data
  const [siblingForm, setSiblingForm] = useState({
    first_name: '',
    surname: '',
    id_number: '',
    dob: '',
    gender: 'Male',
    grade: '8',
    stream: 'General',
    home_language: 'isiZulu',
    previous_school: ''
  });

  // Existing Learner Activation Form
  const [activateForm, setActivateForm] = useState({
    learner_number: '',
    id_number: '',
    first_name: '',
    surname: ''
  });

  const fetchChildren = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await parentService.getChildren();
      const list = Array.isArray(res) ? res : res.children || [];
      setChildren(list);
      if (list.length > 0) {
        if (!selectedChild || !list.some((c: any) => c.id === selectedChild.id)) {
          setSelectedChild(list[0]);
        }
      }
    } catch (err: any) {
      console.error('Failed to load parent children from database:', err);
      setError('Could not load linked learner records from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChildren();
  }, []);

  const handleEnrollSibling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siblingForm.first_name.trim() || !siblingForm.surname.trim()) {
      setError('Sibling first name and surname are required.');
      return;
    }

    setSubmittingLink(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await parentService.linkSibling(siblingForm);
      setCreatedCredentials(res.credentials);
      setSuccessMsg(res.message || 'Sibling successfully linked and enrolled!');
      
      // Refresh children list
      const updated = await parentService.getChildren();
      const list = Array.isArray(updated) ? updated : updated.children || [];
      setChildren(list);
      if (res.child) {
        setSelectedChild(res.child);
      }
      
      // Reset form
      setSiblingForm({
        first_name: '',
        surname: '',
        id_number: '',
        dob: '',
        gender: 'Male',
        grade: '8',
        stream: 'General',
        home_language: 'isiZulu',
        previous_school: ''
      });
    } catch (err: any) {
      console.error('Error linking sibling:', err);
      setError(err.response?.data?.error || 'Failed to link sibling. Please verify information.');
    } finally {
      setSubmittingLink(false);
    }
  };

  const handleActivateExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activateForm.first_name.trim() || !activateForm.surname.trim() || (!activateForm.learner_number && !activateForm.id_number)) {
      setError('Please provide Child Name, Surname, and Learner/ID Number.');
      return;
    }

    setSubmittingLink(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await parentService.activateChild(activateForm);
      setSuccessMsg(res.message || 'Learner successfully linked to your parent portal!');
      setIsLinkModalOpen(false);
      fetchChildren();
      setActivateForm({
        learner_number: '',
        id_number: '',
        first_name: '',
        surname: ''
      });
    } catch (err: any) {
      console.error('Error activating learner:', err);
      setError(err.response?.data?.error || 'Failed to link learner. Please verify details with school.');
    } finally {
      setSubmittingLink(false);
    }
  };

  const handleCopyCredentials = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  useEffect(() => {
    if (!selectedChild) return;
    setLoadingChildData(true);

    Promise.all([
      parentService.getChildPerformance(selectedChild.id).catch(() => null),
      parentService.getChildProgress(selectedChild.id).catch(() => []),
      conductService.getChildConductForParent(selectedChild.id).catch(() => null)
    ])
      .then(([perf, prog, cond]) => {
        setPerformanceData(perf);
        const records = Array.isArray(prog) ? prog : prog.progress || prog.records || [];
        setProgressRecords(records);
        setConductData(cond);
      })
      .catch((err) => {
        console.error('Error fetching child performance details:', err);
      })
      .finally(() => setLoadingChildData(false));
  }, [selectedChild]);

  if (loading) return <LoadingSpinner text="Fetching academic records from database..." />;

  const getCapsLevel = (score: number) => {
    if (score >= 80) return { level: 'Level 7', desc: 'Outstanding Achievement (80-100%)', badge: 'emerald' as const };
    if (score >= 70) return { level: 'Level 6', desc: 'Meritorious Achievement (70-79%)', badge: 'emerald' as const };
    if (score >= 60) return { level: 'Level 5', desc: 'Substantial Achievement (60-69%)', badge: 'cyan' as const };
    if (score >= 50) return { level: 'Level 4', desc: 'Adequate Achievement (50-59%)', badge: 'indigo' as const };
    if (score >= 40) return { level: 'Level 3', desc: 'Moderate Achievement (40-49%)', badge: 'amber' as const };
    if (score >= 30) return { level: 'Level 2', desc: 'Elementary Achievement (30-39%)', badge: 'rose' as const };
    return { level: 'Level 1', desc: 'Not Achieved (0-29%)', badge: 'rose' as const };
  };

  const handlePrintOfficialReport = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('Please allow popups to print report card.');
      return;
    }

    const childName = `${selectedChild.full_name || ''} ${selectedChild.surname || ''}`.trim() || 'Learner';
    const currentDate = new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });

    printWin.document.write(`
      <html>
      <head>
        <title>Official Academic Progress Report - ${childName}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 2.5rem; color: #0f172a; line-height: 1.5; }
          .header { text-align: center; border-bottom: 3px double #1e293b; padding-bottom: 1rem; margin-bottom: 1.5rem; }
          .school-title { font-size: 1.6rem; font-weight: 800; color: #1e1b4b; margin: 0; letter-spacing: 1px; }
          .sub-title { font-size: 0.9rem; color: #64748b; margin: 4px 0 0 0; }
          .student-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; background: #f8fafc; border: 1px solid #cbd5e1; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 2rem; font-size: 0.9rem; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
          th { background: #f1f5f9; color: #1e293b; font-weight: bold; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #cbd5e1; }
          .signature-box { text-align: center; }
          .signature-img { font-family: 'Brush Script MT', cursive, sans-serif; font-size: 1.8rem; color: #1e3a8a; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <button class="no-print" onclick="window.print()" style="padding:10px 20px; background:#4f46e5; color:#fff; border:none; border-radius:8px; font-weight:bold; cursor:pointer; margin-bottom:1.5rem;">Print / Save Official Report Card (PDF)</button>
        
        <div class="header">
          <h1 class="school-title">FUSION HIGH SCHOOL</h1>
          <p class="sub-title">Republic of South Africa • Department of Basic Education Curriculum</p>
          <p class="sub-title">EMIS No: 928374821 • Official Academic Progress Report</p>
        </div>

        <div class="student-meta">
          <div>
            <p><strong>Learner Name:</strong> ${childName}</p>
            <p><strong>Learner Number:</strong> ${selectedChild.learner_number || `ID-${selectedChild.id}`}</p>
          </div>
          <div>
            <p><strong>Grade & Class:</strong> Grade ${selectedChild.grade || 10} (${selectedChild.stream || 'General'})</p>
            <p><strong>Date of Issue:</strong> ${currentDate}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Subject Name</th>
              <th>Assessment Description</th>
              <th>Score (%)</th>
              <th>Achievement Level</th>
              <th>Term</th>
            </tr>
          </thead>
          <tbody>
            ${progressRecords.map(r => {
              const scoreNum = parseFloat(r.grade || r.score || 0);
              const lvl = getCapsLevel(scoreNum);
              return `
                <tr>
                  <td><strong>${r.subject || 'Subject'}</strong></td>
                  <td>${r.notes || r.assessment_name || 'Formal Assessment'}</td>
                  <td><strong>${scoreNum}%</strong></td>
                  <td>${lvl.level} — ${lvl.desc}</td>
                  <td>${r.term || 'Term 1'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 1rem; border-radius: 8px; margin-bottom: 2rem;">
          <p style="margin: 0;"><strong>Principal Remarks:</strong> Commendable effort across core subjects. Maintain consistent attendance and revision for upcoming examinations.</p>
        </div>

        <div class="signatures">
          <div class="signature-box">
            <div class="signature-img">T.L. Makula</div>
            <div style="border-top: 1px solid #0f172a; margin-top: 4px; padding-top: 4px; font-size: 0.85rem; font-weight: bold;">
              Tshepho L. Makula<br>
              <span style="font-weight: normal; color: #64748b;">Principal, Fusion High School</span>
            </div>
          </div>
          <div class="signature-box">
            <div style="height: 35px;"></div>
            <div style="border-top: 1px solid #0f172a; margin-top: 4px; padding-top: 4px; font-size: 0.85rem; font-weight: bold;">
              Official School Stamp & Seal<br>
              <span style="font-weight: normal; color: #64748b;">Verified by Administration</span>
            </div>
          </div>
        </div>

        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `);
    printWin.document.close();
  };

  const childName = selectedChild ? `${selectedChild.full_name || ''} ${selectedChild.surname || ''}`.trim() : 'Learner';
  const overallAvg = performanceData?.average_mark || 0;
  const predictedFinal = performanceData?.predicted_final_mark || overallAvg;
  const attendanceStats = performanceData?.attendance_impact || { attendance_pct: 100, days_present: 0, days_absent: 0 };
  const subjectsList = performanceData?.subject_performance_table || [];

  return (
    <div className="space-y-6">
      {/* Header with Title and PDF Download Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-amber-400" />
            Academic Performance & AI Predictor
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time assessment scores, AI performance trajectory, and multi-subject mastery records.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => {
              setIsLinkModalOpen(true);
              setCreatedCredentials(null);
              setError(null);
              setSuccessMsg(null);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 text-white font-bold text-xs shadow-glow-indigo transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Link / Enroll Sibling</span>
          </button>

          {selectedChild && progressRecords.length > 0 && (
            <button
              onClick={handlePrintOfficialReport}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-brand-600 hover:from-amber-500 text-white font-bold text-xs shadow-md transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Download Report</span>
            </button>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Linked Children Selection Tabs */}
      {children.length > 1 && (
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-surface-dark border border-white/10 overflow-x-auto">
          {children.map((child) => {
            const isSelected = selectedChild?.id === child.id;
            const cName = `${child.full_name || ''} ${child.surname || ''}`.trim() || 'Learner';
            return (
              <button
                key={child.id}
                onClick={() => setSelectedChild(child)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  isSelected
                    ? 'bg-gradient-to-r from-amber-600 to-brand-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                  {cName.charAt(0)}
                </div>
                <span>{cName} (Grade {child.grade})</span>
              </button>
            );
          })}
        </div>
      )}

      {loadingChildData ? (
        <LoadingSpinner text={`Analyzing ${childName}'s performance records...`} />
      ) : selectedChild ? (
        <>
          {/* Child Identity and AI Overall Predictions (3-Card Summary Strip) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Current Overall Average */}
            <div className="rounded-3xl bg-surface-dark border border-white/10 p-5 shadow-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Current Average</span>
                <Badge variant={overallAvg >= 70 ? 'emerald' : overallAvg >= 50 ? 'cyan' : 'amber'} size="sm">
                  {overallAvg > 0 ? getCapsLevel(overallAvg).level : 'Awaiting Marks'}
                </Badge>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white font-display">{overallAvg}%</span>
                <span className="text-xs text-slate-400">across {subjectsList.length} subjects</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Calculated from {progressRecords.length} teacher-recorded assessments.
              </p>
            </div>

            {/* Card 2: AI Predicted Final Examination Score */}
            <div className="rounded-3xl bg-gradient-to-br from-indigo-950/60 via-surface-dark to-surface-dark border border-indigo-500/30 p-5 shadow-xl space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                  <FusionAIIcon className="w-4 h-4 text-cyan-400" />
                  AI Predicted Exam Mark
                </span>
                <Badge variant="indigo" size="sm">
                  {predictedFinal >= overallAvg ? '+ Growth Trajectory' : 'Stable'}
                </Badge>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-cyan-300 font-display">{predictedFinal}%</span>
                <span className="text-xs text-slate-300 font-semibold">Projected Final</span>
              </div>
              <p className="text-[11px] text-slate-300">
                AI model estimation based on recent test trends and subject retention.
              </p>
            </div>

            {/* Card 3: Attendance Impact Factor */}
            <div className="rounded-3xl bg-surface-dark border border-white/10 p-5 shadow-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <CalendarCheck className="w-4 h-4 text-emerald-400" />
                  Attendance Rate
                </span>
                <Badge variant={attendanceStats.attendance_pct >= 85 ? 'emerald' : 'rose'} size="sm">
                  {attendanceStats.attendance_pct}% Present
                </Badge>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white font-display">
                  {attendanceStats.days_present} Days
                </span>
                <span className="text-xs text-slate-400">({attendanceStats.days_absent} Absent)</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                {attendanceStats.impact_message || 'Classroom attendance positively reinforces exam readiness.'}
              </p>
            </div>
          </div>

          {/* Subject-by-Subject Deep Performance Matrix */}
          <div className="rounded-3xl bg-surface-dark border border-white/10 p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-base font-bold font-display text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-brand-400" />
                  Individual Subject Breakdown & AI Trajectory
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Detailed comparison between current recorded score and AI-predicted final exam outcome for each subject.
                </p>
              </div>
              <Badge variant="cyan" size="sm">{subjectsList.length} Enrolled Subjects</Badge>
            </div>

            <div className="space-y-3">
              {subjectsList.map((subjItem: any, idx: number) => {
                const curMark = subjItem.average_pct || 0;
                const predMark = subjItem.predicted_pct || curMark;
                const levelInfo = getCapsLevel(curMark);
                const isImproving = subjItem.trajectory === 'Improving';

                return (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-surface-darker border border-white/5 hover:border-white/15 transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <span>{subjItem.subject}</span>
                          <span className="text-[11px] text-slate-400 font-normal">
                            • Educator: {subjItem.teacher_name}
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {subjItem.caps_level} • {subjItem.assessments_count} Assessments Logged
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <Badge variant={isImproving ? 'emerald' : 'indigo'} size="sm">
                          {isImproving ? '↑ Improving' : 'Steady'}
                        </Badge>
                        <div className="text-right">
                          <div className="text-xs font-bold text-white">
                            Current: <span className="text-cyan-300 font-mono">{curMark}%</span>
                          </div>
                          <div className="text-[10px] text-indigo-300 font-medium">
                            AI Predicted: <span className="font-bold font-mono">{predMark}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar Comparing Current vs Predicted */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Subject Mastery Progress</span>
                        <span>{curMark}% achieved</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-surface-dark overflow-hidden relative">
                        {/* Current Score Bar */}
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand-600 to-cyan-500 transition-all duration-500"
                          style={{ width: `${Math.min(100, curMark)}%` }}
                        />
                      </div>
                    </div>

                    {/* AI Recommended Focus Topic for Subject */}
                    {subjItem.recommended_focus && (
                      <div className="flex items-center gap-2 text-[11px] text-slate-300 bg-surface-dark px-3 py-1.5 rounded-xl border border-white/5">
                        <Target className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>
                          <strong className="text-amber-300">AI Revision Recommendation:</strong> Practice focus on "{subjItem.recommended_focus}".
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Performance Track: Strengths & Improvement Plan (2-Column Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strengths Card */}
            <div className="rounded-3xl bg-surface-dark border border-emerald-500/20 p-6 shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-emerald-300 font-display flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Academic Strengths & Positive Indicators
              </h3>
              <ul className="space-y-2 text-xs text-slate-300">
                {(performanceData?.strengths || [
                  'Consistent submission of educator-assigned tasks.',
                  'Regular classroom attendance supports continuous syllabus coverage.'
                ]).map((item: string, sIdx: number) => (
                  <li key={sIdx} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Actionable Improvement Focus */}
            <div className="rounded-3xl bg-surface-dark border border-amber-500/20 p-6 shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-amber-300 font-display flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-400" />
                Priority Focus Areas for Improvement
              </h3>
              <ul className="space-y-2 text-xs text-slate-300">
                {(performanceData?.areas_for_improvement || [
                  'Practice subject revision past papers prior to formal tests.',
                  'Utilize the Fusion AI Tutor to clarify tough mathematical and scientific calculations.'
                ]).map((item: string, aIdx: number) => (
                  <li key={aIdx} className="flex items-start gap-2">
                    <ArrowUpRight className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Teacher Logged Assessments Table */}
          <div className="rounded-3xl bg-surface-dark border border-white/10 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold font-display text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                Teacher-Logged Assessments & Marks ({progressRecords.length})
              </h3>
              <span className="text-[11px] text-slate-400">PostgreSQL Verified</span>
            </div>

            {progressRecords.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                No individual assessment marks recorded yet for this term.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-surface-darker text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3 rounded-l-xl">Subject</th>
                      <th className="py-2.5 px-3">Assessment Title</th>
                      <th className="py-2.5 px-3">Score (%)</th>
                      <th className="py-2.5 px-3">Achievement Level</th>
                      <th className="py-2.5 px-3">Term</th>
                      <th className="py-2.5 px-3 rounded-r-xl">Date Recorded</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {progressRecords.map((r: any, rIdx: number) => {
                      const scoreNum = parseFloat(r.grade || r.score || 0);
                      const lvl = getCapsLevel(scoreNum);
                      const dateFormatted = r.date
                        ? new Date(r.date).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'Recent';

                      return (
                        <tr key={rIdx} className="hover:bg-white/5 transition-colors">
                          <td className="py-3 px-3 font-bold text-white">{r.subject || 'General'}</td>
                          <td className="py-3 px-3 text-slate-300">{r.notes || r.assessment_name || 'Formal Assessment'}</td>
                          <td className="py-3 px-3 font-mono font-bold text-cyan-300">{scoreNum}%</td>
                          <td className="py-3 px-3">
                            <Badge variant={lvl.badge} size="sm">{lvl.level}</Badge>
                          </td>
                          <td className="py-3 px-3 text-slate-400">{r.term || 'Term 1'}</td>
                          <td className="py-3 px-3 text-slate-400 text-[11px]">{dateFormatted}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Learner Merits & Conduct History */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Merits Card */}
            <div className="rounded-3xl bg-surface-dark border border-emerald-500/20 p-6 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-emerald-300 font-display flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-emerald-400" />
                  Positive Merits & Commendations ({conductData?.merits?.length || 0})
                </h3>
                <Badge variant="emerald" size="sm">+{conductData?.total_merit_points || 0} Pts</Badge>
              </div>

              {conductData?.merits && conductData.merits.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {conductData.merits.map((m: any, mIdx: number) => (
                    <div key={mIdx} className="p-3 rounded-2xl bg-surface-darker border border-emerald-500/10 text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold text-white">
                        <span>{m.title}</span>
                        <span className="text-emerald-400 font-mono">+{m.points} Pts</span>
                      </div>
                      {m.description && <p className="text-[11px] text-slate-400">{m.description}</p>}
                      <div className="text-[10px] text-slate-500 flex items-center justify-between">
                        <span>By: {m.teacher_name} {m.teacher_surname}</span>
                        <span>{new Date(m.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-3">No merits logged yet for this term.</p>
              )}
            </div>

            {/* Disciplinary Incidents Card */}
            <div className="rounded-3xl bg-surface-dark border border-rose-500/20 p-6 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-rose-300 font-display flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  Disciplinary Notices ({conductData?.disciplinary_records?.length || 0})
                </h3>
                <Badge variant="rose" size="sm">
                  {conductData?.disciplinary_records?.length || 0} Infraction{conductData?.disciplinary_records?.length === 1 ? '' : 's'}
                </Badge>
              </div>

              {conductData?.disciplinary_records && conductData.disciplinary_records.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {conductData.disciplinary_records.map((d: any, dIdx: number) => (
                    <div key={dIdx} className="p-3 rounded-2xl bg-surface-darker border border-rose-500/10 text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold text-white">
                        <span>{d.category}</span>
                        <span className="text-[10px] uppercase font-bold text-rose-300">{d.severity}</span>
                      </div>
                      <p className="text-[11px] text-slate-300">{d.description}</p>
                      {d.action_taken && <p className="text-[11px] text-amber-300">Action: {d.action_taken}</p>}
                      <div className="text-[10px] text-slate-500 flex items-center justify-between">
                        <span>Educator: {d.teacher_name} {d.teacher_surname}</span>
                        <span>{new Date(d.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-3">No disciplinary incidents on record. Clean conduct record.</p>
              )}
            </div>
          </div>
        </>
      ) : null}

      {/* 🌟 LINK & ENROLL SIBLING MODAL */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
          <div className="relative w-full max-w-2xl rounded-3xl bg-surface-dark border border-brand-500/30 shadow-2xl p-6 sm:p-7 max-h-[92vh] overflow-y-auto space-y-5 animate-fade-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center shadow-glow-indigo">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Link & Enroll Sibling</h3>
                  <p className="text-[11px] text-slate-400">Add an incoming Grade 8 learner or link an existing child to your parent profile.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsLinkModalOpen(false);
                  setCreatedCredentials(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CREATED CREDENTIALS CELEBRATION CARD */}
            {createdCredentials ? (
              <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/80 to-surface-darker border border-emerald-500/40 space-y-4 animate-fade-in">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Sibling Successfully Enrolled & Linked!</span>
                </div>

                <p className="text-xs text-slate-300">
                  <strong>{createdCredentials.learner_name}</strong> is now enrolled in <strong>Grade {createdCredentials.grade}</strong>. Login credentials have been generated using the official school format and dispatched to your email.
                </p>

                <div className="p-4 rounded-xl bg-surface-dark border border-white/10 space-y-2.5 font-mono text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Learner Number:</span>
                    <span className="text-cyan-400 font-bold">{createdCredentials.learner_number}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Portal Email:</span>
                    <span className="text-white font-bold">{createdCredentials.learner_email}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Initial Password:</span>
                    <span className="text-amber-300 font-bold">{createdCredentials.generated_password}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => handleCopyCredentials(`Email: ${createdCredentials.learner_email}\nPassword: ${createdCredentials.generated_password}\nLearner Number: ${createdCredentials.learner_number}`)}
                    className="flex-1 py-2.5 rounded-xl bg-surface-dark hover:bg-white/10 text-white font-bold text-xs border border-white/10 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedKey ? 'Credentials Copied!' : 'Copy Login Details'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsLinkModalOpen(false);
                      setCreatedCredentials(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-glow-indigo transition-all"
                  >
                    Done & View Child
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Tab Switcher */}
                <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-surface-darker border border-white/10">
                  <button
                    type="button"
                    onClick={() => setLinkTab('enroll_sibling')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      linkTab === 'enroll_sibling'
                        ? 'bg-brand-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Enroll New Sibling (Grade 8 / Other)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLinkTab('activate_existing')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      linkTab === 'activate_existing'
                        ? 'bg-brand-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Link Existing Learner ID
                  </button>
                </div>

                {/* FORM TAB 1: ENROLL SIBLING INTERNALLY */}
                {linkTab === 'enroll_sibling' ? (
                  <form onSubmit={handleEnrollSibling} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 font-bold mb-1">Sibling First Name *</label>
                        <input
                          type="text"
                          required
                          value={siblingForm.first_name}
                          onChange={(e) => setSiblingForm({ ...siblingForm, first_name: e.target.value })}
                          placeholder="e.g. Lesedi"
                          className="w-full rounded-xl bg-surface-darker border border-white/10 px-3.5 py-2.5 text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 font-bold mb-1">Sibling Surname *</label>
                        <input
                          type="text"
                          required
                          value={siblingForm.surname}
                          onChange={(e) => setSiblingForm({ ...siblingForm, surname: e.target.value })}
                          placeholder="e.g. Makola"
                          className="w-full rounded-xl bg-surface-darker border border-white/10 px-3.5 py-2.5 text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 font-bold mb-1">SA ID Number / Birth Certificate No</label>
                        <input
                          type="text"
                          maxLength={13}
                          value={siblingForm.id_number}
                          onChange={(e) => setSiblingForm({ ...siblingForm, id_number: e.target.value })}
                          placeholder="13-digit ID (used for password)"
                          className="w-full rounded-xl bg-surface-darker border border-white/10 px-3.5 py-2.5 text-white font-mono placeholder-slate-500 focus:ring-2 focus:ring-brand-500"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 font-bold mb-1">Date of Birth</label>
                        <input
                          type="date"
                          value={siblingForm.dob}
                          onChange={(e) => setSiblingForm({ ...siblingForm, dob: e.target.value })}
                          className="w-full rounded-xl bg-surface-darker border border-white/10 px-3.5 py-2.5 text-white font-mono focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-300 font-bold mb-1">Grade Level *</label>
                        <select
                          value={siblingForm.grade}
                          onChange={(e) => {
                            const gr = e.target.value;
                            setSiblingForm({
                              ...siblingForm,
                              grade: gr,
                              stream: parseInt(gr, 10) >= 10 ? 'Science' : 'General'
                            });
                          }}
                          className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                        >
                          <option value="8">Grade 8 (Incoming)</option>
                          <option value="9">Grade 9</option>
                          <option value="10">Grade 10</option>
                          <option value="11">Grade 11</option>
                          <option value="12">Grade 12</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-300 font-bold mb-1">Curriculum Stream</label>
                        <select
                          disabled={parseInt(siblingForm.grade, 10) < 10}
                          value={siblingForm.stream}
                          onChange={(e) => setSiblingForm({ ...siblingForm, stream: e.target.value })}
                          className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
                        >
                          {parseInt(siblingForm.grade, 10) < 10 ? (
                            <option value="General">General (Gr 8-9 CAPS)</option>
                          ) : (
                            <>
                              <option value="Science">Science Stream</option>
                              <option value="Commerce">Commerce Stream</option>
                              <option value="Tourism">Tourism / Humanities</option>
                            </>
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-300 font-bold mb-1">Home Language</label>
                        <select
                          value={siblingForm.home_language}
                          onChange={(e) => setSiblingForm({ ...siblingForm, home_language: e.target.value })}
                          className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-brand-500"
                        >
                          {SA_OFFICIAL_LANGUAGES.map((lang) => (
                            <option key={lang} value={lang}>{lang} Home Lang</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Previous School / Primary School Name</label>
                      <input
                        type="text"
                        value={siblingForm.previous_school}
                        onChange={(e) => setSiblingForm({ ...siblingForm, previous_school: e.target.value })}
                        placeholder="e.g. Fusion Primary / Sunnyside Primary"
                        className="w-full rounded-xl bg-surface-darker border border-white/10 px-3.5 py-2.5 text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500"
                      />
                    </div>

                    {/* Generator Notice */}
                    <div className="p-3.5 rounded-2xl bg-brand-950/40 border border-brand-500/30 text-[11px] text-slate-300 space-y-1">
                      <div className="flex items-center gap-1.5 text-brand-300 font-bold">
                        <Key className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Automated Credential Generation</span>
                      </div>
                      <p className="text-slate-400 leading-relaxed">
                        A sequential <strong>Learner Number (e.g. 202600XX)</strong> and password (<strong>FH@&lt;first-6-of-ID&gt;</strong>) will be generated automatically and dispatched to your email.
                      </p>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => setIsLinkModalOpen(false)}
                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submittingLink}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 text-white font-bold shadow-glow-indigo transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>{submittingLink ? 'Enrolling Sibling...' : 'Enroll & Link Sibling'}</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  /* FORM TAB 2: LINK EXISTING LEARNER BY ID */
                  <form onSubmit={handleActivateExisting} className="space-y-4 text-xs">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Learner Number or SA ID Number *</label>
                      <input
                        type="text"
                        required
                        value={activateForm.learner_number}
                        onChange={(e) => setActivateForm({ ...activateForm, learner_number: e.target.value })}
                        placeholder="e.g. 2026-FHS-024 or 13-digit ID"
                        className="w-full rounded-xl bg-surface-darker border border-white/10 px-3.5 py-2.5 text-white font-mono placeholder-slate-500 focus:ring-2 focus:ring-brand-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 font-bold mb-1">Child First Name *</label>
                        <input
                          type="text"
                          required
                          value={activateForm.first_name}
                          onChange={(e) => setActivateForm({ ...activateForm, first_name: e.target.value })}
                          placeholder="e.g. Prince"
                          className="w-full rounded-xl bg-surface-darker border border-white/10 px-3.5 py-2.5 text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 font-bold mb-1">Child Surname *</label>
                        <input
                          type="text"
                          required
                          value={activateForm.surname}
                          onChange={(e) => setActivateForm({ ...activateForm, surname: e.target.value })}
                          placeholder="e.g. Makola"
                          className="w-full rounded-xl bg-surface-darker border border-white/10 px-3.5 py-2.5 text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => setIsLinkModalOpen(false)}
                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submittingLink}
                        className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold shadow-glow-indigo transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        <Link className="w-3.5 h-3.5" />
                        <span>{submittingLink ? 'Linking...' : 'Link Child Profile'}</span>
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
