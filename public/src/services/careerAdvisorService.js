/**
 * Career & University Pathway Advisor Service
 * South African Department of Basic Education CAPS & National Senior Certificate (NSC) Standards
 * Supports Grade 9 Subject Choice Guidance and Grade 10-12 / Matric Candidate University Eligibility
 */

// NSC Rating Scale: Level 1 to 7
function percentageToNscLevel(percentage) {
  const p = Math.round(Number(percentage) || 0);
  if (p >= 80) return { level: 7, points: 7, label: 'Outstanding Achievement' };
  if (p >= 70) return { level: 6, points: 6, label: 'Meritorious Achievement' };
  if (p >= 60) return { level: 5, points: 5, label: 'Substantial Achievement' };
  if (p >= 50) return { level: 4, points: 4, label: 'Moderate Achievement (Bachelor Pass Min)' };
  if (p >= 40) return { level: 3, points: 3, label: 'Adequate Achievement (Diploma Pass Min)' };
  if (p >= 30) return { level: 2, points: 2, label: 'Elementary Achievement (Higher Cert Min)' };
  return { level: 1, points: 1, label: 'Not Achieved' };
}

// Calculate APS Score from subject marks
function calculateAps(subjectMarks = []) {
  if (!Array.isArray(subjectMarks) || subjectMarks.length === 0) {
    return {
      apsTotalWithLo: 0,
      apsWithoutLo: 0,
      nscPassType: 'Incomplete Assessment',
      subjectBreakdown: []
    };
  }

  const breakdown = subjectMarks.map(s => {
    const rawMark = Number(s.mark !== undefined ? s.mark : s.grade) || 0;
    const nsc = percentageToNscLevel(rawMark);
    const isLo = (s.subject || s.name || '').toLowerCase().includes('life orientation');
    return {
      subject: s.subject || s.name || 'Subject',
      mark: rawMark,
      level: nsc.level,
      points: nsc.points,
      isLo,
      label: nsc.label
    };
  });

  // Calculate standard APS (excluding LO for top 6 subjects, as required by Wits, UCT, UP, UJ, etc.)
  const nonLoSubjects = breakdown.filter(s => !s.isLo).sort((a, b) => b.points - a.points);
  const loSubject = breakdown.find(s => s.isLo);

  // Top 6 non-LO subjects
  const top6NonLo = nonLoSubjects.slice(0, 6);
  const apsWithoutLo = top6NonLo.reduce((sum, item) => sum + item.points, 0);

  // APS with LO (some institutions count 50%+ LO as 1 to 3 points, or full points)
  let loPoints = 0;
  if (loSubject) {
    loPoints = loSubject.points;
  }
  const apsTotalWithLo = apsWithoutLo + loPoints;

  // Determine NSC Qualification Endorsement
  // Bachelor's Degree Pass: 4 subjects at Level 4 (50%+) excluding LO + Home Language 40%+ + LO 30%+
  // Diploma Pass: 4 subjects at Level 3 (40%+) including Home Language
  // Higher Certificate: 3 subjects at Level 3 (40%+) including Home Language
  let passType = 'Bachelor Degree Pass';
  const subjectsAt50Plus = breakdown.filter(s => !s.isLo && s.mark >= 50).length;
  const subjectsAt40Plus = breakdown.filter(s => !s.isLo && s.mark >= 40).length;

  if (subjectsAt50Plus >= 4) {
    passType = "Bachelor's Degree Pass (Endorsement to Study Degrees at University)";
  } else if (subjectsAt40Plus >= 4) {
    passType = 'Diploma Pass (Eligible for National Diploma Programmes)';
  } else {
    passType = 'Higher Certificate Pass (Eligible for Higher Certificate Programmes)';
  }

  return {
    apsWithoutLo,
    apsTotalWithLo,
    nscPassType: passType,
    subjectBreakdown: breakdown,
    topSubjectsCount: top6NonLo.length
  };
}

// South African University Degree & Diploma Matrix
const SA_DEGREE_PROGRAMMES = [
  // HEALTH SCIENCES
  {
    name: 'MBChB (Medicine & Surgery)',
    faculty: 'Health Sciences',
    minAps: 38,
    requiredSubjects: { 'Mathematics': 60, 'Physical Sciences': 60, 'English FAL': 60 },
    universities: ['Wits', 'UCT', 'UP', 'Stellenbosch', 'UKZN', 'UFS'],
    careerProspects: ['Medical Doctor', 'Surgeon', 'Clinical Researcher', 'Specialist Physician'],
    description: 'Premier medical degree qualifying candidates for clinical practice across South African and international healthcare systems.'
  },
  {
    name: 'BSc Nursing Science',
    faculty: 'Health Sciences',
    minAps: 30,
    requiredSubjects: { 'Life Sciences': 50, 'English FAL': 50 },
    universities: ['UJ', 'UP', 'Wits', 'UKZN', 'TUT', 'UWC'],
    careerProspects: ['Registered Professional Nurse', 'Critical Care Specialist', 'Nurse Educator', 'Hospital Administrator'],
    description: 'Prepares candidates for nursing, community health, and specialized clinical care.'
  },
  {
    name: 'Bachelor of Pharmacy (BPharm)',
    faculty: 'Health Sciences',
    minAps: 34,
    requiredSubjects: { 'Mathematics': 55, 'Physical Sciences': 55, 'Life Sciences': 50 },
    universities: ['Wits', 'Rhodes', 'UWC', 'NWU', 'UKZN'],
    careerProspects: ['Clinical Pharmacist', 'Pharmaceutical Researcher', 'Industrial Quality Analyst'],
    description: 'Focuses on drug therapy, pharmaceutical chemistry, pharmacology, and patient medication management.'
  },

  // ENGINEERING & BUILT ENVIRONMENT
  {
    name: 'BSc / BEng Mechanical Engineering',
    faculty: 'Engineering & Built Environment',
    minAps: 36,
    requiredSubjects: { 'Mathematics': 70, 'Physical Sciences': 70 },
    universities: ['Wits', 'UP', 'UCT', 'Stellenbosch', 'UJ', 'NWU'],
    careerProspects: ['Mechanical Engineer', 'Robotics Specialist', 'Automotive Designer', 'Energy Consultant'],
    description: 'Design, manufacturing, thermodynamics, and robotics systems engineering.'
  },
  {
    name: 'BSc / BEng Electrical & Electronic Engineering',
    faculty: 'Engineering & Built Environment',
    minAps: 36,
    requiredSubjects: { 'Mathematics': 70, 'Physical Sciences': 70 },
    universities: ['Wits', 'UP', 'UCT', 'Stellenbosch', 'UJ'],
    careerProspects: ['Power Systems Engineer', 'Telecommunications Architect', 'Embedded Hardware Engineer'],
    description: 'Electrical grid engineering, renewable power, electronics, and telecommunications.'
  },
  {
    name: 'BSc Civil Engineering',
    faculty: 'Engineering & Built Environment',
    minAps: 34,
    requiredSubjects: { 'Mathematics': 65, 'Physical Sciences': 65 },
    universities: ['Wits', 'UP', 'UCT', 'Stellenbosch', 'UKZN'],
    careerProspects: ['Structural Engineer', 'Infrastructure Developer', 'Water Resources Engineer'],
    description: 'Large-scale infrastructure, bridge, transportation, and structural engineering.'
  },
  {
    name: 'BSc Architecture / Architectural Studies',
    faculty: 'Engineering & Built Environment',
    minAps: 30,
    requiredSubjects: { 'Mathematics': 50, 'English FAL': 50 },
    universities: ['Wits', 'UCT', 'UP', 'UJ', 'UKZN'],
    careerProspects: ['Professional Architect', 'Urban Designer', 'Sustainable Building Consultant'],
    description: 'Spatial design, sustainable building technology, and urban planning.'
  },

  // SCIENCE & INFORMATION TECHNOLOGY
  {
    name: 'BSc Computer Science & Software Engineering',
    faculty: 'Science & Computing',
    minAps: 34,
    requiredSubjects: { 'Mathematics': 65 },
    universities: ['Wits', 'UCT', 'UP', 'UJ', 'Stellenbosch', 'NWU'],
    careerProspects: ['Full-Stack Software Engineer', 'AI/ML Specialist', 'Cybersecurity Analyst', 'Cloud Solutions Architect'],
    description: 'High-demand degree focusing on algorithms, software architecture, artificial intelligence, and cloud engineering.'
  },
  {
    name: 'BSc Actuarial Science',
    faculty: 'Science & Mathematical Sciences',
    minAps: 38,
    requiredSubjects: { 'Mathematics': 80 },
    universities: ['Wits', 'UCT', 'UP', 'Stellenbosch'],
    careerProspects: ['Actuary', 'Quantitative Financial Analyst', 'Risk Strategist', 'Investment Banker'],
    description: 'Advanced mathematics, statistics, and financial modeling for risk and insurance markets.'
  },
  {
    name: 'BSc Biological Sciences (Biochemistry / Genetics / Microbiology)',
    faculty: 'Science',
    minAps: 32,
    requiredSubjects: { 'Life Sciences': 60, 'Mathematics': 55, 'Physical Sciences': 50 },
    universities: ['Wits', 'UP', 'UCT', 'UKZN', 'Stellenbosch', 'UJ'],
    careerProspects: ['Biotechnologist', 'Genetics Researcher', 'Medical Laboratory Scientist', 'Ecologist'],
    description: 'Explores cellular biochemistry, molecular genetics, immunology, and environmental biodiversity.'
  },
  {
    name: 'Diploma in Information Technology (Software Development)',
    faculty: 'Information & Communications Technology',
    minAps: 24,
    requiredSubjects: { 'Mathematics': 40 },
    universities: ['TUT', 'VUT', 'DUT', 'CUT', 'CPUT', 'UJ'],
    careerProspects: ['Junior Web Developer', 'Database Administrator', 'Network Technician', 'Systems Support Specialist'],
    description: 'Hands-on applied programming, network administration, and enterprise database systems.'
  },

  // COMMERCE, ACCOUNTING & LAW
  {
    name: 'BCom Accounting (CA Stream / SAICA Accredited)',
    faculty: 'Commerce & Management',
    minAps: 34,
    requiredSubjects: { 'Mathematics': 60, 'Accounting': 60 },
    universities: ['Wits', 'UP', 'UJ', 'UCT', 'Stellenbosch', 'UKZN'],
    careerProspects: ['Chartered Accountant (CA(SA))', 'Chief Financial Officer (CFO)', 'Auditor', 'Tax Strategist'],
    description: 'Premier path to becoming a South African Chartered Accountant accredited by SAICA.'
  },
  {
    name: 'BCom Economics & Econometrics',
    faculty: 'Commerce & Management',
    minAps: 32,
    requiredSubjects: { 'Mathematics': 55 },
    universities: ['Wits', 'UJ', 'UP', 'UCT', 'Stellenbosch'],
    careerProspects: ['Economic Analyst', 'Market Trend Forecaster', 'Policy Advisor', 'Treasury Consultant'],
    description: 'Macroeconomics, microeconomics, econometric modeling, and international trade policy.'
  },
  {
    name: 'BCom Business Management',
    faculty: 'Commerce & Management',
    minAps: 28,
    requiredSubjects: { 'Mathematics': 50 },
    universities: ['UJ', 'UP', 'NWU', 'UFS', 'Unisa'],
    careerProspects: ['Business Operations Manager', 'Entrepreneur', 'Marketing Director', 'Supply Chain Coordinator'],
    description: 'Strategic management, corporate governance, marketing, and entrepreneurship.'
  },
  {
    name: 'LLB (Bachelor of Laws)',
    faculty: 'Law',
    minAps: 32,
    requiredSubjects: { 'English FAL': 60 },
    universities: ['Wits', 'UP', 'UCT', 'UJ', 'Stellenbosch', 'UKZN', 'UFS'],
    careerProspects: ['Attorney', 'Advocate', 'Corporate Legal Advisor', 'Magistrate / Judge'],
    description: 'Qualifies candidates to enter the legal profession as an admitted attorney or advocate of the High Court.'
  },

  // HUMANITIES, EDUCATION & TOURISM
  {
    name: 'BEd Bachelor of Education (Senior & FET Phase: Grades 8-12)',
    faculty: 'Education',
    minAps: 26,
    requiredSubjects: { 'English FAL': 50 },
    universities: ['UJ', 'Wits', 'UP', 'NWU', 'UFS', 'UKZN'],
    careerProspects: ['High School Educator', 'Curriculum Developer', 'School Principal', 'Educational Specialist'],
    description: 'Professional educator degree preparing subject specialists for secondary schools under the CAPS curriculum.'
  },
  {
    name: 'BA in Media & Journalism / Communication Studies',
    faculty: 'Humanities & Social Sciences',
    minAps: 28,
    requiredSubjects: { 'English FAL': 60 },
    universities: ['Wits', 'UJ', 'Rhodes', 'UCT', 'Stellenbosch'],
    careerProspects: ['Broadcasting Journalist', 'Public Relations Specialist', 'Digital Content Director', 'Media Editor'],
    description: 'Multimedia journalism, investigative reporting, digital media production, and corporate communication.'
  },
  {
    name: 'Diploma in Tourism & Hospitality Management',
    faculty: 'Management Sciences',
    minAps: 22,
    requiredSubjects: { 'English FAL': 40 },
    universities: ['TUT', 'DUT', 'CPUT', 'CUT', 'UJ'],
    careerProspects: ['Eco-Tourism Manager', 'Travel Operations Director', 'Hotel General Manager', 'Events Coordinator'],
    description: 'Tourism marketing, airline operations, hospitality systems, and sustainable destination management.'
  }
];

// South African Bursary & Funding Schemes Directory
const SA_BURSARIES_DIRECTORY = [
  {
    id: 'nsfas',
    name: 'NSFAS (National Student Financial Aid Scheme)',
    funder: 'South African Government (DHET)',
    coverage: '100% Tuition, Accommodation, Living Allowance, Books & Laptop',
    eligibility: 'Combined household income of R350,000 per year or less; South African citizen; admitted to any public university or TVET college.',
    deadline: 'Annual Applications open September to January',
    link: 'https://www.nsfas.org.za',
    priorityStreams: ['All Streams (Science, Commerce, Tourism, Humanities)']
  },
  {
    id: 'funza-lushaka',
    name: 'Funza Lushaka Teaching Bursary',
    funder: 'Department of Basic Education (DBE)',
    coverage: 'Full Tuition, Accommodation, Meals, Book Allowance & Monthly Stipend',
    eligibility: 'Matric Candidates entering BEd or PGCE teaching degrees specializing in Mathematics, Physical Sciences, Foundation Phase, or African Languages.',
    deadline: 'Closes January annually',
    link: 'https://www.funzalushaka.doe.gov.za',
    priorityStreams: ['Science', 'Commerce', 'General', 'Education']
  },
  {
    id: 'thuthuka',
    name: 'Thuthuka Bursary Fund (SAICA)',
    funder: 'South African Institute of Chartered Accountants',
    coverage: 'Comprehensive Tuition, Residence, Meals, Books, Mentorship & Academic Support',
    eligibility: 'Grade 12 Candidates studying BCom Accounting (CA-Stream) with minimum Level 5 (60%+) in pure Mathematics.',
    deadline: 'Closes 30 April annually',
    link: 'https://www.thuthukabursaryfund.co.za',
    priorityStreams: ['Commerce']
  },
  {
    id: 'sasol',
    name: 'Sasol Corporate Bursary Programme',
    funder: 'Sasol Energy & Chemical Group',
    coverage: 'Full Tuition, Residence, Meals, Laptop, Allowance & Vacation Work Placement',
    eligibility: 'Matric Candidates with minimum Level 6 (70%+) in Mathematics and Physical Sciences for Engineering and Data Science degrees.',
    deadline: 'Closes 31 May annually',
    link: 'https://www.sasol.com/careers/bursaries',
    priorityStreams: ['Science']
  },
  {
    id: 'allan-gray',
    name: 'Allan Gray Orbis Foundation Fellowship',
    funder: 'Allan Gray Foundation',
    coverage: 'Full University Costs, Living Stipend, Entrepreneurial Leadership Curriculum',
    eligibility: 'Grade 12 Candidates with minimum 60% average (Level 5+) across all subjects with demonstrated leadership and entrepreneurial mindset.',
    deadline: 'Closes 30 April annually',
    link: 'https://www.allangrayorbis.org',
    priorityStreams: ['Commerce', 'Science', 'Humanities']
  },
  {
    id: 'anglo-american',
    name: 'Anglo American Educational Bursary',
    funder: 'Anglo American South Africa',
    coverage: 'Full Tuition, Residence, Textbooks, Personal Allowance & Graduate Placement',
    eligibility: 'Passionate candidates studying Mining, Mechanical, Electrical, Chemical Engineering or Geology.',
    deadline: 'Closes 31 July annually',
    link: 'https://www.angloamerican.com',
    priorityStreams: ['Science']
  }
];

// Grade 9 Subject Choice & Stream Recommender
function getGrade9StreamAdvice(grade9Marks = []) {
  const marksMap = {};
  grade9Marks.forEach(m => {
    const raw = Number(m.mark !== undefined ? m.mark : m.grade) || 0;
    const name = (m.subject || m.name || '').toLowerCase();
    marksMap[name] = raw;
  });

  const math = marksMap['mathematics'] || marksMap['maths'] || 50;
  const ns = marksMap['natural sciences'] || marksMap['science'] || 50;
  const ems = marksMap['economic & management sciences (ems)'] || marksMap['ems'] || marksMap['accounting'] || 50;
  const tech = marksMap['technology'] || 50;
  const ss = marksMap['social sciences'] || marksMap['history'] || marksMap['geography'] || 50;
  const english = marksMap['english fal'] || marksMap['english'] || 50;

  const streamScores = [
    {
      stream: 'Science Stream (Physical Sciences, Life Sciences, Pure Maths)',
      score: (math * 0.45) + (ns * 0.45) + (tech * 0.1),
      suitability: math >= 55 && ns >= 55 ? 'Highly Recommended' : math >= 45 ? 'Moderate Suitability' : 'Challenging (Requires Extra Pure Maths Focus)',
      keySubjects: ['Pure Mathematics', 'Physical Sciences', 'Life Sciences', 'Geography'],
      targetCareers: ['Medicine & Surgery (MBChB)', 'Engineering (Civil/Mech/Electrical)', 'Computer Science & AI', 'Actuarial Science']
    },
    {
      stream: 'Commerce Stream (Accounting, Business Studies, Economics, Pure Maths)',
      score: (ems * 0.5) + (math * 0.35) + (english * 0.15),
      suitability: ems >= 55 && math >= 50 ? 'Highly Recommended' : ems >= 45 ? 'Good Match' : 'Moderate Suitability',
      keySubjects: ['Accounting', 'Business Studies', 'Economics', 'Mathematics'],
      targetCareers: ['Chartered Accountant (CA(SA))', 'Investment Banker', 'Economist', 'Corporate Legal Advisor (LLB)']
    },
    {
      stream: 'Tourism & Humanities Stream (Tourism, History, Geography, Mathematical Literacy)',
      score: (ss * 0.4) + (english * 0.4) + (tech * 0.2),
      suitability: ss >= 50 || english >= 55 ? 'Strong Match' : 'Suitable Alternative',
      keySubjects: ['Tourism', 'History', 'Geography', 'Mathematical Literacy'],
      targetCareers: ['Hospitality & Tourism Management', 'Media & Journalism', 'Law (LLB)', 'Environmental Planning', 'Education']
    }
  ];

  streamScores.sort((a, b) => b.score - a.score);

  return {
    topRecommendedStream: streamScores[0].stream,
    allStreamsRanked: streamScores,
    teacherGuidance: `Based on current Grade 9 diagnostic marks (Math: ${math}%, Natural Sciences: ${ns}%, EMS: ${ems}%, Social Sciences: ${ss}%), the learner shows strongest alignment with the ${streamScores[0].stream.split(' (')[0]}.`
  };
}

// Match learner APS against Degree catalog
function matchUniversityProgrammes(apsResult, subjectMarks = []) {
  const apsWithoutLo = apsResult.apsWithoutLo;
  const marksLookup = {};

  subjectMarks.forEach(s => {
    const raw = Number(s.mark !== undefined ? s.mark : s.grade) || 0;
    const name = (s.subject || s.name || '').toLowerCase();
    marksLookup[name] = raw;
  });

  const matches = SA_DEGREE_PROGRAMMES.map(prog => {
    let qualifies = true;
    const missingRequirements = [];

    // Check APS threshold
    if (apsWithoutLo < prog.minAps) {
      qualifies = false;
      missingRequirements.push(`APS score is ${apsWithoutLo} (minimum required is ${prog.minAps}, gap: ${prog.minAps - apsWithoutLo} pts)`);
    }

    // Check specific subject minimum percentage requirements
    for (const [reqSubj, minPerc] of Object.entries(prog.requiredSubjects)) {
      const matchKey = Object.keys(marksLookup).find(k => k.includes(reqSubj.toLowerCase()));
      const studentMark = matchKey ? marksLookup[matchKey] : 0;

      if (!matchKey) {
        // If pure math is required but learner has math lit
        if (reqSubj === 'Mathematics' && Object.keys(marksLookup).some(k => k.includes('literacy'))) {
          qualifies = false;
          missingRequirements.push(`Pure Mathematics is strictly required (Mathematical Literacy is not accepted for ${prog.name})`);
        } else {
          qualifies = false;
          missingRequirements.push(`Subject '${reqSubj}' (min ${minPerc}%) not found in learner profile`);
        }
      } else if (studentMark < minPerc) {
        qualifies = false;
        missingRequirements.push(`Requires at least ${minPerc}% in ${reqSubj} (learner currently has ${studentMark}%)`);
      }
    }

    return {
      ...prog,
      isEligible: qualifies,
      missingRequirements,
      apsDeficit: Math.max(0, prog.minAps - apsWithoutLo)
    };
  });

  const eligible = matches.filter(m => m.isEligible);
  const potentialWithImprovement = matches.filter(m => !m.isEligible && m.apsDeficit <= 4 && m.missingRequirements.length <= 2);
  const aspirational = matches.filter(m => !m.isEligible && (m.apsDeficit > 4 || m.missingRequirements.length > 2));

  return {
    eligibleCount: eligible.length,
    eligibleProgrammes: eligible,
    potentialWithImprovement,
    aspirational
  };
}

module.exports = {
  percentageToNscLevel,
  calculateAps,
  SA_DEGREE_PROGRAMMES,
  SA_BURSARIES_DIRECTORY,
  getGrade9StreamAdvice,
  matchUniversityProgrammes
};
