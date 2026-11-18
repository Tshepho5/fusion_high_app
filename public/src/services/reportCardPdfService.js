const PDFDocument = require('pdfkit');
const JSZip = require('jszip');
const path = require('path');
const fs = require('fs');

/**
 * Maps percentage mark to South African CAPS official 7-Point Achievement Rating Level
 */
function getCapsLevel(percentage) {
  if (percentage === null || percentage === undefined || isNaN(percentage) || percentage === '') {
    return { level: '-', rating: 'Not Assessed', descriptor: '-' };
  }
  const p = Math.round(Number(percentage));
  if (p >= 80) return { level: '7', rating: 'Outstanding Achievement', descriptor: '7: Outstanding (80 - 100%)' };
  if (p >= 70) return { level: '6', rating: 'Meritorious Achievement', descriptor: '6: Meritorious (70 - 79%)' };
  if (p >= 60) return { level: '5', rating: 'Substantial Achievement', descriptor: '5: Substantial (60 - 69%)' };
  if (p >= 50) return { level: '4', rating: 'Adequate Achievement', descriptor: '4: Adequate (50 - 59%)' };
  if (p >= 40) return { level: '3', rating: 'Moderate Achievement', descriptor: '3: Moderate (40 - 49%)' };
  if (p >= 30) return { level: '2', rating: 'Elementary Achievement', descriptor: '2: Elementary (30 - 39%)' };
  return { level: '1', rating: 'Not Achieved', descriptor: '1: Not Achieved (0 - 29%)' };
}

/**
 * Sanitizes string for safe filename
 */
function sanitizeFilename(str) {
  return (str || 'Learner').replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
}

/**
 * Generates an official South African DBE / CAPS Learner Report Card PDF buffer
 * Exact A4 Portrait format modeled after the official South African report card standard.
 *
 * @param {Object} reportData - Clean structured data:
 * {
 *   school: { name, physical_address, postal_address, contact_phone, contact_email, emis_number, principal_name, logo_url },
 *   learner: { surname, first_name, full_name, id_number, admission_number, learner_number, grade, class_name, dob },
 *   meta: { academic_year, current_term, closing_date, reopening_date, issue_date },
 *   subjects: [ { subject, term1: { mark, level, grade_ave }, term2: ..., term3: ..., term4: ..., final: ... } ],
 *   summary: {
 *     totals: { term1, term2, term3, term4, final },
 *     averages: { term1, term2, term3, term4, final },
 *     outcome: { term1, term2, term3, term4, final },
 *     attendance: { term1_absent, term2_absent, term3_absent, term4_absent, total_absent }
 *   },
 *   remarks: { teacher_comment, principal_comment },
 *   signatures: { educator_name, hod_name, principal_name, parent_name }
 * }
 * @returns {Promise<Buffer>} - Resolves with PDF Buffer
 */
function generateLearnerReportCardPdf(reportData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 28, bottom: 28, left: 32, right: 32 },
        info: {
          Title: `Official Academic Report Card - ${reportData.learner.full_name}`,
          Author: reportData.school.name || 'Geleza SA Education System',
          Subject: `CAPS Term Academic Progress Report - Grade ${reportData.learner.grade}`,
          Keywords: 'CAPS, DBE, South Africa, Learner Report Card, SA-SAMS'
        }
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      doc.on('error', reject);

      const school = reportData.school || {};
      const learner = reportData.learner || {};
      const meta = reportData.meta || {};
      const subjects = reportData.subjects || [];
      const summary = reportData.summary || {};
      const remarks = reportData.remarks || {};
      const signatures = reportData.signatures || {};

      const leftMargin = 32;
      const rightMargin = 595.28 - 32;
      const contentWidth = rightMargin - leftMargin; // 531.28 pt

      // ==========================================
      // 1. SCHOOL HEADER SECTION
      // ==========================================
      let currentY = 28;

      // Check if school has logo and load if valid
      let hasLogo = false;
      let logoPath = null;
      if (school.logo_url && typeof school.logo_url === 'string') {
        const cleanPath = school.logo_url.replace(/^\//, '');
        const resolvedPath = path.join(__dirname, '..', '..', cleanPath);
        if (fs.existsSync(resolvedPath)) {
          logoPath = resolvedPath;
          hasLogo = true;
        }
      }

      // School Name & Contact (Left column)
      const headerTextWidth = hasLogo ? contentWidth - 75 : contentWidth - 10;
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000');
      doc.text((school.name || 'REGISTERED SCHOOL NAME').toUpperCase(), leftMargin, currentY, { width: headerTextWidth });

      currentY = doc.y + 1;
      doc.fontSize(7.5).font('Helvetica').fillColor('#1e293b');

      if (school.physical_address) {
        doc.text(school.physical_address, leftMargin, currentY, { width: headerTextWidth });
        currentY = doc.y + 1;
      }
      if (school.postal_address) {
        doc.text(school.postal_address, leftMargin, currentY, { width: headerTextWidth });
        currentY = doc.y + 1;
      }

      const contactLine = [
        school.contact_phone ? `Tel: ${school.contact_phone}` : null,
        school.contact_email ? `Email: ${school.contact_email}` : null,
        school.emis_number ? `EMIS: ${school.emis_number}` : null
      ].filter(Boolean).join('   |   ');

      if (contactLine) {
        doc.text(contactLine, leftMargin, currentY, { width: headerTextWidth });
        currentY = doc.y + 1;
      }

      // Draw Logo or Crest placeholder on top right
      const logoSize = 48;
      const logoX = rightMargin - logoSize;
      const logoY = 28;

      if (hasLogo && logoPath) {
        try {
          doc.image(logoPath, logoX, logoY, { width: logoSize, height: logoSize, fit: [logoSize, logoSize] });
        } catch (_) {
          drawSchoolBadgePlaceholder(doc, logoX, logoY, logoSize, school.name);
        }
      } else {
        drawSchoolBadgePlaceholder(doc, logoX, logoY, logoSize, school.name);
      }

      currentY = Math.max(currentY + 6, 82);

      // Horizontal separator line
      doc.strokeColor('#000000').lineWidth(0.75);
      doc.moveTo(leftMargin, currentY).lineTo(rightMargin, currentY).stroke();
      currentY += 4;

      // ==========================================
      // 2. LEARNER INFORMATION BAR (3 Columns)
      // ==========================================
      const infoBoxY = currentY;
      const infoBoxHeight = 44;
      doc.rect(leftMargin, infoBoxY, contentWidth, infoBoxHeight).lineWidth(0.5).strokeColor('#475569').stroke();

      const col1Width = 240;
      const col2Width = 140;
      const col3Width = contentWidth - col1Width - col2Width;

      const col1X = leftMargin + 6;
      const col2X = leftMargin + col1Width + 6;
      const col3X = leftMargin + col1Width + col2Width + 6;

      let lY = infoBoxY + 4;
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#000000');
      const learnerIdStr = learner.id_number || learner.learner_number || '';
      const learnerDisplayName = `${(learner.surname || '').toUpperCase()}, ${(learner.first_name || learner.full_name || '').toUpperCase()}${learnerIdStr ? ' - ' + learnerIdStr : ''}`;
      doc.text(`Learner: ${learnerDisplayName}`, col1X, lY, { width: col1Width - 10, lineBreak: false });

      doc.font('Helvetica').fontSize(7).fillColor('#1e293b');
      doc.text(`Admission No: ${learner.admission_number || learner.learner_number || 'N/A'}`, col1X, lY + 11);
      doc.text(`Birth Date: ${learner.dob ? String(learner.dob).substring(0, 10).replace(/-/g, '') : 'N/A'}`, col1X, lY + 21);
      doc.text(`School Closes: ${meta.closing_date || '2026/09/23'}`, col1X, lY + 31);

      // Column 2
      doc.text(`School Reopens: ${meta.reopening_date || '2026/10/06'}`, col2X, lY + 11);

      // Column 3
      doc.font('Helvetica-Bold').fillColor('#000000');
      doc.text(`Grade: Grade ${String(learner.grade).padStart(2, '0')}`, col3X, lY);
      doc.font('Helvetica').fillColor('#1e293b');
      doc.text(`Class: ${learner.class_name || (learner.grade + 'A')}`, col3X, lY + 11);
      doc.text(`Date: ${meta.issue_date || new Date().toISOString().substring(0, 10).replace(/-/g, '/')}`, col3X, lY + 21);

      currentY = infoBoxY + infoBoxHeight + 6;

      // ==========================================
      // 3. ACADEMIC RESULTS TABLE
      // ==========================================
      // Columns layout:
      // Subject: 187.28 pt
      // Term 1: 3 x 28.67 pt = 86 pt  [Final %, Level, Grade Ave %]
      // Term 2: 3 x 28.67 pt = 86 pt  [Final %, Level, Grade Ave %]
      // Term 3: 3 x 28.67 pt = 86 pt  [Final %, Level, Grade Ave %]
      // Final for Year: 3 x 28.67 pt = 86 pt [Final %, Level, Grade Ave %]
      // Total = 187.28 + 86*4 = 531.28 pt
      const subColWidth = 187.28;
      const termGroupWidth = 86;
      const cellWidth = termGroupWidth / 3; // ~28.67 pt

      const tableX = leftMargin;
      const tableWidth = contentWidth;
      const headerH1 = 13;
      const headerH2 = 13;
      const rowHeight = 14;

      // Table Header Row 1 (Super headers)
      doc.rect(tableX, currentY, tableWidth, headerH1).fillAndStroke('#f1f5f9', '#000000');
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#000000');
      doc.text('Subject', tableX + 6, currentY + 3);

      let termHeaderX = tableX + subColWidth;
      const termTitles = ['Term 1', 'Term 2', 'Term 3', 'Final for Year'];
      for (let i = 0; i < 4; i++) {
        doc.rect(termHeaderX, currentY, termGroupWidth, headerH1).fillAndStroke('#f1f5f9', '#000000');
        doc.text(termTitles[i], termHeaderX, currentY + 3, { width: termGroupWidth, align: 'center' });
        termHeaderX += termGroupWidth;
      }
      currentY += headerH1;

      // Table Header Row 2 (Sub headers: Final %, Level, Grade Ave %)
      doc.rect(tableX, currentY, subColWidth, headerH2).fillAndStroke('#f8fafc', '#000000');
      let subColX = tableX + subColWidth;
      for (let i = 0; i < 4; i++) {
        // Final %
        doc.rect(subColX, currentY, cellWidth, headerH2).fillAndStroke('#f8fafc', '#000000');
        doc.fontSize(6).font('Helvetica-Bold').text('Final %', subColX, currentY + 3.5, { width: cellWidth, align: 'center' });
        // Level
        doc.rect(subColX + cellWidth, currentY, cellWidth, headerH2).fillAndStroke('#f8fafc', '#000000');
        doc.fontSize(6).font('Helvetica-Bold').text('Level', subColX + cellWidth, currentY + 3.5, { width: cellWidth, align: 'center' });
        // Grade Ave %
        doc.rect(subColX + cellWidth * 2, currentY, cellWidth, headerH2).fillAndStroke('#f8fafc', '#000000');
        doc.fontSize(5.5).font('Helvetica-Bold').text('Grade Ave %', subColX + cellWidth * 2, currentY + 3.5, { width: cellWidth, align: 'center' });

        subColX += termGroupWidth;
      }
      currentY += headerH2;

      // Render Subject Rows
      doc.fontSize(6.8).font('Helvetica').fillColor('#000000');
      for (const s of subjects) {
        doc.rect(tableX, currentY, subColWidth, rowHeight).strokeColor('#475569').lineWidth(0.4).stroke();
        const displaySubjectName = `${s.subject || 'Subject'} (Gr ${String(learner.grade).padStart(2, '0')})`;
        doc.text(displaySubjectName, tableX + 6, currentY + 3.5, { width: subColWidth - 10, lineBreak: false });

        let cellX = tableX + subColWidth;
        const termKeys = ['term1', 'term2', 'term3', 'final'];
        for (const tk of termKeys) {
          const tData = s[tk] || {};
          const markVal = tData.mark !== null && tData.mark !== undefined ? String(tData.mark) : '-';
          const levelVal = tData.level !== null && tData.level !== undefined ? String(tData.level) : '-';
          const aveVal = tData.grade_ave !== null && tData.grade_ave !== undefined ? String(tData.grade_ave) : '-';

          // Final %
          doc.rect(cellX, currentY, cellWidth, rowHeight).stroke();
          doc.text(markVal, cellX, currentY + 3.5, { width: cellWidth, align: 'center' });
          // Level
          doc.rect(cellX + cellWidth, currentY, cellWidth, rowHeight).stroke();
          doc.text(levelVal, cellX + cellWidth, currentY + 3.5, { width: cellWidth, align: 'center' });
          // Grade Ave %
          doc.rect(cellX + cellWidth * 2, currentY, cellWidth, rowHeight).stroke();
          doc.text(aveVal, cellX + cellWidth * 2, currentY + 3.5, { width: cellWidth, align: 'center' });

          cellX += termGroupWidth;
        }
        currentY += rowHeight;
      }

      // Summary Row 1: Learner Total / Average
      const sumTotals = summary.totals || {};
      const sumAves = summary.averages || {};
      doc.rect(tableX, currentY, subColWidth, rowHeight).fillAndStroke('#f8fafc', '#000000');
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#000000');
      doc.text('Learner Total / Average:', tableX + 6, currentY + 3.5, { width: subColWidth - 12, align: 'right' });

      let sumX = tableX + subColWidth;
      const termsArr = ['term1', 'term2', 'term3', 'final'];
      for (const tk of termsArr) {
        const tot = sumTotals[tk] !== null && sumTotals[tk] !== undefined ? String(sumTotals[tk]) : '-';
        const avg = sumAves[tk] !== null && sumAves[tk] !== undefined ? String(sumAves[tk]) : '-';

        doc.rect(sumX, currentY, cellWidth, rowHeight).stroke();
        doc.fontSize(6.8).font('Helvetica-Bold').text(tot, sumX, currentY + 3.5, { width: cellWidth, align: 'center' });

        doc.rect(sumX + cellWidth, currentY, cellWidth, rowHeight).stroke();
        doc.text('', sumX + cellWidth, currentY + 3.5, { width: cellWidth, align: 'center' }); // Empty Level cell

        doc.rect(sumX + cellWidth * 2, currentY, cellWidth, rowHeight).stroke();
        doc.text(avg, sumX + cellWidth * 2, currentY + 3.5, { width: cellWidth, align: 'center' });

        sumX += termGroupWidth;
      }
      currentY += rowHeight;

      // Summary Row 2: Result
      const sumOutcomes = summary.outcome || {};
      doc.rect(tableX, currentY, subColWidth, rowHeight).fillAndStroke('#f8fafc', '#000000');
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#000000');
      doc.text('Result:', tableX + 6, currentY + 3.5, { width: subColWidth - 12, align: 'right' });

      let outX = tableX + subColWidth;
      for (const tk of termsArr) {
        const resVal = sumOutcomes[tk] || (sumAves[tk] ? (Number(sumAves[tk]) >= 40 ? 'Achieved' : 'Not Achieved') : '-');
        doc.rect(outX, currentY, termGroupWidth, rowHeight).stroke();
        doc.fontSize(6.8).font('Helvetica').text(resVal, outX, currentY + 3.5, { width: termGroupWidth, align: 'center' });
        outX += termGroupWidth;
      }
      currentY += rowHeight;

      // Summary Row 3: Days Absent
      const sumAtt = summary.attendance || {};
      doc.rect(tableX, currentY, subColWidth, rowHeight).fillAndStroke('#f8fafc', '#000000');
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#000000');
      doc.text('Days Absent:', tableX + 6, currentY + 3.5, { width: subColWidth - 12, align: 'right' });

      let attX = tableX + subColWidth;
      const attArr = [sumAtt.term1_absent, sumAtt.term2_absent, sumAtt.term3_absent, sumAtt.total_absent || sumAtt.term4_absent];
      for (let i = 0; i < 4; i++) {
        const val = attArr[i] !== null && attArr[i] !== undefined ? String(attArr[i]) : '-';
        doc.rect(attX, currentY, termGroupWidth, rowHeight).stroke();
        doc.fontSize(6.8).font('Helvetica').text(val, attX, currentY + 3.5, { width: termGroupWidth, align: 'center' });
        attX += termGroupWidth;
      }
      currentY += rowHeight + 8;

      // ==========================================
      // 4. GENERAL REMARKS & OFFICIAL SCHOOL STAMP
      // ==========================================
      const remarksSectionY = currentY;
      const stampWidth = 145;
      const stampHeight = 58;
      const remarksWidth = contentWidth - stampWidth - 12;

      // General Remarks area
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#000000');
      doc.text('General Remarks:', leftMargin, remarksSectionY);
      const teacherRemarks = remarks.teacher_comment || remarks.general_remarks || 'Continue working hard and remain focused on academic goals.';
      doc.fontSize(8.5).font('Helvetica-Oblique').fillColor('#1e293b');
      doc.text(teacherRemarks, leftMargin + 85, remarksSectionY, { width: remarksWidth - 85 });

      // School Stamp Box (Clean rectangular official placeholder matching reference)
      const stampX = rightMargin - stampWidth;
      const stampY = remarksSectionY - 4;
      doc.rect(stampX, stampY, stampWidth, stampHeight).lineWidth(1).strokeColor('#000000').stroke();

      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#000000');
      doc.text((school.name || 'OFFICIAL SCHOOL STAMP').toUpperCase(), stampX + 4, stampY + 5, { width: stampWidth - 8, align: 'center' });
      doc.fontSize(6.5).font('Helvetica').fillColor('#1e293b');
      doc.text(meta.issue_date || new Date().toISOString().substring(0, 10), stampX + 4, stampY + 18, { width: stampWidth - 8, align: 'center' });
      if (school.postal_address) {
        doc.text(school.postal_address, stampX + 4, stampY + 28, { width: stampWidth - 8, align: 'center' });
      }
      if (school.contact_phone) {
        doc.text(`TEL: ${school.contact_phone}`, stampX + 4, stampY + 40, { width: stampWidth - 8, align: 'center' });
      }

      currentY = Math.max(remarksSectionY + 45, stampY + stampHeight + 10);

      // ==========================================
      // 5. SIGNATURES & ENDORSEMENTS SECTION
      // ==========================================
      const sigY = currentY;
      const sigColWidth = contentWidth / 4;

      const sigLabels = [
        { role: 'Class Educator', name: signatures.educator_name || 'Educator' },
        { role: 'DP/HOD', name: signatures.hod_name || 'Department Head' },
        { role: 'Principal', name: signatures.principal_name || school.principal_name || 'Principal' },
        { role: 'Parent', name: signatures.parent_name || 'Parent / Guardian' }
      ];

      for (let i = 0; i < 4; i++) {
        const sX = leftMargin + i * sigColWidth;
        // Signature Line
        doc.strokeColor('#000000').lineWidth(0.5);
        doc.moveTo(sX + 6, sigY + 16).lineTo(sX + sigColWidth - 10, sigY + 16).stroke();

        doc.fontSize(7).font('Helvetica-Bold').fillColor('#000000');
        doc.text(sigLabels[i].role, sX + 6, sigY + 20);

        doc.fontSize(6).font('Helvetica').fillColor('#475569');
        doc.text(sigLabels[i].name, sX + 6, sigY + 28, { width: sigColWidth - 12 });
      }

      currentY = sigY + 40;

      // ==========================================
      // 6. FOOTER: PROMOTION POLICY & 7-POINT SCALE
      // ==========================================
      doc.strokeColor('#000000').lineWidth(0.5);
      doc.moveTo(leftMargin, currentY).lineTo(rightMargin, currentY).stroke();
      currentY += 4;

      // Promotion policy text
      doc.fontSize(6.2).font('Helvetica-Bold').fillColor('#000000');
      const phaseTitle = learner.grade <= 6
        ? 'Intermediate Phase Gr 4-6:'
        : (learner.grade <= 9 ? 'Senior Phase Gr 7-9:' : 'FET Phase Gr 10-12:');
      const phaseRule = learner.grade <= 6
        ? 'The learner must achieve at least: Level 4 in HL; Level 3 in FAL; Level 3 in Mathematics and Level 3 in any other two (2) of the remaining approved subjects.'
        : (learner.grade <= 9
          ? 'The learner must achieve at least: Level 3 in HL; Level 2 in FAL; Level 2 in Mathematics; Level 3 in any other three (3) subjects and Level 2 in any other two (2) subjects.'
          : 'National Senior Certificate (CAPS): Home Language >= 40%; 2 other subjects >= 40%; 3 other subjects >= 30%. Bachelor Admission: >= 50% in four designated subjects.');

      doc.text(`${phaseTitle} ${phaseRule}`, leftMargin, currentY, { width: contentWidth });
      currentY = doc.y + 2;

      // 7-Point Achievement Level Scale Legend
      doc.fontSize(5.8).font('Helvetica').fillColor('#1e293b');
      const scaleText = 'Level 1 = 0 - 29.99 Not Achieved; Level 2 = 30 - 39.99 Elementary Achievement; Level 3 = 40 - 49.99 Moderate Achievement; Level 4 = 50 - 59.99 Adequate Achievement; Level 5 = 60 - 69.99 Substantial Achievement; Level 6 = 70 - 79.99 Meritorious Achievement; Level 7 = 80 - 100 Outstanding Achievement;';
      doc.text(scaleText, leftMargin, currentY, { width: contentWidth });

      // Verification footer
      doc.fontSize(5).font('Helvetica').fillColor('#94a3b8');
      doc.text(`Official Geleza SA Educational Report Card • Academic Year ${meta.academic_year || 2026} • School ID: ${school.id || 'N/A'} • Authenticated Document`, leftMargin, currentY + 10, { width: contentWidth, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Draws a clean school badge placeholder if image is not present
 */
function drawSchoolBadgePlaceholder(doc, x, y, size, schoolName) {
  doc.rect(x, y, size, size).lineWidth(0.75).strokeColor('#000000').stroke();
  const initials = (schoolName || 'SA')
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .slice(0, 3)
    .join('')
    .toUpperCase();
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000');
  doc.text(initials, x, y + size / 2 - 5, { width: size, align: 'center' });
}

/**
 * Generates a batch ZIP containing individual learner report card PDFs
 *
 * @param {Array<Object>} reportsList - Array of reportData objects
 * @returns {Promise<Buffer>} - Resolves with ZIP Buffer
 */
async function generateBatchReportCardsZip(reportsList) {
  const zip = new JSZip();

  for (const reportData of reportsList) {
    const learner = reportData.learner || {};
    const meta = reportData.meta || {};
    const pdfBuffer = await generateLearnerReportCardPdf(reportData);

    const safeLearnerName = sanitizeFilename(`${learner.surname || ''}_${learner.first_name || learner.full_name || ''}`);
    const safeGrade = sanitizeFilename(String(learner.grade || '10'));
    const safeClass = sanitizeFilename(String(learner.class_name || '10A'));
    const safeTerm = sanitizeFilename(String(meta.current_term || 'Term3'));
    const safeYear = sanitizeFilename(String(meta.academic_year || '2026'));

    const filename = `GelezaSA_Report_${safeYear}_Grade${safeGrade}_Class${safeClass}_${safeLearnerName}_${safeTerm}.pdf`;
    zip.file(filename, pdfBuffer);
  }

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

module.exports = {
  getCapsLevel,
  sanitizeFilename,
  generateLearnerReportCardPdf,
  generateOfficialReportCardPdfBuffer: generateLearnerReportCardPdf,
  generateBatchReportCardsZip
};
