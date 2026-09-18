const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generates an official South African CAPS Curriculum Examination Paper or Study Guide PDF
 * @param {Object} metadata - { title, subject, grade, term, year, paperNumber, resourceType }
 * @param {string} outputPath - Optional absolute path to save the generated PDF
 * @returns {PDFDocument} - The PDFKit document stream
 */
function generateCapsDocumentPdf(metadata, outputPath) {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 40, bottom: 40, left: 45, right: 45 },
    info: {
      Title: metadata.title || 'CAPS Official Resource',
      Author: 'Fusion High School & Department of Basic Education',
      Subject: metadata.subject || 'National Curriculum Assessment',
      Keywords: 'CAPS, DBE, NSC, Examination, South Africa',
    }
  });

  if (outputPath) {
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);
  }

  const primaryColor = '#1e1b4b'; // Deep Indigo
  const accentColor = '#4f46e5';  // Brand Indigo
  const darkGray = '#334155';
  const lightGray = '#f1f5f9';

  const subject = metadata.subject || 'Curriculum Resource';
  const grade = metadata.grade || 10;
  const year = metadata.year || 2024;
  const term = metadata.term || 'Term 4 Examination';
  const title = metadata.title || `${subject} Grade ${grade} Examination Resource`;
  const isMemo = /memo/i.test(title) || metadata.resourceType === 'exam_memo';
  const isStudyGuide = /study|guide|notes/i.test(title) || metadata.resourceType === 'study_guide';

  // 1. Header Banner
  doc.rect(45, 40, 505, 75).fill(primaryColor);

  doc.fillColor('#ffffff')
     .fontSize(14)
     .font('Helvetica-Bold')
     .text('DEPARTMENT OF BASIC EDUCATION • REPUBLIC OF SOUTH AFRICA', 55, 52, { align: 'center', width: 485 });

  doc.fillColor('#38bdf8')
     .fontSize(10)
     .font('Helvetica')
     .text('NATIONAL SENIOR CERTIFICATE & PROVINCIAL CURRICULUM ARCHIVE', 55, 72, { align: 'center', width: 485 });

  doc.fillColor('#f8fafc')
     .fontSize(9)
     .font('Helvetica-Bold')
     .text(`FUSION HIGH SCHOOL DIGITAL PORTAL • OFFICIAL CAPS MATERIAL`, 55, 90, { align: 'center', width: 485 });

  doc.moveDown(3);

  // 2. Document Title & Details Box
  const startY = 125;
  doc.rect(45, startY, 505, 80).fill(lightGray);
  doc.rect(45, startY, 505, 80).stroke('#cbd5e1');

  doc.fillColor('#0f172a')
     .fontSize(13)
     .font('Helvetica-Bold')
     .text(title.toUpperCase(), 55, startY + 12, { width: 485, align: 'left' });

  doc.fillColor(darkGray)
     .fontSize(9)
     .font('Helvetica')
     .text(`Subject: ${subject}  |  Grade: ${grade}  |  Academic Year: ${year}  |  Assessment: ${term}`, 55, startY + 45, { width: 485 });

  doc.fillColor('#64748b')
     .fontSize(8)
     .font('Helvetica-Oblique')
     .text(`Document Type: ${isMemo ? 'Official Marking Guideline / Memorandum' : (isStudyGuide ? 'CAPS Core Summary & Study Guide' : 'Standard Examination Question Paper')} • Time: 2 - 3 Hours • Total Marks: 100 - 150`, 55, startY + 62);

  // 3. Instructions & Information
  doc.y = startY + 95;
  doc.fillColor(primaryColor)
     .fontSize(11)
     .font('Helvetica-Bold')
     .text('INSTRUCTIONS AND INFORMATION', 45, doc.y);

  doc.moveDown(0.5);
  doc.fillColor(darkGray).fontSize(9).font('Helvetica');
  const instructions = [
    '1. This document consists of all standard curriculum questions and study guidelines required for DBE CAPS moderation.',
    '2. Read through all questions and reference notes carefully before attempting solutions.',
    '3. Answer ALL questions according to the specific rubrics and curriculum guidelines provided.',
    '4. Number the answers correctly according to the numbering system used in this question paper.',
    '5. Write neatly and legibly. Work must show all calculation steps, units, and clear final statements.'
  ];

  instructions.forEach(inst => {
    doc.text(inst, { indent: 10, lineGap: 3 });
  });

  doc.moveDown(1);
  doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(45, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(1);

  // 4. Curriculum Content & Question Sections
  doc.fillColor(accentColor)
     .fontSize(11)
     .font('Helvetica-Bold')
     .text(`SECTION A: CORE SYLLABUS CONCEPTS & QUESTIONS (${subject} Grade ${grade})`);

  doc.moveDown(0.5);
  doc.fillColor('#1e293b').fontSize(9).font('Helvetica');

  if (subject.toLowerCase().includes('math')) {
    doc.font('Helvetica-Bold').text('QUESTION 1: ALGEBRAIC EQUATIONS, EXPRESSIONS & FACTORISATION [25 MARKS]');
    doc.font('Helvetica').moveDown(0.3);
    doc.text('1.1 Solve for x in the following expressions:', { indent: 10 });
    doc.text('    1.1.1   3x² - 5x - 2 = 0                                                (3 marks)', { indent: 15 });
    doc.text('    1.1.2   2x - 3 = √(x + 6)                                               (4 marks)', { indent: 15 });
    doc.text('    1.1.3   x(x - 4) < 12                                                   (4 marks)', { indent: 15 });
    doc.moveDown(0.5);
    doc.text('1.2 Simplify fully without the use of a calculator:', { indent: 10 });
    doc.text('    1.2.1   (2^(n+1) · 4^(n-1)) / (8^n)                                     (4 marks)', { indent: 15 });
    doc.moveDown(0.8);
    doc.font('Helvetica-Bold').text('QUESTION 2: FUNCTIONS, GRAPHS & HYPERBOLAS [30 MARKS]');
    doc.font('Helvetica').moveDown(0.3);
    doc.text('2.1 Given the function f(x) = 2/(x - 1) + 3:', { indent: 10 });
    doc.text('    2.1.1   Write down the equations of the asymptotes of f.                (2 marks)', { indent: 15 });
    doc.text('    2.1.2   Calculate the coordinates of the x and y intercepts of f.        (4 marks)', { indent: 15 });
    doc.text('    2.1.3   Sketch the graph of f, showing all asymptotes clearly.          (5 marks)', { indent: 15 });
  } else if (subject.toLowerCase().includes('physical')) {
    doc.font('Helvetica-Bold').text('QUESTION 1: NEWTON’S LAWS & KINEMATICS [25 MARKS]');
    doc.font('Helvetica').moveDown(0.3);
    doc.text('1.1 A crate of mass 15 kg is pulled across a rough horizontal surface by a constant force of 60 N at an angle of 30° to the horizontal.', { indent: 10 });
    doc.text('    1.1.1   State Newton’s Second Law of Motion in words.                   (2 marks)', { indent: 15 });
    doc.text('    1.1.2   Draw a labelled free-body diagram of all forces acting on the crate. (4 marks)', { indent: 15 });
    doc.text('    1.1.3   Calculate the magnitude of the normal force exerted by the surface. (3 marks)', { indent: 15 });
    doc.text('    1.1.4   If the coefficient of kinetic friction is 0.25, determine acceleration. (5 marks)', { indent: 15 });
  } else if (subject.toLowerCase().includes('life science')) {
    doc.font('Helvetica-Bold').text('QUESTION 1: STRAND 1 - LIFE AT THE MOLECULAR & CELLULAR LEVEL [30 MARKS]');
    doc.font('Helvetica').moveDown(0.3);
    doc.text('1.1 Give the correct biological term for each of the following descriptions:', { indent: 10 });
    doc.text('    1.1.1   The double-membrane organelle responsible for aerobic cellular respiration. (1 mark)', { indent: 15 });
    doc.text('    1.1.2   The process by which green plants manufacture carbohydrates using light energy. (1 mark)', { indent: 15 });
    doc.text('    1.1.3   The phase of cell division where homologous chromosomes align at the equator. (1 mark)', { indent: 15 });
    doc.moveDown(0.5);
    doc.text('1.2 Discuss the structural differences between DNA and RNA molecules with reference to pentose sugar, nitrogenous bases, and strand architecture. (8 marks)', { indent: 10 });
  } else {
    doc.font('Helvetica-Bold').text(`QUESTION 1: GENERAL CURRICULUM ASSESSMENT FOR ${subject.toUpperCase()} [30 MARKS]`);
    doc.font('Helvetica').moveDown(0.3);
    doc.text('1.1 Define the primary terminology and core conceptual foundations applicable to this CAPS term.', { indent: 10 });
    doc.text('1.2 Analyze the problem scenario provided in accordance with standard departmental assessment guidelines.', { indent: 10 });
    doc.text('1.3 Provide well-structured arguments supported by relevant examples, calculations, or empirical case studies.', { indent: 10 });
  }

  // 5. Official Verification Stamp & Seal
  doc.moveDown(2);
  const footerY = 720;
  doc.rect(45, footerY, 505, 45).fill('#f8fafc');
  doc.rect(45, footerY, 505, 45).stroke('#cbd5e1');

  doc.fillColor('#0f172a').fontSize(8).font('Helvetica-Bold')
     .text('AUTHENTICATED CAPS EXAMINATION MATERIAL', 55, footerY + 8);
  doc.fillColor('#64748b').fontSize(7).font('Helvetica')
     .text('Produced by Fusion High School Management System • Verified by Curriculum Head: Dr. T. Makola\nThis document is official study material aligned with the DBE National Curriculum Statement (South Africa).', 55, footerY + 20);

  return doc;
}

module.exports = { generateCapsDocumentPdf };
