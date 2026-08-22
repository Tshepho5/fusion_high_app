const fs = require('fs');
const path = require('path');
const db = require('../db/db');

function parseFileName(f) {
  const clean = f.replace(/[_-]+/g, ' ').replace(/\.pdf$/i, '').trim();

  // 1. Grade detection
  let grade = null;
  const gradeMatch = clean.match(/\b(?:gr|grade)\s*(\d{1,2})\b/i) || f.match(/Gr(\d{1,2})/i);
  if (gradeMatch) {
    const g = parseInt(gradeMatch[1], 10);
    if ([10, 11, 12].includes(g)) grade = g;
  }
  if (!grade) {
    grade = 12; // Matric standard default
  }

  // 2. Year detection
  const yearMatch = clean.match(/\b(201[4-9]|202[0-6])\b/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : 2024;

  // 3. Resource Type & Paper Number detection
  let resourceType = 'past_paper';
  if (/\b(?:memo|memorandum|marking guideline|antwoorde|antwoordeboek)\b/i.test(clean)) {
    resourceType = 'exam_memo';
  } else if (/\b(?:learner book|textbook|handboek)\b/i.test(clean)) {
    resourceType = 'textbook';
  } else if (/\b(?:study guide|guide|studiegids)\b/i.test(clean)) {
    resourceType = 'study_guide';
  } else if (/\b(?:practice|worksheet|vraestel|oefening)\b/i.test(clean)) {
    resourceType = 'worksheet';
  }

  let paperNumber = '';
  const paperMatch = clean.match(/\b(?:paper|p|vraestel|memo)\s*([123])\b/i);
  if (paperMatch) {
    paperNumber = `Paper ${paperMatch[1]}`;
  }

  // 4. Subject & Stream detection
  let subject = 'General Resource';
  let stream = 'General';

  if (/\b(?:mathematical literacy|maths lit|wiskundige geletterdheid)\b/i.test(clean)) {
    subject = 'Mathematical Literacy';
    stream = 'General';
  } else if (/\b(?:mathematics|maths|wiskunde)\b/i.test(clean)) {
    subject = 'Mathematics';
    stream = 'Science';
  } else if (/\b(?:physical sciences|physical science|physics|chemistry|fisiese wetenskappe)\b/i.test(clean)) {
    subject = 'Physical Sciences';
    stream = 'Science';
  } else if (/\b(?:life sciences|life science|biology|lewenswetenskappe)\b/i.test(clean)) {
    subject = 'Life Sciences';
    stream = 'Science';
  } else if (/\b(?:accounting|rekeningkunde)\b/i.test(clean)) {
    subject = 'Accounting';
    stream = 'Commerce';
  } else if (/\b(?:business studies|besigheidstudies)\b/i.test(clean)) {
    subject = 'Business Studies';
    stream = 'Commerce';
  } else if (/\b(?:economics|ekonomie)\b/i.test(clean)) {
    subject = 'Economics';
    stream = 'Commerce';
  } else if (/\b(?:geography|geografie)\b/i.test(clean)) {
    subject = 'Geography';
    stream = 'Humanities';
  } else if (/\b(?:history|geskiedenis)\b/i.test(clean)) {
    subject = 'History';
    stream = 'Humanities';
  } else if (/\b(?:tourism|toerisme)\b/i.test(clean)) {
    subject = 'Tourism';
    stream = 'Humanities';
  } else if (/\b(?:computer applications technology|cat|rekenaartoepassingstegnologie)\b/i.test(clean)) {
    subject = 'Computer Applications Technology';
    stream = 'Commerce';
  } else if (/\b(?:information technology|it|inligtingstegnologie)\b/i.test(clean)) {
    subject = 'Information Technology';
    stream = 'Science';
  } else if (/\b(?:agricultural sciences|agricultural science|landbouwetenskappe)\b/i.test(clean)) {
    subject = 'Agricultural Sciences';
    stream = 'Science';
  } else if (/\b(?:life orientation|lewensorientering)\b/i.test(clean)) {
    subject = 'Life Orientation';
    stream = 'General';
  } else if (/\b(?:isindebele|ndebele)\b/i.test(clean)) {
    subject = 'isiNdebele';
    stream = 'General';
  } else if (/\b(?:siswati|swati)\b/i.test(clean)) {
    subject = 'Siswati';
    stream = 'General';
  } else if (/\b(?:tshivenda|venda)\b/i.test(clean)) {
    subject = 'Tshivenda';
    stream = 'General';
  } else if (/\b(?:xitsonga|tsonga)\b/i.test(clean)) {
    subject = 'Xitsonga';
    stream = 'General';
  } else if (/\b(?:sign language|sasl)\b/i.test(clean)) {
    subject = 'South African Sign Language';
    stream = 'General';
  } else if (/\b(?:sepedi)\b/i.test(clean)) {
    subject = 'Sepedi';
    stream = 'General';
  } else if (/\b(?:isizulu|zulu)\b/i.test(clean)) {
    subject = 'isiZulu';
    stream = 'General';
  } else if (/\b(?:isixhosa|xhosa)\b/i.test(clean)) {
    subject = 'isiXhosa';
    stream = 'General';
  } else if (/\b(?:setswana)\b/i.test(clean)) {
    subject = 'Setswana';
    stream = 'General';
  } else if (/\b(?:sesotho)\b/i.test(clean)) {
    subject = 'Sesotho';
    stream = 'General';
  } else if (/\b(?:english)\b/i.test(clean) && !/\b(?:afrikaans and english|english and afrikaans)\b/i.test(clean)) {
    subject = 'English FAL';
    stream = 'General';
  } else if (/\b(?:afrikaans)\b/i.test(clean) && !/\b(?:afrikaans and english|english and afrikaans)\b/i.test(clean)) {
    subject = 'Afrikaans';
    stream = 'General';
  }

  // 5. Clean Title & Description
  const typeLabel = resourceType === 'exam_memo' ? 'Memorandum & Marking Guide' :
                    resourceType === 'textbook' ? 'CAPS Textbook' :
                    resourceType === 'study_guide' ? 'Study Guide & Revision Notes' :
                    'Official Past Exam Question Paper';

  const title = `${subject} Grade ${grade} (${year}) ${paperNumber ? paperNumber + ' ' : ''}${typeLabel}`.trim();
  const description = `Official CAPS Department of Basic Education ${typeLabel} for ${subject} Grade ${grade} (${year}).`;

  // 6. Term detection
  let term = 'Term 4';
  if (/\b(?:november|nov|final)\b/i.test(clean)) term = 'Term 4';
  else if (/\b(?:september|sep|prelim|trial)\b/i.test(clean)) term = 'Term 3';
  else if (/\b(?:june|jun|mid[ -]?year)\b/i.test(clean)) term = 'Term 2';
  else if (/\b(?:march|mar|exemplar)\b/i.test(clean)) term = 'Term 1';

  return {
    subject,
    grade,
    stream,
    year,
    term,
    resourceType,
    paperNumber,
    title,
    description,
    fileName: f,
    filePath: `/uploads/textbooks/${f}`
  };
}

async function distributePastPapers() {
  const dir = path.join(__dirname, '..', 'uploads', 'textbooks');
  const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.pdf'));

  console.log(`\n======================================================`);
  console.log(`  FUSION HIGH - PAST PAPERS & RESOURCES DISTRIBUTION  `);
  console.log(`======================================================`);
  console.log(`Found ${files.length} past paper and textbook PDF files in storage.`);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const f of files) {
    const parsed = parseFileName(f);
    const fullPath = path.join(dir, f);
    const stats = fs.statSync(fullPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2) + ' MB';

    try {
      // Check if record exists by file_name or file_path
      const existing = await db.query(
        `SELECT id FROM textbooks WHERE file_name = $1 OR file_path LIKE $2 LIMIT 1`,
        [parsed.fileName, `%${parsed.fileName}%`]
      );

      if (existing.rows.length > 0) {
        await db.query(
          `UPDATE textbooks 
           SET subject = $1, grade = $2, stream = $3, resource_type = $4,
               title = $5, description = $6, term = $7, year = $8,
               file_path = $9, file_name = $10, file_size = $11, is_published = true
           WHERE id = $12`,
          [
            parsed.subject, parsed.grade, parsed.stream, parsed.resourceType,
            parsed.title, parsed.description, parsed.term, parsed.year,
            parsed.filePath, parsed.fileName, fileSizeMB, existing.rows[0].id
          ]
        );
        updated++;
      } else {
        await db.query(
          `INSERT INTO textbooks (
             subject, grade, stream, resource_type, title, description,
             term, year, file_path, file_name, file_size, teacher_id, is_published, upload_date
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 2, true, NOW())`,
          [
            parsed.subject, parsed.grade, parsed.stream, parsed.resourceType,
            parsed.title, parsed.description, parsed.term, parsed.year,
            parsed.filePath, parsed.fileName, fileSizeMB
          ]
        );
        inserted++;
      }
    } catch (err) {
      console.error(`Error processing ${f}:`, err.message);
      skipped++;
    }
  }

  console.log(`\nDistribution complete:`);
  console.log(` - Inserted new records: ${inserted}`);
  console.log(` - Updated existing records: ${updated}`);
  console.log(` - Skipped / Errors: ${skipped}`);

  // Print summary by Grade & Stream
  const summary = await db.query(`
    SELECT grade, stream, subject, resource_type, COUNT(*) as count 
    FROM textbooks 
    GROUP BY grade, stream, subject, resource_type 
    ORDER BY grade, stream, subject, resource_type;
  `);

  console.log(`\nTotal textbook and past paper records in database:`);
  const totalCount = await db.query(`SELECT COUNT(*) as total FROM textbooks;`);
  console.log(`Total active resources: ${totalCount.rows[0].total}`);

  process.exit(0);
}

distributePastPapers();
