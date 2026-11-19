const db = require('../../../db/db');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const { compareExtractedDocument } = require('../../../lib/admissionDocumentCheck');
const { validateSAID } = require('../controller/saIDvalidations');

const SCHOOL_MAX_CAPACITY = 500;
const CLASS_MAX_CAPACITY = 30;

/**
 * Generate Unique Application Reference Number with School Prefix
 * e.g., MTH-2026-84920 (Mountainview), MKG-2026-84920 (Makgoka), FHS-2026-84920 (Fusion)
 */
function generateApplicationNumber(schoolSlug = 'fusion-high') {
  const year = new Date().getFullYear();
  const randomDigits = Math.floor(10000 + Math.random() * 90000);
  const slug = String(schoolSlug).toLowerCase();
  let prefix = 'FHS';
  
  // Limpopo
  if (slug.includes('mountainview')) prefix = 'MTH';
  else if (slug.includes('makgoka')) prefix = 'MKG';
  else if (slug.includes('turfloop')) prefix = 'TRF';
  else if (slug.includes('hwiti')) prefix = 'HWT';
  else if (slug.includes('ngwana') || slug.includes('mohube')) prefix = 'NMH';
  
  // Gauteng (Lotus Gardens & Atteridgeville, Pretoria)
  else if (slug.includes('lotus') || slug.includes('fusion-secondary')) prefix = 'FSL';
  else if (slug.includes('saulridge')) prefix = 'SLR';
  else if (slug.includes('phelindaba')) prefix = 'PLD';
  else if (slug.includes('flavius') || slug.includes('mareka')) prefix = 'FVM';
  else if (slug.includes('nkomo') || slug.includes('wf-nkomo')) prefix = 'WFN';
  else if (slug.includes('hofmeyr')) prefix = 'HFM';

  return `${prefix}-${year}-${randomDigits}`;
}

/**
 * Generate Secure One-Time/Resumption Token
 */
function generateCorrectionToken() {
  return crypto.randomBytes(24).toString('hex');
}

/**
 * Generate Provisional Learner Number (e.g. 20250123, 20260001)
 * Format: <YEAR><4-DIGIT-SEQUENCE> (e.g. Applicant #123 in 2025 -> 20250123)
 */
async function generateProvisionalLearnerNumber(grade, year = new Date().getFullYear()) {
  const currentYear = year || new Date().getFullYear();
  const prefix = `${currentYear}`;
  try {
    const [appRes, childRes] = await Promise.all([
      db.query("SELECT provisional_learner_number FROM applications WHERE provisional_learner_number LIKE $1", [`${prefix}%`]),
      db.query("SELECT learner_number FROM children WHERE learner_number LIKE $1", [`${prefix}%`])
    ]);

    let maxSeq = 0;
    const allRows = [...(appRes.rows || []), ...(childRes.rows || [])];
    for (const row of allRows) {
      const val = row.provisional_learner_number || row.learner_number || '';
      const numStr = val.replace(/\D/g, '');
      if (numStr.startsWith(prefix) && numStr.length === prefix.length + 4) {
        const seq = parseInt(numStr.slice(prefix.length), 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }
    const nextSeq = maxSeq + 1;
    return `${prefix}${nextSeq.toString().padStart(4, '0')}`;
  } catch (e) {
    return `${currentYear}0001`;
  }
}

/**
 * Get Comprehensive School & Class Capacity Status
 */
async function getCapacityStatus() {
  try {
    // 1. Total active enrolled learners in school
    const enrolledRes = await db.query(`SELECT COUNT(*)::int as count FROM children`);
    const approvedAppsRes = await db.query(`
      SELECT COUNT(*)::int as count 
      FROM applications 
      WHERE status = 'approved'
    `);
    
    const enrolledCount = enrolledRes.rows[0]?.count || 0;
    const pendingApprovedCount = approvedAppsRes.rows[0]?.count || 0;
    const totalCurrentLearners = enrolledCount + pendingApprovedCount;
    const schoolRemainingSpace = Math.max(0, SCHOOL_MAX_CAPACITY - totalCurrentLearners);
    const isSchoolFull = totalCurrentLearners >= SCHOOL_MAX_CAPACITY;

    // 2. Class & Grade Breakdown
    const classesRes = await db.query(`
      SELECT 
        c.id, 
        c.name, 
        c.grade, 
        c.stream,
        (SELECT COUNT(*)::int FROM children ch WHERE ch.class_id = c.id) as enrolled_learners,
        (SELECT COUNT(*)::int FROM applications a WHERE a.assigned_class_id = c.id AND a.status = 'approved') as approved_applications
      FROM classes c
      ORDER BY c.grade ASC, c.name ASC
    `);

    const gradeBreakdown = {};
    for (let g = 8; g <= 12; g++) {
      gradeBreakdown[g] = {
        grade: g,
        totalLearners: 0,
        maxCapacity: 0,
        availableSpace: 0,
        classes: []
      };
    }

    classesRes.rows.forEach(cls => {
      const clsTotal = cls.enrolled_learners + cls.approved_applications;
      const clsAvailable = Math.max(0, CLASS_MAX_CAPACITY - clsTotal);
      const grade = cls.grade;

      if (!gradeBreakdown[grade]) {
        gradeBreakdown[grade] = {
          grade,
          totalLearners: 0,
          maxCapacity: 0,
          availableSpace: 0,
          classes: []
        };
      }

      gradeBreakdown[grade].totalLearners += clsTotal;
      gradeBreakdown[grade].maxCapacity += CLASS_MAX_CAPACITY;
      gradeBreakdown[grade].availableSpace += clsAvailable;
      gradeBreakdown[grade].classes.push({
        id: cls.id,
        name: cls.name,
        stream: cls.stream,
        currentCount: clsTotal,
        maxCapacity: CLASS_MAX_CAPACITY,
        hasSpace: clsTotal < CLASS_MAX_CAPACITY
      });
    });

    return {
      schoolMaxCapacity: SCHOOL_MAX_CAPACITY,
      totalCurrentLearners,
      schoolRemainingSpace,
      isSchoolFull,
      classMaxCapacity: CLASS_MAX_CAPACITY,
      gradeBreakdown
    };
  } catch (err) {
    console.error('[CAPACITY ERROR] Error fetching capacity:', err);
    throw err;
  }
}

/**
 * Find an optimal available class for an applicant
 * Returns null if the grade or class limit (< 30) is reached.
 */
async function allocateAvailableClass(grade, stream = 'General') {
  const capacity = await getCapacityStatus();
  if (capacity.isSchoolFull) {
    return null;
  }

  const gradeInfo = capacity.gradeBreakdown[grade];
  if (!gradeInfo || gradeInfo.classes.length === 0) {
    return null;
  }

  // Find class matching stream with space < 30
  let matchedClass = gradeInfo.classes.find(c => 
    c.hasSpace && (grade < 10 || !stream || c.stream.toLowerCase() === stream.toLowerCase())
  );

  // Fallback to any class with space in that grade
  if (!matchedClass) {
    matchedClass = gradeInfo.classes.find(c => c.hasSpace);
  }

  return matchedClass || null;
}

/**
 * Extract text from document file (PDF or text)
 */
async function extractDocumentText(filePath, mimeType) {
  try {
    if (!fs.existsSync(filePath)) return '';
    if (mimeType === 'application/pdf' || filePath.endsWith('.pdf')) {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdf(dataBuffer);
      return pdfData.text || '';
    }
    return '';
  } catch (err) {
    console.warn(`[DOC EXTRACT] Could not extract text from ${filePath}:`, err.message);
    return '';
  }
}

/**
 * AI-Powered Document Verification
 * Checks uploaded documents, cross-verifies applicant details, and detects mismatches.
 */
async function verifyApplicationWithAI(applicationData, uploadedDocs = []) {
  const issues = [];
  const verificationLog = [];
  let overallScore = 100;

  const {
    first_name,
    surname,
    id_number,
    dob,
    gender,
    citizenship,
    grade_applied,
    primary_parent_name,
    primary_parent_surname,
    primary_parent_id_number,
    primary_parent_email,
    primary_parent_phone
  } = applicationData;

  // 1. Calculate Learner Age & SA ID Validation
  let learnerAge = null;
  if (dob) {
    const dobDate = new Date(dob);
    if (!isNaN(dobDate.getTime())) {
      const today = new Date();
      learnerAge = today.getFullYear() - dobDate.getFullYear();
      const m = today.getMonth() - dobDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
        learnerAge--;
      }
    }
  }

  if (id_number && id_number.length === 13) {
    const idCheck = validateSAID(id_number);
    if (!idCheck.isValid) {
      issues.push({
        field: 'id_number',
        type: 'INVALID_ID_CHECKSUM',
        message: `Learner ID Number (${id_number}) is invalid: ${idCheck.error}`,
        details: 'Please ensure you entered a valid 13-digit South African ID number.'
      });
      overallScore -= 30;
    } else {
      // Cross-check extracted DOB
      if (dob && idCheck.dob) {
        const enteredDob = new Date(dob).toISOString().split('T')[0];
        const idDob = new Date(idCheck.dob).toISOString().split('T')[0];
        if (enteredDob !== idDob) {
          issues.push({
            field: 'dob',
            type: 'DOB_MISMATCH',
            message: `Learner Date of Birth (${enteredDob}) does not match ID number (${idDob}).`,
            details: 'Date of birth must correspond to the first 6 digits of the South African ID.'
          });
          overallScore -= 20;
        }
      }

      // Cross-check Gender
      if (gender && idCheck.gender && gender.toLowerCase() !== idCheck.gender.toLowerCase()) {
        issues.push({
          field: 'gender',
          type: 'GENDER_MISMATCH',
          message: `Learner Gender (${gender}) does not match ID code (${idCheck.gender}).`,
          details: 'Gender is determined by digits 7–10 of the South African ID.'
        });
        overallScore -= 15;
      }
    }
  }

  // 2. Parent SA ID Validation (Department of Home Affairs standard 13-digit structure)
  if (primary_parent_id_number && primary_parent_id_number.length === 13) {
    const parentIdCheck = validateSAID(primary_parent_id_number.replace(/\D/g, ''));
    if (!parentIdCheck.isValid) {
      issues.push({
        field: 'primary_parent_id_number',
        type: 'INVALID_PARENT_ID',
        message: `Parent ID Number (${primary_parent_id_number}) failed checksum validation.`,
        details: 'Please double-check the 13-digit ID number of the primary parent/guardian.'
      });
      overallScore -= 20;
    }
  }

  // 3. Document Requirements Checks: 16+ SA ID vs Under 16 Birth Certificate
  const docTypes = uploadedDocs.map(d => d.document_type);

  if (learnerAge !== null && learnerAge >= 16) {
    // Learners 16 years and older should provide SA ID Document or Birth Certificate
    if (!docTypes.includes('learner_id') && !docTypes.includes('birth_certificate')) {
      issues.push({
        field: 'learner_id_doc',
        type: 'ID_DOCUMENT_REQUIRED_FOR_16_PLUS',
        message: `Learner identification document (Smart ID Card, Green Book, or Birth Certificate) is required.`,
        details: 'Please upload a certified copy of the learner’s official South African ID or Birth Certificate.'
      });
      overallScore -= 35;
    }
  } else {
    // Learners under 16 provide Birth Certificate or ID Document
    if (!docTypes.includes('birth_certificate') && !docTypes.includes('learner_id')) {
      issues.push({
        field: 'birth_certificate',
        type: 'BIRTH_CERTIFICATE_REQUIRED',
        message: `Official Birth Certificate or Learner ID is required for the applicant.`,
        details: 'Please upload an official Birth Certificate or ID Document.'
      });
      overallScore -= 30;
    }
  }

  if (!docTypes.includes('parent_id')) {
    issues.push({
      field: 'parent_id_doc',
      type: 'MISSING_DOCUMENT',
      message: 'Parent / Legal Guardian ID document copy is required.',
      details: 'Please upload a certified copy of the primary parent/guardian official South African ID or Passport.'
    });
    overallScore -= 20;
  }

  if (!docTypes.includes('proof_of_residence')) {
    issues.push({
      field: 'proof_of_residence',
      type: 'MISSING_DOCUMENT',
      message: 'Proof of Residential Address is required (Utility Bill / Lease Agreement < 3 months old).',
      details: 'Please upload proof of address for school zoning and POPIA verification.'
    });
    overallScore -= 15;
  }

  // 4. Local text comparison. Documents are not sent to a model.
  for (const doc of uploadedDocs) {
    const extractedText = await extractDocumentText(doc.file_path, doc.mime_type);
    
    const localCheck = compareExtractedDocument({
      text: extractedText,
      surname,
      idNumber: id_number
    });
    doc.ai_confidence_score = null;
    doc.ai_extracted_data = { model_called: false, readable: localCheck.readable };
    doc.is_verified = false;
    doc.ai_review_required = true;
    if (localCheck.readable && (localCheck.surname_present === false || localCheck.id_present === false)) {
      issues.push({
        field: doc.document_type,
        type: 'LOCAL_DOCUMENT_MISMATCH',
        message: `The uploaded ${doc.document_type || 'document'} needs a person to compare it with the application.`,
        details: 'A local text check did not find every declared detail. The document was not sent to a model, and this is not an admission decision.'
      });
    }
    if (!localCheck.readable) {
      doc.is_verified = false;
      doc.ai_confidence_score = null;
      doc.ai_review_required = true;
    }

    verificationLog.push({
      document_type: doc.document_type,
      file_name: doc.file_name,
      is_verified: doc.is_verified,
      confidence: doc.ai_confidence_score
    });
  }

  const isValid = issues.length === 0 && overallScore >= 70;

  return {
    isValid,
    overallScore: Math.max(0, Math.min(100, overallScore)),
    issues,
    verificationLog
  };
}

/**
 * Detailed AI Document OCR & Clarity Inspector
 */
async function inspectDocumentOCR(filePath, mimeType, declaredData = {}) {
  const { buildDocumentInspection } = require('../../../lib/documentInspection');
  try {
    let extractedText = '';
    const isPdf = mimeType === 'application/pdf' || (filePath && String(filePath).toLowerCase().endsWith('.pdf'));
    if (filePath && isPdf && fs.existsSync(filePath)) {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdf(dataBuffer);
      extractedText = pdfData.text || '';
    }
    return buildDocumentInspection({ extractedText, declaredData });
  } catch (err) {
    console.error('Error during document text inspection:', err.message);
    return buildDocumentInspection({ extractedText: '', declaredData });
  }
}

module.exports = {
  SCHOOL_MAX_CAPACITY,
  CLASS_MAX_CAPACITY,
  generateApplicationNumber,
  generateCorrectionToken,
  generateProvisionalLearnerNumber,
  getCapacityStatus,
  allocateAvailableClass,
  verifyApplicationWithAI,
  extractDocumentText,
  inspectDocumentOCR
};
