import React, { useEffect, useState } from 'react';
import { SchoolModuleChoices } from './SchoolModuleChoices';
import { schoolRegistrationService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import {
  defaultLearnerModules,
  defaultTeacherModules,
  readModuleList,
} from '../../utils/schoolModules';

export const SchoolModulePreferences: React.FC = () => {
  const { user } = useAuth();
  const { schoolsList, currentSchool, refreshSchools } = useSchool();
  const schoolId = Number(user?.school_id) || (currentSchool?.id > 0 ? currentSchool.id : 0);
  const school = schoolsList.find((item) => item.id === schoolId) || (currentSchool?.id === schoolId ? currentSchool : null);
  const [teacherModules, setTeacherModules] = useState<string[]>(defaultTeacherModules());
  const [learnerModules, setLearnerModules] = useState<string[]>(defaultLearnerModules());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!school) return;
    setTeacherModules(readModuleList(school.teacher_modules) || defaultTeacherModules());
    setLearnerModules(readModuleList(school.learner_modules) || defaultLearnerModules());
  }, [school?.id, school?.teacher_modules, school?.learner_modules]);

  if (!schoolId || !school) return null;

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await schoolRegistrationService.updateModules(schoolId, teacherModules, learnerModules);
      await refreshSchools();
      setMessage('Saved. Teachers and learners now see these modules.');
    } catch (err: any) {
      setMessage(err?.response?.data?.error || 'The modules could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-3xl bg-slate-100 dark:bg-surface-darker border border-slate-300 dark:border-white/10 p-4 sm:p-5 space-y-3">
      <div>
        <h2 className="text-lg font-black text-slate-900 dark:text-white">School modules</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {school.name} uses only the modules chosen here. Turn more on whenever the school needs them.
        </p>
      </div>
      <SchoolModuleChoices
        teacherModules={teacherModules}
        learnerModules={learnerModules}
        onChangeTeacher={setTeacherModules}
        onChangeLearner={setLearnerModules}
      />
      <div className="flex items-center justify-between gap-3">
        {message && <p className="text-[11px] font-semibold text-cyan-700 dark:text-cyan-300">{message}</p>}
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="ml-auto px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
        >
          {saving ? 'Saving...' : 'Save school modules'}
        </button>
      </div>
    </section>
  );
};
