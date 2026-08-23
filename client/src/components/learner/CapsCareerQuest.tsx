import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Badge } from '../common/Badge';
import { generateDynamicQuestion, ProceduralQuestion } from '../../utils/capsQuestionGenerator';
import {
  Swords,
  Shield,
  Heart,
  Flame,
  Zap,
  Sparkles,
  Trophy,
  Crown,
  Compass,
  ArrowLeft,
  ArrowRight,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  BookOpen,
  MapPin,
  Castle,
  Trees,
  Skull,
  HelpCircle,
  Volume2,
  VolumeX,
  Star
} from 'lucide-react';

interface BossConfig {
  id: string;
  name: string;
  title: string;
  grade: number;
  subject: string;
  topic: string;
  maxHp: number;
  icon: string;
  themeColor: string;
  description: string;
  rewardBadge: string;
  rewardXp: number;
}

const BOSS_ROSTER: BossConfig[] = [
  {
    id: 'boss-gr8-math',
    name: 'The Integer Behemoth',
    title: 'Warlord of Negative Numbers',
    grade: 8,
    subject: 'Mathematics',
    topic: 'Integers & Pre-Algebra',
    maxHp: 100,
    icon: '👹',
    themeColor: 'from-amber-600 to-rose-700',
    description: 'A rocky elemental fueled by the chaos of negative and positive operations.',
    rewardBadge: 'Master of Integers (Grade 8)',
    rewardXp: 300
  },
  {
    id: 'boss-gr9-geom',
    name: 'Pythagoras the Ancient',
    title: 'Guardian of the Right Angle',
    grade: 9,
    subject: 'Mathematics',
    topic: 'Pythagoras & Geometry',
    maxHp: 120,
    icon: '🧙‍♂️',
    themeColor: 'from-cyan-600 to-indigo-700',
    description: 'An ancient sorcerer holding the golden triangular key to algebraic dimensions.',
    rewardBadge: 'Pythagorean Adept (Grade 9)',
    rewardXp: 350
  },
  {
    id: 'boss-gr10-trig',
    name: 'Lord Trigonometron',
    title: 'Master of Cartesian Coordinates',
    grade: 10,
    subject: 'Mathematics',
    topic: 'Trigonometry & Cartesian Coordinates',
    maxHp: 150,
    icon: '📐',
    themeColor: 'from-cyan-500 to-blue-700',
    description: 'A mechanical celestial architect who controls elevation angles and sine wave barriers.',
    rewardBadge: 'Trig Angle Master (Grade 10)',
    rewardXp: 450
  },
  {
    id: 'boss-gr11-parabola',
    name: 'The Parabola Phantom',
    title: 'Lord of Quadratic Turning Points',
    grade: 11,
    subject: 'Mathematics',
    topic: 'Quadratic Equations & Functions',
    maxHp: 180,
    icon: '👻',
    themeColor: 'from-purple-600 to-brand-700',
    description: 'A spectral phantom that warps quadratic trajectories and hides its roots.',
    rewardBadge: 'Parabola Slayer (Grade 11)',
    rewardXp: 500
  },
  {
    id: 'boss-gr12-calculus',
    name: 'The Calculus Dragon',
    title: 'Guardian of Derivatives & Tangents',
    grade: 12,
    subject: 'Mathematics',
    topic: 'Differential Calculus',
    maxHp: 200,
    icon: '🐉',
    themeColor: 'from-rose-600 via-brand-700 to-indigo-900',
    description: 'The ultimate NSC mathematical titan wielding power rules, cubic graphs, and rate-of-change flame breath.',
    rewardBadge: 'Calculus Conqueror (Grade 12)',
    rewardXp: 600
  },
  {
    id: 'boss-gr11-chem',
    name: 'The Stoichiometry Golem',
    title: 'Protector of the Molar Forge',
    grade: 11,
    subject: 'Physical Sciences',
    topic: 'Quantitative Chemistry & Moles',
    maxHp: 160,
    icon: '⚗️',
    themeColor: 'from-emerald-600 to-teal-800',
    description: 'Constructed from pure crystalline precipitates, this golem challenges your molar mass calculations.',
    rewardBadge: 'Stoichiometry Specialist',
    rewardXp: 450
  },
  {
    id: 'boss-gr12-doppler',
    name: 'The Doppler Specter',
    title: 'Shifter of Sound & Cosmic Waves',
    grade: 12,
    subject: 'Physical Sciences',
    topic: 'Doppler Effect & Waves',
    maxHp: 180,
    icon: '🌊',
    themeColor: 'from-sky-500 to-indigo-800',
    description: 'A supersonic entity compressing wavelengths into sonic thunderbolts.',
    rewardBadge: 'Doppler Wavemaster',
    rewardXp: 500
  },
  {
    id: 'boss-gr12-dna',
    name: 'The DNA Chimera',
    title: 'Transcriber of the Genetic Code',
    grade: 12,
    subject: 'Life Sciences',
    topic: 'Genetics & Molecular Biology',
    maxHp: 180,
    icon: '🧬',
    themeColor: 'from-emerald-500 to-cyan-800',
    description: 'A multi-headed genetic beast testing mRNA codons, meiosis, and monohybrid crosses.',
    rewardBadge: 'DNA Decoder',
    rewardXp: 500
  },
  {
    id: 'boss-gr10-acc',
    name: 'The Balance Sheet Titan',
    title: 'Equalizer of Ledger Columns',
    grade: 10,
    subject: 'Accounting',
    topic: 'Accounting Equation & Statements',
    maxHp: 150,
    icon: '⚖️',
    themeColor: 'from-amber-500 to-orange-700',
    description: 'A towering ledger golem that strikes when Assets do not equal Owner’s Equity plus Liabilities.',
    rewardBadge: 'Accounting Equalizer',
    rewardXp: 450
  }
];

export const CapsCareerQuest: React.FC<{
  onBackToArcade?: () => void;
  initialGrade?: number;
}> = ({ onBackToArcade, initialGrade }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const userGrade = initialGrade || Number(user?.grade || user?.academic?.grade) || 10;
  const [selectedGrade, setSelectedGrade] = useState<number>(userGrade);

  // Filter available bosses for selected grade
  const gradeBosses = useMemo(() => {
    return BOSS_ROSTER.filter(b => b.grade === selectedGrade);
  }, [selectedGrade]);

  const [activeBossIndex, setActiveBossIndex] = useState<number>(0);
  const currentBoss = gradeBosses[activeBossIndex] || gradeBosses[0] || BOSS_ROSTER[0];

  // Persistent Save State Key
  const saveKey = `fusion_career_quest_${user?.id || 'guest'}_gr${selectedGrade}`;

  // Campaign State
  const [stageProgress, setStageProgress] = useState<{
    stage: 1 | 2 | 3 | 4; // 1: Concept Trail, 2: Formula Woods, 3: Cavern, 4: Boss Lair
    stageStep: number;
    defeatedBosses: string[];
    playerXp: number;
    potions: number;
    shields: number;
  }>(() => {
    const saved = localStorage.getItem(saveKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return {
      stage: 1,
      stageStep: 1,
      defeatedBosses: [],
      playerXp: 0,
      potions: 3,
      shields: 2
    };
  });

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem(saveKey, JSON.stringify(stageProgress));
  }, [stageProgress, saveKey]);

  // Combat State
  const [inCombat, setInCombat] = useState<boolean>(false);
  const [bossHp, setBossHp] = useState<number>(currentBoss.maxHp);
  const [playerHp, setPlayerHp] = useState<number>(100);
  const [currentQuestion, setCurrentQuestion] = useState<ProceduralQuestion | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [isBossDefeated, setIsBossDefeated] = useState<boolean>(false);
  const [isPlayerDefeated, setIsPlayerDefeated] = useState<boolean>(false);

  // Check After-School Active Window (14:00 - 18:30)
  const isAfterSchoolWindow = useMemo(() => {
    const now = new Date();
    const hrs = now.getHours();
    const mins = now.getMinutes();
    const totalMins = hrs * 60 + mins;
    // 14:00 = 840 mins, 18:30 = 1110 mins
    return totalMins >= 840 && totalMins <= 1110;
  }, []);

  // Fetch next dynamic question
  const loadNextQuestion = () => {
    const q = generateDynamicQuestion(selectedGrade, currentBoss.subject, currentBoss.topic);
    setCurrentQuestion(q);
    setSelectedOption(null);
    setIsAnswered(false);
  };

  // Start Waypoint or Boss Fight
  const handleEnterStage = (targetStage: 1 | 2 | 3 | 4) => {
    setStageProgress(prev => ({ ...prev, stage: targetStage, stageStep: 1 }));
    setPlayerHp(100);
    setBossHp(targetStage === 4 ? currentBoss.maxHp : 60);
    setIsBossDefeated(false);
    setIsPlayerDefeated(false);
    setCombatLog([
      `⚔️ Entering ${targetStage === 1 ? 'Concept Trail' : targetStage === 2 ? 'Formula Woods' : targetStage === 3 ? 'Calculation Cavern' : currentBoss.name + '’s Lair'}!`,
      `Grade ${selectedGrade} ${currentBoss.subject} • Topic: ${currentBoss.topic}`
    ]);
    setInCombat(true);
    loadNextQuestion();
  };

  const handleUsePotion = () => {
    if (stageProgress.potions > 0 && playerHp < 100) {
      setPlayerHp(prev => Math.min(100, prev + 40));
      setStageProgress(prev => ({ ...prev, potions: prev.potions - 1 }));
      setCombatLog(prev => [`🧪 Used Health Potion! Restored +40 HP!`, ...prev.slice(0, 4)]);
    }
  };

  const handleAttack = (optionIndex: number) => {
    if (isAnswered || !currentQuestion || isBossDefeated || isPlayerDefeated) return;

    setSelectedOption(optionIndex);
    setIsAnswered(true);

    const isCorrect = optionIndex === currentQuestion.correctIndex;

    if (isCorrect) {
      // Calculate dynamic damage
      const dmg = stageProgress.stage === 4 ? 35 : 30;
      const newBossHp = Math.max(0, bossHp - dmg);
      setBossHp(newBossHp);

      const earnedXp = Math.round(currentQuestion.points * (isAfterSchoolWindow ? 1.5 : 1.0));
      setStageProgress(prev => ({ ...prev, playerXp: prev.playerXp + earnedXp }));

      setCombatLog(prev => [
        `💥 CRITICAL HIT! Solved correctly! Dealt ${dmg} damage to ${currentBoss.name}! (+${earnedXp} XP)`,
        ...prev.slice(0, 4)
      ]);

      if (newBossHp <= 0) {
        setIsBossDefeated(true);
        if (stageProgress.stage === 4) {
          // Defeated Boss of topic!
          setStageProgress(prev => ({
            ...prev,
            defeatedBosses: Array.from(new Set([...prev.defeatedBosses, currentBoss.id])),
            playerXp: prev.playerXp + currentBoss.rewardXp,
            potions: prev.potions + 2
          }));
          setCombatLog(prev => [
            `🏆 VICTORY! You have vanquished ${currentBoss.name}! Reward: ${currentBoss.rewardBadge} (+${currentBoss.rewardXp} XP)`,
            ...prev.slice(0, 4)
          ]);
        }
      }
    } else {
      // Boss counter-attacks
      const bossDmg = stageProgress.stage === 4 ? 25 : 15;
      const newPlayerHp = Math.max(0, playerHp - bossDmg);
      setPlayerHp(newPlayerHp);

      setCombatLog(prev => [
        `❌ Incorrect! ${currentBoss.name} counter-attacks for ${bossDmg} damage!`,
        ...prev.slice(0, 4)
      ]);

      if (newPlayerHp <= 0) {
        setIsPlayerDefeated(true);
        setCombatLog(prev => [
          `💀 Fallen in battle! Review the CAPS explanation below, heal up, and retry!`,
          ...prev.slice(0, 4)
        ]);
      }
    }
  };

  const handleNextStep = () => {
    if (stageProgress.stageStep < 3 && stageProgress.stage < 4) {
      setStageProgress(prev => ({ ...prev, stageStep: prev.stageStep + 1 }));
      loadNextQuestion();
    } else if (stageProgress.stage < 4) {
      const nextStage = (stageProgress.stage + 1) as 1 | 2 | 3 | 4;
      handleEnterStage(nextStage);
    } else {
      loadNextQuestion();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & AFTER-SCHOOL RAID CLOCK BANNER
      ───────────────────────────────────────────────────────────── */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-950/80 via-surface-dark to-slate-900 border border-brand-500/30 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <button
                onClick={onBackToArcade}
                className="p-2 rounded-xl bg-surface-darker hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
                title="Back to Arcade Hub"
              >
                <ArrowLeft className="w-4 h-4 text-cyan-400" />
              </button>
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-glow-indigo">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black font-display text-white tracking-tight">
                  CAPS Career Quest & Boss Battles
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  Syllabus RPG Campaign • Grade {selectedGrade} Curriculum Storyline
                </p>
              </div>
            </div>
          </div>

          {/* After-School Raid Schedule Indicator */}
          <div className="flex items-center gap-3 bg-surface-darker/90 border border-white/10 p-3.5 rounded-2xl shrink-0">
            <div className="text-center px-3 border-r border-white/10">
              <div className={`flex items-center justify-center gap-1 font-extrabold text-xs ${isAfterSchoolWindow ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`}>
                <Clock className="w-3.5 h-3.5" />
                <span>14:00 – 18:30</span>
              </div>
              <p className="text-[9px] text-slate-500 font-mono">After-School Raid</p>
            </div>

            <div className="text-center px-3">
              {isAfterSchoolWindow ? (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase">
                  ⭐ +50% XP Active
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[9px] font-bold">
                  Practice Mode
                </span>
              )}
              <p className="text-[9px] text-slate-500 font-mono mt-0.5">Homework Friendly</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grade Selector Pills */}
      <div className="flex items-center gap-2 p-2 rounded-2xl bg-surface-dark border border-white/10 overflow-x-auto">
        <span className="text-xs font-bold text-slate-400 px-2 shrink-0">Campaign Grade:</span>
        {[8, 9, 10, 11, 12].map(g => (
          <button
            key={g}
            onClick={() => {
              setSelectedGrade(g);
              setActiveBossIndex(0);
              setInCombat(false);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedGrade === g
                ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-glow-indigo'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Grade {g} Storyline
          </button>
        ))}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. ADVENTURE MAP & WAYPOINT SELECTION (WHEN NOT IN COMBAT)
      ───────────────────────────────────────────────────────────── */}
      {!inCombat && (
        <div className="space-y-6">
          {/* Topic Boss Selection Carousel */}
          <div className="p-6 md:p-8 rounded-3xl bg-surface-dark border border-white/10 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base md:text-lg font-bold font-display text-white flex items-center gap-2">
                  <Compass className="w-5 h-5 text-cyan-400" />
                  <span>Choose Topic Boss & Adventure Realm</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Conquer every waypoint of the topic syllabus to summon and defeat the guardian boss.
                </p>
              </div>
              <Badge variant="indigo" size="sm">
                {gradeBosses.length} Bosses in Grade {selectedGrade}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {gradeBosses.map((boss, idx) => {
                const isDefeated = stageProgress.defeatedBosses.includes(boss.id);
                const isSelected = activeBossIndex === idx;

                return (
                  <div
                    key={boss.id}
                    onClick={() => setActiveBossIndex(idx)}
                    className={`p-5 rounded-3xl border transition-all cursor-pointer space-y-4 relative overflow-hidden ${
                      isSelected
                        ? 'bg-gradient-to-br from-brand-900/40 via-surface-dark to-slate-900 border-cyan-400/60 shadow-glow-cyan'
                        : 'bg-surface-darker/80 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-3xl">{boss.icon}</span>
                      {isDefeated ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black uppercase flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> DEFEATED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] font-bold uppercase">
                          ACTIVE BOSS
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-white font-display leading-snug">
                        {boss.name}
                      </h4>
                      <p className="text-[11px] text-cyan-300 font-mono">{boss.title}</p>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{boss.description}</p>
                    </div>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400">{boss.subject}</span>
                      <span className="text-amber-400 font-bold">+{boss.rewardXp} XP</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4-Stage Waypoint Progression Map */}
          <div className="p-6 md:p-8 rounded-3xl bg-surface-dark border border-white/10 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-display text-white flex items-center gap-2">
                <Castle className="w-5 h-5 text-amber-400" />
                <span>{currentBoss.topic} Quest Journey</span>
              </h3>
              <span className="text-xs font-mono text-cyan-300 font-bold">
                Boss: {currentBoss.name}
              </span>
            </div>

            {/* Visual Waypoint Nodes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Waypoint 1 */}
              <div className="p-5 rounded-2xl bg-surface-darker border border-white/10 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase">Stage 1</span>
                    <Trees className="w-4 h-4 text-emerald-400" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Concept Discovery Trail</h4>
                  <p className="text-[11px] text-slate-400">Master fundamental definitions, principles, and rules.</p>
                </div>
                <button
                  onClick={() => handleEnterStage(1)}
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-bold text-xs shadow-md hover:from-emerald-500 transition-all flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Enter Stage 1</span>
                </button>
              </div>

              {/* Waypoint 2 */}
              <div className="p-5 rounded-2xl bg-surface-darker border border-white/10 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase">Stage 2</span>
                    <Shield className="w-4 h-4 text-indigo-400" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Formula Deep Woods</h4>
                  <p className="text-[11px] text-slate-400">Apply core formulas and standard equations.</p>
                </div>
                <button
                  onClick={() => handleEnterStage(2)}
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-bold text-xs shadow-md hover:from-indigo-500 transition-all flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Enter Stage 2</span>
                </button>
              </div>

              {/* Waypoint 3 */}
              <div className="p-5 rounded-2xl bg-surface-darker border border-white/10 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase">Stage 3</span>
                    <Zap className="w-4 h-4 text-amber-400" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Calculation Cavern</h4>
                  <p className="text-[11px] text-slate-400">Tackle multi-step exam problem calculations.</p>
                </div>
                <button
                  onClick={() => handleEnterStage(3)}
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-600 to-brand-600 text-white font-bold text-xs shadow-md hover:from-amber-500 transition-all flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Enter Stage 3</span>
                </button>
              </div>

              {/* Waypoint 4: The Boss Lair */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-950/40 via-surface-darker to-slate-900 border border-rose-500/40 shadow-glow-rose space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-rose-400 font-black uppercase">Stage 4 (BOSS)</span>
                    <Skull className="w-4 h-4 text-rose-500 animate-pulse" />
                  </div>
                  <h4 className="text-sm font-bold text-white">{currentBoss.name}’s Lair</h4>
                  <p className="text-[11px] text-slate-300">Summon the titan boss and fight for the topic trophy.</p>
                </div>
                <button
                  onClick={() => handleEnterStage(4)}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-brand-600 to-amber-600 text-white font-black text-xs shadow-lg hover:from-rose-500 transition-all flex items-center justify-center gap-1.5"
                >
                  <Swords className="w-4 h-4" />
                  <span>Summon Boss Fight!</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. ACTIVE COMBAT / BOSS ARENA SCREEN
      ───────────────────────────────────────────────────────────── */}
      {inCombat && (
        <div className="space-y-6">
          {/* Battle Status Bar with Player & Boss HP */}
          <div className="p-6 rounded-3xl bg-surface-dark border border-white/10 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setInCombat(false)}
                className="px-3.5 py-1.5 rounded-xl bg-surface-darker hover:bg-white/10 text-xs font-bold text-slate-300 border border-white/10 transition-colors"
              >
                Exit Campaign Stage
              </button>

              <Badge variant="cyan" size="sm">
                Stage {stageProgress.stage}: {stageProgress.stage === 4 ? 'BOSS LAIR' : 'Waypoint ' + stageProgress.stage}
              </Badge>

              {/* Health Potions Button */}
              <button
                onClick={handleUsePotion}
                disabled={stageProgress.potions === 0 || playerHp >= 100}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold disabled:opacity-40 transition-all"
              >
                <span>🧪 Heal Potion ({stageProgress.potions})</span>
              </button>
            </div>

            {/* Health Bars Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Player HP */}
              <div className="space-y-2 p-4 rounded-2xl bg-surface-darker border border-white/5">
                <div className="flex items-center justify-between text-xs font-mono font-bold">
                  <span className="text-cyan-300 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    <span>{user?.full_name || 'You (Learner)'}</span>
                  </span>
                  <span className="text-white">{playerHp} / 100 HP</span>
                </div>
                <div className="w-full h-3.5 rounded-full bg-slate-800 overflow-hidden p-0.5 border border-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-300"
                    style={{ width: `${playerHp}%` }}
                  />
                </div>
              </div>

              {/* Boss HP */}
              <div className="space-y-2 p-4 rounded-2xl bg-surface-darker border border-rose-500/20">
                <div className="flex items-center justify-between text-xs font-mono font-bold">
                  <span className="text-rose-400 flex items-center gap-1.5">
                    <span className="text-lg">{currentBoss.icon}</span>
                    <span>{stageProgress.stage === 4 ? currentBoss.name : 'Waypoint Guardian'}</span>
                  </span>
                  <span className="text-rose-300">{bossHp} HP</span>
                </div>
                <div className="w-full h-3.5 rounded-full bg-slate-800 overflow-hidden p-0.5 border border-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-500 to-rose-600 transition-all duration-300"
                    style={{ width: `${(bossHp / (stageProgress.stage === 4 ? currentBoss.maxHp : 60)) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Combat Question Pane */}
          {!isBossDefeated && !isPlayerDefeated && currentQuestion && (
            <div className="p-6 md:p-8 rounded-3xl bg-surface-dark border border-brand-500/40 shadow-2xl space-y-6 animate-fade-in">
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-white/10 pb-3">
                <span className="font-mono font-bold text-cyan-300">
                  {currentQuestion.subject} • {currentQuestion.topic}
                </span>
                <span className="font-mono text-amber-400 font-bold">
                  Attack Power: 35 Damage (+{currentQuestion.points} XP)
                </span>
              </div>

              <h3 className="text-base md:text-lg font-bold text-white leading-relaxed">
                {currentQuestion.question}
              </h3>

              {/* Answer Options */}
              <div className="grid grid-cols-1 gap-3">
                {currentQuestion.options.map((opt, idx) => {
                  const isChosen = selectedOption === idx;
                  const isCorrect = idx === currentQuestion.correctIndex;

                  let btnStyle = 'bg-surface-darker border-white/10 text-slate-200 hover:border-brand-500/50';
                  if (isAnswered) {
                    if (isCorrect) {
                      btnStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-glow-emerald';
                    } else if (isChosen && !isCorrect) {
                      btnStyle = 'bg-rose-500/20 border-rose-500 text-rose-300';
                    } else {
                      btnStyle = 'opacity-40 bg-surface-darker border-white/5 text-slate-400';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleAttack(idx)}
                      disabled={isAnswered}
                      className={`p-4 rounded-2xl border text-left text-xs md:text-sm font-semibold transition-all flex items-center justify-between ${btnStyle}`}
                    >
                      <span>{opt}</span>
                      {isAnswered && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                      {isAnswered && isChosen && !isCorrect && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Step-by-Step CAPS Solution */}
              {isAnswered && (
                <div className="p-4 rounded-2xl bg-brand-900/30 border border-brand-500/30 text-xs space-y-2 animate-fade-in">
                  <p className="font-bold text-cyan-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" /> CAPS Official Solution:
                  </p>
                  <p className="text-slate-300 leading-relaxed">
                    {currentQuestion.explanation}
                  </p>
                </div>
              )}

              {isAnswered && !isBossDefeated && !isPlayerDefeated && (
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleNextStep}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
                  >
                    <span>Cast Next Attack</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Victory Ceremony */}
          {isBossDefeated && (
            <div className="p-8 md:p-12 rounded-3xl bg-surface-dark border border-emerald-500/40 text-center space-y-6 animate-fade-in shadow-2xl">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 to-emerald-500 text-white flex items-center justify-center mx-auto shadow-glow-indigo text-4xl">
                🏆
              </div>

              <div>
                <h3 className="text-2xl md:text-3xl font-black font-display text-white">
                  🎉 Realm Conquered! Boss Vanquished!
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  You successfully mastered <strong className="text-cyan-300">{currentBoss.topic}</strong> and defeated {currentBoss.name}.
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                <span className="px-4 py-2 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-1.5">
                  <Award className="w-4 h-4" /> {currentBoss.rewardBadge}
                </span>
                <span className="px-4 py-2 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold text-xs flex items-center gap-1.5 font-mono">
                  <Zap className="w-4 h-4" /> +{currentBoss.rewardXp} CAPS XP
                </span>
              </div>

              <div className="flex justify-center gap-4 pt-4">
                <button
                  onClick={() => setInCombat(false)}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-bold text-xs shadow-md"
                >
                  Return to Adventure Map
                </button>
              </div>
            </div>
          )}

          {/* Player Defeated Screen */}
          {isPlayerDefeated && (
            <div className="p-8 md:p-12 rounded-3xl bg-surface-dark border border-rose-500/40 text-center space-y-6 animate-fade-in shadow-2xl">
              <div className="w-16 h-16 rounded-3xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto text-3xl">
                💀
              </div>

              <div>
                <h3 className="text-xl md:text-2xl font-black font-display text-white">
                  Fallen in Battle!
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {currentBoss.name} overwhelmed your defenses. Practice the topic concepts, heal up with a potion, and try again!
                </p>
              </div>

              <div className="flex justify-center gap-3 pt-4">
                <button
                  onClick={() => handleEnterStage(stageProgress.stage)}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-brand-600 text-white font-bold text-xs shadow-md"
                >
                  Retry Stage
                </button>
                <button
                  onClick={() => setInCombat(false)}
                  className="px-5 py-2.5 rounded-xl bg-surface-darker hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-bold"
                >
                  Return to Map
                </button>
              </div>
            </div>
          )}

          {/* Combat Log Box */}
          <div className="p-4 rounded-2xl bg-surface-darker border border-white/5 font-mono text-[11px] space-y-1">
            <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-1">
              Battle Action Log:
            </p>
            {combatLog.map((log, i) => (
              <p key={i} className={i === 0 ? 'text-cyan-300 font-bold' : 'text-slate-500'}>
                {log}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
