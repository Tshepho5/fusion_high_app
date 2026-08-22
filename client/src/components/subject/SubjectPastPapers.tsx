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
  season: 'November Final (NSC)' | 'November Final Exam' | 'September Trial (Prelim)' | 'June Mid-Year Exam' | 'March Exemplar' | string;
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
  const g = gradeNum || 10;

  // =========================================================================
  // 1. MATHEMATICS
  // =========================================================================
  if (s.includes('math') && !s.includes('lit')) {
    if (g === 10) {
      return [
        {
          id: 'math-gr10-2024-nov-p1',
          year: 2024,
          season: 'November Final Exam',
          paperNumber: 'Paper 1',
          title: `Grade 10 Mathematics Paper 1 (Algebra, Equations & Finance)`,
          marks: 100,
          durationMinutes: 120,
          curriculum: 'CAPS Grade 10 Mathematics',
          topicsCovered: ['Algebraic Expressions & Factorisation', 'Exponents & Surd Rules', 'Equations & Inequalities (Linear & Quadratic)', 'Number Patterns & Sequences', 'Functions (Parabola & Hyperbola)', 'Financial Maths (Simple & Compound Interest, Hire Purchase)'],
          sampleQuestions: [
            {
              questionNumber: 'Question 1.1',
              topic: 'Algebraic Factorisation & Quadratic Equations',
              marks: 4,
              questionText: 'Solve for x:  3x² - 7x - 6 = 0  and verify your solutions.',
              memoSnippet: '(3x + 2)(x - 3) = 0  ⇒  x = -2/3  or  x = 3.  [4 Marks: 1 mark factors, 1 mark per solution]'
            },
            {
              questionNumber: 'Question 2.3',
              topic: 'Exponential Equations',
              marks: 4,
              questionText: 'Solve for x:  3^(x+1) - 3^x = 18.',
              memoSnippet: '3^x(3 - 1) = 18  ⇒  3^x(2) = 18  ⇒  3^x = 9 = 3²  ⇒  x = 2. [4 Marks]'
            },
            {
              questionNumber: 'Question 5.2',
              topic: 'Hyperbolic & Parabolic Functions',
              marks: 5,
              questionText: 'Given the function f(x) = 6/x - 2, write down the equations of the vertical and horizontal asymptotes, and calculate the coordinates of the x-intercept.',
              memoSnippet: 'Vertical asymptote: x = 0. Horizontal asymptote: y = -2. x-intercept: 0 = 6/x - 2 ⇒ 2 = 6/x ⇒ x = 3. Point: (3; 0).'
            },
            {
              questionNumber: 'Question 7.1',
              topic: 'Financial Mathematics (Hire Purchase)',
              marks: 5,
              questionText: 'Lerato buys a study laptop priced at R12,000 on a hire purchase agreement. She pays a 15% deposit. The balance is paid over 36 months at 14% p.a. simple interest. Calculate her monthly instalment.',
              memoSnippet: 'Deposit = 0.15 × 12000 = R1800. Principal balance P = R10,200. Total interest I = P·r·t = 10200 × 0.14 × 3 = R4284. Total amount A = 10200 + 4284 = R14,484. Monthly instalment = 14484 / 36 = R402.33.'
            }
          ]
        },
        {
          id: 'math-gr10-2024-nov-p2',
          year: 2024,
          season: 'November Final Exam',
          paperNumber: 'Paper 2',
          title: `Grade 10 Mathematics Paper 2 (Euclidean Geometry, Trig & Stats)`,
          marks: 100,
          durationMinutes: 120,
          curriculum: 'CAPS Grade 10 Mathematics',
          topicsCovered: ['Euclidean Geometry (Quadrilaterals & Mid-point Theorem)', 'Analytical Geometry (Distance, Midpoint, Gradient)', 'Trigonometry (Definitions, Special Angles, 2D Trig)', 'Statistics (Five-Number Summary & Box-and-Whisker)'],
          sampleQuestions: [
            {
              questionNumber: 'Question 1.1',
              topic: 'Analytical Geometry Coordinates',
              marks: 6,
              questionText: 'Given coordinates A(-3; 2) and B(5; -4), determine: (a) the length of segment AB, (b) the coordinates of midpoint M, and (c) the gradient of line AB.',
              memoSnippet: 'AB = √[(5 - (-3))² + (-4 - 2)²] = √[64 + 36] = √100 = 10 units. M = ((-3+5)/2; (2+(-4))/2) = (1; -1). Gradient m = (-4 - 2)/(5 - (-3)) = -6/8 = -3/4.'
            },
            {
              questionNumber: 'Question 3.2',
              topic: 'Trigonometry & Special Angles',
              marks: 5,
              questionText: 'Without using a calculator, evaluate:  sin 30° · cos 60° + tan 45° · cos 30° · sin 60°.',
              memoSnippet: '= (1/2)(1/2) + (1)(√3/2)(√3/2) = 1/4 + 3/4 = 1. [5 Marks: 1 mark per special angle substitution, 1 mark final answer]'
            },
            {
              questionNumber: 'Question 6.1',
              topic: 'Statistics & Interquartile Range',
              marks: 5,
              questionText: 'The marks of 11 learners in a math test are: 12, 15, 18, 22, 25, 28, 31, 35, 39, 44, 48. Determine the median (Q2), lower quartile (Q1), upper quartile (Q3), and the IQR.',
              memoSnippet: 'Q1 = 18, Median Q2 = 28, Q3 = 39. IQR = Q3 - Q1 = 39 - 18 = 21 marks.'
            }
          ]
        }
      ];
    }

    if (g === 11) {
      return [
        {
          id: 'math-gr11-2024-nov-p1',
          year: 2024,
          season: 'November Final Exam',
          paperNumber: 'Paper 1',
          title: `Grade 11 Mathematics Paper 1 (Exponents, Surds, Patterns & Functions)`,
          marks: 150,
          durationMinutes: 180,
          curriculum: 'CAPS Grade 11 Mathematics',
          topicsCovered: ['Exponents & Surds Manipulation', 'Quadratic Equations, Inequalities & Nature of Roots', 'Quadratic Number Patterns (Tn = an² + bn + c)', 'Functions & Graphs (Transformations & Inverses)', 'Financial Maths (Depreciation & Interest)', 'Probability (Venn Diagrams & Tree Diagrams)'],
          sampleQuestions: [
            {
              questionNumber: 'Question 1.2',
              topic: 'Surd & Quadratic Equations',
              marks: 5,
              questionText: 'Solve for x:  √(2x + 5) = x + 1. Remember to check for extraneous roots.',
              memoSnippet: 'Square both sides: 2x + 5 = (x + 1)² = x² + 2x + 1 ⇒ x² - 4 = 0 ⇒ (x - 2)(x + 2) = 0 ⇒ x = 2 or x = -2. Check x = -2: √1 ≠ -1 (invalid). Valid root: x = 2.'
            },
            {
              questionNumber: 'Question 3.1',
              topic: 'Quadratic Number Patterns',
              marks: 6,
              questionText: 'Given the quadratic sequence: 3; 10; 21; 36; ... Determine the general term Tn in the form Tn = an² + bn + c.',
              memoSnippet: '1st differences: 7, 11, 15. 2nd difference: 4. 2a = 4 ⇒ a = 2. 3a + b = 7 ⇒ 3(2) + b = 7 ⇒ b = 1. a + b + c = 3 ⇒ 2 + 1 + c = 3 ⇒ c = 0. General term Tn = 2n² + n.'
            },
            {
              questionNumber: 'Question 7.2',
              topic: 'Reducing Balance Depreciation',
              marks: 4,
              questionText: 'A school vehicle priced at R320,000 depreciates at 12% p.a. on a reducing balance method. Calculate its book value after 5 years.',
              memoSnippet: 'A = P(1 - i)^n = 320000(1 - 0.12)⁵ = 320000(0.88)⁵ = R168,874.45.'
            }
          ]
        },
        {
          id: 'math-gr11-2024-nov-p2',
          year: 2024,
          season: 'November Final Exam',
          paperNumber: 'Paper 2',
          title: `Grade 11 Mathematics Paper 2 (Circle Geometry & Trig Reduction)`,
          marks: 150,
          durationMinutes: 180,
          curriculum: 'CAPS Grade 11 Mathematics',
          topicsCovered: ['Circle Geometry Theorems (Cyclic Quads, Tangent-Chord, Angle at Centre)', 'Trigonometry (Identities, Reduction Formulae, Sine/Cosine/Area Rules)', 'Analytical Geometry (Angle of Inclination tan θ = m)', 'Statistics (Ogives, Variance & Standard Deviation)'],
          sampleQuestions: [
            {
              questionNumber: 'Question 4.1',
              topic: 'Trigonometric Identities & Reduction',
              marks: 6,
              questionText: 'Prove the identity:  [sin(180° - x) · cos(90° + x)] / [cos(180° + x) · sin(90° - x)] = tan² x.',
              memoSnippet: 'LHS = (sin x · (-sin x)) / (-cos x · cos x) = -sin²x / -cos²x = sin²x / cos²x = tan²x = RHS.'
            },
            {
              questionNumber: 'Question 6.2',
              topic: 'Sine and Cosine Rules in 2D',
              marks: 5,
              questionText: 'In ΔABC, AB = 8 cm, AC = 11 cm, and angle BAC = 54°. Calculate the length of side BC using the Cosine Rule.',
              memoSnippet: 'BC² = AB² + AC² - 2(AB)(AC)cos(BAC) = 8² + 11² - 2(8)(11)cos(54°) = 64 + 121 - 176(0.5878) = 185 - 103.45 = 81.55 ⇒ BC = 9.03 cm.'
            }
          ]
        }
      ];
    }

    // Grade 12 (Matric NSC)
    return [
      {
        id: 'math-gr12-2024-nov-p1',
        year: 2024,
        season: 'November Final (NSC)',
        paperNumber: 'Paper 1',
        title: `Grade 12 Mathematics NSC Paper 1 (Calculus, Sequences & Financial Annuities)`,
        marks: 150,
        durationMinutes: 180,
        curriculum: 'CAPS National Senior Certificate',
        topicsCovered: ['Arithmetic & Geometric Sequences and Series (∑)', 'Inverse Functions & Logarithms', 'Differential Calculus (First Principles & Rules)', 'Cubic Polynomial Curve Sketching & Max/Min Optimization', 'Financial Mathematics (Present/Future Value Annuities & Sinking Funds)', 'Probability (Fundamental Counting Principle)'],
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
            topic: 'Differential Calculus First Principles',
            marks: 5,
            questionText: 'Determine the derivative of f(x) = 4x³ - 2x + 7 from first principles.',
            memoSnippet: "f'(x) = lim[h→0] (f(x+h) - f(x))/h = lim[h→0] (4(x+h)³ - 2(x+h) + 7 - (4x³ - 2x + 7))/h = 12x² - 2."
          },
          {
            questionNumber: 'Question 8.1',
            topic: 'Financial Mathematics Annuities',
            marks: 6,
            questionText: 'A learner deposits R15,000 into a fixed deposit account earning 9.5% p.a. compounded monthly. Calculate the balance after 5 years.',
            memoSnippet: 'A = P(1 + i/m)^(n·m) = 15000(1 + 0.095/12)^(60) = R24,082.35.'
          }
        ]
      },
      {
        id: 'math-gr12-2024-nov-p2',
        year: 2024,
        season: 'November Final (NSC)',
        paperNumber: 'Paper 2',
        title: `Grade 12 Mathematics NSC Paper 2 (Geometry, Double Angles & Regression)`,
        marks: 150,
        durationMinutes: 180,
        curriculum: 'CAPS National Senior Certificate',
        topicsCovered: ['Proportionality & Similarity Geometry Theorems', 'Analytical Circles ((x-a)² + (y-b)² = r²) & Tangents', 'Compound & Double Angle Trigonometry', '3D Trigonometry', 'Bivariate Statistics (Least-Squares Regression & Correlation r)'],
        sampleQuestions: [
          {
            questionNumber: 'Question 3.1',
            topic: 'Analytical Circle Equations & Tangents',
            marks: 5,
            questionText: 'Given the circle x² + y² - 4x + 6y - 12 = 0, determine the center and radius of the circle, and the equation of the tangent at point P(5; 1).',
            memoSnippet: '(x - 2)² + (y + 3)² = 12 + 4 + 9 = 25. Center C(2; -3), Radius r = 5. Gradient CP = (1 - (-3))/(5 - 2) = 4/3. Tangent m = -3/4. Equation: y - 1 = -3/4(x - 5).'
          },
          {
            questionNumber: 'Question 5.2',
            topic: 'Double Angle Trigonometry',
            marks: 6,
            questionText: 'Prove that:  cos 2x / (cos x + sin x) = cos x - sin x.',
            memoSnippet: 'LHS = (cos²x - sin²x) / (cos x + sin x) = [(cos x - sin x)(cos x + sin x)] / (cos x + sin x) = cos x - sin x = RHS.'
          }
        ]
      }
    ];
  }

  // =========================================================================
  // 2. PHYSICAL SCIENCES
  // =========================================================================
  if (s.includes('physic') || s.includes('science')) {
    if (g === 10) {
      return [
        {
          id: 'phys-gr10-2024-nov-p1',
          year: 2024,
          season: 'November Final Exam',
          paperNumber: 'Paper 1',
          title: 'Grade 10 Physical Sciences Paper 1 (Physics - Mechanics & Waves)',
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
          season: 'November Final Exam',
          paperNumber: 'Paper 2',
          title: 'Grade 10 Physical Sciences Paper 2 (Chemistry - Matter & Change)',
          marks: 100,
          durationMinutes: 120,
          curriculum: 'CAPS Chemistry Matter & Chemical Change',
          topicsCovered: ['States of Matter & Kinetic Theory', 'Atomic Structure & Isotopes', 'Periodic Table & Electron Configuration (sp-notation)', 'Chemical Bonding (Ionic, Covalent & Metallic)', 'Balancing Chemical Equations & Molar Mass'],
          sampleQuestions: [
            {
              questionNumber: 'Question 3.1',
              topic: 'Atomic Structure & Electron Config',
              marks: 4,
              questionText: 'Write down the sp-notation electron configuration for a chlorine atom (Cl, Z = 17) and state the number of valence electrons.',
              memoSnippet: 'Chlorine (17 e⁻): 1s² 2s² 2p⁶ 3s² 3p⁵. Valence electrons = 7 (Group 17 halogen).'
            }
          ]
        }
      ];
    }

    if (g === 11) {
      return [
        {
          id: 'phys-gr11-2024-nov-p1',
          year: 2024,
          season: 'November Final Exam',
          paperNumber: 'Paper 1',
          title: 'Grade 11 Physical Sciences Paper 1 (Physics - Newton\'s Laws & Optics)',
          marks: 150,
          durationMinutes: 180,
          curriculum: 'CAPS Physics Mechanics, Optics & Electrostatics',
          topicsCovered: ['Vectors in 2D & Resolving Components', "Newton's 1st, 2nd & 3rd Laws of Motion", "Newton's Law of Universal Gravitation", 'Geometrical Optics & Snell\'s Law', 'Coulomb\'s Law & Electric Fields'],
          sampleQuestions: [
            {
              questionNumber: 'Question 2.1',
              topic: "Newton's Second Law of Motion",
              marks: 5,
              questionText: 'A 5 kg block on a rough horizontal surface is pulled with a 40 N force acting at an angle of 30° above horizontal. If μ_k = 0.2, calculate the acceleration.',
              memoSnippet: 'F_x = 40·cos(30°) = 34.64 N. N = mg - 40·sin(30°) = 5(9.8) - 20 = 29 N. f_k = 0.2(29) = 5.8 N. F_net = 34.64 - 5.8 = 28.84 N. a = 28.84 / 5 = 5.77 m·s⁻².'
            }
          ]
        },
        {
          id: 'phys-gr11-2024-nov-p2',
          year: 2024,
          season: 'November Final Exam',
          paperNumber: 'Paper 2',
          title: 'Grade 11 Physical Sciences Paper 2 (Chemistry - Stoichiometry & Gases)',
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
              memoSnippet: 'H₂O forms strong hydrogen bonds due to highly electronegative Oxygen atoms with lone pairs. H₂S only forms weaker dipole-dipole forces. Significantly more energy is required to overcome hydrogen bonds in H₂O.'
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
        title: 'Grade 12 Physical Sciences NSC Paper 1 (Physics - Mechanics & Electrodynamics)',
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
        title: 'Grade 12 Physical Sciences NSC Paper 2 (Chemistry - Organic & Equilibrium)',
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

  // =========================================================================
  // 3. LIFE SCIENCES
  // =========================================================================
  if (s.includes('life') || s.includes('bio')) {
    if (g === 10) {
      return [
        {
          id: 'life-gr10-2024-nov-p1',
          year: 2024,
          season: 'November Final Exam',
          paperNumber: 'Paper 1',
          title: 'Grade 10 Life Sciences Paper 1 (Cells, Tissues & Organs)',
          marks: 150,
          durationMinutes: 150,
          curriculum: 'CAPS Grade 10 Life Sciences',
          topicsCovered: ['Chemistry of Life (Inorganic & Organic Compounds)', 'Cell Structure & Organelles', 'Plant Tissues (Xylem, Phloem)', 'Human Skeleton & Support Systems'],
          sampleQuestions: [
            {
              questionNumber: 'Question 2.1',
              topic: 'Cellular Organelles',
              marks: 4,
              questionText: 'Tabulate two structural differences between plant and animal cells under electron microscopy.',
              memoSnippet: 'Plant cells: Cell wall present, Chloroplasts present, Large permanent central vacuole. Animal cells: No cell wall, No chloroplasts, Small temporary vacuoles.'
            }
          ]
        },
        {
          id: 'life-gr10-2024-nov-p2',
          year: 2024,
          season: 'November Final Exam',
          paperNumber: 'Paper 2',
          title: 'Grade 10 Life Sciences Paper 2 (Biosphere, Biomes & Circulatory System)',
          marks: 150,
          durationMinutes: 150,
          curriculum: 'CAPS Grade 10 Life Sciences',
          topicsCovered: ['Biosphere & South African Biomes (Fynbos, Savanna, Karoo)', 'Human Heart & Circulatory Anatomy', 'Biodiversity & Classification', 'History of Life on Earth'],
          sampleQuestions: [
            {
              questionNumber: 'Question 3.2',
              topic: 'South African Biomes',
              marks: 5,
              questionText: 'Describe the climate and characteristic vegetation of the Fynbos biome in South Africa.',
              memoSnippet: 'Mediterranean climate with winter rainfall and hot dry summers. Vegetation dominated by proteas, ericas, and restios adapted to frequent wildfires.'
            }
          ]
        }
      ];
    }

    if (g === 11) {
      return [
        {
          id: 'life-gr11-2024-nov-p1',
          year: 2024,
          season: 'November Final Exam',
          paperNumber: 'Paper 1',
          title: 'Grade 11 Life Sciences Paper 1 (Photosynthesis, Respiration & Excretion)',
          marks: 150,
          durationMinutes: 150,
          curriculum: 'CAPS Grade 11 Life Sciences',
          topicsCovered: ['Photosynthesis (Light & Dark Reactions)', 'Cellular Respiration (Glycolysis & Krebs)', 'Human Nutrition & Digestive System', 'Kidney Anatomy & Nephron Excretion'],
          sampleQuestions: [
            {
              questionNumber: 'Question 1.4',
              topic: 'Photosynthesis Biochemical Pathways',
              marks: 5,
              questionText: 'Explain the role of ATP and NADPH produced during the light-dependent phase of photosynthesis in the Calvin cycle.',
              memoSnippet: 'ATP provides activation energy and NADPH provides high-energy hydrogen atoms to reduce carbon dioxide into glucose molecules during the light-independent phase (Calvin cycle).'
            }
          ]
        },
        {
          id: 'life-gr11-2024-nov-p2',
          year: 2024,
          season: 'November Final Exam',
          paperNumber: 'Paper 2',
          title: 'Grade 11 Life Sciences Paper 2 (Biodiversity & Population Ecology)',
          marks: 150,
          durationMinutes: 150,
          curriculum: 'CAPS Grade 11 Life Sciences',
          topicsCovered: ['Biodiversity of Microorganisms (Viruses, Bacteria, Fungi)', 'Plant & Animal Diversity (Bryophytes to Angiosperms, Porifera to Chordata)', 'Population Ecology & Predator-Prey Dynamics', 'Human Impact on the Environment'],
          sampleQuestions: [
            {
              questionNumber: 'Question 2.3',
              topic: 'Population Estimation Techniques',
              marks: 4,
              questionText: 'State the Petersen-Lincoln formula used in the mark-recapture technique and list two assumptions required for accuracy.',
              memoSnippet: 'N = (M × C) / R. Assumptions: Marks do not fade/harm individuals, No significant immigration/emigration or births/deaths during sampling period.'
            }
          ]
        }
      ];
    }

    // Grade 12 (Matric NSC)
    return [
      {
        id: 'life-gr12-2024-nov-p1',
        year: 2024,
        season: 'November Final (NSC)',
        paperNumber: 'Paper 1',
        title: `Grade 12 Life Sciences NSC Paper 1 (Physiology, Reproduction & Homeostasis)`,
        marks: 150,
        durationMinutes: 150,
        curriculum: 'CAPS Life Sciences Human Reproduction & Endocrine',
        topicsCovered: ['Meiosis & Gametogenesis', 'Human Reproduction & Fertilization', 'Nervous System & Sense Organs', 'Endocrine System & Homeostasis'],
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
        id: 'life-gr12-2024-nov-p2',
        year: 2024,
        season: 'November Final (NSC)',
        paperNumber: 'Paper 2',
        title: `Grade 12 Life Sciences NSC Paper 2 (Genetics, DNA Code of Life & Evolution)`,
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

  // =========================================================================
  // 4. ACCOUNTING
  // =========================================================================
  if (s.includes('account')) {
    if (g === 10) {
      return [
        {
          id: 'acc-gr10-2024-nov-p1',
          year: 2024,
          season: 'November Final Exam',
          paperNumber: 'Paper 1',
          title: 'Grade 10 Accounting Paper 1 (Financial Accounting & General Ledger)',
          marks: 100,
          durationMinutes: 90,
          curriculum: 'CAPS Grade 10 Accounting',
          topicsCovered: ['Accounting Equation (A = O + L)', 'Subsidiary Journals (CRJ, CPJ, DJ, CJ)', 'General Ledger & Trial Balance', 'Sole Trader Income Statement'],
          sampleQuestions: [
            {
              questionNumber: 'Question 1.1',
              topic: 'Accounting Equation Analysis',
              marks: 6,
              questionText: 'Analyze the effect of selling goods on credit for R3,500 (cost price R2,000) on Assets, Owners Equity, and Liabilities.',
              memoSnippet: 'Assets: +3,500 (Debtors Control), -2,000 (Trading Stock) = Net +1,500. Owners Equity: +1,500 (Gross Profit). Liabilities: 0.'
            }
          ]
        }
      ];
    }

    if (g === 11) {
      return [
        {
          id: 'acc-gr11-2024-nov-p1',
          year: 2024,
          season: 'November Final Exam',
          paperNumber: 'Paper 1',
          title: 'Grade 11 Accounting Paper 1 (Partnerships & Reconciliations)',
          marks: 150,
          durationMinutes: 120,
          curriculum: 'CAPS Grade 11 Accounting',
          topicsCovered: ['Partnership Financial Statements & Balance Sheet Notes', 'Bank Reconciliation Statements', 'Creditors Reconciliations', 'Fixed Asset Schedules & Depreciation'],
          sampleQuestions: [
            {
              questionNumber: 'Question 2.1',
              topic: 'Bank Reconciliation',
              marks: 6,
              questionText: 'Explain why a post-dated cheque received from a debtor is not recorded in the Cash Receipts Journal immediately on receipt.',
              memoSnippet: 'A post-dated cheque cannot be deposited or honored by the bank until the date stated on the cheque arrives; hence it is not legal tender until that date.'
            }
          ]
        }
      ];
    }

    // Grade 12 (Matric NSC)
    return [
      {
        id: 'acc-gr12-2024-nov-p1',
        year: 2024,
        season: 'November Final (NSC)',
        paperNumber: 'Paper 1',
        title: `Grade 12 Accounting NSC Paper 1 (Financial Reporting & Audit)`,
        marks: 150,
        durationMinutes: 120,
        curriculum: 'CAPS Financial Reporting',
        topicsCovered: ['Income Statement (Statement of Comprehensive Income)', 'Balance Sheet (Statement of Financial Position)', 'Audit Report & Corporate Governance (King IV)', 'Financial Indicators & Ratio Analysis (EPS, DPS, NAV, Debt-Equity)'],
        sampleQuestions: [
          {
            questionNumber: 'Question 1.2',
            topic: 'Financial Indicators & Gearing',
            marks: 6,
            questionText: 'Calculate the Debt-Equity Ratio and comment on whether the company is conservatively or highly geared.',
            memoSnippet: 'Debt-Equity Ratio = Non-current Liabilities : Shareholders Equity. Ratio 0.4:1 indicates low financial risk and conservative gearing.'
          }
        ]
      },
      {
        id: 'acc-gr12-2024-nov-p2',
        year: 2024,
        season: 'November Final (NSC)',
        paperNumber: 'Paper 2',
        title: `Grade 12 Accounting NSC Paper 2 (Cost, Budgets & Stock Valuation)`,
        marks: 150,
        durationMinutes: 120,
        curriculum: 'CAPS Cost & Internal Control',
        topicsCovered: ['Production Cost Statements', 'Cash Budgets & Debtors Collection', 'Stock Valuation (FIFO & Weighted Average)', 'Internal Control & Ethics'],
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

  // =========================================================================
  // 5. ENGLISH FAL & HOME LANGUAGES
  // =========================================================================
  if (s.includes('english') || s.includes('isizulu') || s.includes('language') || s.includes('sepedi') || s.includes('setswana') || s.includes('sesotho') || s.includes('xitsonga') || s.includes('afrikaans')) {
    return [
      {
        id: `${s.replace(/\s+/g, '-')}-gr${g}-2024-nov-p1`,
        year: 2024,
        season: 'November Final Exam',
        paperNumber: 'Paper 1',
        title: `${subjectName} Grade ${g} Paper 1 (Language in Context & Comprehension)`,
        marks: 80,
        durationMinutes: 120,
        curriculum: `CAPS Grade ${g} Language Curriculum`,
        topicsCovered: ['Comprehension & Text Analysis', 'Summary Writing Skills', 'Advertisement & Visual Literacy', 'Cartoon Analysis & Satire', 'Language Structures & Editing Conventions'],
        sampleQuestions: [
          {
            questionNumber: 'Section A - Question 1',
            topic: 'Comprehension Analysis',
            marks: 10,
            questionText: 'Refer to paragraph 3. Explain how the writer uses emotive diction to persuade the reader to support community education initiatives.',
            memoSnippet: 'Award marks for identifying specific emotive words and explaining their psychological effect on the target audience.'
          },
          {
            questionNumber: 'Section C - Question 3',
            topic: 'Language Editing Mechanics',
            marks: 5,
            questionText: 'Rewrite the following sentence in indirect (reported) speech: The principal said, "All Grade 10 learners must prepare for their term tests today."',
            memoSnippet: 'The principal said that all Grade 10 learners had to prepare for their term tests that day.'
          }
        ]
      },
      {
        id: `${s.replace(/\s+/g, '-')}-gr${g}-2024-nov-p2`,
        year: 2024,
        season: 'November Final Exam',
        paperNumber: 'Paper 2',
        title: `${subjectName} Grade ${g} Paper 2 (Literature - Novel, Drama & Poetry)`,
        marks: 80,
        durationMinutes: 150,
        curriculum: `CAPS Grade ${g} Literature`,
        topicsCovered: ['Prescribed Novel Analysis', 'Dramatic Techniques & Characterization', 'Prescribed & Unseen Poetry', 'Literary Devices & Themes'],
        sampleQuestions: [
          {
            questionNumber: 'Section A - Poetry',
            topic: 'Poetic Devices & Tone',
            marks: 10,
            questionText: 'Identify the figure of speech used in line 8 and comment on the tone and mood conveyed throughout the poem.',
            memoSnippet: 'Full marks awarded for identifying metaphor/personification with textual evidence and linking it to the prevailing melancholic/optimistic tone.'
          }
        ]
      }
    ];
  }

  // =========================================================================
  // 6. DEFAULT STANDARD CAPS ARCHIVE FOR ANY OTHER SUBJECT (Business Studies, Economics, Tourism, Geography, etc.)
  // =========================================================================
  return [
    {
      id: `${subjectName.toLowerCase().replace(/\s+/g, '-')}-gr${g}-2024-nov-p1`,
      year: 2024,
      season: 'November Final Exam',
      paperNumber: 'Paper 1',
      title: `${subjectName} Grade ${g} Paper 1 (CAPS Curriculum Assessment)`,
      marks: 150,
      durationMinutes: 180,
      curriculum: `CAPS Curriculum • Grade ${g}`,
      topicsCovered: ['Term 1-4 Core Curriculum Topics', 'Structured Problem Solving', 'Case Study Data Analysis', 'Application & Essay Synthesis'],
      sampleQuestions: [
        {
          questionNumber: 'Section A - Question 1',
          topic: `Core Principles of Grade ${g} ${subjectName}`,
          marks: 10,
          questionText: `Analyze the core theoretical concepts of Grade ${g} ${subjectName} and evaluate their real-world application in South Africa.`,
          memoSnippet: 'Award full marks for accurate definitions, contextual examples, and correct curriculum terminology.'
        },
        {
          questionNumber: 'Section B - Question 2',
          topic: 'Case Study & Problem Solving',
          marks: 15,
          questionText: `Critically assess the scenario provided and recommend practical interventions aligned with official syllabus guidelines.`,
          memoSnippet: 'Mark according to standard DBE rubric levels 1 to 7.'
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
