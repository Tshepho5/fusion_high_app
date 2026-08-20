import React, { useState, useEffect } from 'react';
import { learnerService } from '../../services/api';
import { Badge } from '../common/Badge';
import { FusionAIIcon } from '../common/FusionAIIcon';
import {
  Flame,
  Zap,
  Award,
  Trophy,
  ChevronRight,
  CheckCircle2,
  Lock,
  Star,
  X
} from 'lucide-react';

export const LearnerGamificationWidget: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showBadgeModal, setShowBadgeModal] = useState<boolean>(false);
  const [claimedBonus, setClaimedBonus] = useState<boolean>(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await learnerService.getGamification();
      setStats(data);
    } catch (err) {
      console.error('Error loading gamification:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimDailyBonus = async () => {
    if (claimedBonus) return;
    try {
      await learnerService.awardXP({ action_type: 'Daily Study Login Streak', xp_amount: 100 });
      setClaimedBonus(true);
      fetchStats();
    } catch (_) {}
  };

  if (loading && !stats) return null;

  const totalXP = stats?.total_xp || 570;
  const level = stats?.level || 3;
  const levelTitle = stats?.level_title || 'Curriculum Scholar';
  const currentLevelXP = stats?.level_progress_xp || 150;
  const nextLevelXP = stats?.next_level_xp || 300;
  const streakDays = stats?.streak_days || 7;
  const progressPercent = Math.min(100, Math.round((currentLevelXP / nextLevelXP) * 100));
  const badges = stats?.badges || [];
  const unlockedBadges = badges.filter((b: any) => b.unlocked);

  return (
    <div className="rounded-3xl bg-gradient-to-r from-surface-dark via-surface-dark/95 to-surface-dark border border-white/10 p-5 shadow-xl relative overflow-hidden card-interactive">
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left: Streak & Level */}
        <div className="flex items-center gap-4">
          {/* Flame Icon with Pulsing Glow */}
          <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 text-white shadow-glow-amber shrink-0 animate-pulse-glow">
            <Flame className="w-8 h-8 fill-amber-200 text-amber-100" />
            <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-slate-900 border border-amber-400 text-[10px] font-mono font-extrabold text-amber-300">
              {streakDays}d
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="amber" size="sm" className="font-bold flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>{streakDays} Day Study Streak</span>
              </Badge>
              <Badge variant="indigo" size="sm">
                Level {level}: {levelTitle}
              </Badge>
            </div>
            <h3 className="text-base font-extrabold font-display text-white tracking-tight flex items-center gap-2">
              <span>{totalXP.toLocaleString()} Academic XP</span>
              <span className="text-xs text-slate-400 font-normal">
                ({currentLevelXP}/{nextLevelXP} XP to Level {level + 1})
              </span>
            </h3>
          </div>
        </div>

        {/* Center: XP Progress Bar */}
        <div className="w-full md:w-64 space-y-1.5">
          <div className="flex justify-between text-[11px] font-bold">
            <span className="text-slate-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              Level Progress
            </span>
            <span className="text-cyan-300 font-mono">{progressPercent}%</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-surface-darker border border-white/5 overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-brand-500 to-cyan-400 transition-all duration-1000 ease-out animate-shimmer-sweep"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Right: Badges & Daily Bonus Claim */}
        <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
          <button
            onClick={() => setShowBadgeModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 transition-all active:scale-95"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Badges ({unlockedBadges.length}/{badges.length})</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <button
            onClick={handleClaimDailyBonus}
            disabled={claimedBonus}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs transition-all ${
              claimedBonus
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 text-white shadow-glow-amber animate-pulse'
            }`}
          >
            {claimedBonus ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Bonus Claimed</span>
              </>
            ) : (
              <>
                <FusionAIIcon className="w-3.5 h-3.5 text-amber-200" />
                <span>Claim +100 XP</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Badges Modal */}
      {showBadgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-2xl rounded-3xl bg-surface-dark border border-white/10 p-6 shadow-2xl space-y-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-display text-white">CAPS Achievement Badges</h3>
                  <p className="text-xs text-slate-400">
                    Earn XP and unlock honours across Mathematics, Sciences, Quizzes, and Perfect Attendance.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBadgeModal(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {badges.map((b: any) => (
                <div
                  key={b.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    b.unlocked
                      ? 'bg-surface-darker/90 border-amber-500/30 shadow-md'
                      : 'bg-surface-darker/40 border-white/5 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`text-2xl p-2 rounded-xl ${b.unlocked ? 'bg-amber-500/10' : 'bg-white/5'}`}>
                      {b.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white truncate">{b.title}</h4>
                        {b.unlocked ? (
                          <span className="text-[10px] font-bold text-amber-400 font-mono">+{b.xp_reward} XP</span>
                        ) : (
                          <Lock className="w-3 h-3 text-slate-500" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{b.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={b.unlocked ? 'amber' : 'slate'} size="sm">
                          {b.category}
                        </Badge>
                        {b.unlocked && (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                            <Star className="w-3 h-3 fill-emerald-400" /> Unlocked
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-white/10 pt-4 flex justify-end">
              <button
                onClick={() => setShowBadgeModal(false)}
                className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs transition-colors"
              >
                Close Showcase
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
