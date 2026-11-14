import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { academicStreamService } from '../../services/api';

type LanguageRow = { language: string; level: string; required?: boolean };
type StreamRow = {
  id: number;
  name: string;
  grade: number;
  mathematics: string;
  electives: string[];
  status: string;
};

const emptyOfferings = { languages: [] as LanguageRow[], mathematics: [] as string[], electives: [] as string[] };

export const AcademicStreamsManager: React.FC = () => {
  const { user } = useAuth();
  const schoolId = Number(user?.school_id);
  const [year, setYear] = useState(new Date().getFullYear());
  const [grade, setGrade] = useState(10);
  const [catalogue, setCatalogue] = useState<{ languages: string[]; electives: string[]; mathematics: string[] }>({
    languages: [], electives: [], mathematics: ['Mathematics', 'Mathematical Literacy']
  });
  const [offerings, setOfferings] = useState(emptyOfferings);
  const [streams, setStreams] = useState<StreamRow[]>([]);
  const [summary, setSummary] = useState<{ offerings: Array<{ grade: number; total: number }>; streams: Array<{ grade: number; status: string; total: number }> }>({ offerings: [], streams: [] });
  const [name, setName] = useState('');
  const [mathematics, setMathematics] = useState('Mathematics');
  const [picked, setPicked] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!schoolId) return;
    setLoading(true);
    setError('');
    try {
      const data = await academicStreamService.configuration(schoolId, year, grade);
      setCatalogue(data.catalogue);
      setOfferings(data.offerings || emptyOfferings);
      setStreams(data.streams || []);
      setSummary(data.summary || { offerings: [], streams: [] });
    } catch (err: any) {
      setError(err.response?.data?.error || 'The school subject streams could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [schoolId, year, grade]);

  const publishedCount = summary.streams.filter((row) => row.status === 'published').reduce((sum, row) => sum + row.total, 0);
  const draftCount = summary.streams.filter((row) => row.status === 'draft').reduce((sum, row) => sum + row.total, 0);

  const toggleLanguage = (language: string, level: string) => {
    setOfferings((current) => {
      const exists = current.languages.some((row) => row.language === language && row.level === level);
      return {
        ...current,
        languages: exists
          ? current.languages.filter((row) => !(row.language === language && row.level === level))
          : [...current.languages, { language, level, required: false }]
      };
    });
  };

  const toggleList = (field: 'mathematics' | 'electives', value: string) => {
    setOfferings((current) => {
      const list = current[field];
      return { ...current, [field]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value] };
    });
  };

  const saveOfferings = async () => {
    setError('');
    setMessage('');
    try {
      await academicStreamService.saveOfferings(schoolId, { academic_year: year, grade, ...offerings });
      setMessage('Subject offerings saved for this grade.');
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'The offerings could not be saved.');
    }
  };

  const toggleElective = (subject: string) => {
    setPicked((current) => {
      if (current.includes(subject)) return current.filter((item) => item !== subject);
      if (current.length >= 3) return current;
      return [...current, subject];
    });
  };

  const saveStream = async () => {
    setError('');
    setMessage('');
    try {
      await academicStreamService.saveStream(schoolId, {
        academic_year: year,
        grade,
        name,
        mathematics,
        electives: picked
      }, editingId);
      setName('');
      setPicked([]);
      setEditingId(null);
      setMessage(editingId ? 'Stream updated. Publish it again after checking the combination.' : 'Stream saved as a draft.');
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'The stream could not be saved.');
    }
  };

  const act = async (id: number, action: 'publish' | 'archive') => {
    setError('');
    try {
      if (action === 'publish') await academicStreamService.publish(schoolId, id);
      else await academicStreamService.archive(schoolId, id);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'The stream could not be updated.');
    }
  };

  const gradeLabels = useMemo(() => [10, 11, 12], []);

  if (!schoolId) {
    return <p className="text-sm text-slate-600 dark:text-slate-300">This account is not linked to a school.</p>;
  }

  return (
    <section className="space-y-6 text-slate-900 dark:text-slate-100">
      <header className="flex flex-col gap-4 border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-950 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Grades 10–12</p>
          <h2 className="text-2xl font-semibold">Subject offerings and academic streams</h2>
        </div>
        <div className="flex gap-3">
          <label className="text-sm">Year
            <input className="mt-1 block w-28 border border-slate-300 bg-white px-3 py-2 dark:border-white/15 dark:bg-slate-900" type="number" value={year} onChange={(event) => setYear(Number(event.target.value))} />
          </label>
          <label className="text-sm">Grade
            <select className="mt-1 block border border-slate-300 bg-white px-3 py-2 dark:border-white/15 dark:bg-slate-900" value={grade} onChange={(event) => setGrade(Number(event.target.value))}>
              {gradeLabels.map((item) => <option key={item} value={item}>Grade {item}</option>)}
            </select>
          </label>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ['Grades with offerings', summary.offerings.length],
          ['Streams this year', summary.streams.reduce((sum, row) => sum + row.total, 0)],
          ['Published', publishedCount],
          ['Drafts', draftCount]
        ].map(([label, value]) => (
          <div key={String(label)} className="border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-950">
            <p className="text-xs uppercase text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      {error && <p className="border border-slate-900 bg-slate-900 px-4 py-3 text-sm text-white">{error}</p>}
      {message && <p className="border border-slate-300 px-4 py-3 text-sm">{message}</p>}
      {loading && <p className="text-sm text-slate-500">Loading this school’s configuration…</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-950">
          <h3 className="font-semibold">Languages offered</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {catalogue.languages.map((language) => (
              <div key={language} className="flex flex-col gap-1 text-sm">
                <span>{language}</span>
                <span className="flex gap-3 text-xs">
                  {['Home Language', 'First Additional Language'].map((level) => (
                    <label key={level} className="flex items-center gap-1">
                      <input type="checkbox" checked={offerings.languages.some((row) => row.language === language && row.level === level)} onChange={() => toggleLanguage(language, level)} />
                      {level === 'Home Language' ? 'HL' : 'FAL'}
                    </label>
                  ))}
                </span>
              </div>
            ))}
          </div>
          <h3 className="font-semibold">Mathematical options</h3>
          <div className="flex gap-4 text-sm">
            {catalogue.mathematics.map((subject) => (
              <label key={subject} className="flex items-center gap-2">
                <input type="checkbox" checked={offerings.mathematics.includes(subject)} onChange={() => toggleList('mathematics', subject)} />
                {subject}
              </label>
            ))}
          </div>
          <h3 className="font-semibold">Elective subjects</h3>
          <div className="grid max-h-64 gap-2 overflow-auto sm:grid-cols-2 text-sm">
            {catalogue.electives.map((subject) => (
              <label key={subject} className="flex items-center gap-2">
                <input type="checkbox" checked={offerings.electives.includes(subject)} onChange={() => toggleList('electives', subject)} />
                {subject}
              </label>
            ))}
          </div>
          <button type="button" onClick={saveOfferings} className="bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Save offerings</button>
          <p className="text-xs text-slate-500">Life Orientation is added automatically to every package. It is not an elective.</p>
        </div>

        <div className="space-y-4 border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-950">
          <h3 className="font-semibold">{editingId ? 'Edit stream' : 'New stream'}</h3>
          <input className="w-full border border-slate-300 bg-white px-3 py-2 dark:border-white/15 dark:bg-slate-900" placeholder="Stream name" value={name} onChange={(event) => setName(event.target.value)} />
          <div className="flex gap-4 text-sm">
            {offerings.mathematics.map((subject) => (
              <label key={subject} className="flex items-center gap-2">
                <input type="radio" name="math-option" checked={mathematics === subject} onChange={() => setMathematics(subject)} />
                {subject}
              </label>
            ))}
          </div>
          <div className="grid gap-2 text-sm">
            {offerings.electives.map((subject) => (
              <label key={subject} className="flex items-center gap-2">
                <input type="checkbox" checked={picked.includes(subject)} onChange={() => toggleElective(subject)} />
                {subject}
              </label>
            ))}
            {!offerings.electives.length && <p className="text-slate-500">Save the subjects this school offers before creating a stream.</p>}
          </div>
          <p className="text-xs text-slate-500">{picked.length} of 3 electives selected.</p>
          <button type="button" onClick={saveStream} className="bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Save stream</button>
        </div>
      </div>

      <div className="border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950">
        <div className="border-b border-slate-200 px-5 py-3 font-semibold dark:border-white/10">Streams for Grade {grade}</div>
        {!streams.length && <p className="px-5 py-6 text-sm text-slate-500">No streams have been created for this grade.</p>}
        <ul>
          {streams.map((stream) => (
            <li key={stream.id} className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
              <div>
                <p className="font-semibold">{stream.name} <span className="text-xs font-normal uppercase text-slate-500">{stream.status}</span></p>
                <p className="text-sm text-slate-600 dark:text-slate-300">{stream.mathematics}; {stream.electives.join(', ')}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="border border-slate-300 px-3 py-1.5 text-xs" onClick={() => { setEditingId(stream.id); setName(stream.name); setMathematics(stream.mathematics); setPicked(stream.electives); }}>Edit</button>
                <button type="button" className="border border-slate-300 px-3 py-1.5 text-xs" onClick={() => act(stream.id, 'publish')}>Publish</button>
                <button type="button" className="border border-slate-300 px-3 py-1.5 text-xs" onClick={() => act(stream.id, 'archive')}>Archive</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
