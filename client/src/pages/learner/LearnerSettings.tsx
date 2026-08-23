import React, { useState, useEffect } from 'react';
import { useTheme, AppTheme, AppFont } from '../../context/ThemeContext';
import {
  Sliders,
  Palette,
  Volume2,
  VolumeX,
  Bell,
  Type,
  Eye,
  Check,
  Play,
  RotateCcw,
  Shield,
  Smartphone,
  HardDrive,
  Sparkles,
  Zap,
  CheckCircle2,
  Lock,
  Moon,
  Sun
} from 'lucide-react';

export const LearnerSettings: React.FC = () => {
  const { theme, font, setTheme, setFont } = useTheme();

  // Color Accent State
  const [accent, setAccent] = useState<string>(() => {
    return localStorage.getItem('app_accent') || 'indigo';
  });

  // Sound & Audio Preferences
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('setting_sound_enabled') !== 'false';
  });
  const [soundVolume, setSoundVolume] = useState<number>(() => {
    return Number(localStorage.getItem('setting_sound_volume')) || 80;
  });
  const [selectedSoundTone, setSelectedSoundTone] = useState<string>(() => {
    return localStorage.getItem('setting_sound_tone') || 'crystal';
  });

  // Notification toggles
  const [notifAssignments, setNotifAssignments] = useState<boolean>(() => {
    return localStorage.getItem('setting_notif_assignments') !== 'false';
  });
  const [notifMessages, setNotifMessages] = useState<boolean>(() => {
    return localStorage.getItem('setting_notif_messages') !== 'false';
  });
  const [notifAnnouncements, setNotifAnnouncements] = useState<boolean>(() => {
    return localStorage.getItem('setting_notif_announcements') !== 'false';
  });
  const [notifAIStudy, setNotifAIStudy] = useState<boolean>(() => {
    return localStorage.getItem('setting_notif_aistudy') !== 'false';
  });

  // Display & Accessibility
  const [fontSizeScale, setFontSizeScale] = useState<string>(() => {
    return localStorage.getItem('setting_font_scale') || 'normal';
  });
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    return localStorage.getItem('setting_reduced_motion') === 'true';
  });
  const [autoLockTimeout, setAutoLockTimeout] = useState<string>(() => {
    return localStorage.getItem('setting_autolock') || '30';
  });

  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  // Play synthesized preview chime using Web Audio API
  const playTestChime = (toneType = selectedSoundTone) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime((soundVolume / 100) * 0.3, ctx.currentTime);
      gainNode.connect(ctx.destination);

      if (toneType === 'crystal') {
        // Crystal chord
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
          osc.connect(gainNode);
          osc.start(ctx.currentTime + i * 0.08);
          osc.stop(ctx.currentTime + i * 0.08 + 0.4);
        });
      } else if (toneType === 'ping') {
        // Soft Modern Ping
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.15);
        osc.connect(gainNode);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      } else if (toneType === 'classic') {
        // Classic Double Bell
        [600, 750].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
          osc.connect(gainNode);
          osc.start(ctx.currentTime + i * 0.12);
          osc.stop(ctx.currentTime + i * 0.12 + 0.3);
        });
      } else {
        // Subtle Pop
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.connect(gainNode);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch (e) {
      console.warn('Audio playback error', e);
    }
  };

  const handleAccentChange = (newAccent: string) => {
    setAccent(newAccent);
    localStorage.setItem('app_accent', newAccent);
    document.documentElement.setAttribute('data-accent', newAccent);
    showSaveNotification();
  };

  const handleSavePreferences = () => {
    localStorage.setItem('setting_sound_enabled', String(soundEnabled));
    localStorage.setItem('setting_sound_volume', String(soundVolume));
    localStorage.setItem('setting_sound_tone', selectedSoundTone);
    localStorage.setItem('setting_notif_assignments', String(notifAssignments));
    localStorage.setItem('setting_notif_messages', String(notifMessages));
    localStorage.setItem('setting_notif_announcements', String(notifAnnouncements));
    localStorage.setItem('setting_notif_aistudy', String(notifAIStudy));
    localStorage.setItem('setting_font_scale', fontSizeScale);
    localStorage.setItem('setting_reduced_motion', String(reducedMotion));
    localStorage.setItem('setting_autolock', autoLockTimeout);

    showSaveNotification();
  };

  const showSaveNotification = () => {
    setSavedBanner('Settings saved successfully!');
    setTimeout(() => setSavedBanner(null), 4000);
  };

  const handleClearOfflineCache = () => {
    try {
      const keysToRemove = Object.keys(localStorage).filter(k => k.startsWith('completed_topics_') || k.startsWith('fusion_read_'));
      keysToRemove.forEach(k => localStorage.removeItem(k));
      setSavedBanner('Offline study cache and temporary data cleared.');
      setTimeout(() => setSavedBanner(null), 4000);
    } catch (_) {}
  };

  const THEMES: { id: AppTheme; label: string; desc: string; icon: any }[] = [
    { id: 'dark', label: 'Dark Theme', desc: 'Neutral slate & high-contrast deep mode', icon: Moon },
    { id: 'navy', label: 'Slate Navy', desc: 'Deep academic blue with modern contrast', icon: Shield },
    { id: 'light', label: 'Light Theme', desc: 'Clean white surfaces with crisp typography', icon: Sun },
  ];

  const ACCENTS = [
    { id: 'indigo', label: 'Indigo (Default)', color: 'bg-[#6366f1]' },
    { id: 'emerald', label: 'Emerald Mint', color: 'bg-[#10b981]' },
    { id: 'ocean', label: 'Ocean Cyan', color: 'bg-[#0ea5e9]' },
    { id: 'purple', label: 'Royal Purple', color: 'bg-[#8b5cf6]' },
    { id: 'amber', label: 'Warm Amber', color: 'bg-[#f59e0b]' },
  ];

  const FONTS: { id: AppFont; label: string; preview: string }[] = [
    { id: 'sans', label: 'Modern Sans (Inter)', preview: 'The quick brown fox jumps over the lazy dog (CAPS Grade 10-12)' },
    { id: 'display', label: 'Geometric (Outfit)', preview: 'Clean modern headings and structured figures (1234567890)' },
    { id: 'serif', label: 'Academic (Playfair)', preview: 'Formal curriculum literature and examination styling' },
    { id: 'mono', label: 'Tech Code (Mono)', preview: 'f(x) = ax^2 + bx + c | Fixed pitch scientific notation' },
  ];

  const SOUND_TONES = [
    { id: 'crystal', label: 'Crystal Chord', desc: 'Multi-harmonic crystal chime' },
    { id: 'ping', label: 'Modern Ping', desc: 'Ascending high-frequency chirp' },
    { id: 'classic', label: 'School Bell', desc: 'Warm dual acoustic chime' },
    { id: 'subtle', label: 'Subtle Soft Pop', desc: 'Gentle low-volume alert' },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto text-slate-100 pb-12">
      
      {/* Header Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-display text-white tracking-tight flex items-center gap-2.5">
            <Sliders className="w-6 h-6 text-indigo-400" />
            <span>App & Technical Settings</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure visual typography, notification chimes, audio feedback, and system preferences.
          </p>
        </div>

        {savedBanner && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{savedBanner}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. VISUAL THEME & ACCENT */}
        <div className="rounded-3xl bg-surface-dark border border-white/10 p-5 md:p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-2 border-b border-white/5">
            <Palette className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold font-display text-white">
              Visual Theme & Mode
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {THEMES.map((t) => {
              const IconComp = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all space-y-2 ${
                    theme === t.id
                      ? 'border-indigo-500 bg-indigo-600/15 text-white font-bold ring-2 ring-indigo-500/30'
                      : 'border-white/5 bg-surface-darker text-slate-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <IconComp className={`w-4 h-4 ${theme === t.id ? 'text-indigo-400' : 'text-slate-500'}`} />
                    {theme === t.id && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white">{t.label}</span>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{t.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Color Accent Selection */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-bold text-slate-300">
              Color Palette Accent
            </label>
            <div className="flex flex-wrap gap-2.5">
              {ACCENTS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => handleAccentChange(a.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                    accent === a.id
                      ? 'border-white/40 bg-white/10 text-white font-bold'
                      : 'border-white/5 bg-surface-darker text-slate-400 hover:text-white'
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full ${a.color} shadow-sm shrink-0`} />
                  <span>{a.label}</span>
                  {accent === a.id && <Check className="w-3 h-3 text-white ml-auto" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2. TYPOGRAPHY & FONT STYLES */}
        <div className="rounded-3xl bg-surface-dark border border-white/10 p-5 md:p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-2 border-b border-white/5">
            <Type className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold font-display text-white">
              Application Typography & Font
            </h3>
          </div>

          <div className="space-y-2.5">
            {FONTS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFont(f.id)}
                className={`w-full p-3.5 rounded-2xl border text-left transition-all space-y-1 ${
                  font === f.id
                    ? 'border-cyan-500/50 bg-cyan-600/15 text-white font-bold ring-2 ring-cyan-500/20'
                    : 'border-white/5 bg-surface-darker text-slate-400 hover:text-white hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{f.label}</span>
                  {font === f.id && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                </div>
                <p className="text-[11px] text-slate-400 font-normal truncate">
                  {f.preview}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* 3. AUDIO & NOTIFICATION SOUNDS */}
        <div className="rounded-3xl bg-surface-dark border border-white/10 p-5 md:p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              {soundEnabled ? <Volume2 className="w-5 h-5 text-amber-400" /> : <VolumeX className="w-5 h-5 text-slate-500" />}
              <h3 className="text-sm font-bold font-display text-white">
                Audio & Notification Chimes
              </h3>
            </div>
            <button
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                localStorage.setItem('setting_sound_enabled', String(next));
              }}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                soundEnabled
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {soundEnabled ? 'Enabled' : 'Muted'}
            </button>
          </div>

          {/* Volume Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-semibold">Chime Sound Volume</span>
              <span className="font-mono text-amber-400">{soundVolume}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={soundVolume}
              disabled={!soundEnabled}
              onChange={(e) => {
                const val = Number(e.target.value);
                setSoundVolume(val);
                localStorage.setItem('setting_sound_volume', String(val));
              }}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500 disabled:opacity-40"
            />
          </div>

          {/* Chime Tone Selector with Live Preview Button */}
          <div className="space-y-2 pt-1">
            <label className="text-xs font-bold text-slate-300">
              Notification Alert Melody
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SOUND_TONES.map((tone) => (
                <div
                  key={tone.id}
                  onClick={() => {
                    setSelectedSoundTone(tone.id);
                    localStorage.setItem('setting_sound_tone', tone.id);
                    playTestChime(tone.id);
                  }}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between ${
                    selectedSoundTone === tone.id
                      ? 'border-amber-500 bg-amber-500/15 text-white font-bold'
                      : 'border-white/5 bg-surface-darker text-slate-400 hover:text-white'
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold">{tone.label}</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">{tone.desc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playTestChime(tone.id);
                    }}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                    title="Test chime"
                  >
                    <Play className="w-3 h-3 text-amber-400" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. NOTIFICATION PREFERENCES & ROUTING */}
        <div className="rounded-3xl bg-surface-dark border border-white/10 p-5 md:p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-2 border-b border-white/5">
            <Bell className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold font-display text-white">
              Notification Routing & Alerts
            </h3>
          </div>

          <div className="space-y-3">
            {/* Toggle 1: Assignments */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-darker border border-white/5">
              <div>
                <h4 className="text-xs font-bold text-white">Assignment Due Dates & Tasks</h4>
                <p className="text-[11px] text-slate-400">Alert 24h before teacher homework deadlines</p>
              </div>
              <input
                type="checkbox"
                checked={notifAssignments}
                onChange={(e) => setNotifAssignments(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* Toggle 2: Messages */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-darker border border-white/5">
              <div>
                <h4 className="text-xs font-bold text-white">Teacher & Educator Messages</h4>
                <p className="text-[11px] text-slate-400">Sound and badge alerts for new private chats</p>
              </div>
              <input
                type="checkbox"
                checked={notifMessages}
                onChange={(e) => setNotifMessages(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* Toggle 3: Announcements */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-darker border border-white/5">
              <div>
                <h4 className="text-xs font-bold text-white">School Broadcasts & Bulletins</h4>
                <p className="text-[11px] text-slate-400">Urgent principal updates and sports alerts</p>
              </div>
              <input
                type="checkbox"
                checked={notifAnnouncements}
                onChange={(e) => setNotifAnnouncements(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* Toggle 4: AI Study Tutor */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-darker border border-white/5">
              <div>
                <h4 className="text-xs font-bold text-white">AI Tutor Revision Suggestions</h4>
                <p className="text-[11px] text-slate-400">Weekly exam practice and formula reviews</p>
              </div>
              <input
                type="checkbox"
                checked={notifAIStudy}
                onChange={(e) => setNotifAIStudy(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 5. STORAGE & OFFLINE CACHE MANAGEMENT */}
        <div className="lg:col-span-2 rounded-3xl bg-surface-dark border border-white/10 p-5 md:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold font-display text-white flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-slate-400" />
              <span>Offline Cache & Temporary Storage</span>
            </h3>
            <p className="text-xs text-slate-400">
              Clear local textbook caches, downloaded chapters, and dismiss flags without affecting your academic marks.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleClearOfflineCache}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Cache</span>
            </button>
            <button
              onClick={handleSavePreferences}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save Preferences</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
