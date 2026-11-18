/**
 * Geleza SA — Full Project Documentation PDF Generator
 * Document: GSA-DOC-PROJECT-001
 * Run: node docs/geleza-sa-project-guide/generate-geleza-sa-pdf.js
 */
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const catalog = require('./module-catalog');

const ROOT = __dirname;
const SHOTS = path.join(ROOT, 'screenshots');
const OUT = path.join(ROOT, 'Geleza_SA_Full_Project_Documentation.pdf');

const NAVY = '#0B1F33';
const CYAN = '#13C8D9';
const GOLD = '#C9A227';
const SLATE = '#334155';
const MUTED = '#64748b';
const LIGHT = '#f8fafc';
const WHITE = '#ffffff';

const fig = (n) => `Figure ${n}`;
let figureNo = 0;
const nextFig = () => {
  figureNo += 1;
  return fig(figureNo);
};

function ensureShot(name) {
  const p = path.join(SHOTS, name);
  return fs.existsSync(p) ? p : null;
}

function createDoc() {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 56, bottom: 64, left: 54, right: 54 },
    bufferPages: true,
    info: {
      Title: 'Geleza SA — Full Project Documentation',
      Author: 'Geleza SA',
      Subject: 'Introduction, problem, solution, objectives, mission, and role walkthroughs',
      Keywords: 'Geleza SA, CAPS, school management, learner, parent, teacher, principal',
      CreationDate: new Date()
    }
  });
  doc.pipe(fs.createWriteStream(OUT));
  return doc;
}

function footer(doc) {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    const y = doc.page.height - 40;
    doc.save();
    doc.fontSize(8).fillColor(MUTED);
    doc.text('GSA-DOC-PROJECT-001 · v2.1 · Institutional documentation', 54, y, {
      width: doc.page.width - 160,
      align: 'left',
      lineBreak: false
    });
    doc.text(`Page ${i + 1} of ${range.count}`, 54, y, {
      width: doc.page.width - 108,
      align: 'right',
      lineBreak: false
    });
    doc.restore();
  }
}

function h1(doc, text) {
  doc.moveDown(0.4);
  doc.font('Helvetica-Bold').fontSize(18).fillColor(NAVY).text(text, { paragraphGap: 8 });
  doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .strokeColor(CYAN).lineWidth(2).stroke();
  doc.moveDown(0.6);
}

function h2(doc, text) {
  doc.moveDown(0.35);
  if (doc.y > doc.page.height - 120) doc.addPage();
  doc.font('Helvetica-Bold').fontSize(13).fillColor(NAVY).text(text, { paragraphGap: 6 });
}

function h3(doc, text) {
  doc.moveDown(0.25);
  if (doc.y > doc.page.height - 100) doc.addPage();
  doc.font('Helvetica-Bold').fontSize(11).fillColor(SLATE).text(text, { paragraphGap: 4 });
}

function body(doc, text) {
  doc.font('Helvetica').fontSize(10).fillColor(SLATE).text(text, { align: 'justify', paragraphGap: 8, lineGap: 2 });
}

function bullet(doc, items) {
  doc.font('Helvetica').fontSize(10).fillColor(SLATE);
  items.forEach((item) => {
    if (doc.y > doc.page.height - 80) doc.addPage();
    doc.text(`•  ${item}`, { indent: 8, paragraphGap: 3, lineGap: 1 });
  });
  doc.moveDown(0.3);
}

function caption(doc, label, text) {
  doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(MUTED).text(`${label}. ${text}`, {
    align: 'center',
    paragraphGap: 10
  });
}

function addImage(doc, fileName, captionText, opts = {}) {
  const p = ensureShot(fileName);
  const label = nextFig();
  if (!p) {
    doc.font('Helvetica-Oblique').fontSize(9).fillColor(MUTED)
      .text(`[${label} — screenshot unavailable: ${fileName}]`, { align: 'center', paragraphGap: 8 });
    return label;
  }
  if (doc.y > doc.page.height - 280) doc.addPage();
  const maxW = opts.maxW || (doc.page.width - doc.page.margins.left - doc.page.margins.right);
  const maxH = opts.maxH || 320;
  try {
    doc.image(p, { fit: [maxW, maxH], align: 'center' });
    doc.moveDown(0.35);
    caption(doc, label, captionText);
  } catch (e) {
    doc.font('Helvetica').fontSize(9).fillColor('red').text(`Could not embed ${fileName}: ${e.message}`);
  }
  return label;
}

function moduleTable(doc, title, modules) {
  h3(doc, title);
  modules.forEach((m) => {
    if (doc.y > doc.page.height - 70) doc.addPage();
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(NAVY).text(m.title, { continued: false });
    doc.font('Helvetica').fontSize(9).fillColor(SLATE).text(m.desc, { paragraphGap: 5 });
  });
}

function roleBanner(doc, role, colour) {
  if (doc.y > doc.page.height - 160) doc.addPage();
  const x = doc.page.margins.left;
  const w = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const y = doc.y;
  doc.save();
  doc.roundedRect(x, y, w, 36, 6).fill(colour || NAVY);
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(14)
    .text(role, x + 14, y + 11, { width: w - 28, align: 'left' });
  doc.restore();
  doc.y = y + 48;
}

function journeyBox(doc, steps) {
  steps.forEach((step, idx) => {
    if (doc.y > doc.page.height - 90) doc.addPage();
    const x = doc.page.margins.left;
    const w = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const y = doc.y;
    doc.save();
    doc.roundedRect(x, y, w, 52, 5).fill('#eef8fa').strokeColor(CYAN).lineWidth(0.8).stroke();
    doc.circle(x + 18, y + 26, 11).fill(CYAN);
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(9)
      .text(String(idx + 1), x + 14, y + 21, { width: 10, align: 'center' });
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(10)
      .text(step.title, x + 40, y + 10, { width: w - 54 });
    doc.fillColor(SLATE).font('Helvetica').fontSize(8.5)
      .text(step.detail, x + 40, y + 26, { width: w - 54 });
    doc.restore();
    doc.y = y + 60;
  });
  doc.moveDown(0.3);
}

function cover(doc) {
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(NAVY);
  doc.fillColor(CYAN).font('Helvetica-Bold').fontSize(11)
    .text('GSA-DOC-PROJECT-001', 54, 72, { align: 'left' });
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(28)
    .text('Geleza SA', 54, 160, { width: doc.page.width - 108 });
  doc.fillColor(GOLD).font('Helvetica').fontSize(12)
    .text('GELEZA SMART, THE FUTURE IS THINE', 54, 200);
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(16)
    .text('Full Project Documentation', 54, 250);
  doc.fillColor('#cbd5e1').font('Helvetica').fontSize(11)
    .text(
      'Introduction · Problem Statement · Solution · Objectives · Mission ·\n' +
      'Public journey · Learner · Parent · Teacher · Principal / School Admin ·\n' +
      'Support Desk · Platform capabilities · Screenshots throughout',
      54,
      290,
      { width: doc.page.width - 108, lineGap: 4 }
    );
  doc.fillColor(MUTED).font('Helvetica').fontSize(10)
    .text('Platform version 2.1  ·  Document date: 3 October 2026', 54, 700);
  doc.fillColor(MUTED).font('Helvetica').fontSize(9)
    .text('Live hosting: https://fusion-high-app.web.app', 54, 720);
  doc.addPage();
}

function toc(doc) {
  h1(doc, 'Table of contents');
  const items = [
    '1. Introduction',
    '2. Problem statement',
    '3. The solution — Geleza SA',
    '4. Objectives',
    '5. Mission statement',
    '6. Public user journey (screenshots)',
    '7. Cross-cutting platform experience',
    '8. Learner walkthrough (home + every module)',
    '9. Parent walkthrough (home + every module)',
    '10. Teacher walkthrough (home + every module)',
    '11. Principal / School Admin walkthrough (home + every module)',
    '12. Geleza SA (platform) administration',
    '13. Support Desk & application corrections',
    '14. Security, sessions & compliance',
    '15. Technology overview',
    '16. Conclusion'
  ];
  doc.font('Helvetica').fontSize(11).fillColor(SLATE);
  items.forEach((t) => doc.text(t, { paragraphGap: 6 }));
  doc.moveDown(0.5);
  body(
    doc,
    'Every chapter below discusses how Geleza SA works for real school stakeholders. Role chapters dedicate a page to each module so the document remains useful as a product tour, training pack, and institutional reference — not a sparse screenshot album.'
  );
  doc.addPage();
}

/** One full page per module: problem → what Geleza SA does → how to open → screenshot */
function modulePage(doc, roleLabel, mod, index, total) {
  doc.addPage();
  const x = doc.page.margins.left;
  const w = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc.save();
  doc.roundedRect(x, doc.y, w, 28, 5).fill('#eef2ff');
  doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(9)
    .text(`${roleLabel} module ${index} of ${total}`, x + 12, doc.y + 9, { width: w - 24, lineBreak: false });
  doc.restore();
  doc.y += 38;

  doc.font('Helvetica-Bold').fontSize(15).fillColor(NAVY).text(mod.title, { paragraphGap: 8 });
  doc.moveTo(x, doc.y).lineTo(x + w, doc.y).strokeColor(CYAN).lineWidth(1.5).stroke();
  doc.moveDown(0.55);

  doc.font('Helvetica-Bold').fontSize(10).fillColor(GOLD).text('Why this matters in South African schools', { paragraphGap: 4 });
  body(doc, mod.why);

  doc.font('Helvetica-Bold').fontSize(10).fillColor(NAVY).text('What Geleza SA provides', { paragraphGap: 4 });
  body(doc, mod.talk);

  doc.font('Helvetica-Bold').fontSize(10).fillColor(NAVY).text('How users open this module', { paragraphGap: 4 });
  body(doc, mod.how);

  addImage(doc, mod.file, `${roleLabel}: ${mod.title} — live Geleza SA screen.`, { maxH: 300 });
}

function writeRoleChapter(doc, sectionNo, key, journeySteps, extraBullets) {
  const pack = catalog[key];
  h1(doc, `${sectionNo}. ${pack.role} walkthrough`);
  roleBanner(doc, `Role: ${pack.role}  ·  Route: ${pack.route}`, pack.colour);
  body(doc, pack.intro);
  body(doc, `Live screenshots in this chapter were captured with tester ${pack.tester}. Password used for the documentation suite: password123.`);

  h2(doc, `${sectionNo}.1 Journey map`);
  journeyBox(doc, journeySteps);

  h2(doc, `${sectionNo}.2 Home & More hub`);
  body(
    doc,
    `Every ${pack.role.toLowerCase()} session begins on Home and discovers the full module set through the More hub. The following screens establish that orientation before the module-by-module pages.`
  );
  addImage(doc, pack.homeShot.file, pack.homeShot.caption);
  addImage(doc, pack.moreShot.file, pack.moreShot.caption);

  if (extraBullets && extraBullets.length) {
    h2(doc, `${sectionNo}.3 Role principles`);
    bullet(doc, extraBullets);
  }

  h2(doc, `${sectionNo}.${extraBullets?.length ? '4' : '3'} Module-by-module guide`);
  body(
    doc,
    `The next ${pack.modules.length} pages each cover one ${pack.role.toLowerCase()} module in Geleza SA: the school problem it addresses, what the app does, how to open it, and a live screenshot.`
  );

  pack.modules.forEach((mod, i) => {
    modulePage(doc, pack.role, mod, i + 1, pack.modules.length);
  });
}

function sectionIntro(doc) {
  h1(doc, '1. Introduction');
  body(
    doc,
    'Geleza SA (Geleza South Africa) is a digital school management and learning platform built for South African secondary schools that deliver the Curriculum and Assessment Policy Statement (CAPS) under the Department of Basic Education. The product name and brand presented to users is Geleza SA, with the motto “Geleza Smart, The Future Is Thine.”'
  );
  body(
    doc,
    'The platform unifies administration, teaching, learning, and parental oversight in one secure web application. Registered schools can manage admissions, attendance, assessments, CAPS report cards, communications, fees (where enabled), sports and extracurriculars, inter-school competitions, and AI-assisted study tools for Grades 8–12.'
  );
  body(
    doc,
    'This document describes why Geleza SA exists, what problems it solves, the mission and objectives of the project, and a complete walkthrough of the experience for every primary role: Learner, Parent, Teacher, and Principal / School Administrator. Screenshots from the live application illustrate each major public surface and the support pathways available to all users.'
  );
  addImage(
    doc,
    '01-landing.png',
    'Geleza SA landing page — brand-first hero with campus atmosphere, live time/weather context, and Get Started entry.'
  );
}

function sectionProblem(doc) {
  h1(doc, '2. Problem statement');
  body(
    doc,
    'South African high schools often run academic and administrative processes across disconnected tools: paper registers, spreadsheets, WhatsApp groups, separate fee systems, and ad-hoc email. This fragmentation creates friction for every stakeholder.'
  );
  h2(doc, '2.1 Pain points by stakeholder');
  bullet(doc, [
    'Learners struggle to find timetable, homework, verified marks, seating plans, and study support in one place; fake “placeholder” marks erode trust.',
    'Parents cannot reliably link to enrolled children, view CAPS report cards, track attendance, book consultations, or resolve application mistakes (wrong email/phone/ID) without long office queues.',
    'Teachers spend disproportionate time on marksheets, attendance, leave relief, textbook tracking, and parent messaging without a unified classroom cockpit.',
    'Principals / school admins lack a single command surface for users, admissions, parent portal applications, fees, timetable publishing, report-card studio, and multi-school oversight.',
    'When users enter wrong details on applications, there is often no structured way to request corrections — blocking login and creating abandoned journeys.'
  ]);
  h2(doc, '2.2 Systemic risks');
  bullet(doc, [
    'Data inconsistency between admissions, learner numbers, and parent accounts.',
    'Weak audit trail for who changed what on critical records.',
    'Session confusion when the same account is used on multiple devices.',
    'Poor mobile-friendly access for guardians who only engage via phone.',
    'Limited CAPS-aligned reporting and SBA moderation visibility for leadership.'
  ]);
}

function sectionSolution(doc) {
  h1(doc, '3. The solution — Geleza SA');
  body(
    doc,
    'Geleza SA provides a role-based portal for each stakeholder, backed by a Node.js API, PostgreSQL data store, email OTP recovery, optional WebAuthn fingerprint sign-in, and Firebase Hosting for the client. Schools register on the platform; Geleza SA executives can approve schools and appoint school administrators. Once a school is live, principals and admins enrol staff and learners, review parent applications, publish timetables and report cards, and operate a Support Desk for user corrections.'
  );
  h2(doc, '3.1 Solution pillars');
  bullet(doc, [
    'One brand, one campus-styled experience across landing, login, registration, and recovery.',
    'Strict role-based access: learner, parent, teacher, admin (principal / school admin), with Geleza SA superadmin for multi-school control.',
    'CAPS-aligned academics: SBA marksheets, moderation, report card studio, matric analytics.',
    'Family linkage: parent portal applications, child verification, sibling linking.',
    'Human support: Contact Admin tickets plus admin correction of mistaken application fields.',
    'Always-available help: searchable FAQs, Geleza SA AI assistant, and side-edge chatbot FAB on authenticated pages.'
  ]);
  addImage(
    doc,
    '07-get-started.png',
    'Get Started orbit — Apply, Register School, and Registration paths from the public home page.'
  );
  addImage(
    doc,
    '04-about.png',
    'Official About Geleza SA documentation (GSA-DOC-ABOUT-001) describing organisation, purpose, CAPS alignment, and capabilities.'
  );
}

function sectionObjectives(doc) {
  h1(doc, '4. Objectives');
  bullet(doc, [
    'Digitise core school operations for Grades 8–12 in a CAPS-aligned manner.',
    'Give each role a clear home dashboard and a discoverable module directory (More hub).',
    'Ensure academic data shown to learners and parents is verified — no dummy marks.',
    'Enable principals to govern users, admissions, parent applications, fees, and communications.',
    'Enable teachers to teach, assess, mark attendance, manage conduct, and communicate efficiently.',
    'Enable parents to oversee linked learners’ academics, attendance, fees, and consultations.',
    'Enable learners to study, track progress, access AI tutoring, and manage campus life tools.',
    'Provide a support pathway so application and personal-data mistakes can be corrected without restarting from zero.',
    'Uphold POPIA-aware handling of personal information and secure session management.',
    'Ship a mobile-responsive web experience hosted for production use (Firebase) with API services for data and mail.'
  ]);
}

function sectionMission(doc) {
  h1(doc, '5. Mission statement');
  doc.moveDown(0.2);
  doc.font('Helvetica-Oblique').fontSize(12).fillColor(NAVY).text(
    '“Geleza Smart, The Future Is Thine.”',
    { align: 'center', paragraphGap: 12 }
  );
  body(
    doc,
    'Geleza SA exists to empower South African schools, educators, learners, and families with accurate, accessible, and dignified digital tools for secondary education. We believe every learner deserves clarity about their academic journey; every teacher deserves tools that respect their time; every parent deserves transparent oversight; and every principal deserves operational command without chaos.'
  );
  body(
    doc,
    'Our mission is to make school administration and learning support feel like one coherent campus — beautiful enough to invite daily use, rigorous enough for CAPS compliance, and human enough that when mistakes happen, help is one Contact Admin request away.'
  );
}

function sectionPublicJourney(doc) {
  h1(doc, '6. Public user journey (with screenshots)');
  body(
    doc,
    'Before any role-specific dashboard, every visitor meets the same public surfaces. These screens establish brand trust and route people into the correct onboarding path.'
  );

  h2(doc, '6.1 Landing & Get Started');
  body(
    doc,
    'The landing page is a full-bleed campus hero. Brand is the primary signal. Visitors see live local time/period and Johannesburg weather context, then open Get Started to choose Apply (admissions), Register School (principals), or Registration (parent/teacher style portals). Returning users choose Login.'
  );
  addImage(doc, '01-landing.png', 'Landing — first viewport composition for Geleza SA.');
  addImage(doc, '07-get-started.png', 'Get Started orbit expanded with Apply, Register School, and Registration.');

  h2(doc, '6.2 Sign in');
  body(
    doc,
    'Login accepts email or learner ID plus password. Features include Remember Me, Forgot Password, and optional fingerprint (WebAuthn) sign-in. Signing in on a new device replaces the previous active session so only one live session remains.'
  );
  addImage(doc, '02-login.png', 'Campus-styled Sign In portal with password and fingerprint options.');

  h2(doc, '6.3 Registration (Parent portal example)');
  body(
    doc,
    'Registration is role-aware. The Parent Registration portal captures SA ID, names (letters only), email, phone (digits), and school selection. Step 2 links enrolled learners. Principals are directed to Register & Onboard Your School. Validation rules prevent garbage data at source.'
  );
  addImage(doc, '03-register.png', 'Parent Registration — Step 1 Parent Details with school selection and field rules.');

  h2(doc, '6.4 Account recovery');
  body(
    doc,
    'Forgot Password uses a three-step OTP flow: Choose identifier (email, learner number, or ID) → Verify 5-minute recovery code → Set new password. This replaces fragile channel-hopping recovery patterns.'
  );
  addImage(doc, '06-forgot-password.png', 'Account Recovery — step 1 of email/OTP password reset.');

  h2(doc, '6.5 Policies & FAQs');
  body(
    doc,
    'About Us and Terms are published as professional Geleza SA documents. Help & Support provides searchable FAQs (GSA-DOC-FAQ-001), 24/7 AI help, and Contact Admin for human escalation.'
  );
  addImage(doc, '05-terms.png', 'Terms and Conditions & Acceptable Use Policy (GSA-DOC-TERMS-001).');
  addImage(doc, '08-faqs.png', 'Support Documentation — FAQ categories for platform, learners, parents, and access.');
  addImage(doc, '09-contact-admin.png', 'Contact Admin form — structured tickets for wrong email, phone, ID, and related issues.');
}

function sectionCrossCutting(doc) {
  h1(doc, '7. Cross-cutting platform experience');
  h2(doc, '7.1 Navigation pattern');
  bullet(doc, [
    'Primary tabs: Home / Overview, Calendar, Discover (where applicable), Messages, Profile, More.',
    'More hub: searchable module directory with favourites and categories.',
    'Inside a module: page header with Back; bottom Menu dock is hidden so modules feel focused.',
    'Theme: light / dark (and navy-aware components) saved per device.'
  ]);
  h2(doc, '7.2 Geleza SA AI');
  bullet(doc, [
    'Floating side-edge arrow FAB on authenticated pages (hidden on landing, login, register, forgot-password).',
    'Phone-style AI chat panel with cyan (#13C8D9) and navy (#0B1F33) brand system.',
    'Learner AI Tutor / exam studios; teacher AI lesson & test paper studio; early-warning radar for educators.'
  ]);
  h2(doc, '7.3 Idle & session safety');
  bullet(doc, [
    'After idle time, Stay / Log out prompt appears (configured around five minutes of inactivity).',
    'New sign-in takes over the previous device session (session_replaced) instead of a hard concurrent-login block.'
  ]);
  h2(doc, '7.4 Help everywhere');
  bullet(doc, [
    'FAQs cover platform overview, learners, parents, access, and corrections.',
    'Contact Admin creates a support ticket emailed to school admins and acknowledged to the requester.',
    'School Support Desk lets principal/admin correct parent application fields and resolve tickets.'
  ]);
}

function sectionLearner(doc) {
  writeRoleChapter(
    doc,
    '8',
    'learner',
    [
      { title: 'Sign in', detail: 'Use learner number/email + password, or fingerprint if enrolled.' },
      { title: 'Home overview', detail: 'See timetable highlights, notices, and shortcuts into subjects and performance.' },
      { title: 'Subjects workspace', detail: 'Open each enrolled subject for resources, past papers, and study tools.' },
      { title: 'Performance & reports', detail: 'View verified marks and CAPS term report cards when published.' },
      { title: 'Study with AI', detail: 'Use CAPS AI Tutor / Exam Studios; treat AI as revision support, not a substitute for honest assessment.' },
      { title: 'Campus life', detail: 'Sports clubs, inter-school events, exam seating slips, textbooks, bursaries, fee statements.' },
      { title: 'Profile & settings', detail: 'Digital student ID, theme, security, and Help / Contact Admin if something is wrong.' }
    ],
    [
      'No dummy marks — Geleza SA only shows verified school data.',
      'Back navigation inside modules; Menu dock hidden while working.',
      'AI is supportive study help; academic integrity remains school policy.',
      'Help → Contact Admin when profile or access data is wrong.'
    ]
  );
}

function sectionParent(doc) {
  writeRoleChapter(
    doc,
    '9',
    'parent',
    [
      { title: 'Discover & register / apply', detail: 'From Get Started → Registration or Parent Portal Application with school + learner claims.' },
      { title: 'Admin review', detail: 'Principal/admin verifies enrolment match and accepts or rejects the application.' },
      { title: 'Welcome & sign in', detail: 'Approved parents receive email credentials and sign into /dashboard/parent.' },
      { title: 'My Children', detail: 'View linked learners marks, timetable, attendance, and report cards.' },
      { title: 'Fees & bursaries', detail: 'Open statements/receipts and explore NSFAS/bursary information.' },
      { title: 'Engage the school', detail: 'Book parent–teacher consultations, read announcements, message teachers.' },
      { title: 'Fix mistakes', detail: 'Contact Admin with PAR- reference; admin corrects fields in Support Desk / Parent Applications.' }
    ],
    [
      'Parent visibility follows school publication — same verified-data principle as learners.',
      'Application mistakes (wrong email/phone/ID) are recoverable via Contact Admin + Support Desk.',
      'Registration and Parent Portal Application remain the public onboarding paths into this role.'
    ]
  );
  doc.addPage();
  h2(doc, '9.5 Public parent onboarding & support (reference)');
  body(
    doc,
    'Before the parent dashboard exists, Geleza SA still talks about the family journey on public surfaces. Registration captures guardian details with field validation; Contact Admin is the escape hatch when those details are wrong.'
  );
  addImage(doc, '03-register.png', 'Parent Registration portal — public onboarding before child linkage.');
  addImage(doc, '09-contact-admin.png', 'Parents escalate application mistakes via Contact Admin (e.g. wrong email on a PAR- application).');
}

function sectionTeacher(doc) {
  writeRoleChapter(
    doc,
    '10',
    'teacher',
    [
      { title: 'Receive access', detail: 'Staff invite approval or admin-created employee account with subjects/grades.' },
      { title: 'Sign in', detail: 'Email + password (or fingerprint) into /dashboard/teacher.' },
      { title: 'Daily classroom ops', detail: 'Mark attendance, review messages, check timetable and calendar.' },
      { title: 'Assess & capture SBA', detail: 'Use marksheets/grading modules; submit for admin moderation where required.' },
      { title: 'Assign & feedback', detail: 'Homework hub for digital assignments.' },
      { title: 'Support learners', detail: 'Early-warning radar, conduct merits/discipline, textbook issuance.' },
      { title: 'Collaborate', detail: 'Parent–teacher consultations, sports duties, leave & relief requests.' }
    ],
    [
      'Teacher tools are scoped to assigned classes and subjects.',
      'SBA capture feeds the same marks families eventually see — accuracy first.',
      'AI lesson/test tools draft; educators remain accountable for final assessment quality.'
    ]
  );
}

function sectionPrincipal(doc) {
  writeRoleChapter(
    doc,
    '11',
    'principal',
    [
      { title: 'Register School', detail: 'From Get Started → Register School; submit institutional application.' },
      { title: 'Geleza SA approval', detail: 'Platform executives approve the school and enable modules.' },
      { title: 'Appoint admins & staff', detail: 'Create school sub-admins, invite teachers/coaches, configure classes & subjects.' },
      { title: 'Enrol learners & review parents', detail: 'Admissions + Parent Applications (Accept & Link / Reject / Correct).' },
      { title: 'Operate academics', detail: 'Mark audits, report card studio, matric projector, timetable publish.' },
      { title: 'Operate school life', detail: 'Fees, sports, exam seating, textbooks, consultations, announcements.' },
      { title: 'Support users', detail: 'Support Desk tickets — correct mistaken emails/phones/IDs and resolve cases.' }
    ],
    [
      'Admin is the school command surface for people, academics, fees, and communications.',
      'Parent Applications + Support Desk deliberately grant correction privilege for mistaken contact/ID fields.',
      'Publishing report cards and timetables is what unlocks family-facing views.'
    ]
  );
  doc.addPage();
  h2(doc, '11.5 Parent Applications & corrections (detail)');
  body(
    doc,
    'Under Users → Parent Applications, admins see applicant contact details, claimed learners, database match hints, and status. Actions include Correct (edit email/phone/ID/names/learner fields), Accept & Link (activate parent account + link children + email welcome), or Reject with reason emailed to the parent. Approved applications can still have contact fields corrected and synced to the parent user record. This is how Geleza SA keeps the admissions and parent-portal journeys recoverable.'
  );
  addImage(doc, '07-get-started.png', 'Principals begin public onboarding via Register School on the Get Started orbit.');
  addImage(doc, '09-contact-admin.png', 'End users reach principals through Contact Admin; admins action those tickets in Support Desk.');
}

function sectionPlatformAdmin(doc) {
  h1(doc, '12. Geleza SA (platform) administration');
  body(
    doc,
    'Geleza SA superadmins (is_superadmin) operate above a single school. They approve school registrations, appoint school sub-admins across schools, use Multi-School Command Center analytics, and can assist any school’s users via Support Desk and application corrections. Portal locks (system controls) can temporarily close parent applications or registrations during maintenance or policy freezes.'
  );
  bullet(doc, [
    'Approve / decline school applications with executive notes.',
    'Configure school modules (teacher vs learner module packs).',
    'Oversee banking/fee configuration where applicable.',
    'Cross-school visibility for support and quality assurance.'
  ]);
}

function sectionSupport(doc) {
  h1(doc, '13. Support Desk & application corrections');
  body(
    doc,
    'This capability closes the “wrong details” gap. Any guest or signed-in user can file a ticket. Categories include wrong email, phone, ID, learner details, parent details, application correction, login access, profile, fees, technical, and other.'
  );
  h2(doc, '13.1 End-user flow');
  journeyBox(doc, [
    { title: 'Open Help', detail: 'View FAQs → Contact Admin (or AI Help for guidance).' },
    { title: 'Describe the mistake', detail: 'Validated name (letters), phone (10 digits), email, optional PAR- reference, subject, details.' },
    { title: 'Receive ticket number', detail: 'Acknowledgement email; school admins notified.' },
    { title: 'Admin corrects', detail: 'Support Desk or Parent Applications → Correct → optional resolve message.' }
  ]);
  addImage(doc, '08-faqs.png', 'FAQ entry explaining what to do after entering wrong application details.');
  addImage(doc, '09-contact-admin.png', 'Contact Admin ticket form with validation and category selection.');
}

function sectionSecurity(doc) {
  h1(doc, '14. Security, sessions & compliance');
  bullet(doc, [
    'JWT / session cookie authentication with active_session_id takeover semantics.',
    'Role checks enforced against live PostgreSQL role data (admin, teacher, parent, learner).',
    'Password recovery via time-limited OTP email; password history protections on change.',
    'Optional WebAuthn fingerprint sign-in.',
    'POPIA-aware terms: schools submit only information they may lawfully process.',
    'Idle Stay/Log out prompt to reduce unattended device risk.',
    'Input validation on critical forms (letters-only names, digits-only phones/IDs).'
  ]);
  addImage(doc, '05-terms.png', 'Legal terms covering accounts, POPIA, AI academic integrity, and parental oversight.');
}

function sectionTech(doc) {
  h1(doc, '15. Technology overview');
  bullet(doc, [
    'Client: React + Vite TypeScript SPA (client/), built to client/dist.',
    'Server: Express (server.js) on Node, REST APIs under /api/*.',
    'Data: PostgreSQL with schema bootstrap for core tables including parent_portal_applications and support_tickets.',
    'Mail: SMTP email service for OTP, admissions, parent application decisions, support acknowledgements.',
    'Hosting: Firebase Hosting site fusion-high-app (https://fusion-high-app.web.app); API typically on a Node host (e.g. Render).',
    'Realtime/push: web push and notification routes where configured.',
    'AI: integrated services for tutoring, early warning, lesson studio, and in-app Geleza SA assistant.'
  ]);
}

function sectionConclusion(doc) {
  h1(doc, '16. Conclusion');
  body(
    doc,
    'Geleza SA is designed as a complete secondary-school operating system for South Africa’s CAPS environment. It starts with a brand-strong public campus, routes each person into the correct role, and then delivers a module-rich but navigable experience for learners, parents, teachers, and principals. Where humans make mistakes — especially on applications — the Support Desk and Contact Admin pathway keep the journey recoverable.'
  );
  body(
    doc,
    'This documentation should be read together with GSA-DOC-ABOUT-001, GSA-DOC-TERMS-001, and GSA-DOC-FAQ-001. For institutional onboarding, contact Geleza SA Administration through the channels published on the platform.'
  );
  doc.moveDown(1);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(NAVY)
    .text('Document end — GSA-DOC-PROJECT-001 · Geleza SA Full Project Documentation · v2.1', {
      align: 'center'
    });
  doc.moveDown(0.5);
  doc.font('Helvetica-Oblique').fontSize(10).fillColor(GOLD)
    .text('Geleza Smart, The Future Is Thine.', { align: 'center' });
}

function main() {
  const doc = createDoc();
  cover(doc);
  toc(doc);
  sectionIntro(doc);
  sectionProblem(doc);
  sectionSolution(doc);
  sectionObjectives(doc);
  sectionMission(doc);
  sectionPublicJourney(doc);
  sectionCrossCutting(doc);
  sectionLearner(doc);
  sectionParent(doc);
  sectionTeacher(doc);
  sectionPrincipal(doc);
  sectionPlatformAdmin(doc);
  sectionSupport(doc);
  sectionSecurity(doc);
  sectionTech(doc);
  sectionConclusion(doc);
  footer(doc);
  doc.end();
  console.log('Wrote', OUT);
  console.log('Figures embedded:', figureNo);
}

main();
