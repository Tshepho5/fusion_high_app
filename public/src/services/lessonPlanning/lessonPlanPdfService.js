const PDFDocument = require('pdfkit');

function line(doc, text, options = {}) {
  doc.fontSize(options.size || 10).fillColor(options.color || '#111111');
  doc.text(text || '—', options.x || 48, options.y, {
    width: options.width || 499,
    align: options.align || 'left'
  });
}

function sectionTitle(doc, title) {
  if (doc.y > 740) doc.addPage();
  doc.moveDown(0.6);
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#111111').text(title, 48, doc.y, { width: 499 });
  doc.moveDown(0.2);
  doc.moveTo(48, doc.y).lineTo(547, doc.y).strokeColor('#222222').stroke();
  doc.moveDown(0.4);
  doc.font('Helvetica');
}

function paragraph(doc, text) {
  const body = text && String(text).trim() ? String(text).trim() : '—';
  if (doc.y > 760) doc.addPage();
  doc.font('Helvetica').fontSize(10).fillColor('#222222').text(body, 48, doc.y, { width: 499 });
  doc.moveDown(0.3);
}

function bullet(doc, text) {
  if (doc.y > 760) doc.addPage();
  doc.font('Helvetica').fontSize(10).fillColor('#222222').text(`• ${text}`, 56, doc.y, { width: 491 });
  doc.moveDown(0.15);
}

function drawStageTable(doc, stages) {
  const columns = [
    { key: 'stage', label: 'Stage', width: 90 },
    { key: 'duration', label: 'Time', width: 48 },
    { key: 'teacher', label: "Teacher's activities", width: 180 },
    { key: 'learner', label: "Learners' activities", width: 181 }
  ];
  const x0 = 48;

  const drawHeader = () => {
    if (doc.y > 760) doc.addPage();
    const y = doc.y;
    let x = x0;
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#111111');
    columns.forEach((column) => {
      doc.text(column.label, x + 3, y + 4, { width: column.width - 6 });
      x += column.width;
    });
    const headerBottom = y + 22;
    doc.moveTo(x0, headerBottom).lineTo(x0 + 499, headerBottom).strokeColor('#222222').stroke();
    doc.y = headerBottom + 4;
  };

  drawHeader();
  const rows = stages.length ? stages : [{ stage_name: '—', duration_minutes: '', teacher_activities: '', learner_activities: '' }];
  rows.forEach((stage) => {
    const cells = [
      stage.stage_name || '—',
      stage.duration_minutes ? `${stage.duration_minutes} min` : '—',
      stage.teacher_activities || '—',
      stage.learner_activities || '—'
    ];
    doc.font('Helvetica').fontSize(8);
    const heights = cells.map((cell, index) => doc.heightOfString(String(cell), { width: columns[index].width - 6 }));
    const rowHeight = Math.max(18, ...heights) + 8;
    if (doc.y + rowHeight > 790) {
      doc.addPage();
      drawHeader();
    }
    const y = doc.y;
    let x = x0;
    cells.forEach((cell, index) => {
      doc.fillColor('#222222').text(String(cell), x + 3, y, { width: columns[index].width - 6 });
      x += columns[index].width;
    });
    const bottom = y + rowHeight;
    doc.moveTo(x0, bottom).lineTo(x0 + 499, bottom).strokeColor('#CCCCCC').stroke();
    doc.y = bottom + 4;
  });
}

function renderLessonPlanPdf(plan) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const school = plan.school_name || 'Registered school';
    const teacher = [plan.teacher_first_name, plan.teacher_surname].filter(Boolean).join(' ') || 'Teacher';
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#111111').text(school, 48, 48, { width: 499 });
    doc.font('Helvetica').fontSize(9).fillColor('#333333');
    const address = [plan.physical_address, plan.contact_phone, plan.contact_email, plan.emis_number ? `EMIS ${plan.emis_number}` : null]
      .filter(Boolean)
      .join('  ·  ');
    if (address) doc.text(address, 48, doc.y + 2, { width: 499 });
    doc.moveDown(0.4);
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#111111').text('Lesson plan', 48, doc.y, { width: 499 });
    doc.moveDown(0.4);

    const facts = [
      ['Teacher', teacher],
      ['Subject', plan.subject_name],
      ['Grade', plan.grade != null ? String(plan.grade) : ''],
      ['Class', plan.class_name || ''],
      ['Academic year', plan.academic_year != null ? String(plan.academic_year) : ''],
      ['Term', plan.term != null ? String(plan.term) : ''],
      ['Date', plan.scheduled_date || ''],
      ['Duration', plan.duration_minutes ? `${plan.duration_minutes} minutes` : ''],
      ['Topic', plan.topic || ''],
      ['Sub-topic', plan.sub_topic || ''],
      ['Status', plan.status || 'draft']
    ];
    facts.forEach(([label, value]) => {
      doc.font('Helvetica-Bold').fontSize(10).text(`${label}: `, 48, doc.y, { continued: true, width: 499 });
      doc.font('Helvetica').text(value || '—');
    });

    sectionTitle(doc, 'Instructional objectives');
    paragraph(doc, 'By the end of the lesson, learners should be able to:');
    (plan.objectives || []).forEach((item, index) => bullet(doc, `${index + 1}. ${item.objective}`));
    if (!(plan.objectives || []).length) paragraph(doc, '');

    sectionTitle(doc, 'Previous knowledge');
    paragraph(doc, plan.previous_knowledge);

    sectionTitle(doc, 'Instructional materials');
    if ((plan.materials || []).length) {
      plan.materials.forEach((item) => bullet(doc, item.description ? `${item.material_name} — ${item.description}` : item.material_name));
    } else paragraph(doc, '');

    sectionTitle(doc, 'Teaching methods');
    if ((plan.methods || []).length) plan.methods.forEach((item) => bullet(doc, item.method_name));
    else paragraph(doc, '');

    sectionTitle(doc, 'Reference materials');
    if ((plan.references || []).length) {
      plan.references.forEach((item) => {
        const parts = [item.reference_title, item.author, item.reference_type].filter(Boolean);
        bullet(doc, parts.join(' · '));
      });
    } else paragraph(doc, '');

    sectionTitle(doc, 'Lesson presentation');
    drawStageTable(doc, plan.stages || []);
    const allocated = (plan.stages || []).reduce((sum, stage) => sum + (Number(stage.duration_minutes) || 0), 0);
    doc.moveDown(0.3);
    paragraph(doc, `Allocated presentation time: ${allocated} minutes.`);

    sectionTitle(doc, 'Evaluation');
    if ((plan.evaluations || []).length) {
      plan.evaluations.forEach((item, index) => bullet(doc, `${index + 1}. [${item.question_type || 'question'}] ${item.question}`));
    } else paragraph(doc, '');

    sectionTitle(doc, 'Assignment');
    if ((plan.assignments || []).length) {
      plan.assignments.forEach((item) => {
        paragraph(doc, item.title || 'Assignment');
        paragraph(doc, item.assignment_content);
        if (item.homework_assignment_id) paragraph(doc, `Linked homework record #${item.homework_assignment_id}`);
      });
    } else paragraph(doc, '');

    sectionTitle(doc, "Teacher's reflection");
    const reflection = plan.reflection;
    if (!reflection) {
      paragraph(doc, 'Not completed.');
    } else {
      const flag = reflection.objectives_achieved_flag;
      paragraph(doc, `Were the lesson objectives achieved? ${flag === true ? 'Yes, as recorded by the teacher.' : flag === false ? 'No, as recorded by the teacher.' : 'Not recorded.'}`);
      paragraph(doc, reflection.objectives_achieved ? `Teacher note: ${reflection.objectives_achieved}` : '');
      paragraph(doc, reflection.what_went_well ? `What went well: ${reflection.what_went_well}` : 'What went well: —');
      paragraph(doc, reflection.challenges ? `Difficulties: ${reflection.challenges}` : 'Difficulties: —');
      paragraph(doc, reflection.learners_needing_support ? `Learners or concepts needing support: ${reflection.learners_needing_support}` : 'Learners or concepts needing support: —');
      paragraph(doc, reflection.areas_for_improvement ? `What needs improvement: ${reflection.areas_for_improvement}` : 'What needs improvement: —');
      paragraph(doc, reflection.recommendations ? `Recommendations for the next lesson: ${reflection.recommendations}` : 'Recommendations for the next lesson: —');
    }

    doc.end();
  });
}

module.exports = { renderLessonPlanPdf, line };
