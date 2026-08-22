const fs = require('fs');
const path = require('path');
const db = require('../db/db');

const OUTPUT_DIR = path.join(__dirname, '..', 'uploads', 'textbooks');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Complete subject matrix across all grades
const allSubjectPapers = [
  // =========================================================================
  // GRADE 10
  // =========================================================================
  { grade: 10, subject: 'Accounting', title: 'Grade 10 Accounting Paper 1 Financial Accounting Question Paper', file_name: 'Grade_10_Accounting_P1_Exam.pdf', term: 'Term 4 / Final Exam', year: 2024, type: 'past_paper' },
  { grade: 10, subject: 'Accounting', title: 'Grade 10 Accounting Paper 1 Financial Accounting Memo & Marking Guideline', file_name: 'Grade_10_Accounting_P1_Memo.pdf', term: 'Memorandum / Marking Guideline', year: 2024, type: 'exam_memo' },
  { grade: 10, subject: 'Business Studies', title: 'Grade 10 Business Studies Paper 1 Business Environments & Operations', file_name: 'Grade_10_Business_Studies_P1_Exam.pdf', term: 'Term 4 / Final Exam', year: 2024, type: 'past_paper' },
  { grade: 10, subject: 'Business Studies', title: 'Grade 10 Business Studies Paper 1 Marking Guideline & Memo', file_name: 'Grade_10_Business_Studies_P1_Memo.pdf', term: 'Memorandum / Marking Guideline', year: 2024, type: 'exam_memo' },
  { grade: 10, subject: 'Economics', title: 'Grade 10 Economics Paper 1 Macroeconomics & Microeconomics Question Paper', file_name: 'Grade_10_Economics_P1_Exam.pdf', term: 'Term 4 / Final Exam', year: 2024, type: 'past_paper' },
  { grade: 10, subject: 'Economics', title: 'Grade 10 Economics Paper 1 Macroeconomics Memo', file_name: 'Grade_10_Economics_P1_Memo.pdf', term: 'Memorandum / Marking Guideline', year: 2024, type: 'exam_memo' },
  { grade: 10, subject: 'Life Sciences', title: 'Grade 10 Life Sciences Paper 1 Cells, Genetics & Tissues Question Paper', file_name: 'Grade_10_Life_Sciences_P1_Exam.pdf', term: 'Term 4 / Final Exam', year: 2024, type: 'past_paper' },
  { grade: 10, subject: 'Life Sciences', title: 'Grade 10 Life Sciences Paper 1 Memo & Marking Guideline', file_name: 'Grade_10_Life_Sciences_P1_Memo.pdf', term: 'Memorandum / Marking Guideline', year: 2024, type: 'exam_memo' },
  { grade: 10, subject: 'Life Sciences', title: 'Grade 10 Life Sciences Paper 2 Environmental Studies & Diversity Paper', file_name: 'Grade_10_Life_Sciences_P2_Exam.pdf', term: 'Term 4 / Final Exam', year: 2024, type: 'past_paper' },
  { grade: 10, subject: 'Life Sciences', title: 'Grade 10 Life Sciences Paper 2 Memo & Solution Guide', file_name: 'Grade_10_Life_Sciences_P2_Memo.pdf', term: 'Memorandum / Marking Guideline', year: 2024, type: 'exam_memo' },
  { grade: 10, subject: 'Mathematical Literacy', title: 'Grade 10 Mathematical Literacy Paper 1 Finance & Measurement', file_name: 'Grade_10_Maths_Literacy_P1_Exam.pdf', term: 'Term 4 / Final Exam', year: 2024, type: 'past_paper' },
  { grade: 10, subject: 'Mathematical Literacy', title: 'Grade 10 Mathematical Literacy Paper 1 Memo', file_name: 'Grade_10_Maths_Literacy_P1_Memo.pdf', term: 'Memorandum / Marking Guideline', year: 2024, type: 'exam_memo' },
  { grade: 10, subject: 'Mathematical Literacy', title: 'Grade 10 Mathematical Literacy Paper 2 Maps, Plans & Data Handling', file_name: 'Grade_10_Maths_Literacy_P2_Exam.pdf', term: 'Term 4 / Final Exam', year: 2024, type: 'past_paper' },
  { grade: 10, subject: 'Mathematical Literacy', title: 'Grade 10 Mathematical Literacy Paper 2 Memo', file_name: 'Grade_10_Maths_Literacy_P2_Memo.pdf', term: 'Memorandum / Marking Guideline', year: 2024, type: 'exam_memo' },
  { grade: 10, subject: 'Geography', title: 'Grade 10 Geography Paper 1 Climate, Weather & Geomorphology Paper', file_name: 'Grade_10_Geography_P1_Exam.pdf', term: 'Term 4 / Final Exam', year: 2024, type: 'past_paper' },
  { grade: 10, subject: 'Geography', title: 'Grade 10 Geography Paper 1 Memo & Mapwork', file_name: 'Grade_10_Geography_P1_Memo.pdf', term: 'Memorandum / Marking Guideline', year: 2024, type: 'exam_memo' },
  { grade: 10, subject: 'History', title: 'Grade 10 History Paper 1 Source-Based & Essay Question Paper', file_name: 'Grade_10_History_P1_Exam.pdf', term: 'Term 4 / Final Exam', year: 2024, type: 'past_paper' },
  { grade: 10, subject: 'History', title: 'Grade 10 History Paper 1 Memo & Marking Matrix', file_name: 'Grade_10_History_P1_Memo.pdf', term: 'Memorandum / Marking Guideline', year: 2024, type: 'exam_memo' },
  { grade: 10, subject: 'Tourism', title: 'Grade 10 Tourism National CAPS Exemplar Examination Paper', file_name: 'Grade_10_Tourism_Exam.pdf', term: 'Term 4 / Final Exam', year: 2024, type: 'past_paper' },
  { grade: 10, subject: 'Tourism', title: 'Grade 10 Tourism Examination Marking Guideline & Memo', file_name: 'Grade_10_Tourism_Memo.pdf', term: 'Memorandum / Marking Guideline', year: 2024, type: 'exam_memo' },
  { grade: 10, subject: 'Life Orientation', title: 'Grade 10 Life Orientation Common Assessment Task Exam', file_name: 'Grade_10_Life_Orientation_Exam.pdf', term: 'Common Assessment Task', year: 2024, type: 'past_paper' },
  { grade: 10, subject: 'Home Language', title: 'Grade 10 Home Language Paper 1 Comprehension, Summary & Language', file_name: 'Grade_10_Home_Language_P1_Exam.pdf', term: 'Term 4 / Final Exam', year: 2024, type: 'past_paper' },
  { grade: 10, subject: 'Home Language', title: 'Grade 10 Home Language Paper 1 Memo & Marking Guideline', file_name: 'Grade_10_Home_Language_P1_Memo.pdf', term: 'Memorandum / Marking Guideline', year: 2024, type: 'exam_memo' },
  { grade: 10, subject: 'Home Language', title: 'Grade 10 Home Language Paper 2 Literature & Poetry Question Paper', file_name: 'Grade_10_Home_Language_P2_Exam.pdf', term: 'Term 4 / Final Exam', year: 2024, type: 'past_paper' },
  { grade: 10, subject: 'Home Language', title: 'Grade 10 Home Language Paper 2 Literature Memo', file_name: 'Grade_10_Home_Language_P2_Memo.pdf', term: 'Memorandum / Marking Guideline', year: 2024, type: 'exam_memo' },

  // =========================================================================
  // GRADE 11
  // =========================================================================
  { grade: 11, subject: 'Accounting', title: 'Grade 11 Accounting Paper 1 Financial Accounting Question Paper', file_name: 'Grade_11_Accounting_P1_Exam.pdf', term: 'Term 4 / Final Exam', year: 2024, type: 'past_paper' },
  { grade: 11, subject: 'Accounting', title: 'Grade 11 Accounting Paper 1 Financial Accounting Memo', file_name: 'Grade_11_Accounting_P1_Memo.pdf', term: 'Memorandum / Marking Guideline', year: 2024, type: 'exam_memo' },
  { grade: 11, subject: 'Business Studies', title: 'Grade 11 Business Studies Paper 1 Question Paper', file_name: 'Grade_11_Business_Studies_P1_Exam.pdf', term: 'Term 4 / Final Exam', year: 2024, type: 'past_paper' },
  { grade: 11, subject: 'Business Studies', title: 'Grade 11 Business Studies Paper 1 Memo', file_name: 'Grade_11_Business_Studies_P1_Memo.pdf', term: 'Memorandum / Marking Guideline', year: 2024, type: 'exam_memo' },
  { grade: 11, subject: 'Economics', title: 'Grade 11 Economics Paper 1 Macroeconomics Question Paper', file_name: 'Grade_11_Economics_P1_Exam.pdf', term: 'Term 4 / Final Exam', year: 2024, type: 'past_paper' },
  { grade: 11, subject: 'Economics', title: 'Grade 11 Economics Paper 1 Memo', file_name: 'Grade_11_Economics_P1_Memo.pdf', term: 'Memorandum / Marking Guideline', year: 2024, type: 'exam_memo' },
  { grade: 11, subject: 'Life Sciences', title: 'Grade 11 Life Sciences Paper 1 Photosynthesis & Respiration Question Paper', file_name: 'Grade_11_Life_Sciences_P1_Exam.pdf', term: 'Term 4 / Final Exam', year: 2024, type: 'past_paper' },
  { grade: 11, subject: 'Life Sciences', title: 'Grade 11 Life Sciences Paper 1 Memo', file_name: 'Grade_11_Life_Sciences_P1_Memo.pdf', term: 'Memorandum / Marking Guideline', year: 2024, type: 'exam_memo' },
  { grade: 11, subject: 'Life Sciences', title: 'Grade 11 Life Sciences Paper 2 Population Ecology & Human Impact Paper', file_name: 'Grade_11_Life_Sciences_P2_Exam.pdf', term: 'Term 4 / Final Exam', year: 2024, type: 'past_paper' },
  { grade: 11, subject: 'Life Sciences', title: 'Grade 11 Life Sciences Paper 2 Memo', file_name: 'Grade_11_Life_Sciences_P2_Memo.pdf', term: 'Memorandum / Marking Guideline', year: 2024, type: 'exam_memo' },
  { grade: 11, subject: 'Mathematical Literacy', title: 'Grade 11 Mathematical Literacy Paper 1 Finance & Measurement', file_name: 'Grade_11_Maths_Literacy_P1_Exam.pdf', term: 'Term 4 / Final Exam', year: 2024, type: 'past_paper' },
  { grade: 11, subject: 'Mathematical Literacy', title: 'Grade 11 Mathematical Literacy Paper 1 Memo', file_name: 'Grade_11_Maths_Literacy_P1_Memo.pdf', term: 'Memorandum / Marking Guideline', year: 2024, type: 'exam_memo' },
  { grade: 11, subject: 'Mathematical Literacy', title: 'Grade 11 Mathematical Literacy Paper 2 Maps, Plans & Statistics', file_name: 'Grade_11_Maths_Literacy_P2_Exam.pdf', term: 'Term 4 / Final Exam', year: 2024, type: 'past_paper' },
  { grade: 11, subject: 'Mathematical Literacy', title: 'Grade 11 Mathematical Literacy Paper 2 Memo', file_name: 'Grade_11_Maths_Literacy_P2_Memo.pdf', term: 'Memorandum / Marking Guideline', year: 2024, type: 'exam_memo' },
  { grade: 11, subject: 'Geography', title: 'Grade 11 Geography Paper 1 Examination Paper & Mapwork', file_name: 'Grade_11_Geography_P1_Exam.pdf', term: 'Term 4 / Final Exam', year: 2024, type: 'past_paper' },
  { grade: 11, subject: 'Geography', title: 'Grade 11 Geography Paper 1 Memo', file_name: 'Grade_11_Geography_P1_Memo.pdf', term: 'Memorandum / Marking Guideline', year: 2024, type: 'exam_memo' },
  { grade: 11, subject: 'History', title: 'Grade 11 History Paper 1 Examination Question Paper', file_name: 'Grade_11_History_P1_Exam.pdf', term: 'Term 4 / Final Exam', year: 2024, type: 'past_paper' },
  { grade: 11, subject: 'Tourism', title: 'Grade 11 Tourism National CAPS Examination Question Paper & Memo', file_name: 'Grade_11_Tourism_Exam.pdf', term: 'Term 4 / Final Exam', year: 2024, type: 'past_paper' },
  { grade: 11, subject: 'Life Orientation', title: 'Grade 11 Life Orientation Common Assessment Task Exam', file_name: 'Grade_11_Life_Orientation_Exam.pdf', term: 'Common Assessment Task', year: 2024, type: 'past_paper' },
  { grade: 11, subject: 'Home Language', title: 'Grade 11 Home Language Paper 1 Language & Comprehension Paper', file_name: 'Grade_11_Home_Language_P1_Exam.pdf', term: 'Term 4 / Final Exam', year: 2024, type: 'past_paper' },
  { grade: 11, subject: 'Home Language', title: 'Grade 11 Home Language Paper 1 Memo', file_name: 'Grade_11_Home_Language_P1_Memo.pdf', term: 'Memorandum / Marking Guideline', year: 2024, type: 'exam_memo' },

  // =========================================================================
  // GRADE 8 & 9 (Senior Phase)
  // =========================================================================
  { grade: 8, subject: 'Mathematics', title: 'Grade 8 Mathematics Mid-Year & Final Exam Exemplar Papers', file_name: 'Grade_8_Mathematics_Exemplar_Exam.pdf', term: 'Term 4 / Final Exam', year: 2024, type: 'past_paper' },
  { grade: 8, subject: 'Mathematics', title: 'Grade 8 Mathematics Final Exam Marking Memo & Step-by-Step Solutions', file_name: 'Grade_8_Mathematics_Memo.pdf', term: 'Memorandum / Marking Guideline', year: 2024, type: 'exam_memo' },
  { grade: 8, subject: 'Natural Sciences', title: 'Grade 8 Natural Sciences Term 4 Exam Question Paper', file_name: 'Grade_8_Natural_Sciences_Exam.pdf', term: 'Term 4 / Final Exam', year: 2024, type: 'past_paper' },
  { grade: 8, subject: 'Natural Sciences', title: 'Grade 8 Natural Sciences Examination Memo & Marking Guideline', file_name: 'Grade_8_Natural_Sciences_Memo.pdf', term: 'Memorandum / Marking Guideline', year: 2024, type: 'exam_memo' },
  { grade: 8, subject: 'EMS', title: 'Grade 8 Economic Management Sciences Final Exam Paper', file_name: 'Grade_8_EMS_Exam.pdf', term: 'Term 4 / Final Exam', year: 2024, type: 'past_paper' },
  { grade: 8, subject: 'EMS', title: 'Grade 8 Economic Management Sciences Examination Memo', file_name: 'Grade_8_EMS_Memo.pdf', term: 'Memorandum / Marking Guideline', year: 2024, type: 'exam_memo' },
  { grade: 8, subject: 'Social Sciences', title: 'Grade 8 Social Sciences Geography & History Paper', file_name: 'Grade_8_Social_Sciences_Exam.pdf', term: 'Term 4 / Final Exam', year: 2024, type: 'past_paper' },
  { grade: 8, subject: 'Social Sciences', title: 'Grade 8 Social Sciences Examination Memo', file_name: 'Grade_8_Social_Sciences_Memo.pdf', term: 'Memorandum / Marking Guideline', year: 2024, type: 'exam_memo' },
  { grade: 8, subject: 'Technology', title: 'Grade 8 Technology Examination Question Paper', file_name: 'Grade_8_Technology_Exam.pdf', term: 'Term 4 / Final Exam', year: 2024, type: 'past_paper' },
  { grade: 8, subject: 'Technology', title: 'Grade 8 Technology Examination Memo', file_name: 'Grade_8_Technology_Memo.pdf', term: 'Memorandum / Marking Guideline', year: 2024, type: 'exam_memo' },
  { grade: 8, subject: 'English FAL', title: 'Grade 8 English First Additional Language Comprehension & Language Paper', file_name: 'Grade_8_English_FAL_Exam.pdf', term: 'Term 4 / Final Exam', year: 2024, type: 'past_paper' },
  { grade: 8, subject: 'English FAL', title: 'Grade 8 English First Additional Language Examination Memo', file_name: 'Grade_8_English_FAL_Memo.pdf', term: 'Memorandum / Marking Guideline', year: 2024, type: 'exam_memo' },

  { grade: 9, subject: 'Mathematics', title: 'Grade 9 Mathematics Final Provincial Assessment Paper', file_name: 'Grade_9_Mathematics_Exam.pdf', term: 'Term 4 / Final Exam', year: 2024, type: 'past_paper' },
  { grade: 9, subject: 'Mathematics', title: 'Grade 9 Mathematics Provincial Assessment Memo & Solutions', file_name: 'Grade_9_Mathematics_Memo.pdf', term: 'Memorandum / Marking Guideline', year: 2024, type: 'exam_memo' },
  { grade: 9, subject: 'Natural Sciences', title: 'Grade 9 Natural Sciences Senior Phase Examination Paper', file_name: 'Grade_9_Natural_Sciences_Exam.pdf', term: 'Term 4 / Final Exam', year: 2024, type: 'past_paper' },
  { grade: 9, subject: 'Natural Sciences', title: 'Grade 9 Natural Sciences Examination Memo & Marking Guideline', file_name: 'Grade_9_Natural_Sciences_Memo.pdf', term: 'Memorandum / Marking Guideline', year: 2024, type: 'exam_memo' },
  { grade: 9, subject: 'EMS', title: 'Grade 9 Economic Management Sciences Accounting & Business Paper', file_name: 'Grade_9_EMS_Exam.pdf', term: 'Term 4 / Final Exam', year: 2024, type: 'past_paper' },
  { grade: 9, subject: 'EMS', title: 'Grade 9 Economic Management Sciences Marking Memo', file_name: 'Grade_9_EMS_Memo.pdf', term: 'Memorandum / Marking Guideline', year: 2024, type: 'exam_memo' },
  { grade: 9, subject: 'Social Sciences', title: 'Grade 9 Social Sciences Final Exam Paper', file_name: 'Grade_9_Social_Sciences_Exam.pdf', term: 'Term 4 / Final Exam', year: 2024, type: 'past_paper' },
  { grade: 9, subject: 'Social Sciences', title: 'Grade 9 Social Sciences Examination Memo', file_name: 'Grade_9_Social_Sciences_Memo.pdf', term: 'Memorandum / Marking Guideline', year: 2024, type: 'exam_memo' },
  { grade: 9, subject: 'Technology', title: 'Grade 9 Technology Examination Question Paper & Memo', file_name: 'Grade_9_Technology_Exam.pdf', term: 'Term 4 / Final Exam', year: 2024, type: 'past_paper' },
  { grade: 9, subject: 'English FAL', title: 'Grade 9 English First Additional Language Final Exam Paper', file_name: 'Grade_9_English_FAL_Exam.pdf', term: 'Term 4 / Final Exam', year: 2024, type: 'past_paper' }
];

async function seed() {
  console.log('Seeding complete CAPS past exam papers and memos across all subjects & grades...');

  for (const item of allSubjectPapers) {
    const localPath = path.join(OUTPUT_DIR, item.file_name);
    const webFilePath = `/uploads/textbooks/${item.file_name}`;

    if (!fs.existsSync(localPath)) {
      fs.writeFileSync(
        localPath,
        `%PDF-1.4\n% DEPARTMENT OF BASIC EDUCATION - SOUTH AFRICA\n% CAPS Grade ${item.grade} ${item.subject} Past Exam Paper\n% Title: ${item.title}\n`
      );
    }

    const resType = item.type || 'past_paper';
    const existing = await db.query(
      `SELECT id FROM textbooks WHERE grade = $1 AND subject = $2 AND title = $3`,
      [item.grade, item.subject, item.title]
    );

    if (existing.rows.length === 0) {
      await db.query(`
        INSERT INTO textbooks (
          grade, subject, title, resource_type, description, 
          term, year, stream, file_path, file_name, file_size
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        item.grade,
        item.subject,
        item.title,
        resType,
        `Official DBE CAPS Examination Paper & Resource for Grade ${item.grade} ${item.subject}.`,
        item.term,
        item.year,
        'General',
        webFilePath,
        item.file_name,
        '1.25 MB'
      ]);
    } else {
      await db.query(`
        UPDATE textbooks 
        SET file_path = $1, file_name = $2, resource_type = $3, term = $4, year = $5, description = $6
        WHERE id = $7
      `, [
        webFilePath,
        item.file_name,
        resType,
        item.term,
        item.year,
        `Official DBE CAPS Examination Paper & Resource for Grade ${item.grade} ${item.subject}.`,
        existing.rows[0].id
      ]);
    }
  }

  console.log('Done seeding all subject papers!');
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
