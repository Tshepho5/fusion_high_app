import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/api';

type IncompleteLearner = {
  id: number;
  name: string;
  learner_number?: string;
  grade: number;
  stored_subjects: string[];
  missing_from_package: string[];
};

export const IncompleteLearnerSubjects: React.FC = () => {
  const [learners, setLearners] = useState<IncompleteLearner[]>([]);
  const [offerings, setOfferings] = useState<Record<string, string[]>>({});
  const [picked, setPicked] = useState<Record<number, string[]>>({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    try {
      const review = await adminService.getSubjectAllocationAudit();
      setLearners(review.incomplete || []);
      setOfferings(review.offerings || {});
    } catch (err: any) {
      setError(err?.response?.data?.error || 'The incomplete subject list could not be loaded.');
    }
  };

  useEffect(() => { load(); }, []);

  const choicesFor = (learner: IncompleteLearner) => {
    const saved = new Set(learner.stored_subjects.map((subject) => subject.toLowerCase()));
    const offered = offerings[String(learner.grade)] || offerings[learner.grade as unknown as string] || [];
    const choices = [...learner.missing_from_package, ...offered];
    const seen = new Set<string>();
    return choices.filter((subject) => {
      const key = subject.toLowerCase();
      if (!subject || saved.has(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const toggle = (learnerId: number, subject: string) => {
    setPicked((current) => {
      const selected = current[learnerId] || [];
      const next = selected.includes(subject)
        ? selected.filter((item) => item !== subject)
        : [...selected, subject];
      return { ...current, [learnerId]: next };
    });
  };

  const add = async (learner: IncompleteLearner) => {
    const subjects = picked[learner.id] || [];
    if (!subjects.length) {
      setError('Choose the subjects to add.');
      return;
    }
    setError('');
    setMessage('');
    try {
      const result = await adminService.addLearnerSubjects(learner.id, subjects);
      setMessage(`${learner.name}: added ${result.added.join(', ')}.`);
      setPicked((current) => ({ ...current, [learner.id]: [] }));
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'The subjects could not be added.');
    }
  };

  if (!learners.length && !error) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#111821]">
      <h3 className="text-base font-semibold text-[#101820] dark:text-white">Learners with incomplete subjects</h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Add a subject this school offers. Subjects already on the learner stay in place.</p>
      {error && <p className="mt-3 text-sm text-rose-700">{error}</p>}
      {message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}
      <div className="mt-4 space-y-4">
        {learners.map((learner) => {
          const choices = choicesFor(learner);
          return (
            <div key={learner.id} className="border-t border-slate-200 pt-3 dark:border-white/10">
              <p className="text-sm font-semibold text-[#101820] dark:text-white">
                {learner.name} <span className="font-normal text-slate-500">Grade {learner.grade} {learner.learner_number || ''}</span>
              </p>
              <p className="text-xs text-slate-500">Current: {learner.stored_subjects.length ? learner.stored_subjects.join(', ') : 'none'}</p>
              {choices.length === 0 ? (
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Save this grade’s subjects for the school before adding one.</p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {choices.map((subject) => {
                    const selected = (picked[learner.id] || []).includes(subject);
                    return (
                      <button
                        key={subject}
                        type="button"
                        onClick={() => toggle(learner.id, subject)}
                        className={`rounded px-2 py-1 text-xs font-semibold ${selected ? 'bg-slate-950 text-white' : 'bg-slate-100 text-[#101820] dark:bg-white/10 dark:text-white'}`}
                      >
                        {subject}
                      </button>
                    );
                  })}
                  <button type="button" onClick={() => add(learner)} className="rounded bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
                    Add selected
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
