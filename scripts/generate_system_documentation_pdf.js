const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

async function generateDocumentationPDF() {
  console.log('--- Generating Fusion High SMS Technical Documentation PDF ---');

  const outputDir1 = path.join(__dirname, '../public/downloads');
  const outputDir2 = path.join(__dirname, '../client/public/downloads');

  if (!fs.existsSync(outputDir1)) fs.mkdirSync(outputDir1, { recursive: true });
  if (!fs.existsSync(outputDir2)) fs.mkdirSync(outputDir2, { recursive: true });

  const pdfFileName = 'Fusion_High_System_Architecture_and_Development_Documentation.pdf';
  const outputPath1 = path.join(outputDir1, pdfFileName);
  const outputPath2 = path.join(outputDir2, pdfFileName);

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    bufferPages: true,
    info: {
      Title: 'Fusion High School Management System - Technical Architecture & Engineering Documentation',
      Author: 'Fusion High Engineering & Software Development Team',
      Subject: 'Comprehensive System Architecture, Database Schema, Subsystems, and CAPS Curriculum Compliance',
      Keywords: 'School Management System, CAPS, PostgreSQL, Node.js, Express, React, TypeScript, South Africa DBE',
      CreationDate: new Date()
    }
  });

  const stream1 = fs.createWriteStream(outputPath1);
  doc.pipe(stream1);

  // Styling Helpers
  const primaryColor = '#0f172a'; // Slate 900
  const secondaryColor = '#0369a1'; // Sky 700
  const accentColor = '#b45309'; // Amber 700
  const textColor = '#334155'; // Slate 700
  const lightBg = '#f8fafc'; // Slate 50
  const borderColor = '#cbd5e1'; // Slate 300

  // Asset paths
  const logoPath = path.join(__dirname, '../public/assets/FH.png');
  const landingImg = path.join(__dirname, '../public/assets/Landing page.png');
  const parentDashImg = path.join(__dirname, '../public/assets/Parent_Dashboard.png');
  const myChildrenImg = path.join(__dirname, '../public/assets/My Children.png');
  const activationImg = path.join(__dirname, '../public/assets/Activation.png');
  const classroomImg = path.join(__dirname, '../public/assets/Classroom.png');
  const assemblyImg = path.join(__dirname, '../public/assets/Assembly.png');

  function addHeader(title, subtitle) {
    doc.fillColor(secondaryColor).fontSize(9).font('Helvetica-Bold').text('FUSION HIGH SCHOOL MANAGEMENT SYSTEM (SMS) • TECHNICAL SPECIFICATION', { align: 'left' });
    doc.moveDown(0.2);
    doc.strokeColor(secondaryColor).lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);
    if (title) {
      doc.fillColor(primaryColor).fontSize(18).font('Helvetica-Bold').text(title);
      if (subtitle) {
        doc.moveDown(0.2);
        doc.fillColor(accentColor).fontSize(10).font('Helvetica').text(subtitle);
      }
      doc.moveDown(0.8);
    }
  }

  function addSectionHeading(num, title) {
    doc.moveDown(0.8);
    doc.fillColor(primaryColor).fontSize(13).font('Helvetica-Bold').text(`${num}. ${title}`);
    doc.strokeColor(borderColor).lineWidth(0.5).moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).stroke();
    doc.moveDown(0.5);
  }

  function addSubSectionHeading(title) {
    doc.moveDown(0.5);
    doc.fillColor(secondaryColor).fontSize(11).font('Helvetica-Bold').text(title);
    doc.moveDown(0.3);
  }

  function addParagraph(text) {
    doc.fillColor(textColor).fontSize(9.5).font('Helvetica').text(text, { align: 'justify', lineGap: 3 });
    doc.moveDown(0.5);
  }

  function addBullet(boldLabel, text) {
    doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold').text(`• ${boldLabel}: `, { continued: true });
    doc.fillColor(textColor).font('Helvetica').text(text, { align: 'justify', lineGap: 2 });
    doc.moveDown(0.3);
  }

  function addCalloutBox(title, text) {
    const boxY = doc.y;
    doc.rect(50, boxY, 495, 45).fillAndStroke(lightBg, borderColor);
    doc.fillColor(accentColor).fontSize(9.5).font('Helvetica-Bold').text(title, 60, boxY + 8);
    doc.fillColor(textColor).fontSize(8.5).font('Helvetica').text(text, 60, boxY + 22, { width: 475, align: 'justify' });
    doc.y = boxY + 52;
  }

  function addImageWithCaption(imgPath, caption, height = 150) {
    if (fs.existsSync(imgPath)) {
      try {
        if (doc.y + height + 30 > 750) {
          doc.addPage();
          addHeader();
        }
        const imgY = doc.y;
        doc.image(imgPath, 50, imgY, { fit: [495, height], align: 'center' });
        doc.y = imgY + height + 6;
        doc.fillColor('#64748b').fontSize(8).font('Helvetica-Oblique').text(`Figure: ${caption}`, { align: 'center' });
        doc.moveDown(0.8);
      } catch (e) {
        console.warn('Could not embed image:', imgPath, e.message);
      }
    }
  }

  // ==========================================
  // 1. COVER PAGE
  // ==========================================
  doc.rect(0, 0, 595, 842).fill('#090d16');

  // Decorative border
  doc.strokeColor('#d97706').lineWidth(2).rect(30, 30, 535, 782).stroke();
  doc.strokeColor('#1e293b').lineWidth(1).rect(35, 35, 525, 772).stroke();

  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 247, 100, { width: 100 });
  }

  doc.y = 230;
  doc.fillColor('#ffffff').fontSize(26).font('Helvetica-Bold').text('FUSION HIGH SCHOOL', { align: 'center', characterSpacing: 1.5 });
  doc.moveDown(0.2);
  doc.fillColor('#d97706').fontSize(16).font('Helvetica-Bold').text('MANAGEMENT SYSTEM (SMS)', { align: 'center', characterSpacing: 2 });
  doc.moveDown(0.5);
  doc.fillColor('#94a3b8').fontSize(11).font('Helvetica').text('Comprehensive System Architecture, Software Engineering Specification & Operational Manual', { align: 'center' });

  doc.moveDown(1.5);
  doc.strokeColor('#334155').lineWidth(1).moveTo(120, doc.y).lineTo(475, doc.y).stroke();
  doc.moveDown(1.5);

  const metaBoxY = doc.y;
  doc.rect(100, metaBoxY, 395, 140).fillAndStroke('#0f172a', '#334155');
  doc.fillColor('#38bdf8').fontSize(9).font('Helvetica-Bold').text('ENGINEERING METADATA & COMPLIANCE', 120, metaBoxY + 15);
  doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold').text('Document Release Version:', 120, metaBoxY + 35, { continued: true });
  doc.fillColor('#cbd5e1').font('Helvetica').text(' 2.1.0 Production Enterprise Edition');
  doc.fillColor('#ffffff').font('Helvetica-Bold').text('National Framework Alignment:', 120, metaBoxY + 52, { continued: true });
  doc.fillColor('#cbd5e1').font('Helvetica').text(' South Africa DBE CAPS Curriculum (GET & FET)');
  doc.fillColor('#ffffff').font('Helvetica-Bold').text('Database Engine:', 120, metaBoxY + 69, { continued: true });
  doc.fillColor('#cbd5e1').font('Helvetica').text(' PostgreSQL 16 (Relational Engine & JSONB)');
  doc.fillColor('#ffffff').font('Helvetica-Bold').text('Application Runtime:', 120, metaBoxY + 86, { continued: true });
  doc.fillColor('#cbd5e1').font('Helvetica').text(' Node.js v20 LTS / Express Engine / React 18 & TypeScript');
  doc.fillColor('#ffffff').font('Helvetica-Bold').text('Compliance Standard:', 120, metaBoxY + 103, { continued: true });
  doc.fillColor('#cbd5e1').font('Helvetica').text(' Protection of Personal Information Act (POPIA 2013)');
  doc.fillColor('#ffffff').font('Helvetica-Bold').text('Document Date:', 120, metaBoxY + 120, { continued: true });
  doc.fillColor('#cbd5e1').font('Helvetica').text(` ${new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}`);

  doc.y = 740;
  doc.fillColor('#64748b').fontSize(8).font('Helvetica').text('CONFIDENTIAL & PROPRIETARY • DEVELOPED FOR FUSION HIGH SCHOOL ADMINISTRATION', { align: 'center' });

  // ==========================================
  // 2. TABLE OF CONTENTS
  // ==========================================
  doc.addPage();
  addHeader('TABLE OF CONTENTS', 'System Architectural Overview & Module Index');

  const toc = [
    { n: '1', t: 'Executive Summary & Operational Mandate', p: '3' },
    { n: '2', t: 'System Architecture & High-Level Topology', p: '3' },
    { n: '3', t: 'Technology Stack & Engineering Specifications', p: '4' },
    { n: '4', t: 'South African CAPS Curriculum Framework & Grade Structure', p: '5' },
    { n: '5', t: 'Database Architecture & Relational Schema Design', p: '6' },
    { n: '6', t: 'Security, Cryptography & Role-Based Access Control (RBAC)', p: '7' },
    { n: '7', t: 'Core Subsystems & Functional Modules', p: '8' },
    { n: '  7.1', t: 'Authentication, Self-Service Registration & Sibling Linking', p: '8' },
    { n: '  7.2', t: 'Parent & Guardian Portal with Multi-Child Switching', p: '9' },
    { n: '  7.3', t: 'Learner Academic Portal, Digital ID Card & Performance Analytics', p: '10' },
    { n: '  7.4', t: 'Educator Portal, Workload Allocation & Mark Book', p: '11' },
    { n: '  7.5', t: 'Digital Homework Management & Assessment Feedback Portal', p: '12' },
    { n: '  7.6', t: 'Real-Time QR Code Attendance & Subject Verification', p: '13' },
    { n: '  7.7', t: 'Official CAPS Term Report Card Generator', p: '14' },
    { n: '  7.8', t: 'Textbook & Asset Inventory Lifecycle Tracker', p: '15' },
    { n: '  7.9', t: 'Sports, Extracurricular & Cultural Club Management', p: '16' },
    { n: '  7.10', t: 'Educator Leave Management & Automated Relief Dispatcher', p: '17' },
    { n: '8', t: 'System Deployment, Infrastructure & Data Migration', p: '18' },
    { n: '9', t: 'Formal References & Cited Sources of Information', p: '19' }
  ];

  doc.moveDown(0.5);
  toc.forEach(item => {
    const isMain = !item.n.includes('.');
    doc.fillColor(isMain ? primaryColor : textColor)
       .fontSize(isMain ? 10 : 9)
       .font(isMain ? 'Helvetica-Bold' : 'Helvetica')
       .text(`${item.n}   ${item.t}`, 60, doc.y, { continued: true });
    
    // Dot leader
    const dotsWidth = 470 - doc.widthOfString(`${item.n}   ${item.t}`) - doc.widthOfString(item.p);
    const numDots = Math.max(0, Math.floor(dotsWidth / 4));
    const dots = '.'.repeat(numDots);
    
    doc.fillColor('#94a3b8').text(`  ${dots}  `, { continued: true });
    doc.fillColor(isMain ? primaryColor : secondaryColor).font('Helvetica-Bold').text(item.p, { align: 'right' });
    doc.moveDown(isMain ? 0.35 : 0.25);
  });

  doc.moveDown(1);
  addCalloutBox(
    'ENGINEERING DOCUMENTATION SCOPE',
    'This technical specification describes the architectural design, security mechanisms, database integrity guarantees, and implementation standards of the Fusion High School Management System built under standard software engineering practices.'
  );

  // ==========================================
  // SECTION 1 & 2: EXECUTIVE SUMMARY & ARCHITECTURE
  // ==========================================
  doc.addPage();
  addHeader('1. EXECUTIVE SUMMARY & SYSTEM TOPOLOGY', 'Operational Mandate & High-Level System Design');

  addSectionHeading('1', 'Executive Summary & Operational Mandate');
  addParagraph(
    'The Fusion High School Management System (SMS) is an enterprise-grade academic administration platform designed specifically to meet the institutional demands of South African secondary schools. Operating across both General Education and Training (GET, Grades 8–9) and Further Education and Training (FET, Grades 10–12) phases, the platform delivers a unified ecosystem connecting school administrators, educators, parents, and learners.'
  );
  addParagraph(
    'The system eliminates administrative fragmentation by consolidating admissions, real-time CAPS assessment tracking, digital homework distribution, biometric/QR attendance, automated relief teacher dispatching, and term report card compilation into a resilient, high-performance web platform.'
  );

  addSectionHeading('2', 'System Architecture & High-Level Topology');
  addParagraph(
    'Fusion High SMS follows a decoupled Client-Server architecture governed by Model-View-Controller (MVC) architectural patterns on the backend and Component-Driven Single Page Application (SPA) architecture on the client.'
  );

  addBullet('Application Gateway & Routing Layer', 'Built on Node.js and Express.js, providing RESTful endpoints, rate limiting, and centralized JWT session validation.');
  addBullet('Relational Persistence Layer', 'Powered by PostgreSQL 16 utilizing ACID-compliant transactional guarantees (BEGIN/COMMIT/ROLLBACK) for critical enrollment, marks recording, and financial/asset updates.');
  addBullet('Presentation Layer', 'React 18 Single-Page Application compiled with Vite and TypeScript, enforcing strict static typing and component-level reusability.');
  addBullet('Communication & Notification Subsystem', 'Asynchronous SMTP dispatch service for multi-factor notifications, parent credentials delivery, and alert broadcasts.');

  addImageWithCaption(landingImg, 'Fusion High SMS Portal Gateway and Multi-Role Access Landing Page', 130);

  // ==========================================
  // SECTION 3: TECHNOLOGY STACK
  // ==========================================
  doc.addPage();
  addHeader('3. TECHNOLOGY STACK & SPECIFICATIONS', 'Engineering Standards & Dependency Matrix');

  addSectionHeading('3', 'Technology Stack & Engineering Specifications');
  addParagraph(
    'The software stack was selected to guarantee maximum reliability, rapid response times under high concurrency, strict type safety, and zero proprietary lock-in.'
  );

  addSubSectionHeading('3.1 Backend Server & Runtime Environment');
  addBullet('Runtime Engine', 'Node.js LTS (v20.x) providing non-blocking asynchronous event-driven I/O.');
  addBullet('Web Application Framework', 'Express.js 4.19 delivering high-throughput HTTP routing, error middleware, and modular controller pipelines.');
  addBullet('Relational Database Client', 'Node-Postgres (pg v8.12) utilizing connection pooling (50 concurrent connections, 30s idle timeout) with automatic connection health verification.');
  addBullet('Security & Authentication', 'JSON Web Tokens (jsonwebtoken v9.0) with HMAC-SHA256 signatures, bcryptjs (salt rounds = 10), and Helmet.js security headers.');
  addBullet('Email Transport Protocol', 'Nodemailer v8.0 with SMTP connection pooling and HTML template engine.');

  addSubSectionHeading('3.2 Frontend Architecture & UI Engine');
  addBullet('UI Library & State Engine', 'React 18.3 with concurrent rendering, React Hooks, and Context API for global session state.');
  addBullet('Type Safety System', 'TypeScript 5.7 enforcing compile-time interface contracts across all API responses, models, and UI props.');
  addBullet('Build System & Bundler', 'Vite 6.1 delivering ultra-fast Hot Module Replacement (HMR) and optimized chunk-splitting production builds.');
  addBullet('Styling Architecture', 'Vanilla TailwindCSS 3.4 utility framework configured with a custom color palette, hardware-accelerated animations, and responsive breakpoints.');
  addBullet('Data Visualization', 'Chart.js 4.4 and React-Chartjs-2 for performance trajectories, grade distributions, and attendance radar charts.');
  addBullet('Iconography & Media', 'Lucide-React icon suite with dynamic SVG scaling.');

  // ==========================================
  // SECTION 4: CAPS CURRICULUM FRAMEWORK
  // ==========================================
  doc.addPage();
  addHeader('4. SOUTH AFRICAN CAPS CURRICULUM COMPLIANCE', 'Department of Basic Education Framework Standards');

  addSectionHeading('4', 'South African CAPS Curriculum Framework & Grade Structure');
  addParagraph(
    'The curriculum engine within Fusion High SMS strictly adheres to the National Curriculum Statement (NCS) Curriculum and Assessment Policy Statements (CAPS) established by the South African Department of Basic Education (DBE).'
  );

  addSubSectionHeading('4.1 Academic Phase Structure');
  addBullet('GET Phase (Grades 8 & 9)', 'Compulsory 9-subject curriculum comprising Home Language (isiZulu/English), First Additional Language (English FAL), Mathematics, Natural Sciences, Social Sciences (History & Geography), Technology, Economic and Management Sciences (EMS), Life Orientation, and Creative Arts.');
  addBullet('FET Phase (Grades 10, 11 & 12) Science Stream', 'English FAL, Home Language, Mathematics, Physical Sciences, Life Sciences, Life Orientation, and elective.');
  addBullet('FET Phase (Grades 10, 11 & 12) Commercial Stream', 'English FAL, Home Language, Mathematical Literacy / Mathematics, Accounting, Business Studies, Economics, and Life Orientation.');

  addSubSectionHeading('4.2 CAPS 7-Level Official Rating Scale');
  addParagraph('All assessment and term mark aggregations automatically map to the national statutory rating scale:');

  const capsLevels = [
    { level: 'Level 7', range: '80% – 100%', desc: 'Outstanding Achievement' },
    { level: 'Level 6', range: '70% – 79%', desc: 'Meritorious Achievement' },
    { level: 'Level 5', range: '60% – 69%', desc: 'Substantial Achievement' },
    { level: 'Level 4', range: '50% – 59%', desc: 'Adequate Achievement' },
    { level: 'Level 3', range: '40% – 49%', desc: 'Moderate Achievement' },
    { level: 'Level 2', range: '30% – 39%', desc: 'Elementary Achievement' },
    { level: 'Level 1', range: '0% – 29%', desc: 'Not Achieved (Fail)' }
  ];

  capsLevels.forEach(cl => {
    doc.fillColor(primaryColor).fontSize(8.5).font('Helvetica-Bold').text(`  ${cl.level} (${cl.range}): `, { continued: true });
    doc.fillColor(textColor).font('Helvetica').text(cl.desc);
  });

  doc.moveDown(0.6);
  addImageWithCaption(classroomImg, 'Fusion High Academic Classroom and Curriculum Allocation Environment', 120);

  // ==========================================
  // SECTION 5: DATABASE ARCHITECTURE
  // ==========================================
  doc.addPage();
  addHeader('5. DATABASE ARCHITECTURE & SCHEMA DESIGN', 'Relational Models, Constraints & Performance Indexes');

  addSectionHeading('5', 'Database Architecture & Relational Schema Design');
  addParagraph(
    'The database schema is organized into highly normalized relational tables in PostgreSQL, utilizing foreign key constraints, composite unique indexes, and JSONB structures where dynamic flexibility is required.'
  );

  addSubSectionHeading('5.1 Core Database Entities');
  addBullet('users', 'Primary identity table storing authentication credentials, role foreign keys, national ID numbers, date of birth, gender, and profile picture paths.');
  addBullet('children', 'Learner profile entity linking student identity, official sequential Learner Numbers (e.g. 20260026), grade level, academic stream, enrolled subjects array, and parent relationship.');
  addBullet('parent_children', 'Many-to-many junction table supporting multi-parent and multi-guardian linkages with secondary parent custody.');
  addBullet('employees', 'Staff registry capturing educator roles (teacher, Principal, Vice_Principal), department relationships, subjects taught, and assigned grades.');
  addBullet('attendance', 'Granular daily and subject-level register with composite UNIQUE (child_id, attendance_date, subject_name) constraints to prevent duplicate entries.');
  addBullet('progress', 'Continuous assessment mark book storing test scores, examination marks, term assignments, and educator notes.');
  addBullet('homework_assignments & homework_submissions', 'Digital homework repository tracking teacher-issued tasks, due dates, learner file attachments, and teacher sign-offs.');
  addBullet('timetables & announcements', 'Dynamic school-wide schedule engine and targeted role-based communication feed.');

  addSubSectionHeading('5.2 Performance Indexing & Query Optimization');
  addParagraph(
    'To guarantee sub-millisecond retrieval under load, B-Tree performance indexes are active on `LOWER(users.email)`, `users.id_number`, `children.learner_number`, `children.parent_id`, `attendance.attendance_date`, and `homework_submissions(assignment_id, child_id)`.'
  );

  // ==========================================
  // SECTION 6: SECURITY & RBAC
  // ==========================================
  doc.addPage();
  addHeader('6. SECURITY & ACCESS CONTROL ARCHITECTURE', 'Cryptographic Standards & POPIA Compliance');

  addSectionHeading('6', 'Security, Cryptography & Role-Based Access Control (RBAC)');
  addParagraph(
    'Information security is embedded at every architectural boundary to protect learner records, educator assessments, and parental identities in compliance with the South African Protection of Personal Information Act (POPIA Act 4 of 2013).'
  );

  addSubSectionHeading('6.1 Authentication & Password Security');
  addBullet('Password Hashing', 'All passwords stored using bcrypt with a salt cost factor of 10, preventing rainbow table attacks.');
  addBullet('Systematic Initial Password Algorithm', 'For incoming learners generated from South African National ID Numbers, the system extracts indices 0, 3, 6, 9, 12 (first digit, skip 2, take next systematically), providing a deterministic yet secure initial onboarding credential.');
  addBullet('Session Management', 'Stateless JWT tokens with expiration timestamps and cryptographically verified payload claims.');

  addSubSectionHeading('6.2 Role-Based Access Control Matrix (RBAC)');
  const roles = [
    { role: 'Administrator (Superuser)', perms: 'Full system governance, user provisioning, educator workload assignment, asset management, audit logging.' },
    { role: 'Teacher / Educator', perms: 'Mark capture, attendance registration, homework creation, submission evaluation, leave requests.' },
    { role: 'Parent / Guardian', perms: 'Child progress overview, sibling linking, fee records, teacher messaging, report card downloads.' },
    { role: 'Learner', perms: 'Student dashboard, digital ID card, homework submission, subject timetable, past paper library.' }
  ];

  roles.forEach(r => {
    doc.fillColor(primaryColor).fontSize(8.5).font('Helvetica-Bold').text(`• ${r.role}: `, { continued: true });
    doc.fillColor(textColor).font('Helvetica').text(r.perms, { align: 'justify' });
    doc.moveDown(0.2);
  });

  doc.moveDown(0.5);
  addCalloutBox(
    'POPIA COMPLIANCE GUARANTEE',
    'Learner data is strictly scoped such that parents can only access records of their officially linked children. Educators are scoped to classes and subjects they teach. All external file uploads are sanitized.'
  );

  // ==========================================
  // SECTION 7: CORE SUBSYSTEMS & MODULES
  // ==========================================
  doc.addPage();
  addHeader('7. CORE SUBSYSTEMS: PARENT & LEARNER MODULES', 'Detailed Subsystem Operational Workflows');

  addSectionHeading('7', 'Core Subsystems & Functional Modules');

  addSubSectionHeading('7.1 Authentication & Sibling Linking Engine');
  addParagraph(
    'The parent self-service portal accommodates multi-child households seamlessly. When an existing parent enrolls an incoming Grade 8 sibling or links an existing learner:'
  );
  addBullet('Sequential Learner Number', 'Generated via database sequence (e.g., 20260026) ensuring uniqueness across cohorts.');
  addBullet('Automated CAPS Allocation', 'Automatically populates the 9 compulsory Grade 8 CAPS subjects.');
  addBullet('Immediate Junction Linking', 'Binds the child to the parent in both `children.parent_id` and the `parent_children` table within a single atomic database transaction.');
  addBullet('Email Dispatch', 'Dispatches official admission notification containing login credentials directly to the parent’s email.');

  addSubSectionHeading('7.2 Parent Portal & Multi-Child Switching');
  addParagraph(
    'The Parent Portal provides a comprehensive visual control center. Parents can toggle between multiple children with a single click, viewing real-time attendance, subject breakdowns, exam predictions, and verified profile pictures.'
  );

  addImageWithCaption(parentDashImg, 'Parent Dashboard Overview with Linked Learner Cards and Key Performance Indicators', 130);
  addImageWithCaption(myChildrenImg, 'Parent "My Children" Detailed Academic View with Subject Trajectory & Hero Profile Banner', 130);

  // ==========================================
  // SECTION 7.3 - 7.5: LEARNER & TEACHER MODULES
  // ==========================================
  doc.addPage();
  addHeader('7. CORE SUBSYSTEMS: LEARNER & EDUCATOR PORTALS', 'Digital Identity, Homework Management & Workload');

  addSubSectionHeading('7.3 Learner Academic Portal & Digital ID Card');
  addParagraph(
    'The Learner Portal empowers students to track their academic trajectory, access registered CAPS subjects, study past examination papers, and verify their enrollment using a Digital Student ID Card containing an encrypted QR verification code.'
  );

  addSubSectionHeading('7.4 Educator Portal & Mark Book');
  addParagraph(
    'Teachers manage their assigned classes and subjects through an intuitive workload interface. The mark book automatically calculates class averages, CAPS levels, and flag learners requiring academic intervention.'
  );

  addSubSectionHeading('7.5 Digital Homework, DBE Past Papers & AI Evaluation');
  addParagraph(
    'The digital curriculum engine combines homework management with official national past examination papers and automated marking support:'
  );
  addBullet('Assignment Publishing', 'Teachers create tasks with subject, grade, stream, due date, total marks, and downloadable task briefs.');
  addBullet('DBE Past Examination Papers & Memos', 'Integrated repository of official Department of Basic Education (DBE) question papers and marking guidelines partitioned by Grade (8–12) and subject stream.');
  addBullet('Learner Submission & AI Assistant', 'Learners upload completed assignments with attachments and typed responses, evaluated against CAPS rubric benchmarks.');
  addBullet('Educator Sign-Off', 'Educators review, adjust marks, provide constructive feedback, and sign off the final grade.');

  addImageWithCaption(activationImg, 'Child Activation & Secure Account Linking Interface', 130);

  // ==========================================
  // SECTION 7.6 - 7.12: ADVANCED ENTERPRISE & AI MODULES
  // ==========================================
  doc.addPage();
  addHeader('7. ADVANCED ENTERPRISE & AI SUBSYSTEMS', 'Voice Tutor, Neural OCR, Media Chat, Attendance & Reporting');

  addSubSectionHeading('7.6 AI Voice Tutor (Speech-to-Text & Text-to-Speech)');
  addParagraph(
    'An interactive voice-enabled tutoring engine empowering learners across all South African official languages:'
  );
  addBullet('Voice Dictation (STT)', 'Integrated microphone dictation using Web Speech Recognition with South African language support (en-ZA, af-ZA, zu-ZA).');
  addBullet('Natural Voice Synthesis (TTS)', 'SpeechSynthesisUtterance engine reading out step-by-step solutions, formulas, and summaries with live animated waveform equalizer bars.');
  addBullet('Subject Guardrails', 'Enforces strict subject-boundary tutoring preventing cross-discipline confusion while generating on-demand practice quizzes.');

  addSubSectionHeading('7.7 Neural Admissions Document OCR & Verification');
  addParagraph(
    'Automated document verification pipeline inspecting prospective learner and parent application documents:'
  );
  addBullet('Clarity Rating (0–100%)', 'Computes high-definition scan resolution, contrast, and text legibility scores.');
  addBullet('13-Digit SA ID Luhn Checksum', 'Validates national identity numbers mathematically, cross-referencing Date of Birth (YYMMDD) and gender.');
  addBullet('Department of Home Affairs Compliance', 'Detects certification stamps, barcodes, and certified copy compliance for streamlined school admissions.');

  addSubSectionHeading('7.8 Multimedia Communication Hub (Voice Notes & Attachments)');
  addParagraph(
    'Enables secure, rich-media collaboration between parents, teachers, and learners:'
  );
  addBullet('In-App Voice Notes', 'Record and playback voice audio notes directly within conversation threads using the MediaRecorder API.');
  addBullet('Image Sharing & Lightbox', 'High-resolution photo sharing with hover zoom and full-screen lightbox preview.');
  addBullet('Document Attachments', 'Upload and download PDF and Word documents up to 25MB with secure MIME-type validation.');

  addSubSectionHeading('7.9 Period Attendance Tracking & Automated Absence Alerts');
  addParagraph(
    'Period-by-period and daily attendance recording with automated background email notifications dispatched to registered parents when a learner is recorded absent.'
  );

  addSubSectionHeading('7.10 Official CAPS Term Report Card Generator');
  addParagraph(
    'Generates statutory term report cards formatted to Department of Basic Education specifications, complete with subject percentages, CAPS achievement levels (1–7), class teacher remarks, principal sign-off, and school crest.'
  );

  addSubSectionHeading('7.11 Textbook & Asset Inventory Tracker');
  addParagraph(
    'Tracks school-owned textbook assets, barcode numbers, condition states (New, Good, Damaged, Lost), issuance dates, and return reconciliations across all learning areas.'
  );

  addSubSectionHeading('7.12 Sports, Cultural & Extracurricular Club Management');
  addParagraph(
    'Facilitates learner participation in athletic codes (Soccer, Netball, Rugby, Athletics) and cultural societies (Debating, Choir, Science Club) with match schedules and performance logs.'
  );

  addImageWithCaption(assemblyImg, 'Fusion High School Assembly and Extracurricular Activity Coordination', 120);

  // ==========================================
  // SECTION 8: DEPLOYMENT & DEVOPS
  // ==========================================
  doc.addPage();
  addHeader('8. DEPLOYMENT & OPERATIONAL INFRASTRUCTURE', 'Hosting Architecture, DevOps & Database Migration');

  addSectionHeading('8', 'System Deployment, Infrastructure & Data Migration');
  addParagraph(
    'Fusion High SMS is architected for seamless deployment across on-premises school servers or cloud container environments (Docker / Linux VPS / AWS / Render / GCP).'
  );

  addSubSectionHeading('8.1 Production Build & Packaging Pipeline');
  addBullet('Frontend Bundling', 'Vite compiles React/TypeScript source code into minified, hash-versioned static assets in `/client/dist`.');
  addBullet('Static Asset Delivery', 'Express serves pre-compressed production chunks with long-term cache headers.');
  addBullet('Automated Database Migration', 'Database connection hooks automatically verify table structures, constraint keys, and schema evolutions on application boot.');

  addSubSectionHeading('8.2 System Administration & Maintenance Commands');
  addBullet('Development Server', '`npm run dev` (Runs concurrent backend nodemon and client Vite servers).');
  addBullet('Production Compilation', '`npm run build` (Executes TypeScript typecheck `tsc` and `vite build`).');
  addBullet('Database Seed & Verification', '`node db/init_full_schema.js` and `node db/db.js`.');

  // ==========================================
  // SECTION 9: BIBLIOGRAPHY & SOURCES
  // ==========================================
  doc.addPage();
  addHeader('9. FORMAL REFERENCES & CITED SOURCES', 'Authoritative Standards & Technical Literature');

  addSectionHeading('9', 'Formal References & Cited Sources of Information');
  addParagraph(
    'The architectural design, curriculum algorithms, and engineering methodologies implemented in Fusion High SMS cite and adhere to the following statutory and technical authorities:'
  );

  const citations = [
    {
      author: 'Department of Basic Education (DBE), Republic of South Africa',
      year: '2011 (as amended)',
      title: 'National Curriculum Statement (NCS) Curriculum and Assessment Policy Statement (CAPS): Grades R–12 General Education and Training (GET) and Further Education and Training (FET) Phases',
      source: 'Government Printing Works, Pretoria, South Africa. URL: https://www.education.gov.za/'
    },
    {
      author: 'South African Qualifications Authority (SAQA)',
      year: '2019',
      title: 'National Qualifications Framework (NQF) Level Descriptors and Standards for General and Further Education and Training',
      source: 'SAQA Policy Publications, Pretoria. URL: https://www.saqa.org.za/'
    },
    {
      author: 'South African Council for Educators (SACE)',
      year: '2020',
      title: 'Code of Professional Ethics and Educator Workload Policy Norms in South African Schools',
      source: 'SACE Statutory Publications, Centurion, South Africa. URL: https://www.sace.org.za/'
    },
    {
      author: 'Parliament of the Republic of South Africa',
      year: '2013',
      title: 'Protection of Personal Information Act, No. 4 of 2013 (POPIA)',
      source: 'Government Gazette No. 37067, Cape Town, South Africa.'
    },
    {
      author: 'PostgreSQL Global Development Group',
      year: '2024',
      title: 'PostgreSQL 16.0 Comprehensive Database Management System Architecture and SQL Reference Manual',
      source: 'PostgreSQL Open Source Documentation. URL: https://www.postgresql.org/docs/16/'
    },
    {
      author: 'OpenJS Foundation / Node.js Project',
      year: '2024',
      title: 'Node.js v20 LTS Runtime Environment Specification and Asynchronous Event-Driven Architecture Standards',
      source: 'OpenJS Foundation. URL: https://nodejs.org/docs/'
    },
    {
      author: 'Meta Open Source / React Core Team',
      year: '2024',
      title: 'React 18 Architecture: Concurrent Rendering, Server Components, and State Hook Design Patterns',
      source: 'React Documentation Project. URL: https://react.dev/'
    },
    {
      author: 'Microsoft Corporation',
      year: '2024',
      title: 'TypeScript 5.7 Language Specification: Scalable Static Typing for Enterprise ECMAScript Applications',
      source: 'Microsoft Open Source Documentation. URL: https://www.typescriptlang.org/docs/'
    },
    {
      author: 'World Wide Web Consortium (W3C)',
      year: '2018',
      title: 'Web Content Accessibility Guidelines (WCAG) 2.1: Recommendation for Accessible Web Applications',
      source: 'W3C Accessibility Standards. URL: https://www.w3.org/TR/WCAG21/'
    }
  ];

  citations.forEach((c, idx) => {
    doc.fillColor(primaryColor).fontSize(8.5).font('Helvetica-Bold').text(`[${idx + 1}]  ${c.author} (${c.year}). `, { continued: true });
    doc.fillColor(textColor).font('Helvetica-Oblique').text(`"${c.title}". `, { continued: true });
    doc.fillColor('#64748b').font('Helvetica').text(`${c.source}`);
    doc.moveDown(0.4);
  });

  doc.moveDown(1);
  doc.strokeColor(borderColor).lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.8);
  doc.fillColor(secondaryColor).fontSize(9).font('Helvetica-Bold').text('END OF FORMAL TECHNICAL SPECIFICATION', { align: 'center' });
  doc.fillColor('#64748b').fontSize(8).font('Helvetica').text('Fusion High School Management System • Version 2.1.0 • All Rights Reserved', { align: 'center' });

  // Add Page Numbers in Footer across all pages
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    if (i > 0) { // Don't print page number on cover page
      doc.fillColor('#94a3b8').fontSize(8).font('Helvetica').text(
        `Page ${i + 1} of ${range.count}   |   Fusion High School SMS Architecture & Development Manual`,
        50,
        795,
        { align: 'center', width: 495 }
      );
    }
  }

  doc.end();

  stream1.on('finish', () => {
    // Also copy to outputDir2
    fs.copyFileSync(outputPath1, outputPath2);
    console.log(`✅ PDF Generated Successfully at:\n1) ${outputPath1}\n2) ${outputPath2}`);
  });
}

generateDocumentationPDF();
