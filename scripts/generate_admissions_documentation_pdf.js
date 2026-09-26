const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

async function generateAdmissionsPDF() {
  console.log('--- Generating Geleza SA Admissions & Registration Documentation PDF ---');

  const outputDirs = [
    path.join(__dirname, '../public/downloads'),
    path.join(__dirname, '../client/public/downloads'),
    path.join(__dirname, '../docs')
  ];

  outputDirs.forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  const pdfFileName = 'Geleza_SA_Admissions_and_Registration_Pipeline_Documentation.pdf';
  const primaryOutputPath = path.join(outputDirs[0], pdfFileName);

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    bufferPages: true,
    info: {
      Title: 'Geleza SA Admissions, Registration & School Onboarding Architecture',
      Author: 'Geleza SA Engineering & Admissions Systems Architecture Team',
      Subject: 'Comprehensive Specification for Multi-Scenario Admissions, Language Referral Engine, Sibling Linkage, and Notification Pipeline',
      Keywords: 'Geleza SA, Admissions, CAPS, South Africa DBE, High School, Sibling Enrollment, Language Referral, PDFKit',
      CreationDate: new Date()
    }
  });

  const stream = fs.createWriteStream(primaryOutputPath);
  doc.pipe(stream);

  // Palette
  const primaryColor = '#0f172a';    // Slate 900
  const secondaryColor = '#0284c7';  // Sky 600
  const accentColor = '#059669';     // Emerald 600
  const warningColor = '#d97706';    // Amber 600
  const textColor = '#334155';       // Slate 700
  const lightBg = '#f8fafc';         // Slate 50
  const borderColor = '#cbd5e1';     // Slate 300

  // Asset paths
  const logoPath = path.join(__dirname, '../public/assets/FH.png');

  function addHeader(title, subtitle) {
    doc.fillColor(secondaryColor).fontSize(8.5).font('Helvetica-Bold').text('GELEZA SA • ADMISSIONS & REGISTRATION ARCHITECTURE SPECIFICATION', 50, 40, { align: 'left' });
    doc.strokeColor(secondaryColor).lineWidth(1).moveTo(50, 52).lineTo(545, 52).stroke();
    doc.y = 65;
    if (title) {
      doc.fillColor(primaryColor).fontSize(16).font('Helvetica-Bold').text(title);
      if (subtitle) {
        doc.moveDown(0.2);
        doc.fillColor(secondaryColor).fontSize(10).font('Helvetica').text(subtitle);
      }
      doc.moveDown(0.8);
    }
  }

  function addSectionTitle(text) {
    if (doc.y > 680) doc.addPage();
    doc.moveDown(0.6);
    doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold').text(text);
    doc.strokeColor(borderColor).lineWidth(0.5).moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).stroke();
    doc.moveDown(0.5);
  }

  function addParagraph(text) {
    doc.fillColor(textColor).fontSize(9.5).font('Helvetica').text(text, { align: 'justify', lineGap: 2.5 });
    doc.moveDown(0.5);
  }

  function addBullet(label, text) {
    doc.fillColor(primaryColor).fontSize(9.5).font('Helvetica-Bold').text(`• ${label}: `, { continued: true });
    doc.fillColor(textColor).font('Helvetica').text(text, { align: 'justify', lineGap: 2 });
    doc.moveDown(0.3);
  }

  function addCalloutBox(title, text, type = 'info') {
    if (doc.y > 670) doc.addPage();
    const boxColor = type === 'warning' ? '#fffbeb' : '#f0f9ff';
    const borderCol = type === 'warning' ? '#fde68a' : '#bae6fd';
    const tagCol = type === 'warning' ? warningColor : secondaryColor;

    const startY = doc.y;
    const padding = 10;
    const width = 495;

    doc.rect(50, startY, width, 55).fillAndStroke(boxColor, borderCol);
    doc.fillColor(tagCol).fontSize(9.5).font('Helvetica-Bold').text(title, 60, startY + 8);
    doc.fillColor(textColor).fontSize(8.5).font('Helvetica').text(text, 60, startY + 24, { width: width - 20, lineGap: 1.5 });
    doc.y = startY + 65;
  }

  // ==========================================
  // PAGE 1: COVER PAGE
  // ==========================================
  doc.rect(0, 0, 595, 842).fill('#0b1329');

  // Decorative Accents
  doc.rect(50, 50, 495, 6).fill(secondaryColor);
  doc.rect(50, 56, 120, 3).fill(accentColor);

  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 50, 90, { width: 64 });
  }

  doc.fillColor('#ffffff').fontSize(26).font('Helvetica-Bold').text('GELEZA SA', 50, 175);
  doc.fillColor('#38bdf8').fontSize(16).font('Helvetica-Bold').text('Comprehensive Admissions, Registration & School Onboarding Architecture', 50, 210, { width: 495 });
  doc.fillColor('#94a3b8').fontSize(11).font('Helvetica').text('South African Department of Basic Education (DBE) CAPS-Compliant System Specification', 50, 255);

  doc.rect(50, 285, 495, 1).fill('#1e293b');

  // Document Scope Box
  doc.rect(50, 310, 495, 230).fillAndStroke('#131f3d', '#1e3a8a');
  doc.fillColor('#38bdf8').fontSize(11).font('Helvetica-Bold').text('CORE SYSTEM CAPABILITIES SPECIFIED IN THIS DOCUMENT', 70, 325);

  const scopePoints = [
    ['Principal School Registration', '5-stage accreditation wizard with EMIS, 11 official languages, and banking setup.'],
    ['Scenario 1 (Public Admission)', 'Unregistered parent and child applying for high school with dynamic language referrals.'],
    ['Scenario 2 (Sibling Enrollment)', 'Existing registered parents enrolling incoming Grade 8/middle grade learners with auto-linked credentials.'],
    ['Scenario 3 (Enrolled Child Linkage)', 'Unregistered parents securely linking existing enrolled learners via SA ID and Learner Number.'],
    ['Language Compatibility Engine', 'Real-time validation against school offerings with automated referral recommendations.'],
    ['Dual Fee Management', 'Instant online card payments vs. 7-day EFT with bank details and automated 3-day reminders.'],
    ['Academic Allocation', 'Automated assignment of Grade, Class section (e.g., Grade 8A), and CAPS curriculum subjects.'],
    ['Universal Field Validation', 'Standardized string vs. number placeholder validation across all application forms.']
  ];

  let scopeY = 350;
  scopePoints.forEach(([title, desc]) => {
    doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold').text(`• ${title}: `, 70, scopeY, { continued: true });
    doc.fillColor('#cbd5e1').font('Helvetica').text(desc, { width: 440 });
    scopeY += 19;
  });

  // Metadata Footer
  doc.fillColor('#64748b').fontSize(8.5).font('Helvetica').text('Publication Date: September 2026', 50, 720);
  doc.text('Version: 2.1.0 • Enterprise Production Release', 50, 735);
  doc.text('Classification: Technical Architecture & Engineering Documentation', 50, 750);
  doc.text('Compliance: CAPS DBE South Africa • National Education Policy Act', 50, 765);

  // ==========================================
  // PAGE 2: EXECUTIVE SUMMARY & ARCHITECTURE
  // ==========================================
  doc.addPage();
  addHeader('1. System Overview & Core Philosophy', 'Multi-Tenant Admissions Architecture for South African Secondary Schools');

  addParagraph('The Geleza SA School Management System provides a unified, secure, and automated pipeline for secondary school admissions, learner registrations, and academic allocation. Designed specifically for South African basic education, the system accommodates diverse community needs by integrating all 11 official South African languages, dynamic school referrals, and multi-option fee settlements.');

  addSectionTitle('1.1 Three Core Operational Scenarios');
  addParagraph('The system comprehensively addresses three distinct applicant scenarios:');

  addBullet('Scenario 1: Neither Parent Nor Learner in System', 'Public admission flow where an unregistered parent applies for an incoming learner. Includes language offering validation, school referrals, application fee processing, admin review, registration fee settlement, and automated academic allocation.');
  addBullet('Scenario 2: Parent in System, Learner NOT in System', 'Internal sibling enrollment flow where an authenticated parent enrolls a new incoming learner (e.g., Grade 8 or middle grade) with automated credential reuse and identical admission standards.');
  addBullet('Scenario 3: Parent NOT in System, Learner IS in System', 'Enrolled learner linkage flow where a newly appointed guardian or unregistered parent claims an already enrolled student through rigorous database verification.');

  addSectionTitle('1.2 High-Level Admission Lifecycle Flowchart');
  addCalloutBox(
    'Architecture Workflow Summary',
    'Principal Registers School (EMIS, 11 Languages, Banking) → School Accredited → Parent Submits Application (Grade, Language, Fee Method) → Language Check (Referrals if unavailable) → Fee Payment (Card / 7-Day EFT) → Admin Review & Approval → Registration Fee (R1,500) → Automated Allocation (Grade, Class 8A, CAPS Subjects) → Login Credentials Dispatched.',
    'info'
  );

  addSectionTitle('1.3 South African Curriculum Compliance (CAPS)');
  addParagraph('All grade registrations automatically provision standard Department of Basic Education CAPS subject packages based on the learner\'s chosen stream (General, Science, Commerce, Tourism, Technical STEM) and Home Language. Grade 8 and 9 learners receive the mandatory General GET package (9 learning areas), while Grade 10 to 12 learners receive 4 compulsory subjects (Home Language, First Additional Language, Mathematics/Maths Literacy, Life Orientation) plus 3 approved stream electives.');

  // ==========================================
  // PAGE 3: SCHOOL REGISTRATION & ACCREDITATION
  // ==========================================
  doc.addPage();
  addHeader('2. School Registration & Accreditation Workflow', 'Principal Portal & Department of Basic Education School Onboarding');

  addParagraph('Before schools can accept applications, principals must officially register their institution. The platform provides two distinct, accessible entry points:');
  addBullet('Landing Page Entry Point', 'A dedicated "Register School" call-to-action button in the primary header navigation.');
  addBullet('User Registration Entry Point', 'A highlighted banner on the public registration portal: "Are you a School Principal? Register & Onboard Your School →".');

  addSectionTitle('2.1 Five-Stage Accreditation Wizard');
  addParagraph('The modal wizard guides the principal through comprehensive verification steps:');

  addBullet('Stage 1: School Identity & DBE Verification', 'Official School Name, 9-digit EMIS Number, Province (all 9 provinces), Education District (dynamically filtered by province), Circuit, Physical Street Address, Official Contact Email & Phone, Curriculum Type (CAPS DBE), and Grade Range (8–12).');
  addBullet('Stage 2: Academic Catalog & Home Languages', 'Selection of offered Home Languages from South Africa\'s 11 official languages, First Additional Languages, Academic Streams, and CAPS elective subjects. This data powers the dynamic language compatibility check for parents.');
  addBullet('Stage 3: Principal & Lead Administrator Credentials', 'Principal First Name & Surname (with string-only validation), 13-digit National ID (validated via Luhn algorithm), SACE registration number, work email, phone number, and password.');
  addBullet('Stage 4: School Identity, Banking & Fee Checkpoint', 'School motto, custom theme colors (primary and secondary hex codes), standard application fee, registration fee, official bank name, account holder, account number, and branch code for parent deposits.');
  addBullet('Stage 5: Review & Executive Submission', 'Final dossier review and submission to POST /api/schools/apply. Generates a unique tracking number (e.g., GSA-SCH-912041) and queues the school for Executive Accreditation.');

  addCalloutBox(
    'Executive Review & Instant Provisioning',
    'Upon executive review and approval by system administrators, the school record is activated, the Principal user account is granted administrative privileges, and the school becomes selectable for parents across South Africa.',
    'info'
  );

  // ==========================================
  // PAGE 4: SCENARIO 1 - PUBLIC ADMISSIONS
  // ==========================================
  doc.addPage();
  addHeader('3. Scenario 1: Public Admission Pipeline', 'Neither Parent Nor Learner in System');

  addParagraph('The public admission portal (/application.html) enables prospective parents to submit formal applications for incoming learners.');

  addSectionTitle('3.1 11 Official South African Home Languages');
  addParagraph('South Africa recognizes 11 official languages. Geleza SA supports every official language as an accredited Home Language option:');
  addBullet('Nguni Languages', 'isiZulu, isiXhosa, siSwati, isiNdebele.');
  addBullet('Sotho-Tswana Languages', 'Sepedi (Northern Sotho), Sesotho (Southern Sotho), Setswana.');
  addBullet('Tswa-Ronga & Venda', 'Xitsonga, Tshivenda.');
  addBullet('West Germanic Languages', 'English, Afrikaans.');

  addSectionTitle('3.2 Dynamic Language Compatibility & Referral Engine');
  addParagraph('When a parent selects a target school and a Home Language, the client immediately queries GET /api/schools/:id/check-language:');
  addBullet('Language Available', 'The system displays a green confirmation badge, confirming the school accommodates the requested curriculum.');
  addBullet('Language Not Offered', 'The system displays an alert informing the parent that the school does not provide that language and provides clickable referral cards to accredited partner schools in the district offering that language.');

  addSectionTitle('3.3 Dual Application Fee Payment Architecture');
  addParagraph('To ensure equal accessibility while expediting processing, parents are provided two payment paths:');
  addBullet('Pay Online Immediately (Card)', 'Card settlement processed through the secure payment gateway, instantly marking the application fee as paid and issuing an instant receipt.');
  addBullet('7-Day EFT / Direct Bank Deposit', 'The system displays the school\'s official banking details (Bank Name, Account Holder, Account Number, Branch Code, and dynamic Learner Reference). The parent has 7 days to finalize the deposit.');

  addCalloutBox(
    'Automated 3-Day Fee Reminder',
    'An automated cron job scans the ledger daily. If an application fee remains unpaid 3 days prior to the 7-day deadline, the system automatically dispatches an urgent reminder email with bank details and reference code.',
    'warning'
  );

  // ==========================================
  // PAGE 5: ADMIN REVIEW & FINAL REGISTRATION
  // ==========================================
  doc.addPage();
  addHeader('4. Application Review & Registration Finalization', 'Admin Decision, Fee Settlements, and Academic Allocation');

  addParagraph('School administrators manage incoming applications through the administrative dashboard, verifying academic credentials and conduct reports.');

  addSectionTitle('4.1 Administrative Decision & Email Triggers');
  addBullet('Application Approved', 'The admin clicks "Approve". The system dispatches an official approval email detailing whether any application fee remains outstanding, specifying the mandatory R1,500 Registration Fee, and providing a secure payment link.');
  addBullet('Application Declined', 'The admin clicks "Decline" with an explanatory reason. The system sends an unsuccessful application notice with alternative guidance.');

  addSectionTitle('4.2 Registration Fee Settlement & Allocation');
  addParagraph('Upon payment of the registration fee (POST /api/admissions/pay-registration-fee), the backend executes an atomic transaction:');
  addBullet('1. Class Section Allocation', 'The learner is assigned to a specific homeroom class (e.g., Grade 8A, Grade 8B) dynamically balanced according to school capacity limits.');
  addBullet('2. CAPS Subject Provisioning', 'The system auto-enrolls the student into their complete package of official CAPS subjects, incorporating their chosen Home Language and stream electives.');
  addBullet('3. User Account Provisioning', 'Dedicated portal user accounts are generated for both the parent and learner, with auto-generated secure credentials.');
  addBullet('4. Final Registration Email', 'The system dispatches the official registration package email detailing the allocated Grade, Class, CAPS subject catalog, and portal access credentials.');

  addCalloutBox(
    'End-to-End Auditability',
    'Every payment transaction generates a unique receipt number (e.g., REC-APP-921041 or REC-REG-849201) permanently recorded in the application_payments ledger for administrative auditing.',
    'info'
  );

  // ==========================================
  // PAGE 6: SCENARIOS 2 & 3
  // ==========================================
  doc.addPage();
  addHeader('5. Sibling Enrollment & Learner Linkage', 'Scenarios 2 and 3 Operational Architecture');

  addSectionTitle('5.1 Scenario 2: Sibling Enrollment (Parent in System, Learner NOT in System)');
  addParagraph('Existing parents frequently need to enroll younger siblings (e.g., an incoming Grade 8 student) into the same or another secondary school without undergoing redundant profile registration.');
  addBullet('Dedicated Portal Module', 'Located in Parent Portal → "My Children" → "Enroll Sibling Internally" (ParentChildren.tsx).');
  addBullet('Identical Admission Rigor', 'The sibling form captures the identical academic criteria as the public admission form: Grade (8–12), Academic Stream, and Home Language.');
  addBullet('Automated Credential Linking', 'Parent contact details, national ID, and home address are automatically linked from the authenticated parent session.');
  addBullet('Live Language Verification & Fees', 'Features the same dynamic language check, school referral engine, and application fee payment options (Instant Card vs. 7-Day EFT).');
  addBullet('Instant Enrollment & Allocation', 'Upon completion, Grade, Class (e.g., Grade 8A), and CAPS subjects are assigned, and credentials are sent to the parent\'s email.');

  addSectionTitle('5.2 Scenario 3: Enrolled Learner Linkage (Parent NOT in System, Learner IS in System)');
  addParagraph('When a student is already attending the school but their parent or newly appointed guardian lacks a portal account, the public form provides a verification gate:');
  addBullet('Verification Prompt', '"Does this learner already attend this school or exist in the system?"');
  addBullet('Required Linkage Credentials', 'Official Learner Number (e.g., LRN-923241-1029), 13-digit South African ID Number, and First & Last Name.');
  addBullet('Database Validation Gate', 'The backend verifies whether the student exists and is active. If verified, the parent account is created and linked. If details do not match, the application is blocked with an explicit error message.');

  // ==========================================
  // PAGE 7: UNIVERSAL FORM VALIDATION RULES
  // ==========================================
  doc.addPage();
  addHeader('6. Universal Form Placeholder Validation Rules', 'Strict String vs. Number Field Governance Across All Forms');

  addParagraph('To eliminate data corruption and user confusion, strict inline validation is enforced on all input placeholders across the entire application ecosystem.');

  addSectionTitle('6.1 Standard Error Messages');
  addCalloutBox(
    'Text / String Placeholders (Names, Surnames, School Name, Circuit)',
    'Rule: If a user enters any numeric digit into a text placeholder:\nError Message: "Numbers are not allowed in this field. Please use letters only."',
    'warning'
  );

  addCalloutBox(
    'Numeric Placeholders (National ID, Phone Numbers, EMIS, Postal Codes)',
    'Rule: If a user enters any letter or word into a numeric placeholder:\nError Message: "Letters and words are not allowed in this field. Numbers only."',
    'warning'
  );

  addSectionTitle('6.2 Scope of Implementation');
  addParagraph('This validation standard is implemented across all frontend and backend touchpoints:');
  addBullet('RegisterPage.tsx', 'Parent first name, surname, phone number, ID number, and dynamic child enrollment rows.');
  addBullet('ParentChildren.tsx', 'Sibling first name, surname, national ID, and child lookup verification.');
  addBullet('SchoolRegistrationModal.tsx', 'Principal names, EMIS numbers, contact numbers, and SACE educator numbers.');
  addBullet('application.html / application.js', 'Public admission forms, parent contact details, and learner identification.');
  addBullet('Backend Controllers', 'Strict regex validation in applicationController.js, parentController.js, and schoolController.js.');

  // ==========================================
  // PAGE 8: EMAIL NOTIFICATION MATRIX & SUMMARY
  // ==========================================
  doc.addPage();
  addHeader('7. Complete Email Notification Matrix & Sign-Off', 'Automated Multi-Channel Communications Architecture');

  addParagraph('Every milestone in the admissions and registration lifecycle is paired with a branded, automated email:');

  const emails = [
    ['School Application Received', 'School Principal', 'Principal submits school onboarding dossier with EMIS and banking details.'],
    ['Application Received (EFT)', 'Parent / Guardian', 'Parent submits application; provides school bank details, reference, and 7-day deadline.'],
    ['Application Fee Receipt', 'Parent / Guardian', 'Parent settles application fee online or EFT; issues formal payment receipt.'],
    ['Application Fee Reminder', 'Parent / Guardian', 'Automated 3-day reminder for unpaid application fees.'],
    ['Application Approved', 'Parent / Guardian', 'Admin approval notice detailing R1,500 Registration Fee and payment portal link.'],
    ['Application Unsuccessful', 'Parent / Guardian', 'Admin decline notice providing formal reasons and district guidance.'],
    ['Registration & Allocation Success', 'Parent & Learner', 'Final enrollment confirmation detailing Grade, Class (8A), CAPS subjects, and login credentials.']
  ];

  emails.forEach(([title, recipient, desc]) => {
    addBullet(`${title} (To: ${recipient})`, desc);
  });

  addSectionTitle('8. Verification & Operational Sign-Off');
  addParagraph('The entire multi-scenario admissions, registration, and notification architecture has been fully verified, compiled, and deployed:');
  addBullet('Frontend Compilation', 'Vite & TypeScript production build passed with 0 errors.');
  addBullet('Git Repository', 'Synchronized on origin/main.');
  addBullet('Production Hosting', 'Live and operational on Firebase Hosting (https://fusion-high-app.web.app).');

  // ==========================================
  // PAGE NUMBERS & RUNNING FOOTERS
  // ==========================================
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    if (i === 0) continue; // Skip cover page

    // Temporarily set bottom margin to 0 to strictly prevent PDFKit from auto-adding overflow pages
    const originalBottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(50, 800).lineTo(545, 800).stroke();
    doc.fillColor('#94a3b8').fontSize(8).font('Helvetica')
      .text('Geleza SA School Management System • Admissions & Registration Documentation', 50, 808, { lineBreak: false });
    doc.text(`Page ${i + 1} of ${range.count}`, 450, 808, { width: 95, align: 'right', lineBreak: false });

    doc.page.margins.bottom = originalBottomMargin;
  }

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  // Copy to client/public/downloads and docs
  outputDirs.slice(1).forEach(dir => {
    const dest = path.join(dir, pdfFileName);
    fs.copyFileSync(primaryOutputPath, dest);
    console.log(`Copied PDF to: ${dest}`);
  });

  console.log(`Successfully generated PDF document: ${primaryOutputPath}`);
  return primaryOutputPath;
}

if (require.main === module) {
  generateAdmissionsPDF().catch(err => {
    console.error('Error generating PDF:', err);
    process.exit(1);
  });
}

module.exports = generateAdmissionsPDF;
