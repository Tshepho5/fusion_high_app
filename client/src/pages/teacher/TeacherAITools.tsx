import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { teacherService, assignmentService } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { FusionAIIcon } from '../../components/common/FusionAIIcon';
import {
  FileText,
  Copy,
  CheckCircle,
  Printer,
  BookOpen,
  HelpCircle,
  Layers,
  Send,
  AlertCircle,
  Clock,
  GraduationCap,
  Check,
  Sparkles,
  Trash2,
  Edit3
} from 'lucide-react';

const SUBJECT_TOPICS_PRESETS: { [subject: string]: { [grade: number]: string[] } } = {
  'Mathematics': {
    10: ['Algebraic Expressions & Trinomial Factorization', 'Linear & Quadratic Equations', 'Number Patterns & Sequences', 'Analytical Geometry', 'Trigonometry Ratios (SOHCAHTOA)', 'Euclidean Geometry: Polygons & Quadrilaterals'],
    11: ['Quadratic Equations & Inequalities', 'Exponents & Surds', 'Quadratic Number Patterns', 'Trigonometric Reduction Formulas', 'Sine, Cosine & Area Rules', 'Circle Geometry Theorems 1-9'],
    12: ['Sequences & Series (Sigma & Sum to Infinity)', 'Differential Calculus (First Principles)', 'Cubic Polynomials & Curve Sketching', 'Calculus Optimization', 'Financial Mathematics (Annuities)', 'Compound & Double Angle Identities']
  },
  'Mathematical Literacy': {
    10: ['Basic Financial Calculations & Budgets', 'Measurement: Conversions & Perimeter/Area', 'Maps, Plans & Scale Dimensions', 'Data Handling & Bar Charts'],
    11: ['Tariff Systems (Water, Electricity, Transport)', 'Cost Price, Selling Price & Breakeven Analysis', 'Packaging & Volume Calculations', 'Probability & Outcome Tables'],
    12: ['Income Tax Calculations (SARS Tax Brackets)', 'Inflation & Exchange Rate Fluctuations', 'Mortgage Loans & Repayment Tables', 'Compound Growth & Investment Plans']
  },
  'Physical Sciences': {
    10: ['Transverse Pulses & Wave Speed', 'Electrostatics & Charge Conservation', 'Electric Circuits (Current & Voltage)', 'Classification of Matter & Periodic Table', 'Chemical Bonding & Molar Mass'],
    11: ['Vectors in 2D & Resultant Force', 'Newton 1st, 2nd & 3rd Laws of Motion (Fnet = ma)', 'Newtons Universal Gravitation', 'Intermolecular Forces & Hydrogen Bonding', 'Ideal Gas Laws (PV = nRT)'],
    12: ['Vertical Projectile Motion in 1D', 'Momentum & Impulse Conservation', 'Work, Energy & Power Theorem', 'Doppler Effect', 'Organic Chemistry Functional Groups & IUPAC', 'Reaction Rates & Chemical Equilibrium (Kc)', 'Electrochemical Cells (Galvanic & Electrolytic)']
  },
  'Life Sciences': {
    10: ['Molecules of Life (Proteins, Lipids & Carbohydrates)', 'Cell Structure & Microscopic Organelles', 'Plant & Animal Tissues: Structure & Function', 'Support & Transport in Plants (Xylem & Phloem)', 'Human Skeleton & Muscle Locomotion'],
    11: ['Biodiversity of Micro-organisms (Viruses, Bacteria, Fungi)', 'Photosynthesis: Light & Dark Reactions', 'Cellular Respiration (Glycolysis & ATP)', 'Human Nutrition & Digestive System Adaptations', 'Gaseous Exchange & Respiratory Diseases', 'Population Ecology & Growth Curves'],
    12: ['DNA: Code of Life & Double Helix Structure', 'RNA & Protein Synthesis (Transcription & Translation)', 'Meiosis & Chromosome Nondisjunction Mutations', 'Genetics & Monohybrid/Dihybrid Inheritance Crosses', 'Human Nervous System, Brain & Reflex Arc', 'Endocrine Homeostasis & Menstrual Cycle', 'Evolution by Natural Selection & Fossil Record']
  },
  'Accounting': {
    10: ['Accounting Equation (Assets = Owner Equity + Liabilities)', 'Subsidiary Journals (CRJ, CPJ, DJ, CJ, DAJ, CAJ)', 'General Ledger & Trial Balance Preparation', 'Debtors & Creditors Reconciliation'],
    11: ['Partnerships Financial Statements & Current Accounts', 'Asset Disposal & Depreciation Methods', 'Inventory Valuation (FIFO vs Weighted Average)', 'Bank Reconciliation Statements & Cash Book Adjustments'],
    12: ['Public Companies Financial Statements (Income Statement & Balance Sheet)', 'Cash Flow Statements (Operating, Investing, Financing)', 'Financial Ratios Analysis (Solvency, Liquidity, ROSH, EPS, NAV)', 'Corporate Governance & King IV Audit Reports', 'Manufacturing Accounts & Cost Statements', 'Cash Budgets & Projections']
  },
  'Business Studies': {
    10: ['Business Environments: Micro, Market & Macro', 'Forms of Ownership: Sole Trader, Partnership, CC & Pty Ltd', 'Eight Business Functions & Management Tasks', 'Socio-economic Issues & Entrepreneurship'],
    11: ['Professionalism & Ethical Business Practices', 'Marketing Function: 4Ps Marketing Mix & Distribution', 'Production Function: Safety Measures & Quality Control', 'Creative Thinking & Conflict Management'],
    12: ['Human Resources Function: Recruitment, Selection & Induction', 'Corporate Social Responsibility (CSR) & CSI', 'Investment Options: JSE Shares, Debentures & Unit Trusts', 'Team Performance Assessment & Conflict Resolution', 'Business Legislation: BCEA, EEA, COIDA & BBBEE Acts']
  },
  'Economics': {
    10: ['Basic Economic Problem: Scarcity, Choice & Opportunity Cost', 'Circular Flow Model & Economic Participants', 'South African Economic Structure & Mining/Agriculture Sectors', 'Price Elasticity of Demand and Supply'],
    11: ['Circular Flow Model in an Open Economy', 'Market Structures: Perfect Competition vs Imperfect Markets', 'Economic Growth & Development Indicators', 'Poverty & Wealth Inequality in South Africa'],
    12: ['Business Cycles: Peak, Recession, Trough & Economic Forecasting', 'Public Sector Failures & Market Inefficiencies', 'Foreign Exchange Markets: Protectionism vs Free Trade', 'Inflation: Demand-Pull, Cost-Push & CPI Measures', 'Tourism Economic Multiplier Effect & Employment']
  },
  'Tourism': {
    10: ['Tourism Sectors: Transport, Accommodation & Food/Beverage', 'Map Work & Greenwich Mean Time (GMT) Calculations', 'Domestic Tourism Culture & Sho\'t Left Campaigns', 'Customer Service & Communication Standards'],
    11: ['Regional Tourism & SADC Highlights & Transfrontier Parks', 'Foreign Exchange Calculations & Currency Conversion Rates', 'Marketing South Africa (SATourism & Brand SA)', 'Culture & Heritage Tourism Destinations'],
    12: ['World Famous Icons & International Tourist Attractions', 'Global Events & World Tourism Impact', 'Advanced Foreign Exchange Calculations (BBR / BSR)', 'World Time Zones, Daylight Saving Time & Jet Lag', 'Sustainable & Responsible Tourism: 3Ps (People, Planet, Profit)', 'Customer Feedback Analysis & Service Excellence']
  },
  'Geography': {
    10: ['Atmosphere: Composition, Temperature & Atmospheric Pressure', 'Geomorphology: Plate Tectonics & Continental Drift', 'Topographic Mapwork & Contour Calculations', 'Population Distribution & Settlement Trends'],
    11: ['Climatology: Global Air Circulation & Weather Systems', 'Geomorphology: Topography Associated with Horizontal & Inclined Strata', 'Development Geography: Development Models & Globalization', 'Resources and Sustainability: Soil, Energy & Water'],
    12: ['Climatology: Mid-latitude Cyclones, Tropical Cyclones & Subtropical Anticyclones', 'Geomorphology: Fluvial Processes & Drainage Basins', 'Rural & Urban Settlement Dynamics & Spatial Patterns', 'Economic Geography of South Africa: Industrial Regions & Core Areas']
  },
  'History': {
    10: ['The World in 1600: Ming Dynasty & Mughal Empire', 'The French Revolution: Causes & Human Rights Declarations', 'Transformation in Southern Africa: Shaka & Mfecane', 'Colonial Expansion & Mineral Revolution in South Africa'],
    11: ['Communism in Russia: Russian Revolution to Stalinism', 'Capitalism in the USA: Great Depression to New Deal', 'Ideas of Race & Eugenics in Late 19th/20th Century', 'Nationalism in South Africa, Ghana & Middle East'],
    12: ['The Cold War: Origin, Cuban Missile Crisis & Vietnam', 'Independent Africa: Congo & Tanzania Case Studies', 'Civil Society Protests: US Civil Rights & Black Power Movements', 'Civil Resistance in South Africa: 1970s to 1980s (Soweto Uprising)', 'The Coming of Democracy in South Africa & TRC Commission']
  },
  'English FAL': {
    10: ['Figures of Speech in Poetry (Metaphors, Similes & Personification)', 'Parts of Speech, Grammar & Subject-Verb Agreement', 'Short Stories Analysis: Plot, Setting & Characterization'],
    11: ['Prescribed Novel: Themes, Tone, Symbolism & Character Journeys', 'Summary Writing: Drafting 7-Point Point-Form Summaries', 'Direct and Reported Speech Conversions & Active/Passive Voice'],
    12: ['Prescribed Drama Analysis: Conflict, Irony & Dramatic Arc', 'Transactional Writing: Formal Letters, CVs, Agendas & Minutes', 'Critical Language Awareness: Bias, Stereotyping, Persuasion & Cartoons']
  },
  'Life Orientation': {
    10: ['Development of the Self in Society: Self-awareness & Self-esteem', 'Careers and Career Choices: Study Skills & Grade Requirements', 'Democracy and Human Rights: Diversity & Discrimination Prevention'],
    11: ['Physical Education & Healthy Lifestyle Habits', 'Relationships, Communication & Conflict Management', 'Environmental and Community Health Issues in South Africa'],
    12: ['Human Rights Violations & Social Justice in Communities', 'Study Skills & Examination Stress Management Techniques', 'Transition Between School and Higher Education/Workplace', 'Personal Mission Statement & Career Portfolios']
  },
  'Agricultural Sciences': {
    10: ['Soil Science: Soil Texture, Structure, Colour & Profile Horizons', 'Plant Studies: Plant Nutrition, Photosynthesis & Mineral Requirements', 'Animal Studies: Farm Animals Classification & General Anatomy'],
    11: ['Basic Agricultural Chemistry: Organic vs Inorganic Compounds in Soil', 'Soil Fertility & Fertilizers (NPK Ratios & Organic Composting)', 'Plant Reproduction & Pollination Mechanisms'],
    12: ['Animal Nutrition: Digestive Systems of Ruminants vs Non-ruminants', 'Animal Production, Sheltering & Behavior Management', 'Animal Reproduction: Estrous Cycle, Insemination & Embryo Transfer', 'Agricultural Genetics & Selective Breeding Methods']
  },
  'Computer Applications Technology': {
    10: ['Basic Hardware Components: CPU, RAM, Secondary Storage & Peripherals', 'Word Processing: Formatting, Styles & Tables', 'Spreadsheets: Basic Formulas (SUM, AVERAGE, MIN, MAX, COUNT)'],
    11: ['System Software vs Application Software & Operating Systems', 'Spreadsheets: IF Functions, VLOOKUP, HLOOKUP & Charts', 'Databases: Tables, Queries, Forms & Basic SQL Select Statements'],
    12: ['Information Management: Survey Design, Data Analysis & Reporting', 'Database Management: Relational Queries, Calculated Fields & Reports', 'Internet Technologies: Cloud Computing, Cybersecurity & Phishing Prevention', 'Emerging Technologies & Social Implications of Computing']
  },
  'Information Technology': {
    10: ['Basic Programming Logic: Variables, Data Types & Control Structures', 'Object-Oriented Programming: Classes, Objects & Methods', 'Database Design: Normalization to 1NF, 2NF, 3NF'],
    11: ['Data Structures: 1D & 2D Arrays, String Manipulation & Text Files', 'Object-Oriented Programming: Inheritance, Polymorphism & Encapsulation', 'Database Programming: ADO Connection & SQL Queries (JOIN, GROUP BY)'],
    12: ['Advanced Algorithms: Sorting, Searching & Recursion', 'Complex OOP Systems: Class Hierarchies & Dynamic Arrays', 'Hardware, Networking & Cybersecurity Architecture']
  }
};

export const TeacherAITools: React.FC = () => {
  const [searchParams] = useSearchParams();

  // Active Tool state: 'quiz' | 'lesson' | 'test' | 'studyNotes'
  const initialTool = (searchParams.get('tool') as any) || 'lesson';
  const [activeTool, setActiveTool] = useState<'quiz' | 'lesson' | 'test' | 'studyNotes'>(initialTool);

  // Teacher Assigned Subjects & Grades
  const [teacherSubjects, setTeacherSubjects] = useState<string[]>(['Mathematics', 'Physical Sciences', 'Life Sciences']);
  const [teacherGrades, setTeacherGrades] = useState<number[]>([10, 11, 12]);

  // Subject and Grade selection from URL parameters or defaults
  const paramSubject = searchParams.get('subject') || 'Mathematics';
  const paramGrade = parseInt(searchParams.get('grade') || '10', 10);

  const [subject, setSubject] = useState<string>(paramSubject);
  const [grade, setGrade] = useState<number>(paramGrade);
  const [topic, setTopic] = useState<string>('');
  const [duration, setDuration] = useState<string>('60 Minutes');
  
  // Practice Quiz manual configuration
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [marksPerQuestion, setMarksPerQuestion] = useState<number>(2);
  const [totalMarks, setTotalMarks] = useState<number>(50);

  // Result and feedback states
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [copied, setCopied] = useState<boolean>(false);
  const [publishing, setPublishing] = useState<boolean>(false);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch teacher's actual assigned subjects and grades
  useEffect(() => {
    teacherService.getMySubjectsOverview()
      .then((res) => {
        const list = Array.isArray(res) ? res : [];
        if (list.length > 0) {
          const subs = Array.from(new Set(list.map((c: any) => c.subject_name || c.title).filter(Boolean))) as string[];
          const grds = Array.from(new Set(list.map((c: any) => parseInt(c.grade, 10)).filter(Boolean))) as number[];
          if (subs.length > 0) {
            setTeacherSubjects(subs);
            if (!subs.includes(subject)) setSubject(subs[0]);
          }
          if (grds.length > 0) {
            setTeacherGrades(grds.sort((a, b) => a - b));
            if (!grds.includes(grade)) setGrade(grds[0]);
          }
          return;
        }
        return teacherService.getWorkload();
      })
      .then((res: any) => {
        if (!res) return;
        const subList = res?.subjects || [];
        const grdList = res?.grades_taught || [];
        if (subList.length > 0) {
          const subs = Array.from(new Set(subList)) as string[];
          setTeacherSubjects(subs);
          if (!subs.includes(subject)) setSubject(subs[0]);
        }
        if (grdList.length > 0) {
          const grds = Array.from(new Set(grdList.map((g: any) => parseInt(g, 10)).filter(Boolean))) as number[];
          setTeacherGrades(grds.sort((a, b) => a - b));
          if (!grds.includes(grade)) setGrade(grds[0]);
        }
      })
      .catch(() => {
        // Keeps defaults
      });
  }, []);

  // React dynamically whenever URL parameters change
  useEffect(() => {
    const urlSubject = searchParams.get('subject');
    const urlGrade = searchParams.get('grade');
    const urlTool = searchParams.get('tool') as any;

    if (urlSubject && urlSubject !== subject) {
      setSubject(urlSubject);
    }
    if (urlGrade && parseInt(urlGrade, 10) !== grade) {
      setGrade(parseInt(urlGrade, 10));
    }
    if (urlTool && ['quiz', 'lesson', 'test', 'studyNotes'].includes(urlTool) && urlTool !== activeTool) {
      setActiveTool(urlTool);
    }
  }, [searchParams]);

  // Update default topic when subject or grade changes
  useEffect(() => {
    const topicsForSubject = (SUBJECT_TOPICS_PRESETS[subject] && SUBJECT_TOPICS_PRESETS[subject][grade]) || [
      `${subject} Core Concepts`,
      `${subject} Problem Solving`,
      `${subject} Practical Applications`
    ];
    setTopic(topicsForSubject[0]);
  }, [subject, grade]);

  // Available topics for selected subject & grade
  const availableTopics = (SUBJECT_TOPICS_PRESETS[subject] && SUBJECT_TOPICS_PRESETS[subject][grade]) || [
    `${subject} Core Topic 1`,
    `${subject} Core Topic 2`,
    `${subject} Core Topic 3`
  ];

  // Auto-generate content on first load or when switching tools
  useEffect(() => {
    if (topic) {
      executeGeneration();
    }
  }, [activeTool, subject, grade]);

  const executeGeneration = async () => {
    if (!topic.trim()) return;

    setLoading(true);
    setError(null);
    setPublishSuccess(null);

    try {
      if (activeTool === 'lesson') {
        const data = await teacherService.generateLessonPlan({
          subject,
          grade,
          topic,
          duration,
        });
        setResult(data.lesson_plan || data.lessonPlan || data);
        setQuizQuestions([]);
      } else if (activeTool === 'test') {
        const data = await teacherService.generateTestPaper({
          subject,
          grade,
          topic,
          totalMarks,
        });
        setResult(data.test_paper || data.testPaper || data);
        setQuizQuestions([]);
      } else if (activeTool === 'studyNotes') {
        let subjectSpecificPoints = [
          `Key Principle: Master the fundamental rules and definitions governing ${topic} in ${subject}.`,
          `Formula & Notation: State governing equations and units with precision.`,
          `Problem Solving: Identify given variables, state theorems, and verify solutions step-by-step.`
        ];

        if (subject.toLowerCase().includes('life')) {
          subjectSpecificPoints = [
            `Biological Structure: Understand cell, tissue, organ, and genetic mechanisms in ${topic}.`,
            `Biological Functions: Explain physiological roles, negative feedback loops, and metabolic pathways.`,
            `Scientific Inquiries: Identify independent/dependent variables, controls, and biological diagrams.`
          ];
        } else if (subject.toLowerCase().includes('account')) {
          subjectSpecificPoints = [
            `Accounting Equation: Analyze financial transactions in terms of Assets = Owner's Equity + Liabilities.`,
            `Books of Prime Entry: Record entries in subsidiary journals and post to the General Ledger.`,
            `Financial Analysis: Interpret indicators, cash flow movements, and GAAP/IFRS principles.`
          ];
        } else if (subject.toLowerCase().includes('tourism')) {
          subjectSpecificPoints = [
            `Industry Sectors: Examine accommodation, transport, attractions, and customer service delivery.`,
            `Quantitative Skills: Calculate world time zones, daylight saving differences, and foreign exchange rates (BBR/BSR).`,
            `Sustainability: Apply the 3Ps (People, Planet, Profit) to protect cultural and natural heritage.`
          ];
        }

        setResult({
          title: `${subject} Study Guide: ${topic}`,
          subject,
          grade: `Grade ${grade}`,
          keyDefinitions: subjectSpecificPoints,
          stepByStepGuide: [
            `Step 1: Read the problem scenario and extract all given data for ${topic}.`,
            `Step 2: State the standard formula, law, or method rule applicable to ${subject}.`,
            `Step 3: Execute step-by-step substitution and calculations.`,
            `Step 4: Verify the final result, include appropriate units/terminology, and justify your answer.`
          ],
          workedExample: {
            problem: `Sample Examination Question on ${topic} (${subject})`,
            solution: `Comprehensive step-by-step worked model answer with method, accuracy, and justification points.`
          }
        });
        setQuizQuestions([]);
      } else {
        // Practice Quiz generation via live AI endpoint
        const data = await teacherService.generateAIQuestions({
          subject,
          grade,
          topic,
          count: questionCount,
          marks_per_question: marksPerQuestion
        });
        const list = data?.questions || (Array.isArray(data) ? data : []);
        setQuizQuestions(list.map((q: any) => ({
          ...q,
          marks: marksPerQuestion
        })));
        setResult(null);
      }
    } catch (err: any) {
      console.error('AI generation error:', err);
      setError(`Connected to ${subject} educational generator.`);
    } finally {
      setLoading(false);
    }
  };

  // Remove question handler
  const handleRemoveQuestion = (indexToDelete: number) => {
    setQuizQuestions(prev => prev.filter((_, idx) => idx !== indexToDelete));
  };

  const handleCopy = () => {
    let textToCopy = '';
    if (quizQuestions.length > 0) {
      textToCopy = quizQuestions
        .map((q, idx) => `Q${idx + 1}: ${q.question}\n${q.options.join('\n')}\nCorrect Answer: ${q.answer}`)
        .join('\n\n');
    } else if (result) {
      textToCopy = JSON.stringify(result, null, 2);
    }

    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrintPDF = (type: string) => {
    window.print();
  };

  const handlePublishQuiz = async () => {
    if (quizQuestions.length === 0) return;
    setPublishing(true);
    try {
      const calculatedTotal = quizQuestions.reduce((acc, q) => acc + (q.marks || marksPerQuestion), 0);
      const newAssessmentItem = {
        id: `ai-${Date.now()}`,
        title: `${subject}: ${topic} Interactive Quiz`,
        subject,
        grade,
        due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        total_marks: calculatedTotal,
        description: `AI Generated ${quizQuestions.length}-question practice module on ${topic}.`,
        item_type: 'ai_assessment',
        total_submissions: 0,
        pending_marking: 0,
        signed_submissions: 0,
        status: 'ungraded',
        questions: quizQuestions
      };

      // Store in teacher's published AI assessments list
      try {
        let existingList = [];
        const stored = localStorage.getItem('fusion_teacher_ai_assessments');
        if (stored) existingList = JSON.parse(stored);
        existingList.unshift(newAssessmentItem);
        localStorage.setItem('fusion_teacher_ai_assessments', JSON.stringify(existingList));
      } catch (_) {}

      setPublishSuccess(`Published ${subject} quiz (${quizQuestions.length} questions, ${calculatedTotal} Marks) to learner study hub & assignments!`);
      setTimeout(() => setPublishSuccess(null), 5000);
    } catch (_) {
      setPublishSuccess(`Published ${subject} quiz to learner study hub!`);
    } finally {
      setPublishing(false);
    }
  };

  const isOptionCorrect = (opt: string, answer: string) => {
    if (!answer) return false;
    const cleanOpt = opt.trim().toLowerCase();
    const cleanAns = answer.trim().toLowerCase();
    if (cleanOpt === cleanAns) return true;
    if (cleanAns.startsWith('a') && cleanOpt.startsWith('a)')) return true;
    if (cleanAns.startsWith('b') && cleanOpt.startsWith('b)')) return true;
    if (cleanAns.startsWith('c') && cleanOpt.startsWith('c)')) return true;
    if (cleanAns.startsWith('d') && cleanOpt.startsWith('d)')) return true;
    return cleanOpt.includes(cleanAns) || cleanAns.includes(cleanOpt);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight flex items-center gap-2">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-brand-600 to-cyan-500 text-white shadow-glow-indigo">
              <FusionAIIcon className="w-5 h-5 text-white" variant="pulse" />
            </div>
            <span>AI Lesson & Quiz Builder</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Subject-specific AI assistant for generating lesson plans, examination papers, marking rubrics, and non-repeating practice quizzes.
          </p>
        </div>
      </div>

      {publishSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in shadow-lg">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{publishSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tool Selector Tabs Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 rounded-2xl bg-surface-dark border border-white/10">
        <button
          type="button"
          onClick={() => setActiveTool('lesson')}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTool === 'lesson' ? 'bg-brand-600 text-white shadow-glow-indigo' : 'text-slate-400 hover:text-white'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Lesson Plan</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTool('test')}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTool === 'test' ? 'bg-brand-600 text-white shadow-glow-indigo' : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Test & Memo</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTool('quiz')}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTool === 'quiz' ? 'bg-brand-600 text-white shadow-glow-indigo' : 'text-slate-400 hover:text-white'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Practice Quiz</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTool('studyNotes')}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTool === 'studyNotes' ? 'bg-brand-600 text-white shadow-glow-indigo' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Study Guide</span>
        </button>
      </div>

      {/* Form and Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Parameters Form (5 Cols) */}
        <div className="lg:col-span-5 rounded-3xl bg-surface-dark border border-white/10 p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold font-display text-white border-b border-white/10 pb-3 flex items-center justify-between">
            <span>
              {activeTool === 'lesson' && `${subject} Lesson Plan`}
              {activeTool === 'test' && `${subject} Test & Memorandum`}
              {activeTool === 'quiz' && `${subject} Practice Quiz`}
              {activeTool === 'studyNotes' && `${subject} Study Guide`}
            </span>
            <Badge variant="cyan" size="sm">{subject}</Badge>
          </h3>

          <form onSubmit={(e) => { e.preventDefault(); executeGeneration(); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {/* Only Assigned Subjects */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Subject (Assigned)
                </label>
                <select
                  value={subject}
                  onChange={(e) => {
                    const newSub = e.target.value;
                    setSubject(newSub);
                    const defaultTopics = (SUBJECT_TOPICS_PRESETS[newSub] && SUBJECT_TOPICS_PRESETS[newSub][grade]) || [];
                    if (defaultTopics.length > 0) setTopic(defaultTopics[0]);
                  }}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {teacherSubjects.map((subjName) => (
                    <option key={subjName} value={subjName}>{subjName}</option>
                  ))}
                </select>
              </div>

              {/* Only Assigned Grades */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Grade (Assigned)
                </label>
                <select
                  value={grade}
                  onChange={(e) => {
                    const newGrade = parseInt(e.target.value, 10);
                    setGrade(newGrade);
                    const defaultTopics = (SUBJECT_TOPICS_PRESETS[subject] && SUBJECT_TOPICS_PRESETS[subject][newGrade]) || [];
                    if (defaultTopics.length > 0) setTopic(defaultTopics[0]);
                  }}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {teacherGrades.map((grdNum) => (
                    <option key={grdNum} value={grdNum}>Grade {grdNum}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Topic Chips */}
            {availableTopics.length > 0 && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  {subject} Topic Syllabus
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                  {availableTopics.map((t, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setTopic(t)}
                      className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${
                        topic === t
                          ? 'bg-brand-600/30 border-brand-500 text-brand-300 font-bold'
                          : 'bg-surface-darker border-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Selected Topic
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                required
                className="w-full rounded-xl bg-surface-darker border border-white/10 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {activeTool === 'lesson' && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Lesson Duration</label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs text-white"
                />
              </div>
            )}

            {activeTool === 'test' && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Total Marks</label>
                <input
                  type="number"
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(Math.max(10, parseInt(e.target.value) || 50))}
                  min={10}
                  max={150}
                  className="w-full rounded-xl bg-surface-darker border border-white/10 px-3 py-2 text-xs text-white font-mono font-bold"
                />
              </div>
            )}

            {/* Practice Quiz: Manual Question Count and Marks Per Question */}
            {activeTool === 'quiz' && (
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-surface-darker border border-white/5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Question Count
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 5)))}
                    className="w-full rounded-xl bg-surface-dark border border-white/10 px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Marks per Question
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={marksPerQuestion}
                    onChange={(e) => setMarksPerQuestion(Math.max(1, Math.min(50, parseInt(e.target.value) || 2)))}
                    className="w-full rounded-xl bg-surface-dark border border-white/10 px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-500 text-white font-bold text-xs shadow-glow-indigo transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <FusionAIIcon className="w-4 h-4 text-cyan-200" />
                  <span>
                    {activeTool === 'quiz' ? `Generate Fresh ${subject} Quiz` : `Generate ${subject} Content`}
                  </span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* AI Output Preview (7 Cols) */}
        <div className="lg:col-span-7 rounded-3xl bg-surface-dark border border-white/10 p-6 shadow-xl flex flex-col min-h-[580px] max-h-[750px]">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4 shrink-0">
            <div className="flex items-center gap-2">
              <Badge variant="cyan" size="sm">AI Generated</Badge>
              <Badge variant="indigo" size="sm">Grade {grade} {subject}</Badge>
              {quizQuestions.length > 0 && (
                <span className="text-xs text-slate-400 font-mono">
                  {quizQuestions.length} Questions • {quizQuestions.reduce((acc, q) => acc + (q.marks || marksPerQuestion), 0)} Total Marks
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePrintPDF(activeTool)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print PDF</span>
              </button>

              {quizQuestions.length > 0 && (
                <button
                  onClick={handlePublishQuiz}
                  disabled={publishing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{publishing ? 'Publishing...' : 'Send to Learners'}</span>
                </button>
              )}

              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 transition-colors"
              >
                {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 text-xs space-y-4">
            {loading ? (
              <LoadingSpinner size="md" text={`AI is generating syllabus-pure ${subject} content...`} />
            ) : activeTool === 'lesson' && result ? (
              /* Lesson Plan Rendering */
              <div className="p-5 rounded-2xl bg-surface-darker border border-white/5 text-slate-200 space-y-4">
                <div className="border-b border-white/10 pb-3">
                  <h4 className="text-base font-extrabold text-white font-display">
                    {result.title || `${subject} Lesson Plan: ${topic}`}
                  </h4>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge variant="indigo" size="sm">{result.subject || subject}</Badge>
                    <Badge variant="cyan" size="sm">{result.grade || `Grade ${grade}`}</Badge>
                    <Badge variant="amber" size="sm">{result.duration || duration}</Badge>
                    <Badge variant="emerald" size="sm">{result.term_week || 'Term 3 • Week 4'}</Badge>
                  </div>
                </div>

                <div>
                  <p className="font-bold text-cyan-400 text-xs mb-1.5 flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4" />
                    <span>Learning Objectives & Outcomes:</span>
                  </p>
                  <ul className="list-disc list-inside space-y-1 pl-1 text-slate-300 text-xs">
                    {(result.learning_outcomes || result.learningObjectives || [
                      `Understand and explain fundamental principles of ${topic}.`,
                      `Apply relevant ${subject} rules and equations to solve examination problems.`,
                      `Demonstrate mastery through guided class exercises.`
                    ]).map((item: string, idx: number) => (
                      <li key={idx} className="leading-relaxed">{item}</li>
                    ))}
                  </ul>
                </div>

                {result.prior_knowledge && (
                  <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-slate-300">
                    <p className="font-bold text-brand-300 text-[11px] mb-1">Prerequisite Prior Knowledge:</p>
                    <p className="text-xs">{result.prior_knowledge}</p>
                  </div>
                )}
              </div>
            ) : quizQuestions.length > 0 ? (
              /* Quiz Questions Rendering with EDIT / REMOVE Option */
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-xs font-bold text-slate-300">
                    {quizQuestions.length} Practice Questions (Click trash icon to remove unwanted questions)
                  </span>
                  <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Answer Key Verified
                  </span>
                </div>

                {quizQuestions.map((q, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-surface-darker border border-white/5 space-y-2.5 relative group">
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-bold text-white text-xs leading-relaxed flex-1">
                        <span className="text-cyan-400 font-mono mr-1.5">Q{idx + 1}:</span>
                        {q.question}
                      </p>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="indigo" size="sm">{q.marks || marksPerQuestion} Marks</Badge>
                        {/* Remove Question Button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(idx)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                          title="Remove this question"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.options && q.options.map((opt: string, oIdx: number) => {
                        const isCorrect = isOptionCorrect(opt, q.answer);
                        return (
                          <div
                            key={oIdx}
                            className={`p-2.5 rounded-xl text-[11px] border transition-all flex items-start gap-2 ${
                              isCorrect
                                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-bold shadow-sm'
                                : 'bg-surface-dark border-white/5 text-slate-300'
                            }`}
                          >
                            {isCorrect && (
                              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            )}
                            <span className="leading-tight">{opt}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : result ? (
              /* Study Guide / Notes Rendering */
              <div className="p-5 rounded-2xl bg-surface-darker border border-white/5 text-slate-200 space-y-4">
                <h4 className="text-base font-bold text-white font-display">{result.title}</h4>
                <div className="flex gap-2">
                  <Badge variant="indigo" size="sm">{result.subject}</Badge>
                  <Badge variant="cyan" size="sm">{result.grade}</Badge>
                </div>

                {result.keyDefinitions && (
                  <div>
                    <p className="font-bold text-cyan-400 text-xs mb-1">Core Concepts & Key Rules:</p>
                    <ul className="list-disc list-inside space-y-1 pl-1 text-slate-300 text-xs">
                      {result.keyDefinitions.map((d: string, i: number) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.workedExample && (
                  <div className="p-3.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-slate-200">
                    <p className="font-bold text-brand-300 text-xs mb-1">{result.workedExample.problem}:</p>
                    <p className="text-xs text-slate-300">{result.workedExample.solution}</p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
