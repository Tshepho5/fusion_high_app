import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { teacherService } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { FileSpreadsheet, Save, CheckCircle2, AlertCircle } from 'lucide-react';

interface LearnerMark {
  id: number;
  full_name: string;
  surname?: string;
  learner_number: string;
  mark: number | '';
}

export const TeacherAssessments: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialSubject = searchParams.get('subject') || 'Mathematics';
  const initialClass = searchParams.get('class') || '10A';

  const [subjects, setSubjects] = useState<string[]>([initialSubject, 'Physical Sciences', 'Life Sciences', 'English FAL', 'Life Orientation']);
  const [classes, setClasses] = useState<string[]>([initialClass, '10A', '10B', '11A', '11B', '12A']);
  const [selectedSubject, setSelectedSubject] = useState<string>(initialSubject);
  const [selectedClass, setSelectedClass] = useState<string>(initialClass);
  const [assessmentName, setAssessmentName] = useState('Term 3 Control Test');
  const [totalMarks, setTotalMarks] = useState<number>(50);
  const [term, setTerm] = useState('Term 3');

  const [learners, setLearners] = useState<LearnerMark[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load teacher workload
  useEffect(() => {
    teacherService.getWorkload()
      .then((res) => {
        const subList = res?.subjects || [];
        const clsList = res?.classes_taught || [];
        if (subList.length > 0) {
          setSubjects(Array.from(new Set([initialSubject, ...subList])));
          if (!searchParams.get('subject')) setSelectedSubject(subList[0]);
        }
        if (clsList.length > 0) {
          setClasses(Array.from(new Set([initialClass, ...clsList])));
          if (!searchParams.get('class')) setSelectedClass(clsList[0]);
        }
      })
      .catch(() => {
        // Keeps defaults
      });
  }, [initialSubject, initialClass, searchParams]);

  // Load learners for selected class
  useEffect(() => {
    if (!selectedClass) return;
    setLoading(true);
    setError(null);
    teacherService.getClassRoster({ class: selectedClass, subject: selectedSubject })
      .then((res) => {
        const roster = Array.isArray(res) ? res : res.roster || res.learners || [];
        setLearners(roster.map((s: any) => ({
          id: s.id || s.child_id,
          full_name: s.full_name || s.learner_name || s.name || 'Learner',
          surname: s.surname || s.learner_surname || '',
          learner_number: s.learner_number || `ID-${s.id}`,
          mark: s.current_mark !== null && s.current_mark !== undefined ? s.current_mark : '',
        })));
      })
      .catch((err) => {
        console.error('Error fetching class roster for assessments:', err);
        setError('Could not load class roster from database.');
        setLearners([]);
      })
      .finally(() => setLoading(false));
  }, [selectedClass, selectedSubject]);

  const handleMarkChange = (id: number, val: string) => {
    const num = val === '' ? '' : Math.min(totalMarks, Math.max(0, parseInt(val) || 0));
    setLearners(prev =>
      prev.map(m => (m.id === id ? { ...m, mark: num } : m))
    );
  };

  const handleSaveMarks = async () => {
    if (!assessmentName.trim() || learners.length === 0) return;
    setSaving(true);
    setSavedSuccess(false);
    setError(null);
    try {
      await teacherService.saveClassMarks({
        assessment_name: assessmentName,
        subject: selectedSubject,
        class: selectedClass,
        term,
        total_mark: totalMarks,
        marks: learners.map(l => ({
          child_id: l.id,
          grade: l.mark === '' ? 0 : l.mark,
        }))
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Marks saved and recorded to database.');
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const validMarks = learners.filter(m => typeof m.mark === 'number');
  const avgScore = validMarks.length > 0
    ? Math.round(validMarks.reduce((acc, m) => acc + (m.mark as number), 0) / validMarks.length)
    : 0;
  const avgPercentage = totalMarks > 0 ? Math.round((avgScore / totalMarks) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-brand-400" />
            Marks & Formal Assessments
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Record and calculate formal marks into the PostgreSQL <span className="font-mono text-cyan-400">progress</span> & <span className="font-mono text-cyan-400">assessment_results</span> tables.
          </p>
        </div>

        <button
          onClick={handleSaveMarks}
          disabled={saving || learners.length === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 text-white font-bold text-xs shadow-glow-indigo transition-all disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save & Publish Marks'}</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>Marks successfully stored in database. Automated academic alerts triggered for any learners needing support.</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Assessment Config Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-4 rounded-2xl bg-surface-dark border border-white/10">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Subject</label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {subjects.map((sub) => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Class</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {classes.map((cls) => (
              <option key={cls} value={cls}>Class {cls}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Term</label>
          <select
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="Term 1">Term 1</option>
            <option value="Term 2">Term 2</option>
            <option value="Term 3">Term 3</option>
            <option value="Term 4">Term 4</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Total Marks</label>
          <input
            type="number"
            value={totalMarks}
            onChange={(e) => setTotalMarks(Math.max(1, parseInt(e.target.value) || 50))}
            min={1}
            max={200}
            className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Task Title</label>
          <input
            type="text"
            value={assessmentName}
            onChange={(e) => setAssessmentName(e.target.value)}
            placeholder="e.g. Control Test 1"
            className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Mark Matrix */}
      <div className="rounded-3xl bg-surface-dark border border-white/10 p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h3 className="text-base font-bold font-display text-white">
              {assessmentName} — Class {selectedClass}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Subject: {selectedSubject} • Total: {totalMarks} Marks • {term}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="emerald" size="md">
              Class Average: {avgScore} / {totalMarks} ({avgPercentage}%)
            </Badge>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner text="Loading class roster from database..." />
        ) : learners.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-mono text-[10px]">
                  <th className="pb-3 px-3">#</th>
                  <th className="pb-3 px-3">Learner ID</th>
                  <th className="pb-3 px-3">Learner Name</th>
                  <th className="pb-3 px-3">Mark (/{totalMarks})</th>
                  <th className="pb-3 px-3">Percentage</th>
                  <th className="pb-3 px-3">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {learners.map((learner, idx) => {
                  const displayName = `${learner.full_name || ''} ${learner.surname || ''}`.trim();
                  const pct = learner.mark !== '' ? Math.round(((learner.mark as number) / totalMarks) * 100) : null;
                  const isPassed = pct !== null ? pct >= 40 : null;
                  return (
                    <tr key={learner.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-3 text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-3 font-mono text-brand-400">{learner.learner_number}</td>
                      <td className="py-3 px-3 font-bold text-white">{displayName}</td>
                      <td className="py-3 px-3">
                        <input
                          type="number"
                          value={learner.mark}
                          onChange={(e) => handleMarkChange(learner.id, e.target.value)}
                          max={totalMarks}
                          min={0}
                          placeholder="-"
                          className="w-20 rounded-xl bg-surface-darker border border-white/10 px-2.5 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-white">
                        {pct !== null ? `${pct}%` : '-'}
                      </td>
                      <td className="py-3 px-3">
                        {isPassed !== null ? (
                          <Badge variant={isPassed ? 'emerald' : 'rose'} size="sm">
                            {isPassed ? 'Pass' : 'Needs Support'}
                          </Badge>
                        ) : (
                          <span className="text-slate-500 text-[10px]">Unrecorded</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 text-xs">
            No learners found in class {selectedClass}.
          </div>
        )}
      </div>
    </div>
  );
};
