/**
 * Short executive brief PDF (~15–25 pages) for stakeholders.
 * Full module appendix remains: Geleza_SA_Full_Project_Documentation.pdf
 * Run: node docs/geleza-sa-project-guide/generate-executive-brief.js
 */
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const catalog = require('./module-catalog');

const ROOT = __dirname;
const SHOTS = path.join(ROOT, 'screenshots');
const OUT = path.join(ROOT, 'Geleza_SA_Executive_Brief.pdf');

const NAVY = '#0B1F33';
const CYAN = '#13C8D9';
const GOLD = '#C9A227';
const SLATE = '#334155';
const MUTED = '#64748b';
const WHITE = '#ffffff';

let figureNo = 0;
const nextFig = () => `Figure ${++figureNo}`;

function ensureShot(name) {
  const p = path.join(SHOTS, name);
  return fs.existsSync(p) ? p : null;
}

function body(doc, text) {
  doc.font('Helvetica').fontSize(10).fillColor(SLATE).text(text, { align: 'justify', paragraphGap: 8, lineGap: 2 });
}

function h1(doc, text) {
  doc.moveDown(0.3);
  doc.font('Helvetica-Bold').fontSize(16).fillColor(NAVY).text(text, { paragraphGap: 8 });
  doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .strokeColor(CYAN).lineWidth(2).stroke();
  doc.moveDown(0.5);
}

function bullet(doc, items) {
  doc.font('Helvetica').fontSize(10).fillColor(SLATE);
  items.forEach((item) => doc.text(`•  ${item}`, { indent: 8, paragraphGap: 3 }));
  doc.moveDown(0.25);
}

function addImage(doc, fileName, captionText) {
  const p = ensureShot(fileName);
  const label = nextFig();
  if (!p) {
    doc.font('Helvetica-Oblique').fontSize(9).fillColor(MUTED)
      .text(`[${label} — screenshot unavailable: ${fileName}]`, { align: 'center', paragraphGap: 8 });
    return;
  }
  if (doc.y > doc.page.height - 260) doc.addPage();
  doc.image(p, { fit: [doc.page.width - 108, 240], align: 'center' });
  doc.moveDown(0.3);
  doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(MUTED)
    .text(`${label}. ${captionText}`, { align: 'center', paragraphGap: 10 });
}

function roleSummary(doc, key) {
  const pack = catalog[key];
  doc.addPage();
  h1(doc, pack.role);
  body(doc, pack.intro);
  body(doc, `Modules covered in the full documentation: ${pack.modules.length}.`);
  bullet(
    doc,
    pack.modules.slice(0, 6).map((m) => `${m.title} — ${m.why}`)
  );
  if (pack.modules.length > 6) {
    body(doc, `…and ${pack.modules.length - 6} more modules detailed in GSA-DOC-PROJECT-001.`);
  }
  addImage(doc, pack.homeShot.file, pack.homeShot.caption);
  addImage(doc, pack.moreShot.file, pack.moreShot.caption);
}

function main() {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 56, bottom: 56, left: 54, right: 54 },
    bufferPages: true,
    info: {
      Title: 'Geleza SA — Executive Brief',
      Author: 'Geleza SA',
      Subject: 'Stakeholder summary of the Geleza SA school platform',
      CreationDate: new Date()
    }
  });
  doc.pipe(fs.createWriteStream(OUT));

  doc.rect(0, 0, doc.page.width, doc.page.height).fill(NAVY);
  doc.fillColor(CYAN).font('Helvetica-Bold').fontSize(11).text('GSA-DOC-EXEC-001', 54, 72);
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(26).text('Geleza SA', 54, 160);
  doc.fillColor(GOLD).font('Helvetica').fontSize(12).text('GELEZA SMART, THE FUTURE IS THINE', 54, 200);
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(14).text('Executive Brief', 54, 250);
  doc.fillColor('#cbd5e1').font('Helvetica').fontSize(11)
    .text('Stakeholder summary — problem, solution, roles, Support Desk.\nFull module walkthrough: Geleza_SA_Full_Project_Documentation.pdf', 54, 290, { width: 480, lineGap: 4 });
  doc.fillColor(MUTED).font('Helvetica').fontSize(10).text('v2.1 · October 2026 · https://fusion-high-app.web.app', 54, 700);
  doc.addPage();

  h1(doc, '1. Why Geleza SA');
  body(doc, 'South African secondary schools often run academics and administration across paper registers, spreadsheets, WhatsApp groups, and disconnected fee tools. Geleza SA unifies learner, parent, teacher, and principal experiences in one CAPS-aligned web platform.');
  bullet(doc, [
    'Verified marks only — no placeholder scores for families.',
    'Role-based portals with a searchable More hub for every module.',
    'Contact Admin + Support Desk to correct mistaken emails, phones, and IDs.',
    'AI study / lesson tools positioned as support under school integrity rules.'
  ]);
  addImage(doc, '01-landing.png', 'Public landing — brand-first campus experience.');

  h1(doc, '2. Solution pillars');
  bullet(doc, [
    'One campus-styled public journey (landing, login, register, recovery, help).',
    'Learner cockpit for subjects, reports, homework, AI tutor, timetable, bursaries.',
    'Parent family hub for children, attendance, fees, consultations.',
    'Teacher classroom tools for SBA, attendance, assignments, early-warning.',
    'Principal command center for users, report studio, fees, Support Desk.'
  ]);
  addImage(doc, '09-contact-admin.png', 'Contact Admin — structured tickets for application mistakes.');
  addImage(doc, '21-principal-support-desk.png', 'Support Desk — school admins correct and resolve tickets.');

  roleSummary(doc, 'learner');
  roleSummary(doc, 'parent');
  roleSummary(doc, 'teacher');
  roleSummary(doc, 'principal');

  doc.addPage();
  h1(doc, '7. Next reading');
  body(doc, 'This brief is intentionally short. For module-by-module screenshots and training detail, open Geleza_SA_Full_Project_Documentation.pdf (GSA-DOC-PROJECT-001). Architecture decisions for frontend and mobile live under docs/architecture/.');
  doc.moveDown(1);
  doc.font('Helvetica-Oblique').fontSize(11).fillColor(GOLD)
    .text('Geleza Smart, The Future Is Thine.', { align: 'center' });

  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    doc.fontSize(8).fillColor(MUTED)
      .text(`GSA-DOC-EXEC-001 · Page ${i + 1} of ${range.count}`, 54, doc.page.height - 36, {
        width: doc.page.width - 108,
        align: 'right',
        lineBreak: false
      });
  }

  doc.end();
  console.log('Wrote', OUT, 'figures', figureNo);
}

main();
