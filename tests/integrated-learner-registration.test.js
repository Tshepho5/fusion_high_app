'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const workflow = require('../lib/learnerRegistrationWorkflow');
const { generateAcceptanceLetterPdf } = require('../public/src/services/acceptanceLetterPdfService');
const emailService = require('../public/src/services/emailService');

const SAMPLE_OFFERINGS = [
  { subject_name: 'English Home Language', category: 'language', is_required: false, is_active: true },
  { subject_name: 'Sepedi First Additional Language', category: 'language', is_required: false, is_active: true },
  { subject_name: 'Life Orientation', category: 'compulsory', is_required: true, is_active: true },
  { subject_name: 'Mathematics', category: 'mathematics', is_required: false, is_active: true },
  { subject_name: 'Mathematical Literacy', category: 'mathematics', is_required: false, is_active: true },
  { subject_name: 'Physical Sciences', category: 'elective', is_required: false, is_active: true },
  { subject_name: 'Life Sciences', category: 'elective', is_required: false, is_active: true },
  { subject_name: 'Accounting', category: 'elective', is_required: false, is_active: true },
  { subject_name: 'Geography', category: 'elective', is_required: false, is_active: true }
];

const SAMPLE_STREAM = {
  id: 11,
  name: 'Science',
  status: 'published',
  mathematics_option: 'Mathematics',
  electives: ['Physical Sciences', 'Life Sciences', 'Geography']
};

const SAMPLE_SCHOOL = {
  id: 2,
  name: 'Makgoka Secondary School',
  emis_number: '912345678',
  physical_address: '14 Main Road, Polokwane',
  contact_email: 'admissions@makgoka.example',
  contact_phone: '015-555-0100',
  province: 'Limpopo',
  district: 'Capricorn South'
};

const SAMPLE_APPLICATION = {
  id: 42,
  application_number: 'APP-2026-00042',
  school_id: 2,
  school_name: 'Makgoka Secondary School',
  status: 'approved',
  first_name: 'Lerato',
  surname: 'Mokoena',
  id_number: '1001015000081',
  email: 'lerato.mokoena@example.org',
  grade_applied: 10,
  academic_year: 2026,
  stream: 'Science',
  home_language: 'English Home Language',
  first_additional_language: 'Sepedi First Additional Language',
  primary_parent_name: 'Thabo',
  primary_parent_surname: 'Mokoena',
  primary_parent_email: 'thabo.mokoena@example.org',
  primary_parent_id_number: '8205055000084'
};

test('Acceptance Letter PDF generates valid PDF with verified school/learner data and no fabricated allocations', async () => {
  const allocatedPdf = await generateAcceptanceLetterPdf({
    application: SAMPLE_APPLICATION,
    school: SAMPLE_SCHOOL,
    classAllocation: { id: 7, name: '10A', teacher_id: 55, teacher_name: 'Ms Dlamini' },
    issuedAt: '2026-11-20T10:00:00Z'
  });

  assert.ok(Buffer.isBuffer(allocatedPdf.buffer));
  assert.ok(allocatedPdf.buffer.length > 1000, 'PDF buffer must contain real content');
  assert.equal(allocatedPdf.buffer.subarray(0, 5).toString('ascii'), '%PDF-');
  assert.equal(allocatedPdf.filename, 'Acceptance_Letter_APP-2026-00042.pdf');
  assert.equal(allocatedPdf.model.school.name, 'Makgoka Secondary School');
  assert.equal(allocatedPdf.model.classAllocation.assigned, true);
  assert.equal(allocatedPdf.model.classAllocation.className, '10A');
  assert.equal(allocatedPdf.model.classAllocation.classTeacherName, 'Ms Dlamini');

  const unallocatedPdf = await generateAcceptanceLetterPdf({
    application: SAMPLE_APPLICATION,
    school: SAMPLE_SCHOOL,
    classAllocation: null
  });
  assert.equal(unallocatedPdf.model.classAllocation.assigned, false);
  assert.match(unallocatedPdf.model.classAllocation.className, /pending school administration/i);

  assert.throws(
    () => workflow.buildAcceptanceLetterModel({ application: { ...SAMPLE_APPLICATION, first_name: '', surname: '' }, school: SAMPLE_SCHOOL }),
    /without a learner name/i
  );
});

test('Integrated acceptance email template uses dashboard link + secure activation link and zero plaintext passwords', () => {
  const rendered = emailService.templates.integratedAcceptanceLetter({
    parentName: 'Thabo Mokoena',
    learnerName: 'Lerato Mokoena',
    schoolName: 'Makgoka Secondary School',
    grade: 10,
    academicYear: 2026,
    applicationNumber: 'APP-2026-00042',
    acceptanceReference: 'ACC-APP-2026-00042',
    className: '10A',
    classTeacherName: 'Ms Dlamini',
    dashboardRegistrationUrl: 'http://localhost:4000/dashboard/parent?tab=registration&applicationId=42',
    activationUrl: 'http://localhost:4000/activate?token=abc123securetoken'
  });

  assert.match(rendered.subject, /Makgoka Secondary School/);
  assert.match(rendered.body, /dashboard\/parent\?tab=registration&applicationId=42/);
  assert.match(rendered.body, /\/activate\?token=abc123securetoken/);
  assert.doesNotMatch(rendered.body, /temporary\s*password|default\s*password|educonnect-cmyh\.onrender\.com/i);
});

test('Registration eligibility enforces authorization, approval status, tamper locks, single active school, class allocation, and school offerings', () => {
  const validParent = { id: 101, role: 'parent', email: 'thabo.mokoena@example.org', school_id: 2 };
  const unrelatedParent = { id: 999, role: 'parent', email: 'stranger@example.org', school_id: 2 };
  const validLearner = { id: 202, role: 'learner', email: 'lerato.mokoena@example.org', id_number: '1001015000081', school_id: 2 };
  const classAllocation = { id: 7, name: '10A', teacher_id: 55, teacher_name: 'Ms Dlamini' };
  const schoolSubjectConfig = { offerings: SAMPLE_OFFERINGS, streams: [SAMPLE_STREAM], fallbackOfferedSubjects: [] };

  // Authorized parent & learner eligible
  assert.equal(
    workflow.evaluateRegistrationEligibility({
      application: SAMPLE_APPLICATION,
      actor: validParent,
      classAllocation,
      schoolSubjectConfig
    }).eligible,
    true
  );
  assert.equal(
    workflow.evaluateRegistrationEligibility({
      application: SAMPLE_APPLICATION,
      actor: validLearner,
      classAllocation,
      schoolSubjectConfig
    }).eligible,
    true
  );

  // Unrelated parent rejected
  assert.equal(
    workflow.evaluateRegistrationEligibility({
      application: SAMPLE_APPLICATION,
      actor: unrelatedParent,
      classAllocation,
      schoolSubjectConfig
    }).code,
    'UNAUTHORIZED_ACTOR'
  );

  // Unapproved application rejected
  assert.equal(
    workflow.evaluateRegistrationEligibility({
      application: { ...SAMPLE_APPLICATION, status: 'submitted' },
      actor: validParent,
      classAllocation,
      schoolSubjectConfig
    }).code,
    'APPLICATION_NOT_APPROVED'
  );

  // School / Grade / Year tamper rejected
  assert.equal(
    workflow.evaluateRegistrationEligibility({
      application: SAMPLE_APPLICATION,
      actor: validParent,
      classAllocation,
      schoolSubjectConfig,
      requestedSchoolId: 99
    }).code,
    'SCHOOL_MISMATCH'
  );
  assert.equal(
    workflow.evaluateRegistrationEligibility({
      application: SAMPLE_APPLICATION,
      actor: validParent,
      classAllocation,
      schoolSubjectConfig,
      requestedGrade: 11
    }).code,
    'GRADE_MISMATCH'
  );

  // Single active school conflict blocked
  const conflict = workflow.evaluateRegistrationEligibility({
    application: SAMPLE_APPLICATION,
    actor: validParent,
    classAllocation,
    schoolSubjectConfig,
    activeEnrolments: [{ school_id: 1, school_name: 'Fusion High School', academic_year: 2026, status: 'active' }]
  });
  assert.equal(conflict.eligible, false);
  assert.equal(conflict.code, 'CONFLICTING_ACTIVE_SCHOOL');

  // Pending deregistration from School A STILL blocks registration at School B!
  const pendingDeregBlock = workflow.evaluateRegistrationEligibility({
    application: SAMPLE_APPLICATION,
    actor: validParent,
    classAllocation,
    schoolSubjectConfig,
    activeEnrolments: [{ school_id: 1, school_name: 'Fusion High School', academic_year: 2026, status: 'deregistration_requested' }],
    openDeregistrations: [{ school_id: 1, status: 'pending_admin_approval' }]
  });
  assert.equal(pendingDeregBlock.eligible, false);
  assert.equal(pendingDeregBlock.code, 'DEREGISTRATION_STILL_PENDING');

  // Completed deregistration from School A allows registering at School B!
  const postDeregAllowed = workflow.evaluateRegistrationEligibility({
    application: SAMPLE_APPLICATION,
    actor: validParent,
    classAllocation,
    schoolSubjectConfig,
    activeEnrolments: [{ school_id: 1, school_name: 'Fusion High School', academic_year: 2026, status: 'deregistered' }]
  });
  assert.equal(postDeregAllowed.eligible, true);

  // Pending class allocation blocks final submission honestly
  const noClass = workflow.evaluateRegistrationEligibility({
    application: SAMPLE_APPLICATION,
    actor: validParent,
    classAllocation: null,
    schoolSubjectConfig
  });
  assert.equal(noClass.eligible, false);
  assert.equal(noClass.code, 'CLASS_ALLOCATION_PENDING');

  // Unconfigured school subject offerings blocks honestly
  const noSubjects = workflow.evaluateRegistrationEligibility({
    application: SAMPLE_APPLICATION,
    actor: validParent,
    classAllocation,
    schoolSubjectConfig: { offerings: [], streams: [], fallbackOfferedSubjects: [] }
  });
  assert.equal(noSubjects.eligible, false);
  assert.equal(noSubjects.code, 'SUBJECTS_NOT_CONFIGURED');

  // Already registered returns idempotent ALREADY_REGISTERED
  const duplicate = workflow.evaluateRegistrationEligibility({
    application: { ...SAMPLE_APPLICATION, status: 'enrolled' },
    actor: validParent,
    existingRegistration: { id: 9, status: 'completed', completed_at: '2026-11-20T12:00:00Z' },
    classAllocation,
    schoolSubjectConfig
  });
  assert.equal(duplicate.eligible, false);
  assert.equal(duplicate.alreadyRegistered, true);
  assert.equal(duplicate.code, 'ALREADY_REGISTERED');
});

test('Subject selection validation strictly uses real school offerings and rejects invalid/unoffered/unconfigured choices', () => {
  // Unconfigured school fails honestly
  const unconfigured = workflow.validateRegistrationSubjects({
    grade: 10,
    selectedSubjects: ['Mathematics'],
    schoolConfig: { offerings: [], streams: [], fallbackOfferedSubjects: [] }
  });
  assert.equal(unconfigured.valid, false);
  assert.match(unconfigured.errors[0], /has not configured/i);

  // Valid FET stream selection passes
  const validFet = workflow.validateRegistrationSubjects({
    grade: 10,
    streamId: 11,
    homeLanguage: 'English Home Language',
    firstAdditionalLanguage: 'Sepedi First Additional Language',
    selectedSubjects: [
      'English Home Language',
      'Sepedi First Additional Language',
      'Life Orientation',
      'Mathematics',
      'Physical Sciences',
      'Life Sciences',
      'Geography'
    ],
    schoolConfig: { offerings: SAMPLE_OFFERINGS, streams: [SAMPLE_STREAM], fallbackOfferedSubjects: [] }
  });
  assert.equal(validFet.valid, true, `Expected valid FET selection, got errors: ${validFet.errors.join('; ')}`);
  assert.equal(validFet.normalizedSubjects.length, 7);

  // Subject not offered by school rejected
  const unoffered = workflow.validateRegistrationSubjects({
    grade: 10,
    selectedSubjects: [
      'English Home Language',
      'Sepedi First Additional Language',
      'Life Orientation',
      'Mathematics',
      'Physical Sciences',
      'Life Sciences',
      'Maritime Economics'
    ],
    schoolConfig: { offerings: SAMPLE_OFFERINGS, streams: [], fallbackOfferedSubjects: [] }
  });
  assert.equal(unoffered.valid, false);
  assert.ok(unoffered.errors.some((e) => /Maritime Economics/i.test(e)));

  // Both Mathematics and Mathematical Literacy rejected
  const bothMaths = workflow.validateRegistrationSubjects({
    grade: 10,
    selectedSubjects: [
      'English Home Language',
      'Sepedi First Additional Language',
      'Life Orientation',
      'Mathematics',
      'Mathematical Literacy',
      'Physical Sciences',
      'Geography'
    ],
    schoolConfig: { offerings: SAMPLE_OFFERINGS, streams: [], fallbackOfferedSubjects: [] }
  });
  assert.equal(bothMaths.valid, false);
  assert.ok(bothMaths.errors.some((e) => /cannot be selected together/i.test(e)));

  // Missing compulsory Life Orientation rejected
  const missingLO = workflow.validateRegistrationSubjects({
    grade: 10,
    selectedSubjects: [
      'English Home Language',
      'Sepedi First Additional Language',
      'Mathematics',
      'Physical Sciences',
      'Life Sciences',
      'Accounting',
      'Geography'
    ],
    schoolConfig: { offerings: SAMPLE_OFFERINGS, streams: [], fallbackOfferedSubjects: [] }
  });
  assert.equal(missingLO.valid, false);
  assert.ok(missingLO.errors.some((e) => /Life Orientation/i.test(e)));
});

test('Controlled deregistration state machine enforces parent initiation, teacher review (no direct approval), principal decision, and school isolation', () => {
  const parent = { id: 101, role: 'parent', school_id: 2 };
  const stranger = { id: 500, role: 'parent', school_id: 2 };
  const classTeacher = { id: 55, role: 'teacher', school_id: 2 };
  const otherSchoolTeacher = { id: 88, role: 'teacher', school_id: 9 };
  const principal = { id: 10, role: 'principal', school_id: 2 };
  const otherSchoolAdmin = { id: 90, role: 'admin', school_id: 9 };

  // Stranger cannot initiate
  assert.equal(
    workflow.evaluateDeregistrationTransition({
      action: 'create',
      actor: stranger,
      targetSchoolId: 2,
      isLinkedParent: false,
      isLinkedLearner: false,
      reason: 'Relocating to another province'
    }).code,
    'UNAUTHORIZED_INITIATOR'
  );

  // Parent initiates with valid reason
  const createRes = workflow.evaluateDeregistrationTransition({
    action: 'create',
    actor: parent,
    targetSchoolId: 2,
    isLinkedParent: true,
    reason: 'Family relocating to Pretoria in January 2027'
  });
  assert.equal(createRes.allowed, true);
  assert.equal(createRes.nextStatus, 'pending_teacher_review');

  const openRequest = {
    id: 77,
    school_id: 2,
    status: 'pending_teacher_review',
    assigned_class_teacher_id: 55
  };

  // Class teacher CANNOT directly approve deregistration!
  const teacherApproveAttempt = workflow.evaluateDeregistrationTransition({
    action: 'admin_approve',
    actor: classTeacher,
    request: openRequest,
    targetSchoolId: 2,
    isAssignedClassTeacher: true
  });
  assert.equal(teacherApproveAttempt.allowed, false);
  assert.equal(teacherApproveAttempt.code, 'TEACHER_CANNOT_APPROVE_DEREGISTRATION');

  // Principal cannot bypass assigned Class Teacher review
  const prematureApprove = workflow.evaluateDeregistrationTransition({
    action: 'admin_approve',
    actor: principal,
    request: openRequest,
    targetSchoolId: 2
  });
  assert.equal(prematureApprove.allowed, false);
  assert.equal(prematureApprove.code, 'TEACHER_REVIEW_REQUIRED_FIRST');

  // Cross-school teacher cannot review
  const crossSchoolTeacherReview = workflow.evaluateDeregistrationTransition({
    action: 'teacher_review',
    actor: otherSchoolTeacher,
    request: openRequest,
    targetSchoolId: 2,
    isAssignedClassTeacher: true
  });
  assert.equal(crossSchoolTeacherReview.allowed, false);
  assert.equal(crossSchoolTeacherReview.code, 'CROSS_SCHOOL_DENIED');

  // Assigned Class Teacher reviews -> pending_admin_approval
  const teacherReview = workflow.evaluateDeregistrationTransition({
    action: 'teacher_review',
    actor: classTeacher,
    request: openRequest,
    targetSchoolId: 2,
    isAssignedClassTeacher: true
  });
  assert.equal(teacherReview.allowed, true);
  assert.equal(teacherReview.nextStatus, 'pending_admin_approval');

  const reviewedRequest = { ...openRequest, status: 'pending_admin_approval' };

  // Cross-school admin cannot approve
  const crossSchoolApprove = workflow.evaluateDeregistrationTransition({
    action: 'admin_approve',
    actor: otherSchoolAdmin,
    request: reviewedRequest,
    targetSchoolId: 2
  });
  assert.equal(crossSchoolApprove.allowed, false);
  assert.equal(crossSchoolApprove.code, 'CROSS_SCHOOL_DENIED');

  // Same-school Principal approves -> approved
  const principalApprove = workflow.evaluateDeregistrationTransition({
    action: 'admin_approve',
    actor: principal,
    request: reviewedRequest,
    targetSchoolId: 2
  });
  assert.equal(principalApprove.allowed, true);
  assert.equal(principalApprove.nextStatus, 'approved');

  // Same-school Principal can also reject -> rejected
  const principalReject = workflow.evaluateDeregistrationTransition({
    action: 'admin_reject',
    actor: principal,
    request: reviewedRequest,
    targetSchoolId: 2
  });
  assert.equal(principalReject.allowed, true);
  assert.equal(principalReject.nextStatus, 'rejected');
});

test('Class Teacher and Subject Teacher notification distribution is school-scoped, subject-matched, and deduplicated', () => {
  const result = workflow.resolveTeacherNotificationRecipients({
    schoolId: 2,
    classAllocation: { id: 7, name: '10A', teacher_id: 55, teacher_name: 'Ms Dlamini' },
    grade: 10,
    className: '10A',
    selectedSubjects: ['Mathematics', 'Physical Sciences', 'Life Orientation'],
    subjectTeachers: [
      { user_id: 55, school_id: 2, full_name: 'Ms Dlamini', subjects: ['Mathematics', 'Physical Sciences'], grades_taught: [10, 11], classes_taught: ['10A'] },
      { user_id: 55, school_id: 2, full_name: 'Ms Dlamini', subject_name: 'Mathematics', grade_level: 10, class_name: '10A' }, // duplicate row
      { user_id: 61, school_id: 2, full_name: 'Mr Nkosi', subjects: ['Life Orientation'], grades_taught: [10] },
      { user_id: 62, school_id: 2, full_name: 'Ms Sithole', subjects: ['Accounting'], grades_taught: [10] }, // unselected subject
      { user_id: 63, school_id: 2, full_name: 'Mr Molefe', subjects: ['Mathematics'], grades_taught: [12] }, // wrong grade
      { user_id: 99, school_id: 9, full_name: 'Other School Teacher', subjects: ['Mathematics'], grades_taught: [10] } // wrong school!
    ]
  });

  assert.equal(result.classTeacherUserId, 55);
  assert.equal(result.subjectTeacherRecipients.length, 2);
  const byId = new Map(result.subjectTeacherRecipients.map((r) => [r.user_id, r]));
  assert.deepEqual(byId.get(55).subjects, ['Mathematics', 'Physical Sciences']);
  assert.deepEqual(byId.get(61).subjects, ['Life Orientation']);
  assert.equal(byId.has(62), false);
  assert.equal(byId.has(63), false);
  assert.equal(byId.has(99), false);
});

test('Additive SQL migration and backend controllers uphold security, no-plaintext-password, and active-roster isolation', () => {
  const migrationSql = fs.readFileSync(
    path.join(__dirname, '../db/migrations/20261121_integrated_learner_registration.sql'),
    'utf8'
  );
  assert.doesNotMatch(migrationSql, /\bDROP\s+TABLE\b|\bTRUNCATE\b|\bDELETE\s+FROM\b/i);
  assert.match(migrationSql, /uniq_active_learner_enrolment_per_year/i);
  assert.match(migrationSql, /uniq_active_learner_registration_per_year/i);
  assert.match(migrationSql, /learner_registration_consents/i);
  assert.match(migrationSql, /learner_deregistration_requests/i);

  const appCtrl = fs.readFileSync(
    path.join(__dirname, '../public/src/controller/applicationController.js'),
    'utf8'
  );
  assert.doesNotMatch(appCtrl, /temporary_password\s*:\s*defaultPassword/);
  assert.match(appCtrl, /handleApplicationApproved/);

  const adminCtrl = fs.readFileSync(
    path.join(__dirname, '../public/src/controller/adminController.js'),
    'utf8'
  );
  assert.match(adminCtrl, /handleApplicationApproved/);

  const teacherLearnersCtrl = fs.readFileSync(
    path.join(__dirname, '../public/src/controller/teacher/teacherLearnersController.js'),
    'utf8'
  );
  assert.match(teacherLearnersCtrl, /COALESCE\(c\.is_active,\s*TRUE\)\s*=\s*TRUE/);
});

test('Application form school language parser and public/client application.js sync work cleanly', () => {
  const { parseSchoolOfferedLanguages } = require('../public/src/services/nscCurriculum');
  const parsed = parseSchoolOfferedLanguages([
    'Sepedi Home Language',
    'English FAL',
    'Afrikaans First Additional Language',
    'isiZulu'
  ]);
  assert.ok(parsed.some((r) => r.language === 'Sepedi' && r.level === 'Home Language'));
  assert.ok(parsed.some((r) => r.language === 'English' && r.level === 'First Additional Language'));
  assert.ok(parsed.some((r) => r.language === 'Afrikaans' && r.level === 'First Additional Language'));
  assert.ok(parsed.some((r) => r.language === 'isiZulu' && r.level === 'Home Language'));
  assert.ok(parsed.some((r) => r.language === 'isiZulu' && r.level === 'First Additional Language'));

  const pubAppJs = fs.readFileSync(path.join(__dirname, '../public/js/application.js'), 'utf8');
  const clientAppJs = fs.readFileSync(path.join(__dirname, '../client/public/js/application.js'), 'utf8');
  assert.equal(pubAppJs, clientAppJs, 'public/js/application.js and client/public/js/application.js must stay synchronized');
  assert.match(pubAppJs, /schoolSelect\.dispatchEvent\(new Event\('change'\)\)/);
});
