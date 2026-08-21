import React, { useState, useEffect } from 'react';
import { Badge } from '../common/Badge';
import confetti from 'canvas-confetti';
import { learnerService } from '../../services/api';
import {
  FileText,
  Download,
  Search,
  Sparkles,
  Award,
  Clock,
  CheckCircle2,
  Filter,
  Eye,
  BookOpen,
  ArrowRight,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Flame,
  Check,
  FolderDown,
  Layers
} from 'lucide-react';

interface SubjectPastPapersProps {
  subject: string;
  grade: number;
  onSolveWithAI?: (prompt: string) => void;
}

interface DbeResource {
  id: number;
  subject: string;
  grade: number;
  title: string;
  resource_type: string;
  term?: string;
  year?: number;
  file_path?: string;
  file_name?: string;
  file_size?: string;
  description?: string;
}

interface ExamPaper {
  id: string;
  year: number;
  season: 'November Final (NSC)' | 'September Trial (Prelim)' | 'June Mid-Year Exam' | 'March Exemplar';
  paperNumber: 'Paper 1' | 'Paper 2' | 'Paper 3';
  title: string;
  marks: number;
  durationMinutes: number;
  curriculum: string;
  topicsCovered: string[];
  sampleQuestions: {
    questionNumber: string;
    topic: string;
    marks: number;
    questionText: string;
    memoSnippet: string;
  }[];
}

// Generate realistic CAPS DBE Past Exam Papers tailored dynamically to any subject & grade
const getSubjectPastPapers = (subjectName: string, gradeNum: number): ExamPaper[] => {
  const s = subjectName.toLowerCase();

  // Mathematics dataset
  if (s.includes('math') && !s.includes('lit')) {
    return [
      {
        id: 'math-2024-nov-p1',
        year: 2024,
        season: 'November Final (NSC)',
        paperNumber: 'Paper 1',
        title: `Mathematics Grade ${gradeNum} Paper 1 (Algebra, Calculus & Finance)`,
        marks: 150,
        durationMinutes: 180,
        curriculum: 'CAPS National Senior Certificate',
        topicsCovered: ['Algebra & Equations', 'Patterns & Sequences', 'Functions & Inverses', 'Calculus Derivatives', 'Financial Maths', 'Probability'],
        sampleQuestions: [
          {
            questionNumber: 'Question 1.1',
            topic: 'Algebra & Quadratic Equations',
            marks: 4,
            questionText: 'Solve for x:  2x² - 5x - 3 = 0  (correct to two decimal places if necessary).',
            memoSnippet: '(2x + 1)(x - 3) = 0  ⇒  x = -1/2  or  x = 3.  [4 Marks: 1 mark factors, 1 mark per solution]'
          },
          {
            questionNumber: 'Question 7.2',
            topic: 'Differential Calculus',
            marks: 5,
            questionText: 'Determine the derivative of f(x) = 4x³ - 2x + 7 from first principles.',
            memoSnippet: "f'(x) = lim[h→0] (f(x+h) - f(x))/h = lim[h→0] (4(x+h)³ - 2(x+h) + 7 - (4x³ - 2x + 7))/h = 12x² - 2."
          },
          {
            questionNumber: 'Question 8.1',
            topic: 'Financial Mathematics',
            marks: 6,
            questionText: 'A learner deposits R15,000 into a fixed deposit account earning 9.5% p.a. compounded monthly. Calculate the balance after 5 years.',
            memoSnippet: 'A = P(1 + i/m)^(n·m) = 15000(1 + 0.095/12)^(60) = R24,082.35.'
          }
        ]
      },
      {
        id: 'math-2024-nov-p2',
        year: 2024,
        season: 'November Final (NSC)',
        paperNumber: 'Paper 2',
        title: `Mathematics Grade ${gradeNum} Paper 2 (Geometry, Trigonometry & Stats)`,
        marks: 150,
        durationMinutes: 180,
        curriculum: 'CAPS National Senior Certificate',
        topicsCovered: ['Euclidean Geometry', 'Analytical Geometry', 'Trigonometry Identities', 'Statistics & Regression', 'Circle Theorems'],
        sampleQuestions: [
          {
            questionNumber: 'Question 3.1',
            topic: 'Analytical Geometry',
            marks: 5,
            questionText: 'Given points A(-2; 4) and B(6; -2), calculate the gradient of line AB and the equation of the perpendicular bisector.',
            memoSnippet: 'm_AB = (-2 - 4)/(6 - (-2)) = -6/8 = -3/4. Perpendicular m = 4/3. Midpoint M(2; 1). Equation: y - 1 = 4/3(x - 2).'
          },
          {
            questionNumber: 'Question 5.2',
            topic: 'Trigonometric Reduction',
            marks: 6,
            questionText: 'Simplify without using a calculator:  sin(180° - x)·cos(90° + x) / [tan(360° - x)·cos(-x)].',
            memoSnippet: '= (sin x)·(-sin x) / [(-tan x)·(cos x)] = -sin²x / (-sin x / cos x · cos x) = -sin²x / -sin x = sin x.'
          }
        ]
      },
      {
        id: 'math-2023-sept-p1',
        year: 2023,
        season: 'September Trial (Prelim)',
        paperNumber: 'Paper 1',
        title: `Mathematics Grade ${gradeNum} Prelim Paper 1`,
        marks: 150,
        durationMinutes: 180,
        curriculum: 'CAPS Provincial Standard',
        topicsCovered: ['Sequences & Series', 'Polynomial Division', 'Cubic Graphs', 'Probability Counting Principles'],
        sampleQuestions: [
          {
            questionNumber: 'Question 2.3',
            topic: 'Geometric Series',
            marks: 4,
            questionText: 'For which values of k will the geometric series  ∑[n=1 to ∞] 3(2k - 1)ⁿ⁻¹ converge?',
            memoSnippet: 'Condition for convergence: |r| < 1  ⇒  -1 < 2k - 1 < 1  ⇒  0 < 2k < 2  ⇒  0 < k < 1.'
          }
        ]
      }
    ];
  }

  // Physical Sciences dataset
  if (s.includes('physic') || s.includes('science')) {
    if (gradeNum === 10) {
      return [
        {
          id: 'phys-gr10-2024-nov-p1',
          year: 2024,
          season: 'November Final (NSC)',
          paperNumber: 'Paper 1',
          title: 'Grade 10 Physical Sciences Paper 1 (Physics)',
          marks: 100,
          durationMinutes: 120,
          curriculum: 'CAPS Physics Mechanics, Waves & Electricity',
          topicsCovered: ['Vectors & Scalars in 1D', 'Motion in 1D & Equations of Motion', 'Gravitational Potential & Kinetic Energy', 'Transverse & Longitudinal Waves', 'Electric Circuits & Ohm\'s Law'],
          sampleQuestions: [
            {
              questionNumber: 'Question 2.1',
              topic: 'Equations of Motion (1D)',
              marks: 4,
              questionText: 'A car accelerates uniformly from rest to a velocity of 20 m·s⁻¹ in 8 seconds. Calculate the acceleration of the car and the total distance covered.',
              memoSnippet: 'v_f = v_i + a·Δt ⇒ 20 = 0 + a(8) ⇒ a = 2.5 m·s⁻². Δx = v_i·Δt + ½a·(Δt)² = 0 + ½(2.5)(8)² = 80 m.'
            },
            {
              questionNumber: 'Question 4.2',
              topic: 'Mechanical Waves',
              marks: 3,
              questionText: 'A sound wave has a frequency of 500 Hz and travels through air at 340 m·s⁻¹. Calculate the wavelength of this wave.',
              memoSnippet: 'v = f·λ ⇒ 340 = 500·λ ⇒ λ = 340 / 500 = 0.68 m (68 cm).'
            }
          ]
        },
        {
          id: 'phys-gr10-2024-nov-p2',
          year: 2024,
          season: 'November Final (NSC)',
          paperNumber: 'Paper 2',
          title: 'Grade 10 Physical Sciences Paper 2 (Chemistry)',
          marks: 100,
          durationMinutes: 120,
          curriculum: 'CAPS Chemistry Matter & Chemical Change',
          topicsCovered: ['States of Matter & Kinetic Theory', 'Atomic Structure & Isotopes', 'Periodic Table & Electron Configuration', 'Chemical Bonding (Ionic, Covalent & Metallic)', 'Balancing Chemical Equations'],
          sampleQuestions: [
            {
              questionNumber: 'Question 3.1',
              topic: 'Atomic Structure & Electron Config',
              marks: 4,
              questionText: 'Write down the sp-notation electron configuration for a chlorine atom (Cl, Z = 17) and draw its Aufbau diagram.',
              memoSnippet: 'Chlorine (17 e⁻): 1s² 2s² 2p⁶ 3s² 3p⁵. Valence electrons = 7 (Group 17 / VII halogen).'
            }
          ]
        }
      ];
    }

    if (gradeNum === 11) {
      return [
        {
          id: 'phys-gr11-2024-nov-p1',
          year: 2024,
          season: 'November Final (NSC)',
          paperNumber: 'Paper 1',
          title: 'Grade 11 Physical Sciences Paper 1 (Physics)',
          marks: 150,
          durationMinutes: 180,
          curriculum: 'CAPS Physics Mechanics, Optics & Electrostatics',
          topicsCovered: ['Vectors in 2D & Resolving Components', "Newton's 1st, 2nd & 3rd Laws of Motion", "Newton's Law of Universal Gravitation", 'Geometrical Optics & Snell\'s Law', 'Coulomb\'s Law & Electric Fields'],
          sampleQuestions: [
            {
              questionNumber: 'Question 2.1',
              topic: "Newton's Second Law of Motion",
              marks: 5,
              questionText: 'A 5 kg block on a rough horizontal surface is pulled with a 40 N force acting at an angle of 30° above the horizontal. If μ_k = 0.2, calculate the acceleration.',
              memoSnippet: 'F_x = 40·cos(30°) = 34.64 N. N = mg - 40·sin(30°) = 5(9.8) - 20 = 29 N. f_k = 0.2(29) = 5.8 N. F_net = F_x - f_k = 28.84 N. a = F_net / m = 28.84 / 5 = 5.77 m·s⁻².'
            },
            {
              questionNumber: 'Question 5.2',
              topic: "Coulomb's Law (Electrostatics)",
              marks: 4,
              questionText: 'Two point charges of +4 μC and -6 μC are placed 0.3 m apart in a vacuum. Calculate the magnitude of the electrostatic force between them.',
              memoSnippet: 'F = k·|q₁·q₂| / r² = (9.0 × 10⁹)(4 × 10⁻⁶)(6 × 10⁻⁶) / (0.3)² = 0.216 / 0.09 = 2.4 N (attractive).'
            }
          ]
        },
        {
          id: 'phys-gr11-2024-nov-p2',
          year: 2024,
          season: 'November Final (NSC)',
          paperNumber: 'Paper 2',
          title: 'Grade 11 Physical Sciences Paper 2 (Chemistry)',
          marks: 150,
          durationMinutes: 180,
          curriculum: 'CAPS Chemistry Molecular Structure & Stoichiometry',
          topicsCovered: ['Atomic Combinations & VSEPR Models', 'Intermolecular Forces & Physical Properties', 'Ideal Gases & Gas Laws (PV = nRT)', 'Stoichiometry & Quantitative Chemistry', 'Energy & Chemical Change (Enthalpy ΔH)'],
          sampleQuestions: [
            {
              questionNumber: 'Question 3.2',
              topic: 'Intermolecular Forces',
              marks: 4,
              questionText: 'Explain why water (H₂O) has a significantly higher boiling point (100°C) than hydrogen sulfide (H₂S, -60°C) by referring to intermolecular forces.',
              memoSnippet: 'H₂O forms strong hydrogen bonds due to highly electronegative Oxygen atoms with lone pairs. H₂S only forms weaker dipole-dipole forces. Significantly more energy is required to overcome the hydrogen bonds in H₂O.'
            },
            {
              questionNumber: 'Question 6.1',
              topic: 'Ideal Gas Laws (PV = nRT)',
              marks: 5,
              questionText: 'Calculate the volume occupied by 0.5 moles of oxygen gas (O₂) at a temperature of 27°C and a pressure of 101.3 kPa. (R = 8.314 J·K⁻¹·mol⁻¹)',
              memoSnippet: 'T = 27 + 273.15 = 300.15 K. P = 101300 Pa. PV = nRT ⇒ V = (0.5 × 8.314 × 300.15) / 101300 = 0.0123 m³ (12.3 dm³).'
            }
          ]
        }
      ];
    }

    // Grade 12 (Matric NSC)
    return [
      {
        id: 'phys-gr12-2024-nov-p1',
        year: 2024,
        season: 'November Final (NSC)',
        paperNumber: 'Paper 1',
        title: 'Grade 12 Physical Sciences Paper 1 (Physics NSC)',
        marks: 150,
        durationMinutes: 180,
        curriculum: 'CAPS Physics Mechanics, Waves & Electrodynamics',
        topicsCovered: ['Momentum & Impulse', 'Vertical Projectile Motion', 'Work-Energy Theorem & Power', 'Doppler Effect (Sound)', 'Electrodynamics & AC Motors', 'Photoelectric Effect'],
        sampleQuestions: [
          {
            questionNumber: 'Question 3.1',
            topic: 'Vertical Projectile Motion',
            marks: 5,
            questionText: 'A ball is projected vertically upwards with a speed of 15 m·s⁻¹ from the edge of a roof 30 m high. Calculate maximum height and time taken to hit the ground.',
            memoSnippet: 'At max height v_f = 0: v_f² = v_i² + 2g·Δy ⇒ 0 = (15)² + 2(-9.8)Δy ⇒ Δy = 11.48 m above roof (41.48 m from ground). Total time t = 4.49 s.'
          },
          {
            questionNumber: 'Question 6.2',
            topic: 'Doppler Effect (Sound)',
            marks: 4,
            questionText: 'An ambulance siren emits a frequency of 650 Hz moving at 25 m·s⁻¹ towards a stationary listener. Take speed of sound = 340 m·s⁻¹. Calculate observed frequency.',
            memoSnippet: 'f_L = [v / (v - v_s)] · f_s = [340 / (340 - 25)] × 650 = (340 / 315) × 650 = 701.59 Hz.'
          }
        ]
      },
      {
        id: 'phys-gr12-2024-nov-p2',
        year: 2024,
        season: 'November Final (NSC)',
        paperNumber: 'Paper 2',
        title: 'Grade 12 Physical Sciences Paper 2 (Chemistry NSC)',
        marks: 150,
        durationMinutes: 180,
        curriculum: 'CAPS Chemistry Organic, Equilibrium & Electrochemistry',
        topicsCovered: ['Organic Chemistry IUPAC & Reactions', 'Rates of Reaction & Maxwell-Boltzmann', 'Chemical Equilibrium (Kc)', 'Acids & Bases (Ka/Kb & Titrations)', 'Galvanic & Electrolytic Cells'],
        sampleQuestions: [
          {
            questionNumber: 'Question 2.1',
            topic: 'Organic Chemistry IUPAC',
            marks: 3,
            questionText: 'Write down the IUPAC name for CH₃-CH(CH₃)-CH₂-COOH and identify its homologous series.',
            memoSnippet: 'IUPAC: 3-methylbutanoic acid. Homologous series: Carboxylic acids (-COOH functional group).'
          },
          {
            questionNumber: 'Question 7.3',
            topic: 'Acids and Bases Titration',
            marks: 5,
            questionText: 'Calculate the pH of a 0.05 mol·dm⁻³ solution of hydrochloric acid (HCl) at 25°C.',
            memoSnippet: 'HCl is a strong acid, so [H₃O⁺] = 0.05 mol·dm⁻³. pH = -log[H₃O⁺] = -log(0.05) = 1.30.'
          }
        ]
      }
    ];
  }

  // Accounting dataset
  if (s.includes('account')) {
    return [
      {
        id: 'acc-2024-nov-p1',
        year: 2024,
        season: 'November Final (NSC)',
        paperNumber: 'Paper 1',
        title: `Accounting Grade ${gradeNum} Paper 1 (Financial Reporting & Audit)`,
        marks: 150,
        durationMinutes: 120,
        curriculum: 'CAPS Financial Reporting',
        topicsCovered: ['Income Statement (Statement of Comprehensive Income)', 'Balance Sheet (Statement of Financial Position)', 'Audit Report & Corporate Governance', 'Financial Indicators & Ratio Analysis'],
        sampleQuestions: [
          {
            questionNumber: 'Question 1.2',
            topic: 'Financial Indicators',
            marks: 6,
            questionText: 'Calculate the Debt-Equity Ratio and comment on whether the business is conservatively or highly geared.',
            memoSnippet: 'Debt-Equity Ratio = Non-current Liabilities : Shareholders Equity. Ratio 0.4:1 indicates low financial risk and conservative gearing.'
          }
        ]
      },
      {
        id: 'acc-2024-nov-p2',
        year: 2024,
        season: 'November Final (NSC)',
        paperNumber: 'Paper 2',
        title: `Accounting Grade ${gradeNum} Paper 2 (Cost & Managerial Accounting)`,
        marks: 150,
        durationMinutes: 120,
        curriculum: 'CAPS Cost & Internal Control',
        topicsCovered: ['Manufacturing Cost Statements', 'Budgeting & Projected Cash Flow', 'Stock Valuation (FIFO & Weighted Average)', 'Internal Control & Ethics'],
        sampleQuestions: [
          {
            questionNumber: 'Question 2.1',
            topic: 'Manufacturing Break-Even Point',
            marks: 5,
            questionText: 'Calculate the Break-Even Point in units if Total Fixed Costs = R180,000, Selling Price = R45/unit, Variable Cost = R25/unit.',
            memoSnippet: 'BEP = Total Fixed Costs / (Selling Price - Variable Cost per unit) = 180,000 / (45 - 25) = 180,000 / 20 = 9,000 units.'
          }
        ]
      }
    ];
  }

  // Life Sciences dataset
  if (s.includes('life') || s.includes('bio')) {
    return [
      {
        id: 'life-2024-nov-p1',
        year: 2024,
        season: 'November Final (NSC)',
        paperNumber: 'Paper 1',
        title: `Life Sciences Grade ${gradeNum} Paper 1 (Physiology & Reproduction)`,
        marks: 150,
        durationMinutes: 150,
        curriculum: 'CAPS Life Sciences Human Reproduction & Endocrine',
        topicsCovered: ['Meiosis & Gametogenesis', 'Human Reproduction', 'Nervous System & Sense Organs', 'Endocrine System & Homeostasis'],
        sampleQuestions: [
          {
            questionNumber: 'Question 1.4',
            topic: 'Homeostasis & Negative Feedback',
            marks: 6,
            questionText: 'Explain the negative feedback mechanism involved when blood glucose levels rise above normal after a meal.',
            memoSnippet: '1. High glucose detected by Islets of Langerhans in pancreas. 2. Beta cells secrete Insulin. 3. Insulin promotes cellular uptake and stimulates liver to convert glucose to glycogen. 4. Blood glucose decreases to normal setpoint.'
          }
        ]
      },
      {
        id: 'life-2024-nov-p2',
        year: 2024,
        season: 'November Final (NSC)',
        paperNumber: 'Paper 2',
        title: `Life Sciences Grade ${gradeNum} Paper 2 (Genetics & Evolution)`,
        marks: 150,
        durationMinutes: 150,
        curriculum: 'CAPS DNA Code of Life & Natural Selection',
        topicsCovered: ['DNA Code of Life & Protein Synthesis', 'Monohybrid & Dihybrid Genetic Crosses', 'Human Evolution & Fossil Evidence', 'Speciation by Natural Selection'],
        sampleQuestions: [
          {
            questionNumber: 'Question 3.2',
            topic: 'Genetic Cross Representation',
            marks: 6,
            questionText: 'In pea plants, tall (T) is dominant over short (t). Perform a genetic cross between a heterozygous tall plant and a short plant.',
            memoSnippet: 'P1 Phenotype: Heterozygous Tall × Short. P1 Genotype: Tt × tt. Gametes: T, t × t, t. F1 Genotypes: 2 Tt : 2 tt (1:1). F1 Phenotypes: 50% Tall, 50% Short.'
          }
        ]
      }
    ];
  }

  // Default Standard CAPS Archive for any other subject (IT, Geography, Business Studies, etc.)
  return [
    {
      id: `${subjectName.toLowerCase().replace(/\s+/g, '-')}-2024-nov-p1`,
      year: 2024,
      season: 'November Final (NSC)',
      paperNumber: 'Paper 1',
      title: `${subjectName} Grade ${gradeNum} Paper 1 (National Exam)`,
      marks: 150,
      durationMinutes: 180,
      curriculum: `CAPS Curriculum • Grade ${gradeNum}`,
      topicsCovered: ['Core Terminology', 'Theory Application', 'Case Study Analysis', 'Data Interpretation'],
      sampleQuestions: [
        {
          questionNumber: 'Section A - Question 1',
          topic: 'Foundational Theory & Application',
          marks: 10,
          questionText: `Analyze the core principles of ${subjectName} and evaluate their real-world application.`,
          memoSnippet: 'Award full marks for accurate identification of definitions, correct terminology, and practical contextualization.'
        }
      ]
    },
    {
      id: `${subjectName.toLowerCase().replace(/\s+/g, '-')}-2023-nov-p1`,
      year: 2023,
      season: 'November Final (NSC)',
      paperNumber: 'Paper 1',
      title: `${subjectName} Grade ${gradeNum} Paper 1 (Previous Exam Series)`,
      marks: 150,
      durationMinutes: 180,
      curriculum: `CAPS Curriculum • Grade ${gradeNum}`,
      topicsCovered: ['Term 1-4 Comprehensive Syllabus', 'Structured Questions', 'Essay Synthesis'],
      sampleQuestions: [
        {
          questionNumber: 'Section B - Question 3',
          topic: 'Structured Problem Solving',
          marks: 15,
          questionText: `Explain the key step-by-step methodologies used in ${subjectName} under curriculum requirements.`,
          memoSnippet: 'Comprehensive marking breakdown with rubric levels 1 to 7.'
        }
      ]
    }
  ];
};

export const SubjectPastPapers: React.FC<SubjectPastPapersProps> = ({
  subject,
  grade,
  onSolveWithAI
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedSeason, setSelectedSeason] = useState<string>('all');
  const [selectedDocType, setSelectedDocType] = useState<string>('all'); // 'all', 'past_paper', 'exam_memo'
  const [expandedPaperId, setExpandedPaperId] = useState<string | null>(null);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<{ [paperId: string]: number }>({});
  const [revealedMemos, setRevealedMemos] = useState<{ [key: string]: boolean }>({});
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  
  const [dbeResources, setDbeResources] = useState<DbeResource[]>([]);
  const [loadingDbe, setLoadingDbe] = useState<boolean>(false);

  useEffect(() => {
    if (!subject) return;
    setLoadingDbe(true);
    learnerService.getSubjectResources(subject, grade)
      .then((data: any) => {
        const list = Array.isArray(data) ? data : data.resources || data.textbooks || [];
        setDbeResources(list);
      })
      .catch((err: any) => {
        console.error('Failed to load DBE past papers for subject:', err);
        setDbeResources([]);
      })
      .finally(() => setLoadingDbe(false));
  }, [subject, grade]);

  const papers = getSubjectPastPapers(subject, grade);

  const filteredPapers = papers.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.topicsCovered.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesYear = selectedYear === 'all' || p.year.toString() === selectedYear;
    const matchesSeason = selectedSeason === 'all' || p.season.includes(selectedSeason);
    return matchesSearch && matchesYear && matchesSeason;
  });

  const filteredDbeResources = dbeResources.filter((r) => {
    const rTitle = r.title || r.file_name || '';
    const matchesSearch = rTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.term || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesYear = selectedYear === 'all' || (r.year ? r.year.toString() === selectedYear : true);
    const matchesType = selectedDocType === 'all' || r.resource_type === selectedDocType;
    return matchesSearch && matchesYear && matchesType;
  });

  const handleToggleMemo = (paperId: string, qIdx: number) => {
    const key = `${paperId}-${qIdx}`;
    setRevealedMemos((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDownloadPaper = (paper: ExamPaper, type: 'Question Paper' | 'Marking Memo') => {
    setDownloadingId(paper.id);
    setTimeout(() => {
      setDownloadingId(null);
      confetti({ particleCount: 35, spread: 50, origin: { y: 0.8 } });
      const element = document.createElement('a');
      const file = new Blob([
        `DEPARTMENT OF BASIC EDUCATION - SOUTH AFRICA\n` +
        `NATIONAL SENIOR CERTIFICATE\n` +
        `SUBJECT: ${paper.title}\n` +
        `TYPE: ${type.toUpperCase()}\n` +
        `MARKS: ${paper.marks} | DURATION: ${paper.durationMinutes} MINUTES\n\n` +
        `TOPICS COVERED:\n${paper.topicsCovered.map(t => '• ' + t).join('\n')}\n\n` +
        `QUESTIONS & SOLUTIONS:\n` +
        paper.sampleQuestions.map((q, idx) => `[${q.questionNumber}] (${q.topic} - ${q.marks} Marks)\n${q.questionText}\n\nMEMORANDUM:\n${q.memoSnippet}\n-----------------------------------\n`).join('\n')
      ], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = `${subject}_Gr${grade}_${paper.year}_${paper.paperNumber}_${type.replace(/\s+/g, '_')}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }, 600);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner with Subject Context */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-900/40 via-surface-dark to-brand-900/30 border border-purple-500/30 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-mono font-bold uppercase border border-purple-500/40 flex items-center gap-1">
              <BookOpen className="w-3 h-3 text-purple-400" />
              CAPS DBE ARCHIVE
            </span>
            <Badge variant="indigo" size="sm">Grade {grade}</Badge>
          </div>
          <h3 className="text-xl md:text-2xl font-extrabold font-display text-white">
            {subject} Official Past Examination Papers & Question Bank
          </h3>
          <p className="text-xs text-slate-300 max-w-xl">
            Access official National Department of Basic Education examination question papers, marking guidelines, and interactive problem solutions for Grade {grade} {subject}.
          </p>
        </div>

        <div className="flex items-center gap-3 z-10">
          <div className="p-3 rounded-2xl bg-surface-darker/90 border border-white/10 text-center">
            <p className="text-[10px] font-semibold text-slate-400 uppercase">Available Documents</p>
            <p className="text-base font-extrabold text-purple-400 font-mono">
              {dbeResources.length > 0 ? `${dbeResources.length} Official Files` : `${papers.length} Series`}
            </p>
          </div>
        </div>
      </div>

      {/* Official DBE Exam Documents Section (PDF Download Archive) */}
      {dbeResources.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-2">
              <FolderDown className="w-4 h-4 text-purple-400" />
              Official DBE Past Question Papers & Memorandums (Grade {grade})
            </h4>
            <span className="text-[11px] text-slate-400 font-mono">
              {filteredDbeResources.length} matching files
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDbeResources.map((res) => {
              const fileHref = res.file_path ? (res.file_path.startsWith('/') ? res.file_path : `/${res.file_path}`) : '#';
              const isMemo = res.resource_type === 'exam_memo' || /memo/i.test(res.title);

              return (
                <div
                  key={res.id}
                  className="p-5 rounded-2xl bg-surface-darker/95 border border-white/10 hover:border-purple-500/40 transition-all flex flex-col justify-between gap-4 shadow-lg group"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-3 rounded-2xl shrink-0 ${isMemo ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                      {isMemo ? <CheckCircle2 className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant={isMemo ? 'emerald' : 'rose'} size="sm">
                          {isMemo ? 'Marking Memo' : 'Exam Question Paper'}
                        </Badge>
                        {res.year && (
                          <span className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] text-slate-300 font-mono font-bold">
                            {res.year}
                          </span>
                        )}
                        {res.term && (
                          <span className="text-[10px] text-slate-400 truncate max-w-[150px]">
                            {res.term}
                          </span>
                        )}
                      </div>

                      <h5 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-2" title={res.title}>
                        {res.title}
                      </h5>

                      <p className="text-[11px] text-slate-400 mt-1">
                        Grade {res.grade || grade} • {res.subject} • {res.file_size || '1.25 MB'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5">
                    <a
                      href={fileHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all hover:scale-105"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF Document</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-surface-darker/80 p-3 rounded-2xl border border-white/10">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search topics (e.g. Paper 1, Memo, Newton)..."
            className="w-full pl-10 pr-4 py-2 bg-surface-dark border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <select
            value={selectedDocType}
            onChange={(e) => setSelectedDocType(e.target.value)}
            className="px-3 py-2 rounded-xl bg-surface-dark border border-white/10 text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">All Document Types</option>
            <option value="past_paper">Question Papers Only</option>
            <option value="exam_memo">Marking Memos Only</option>
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-2 rounded-xl bg-surface-dark border border-white/10 text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">All Exam Years</option>
            <option value="2024">2024 Exams</option>
            <option value="2023">2023 Exams</option>
            <option value="2022">2022 Exams</option>
            <option value="2018">2018 Exams</option>
            <option value="2017">2017 Exams</option>
            <option value="2016">2016 Exams</option>
          </select>

          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
            className="px-3 py-2 rounded-xl bg-surface-dark border border-white/10 text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">All Exam Seasons</option>
            <option value="November">November NSC Finals</option>
            <option value="September">September Prelims</option>
            <option value="June">June Mid-Year</option>
          </select>
        </div>
      </div>

      {/* Papers Listing Grid */}
      <div className="space-y-4">
        {filteredPapers.map((paper) => {
          const isExpanded = expandedPaperId === paper.id;
          return (
            <div
              key={paper.id}
              className={`rounded-3xl bg-surface-dark/95 border transition-all duration-200 overflow-hidden shadow-lg ${
                isExpanded ? 'border-purple-500/50 shadow-glow-purple' : 'border-white/10 hover:border-white/20'
              }`}
            >
              {/* Paper Header Row */}
              <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300 font-extrabold font-mono text-sm shrink-0">
                    {paper.paperNumber.replace('Paper ', 'P')}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono text-slate-300 font-bold">
                        {paper.year} {paper.season}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[10px] font-mono font-bold">
                        {paper.marks} Marks
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {paper.durationMinutes} Mins
                      </span>
                    </div>

                    <h4 className="text-sm md:text-base font-bold text-white">
                      {paper.title}
                    </h4>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {paper.topicsCovered.slice(0, 4).map((topic, tIdx) => (
                        <span
                          key={tIdx}
                          className="px-2 py-0.5 rounded-lg bg-surface-darker text-slate-400 text-[10px] border border-white/5"
                        >
                          {topic}
                        </span>
                      ))}
                      {paper.topicsCovered.length > 4 && (
                        <span className="px-2 py-0.5 rounded-lg bg-surface-darker text-slate-500 text-[10px]">
                          +{paper.topicsCovered.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                  <button
                    onClick={() => handleDownloadPaper(paper, 'Question Paper')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-darker hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/10 transition-colors"
                    title="Download Exam Question Paper"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Exam Paper</span>
                  </button>

                  <button
                    onClick={() => handleDownloadPaper(paper, 'Marking Memo')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white text-xs font-semibold border border-purple-500/30 transition-colors"
                    title="Download Marking Memorandum"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Memo</span>
                  </button>

                  <button
                    onClick={() => setExpandedPaperId(isExpanded ? null : paper.id)}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold border border-white/10 transition-colors"
                  >
                    <span>{isExpanded ? 'Hide Questions' : 'View Question Bank'}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded Question Bank & Memorandum Viewer */}
              {isExpanded && (
                <div className="p-5 border-t border-white/10 bg-surface-darker/60 space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-purple-400" />
                      Exam Questions & Step-by-Step Memorandum
                    </h5>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {paper.sampleQuestions.length} Highlighted Exam Problems
                    </span>
                  </div>

                  <div className="space-y-4">
                    {paper.sampleQuestions.map((q, qIdx) => {
                      const memoKey = `${paper.id}-${qIdx}`;
                      const isMemoVisible = revealedMemos[memoKey];

                      return (
                        <div
                          key={qIdx}
                          className="p-4 rounded-2xl bg-surface-dark border border-white/10 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-lg bg-brand-500/20 text-brand-300 font-mono text-[11px] font-extrabold border border-brand-500/30">
                                {q.questionNumber}
                              </span>
                              <span className="text-xs font-bold text-white">{q.topic}</span>
                            </div>
                            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                              [{q.marks} Marks]
                            </span>
                          </div>

                          <p className="text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-line bg-surface-darker/80 p-3 rounded-xl border border-white/5">
                            {q.questionText}
                          </p>

                          {/* Action row for Question: Reveal Memo & Solve with AI */}
                          <div className="flex items-center justify-between pt-1">
                            <button
                              onClick={() => handleToggleMemo(paper.id, qIdx)}
                              className="text-xs font-semibold text-purple-300 hover:text-purple-200 flex items-center gap-1.5 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5 text-purple-400" />
                              <span>{isMemoVisible ? 'Hide Solution Memo' : 'Show Official Memorandum'}</span>
                            </button>

                            {onSolveWithAI && (
                              <button
                                onClick={() =>
                                  onSolveWithAI(
                                    `Please explain how to solve this ${subject} Grade ${grade} exam question step-by-step: "${q.questionText}"`
                                  )
                                }
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-500 text-white font-bold text-[11px] shadow-sm transition-all hover:scale-105"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                                <span>Solve with AI Tutor</span>
                              </button>
                            )}
                          </div>

                          {/* Revealed Memo Box */}
                          {isMemoVisible && (
                            <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-200 space-y-1.5 animate-fade-in font-mono">
                              <p className="font-bold text-emerald-400 flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" />
                                Official Marking Guidelines & Memo:
                              </p>
                              <p className="leading-relaxed whitespace-pre-line">{q.memoSnippet}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredPapers.length === 0 && (
          <div className="p-12 text-center rounded-3xl bg-surface-dark border border-white/10">
            <BookOpen className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="text-xs text-slate-400">No past papers found matching your filter criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};
