import React from 'react';
import { Check } from 'lucide-react';
import {
  LEARNER_CHOICE_MODULES,
  LEARNER_MODULES,
  TEACHER_MODULES,
  defaultLearnerModules,
  defaultTeacherModules,
  linkSchoolModules,
  modulesReceivedByLearners,
  getModuleIcon,
  type SchoolModuleOption,
} from '../../utils/schoolModules';

interface SchoolModuleChoicesProps {
  teacherModules: string[];
  learnerModules: string[];
  onChangeTeacher: (ids: string[]) => void;
  onChangeLearner: (ids: string[]) => void;
}

function toggle(ids: string[], id: string) {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
}

function ModuleGrid({
  title,
  note,
  options,
  selected,
  onChange,
  onUseAll,
}: {
  title: string;
  note: string;
  options: SchoolModuleOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
  onUseAll: () => void;
}) {
  const allOn = options.every((option) => selected.includes(option.id));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-bold text-slate-800 dark:text-slate-200">{title}</label>
        <button
          type="button"
          onClick={() => (allOn ? onChange([]) : onUseAll())}
          className="text-[11px] font-bold text-cyan-700 dark:text-cyan-300 hover:text-cyan-900 dark:hover:text-white cursor-pointer"
        >
          {allOn ? 'Clear' : 'Use all'}
        </button>
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400">{note}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {options.map((option) => {
          const on = selected.includes(option.id);
          const Icon = option.icon || getModuleIcon(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(toggle(selected, option.id))}
              className={`px-3 py-2.5 rounded-xl text-left text-[11px] font-semibold border cursor-pointer flex items-center justify-between gap-2.5 transition-all ${
                on
                  ? 'bg-cyan-500/15 border-cyan-400 text-slate-900 dark:text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-950/50 border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`p-1.5 rounded-lg shrink-0 ${on ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="truncate">{option.label}</span>
              </div>
              {on && <Check className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-300 shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const SchoolModuleChoices: React.FC<SchoolModuleChoicesProps> = ({
  teacherModules,
  learnerModules,
  onChangeTeacher,
  onChangeLearner,
}) => {
  const received = modulesReceivedByLearners(teacherModules);
  const applyTeacher = (ids: string[]) => {
    const linked = linkSchoolModules(ids, learnerModules);
    onChangeTeacher(linked.teacher);
    onChangeLearner(linked.learner);
  };
  const applyLearner = (ids: string[]) => {
    const linked = linkSchoolModules(teacherModules, ids);
    onChangeLearner(linked.learner);
  };

  return (
    <div className="space-y-4">
      <ModuleGrid
        title="Modules for teachers"
        note="Attendance, conduct, leave, parent meetings, and the lesson studio stay with teachers. When teachers send marks, homework, notices, or a timetable, learners receive that automatically."
        options={TEACHER_MODULES}
        selected={teacherModules}
        onChange={applyTeacher}
        onUseAll={() => applyTeacher(defaultTeacherModules())}
      />
      {received.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Learners receive these</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            These are on because the matching teacher module is on. They are not a separate choice.
          </p>
          <div className="flex flex-wrap gap-2">
            {received.map((module) => {
              const fullMod = LEARNER_MODULES.find((item) => item.id === module.id) || module;
              const Icon = fullMod.icon || getModuleIcon(fullMod.id);
              return (
                <span
                  key={module.id}
                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border border-cyan-400/50 bg-cyan-500/15 text-slate-900 dark:text-white flex items-center gap-1.5 shadow-2xs"
                >
                  <Icon className="w-3 h-3 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  <span>{fullMod.label}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}
      <ModuleGrid
        title="Modules for learners only"
        note="These are learner tools. They do not open teacher marksheets, attendance, or other staff work. Home, subjects, profile, and settings stay on."
        options={LEARNER_CHOICE_MODULES}
        selected={learnerModules}
        onChange={applyLearner}
        onUseAll={() => applyLearner(defaultLearnerModules())}
      />
    </div>
  );
};
