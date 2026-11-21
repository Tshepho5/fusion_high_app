'use strict';

const {
  validateOfferings: validateSchoolOfferings
} = require('../public/src/services/nscCurriculum');

function canonicalSubjectKey(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

const REGISTRATION_TERMS_VERSION = 'GELEZA-REG-TERMS-2026-V1';

const REGISTRATION_TERMS_CLAUSES = Object.freeze([
  'I confirm that the learner, parent/guardian, and academic registration details displayed are accurate and complete.',
  'I accept the learner\'s subject registration in accordance with the accepting school\'s configured CAPS curriculum offerings and stream requirements.',
  'I agree to abide by the accepting school\'s Learner Code of Conduct, attendance requirements, and assessment policies.',
  'I acknowledge that academic, attendance, and administrative records are processed by the accepting school and Geleza SA for lawful educational administration in accordance with POPIA.',
  'I understand that a learner may hold only one active school registration per academic year, and that transferring or leaving this school requires a formal deregistration request approved by school administration.'
]);

const OPEN_DEREGISTRATION_STATUSES = new Set([
  'pending_teacher_review',
  'pending_admin_approval'
]);

const ACTIVE_REGISTRATION_STATUSES = new Set([
  'completed',
  'deregistration_requested'
]);

function normalizeRole(role) {
  return String(role || '').trim().toLowerCase();
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeIdNumber(idNumber) {
  return String(idNumber || '').replace(/\D/g, '').trim();
}

function normalizeSubjectName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function isSchoolAdminRole(role) {
  const r = normalizeRole(role);
  return ['admin', 'principal', 'vice_principal', 'subadmin', 'sub_admin', 'school_admin'].includes(r);
}

function isParentRole(role) {
  return normalizeRole(role) === 'parent';
}

function isLearnerRole(role) {
  return ['learner', 'student'].includes(normalizeRole(role));
}

function isTeacherRole(role) {
  return ['teacher', 'educator', 'hod', 'class_teacher'].includes(normalizeRole(role));
}

function buildAcceptanceReference(application) {
  const appNo = String(application?.application_number || '').trim();
  if (appNo) return `ACC-${appNo}`;
  const id = Number(application?.id) || 0;
  const year = Number(application?.academic_year) || new Date().getFullYear();
  return `ACC-${year}-${String(id).padStart(5, '0')}`;
}

/**
 * Determine whether an authenticated actor (parent or learner) is authorized to
 * view/complete registration for a specific admission application.
 */
function isActorAuthorizedForApplication({ actor, application, linkedChild = null, linkedParentIds = [] }) {
  if (!actor || !application) return false;
  const role = normalizeRole(actor.role);
  const actorId = Number(actor.id);
  const actorEmail = normalizeEmail(actor.email);
  const actorIdNo = normalizeIdNumber(actor.id_number);

  if (isParentRole(role)) {
    const primaryEmail = normalizeEmail(application.primary_parent_email);
    const secondaryEmail = normalizeEmail(application.secondary_parent_email);
    const primaryId = normalizeIdNumber(application.primary_parent_id_number);
    const secondaryId = normalizeIdNumber(application.secondary_parent_id_number);

    if (actorEmail && (actorEmail === primaryEmail || actorEmail === secondaryEmail)) return true;
    if (actorIdNo && actorIdNo.length >= 6 && (actorIdNo === primaryId || actorIdNo === secondaryId)) return true;
    if (actorId && linkedParentIds.map(Number).includes(actorId)) return true;
    if (linkedChild && actorId && (Number(linkedChild.parent_id) === actorId || Number(linkedChild.secondary_parent_id) === actorId)) {
      return true;
    }
    return false;
  }

  if (isLearnerRole(role)) {
    const appEmail = normalizeEmail(application.email);
    const appIdNo = normalizeIdNumber(application.id_number);
    if (linkedChild && actorId && Number(linkedChild.learner_user_id) === actorId) return true;
    if (actorEmail && appEmail && actorEmail === appEmail) return true;
    if (actorIdNo && appIdNo && actorIdNo === appIdNo) return true;
    return false;
  }

  return false;
}

/**
 * Evaluate whether a parent/learner can complete learner registration for an
 * approved application. Enforces:
 * - Application approval status
 * - Parent/Learner ownership
 * - School/grade/year tamper lock
 * - Single active school registration (blocks even if deregistration is still pending!)
 * - Class allocation presence
 * - School subject offering configuration presence
 */
function evaluateRegistrationEligibility({
  application,
  actor,
  linkedChild = null,
  linkedParentIds = [],
  existingRegistration = null,
  activeEnrolments = [],
  openDeregistrations = [],
  classAllocation = null,
  schoolSubjectConfig = null,
  requestedSchoolId = null,
  requestedGrade = null,
  requestedAcademicYear = null
}) {
  if (!application) {
    return {
      eligible: false,
      code: 'APPLICATION_NOT_FOUND',
      reason: 'Admission application was not found.'
    };
  }

  if (!isActorAuthorizedForApplication({ actor, application, linkedChild, linkedParentIds })) {
    return {
      eligible: false,
      code: 'UNAUTHORIZED_ACTOR',
      reason: 'You are not authorized to access or complete registration for this learner application.'
    };
  }

  const appSchoolId = Number(application.school_id);
  const appGrade = Number(application.grade_applied || application.grade);
  const appYear = Number(application.academic_year || new Date().getFullYear());

  if (requestedSchoolId !== null && requestedSchoolId !== undefined && Number(requestedSchoolId) !== appSchoolId) {
    return {
      eligible: false,
      code: 'SCHOOL_MISMATCH',
      reason: 'Registration is locked to the accepting school and cannot be redirected to another school.'
    };
  }

  if (requestedGrade !== null && requestedGrade !== undefined && Number(requestedGrade) !== appGrade) {
    return {
      eligible: false,
      code: 'GRADE_MISMATCH',
      reason: 'Grade is determined by the approved admission application and cannot be altered during registration.'
    };
  }

  if (requestedAcademicYear !== null && requestedAcademicYear !== undefined && Number(requestedAcademicYear) !== appYear) {
    return {
      eligible: false,
      code: 'ACADEMIC_YEAR_MISMATCH',
      reason: 'Academic year is determined by the approved admission application and cannot be altered during registration.'
    };
  }

  const appStatus = normalizeRole(application.status);
  const regStatus = normalizeRole(existingRegistration?.status);

  if (regStatus === 'completed' || (appStatus === 'enrolled' && existingRegistration?.completed_at)) {
    return {
      eligible: false,
      alreadyRegistered: true,
      code: 'ALREADY_REGISTERED',
      reason: 'Learner registration for this accepted application has already been completed.'
    };
  }

  if (!['approved', 'enrolled'].includes(appStatus)) {
    return {
      eligible: false,
      code: 'APPLICATION_NOT_APPROVED',
      reason: `Registration is only available after school admission approval. Current application status: ${application.status || 'pending'}.`
    };
  }

  // Enforce single active school registration across the entire platform for the academic year
  const conflictingEnrolment = (Array.isArray(activeEnrolments) ? activeEnrolments : []).find((enr) => {
    const enrSchoolId = Number(enr.school_id);
    const enrYear = Number(enr.academic_year || appYear);
    const enrStatus = normalizeRole(enr.status || 'active');
    return (
      Number.isInteger(enrSchoolId) &&
      enrSchoolId !== appSchoolId &&
      enrYear === appYear &&
      ['active', 'completed', 'deregistration_requested'].includes(enrStatus)
    );
  });

  if (conflictingEnrolment) {
    const pendingOtherDereg = (Array.isArray(openDeregistrations) ? openDeregistrations : []).find(
      (req) => Number(req.school_id) === Number(conflictingEnrolment.school_id) && OPEN_DEREGISTRATION_STATUSES.has(normalizeRole(req.status))
    );
    const currentSchoolLabel = conflictingEnrolment.school_name || `School #${conflictingEnrolment.school_id}`;
    return {
      eligible: false,
      code: pendingOtherDereg ? 'DEREGISTRATION_STILL_PENDING' : 'CONFLICTING_ACTIVE_SCHOOL',
      conflictingSchoolName: currentSchoolLabel,
      conflictingAcademicYear: appYear,
      reason: pendingOtherDereg
        ? `Deregistration from ${currentSchoolLabel} is still pending (${pendingOtherDereg.status.replace(/_/g, ' ')}). A learner cannot complete registration at a new school until the current school principal approves deregistration.`
        : `This learner currently holds an active ${appYear} registration at ${currentSchoolLabel}. Complete the controlled deregistration workflow with ${currentSchoolLabel} before registering at a new school.`
    };
  }

  const allocationPending = !classAllocation || !classAllocation.id;
  const hasSubjectOfferings = Boolean(
    schoolSubjectConfig &&
    ((Array.isArray(schoolSubjectConfig.offerings) && schoolSubjectConfig.offerings.length > 0) ||
      (Array.isArray(schoolSubjectConfig.fallbackOfferedSubjects) && schoolSubjectConfig.fallbackOfferedSubjects.length > 0))
  );

  if (!hasSubjectOfferings) {
    return {
      eligible: false,
      allocationPending,
      subjectsUnconfigured: true,
      code: 'SUBJECTS_NOT_CONFIGURED',
      reason: 'The accepting school has not yet configured its subject offerings for this grade and academic year. Please contact school administration.'
    };
  }

  if (allocationPending) {
    return {
      eligible: false,
      allocationPending: true,
      subjectsUnconfigured: false,
      code: 'CLASS_ALLOCATION_PENDING',
      reason: 'Class allocation is currently pending school administration. Your school administrator must assign a class before registration can be finalized.'
    };
  }

  return {
    eligible: true,
    alreadyRegistered: false,
    allocationPending: false,
    subjectsUnconfigured: false,
    code: 'ELIGIBLE',
    reason: null
  };
}

/**
 * Validate learner subject selections strictly against the accepting school's real
 * configured subject offerings and streams. Never invents hardcoded subject combos.
 */
function validateRegistrationSubjects({
  grade,
  selectedSubjects = [],
  streamId = null,
  homeLanguage = '',
  firstAdditionalLanguage = '',
  schoolConfig = null
}) {
  const gradeNum = Number(grade);
  const offerings = Array.isArray(schoolConfig?.offerings) ? schoolConfig.offerings : [];
  const streams = Array.isArray(schoolConfig?.streams) ? schoolConfig.streams : [];
  const fallbackOffered = Array.isArray(schoolConfig?.fallbackOfferedSubjects) ? schoolConfig.fallbackOfferedSubjects : [];

  if (offerings.length === 0 && fallbackOffered.length === 0) {
    return {
      valid: false,
      errors: ['The accepting school has not configured its subject offerings for this grade and academic year.'],
      normalizedSubjects: []
    };
  }

  // Deduplicate incoming subjects preserving school canonical names
  const requested = Array.isArray(selectedSubjects)
    ? selectedSubjects.map(normalizeSubjectName).filter(Boolean)
    : [];

  // Mode A: School has structured school_subject_offerings (+ optional streams)
  if (offerings.length > 0) {
    const activeOfferings = offerings.filter((o) => o && o.is_active !== false);
    const offeringByKey = new Map();
    for (const o of activeOfferings) {
      offeringByKey.set(canonicalSubjectKey(o.subject_name), o);
    }

    // For FET grades (10-12), use strict CAPS/NSC curriculum validator if streams or full offerings exist
    if (gradeNum >= 10 && gradeNum <= 12) {
      const selectedStream = streamId
        ? streams.find((s) => Number(s.id) === Number(streamId) && String(s.status || 'published').toLowerCase() === 'published')
        : null;

      if (streamId && !selectedStream) {
        return {
          valid: false,
          errors: ['Selected academic stream is not published or does not belong to this school and grade.'],
          normalizedSubjects: []
        };
      }

      if (selectedStream) {
        const errors = [];
        const normalized = [];
        const seenKeys = new Set();

        const hlClean = normalizeSubjectName(homeLanguage);
        const falClean = normalizeSubjectName(firstAdditionalLanguage);
        const mathOpt = normalizeSubjectName(selectedStream.mathematics_option || selectedStream.mathematics);
        const streamElectives = Array.isArray(selectedStream.electives)
          ? selectedStream.electives.map(normalizeSubjectName).filter(Boolean)
          : [];

        if (!hlClean) errors.push('Home Language is required for FET stream registration.');
        if (!falClean) errors.push('First Additional Language is required for FET stream registration.');
        if (hlClean && falClean && canonicalSubjectKey(hlClean) === canonicalSubjectKey(falClean)) {
          errors.push('Home Language and First Additional Language must be different languages.');
        }

        const candidateList = [
          hlClean,
          falClean,
          'Life Orientation',
          mathOpt,
          ...streamElectives,
          ...requested
        ].filter(Boolean);

        for (const subj of candidateList) {
          const key = canonicalSubjectKey(subj);
          const match = offeringByKey.get(key);
          if (!match) {
            errors.push(`"${subj}" is not offered by this school for Grade ${gradeNum}.`);
            continue;
          }
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            normalized.push(match.subject_name);
          }
        }

        if (seenKeys.has(canonicalSubjectKey('Mathematics')) && seenKeys.has(canonicalSubjectKey('Mathematical Literacy'))) {
          errors.push('Mathematics and Mathematical Literacy cannot be selected together.');
        }

        if (normalized.length < 7) {
          errors.push(`FET Grade ${gradeNum} stream registration requires at least 7 subjects (selected ${normalized.length}).`);
        }

        return {
          valid: errors.length === 0,
          errors,
          normalizedSubjects: normalized,
          streamName: selectedStream.name
        };
      }

      // No stream selected (or school has configured offerings without published streams)
      const errors = [];
      const normalized = [];
      const seenKeys = new Set();

      // Add explicitly passed languages if provided and not already in selectedSubjects
      const combinedRequested = [...requested];
      if (homeLanguage && !combinedRequested.some((s) => canonicalSubjectKey(s) === canonicalSubjectKey(homeLanguage))) {
        combinedRequested.unshift(normalizeSubjectName(homeLanguage));
      }
      if (firstAdditionalLanguage && !combinedRequested.some((s) => canonicalSubjectKey(s) === canonicalSubjectKey(firstAdditionalLanguage))) {
        combinedRequested.push(normalizeSubjectName(firstAdditionalLanguage));
      }

      for (const subj of combinedRequested) {
        const key = canonicalSubjectKey(subj);
        const match = offeringByKey.get(key);
        if (!match) {
          errors.push(`"${subj}" is not offered by this school for Grade ${gradeNum}.`);
          continue;
        }
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          normalized.push(match.subject_name);
        }
      }

      // Enforce compulsory subjects configured as required by the school
      for (const reqOff of activeOfferings.filter((o) => o.is_required)) {
        const key = canonicalSubjectKey(reqOff.subject_name);
        if (!seenKeys.has(key)) {
          errors.push(`Compulsory subject "${reqOff.subject_name}" is required.`);
        }
      }

      // Enforce Mathematics vs Mathematical Literacy exclusivity
      const hasMaths = seenKeys.has(canonicalSubjectKey('Mathematics'));
      const hasMathsLit = seenKeys.has(canonicalSubjectKey('Mathematical Literacy'));
      if (hasMaths && hasMathsLit) {
        errors.push('Mathematics and Mathematical Literacy cannot be selected together.');
      }

      const offeringCheck = validateSchoolOfferings ? validateSchoolOfferings(activeOfferings) : { ok: false };
      if ((offeringCheck.ok || offeringCheck.valid) && !hasMaths && !hasMathsLit) {
        errors.push('Select either Mathematics or Mathematical Literacy.');
      }

      if (normalized.length < 7 && activeOfferings.length >= 7) {
        errors.push(`FET Grade ${gradeNum} registration requires at least 7 school-offered subjects (selected ${normalized.length}).`);
      }

      return {
        valid: errors.length === 0,
        errors,
        normalizedSubjects: normalized
      };
    }

    // GET grades (8-9 or other): validate against configured school offerings
    const errors = [];
    const normalized = [];
    const seen = new Set();
    for (const subj of requested) {
      const key = canonicalSubjectKey(subj);
      const match = offeringByKey.get(key);
      if (!match) {
        errors.push(`"${subj}" is not offered by this school for Grade ${gradeNum}.`);
        continue;
      }
      if (!seen.has(key)) {
        seen.add(key);
        normalized.push(match.subject_name);
      }
    }
    for (const reqOff of activeOfferings.filter((o) => o.is_required)) {
      const key = canonicalSubjectKey(reqOff.subject_name);
      if (!seen.has(key)) {
        errors.push(`Compulsory subject "${reqOff.subject_name}" is required.`);
      }
    }
    if (normalized.length === 0) {
      errors.push('At least one school-offered subject must be selected.');
    }
    return {
      valid: errors.length === 0,
      errors,
      normalizedSubjects: normalized
    };
  }

  // Mode B: Fallback to school's own `schools.offered_subjects` array (still real school DB data, never hardcoded)
  const offeredByKey = new Map();
  for (const s of fallbackOffered) {
    const clean = normalizeSubjectName(s);
    if (clean) offeredByKey.set(canonicalSubjectKey(clean), clean);
  }

  const errors = [];
  const normalized = [];
  const seen = new Set();
  for (const subj of requested) {
    const key = canonicalSubjectKey(subj);
    const match = offeredByKey.get(key);
    if (!match) {
      errors.push(`"${subj}" is not in this school's configured subject list.`);
      continue;
    }
    if (!seen.has(key)) {
      seen.add(key);
      normalized.push(match);
    }
  }

  const hasMaths = seen.has(canonicalSubjectKey('Mathematics'));
  const hasMathsLit = seen.has(canonicalSubjectKey('Mathematical Literacy'));
  if (hasMaths && hasMathsLit) {
    errors.push('Mathematics and Mathematical Literacy cannot be selected together.');
  }
  const hasLifeOrientationOffered = offeredByKey.has(canonicalSubjectKey('Life Orientation'));
  if (hasLifeOrientationOffered && !seen.has(canonicalSubjectKey('Life Orientation'))) {
    errors.push('Compulsory subject "Life Orientation" is required.');
  }
  if (gradeNum >= 10 && gradeNum <= 12 && offeredByKey.size >= 7 && normalized.length < 7) {
    errors.push(`Grade ${gradeNum} registration requires at least 7 subjects from the school's offerings (selected ${normalized.length}).`);
  }
  if (normalized.length === 0) {
    errors.push('Select the learner\'s subjects from the school\'s configured offerings.');
  }

  return {
    valid: errors.length === 0,
    errors,
    normalizedSubjects: normalized
  };
}

/**
 * Build strictly factual Acceptance Letter model from real DB records.
 * Never fabricates missing deadlines, classes, fees, or subjects.
 */
function buildAcceptanceLetterModel({ application, school, classAllocation = null, issuedAt = null }) {
  const learnerName = `${String(application?.first_name || '').trim()} ${String(application?.surname || '').trim()}`.trim();
  const parentName = `${String(application?.primary_parent_name || '').trim()} ${String(application?.primary_parent_surname || '').trim()}`.trim();
  const schoolName = String(school?.name || application?.school_name || '').trim();
  if (!schoolName) {
    throw new Error('Cannot generate acceptance letter without an accepting school name.');
  }
  if (!learnerName) {
    throw new Error('Cannot generate acceptance letter without a learner name.');
  }

  const issuedDate = issuedAt ? new Date(issuedAt) : new Date();
  const className = classAllocation?.name ? String(classAllocation.name).trim() : null;
  const classTeacherName = classAllocation?.teacher_name ? String(classAllocation.teacher_name).trim() : null;

  return {
    referenceNumber: buildAcceptanceReference(application),
    applicationNumber: String(application.application_number || ''),
    issuedDateIso: issuedDate.toISOString(),
    issuedDateDisplay: issuedDate.toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    school: {
      id: Number(school?.id || application.school_id),
      name: schoolName,
      emisNumber: school?.emis_number ? String(school.emis_number).trim() : null,
      address: school?.physical_address ? String(school.physical_address).trim() : null,
      phone: school?.contact_phone ? String(school.contact_phone).trim() : null,
      email: school?.contact_email ? String(school.contact_email).trim() : null,
      province: school?.province ? String(school.province).trim() : null,
      district: school?.district ? String(school.district).trim() : null
    },
    learner: {
      fullName: learnerName,
      learnerNumber: String(application.provisional_learner_number || application.learner_number || '').trim() || null,
      grade: Number(application.grade_applied || application.grade),
      academicYear: Number(application.academic_year || issuedDate.getFullYear()),
      stream: application.stream ? String(application.stream).trim() : null,
      homeLanguage: application.home_language ? String(application.home_language).trim() : null,
      firstAdditionalLanguage: application.first_additional_language ? String(application.first_additional_language).trim() : null,
      selectedSubjects: Array.isArray(application.selected_subjects) ? application.selected_subjects.filter(Boolean) : []
    },
    guardian: {
      fullName: parentName || 'Parent / Legal Guardian',
      email: application.primary_parent_email ? String(application.primary_parent_email).trim() : null
    },
    classAllocation: className
      ? {
          assigned: true,
          className,
          classTeacherName: classTeacherName || 'Assigned by School Administration'
        }
      : {
          assigned: false,
          className: 'Pending school administration allocation',
          classTeacherName: 'Pending school administration allocation'
        },
    nextSteps: [
      'Sign in to your Geleza SA Parent or Learner Dashboard using your registered account (or complete secure account activation if you are new to Geleza SA).',
      'Open the Learner Registration section in your dashboard to verify learner details, select your school-offered subjects, review your school-allocated class and Class Teacher, and accept the registration Terms & Conditions.',
      'Your learner registration becomes active only after you submit the dashboard registration confirmation.'
    ]
  };
}

/**
 * Evaluate state transitions for the Controlled Deregistration & Transfer workflow.
 * Guarantees:
 * - Only linked Parent or linked Learner can initiate.
 * - Class Teacher can ONLY review/acknowledge (never directly approve deregistration).
 * - Only School Admin / Principal of the learner's school can approve or reject.
 * - Cross-school access is strictly refused.
 */
function evaluateDeregistrationTransition({
  action,
  actor,
  request = null,
  targetSchoolId,
  isLinkedParent = false,
  isLinkedLearner = false,
  isAssignedClassTeacher = false,
  reason = ''
}) {
  if (!actor) {
    return { allowed: false, code: 'UNAUTHENTICATED', reason: 'Authentication is required.' };
  }
  const role = normalizeRole(actor.role);
  const actorSchoolId = actor.school_id !== null && actor.school_id !== undefined ? Number(actor.school_id) : null;
  const schoolIdNum = Number(targetSchoolId);

  if (action === 'create') {
    if (!isLinkedParent && !isLinkedLearner) {
      return {
        allowed: false,
        code: 'UNAUTHORIZED_INITIATOR',
        reason: 'Only the learner\'s linked parent/guardian or the authorized learner account may request deregistration or transfer.'
      };
    }
    if (!String(reason || '').trim() || String(reason || '').trim().length < 5) {
      return {
        allowed: false,
        code: 'REASON_REQUIRED',
        reason: 'A clear reason for deregistration or transfer (at least 5 characters) is required.'
      };
    }
    return { allowed: true, nextStatus: 'pending_teacher_review' };
  }

  if (!request) {
    return { allowed: false, code: 'REQUEST_NOT_FOUND', reason: 'Deregistration request not found.' };
  }

  if (Number(request.school_id) !== schoolIdNum) {
    return { allowed: false, code: 'SCHOOL_MISMATCH', reason: 'Deregistration request does not belong to this school.' };
  }

  const currentStatus = normalizeRole(request.status);

  if (action === 'teacher_review') {
    if (!isTeacherRole(role)) {
      return { allowed: false, code: 'TEACHER_ROLE_REQUIRED', reason: 'Only the assigned Class Teacher may record class-teacher review.' };
    }
    if (!actor.is_superadmin && actorSchoolId !== schoolIdNum) {
      return { allowed: false, code: 'CROSS_SCHOOL_DENIED', reason: 'Cross-school deregistration review is prohibited.' };
    }
    if (!isAssignedClassTeacher) {
      return {
        allowed: false,
        code: 'NOT_ASSIGNED_CLASS_TEACHER',
        reason: 'Only the learner\'s assigned Class Teacher may review and acknowledge this deregistration request.'
      };
    }
    if (currentStatus !== 'pending_teacher_review') {
      return {
        allowed: false,
        code: 'INVALID_STATUS_TRANSITION',
        reason: `Class teacher review cannot be recorded when request status is "${request.status}".`
      };
    }
    return { allowed: true, nextStatus: 'pending_admin_approval' };
  }

  if (action === 'admin_approve' || action === 'admin_reject') {
    if (isTeacherRole(role) && !isSchoolAdminRole(role) && !actor.is_superadmin) {
      return {
        allowed: false,
        code: 'TEACHER_CANNOT_APPROVE_DEREGISTRATION',
        reason: 'Class Teachers cannot finalize deregistration. Principal or School Administration approval is required.'
      };
    }
    if (!isSchoolAdminRole(role) && !actor.is_superadmin) {
      return {
        allowed: false,
        code: 'ADMIN_ROLE_REQUIRED',
        reason: 'Only the Principal or School Administration of the active school may approve or reject deregistration.'
      };
    }
    if (!actor.is_superadmin && actorSchoolId !== schoolIdNum) {
      return {
        allowed: false,
        code: 'CROSS_SCHOOL_DENIED',
        reason: 'Cross-school deregistration approval is prohibited.'
      };
    }
    if (!OPEN_DEREGISTRATION_STATUSES.has(currentStatus)) {
      return {
        allowed: false,
        code: 'INVALID_STATUS_TRANSITION',
        reason: `This deregistration request has already been finalized (${request.status}).`
      };
    }
    // If a class teacher IS assigned to the learner's class and hasn't reviewed yet, require teacher review first for approval
    if (
      action === 'admin_approve' &&
      currentStatus === 'pending_teacher_review' &&
      request.assigned_class_teacher_id
    ) {
      return {
        allowed: false,
        code: 'TEACHER_REVIEW_REQUIRED_FIRST',
        reason: 'The assigned Class Teacher must review and acknowledge this deregistration request before final Principal approval.'
      };
    }
    return {
      allowed: true,
      nextStatus: action === 'admin_approve' ? 'approved' : 'rejected'
    };
  }

  return { allowed: false, code: 'UNKNOWN_ACTION', reason: 'Unsupported deregistration action.' };
}

/**
 * Determine deduplicated Class Teacher and Subject Teacher notification recipients
 * within the accepting school.
 */
function resolveTeacherNotificationRecipients({
  schoolId,
  classAllocation = null,
  subjectTeachers = [],
  selectedSubjects = [],
  grade,
  className = ''
}) {
  const schoolIdNum = Number(schoolId);
  const gradeNum = Number(grade);
  const cleanClass = String(className || classAllocation?.name || '').trim().toLowerCase();
  const selectedKeys = new Set((selectedSubjects || []).map(canonicalSubjectKey).filter(Boolean));

  const classTeacherId = classAllocation?.teacher_id ? Number(classAllocation.teacher_id) : null;
  const subjectRecipientsMap = new Map();

  for (const teacher of Array.isArray(subjectTeachers) ? subjectTeachers : []) {
    if (!teacher || !teacher.user_id) continue;
    if (Number(teacher.school_id) !== schoolIdNum) continue;

    const teacherUserId = Number(teacher.user_id);
    const teacherSubjects = Array.isArray(teacher.subjects)
      ? teacher.subjects
      : (teacher.subject_name ? [teacher.subject_name] : []);

    const matchedSubjects = [];
    for (const ts of teacherSubjects) {
      const key = canonicalSubjectKey(ts);
      if (selectedKeys.has(key)) {
        matchedSubjects.push(normalizeSubjectName(ts));
      }
    }
    if (matchedSubjects.length === 0) continue;

    // Respect grade scope if configured on the teacher assignment
    const teacherGrades = Array.isArray(teacher.grades_taught)
      ? teacher.grades_taught.map(Number).filter(Number.isFinite)
      : (teacher.grade_level ? [Number(teacher.grade_level)] : []);
    if (teacherGrades.length > 0 && Number.isFinite(gradeNum) && !teacherGrades.includes(gradeNum)) {
      continue;
    }

    // Respect class scope if explicitly narrowed on the teacher assignment
    const teacherClasses = Array.isArray(teacher.classes_taught)
      ? teacher.classes_taught.map((c) => String(c || '').trim().toLowerCase()).filter(Boolean)
      : (teacher.class_name ? [String(teacher.class_name).trim().toLowerCase()] : []);
    if (teacherClasses.length > 0 && cleanClass && !teacherClasses.includes(cleanClass) && !teacherClasses.includes('all')) {
      continue;
    }

    if (!subjectRecipientsMap.has(teacherUserId)) {
      subjectRecipientsMap.set(teacherUserId, {
        user_id: teacherUserId,
        full_name: teacher.full_name || '',
        subjects: new Set()
      });
    }
    const entry = subjectRecipientsMap.get(teacherUserId);
    matchedSubjects.forEach((s) => entry.subjects.add(s));
  }

  const subjectTeacherRecipients = Array.from(subjectRecipientsMap.values()).map((entry) => ({
    user_id: entry.user_id,
    full_name: entry.full_name,
    subjects: Array.from(entry.subjects).sort()
  }));

  return {
    classTeacherUserId: classTeacherId,
    subjectTeacherRecipients
  };
}

module.exports = {
  REGISTRATION_TERMS_VERSION,
  REGISTRATION_TERMS_CLAUSES,
  OPEN_DEREGISTRATION_STATUSES,
  ACTIVE_REGISTRATION_STATUSES,
  normalizeRole,
  normalizeEmail,
  normalizeIdNumber,
  normalizeSubjectName,
  isSchoolAdminRole,
  isParentRole,
  isLearnerRole,
  isTeacherRole,
  buildAcceptanceReference,
  isActorAuthorizedForApplication,
  evaluateRegistrationEligibility,
  validateRegistrationSubjects,
  buildAcceptanceLetterModel,
  evaluateDeregistrationTransition,
  resolveTeacherNotificationRecipients
};
