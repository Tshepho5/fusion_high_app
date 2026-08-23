import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Badge } from '../common/Badge';
import { learnerService } from '../../services/api';
import { generateDynamicQuestion } from '../../utils/capsQuestionGenerator';
import { CapsCareerQuest } from './CapsCareerQuest';
import {
  Gamepad2,
  Trophy,
  Flame,
  Zap,
  Swords,
  Target,
  FlaskConical,
  Scale,
  Dna,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Star,
  Users,
  Award,
  Filter,
  Volume2,
  VolumeX,
  Play,
  Share2,
  HelpCircle,
  Crown,
  Compass,
  Castle
} from 'lucide-react';

interface Question {
  id: string;
  grade: number;
  subject: string;
  topic: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const FusionArcadeHub: React.FC<{ initialSubject?: string }> = ({ initialSubject }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const userGrade = Number(user?.grade || user?.academic?.grade) || 10;
  const [selectedGrade, setSelectedGrade] = useState<number>(userGrade);
  const [selectedSubject, setSelectedSubject] = useState<string>(initialSubject || 'All Subjects');
  const [activeMode, setActiveMode] = useState<'hub' | 'career-quest' | 'battle' | 'trig-sniper' | 'mole-lab' | 'balance-sheet' | 'dna-runner'>('hub');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  // Load Real Database Leaderboard
  useEffect(() => {
    learnerService.getLeaderboard()
      .then(res => {
        if (Array.isArray(res) && res.length > 0) {
          setLeaderboard(res);
        }
      })
      .catch(err => {
        console.error('Failed to load database leaderboard:', err);
      });
  }, []);

  // Gamification Player Stats
  const [playerXP, setPlayerXP] = useState<number>(() => {
    const saved = localStorage.getItem('fusion_player_xp');
    return saved ? Number(saved) : 1250;
  });
  const [streakDays, setStreakDays] = useState<number>(() => {
    const saved = localStorage.getItem('fusion_streak_days');
    return saved ? Number(saved) : 5;
  });

  useEffect(() => {
    localStorage.setItem('fusion_player_xp', playerXP.toString());
    localStorage.setItem('fusion_streak_days', streakDays.toString());
  }, [playerXP, streakDays]);

  // ── 1v1 BATTLE / QUIZ ARENA STATE ──
  const [battleQuestions, setBattleQuestions] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [botName, setBotName] = useState('AI Study Bot (Alex)');
  const [timeLeft, setTimeLeft] = useState(60);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [battleFinished, setBattleFinished] = useState(false);

  // Start 1v1 Battle with 100% Dynamic, Non-Repeating Questions
  const handleStartBattle = (targetSubject?: string) => {
    const sub = targetSubject || selectedSubject;
    const dynamicList: Question[] = [];
    for (let i = 0; i < 5; i++) {
      const dyn = generateDynamicQuestion(selectedGrade, sub);
      dynamicList.push(dyn);
    }

    setBattleQuestions(dynamicList);
    setCurrentQIndex(0);
    setPlayerScore(0);
    setBotScore(0);
    setTimeLeft(60);
    setSelectedOption(null);
    setIsAnswered(false);
    setBattleFinished(false);
    setActiveMode('battle');
  };

  // Timer loop for battle
  useEffect(() => {
    if (activeMode !== 'battle' || battleFinished) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setBattleFinished(true);
          return 0;
        }
        return prev - 1;
      });

      // Bot occasionally scores a point
      if (Math.random() < 0.25) {
        setBotScore(prev => prev + 10);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeMode, battleFinished]);

  const handleSelectAnswer = (index: number) => {
    if (isAnswered || battleFinished) return;
    setSelectedOption(index);
    setIsAnswered(true);

    const currentQ = battleQuestions[currentQIndex];
    if (currentQ && index === currentQ.correctIndex) {
      const earnedXP = 50;
      setPlayerScore(prev => prev + 20);
      setPlayerXP(prev => prev + earnedXP);
    }
  };

  const handleNextQuestion = () => {
    if (currentQIndex + 1 < battleQuestions.length) {
      setCurrentQIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setBattleFinished(true);
      // Give completion bonus
      setPlayerXP(prev => prev + 100);
    }
  };

  // ── MINI-GAME 2: TRIG & MATH SNIPER STATE ──
  const [sniperAngle, setSniperAngle] = useState(45);
  const [targetAngle, setTargetAngle] = useState(60);
  const [sniperScore, setSniperScore] = useState(0);
  const [sniperFeedback, setSniperFeedback] = useState<string | null>(null);

  const handleFireSniper = () => {
    if (Math.abs(sniperAngle - targetAngle) <= 3) {
      setSniperScore(prev => prev + 1);
      setPlayerXP(prev => prev + 30);
      setSniperFeedback('🎯 DIRECT HIT! Angle calculated perfectly with +30 XP!');
      setTargetAngle(Math.floor(Math.random() * 70) + 15);
    } else {
      setSniperFeedback(`Missed! Target angle was ${targetAngle}°. You set ${sniperAngle}°. Adjust and retry!`);
    }
  };

  // ── MINI-GAME 3: MOLE CHEMISTRY LAB STATE ──
  const [molesH2, setMolesH2] = useState(2);
  const [molesO2, setMolesO2] = useState(1);
  const [chemStatus, setChemStatus] = useState<string | null>(null);

  const handleSynthesizeWater = () => {
    if (molesH2 === 2 && molesO2 === 1) {
      setChemStatus('🧪 SUCCESS! 2H₂ + O₂ ➔ 2H₂O balanced perfectly! Yield: 2 Moles Water! (+40 XP)');
      setPlayerXP(prev => prev + 40);
    } else if (molesH2 > 2 * molesO2) {
      setChemStatus('⚠️ Excess Hydrogen (H₂) left unreacted. Ratio must be 2 : 1!');
    } else {
      setChemStatus('⚠️ Excess Oxygen (O₂) left unreacted. Ratio must be 2 : 1!');
    }
  };

  // ── MINI-GAME 4: ACCOUNTING BALANCE SHEET EQUALIZER ──
  const [balanceScale, setBalanceScale] = useState<{ assets: number; equity: number; liabilities: number }>({
    assets: 10000,
    equity: 6000,
    liabilities: 4000
  });
  const [accFeedback, setAccFeedback] = useState<string | null>(null);

  const handleAddTransaction = (type: 'asset_up_cash_down' | 'loan_taken' | 'capital_invested') => {
    if (type === 'asset_up_cash_down') {
      setAccFeedback('Bought Equipment for R2,000 Cash. Equipment (+R2,000) & Bank (-R2,000). Assets remain R10,000! Balanced! (+25 XP)');
      setPlayerXP(prev => prev + 25);
    } else if (type === 'loan_taken') {
      setBalanceScale(prev => ({
        ...prev,
        assets: prev.assets + 5000,
        liabilities: prev.liabilities + 5000
      }));
      setAccFeedback('Took R5,000 Nedbank Loan. Bank (Asset) +R5,000 & Loan (Liability) +R5,000. Equation Balanced! (+35 XP)');
      setPlayerXP(prev => prev + 35);
    } else if (type === 'capital_invested') {
      setBalanceScale(prev => ({
        ...prev,
        assets: prev.assets + 10000,
        equity: prev.equity + 10000
      }));
      setAccFeedback('Owner contributed R10,000 Capital. Bank (+R10,000) & Capital (+R10,000). Balanced! (+35 XP)');
      setPlayerXP(prev => prev + 35);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner & Gamification Profile Summary */}
      <div className="rounded-3xl bg-gradient-to-r from-brand-900/60 via-surface-dark to-cyan-950/60 border border-brand-500/30 p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-brand-500 flex items-center justify-center text-white shadow-glow-indigo">
                <Gamepad2 className="w-5 h-5" />
              </div>
              <h2 className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight">
                Fusion Arcade & CAPS Study Games
              </h2>
            </div>
            <p className="text-xs text-slate-300 max-w-xl">
              Master your grade syllabus through interactive 1v1 battle duels, trigonometry snipers, chemistry labs, and accounting equalizers.
            </p>
          </div>

          {/* Player Rank & XP Stats */}
          <div className="flex items-center gap-3 bg-surface-darker/80 border border-white/10 p-3.5 rounded-2xl shrink-0">
            <div className="text-center px-3 border-r border-white/10">
              <div className="flex items-center justify-center gap-1 text-amber-400 font-extrabold text-sm">
                <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
                <span>{streakDays} Days</span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">Streak</p>
            </div>

            <div className="text-center px-3 border-r border-white/10">
              <div className="flex items-center justify-center gap-1 text-cyan-300 font-extrabold text-sm">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span>{playerXP} XP</span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">Level {Math.floor(playerXP / 500) + 1}</p>
            </div>

            <div className="text-center px-2">
              <Badge variant="indigo" size="sm">Grade {selectedGrade} Master</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MAIN ARCADE HUB (GAME SELECTOR & LEADERBOARD)
      ───────────────────────────────────────────────────────────── */}
      {activeMode === 'hub' && (
        <div className="space-y-6">
          {/* Grade & Subject Selector Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-3xl bg-surface-dark border border-white/10">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <span className="text-xs font-bold text-slate-400 shrink-0">Grade Syllabus:</span>
              {[8, 9, 10, 11, 12].map(g => (
                <button
                  key={g}
                  onClick={() => setSelectedGrade(g)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    selectedGrade === g
                      ? 'bg-gradient-to-r from-brand-600 to-cyan-600 text-white shadow-glow-indigo'
                      : 'bg-surface-darker text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  Grade {g}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 shrink-0">Subject:</span>
              <select
                value={selectedSubject}
                onChange={e => setSelectedSubject(e.target.value)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold focus:outline-none focus:border-cyan-500 ${
                  isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-surface-darker border-white/10 text-white'
                }`}
              >
                <option value="All Subjects">All Subjects</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Physical Sciences">Physical Sciences</option>
                <option value="Life Sciences">Life Sciences</option>
                <option value="Accounting">Accounting</option>
                <option value="Business Studies">Business Studies</option>
                <option value="Economic & Management Sciences">EMS (Gr 8-9)</option>
                <option value="Natural Sciences">Natural Sciences (Gr 8-9)</option>
              </select>
            </div>
          </div>

          {/* Interactive Games Catalog Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Featured RPG: CAPS Career Quest & Boss Battles */}
            <div className="md:col-span-2 lg:col-span-3 p-6 md:p-8 rounded-3xl bg-gradient-to-r from-brand-950 via-surface-dark to-purple-950/80 border border-brand-500/40 hover:border-brand-400 hover:shadow-glow-indigo transition-all relative overflow-hidden group">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-brand-500 to-indigo-600 text-white flex items-center justify-center font-bold text-2xl shrink-0 shadow-glow-indigo">
                    👑
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg md:text-xl font-black font-display text-white group-hover:text-cyan-300 transition-colors">
                        CAPS Career Quest & Epic Topic Boss Battles
                      </h3>
                      <Badge variant="amber" size="sm">RPG Campaign</Badge>
                    </div>
                    <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                      Embark on an adventure across Grade {selectedGrade} syllabus waypoints. Clear the Concept Trail, Formula Woods, and Calculation Cavern to summon and vanquish epic guardians like <em>The Calculus Dragon</em>, <em>The Stoichiometry Golem</em>, and <em>The Balance Sheet Titan</em>!
                    </p>
                    <div className="flex items-center gap-3 pt-2 text-xs text-cyan-300 font-mono">
                      <span className="flex items-center gap-1"><Castle className="w-3.5 h-3.5" /> 4-Stage Waypoints</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-amber-400" /> +600 XP Boss Rewards</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-emerald-400" /> Auto-Saves Daily</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setActiveMode('career-quest')}
                  className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-brand-600 to-cyan-600 text-white font-extrabold text-xs shadow-lg hover:from-amber-400 hover:to-cyan-400 transition-all flex items-center justify-center gap-2 shrink-0 transform hover:scale-105"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Launch Career Quest</span>
                </button>
              </div>
            </div>

            {/* Game 1: 1v1 Battle Arena */}
            <div className="p-6 rounded-3xl bg-surface-dark border border-brand-500/30 hover:border-brand-500 hover:shadow-glow-indigo transition-all space-y-4 relative overflow-hidden group">
              <div className="w-12 h-12 rounded-2xl bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold">
                <Swords className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold font-display text-white group-hover:text-cyan-300 transition-colors">
                    1v1 Quick-Fire CAPS Exam Duel
                  </h3>
                  <Badge variant="cyan" size="sm">Multiplayer / AI</Badge>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Timed 60-second rapid-fire battle against classmates or the AI Bot with dynamic non-repeating Grade {selectedGrade} questions.
                </p>
              </div>
              <button
                onClick={() => handleStartBattle()}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-cyan-600 text-white font-bold text-xs shadow-md hover:from-brand-500 hover:to-cyan-500 transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start 1v1 Battle (Earn XP)</span>
              </button>
            </div>

            {/* Game 2: Trig Sniper & Algebra Launcher */}
            <div className="p-6 rounded-3xl bg-surface-dark border border-white/10 hover:border-cyan-400/50 hover:shadow-glow-cyan transition-all space-y-4 relative overflow-hidden group">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold font-display text-white group-hover:text-cyan-300 transition-colors">
                    Trig & Vector Angle Sniper
                  </h3>
                  <Badge variant="cyan" size="sm">Mathematics</Badge>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Adjust elevation angles, Cartesian vectors, and parabolic launch curves to hit targets with mathematical precision.
                </p>
              </div>
              <button
                onClick={() => setActiveMode('trig-sniper')}
                className="w-full py-2.5 rounded-xl bg-surface-darker hover:bg-white/10 text-white border border-white/10 font-bold text-xs transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Launch Trig Simulator</span>
              </button>
            </div>

            {/* Game 3: Mole Chemistry Lab */}
            <div className="p-6 rounded-3xl bg-surface-dark border border-white/10 hover:border-emerald-400/50 hover:shadow-glow-emerald transition-all space-y-4 relative overflow-hidden group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <FlaskConical className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold font-display text-white group-hover:text-emerald-300 transition-colors">
                    Mole & Stoichiometry Lab
                  </h3>
                  <Badge variant="emerald" size="sm">Physical Sciences</Badge>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Balance chemical reactions, calculate limiting reagents and synthesize water and ammonia without virtual lab explosions.
                </p>
              </div>
              <button
                onClick={() => setActiveMode('mole-lab')}
                className="w-full py-2.5 rounded-xl bg-surface-darker hover:bg-white/10 text-white border border-white/10 font-bold text-xs transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Enter Chemistry Lab</span>
              </button>
            </div>

            {/* Game 4: Accounting Balance Sheet Equalizer */}
            <div className="p-6 rounded-3xl bg-surface-dark border border-white/10 hover:border-amber-400/50 hover:shadow-glow-amber transition-all space-y-4 relative overflow-hidden group">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <Scale className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold font-display text-white group-hover:text-amber-300 transition-colors">
                    Accounting Balance Equalizer
                  </h3>
                  <Badge variant="amber" size="sm">Accounting / EMS</Badge>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Maintain the sacred Accounting Equation (A = O + L) under timed ledger transactions and audit checks.
                </p>
              </div>
              <button
                onClick={() => setActiveMode('balance-sheet')}
                className="w-full py-2.5 rounded-xl bg-surface-darker hover:bg-white/10 text-white border border-white/10 font-bold text-xs transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Balance The Scale</span>
              </button>
            </div>
          </div>

          {/* Inter-Grade Leaderboard */}
          <div className="p-6 rounded-3xl bg-surface-dark border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold font-display text-white">
                  Fusion High Grade 8–12 Academic Champions
                </h3>
              </div>
              <span className="text-[11px] font-mono text-cyan-300 font-bold">Updated Live</span>
            </div>

            <div className="divide-y divide-white/5">
              {(leaderboard.length > 0 ? leaderboard : [
                { rank: 1, name: user?.full_name || 'Active Scholar', grade: selectedGrade, xp: playerXP, streak: streakDays, badge: 'Curriculum Scholar' }
              ]).map(userItem => (
                <div key={userItem.rank} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 text-center font-extrabold ${userItem.rank <= 3 ? 'text-amber-400 font-mono text-sm' : 'text-slate-500'}`}>
                      #{userItem.rank}
                    </span>
                    <div>
                      <h4 className="font-bold text-white">{userItem.name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Grade {userItem.grade} • {userItem.badge}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 text-amber-400 font-bold font-mono">
                      <Flame className="w-3 h-3" /> {userItem.streak}d
                    </span>
                    <span className="font-mono font-bold text-cyan-300">
                      {userItem.xp} XP
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          FEATURED MODE: CAPS CAREER QUEST RPG & BOSS BATTLES
      ───────────────────────────────────────────────────────────── */}
      {activeMode === 'career-quest' && (
        <CapsCareerQuest
          onBackToArcade={() => setActiveMode('hub')}
          initialGrade={selectedGrade}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODE 1: 1v1 BATTLE / QUIZ ARENA PLAY SCREEN
      ───────────────────────────────────────────────────────────── */}
      {activeMode === 'battle' && (
        <div className="space-y-6">
          {/* Battle Header */}
          <div className="p-6 rounded-3xl bg-surface-dark border border-white/10 shadow-xl flex items-center justify-between gap-4">
            <button
              onClick={() => setActiveMode('hub')}
              className="px-3 py-1.5 rounded-xl bg-surface-darker hover:bg-white/10 text-xs font-bold text-slate-300 transition-colors"
            >
              Exit Battle
            </button>

            {/* Live Scores & Duel Status */}
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-xs text-cyan-300 font-bold">You (Learner)</p>
                <p className="text-xl font-black text-white font-mono">{playerScore} pts</p>
              </div>

              <div className="text-center px-3 py-1 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-black text-lg">
                ⏱️ {timeLeft}s
              </div>

              <div className="text-left">
                <p className="text-xs text-rose-400 font-bold">{botName}</p>
                <p className="text-xl font-black text-white font-mono">{botScore} pts</p>
              </div>
            </div>

            <Badge variant="indigo" size="sm">Grade {selectedGrade}</Badge>
          </div>

          {!battleFinished && battleQuestions[currentQIndex] ? (
            <div className="p-6 md:p-8 rounded-3xl bg-surface-dark border border-brand-500/40 shadow-2xl space-y-6 animate-fade-in">
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-white/10 pb-3">
                <span className="font-mono font-bold text-brand-400">
                  Question {currentQIndex + 1} of {battleQuestions.length} • {battleQuestions[currentQIndex].subject}
                </span>
                <span className="text-slate-400 font-mono">
                  Topic: {battleQuestions[currentQIndex].topic}
                </span>
              </div>

              <h3 className="text-base md:text-lg font-bold text-white leading-relaxed">
                {battleQuestions[currentQIndex].question}
              </h3>

              {/* Options */}
              <div className="grid grid-cols-1 gap-3">
                {battleQuestions[currentQIndex].options.map((opt, idx) => {
                  const isChosen = selectedOption === idx;
                  const isCorrect = idx === battleQuestions[currentQIndex].correctIndex;

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
                      onClick={() => handleSelectAnswer(idx)}
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

              {/* CAPS Step-by-Step Explanation */}
              {isAnswered && (
                <div className="p-4 rounded-2xl bg-brand-900/30 border border-brand-500/30 text-xs space-y-2 animate-fade-in">
                  <p className="font-bold text-cyan-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" /> CAPS Official Explanation:
                  </p>
                  <p className="text-slate-300 leading-relaxed">
                    {battleQuestions[currentQIndex].explanation}
                  </p>
                </div>
              )}

              {isAnswered && (
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleNextQuestion}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
                  >
                    <span>{currentQIndex + 1 < battleQuestions.length ? 'Next Question' : 'Complete Duel'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Battle Completion Summary */
            <div className="p-8 md:p-12 rounded-3xl bg-surface-dark border border-white/10 text-center space-y-6 animate-fade-in shadow-2xl">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-brand-500 text-white flex items-center justify-center mx-auto shadow-glow-indigo">
                <Trophy className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl md:text-2xl font-black font-display text-white">
                  {playerScore >= botScore ? '🎉 Victory! Duel Won!' : '⚔️ Good Duel! Practice Makes Perfect!'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  You scored <span className="text-cyan-300 font-bold font-mono">{playerScore} pts</span> vs opponent {botScore} pts.
                </p>
              </div>

              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold text-xs font-mono">
                <Zap className="w-4 h-4" /> +150 CAPS XP Awarded to your profile!
              </div>

              <div className="flex justify-center gap-3 pt-4">
                <button
                  onClick={() => handleStartBattle()}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-cyan-600 text-white font-bold text-xs shadow-md hover:from-brand-500"
                >
                  Play Another Round
                </button>
                <button
                  onClick={() => setActiveMode('hub')}
                  className="px-5 py-2.5 rounded-xl bg-surface-darker hover:bg-white/10 border border-white/10 text-white text-xs font-bold"
                >
                  Return to Arcade Hub
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODE 2: TRIGONOMETRY ANGLE SNIPER
      ───────────────────────────────────────────────────────────── */}
      {activeMode === 'trig-sniper' && (
        <div className="p-6 md:p-8 rounded-3xl bg-surface-dark border border-white/10 shadow-xl space-y-6 animate-fade-in">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base font-bold font-display text-white">
                Trigonometry & Cartesian Angle Sniper (Grade {selectedGrade})
              </h3>
            </div>
            <button
              onClick={() => setActiveMode('hub')}
              className="px-3 py-1.5 rounded-xl bg-surface-darker hover:bg-white/10 text-xs font-bold text-slate-300"
            >
              Exit Simulator
            </button>
          </div>

          <div className="p-6 rounded-2xl bg-surface-darker border border-white/5 text-center space-y-4">
            <p className="text-xs text-slate-400">
              Target Elevation Angle: <span className="text-amber-400 font-bold font-mono text-base">{targetAngle}°</span>
            </p>

            <div className="space-y-2 max-w-md mx-auto">
              <label className="text-xs font-bold text-slate-300 flex justify-between font-mono">
                <span>Adjust Launch Angle (θ):</span>
                <span className="text-cyan-300">{sniperAngle}°</span>
              </label>
              <input
                type="range"
                min="0"
                max="90"
                value={sniperAngle}
                onChange={e => setSniperAngle(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <button
              onClick={handleFireSniper}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-brand-600 text-white font-bold text-xs shadow-glow-cyan"
            >
              🎯 Fire Precision Angle Cannon
            </button>

            {sniperFeedback && (
              <p className="text-xs font-mono font-bold text-cyan-300 mt-2 animate-fade-in">
                {sniperFeedback}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODE 3: MOLE CHEMISTRY LAB
      ───────────────────────────────────────────────────────────── */}
      {activeMode === 'mole-lab' && (
        <div className="p-6 md:p-8 rounded-3xl bg-surface-dark border border-white/10 shadow-xl space-y-6 animate-fade-in">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold font-display text-white">
                Mole Chemistry & Stoichiometry Lab
              </h3>
            </div>
            <button
              onClick={() => setActiveMode('hub')}
              className="px-3 py-1.5 rounded-xl bg-surface-darker hover:bg-white/10 text-xs font-bold text-slate-300"
            >
              Exit Lab
            </button>
          </div>

          <div className="p-6 rounded-2xl bg-surface-darker border border-white/5 space-y-5 text-center">
            <p className="text-xs text-slate-300 font-mono">
              Chemical Equation: <strong className="text-white font-bold">xH₂ + yO₂ ➔ 2H₂O (Water)</strong>
            </p>

            <div className="flex justify-center gap-6">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Moles of H₂</label>
                <input
                  type="number"
                  value={molesH2}
                  onChange={e => setMolesH2(Number(e.target.value))}
                  className="w-20 p-2 text-center rounded-xl bg-surface-dark border border-white/10 text-white font-bold font-mono text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Moles of O₂</label>
                <input
                  type="number"
                  value={molesO2}
                  onChange={e => setMolesO2(Number(e.target.value))}
                  className="w-20 p-2 text-center rounded-xl bg-surface-dark border border-white/10 text-white font-bold font-mono text-sm"
                />
              </div>
            </div>

            <button
              onClick={handleSynthesizeWater}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-bold text-xs shadow-glow-emerald"
            >
              ⚗️ Synthesize Compound
            </button>

            {chemStatus && (
              <p className="text-xs font-mono font-bold text-emerald-300 mt-2 animate-fade-in">
                {chemStatus}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODE 4: ACCOUNTING BALANCE EQUALIZER
      ───────────────────────────────────────────────────────────── */}
      {activeMode === 'balance-sheet' && (
        <div className="p-6 md:p-8 rounded-3xl bg-surface-dark border border-white/10 shadow-xl space-y-6 animate-fade-in">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold font-display text-white">
                Accounting Equation Balance Equalizer (A = O + L)
              </h3>
            </div>
            <button
              onClick={() => setActiveMode('hub')}
              className="px-3 py-1.5 rounded-xl bg-surface-darker hover:bg-white/10 text-xs font-bold text-slate-300"
            >
              Exit Equalizer
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center font-mono">
            <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
              <p className="text-xs text-cyan-400 font-bold">Assets (A)</p>
              <p className="text-lg font-black text-white mt-1">R{balanceScale.assets.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
              <p className="text-xs text-indigo-400 font-bold">Owner’s Equity (O)</p>
              <p className="text-lg font-black text-white mt-1">R{balanceScale.equity.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
              <p className="text-xs text-rose-400 font-bold">Liabilities (L)</p>
              <p className="text-lg font-black text-white mt-1">R{balanceScale.liabilities.toLocaleString()}</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-300">Choose a Business Transaction to Post:</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleAddTransaction('asset_up_cash_down')}
                className="px-4 py-2 rounded-xl bg-surface-darker hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-bold"
              >
                1. Buy Equipment R2,000 Cash
              </button>
              <button
                onClick={() => handleAddTransaction('loan_taken')}
                className="px-4 py-2 rounded-xl bg-surface-darker hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-bold"
              >
                2. Take R5,000 Bank Loan
              </button>
              <button
                onClick={() => handleAddTransaction('capital_invested')}
                className="px-4 py-2 rounded-xl bg-surface-darker hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-bold"
              >
                3. Owner Invests R10,000 Capital
              </button>
            </div>
          </div>

          {accFeedback && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono font-bold animate-fade-in">
              {accFeedback}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
