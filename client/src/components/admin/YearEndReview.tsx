import React, { useEffect, useState } from 'react';
import { adminService, classStaffService } from '../../services/api';
import { UserAvatar } from '../common/UserAvatar';

type LearnerRow = {
  child_id: number;
  name: string;
  learner_number?: string;
  profile_picture?: string | null;
  profile_picture_path?: string | null;
  grade: number;
  results_complete: boolean;
  missing_terms: number[];
  decision: string | null;
  enrolment: { id: number; grade: number; class_id: number | null; class_name?: string; status: string } | null;
};

type Incoming = { id: number; first_name: string; surname: string; grade_applied: number; status: string };

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const transientFailure = (err: any) => (
  !err?.response || err?.code === 'ERR_NETWORK' || err?.code === 'ECONNABORTED' || err?.message === 'Network Error'
);

const decisions = [
  { id: 'promote', label: 'Promote' },
  { id: 'repeat', label: 'Repeat' },
  { id: 'pending', label: 'Pending' },
  { id: 'transferred', label: 'Transferred' },
  { id: 'withdrawn', label: 'Withdrawn' }
];

export const YearEndReview: React.FC = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [learners, setLearners] = useState<LearnerRow[]>([]);
  const [incoming, setIncoming] = useState<Incoming[]>([]);
  const [classes, setClasses] = useState<Array<{ id: number; name: string; grade: number }>>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    let review;
    try {
      review = await adminService.getProgression(year);
    } catch (err: any) {
      if (!transientFailure(err)) {
        setError(err?.response?.data?.error || 'The year-end review could not be loaded.');
        return;
      }
      await wait(2000);
      try {
        review = await adminService.getProgression(year);
      } catch (retryErr: any) {
        setError(retryErr?.response?.data?.error || 'The year-end review could not be loaded.');
        return;
      }
    }
    setLearners(review.learners || []);
    setIncoming(review.incoming || []);
    try {
      const classData = await classStaffService.getClasses();
      const rows = Array.isArray(classData) ? classData : (classData.classes || classData.data || []);
      setClasses(rows);
    } catch {
      setClasses([]);
    }
  };

  useEffect(() => { load(); }, [year]);

  const decide = async (learner: LearnerRow, decision: string) => {
    const reason = decision === 'transferred' || decision === 'withdrawn'
      ? window.prompt('Reason for this decision') || ''
      : '';
    setError('');
    setMessage('');
    try {
      await adminService.recordProgression(learner.child_id, { year, decision, reason });
      setMessage(`${learner.name} is recorded as ${decision}. The current grade was not changed.`);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'The decision could not be saved.');
    }
  };

  const allocate = async (learner: LearnerRow, classId: string) => {
    if (!learner.enrolment || !classId) return;
    setError('');
    try {
      await adminService.allocateProgressionClass(learner.enrolment.id, Number(classId));
      setMessage(`${learner.name} is allocated for the next year.`);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'The class could not be allocated.');
    }
  };

  const apply = async () => {
    if (!window.confirm(`Make ${year + 1} the current register for learners who already have a class?`)) return;
    setError('');
    try {
      const result = await adminService.applyProgression(year + 1);
      setMessage(`${result.applied} learners now use their ${year + 1} grade and class. ${result.waiting_for_class.length} still need a class.`);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'The register was not changed.');
    }
  };

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#111821]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#101820] dark:text-white">Year-end progression</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">A result is not a promotion. The next year is prepared only after a decision, and the current register changes only when you apply it.</p>
        </div>
        <label className="text-sm text-[#101820] dark:text-white">
          Year
          <input className="ml-2 w-24 rounded border border-slate-300 bg-white px-2 py-1 dark:border-white/20 dark:bg-[#111821]" type="number" value={year} onChange={(event) => setYear(Number(event.target.value))} />
        </label>
      </div>
      {error && <p className="mt-3 text-sm text-rose-700">{error}</p>}
      {message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-slate-500">
              <th className="py-2">Learner</th>
              <th>Grade</th>
              <th>Results</th>
              <th>Decision</th>
              <th>Next year</th>
            </tr>
          </thead>
          <tbody>
            {learners.map((learner) => (
              <tr key={learner.child_id} className="border-t border-slate-200 dark:border-white/10">
                <td className="py-2 text-[#101820] dark:text-white">
                  <div className="flex items-center gap-2.5">
                    <UserAvatar user={learner} size="xs" />
                    <div>
                      <span>{learner.name}</span>
                      <span className="block text-xs text-slate-500">{learner.learner_number}</span>
                    </div>
                  </div>
                </td>
                <td>{learner.grade}</td>
                <td>{learner.results_complete ? 'All four terms' : `Missing ${learner.missing_terms.join(', ') || 'terms'}`}</td>
                <td>
                  <select className="rounded border border-slate-300 bg-white px-2 py-1 dark:border-white/20 dark:bg-[#111821]" value={learner.decision || ''} onChange={(event) => decide(learner, event.target.value)}>
                    <option value="">Choose</option>
                    {decisions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                  </select>
                </td>
                <td>
                  {learner.enrolment ? (
                    <select className="rounded border border-slate-300 bg-white px-2 py-1 dark:border-white/20 dark:bg-[#111821]" value={learner.enrolment.class_id || ''} onChange={(event) => allocate(learner, event.target.value)}>
                      <option value="">Grade {learner.enrolment.grade} class</option>
                      {classes.filter((item) => Number(item.grade) === Number(learner.enrolment?.grade)).map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  ) : <span className="text-slate-500">{learner.decision || 'No enrolment'}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Incoming for {year + 1}: {incoming.length === 0 ? 'none in admissions' : incoming.map((item) => `${item.first_name} ${item.surname} (Grade ${item.grade_applied})`).join(', ')}. Admissions keeps their learner record.
        </p>
        <button type="button" className="rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white" onClick={apply}>
          Apply {year + 1} register
        </button>
      </div>
    </section>
  );
};
