import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Badge } from '../common/Badge';
import {
  Play,
  Pause,
  RotateCcw,
  Flame,
  Zap,
  Award,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle2,
  Trophy,
  Star,
  Clock,
  BookOpen,
  Coffee
} from 'lucide-react';

interface SubjectFocusTimerProps {
  subject: string;
  grade: number;
}

export const SubjectFocusTimer: React.FC<SubjectFocusTimerProps> = ({
  subject,
  grade
}) => {
  // Preset study durations in seconds
  const PRESETS = [
    { label: '25 Min Focus', seconds: 25 * 60, type: 'focus' },
    { label: '50 Min Deep Study', seconds: 50 * 60, type: 'deep' },
    { label: '15 Min Review', seconds: 15 * 60, type: 'blitz' },
    { label: '5 Min Break', seconds: 5 * 60, type: 'break' }
  ];

  const [selectedDuration, setSelectedDuration] = useState<number>(25 * 60);
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [ambientSound, setAmbientSound] = useState<'off' | 'rain' | 'whitenoise' | 'focus'>('off');

  // Persistence keys
  const storageKeyMinutes = `fh_study_mins_${subject.toLowerCase().replace(/\s+/g, '_')}`;
  const storageKeyStreak = `fh_study_streak_${subject.toLowerCase().replace(/\s+/g, '_')}`;

  const [totalMinutes, setTotalMinutes] = useState<number>(() => {
    return parseInt(localStorage.getItem(storageKeyMinutes) || '35', 10);
  });

  const [streakDays, setStreakDays] = useState<number>(() => {
    return parseInt(localStorage.getItem(storageKeyStreak) || '4', 10);
  });

  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorNodeRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Timer Tick Interval
  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      setIsActive(false);
      handleSessionComplete();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  // Session completion logic
  const handleSessionComplete = () => {
    const sessionMins = Math.round(selectedDuration / 60);
    const updatedMins = totalMinutes + sessionMins;
    setTotalMinutes(updatedMins);
    localStorage.setItem(storageKeyMinutes, updatedMins.toString());

    // Confetti celebration
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  // Ambient sound synthesizer using Web Audio API
  useEffect(() => {
    if (ambientSound === 'off' || !isActive) {
      stopAudio();
      return;
    }

    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
      }

      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      stopAudio();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (ambientSound === 'rain') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
      } else if (ambientSound === 'whitenoise') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.02, ctx.currentTime);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(432, ctx.currentTime); // 432 Hz focus tone
        gain.gain.setValueAtTime(0.03, ctx.currentTime);
      }

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      oscillatorNodeRef.current = osc;
      gainNodeRef.current = gain;
    } catch (e) {
      console.warn('Audio synthesis note:', e);
    }

    return () => stopAudio();
  }, [ambientSound, isActive]);

  const stopAudio = () => {
    if (oscillatorNodeRef.current) {
      try {
        oscillatorNodeRef.current.stop();
        oscillatorNodeRef.current.disconnect();
      } catch (_) {}
      oscillatorNodeRef.current = null;
    }
  };

  const handleSelectPreset = (seconds: number) => {
    setIsActive(false);
    setSelectedDuration(seconds);
    setTimeLeft(seconds);
  };

  const handleReset = () => {
    setIsActive(false);
    setTimeLeft(selectedDuration);
  };

  // Formatting minutes and seconds
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  const progressPercent = Math.round(((selectedDuration - timeLeft) / selectedDuration) * 100);

  // Calculate circular SVG stroke
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  // Gamified Badges for this Subject
  const BADGES = [
    {
      title: 'First Step',
      desc: 'Complete 1 focus session',
      unlocked: totalMinutes >= 25,
      icon: Star
    },
    {
      title: 'Consistency Star',
      desc: '3+ Day Subject Streak',
      unlocked: streakDays >= 3,
      icon: Flame
    },
    {
      title: 'Marathon Scholar',
      desc: 'Log 60+ minutes of study',
      unlocked: totalMinutes >= 60,
      icon: Trophy
    },
    {
      title: 'CAPS Distinction Pro',
      desc: 'Log 120+ minutes in this subject',
      unlocked: totalMinutes >= 120,
      icon: Award
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-900/30 via-surface-dark to-brand-900/30 border border-amber-500/30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold uppercase border border-amber-500/40 flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-400" />
              GAMIFIED FOCUS WORKSPACE
            </span>
            <Badge variant="cyan" size="sm">{subject}</Badge>
            <Badge variant="indigo" size="sm">Grade {grade}</Badge>
          </div>
          <h3 className="text-xl md:text-2xl font-extrabold font-display text-white">
            {subject} Study Streak & Focus Timer
          </h3>
          <p className="text-xs text-slate-300 max-w-xl">
            Maintain your daily revision streak, earn academic XP, and block out distractions while reviewing curriculum chapters.
          </p>
        </div>

        {/* Live Subject Telemetry Stats */}
        <div className="flex items-center gap-3">
          <div className="p-3.5 rounded-2xl bg-surface-darker border border-amber-500/30 text-center shadow-glow-amber">
            <p className="text-[10px] font-semibold text-slate-400 uppercase">Subject Streak</p>
            <p className="text-lg font-black text-amber-400 font-mono flex items-center justify-center gap-1">
              <Flame className="w-4 h-4 fill-amber-400" />
              {streakDays} Days
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-darker border border-cyan-500/30 text-center shadow-glow-cyan">
            <p className="text-[10px] font-semibold text-slate-400 uppercase">Logged Study</p>
            <p className="text-lg font-black text-cyan-300 font-mono">
              {totalMinutes} Mins
            </p>
          </div>
        </div>
      </div>

      {/* Main Focus Clock & Preset Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left 7 Cols: Focus Timer Display */}
        <div className="lg:col-span-7 p-8 rounded-3xl bg-surface-dark border border-white/10 shadow-2xl flex flex-col items-center justify-center space-y-6 relative overflow-hidden">
          {/* Ambient Glow */}
          <div className="absolute w-72 h-72 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2 z-10">
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectPreset(p.seconds)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedDuration === p.seconds
                    ? 'bg-amber-500 text-slate-900 shadow-glow-amber scale-105'
                    : 'bg-surface-darker text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Circular Progress Meter */}
          <div className="relative w-56 h-56 flex items-center justify-center z-10">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
              {/* Background Track */}
              <circle
                cx="100"
                cy="100"
                r={radius}
                className="text-white/10"
                strokeWidth="12"
                stroke="currentColor"
                fill="transparent"
              />
              {/* Animated Progress Ring */}
              <circle
                cx="100"
                cy="100"
                r={radius}
                className="text-amber-400 transition-all duration-1000 ease-linear"
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
              />
            </svg>

            {/* Centered Digital Counter */}
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="font-mono text-4xl md:text-5xl font-black text-white tracking-tight">
                {formattedTime}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-300 mt-1 flex items-center gap-1">
                {isActive ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Deep Focus Mode
                  </>
                ) : (
                  'Ready to Study'
                )}
              </span>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-4 z-10">
            <button
              onClick={() => setIsActive(!isActive)}
              className={`px-8 py-3.5 rounded-2xl font-black text-xs flex items-center gap-2 shadow-lg transition-all transform hover:scale-105 ${
                isActive
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-glow-rose'
                  : 'bg-gradient-to-r from-amber-500 to-brand-500 hover:from-amber-400 text-slate-950 shadow-glow-amber'
              }`}
            >
              {isActive ? (
                <>
                  <Pause className="w-4 h-4 fill-white" />
                  <span>Pause Timer</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>Start Studying {subject}</span>
                </>
              )}
            </button>

            <button
              onClick={handleReset}
              className="p-3.5 rounded-2xl bg-surface-darker hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors"
              title="Reset Timer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Ambient Background Sounds Selector */}
          <div className="flex items-center gap-2 pt-2 z-10">
            <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              Atmosphere:
            </span>
            {[
              { id: 'off', label: 'Mute' },
              { id: 'focus', label: '432Hz Focus Tone' },
              { id: 'rain', label: 'Rain Ambience' },
              { id: 'whitenoise', label: 'White Noise' }
            ].map((snd) => (
              <button
                key={snd.id}
                onClick={() => setAmbientSound(snd.id as any)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                  ambientSound === snd.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-surface-darker text-slate-500 hover:text-slate-300'
                }`}
              >
                {snd.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right 5 Cols: Gamified Badges & Milestones for this Subject */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-3xl bg-surface-dark border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                {subject} Mastery Badges
              </h4>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                {BADGES.filter((b) => b.unlocked).length}/{BADGES.length} Unlocked
              </span>
            </div>

            <div className="space-y-3">
              {BADGES.map((b, idx) => {
                const IconComp = b.icon;
                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl border transition-all flex items-center gap-3.5 ${
                      b.unlocked
                        ? 'bg-amber-500/10 border-amber-500/30 text-white'
                        : 'bg-surface-darker/60 border-white/5 text-slate-500 opacity-60'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        b.unlocked
                          ? 'bg-amber-500/20 text-amber-400 shadow-glow-amber'
                          : 'bg-white/5 text-slate-600'
                      }`}
                    >
                      <IconComp className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold truncate">{b.title}</h5>
                        {b.unlocked && (
                          <span className="text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                            UNLOCKED
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400">{b.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Study Tips Box */}
            <div className="p-3.5 rounded-2xl bg-brand-600/10 border border-brand-500/20 text-xs text-slate-300 space-y-1">
              <p className="font-bold text-cyan-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Matric Revision Tip
              </p>
              <p className="text-[11px] text-slate-400">
                Studying in 25-minute Pomodoro blocks followed by past paper question practice improves long-term memory retention by over 40%.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
