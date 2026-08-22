const db = require('./db');

async function seedSubjectResources() {
  console.log('[RESOURCES SEED] Seeding grade-distributed question papers and study resources into textbooks table...');

  // Ensure table columns exist
  await db.query(`
    CREATE TABLE IF NOT EXISTS textbooks (
      id SERIAL PRIMARY KEY,
      subject VARCHAR(100) NOT NULL,
      grade INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_published BOOLEAN DEFAULT TRUE,
      resource_type VARCHAR(50) DEFAULT 'past_paper',
      title VARCHAR(255),
      description TEXT,
      term VARCHAR(50),
      year INTEGER DEFAULT 2024,
      file_name VARCHAR(255),
      file_size VARCHAR(50) DEFAULT '2.4 MB',
      stream VARCHAR(50) DEFAULT 'General'
    );
  `);

  await db.query(`ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS resource_type VARCHAR(50) DEFAULT 'past_paper';`);
  await db.query(`ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS title VARCHAR(255);`);
  await db.query(`ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS description TEXT;`);
  await db.query(`ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS term VARCHAR(50);`);
  await db.query(`ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS year INTEGER DEFAULT 2024;`);
  await db.query(`ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);`);
  await db.query(`ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS file_size VARCHAR(50) DEFAULT '2.4 MB';`);
  await db.query(`ALTER TABLE textbooks ADD COLUMN IF NOT EXISTS stream VARCHAR(50) DEFAULT 'General';`);

  // Clear existing mock textbooks
  await db.query(`DELETE FROM textbooks WHERE file_path LIKE '%dbe_archive%' OR file_path LIKE '%caps_archive%';`);

  const teacherRes = await db.query(`SELECT id, full_name, surname FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'teacher') LIMIT 1;`);
  const teacherId = teacherRes.rows[0]?.id || null;

  const resources = [
    // -------------------------------------------------------------
    // GRADE 10 RESOURCES & PAST PAPERS
    // -------------------------------------------------------------
    {
      subject: 'Mathematics',
      grade: 10,
      stream: 'Science',
      resource_type: 'past_paper',
      title: 'Grade 10 Mathematics November Final Exam Paper 1 (Algebra, Functions & Finance)',
      description: 'Official DBE CAPS Final Examination Paper covering Algebraic expressions, Linear & Quadratic equations, Number patterns, Hyperbolic/Exponential functions, and Financial Maths.',
      term: 'Term 4 Final Exam',
      year: 2024,
      file_name: 'Mathematics_Gr10_Nov2024_P1.pdf',
      file_size: '2.8 MB',
      file_path: '/assets/caps_archive/Mathematics_Gr10_Nov2024_P1.pdf'
    },
    {
      subject: 'Mathematics',
      grade: 10,
      stream: 'Science',
      resource_type: 'past_paper',
      title: 'Grade 10 Mathematics November Final Exam Paper 2 (Geometry, Trigonometry & Stats)',
      description: 'Official DBE CAPS Examination Paper covering Euclidean Geometry congruency/similarity, Analytical Geometry, 2D Trigonometry, and Grouped Data Statistics.',
      term: 'Term 4 Final Exam',
      year: 2024,
      file_name: 'Mathematics_Gr10_Nov2024_P2.pdf',
      file_size: '3.1 MB',
      file_path: '/assets/caps_archive/Mathematics_Gr10_Nov2024_P2.pdf'
    },
    {
      subject: 'Mathematics',
      grade: 10,
      stream: 'Science',
      resource_type: 'study_guide',
      title: 'Grade 10 Mathematics Mind the Gap Core Study Guide & Summary Notes',
      description: 'Step-by-step worked examples, algebraic factorisation techniques, function sketching guidelines, and past exam practice questions with full memos.',
      term: 'Full Year Syllabus',
      year: 2024,
      file_name: 'Mind_The_Gap_Mathematics_Grade_10.pdf',
      file_size: '6.4 MB',
      file_path: '/assets/caps_archive/Mind_The_Gap_Mathematics_Grade_10.pdf'
    },
    {
      subject: 'Physical Sciences',
      grade: 10,
      stream: 'Science',
      resource_type: 'past_paper',
      title: 'Grade 10 Physical Sciences November Final Exam Paper 1 (Physics)',
      description: 'CAPS National Assessment covering 1D Motion & Equations of Motion, Vectors & Scalars, Mechanical Energy, Wave properties, and Electric Circuits.',
      term: 'Term 4 Final Exam',
      year: 2024,
      file_name: 'Physical_Sciences_Gr10_Nov2024_P1.pdf',
      file_size: '2.5 MB',
      file_path: '/assets/caps_archive/Physical_Sciences_Gr10_Nov2024_P1.pdf'
    },
    {
      subject: 'Physical Sciences',
      grade: 10,
      stream: 'Science',
      resource_type: 'past_paper',
      title: 'Grade 10 Physical Sciences November Final Exam Paper 2 (Chemistry)',
      description: 'CAPS Examination covering Matter & Materials, Atomic Structure & Electron Configurations, Chemical Bonding (Ionic/Covalent), and Stoichiometric Balancing.',
      term: 'Term 4 Final Exam',
      year: 2024,
      file_name: 'Physical_Sciences_Gr10_Nov2024_P2.pdf',
      file_size: '2.7 MB',
      file_path: '/assets/caps_archive/Physical_Sciences_Gr10_Nov2024_P2.pdf'
    },
    {
      subject: 'Life Sciences',
      grade: 10,
      stream: 'Science',
      resource_type: 'past_paper',
      title: 'Grade 10 Life Sciences November Final Exam Paper 1 (Cellular & Plant Anatomy)',
      description: 'CAPS Curriculum exam covering Molecular Chemistry of Life, Cell Organelles & Microscopy, Plant & Animal Tissues, Support Systems and Skeleton.',
      term: 'Term 4 Final Exam',
      year: 2024,
      file_name: 'Life_Sciences_Gr10_Nov2024_P1.pdf',
      file_size: '3.4 MB',
      file_path: '/assets/caps_archive/Life_Sciences_Gr10_Nov2024_P1.pdf'
    },
    {
      subject: 'Life Sciences',
      grade: 10,
      stream: 'Science',
      resource_type: 'past_paper',
      title: 'Grade 10 Life Sciences November Final Exam Paper 2 (Biosphere & Biomes)',
      description: 'CAPS Exam covering South African Biomes & Ecosystems, Human Circulatory System, Biodiversity, and History of Life on Earth.',
      term: 'Term 4 Final Exam',
      year: 2024,
      file_name: 'Life_Sciences_Gr10_Nov2024_P2.pdf',
      file_size: '3.2 MB',
      file_path: '/uploads/textbooks/2017_Gr11_Grade_11_Mathematics_Paper_1_English_2017_.pdf'
    },
    {
      subject: 'English FAL',
      grade: 10,
      stream: 'General',
      resource_type: 'past_paper',
      title: 'Grade 10 English First Additional Language Paper 1 (Language in Context)',
      description: 'DBE Official Paper 1 covering Reading Comprehension, Summary Writing, Cartoon Analysis, Advertisement Evaluation, and Language Editing Mechanics.',
      term: 'Term 4 Final Exam',
      year: 2024,
      file_name: 'English_FAL_Gr10_Nov2024_P1.pdf',
      file_size: '1.9 MB',
      file_path: '/assets/caps_archive/English_FAL_Gr10_Nov2024_P1.pdf'
    },
    {
      subject: 'Accounting',
      grade: 10,
      stream: 'Commerce',
      resource_type: 'past_paper',
      title: 'Grade 10 Accounting November Exam Paper 1 (Financial Accounting & General Ledger)',
      description: 'CAPS Paper covering Accounting Equation (A = O + L), CRJ/CPJ/DJ/CJ Subsidiary Journals, General Ledger Accounts, and Sole Trader Income Statements.',
      term: 'Term 4 Final Exam',
      year: 2024,
      file_name: 'Accounting_Gr10_Nov2024_P1.pdf',
      file_size: '2.1 MB',
      file_path: '/assets/caps_archive/Accounting_Gr10_Nov2024_P1.pdf'
    },
    {
      subject: 'isiZulu Home Language',
      grade: 10,
      stream: 'General',
      resource_type: 'past_paper',
      title: 'Ibanga 10 isiZulu Ulimi Lwasekhaya IPhepha 1 (Ukuqondisisa nohlelo lolwimi)',
      description: 'Ukuhlolwa kuka-November: Ukuqondisisa, Ukufingqa (Summary), Izifengqo (Figures of Speech), Izaga nezisho kanye Nohlelo Lolwimi.',
      term: 'Term 4 Final Exam',
      year: 2024,
      file_name: 'isiZulu_HL_Gr10_Nov2024_P1.pdf',
      file_size: '2.3 MB',
      file_path: '/assets/caps_archive/isiZulu_HL_Gr10_Nov2024_P1.pdf'
    },

    // -------------------------------------------------------------
    // GRADE 11 RESOURCES & PAST PAPERS
    // -------------------------------------------------------------
    {
      subject: 'Mathematics',
      grade: 11,
      stream: 'Science',
      resource_type: 'past_paper',
      title: 'Grade 11 Mathematics November Final Exam Paper 1 (Algebra, Patterns & Functions)',
      description: 'CAPS Final Paper 1 covering Exponents & Surds, Quadratic Equations & Inequalities, Nature of Roots, Quadratic Sequences, and Financial Depreciation.',
      term: 'Term 4 Final Exam',
      year: 2024,
      file_name: 'Mathematics_Gr11_Nov2024_P1.pdf',
      file_size: '2.9 MB',
      file_path: '/assets/caps_archive/Mathematics_Gr11_Nov2024_P1.pdf'
    },
    {
      subject: 'Mathematics',
      grade: 11,
      stream: 'Science',
      resource_type: 'past_paper',
      title: 'Grade 11 Mathematics November Final Exam Paper 2 (Euclidean Circle Geometry & Trig)',
      description: 'CAPS Final Paper 2 covering Circle Geometry theorems (Cyclic quads, Tan-chord), Trigonometric identities & Reduction, Sine/Cosine rules, and Analytical inclination.',
      term: 'Term 4 Final Exam',
      year: 2024,
      file_name: 'Mathematics_Gr11_Nov2024_P2.pdf',
      file_size: '3.2 MB',
      file_path: '/assets/caps_archive/Mathematics_Gr11_Nov2024_P2.pdf'
    },
    {
      subject: 'Physical Sciences',
      grade: 11,
      stream: 'Science',
      resource_type: 'past_paper',
      title: 'Grade 11 Physical Sciences November Final Exam Paper 1 (Physics - Newtons Laws)',
      description: 'CAPS Examination covering 2D Vectors, Newtons Laws of Motion, Universal Gravitation, Snells Law Optics, and Coulombs Law Electrostatics.',
      term: 'Term 4 Final Exam',
      year: 2024,
      file_name: 'Physical_Sciences_Gr11_Nov2024_P1.pdf',
      file_size: '3.0 MB',
      file_path: '/assets/caps_archive/Physical_Sciences_Gr11_Nov2024_P1.pdf'
    },
    {
      subject: 'Physical Sciences',
      grade: 11,
      stream: 'Science',
      resource_type: 'past_paper',
      title: 'Grade 11 Physical Sciences November Final Exam Paper 2 (Chemistry - Stoichiometry & Gases)',
      description: 'CAPS Examination covering Molecular Shapes (VSEPR), Intermolecular Forces, Ideal Gas Laws (PV=nRT), Quantitative Stoichiometry, and Energy Changes (ΔH).',
      term: 'Term 4 Final Exam',
      year: 2024,
      file_name: 'Physical_Sciences_Gr11_Nov2024_P2.pdf',
      file_size: '2.8 MB',
      file_path: '/assets/caps_archive/Physical_Sciences_Gr11_Nov2024_P2.pdf'
    },
    {
      subject: 'Life Sciences',
      grade: 11,
      stream: 'Science',
      resource_type: 'past_paper',
      title: 'Grade 11 Life Sciences November Final Exam Paper 1 (Photosynthesis & Respiration)',
      description: 'CAPS Examination covering Photosynthesis Light/Dark reactions, Cellular Respiration Glycolysis/Krebs, Human Nutrition, and Kidney Excretion.',
      term: 'Term 4 Final Exam',
      year: 2024,
      file_name: 'Life_Sciences_Gr11_Nov2024_P1.pdf',
      file_size: '3.5 MB',
      file_path: '/assets/caps_archive/Life_Sciences_Gr11_Nov2024_P1.pdf'
    },
    {
      subject: 'Life Sciences',
      grade: 11,
      stream: 'Science',
      resource_type: 'past_paper',
      title: 'Grade 11 Life Sciences November Final Exam Paper 2 (Biodiversity & Population Ecology)',
      description: 'CAPS Examination covering Microorganism Diversity (Viruses, Bacteria, Fungi), Plant & Animal Diversity, and Population Dynamics & Mark-Recapture.',
      term: 'Term 4 Final Exam',
      year: 2024,
      file_name: 'Life_Sciences_Gr11_Nov2024_P2.pdf',
      file_size: '3.3 MB',
      file_path: '/assets/caps_archive/Life_Sciences_Gr11_Nov2024_P2.pdf'
    },
    {
      subject: 'Accounting',
      grade: 11,
      stream: 'Commerce',
      resource_type: 'past_paper',
      title: 'Grade 11 Accounting November Final Exam Paper 1 (Partnerships & Reconciliations)',
      description: 'CAPS Examination covering Partnership Financial Statements, Balance Sheet Notes, Bank Reconciliation, and Creditors Reconciliation.',
      term: 'Term 4 Final Exam',
      year: 2024,
      file_name: 'Accounting_Gr11_Nov2024_P1.pdf',
      file_size: '2.6 MB',
      file_path: '/assets/caps_archive/Accounting_Gr11_Nov2024_P1.pdf'
    },
    {
      subject: 'English FAL',
      grade: 11,
      stream: 'General',
      resource_type: 'past_paper',
      title: 'Grade 11 English First Additional Language Paper 1 (Language in Context)',
      description: 'DBE Official Paper 1 covering Reading Comprehension, Summary Writing, Cartoon Analysis, and Language Editing Conventions.',
      term: 'Term 4 Final Exam',
      year: 2024,
      file_name: 'English_FAL_Gr11_Nov2024_P1.pdf',
      file_size: '2.1 MB',
      file_path: '/assets/caps_archive/English_FAL_Gr11_Nov2024_P1.pdf'
    },
    {
      subject: 'isiZulu Home Language',
      grade: 11,
      stream: 'General',
      resource_type: 'past_paper',
      title: 'Ibanga 11 isiZulu Ulimi Lwasekhaya IPhepha 1 (Ukuqondisisa nohlelo lolwimi)',
      description: 'Ukuhlolwa kuka-November: Ukuqondisisa, Ukufingqa, Izifengqo, Izaga nezisho kanye Nohlelo Lolwimi.',
      term: 'Term 4 Final Exam',
      year: 2024,
      file_name: 'isiZulu_HL_Gr11_Nov2024_P1.pdf',
      file_size: '2.4 MB',
      file_path: '/assets/caps_archive/isiZulu_HL_Gr11_Nov2024_P1.pdf'
    },
    {
      subject: 'Business Studies',
      grade: 10,
      stream: 'Commerce',
      resource_type: 'past_paper',
      title: 'Grade 10 Business Studies November Exam Paper 1 (Business Environments)',
      description: 'CAPS Examination covering Micro, Market, and Macro Environments, Business Sectors, and Forms of Ownership.',
      term: 'Term 4 Final Exam',
      year: 2024,
      file_name: 'Business_Studies_Gr10_Nov2024_P1.pdf',
      file_size: '2.2 MB',
      file_path: '/assets/caps_archive/Business_Studies_Gr10_Nov2024_P1.pdf'
    },
    {
      subject: 'Economics',
      grade: 10,
      stream: 'Commerce',
      resource_type: 'past_paper',
      title: 'Grade 10 Economics November Exam Paper 1 (Basic Economic Problem & Circular Flow)',
      description: 'CAPS Examination covering Scarcity, Factors of Production, Circular Flow Model, and South African Economic Structure.',
      term: 'Term 4 Final Exam',
      year: 2024,
      file_name: 'Economics_Gr10_Nov2024_P1.pdf',
      file_size: '2.3 MB',
      file_path: '/assets/caps_archive/Economics_Gr10_Nov2024_P1.pdf'
    },

    // -------------------------------------------------------------
    // GRADE 12 (MATRIC NSC) RESOURCES & PAST PAPERS
    // -------------------------------------------------------------
    {
      subject: 'Mathematics',
      grade: 12,
      stream: 'Science',
      resource_type: 'past_paper',
      title: 'Grade 12 Mathematics National Senior Certificate (NSC) Paper 1 (Calculus & Sequences)',
      description: 'Official National NSC Exam Paper 1 covering Arithmetic/Geometric Series, Inverse Functions, Differential Calculus, Financial Annuities, and Probability Counting Principle.',
      term: 'NSC Final Exam',
      year: 2024,
      file_name: 'Mathematics_Gr12_NSC_Nov2024_P1.pdf',
      file_size: '3.6 MB',
      file_path: '/assets/caps_archive/Mathematics_Gr12_NSC_Nov2024_P1.pdf'
    },
    {
      subject: 'Mathematics',
      grade: 12,
      stream: 'Science',
      resource_type: 'past_paper',
      title: 'Grade 12 Mathematics National Senior Certificate (NSC) Paper 2 (Trigonometry & Geometry)',
      description: 'Official National NSC Exam Paper 2 covering Proportionality & Similarity Geometry, Double/Compound Angle Trig, Analytical Circle Equations, and Least-Squares Regression.',
      term: 'NSC Final Exam',
      year: 2024,
      file_name: 'Mathematics_Gr12_NSC_Nov2024_P2.pdf',
      file_size: '3.8 MB',
      file_path: '/assets/caps_archive/Mathematics_Gr12_NSC_Nov2024_P2.pdf'
    },
    {
      subject: 'Physical Sciences',
      grade: 12,
      stream: 'Science',
      resource_type: 'past_paper',
      title: 'Grade 12 Physical Sciences NSC Paper 1 (Physics - Mechanics & Electrodynamics)',
      description: 'Official National NSC Examination covering Momentum & Impulse, Vertical Projectile Motion, Work-Energy Theorem, Doppler Effect, and Electrodynamics/Photoelectric Effect.',
      term: 'NSC Final Exam',
      year: 2024,
      file_name: 'Physical_Sciences_Gr12_NSC_Nov2024_P1.pdf',
      file_size: '3.2 MB',
      file_path: '/assets/caps_archive/Physical_Sciences_Gr12_NSC_Nov2024_P1.pdf'
    },
    {
      subject: 'Physical Sciences',
      grade: 12,
      stream: 'Science',
      resource_type: 'past_paper',
      title: 'Grade 12 Physical Sciences NSC Paper 2 (Chemistry - Organic & Equilibrium)',
      description: 'Official National NSC Examination covering Organic Chemistry IUPAC & Reactions, Chemical Equilibrium (Kc), Rates of Reaction, Acids/Bases Titrations, and Electrochemical Cells.',
      term: 'NSC Final Exam',
      year: 2024,
      file_name: 'Physical_Sciences_Gr12_NSC_Nov2024_P2.pdf',
      file_size: '3.4 MB',
      file_path: '/assets/caps_archive/Physical_Sciences_Gr12_NSC_Nov2024_P2.pdf'
    },
    {
      subject: 'Life Sciences',
      grade: 12,
      stream: 'Science',
      resource_type: 'past_paper',
      title: 'Grade 12 Life Sciences NSC Paper 1 (Reproduction & Endocrine Systems)',
      description: 'Official National NSC Examination covering Meiosis, Human Reproduction & Fertilization, Endocrine System, Homeostasis, and Human Response to the Environment.',
      term: 'NSC Final Exam',
      year: 2024,
      file_name: 'Life_Sciences_Gr12_NSC_Nov2024_P1.pdf',
      file_size: '3.9 MB',
      file_path: '/assets/caps_archive/Life_Sciences_Gr12_NSC_Nov2024_P1.pdf'
    },
    {
      subject: 'Life Sciences',
      grade: 12,
      stream: 'Science',
      resource_type: 'past_paper',
      title: 'Grade 12 Life Sciences NSC Paper 2 (Genetics, DNA & Human Evolution)',
      description: 'Official National NSC Examination covering DNA & RNA Protein Synthesis, Genetics & Monohybrid/Dihybrid Crosses, Human Evolution, and Speciation by Natural Selection.',
      term: 'NSC Final Exam',
      year: 2024,
      file_name: 'Life_Sciences_Gr12_NSC_Nov2024_P2.pdf',
      file_size: '4.1 MB',
      file_path: '/assets/caps_archive/Life_Sciences_Gr12_NSC_Nov2024_P2.pdf'
    },
    {
      subject: 'Accounting',
      grade: 12,
      stream: 'Commerce',
      resource_type: 'past_paper',
      title: 'Grade 12 Accounting NSC Paper 1 (Companies Financial Reporting & Audit)',
      description: 'Official National NSC Examination covering Company Financial Statements, Balance Sheet Notes, Cash Flow Statements, Corporate Governance, and Financial Indicator Analysis.',
      term: 'NSC Final Exam',
      year: 2024,
      file_name: 'Accounting_Gr12_NSC_Nov2024_P1.pdf',
      file_size: '2.9 MB',
      file_path: '/assets/caps_archive/Accounting_Gr12_NSC_Nov2024_P1.pdf'
    },
    {
      subject: 'Business Studies',
      grade: 12,
      stream: 'Commerce',
      resource_type: 'past_paper',
      title: 'Grade 12 Business Studies NSC Paper 1 (Business Environments & Operations)',
      description: 'Official National NSC Examination covering Macro & Market Environments, Legislation (B-BBEE, LRA, BCEA, SDA, COIDA), and Human Resource Operations.',
      term: 'NSC Final Exam',
      year: 2024,
      file_name: 'Business_Studies_Gr12_NSC_Nov2024_P1.pdf',
      file_size: '2.5 MB',
      file_path: '/assets/caps_archive/Business_Studies_Gr12_NSC_Nov2024_P1.pdf'
    },
    {
      subject: 'Economics',
      grade: 12,
      stream: 'Commerce',
      resource_type: 'past_paper',
      title: 'Grade 12 Economics NSC Paper 1 (Macroeconomics & Economic Pursuits)',
      description: 'Official National NSC Examination covering Circular Flow, National Account Aggregates (GDP/GNI), Foreign Exchange Markets, and Protectionism vs Free Trade.',
      term: 'NSC Final Exam',
      year: 2024,
      file_name: 'Economics_Gr12_NSC_Nov2024_P1.pdf',
      file_size: '2.7 MB',
      file_path: '/assets/caps_archive/Economics_Gr12_NSC_Nov2024_P1.pdf'
    },
    {
      subject: 'Tourism',
      grade: 12,
      stream: 'Tourism',
      resource_type: 'past_paper',
      title: 'Grade 12 Tourism NSC National Examination (Time Zones & Sustainable Tourism)',
      description: 'Official National NSC Examination covering Greenwich Mean Time (GMT) Calculations, World Heritage Sites, Foreign Exchange (BSR/BBR), and Customer Care Culture.',
      term: 'NSC Final Exam',
      year: 2024,
      file_name: 'Tourism_Gr12_NSC_Nov2024_P1.pdf',
      file_size: '2.4 MB',
      file_path: '/assets/caps_archive/Tourism_Gr12_NSC_Nov2024_P1.pdf'
    },
    {
      subject: 'Mathematical Literacy',
      grade: 12,
      stream: 'Tourism',
      resource_type: 'past_paper',
      title: 'Grade 12 Mathematical Literacy NSC Paper 1 (Finance & Measurement)',
      description: 'Official National NSC Examination covering SARS Income Tax Brackets, Tariffs, Loan Repayment Schedules, and Metric Conversions.',
      term: 'NSC Final Exam',
      year: 2024,
      file_name: 'Mathematical_Literacy_Gr12_NSC_Nov2024_P1.pdf',
      file_size: '2.8 MB',
      file_path: '/assets/caps_archive/Mathematical_Literacy_Gr12_NSC_Nov2024_P1.pdf'
    }
  ];

  for (const item of resources) {
    await db.query(`
      INSERT INTO textbooks (
        subject, grade, stream, resource_type, title, description, term, year, file_name, file_size, file_path, teacher_id, is_published
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true)
      ON CONFLICT DO NOTHING
    `, [
      item.subject,
      item.grade,
      item.stream,
      item.resource_type,
      item.title,
      item.description,
      item.term,
      item.year,
      item.file_name,
      item.file_size,
      item.file_path,
      teacherId
    ]);
  }

  const countRes = await db.query(`SELECT grade, subject, COUNT(*) FROM textbooks GROUP BY grade, subject ORDER BY grade, subject;`);
  console.log('✅ [SUCCESS] Seeded CAPS Past Papers & Resources across Grades:');
  console.table(countRes.rows);

  process.exit(0);
}

seedSubjectResources().catch(err => {
  console.error('Failed to seed resources:', err);
  process.exit(1);
});
