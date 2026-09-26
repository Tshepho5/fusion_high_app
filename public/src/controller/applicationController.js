const db = require('../../../db/db');
const { db: firestore } = require('../../../db/firebase');
const FirebaseStorageService = require('../services/firebaseStorageService');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const emailService = require('../services/emailService');
const { validateSAID } = require('./saIDvalidations');
const applicationService = require('../services/applicationService');
const curriculumService = require('../services/curriculumService');
const { generateLearnerPasswordFromID } = require('./authController');
const { isControlLocked } = require('./systemController');

// Ensure upload directory exists
const appUploadDir = path.join(process.cwd(), 'uploads', 'applications');
try {
  if (!fs.existsSync(appUploadDir)) {
    fs.mkdirSync(appUploadDir, { recursive: true });
  }
} catch (err) {
  // Read-only filesystem in serverless
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

  // Home Language Validation
  const validLanguages = curriculumService.SA_OFFICIAL_LANGUAGES_LIST || [
    'Sepedi', 'Sesotho', 'Setswana', 'siSwati', 'Tshivenda', 'Xitsonga', 'Afrikaans', 'English', 'isiNdebele', 'isiXhosa', 'isiZulu'
  ];
  if (!body.home_language || !body.home_language.trim()) {
    errors.push({ field: 'home_language', message: 'Please select an official South African Home Language.' });
  } else {
    const matchedLang = validLanguages.find(l => l.toLowerCase() === body.home_language.trim().toLowerCase());
    if (!matchedLang) {
      errors.push({ field: 'home_language', message: `Invalid Home Language selected. Must be an official South African language.` });
    }
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

const getRequestBaseUrl = (req) => {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  const origin = req.get('origin');
  if (origin && !origin.includes('localhost')) return origin.replace(/\/$/, '');
  const referer = req.get('referer');
  if (referer && !referer.includes('localhost')) {
    try {
      const u = new URL(referer);
      return `${u.protocol}//${u.host}`;
    } catch (_) {}
  }
  const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
  const host = req.get('x-forwarded-host') || req.get('host') || 'localhost:4000';
  return `${proto}://${host}`;
};

/**
 * Submit New Learner Admission Application
 */
exports.submitApplication = async (req, res) => {
  try {
    // 0. Geleza SA Executive & Admin Portal Lock Verification
    const lockState = await isControlLocked('parent_application');
    if (lockState && lockState.is_locked) {
      return res.status(403).json({
        success: false,
        error: lockState.locked_reason || 'Admissions application intake is currently closed by Geleza SA Administrators.',
        is_locked: true
      });
    }

    const baseUrl = getRequestBaseUrl(req);
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

    // Resolve School Tenant ID (Default: 1 - Fusion High, or 2..12 for partner schools)
    const schoolId = parseInt(body.school_id || req.headers['x-school-id'] || 1, 10);
    let targetSchool = null;
    try {
      const sRes = await db.query('SELECT * FROM schools WHERE id = $1', [schoolId]);
      if (sRes.rows.length > 0) {
        targetSchool = sRes.rows[0];
      }
    } catch (_) {}

    if (!targetSchool) {
      const fallbackRes = await db.query('SELECT * FROM schools LIMIT 1');
      targetSchool = fallbackRes.rows[0];
    }

    const schoolSlug = targetSchool.slug || 'fusion-high';
    const schoolName = targetSchool.name || 'Fusion High School';
    const offeredLangs = targetSchool.offered_languages || ['English', 'Sepedi', 'isiZulu'];
    const homeLanguage = (body.home_language || '').trim();

    // Enforce School Home Language Offering Verification & Referrals
    const isLangOffered = offeredLangs.some(l => 
      l.toLowerCase().includes(homeLanguage.toLowerCase()) || 
      homeLanguage.toLowerCase().includes(l.toLowerCase())
    );

    if (!isLangOffered) {
      // Find other registered schools offering this home language
      const allOtherSchools = await db.query(
        'SELECT id, name, slug, circuit, district, province, offered_languages FROM schools WHERE is_active = TRUE AND id != $1 ORDER BY name ASC',
        [targetSchool.id]
      );
      const referrals = allOtherSchools.rows.filter(s => {
        const sLangs = s.offered_languages || [];
        return sLangs.some(l => 
          l.toLowerCase().includes(homeLanguage.toLowerCase()) || 
          homeLanguage.toLowerCase().includes(l.toLowerCase())
        );
      }).map(s => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        circuit: s.circuit,
        district: s.district,
        province: s.province,
        offered_languages: s.offered_languages
      }));

      return res.status(400).json({
        success: false,
        error: `The school "${schoolName}" does not provide ${homeLanguage} as an official Home Language. Please select another language or choose one of the recommended schools below that offer ${homeLanguage}.`,
        is_language_offered: false,
        school_name: schoolName,
        language: homeLanguage,
        offered_languages: offeredLangs,
        referrals
      });
    }

    const applicationNumber = applicationService.generateApplicationNumber(schoolSlug);
    const correctionToken = applicationService.generateCorrectionToken();

    const gradeApplied = parseInt(body.grade_applied, 10);
    const stream = gradeApplied >= 10 ? (body.stream || 'Science') : 'General';
    const selectedSubjects = curriculumService.getSubjectsForGradeAndStream(gradeApplied, stream, homeLanguage);

    const appFeeAmount = parseFloat(targetSchool.application_fee) || 250.00;
    const regFeeAmount = parseFloat(targetSchool.registration_fee) || 1500.00;
    const feeDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7-day payment window
    const payNow = body.pay_now === 'true' || body.pay_now === true;
    const feeStatus = payNow ? 'paid' : 'unpaid';
    const feePaidAt = payNow ? new Date() : null;
    const paymentRef = body.payment_reference || `PAY-APP-${Date.now().toString().slice(-8)}`;

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
        home_language,
        school_id,
        application_fee_amount,
        application_fee_status,
        application_fee_paid_at,
        application_fee_due_date,
        registration_fee_amount,
        registration_fee_status,
        scenario,
        existing_parent_id,
        existing_learner_id,
        payment_method,
        payment_reference
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
        $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
        $41, $42, $43, $44, $45, $46, $47, $48, $49, $50,
        $51, $52, $53, $54, $55, $56
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
      homeLanguage,
      schoolId,
      appFeeAmount,
      feeStatus,
      feePaidAt,
      feeDueDate,
      regFeeAmount,
      'unpaid',
      body.scenario || 'public_new_applicant',
      body.existing_parent_id ? parseInt(body.existing_parent_id, 10) : null,
      body.existing_learner_id ? parseInt(body.existing_learner_id, 10) : null,
      body.payment_method || (payNow ? 'instant_online' : 'eft'),
      paymentRef
    ];

    const appInsertResult = await db.query(insertQuery, values);
    const applicationId = appInsertResult.rows[0].id;

    // Record instant payment in application_payments if paid immediately
    const receiptNo = `REC-APP-${Date.now().toString().slice(-6)}`;
    if (payNow) {
      try {
        await db.query(`
          INSERT INTO application_payments (
            application_id, fee_type, amount, payment_method, payment_reference, receipt_number, payer_name, payer_email, status, created_at
          ) VALUES ($1, 'application_fee', $2, $3, $4, $5, $6, $7, 'completed', NOW())
        `, [
          applicationId, appFeeAmount, body.payment_method || 'instant_online', paymentRef,
          receiptNo, `${body.primary_parent_name} ${body.primary_parent_surname}`, body.primary_parent_email.trim()
        ]);
      } catch (payErr) {
        console.warn('Could not insert application payment record:', payErr.message);
      }
    }

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

    // Mirror Application to Firebase Firestore for real-time live admissions tracking
    if (firestore) {
      setImmediate(async () => {
        try {
          await firestore.collection('applications').doc(String(applicationId)).set({
            id: applicationId,
            application_number: applicationNumber,
            first_name: body.first_name ? body.first_name.trim() : '',
            surname: body.surname ? body.surname.trim() : '',
            grade_applied: gradeApplied,
            stream,
            status: applicationStatus,
            school_id: schoolId || null,
            school_name: schoolName || 'Fusion High School',
            primary_parent_name: body.primary_parent_name || '',
            primary_parent_email: body.primary_parent_email || '',
            primary_parent_phone: body.primary_parent_phone || '',
            created_at: new Date()
          });

          // Upload documents to Firebase Storage and update records
          for (const doc of uploadedDocs) {
            if (doc.file_path && fs.existsSync(doc.file_path)) {
              try {
                const destPath = `applications/${applicationNumber}/${doc.document_type}-${path.basename(doc.file_path)}`;
                const storageRes = await FirebaseStorageService.uploadLocalFile({
                  localPath: doc.file_path,
                  destination: destPath,
                  contentType: doc.mime_type
                });
                if (storageRes.storageType === 'cloud') {
                  await db.query('UPDATE application_documents SET file_path = $1 WHERE application_id = $2 AND document_type = $3', [storageRes.url, applicationId, doc.document_type]);
                }
              } catch (docErr) {
                console.warn('[FIREBASE DOC UPLOAD WARNING]:', docErr.message);
              }
            }
          }
        } catch (fbAppErr) {
          console.warn('[FIREBASE APPLICATION SYNC WARNING]:', fbAppErr.message);
        }
      });
    }

    // 7. Trigger Appropriate Email Workflow
    const learnerFullName = `${body.first_name} ${body.surname}`;
    const primaryParentFullName = `${body.primary_parent_name} ${body.primary_parent_surname}`;
    const resumptionUrl = `${baseUrl}/application.html?resume=${correctionToken}`;
    const registrationUrl = `${baseUrl}/register?appRef=${applicationNumber}&email=${encodeURIComponent(body.primary_parent_email)}&firstName=${encodeURIComponent(body.first_name)}&surname=${encodeURIComponent(body.surname)}&idNumber=${encodeURIComponent(body.id_number || '')}&grade=${encodeURIComponent(body.grade_applied)}&stream=${encodeURIComponent(body.stream || 'General')}`;

    const bankingInfo = {
      bank_name: targetSchool.bank_name || 'First National Bank (FNB)',
      account_holder: targetSchool.account_holder || schoolName,
      account_number: targetSchool.account_number || '62849102841',
      branch_code: targetSchool.branch_code || '250655',
      account_type: targetSchool.account_type || 'Cheque / Current',
      reference: applicationNumber
    };
    const paymentUrl = `${baseUrl}/application.html?appRef=${applicationNumber}&pay=true`;

    if (payNow) {
      await emailService.sendApplicationFeePaymentReceived({
        parentEmail: body.primary_parent_email,
        parentName: primaryParentFullName,
        learnerName: learnerFullName,
        schoolName,
        applicationNumber,
        amountPaid: appFeeAmount,
        receiptNumber: receiptNo
      });
    } else {
      await emailService.sendApplicationReceivedWithBanking({
        parentEmail: body.primary_parent_email,
        parentName: primaryParentFullName,
        learnerName: learnerFullName,
        grade: gradeApplied,
        stream,
        homeLanguage,
        schoolName,
        applicationNumber,
        feeAmount: appFeeAmount,
        dueDateStr: feeDueDate.toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' }),
        bankDetails: bankingInfo,
        paymentUrl
      });
    }

    if (applicationStatus === 'action_required') {
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
        application_fee_status: feeStatus,
        application_fee_amount: appFeeAmount,
        banking_details: bankingInfo,
        message: 'Document or detail inconsistencies detected. A detailed correction email with your resumption link has been sent.',
        issues: aiVerification.issues,
        resumptionUrl
      });
    }

    if (applicationStatus === 'waitlisted') {
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
        application_fee_status: feeStatus,
        application_fee_amount: appFeeAmount,
        banking_details: bankingInfo,
        message: `Application qualified, but Grade ${gradeApplied} is currently at maximum capacity (< 30 per class). The applicant has been placed on the priority waiting list.`
      });
    }

    // Default: submitted & pending review
    return res.status(201).json({
      success: true,
      status: applicationStatus,
      applicationNumber,
      assignedClass: assignedClass ? assignedClass.name : null,
      registrationUrl,
      application_fee_status: feeStatus,
      application_fee_amount: appFeeAmount,
      application_fee_due_date: feeDueDate,
      banking_details: bankingInfo,
      payment_url: paymentUrl,
      message: payNow
        ? `Application submitted and application fee of R${appFeeAmount.toFixed(2)} received successfully! It is now under school administration review.`
        : `Application received! Please settle the application fee of R${appFeeAmount.toFixed(2)} within 7 days using the school banking details emailed to ${body.primary_parent_email}.`
    });

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
        provNumber = await applicationService.generateProvisionalLearnerNumber(gradeApplied);
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
 * Admin: List All Applications (Multi-School Aware)
 */
exports.listApplications = async (req, res) => {
  try {
    const { status, grade, search, school_id } = req.query;
    let query = `
      SELECT a.*, c.name as assigned_class_name,
             s.name as school_name, s.slug as school_slug, s.circuit as school_circuit,
             (SELECT COUNT(*)::int FROM application_documents d WHERE d.application_id = a.id) as document_count
      FROM applications a
      LEFT JOIN classes c ON a.assigned_class_id = c.id
      LEFT JOIN schools s ON a.school_id = s.id
      WHERE 1=1
    `;
    const params = [];

    const targetSchoolId = school_id || req.headers['x-school-id'] || (req.user && req.user.school_id && req.user.role !== 'superadmin' ? req.user.school_id : null);
    if (targetSchoolId && targetSchoolId !== 'all') {
      params.push(parseInt(targetSchoolId, 10));
      query += ` AND (a.school_id = $${params.length} OR a.school_id IS NULL)`;
    }

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
 * Admin: Manual Decision / Review & 1-Click Autonomous Enrollment
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

    if ((status === 'approved' || status === 'enrolled') && !provNumber) {
      provNumber = await applicationService.generateProvisionalLearnerNumber(app.grade_applied);
    }

    // 1. If approved or enrolled, execute full 1-Click Autonomous Enrollment
    let enrollmentDetails = null;
    if (status === 'approved' || status === 'enrolled') {
      const gradeApplied = parseInt(app.grade_applied, 10) || 10;
      const stream = app.stream || 'General';
      const homeLanguage = (app.home_language || 'Sepedi').trim();
      const subjects = curriculumService.getSubjectsForGradeAndStream(gradeApplied, stream, homeLanguage);
      
      const learnerInitialPw = (app.id_number && app.id_number.trim().length >= 6) ? generateLearnerPasswordFromID(app.id_number.trim()) : '123456';
      const defaultPassword = learnerInitialPw;
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      const schoolId = app.school_id || 1;

      // (a) Create or link Parent User Account
      let parentUserId = null;
      if (app.primary_parent_email) {
        const parentEmailClean = app.primary_parent_email.trim().toLowerCase();
        const parentUserRes = await db.query('SELECT id, email FROM users WHERE LOWER(email) = $1 LIMIT 1', [parentEmailClean]);
        if (parentUserRes.rows.length > 0) {
          parentUserId = parentUserRes.rows[0].id;
        } else {
          // Resolve parent role_id
          const parentRoleRes = await db.query("SELECT id FROM roles WHERE name = 'parent' LIMIT 1");
          const parentRoleId = parentRoleRes.rows[0]?.id || 4;

          const newParentRes = await db.query(
            `INSERT INTO users (full_name, surname, email, password_hash, phone, id_number, role_id, school_id, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING id`,
            [
              app.primary_parent_name,
              app.primary_parent_surname,
              parentEmailClean,
              hashedPassword,
              app.primary_parent_phone || null,
              app.primary_parent_id_number || null,
              parentRoleId,
              schoolId
            ]
          );
          parentUserId = newParentRes.rows[0].id;
        }
      }

      // (b) Create Learner User Account
      let learnerUserId = null;
      const learnerEmail = app.email ? app.email.trim().toLowerCase() : `${provNumber.toLowerCase()}@fusionhigh.co.za`;
      const learnerUserRes = await db.query('SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1', [learnerEmail]);
      if (learnerUserRes.rows.length > 0) {
        learnerUserId = learnerUserRes.rows[0].id;
      } else {
        const learnerRoleRes = await db.query("SELECT id FROM roles WHERE name = 'learner' LIMIT 1");
        const learnerRoleId = learnerRoleRes.rows[0]?.id || 3;

        const newLearnerRes = await db.query(
          `INSERT INTO users (full_name, surname, email, password_hash, phone, id_number, role_id, school_id, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING id`,
          [
            app.first_name,
            app.surname,
            learnerEmail,
            hashedPassword,
            app.phone || null,
            app.id_number || null,
            learnerRoleId,
            schoolId
          ]
        );
        learnerUserId = newLearnerRes.rows[0].id;
      }

      // (c) Create or Update record in children table
      let childId;
      const existingChild = await db.query('SELECT id FROM children WHERE learner_number = $1 OR application_number = $2 LIMIT 1', [provNumber, app.application_number]);
      if (existingChild.rows.length > 0) {
        childId = existingChild.rows[0].id;
        await db.query(
          `UPDATE children SET
             full_name = $1, surname = $2, grade = $3, stream = $4, home_language = $5,
             subjects = $6, parent_id = $7, learner_user_id = $8, is_active = TRUE
           WHERE id = $9`,
          [app.first_name, app.surname, gradeApplied, stream, homeLanguage, subjects, parentUserId, learnerUserId, childId]
        );
      } else {
        const childInsert = await db.query(
          `INSERT INTO children (full_name, surname, learner_number, grade, stream, home_language, subjects, parent_id, learner_user_id, application_number, is_active, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, NOW()) RETURNING id`,
          [app.first_name, app.surname, provNumber, gradeApplied, stream, homeLanguage, subjects, parentUserId, learnerUserId, app.application_number]
        );
        childId = childInsert.rows[0].id;
      }

      // (d) Link in parent_children table
      if (parentUserId && childId) {
        try {
          await db.query(
            `INSERT INTO parent_children (parent_id, child_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [parentUserId, childId]
          );
        } catch (_) {}
      }

      // (e) Create Term 1 Tuition Fee Invoice
      const invoiceNum = `INV-TERM1-${provNumber}`;
      const feeCheck = await db.query('SELECT id FROM fee_invoices WHERE invoice_number = $1 LIMIT 1', [invoiceNum]);
      if (feeCheck.rows.length === 0) {
        const breakdown = [
          { item: `CAPS Grade ${gradeApplied} Term 1 Tuition Fee`, amount: 4000.00 },
          { item: 'Digital Curriculum, Past Papers & AI Tutor License', amount: 300.00 },
          { item: 'Sports & Extracurricular Facilities Levy', amount: 200.00 }
        ];
        await db.query(
          `INSERT INTO fee_invoices (learner_id, parent_id, invoice_number, title, description, category, term, amount, paid_amount, balance, status, due_date, itemized_breakdown, created_at)
           VALUES ($1, $2, $3, $4, $5, 'Tuition', 'Term 1 2026', 4500.00, 0.00, 4500.00, 'pending', '2026-03-31', $6, NOW())`,
          [
            childId,
            parentUserId,
            invoiceNum,
            `Term 1 School Fees — Grade ${gradeApplied}`,
            `Official tuition invoice for newly enrolled learner ${app.first_name} ${app.surname}.`,
            JSON.stringify(breakdown)
          ]
        );
      }

      // (f) Send Official Welcome Email with Credentials to Parent
      if (app.primary_parent_email) {
        try {
          await emailService.sendParentWelcome({
            email: app.primary_parent_email,
            parentName: `${app.primary_parent_name} ${app.primary_parent_surname}`,
            childName: `${app.first_name} ${app.surname}`,
            learnerNumber: provNumber,
            temporaryPassword: defaultPassword
          });
        } catch (emailErr) {
          console.warn('[ENROLLMENT WELCOME EMAIL ERROR]:', emailErr.message);
        }
      }

      enrollmentDetails = {
        learner_number: provNumber,
        learner_user_id: learnerUserId,
        parent_user_id: parentUserId,
        child_id: childId,
        temporary_password: defaultPassword
      };
    }

    const finalStatus = (status === 'approved' || status === 'enrolled') ? 'enrolled' : status;

    await db.query(`
      UPDATE applications SET
        status = $1,
        admin_notes = $2,
        assigned_class_id = $3,
        provisional_learner_number = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
    `, [finalStatus, admin_notes || app.admin_notes, assigned_class_id || app.assigned_class_id, provNumber, id]);

    // Send Rejection or Approval Email
    const baseUrl = getRequestBaseUrl(req);
    const parentFullName = `${app.primary_parent_name} ${app.primary_parent_surname}`;
    const learnerFullName = `${app.first_name} ${app.surname}`;
    const registrationUrl = `${baseUrl}/register?appRef=${app.application_number}&email=${encodeURIComponent(app.primary_parent_email)}&firstName=${encodeURIComponent(app.first_name)}&surname=${encodeURIComponent(app.surname)}&idNumber=${encodeURIComponent(app.id_number || '')}&grade=${encodeURIComponent(app.grade_applied)}&stream=${encodeURIComponent(app.stream || 'General')}`;

    if (status === 'rejected') {
      try {
        await emailService.sendApplicationUnsuccessful({
          parentEmail: app.primary_parent_email,
          parentName: parentFullName,
          learnerName: learnerFullName,
          grade: app.grade_applied,
          applicationNumber: app.application_number,
          reason: admin_notes || 'School capacity constraints or admission criteria not met.'
        });
      } catch (err) {
        console.warn('Rejection email notice failed:', err.message);
      }
    } else if (status === 'approved') {
      try {
        const appFeeUnpaid = (app.application_fee_status !== 'paid');
        await emailService.sendApplicationApprovedWithFeeNotice({
          parentEmail: app.primary_parent_email,
          parentName: parentFullName,
          learnerName: learnerFullName,
          schoolName: app.school_name || 'Fusion High School',
          applicationNumber: app.application_number,
          grade: app.grade_applied,
          stream: app.stream,
          assignedClass: null,
          appFeeUnpaid,
          appFeeAmount: app.application_fee_amount || 250,
          regFeeAmount: app.registration_fee_amount || 1500,
          registrationUrl
        });
      } catch (err) {
        console.warn('Approval email notice failed:', err.message);
      }
    }

    // Update status in Firebase Cloud Firestore
    if (firestore) {
      setImmediate(async () => {
        try {
          await firestore.collection('applications').doc(String(id)).set({
            status: finalStatus,
            admin_notes: admin_notes || app.admin_notes || null,
            provisional_learner_number: provNumber || null,
            updated_at: new Date()
          }, { merge: true });
        } catch (fbStatusErr) {
          console.warn('[FIREBASE APPLICATION STATUS UPDATE WARNING]:', fbStatusErr.message);
        }
      });
    }

    res.json({
      success: true,
      message: (status === 'approved' || status === 'enrolled')
        ? `Application approved & learner officially enrolled in 1 click! Learner Number: ${provNumber}. Welcome credentials sent to parent.`
        : `Application status updated to ${status}. Notification email dispatched.`,
      status: finalStatus,
      enrollment: enrollmentDetails
    });
  } catch (err) {
    console.error('[ADMIN REVIEW ERROR]:', err);
    res.status(500).json({ error: 'Failed to process application enrollment: ' + err.message });
  }
};

/**
 * Parent: Pay Application Fee (Online / EFT Confirmation)
 */
exports.payApplicationFee = async (req, res) => {
  const { id } = req.params;
  const { payment_method = 'instant_online', payment_reference } = req.body;

  try {
    const appRes = await db.query(
      `SELECT a.*, s.name as school_name 
       FROM applications a 
       LEFT JOIN schools s ON a.school_id = s.id 
       WHERE a.id::text = $1::text OR a.application_number = $1::text`,
      [id]
    );
    if (appRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Application not found.' });
    }

    const app = appRes.rows[0];
    const amount = parseFloat(app.application_fee_amount) || 250.00;
    const payRef = payment_reference || `PAY-APP-${Date.now().toString().slice(-8)}`;
    const receiptNo = `REC-APP-${Date.now().toString().slice(-6)}`;

    // Update application fee status
    await db.query(`
      UPDATE applications SET
        application_fee_status = 'paid',
        application_fee_paid_at = NOW(),
        payment_method = $1,
        payment_reference = $2,
        updated_at = NOW()
      WHERE id = $3
    `, [payment_method, payRef, app.id]);

    // Record in application_payments
    await db.query(`
      INSERT INTO application_payments (
        application_id, fee_type, amount, payment_method, payment_reference, receipt_number, payer_name, payer_email, status, created_at
      ) VALUES ($1, 'application_fee', $2, $3, $4, $5, $6, $7, 'completed', NOW())
    `, [
      app.id, amount, payment_method, payRef, receiptNo,
      `${app.primary_parent_name} ${app.primary_parent_surname}`, app.primary_parent_email
    ]);

    // Send confirmation email
    await emailService.sendApplicationFeePaymentReceived({
      parentEmail: app.primary_parent_email,
      parentName: `${app.primary_parent_name} ${app.primary_parent_surname}`,
      learnerName: `${app.first_name} ${app.surname}`,
      schoolName: app.school_name || 'Fusion High School',
      applicationNumber: app.application_number,
      amountPaid: amount,
      receiptNumber: receiptNo
    });

    res.json({
      success: true,
      message: `Application fee of R${amount.toFixed(2)} received successfully! Confirmation receipt has been emailed to ${app.primary_parent_email}.`,
      receipt_number: receiptNo,
      application_fee_status: 'paid'
    });
  } catch (err) {
    console.error('Error paying application fee:', err);
    res.status(500).json({ success: false, error: 'Failed to process application fee payment: ' + err.message });
  }
};

/**
 * Parent: Pay Registration Fee & Finalize Enrollment with Grade, Class & Allocated Subjects
 */
exports.payRegistrationFeeAndFinalize = async (req, res) => {
  const { id } = req.params;
  const { payment_method = 'instant_online', payment_reference } = req.body;

  try {
    const appRes = await db.query(
      `SELECT a.*, s.name as school_name, s.slug as school_slug, c.name as assigned_class_name
       FROM applications a
       LEFT JOIN schools s ON a.school_id = s.id
       LEFT JOIN classes c ON a.assigned_class_id = c.id
       WHERE a.id::text = $1::text OR a.application_number = $1::text`,
      [id]
    );

    if (appRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Application not found.' });
    }

    const app = appRes.rows[0];
    const regFeeAmount = parseFloat(app.registration_fee_amount) || 1500.00;
    const payRef = payment_reference || `PAY-REG-${Date.now().toString().slice(-8)}`;
    const receiptNo = `REC-REG-${Date.now().toString().slice(-6)}`;

    // 1. Generate or resolve Official Learner Number
    let officialLearnerNo = app.provisional_learner_number;
    if (!officialLearnerNo) {
      officialLearnerNo = await applicationService.generateProvisionalLearnerNumber(app.grade_applied);
    }

    // 2. Class allocation
    const gradeApplied = parseInt(app.grade_applied, 10);
    const stream = app.stream || 'General';
    const homeLanguage = (app.home_language || 'Sepedi').trim();
    let assignedClassId = app.assigned_class_id;
    let assignedClassName = app.assigned_class_name;

    if (!assignedClassId) {
      const allocatedClass = await applicationService.allocateAvailableClass(gradeApplied, stream);
      if (allocatedClass) {
        assignedClassId = allocatedClass.id;
        assignedClassName = allocatedClass.name;
      }
    }

    if (!assignedClassName) {
      if (assignedClassId) {
        try {
          const clsRes = await db.query('SELECT name FROM classes WHERE id = $1', [assignedClassId]);
          if (clsRes.rows.length > 0) assignedClassName = clsRes.rows[0].name;
        } catch (_) {}
      }
      if (!assignedClassName) {
        assignedClassName = `Grade ${gradeApplied}A`;
      }
    }

    // 3. Curriculum allocation
    const allocatedSubjects = curriculumService.getSubjectsForGradeAndStream(gradeApplied, stream, homeLanguage);

    // 4. Create Parent User if doesn't exist
    let parentUserId = null;
    const parentEmailClean = app.primary_parent_email.trim().toLowerCase();
    const parentInitialPw = 'Parent@2026';
    const hashedParentPw = await bcrypt.hash(parentInitialPw, 10);

    const existingParent = await db.query('SELECT id, email FROM users WHERE LOWER(email) = $1 LIMIT 1', [parentEmailClean]);
    if (existingParent.rows.length > 0) {
      parentUserId = existingParent.rows[0].id;
    } else {
      const parentRoleRes = await db.query("SELECT id FROM roles WHERE name = 'parent' LIMIT 1");
      const parentRoleId = parentRoleRes.rows[0]?.id || 4;
      const newParentRes = await db.query(
        `INSERT INTO users (full_name, surname, email, password_hash, phone, id_number, role_id, school_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING id`,
        [app.primary_parent_name, app.primary_parent_surname, parentEmailClean, hashedParentPw, app.primary_parent_phone || null, app.primary_parent_id_number || null, parentRoleId, app.school_id || 1]
      );
      parentUserId = newParentRes.rows[0].id;
    }

    // 5. Create Learner User if doesn't exist
    let learnerUserId = null;
    const learnerInitialPw = (app.id_number && app.id_number.trim().length >= 6) ? generateLearnerPasswordFromID(app.id_number.trim()) : '123456';
    const hashedLearnerPw = await bcrypt.hash(learnerInitialPw, 10);
    const learnerEmail = app.email ? app.email.trim().toLowerCase() : `${officialLearnerNo.toLowerCase()}@fusionhigh.co.za`;

    const existingLearner = await db.query('SELECT id, email FROM users WHERE LOWER(email) = $1 LIMIT 1', [learnerEmail]);
    if (existingLearner.rows.length > 0) {
      learnerUserId = existingLearner.rows[0].id;
    } else {
      const learnerRoleRes = await db.query("SELECT id FROM roles WHERE name = 'learner' LIMIT 1");
      const learnerRoleId = learnerRoleRes.rows[0]?.id || 3;
      const newLearnerRes = await db.query(
        `INSERT INTO users (full_name, surname, email, password_hash, phone, id_number, role_id, school_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING id`,
        [app.first_name, app.surname, learnerEmail, hashedLearnerPw, app.phone || null, app.id_number || null, learnerRoleId, app.school_id || 1]
      );
      learnerUserId = newLearnerRes.rows[0].id;
    }

    // 6. Create or update children record
    let childId;
    const childCheck = await db.query('SELECT id FROM children WHERE learner_number = $1 OR application_number = $2 LIMIT 1', [officialLearnerNo, app.application_number]);
    if (childCheck.rows.length > 0) {
      childId = childCheck.rows[0].id;
      await db.query(
        `UPDATE children SET
           full_name = $1, surname = $2, grade = $3, stream = $4, home_language = $5,
           subjects = $6, parent_id = $7, learner_user_id = $8, class_id = $9, is_active = TRUE
         WHERE id = $10`,
        [app.first_name, app.surname, gradeApplied, stream, homeLanguage, allocatedSubjects, parentUserId, learnerUserId, assignedClassId, childId]
      );
    } else {
      const childInsert = await db.query(
        `INSERT INTO children (full_name, surname, learner_number, grade, stream, home_language, subjects, parent_id, learner_user_id, application_number, class_id, is_active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, TRUE, NOW()) RETURNING id`,
        [app.first_name, app.surname, officialLearnerNo, gradeApplied, stream, homeLanguage, allocatedSubjects, parentUserId, learnerUserId, app.application_number, assignedClassId]
      );
      childId = childInsert.rows[0].id;
    }

    // Link in parent_children table
    if (parentUserId && childId) {
      try {
        await db.query(`INSERT INTO parent_children (parent_id, child_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [parentUserId, childId]);
      } catch (_) {}
    }

    // 7. Update Application status
    await db.query(`
      UPDATE applications SET
        status = 'enrolled',
        registration_fee_status = 'paid',
        registration_fee_paid_at = NOW(),
        assigned_class_id = $1,
        provisional_learner_number = $2,
        updated_at = NOW()
      WHERE id = $3
    `, [assignedClassId, officialLearnerNo, app.id]);

    // 8. Record in application_payments
    await db.query(`
      INSERT INTO application_payments (
        application_id, fee_type, amount, payment_method, payment_reference, receipt_number, payer_name, payer_email, status, created_at
      ) VALUES ($1, 'registration_fee', $2, $3, $4, $5, $6, $7, 'completed', NOW())
    `, [
      app.id, regFeeAmount, payment_method, payRef, receiptNo,
      `${app.primary_parent_name} ${app.primary_parent_surname}`, app.primary_parent_email
    ]);

    // 9. Send Final Enrollment Email with Grade, Class, Subjects, and Credentials!
    const baseUrl = getRequestBaseUrl(req);
    await emailService.sendRegistrationSuccessWithAllocation({
      parentEmail: app.primary_parent_email,
      parentName: `${app.primary_parent_name} ${app.primary_parent_surname}`,
      learnerName: `${app.first_name} ${app.surname}`,
      schoolName: app.school_name || 'Fusion High School',
      learnerNumber: officialLearnerNo,
      grade: gradeApplied,
      stream,
      assignedClass: assignedClassName,
      subjects: allocatedSubjects,
      parentEmail: app.primary_parent_email,
      parentPassword: parentInitialPw,
      learnerEmail: learnerEmail,
      learnerPassword: learnerInitialPw,
      portalUrl: `${baseUrl}/login`
    });

    res.json({
      success: true,
      message: `Registration finalized! Enrollment confirmed for ${app.first_name} ${app.surname} in Grade ${gradeApplied} (${assignedClassName}). Official confirmation email with all subjects and portal credentials has been sent!`,
      status: 'enrolled',
      learner_number: officialLearnerNo,
      assigned_class: assignedClassName,
      class_name: assignedClassName,
      subjects: allocatedSubjects,
      receipt_number: receiptNo
    });
  } catch (err) {
    console.error('Error finalizing registration:', err);
    res.status(500).json({ success: false, error: 'Failed to process registration fee: ' + err.message });
  }
};

/**
 * Automated 3-Day Fee Reminder Trigger
 */
exports.triggerFeeReminders = async (req, res) => {
  try {
    const dueApps = await db.query(`
      SELECT a.*, s.name as school_name, s.bank_name, s.account_number, s.branch_code, s.account_holder
      FROM applications a
      LEFT JOIN schools s ON a.school_id = s.id
      WHERE a.application_fee_status = 'unpaid'
        AND a.application_fee_reminder_sent = FALSE
        AND a.application_fee_due_date <= (CURRENT_TIMESTAMP + INTERVAL '3 days')
        AND a.application_fee_due_date >= CURRENT_TIMESTAMP
    `);

    let sentCount = 0;
    const baseUrl = getRequestBaseUrl(req);

    for (const app of dueApps.rows) {
      try {
        const dueDate = new Date(app.application_fee_due_date);
        await emailService.sendApplicationFeeReminder({
          parentEmail: app.primary_parent_email,
          parentName: `${app.primary_parent_name} ${app.primary_parent_surname}`,
          learnerName: `${app.first_name} ${app.surname}`,
          schoolName: app.school_name || 'Fusion High School',
          applicationNumber: app.application_number,
          feeAmount: parseFloat(app.application_fee_amount) || 250,
          dueDateStr: dueDate.toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' }),
          bankDetails: {
            bank_name: app.bank_name,
            account_number: app.account_number,
            branch_code: app.branch_code,
            account_holder: app.account_holder
          },
          paymentUrl: `${baseUrl}/application.html?appRef=${app.application_number}&pay=true`
        });

        await db.query('UPDATE applications SET application_fee_reminder_sent = TRUE WHERE id = $1', [app.id]);
        sentCount++;
      } catch (sendErr) {
        console.warn(`[REMINDER ERROR for app ${app.application_number}]:`, sendErr.message);
      }
    }

    res.json({
      success: true,
      message: `Triggered application fee reminders. Sent ${sentCount} reminders.`,
      reminders_sent: sentCount
    });
  } catch (err) {
    console.error('Error triggering fee reminders:', err);
    res.status(500).json({ success: false, error: 'Failed to process fee reminders.' });
  }
};

