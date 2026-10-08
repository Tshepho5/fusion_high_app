import React, { useEffect, useState } from 'react';
import { SchoolModuleChoices } from './SchoolModuleChoices';
import { schoolRegistrationService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSchool, SchoolProfile } from '../../context/SchoolContext';
import {
  defaultLearnerModules,
  defaultTeacherModules,
  readModuleList,
} from '../../utils/schoolModules';
import { Building2, Layers, CheckCircle2, X } from 'lucide-react';

interface SchoolModulePreferencesProps {
  school?: SchoolProfile | null;
  onSaved?: () => void;
  onClose?: () => void;
}

export const SchoolModulePreferences: React.FC<SchoolModulePreferencesProps> = ({
  school: propSchool,
  onSaved,
  onClose,
}) => {
  const { user } = useAuth();
  const { schoolsList, currentSchool, refreshSchools } = useSchool();

  const activeSchool = propSchool || (
    user?.school_id ? schoolsList.find((item) => item.id === Number(user.school_id)) : null
  ) || (currentSchool?.id > 0 ? currentSchool : null);

  const schoolId = activeSchool?.id || 0;
  const [teacherModules, setTeacherModules] = useState<string[]>(defaultTeacherModules());
  const [learnerModules, setLearnerModules] = useState<string[]>(defaultLearnerModules());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!activeSchool) return;
    setTeacherModules(readModuleList(activeSchool.teacher_modules) || defaultTeacherModules());
    setLearnerModules(readModuleList(activeSchool.learner_modules) || defaultLearnerModules());
  }, [activeSchool?.id, activeSchool?.teacher_modules, activeSchool?.learner_modules]);

  if (!schoolId || !activeSchool) {
    return (
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-surface-darker text-xs text-slate-500 text-center">
        Select a school to manage its active modules.
      </div>
    );
  }

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await schoolRegistrationService.updateModules(schoolId, teacherModules, learnerModules);
      await refreshSchools();
      setMessage(`Saved! ${activeSchool.name} now has ${teacherModules.length} teacher modules and ${learnerModules.length} learner modules active.`);
      if (onSaved) onSaved();
    } catch (err: any) {
      setMessage(err?.response?.data?.error || 'The modules could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-3xl bg-slate-100 dark:bg-surface-darker border border-slate-300 dark:border-white/10 p-5 sm:p-6 space-y-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 mb-1">
            <Building2 className="w-3 h-3" />
            <span>{activeSchool.name}</span>
          </div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-500" />
            <span>Active Modules & Role Tools</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Choose exactly which teacher and learner tools are activated for <strong>{activeSchool.name}</strong>. Only the selected modules with their icons will be accessible on this campus.
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white dark:bg-surface-dark text-slate-400 hover:text-slate-700 dark:hover:text-white border border-slate-200 dark:border-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <SchoolModuleChoices
        teacherModules={teacherModules}
        learnerModules={learnerModules}
        onChangeTeacher={setTeacherModules}
        onChangeLearner={setLearnerModules}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
        {message ? (
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{message}</span>
          </p>
        ) : <div />}
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="ml-auto px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-600/20 disabled:opacity-50 cursor-pointer transition-all"
        >
          {saving ? 'Saving...' : `Save Modules for ${activeSchool.name}`}
        </button>
      </div>
    </section>
  );
};
