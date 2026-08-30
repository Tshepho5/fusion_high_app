const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const pdf = require('pdf-parse');
const path = require('path');
require('dotenv').config();

const scienceCurriculum = require('../curriculum/science');
const generalCurriculum = require('../curriculum/general');
const commerceCurriculum = require('../curriculum/commerce');
const tourismCurriculum = require('../curriculum/tourism');

const curricula = [scienceCurriculum, generalCurriculum, commerceCurriculum, tourismCurriculum];
const aiCurriculum = {};
const activeAssessments = new Map();

curricula.forEach(curric => {
  for (const subject in curric) {
    aiCurriculum[subject] = [...(aiCurriculum[subject] || []), ...curric[subject]];
  }
});

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

async function callAI(prompt, isJson = false, modelOverride = null) {
  if (!genAI) {
    console.warn("[AI SERVICE] AI service is disabled. GEMINI_API_KEY is not set.");
    throw new Error("AI service is currently disabled by configuration.");
  }

  const modelCandidates = modelOverride ? [modelOverride] : ['gemini-3.6-flash', 'gemini-3.5-flash'];
  let lastError = null;

  for (const targetModel of modelCandidates) {
    try {
      const model = genAI.getGenerativeModel({ model: targetModel });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      if (isJson) {
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        try {
          return JSON.parse(cleanedText);
        } catch (e) {
          throw new Error('AI returned invalid JSON: ' + e.message);
        }
      }
      return { text };
    } catch (err) {
      console.warn(`[AI SERVICE] Model ${targetModel} attempt failed: ${err.message}. Trying next candidate...`);
      lastError = err;
    }
  }

  throw lastError || new Error("All AI model attempts failed.");
}

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

function generateCAPSLocalFallback(prompt) {
  console.info('[AI SERVICE] Using resilient Grade-Sensitive CAPS local fallback content generator...');
  const isLesson = prompt.includes('Lesson Plan') || prompt.includes('learning_outcomes');
  const isTest = prompt.includes('Test Paper') || prompt.includes('marking_memo');

  let subject = 'Physical Sciences';
  let grade = '10';
  let topic = 'Curriculum Core';

  const gradeMatch = prompt.match(/Grade[:\s]+([0-9]{1,2})/i) || prompt.match(/Grade\s*([0-9]{1,2})/i);
  if (gradeMatch) grade = String(gradeMatch[1]).trim();

  const promptLower = prompt.toLowerCase();
  if (promptLower.includes('life science') || promptLower.includes('biology')) {
    subject = 'Life Sciences';
  } else if (promptLower.includes('physical science') || promptLower.includes('physics')) {
    subject = 'Physical Sciences';
  } else if (promptLower.includes('math') || promptLower.includes('mathematics')) {
    subject = 'Mathematics';
  } else if (promptLower.includes('accounting') || promptLower.includes('account')) {
    subject = 'Accounting';
  } else if (promptLower.includes('business')) {
    subject = 'Business Studies';
  } else if (promptLower.includes('economic')) {
    subject = 'Economics';
  } else if (promptLower.includes('tourism')) {
    subject = 'Tourism';
  } else if (promptLower.includes('english')) {
    subject = 'English FAL';
  } else {
    const subjMatch = prompt.match(/Subject:\s*([^\n\r\t,]+)/i);
    if (subjMatch) {
      subject = subjMatch[1].replace(/Grade.*/i, '').replace(/Topic.*/i, '').trim() || subject;
    }
  }

  const topicMatch = prompt.match(/Topic:\s*"([^"]+)"/i) || prompt.match(/topic:\s*"([^"]+)"/i) || prompt.match(/Topic:\s*([^\n\r]+)/i);
  if (topicMatch) {
    topic = topicMatch[1].replace(/Duration.*/i, '').replace(/Total.*/i, '').replace(/Lesson Plan.*/i, '').replace(/Test Paper.*/i, '').replace(/Generate.*/i, '').trim() || topic;
  }

  const subLower = subject.toLowerCase();
  const isLifeScience = subLower.includes('life') || subLower.includes('bio');
  const isCommerce = subLower.includes('account') || subLower.includes('business') || subLower.includes('econ');
  const isMath = subLower.includes('math');
  const isPhysics = subLower.includes('physic') || subLower.includes('tech');
  const isTourism = subLower.includes('tour');

  const countMatch = prompt.match(/Generate EXACTLY ([0-9]+) multiple choice/i) || prompt.match(/Generate ([0-9]+)/i) || prompt.match(/count[:\s]+([0-9]+)/i);
  const requestedCount = countMatch ? parseInt(countMatch[1], 10) : 5;

  const marksMatch = prompt.match(/Set the 'marks' for each question to ([0-9]+)/i) || prompt.match(/marks.*:?\s*([0-9]+)/i);
  const requestedMarks = marksMatch ? parseInt(marksMatch[1], 10) : 2;

  const topicQuestionTemplates = [
    {
      stem: (g, s, t, i) => `[Grade ${g} ${s}] Question ${i}: Which fundamental CAPS principle defines the core behavior of ${t}?`,
      correct: (t, i) => `A) Standard CAPS Law of ${t} (Rule ${i})`,
      wrong: (t, i) => [`B) Inverse Exponential Decay of ${t}`, `C) Non-linear Static Equilibrium`, `D) Arbitrary Constant Model`]
    },
    {
      stem: (g, s, t, i) => `[Grade ${g} ${s}] Question ${i}: In a Grade ${g} practical experiment on ${t}, what happens when key parameters double?`,
      correct: (t, i) => `A) The measured output doubles proportionally`,
      wrong: (t, i) => [`B) Output decreases to zero`, `C) Output quadruples exponentially`, `D) No observable change occurs`]
    },
    {
      stem: (g, s, t, i) => `[Grade ${g} ${s}] Question ${i}: Which unit of measurement or standard analytical indicator evaluates ${t}?`,
      correct: (t, i) => `A) Official CAPS SI Unit for ${t}`,
      wrong: (t, i) => [`B) Uncalibrated Percentage Ratio`, `C) Empirical Index B`, `D) Dimensionless Coefficient D`]
    },
    {
      stem: (g, s, t, i) => `[Grade ${g} ${s}] Question ${i}: When solving Grade ${g} exam scenarios on ${t}, which initial step is essential?`,
      correct: (t, i) => `A) State standard formula for ${t} and convert to SI units`,
      wrong: (t, i) => [`B) Multiply all raw values without conversion`, `C) Omit SI unit labels`, `D) Estimate without mathematical derivation`]
    },
    {
      stem: (g, s, t, i) => `[Grade ${g} ${s}] Question ${i}: What is the primary cause of system changes in ${t} according to CAPS theory?`,
      correct: (t, i) => `A) Fluctuations in system energy or core variables`,
      wrong: (t, i) => [`B) Constant room temperature`, `C) Zero net force acting on system`, `D) Equal pressure equilibrium`]
    },
    {
      stem: (g, s, t, i) => `[Grade ${g} ${s}] Question ${i}: Which statement correctly distinguishes primary vs secondary factors in ${t}?`,
      correct: (t, i) => `A) Primary factors directly control the rate of change in ${t}`,
      wrong: (t, i) => [`B) Secondary factors have zero influence`, `C) Both factors are identical`, `D) Neither factor affects ${t}`]
    },
    {
      stem: (g, s, t, i) => `[Grade ${g} ${s}] Question ${i}: In an official DBE assessment on ${t}, how is the net rate of change calculated?`,
      correct: (t, i) => `A) Net Rate = Total Change / Time Elapsed`,
      wrong: (t, i) => [`B) Net Rate = Time * Constant`, `C) Net Rate = Initial Value + Final Value`, `D) Net Rate = Zero`]
    },
    {
      stem: (g, s, t, i) => `[Grade ${g} ${s}] Question ${i}: How does increasing temperature or energy affect the rate of process in ${t}?`,
      correct: (t, i) => `A) Increases particle kinetic energy, leading to more effective interactions`,
      wrong: (t, i) => [`B) Decreases molecular movement`, `C) Causes complete cessation of process`, `D) Has no thermal impact`]
    },
    {
      stem: (g, s, t, i) => `[Grade ${g} ${s}] Question ${i}: Which graphical trend best illustrates the relationship between key variables in ${t}?`,
      correct: (t, i) => `A) Direct linear proportionality graph passing through the origin`,
      wrong: (t, i) => [`B) Horizontal flat line with zero slope`, `C) Random scattered dots`, `D) Negative hyperbola curve`]
    },
    {
      stem: (g, s, t, i) => `[Grade ${g} ${s}] Question ${i}: Which safety or methodology rule must be observed during tasks on ${t}?`,
      correct: (t, i) => `A) Calibrate instruments and wear required protective equipment`,
      wrong: (t, i) => [`B) Mix reagents without measuring`, `C) Ignore control group data`, `D) Discard raw measurements`]
    },
    {
      stem: (g, s, t, i) => `[Grade ${g} ${s}] Question ${i}: What is the structural impact of introducing a catalyst or external agent to ${t}?`,
      correct: (t, i) => `A) Lowers activation energy required for ${t} without being consumed`,
      wrong: (t, i) => [`B) Stops reaction completely`, `C) Permanently alters chemical composition of products`, `D) Reduces yield to zero`]
    },
    {
      stem: (g, s, t, i) => `[Grade ${g} ${s}] Question ${i}: In financial or quantitative modeling of ${t}, how is net yield determined?`,
      correct: (t, i) => `A) Net Yield = Total Inflow - Total Outflow`,
      wrong: (t, i) => [`B) Net Yield = Inflow * 0`, `C) Net Yield = Outflow / 2`, `D) Net Yield = Gross Cost`]
    },
    {
      stem: (g, s, t, i) => `[Grade ${g} ${s}] Question ${i}: Which conservation law applies directly to physical/chemical processes in ${t}?`,
      correct: (t, i) => `A) Law of Conservation of Mass and Energy`,
      wrong: (t, i) => [`B) Law of Variable Friction`, `C) Rule of Static Loss`, `D) Constant Entropy Reduction`]
    },
    {
      stem: (g, s, t, i) => `[Grade ${g} ${s}] Question ${i}: What happens to ${t} when an isolated system reaches dynamic equilibrium?`,
      correct: (t, i) => `A) Forward and reverse process rates become equal`,
      wrong: (t, i) => [`B) All movement stops permanently`, `C) Reactants disappear completely`, `D) Pressure drops to absolute zero`]
    },
    {
      stem: (g, s, t, i) => `[Grade ${g} ${s}] Question ${i}: Which recommendation guarantees maximum marks when solving structured questions on ${t}?`,
      correct: (t, i) => `A) Show formula, substitution, final answer with correct units`,
      wrong: (t, i) => [`B) Write final answer without working`, `C) Omit unit labels`, `D) Guess without calculation`]
    }
  ];

  function expandQuestionPool(baseQuestions) {
    const result = [];
    for (let i = 0; i < requestedCount; i++) {
      if (i < baseQuestions.length) {
        const base = baseQuestions[i];
        const opts = Array.isArray(base.options) && base.options.length >= 4 
          ? base.options 
          : [`A) ${base.answer || 'Option A'}`, `B) Alternative Option 1`, `C) Alternative Option 2`, `D) Alternative Option 3`].slice(0, 4);

        result.push({
          id: i + 1,
          question: base.question,
          type: 'multiple_choice',
          options: opts,
          answer: base.answer || opts[0],
          marks: requestedMarks
        });
      } else {
        const qNum = i + 1;
        const tmpl = topicQuestionTemplates[(qNum - 1) % topicQuestionTemplates.length];
        const correctOpt = tmpl.correct(topic, qNum);
        const wrongOpts = tmpl.wrong(topic, qNum);

        const opts = [correctOpt, ...wrongOpts].sort(() => Math.random() - 0.5);

        result.push({
          id: qNum,
          question: tmpl.stem(grade, subject, topic, qNum),
          type: 'multiple_choice',
          options: opts,
          answer: correctOpt,
          marks: requestedMarks
        });
      }
    }
    return { questions: result };
  }

  if (isLesson) {
    let outcomes = [
      `Understand DBE CAPS Grade ${grade} theoretical standards for ${topic}.`,
      `Apply Grade ${grade} cognitive levels and problem-solving techniques to ${topic}.`,
      `Demonstrate CAPS exam-level proficiency in answering Grade ${grade} questions.`
    ];

    if (isLifeScience) {
      if (grade === '12') {
        outcomes = [
          `Master Grade 12 CAPS concepts of ${topic} (e.g. DNA replication, protein synthesis, genetic inheritance & meiosis).`,
          `Analyze Grade 12 biological diagrams, genetic crosses (Punnett squares), and nucleotide sequences.`,
          `Apply Grade 12 cognitive skills to evaluate genetic mutations, homeostasis, and natural selection.`
        ];
      } else if (grade === '11') {
        outcomes = [
          `Understand Grade 11 CAPS biodiversity standards, micro-organisms, cellular respiration, and human nutrition.`,
          `Describe light-dependent thylakoid reactions in photosynthesis and nutrient absorption in the human gut.`,
          `Demonstrate Grade 11 scientific inquiry skills in biological experimentation.`
        ];
      } else {
        outcomes = [
          `Understand Grade 10 CAPS fundamentals of organic molecules, cell organelles, and plant/animal tissues.`,
          `Identify microscopic cell structures and differentiate plant vs animal organ systems.`,
          `Demonstrate Grade 10 introductory biological classification techniques.`
        ];
      }
    } else if (isCommerce) {
      if (grade === '12') {
        outcomes = [
          `Prepare Grade 12 Public Company Financial Statements (Income Statement, Balance Sheet, Cash Flow Statement).`,
          `Calculate and interpret Grade 12 financial indicators (Solvency, Liquidity, Debt-Equity, ROSH).`,
          `Evaluate corporate governance principles under the King IV Code.`
        ];
      } else if (grade === '11') {
        outcomes = [
          `Prepare Grade 11 Partnership Financial Statements and partner Current Accounts.`,
          `Calculate Asset Disposal and Depreciation (Diminishing Balance vs Equal Installments).`,
          `Perform Bank Reconciliation Statements and Perpetual Inventory adjustments.`
        ];
      } else {
        outcomes = [
          `Understand Grade 10 Accounting Equation fundamentals (Assets = Owner's Equity + Liabilities).`,
          `Record cash and credit transactions in primary subsidiary journals (CRJ, CPJ, DJ, CJ).`,
          `Post journal entries to the General Ledger and draft a Trial Balance.`
        ];
      }
    }

    return {
      lesson_plan: {
        title: `DBE CAPS Grade ${grade} ${subject}: ${topic} Lesson Plan`,
        subject,
        grade,
        duration: '60 Minutes',
        term_week: `Term 3 (Grade ${grade} CAPS Standard)`,
        learning_outcomes: outcomes,
        prior_knowledge: `Prerequisite Grade ${parseInt(grade) - 1 || 9} ${subject} foundation knowledge.`,
        teacher_activities: {
          intro: `Introduce ${topic} at Grade ${grade} CAPS difficulty level using real-world context.`,
          presentation: `Deliver formal Grade ${grade} theory presentation, structural diagrams, and step-by-step worked examples.`,
          practice: `Facilitate pairs problem-solving using Grade ${grade} CAPS past exam items.`,
          conclusion: `Summarize Grade ${grade} key takeaways and assign homework exercise.`
        },
        learner_activities: {
          classwork: `Complete Grade ${grade} Textbook Practice Exercise on ${topic}.`,
          homework: `Solve Grade ${grade} CAPS Examination Preparation Questions 1-5.`
        },
        assessment_strategy: `Formative evaluation aligned with Grade ${grade} DBE CAPS cognitive weightings.`,
        resources_needed: [`CAPS Grade ${grade} ${subject} Textbook`, `Grade ${grade} Exam Study Guide`, `Scientific/Financial Calculator`]
      }
    };
  } else if (isTest) {
    let sections = [];
    let memo = [];

    if (isLifeScience) {
      if (grade === '12') {
        sections = [
          {
            section_title: `SECTION A: Grade 12 Genetics & DNA Terminology (10 Marks)`,
            questions: [
              { q_num: '1.1', question_text: `Which enzyme unwinds the DNA double helix during DNA replication in ${topic}?`, marks: 5 },
              { q_num: '1.2', question_text: `If a heterozygous black guinea pig (Bb) is crossed with a white guinea pig (bb), what is the probability of white offspring?`, marks: 5 }
            ]
          },
          {
            section_title: `SECTION B: Grade 12 Protein Synthesis & Genetic Crosses (40 Marks)`,
            questions: [
              { q_num: '2.1', question_text: `Describe the process of transcription during protein synthesis in Grade 12 Life Sciences.`, marks: 10 },
              { q_num: '2.2', question_text: `Explain non-disjunction during Meiosis I and state its genetic consequence in humans.`, marks: 15 },
              { q_num: '2.3', question_text: `Differentiate between Darwinian evolution by natural selection and Lamarckian theory.`, marks: 15 }
            ]
          }
        ];
        memo = [
          { q_num: '1.1', expected_answer: 'DNA Helicase', mark_breakdown: '5 Marks' },
          { q_num: '1.2', expected_answer: '50% (Ratio 1:1)', mark_breakdown: '5 Marks' },
          { q_num: '2.1', expected_answer: 'DNA unwinds (2m), mRNA forms complementary strand (4m), moves to ribosome (4m).', mark_breakdown: '10 Marks' },
          { q_num: '2.2', expected_answer: 'Homologous chromosome pairs fail to separate (5m), resulting in gametes with n+1 or n-1 chromosomes e.g. Down Syndrome (10m).', mark_breakdown: '15 Marks' },
          { q_num: '2.3', expected_answer: 'Darwin: natural variation & survival of fittest (8m); Lamarck: acquired traits inherited (7m).', mark_breakdown: '15 Marks' }
        ];
      } else if (grade === '11') {
        sections = [
          {
            section_title: `SECTION A: Grade 11 Biodiversity & Micro-organisms (10 Marks)`,
            questions: [
              { q_num: '1.1', question_text: `Which structural feature distinguishes viruses from bacteria in Grade 11 Life Sciences?`, marks: 5 },
              { q_num: '1.2', question_text: `Where do the light-dependent reactions of photosynthesis take place in plant cells?`, marks: 5 }
            ]
          },
          {
            section_title: `SECTION B: Grade 11 Respiration & Digestion Processes (40 Marks)`,
            questions: [
              { q_num: '2.1', question_text: `Explain the structural adaptations of villi in the small intestine for nutrient absorption.`, marks: 10 },
              { q_num: '2.2', question_text: `Describe the steps of anaerobic respiration (fermentation) in yeast cells vs human muscle cells.`, marks: 15 },
              { q_num: '2.3', question_text: `Analyze the role of nitrogen-fixing bacteria in ecological nutrient cycles.`, marks: 15 }
            ]
          }
        ];
        memo = [
          { q_num: '1.1', expected_answer: 'Viruses are acellular with protein capsids; bacteria are cellular prokaryotes with cell walls.', mark_breakdown: '5 Marks' },
          { q_num: '1.2', expected_answer: 'Thylakoid Membrane inside Chloroplasts', mark_breakdown: '5 Marks' },
          { q_num: '2.1', expected_answer: 'Large surface area (3m), thin epithelial layer (3m), dense blood capillaries & lacteals (4m).', mark_breakdown: '10 Marks' },
          { q_num: '2.2', expected_answer: 'Yeast produces ethanol + CO2 (7m); Muscle produces lactic acid (8m).', mark_breakdown: '15 Marks' },
          { q_num: '2.3', expected_answer: 'Converts atmospheric N2 into nitrates usable by plants for protein synthesis.', mark_breakdown: '15 Marks' }
        ];
      } else {
        sections = [
          {
            section_title: `SECTION A: Grade 10 Cell Biology & Monomers (10 Marks)`,
            questions: [
              { q_num: '1.1', question_text: `Which organelle is the site of cellular respiration in plant and animal cells?`, marks: 5 },
              { q_num: '1.2', question_text: `What organic monomer unit forms proteins when linked by peptide bonds?`, marks: 5 }
            ]
          },
          {
            section_title: `SECTION B: Grade 10 Plant/Animal Tissues & Organs (40 Marks)`,
            questions: [
              { q_num: '2.1', question_text: `State three structural differences between plant cells and animal cells.`, marks: 10 },
              { q_num: '2.2', question_text: `Describe the structure and transport function of xylem tissue in vascular plants.`, marks: 15 },
              { q_num: '2.3', question_text: `Explain the importance of water as an inorganic molecule for metabolic reactions.`, marks: 15 }
            ]
          }
        ];
        memo = [
          { q_num: '1.1', expected_answer: 'Mitochondrion', mark_breakdown: '5 Marks' },
          { q_num: '1.2', expected_answer: 'Amino Acids', mark_breakdown: '5 Marks' },
          { q_num: '2.1', expected_answer: 'Plant: cell wall (3m), chloroplasts (3m), large central vacuole (4m).', mark_breakdown: '10 Marks' },
          { q_num: '2.2', expected_answer: 'Lignified dead vessel elements (7m) transport water & minerals upward (8m).', mark_breakdown: '15 Marks' },
          { q_num: '2.3', expected_answer: 'Universal solvent (5m), temperature buffer (5m), reactant in hydrolysis (5m).', mark_breakdown: '15 Marks' }
        ];
      }
    } else if (isCommerce) {
      if (grade === '12') {
        sections = [
          {
            section_title: `SECTION A: Grade 12 Corporate Financial Ratios (10 Marks)`,
            questions: [
              { q_num: '1.1', question_text: `Which financial ratio measures a public company's return on share capital equity?`, marks: 5 },
              { q_num: '1.2', question_text: `In a Cash Flow Statement, cash paid for dividends is classified under which activity?`, marks: 5 }
            ]
          },
          {
            section_title: `SECTION B: Grade 12 Companies Statements & Audit Reports (40 Marks)`,
            questions: [
              { q_num: '2.1', question_text: `Prepare the Retained Income Note for a Public Company in Grade 12 Accounting.`, marks: 10 },
              { q_num: '2.2', question_text: `Calculate Solvency Ratio and Debt-Equity Ratio from provided Balance Sheet figures.`, marks: 15 },
              { q_num: '2.3', question_text: `Evaluate an Independent Auditor's Qualified Report according to the King IV Code.`, marks: 15 }
            ]
          }
        ];
        memo = [
          { q_num: '1.1', expected_answer: 'Return on Shareholders Equity (ROSH)', mark_breakdown: '5 Marks' },
          { q_num: '1.2', expected_answer: 'Operating Activities', mark_breakdown: '5 Marks' },
          { q_num: '2.1', expected_answer: 'Balance at start (2m) + Net profit after tax (4m) - Dividends (4m).', mark_breakdown: '10 Marks' },
          { q_num: '2.2', expected_answer: 'Total Assets : Total Liabilities (7m); Non-current Liabilities : Shareholders Equity (8m).', mark_breakdown: '15 Marks' },
          { q_num: '2.3', expected_answer: 'Qualified opinion indicates material misstatement or scope limitation in financial records.', mark_breakdown: '15 Marks' }
        ];
      } else {
        sections = [
          {
            section_title: `SECTION A: Grade 10 Accounting Equation & Journals (10 Marks)`,
            questions: [
              { q_num: '1.1', question_text: `If a business purchases equipment for R5,000 cash, what is the net change in total Assets?`, marks: 5 },
              { q_num: '1.2', question_text: `Which subsidiary journal is used to record cash sales of merchandise?`, marks: 5 }
            ]
          },
          {
            section_title: `SECTION B: Grade 10 General Ledger & Trial Balance (40 Marks)`,
            questions: [
              { q_num: '2.1', question_text: `Explain the rule of Double Entry Accounting for Assets and Owner's Equity.`, marks: 10 },
              { q_num: '2.2', question_text: `Post cash transactions from CRJ into the Bank General Ledger account.`, marks: 15 },
              { q_num: '2.3', question_text: `Draft a Trial Balance and verify debit and credit equality.`, marks: 15 }
            ]
          }
        ];
        memo = [
          { q_num: '1.1', expected_answer: 'R0 (Equipment increases by R5,000, Cash decreases by R5,000)', mark_breakdown: '5 Marks' },
          { q_num: '1.2', expected_answer: 'Cash Receipts Journal (CRJ)', mark_breakdown: '5 Marks' },
          { q_num: '2.1', expected_answer: 'Assets increase on Debit side (5m); Owner Equity increases on Credit side (5m).', mark_breakdown: '10 Marks' },
          { q_num: '2.2', expected_answer: 'Opening balance (3m) + Total Receipts (6m) = Closing Balance (6m).', mark_breakdown: '15 Marks' },
          { q_num: '2.3', expected_answer: 'All debit balances listed (7m), credit balances listed (7m), totals match (1m).', mark_breakdown: '15 Marks' }
        ];
      }
    } else {
      sections = [
        {
          section_title: `SECTION A: Grade ${grade} CAPS Multiple Choice (10 Marks)`,
          questions: [
            { q_num: '1.1', question_text: `Which Grade ${grade} principle governs core calculations in ${topic}?`, marks: 5 },
            { q_num: '1.2', question_text: `What is the standard Grade ${grade} formula applied to ${topic}?`, marks: 5 }
          ]
        },
        {
          section_title: `SECTION B: Grade ${grade} Structured Application (40 Marks)`,
          questions: [
            { q_num: '2.1', question_text: `State the Grade ${grade} CAPS definition for ${topic}.`, marks: 10 },
            { q_num: '2.2', question_text: `Solve a Grade ${grade} exam scenario problem for ${topic}. Show all working.`, marks: 15 },
            { q_num: '2.3', question_text: `Analyze the Grade ${grade} practical application of ${topic} variables.`, marks: 15 }
          ]
        }
      ];
      memo = [
        { q_num: '1.1', expected_answer: `Grade ${grade} CAPS Standard Rule`, mark_breakdown: '5 Marks' },
        { q_num: '1.2', expected_answer: `Standard Grade ${grade} Equation`, mark_breakdown: '5 Marks' },
        { q_num: '2.1', expected_answer: `Grade ${grade} formal statement of theory.`, mark_breakdown: '10 Marks' },
        { q_num: '2.2', expected_answer: 'Formula (3m) + Substitution (6m) + Correct Answer (6m).', mark_breakdown: '15 Marks' },
        { q_num: '2.3', expected_answer: `Detailed Grade ${grade} logical explanation.`, mark_breakdown: '15 Marks' }
      ];
    }

    return {
      test_paper: {
        test_header: {
          school: 'FUSION HIGH SCHOOL',
          subject,
          grade,
          topic,
          total_marks: 50,
          duration: '60 Minutes'
        },
        sections,
        marking_memo: memo
      }
    };
  } else {
    // Interactive Quiz Questions - Subject & Grade Sensitive
    if (isLifeScience) {
      if (grade === '12') {
        return expandQuestionPool([
          { id: 1, question: `[Grade 12 Life Sciences] Which enzyme unwinds the DNA double helix and breaks hydrogen bonds during replication in ${topic}?`, type: 'multiple_choice', options: ['DNA Helicase', 'DNA Polymerase', 'RNA Polymerase', 'DNA Ligase'], answer: 'DNA Helicase' },
          { id: 2, question: `[Grade 12 Life Sciences] In genetic crosses for ${topic}, if a heterozygous black guinea pig (Bb) is crossed with a white guinea pig (bb), what percentage of offspring will be white?`, type: 'multiple_choice', options: ['50%', '25%', '75%', '100%'], answer: '50%' },
          { id: 3, question: `[Grade 12 Life Sciences] Describe non-disjunction during Meiosis I and its genetic impact on chromosome numbers.`, type: 'multiple_choice', options: ['A) Chromosomes fail to separate producing n+1/n-1 gametes', 'B) DNA multiplies exponentially', 'C) Mitotic spindle fails completely', 'D) Gametes lose all chromosomes'], answer: 'A) Chromosomes fail to separate producing n+1/n-1 gametes' }
        ]);
      } else if (grade === '11') {
        return expandQuestionPool([
          { id: 1, question: `[Grade 11 Life Sciences] Which micro-organisms are acellular particles composed of a protein capsid enclosing viral nucleic acid?`, type: 'multiple_choice', options: ['Viruses', 'Bacteria', 'Fungi', 'Protists'], answer: 'Viruses' },
          { id: 2, question: `[Grade 11 Life Sciences] Where do the light-dependent reactions of photosynthesis occur inside plant chloroplasts?`, type: 'multiple_choice', options: ['Thylakoid Membrane', 'Stroma', 'Mitochondrial Matrix', 'Cytoplasm'], answer: 'Thylakoid Membrane' },
          { id: 3, question: `[Grade 11 Life Sciences] How are villi in the human small intestine adapted for absorbing digested nutrients?`, type: 'multiple_choice', options: ['A) Large surface area with microvilli & dense capillaries', 'B) Thick muscle layer with no blood vessels', 'C) Impermeable cell membrane', 'D) Single vacuole without blood supply'], answer: 'A) Large surface area with microvilli & dense capillaries' }
        ]);
      } else {
        return expandQuestionPool([
          { id: 1, question: `[Grade 10 Life Sciences] Which cell organelle is responsible for cellular respiration and synthesizing ATP energy?`, type: 'multiple_choice', options: ['Mitochondrion', 'Chloroplast', 'Ribosome', 'Golgi Body'], answer: 'Mitochondrion' },
          { id: 2, question: `[Grade 10 Life Sciences] What organic monomers join via peptide bonds to form protein macromolecules?`, type: 'multiple_choice', options: ['Amino Acids', 'Monosaccharides', 'Fatty Acids & Glycerol', 'Nucleotides'], answer: 'Amino Acids' },
          { id: 3, question: `[Grade 10 Life Sciences] Which structures are present in plant cells but absent in animal cells?`, type: 'multiple_choice', options: ['A) Rigid cell wall & chloroplasts', 'B) Mitochondrion & ribosomes', 'C) Nucleus & cytoplasm', 'D) Cell membrane & centrioles'], answer: 'A) Rigid cell wall & chloroplasts' }
        ]);
      }
    } else if (isPhysics) {
      if (grade === '12') {
        return expandQuestionPool([
          { id: 1, question: `[Grade 12 Physical Sciences] As an ambulance emitting frequency f moves TOWARDS a stationary observer, the observed Doppler frequency will be:`, type: 'multiple_choice', options: ['Higher than f', 'Lower than f', 'Equal to f', 'Zero'], answer: 'Higher than f' },
          { id: 2, question: `[Grade 12 Physical Sciences] According to the Work-Energy Theorem (Wnet = ΔK), net work done on an object equals the change in its:`, type: 'multiple_choice', options: ['Kinetic Energy', 'Potential Energy', 'Linear Momentum', 'Acceleration'], answer: 'Kinetic Energy' },
          { id: 3, question: `[Grade 12 Physical Sciences] According to Le Chateliers Principle, increasing pressure on a gaseous equilibrium system shifts the equilibrium to the side with:`, type: 'multiple_choice', options: ['A) Fewer gas moles', 'B) More gas moles', 'C) Zero moles', 'D) Higher temperature'], answer: 'A) Fewer gas moles' }
        ]);
      } else {
        return expandQuestionPool([
          { id: 1, question: `[Grade 10 Physical Sciences] What is the speed of a transverse wave with a frequency of 5 Hz and a wavelength of 2 meters?`, type: 'multiple_choice', options: ['10 m/s', '2.5 m/s', '7 m/s', '0.4 m/s'], answer: '10 m/s' },
          { id: 2, question: `[Grade 10 Physical Sciences] Which law states that the total electric charge in an isolated system remains constant?`, type: 'multiple_choice', options: ['Law of Conservation of Charge', 'Coulombs Law', 'Ohms Law', 'Newtons First Law'], answer: 'Law of Conservation of Charge' },
          { id: 3, question: `[Grade 10 Physical Sciences] In a transverse pulse, particles vibrate:`, type: 'multiple_choice', options: ['A) Perpendicular to wave direction', 'B) Parallel to wave direction', 'C) In circular orbits', 'D) In random directions'], answer: 'A) Perpendicular to wave direction' }
        ]);
      }
    } else if (isMath) {
      if (grade === '12') {
        return expandQuestionPool([
          { id: 1, question: `[Grade 12 Mathematics] Evaluate the derivative: d/dx (4x^3 - 5x^2 + 7x - 2).`, type: 'multiple_choice', options: ['12x^2 - 10x + 7', '12x^3 - 10x^2 + 7', '4x^2 - 5x + 7', '12x^2 - 10x'], answer: '12x^2 - 10x + 7' },
          { id: 2, question: `[Grade 12 Mathematics] What is the sum to infinity (S_∞) of the convergent geometric series: 16 + 8 + 4 + 2 + ...?`, type: 'multiple_choice', options: ['32', '64', '24', '16'], answer: '32' },
          { id: 3, question: `[Grade 12 Mathematics] Which expression represents the compound angle expansion identity for cos(A + B)?`, type: 'multiple_choice', options: ['A) cos(A)cos(B) - sin(A)sin(B)', 'B) cos(A)cos(B) + sin(A)sin(B)', 'C) sin(A)cos(B) + cos(A)sin(B)', 'D) tan(A) + tan(B)'], answer: 'A) cos(A)cos(B) - sin(A)sin(B)' }
        ]);
      } else {
        return expandQuestionPool([
          { id: 1, question: `[Grade 10 Mathematics] Factorize the quadratic expression: x^2 - 7x + 12.`, type: 'multiple_choice', options: ['(x - 3)(x - 4)', '(x + 3)(x + 4)', '(x - 2)(x - 6)', '(x - 1)(x - 12)'], answer: '(x - 3)(x - 4)' },
          { id: 2, question: `[Grade 10 Mathematics] In a right-angled triangle, if sin(θ) = 3/5, what is cos(θ)?`, type: 'multiple_choice', options: ['4/5', '3/4', '5/3', '4/3'], answer: '4/5' },
          { id: 3, question: `[Grade 10 Mathematics] Solve for x in the linear equation: 3x - 5 = 16.`, type: 'multiple_choice', options: ['A) x = 7', 'B) x = 5', 'C) x = 9', 'D) x = 3'], answer: 'A) x = 7' }
        ]);
      }
    } else if (isCommerce) {
      if (grade === '12') {
        return expandQuestionPool([
          { id: 1, question: `[Grade 12 Accounting] In a Public Company's Cash Flow Statement, cash paid for dividends is classified under:`, type: 'multiple_choice', options: ['Operating Activities', 'Financing Activities', 'Investing Activities', 'Capital Reserve'], answer: 'Operating Activities' },
          { id: 2, question: `[Grade 12 Accounting] Which financial indicator measures profitability relative to shareholders' equity investment?`, type: 'multiple_choice', options: ['Return on Shareholders Equity (ROSH)', 'Solvency Ratio', 'Acid Test Ratio', 'Debt-Equity Ratio'], answer: 'Return on Shareholders Equity (ROSH)' },
          { id: 3, question: `[Grade 12 Accounting] According to King IV corporate governance, independent external auditors must:`, type: 'multiple_choice', options: ['A) Provide objective, conflict-free audit opinions', 'B) Manage daily company operations', 'C) Approve executive salary packages', 'D) Prepare monthly VAT returns'], answer: 'A) Provide objective, conflict-free audit opinions' }
        ]);
      } else {
        return expandQuestionPool([
          { id: 1, question: `[Grade 10 Accounting] According to the Accounting Equation (Assets = Owner's Equity + Liabilities), purchasing equipment for R5,000 cash causes total Assets to:`, type: 'multiple_choice', options: ['Remain unchanged (R0 net change)', 'Increase by R5,000', 'Decrease by R5,000', 'Double'], answer: 'Remain unchanged (R0 net change)' },
          { id: 2, question: `[Grade 10 Accounting] Which subsidiary journal is used to record cash received from customers?`, type: 'multiple_choice', options: ['Cash Receipts Journal (CRJ)', 'Cash Payments Journal (CPJ)', 'Debtors Journal (DJ)', 'Creditors Journal (CJ)'], answer: 'Cash Receipts Journal (CRJ)' },
          { id: 3, question: `[Grade 10 Accounting] The primary purpose of preparing a Trial Balance is to:`, type: 'multiple_choice', options: ['A) Verify debit and credit mathematical equality', 'B) Calculate net annual profit', 'C) Record daily transactions', 'D) Audit bank statements'], answer: 'A) Verify debit and credit mathematical equality' }
        ]);
      }
    } else if (isTourism) {
      return expandQuestionPool([
        { id: 1, question: `[Grade ${grade} Tourism] In Greenwich Mean Time (GMT) calculations, travelling EAST across time zones requires you to:`, type: 'multiple_choice', options: ['Add 1 hour per 15 degrees longitude', 'Subtract 1 hour per 15 degrees longitude', 'Keep time unchanged', 'Add 24 hours'], answer: 'Add 1 hour per 15 degrees longitude' },
        { id: 2, question: `[Grade ${grade} Tourism] Which 3Ps pillar of Sustainable Tourism focuses on minimizing environmental impact on local ecosystems?`, type: 'multiple_choice', options: ['Planet', 'People', 'Profit', 'Promotion'], answer: 'Planet' },
        { id: 3, question: `[Grade ${grade} Tourism] Foreign currency exchange rate at which banks buy foreign currency from tourists is called:`, type: 'multiple_choice', options: ['A) Bank Buying Rate (BBR)', 'B) Bank Selling Rate (BSR)', 'C) Inflation Rate', 'D) Prime Lending Rate'], answer: 'A) Bank Buying Rate (BBR)' }
      ]);
    } else {
      return expandQuestionPool([
        { id: 1, question: `[Grade ${grade} ${subject}] Which key CAPS principle governs theoretical concepts in ${topic}?`, type: 'multiple_choice', options: [`A) ${topic} Core Rule 1`, `B) ${topic} Alternative Principle`, `C) ${topic} Secondary Rule`, `D) ${topic} Empirical Standard`], answer: `A) ${topic} Core Rule 1` },
        { id: 2, question: `[Grade ${grade} ${subject}] What is the primary analytical application associated with ${topic}?`, type: 'multiple_choice', options: [`A) Quantitative Analysis of ${topic}`, `B) Qualitative Overview`, `C) Comparative Evaluation`, `D) Systematic Review`], answer: `A) Quantitative Analysis of ${topic}` },
        { id: 3, question: `[Grade ${grade} ${subject}] State the fundamental CAPS examination definition for ${topic}.`, type: 'multiple_choice', options: [`A) Formal Grade ${grade} CAPS definition for ${topic}`, `B) Informal Summary`, `C) Historical Context`, `D) Secondary Variable`], answer: `A) Formal Grade ${grade} CAPS definition for ${topic}` }
      ]);
    }
  }
}

async function safeAICall(prompt, isJson = false, retries = 1) {
  const models = ['gemini-3.6-flash', 'gemini-3.5-flash'];

  for (const m of models) {
    try {
      console.log(`[AI SERVICE] Attempting online AI generation (${m})...`);
      const result = await callAI(prompt, isJson, m);
      if (result && !result.error) return result;
    } catch (err) {
      if (err.message && (err.message.includes('429') || err.message.includes('Quota exceeded'))) {
        console.info(`[AI SERVICE] Quota limit encountered on ${m}. Cascading...`);
      } else {
        console.warn(`[AI SERVICE] Model ${m} error: ${err.message}`);
      }
    }
  }

  try {
    return generateCAPSLocalFallback(prompt);
  } catch (fallbackErr) {
    console.error('[AI FALLBACK ERROR]', fallbackErr);
    return { error: 'Failed to generate content.' };
  }
}

async function getTextCompletion(prompt) {
  const result = await safeAICall(prompt, false);
  if (result.error) throw new Error(result.error);
  return result.text;
}

function normalizeSubject(subject) {
  const subLower = (subject || "").toLowerCase().trim();
  if (subLower === 'maths' || subLower === 'mathematics') return 'Mathematics';
  if (subLower === 'physics' || subLower === 'physical sciences') return 'Physical Sciences';
  return subject;
}

async function getTextbookContent(filePath, maxLength = 10000, topicSearch = null) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  const dataBuffer = fs.readFileSync(filePath);
  const pdfData = await pdf(dataBuffer);
  const fullText = pdfData.text || "";

  if (topicSearch) {
    const topicIndex = fullText.toLowerCase().indexOf(topicSearch.toLowerCase());
    if (topicIndex !== -1) {
      const start = Math.max(0, topicIndex - 500);
      return fullText.substring(start, Math.min(fullText.length, start + maxLength));
    }
  }
  return fullText.substring(0, maxLength);
}

function parseAIJSON(response) {
  if (!response) return {};
  const rawData = typeof response === 'string' ? JSON.parse(response) : response;
  if (Array.isArray(rawData)) return rawData;
  if (rawData.lesson_plan) return rawData.lesson_plan;
  if (rawData.test_paper) return rawData.test_paper;
  if (rawData.questions) return rawData.questions;
  return rawData.topics || rawData.chapters || rawData.lessons || rawData.tasks || rawData;
}

function cleanHumanMath(text) {
  if (!text || typeof text !== 'string') return text;
  let s = text;

  // 1. Remove LaTeX font commands
  s = s.replace(/\\mathbf\{([^}]+)\}/g, '$1');
  s = s.replace(/\\textbf\{([^}]+)\}/g, '$1');
  s = s.replace(/\\text\{([^}]+)\}/g, '$1');
  s = s.replace(/\\mathrm\{([^}]+)\}/g, '$1');
  s = s.replace(/\\mathit\{([^}]+)\}/g, '$1');

  // 2. Fractions: \frac{a}{b} -> a / b
  s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 / $2');

  // 3. Angles, Triangles, Geometry
  s = s.replace(/\\triangle\s*([A-Za-z0-9]+)/g, 'Triangle $1');
  s = s.replace(/\\hat\{([A-Za-z0-9]+)\}/g, 'Angle $1');
  s = s.replace(/\\angle\s*([A-Za-z0-9]+)/g, 'Angle $1');

  // 4. Symbols and Operations
  s = s.replace(/\^\\circ/g, '°');
  s = s.replace(/\\circ/g, '°');
  s = s.replace(/\\times/g, ' × ');
  s = s.replace(/\\cdot/g, ' • ');
  s = s.replace(/\\approx/g, ' ≈ ');
  s = s.replace(/\\Rightarrow/g, ' => ');
  s = s.replace(/\\rightarrow/g, ' -> ');
  s = s.replace(/\\Leftrightarrow/g, ' <=> ');
  s = s.replace(/\\leq?/g, ' ≤ ');
  s = s.replace(/\\geq?/g, ' ≥ ');
  s = s.replace(/\\neq/g, ' ≠ ');
  s = s.replace(/\\pm/g, ' ± ');
  s = s.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');
  s = s.replace(/\\sqrt/g, '√');
  s = s.replace(/\\quad/g, ' ');
  s = s.replace(/\\qquad/g, '  ');
  s = s.replace(/\\theta/g, 'θ');
  s = s.replace(/\\alpha/g, 'α');
  s = s.replace(/\\beta/g, 'β');
  s = s.replace(/\\pi/g, 'π');
  s = s.replace(/\\Delta/g, 'Δ');
  s = s.replace(/\\delta/g, 'δ');
  s = s.replace(/\\Sigma/g, 'Σ');
  s = s.replace(/\\sigma/g, 'σ');
  s = s.replace(/\\infty/g, '∞');

  // 5. Strip leftover LaTeX dollar math delimiters ($$ and $)
  s = s.replace(/\$\$([\s\S]*?)\$\$/g, '$1');
  s = s.replace(/\$([^\$\n]+)\$/g, '$1');

  // 6. Clean up residual backslashes
  s = s.replace(/\\([a-zA-Z]+)/g, '$1');

  return s;
}

const SA_OFFICIAL_LANGUAGES_MAP = {
  'isizulu': { name: 'isiZulu', desc: 'isiZulu Home Language / FAL (Uhlelo Lolwimi, Izaga Nezisho, Ubuciko Bencwadi, Izinkondlo, Izindaba)' },
  'isixhosa': { name: 'isiXhosa', desc: 'isiXhosa Home Language / FAL (Uhlelo Lolwimi, Izaci Namaqhalo, Iincwadi, Izibongo, Izincoko)' },
  'afrikaans': { name: 'Afrikaans', desc: 'Afrikaans Huistaal / EAT (STOMPI Woordorde, Taalleer, Direkte en Indirekte Rede, Gedigte, Prosa, Opstelle)' },
  'english': { name: 'English', desc: 'English Home Language / FAL (Language Structures, Comprehension, Poetry, Novels, Drama, Essays)' },
  'sepedi': { name: 'Sepedi', desc: 'Sepedi / Sesotho sa Leboa Home Language (Popopolelo, Maele le Diema, Dingwalo, Direto, Ditaodišo)' },
  'setswana': { name: 'Setswana', desc: 'Setswana Home Language (Popopolelo, Diane le Maele, Ditlhamo, Maboko, Dipapadi)' },
  'sesotho': { name: 'Sesotho', desc: 'Sesotho Home Language (Popopolelo, Maele le Maelana, Dithothokiso, Dingolwa, Meqoqo)' },
  'xitsonga': { name: 'Xitsonga', desc: 'Xitsonga Home Language (Swiaki swa Ririmi, Swivuriso na Swihitana, Matsalwa, Swithlokovetselo, Switsalwana)' },
  'siswati': { name: 'siSwati', desc: 'siSwati Home Language (Luhlelo Lwelulwimi, Taga neTisho, Tinkondlo, Tindzaba, Umbhalo wetiNcwadzi)' },
  'tshivenda': { name: 'Tshivenda', desc: 'Tshivenda Home Language (Maitele a Luambo, Mirero na Maambele, Vhudetembi, Ngano, Maanea)' },
  'isindebele': { name: 'isiNdebele', desc: 'isiNdebele Home Language (Izakhi Zelimi, Izaga neZitjho, Izinkondlo, Iindaba, Ukutlola)' }
};

async function answerSubjectQuestion(subject, grade, question, topicContext = '', history = [], schoolContext = null) {
  const normSubject = normalizeSubject(subject || 'Mathematics');
  const normGrade = String(grade || '10').replace(/Grade\s*/i, '');
  const subLower = normSubject.toLowerCase();

  let matchedLangKey = null;
  for (const langKey of Object.keys(SA_OFFICIAL_LANGUAGES_MAP)) {
    if (subLower.includes(langKey)) {
      matchedLangKey = langKey;
      break;
    }
  }

  const langInfo = matchedLangKey ? SA_OFFICIAL_LANGUAGES_MAP[matchedLangKey] : null;

  const schoolName = schoolContext?.name || 'Fusion High School';
  const schoolCircuit = schoolContext?.circuit ? `${schoolContext.circuit}, ${schoolContext?.province || 'Limpopo'}` : 'Mankweng Circuit, Limpopo';
  const schoolMotto = schoolContext?.motto || 'Knowledge is Power';

  const schoolPromptSection = `
INSTITUTION & MULTI-TENANT CONTEXT:
- You are the official AI Academic Specialist for "${schoolName}" (${schoolCircuit}). School Motto: "${schoolMotto}".
- STRICT MULTI-TENANT ISOLATION: You represent "${schoolName}" exclusively. Never mention or confuse this school with other schools. All academic advice, teacher guidance, exam preparation, and study resources are tailored strictly to the students, faculty, and academic standards of ${schoolName} under the South African Department of Basic Education (CAPS).
`;

  const languagePromptSection = langInfo ? `
OFFICIAL SOUTH AFRICAN LANGUAGE CURRICULUM SPECIALIST:
- You are a specialized, fluent high school educator in "${langInfo.name}" (${langInfo.desc}) for Grade ${normGrade}.
- Comprehensive Syllabus Mastery:
  1. Paper 1: Language in Context, Comprehension, Summary Writing, Grammar & Syntax (Uhlelo Lolwimi / Popopolelo / Taalleer / Grammatika / Noun Classes / Concords / Tenses).
  2. Paper 2: Literature Study (Prescribed Novels, Dramas, Short Stories, Folklore, and Poetry Analysis - meter, rhyme, metaphors, themes).
  3. Paper 3: Creative & Transactional Writing (Essays, Narratives, Discursive Arguments, Letters, Speech Writing, Dialogues, Reviews).
  4. Cultural Expressions: Proverbs, Idioms, and Figures of Speech (Izaga nezisho / Maele le diema / Idioom en spreuke / Swivuriso na swihitana / Mirero na maambele).
- Respond in accurate, authentic, high-quality ${langInfo.name} (or provide bilingual explanations with English if requested by the student) so the learner masters their examinations with confidence.
` : '';

  const prompt = `
You are the Dedicated Subject Academic AI Specialist for "${normSubject}" (Grade ${normGrade}) at ${schoolName}.
${schoolPromptSection}
${languagePromptSection}
STRICT IDENTITY & FORMATTING POLICIES:
1. IDENTITY: Your official identity is "${schoolName} AI Subject Specialist". NEVER mention "Gemini", "Google", "Google AI", "OpenAI", or any external LLM name under any circumstances.
2. HUMAN-READABLE WRITING (CRITICAL):
   - Write like an inspiring, highly experienced high school educator explaining concepts directly to a student.
   - NEVER USE RAW LATEX SYNTAX ($$, $, \\frac{}{}, \\text{}, \\mathbf{}, \\quad, \\Rightarrow, \\hat{}, \\triangle, ^\\circ).
   - Write clean, standard plain-text mathematics and prose:
     - Write fractions as "a / b" (e.g. sin(35°) = BC / 12)
     - Write equations on clean, separate lines (e.g. x^2 - 5x - 6 = 0)
     - Write powers as "^" (e.g. x^2, 10^5)
     - Write degrees as "°" (e.g. 35°, 90°)
     - Write multiplication as "×" and arrows as "=>" or "->"
     - Write geometry terms simply as "Triangle ABC", "Angle A = 35°"
   - Do NOT repeat robotic headers like "CAPS Approach" on every single line. Explain clearly, step-by-step, with numbered steps (Step 1, Step 2, Step 3).

3. STRICT SUBJECT ISOLATION & CONFINEMENT (ZERO SUBJECT DRIFT):
   - You are bound 100% EXCLUSIVELY to "${normSubject}" (Grade ${normGrade}).
   - If "${normSubject}" is Life Sciences: You must ONLY teach, quiz, and discuss Life Sciences (Genetics, Cell Biology, Human Body Systems, Evolution, Reproduction, Ecology, Plant/Animal Tissues). Under NO circumstances provide Mathematics calculations, Chemistry equations, or other subjects.
   - If "${normSubject}" is Mathematics: You must ONLY teach, quiz, and solve Mathematics (Algebra, Functions, Calculus, Trigonometry, Euclidean Geometry, Finance, Probability, Analytical Geometry).
   - If "${normSubject}" is Physical Sciences: You must ONLY teach, quiz, and solve Physics & Chemistry (Newtonian Mechanics, Electric Circuits, Chemical Change, Organic Chemistry, Waves/Light, Quantitative Chemistry).
   - If "${normSubject}" is Accounting: Financial accounting, General Ledger, Balance Sheet, Income Statement, Cash Flow, Financial Ratios, Cost Accounting.
   - If "${normSubject}" is Business Studies: Business environments, Operations, Marketing, Human Resources, Legislation (BCEA, LRA, COIDA), Business Ventures.
   - If "${normSubject}" is Economics: Macroeconomics, Microeconomics, Circular Flow, Business Cycles, Public Sector, Economic Growth.
   - If "${normSubject}" is Geography: Climatology, Geomorphology, Mapwork & GIS, Settlement, Economic Geography of South Africa.
   - If "${normSubject}" is History: Cold War, Civil Rights, Apartheid South Africa, Independence in Africa, Globalisation.
   - If "${normSubject}" is an Official South African Language: Grammar/Syntax, Literature & Prescribed Works, Poetry, Creative Writing, Proverbs/Idioms.
   - If the student asks for something from an unrelated subject: Politely remind them:
     "I am your ${schoolName} AI Subject Specialist for ${normSubject} (Grade ${normGrade}). I am specialized to assist and test you exclusively on ${normSubject}. Please ask a question related to ${normSubject}, or switch to the corresponding subject in your portal."

4. OFFICIAL PAST-PAPER & TEXTBOOK QUIZ MODE (CRITICAL REQUIREMENTS):
   - If the learner asks for a QUIZ, TEST, PRACTICE QUESTION, or PROBLEM to solve:
     - Generate a real, high-quality examination question modeled directly on South African CAPS official past examination question papers and textbook modules for "${normSubject}" (Grade ${normGrade}).
     - STRICT ANONYMITY REQUIREMENT: NEVER reveal, state, or hint at where the question came from (DO NOT say "From 2018 Paper 1", "From November 2021 Exam", or "From DBE Question Bank"). Simply present the question directly.
     - State the total marks allocated (e.g. "[5 Marks]" or "[4 Marks]").
     - State the Question clearly with necessary givens/diagram description.
     - DO NOT provide the answer or memorandum immediately when first presenting the question; ask the learner to reply with their solution/answer.
   - If the learner has SUBMITTED an answer to a previously asked quiz question or problem:
     - Grade their answer accurately against the official South African CAPS examination marking guideline standards.
     - Award their score clearly (e.g. "**Score: 4 / 5 Marks**" or "**Score: 5 / 5 Marks (Full Marks!)**").
     - Provide the **Official Step-by-Step Marking Memorandum & Solution**:
       - Breakdown showing each tick / mark awarded (e.g. "✓ 1 Mark for formula", "✓ 1 Mark for substitution", "✓ 1 Mark for correct simplification", "✓ 1 Mark for final value with SI unit").
       - Explain common pitfalls and how to ensure maximum marks in formal exams.
     - Then, ask if they would like another practice question on this topic or a different ${normSubject} topic.

School: ${schoolName} (${schoolCircuit})
Subject: ${normSubject}
${langInfo ? `Official Language: ${langInfo.name}` : ''}
Target Grade: Grade ${normGrade}
${topicContext ? `Current Module / Chapter Topic: ${topicContext}` : ''}
Learner Message: ${question}

Response:
`;

  try {
    const result = await safeAICall(prompt, false);
    if (result && result.text) {
      let cleaned = result.text.replace(/gemini/gi, 'Fusion AI');
      cleaned = cleaned.replace(/google ai/gi, 'Fusion Academic AI');
      cleaned = cleanHumanMath(cleaned);
      return cleaned;
    }
  } catch (err) {
    console.error('Error in answerSubjectQuestion:', err);
  }
  return `I am your Fusion AI Subject Specialist for ${normSubject} (Grade ${normGrade}). I am ready to help you with ${normSubject} concepts, revision, or quiz you with official examination-style questions. What topic in ${normSubject} would you like to explore or practice today?`;
}

module.exports = {
  aiCurriculum,
  activeAssessments,
  safeAICall,
  generateCAPSLocalFallback,
  getTextCompletion,
  normalizeSubject,
  getTextbookContent,
  parseAIJSON,
  answerSubjectQuestion,
  cleanHumanMath
};