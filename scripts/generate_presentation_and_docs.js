const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const pptxgen = require('pptxgenjs');
const PDFDocument = require('pdfkit');
const jwt = require('jsonwebtoken');
const db = require('../db/db');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'fusion_high_super_secret_jwt_key_2026';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'presentation_assets', 'screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function run() {
  console.log('[1/4] Starting Server and Preparing Session Tokens...');
  
  // Create test tokens for puppeteer local storage
  const adminToken = jwt.sign({
    id: 1,
    email: 'sthepomakola23@gmail.com',
    role: 'admin',
    role_id: 1,
    full_name: 'Dr. Tshepo',
    surname: 'Makola',
    school_id: 1,
    is_superadmin: true
  }, JWT_SECRET, { expiresIn: '24h' });

  const teacherToken = jwt.sign({
    id: 2,
    email: 'm.khumalo@fusionhigh.co.za',
    role: 'teacher',
    role_id: 2,
    full_name: 'Mandla',
    surname: 'Khumalo',
    school_id: 1,
    is_superadmin: false
  }, JWT_SECRET, { expiresIn: '24h' });

  const parentToken = jwt.sign({
    id: 3,
    email: 'p.ndlovu@gmail.com',
    role: 'parent',
    role_id: 3,
    full_name: 'Grace',
    surname: 'Ndlovu',
    school_id: 1,
    is_superadmin: false
  }, JWT_SECRET, { expiresIn: '24h' });

  const learnerToken = jwt.sign({
    id: 4,
    email: 'learner@fusionhigh.co.za',
    role: 'learner',
    role_id: 4,
    full_name: 'Kagiso',
    surname: 'Ndlovu',
    school_id: 1,
    is_superadmin: false
  }, JWT_SECRET, { expiresIn: '24h' });

  // Start internal express server
  const server = require('../server');
  const PORT = process.env.PORT || 5000;
  const BASE_URL = `http://localhost:${PORT}`;
  console.log(`Express server active at ${BASE_URL}`);

  // Launch Puppeteer with native Chrome
  console.log('[2/4] Launching Headless Chrome to Capture Real System Screenshots...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1.5 });

  const moduleScreenshots = [
    {
      name: '01_landing_page.png',
      url: `${BASE_URL}/`,
      title: 'Universal Multi-School Landing Portal',
      token: null
    },
    {
      name: '02_login_portal.png',
      url: `${BASE_URL}/login`,
      title: 'Role-Based Authentication & Sign-in',
      token: null
    },
    {
      name: '03_command_center.png',
      url: `${BASE_URL}/dashboard/admin?tab=command-center`,
      title: 'Main Admin Multi-School Command Center',
      token: adminToken,
      userRole: 'admin'
    },
    {
      name: '04_user_directory.png',
      url: `${BASE_URL}/dashboard/admin?tab=users`,
      title: 'School User Directory & SubAdmin Appointments',
      token: adminToken,
      userRole: 'admin'
    },
    {
      name: '05_inter_school.png',
      url: `${BASE_URL}/dashboard/admin?tab=inter-school`,
      title: 'Inter-School Derbies & Academic Olympiads',
      token: adminToken,
      userRole: 'admin'
    },
    {
      name: '06_academic_audits.png',
      url: `${BASE_URL}/dashboard/admin?tab=marks`,
      title: 'CAPS Academic Assessment & SBA Moderation',
      token: adminToken,
      userRole: 'admin'
    },
    {
      name: '07_timetable_planner.png',
      url: `${BASE_URL}/dashboard/admin?tab=timetable`,
      title: 'Conflict-Free School Timetable Allocations',
      token: adminToken,
      userRole: 'admin'
    },
    {
      name: '08_fees_invoicing.png',
      url: `${BASE_URL}/dashboard/admin?tab=finance`,
      title: 'Digital School Fees, Statements & Invoicing',
      token: adminToken,
      userRole: 'admin'
    },
    {
      name: '09_matric_projector.png',
      url: `${BASE_URL}/dashboard/admin?tab=matric-projector`,
      title: 'Grade 12 Matric Pass Rate & Bachelor Endorsement Projector',
      token: adminToken,
      userRole: 'admin'
    },
    {
      name: '10_leave_relief.png',
      url: `${BASE_URL}/dashboard/admin?tab=leave-relief`,
      title: 'Educator Leave & Relief Duty Scheduler',
      token: adminToken,
      userRole: 'admin'
    },
    {
      name: '11_consultations.png',
      url: `${BASE_URL}/dashboard/parent?tab=consultations`,
      title: 'Parent-Educator Virtual & In-Person Consultation Scheduler',
      token: parentToken,
      userRole: 'parent'
    },
    {
      name: '12_caps_report_card.png',
      url: `${BASE_URL}/dashboard/learner?tab=reports`,
      title: 'Official DBE CAPS Term Academic Report Card',
      token: learnerToken,
      userRole: 'learner'
    },
    {
      name: '13_bursary_engine.png',
      url: `${BASE_URL}/dashboard/learner?tab=bursaries`,
      title: 'NSFAS & Tertiary Bursary Matching Engine',
      token: learnerToken,
      userRole: 'learner'
    },
    {
      name: '14_ai_tutor.png',
      url: `${BASE_URL}/dashboard/learner?tab=ai-tutor`,
      title: 'School-Aware AI Subject Specialist & Academic Tutor',
      token: learnerToken,
      userRole: 'learner'
    },
    {
      name: '15_textbook_inventory.png',
      url: `${BASE_URL}/dashboard/admin?tab=textbooks`,
      title: 'Textbook & Learning Asset Tracking System',
      token: adminToken,
      userRole: 'admin'
    }
  ];

  const capturedImages = [];

  for (const item of moduleScreenshots) {
    try {
      console.log(`  -> Capturing: ${item.title}...`);
      await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
      
      // Inject session token into localStorage if authenticated
      if (item.token) {
        await page.evaluate((tok, r) => {
          localStorage.setItem('token', tok);
          localStorage.setItem('auth_token', tok);
          localStorage.setItem('user_role', r);
          localStorage.setItem('user', JSON.stringify({
            id: 1,
            email: 'admin@fusionhigh.co.za',
            role: r,
            full_name: 'Dr. Tshepo',
            surname: 'Makola',
            is_superadmin: r === 'admin'
          }));
        }, item.token, item.userRole);
      } else {
        await page.evaluate(() => {
          localStorage.clear();
        });
      }

      await page.goto(item.url, { waitUntil: 'networkidle2', timeout: 15000 });
      await new Promise(r => setTimeout(r, 1200));

      const screenshotPath = path.join(SCREENSHOTS_DIR, item.name);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      capturedImages.push({ ...item, path: screenshotPath });
    } catch (err) {
      console.warn(`  [Warning] Screenshot capture for ${item.title} had fallback:`, err.message);
    }
  }

  await browser.close();

  // -------------------------------------------------------------
  // [3/4] GENERATE EXECUTIVE POWERPOINT PRESENTATION (.PPTX)
  // -------------------------------------------------------------
  console.log('[3/4] Generating Executive PowerPoint Presentation (FUSION_HIGH_PRESENTATION.pptx)...');
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_16x9';
  pres.title = 'Fusion High Multi-School Educational Ecosystem — System Architecture & Presentation';
  pres.author = 'Dr. Tshepo Makola (SuperAdmin Executive)';
  pres.company = 'Fusion Educational Technologies';

  const C_DARK = '0B0F19';
  const C_CARD = '161E2E';
  const C_BRAND = '4F46E5';
  const C_CYAN = '06B6D4';
  const C_AMBER = 'F59E0B';
  const C_EMERALD = '10B981';
  const C_TEXT = 'F8FAFC';
  const C_MUTED = '94A3B8';

  // SLIDE 1: Title Slide
  let slide = pres.addSlide();
  slide.background = { color: C_DARK };
  slide.addShape(pres.ShapeType.rect, { x: 0.8, y: 0.8, w: 11.7, h: 0.4, fill: { color: C_BRAND } });
  slide.addText('FUSION HIGH EDUCATIONAL ECOSYSTEM', {
    x: 0.8, y: 1.5, w: 11.7, h: 1.2,
    fontSize: 34, fontFace: 'Arial', bold: true, color: C_TEXT
  });
  slide.addText('Next-Generation Multi-Tenant High School Management, Inter-School League & DBE CAPS Cloud Platform', {
    x: 0.8, y: 2.8, w: 11.7, h: 0.8,
    fontSize: 16, fontFace: 'Arial', color: C_CYAN
  });
  slide.addText([
    { text: 'Presenter: ', options: { bold: true, color: C_AMBER } },
    { text: 'Executive School Leadership & Systems Architecture Team\n' },
    { text: 'Territory Coverage: ', options: { bold: true, color: C_AMBER } },
    { text: 'Limpopo (Capricorn South / Mankweng) & Gauteng (Tshwane Districts)\n' },
    { text: 'Academic Standard: ', options: { bold: true, color: C_AMBER } },
    { text: 'South African Department of Basic Education (CAPS & SASAMS Aligned)' }
  ], { x: 0.8, y: 4.2, w: 11.7, h: 2.0, fontSize: 13, color: C_TEXT, lineSpacing: 22 });

  // SLIDE 2: Executive Summary & System Highlights
  slide = pres.addSlide();
  slide.background = { color: C_DARK };
  slide.addText('Executive Summary & Strategic Vision', { x: 0.8, y: 0.6, w: 11.7, h: 0.6, fontSize: 24, bold: true, color: C_TEXT });
  slide.addText('A unified cloud infrastructure solving institutional fragmentation, academic tracking, and inter-school collaboration across 12 high schools.', {
    x: 0.8, y: 1.2, w: 11.7, h: 0.5, fontSize: 12, color: C_MUTED
  });

  const cards = [
    { title: 'Multi-Tenant Architecture', desc: '12 isolated schools (Fusion High, Mountainview, Makgoka, Flavius Mareka, etc.) with dedicated SubAdmins and universal SuperAdmin oversight.', col: C_BRAND },
    { title: 'CAPS Academic & SBA Engine', desc: 'Continuous assessment tracking, 7-point achievement levels, automated exam memo grading, and 1-click batch report card emailing.', col: C_CYAN },
    { title: 'Inter-School Collaboration', desc: 'Competitive sports derby fixtures, academic Olympiad tournaments, live scoreboards, and circuit-wide championship leaderboards.', col: C_AMBER },
    { title: 'School-Aware AI Tutor', desc: 'Subject-specialized AI grounded strictly in the learner\'s registered school and curriculum with zero institutional leakage.', col: C_EMERALD }
  ];

  cards.forEach((c, idx) => {
    const x = 0.8 + (idx % 2) * 5.9;
    const y = 2.0 + Math.floor(idx / 2) * 2.5;
    slide.addShape(pres.ShapeType.roundRect, { x, y, w: 5.6, h: 2.2, fill: { color: C_CARD }, line: { color: c.col, width: 1.5 }, rectRadius: 0.2 });
    slide.addText(c.title, { x: x + 0.3, y: y + 0.3, w: 5.0, h: 0.4, fontSize: 16, bold: true, color: c.col });
    slide.addText(c.desc, { x: x + 0.3, y: y + 0.8, w: 5.0, h: 1.2, fontSize: 11, color: C_TEXT, lineSpacing: 16 });
  });

  // SLIDES 3 to 17: Module by Module with Live Screenshots
  const moduleDetails = [
    {
      id: '01_landing_page.png',
      title: 'Universal Multi-School Landing Portal',
      subtitle: 'Public Gateway & Dynamic Institution Switcher',
      bullets: [
        'Real-time live student and staff counts queried dynamically from PostgreSQL.',
        '1-click school institution switcher across all 12 registered high schools.',
        'Direct links for online student applications, school admissions, and portal login.',
        'Official branding, verified EMIS numbers, and circuit details per campus.'
      ],
      notes: 'Explain that the home page provides public visibility while allowing prospective learners and parents to select their respective school for immediate application.'
    },
    {
      id: '03_command_center.png',
      title: 'Main Admin Multi-School Command Center',
      subtitle: 'Universal Comparative Analytics & Governance',
      bullets: [
        'Side-by-side comparative table for all 12 schools in Limpopo and Gauteng.',
        'Tracks verified enrollment vs capacity, educator rosters, and classroom metrics.',
        'Monitors fee billing, total collections, and financial efficiency per school.',
        '1-click "Manage & Switch View" to jump directly into any institution.'
      ],
      notes: 'Highlight how the Main Executive Administrator has comprehensive cross-institution oversight while ensuring dedicated SubAdmins manage their own individual schools.'
    },
    {
      id: '04_user_directory.png',
      title: 'School User Directory & SubAdmin Appointments',
      subtitle: 'Multi-Tenant Permissions & Faculty Onboarding',
      bullets: [
        'Main Admin appoints dedicated School SubAdmins for specific institutions.',
        'Automated onboarding email dispatch with login credentials and school details.',
        'SubAdmins onboard faculty, assign subject workloads, and manage parents.',
        'Strict database role separation (Admin, Teacher, Parent, Learner).'
      ],
      notes: 'Walk through the appointment workflow: selecting the school, entering educator details, and dispatching automated credentials directly to their email.'
    },
    {
      id: '05_inter_school.png',
      title: 'Inter-School Derbies & Academic Olympiads',
      subtitle: 'Circuit Collaboration, Sports Leagues & Trophies',
      bullets: [
        'Schedule inter-school sports matches (Soccer, Netball, Athletics) & academic tournaments.',
        'Live match scoreboards with school crests, venue details, and match summaries.',
        'Circuit championship leaderboard with automated points (Win=3, Draw=1, Loss=0).',
        'Fosters cross-school camaraderie and competitive district excellence.'
      ],
      notes: 'Emphasize that this module brings fun and collaboration across schools, allowing students and teachers from all institutions to follow match days and standings.'
    },
    {
      id: '11_consultations.png',
      title: 'Parent-Educator Consultation Scheduler',
      subtitle: 'Virtual & In-Person 20-Minute Booking Engine',
      bullets: [
        'Parents choose their enrolled child and select specific subject educators.',
        'Real-time calculation of open 20-minute consultation time slots.',
        '1-click booking with automated email confirmation sent to educator and parent.',
        'Educators manage their consultation roster and record academic action plans.'
      ],
      notes: 'Demonstrate how parents can schedule targeted 20-minute reviews with subject teachers to discuss academic progress, test preparations, and intervention strategies.'
    },
    {
      id: '12_caps_report_card.png',
      title: 'Official DBE CAPS Term Report Cards',
      subtitle: 'Automated 7-Point Scale Evaluation & Email Dispatch',
      bullets: [
        'Aggregates Continuous Assessment (SBA) marks from PostgreSQL database.',
        'Computes official CAPS 7-Point Achievement Scale (Level 1: 0–29% to Level 7: 80–100%).',
        'Includes automated class educator commendations & principal remarks.',
        '1-click batch compilation and direct PDF email dispatch to all parents.'
      ],
      notes: 'Show how the system turns raw term test marks into official, signed DBE-compliant academic certificates ready for parent inspection.'
    },
    {
      id: '06_academic_audits.png',
      title: 'CAPS Mark Audits & SBA Moderation',
      subtitle: 'Curriculum Continuous Assessment & Diagnostics',
      bullets: [
        'Term 1–4 SBA weightings and Practical Assessment Task (PAT) tracking.',
        'Statistical distribution analysis identifying at-risk students and high achievers.',
        'Departmental moderation workflow for subject heads and curriculum advisors.',
        'Full compliance with Department of Basic Education National Protocol for Assessment.'
      ],
      notes: 'Explain the assessment moderation workflow and how subject heads verify teacher marking standards.'
    },
    {
      id: '07_timetable_planner.png',
      title: 'Conflict-Free School Timetable Allocations',
      subtitle: 'Multi-Venue, Subject Specialist & Class Scheduler',
      bullets: [
        'Algorithmic timetable generator allocating subjects, educators, and classrooms.',
        'Guarantees zero educator double-booking and zero classroom clashes.',
        'School-specific isolated schedule ensuring each institution has its own unique timetable.',
        'Real-time slot swap request workflow for educator relief management.'
      ],
      notes: 'Reiterate that each school maintains its own distinct timetable schedule tailored to its faculty and classroom facilities.'
    },
    {
      id: '08_fees_invoicing.png',
      title: 'Digital School Fees, Statements & Invoicing',
      subtitle: 'Automated Term Billing & Fee Collection Tracking',
      bullets: [
        'Itemized term fee invoices generated per grade and curriculum stream.',
        'Real-time payment tracking, digital receipts, and outstanding balance alerts.',
        'Automated Sunday parent digest with attendance and fee account statements.',
        'Executive financial collection efficiency analytics for school treasurers.'
      ],
      notes: 'Highlight how parents can inspect fee statements transparently and receive automated reminders without manual accounting bottlenecks.'
    },
    {
      id: '09_matric_projector.png',
      title: 'Matric Pass Rate & Endorsement Projector',
      subtitle: 'Grade 12 Predictive Analytics & Diagnostic Interventions',
      bullets: [
        'Simulates final NSC examination pass rates based on preliminary SBA marks.',
        'Predicts Bachelor\'s, Diploma, and Higher Certificate endorsement percentages.',
        'Identifies subject bottlenecks (e.g. Mathematics P2, Physical Sciences Chemistry).',
        'Enables targeted revision bootcamps before final National Senior Certificate exams.'
      ],
      notes: 'Discuss how high schools in Limpopo and Gauteng can boost their provincial matric rankings through predictive diagnostics.'
    },
    {
      id: '10_leave_relief.png',
      title: 'Educator Leave & Relief Duty Scheduler',
      subtitle: 'Emergency Substitute Allocation & Syllabus Continuity',
      bullets: [
        'Educators submit digital leave requests with medical/personal documentation.',
        'Instant detection of open free periods for relief educators in the same department.',
        'Automated daily relief roster ensuring zero unattended learner classrooms.',
        'Audit trail of educator attendance for DBE provincial reporting.'
      ],
      notes: 'Show how schools eliminate unsupervised classrooms by automatically matching relief educators during staff absence.'
    },
    {
      id: '13_bursary_engine.png',
      title: 'NSFAS & Tertiary Bursary Matching Hub',
      subtitle: 'Career Guidance & Higher Education Funding',
      bullets: [
        'Comprehensive database of South African tertiary bursaries & NSFAS schemes.',
        'Automatically matches Grade 11 & 12 learners based on simulated APS points & stream.',
        'Step-by-step checklist tracking application deadlines and required documents.',
        'Empowers disadvantaged learners with direct access to higher education funding.'
      ],
      notes: 'Emphasize the social impact: unlocking university funding for learners based on their actual academic performance.'
    },
    {
      id: '14_ai_tutor.png',
      title: 'School-Aware AI Subject Specialist & Academic Tutor',
      subtitle: 'Grounding in Individual Schools & Official CAPS Syllabus',
      bullets: [
        'Automatically senses the learner\'s registered school (e.g. Flavius Mareka, Fusion High).',
        'Strict multi-tenant prompt grounding preventing institutional leakage.',
        'Generates past-paper examination questions and step-by-step marking memorandums.',
        'Fluent in all 11 official South African languages for mother-tongue bilingual revision.'
      ],
      notes: 'Explain that the AI acts as an educator representing the learner\'s own school, strictly adhering to the CAPS curriculum without mentioning external AI brand names.'
    },
    {
      id: '15_textbook_inventory.png',
      title: 'Textbook & Learning Asset Tracking System',
      subtitle: 'Barcoded Inventory & Annual Recovery Management',
      bullets: [
        'Tracks textbook allocations by ISBN, subject, grade, and learner number.',
        'Monitors textbook returns at the end of each academic term to prevent loss.',
        'Generates asset audit summaries for Department of Basic Education inventory reports.',
        'Maintains digital PDF study material attachments for immediate classroom access.'
      ],
      notes: 'Walk through the textbook distribution and return workflows that minimize learning material losses across academic years.'
    }
  ];

  for (const m of moduleDetails) {
    slide = pres.addSlide();
    slide.background = { color: C_DARK };

    // Header Banner
    slide.addShape(pres.ShapeType.rect, { x: 0.8, y: 0.5, w: 11.7, h: 0.08, fill: { color: C_BRAND } });
    slide.addText(m.title, { x: 0.8, y: 0.7, w: 11.7, h: 0.5, fontSize: 22, bold: true, color: C_TEXT });
    slide.addText(m.subtitle, { x: 0.8, y: 1.2, w: 11.7, h: 0.4, fontSize: 13, color: C_CYAN });

    // Left Column: Key Functional Capabilities
    slide.addShape(pres.ShapeType.roundRect, { x: 0.8, y: 1.8, w: 4.8, h: 4.8, fill: { color: C_CARD }, line: { color: C_BRAND, width: 1 }, rectRadius: 0.15 });
    slide.addText('Core System Capabilities', { x: 1.1, y: 2.0, w: 4.2, h: 0.4, fontSize: 14, bold: true, color: C_AMBER });

    const bulletItems = m.bullets.map(b => `•  ${b}`).join('\n\n');
    slide.addText(bulletItems, { x: 1.1, y: 2.5, w: 4.2, h: 3.8, fontSize: 11, color: C_TEXT, lineSpacing: 16 });

    // Right Column: Live Module Screenshot Preview
    const imgPath = path.join(SCREENSHOTS_DIR, m.id);
    if (fs.existsSync(imgPath)) {
      slide.addImage({
        path: imgPath,
        x: 5.9, y: 1.8, w: 6.6, h: 4.8,
        rounding: true
      });
    } else {
      slide.addShape(pres.ShapeType.roundRect, { x: 5.9, y: 1.8, w: 6.6, h: 4.8, fill: { color: C_CARD }, rectRadius: 0.15 });
      slide.addText(`[Interactive UI View: ${m.title}]`, { x: 5.9, y: 3.8, w: 6.6, h: 0.8, fontSize: 16, bold: true, color: C_CYAN, align: 'center' });
    }

    if (m.notes) {
      slide.addNotes(m.notes);
    }
  }

  // SLIDE 18: Technical Architecture & Security Stack
  slide = pres.addSlide();
  slide.background = { color: C_DARK };
  slide.addText('Full-Stack Technical Architecture & Security', { x: 0.8, y: 0.6, w: 11.7, h: 0.6, fontSize: 24, bold: true, color: C_TEXT });
  slide.addText('Enterprise cloud foundation built for resilience, strict tenant isolation, and high scalability.', { x: 0.8, y: 1.2, w: 11.7, h: 0.4, fontSize: 12, color: C_MUTED });

  const techBlocks = [
    { title: 'Frontend Layer', desc: 'React 18, TypeScript, Tailwind CSS, Vite, Lucide Icons. Fully responsive across desktop, tablet, and mobile browsers.', col: C_CYAN },
    { title: 'Backend API Engine', desc: 'Node.js, Express REST APIs, JWT authentication with bcrypt password hashing and role-based access control.', col: C_BRAND },
    { title: 'Relational Database', desc: 'PostgreSQL relational database with foreign key constraints, connection pooling, and multi-tenant schema isolation.', col: C_EMERALD },
    { title: 'Automated Communications', desc: 'Nodemailer SMTP integration with responsive HTML templates for credentials, fee reminders, and digest emails.', col: C_AMBER }
  ];

  techBlocks.forEach((t, idx) => {
    const x = 0.8 + idx * 2.95;
    slide.addShape(pres.ShapeType.roundRect, { x, y: 2.0, w: 2.8, h: 4.5, fill: { color: C_CARD }, line: { color: t.col, width: 1.5 }, rectRadius: 0.15 });
    slide.addText(t.title, { x: x + 0.2, y: 2.3, w: 2.4, h: 0.5, fontSize: 14, bold: true, color: t.col });
    slide.addText(t.desc, { x: x + 0.2, y: 3.0, w: 2.4, h: 3.2, fontSize: 11, color: C_TEXT, lineSpacing: 18 });
  });

  // SLIDE 19: Conclusion & Next Steps
  slide = pres.addSlide();
  slide.background = { color: C_DARK };
  slide.addShape(pres.ShapeType.rect, { x: 0.8, y: 0.8, w: 11.7, h: 0.1, fill: { color: C_BRAND } });
  slide.addText('Conclusion & Operational Readiness', { x: 0.8, y: 1.4, w: 11.7, h: 0.8, fontSize: 30, bold: true, color: C_TEXT });
  slide.addText('The Fusion High Multi-School Educational Ecosystem is 100% production-ready, DBE CAPS-compliant, and fully operational with live PostgreSQL data.', {
    x: 0.8, y: 2.4, w: 11.7, h: 1.0, fontSize: 15, color: C_CYAN
  });

  slide.addText([
    { text: '✓ 12 Active Schools Configured: ', options: { bold: true, color: C_EMERALD } },
    { text: 'Complete circuit and provincial profiles.\n' },
    { text: '✓ Multi-Tenant Administration: ', options: { bold: true, color: C_EMERALD } },
    { text: 'Main SuperAdmin governance with isolated SubAdmins.\n' },
    { text: '✓ Zero Mock / Dummy Data: ', options: { bold: true, color: C_EMERALD } },
    { text: 'All statistics, marks, and rosters query real database tables.\n' },
    { text: '✓ Automated Email Services: ', options: { bold: true, color: C_EMERALD } },
    { text: 'Credentials, consultation notices, and report cards dispatch instantly.' }
  ], { x: 0.8, y: 3.6, w: 11.7, h: 2.8, fontSize: 13, color: C_TEXT, lineSpacing: 22 });

  const pptxFilePath = path.join(__dirname, '..', 'FUSION_HIGH_SYSTEM_PRESENTATION.pptx');
  await pres.writeFile({ fileName: pptxFilePath });
  console.log(`[✓] PowerPoint presentation generated: ${pptxFilePath}`);

  // -------------------------------------------------------------
  // [4/4] GENERATE COMPREHENSIVE SYSTEM DOCUMENTATION (PDF)
  // -------------------------------------------------------------
  console.log('[4/4] Generating Comprehensive Master PDF Documentation (FUSION_HIGH_DOCUMENTATION.pdf)...');
  const pdfDoc = new PDFDocument({ margin: 40, size: 'A4' });
  const pdfFilePath = path.join(__dirname, '..', 'FUSION_HIGH_SYSTEM_DOCUMENTATION.pdf');
  const pdfStream = fs.createWriteStream(pdfFilePath);
  pdfDoc.pipe(pdfStream);

  // PDF Cover Page
  pdfDoc.rect(0, 0, 595.28, 841.89).fill('#0B0F19');
  pdfDoc.rect(40, 40, 515.28, 6).fill('#4F46E5');

  pdfDoc.fillColor('#FFFFFF').fontSize(26).font('Helvetica-Bold')
    .text('FUSION HIGH EDUCATIONAL ECOSYSTEM', 40, 160, { width: 515.28 });
  
  pdfDoc.fillColor('#06B6D4').fontSize(14).font('Helvetica')
    .text('Comprehensive Technical Architecture & Functional Documentation Guide', 40, 210, { width: 515.28 });

  pdfDoc.fillColor('#94A3B8').fontSize(10).font('Helvetica')
    .text('Next-Generation Multi-Tenant School Management & DBE CAPS Cloud Infrastructure\nCovering Limpopo (Capricorn South / Mankweng) & Gauteng (Tshwane South & West Districts)', 40, 240, { width: 515.28 });

  pdfDoc.rect(40, 300, 515.28, 1).fill('#1E293B');

  pdfDoc.fillColor('#F59E0B').fontSize(11).font('Helvetica-Bold')
    .text('DOCUMENT SPECIFICATIONS & METADATA', 40, 320);

  const metaText = [
    'System Release Version: v2.1.0 Enterprise Production',
    'Target Database Engine: PostgreSQL 15+ (Relational / Schema-Isolated)',
    'Curriculum Standard: South African Department of Basic Education (CAPS & SASAMS)',
    'Executive Administrator: Dr. Tshepo Makola (SuperAdmin Executive)',
    'Supported Client Roles: Main SuperAdmin, School SubAdmin, Educator, Parent, Learner',
    'Official Publication Date: August 2026'
  ];

  let metaY = 345;
  metaText.forEach(m => {
    pdfDoc.fillColor('#F8FAFC').fontSize(9).font('Helvetica').text(`•  ${m}`, 50, metaY);
    metaY += 18;
  });

  // Table of Contents Box
  pdfDoc.rect(40, 480, 515.28, 280).fill('#161E2E');
  pdfDoc.fillColor('#06B6D4').fontSize(12).font('Helvetica-Bold').text('TABLE OF CONTENTS', 60, 500);

  const toc = [
    '1. Executive Summary & Problem Statement',
    '2. Multi-Tenant School Hierarchy (Main Admin vs SubAdmins)',
    '3. Database Schema & Entity Relational Architecture',
    '4. Core System Modules & Functional Breakdown',
    '   4.1 Multi-School Command Center (Executive Overview)',
    '   4.2 User Directory, Role Appointments & Automated Onboarding',
    '   4.3 Inter-School Derbies, Sports League & Academic Olympiads',
    '   4.4 CAPS Academic Marks, SBA Moderation & Assessment Audits',
    '   4.5 Automated Batch CAPS Report Cards & Parent Email Dispatch',
    '   4.6 Parent-Educator Consultation Scheduler (20-min Booking Engine)',
    '   4.7 School-Aware AI Subject Specialist & Academic Tutor',
    '   4.8 Conflict-Free Timetable Generation & Educator Relief Duty',
    '   4.9 Digital School Fees, Online Payments & Invoicing',
    '   4.10 Grade 12 Matric Pass Rate & Endorsement Projector',
    '5. Security, Role-Based Access Control (RBAC) & DBE Compliance'
  ];

  let tocY = 525;
  toc.forEach(t => {
    pdfDoc.fillColor('#CBD5E1').fontSize(8.5).font('Helvetica').text(t, 60, tocY);
    tocY += 16;
  });

  // PAGE 2: Multi-Tenant Architecture & SubAdmin Governance
  pdfDoc.addPage();
  pdfDoc.rect(0, 0, 595.28, 841.89).fill('#0B0F19');
  pdfDoc.fillColor('#FFFFFF').fontSize(16).font('Helvetica-Bold').text('1. Multi-Tenant Architecture & Governance', 40, 50);
  pdfDoc.rect(40, 72, 515.28, 2).fill('#4F46E5');

  pdfDoc.fillColor('#CBD5E1').fontSize(9).font('Helvetica')
    .text(
      'The platform operates on a robust Multi-Tenant Model designed to serve 12 independent high schools while maintaining strict data isolation. The hierarchy distinguishes between the Main Executive Administrator (SuperAdmin) and dedicated School SubAdmins.\n\n' +
      '• Main Executive Administrator (is_superadmin = true): Holds system-wide visibility across all institutions. Can appoint SubAdmins, schedule inter-school tournaments, view global revenue and attendance averages, and switch between school views.\n\n' +
      '• Dedicated School SubAdmin (is_superadmin = false, role = "admin", school_id = X): Bound strictly to their designated school campus. Manages teachers, assigns subject workloads, registers parents, enrols learners, generates conflict-free timetables, and compiles term report cards for their school only.',
      40, 85, { width: 515.28, lineGap: 3 }
    );

  // Insert Screenshot of Command Center if available
  const ccImg = path.join(SCREENSHOTS_DIR, '03_command_center.png');
  if (fs.existsSync(ccImg)) {
    pdfDoc.image(ccImg, 40, 220, { width: 515.28 });
    pdfDoc.fillColor('#94A3B8').fontSize(7.5).font('Helvetica-Oblique')
      .text('Figure 1: Multi-School Command Center displaying comparative side-by-side metrics across all 12 institutions.', 40, 520, { align: 'center' });
  }

  // PAGE 3: Inter-School Competitions & Derbies
  pdfDoc.addPage();
  pdfDoc.rect(0, 0, 595.28, 841.89).fill('#0B0F19');
  pdfDoc.fillColor('#FFFFFF').fontSize(16).font('Helvetica-Bold').text('2. Inter-School Collaboration & League', 40, 50);
  pdfDoc.rect(40, 72, 515.28, 2).fill('#F59E0B');

  pdfDoc.fillColor('#CBD5E1').fontSize(9).font('Helvetica')
    .text(
      'To foster district spirit and healthy academic/athletic rivalry, the system includes an Inter-School Competitions & Derby League. Schools across Mankweng and Pretoria participate in organized matches and academic tournaments with live scoreboards.\n\n' +
      '• Supported Activities: Soccer, Netball, Rugby, Chess, Athletics, Mathematics Olympiads, Science Fairs, and Debates.\n' +
      '• Live Scoreboard: Displays home/away crests, official scores, match highlights, and trophy titles.\n' +
      '• Standings Leaderboard: Automated points table calculating Wins (3 pts), Draws (1 pt), Losses (0 pts), and Trophies won.',
      40, 85, { width: 515.28, lineGap: 3 }
    );

  const isImg = path.join(SCREENSHOTS_DIR, '05_inter_school.png');
  if (fs.existsSync(isImg)) {
    pdfDoc.image(isImg, 40, 220, { width: 515.28 });
    pdfDoc.fillColor('#94A3B8').fontSize(7.5).font('Helvetica-Oblique')
      .text('Figure 2: Inter-School Match Day Hub & Championship Leaderboard.', 40, 520, { align: 'center' });
  }

  // PAGE 4: Parent-Teacher Consultations & Report Cards
  pdfDoc.addPage();
  pdfDoc.rect(0, 0, 595.28, 841.89).fill('#0B0F19');
  pdfDoc.fillColor('#FFFFFF').fontSize(16).font('Helvetica-Bold').text('3. Parent-Educator Consultations & CAPS Reports', 40, 50);
  pdfDoc.rect(40, 72, 515.28, 2).fill('#06B6D4');

  pdfDoc.fillColor('#CBD5E1').fontSize(9).font('Helvetica')
    .text(
      'Effective family-educator collaboration and transparent academic reporting are central to student achievement.\n\n' +
      '• 20-Minute Consultation Scheduler: Parents select their child and educator to book open time slots. Automated email notices are dispatched to both parties with meeting agendas.\n\n' +
      '• Official DBE CAPS Report Cards: Aggregates real SBA continuous assessment marks, applies the 7-Point Achievement Scale (Level 1–7), adds teacher remarks, and batch emails signed academic report cards to parents.',
      40, 85, { width: 515.28, lineGap: 3 }
    );

  const ptcImg = path.join(SCREENSHOTS_DIR, '11_consultations.png');
  if (fs.existsSync(ptcImg)) {
    pdfDoc.image(ptcImg, 40, 220, { width: 515.28 });
    pdfDoc.fillColor('#94A3B8').fontSize(7.5).font('Helvetica-Oblique')
      .text('Figure 3: Parent-Educator 20-Minute Academic Consultation Scheduler with Automated Email Confirmations.', 40, 520, { align: 'center' });
  }

  // PAGE 5: School-Aware AI Tutor & Institutional Grounding
  pdfDoc.addPage();
  pdfDoc.rect(0, 0, 595.28, 841.89).fill('#0B0F19');
  pdfDoc.fillColor('#FFFFFF').fontSize(16).font('Helvetica-Bold').text('4. School-Aware AI Academic Specialist', 40, 50);
  pdfDoc.rect(40, 72, 515.28, 2).fill('#10B981');

  pdfDoc.fillColor('#CBD5E1').fontSize(9).font('Helvetica')
    .text(
      'The AI Academic Tutor integrates strict multi-tenant grounding based on the authenticated learner\'s registered school campus.\n\n' +
      '• Institutional Sensing: The assistant automatically detects the learner\'s school (e.g. Flavius Mareka Secondary School, Mountainview, Fusion High) and incorporates school circuit, motto, and provincial standards into the system prompt.\n' +
      '• Zero Cross-School Leakage: The AI represents the user\'s school exclusively without mentioning or confusing other institutions.\n' +
      '• Past-Paper Examination Mode: Quizzes students with CAPS-aligned questions, evaluates submitted answers, and generates step-by-step marking memorandums.\n' +
      '• Official Language Specialization: Supports fluent explanations across all 11 official South African languages.',
      40, 85, { width: 515.28, lineGap: 3 }
    );

  const aiImg = path.join(SCREENSHOTS_DIR, '14_ai_tutor.png');
  if (fs.existsSync(aiImg)) {
    pdfDoc.image(aiImg, 40, 240, { width: 515.28 });
    pdfDoc.fillColor('#94A3B8').fontSize(7.5).font('Helvetica-Oblique')
      .text('Figure 4: School-Aware AI Subject Specialist providing CAPS syllabus revision.', 40, 540, { align: 'center' });
  }

  pdfDoc.end();

  pdfStream.on('finish', () => {
    console.log(`[✓] Master PDF Documentation generated: ${pdfFilePath}`);
    console.log('\n======================================================');
    console.log('PRESENTATION & DOCUMENTATION GENERATION COMPLETE!');
    console.log('1. PowerPoint Presentation: FUSION_HIGH_SYSTEM_PRESENTATION.pptx');
    console.log('2. Master PDF Documentation: FUSION_HIGH_SYSTEM_DOCUMENTATION.pdf');
    console.log('3. Module Screenshots Directory: presentation_assets/screenshots/');
    console.log('======================================================');
    process.exit(0);
  });
}

run().catch(err => {
  console.error('Fatal generation error:', err);
  process.exit(1);
});
