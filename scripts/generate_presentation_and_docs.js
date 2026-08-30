const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const pptxgen = require('pptxgenjs');
const PDFDocument = require('pdfkit');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'fusion_high_super_secret_jwt_key_2026';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'presentation_assets', 'screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function run() {
  console.log('[1/4] Starting Server and Preparing Comprehensive Role Tokens...');
  
  const schoolProfile = {
    id: 1,
    name: 'Fusion High School',
    slug: 'fusion-high',
    domain: 'fusion-high.co.za',
    circuit: 'Polokwane Central Circuit',
    district: 'Capricorn South',
    province: 'Limpopo',
    primary_color: '#4f46e5',
    secondary_color: '#06b6d4',
    motto: 'Innovate, Lead, Transform'
  };

  const rolesConfig = {
    admin: {
      token: jwt.sign({
        id: 1,
        email: 'sthepomakola23@gmail.com',
        role: 'admin',
        role_id: 1,
        full_name: 'Dr. Tshepo',
        surname: 'Makola',
        school_id: 1,
        is_superadmin: true
      }, JWT_SECRET, { expiresIn: '24h' }),
      userData: {
        id: 1,
        email: 'sthepomakola23@gmail.com',
        role: 'admin',
        role_id: 1,
        full_name: 'Dr. Tshepo',
        surname: 'Makola',
        is_superadmin: true,
        school_id: 1,
        permissions: ['*']
      }
    },
    teacher: {
      token: jwt.sign({
        id: 2,
        email: 'm.khumalo@fusionhigh.co.za',
        role: 'teacher',
        role_id: 2,
        full_name: 'Mandla',
        surname: 'Khumalo',
        school_id: 1,
        is_superadmin: false
      }, JWT_SECRET, { expiresIn: '24h' }),
      userData: {
        id: 2,
        email: 'm.khumalo@fusionhigh.co.za',
        role: 'teacher',
        role_id: 2,
        full_name: 'Mandla',
        surname: 'Khumalo',
        school_id: 1,
        subjects: ['Mathematics', 'Physical Sciences'],
        grades_taught: [10, 11, 12]
      }
    },
    parent: {
      token: jwt.sign({
        id: 3,
        email: 'p.ndlovu@gmail.com',
        role: 'parent',
        role_id: 3,
        full_name: 'Grace',
        surname: 'Ndlovu',
        school_id: 1,
        is_superadmin: false
      }, JWT_SECRET, { expiresIn: '24h' }),
      userData: {
        id: 3,
        email: 'p.ndlovu@gmail.com',
        role: 'parent',
        role_id: 3,
        full_name: 'Grace',
        surname: 'Ndlovu',
        school_id: 1
      }
    },
    learner: {
      token: jwt.sign({
        id: 4,
        email: 'learner@fusionhigh.co.za',
        role: 'learner',
        role_id: 4,
        full_name: 'Kagiso',
        surname: 'Ndlovu',
        school_id: 1,
        is_superadmin: false
      }, JWT_SECRET, { expiresIn: '24h' }),
      userData: {
        id: 4,
        email: 'learner@fusionhigh.co.za',
        role: 'learner',
        role_id: 4,
        full_name: 'Kagiso',
        surname: 'Ndlovu',
        school_id: 1,
        grade: 10,
        class_name: '10-A',
        learner_number: 'L2026-001'
      }
    }
  };

  // Start internal express server
  const server = require('../server');
  const PORT = process.env.PORT || 4000;
  const BASE_URL = `http://localhost:${PORT}`;
  console.log(`Express server active at ${BASE_URL}`);

  // Launch Puppeteer with native Chrome
  console.log('[2/4] Launching Headless Chrome to Capture Comprehensive Screenshots Per User & Dashboard...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1.25 });

  const allScreenshots = [
    // -------------------------------------------------------------
    // CHAPTER 0: PUBLIC & AUTHENTICATION
    // -------------------------------------------------------------
    {
      role: 'public',
      chapter: 'Public & Authentication Portals',
      name: '01_landing_page.png',
      url: `${BASE_URL}/`,
      title: 'Universal Multi-School Landing Portal',
      subtitle: 'Dynamic 12-School Campus Selector, Live Statistics & Admissions Gateway',
      bullets: [
        'Live counters querying verified enrolled learners, classes, and academic faculty directly from PostgreSQL.',
        '1-click institution switcher across 12 high schools in Limpopo (Capricorn South / Mankweng) & Gauteng (Tshwane).',
        'Official branding, verified DBE EMIS numbers, and circuit details per campus.',
        'Direct online learner application portal and prospective parent registration.'
      ],
      notes: 'Explain that the public gateway provides institutional branding for all 12 campuses while directing users to their respective portals.'
    },
    {
      role: 'public',
      chapter: 'Public & Authentication Portals',
      name: '02_login_portal.png',
      url: `${BASE_URL}/login`,
      title: 'Role-Based Authentication Gateway',
      subtitle: 'Secure Sign-In for SuperAdmin, SubAdmin, Educator, Parent & Learner',
      bullets: [
        'Multi-role login supporting email address, learner ID number, and employee credentials.',
        'Bcrypt-encrypted password hashing and signed JWT session token generation.',
        'Automated redirect to role-specific dashboard with strict permission isolation.',
        '60-second time-based OTP password recovery workflow with direct email verification.'
      ],
      notes: 'Highlight how the authentication engine automatically routes users to their respective workspaces based on verified database roles.'
    },

    // -------------------------------------------------------------
    // CHAPTER 1: MAIN ADMIN & SUBADMIN EXECUTIVE DASHBOARD
    // -------------------------------------------------------------
    {
      role: 'admin',
      chapter: '1. Executive Administrator Dashboard & Operations',
      name: '03_admin_overview.png',
      url: `${BASE_URL}/dashboard/admin?tab=overview`,
      title: 'Executive School Overview & Macro KPIs',
      subtitle: 'Institutional Operational Dashboard & Rapid Module Dispatch',
      bullets: [
        'Instant overview cards: Total Enrolled Learners, Academic Staff Roster, Classrooms, and Attendance Rate.',
        'Real-time executive actions: Launch Admissions, Open Mark Audits, Schedule Timetables, and Manage Fees.',
        'Live school calendar feed displaying upcoming district assessments and circuit events.',
        'Universal module back-navigation bar enabling seamless transitions between tools.'
      ],
      notes: 'Demonstrate the primary command overview where school principals and executive directors monitor daily institutional operations.'
    },
    {
      role: 'admin',
      chapter: '1. Executive Administrator Dashboard & Operations',
      name: '04_admin_command_center.png',
      url: `${BASE_URL}/dashboard/admin?tab=command-center`,
      title: 'Multi-School Command Center (SuperAdmin)',
      subtitle: 'Universal Comparative Analytics Across All 12 High Schools',
      bullets: [
        'Side-by-side comparative table for all 12 schools in Limpopo and Gauteng.',
        'Monitors student enrollment vs capacity, educator rosters, and classroom metrics.',
        'Tracks fee billing, total collections, and financial efficiency per school.',
        '1-click "Manage & Switch View" to jump directly into any institution.'
      ],
      notes: 'Emphasize that the SuperAdmin can oversee the entire educational group while ensuring each school has its own dedicated SubAdmin.'
    },
    {
      role: 'admin',
      chapter: '1. Executive Administrator Dashboard & Operations',
      name: '05_admin_users.png',
      url: `${BASE_URL}/dashboard/admin?tab=users`,
      title: 'User Directory & SubAdmin Appointments',
      subtitle: 'Multi-Tenant Permission Hierarchy & Faculty Onboarding',
      bullets: [
        'Main Admin appoints dedicated School SubAdmins for specific institutions.',
        'Automated onboarding email dispatch with temporary password and school details.',
        'SubAdmins onboard faculty, assign subject workloads, and manage parents.',
        'Strict database role separation (Admin, Teacher, Parent, Learner).'
      ],
      notes: 'Show how SubAdmins are appointed and how faculty members receive automated login credentials with assigned grades and subjects.'
    },
    {
      role: 'admin',
      chapter: '1. Executive Administrator Dashboard & Operations',
      name: '06_admin_inter_school.png',
      url: `${BASE_URL}/dashboard/admin?tab=inter-school`,
      title: 'Inter-School Derbies & Academic Olympiads',
      subtitle: 'Circuit Collaboration, Sports Leagues & Trophies',
      bullets: [
        'Schedule inter-school sports matches (Soccer, Netball, Athletics) & academic tournaments.',
        'Live match scoreboards with school crests, venue details, and match summaries.',
        'Circuit championship leaderboard with automated points (Win=3, Draw=1, Loss=0).',
        'Fosters cross-school camaraderie and competitive district excellence.'
      ],
      notes: 'Explain that the derby league brings schools together for sports tournaments and academic quizzes with live leaderboards.'
    },
    {
      role: 'admin',
      chapter: '1. Executive Administrator Dashboard & Operations',
      name: '07_admin_marks.png',
      url: `${BASE_URL}/dashboard/admin?tab=marks`,
      title: 'CAPS Mark Audits & SBA Moderation',
      subtitle: 'Continuous Assessment Quality Assurance & Statistical Distribution',
      bullets: [
        'Term 1–4 SBA weightings and Practical Assessment Task (PAT) tracking.',
        'Statistical distribution analysis identifying at-risk students and high achievers.',
        'Departmental moderation workflow for subject heads and curriculum advisors.',
        'Full compliance with Department of Basic Education National Protocol for Assessment.'
      ],
      notes: 'Walk through how subject heads verify teacher marking standards and ensure curriculum compliance before term report card publishing.'
    },
    {
      role: 'admin',
      chapter: '1. Executive Administrator Dashboard & Operations',
      name: '08_admin_timetable.png',
      url: `${BASE_URL}/dashboard/admin?tab=timetable`,
      title: 'Conflict-Free Timetable Master Planner',
      subtitle: 'Algorithmic School-Wide Scheduling & Venue Allocations',
      bullets: [
        'Algorithmic timetable generator allocating subjects, educators, and classrooms.',
        'Guarantees zero educator double-booking and zero classroom clashes.',
        'School-specific isolated schedule ensuring each institution has its own unique timetable.',
        'Real-time slot swap request workflow for educator relief management.'
      ],
      notes: 'Reiterate that each school maintains its own distinct timetable schedule tailored to its faculty and classroom facilities.'
    },
    {
      role: 'admin',
      chapter: '1. Executive Administrator Dashboard & Operations',
      name: '09_admin_finance.png',
      url: `${BASE_URL}/dashboard/admin?tab=finance`,
      title: 'School Fees, Statements & Invoicing',
      subtitle: 'Automated Billing, Payment Audits & Financial Analytics',
      bullets: [
        'Itemized term fee invoices generated per grade and curriculum stream.',
        'Real-time payment tracking, digital receipts, and outstanding balance alerts.',
        'Automated Sunday parent digest with attendance and fee account statements.',
        'Executive financial collection efficiency analytics for school treasurers.'
      ],
      notes: 'Show the financial collection rate metrics and itemized term billing capabilities.'
    },
    {
      role: 'admin',
      chapter: '1. Executive Administrator Dashboard & Operations',
      name: '10_admin_matric.png',
      url: `${BASE_URL}/dashboard/admin?tab=matric-projector`,
      title: 'Matric Pass Rate Projector (Grade 12)',
      subtitle: 'Predictive Endorsement Analytics & Early Warning Diagnostics',
      bullets: [
        'Simulates final NSC examination pass rates based on preliminary SBA marks.',
        'Predicts Bachelor\'s, Diploma, and Higher Certificate endorsement percentages.',
        'Identifies subject bottlenecks (e.g. Mathematics P2, Physical Sciences Chemistry).',
        'Enables targeted revision bootcamps before final National Senior Certificate exams.'
      ],
      notes: 'Highlight how high schools can boost their provincial matric rankings through predictive diagnostics.'
    },
    {
      role: 'admin',
      chapter: '1. Executive Administrator Dashboard & Operations',
      name: '11_admin_leave_relief.png',
      url: `${BASE_URL}/dashboard/admin?tab=leave-relief`,
      title: 'Educator Leave & Relief Duty Scheduler',
      subtitle: 'Emergency Substitute Matching & Continuous Classroom Supervision',
      bullets: [
        'Educators submit digital leave requests with medical/personal documentation.',
        'Instant detection of open free periods for relief educators in the same department.',
        'Automated daily relief roster ensuring zero unattended learner classrooms.',
        'Audit trail of educator attendance for DBE provincial reporting.'
      ],
      notes: 'Demonstrate how the system eliminates unsupervised classrooms by matching relief teachers during staff absence.'
    },

    // -------------------------------------------------------------
    // CHAPTER 2: EDUCATOR & TEACHER WORKSPACE
    // -------------------------------------------------------------
    {
      role: 'teacher',
      chapter: '2. Educator & Teacher Workspace',
      name: '12_teacher_overview.png',
      url: `${BASE_URL}/dashboard/teacher?tab=overview`,
      title: 'Educator Workspace & Daily Schedule',
      subtitle: 'Today\'s Classes, Pending Marks & Rapid Academic Tools',
      bullets: [
        'Personalized daily teaching schedule highlighting current and upcoming class periods.',
        'Pending assessment marks alert and quick submission shortcut.',
        'Unread parent communications and consultation appointment notifications.',
        'Quick access to AI Lesson Planner, Test Generator, and Attendance registers.'
      ],
      notes: 'Walk through the educator\'s daily launchpad designed for maximum teaching efficiency.'
    },
    {
      role: 'teacher',
      chapter: '2. Educator & Teacher Workspace',
      name: '13_teacher_subjects.png',
      url: `${BASE_URL}/dashboard/teacher?tab=subjects`,
      title: 'Subject Workload & Class Rosters',
      subtitle: 'Assigned Teaching Classes, Learner Lists & Performance',
      bullets: [
        'Complete breakdown of allocated teaching grades, streams, and subject classes.',
        'Class learner rosters with direct student profile inspections and attendance history.',
        'Individual and class-wide academic averages with performance trend indicators.',
        '1-click shortcut to launch subject-specific announcements or assign homework.'
      ],
      notes: 'Show how teachers manage their assigned subjects, view enrolled learners, and track grade averages.'
    },
    {
      role: 'teacher',
      chapter: '2. Educator & Teacher Workspace',
      name: '14_teacher_resources.png',
      url: `${BASE_URL}/dashboard/teacher?tab=resources`,
      title: 'Learning Resources & Past Papers Studio',
      subtitle: 'On-Demand Question Paper, Textbook & Worksheet Uploads',
      bullets: [
        'Educators upload past question papers, exam memorandums, study guides, and worksheets at their own convenience.',
        'Categorization by Subject, Grade (8–12), Term, and Academic Year.',
        'Instant broadcast notification dispatched to enrolled learners and linked parents upon publication.',
        'Completely eliminates project disk bloat while empowering educators with full material control.'
      ],
      notes: 'Emphasize that teachers have full autonomy to upload their own revision materials whenever needed.'
    },
    {
      role: 'teacher',
      chapter: '2. Educator & Teacher Workspace',
      name: '15_teacher_assessments.png',
      url: `${BASE_URL}/dashboard/teacher?tab=assessments`,
      title: 'CAPS Markbook & Assessment Recording',
      subtitle: 'Task Mark Entry, Formal SBA Weightings & Auto-Calculations',
      bullets: [
        'Digital gradebook for recording class tests, assignments, practicals, and exams.',
        'Automated CAPS SBA percentage weighting calculations (e.g. 25% SBA + 75% Exam).',
        'Bulk mark entry with keyboard navigation and instant validation against total marks.',
        'Audit trail ensuring marks are ready for moderation and official report card generation.'
      ],
      notes: 'Explain the digital markbook entry workflow that calculates CAPS SBA totals automatically.'
    },
    {
      role: 'teacher',
      chapter: '2. Educator & Teacher Workspace',
      name: '16_teacher_attendance.png',
      url: `${BASE_URL}/dashboard/teacher?tab=attendance`,
      title: 'Class Attendance & Punctuality Register',
      subtitle: 'Period-by-Period Student Attendance & Absence Tracking',
      bullets: [
        'Fast 1-click attendance marking (Present, Absent, Late, Excused).',
        'Automated parent SMS / email trigger when a learner is marked unexcused absent.',
        'Monthly attendance aggregation feeding into DBE provincial SASAMS statistics.',
        'Historical absence pattern recognition for early student welfare intervention.'
      ],
      notes: 'Show the period attendance register and automated parent notification triggers.'
    },
    {
      role: 'teacher',
      chapter: '2. Educator & Teacher Workspace',
      name: '17_teacher_ai_tools.png',
      url: `${BASE_URL}/dashboard/teacher?tab=ai-tools`,
      title: 'AI Lesson Planner & Test Generator',
      subtitle: 'CAPS-Aligned Curriculum Planning & Examination Creator',
      bullets: [
        'Generates complete 45-minute CAPS lesson plans with learning outcomes, activities, and homework.',
        'Creates customized examination papers with step-by-step marking memorandums.',
        'Adjustable difficulty levels (Foundational, Intermediate, Advanced / Olympiad).',
        'Saves teachers hours of administrative preparation each academic week.'
      ],
      notes: 'Demonstrate how the AI Lesson Planner assists teachers in creating CAPS-aligned teaching plans and tests in seconds.'
    },
    {
      role: 'teacher',
      chapter: '2. Educator & Teacher Workspace',
      name: '18_teacher_assignments.png',
      url: `${BASE_URL}/dashboard/teacher?tab=assignments`,
      title: 'Digital Homework & Assignments Studio',
      subtitle: 'Online Assignment Publishing, Submissions & Grading',
      bullets: [
        'Publish digital homework tasks with attached instructions, due dates, and rubrics.',
        'Learners submit digital answers and files directly through their student portal.',
        'Online submission review with educator feedback notes and mark recording.',
        'Automated reminders sent to students with pending submissions approaching deadlines.'
      ],
      notes: 'Walk through the homework assignment creation and submission review workflow.'
    },

    // -------------------------------------------------------------
    // CHAPTER 3: PARENT FAMILY LEARNING PORTAL
    // -------------------------------------------------------------
    {
      role: 'parent',
      chapter: '3. Parent & Family Learning Portal',
      name: '19_parent_overview.png',
      url: `${BASE_URL}/dashboard/parent?tab=overview`,
      title: 'Family Learning Hub & Child Overview',
      subtitle: 'Comprehensive Multi-Child Dashboard & Real-Time Monitoring',
      bullets: [
        'Multi-child linking allowing parents with multiple enrolled children to switch seamlessly.',
        'Real-time snapshot of children\'s current academic averages, attendance %, and conduct points.',
        'Quick access to fee payment balance, upcoming consultations, and school notices.',
        'Direct messaging link to communicate with subject teachers and school administrators.'
      ],
      notes: 'Highlight how parents can monitor all their children across grades from a single dashboard.'
    },
    {
      role: 'parent',
      chapter: '3. Parent & Family Learning Portal',
      name: '20_parent_children.png',
      url: `${BASE_URL}/dashboard/parent?tab=children`,
      title: 'Child Academic Progress & Marks Breakdown',
      subtitle: 'Subject Marks, SBA Tasks & Continuous Assessment History',
      bullets: [
        'Detailed subject-by-subject performance tracking for every registered learning area.',
        'Continuous assessment task history showing test scores, assignments, and term exams.',
        'Visual progress bars highlighting subject strengths and areas requiring revision.',
        'Direct link to download official DBE CAPS term academic report cards.'
      ],
      notes: 'Show how parents inspect their child\'s subject grades and track their academic trajectory throughout the year.'
    },
    {
      role: 'parent',
      chapter: '3. Parent & Family Learning Portal',
      name: '21_parent_consultations.png',
      url: `${BASE_URL}/dashboard/parent?tab=consultations`,
      title: 'Parent-Educator Consultation Scheduler',
      subtitle: 'Virtual & In-Person 20-Minute Appointment Booking',
      bullets: [
        'Parents select their child and choose specific subject educators for consultation.',
        'Real-time calculation of open 20-minute consultation time slots.',
        '1-click booking with automated email confirmation sent to educator and parent.',
        'Educators manage their consultation roster and record academic action plans.'
      ],
      notes: 'Demonstrate how parents can schedule targeted 20-minute reviews with subject teachers to discuss academic progress.'
    },
    {
      role: 'parent',
      chapter: '3. Parent & Family Learning Portal',
      name: '22_parent_finance.png',
      url: `${BASE_URL}/dashboard/parent?tab=finance`,
      title: 'School Fees & Digital Statements',
      subtitle: 'Online Account Statements, Invoices & Payment Receipts',
      bullets: [
        'Live fee statement detailing term tuition, textbook levies, and extracurricular fees.',
        'Downloadable PDF tax-compliant invoices and official school payment receipts.',
        'Transparent payment breakdown showing paid amounts, current balance, and due dates.',
        'Automated Sunday parent digest summarizing weekly attendance and fee account balances.'
      ],
      notes: 'Show the parent fee statement view with transparent accounting and payment receipts.'
    },
    {
      role: 'parent',
      chapter: '3. Parent & Family Learning Portal',
      name: '23_parent_timetable.png',
      url: `${BASE_URL}/dashboard/parent?tab=timetable`,
      title: 'Child Weekly Class Timetable',
      subtitle: 'Daily Subject Schedule, Periods & Classroom Venues',
      bullets: [
        'Full weekly view of the child\'s class schedule across Monday to Friday.',
        'Identifies exact classroom locations, subject educators, and period times.',
        'Helps parents ensure learners are properly equipped for daily practicals and tests.',
        'Live integration with teacher relief duty changes during educator absence.'
      ],
      notes: 'Explain that parents can follow their child\'s daily timetable to ensure proper study routines.'
    },

    // -------------------------------------------------------------
    // CHAPTER 4: LEARNER & STUDENT LEARNING HUB
    // -------------------------------------------------------------
    {
      role: 'learner',
      chapter: '4. Learner & Student Learning Hub',
      name: '24_learner_overview.png',
      url: `${BASE_URL}/dashboard/learner?tab=overview`,
      title: 'Student Learning Hub & Study Dashboard',
      subtitle: 'Enrolled Subjects, Daily Streak XP & Upcoming Tasks',
      bullets: [
        'Personalized student dashboard showcasing enrolled CAPS subjects and active grade.',
        'Daily study streak, gamified XP points, and academic achievement badges.',
        'Upcoming homework assignments, test dates, and official school announcements.',
        '1-click launchpad into the AI Tutor, Past Papers bank, and Fusion Arcade.'
      ],
      notes: 'Walk through the student home screen designed to motivate learners through gamification and structured study.'
    },
    {
      role: 'learner',
      chapter: '4. Learner & Student Learning Hub',
      name: '25_learner_subjects.png',
      url: `${BASE_URL}/dashboard/learner?tab=subjects`,
      title: 'Subject Curriculum & Topic Revision',
      subtitle: 'CAPS Topics, Study Guides, Formula Sheets & Notes',
      bullets: [
        'Curriculum breakdown of all enrolled subjects (Maths, Sciences, Accounting, Languages).',
        'Structured topic chapters with revision notes, video lessons, and formula summaries.',
        '1-click "Revise with AI" button to practice problem solving on specific CAPS sub-topics.',
        'Subject teacher contact shortcut for academic inquiries.'
      ],
      notes: 'Show how learners navigate their subject curriculum, read revision notes, and trigger AI study sessions.'
    },
    {
      role: 'learner',
      chapter: '4. Learner & Student Learning Hub',
      name: '26_learner_ai_tutor.png',
      url: `${BASE_URL}/dashboard/learner?tab=ai-tutor`,
      title: 'School-Aware AI Subject Specialist & Academic Tutor',
      subtitle: 'Multi-Tenant Grounding, Past-Paper Quizzes & 11 SA Languages',
      bullets: [
        'Automatically senses the learner\'s registered school (e.g. Flavius Mareka, Fusion High).',
        'Strict multi-tenant prompt grounding preventing institutional leakage.',
        'Generates past-paper examination questions and step-by-step marking memorandums.',
        'Fluent in all 11 official South African languages for mother-tongue bilingual revision.'
      ],
      notes: 'Emphasize that the AI assistant represents the learner\'s own school campus, adhering strictly to the CAPS syllabus.'
    },
    {
      role: 'learner',
      chapter: '4. Learner & Student Learning Hub',
      name: '27_learner_arcade.png',
      url: `${BASE_URL}/dashboard/learner?tab=arcade`,
      title: 'Fusion Arcade & CAPS Study Games',
      subtitle: 'Gamified Exam Quizzes, Level Progression & XP Leaderboards',
      bullets: [
        'Interactive rapid-fire revision quizzes across all Grade 8–12 CAPS subjects.',
        'Level progression system awarding XP, streak multipliers, and mastery trophies.',
        'Circuit and school leaderboards encouraging healthy academic competition.',
        'Instant question explanations helping students master challenging concepts.'
      ],
      notes: 'Showcase the Fusion Arcade where students reinforce their classroom learning through engaging revision games.'
    },
    {
      role: 'learner',
      chapter: '4. Learner & Student Learning Hub',
      name: '28_learner_bursaries.png',
      url: `${BASE_URL}/dashboard/learner?tab=bursaries`,
      title: 'NSFAS & Tertiary Bursary Matching Engine',
      subtitle: 'Simulated APS Points, Degree Matching & Funding Applications',
      bullets: [
        'Comprehensive database of South African tertiary bursaries & NSFAS schemes.',
        'Automatically matches Grade 11 & 12 learners based on simulated APS points & stream.',
        'Step-by-step checklist tracking application deadlines and required documents.',
        'Empowers disadvantaged learners with direct access to higher education funding.'
      ],
      notes: 'Demonstrate how the bursary engine unlocks university and TVET college funding opportunities for matriculants.'
    },
    {
      role: 'learner',
      chapter: '4. Learner & Student Learning Hub',
      name: '29_learner_career.png',
      url: `${BASE_URL}/dashboard/learner?tab=career-advisor`,
      title: 'Career Pathway & University Admission Advisor',
      subtitle: 'Degree Requirements, Faculty APS & South African Career Paths',
      bullets: [
        'Evaluates current subject package against entry requirements for SA universities.',
        'Calculates Admission Point Scores (APS) across faculties (Engineering, Health, Commerce, Law).',
        'Explores high-demand scarce skill careers in South Africa.',
        'Provides actionable advice on target marks needed to secure degree admissions.'
      ],
      notes: 'Explain that the Career Advisor guides high school learners toward viable university and vocational career paths.'
    }
  ];

  // Capture all screenshots
  for (const item of allScreenshots) {
    try {
      console.log(`  -> Capturing [${item.role.toUpperCase()}]: ${item.title}...`);
      await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
      
      const config = rolesConfig[item.role];
      if (config) {
        await page.evaluate((tok, uData, r, sch) => {
          localStorage.clear();
          localStorage.setItem('token', tok);
          localStorage.setItem('auth_token', tok);
          localStorage.setItem('userRole', r);
          localStorage.setItem('user', JSON.stringify(uData));
          localStorage.setItem('fusion_terms_accepted_v2_1', 'true');
          localStorage.setItem('active_school_profile', JSON.stringify(sch));
          localStorage.setItem('active_school_id', String(sch.id));
        }, config.token, config.userData, item.role, schoolProfile);
      } else {
        await page.evaluate(() => {
          localStorage.clear();
          localStorage.setItem('fusion_terms_accepted_v2_1', 'true');
        });
      }

      await page.goto(item.url, { waitUntil: 'networkidle2', timeout: 15000 });
      await new Promise(r => setTimeout(r, 1200));

      const screenshotPath = path.join(SCREENSHOTS_DIR, item.name);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      item.path = screenshotPath;
    } catch (err) {
      console.warn(`  [Warning] Screenshot capture for ${item.title} fallback:`, err.message);
    }
  }

  await browser.close();

  // -------------------------------------------------------------
  // [3/4] COMPILE 35-SLIDE EXECUTIVE PRESENTATION (.PPTX)
  // -------------------------------------------------------------
  console.log('[3/4] Compiling 35-Slide Role-by-Role PowerPoint Presentation...');
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_16x9';
  pres.title = 'Fusion High Multi-School Educational Ecosystem — Complete Role-by-Role System Presentation';
  pres.author = 'Dr. Tshepo Makola (SuperAdmin Executive)';
  pres.company = 'Fusion Educational Technologies';

  const C_DARK = '0B0F19';
  const C_CARD = '161E2E';
  const C_BRAND = '4F46E5';
  const C_CYAN = '06B6D4';
  const C_AMBER = 'F59E0B';
  const C_EMERALD = '10B981';
  const C_ROSE = 'F43F5E';
  const C_TEXT = 'F8FAFC';
  const C_MUTED = '94A3B8';

  // SLIDE 1: Title Slide
  let slide = pres.addSlide();
  slide.background = { color: C_DARK };
  slide.addShape(pres.ShapeType.rect, { x: 0.8, y: 0.8, w: 11.7, h: 0.4, fill: { color: C_BRAND } });
  slide.addText('FUSION HIGH EDUCATIONAL ECOSYSTEM', {
    x: 0.8, y: 1.5, w: 11.7, h: 1.2,
    fontSize: 32, fontFace: 'Arial', bold: true, color: C_TEXT
  });
  slide.addText('Comprehensive Role-by-Role System Presentation & Technical Architecture Walkthrough', {
    x: 0.8, y: 2.8, w: 11.7, h: 0.8,
    fontSize: 16, fontFace: 'Arial', color: C_CYAN
  });
  slide.addText([
    { text: 'Complete Walkthrough: ', options: { bold: true, color: C_AMBER } },
    { text: 'Admin, Educator, Parent & Learner Portals (Page by Page)\n' },
    { text: 'Multi-Tenant Scope: ', options: { bold: true, color: C_AMBER } },
    { text: '12 Active Campuses across Limpopo (Capricorn South) & Gauteng (Tshwane)\n' },
    { text: 'Curriculum Standards: ', options: { bold: true, color: C_AMBER } },
    { text: 'Department of Basic Education (DBE CAPS & SASAMS Compliant)' }
  ], { x: 0.8, y: 4.2, w: 11.7, h: 2.0, fontSize: 13, color: C_TEXT, lineSpacing: 22 });

  // SLIDE 2: Table of Contents / Role Breakdown
  slide = pres.addSlide();
  slide.background = { color: C_DARK };
  slide.addText('Presentation Roadmap: User-by-User Portals', { x: 0.8, y: 0.6, w: 11.7, h: 0.6, fontSize: 24, bold: true, color: C_TEXT });
  slide.addText('Four dedicated stakeholder chapters showcasing live screens, features, and workflows.', { x: 0.8, y: 1.2, w: 11.7, h: 0.4, fontSize: 12, color: C_MUTED });

  const roleChapters = [
    { title: 'Chapter 1: Administrator Hub', desc: '10 Core Modules: Command Center, User Permissions, Inter-School Derbies, Mark Audits, Timetables, Fees, Matric Projector, Relief Scheduler, Exams.', col: C_BRAND },
    { title: 'Chapter 2: Educator Workspace', desc: '7 Core Modules: Teaching Schedule, Subject Workload, Resources Studio, CAPS Markbook, Attendance Register, AI Lesson Planner, Homework Hub.', col: C_CYAN },
    { title: 'Chapter 3: Parent Family Portal', desc: '5 Core Modules: Multi-Child Dashboard, Academic Reports, 20-Min Teacher Consultations, Digital Fee Statements, Child Weekly Timetables.', col: C_AMBER },
    { title: 'Chapter 4: Learner Learning Hub', desc: '6 Core Modules: Student Overview, Subject Topics, School-Aware AI Tutor, Fusion Arcade Games, NSFAS Bursaries, Career Advisor.', col: C_EMERALD }
  ];

  roleChapters.forEach((r, idx) => {
    const x = 0.8 + (idx % 2) * 5.9;
    const y = 1.8 + Math.floor(idx / 2) * 2.6;
    slide.addShape(pres.ShapeType.roundRect, { x, y, w: 5.6, h: 2.3, fill: { color: C_CARD }, line: { color: r.col, width: 1.5 }, rectRadius: 0.2 });
    slide.addText(r.title, { x: x + 0.3, y: y + 0.3, w: 5.0, h: 0.4, fontSize: 15, bold: true, color: r.col });
    slide.addText(r.desc, { x: x + 0.3, y: y + 0.8, w: 5.0, h: 1.3, fontSize: 11, color: C_TEXT, lineSpacing: 16 });
  });

  // GENERATE EACH SCREENSHOT SLIDE
  let currentChapter = '';
  for (const item of allScreenshots) {
    // Add Chapter Divider Slide when transitioning
    if (item.chapter !== currentChapter && item.chapter !== 'Public & Authentication Portals') {
      currentChapter = item.chapter;
      const divSlide = pres.addSlide();
      divSlide.background = { color: C_DARK };
      divSlide.addShape(pres.ShapeType.rect, { x: 0.8, y: 2.0, w: 11.7, h: 0.1, fill: { color: C_BRAND } });
      divSlide.addText(currentChapter.toUpperCase(), { x: 0.8, y: 2.3, w: 11.7, h: 1.0, fontSize: 30, bold: true, color: C_TEXT });
      divSlide.addText('In-depth page-by-page screen walkthrough with live database metrics & operational workflows', {
        x: 0.8, y: 3.4, w: 11.7, h: 0.6, fontSize: 14, color: C_CYAN
      });
    }

    slide = pres.addSlide();
    slide.background = { color: C_DARK };

    // Header Banner
    slide.addShape(pres.ShapeType.rect, { x: 0.8, y: 0.4, w: 11.7, h: 0.06, fill: { color: C_BRAND } });
    slide.addText(item.title, { x: 0.8, y: 0.55, w: 11.7, h: 0.5, fontSize: 20, bold: true, color: C_TEXT });
    slide.addText(`${item.chapter}  •  ${item.subtitle}`, { x: 0.8, y: 1.05, w: 11.7, h: 0.35, fontSize: 11, color: C_CYAN });

    // Left Column: Capabilities & Workflow
    slide.addShape(pres.ShapeType.roundRect, { x: 0.8, y: 1.5, w: 4.8, h: 5.2, fill: { color: C_CARD }, line: { color: C_BRAND, width: 1 }, rectRadius: 0.15 });
    slide.addText('Core Features & Capabilities', { x: 1.1, y: 1.7, w: 4.2, h: 0.35, fontSize: 13, bold: true, color: C_AMBER });

    const bulletItems = item.bullets.map(b => `•  ${b}`).join('\n\n');
    slide.addText(bulletItems, { x: 1.1, y: 2.1, w: 4.2, h: 4.4, fontSize: 10.5, color: C_TEXT, lineSpacing: 15 });

    // Right Column: Live Screenshot
    const imgPath = path.join(SCREENSHOTS_DIR, item.name);
    if (fs.existsSync(imgPath)) {
      slide.addImage({
        path: imgPath,
        x: 5.9, y: 1.5, w: 6.6, h: 5.2,
        rounding: true
      });
    } else {
      slide.addShape(pres.ShapeType.roundRect, { x: 5.9, y: 1.5, w: 6.6, h: 5.2, fill: { color: C_CARD }, rectRadius: 0.15 });
      slide.addText(`[Live Portal View: ${item.title}]`, { x: 5.9, y: 3.8, w: 6.6, h: 0.8, fontSize: 16, bold: true, color: C_CYAN, align: 'center' });
    }

    if (item.notes) {
      slide.addNotes(item.notes);
    }
  }

  // Final Slide
  slide = pres.addSlide();
  slide.background = { color: C_DARK };
  slide.addShape(pres.ShapeType.rect, { x: 0.8, y: 0.8, w: 11.7, h: 0.1, fill: { color: C_BRAND } });
  slide.addText('Conclusion & Operational Readiness', { x: 0.8, y: 1.4, w: 11.7, h: 0.8, fontSize: 28, bold: true, color: C_TEXT });
  slide.addText('The Fusion High Multi-School Educational Ecosystem delivers a unified, production-ready solution tailored specifically to South African high schools.', {
    x: 0.8, y: 2.3, w: 11.7, h: 0.8, fontSize: 14, color: C_CYAN
  });

  slide.addText([
    { text: '✓ 12 Isolated Campuses Configured: ', options: { bold: true, color: C_EMERALD } },
    { text: 'Full provincial profiles for Limpopo and Gauteng.\n' },
    { text: '✓ Role-Based Portals: ', options: { bold: true, color: C_EMERALD } },
    { text: 'Dedicated interfaces for Admins, Educators, Parents, and Learners.\n' },
    { text: '✓ Real Database Integration: ', options: { bold: true, color: C_EMERALD } },
    { text: 'All stats, marks, and rosters query real PostgreSQL tables.\n' },
    { text: '✓ Autonomous Teacher Uploads: ', options: { bold: true, color: C_EMERALD } },
    { text: 'Educators upload question papers and resources on demand with zero disk bloat.' }
  ], { x: 0.8, y: 3.4, w: 11.7, h: 3.0, fontSize: 12, color: C_TEXT, lineSpacing: 20 });

  const pptxFilePath = path.join(__dirname, '..', 'FUSION_HIGH_ROLE_BY_ROLE_PRESENTATION.pptx');
  const mainPptxPath = path.join(__dirname, '..', 'FUSION_HIGH_SYSTEM_PRESENTATION.pptx');
  await pres.writeFile({ fileName: pptxFilePath });
  console.log(`[✓] Comprehensive PowerPoint presentation compiled: ${pptxFilePath}`);
  try {
    fs.copyFileSync(pptxFilePath, mainPptxPath);
    console.log(`[✓] Copied to main presentation file: ${mainPptxPath}`);
  } catch (lockErr) {
    console.warn(`[Note] Main PPTX file is open in PowerPoint. Saved to ${pptxFilePath}`);
  }

  // -------------------------------------------------------------
  // [4/4] COMPILE MASTER MULTI-PAGE PDF DOCUMENTATION
  // -------------------------------------------------------------
  console.log('[4/4] Compiling Master Role-by-Role PDF Documentation...');
  const pdfDoc = new PDFDocument({ margin: 40, size: 'A4' });
  const pdfFilePath = path.join(__dirname, '..', 'FUSION_HIGH_SYSTEM_DOCUMENTATION.pdf');
  const pdfStream = fs.createWriteStream(pdfFilePath);
  pdfDoc.pipe(pdfStream);

  // PDF Cover Page
  pdfDoc.rect(0, 0, 595.28, 841.89).fill('#0B0F19');
  pdfDoc.rect(40, 40, 515.28, 6).fill('#4F46E5');

  pdfDoc.fillColor('#FFFFFF').fontSize(24).font('Helvetica-Bold')
    .text('FUSION HIGH EDUCATIONAL ECOSYSTEM', 40, 140, { width: 515.28 });
  
  pdfDoc.fillColor('#06B6D4').fontSize(14).font('Helvetica')
    .text('Complete Role-by-Role System Documentation Guide', 40, 185, { width: 515.28 });

  pdfDoc.fillColor('#94A3B8').fontSize(9.5).font('Helvetica')
    .text('Comprehensive Technical Architecture, Database Schemas & Portal-by-Portal Manual\nCovering Limpopo (Capricorn South) & Gauteng (Tshwane Districts)', 40, 215, { width: 515.28 });

  pdfDoc.rect(40, 260, 515.28, 1).fill('#1E293B');

  // Role Breakdown on Cover
  pdfDoc.fillColor('#F59E0B').fontSize(11).font('Helvetica-Bold')
    .text('SYSTEM CHAPTERS & PORTAL BREAKDOWN', 40, 280);

  const sectionsCover = [
    'Chapter 1: Executive Administrator Operations (Command Center, User Onboarding, Derbies, Marks, Timetables, Fees)',
    'Chapter 2: Educator & Teacher Workspace (Teaching Workload, Resources Upload Studio, CAPS Markbook, Attendance, AI Planner)',
    'Chapter 3: Parent & Family Learning Portal (Multi-Child Monitoring, Subject Reports, 20-min Consultations, Fee Invoices)',
    'Chapter 4: Learner & Student Learning Hub (Subject Topics, School-Aware AI Tutor, Fusion Arcade, NSFAS Bursaries, Careers)',
    'Chapter 5: Technical Infrastructure & Database Model (PostgreSQL Relational Schema, Security & DBE CAPS Compliance)'
  ];

  let covY = 305;
  sectionsCover.forEach(sc => {
    pdfDoc.fillColor('#F8FAFC').fontSize(8.5).font('Helvetica').text(`•  ${sc}`, 50, covY, { width: 495 });
    covY += 24;
  });

  // Table of Contents
  pdfDoc.rect(40, 450, 515.28, 330).fill('#161E2E');
  pdfDoc.fillColor('#06B6D4').fontSize(11).font('Helvetica-Bold').text('COMPLETE TABLE OF CONTENTS', 60, 470);

  const fullToc = [
    '1. Multi-Tenant Architecture & Governance Hierarchy',
    '2. Chapter 1: Administrator Hub (Command Center, Users, Derbies, Moderation, Fees, Matric)',
    '3. Chapter 2: Educator Workspace (Workload, Resource Uploads, Markbook, AI Planner, Homework)',
    '4. Chapter 3: Parent Portal (Multi-Child Progress, 20-min Consultations, Fee Statements)',
    '5. Chapter 4: Learner Hub (Curriculum Topics, School-Aware AI Tutor, Fusion Arcade, NSFAS)',
    '6. Security, Role-Based Access Control (RBAC) & DBE CAPS Protocols'
  ];

  let fTocY = 500;
  fullToc.forEach(t => {
    pdfDoc.fillColor('#CBD5E1').fontSize(8.5).font('Helvetica').text(t, 60, fTocY);
    fTocY += 20;
  });

  // Add pages for each major chapter
  const pdfPages = [
    {
      title: 'Chapter 1: Administrator Operations & Multi-School Governance',
      color: '#4F46E5',
      text: 'The Executive Administrator Dashboard provides oversight over all 12 institutions with real database telemetry.\n\n' +
            '• Multi-School Command Center: Comparative metrics across all schools in Limpopo and Gauteng.\n' +
            '• User Directory & SubAdmin Appointments: Assigns dedicated campus administrators and educators with automated credentials.\n' +
            '• Inter-School Derby League: Schedules competitive sports matches and academic Olympiads with live standings.\n' +
            '• CAPS Mark Audits: Continuous assessment moderation verifying DBE assessment protocols.\n' +
            '• Conflict-Free Timetables: Algorithmic master schedules allocating teachers and classrooms with zero clashes.\n' +
            '• Financial Management: Itemized term fee invoicing, digital payment receipts, and collection auditing.',
      img: '04_admin_command_center.png',
      caption: 'Figure 1: Multi-School Command Center displaying live telemetry across all 12 registered institutions.'
    },
    {
      title: 'Chapter 2: Educator & Teacher Workspace',
      color: '#06B6D4',
      text: 'The Educator Workspace is designed to streamline daily teaching activities and curriculum delivery.\n\n' +
            '• Teaching Schedule: Real-time timetable of current and upcoming class periods.\n' +
            '• Resource Upload Studio: Teachers upload past papers, exam memos, study guides, and worksheets on demand.\n' +
            '• CAPS Digital Markbook: Records test and assignment marks with automatic SBA weighting calculations.\n' +
            '• Attendance Register: Period-by-period attendance with automated parent notifications.\n' +
            '• AI Lesson Planner: Generates 45-minute CAPS-aligned teaching plans and examination question papers.',
      img: '14_teacher_resources.png',
      caption: 'Figure 2: Learning Resources & Past Papers Studio allowing educators to upload materials autonomously.'
    },
    {
      title: 'Chapter 3: Parent & Family Learning Portal',
      color: '#F59E0B',
      text: 'The Parent Portal bridges home and school communication with real-time academic transparency.\n\n' +
            '• Multi-Child Dashboard: Monitor all enrolled children across grades from a single parent account.\n' +
            '• Academic Reports: Live subject progress bars, task marks, and official signed CAPS report cards.\n' +
            '• 20-Minute Consultation Scheduler: Parents select their child and educator to book open time slots.\n' +
            '• Financial Transparency: Digital fee statements, itemized invoices, and automated Sunday digests.\n' +
            '• Daily Attendance & Timetable: Tracks period attendance and classroom schedules.',
      img: '21_parent_consultations.png',
      caption: 'Figure 3: Parent-Educator 20-Minute Consultation Scheduler with automated email confirmations.'
    },
    {
      title: 'Chapter 4: Learner & Student Learning Hub',
      color: '#10B981',
      text: 'The Student Learning Hub motivates learners through structured curriculum support and interactive revision.\n\n' +
            '• School-Aware AI Tutor: Multi-tenant grounding sensing the learner\'s campus with zero cross-school leakage.\n' +
            '• Subject Curriculum & Notes: Step-by-step topic guides and formula summaries across all CAPS subjects.\n' +
            '• Fusion Arcade Games: Gamified quizzes awarding XP, streak multipliers, and leaderboard rankings.\n' +
            '• NSFAS & Tertiary Bursaries: Degree matching engine evaluating simulated APS points.\n' +
            '• Career Advisor: Guides learners on faculty requirements for South African universities.',
      img: '26_learner_ai_tutor.png',
      caption: 'Figure 4: School-Aware AI Academic Tutor providing bilingual CAPS revision.'
    }
  ];

  for (const pageItem of pdfPages) {
    pdfDoc.addPage();
    pdfDoc.rect(0, 0, 595.28, 841.89).fill('#0B0F19');
    pdfDoc.fillColor('#FFFFFF').fontSize(16).font('Helvetica-Bold').text(pageItem.title, 40, 45);
    pdfDoc.rect(40, 68, 515.28, 2).fill(pageItem.color);

    pdfDoc.fillColor('#CBD5E1').fontSize(8.5).font('Helvetica')
      .text(pageItem.text, 40, 80, { width: 515.28, lineGap: 3 });

    const imgP = path.join(SCREENSHOTS_DIR, pageItem.img);
    if (fs.existsSync(imgP)) {
      pdfDoc.image(imgP, 40, 240, { width: 515.28 });
      pdfDoc.fillColor('#94A3B8').fontSize(7.5).font('Helvetica-Oblique')
        .text(pageItem.caption, 40, 550, { align: 'center' });
    }
  }

  pdfDoc.end();

  pdfStream.on('finish', () => {
    console.log(`[✓] Master PDF Documentation compiled: ${pdfFilePath}`);
    console.log('\n======================================================');
    console.log('PRESENTATION & DOCUMENTATION GENERATION COMPLETE!');
    console.log('Total Slides / Screens: ' + allScreenshots.length);
    console.log('1. PowerPoint Deck: FUSION_HIGH_SYSTEM_PRESENTATION.pptx');
    console.log('2. Master PDF Guide: FUSION_HIGH_SYSTEM_DOCUMENTATION.pdf');
    console.log('3. Screenshots Directory: presentation_assets/screenshots/');
    console.log('======================================================');
    process.exit(0);
  });
}

run().catch(err => {
  console.error('Fatal generation error:', err);
  process.exit(1);
});
