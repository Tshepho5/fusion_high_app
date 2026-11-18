import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FingerprintSignInCard } from '../../components/settings/FingerprintSignInCard';
import { HelpSupportModal } from '../../components/common/HelpSupportModal';
import { useTheme, AppTheme, AppFont } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { userService, authService } from '../../services/api';
import {
  Sliders,
  Palette,
  Volume2,
  VolumeX,
  Bell,
  Type,
  Check,
  Play,
  RotateCcw,
  HardDrive,
  CheckCircle2,
  Lock,
  Moon,
  Sun,
  ChevronRight,
  Globe,
  Fingerprint,
  HelpCircle,
  Info,
  LogOut,
  Eye,
  EyeOff
} from 'lucide-react';

type SettingsPanel = 'password' | 'notifications' | 'language' | 'appearance' | 'biometric' | 'about' | null;

export const LearnerSettings: React.FC = () => {
  const { theme, font, setTheme, setFont, toggleTheme } = useTheme();
  const { logout } = useAuth();

  const [openPanel, setOpenPanel] = useState<SettingsPanel>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [biometricOn, setBiometricOn] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);

  const [accent, setAccent] = useState<string>(() => localStorage.getItem('app_accent') || 'indigo');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => localStorage.getItem('setting_sound_enabled') !== 'false');
  const [soundVolume, setSoundVolume] = useState<number>(() => Number(localStorage.getItem('setting_sound_volume')) || 80);
  const [selectedSoundTone, setSelectedSoundTone] = useState<string>(() => localStorage.getItem('setting_sound_tone') || 'crystal');
  const [notifAssignments, setNotifAssignments] = useState<boolean>(() => localStorage.getItem('setting_notif_assignments') !== 'false');
  const [notifMessages, setNotifMessages] = useState<boolean>(() => localStorage.getItem('setting_notif_messages') !== 'false');
  const [notifAnnouncements, setNotifAnnouncements] = useState<boolean>(() => localStorage.getItem('setting_notif_announcements') !== 'false');
  const [notifAIStudy, setNotifAIStudy] = useState<boolean>(() => localStorage.getItem('setting_notif_aistudy') !== 'false');
  const [fontSizeScale, setFontSizeScale] = useState<string>(() => localStorage.getItem('setting_font_scale') || 'normal');
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => localStorage.getItem('setting_reduced_motion') === 'true');
  const [autoLockTimeout, setAutoLockTimeout] = useState<string>(() => localStorage.getItem('setting_autolock') || '30');
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    authService.fingerprintStatus()
      .then((status) => setBiometricOn(Array.isArray(status?.devices) && status.devices.length > 0))
      .catch(() => {});
  }, [openPanel]);

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
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
          osc.connect(gainNode);
          osc.start(ctx.currentTime + i * 0.08);
          osc.stop(ctx.currentTime + i * 0.08 + 0.4);
        });
      } else if (toneType === 'ping') {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.15);
        osc.connect(gainNode);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      } else if (toneType === 'classic') {
        [600, 750].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
          osc.connect(gainNode);
          osc.start(ctx.currentTime + i * 0.12);
          osc.stop(ctx.currentTime + i * 0.12 + 0.3);
        });
      } else {
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

  const showSaveNotification = () => {
    setSavedBanner('Settings saved successfully!');
    setTimeout(() => setSavedBanner(null), 4000);
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

  const handleClearOfflineCache = () => {
    try {
      const keysToRemove = Object.keys(localStorage).filter(k => k.startsWith('completed_topics_') || k.startsWith('fusion_read_'));
      keysToRemove.forEach(k => localStorage.removeItem(k));
      setSavedBanner('Offline study cache and temporary data cleared.');
      setTimeout(() => setSavedBanner(null), 4000);
    } catch (_) {}
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'All password fields are required.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }
    setPasswordBusy(true);
    setPasswordMsg(null);
    try {
      await userService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
        currentPassword,
        newPassword,
        confirmPassword
      });
      setPasswordMsg({ type: 'success', text: 'Password changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.response?.data?.error || err.message || 'Failed to change password.' });
    } finally {
      setPasswordBusy(false);
    }
  };

  const togglePanel = (panel: SettingsPanel) => {
    setOpenPanel((current) => (current === panel ? null : panel));
  };

  const THEMES: { id: AppTheme; label: string; icon: any }[] = [
    { id: 'dark', label: 'Dark Theme', icon: Moon },
    { id: 'light', label: 'Light Theme', icon: Sun },
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

  const rowClass = 'w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/5 cursor-pointer';
  const sectionCard = 'rounded-3xl bg-surface-dark border border-white/10 shadow-sm overflow-hidden';
  const sectionLabel = 'px-4 pt-4 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400';

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto text-slate-100 pb-12">
      <HelpSupportModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} defaultTab="faq" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-display text-white tracking-tight flex items-center gap-2.5">
            <Sliders className="w-6 h-6 text-indigo-400" />
            <span>Settings</span>
          </h2>
        </div>
        {savedBanner && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{savedBanner}</span>
          </div>
        )}
      </div>

      {/* ===== ACCOUNT ===== */}
      <div className={sectionCard}>
        <p className={sectionLabel}>Account</p>

        <button type="button" onClick={() => togglePanel('password')} className={`${rowClass} border-t border-white/5`}>
          <span className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4 text-indigo-400" />
          </span>
          <span className="flex-1 text-sm font-semibold text-white">Change Password</span>
          <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${openPanel === 'password' ? 'rotate-90' : ''}`} />
        </button>
        {openPanel === 'password' && (
          <form onSubmit={handleChangePassword} className="border-t border-white/5 bg-surface-darker/80 px-4 py-4 space-y-4 animate-fade-in">
            {passwordMsg && (
              <div className={`p-3 rounded-2xl border text-xs ${passwordMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-rose-500/10 border-rose-500/20 text-rose-300'}`}>
                {passwordMsg.text}
              </div>
            )}
            {[
              { label: 'Current password', value: currentPassword, set: setCurrentPassword, show: showCurrent, setShow: setShowCurrent },
              { label: 'New password', value: newPassword, set: setNewPassword, show: showNew, setShow: setShowNew },
            ].map((field) => (
              <div key={field.label}>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">{field.label}</label>
                <div className="relative">
                  <input
                    type={field.show ? 'text' : 'password'}
                    value={field.value}
                    onChange={(e) => field.set(e.target.value)}
                    className="w-full rounded-xl bg-surface-dark border border-white/10 px-3 py-2.5 pr-10 text-xs text-white focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <button type="button" onClick={() => field.setShow(!field.show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                    {field.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Confirm new password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl bg-surface-dark border border-white/10 px-3 py-2.5 text-xs text-white focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <button type="submit" disabled={passwordBusy} className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md disabled:opacity-50">
              {passwordBusy ? 'Saving…' : 'Update Password'}
            </button>
          </form>
        )}

        <button type="button" onClick={() => togglePanel('notifications')} className={`${rowClass} border-t border-white/5`}>
          <span className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4 text-emerald-400" />
          </span>
          <span className="flex-1 text-sm font-semibold text-white">Notification Settings</span>
          <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${openPanel === 'notifications' ? 'rotate-90' : ''}`} />
        </button>
        {openPanel === 'notifications' && (
          <div className="border-t border-white/5 bg-surface-darker/80 px-4 py-4 space-y-4 animate-fade-in">
            <div className="rounded-2xl bg-surface-dark border border-white/10 p-4 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  {soundEnabled ? <Volume2 className="w-5 h-5 text-amber-400" /> : <VolumeX className="w-5 h-5 text-slate-500" />}
                  <h3 className="text-sm font-bold font-display text-white">Audio & Notification Chimes</h3>
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
              <div className="space-y-2 pt-1">
                <label className="text-xs font-bold text-slate-300">Notification Alert Melody</label>
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
                      <span className="text-xs font-bold">{tone.label}</span>
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

            <div className="rounded-2xl bg-surface-dark border border-white/10 p-4 space-y-3">
              <div className="flex items-center gap-2.5 pb-2 border-b border-white/5">
                <Bell className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold font-display text-white">Notification Routing & Alerts</h3>
              </div>
              {[
                { label: 'Assignment Due Dates & Tasks', value: notifAssignments, set: setNotifAssignments },
                { label: 'Teacher & Educator Messages', value: notifMessages, set: setNotifMessages },
                { label: 'School Broadcasts & Bulletins', value: notifAnnouncements, set: setNotifAnnouncements },
                { label: 'AI Tutor Revision Suggestions', value: notifAIStudy, set: setNotifAIStudy },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between p-3 rounded-2xl bg-surface-darker border border-white/5">
                  <h4 className="text-xs font-bold text-white">{item.label}</h4>
                  <input
                    type="checkbox"
                    checked={item.value}
                    onChange={(e) => item.set(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                  />
                </div>
              ))}
            </div>

            <div className="rounded-2xl bg-surface-dark border border-white/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-sm font-bold font-display text-white flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-slate-400" />
                <span>Offline Cache & Temporary Storage</span>
              </h3>
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
        )}

        <button type="button" onClick={() => togglePanel('language')} className={`${rowClass} border-t border-white/5`}>
          <span className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shrink-0">
            <Globe className="w-4 h-4 text-sky-400" />
          </span>
          <span className="flex-1 text-sm font-semibold text-white">Language</span>
          <span className="text-xs text-slate-400 mr-1">English</span>
          <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${openPanel === 'language' ? 'rotate-90' : ''}`} />
        </button>
        {openPanel === 'language' && (
          <div className="border-t border-white/5 bg-surface-darker/80 px-4 py-4 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-sky-500/10 border border-sky-500/30">
              <span className="text-xs font-bold text-white">English</span>
              <Check className="w-4 h-4 text-sky-400" />
            </div>
            <p className="text-[11px] text-slate-400">English is the active language for Geleza SA. More languages can be added later.</p>
          </div>
        )}
      </div>

      {/* ===== APP SETTINGS ===== */}
      <div className={sectionCard}>
        <p className={sectionLabel}>App Settings</p>
        <div className={`${rowClass} border-t border-white/5`}>
          <span className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center shrink-0">
            <Moon className="w-4 h-4 text-violet-400" />
          </span>
          <span className="flex-1 text-sm font-semibold text-white">Dark Mode</span>
          <button
            type="button"
            role="switch"
            aria-checked={theme === 'dark'}
            onClick={toggleTheme}
            className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${theme === 'dark' ? 'bg-indigo-600' : 'bg-slate-600'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${theme === 'dark' ? 'translate-x-5' : ''}`} />
          </button>
        </div>

        <div className={`${rowClass} border-t border-white/5`}>
          <span className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
            <Fingerprint className="w-4 h-4 text-cyan-300" />
          </span>
          <button type="button" onClick={() => togglePanel('biometric')} className="flex-1 text-left text-sm font-semibold text-white">
            Biometric Login
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={biometricOn}
            disabled={biometricBusy}
            onClick={() => {
              setOpenPanel('biometric');
              setBiometricBusy(true);
              setTimeout(() => setBiometricBusy(false), 300);
            }}
            className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${biometricOn ? 'bg-indigo-600' : 'bg-slate-600'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${biometricOn ? 'translate-x-5' : ''}`} />
          </button>
        </div>
        {openPanel === 'biometric' && (
          <div className="border-t border-white/5 bg-surface-darker/80 px-3 py-3 animate-fade-in">
            <FingerprintSignInCard />
          </div>
        )}

        <button type="button" onClick={() => togglePanel('appearance')} className={`${rowClass} border-t border-white/5`}>
          <span className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <Palette className="w-4 h-4 text-indigo-400" />
          </span>
          <span className="flex-1 text-sm font-semibold text-white">Appearance & Typography</span>
          <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${openPanel === 'appearance' ? 'rotate-90' : ''}`} />
        </button>
        {openPanel === 'appearance' && (
          <div className="border-t border-white/5 bg-surface-darker/80 px-4 py-4 space-y-4 animate-fade-in">
            <div className="rounded-2xl bg-surface-dark border border-white/10 p-4 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  <Palette className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-sm font-bold font-display text-white">Visual Theme & Mode</h3>
                </div>
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-surface-darker hover:bg-white/5 text-xs font-semibold text-slate-300 hover:text-white transition-all shadow-sm group"
                >
                  {theme === 'light' ? (
                    <>
                      <Sun className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-45 transition-transform" />
                      <span>Light Mode</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-3.5 h-3.5 text-indigo-400 group-hover:-rotate-12 transition-transform" />
                      <span>Dark Mode</span>
                    </>
                  )}
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      <span className="text-xs font-bold text-white">{t.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-slate-300">Color Palette Accent</label>
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

            <div className="rounded-2xl bg-surface-dark border border-white/10 p-4 space-y-3">
              <div className="flex items-center gap-2.5 pb-2 border-b border-white/5">
                <Type className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold font-display text-white">Application Typography & Font</h3>
              </div>
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
                  <p className="text-[11px] text-slate-400 font-normal truncate">{f.preview}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ===== SUPPORT ===== */}
      <div className={sectionCard}>
        <p className={sectionLabel}>Support</p>
        <button type="button" onClick={() => setHelpOpen(true)} className={`${rowClass} border-t border-white/5`}>
          <span className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
            <HelpCircle className="w-4 h-4 text-amber-400" />
          </span>
          <span className="flex-1 text-sm font-semibold text-white">Help & Support</span>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>
        <button type="button" onClick={() => togglePanel('about')} className={`${rowClass} border-t border-white/5`}>
          <span className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
            <Info className="w-4 h-4 text-blue-400" />
          </span>
          <span className="flex-1 text-sm font-semibold text-white">About App</span>
          <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${openPanel === 'about' ? 'rotate-90' : ''}`} />
        </button>
        {openPanel === 'about' && (
          <div className="border-t border-white/5 bg-surface-darker/80 px-4 py-4 space-y-3 animate-fade-in">
            <p className="text-xs text-slate-300 leading-relaxed">
              Geleza SA — Geleza Smart, The Future Is Thine. School portal for learners, parents, educators, and administrators.
            </p>
            <p className="text-[11px] text-slate-500 font-mono">Version 2.1</p>
            <Link to="/about" className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-300 hover:text-cyan-200">
              Open About Us page
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* Log Out stays last */}
      <button
        type="button"
        onClick={logout}
        className="w-full rounded-3xl bg-surface-dark border border-rose-500/30 p-4 flex items-center gap-3 hover:bg-rose-500/10 transition-colors cursor-pointer"
      >
        <span className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
          <LogOut className="w-4 h-4 text-rose-400" />
        </span>
        <span className="text-sm font-bold text-rose-400">Log Out</span>
      </button>
    </div>
  );
};
