'use strict';

const PDFDocument = require('pdfkit');
const { buildAcceptanceLetterModel } = require('../../../lib/learnerRegistrationWorkflow');

/**
 * Generates an official, school-branded A4 Acceptance Letter PDF Buffer using
 * strictly verified database fields. Never fabricates missing deadlines, fees,
 * classes, or subjects.
 *
 * @param {{ application: object, school: object, classAllocation?: object|null, issuedAt?: Date|string|null }} params
 * @returns {Promise<{ buffer: Buffer, filename: string, model: object }>}
 */
function generateAcceptanceLetterPdf({ application, school, classAllocation = null, issuedAt = null }) {
  const model = buildAcceptanceLetterModel({ application, school, classAllocation, issuedAt });
  const safeAppRef = String(model.applicationNumber || model.referenceNumber || 'ACCEPTANCE')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Acceptance_Letter_${safeAppRef}.pdf`;

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 48, bottom: 52, left: 52, right: 52 },
        info: {
          Title: `Official Letter of Acceptance - ${model.learner.fullName}`,
          Author: model.school.name,
          Subject: `School Admission Acceptance (${model.applicationNumber})`,
          Creator: 'Geleza SA Integrated Admissions'
        }
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        resolve({
          buffer: Buffer.concat(chunks),
          filename,
          model
        });
      });
      doc.on('error', reject);

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const startX = doc.page.margins.left;

      // Top accent banner
      doc.save();
      doc.rect(0, 0, doc.page.width, 14).fill('#0F4C81');
      doc.rect(0, 14, doc.page.width, 4).fill('#10B981');
      doc.restore();

      // School Header
      doc.moveDown(0.3);
      doc.font('Helvetica-Bold').fontSize(18).fillColor('#0F172A').text(model.school.name.toUpperCase(), {
        align: 'left'
      });

      const schoolMetaParts = [];
      if (model.school.emisNumber) schoolMetaParts.push(`EMIS No: ${model.school.emisNumber}`);
      if (model.school.district) schoolMetaParts.push(`District: ${model.school.district}`);
      if (model.school.province) schoolMetaParts.push(model.school.province);
      if (schoolMetaParts.length > 0) {
        doc.font('Helvetica').fontSize(9.5).fillColor('#475569').text(schoolMetaParts.join('  |  '));
      }

      const contactParts = [];
      if (model.school.address) contactParts.push(model.school.address);
      if (model.school.phone) contactParts.push(`Tel: ${model.school.phone}`);
      if (model.school.email) contactParts.push(`Email: ${model.school.email}`);
      if (contactParts.length > 0) {
        doc.font('Helvetica').fontSize(9).fillColor('#64748B').text(contactParts.join('  •  '));
      }

      doc.moveDown(0.8);
      doc.moveTo(startX, doc.y).lineTo(startX + pageWidth, doc.y).lineWidth(1).strokeColor('#CBD5E1').stroke();
      doc.moveDown(0.9);

      // Reference & Date Row
      const metaY = doc.y;
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#334155')
        .text(`Reference: ${model.referenceNumber}`, startX, metaY, { width: pageWidth / 2 });
      doc.font('Helvetica').fontSize(9.5).fillColor('#334155')
        .text(`Date Issued: ${model.issuedDateDisplay}`, startX + pageWidth / 2, metaY, {
          width: pageWidth / 2,
          align: 'right'
        });

      doc.moveDown(1.3);

      // Formal Document Title
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#0F4C81').text('OFFICIAL LETTER OF ADMISSION ACCEPTANCE', {
        align: 'center'
      });
      doc.moveDown(0.9);

      // Salutation
      doc.font('Helvetica').fontSize(10.5).fillColor('#1E293B')
        .text(`Dear ${model.guardian.fullName},`);
      doc.moveDown(0.6);

      // Main acceptance statement
      doc.font('Helvetica').fontSize(10.5).fillColor('#1E293B').text(
        `We are pleased to formally confirm that the admission application submitted for ${model.learner.fullName} to ${model.school.name} for Grade ${model.learner.grade} (${model.learner.academicYear} Academic Year) has been APPROVED by School Administration.`,
        { lineGap: 3 }
      );
      doc.moveDown(0.9);

      // Summary Box
      const boxY = doc.y;
      const rows = [
        ['Learner Full Name', model.learner.fullName],
        ['Application Reference', model.applicationNumber || model.referenceNumber],
        ['Accepting School', model.school.name],
        ['Approved Grade', `Grade ${model.learner.grade}`],
        ['Academic Year', String(model.learner.academicYear)],
        ['Class Allocation', model.classAllocation.className],
        ['Assigned Class Teacher', model.classAllocation.classTeacherName]
      ];
      if (model.learner.learnerNumber) {
        rows.splice(1, 0, ['Official Learner Number', model.learner.learnerNumber]);
      }
      if (model.learner.stream) {
        const insertAt = model.learner.learnerNumber ? 6 : 5;
        rows.splice(insertAt, 0, ['Academic Stream (Applied)', model.learner.stream]);
      }

      const rowHeight = 20;
      const boxHeight = rows.length * rowHeight + 22;
      doc.save();
      doc.roundedRect(startX, boxY, pageWidth, boxHeight, 6).fill('#F8FAFC').stroke('#CBD5E1');
      doc.restore();

      let currentY = boxY + 12;
      for (const [label, value] of rows) {
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#475569')
          .text(`${label}:`, startX + 14, currentY, { width: 165 });
        doc.font('Helvetica').fontSize(9.5).fillColor('#0F172A')
          .text(String(value), startX + 185, currentY, { width: pageWidth - 199 });
        currentY += rowHeight;
      }

      doc.y = boxY + boxHeight + 16;

      // Next Steps section
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#0F4C81')
        .text('MANDATORY NEXT STEP: COMPLETE INTEGRATED LEARNER REGISTRATION');
      doc.moveDown(0.4);
      doc.font('Helvetica').fontSize(10).fillColor('#1E293B').text(
        'Admission approval reserves a provisional place. To activate learner enrollment, subject allocation, and class register placement, please complete registration inside your Geleza SA dashboard:',
        { lineGap: 2.5 }
      );
      doc.moveDown(0.5);

      model.nextSteps.forEach((step, idx) => {
        doc.font('Helvetica').fontSize(9.8).fillColor('#334155')
          .text(`${idx + 1}. ${step}`, startX + 10, doc.y, {
            width: pageWidth - 10,
            lineGap: 2.5
          });
        doc.moveDown(0.35);
      });

      doc.moveDown(0.8);
      doc.font('Helvetica-Oblique').fontSize(9).fillColor('#64748B').text(
        'Important: A learner may only hold one active school registration per academic year. If the learner is currently registered at another school on Geleza SA, formal deregistration must be approved by the previous school before registration can be finalized here.',
        { lineGap: 2 }
      );

      doc.moveDown(1.8);

      // Signature block
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#0F172A').text('Issued by School Administration');
      doc.font('Helvetica').fontSize(9.5).fillColor('#475569').text(model.school.name);
      doc.font('Helvetica').fontSize(8.5).fillColor('#94A3B8').text(
        `Electronically issued via Geleza SA Integrated Admissions • Ref ${model.referenceNumber}`
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generateAcceptanceLetterPdf
};
