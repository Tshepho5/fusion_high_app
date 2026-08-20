import React, { useState, useEffect, useMemo } from 'react';
import { teacherService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';
import { FusionAIIcon } from '../common/FusionAIIcon';
import {
  Clock,
  Sparkles,
  CalendarCheck,
  MapPin,
  Users,
  Bell,
  BellRing,
  BookOpen,
  ArrowRight,
  Radio,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface TeacherNextClassAlertProps {
  onNavigateTab: (tabId: string, params?: any) => void;
}

interface ClassSlot {
  className: string;
  grade: string | number;
  subject: string;
  room: string;
  day: string;
  period: string;
  startTime: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
}

const PERIOD_TIMES: Record<string, { start: string; end: string; startMin: number; endMin: number }> = {
  '07:45-08:15': { start: '07:45', end: '08:15', startMin: 7 * 60 + 45, endMin: 8 * 60 + 15 },
  '08:15-08:45': { start: '08:15', end: '08:45', startMin: 8 * 60 + 15, endMin: 8 * 60 + 45 },
  '08:45-09:15': { start: '08:45', end: '09:15', startMin: 8 * 60 + 45, endMin: 9 * 60 + 15 },
  '09:15-09:45': { start: '09:15', end: '09:45', startMin: 9 * 60 + 15, endMin: 9 * 60 + 45 },
  '09:45-10:15': { start: '09:45', end: '10:15', startMin: 9 * 60 + 45, endMin: 10 * 60 + 15 },
  '10:15-10:45': { start: '10:15', end: '10:45', startMin: 10 * 60 + 15, endMin: 10 * 60 + 45 },
  '11:45-12:15': { start: '11:45', end: '12:15', startMin: 11 * 60 + 45, endMin: 12 * 60 + 15 },
  '12:15-12:45': { start: '12:15', end: '12:45', startMin: 12 * 60 + 15, endMin: 12 * 60 + 45 },
  '12:45-13:15': { start: '12:45', end: '13:15', startMin: 12 * 60 + 45, endMin: 13 * 60 + 15 },
  '13:15-13:45': { start: '13:15', end: '13:45', startMin: 13 * 60 + 15, endMin: 13 * 60 + 45 },
};

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const TeacherNextClassAlert: React.FC<TeacherNextClassAlertProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const [timetables, setTimetables] = useState<any[]>([]);
  const [workload, setWorkload] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    return localStorage.getItem('fusion_teacher_notifications') === 'true';
  });

  // Ticking clock for real-time live updates
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000); // Check every 10s
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    Promise.allSettled([
      teacherService.getTimetables(),
      teacherService.getWorkload()
    ]).then(([ttRes, workRes]) => {
      if (ttRes.status === 'fulfilled' && Array.isArray(ttRes.value)) {
        setTimetables(ttRes.value);
      }
      if (workRes.status === 'fulfilled') {
        setWorkload(workRes.value);
      }
    }).finally(() => setLoading(false));
  }, []);

  // Request browser notification permission
  const toggleNotifications = async () => {
    if (!notificationsEnabled) {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          setNotificationsEnabled(true);
          localStorage.setItem('fusion_teacher_notifications', 'true');
          new Notification('Fusion High - Class Alerts Active', {
            body: 'You will receive priority alerts 10 minutes before your next class.',
            icon: '/assets/FH.png'
          });
        }
      } else {
        setNotificationsEnabled(true);
        localStorage.setItem('fusion_teacher_notifications', 'true');
      }
    } else {
      setNotificationsEnabled(false);
      localStorage.setItem('fusion_teacher_notifications', 'false');
    }
  };

  // Parse all slots for this teacher
  const allTeacherSlots = useMemo(() => {
    const slots: ClassSlot[] = [];
    const teacherName = user?.full_name?.toLowerCase() || '';
    const teacherId = user?.id;
    const teacherSubjects: string[] = (workload?.subjects || []).map((s: string) => s.toLowerCase());

    timetables.forEach((tt) => {
      try {
        const tData = typeof tt.timetable_data === 'string' ? JSON.parse(tt.timetable_data) : tt.timetable_data;
        if (!tData || typeof tData !== 'object') return;

        Object.keys(tData).forEach((className) => {
          const classDays = tData[className];
          if (!classDays || typeof classDays !== 'object') return;

          Object.keys(classDays).forEach((day) => {
            const dayPeriods = classDays[day];
            if (!dayPeriods || typeof dayPeriods !== 'object') return;

            Object.keys(dayPeriods).forEach((periodKey) => {
              const slot = dayPeriods[periodKey];
              if (!slot || !slot.subject) return;

              // Check if slot belongs to teacher by teacher_id, teacher_name, or subject match
              const slotTeacherId = slot.teacher_id;
              const slotTeacherName = (slot.teacher_name || slot.teacher || '').toLowerCase();
              const slotSubject = (slot.subject || '').toLowerCase();

              const isMatch =
                (slotTeacherId && slotTeacherId === teacherId) ||
                (slotTeacherName && teacherName && slotTeacherName.includes(teacherName)) ||
                (teacherSubjects.length > 0 && teacherSubjects.some(subj => slotSubject.includes(subj)));

              if (isMatch) {
                const timeInfo = PERIOD_TIMES[periodKey] || {
                  start: periodKey.split('-')[0] || '08:00',
                  end: periodKey.split('-')[1] || '08:30',
                  startMin: 8 * 60,
                  endMin: 8 * 60 + 30
                };

                const gradeMatch = className.match(/\d+/);
                const gradeVal = gradeMatch ? gradeMatch[0] : (tt.grade || '10');

                slots.push({
                  className,
                  grade: gradeVal,
                  subject: slot.subject,
                  room: slot.room || `Venue ${className}`,
                  day,
                  period: periodKey,
                  startTime: timeInfo.start,
                  endTime: timeInfo.end,
                  startMinutes: timeInfo.startMin,
                  endMinutes: timeInfo.endMin,
                });
              }
            });
          });
        });
      } catch (err) {
        console.warn('Error parsing timetable slot:', err);
      }
    });

    // Fallback default slots if timetable is empty
    if (slots.length === 0) {
      const defaultSubjects = workload?.subjects || ['Mathematics', 'Physical Sciences'];
      const defaultClasses = workload?.classes_taught || ['10A', '10B', '11A'];
      DAYS_ORDER.forEach((day, dIdx) => {
        slots.push({
          className: defaultClasses[dIdx % defaultClasses.length],
          grade: defaultClasses[dIdx % defaultClasses.length].replace(/\D/g, '') || '10',
          subject: defaultSubjects[dIdx % defaultSubjects.length],
          room: `Room ${defaultClasses[dIdx % defaultClasses.length]}`,
          day,
          period: '08:45-09:15',
          startTime: '08:45',
          endTime: '09:15',
          startMinutes: 8 * 60 + 45,
          endMinutes: 9 * 60 + 15,
        });
        slots.push({
          className: defaultClasses[(dIdx + 1) % defaultClasses.length],
          grade: defaultClasses[(dIdx + 1) % defaultClasses.length].replace(/\D/g, '') || '11',
          subject: defaultSubjects[(dIdx + 1) % defaultSubjects.length],
          room: `Room ${defaultClasses[(dIdx + 1) % defaultClasses.length]}`,
          day,
          period: '11:45-12:15',
          startTime: '11:45',
          endTime: '12:15',
          startMinutes: 11 * 60 + 45,
          endMinutes: 12 * 60 + 15,
        });
      });
    }

    return slots;
  }, [timetables, workload, user]);

  // Determine current active class or next upcoming class
  const classStatus = useMemo(() => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayName = dayNames[currentTime.getDay()];
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

    // 1. Check if a class is in session right now
    const todaySlots = allTeacherSlots
      .filter(s => s.day.toLowerCase() === currentDayName.toLowerCase())
      .sort((a, b) => a.startMinutes - b.startMinutes);

    const activeSlot = todaySlots.find(
      s => currentMinutes >= s.startMinutes && currentMinutes <= s.endMinutes
    );

    if (activeSlot) {
      const minutesRemaining = activeSlot.endMinutes - currentMinutes;
      return {
        type: 'active' as const,
        slot: activeSlot,
        minutesRemaining,
        badgeText: 'Live In Session',
        headline: `Active Now • ${minutesRemaining} mins remaining`,
      };
    }

    // 2. Check if a class is starting later today
    const upcomingToday = todaySlots.find(s => s.startMinutes > currentMinutes);
    if (upcomingToday) {
      const minutesUntil = upcomingToday.startMinutes - currentMinutes;
      const isImminent = minutesUntil <= 30;
      return {
        type: isImminent ? ('imminent' as const) : ('upcoming_today' as const),
        slot: upcomingToday,
        minutesUntil,
        badgeText: isImminent ? 'High Priority: Starting Soon' : 'Upcoming Today',
        headline: isImminent
          ? `Starts in ${minutesUntil} mins (${upcomingToday.startTime})`
          : `Next Period: ${upcomingToday.startTime} (${upcomingToday.period})`,
      };
    }

    // 3. Find next school day's first class
    const currentDayIdx = DAYS_ORDER.indexOf(currentDayName);
    for (let offset = 1; offset <= 7; offset++) {
      const nextDayIdx = ((currentDayIdx === -1 ? 0 : currentDayIdx) + offset) % 7;
      const candidateDay = DAYS_ORDER[nextDayIdx];
      if (candidateDay) {
        const nextDaySlots = allTeacherSlots
          .filter(s => s.day.toLowerCase() === candidateDay.toLowerCase())
          .sort((a, b) => a.startMinutes - b.startMinutes);

        if (nextDaySlots.length > 0) {
          return {
            type: 'next_day' as const,
            slot: nextDaySlots[0],
            headline: `${candidateDay} at ${nextDaySlots[0].startTime}`,
            badgeText: `Next Session: ${candidateDay}`,
          };
        }
      }
    }

    // Fallback if none found
    if (allTeacherSlots.length > 0) {
      return {
        type: 'next_day' as const,
        slot: allTeacherSlots[0],
        headline: `${allTeacherSlots[0].day} at ${allTeacherSlots[0].startTime}`,
        badgeText: 'Next Scheduled Class',
      };
    }

    return null;
  }, [allTeacherSlots, currentTime]);

  if (loading || !classStatus) {
    return null;
  }

  const { slot, type, headline, badgeText } = classStatus;
  const isLive = type === 'active';
  const isImminent = type === 'imminent';

  return (
    <div
      className={`relative overflow-hidden rounded-3xl p-5 md:p-6 transition-all duration-300 shadow-xl border ${
        isLive
          ? 'bg-gradient-to-r from-emerald-950/80 via-surface-dark to-surface-dark border-emerald-500/40 shadow-emerald-500/10'
          : isImminent
          ? 'bg-gradient-to-r from-amber-950/80 via-surface-dark to-surface-dark border-amber-500/40 shadow-amber-500/10 animate-pulse-subtle'
          : 'bg-gradient-to-r from-indigo-950/60 via-surface-dark to-surface-dark border-cyan-500/30 shadow-glow-cyan'
      }`}
    >
      {/* Background ambient glow orb */}
      <div
        className={`absolute top-0 right-0 w-72 h-72 rounded-full blur-3xl pointer-events-none ${
          isLive ? 'bg-emerald-500/15' : isImminent ? 'bg-amber-500/15' : 'bg-cyan-500/10'
        }`}
      />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* Left: Next Class Details & Countdown */}
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold tracking-wide uppercase shadow-sm border ${
                isLive
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : isImminent
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              }`}
            >
              {isLive ? (
                <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
              ) : (
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span>{badgeText}</span>
            </span>

            <span className="text-xs font-mono text-slate-400">
              {headline}
            </span>

            {/* Notification Bell toggle */}
            <button
              onClick={toggleNotifications}
              className={`p-1.5 rounded-xl border transition-all ${
                notificationsEnabled
                  ? 'bg-brand-500/20 border-brand-400 text-cyan-300'
                  : 'bg-surface-darker/60 border-white/10 text-slate-400 hover:text-white'
              }`}
              title={notificationsEnabled ? 'Class priority notifications are active' : 'Click to enable class notifications'}
            >
              {notificationsEnabled ? (
                <BellRing className="w-3.5 h-3.5 text-cyan-400 animate-bounce" />
              ) : (
                <Bell className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4">
            <h3 className="text-xl md:text-2xl font-black font-display text-white tracking-tight flex items-center gap-2">
              <span>{slot.subject}</span>
              <span className="text-cyan-400 text-lg font-bold">({slot.className})</span>
            </h3>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
              <span className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>{slot.room}</span>
              </span>
              <span className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>{slot.startTime} - {slot.endTime}</span>
              </span>
              <span className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <span>Grade {slot.grade}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Quick Action Launchpad */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 self-start lg:self-auto shrink-0">
          <button
            onClick={() => onNavigateTab('attendance', { class: slot.className, subject: slot.subject, grade: slot.grade })}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold text-xs shadow-md transition-all active:scale-[0.98]"
            title="Mark attendance register for this class"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Mark Register</span>
          </button>

          <button
            onClick={() => onNavigateTab('ai-tools', { subject: slot.subject, grade: slot.grade, class: slot.className })}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-darker hover:bg-white/10 border border-white/15 text-cyan-300 font-bold text-xs transition-all active:scale-[0.98]"
            title="Generate AI lesson plan or test quiz for this class"
          >
            <FusionAIIcon className="w-4 h-4 text-cyan-400" />
            <span>AI Lesson & Test</span>
          </button>

          <button
            onClick={() => onNavigateTab('timetable')}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-surface-darker/60 hover:bg-white/5 border border-white/10 text-slate-300 font-medium text-xs transition-all"
            title="View full weekly timetable"
          >
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>Full Schedule</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
