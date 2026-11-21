const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  APPLICATION_STATUSES,
  normalizeApplicationStatus,
  getStatusLabel,
  validateApplicationTransition,
  validateApprovalDispatchPayload,
  validateDocumentRequestPayload,
  evaluateLearnerDashboardAccess,
  redactSensitiveFields
} = require('../lib/applicationLifecycle');

const { buildAcceptanceLetterModel } = require('../lib/learnerRegistrationWorkflow');
const { generateAcceptanceLetterPdf } = require('../public/src/services/acceptanceLetterPdfService');
const emailService = require('../public/src/services/emailService');

describe('Application lifecycle domain rules', () => {
  it('normalizes legacy and canonical application statuses cleanly', () => {
    assert.equal(normalizeApplicationStatus('pending'), 'submitted');
    assert.equal(normalizeApplicationStatus('awaiting_review'), 'submitted');
    assert.equal(normalizeApplicationStatus('declined'), 'rejected');
    assert.equal(normalizeApplicationStatus('DOCUMENTS_REQUESTED'), 'documents_requested');
    assert.equal(normalizeApplicationStatus('documents_submitted'), 'documents_submitted');
    assert.equal(normalizeApplicationStatus('approved'), 'approved');
    assert.equal(normalizeApplicationStatus('enrolled'), 'enrolled');
    assert.equal(APPLICATION_STATUSES.DOCUMENTS_REQUESTED, 'documents_requested');
    assert.equal(getStatusLabel('documents_requested'), 'Additional Documentation Required');
    assert.equal(getStatusLabel('approved'), 'Accepted / Approved — Registration Pending');
  });

  it('enforces state machine and RBAC transitions strictly', () => {
    // School admin can move submitted -> documents_requested -> approved
    assert.equal(
      validateApplicationTransition({ fromStatus: 'submitted', toStatus: 'documents_requested', actorRole: 'principal' }).allowed,
      true
    );
    assert.equal(
      validateApplicationTransition({ fromStatus: 'documents_submitted', toStatus: 'approved', actorRole: 'school_admin' }).allowed,
      true
    );

    // Parent/Learner applicants can NEVER approve, decline, or enroll
    const parentApprove = validateApplicationTransition({ fromStatus: 'submitted', toStatus: 'approved', actorRole: 'parent' });
    assert.equal(parentApprove.allowed, false);
    assert.equal(parentApprove.code, 'UNAUTHORIZED_STATUS_CHANGE');

    const learnerApprove = validateApplicationTransition({ fromStatus: 'submitted', toStatus: 'approved', actorRole: 'learner' });
    assert.equal(learnerApprove.allowed, false);

    // Applicant CAN submit requested documents
    const parentUpload = validateApplicationTransition({
      fromStatus: 'documents_requested',
      toStatus: 'documents_submitted',
      actorRole: 'parent'
    });
    assert.equal(parentUpload.allowed, true);

    // Cannot skip approval straight into enrolled
    const skipApproval = validateApplicationTransition({
      fromStatus: 'submitted',
      toStatus: 'enrolled',
      actorRole: 'principal'
    });
    assert.equal(skipApproval.allowed, false);
    assert.equal(skipApproval.code, 'REGISTRATION_WORKFLOW_REQUIRED');

    // System registration completion transitions approved -> enrolled
    const systemEnroll = validateApplicationTransition({
      fromStatus: 'approved',
      toStatus: 'enrolled',
      systemTransition: true
    });
    assert.equal(systemEnroll.allowed, true);

    // Enrolled is terminal and cannot be reverted or declined
    const mutateEnrolled = validateApplicationTransition({
      fromStatus: 'enrolled',
      toStatus: 'rejected',
      actorRole: 'admin',
      isSuperadmin: true
    });
    assert.equal(mutateEnrolled.allowed, false);
    assert.equal(mutateEnrolled.code, 'TERMINAL_STATUS');
  });

  it('validates approval dispatch payload and blocks missing Learner Number or mandatory fields', () => {
    const valid = validateApprovalDispatchPayload({
      learnerNumber: '2027-0001',
      applicationNumber: 'APP-2027-001',
      grade: 10,
      academicYear: 2027,
      schoolName: 'Walters High School',
      learnerName: 'Thabo Mokoena',
      parentEmail: 'parent@example.co.za'
    });
    assert.equal(valid.valid, true);

    const missingLearnerNo = validateApprovalDispatchPayload({
      learnerNumber: '',
      applicationNumber: 'APP-2027-001',
      grade: 10,
      academicYear: 2027,
      schoolName: 'Walters High School',
      learnerName: 'Thabo Mokoena',
      parentEmail: 'parent@example.co.za'
    });
    assert.equal(missingLearnerNo.valid, false);
    assert.ok(missingLearnerNo.missing.includes('learnerNumber'));

    const missingGradeAndSchool = validateApprovalDispatchPayload({
      learnerNumber: '2027-0002',
      applicationNumber: 'APP-2027-002',
      grade: null,
      academicYear: null,
      schoolName: '',
      learnerName: 'Naledi Sithole',
      parentEmail: 'parent@example.co.za'
    });
    assert.equal(missingGradeAndSchool.valid, false);
    assert.ok(missingGradeAndSchool.missing.includes('grade'));
    assert.ok(missingGradeAndSchool.missing.includes('schoolName'));
  });

  it('validates documentation request payloads strictly', () => {
    const empty = validateDocumentRequestPayload({ required_documents: [], instructions: '' });
    assert.equal(empty.valid, false);

    const invalidDate = validateDocumentRequestPayload({
      required_documents: ['report_card'],
      instructions: 'Please upload your latest report card.',
      deadline: 'not-a-date'
    });
    assert.equal(invalidDate.valid, false);

    const valid = validateDocumentRequestPayload({
      required_documents: ['report_card', 'proof_of_residence', 'report_card'],
      instructions: 'Please upload certified copies of these documents.',
      deadline: '2027-01-15'
    });
    assert.equal(valid.valid, true);
    assert.equal(valid.value.required_documents.length, 2);
    assert.equal(valid.value.required_documents[0].document_type, 'report_card');
    assert.equal(valid.value.required_documents[1].document_type, 'proof_of_residence');
  });

  it('enforces Restricted Applicant Dashboard until active Learner Registration is complete', () => {
    const submittedAccess = evaluateLearnerDashboardAccess({
      role: 'learner',
      activeChildren: [],
      applications: [{ id: 1, status: 'submitted', application_number: 'APP-1' }]
    });
    assert.equal(submittedAccess.mode, 'restricted_applicant');
    assert.equal(submittedAccess.isRestrictedApplicant, true);
    assert.deepEqual(submittedAccess.allowedModules, ['applications', 'registration', 'profile', 'settings']);
    assert.ok(!submittedAccess.allowedModules.includes('subjects'));
    assert.ok(!submittedAccess.allowedModules.includes('timetable'));
    assert.ok(!submittedAccess.allowedModules.includes('grades'));

    const approvedNotEnrolled = evaluateLearnerDashboardAccess({
      role: 'learner',
      activeChildren: [],
      applications: [{ id: 1, status: 'approved', provisional_learner_number: '2027-0010' }]
    });
    assert.equal(approvedNotEnrolled.mode, 'restricted_applicant');
    assert.equal(approvedNotEnrolled.isRestrictedApplicant, true);
    assert.equal(approvedNotEnrolled.hasApprovedApplication, true);

    const enrolledAccess = evaluateLearnerDashboardAccess({
      role: 'learner',
      activeChildren: [{ id: 77, is_active: true, school_id: 1, grade: 10, learner_number: '2027-0010' }],
      applications: [{ id: 1, status: 'enrolled', provisional_learner_number: '2027-0010' }]
    });
    assert.equal(enrolledAccess.mode, 'enrolled');
    assert.equal(enrolledAccess.isRestrictedApplicant, false);
    assert.equal(enrolledAccess.hasActiveEnrollment, true);
    assert.equal(enrolledAccess.learnerNumber, '2027-0010');
  });

  it('redacts tokens, passwords, and secrets before persisting logs', () => {
    const clean = redactSensitiveFields({
      application_number: 'APP-2027-001',
      learner_number: '2027-0001',
      password: 'should-not-appear',
      raw_token: 'secret-token-xyz',
      activation_url: 'https://app.gelezasa.co.za/activate?token=secret-token-xyz',
      nested: { password_hash: 'hash123', safe_field: 'ok' }
    });
    assert.equal(clean.application_number, 'APP-2027-001');
    assert.equal(clean.learner_number, '2027-0001');
    assert.equal(clean.password, '[REDACTED]');
    assert.equal(clean.raw_token, '[REDACTED]');
    assert.equal(clean.activation_url, '[REDACTED]');
    assert.equal(clean.nested.password_hash, '[REDACTED]');
    assert.equal(clean.nested.safe_field, 'ok');
  });
});

describe('Lifecycle Email Templates (Emails 1–7) & Acceptance Letter PDF', () => {
  const forbiddenPasswordPatterns = [/Parent@2026/i, /Temporary Password/i, /Default Password/i, /Password:\s*\S+/i];

  function assertNoPlaintextPassword(html, label) {
    for (const pattern of forbiddenPasswordPatterns) {
      assert.doesNotMatch(html, pattern, `${label} must NEVER contain plaintext passwords`);
    }
  }

  it('Email 1 (Application Submission Confirmation) contains tracking info and clarifies submission is not approval', () => {
    const tpl = emailService.templates.applicationReceivedConfirmation({
      recipientName: 'Lerato Dlamini',
      parentName: 'Lerato Dlamini',
      learnerName: 'Sipho Dlamini',
      applicationNumber: 'APP-2027-1042',
      schoolName: 'Walters High School',
      schoolEmail: 'admissions@waltershigh.co.za',
      schoolPhone: '011 555 0101',
      grade: 10,
      academicYear: 2027,
      dashboardUrl: 'https://geleza-sa.web.app/dashboard/parent?tab=registration',
      activationUrl: 'https://geleza-sa.web.app/activate?token=tok-123'
    });
    assert.match(tpl.subject, /APP-2027-1042/);
    assert.match(tpl.subject, /Walters High School/);
    assert.match(tpl.body, /APP-2027-1042/);
    assert.match(tpl.body, /Grade 10/);
    assert.match(tpl.body, /2027/);
    assert.match(tpl.body, /does not mean admission has been approved/i);
    assert.match(tpl.body, /Set Password &amp; Track Application/i);
    assertNoPlaintextPassword(tpl.body, 'Email 1');
  });

  it('Email 2 (Documentation Requested) lists exact required documents and deadline', () => {
    const tpl = emailService.templates.documentationRequested({
      recipientName: 'Lerato Dlamini',
      learnerName: 'Sipho Dlamini',
      applicationNumber: 'APP-2027-1042',
      schoolName: 'Walters High School',
      grade: 10,
      academicYear: 2027,
      requiredDocuments: ['Latest School Report', 'Certified Birth Certificate'],
      instructions: 'Please ensure all pages are clearly legible.',
      deadline: '2027-01-20',
      dashboardUrl: 'https://geleza-sa.web.app/dashboard/parent?tab=registration'
    });
    assert.match(tpl.subject, /Additional Documents Required/i);
    assert.match(tpl.body, /Latest School Report/);
    assert.match(tpl.body, /Certified Birth Certificate/);
    assert.match(tpl.body, /20 January 2027|2027/);
    assert.match(tpl.body, /APP-2027-1042/);
    assertNoPlaintextPassword(tpl.body, 'Email 2');
  });

  it('Email 3 (Documentation Submitted) notifies school reviewer with real applicant details', () => {
    const tpl = emailService.templates.documentationSubmittedReviewer({
      schoolName: 'Walters High School',
      learnerName: 'Sipho Dlamini',
      applicationNumber: 'APP-2027-1042',
      grade: 10,
      documentType: 'Latest School Report',
      fileName: 'sipho_report_2026.pdf',
      reviewUrl: 'https://geleza-sa.web.app/dashboard/admin?tab=users'
    });
    assert.match(tpl.subject, /APP-2027-1042/);
    assert.match(tpl.body, /Sipho Dlamini/);
    assert.match(tpl.body, /Latest School Report/);
    assert.match(tpl.body, /sipho_report_2026\.pdf/);
    assertNoPlaintextPassword(tpl.body, 'Email 3');
  });

  it('Email 4 (Documentation Reviewed) handles accepted and resubmission required states', () => {
    const accepted = emailService.templates.documentationReviewed({
      recipientName: 'Lerato Dlamini',
      learnerName: 'Sipho Dlamini',
      applicationNumber: 'APP-2027-1042',
      schoolName: 'Walters High School',
      outcome: 'approved',
      reviewNotes: 'Verified clearly.',
      nextStatusLabel: 'Under Review',
      dashboardUrl: 'https://geleza-sa.web.app/dashboard/parent?tab=registration'
    });
    assert.match(accepted.subject, /Accepted/i);
    assert.match(accepted.body, /Verified clearly/);

    const rejected = emailService.templates.documentationReviewed({
      recipientName: 'Lerato Dlamini',
      learnerName: 'Sipho Dlamini',
      applicationNumber: 'APP-2027-1042',
      schoolName: 'Walters High School',
      outcome: 'rejected',
      reviewNotes: 'Statement is older than 3 months.',
      nextStatusLabel: 'Documents Requested',
      dashboardUrl: 'https://geleza-sa.web.app/dashboard/parent?tab=registration'
    });
    assert.match(rejected.subject, /Update Required/i);
    assert.match(rejected.body, /Statement is older than 3 months/);
    assertNoPlaintextPassword(rejected.body, 'Email 4');
  });

  it('Email 5 (Application Approved) prominently includes Learner Number, Ref, Grade, Year, School, and Secure Onboarding without plaintext password', () => {
    const tpl = emailService.templates.integratedAcceptanceLetter({
      parentName: 'Lerato Dlamini',
      learnerName: 'Sipho Dlamini',
      learnerNumber: '2027-0042',
      applicationNumber: 'APP-2027-1042',
      acceptanceReference: 'ACC-2027-1042',
      schoolName: 'Walters High School',
      schoolEmail: 'admissions@waltershigh.co.za',
      schoolPhone: '011 555 0101',
      schoolAddress: '12 Main Rd, Polokwane',
      schoolEmis: '592489761',
      grade: 10,
      academicYear: 2027,
      stream: 'Science',
      homeLanguage: 'Sepedi Home Language',
      firstAdditionalLanguage: 'English FAL',
      selectedSubjects: ['Mathematics', 'Physical Sciences', 'Life Sciences', 'Life Orientation'],
      activationUrl: 'https://geleza-sa.web.app/activate?token=secure-one-time-tok',
      dashboardRegistrationUrl: 'https://geleza-sa.web.app/dashboard/parent?tab=registration'
    });
    assert.match(tpl.subject, /2027-0042/);
    assert.match(tpl.subject, /Approved|Accepted/i);
    assert.match(tpl.body, /2027-0042/);
    assert.match(tpl.body, /APP-2027-1042/);
    assert.match(tpl.body, /Grade 10/);
    assert.match(tpl.body, /2027/);
    assert.match(tpl.body, /Walters High School/);
    assert.match(tpl.body, /admissions@waltershigh\.co\.za/);
    assert.match(tpl.body, /https:\/\/geleza-sa\.web\.app\/activate\?token=secure-one-time-tok/);
    assert.match(tpl.body, /Complete Learner Registration/i);
    assertNoPlaintextPassword(tpl.body, 'Email 5');
  });

  it('Email 6 (Application Declined) clearly communicates decision and reason without creating enrollment', () => {
    const tpl = emailService.templates.applicationUnsuccessful({
      parentName: 'Lerato Dlamini',
      learnerName: 'Sipho Dlamini',
      applicationNumber: 'APP-2027-1043',
      schoolName: 'Walters High School',
      schoolEmail: 'admissions@waltershigh.co.za',
      schoolPhone: '011 555 0101',
      grade: 10,
      academicYear: 2027,
      reason: 'All Grade 10 seats for the 2027 intake have been filled.',
      dashboardUrl: 'https://geleza-sa.web.app/dashboard/parent?tab=registration'
    });
    assert.match(tpl.subject, /APP-2027-1043/);
    assert.match(tpl.body, /All Grade 10 seats for the 2027 intake have been filled/);
    assert.match(tpl.body, /Walters High School/);
    assertNoPlaintextPassword(tpl.body, 'Email 6');
  });

  it('Email 7 (Registration Completed) includes Learner Number, Assigned Class, Subjects, and Full Dashboard link', () => {
    const tpl = emailService.templates.registrationCompletedConfirmation({
      recipientName: 'Lerato Dlamini',
      learnerName: 'Sipho Dlamini',
      learnerNumber: '2027-0042',
      applicationNumber: 'APP-2027-1042',
      schoolName: 'Walters High School',
      grade: 10,
      academicYear: 2027,
      className: '10-A',
      selectedSubjects: ['Sepedi Home Language', 'English FAL', 'Mathematics', 'Physical Sciences', 'Life Sciences', 'Accounting', 'Life Orientation'],
      dashboardUrl: 'https://geleza-sa.web.app/dashboard/learner'
    });
    assert.match(tpl.subject, /2027-0042/);
    assert.match(tpl.body, /2027-0042/);
    assert.match(tpl.body, /10-A/);
    assert.match(tpl.body, /Physical Sciences/);
    assert.match(tpl.body, /https:\/\/geleza-sa\.web\.app\/dashboard\/learner/);
    assertNoPlaintextPassword(tpl.body, 'Email 7');
  });

  it('Acceptance Letter model & PDF include the Official Learner Number', async () => {
    const payload = {
      application: {
        application_number: 'APP-2027-1042',
        provisional_learner_number: '2027-0042',
        first_name: 'Sipho',
        surname: 'Dlamini',
        grade_applied: 10,
        stream: 'Science',
        home_language: 'Sepedi Home Language',
        first_additional_language: 'English FAL',
        academic_year: 2027
      },
      school: {
        name: 'Walters High School',
        emis_number: '592489761',
        phone: '011 555 0101',
        email: 'admissions@waltershigh.co.za',
        address: '12 Main Rd, Polokwane'
      },
      registration: {
        academic_year: 2027,
        learner_number: '2027-0042'
      }
    };
    const model = buildAcceptanceLetterModel(payload);
    assert.equal(model.learner.learnerNumber, '2027-0042');
    const pdfResult = await generateAcceptanceLetterPdf(payload);
    assert.ok(Buffer.isBuffer(pdfResult.buffer) && pdfResult.buffer.length > 500);
    assert.equal(pdfResult.buffer.subarray(0, 5).toString('utf8'), '%PDF-');
    assert.match(pdfResult.filename, /Acceptance_Letter_APP-2027-1042\.pdf/);
  });
});

describe('Security & static regression guards', () => {
  it('applicationController never hardcodes Parent@2026 or emails plaintext passwords', () => {
    const src = fs.readFileSync(path.join(__dirname, '../public/src/controller/applicationController.js'), 'utf8');
    assert.doesNotMatch(src, /Parent@2026/);
    assert.doesNotMatch(src, /generateLearnerPasswordFromID/);
    assert.doesNotMatch(src, /OR a\.school_id IS NULL/i);
  });

  it('LearnerOverview has no hardcoded default className 10A and AdminUsers has no fake OCR fallback strings', () => {
    const overview = fs.readFileSync(path.join(__dirname, '../client/src/pages/learner/LearnerOverview.tsx'), 'utf8');
    assert.doesNotMatch(overview, /className:\s*'10A'/);

    const adminUsers = fs.readFileSync(path.join(__dirname, '../client/src/pages/admin/AdminUsers.tsx'), 'utf8');
    assert.doesNotMatch(adminUsers, /98\.5% Verified/);
    assert.doesNotMatch(adminUsers, /Official school stamp and signatures appear authentic/);
  });

  it('learnerRoutes applies requireActiveLearnerEnrollment across academic and AI tutor routes', () => {
    const routesSrc = fs.readFileSync(path.join(__dirname, '../public/src/routes/learnerRoutes.js'), 'utf8');
    assert.match(routesSrc, /router\.get\('\/access-status'/);
    assert.match(routesSrc, /router\.use\(requireActiveLearnerEnrollment\)/);
    assert.match(routesSrc, /\/ai-tutor\/subjects'.*requireActiveLearnerEnrollment/);
    assert.match(routesSrc, /\/subject-resources'.*requireActiveLearnerEnrollment/);
  });

  it('applicationController enforces magic-byte content signatures for uploaded documents', () => {
    const os = require('os');
    const { matchesAllowedMagicBytes } = require('../lib/applicationLifecycle');
    const appCtrlSrc = fs.readFileSync(path.join(__dirname, '../public/src/controller/applicationController.js'), 'utf8');
    assert.match(appCtrlSrc, /matchesAllowedMagicBytes/);
    const tmpDir = os.tmpdir();
    const validPdf = path.join(tmpDir, `valid_${Date.now()}.pdf`);
    const spoofedPdf = path.join(tmpDir, `spoofed_${Date.now()}.pdf`);
    const validWebp = path.join(tmpDir, `valid_${Date.now()}.webp`);
    try {
      fs.writeFileSync(validPdf, Buffer.from('%PDF-1.4\n%%EOF'));
      fs.writeFileSync(spoofedPdf, Buffer.from('<html><script>alert(1)</script></html>'));
      fs.writeFileSync(validWebp, Buffer.from('RIFF\x10\x00\x00\x00WEBP', 'binary'));
      assert.equal(matchesAllowedMagicBytes(validPdf, 'application/pdf'), true);
      assert.equal(matchesAllowedMagicBytes(spoofedPdf, 'application/pdf'), false);
      assert.equal(matchesAllowedMagicBytes(validWebp, 'image/webp'), true);
      assert.equal(matchesAllowedMagicBytes(validPdf, 'image/png'), false);
    } finally {
      for (const f of [validPdf, spoofedPdf, validWebp]) {
        try { fs.unlinkSync(f); } catch (_) {}
      }
    }
  });

  it('fetchSchoolDetails and fetchSchoolById never query non-existent schools.logo_stored_name column', () => {
    const lifecycleSrc = fs.readFileSync(path.join(__dirname, '../public/src/services/applicationLifecycleService.js'), 'utf8');
    const regSrc = fs.readFileSync(path.join(__dirname, '../public/src/services/learnerRegistrationService.js'), 'utf8');
    assert.doesNotMatch(lifecycleSrc, /SELECT[^;]*logo_stored_name[^;]*FROM\s+schools/i);
    assert.match(lifecycleSrc, /SELECT\s+\*\s+FROM\s+schools/i);
    assert.match(regSrc, /SELECT\s+\*\s+FROM\s+schools/i);
  });
});
