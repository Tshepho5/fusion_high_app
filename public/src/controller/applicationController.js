const db = require('../../../db/db');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const emailService = require('../services/emailService');
const { validateSAID } = require('./saIDvalidations');
const applicationService = require('../services/applicationService');
const curriculumService = require('../services/curriculumService');

// Ensure upload directory exists
const appUploadDir = path.join(process.cwd(), 'uploads', 'applications');
if (!fs.existsSync(appUploadDir)) {
  fs.mkdirSync(appUploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, appUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const sanitizedName = file.fieldname.replace(/[^a-zA-Z0-9_-]/g, '');
    cb(null, `app-${Date.now()}-${sanitizedName}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}. Please upload PDF, JPG, or PNG files.`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB max per document
});

// Middleware for uploading application files
exports.uploadApplicationDocs = upload.fields([
  { name: 'learner_id_doc', maxCount: 1 },
  { name: 'parent_id_doc', maxCount: 1 },
  { name: 'proof_of_residence', maxCount: 1 },
  { name: 'report_card', maxCount: 1 },
  { name: 'clinic_card', maxCount: 1 }
]);

// Helper Validation Functions
const NAME_REGEX = /^[A-Za-z\s\-']+$/;
const PHONE_REGEX = /^(\+27|0)[0-9]{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateFormFields(body) {
  const errors = [];

  // Learner Names
  if (!body.first_name || !NAME_REGEX.test(body.first_name.trim())) {
    errors.push({ field: 'first_name', message: 'Learner first name must only contain letters, spaces, or hyphens (no numbers).' });
  }
  if (!body.surname || !NAME_REGEX.test(body.surname.trim())) {
    errors.push({ field: 'surname', message: 'Learner surname must only contain letters, spaces, or hyphens (no numbers).' });
  }

  // Learner ID
  if (!body.id_number) {
    errors.push({ field: 'id_number', message: 'Learner ID Number is required.' });
  } else {
    const cleanId = body.id_number.replace(/\D/g, '');
    if (cleanId.length === 13) {
      const idVal = validateSAID(cleanId);
      if (!idVal.isValid) {
        errors.push({ field: 'id_number', message: idVal.error });
      }
    } else if (cleanId.length < 6) {
      errors.push({ field: 'id_number', message: 'ID or Passport number must be at least 6 characters long.' });
    }
  }

  // Grade
  const grade = parseInt(body.grade_applied, 10);
  if (isNaN(grade) || grade < 8 || grade > 12) {
    errors.push({ field: 'grade_applied', message: 'Grade must be between 8 and 12.' });
  }

  // Address
  if (!body.physical_address || body.physical_address.trim().length < 5) {
    errors.push({ field: 'physical_address', message: 'Please provide a complete physical address.' });
  }

  // Primary Parent Validation
  if (!body.primary_parent_name || !NAME_REGEX.test(body.primary_parent_name.trim())) {
    errors.push({ field: 'primary_parent_name', message: 'Primary parent full name must only contain letters, spaces, or hyphens.' });
  }
  if (!body.primary_parent_surname || !NAME_REGEX.test(body.primary_parent_surname.trim())) {
    errors.push({ field: 'primary_parent_surname', message: 'Primary parent surname must only contain letters, spaces, or hyphens.' });
  }
  if (!body.primary_parent_relationship) {
    errors.push({ field: 'primary_parent_relationship', message: 'Please specify the relationship of the primary parent/guardian (e.g. Mother, Father, Guardian).' });
  }
  if (!body.primary_parent_email || !EMAIL_REGEX.test(body.primary_parent_email.trim())) {
    errors.push({ field: 'primary_parent_email', message: 'Please provide a valid primary parent email address.' });
  }
  if (!body.primary_parent_phone || !PHONE_REGEX.test(body.primary_parent_phone.replace(/[\s-]/g, ''))) {
    errors.push({ field: 'primary_parent_phone', message: 'Primary parent phone must start with +27 or 0, followed by 9 digits (no letters).' });
  }
  if (!body.primary_parent_id_number || body.primary_parent_id_number.trim().length < 6) {
    errors.push({ field: 'primary_parent_id_number', message: 'Primary parent ID or Passport number is required.' });
  }
  if (!body.primary_parent_address || body.primary_parent_address.trim().length < 5) {
    errors.push({ field: 'primary_parent_address', message: 'Primary parent physical address is required.' });
  }

  // Optional Secondary Parent Validation
  if (body.has_secondary_parent === 'true' || body.has_secondary_parent === true) {
    if (body.secondary_parent_name && !NAME_REGEX.test(body.secondary_parent_name.trim())) {
      errors.push({ field: 'secondary_parent_name', message: 'Secondary parent name must only contain letters, spaces, or hyphens.' });
    }
    if (body.secondary_parent_phone && !PHONE_REGEX.test(body.secondary_parent_phone.replace(/[\s-]/g, ''))) {
      errors.push({ field: 'secondary_parent_phone', message: 'Secondary parent phone must start with +27 or 0, followed by 9 digits.' });
    }
    if (body.secondary_parent_email && !EMAIL_REGEX.test(body.secondary_parent_email.trim())) {
      errors.push({ field: 'secondary_parent_email', message: 'Secondary parent email format is invalid.' });
    }
  }

  return errors;
}

/**
 * Submit New Learner Admission Application
 */
exports.submitApplication = async (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const body = req.body;

    // 1. Validate Form Fields
    const fieldErrors = validateFormFields(body);
    if (fieldErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed. Please correct the highlighted errors.',
        errors: fieldErrors
      });
    }

    const applicationNumber = applicationService.generateApplicationNumber();
    const correctionToken = applicationService.generateCorrectionToken();

    const gradeApplied = parseInt(body.grade_applied, 10);
    const stream = gradeApplied >= 10 ? (body.stream || 'Science') : 'General';
    const homeLanguage = (body.home_language || 'isiZulu').trim();
    const selectedSubjects = curriculumService.getSubjectsForGradeAndStream(gradeApplied, stream, homeLanguage);

    // 2. Prepare Uploaded Documents Metadata
    const uploadedDocs = [];
    const files = req.files || {};

    if (files.learner_id_doc && files.learner_id_doc[0]) {
      uploadedDocs.push({
        document_type: 'learner_id',
        file_path: files.learner_id_doc[0].path,
        file_name: files.learner_id_doc[0].originalname,
        mime_type: files.learner_id_doc[0].mimetype,
        file_size: files.learner_id_doc[0].size
      });
    }
    if (files.parent_id_doc && files.parent_id_doc[0]) {
      uploadedDocs.push({
        document_type: 'parent_id',
        file_path: files.parent_id_doc[0].path,
        file_name: files.parent_id_doc[0].originalname,
        mime_type: files.parent_id_doc[0].mimetype,
        file_size: files.parent_id_doc[0].size
      });
    }
    if (files.proof_of_residence && files.proof_of_residence[0]) {
      uploadedDocs.push({
        document_type: 'proof_of_residence',
        file_path: files.proof_of_residence[0].path,
        file_name: files.proof_of_residence[0].originalname,
        mime_type: files.proof_of_residence[0].mimetype,
        file_size: files.proof_of_residence[0].size
      });
    }
    if (files.report_card && files.report_card[0]) {
      uploadedDocs.push({
        document_type: 'report_card',
        file_path: files.report_card[0].path,
        file_name: files.report_card[0].originalname,
        mime_type: files.report_card[0].mimetype,
        file_size: files.report_card[0].size
      });
    }
    if (files.clinic_card && files.clinic_card[0]) {
      uploadedDocs.push({
        document_type: 'clinic_card',
        file_path: files.clinic_card[0].path,
        file_name: files.clinic_card[0].originalname,
        mime_type: files.clinic_card[0].mimetype,
        file_size: files.clinic_card[0].size
      });
    }

    // 3. AI Document & Form Consistency Verification
    const aiVerification = await applicationService.verifyApplicationWithAI(body, uploadedDocs);

    // 4. Check Capacity
    const capacityStatus = await applicationService.getCapacityStatus();
    const isSchoolAtCapacity = capacityStatus.isSchoolFull;
    const assignedClass = await applicationService.allocateAvailableClass(gradeApplied, stream);

    let applicationStatus = 'submitted';
    let provisionalLearnerNumber = null;

    if (!aiVerification.isValid) {
      // Document or detail issues detected -> Needs correction
      applicationStatus = 'action_required';
    } else if (isSchoolAtCapacity || !assignedClass) {
      // Valid, but school or class is at capacity (< 500 / < 30) -> Waitlist
      applicationStatus = 'waitlisted';
    } else {
      // Valid and space is available -> Approved (Official Learner Number issued upon final parent registration)
      applicationStatus = 'approved';
      provisionalLearnerNumber = null;
    }

    // 5. Insert Application Record into Database
    const insertQuery = `
      INSERT INTO applications (
        application_number,
        correction_token,
        status,
        first_name,
        surname,
        id_number,
        dob,
        gender,
        citizenship,
        phone,
        email,
        physical_address,
        grade_applied,
        stream,
        selected_subjects,
        previous_school,
        previous_grade,
        transfer_reason,
        medical_info,
        special_needs,
        primary_parent_name,
        primary_parent_surname,
        primary_parent_relationship,
        primary_parent_id_number,
        primary_parent_phone,
        primary_parent_email,
        primary_parent_address,
        primary_parent_occupation,
        primary_parent_employer,
        has_secondary_parent,
        secondary_parent_name,
        secondary_parent_surname,
        secondary_parent_relationship,
        secondary_parent_id_number,
        secondary_parent_phone,
        secondary_parent_email,
        secondary_parent_address,
        secondary_parent_occupation,
        secondary_parent_employer,
        ai_verification_status,
        ai_verification_notes,
        assigned_class_id,
        provisional_learner_number,
        home_language
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
        $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
        $41, $42, $43, $44
      ) RETURNING id;
    `;

    const values = [
      applicationNumber,
      correctionToken,
      applicationStatus,
      body.first_name.trim(),
      body.surname.trim(),
      body.id_number.trim(),
      body.dob || null,
      body.gender || 'Other',
      body.citizenship || 'South Africa',
      body.phone ? body.phone.trim() : null,
      body.email ? body.email.toLowerCase().trim() : null,
      body.physical_address.trim(),
      gradeApplied,
      stream,
      selectedSubjects,
      body.previous_school || null,
      body.previous_grade ? parseInt(body.previous_grade, 10) : null,
      body.transfer_reason || null,
      body.medical_info || null,
      body.special_needs || null,
      body.primary_parent_name.trim(),
      body.primary_parent_surname.trim(),
      body.primary_parent_relationship.trim(),
      body.primary_parent_id_number.trim(),
      body.primary_parent_phone.trim(),
      body.primary_parent_email.toLowerCase().trim(),
      body.primary_parent_address.trim(),
      body.primary_parent_occupation || null,
      body.primary_parent_employer || null,
      body.has_secondary_parent === 'true' || body.has_secondary_parent === true,
      body.secondary_parent_name ? body.secondary_parent_name.trim() : null,
      body.secondary_parent_surname ? body.secondary_parent_surname.trim() : null,
      body.secondary_parent_relationship ? body.secondary_parent_relationship.trim() : null,
      body.secondary_parent_id_number ? body.secondary_parent_id_number.trim() : null,
      body.secondary_parent_phone ? body.secondary_parent_phone.trim() : null,
      body.secondary_parent_email ? body.secondary_parent_email.toLowerCase().trim() : null,
      body.secondary_parent_address ? body.secondary_parent_address.trim() : null,
      body.secondary_parent_occupation || null,
      body.secondary_parent_employer || null,
      aiVerification.isValid ? 'passed' : 'flagged',
      JSON.stringify(aiVerification.issues),
      assignedClass ? assignedClass.id : null,
      provisionalLearnerNumber,
      homeLanguage
    ];

    const appInsertResult = await db.query(insertQuery, values);
    const applicationId = appInsertResult.rows[0].id;

    // 6. Save Uploaded Documents into application_documents table
    for (const doc of uploadedDocs) {
      await db.query(`
        INSERT INTO application_documents (
          application_id,
          document_type,
          file_path,
          file_name,
          mime_type,
          file_size,
          is_verified,
          ai_confidence_score,
          ai_extracted_data,
          issues
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        applicationId,
        doc.document_type,
        doc.file_path,
        doc.file_name,
        doc.mime_type,
        doc.file_size,
        doc.is_verified,
        doc.ai_confidence_score || 0,
        JSON.stringify(doc.ai_extracted_data || {}),
        doc.issues || []
      ]);
    }

    // 7. Trigger Appropriate Email Workflow
    const learnerFullName = `${body.first_name} ${body.surname}`;
    const primaryParentFullName = `${body.primary_parent_name} ${body.primary_parent_surname}`;
    const resumptionUrl = `${baseUrl}/application.html?resume=${correctionToken}`;
    const registrationUrl = `${baseUrl}/register?appRef=${applicationNumber}&email=${encodeURIComponent(body.primary_parent_email)}&firstName=${encodeURIComponent(body.first_name)}&surname=${encodeURIComponent(body.surname)}&idNumber=${encodeURIComponent(body.id_number || '')}&grade=${encodeURIComponent(body.grade_applied)}&stream=${encodeURIComponent(body.stream || 'General')}`;

    if (applicationStatus === 'action_required') {
      // Send Correction / Issues Email
      await emailService.sendApplicationCorrection({
        parentEmail: body.primary_parent_email,
        parentName: primaryParentFullName,
        learnerName: learnerFullName,
        applicationNumber,
        issues: aiVerification.issues,
        resumptionUrl
      });

      return res.status(200).json({
        success: false,
        status: 'action_required',
        applicationNumber,
        correctionToken,
        message: 'Document or detail inconsistencies detected. A detailed correction email with your resumption link has been sent.',
        issues: aiVerification.issues,
        resumptionUrl
      });
    }

    if (applicationStatus === 'waitlisted') {
      // Send Waitlist Email
      await emailService.sendApplicationWaitlisted({
        parentEmail: body.primary_parent_email,
        parentName: primaryParentFullName,
        learnerName: learnerFullName,
        grade: gradeApplied,
        applicationNumber
      });

      return res.status(200).json({
        success: true,
        status: 'waitlisted',
        applicationNumber,
        message: `Application qualified, but Grade ${gradeApplied} is currently at maximum capacity (< 30 per class). The applicant has been placed on the priority waiting list.`
      });
    }

    if (applicationStatus === 'approved') {
      // Send Official Acceptance Email
      await emailService.sendApplicationAccepted({
        parentEmail: body.primary_parent_email,
        parentName: primaryParentFullName,
        learnerName: learnerFullName,
        grade: gradeApplied,
        stream,
        applicationNumber,
        registrationUrl
      });

      return res.status(201).json({
        success: true,
        status: 'approved',
        applicationNumber,
        assignedClass: assignedClass ? assignedClass.name : null,
        registrationUrl,
        message: `Congratulations! Application approved for Grade ${gradeApplied}. Please complete Parent Registration to finalize enrollment and receive the official Learner Number.`
      });
    }

  } catch (err) {
    console.error('[SUBMIT APPLICATION ERROR]:', err);
    res.status(500).json({
      success: false,
      error: 'An internal server error occurred while processing your admission application: ' + err.message
    });
  }
};

/**
 * Retrieve Application By Resumption Token
 */
exports.getApplicationByToken = async (req, res) => {
  const { token } = req.params;
  if (!token) {
    return res.status(400).json({ error: 'Resumption token is required.' });
  }

  try {
    const appRes = await db.query(
      `SELECT a.*, c.name as assigned_class_name 
       FROM applications a
       LEFT JOIN classes c ON a.assigned_class_id = c.id
       WHERE a.correction_token = $1`,
      [token]
    );

    if (appRes.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired application resumption token.' });
    }

    const application = appRes.rows[0];

    const docsRes = await db.query(
      `SELECT id, document_type, file_name, is_verified, issues, uploaded_at 
       FROM application_documents 
       WHERE application_id = $1`,
      [application.id]
    );

    res.json({
      success: true,
      application,
      documents: docsRes.rows
    });
  } catch (err) {
    console.error('[GET APP BY TOKEN ERROR]:', err);
    res.status(500).json({ error: 'Failed to retrieve application details.' });
  }
};

/**
 * Resubmit / Correct Existing Application
 */
exports.resubmitApplication = async (req, res) => {
  const { token } = req.params;
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const body = req.body;

  try {
    const existing = await db.query('SELECT * FROM applications WHERE correction_token = $1', [token]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found with the given token.' });
    }

    const application = existing.rows[0];

    // Merge updated values
    const merged = {
      ...application,
      ...body
    };

    // Validate fields
    const fieldErrors = validateFormFields(merged);
    if (fieldErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed.',
        errors: fieldErrors
      });
    }

    // Process new uploads if provided
    const files = req.files || {};
    const uploadedDocs = [];

    if (files.learner_id_doc && files.learner_id_doc[0]) {
      uploadedDocs.push({
        document_type: 'learner_id',
        file_path: files.learner_id_doc[0].path,
        file_name: files.learner_id_doc[0].originalname,
        mime_type: files.learner_id_doc[0].mimetype,
        file_size: files.learner_id_doc[0].size
      });
    }
    if (files.parent_id_doc && files.parent_id_doc[0]) {
      uploadedDocs.push({
        document_type: 'parent_id',
        file_path: files.parent_id_doc[0].path,
        file_name: files.parent_id_doc[0].originalname,
        mime_type: files.parent_id_doc[0].mimetype,
        file_size: files.parent_id_doc[0].size
      });
    }
    if (files.proof_of_residence && files.proof_of_residence[0]) {
      uploadedDocs.push({
        document_type: 'proof_of_residence',
        file_path: files.proof_of_residence[0].path,
        file_name: files.proof_of_residence[0].originalname,
        mime_type: files.proof_of_residence[0].mimetype,
        file_size: files.proof_of_residence[0].size
      });
    }
    if (files.report_card && files.report_card[0]) {
      uploadedDocs.push({
        document_type: 'report_card',
        file_path: files.report_card[0].path,
        file_name: files.report_card[0].originalname,
        mime_type: files.report_card[0].mimetype,
        file_size: files.report_card[0].size
      });
    }

    // Fetch previously uploaded docs if not re-uploaded
    const existingDocsRes = await db.query('SELECT * FROM application_documents WHERE application_id = $1', [application.id]);
    const allDocs = [...uploadedDocs];
    for (const exDoc of existingDocsRes.rows) {
      if (!allDocs.some(d => d.document_type === exDoc.document_type)) {
        allDocs.push(exDoc);
      }
    }

    // Re-verify with AI
    const aiVerification = await applicationService.verifyApplicationWithAI(merged, allDocs);
    const capacityStatus = await applicationService.getCapacityStatus();
    const gradeApplied = parseInt(merged.grade_applied, 10);
    const stream = gradeApplied >= 10 ? (merged.stream || 'Science') : 'General';
    const assignedClass = await applicationService.allocateAvailableClass(gradeApplied, stream);

    let newStatus = 'submitted';
    let provNumber = application.provisional_learner_number;

    if (!aiVerification.isValid) {
      newStatus = 'action_required';
    } else if (capacityStatus.isSchoolFull || !assignedClass) {
      newStatus = 'waitlisted';
    } else {
      newStatus = 'approved';
      if (!provNumber) {
        provNumber = applicationService.generateProvisionalLearnerNumber(gradeApplied);
      }
    }

    // Update Application Record
    await db.query(`
      UPDATE applications SET
        status = $1,
        first_name = $2,
        surname = $3,
        id_number = $4,
        dob = $5,
        gender = $6,
        citizenship = $7,
        phone = $8,
        email = $9,
        physical_address = $10,
        grade_applied = $11,
        stream = $12,
        primary_parent_name = $13,
        primary_parent_surname = $14,
        primary_parent_relationship = $15,
        primary_parent_id_number = $16,
        primary_parent_phone = $17,
        primary_parent_email = $18,
        primary_parent_address = $19,
        primary_parent_occupation = $20,
        primary_parent_employer = $21,
        has_secondary_parent = $22,
        secondary_parent_name = $23,
        secondary_parent_surname = $24,
        secondary_parent_relationship = $25,
        secondary_parent_id_number = $26,
        secondary_parent_phone = $27,
        secondary_parent_email = $28,
        secondary_parent_address = $29,
        ai_verification_status = $30,
        ai_verification_notes = $31,
        assigned_class_id = $32,
        provisional_learner_number = $33,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $34
    `, [
      newStatus,
      merged.first_name,
      merged.surname,
      merged.id_number,
      merged.dob || null,
      merged.gender,
      merged.citizenship || 'South Africa',
      merged.phone || null,
      merged.email || null,
      merged.physical_address,
      gradeApplied,
      stream,
      merged.primary_parent_name,
      merged.primary_parent_surname,
      merged.primary_parent_relationship,
      merged.primary_parent_id_number,
      merged.primary_parent_phone,
      merged.primary_parent_email,
      merged.primary_parent_address,
      merged.primary_parent_occupation || null,
      merged.primary_parent_employer || null,
      merged.has_secondary_parent === 'true' || merged.has_secondary_parent === true,
      merged.secondary_parent_name || null,
      merged.secondary_parent_surname || null,
      merged.secondary_parent_relationship || null,
      merged.secondary_parent_id_number || null,
      merged.secondary_parent_phone || null,
      merged.secondary_parent_email || null,
      merged.secondary_parent_address || null,
      aiVerification.isValid ? 'passed' : 'flagged',
      JSON.stringify(aiVerification.issues),
      assignedClass ? assignedClass.id : null,
      provNumber,
      application.id
    ]);

    // Save newly uploaded documents
    for (const doc of uploadedDocs) {
      await db.query(`
        INSERT INTO application_documents (
          application_id,
          document_type,
          file_path,
          file_name,
          mime_type,
          file_size,
          is_verified,
          ai_confidence_score,
          ai_extracted_data,
          issues
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        application.id,
        doc.document_type,
        doc.file_path,
        doc.file_name,
        doc.mime_type,
        doc.file_size,
        doc.is_verified,
        doc.ai_confidence_score || 0,
        JSON.stringify(doc.ai_extracted_data || {}),
        doc.issues || []
      ]);
    }

    const learnerFullName = `${merged.first_name} ${merged.surname}`;
    const primaryParentFullName = `${merged.primary_parent_name} ${merged.primary_parent_surname}`;
    const registrationUrl = `${baseUrl}/register?learnerNumber=${provNumber}&appRef=${application.application_number}&email=${encodeURIComponent(merged.primary_parent_email)}&firstName=${encodeURIComponent(merged.first_name)}&surname=${encodeURIComponent(merged.surname)}&idNumber=${encodeURIComponent(merged.id_number || '')}&grade=${encodeURIComponent(merged.grade_applied)}&stream=${encodeURIComponent(merged.stream || 'General')}`;

    if (newStatus === 'approved') {
      await emailService.sendApplicationAccepted({
        parentEmail: merged.primary_parent_email,
        parentName: primaryParentFullName,
        learnerName: learnerFullName,
        grade: gradeApplied,
        stream,
        applicationNumber: application.application_number,
        learnerNumber: provNumber,
        registrationUrl
      });

      return res.json({
        success: true,
        status: 'approved',
        applicationNumber: application.application_number,
        learnerNumber: provNumber,
        message: 'Resubmission approved! Acceptance email sent.'
      });
    }

    res.json({
      success: aiVerification.isValid,
      status: newStatus,
      issues: aiVerification.issues,
      message: aiVerification.isValid 
        ? 'Application updated successfully.' 
        : 'Some issues are still outstanding. Please check your inputs.'
    });

  } catch (err) {
    console.error('[RESUBMIT ERROR]:', err);
    res.status(500).json({ error: 'Failed to update application: ' + err.message });
  }
};

/**
 * Public Capacity Endpoint
 */
exports.getCapacity = async (req, res) => {
  try {
    const capacity = await applicationService.getCapacityStatus();
    res.json({
      success: true,
      capacity
    });
  } catch (err) {
    console.error('[CAPACITY ENDPOINT ERROR]:', err);
    res.status(500).json({ error: 'Failed to retrieve capacity statistics.' });
  }
};

/**
 * Admin: List All Applications
 */
exports.listApplications = async (req, res) => {
  try {
    const { status, grade, search } = req.query;
    let query = `
      SELECT a.*, c.name as assigned_class_name,
             (SELECT COUNT(*)::int FROM application_documents d WHERE d.application_id = a.id) as document_count
      FROM applications a
      LEFT JOIN classes c ON a.assigned_class_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      params.push(status);
      query += ` AND a.status = $${params.length}`;
    }
    if (grade) {
      params.push(parseInt(grade, 10));
      query += ` AND a.grade_applied = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (a.first_name ILIKE $${params.length} OR a.surname ILIKE $${params.length} OR a.application_number ILIKE $${params.length} OR a.primary_parent_email ILIKE $${params.length})`;
    }

    query += ` ORDER BY a.created_at DESC`;

    const { rows } = await db.query(query, params);
    res.json({ success: true, applications: rows });
  } catch (err) {
    console.error('[ADMIN LIST APPLICATIONS ERROR]:', err);
    res.status(500).json({ error: 'Failed to list applications.' });
  }
};

/**
 * Admin: Manual Decision / Review
 */
exports.reviewApplication = async (req, res) => {
  const { id } = req.params;
  const { status, admin_notes, assigned_class_id } = req.body;

  try {
    const appRes = await db.query('SELECT * FROM applications WHERE id = $1', [id]);
    if (appRes.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    const app = appRes.rows[0];
    let provNumber = app.provisional_learner_number;

    if (status === 'approved' && !provNumber) {
      provNumber = applicationService.generateProvisionalLearnerNumber(app.grade_applied);
    }

    await db.query(`
      UPDATE applications SET
        status = $1,
        admin_notes = $2,
        assigned_class_id = $3,
        provisional_learner_number = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
    `, [status, admin_notes || app.admin_notes, assigned_class_id || app.assigned_class_id, provNumber, id]);

    res.json({ success: true, message: `Application status updated to ${status}.` });
  } catch (err) {
    console.error('[ADMIN REVIEW ERROR]:', err);
    res.status(500).json({ error: 'Failed to update application review.' });
  }
};
