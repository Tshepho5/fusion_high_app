import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Copy,
  Layers,
  Languages,
  Plus,
  Search,
  Sparkles,
  AlertTriangle,
  Edit3,
  Archive,
  Send,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { academicStreamService } from '../../services/api';

type LanguageRow = { language: string; level: string; required?: boolean };
type OfferingsShape = {
  languages: LanguageRow[];
  mathematics: string[];
  electives: string[];
};
type StreamRow = {
  id: number;
  name: string;
  grade: number;
  mathematics: string;
  electives: string[];
  status: string;
};
type CatalogueShape = {
  languages: string[];
  electives: string[];
  mathematics: string[];
  life_orientation?: string;
  senior_phase_compulsory?: string[];
  senior_phase_electives?: string[];
};
type RegistrationProfile = {
  languages: LanguageRow[];
  mathematics: string[];
  electives: string[];
  streams: string[];
};

interface AcademicStreamsManagerProps {
  onUpdated?: () => void;
}

const emptyOfferings: OfferingsShape = { languages: [], mathematics: [], electives: [] };
const ALL_GRADES = [8, 9, 10, 11, 12] as const;

export const AcademicStreamsManager: React.FC<AcademicStreamsManagerProps> = ({ onUpdated }) => {
  const { user } = useAuth();
  const { currentSchool } = useSchool();

  const schoolId = user?.is_superadmin
    ? Number(currentSchool?.id || user?.school_id)
    : Number(user?.school_id);

  const [year, setYear] = useState<number | 'auto'>('auto');
  const [resolvedYear, setResolvedYear] = useState<number>(() => new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [grade, setGrade] = useState<number>(10);

  const [catalogue, setCatalogue] = useState<CatalogueShape>({
    languages: [],
    electives: [],
    mathematics: ['Mathematics', 'Mathematical Literacy'],
    life_orientation: 'Life Orientation',
    senior_phase_compulsory: [],
    senior_phase_electives: [],
  });
  const [offerings, setOfferings] = useState<OfferingsShape>(emptyOfferings);
  const [savedOfferings, setSavedOfferings] = useState<OfferingsShape>(emptyOfferings);
  const [allGradeOfferings, setAllGradeOfferings] = useState<Record<number, OfferingsShape>>({});
  const [streams, setStreams] = useState<StreamRow[]>([]);
  const [allStreams, setAllStreams] = useState<StreamRow[]>([]);
  const [registrationProfile, setRegistrationProfile] = useState<RegistrationProfile | null>(null);
  const [summary, setSummary] = useState<{
    offerings: Array<{ grade: number; total: number }>;
    streams: Array<{ grade: number; status: string; total: number }>;
  }>({ offerings: [], streams: [] });

  // Stream editor state
  const [name, setName] = useState('');
  const [mathematics, setMathematics] = useState('Mathematics');
  const [picked, setPicked] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);

  // UI state
  const [catalogueSearch, setCatalogueSearch] = useState('');
  const [showAllGradesOverview, setShowAllGradesOverview] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copyingYear, setCopyingYear] = useState(false);

  const isSeniorPhase = grade === 8 || grade === 9;

  const load = async (overrideYear?: number | 'auto', overrideGrade?: number) => {
    if (!schoolId) return;
    const reqYear = overrideYear !== undefined ? overrideYear : year;
    const reqGrade = overrideGrade !== undefined ? overrideGrade : grade;
    setLoading(true);
    setError('');
    try {
      const data = await academicStreamService.configuration(schoolId, reqYear, reqGrade);
      if (data.catalogue) setCatalogue(data.catalogue);
      const nextOfferings = data.offerings || emptyOfferings;
      setOfferings(nextOfferings);
      setSavedOfferings(nextOfferings);
      setAllGradeOfferings(data.all_grade_offerings || {});
      setStreams(data.streams || []);
      setAllStreams(data.all_streams || []);
      setRegistrationProfile(data.registration_profile || null);
      setSummary(data.summary || { offerings: [], streams: [] });
      setAvailableYears(Array.isArray(data.available_years) ? data.available_years : []);
      if (data.academic_year) {
        setResolvedYear(Number(data.academic_year));
        if (reqYear === 'auto') setYear(Number(data.academic_year));
      }
      if (nextOfferings.mathematics?.length && !nextOfferings.mathematics.includes(mathematics)) {
        setMathematics(nextOfferings.mathematics[0]);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'This school’s subject offerings and streams could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, year, grade]);

  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear();
    const set = new Set<number>([now, now + 1, resolvedYear, ...availableYears]);
    return Array.from(set).filter((y) => Number.isInteger(y)).sort((a, b) => b - a);
  }, [availableYears, resolvedYear]);

  const hasUnsavedOfferingChanges = useMemo(() => {
    return JSON.stringify(offerings) !== JSON.stringify(savedOfferings);
  }, [offerings, savedOfferings]);

  const homeLanguages = useMemo(
    () => offerings.languages.filter((row) => row.level === 'Home Language'),
    [offerings.languages]
  );
  const additionalLanguages = useMemo(
    () => offerings.languages.filter((row) => row.level === 'First Additional Language'),
    [offerings.languages]
  );

  const publishedCount = summary.streams
    .filter((row) => row.status === 'published')
    .reduce((sum, row) => sum + row.total, 0);

  const toggleLanguage = (language: string, level: string) => {
    setMessage('');
    setOfferings((current) => {
      const exists = current.languages.some((row) => row.language === language && row.level === level);
      return {
        ...current,
        languages: exists
          ? current.languages.filter((row) => !(row.language === language && row.level === level))
          : [...current.languages, { language, level, required: false }],
      };
    });
  };

  const toggleRequiredFal = (language: string) => {
    setMessage('');
    setOfferings((current) => ({
      ...current,
      languages: current.languages.map((row) => {
        if (row.level !== 'First Additional Language') return row;
        if (row.language === language) return { ...row, required: !row.required };
        return { ...row, required: false };
      }),
    }));
  };

  const toggleList = (field: 'mathematics' | 'electives', value: string) => {
    setMessage('');
    setOfferings((current) => {
      const list = current[field];
      return {
        ...current,
        [field]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value],
      };
    });
  };

  const handleLoadRegistrationProfile = () => {
    if (!registrationProfile) return;
    setError('');
    setMessage('');
    if (isSeniorPhase) {
      const coreMath = (catalogue.senior_phase_compulsory || []).includes('Mathematics') ? ['Mathematics'] : [];
      const coreOthers = (catalogue.senior_phase_compulsory || []).filter((s) => s !== 'Mathematics');
      setOfferings({
        languages: registrationProfile.languages || [],
        mathematics: coreMath,
        electives: coreOthers,
      });
    } else {
      setOfferings({
        languages: registrationProfile.languages || [],
        mathematics: registrationProfile.mathematics.length ? registrationProfile.mathematics : ['Mathematics'],
        electives: registrationProfile.electives || [],
      });
    }
    setMessage('Loaded your school’s initial registration subjects into the editor. Review your selections and click Save Offerings to activate them.');
  };

  const saveOfferings = async (applyToPhase = false) => {
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const applyToGrades = applyToPhase
        ? (isSeniorPhase ? [8, 9] : [10, 11, 12])
        : [grade];
      await academicStreamService.saveOfferings(schoolId, {
        academic_year: resolvedYear,
        grade,
        apply_to_grades: applyToGrades,
        ...offerings,
      });
      setMessage(
        applyToPhase
          ? `Subject offerings saved and applied to Grades ${applyToGrades.join(', ')} (${resolvedYear}). The application form and learner registration now reflect these changes.`
          : `Subject offerings saved for Grade ${grade} (${resolvedYear}). The application form and learner registration now reflect these changes.`
      );
      await load(resolvedYear, grade);
      if (onUpdated) onUpdated();
    } catch (err: any) {
      const details = Array.isArray(err.response?.data?.errors) ? err.response.data.errors.join(' ') : '';
      setError(details || err.response?.data?.error || 'The offerings could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyFromPreviousYear = async (sourceYear: number) => {
    setError('');
    setMessage('');
    setCopyingYear(true);
    try {
      const res = await academicStreamService.copyYear(schoolId, sourceYear, resolvedYear);
      setMessage(
        `Copied ${res.copied_offerings} subject offering(s) and ${res.copied_streams} academic stream(s) from ${sourceYear} to ${resolvedYear}.`
      );
      await load(resolvedYear, grade);
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setError(err.response?.data?.error || `Could not copy offerings from ${sourceYear}.`);
    } finally {
      setCopyingYear(false);
    }
  };

  const toggleElective = (subject: string) => {
    setPicked((current) => {
      if (current.includes(subject)) return current.filter((item) => item !== subject);
      if (current.length >= 3) return current;
      return [...current, subject];
    });
  };

  const resetStreamEditor = () => {
    setEditingId(null);
    setName('');
    setPicked([]);
    setMathematics(savedOfferings.mathematics[0] || offerings.mathematics[0] || 'Mathematics');
  };

  const saveStream = async () => {
    setError('');
    setMessage('');
    setSaving(true);
    try {
      await academicStreamService.saveStream(
        schoolId,
        {
          academic_year: resolvedYear,
          grade,
          name,
          mathematics,
          electives: picked,
        },
        editingId
      );
      resetStreamEditor();
      setMessage(
        editingId
          ? 'Academic stream updated. Applicants and accepted learners can now see the updated subjects.'
          : 'Academic stream created and published. Applicants and accepted learners can choose it now.'
      );
      await load(resolvedYear, grade);
      if (onUpdated) onUpdated();
    } catch (err: any) {
      const details = Array.isArray(err.response?.data?.errors) ? err.response.data.errors.join(' ') : '';
      setError(details || err.response?.data?.error || 'The stream could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const act = async (id: number, action: 'publish' | 'archive') => {
    setError('');
    setMessage('');
    try {
      if (action === 'publish') await academicStreamService.publish(schoolId, id);
      else await academicStreamService.archive(schoolId, id);
      setMessage(action === 'publish' ? 'Stream published for applicants.' : 'Stream archived.');
      if (editingId === id && action === 'archive') resetStreamEditor();
      await load(resolvedYear, grade);
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setError(err.response?.data?.error || 'The stream could not be updated.');
    }
  };

  const filteredElectiveCatalogue = useMemo(() => {
    const q = catalogueSearch.trim().toLowerCase();
    const list = isSeniorPhase
      ? (catalogue.senior_phase_electives || [])
      : (catalogue.electives || []);
    if (!q) return list;
    return list.filter((s) => s.toLowerCase().includes(q));
  }, [catalogue, isSeniorPhase, catalogueSearch]);

  const currentYearHasAnyOfferings = useMemo(() => {
    return Object.values(allGradeOfferings).some(
      (g) => (g.languages?.length || 0) + (g.mathematics?.length || 0) + (g.electives?.length || 0) > 0
    );
  }, [allGradeOfferings]);

  const copySourceYear = useMemo(() => {
    return availableYears.find((y) => y !== resolvedYear) || null;
  }, [availableYears, resolvedYear]);

  const hasRegistrationSeedData = useMemo(() => {
    if (!registrationProfile) return false;
    return (
      (registrationProfile.languages?.length || 0) > 0 ||
      (registrationProfile.mathematics?.length || 0) > 0 ||
      (registrationProfile.electives?.length || 0) > 0
    );
  }, [registrationProfile]);

  const gradeHasOfferings = (g: number) => {
    const row = allGradeOfferings[g];
    if (!row) return 0;
    return (row.languages?.length || 0) + (row.mathematics?.length || 0) + (row.electives?.length || 0);
  };

  const gradeStreamCount = (g: number) =>
    allStreams.filter((s) => Number(s.grade) === g).length;

  const streamSelectableMath = savedOfferings.mathematics.length ? savedOfferings.mathematics : offerings.mathematics;
  const streamSelectableElectives = savedOfferings.electives.length ? savedOfferings.electives : offerings.electives;

  if (!schoolId) {
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-200">
        This account is not linked to a school workspace. Select a registered school first to manage its subject offerings and streams.
      </div>
    );
  }

  return (
    <section className="space-y-6 text-slate-900 dark:text-slate-100">
      {/* Header & Academic Year Controls */}
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300 border border-blue-500/20">
                <GraduationCap className="w-3.5 h-3.5" />
                Grades 8–12 • School Curriculum
              </span>
              {currentSchool?.name && (
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {currentSchool.name}
                </span>
              )}
            </div>
            <h2 className="mt-1.5 text-xl sm:text-2xl font-bold tracking-tight">
              School Subject Offerings &amp; Academic Streams
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-3xl">
              Configure the exact Home Languages, First Additional Languages, compulsory subjects, elective subjects, and academic streams offered by your school. Changes saved here immediately update the Learner Admission Application Form and accepted-learner dashboard registration.
            </p>
          </div>

          <div className="flex items-end gap-3 flex-wrap">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Academic Year
              <select
                className="mt-1 block rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 dark:border-white/15 dark:bg-slate-900 dark:text-white"
                value={resolvedYear}
                onChange={(event) => setYear(Number(event.target.value))}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y} {availableYears.includes(y) ? '(Configured)' : '(Not yet configured)'}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => setShowAllGradesOverview((v) => !v)}
              className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-white/15 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {showAllGradesOverview ? 'Hide School-Wide Overview' : 'View All Grades & Streams'}
            </button>
          </div>
        </div>

        {/* Grade Tabs (Grades 8–12) */}
        <div className="mt-5 flex items-center gap-2 flex-wrap border-t border-slate-200 pt-4 dark:border-white/10">
          {ALL_GRADES.map((g) => {
            const count = gradeHasOfferings(g);
            const stCount = gradeStreamCount(g);
            const active = grade === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => {
                  setGrade(g);
                  resetStreamEditor();
                }}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all border ${
                  active
                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-200 dark:border-white/10 dark:hover:bg-slate-800'
                }`}
              >
                <span>Grade {g}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-mono ${
                    active
                      ? 'bg-white/20 text-white'
                      : count > 0
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                  }`}
                >
                  {count} subj{g >= 10 ? ` · ${stCount} str` : ''}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Helpful Recovery Banners: Copy Previous Year OR Load Initial School Registration Profile */}
      {!loading && !currentYearHasAnyOfferings && copySourceYear && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-blue-300 bg-blue-50 p-4 text-sm text-blue-950 dark:border-blue-500/30 dark:bg-blue-950/30 dark:text-blue-100">
          <div className="flex items-start gap-2.5">
            <Copy className="w-4 h-4 mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="font-bold">No offerings saved for {resolvedYear} yet — {copySourceYear} is already configured.</p>
              <p className="text-xs opacity-90 mt-0.5">
                Copy all of your school’s Grades 8–12 languages, subjects, and academic streams from {copySourceYear} into {resolvedYear} in one click, or switch back to {copySourceYear}.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={copyingYear}
              onClick={() => handleCopyFromPreviousYear(copySourceYear)}
              className="rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {copyingYear ? 'Copying…' : `Copy ${copySourceYear} to ${resolvedYear}`}
            </button>
            <button
              type="button"
              onClick={() => setYear(copySourceYear)}
              className="rounded-xl border border-blue-400/50 px-3 py-2 text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40"
            >
              View {copySourceYear}
            </button>
          </div>
        </div>
      )}

      {!loading && gradeHasOfferings(grade) === 0 && hasRegistrationSeedData && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-bold">Grade {grade} ({resolvedYear}) has no saved offerings yet.</p>
              <p className="text-xs opacity-90 mt-0.5">
                You can pre-fill the languages and subjects your school chose during initial school registration, then adjust and save.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLoadRegistrationProfile}
            className="shrink-0 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-amber-700"
          >
            Pre-fill from School Registration
          </button>
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ['Grades configured', `${summary.offerings.length} / 5`],
          ['Home Languages (Gr ' + grade + ')', homeLanguages.length],
          ['Active Subjects (Gr ' + grade + ')', offerings.mathematics.length + offerings.electives.length + (isSeniorPhase ? 0 : 1)],
          ['Published Streams (' + resolvedYear + ')', publishedCount],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-950"
          >
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {label}
            </p>
            <p className="mt-1.5 text-2xl font-black">{value}</p>
          </div>
        ))}
      </div>

      {/* School-Wide Overview Grouped by Grade & Stream */}
      {showAllGradesOverview && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-5 dark:border-white/10 dark:bg-slate-950">
          <div>
            <h3 className="text-base font-bold">School Offerings Grouped by Grade ({resolvedYear})</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing only subjects actively offered by this school.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {ALL_GRADES.map((g) => {
              const gOff = allGradeOfferings[g] || emptyOfferings;
              const gHomes = gOff.languages.filter((l) => l.level === 'Home Language');
              const gFals = gOff.languages.filter((l) => l.level === 'First Additional Language');
              const gStreams = allStreams.filter((s) => Number(s.grade) === g);
              return (
                <div
                  key={g}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2 dark:border-white/10 dark:bg-slate-900/60"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">Grade {g}</span>
                    <button
                      type="button"
                      onClick={() => setGrade(g)}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Edit Grade {g}
                    </button>
                  </div>
                  <div className="text-xs space-y-1">
                    <p>
                      <span className="font-semibold text-slate-500">Home Languages: </span>
                      {gHomes.length ? gHomes.map((l) => l.language).join(', ') : <span className="text-amber-600 dark:text-amber-400">Not configured</span>}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-500">First Additional: </span>
                      {gFals.length ? gFals.map((l) => l.language).join(', ') : <span className="text-slate-400">None</span>}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-500">Subjects: </span>
                      {[...(g >= 10 ? ['Life Orientation'] : []), ...gOff.mathematics, ...gOff.electives].join(', ') || 'None configured'}
                    </p>
                    {g >= 10 && (
                      <p>
                        <span className="font-semibold text-slate-500">Streams: </span>
                        {gStreams.length ? gStreams.map((s) => s.name).join(', ') : <span className="text-amber-600 dark:text-amber-400">None created</span>}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-rose-500/40 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-900 dark:bg-rose-950/50 dark:text-rose-100">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-500/40 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
          <span>{message}</span>
        </div>
      )}
      {loading && <p className="text-sm text-slate-500">Loading this school’s configuration…</p>}

      {/* Active Offerings Summary for Selected Grade */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-950 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-500" />
              Currently Offered by Your School — Grade {grade} ({resolvedYear})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              These are the subjects currently active for this school (separate from Geleza SA’s full recognised catalogue below).
            </p>
          </div>
          {hasUnsavedOfferingChanges && (
            <span className="rounded-full bg-amber-500/15 px-3 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 border border-amber-500/30">
              Unsaved changes — click Save Offerings below
            </span>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-3 text-xs">
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/80 dark:bg-slate-900/60 dark:border-white/10">
            <p className="font-bold uppercase text-[10px] text-slate-500 mb-1.5">Languages Offered</p>
            <div className="flex flex-wrap gap-1.5">
              {homeLanguages.map((l) => (
                <span key={`hl-${l.language}`} className="rounded-lg bg-blue-500/15 px-2 py-0.5 font-semibold text-blue-700 dark:text-blue-300">
                  {l.language} (HL)
                </span>
              ))}
              {additionalLanguages.map((l) => (
                <span key={`fal-${l.language}`} className="rounded-lg bg-cyan-500/15 px-2 py-0.5 font-semibold text-cyan-700 dark:text-cyan-300">
                  {l.language} (FAL{l.required ? ' · Required' : ''})
                </span>
              ))}
              {!offerings.languages.length && (
                <span className="text-amber-600 dark:text-amber-400">No languages selected yet</span>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/80 dark:bg-slate-900/60 dark:border-white/10">
            <p className="font-bold uppercase text-[10px] text-slate-500 mb-1.5">
              {isSeniorPhase ? 'Compulsory CAPS Core' : 'Compulsory & Mathematics'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {!isSeniorPhase && (
                <span className="rounded-lg bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-700 dark:text-emerald-300">
                  Life Orientation (Compulsory)
                </span>
              )}
              {offerings.mathematics.map((m) => (
                <span key={m} className="rounded-lg bg-indigo-500/15 px-2 py-0.5 font-semibold text-indigo-700 dark:text-indigo-300">
                  {m}
                </span>
              ))}
              {isSeniorPhase &&
                offerings.electives
                  .filter((s) => (catalogue.senior_phase_compulsory || []).includes(s))
                  .map((s) => (
                    <span key={s} className="rounded-lg bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-700 dark:text-emerald-300">
                      {s}
                    </span>
                  ))}
              {!isSeniorPhase && !offerings.mathematics.length && (
                <span className="text-amber-600 dark:text-amber-400">Select Mathematics or Mathematical Literacy</span>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/80 dark:bg-slate-900/60 dark:border-white/10">
            <p className="font-bold uppercase text-[10px] text-slate-500 mb-1.5">
              {isSeniorPhase ? 'Optional Senior Phase Subjects' : 'Elective Subjects Offered'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(isSeniorPhase
                ? offerings.electives.filter((s) => !(catalogue.senior_phase_compulsory || []).includes(s))
                : offerings.electives
              ).map((s) => (
                <span key={s} className="rounded-lg bg-purple-500/15 px-2 py-0.5 font-semibold text-purple-700 dark:text-purple-300">
                  {s}
                </span>
              ))}
              {(isSeniorPhase
                ? offerings.electives.filter((s) => !(catalogue.senior_phase_compulsory || []).includes(s))
                : offerings.electives
              ).length === 0 && (
                <span className="text-slate-400">None selected yet</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Editor */}
      <div className={`grid gap-6 ${isSeniorPhase ? 'lg:grid-cols-1' : 'lg:grid-cols-2'}`}>
        {/* LEFT: Configure School Offerings from Geleza SA Recognised Catalogue */}
        <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-950">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">
              Step 1 • Recognised Geleza SA CAPS Catalogue
            </p>
            <h3 className="text-lg font-bold">Select Subjects Offered for Grade {grade}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Only subjects checked below will be offered by your school for Grade {grade} ({resolvedYear}).
            </p>
          </div>

          {/* Languages Matrix */}
          <div className="space-y-2.5">
            <h4 className="text-sm font-bold flex items-center gap-1.5">
              <Languages className="w-4 h-4 text-blue-500" />
              Official Languages (Home Language &amp; First Additional Language)
            </h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {catalogue.languages.map((language) => {
                const hlChecked = offerings.languages.some(
                  (row) => row.language === language && row.level === 'Home Language'
                );
                const falRow = offerings.languages.find(
                  (row) => row.language === language && row.level === 'First Additional Language'
                );
                const falChecked = Boolean(falRow);
                return (
                  <div
                    key={language}
                    className={`rounded-xl border p-2.5 text-sm transition-colors ${
                      hlChecked || falChecked
                        ? 'border-blue-500/40 bg-blue-50/50 dark:bg-blue-950/20'
                        : 'border-slate-200 dark:border-white/10'
                    }`}
                  >
                    <div className="font-semibold text-xs">{language}</div>
                    <div className="mt-1.5 flex items-center gap-3 text-xs flex-wrap">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hlChecked}
                          onChange={() => toggleLanguage(language, 'Home Language')}
                        />
                        <span>HL</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={falChecked}
                          onChange={() => toggleLanguage(language, 'First Additional Language')}
                        />
                        <span>FAL</span>
                      </label>
                      {falChecked && (
                        <label className="flex items-center gap-1 cursor-pointer text-[11px] text-cyan-700 dark:text-cyan-300">
                          <input
                            type="checkbox"
                            checked={Boolean(falRow?.required)}
                            onChange={() => toggleRequiredFal(language)}
                          />
                          <span>Required FAL</span>
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Compulsory / Mathematics Section */}
          {isSeniorPhase ? (
            <div className="space-y-2.5">
              <h4 className="text-sm font-bold">Compulsory CAPS Senior Phase Subjects (Grades 8–9)</h4>
              <div className="grid gap-2 sm:grid-cols-2 text-sm">
                {(catalogue.senior_phase_compulsory || []).map((subject) => {
                  const isMath = subject === 'Mathematics';
                  const checked = isMath
                    ? offerings.mathematics.includes(subject)
                    : offerings.electives.includes(subject);
                  return (
                    <label
                      key={subject}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium cursor-pointer ${
                        checked
                          ? 'border-emerald-500/40 bg-emerald-50/60 dark:bg-emerald-950/20'
                          : 'border-slate-200 dark:border-white/10'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleList(isMath ? 'mathematics' : 'electives', subject)}
                      />
                      <span>{subject}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <h4 className="text-sm font-bold">Mathematical Options (Grades 10–12)</h4>
              <div className="flex gap-3 flex-wrap text-sm">
                {catalogue.mathematics.map((subject) => {
                  const checked = offerings.mathematics.includes(subject);
                  return (
                    <label
                      key={subject}
                      className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold cursor-pointer ${
                        checked
                          ? 'border-indigo-500/40 bg-indigo-50/60 dark:bg-indigo-950/20'
                          : 'border-slate-200 dark:border-white/10'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleList('mathematics', subject)}
                      />
                      <span>{subject}</span>
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Life Orientation is compulsory and added automatically to every Grade 10–12 NSC package.
              </p>
            </div>
          )}

          {/* Elective Subjects Catalogue */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h4 className="text-sm font-bold">
                {isSeniorPhase ? 'Optional Senior Phase Subjects' : 'Recognised NSC Elective Subjects Catalogue'}
              </h4>
              <div className="relative w-full sm:w-52">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={catalogueSearch}
                  onChange={(e) => setCatalogueSearch(e.target.value)}
                  placeholder="Filter catalogue..."
                  className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-2.5 py-1 text-xs dark:border-white/15 dark:bg-slate-900"
                />
              </div>
            </div>
            <div className="grid max-h-64 gap-2 overflow-auto sm:grid-cols-2 pr-1">
              {filteredElectiveCatalogue.map((subject) => {
                const checked = offerings.electives.includes(subject);
                return (
                  <label
                    key={subject}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium cursor-pointer transition-colors ${
                      checked
                        ? 'border-blue-500/40 bg-blue-50/60 text-blue-950 dark:bg-blue-950/30 dark:text-blue-100'
                        : 'border-slate-200 dark:border-white/10'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleList('electives', subject)}
                    />
                    <span>{subject}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Save Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap pt-2 border-t border-slate-200 dark:border-white/10">
            <button
              type="button"
              disabled={saving}
              onClick={() => saveOfferings(false)}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? 'Saving…' : `Save Grade ${grade} Offerings`}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => saveOfferings(true)}
              className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-100 disabled:opacity-60 dark:border-white/15 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              {isSeniorPhase ? 'Save & Apply to Grades 8 & 9' : 'Save & Apply to Grades 10, 11 & 12'}
            </button>
          </div>
        </div>

        {/* RIGHT: Academic Streams & Stream Subject Combinations (Grades 10–12) */}
        {!isSeniorPhase && (
          <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-purple-600 dark:text-purple-400">
                  Step 2 • Academic Stream Subjects
                </p>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-500" />
                  {editingId ? 'Edit Academic Stream Subjects' : `Create Academic Stream (Grade ${grade})`}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Choose 1 Mathematical option and 3 elective subjects from your school’s offered subjects.
                </p>
              </div>
              {editingId && (
                <button
                  type="button"
                  onClick={resetStreamEditor}
                  className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold hover:bg-slate-100 dark:border-white/15 dark:hover:bg-slate-800"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            {hasUnsavedOfferingChanges && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-200">
                You have modified your offered subjects on the left. Click <strong>Save Grade {grade} Offerings</strong> first before saving a stream that uses newly added subjects.
              </div>
            )}

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                Stream Name
                <input
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-slate-900 dark:text-white"
                  placeholder="e.g., Science, Commerce, Humanities, Tourism"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>

              <div>
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  Mathematical Option (Choose 1)
                </p>
                <div className="flex gap-3 flex-wrap text-xs">
                  {streamSelectableMath.map((subject) => (
                    <label
                      key={subject}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 font-semibold cursor-pointer ${
                        mathematics === subject
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200'
                          : 'border-slate-200 dark:border-white/10'
                      }`}
                    >
                      <input
                        type="radio"
                        name="math-option"
                        checked={mathematics === subject}
                        onChange={() => setMathematics(subject)}
                      />
                      <span>{subject}</span>
                    </label>
                  ))}
                  {!streamSelectableMath.length && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Select Mathematics or Mathematical Literacy on the left and save offerings first.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Stream Electives (Select exactly 3 from this school’s offered electives)
                  </p>
                  <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                    {picked.length} / 3 selected
                  </span>
                </div>
                {streamSelectableElectives.length > 0 ? (
                  <div className="grid max-h-56 gap-2 overflow-auto sm:grid-cols-2 pr-1">
                    {streamSelectableElectives.map((subject) => {
                      const isPicked = picked.includes(subject);
                      const disabled = !isPicked && picked.length >= 3;
                      return (
                        <label
                          key={subject}
                          className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium cursor-pointer transition-colors ${
                            isPicked
                              ? 'border-purple-500 bg-purple-50 text-purple-950 dark:bg-purple-950/40 dark:text-purple-100'
                              : disabled
                              ? 'border-slate-200 opacity-50 dark:border-white/10'
                              : 'border-slate-200 hover:border-purple-400/50 dark:border-white/10'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isPicked}
                            disabled={disabled}
                            onChange={() => toggleElective(subject)}
                          />
                          <span>{subject}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-slate-300 p-4 text-xs text-slate-500 dark:border-white/15 dark:text-slate-400">
                    Check at least 3 elective subjects on the left and click <strong>Save Grade {grade} Offerings</strong> to select subjects for your streams.
                  </p>
                )}
              </div>

              {/* Live 7-Subject Preview */}
              {(name.trim() || picked.length > 0) && (
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 text-xs dark:bg-slate-900/60 dark:border-white/10">
                  <p className="font-bold text-slate-600 dark:text-slate-300">
                    Preview of learner 7-subject NSC package for {name.trim() || 'this stream'}:
                  </p>
                  <p className="mt-1 text-slate-700 dark:text-slate-200">
                    Home Language · First Additional Language · <strong>{mathematics}</strong> · Life Orientation
                    {picked.length > 0 ? ` · ${picked.join(' · ')}` : ''}
                  </p>
                </div>
              )}

              <button
                type="button"
                disabled={saving}
                onClick={saveStream}
                className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-60"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{editingId ? 'Update Stream & Subjects' : 'Save & Publish Stream'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Existing Configured Streams for Selected Grade (Grades 10–12) */}
      {!isSeniorPhase && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden dark:border-white/10 dark:bg-slate-950">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-white/10">
            <div>
              <h3 className="font-bold text-sm">
                Configured Academic Streams — Grade {grade} ({resolvedYear})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click Edit Subjects to add, remove, or swap subjects inside any stream.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-500">
              {streams.length} stream{streams.length === 1 ? '' : 's'}
            </span>
          </div>

          {!streams.length ? (
            <p className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400">
              No academic streams have been created for Grade {grade} ({resolvedYear}) yet. Use the form above to create your school’s streams.
            </p>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-white/10">
              {streams.map((stream) => (
                <li
                  key={stream.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm">{stream.name}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          stream.status === 'published'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {stream.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      <span className="rounded-lg bg-indigo-500/15 px-2 py-0.5 font-semibold text-indigo-700 dark:text-indigo-300">
                        {stream.mathematics}
                      </span>
                      <span className="rounded-lg bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-700 dark:text-emerald-300">
                        Life Orientation
                      </span>
                      {stream.electives.map((el) => (
                        <span
                          key={el}
                          className="rounded-lg bg-purple-500/15 px-2 py-0.5 font-semibold text-purple-700 dark:text-purple-300"
                        >
                          {el}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-bold hover:bg-slate-100 dark:border-white/15 dark:hover:bg-slate-800"
                      onClick={() => {
                        setEditingId(stream.id);
                        setName(stream.name);
                        setMathematics(stream.mathematics);
                        setPicked([...stream.electives]);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Subjects</span>
                    </button>
                    {stream.status !== 'published' && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
                        onClick={() => act(stream.id, 'publish')}
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Publish</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-xl border border-rose-500/30 px-3 py-1.5 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-500/10"
                      onClick={() => act(stream.id, 'archive')}
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>Archive</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
};
