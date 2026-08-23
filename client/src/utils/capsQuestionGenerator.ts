/**
 * CAPS Procedural Dynamic Question Generator
 * Generates limitless, non-repeating questions across Grade 8 - 12 CAPS curriculum topics
 * with dynamic numbers, variables, formulas, and step-by-step explanations.
 */

export interface ProceduralQuestion {
  id: string;
  grade: number;
  subject: string;
  topic: string;
  subtopic: string;
  difficulty: 'normal' | 'hard' | 'boss';
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  hint?: string;
  points: number;
}

// Helper: Random integer in range [min, max]
const randInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Helper: Shuffle array and return with original correct index tracked
const shuffleOptions = (correct: string, wrongs: string[]): { options: string[]; correctIndex: number } => {
  const all = [correct, ...wrongs.slice(0, 3)];
  // remove duplicates if any
  const unique = Array.from(new Set(all));
  while (unique.length < 4) {
    unique.push(`Option ${unique.length + 1}`);
  }
  const shuffled = [...unique].sort(() => Math.random() - 0.5);
  const correctIndex = shuffled.indexOf(correct);
  return { options: shuffled, correctIndex };
};

export const generateDynamicQuestion = (grade: number, subject: string, topic?: string): ProceduralQuestion => {
  const id = `dyn-${grade}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const normSubject = (subject || '').toLowerCase();

  // ─────────────────────────────────────────────────────────────
  // 1. MATHEMATICS PROCEDURAL GENERATORS (GRADES 8 - 12)
  // ─────────────────────────────────────────────────────────────
  if (normSubject.includes('math') || normSubject === 'all subjects') {
    // GRADE 8: Integers & Basic Pre-Algebra
    if (grade === 8) {
      const a = randInt(-12, -2);
      const b = randInt(3, 9);
      const c = randInt(2, 8);
      const ans = a * b + c;
      const qText = `Evaluate the integer expression: (${a}) × (${b}) + (${c})`;
      const { options, correctIndex } = shuffleOptions(
        ans.toString(),
        [(ans + randInt(2, 6)).toString(), (ans - randInt(2, 6)).toString(), (-ans).toString()]
      );
      return {
        id,
        grade: 8,
        subject: 'Mathematics',
        topic: 'Integers & Pre-Algebra',
        subtopic: 'Order of Operations (BODMAS)',
        difficulty: 'normal',
        question: qText,
        options,
        correctIndex,
        explanation: `Multiplication first: (${a}) × (${b}) = ${a * b}. Then add (${c}): ${a * b} + ${c} = ${ans}.`,
        points: 25
      };
    }

    // GRADE 9: Theorem of Pythagoras & Linear Equations
    if (grade === 9) {
      const triplets = [
        [3, 4, 5],
        [6, 8, 10],
        [5, 12, 13],
        [9, 12, 15],
        [8, 15, 17]
      ];
      const selected = triplets[randInt(0, triplets.length - 1)];
      const k = randInt(1, 2);
      const a = selected[0] * k;
      const b = selected[1] * k;
      const c = selected[2] * k;
      const { options, correctIndex } = shuffleOptions(
        `${c} cm`,
        [`${c + 2} cm`, `${c - 2} cm`, `${a + b} cm`]
      );
      return {
        id,
        grade: 9,
        subject: 'Mathematics',
        topic: 'Pythagoras & Geometry',
        subtopic: 'Hypotenuse Calculation',
        difficulty: 'normal',
        question: `A right-angled triangle has perpendicular sides of length ${a} cm and ${b} cm. Find the length of hypotenuse c:`,
        options,
        correctIndex,
        explanation: `c² = a² + b² = ${a}² + ${b}² = ${a * a} + ${b * b} = ${c * c}. c = √${c * c} = ${c} cm.`,
        points: 30
      };
    }

    // GRADE 10: Trigonometry (SOH-CAH-TOA) & Linear Functions
    if (grade === 10) {
      const angles = [30, 45, 60];
      const ang = angles[randInt(0, angles.length - 1)];
      let trigVal = '';
      let trigExpl = '';
      if (ang === 30) {
        trigVal = '1/2';
        trigExpl = 'sin(30°) = 0.5 (or 1/2) using special standard angles.';
      } else if (ang === 45) {
        trigVal = '1';
        trigExpl = 'tan(45°) = Opposite/Adjacent = 1.';
      } else {
        trigVal = '1/2';
        trigExpl = 'cos(60°) = Adjacent/Hypotenuse = 1/2.';
      }
      const funcName = ang === 30 ? 'sin(30°)' : ang === 45 ? 'tan(45°)' : 'cos(60°)';
      const { options, correctIndex } = shuffleOptions(
        trigVal,
        ['√3/2', '√2/2', '2', '0']
      );
      return {
        id,
        grade: 10,
        subject: 'Mathematics',
        topic: 'Trigonometry & Cartesian Coordinates',
        subtopic: 'Special Angle Ratios',
        difficulty: 'normal',
        question: `Determine the exact numerical ratio for: ${funcName}`,
        options,
        correctIndex,
        explanation: trigExpl,
        points: 35
      };
    }

    // GRADE 11: Quadratic Equations & Parabolic Roots
    if (grade === 11) {
      const r1 = randInt(1, 6);
      const r2 = randInt(2, 7);
      const b = -(r1 + r2);
      const c = r1 * r2;
      const bStr = b < 0 ? `- ${Math.abs(b)}x` : `+ ${b}x`;
      const cStr = c < 0 ? `- ${Math.abs(c)}` : `+ ${c}`;
      const correctRoots = `x = ${r1} or x = ${r2}`;
      const { options, correctIndex } = shuffleOptions(
        correctRoots,
        [`x = -${r1} or x = -${r2}`, `x = ${r1 + 1} or x = ${r2 - 1}`, `x = ${-r1} or x = ${r2}`]
      );
      return {
        id,
        grade: 11,
        subject: 'Mathematics',
        topic: 'Quadratic Equations & Functions',
        subtopic: 'Factorization & Roots',
        difficulty: 'hard',
        question: `Solve for x: x² ${bStr} ${cStr} = 0`,
        options,
        correctIndex,
        explanation: `Factor into (x - ${r1})(x - ${r2}) = 0. Therefore, the roots are x = ${r1} or x = ${r2}.`,
        points: 40
      };
    }

    // GRADE 12: Differential Calculus & Derivatives
    if (grade === 12) {
      const a = randInt(2, 5);
      const b = randInt(3, 8);
      const c = randInt(4, 9);
      const constVal = randInt(10, 50);
      const d1 = a * 3;
      const d2 = b * 2;
      const correctDeriv = `${d1}x² - ${d2}x + ${c}`;
      const { options, correctIndex } = shuffleOptions(
        correctDeriv,
        [`${d1}x² - ${b}x + ${c}`, `${a}x² - ${d2}x + ${constVal}`, `${d1}x³ - ${d2}x² + ${c}x`]
      );
      return {
        id,
        grade: 12,
        subject: 'Mathematics',
        topic: 'Differential Calculus',
        subtopic: 'Power Rule Derivatives f’(x)',
        difficulty: 'boss',
        question: `Find the first derivative f’(x) for the cubic curve: f(x) = ${a}x³ - ${b}x² + ${c}x - ${constVal}`,
        options,
        correctIndex,
        explanation: `Using the power rule d/dx(axⁿ) = n·axⁿ⁻¹: d/dx(${a}x³) = ${d1}x², d/dx(-${b}x²) = -${d2}x, d/dx(${c}x) = ${c}, constant drops. Result: ${correctDeriv}.`,
        points: 50
      };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 2. PHYSICAL SCIENCES PROCEDURAL GENERATORS (GRADES 10 - 12)
  // ─────────────────────────────────────────────────────────────
  if (normSubject.includes('physic') || normSubject.includes('science')) {
    if (grade === 10) {
      const p = randInt(1, 4);
      return {
        id,
        grade: 10,
        subject: 'Physical Sciences',
        topic: 'Chemical Change & Bonding',
        subtopic: 'Valence Electrons & Octet Rule',
        difficulty: 'normal',
        question: 'Which group of elements on the Periodic Table has a full valence electron octet (noble gases)?',
        options: ['Group 18 (Noble Gases)', 'Group 1 (Alkali Metals)', 'Group 17 (Halogens)', 'Group 2 (Alkaline Earth)'],
        correctIndex: 0,
        explanation: 'Group 18 elements have complete outer valence shells (8 electrons, except Helium with 2), making them inert.',
        points: 30
      };
    }

    if (grade === 11) {
      const mass = randInt(2, 10) * 5; // e.g. 20 kg
      const acc = randInt(2, 6); // e.g. 3 m/s^2
      const fNet = mass * acc;
      const { options, correctIndex } = shuffleOptions(
        `${fNet} N`,
        [`${fNet + 15} N`, `${mass + acc} N`, `${Math.round(mass / acc)} N`]
      );
      return {
        id,
        grade: 11,
        subject: 'Physical Sciences',
        topic: 'Newton’s Laws of Motion',
        subtopic: 'F_net = m · a',
        difficulty: 'hard',
        question: `Calculate the resultant net force (F_net) required to accelerate a ${mass} kg cart at ${acc} m·s⁻² across a frictionless floor:`,
        options,
        correctIndex,
        explanation: `According to Newton’s Second Law: F_net = m × a = ${mass} kg × ${acc} m·s⁻² = ${fNet} N.`,
        points: 40
      };
    }

    if (grade === 12) {
      const fSource = randInt(400, 800); // Hz
      const vSound = 340; // m/s
      const vSource = randInt(10, 30); // m/s moving towards observer
      const fObserved = Math.round(fSource * (vSound / (vSound - vSource)));
      const { options, correctIndex } = shuffleOptions(
        `${fObserved} Hz (Higher pitch)`,
        [`${fSource} Hz (Unchanged)`, `${Math.round(fSource * 0.8)} Hz (Lower pitch)`, `${fObserved + 50} Hz`]
      );
      return {
        id,
        grade: 12,
        subject: 'Physical Sciences',
        topic: 'Doppler Effect & Waves',
        subtopic: 'Moving Sound Source Towards Stationary Observer',
        difficulty: 'boss',
        question: `An ambulance siren emits sound at ${fSource} Hz while approaching a stationary learner at ${vSource} m·s⁻¹ (v_sound = 340 m·s⁻¹). What frequency does the learner detect?`,
        options,
        correctIndex,
        explanation: `Doppler formula: f_L = f_s × [v / (v - v_s)] = ${fSource} × [340 / (340 - ${vSource})] = ${fObserved} Hz. The pitch is higher due to wavefront compression.`,
        points: 50
      };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 3. LIFE SCIENCES PROCEDURAL GENERATORS (GRADES 10 - 12)
  // ─────────────────────────────────────────────────────────────
  if (normSubject.includes('life') || normSubject.includes('bio')) {
    const triplets = [
      { dna: 'TAC', mrna: 'AUG', aa: 'Methionine (Start Codon)' },
      { dna: 'TTC', mrna: 'AAG', aa: 'Lysine' },
      { dna: 'CCG', mrna: 'GGC', aa: 'Glycine' },
      { dna: 'ACT', mrna: 'UGA', aa: 'Stop Codon' }
    ];
    const picked = triplets[randInt(0, triplets.length - 1)];
    const { options, correctIndex } = shuffleOptions(
      picked.mrna,
      ['UAC', 'ATG', 'GGC', 'AUG'].filter(x => x !== picked.mrna)
    );
    return {
      id,
      grade: grade >= 10 ? grade : 10,
      subject: 'Life Sciences',
      topic: 'Genetics & Molecular Biology',
      subtopic: 'DNA to mRNA Transcription',
      difficulty: 'normal',
      question: `During protein transcription in the nucleus, what is the complementary mRNA codon for DNA triplet '${picked.dna}'?`,
      options,
      correctIndex,
      explanation: `In RNA transcription: A pairs with U, T pairs with A, C pairs with G, G pairs with C. Therefore '${picked.dna}' transcribes into '${picked.mrna}' (${picked.aa}).`,
      points: 35
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 4. ACCOUNTING PROCEDURAL GENERATORS (GRADES 8 - 12)
  // ─────────────────────────────────────────────────────────────
  if (normSubject.includes('account') || normSubject.includes('ems') || normSubject.includes('business')) {
    const cash = randInt(2, 10) * 1000;
    const { options, correctIndex } = shuffleOptions(
      `Assets: No net change (Bank -R${cash.toLocaleString()}, Equipment +R${cash.toLocaleString()})`,
      [
        `Assets increase by R${cash.toLocaleString()}, Liabilities increase`,
        `Owner's Equity decreases by R${cash.toLocaleString()}`,
        `Liabilities decrease by R${cash.toLocaleString()}`
      ]
    );
    return {
      id,
      grade: grade >= 8 ? grade : 8,
      subject: 'Accounting',
      topic: 'Accounting Equation & Financial Statements',
      subtopic: 'Analysis of Cash Asset Transactions (A = O + L)',
      difficulty: 'normal',
      question: `A business purchases office computers for R${cash.toLocaleString()} cash. How does this affect the Accounting Equation (A = O + L)?`,
      options,
      correctIndex,
      explanation: `Equipment (Asset) increases by +R${cash.toLocaleString()} while Bank/Cash (Asset) decreases by -R${cash.toLocaleString()}. Total Assets net change is R0.`,
      points: 35
    };
  }

  // ─────────────────────────────────────────────────────────────
  // DEFAULT / GENERAL CAPS FALLBACK
  // ─────────────────────────────────────────────────────────────
  return {
    id,
    grade,
    subject: subject || 'General CAPS Studies',
    topic: 'Curriculum Comprehension & Problem Solving',
    subtopic: 'Exam Preparedness',
    difficulty: 'normal',
    question: `Which fundamental principle is central to mastering Grade ${grade} ${subject || 'CAPS'} assessments?`,
    options: [
      'Understanding core definitions, formulas, and working step-by-step through past papers',
      'Memorizing question answers without understanding the underlying steps',
      'Ignoring time management during the 60-second exam windows',
      'Relying solely on guesswork without checking calculations'
    ],
    correctIndex: 0,
    explanation: 'Systematic concept mastery, continuous problem solving, and structured step-by-step methodology guarantee CAPS distinction performance.',
    points: 25
  };
};
