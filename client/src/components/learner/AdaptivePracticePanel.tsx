import React, { useEffect, useState } from 'react';
import { aiTutorService } from '../../services/api';
import { BrainCircuit, CheckCircle2, XCircle } from 'lucide-react';

interface GraphNode {
  id: string;
  title: string;
  grade: number;
  mastery: number | null;
  attempts: number;
  current: boolean;
}

interface PracticePayload {
  concept: { id: string; title: string; grade: number; note: string };
  mastery: number | null;
  attempts: number;
  steppedBack: boolean;
  fromConcept: { title: string; grade: number } | null;
  pathReason: string;
  item: { token: string; prompt: string; kind: string };
  graph: GraphNode[];
  correct?: boolean;
  expected?: string;
  explanation?: string;
  updatedMastery?: number;
}

export const AdaptivePracticePanel: React.FC<{ subject: string; grade: number }> = ({ subject, grade }) => {
  const [practice, setPractice] = useState<PracticePayload | null>(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState('');
  const [lastMark, setLastMark] = useState<PracticePayload | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    setLastMark(null);
    try {
      const data = await aiTutorService.getAdaptivePractice(subject, grade);
      setPractice(data);
      setAnswer('');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Practice could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [subject, grade]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!practice?.item.token || !answer.trim()) return;
    setMarking(true);
    setError('');
    try {
      const data = await aiTutorService.submitAdaptiveAnswer({
        token: practice.item.token,
        answer: answer.trim(),
        grade
      });
      setLastMark(data);
      setPractice(data);
      setAnswer('');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'This answer could not be marked.');
    } finally {
      setMarking(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-400">Building the next CAPS item…</p>;
  }

  if (!practice) {
    return <p className="text-sm text-rose-300">{error || 'Practice is unavailable.'}</p>;
  }

  const masteryLabel = practice.mastery == null ? 'Not practised yet' : `${Math.round(practice.mastery * 100)}% mastery`;

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-cyan-500/30 bg-slate-950/60 p-5">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-cyan-300">
          <BrainCircuit className="w-4 h-4" />
          Concept path
        </div>
        <h3 className="mt-2 text-lg font-extrabold text-white">
          Grade {practice.concept.grade} · {practice.concept.title}
        </h3>
        <p className="mt-1 text-sm text-slate-300">{practice.pathReason}</p>
        <p className="mt-2 text-xs font-semibold text-slate-400">{masteryLabel}</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {practice.graph.map((node) => (
          <div
            key={node.id}
            className={`min-w-[140px] rounded-2xl border px-3 py-2 ${
              node.current ? 'border-cyan-400 bg-cyan-500/10' : 'border-white/10 bg-slate-900/50'
            }`}
          >
            <p className="text-[10px] font-bold text-slate-400">Grade {node.grade}</p>
            <p className="text-xs font-bold text-white">{node.title}</p>
            <p className="text-[11px] text-cyan-200">
              {node.mastery == null ? 'New' : `${Math.round(node.mastery * 100)}%`}
            </p>
          </div>
        ))}
      </div>

      {lastMark && (
        <div className={`rounded-2xl border p-4 text-sm ${lastMark.correct ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100' : 'border-rose-500/40 bg-rose-500/10 text-rose-100'}`}>
          <p className="flex items-center gap-2 font-bold">
            {lastMark.correct ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {lastMark.correct ? 'Correct' : `The answer is ${lastMark.expected}`}
          </p>
          <p className="mt-2 leading-relaxed">{lastMark.explanation}</p>
        </div>
      )}

      <form onSubmit={submit} className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 space-y-3">
        <p className="text-base font-semibold text-white leading-relaxed">{practice.item.prompt}</p>
        <input
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          inputMode="decimal"
          className="w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
          placeholder="Your answer"
        />
        {error && <p className="text-xs text-rose-300">{error}</p>}
        <button
          type="submit"
          disabled={marking || !answer.trim()}
          className="px-4 py-2 rounded-xl bg-blue-600 text-sm font-bold text-always-white disabled:opacity-50 cursor-pointer"
        >
          {marking ? 'Marking…' : 'Check answer'}
        </button>
      </form>
    </div>
  );
};
