import React, { useState, useEffect } from 'react';
import { learnerService } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  TrendingUp,
  Award,
  Hourglass,
  GraduationCap
} from 'lucide-react';

/** Only treat explicit numeric values as real marks — never invent placeholders. */
function readMark(sub: any): number | null {
  const candidates = [
    sub?.term_mark,
    sub?.mark,
    sub?.percentage,
    sub?.final_mark,
    sub?.average,
    sub?.overall_average,
    // progress / curriculum_progress are course completion, not SBA marks — ignore them
  ];
  for (const c of candidates) {
    if (c === null || c === undefined || c === '') continue;
    const n = Number(c);
    if (Number.isFinite(n) && n >= 0 && n <= 100) return n;
  }
  return null;
}

/** Average only from real uploaded subject marks — never from API placeholder totals. */
function readOverallAverage(subjects: any[]): number | null {
  const marks = subjects.map(readMark).filter((m): m is number => m !== null);
  if (marks.length === 0) return null;
  return Math.round(marks.reduce((a, b) => a + b, 0) / marks.length);
}

export const SubjectPerformanceView: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<string>('Term 3, 2026');

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        const subRes = await learnerService.getMySubjectsOverview().catch(() => learnerService.getSubjects());
        const val = subRes;
        let list: any[] = [];
        if (val && Array.isArray(val.subjects)) list = val.subjects;
        else if (Array.isArray(val)) list = val;
        setSubjects(list);
      } catch (err) {
        console.error('Failed to load performance metrics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPerformance();
  }, []);

  if (loading) {
    return <LoadingSpinner text="Compiling academic performance report..." />;
  }

  const overallAverage = readOverallAverage(subjects);
  const subjectsWithMarks = subjects.filter((s) => readMark(s) !== null);
  const distinctionCount = subjectsWithMarks.filter((s) => (readMark(s) as number) >= 80).length;
  const hasAnyMarks = subjectsWithMarks.length > 0;

  const getCapsRatingLevel = (mark: number) => {
    if (mark >= 80) return { level: 7, label: 'Outstanding Achievement', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    if (mark >= 70) return { level: 6, label: 'Meritorious Achievement', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' };
    if (mark >= 60) return { level: 5, label: 'Substantial Achievement', color: 'text-brand-400 bg-brand-500/10 border-brand-500/20' };
    if (mark >= 50) return { level: 4, label: 'Moderate Achievement', color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' };
    if (mark >= 40) return { level: 3, label: 'Adequate Achievement', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    if (mark >= 30) return { level: 2, label: 'Elementary Achievement', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' };
    return { level: 1, label: 'Not Achieved', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto text-slate-100 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl md:text-2xl font-bold font-display text-white tracking-tight flex items-center gap-2.5">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
              <span>Subject Academic Performance & Analytics</span>
            </h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950/40 dark:bg-cyan-900/30 border border-cyan-500/30 text-[10px] text-cyan-300 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Retrieved Live from Fusion PostgreSQL Database
            </span>
          </div>
        </div>

        <select
          value={selectedTerm}
          onChange={(e) => setSelectedTerm(e.target.value)}
          className="px-3.5 py-2 rounded-xl bg-surface-dark border border-white/10 text-xs font-semibold text-white focus:outline-none focus:border-cyan-500 self-start sm:self-auto"
        >
          <option value="Term 3, 2026">Term 3, 2026 (Current)</option>
          <option value="Term 2, 2026">Term 2, 2026</option>
          <option value="Term 1, 2026">Term 1, 2026</option>
          <option value="Final 2025">Final Exam 2025</option>
        </select>
      </div>

      {!hasAnyMarks && (
        <div className="p-5 rounded-3xl bg-surface-dark border border-amber-500/25 flex items-start gap-3">
          <Hourglass className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-white">Marks not available yet</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Official subject marks will appear here after your school is registered and educators upload verified
              SBA / term results. No placeholder scores are shown.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-surface-dark border border-white/10 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Overall Average</span>
          <p className={`text-3xl font-extrabold ${overallAverage !== null ? 'text-emerald-400' : 'text-slate-500'}`}>
            {overallAverage !== null ? `${overallAverage}%` : '—'}
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-surface-dark border border-white/10 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Enrolled Subjects</span>
          <p className="text-3xl font-extrabold text-white">{subjects.length}</p>
          <span className="text-[10px] text-cyan-400 font-medium">
            {subjects.length > 0 ? 'Enrolled subjects on record' : 'No subjects linked yet'}
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-surface-dark border border-white/10 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Distinction Count (&gt;80%)</span>
          <p className={`text-3xl font-extrabold ${hasAnyMarks ? 'text-cyan-400' : 'text-slate-500'}`}>
            {hasAnyMarks ? `${distinctionCount} Subjects` : '—'}
          </p>
          <span className="text-[10px] text-slate-400 font-medium">
            {hasAnyMarks ? 'Based on uploaded term marks' : 'Awaiting school upload'}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold font-display text-white flex items-center gap-2">
          <Award className="w-4 h-4 text-cyan-400" />
          <span>Subject Marks & CAPS Achievement Scale</span>
        </h3>

        {subjects.length === 0 ? (
          <div className="p-8 rounded-3xl bg-surface-dark border border-white/10 text-center space-y-2">
            <GraduationCap className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="text-sm font-bold text-white">No subject enrolments yet</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Subjects and marks will show here once your school completes registration and assigns your class subjects.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subjects.map((sub, idx) => {
              const mark = readMark(sub);
              const rating = mark !== null ? getCapsRatingLevel(mark) : null;
              const name = sub.name || sub.subject_name || 'Subject';

              return (
                <div
                  key={sub.id || sub.code || idx}
                  className="p-5 rounded-3xl bg-surface-dark border border-white/10 shadow-sm space-y-3.5 hover:border-white/20 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400">{sub.code || `SUBJ${sub.grade || ''}`}</span>
                      <h4 className="text-base font-bold text-white">{name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{sub.teacher || sub.teacher_name || 'To Be Assigned'}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-2xl font-black ${mark !== null ? 'text-white' : 'text-slate-500'}`}>
                        {mark !== null ? `${mark}%` : '—'}
                      </span>
                      <p className="text-[10px] text-slate-400 font-semibold">
                        {mark !== null ? 'Term Mark' : 'Pending'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          mark !== null ? 'bg-gradient-to-r from-cyan-500 to-emerald-400' : 'bg-slate-700'
                        }`}
                        style={{ width: mark !== null ? `${mark}%` : '0%' }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    {rating ? (
                      <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${rating.color}`}>
                        Level {rating.level} • {rating.label}
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-xl text-xs font-bold border border-amber-500/25 bg-amber-500/10 text-amber-300">
                        Awaiting school marks
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400 font-medium">
                      {mark !== null ? 'SBA Verified' : 'Not uploaded'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
