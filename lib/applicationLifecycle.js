'use strict';

const {
  normalizeRole,
  isSchoolAdminRole,
  isParentRole,
  isLearnerRole
} = require('./learnerRegistrationWorkflow');

const APPLICATION_STATUSES = Object.freeze({
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  DOCUMENTS_REQUESTED: 'documents_requested',
  DOCUMENTS_SUBMITTED: 'documents_submitted',
  DOCUMENTS_UNDER_REVIEW: 'documents_under_review',
  WAITLISTED: 'waitlisted',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ENROLLMENT_PENDING: 'enrollment_pending',
  ENROLLED: 'enrolled',
  WITHDRAWN: 'withdrawn',
  CANCELLED: 'cancelled'
});

const LEGACY_STATUS_ALIASES = Object.freeze({
  pending: APPLICATION_STATUSES.SUBMITTED,
  awaiting_review: APPLICATION_STATUSES.SUBMITTED,
  under_ai_review: APPLICATION_STATUSES.UNDER_REVIEW,
  action_required: APPLICATION_STATUSES.DOCUMENTS_REQUESTED,
  declined: APPLICATION_STATUSES.REJECTED,
  accepted: APPLICATION_STATUSES.APPROVED,
  registered: APPLICATION_STATUSES.ENROLLED
});

const STATUS_LABELS = Object.freeze({
  draft: 'Draft',
  submitted: 'Submitted — Awaiting School Review',
  under_review: 'Under School Review',
  documents_requested: 'Additional Documentation Required',
  documents_submitted: 'Requested Documents Submitted',
  documents_under_review: 'Documentation Under Review',
  waitlisted: 'Waitlisted',
  approved: 'Accepted / Approved — Registration Pending',
  rejected: 'Declined',
  enrollment_pending: 'Enrolment Pending',
  enrolled: 'Registered & Enrolled',
  withdrawn: 'Withdrawn',
  cancelled: 'Cancelled'
});

const TERMINAL_STATUSES = new Set([
  APPLICATION_STATUSES.ENROLLED,
  APPLICATION_STATUSES.WITHDRAWN,
  APPLICATION_STATUSES.CANCELLED
]);

const ALLOWED_DOCUMENT_TYPES = new Set([
  'learner_id',
  'birth_certificate',
  'parent_id',
  'proof_of_residence',
  'report_card',
  'clinic_card',
  'transfer_card',
  'medical_certificate',
  'supporting_document'
]);

const DOCUMENT_TYPE_LABELS = Object.freeze({
  learner_id: 'Learner ID Document / Passport',
  birth_certificate: 'Unabridged / Official Birth Certificate',
  parent_id: 'Parent / Legal Guardian ID Document',
  proof_of_residence: 'Proof of Residential Address',
  report_card: 'Latest Official School Report Card',
  clinic_card: 'Immunisation / Clinic Card',
  transfer_card: 'School Transfer Card / Letter',
  medical_certificate: 'Medical / Special Needs Documentation',
  supporting_document: 'Additional Supporting Document'
});

/**
 * Maps legacy or raw status strings into canonical lifecycle states without
 * inventing a second parallel status vocabulary.
 */
function normalizeApplicationStatus(raw) {
  const clean = String(raw || '').trim().toLowerCase();
  if (!clean) return APPLICATION_STATUSES.SUBMITTED;
  if (LEGACY_STATUS_ALIASES[clean]) return LEGACY_STATUS_ALIASES[clean];
  if (STATUS_LABELS[clean]) return clean;
  return clean;
}

function getStatusLabel(raw) {
  const canonical = normalizeApplicationStatus(raw);
  return STATUS_LABELS[canonical] || String(raw || 'Submitted');
}

/**
 * Authoritative state-machine transition rules enforced server-side.
 * - Applicants/Parents CANNOT approve, decline, waitlist, or enroll directly.
 * - School Admins / Principals CANNOT skip approval straight to 'enrolled' without
 *   completing the registration workflow (registration service transitions approved -> enrolled).
 * - Finalized 'enrolled' applications cannot be arbitrarily reverted to pending/rejected.
 */
const ADMIN_TRANSITIONS = Object.freeze({
  draft: new Set(['submitted', 'cancelled']),
  submitted: new Set(['under_review', 'documents_requested', 'waitlisted', 'approved', 'rejected', 'cancelled']),
  under_review: new Set(['documents_requested', 'waitlisted', 'approved', 'rejected', 'cancelled']),
  documents_requested: new Set(['under_review', 'documents_submitted', 'documents_under_review', 'waitlisted', 'approved', 'rejected', 'cancelled']),
  documents_submitted: new Set(['documents_under_review', 'under_review', 'documents_requested', 'waitlisted', 'approved', 'rejected']),
  documents_under_review: new Set(['under_review', 'documents_requested', 'waitlisted', 'approved', 'rejected']),
  waitlisted: new Set(['under_review', 'documents_requested', 'approved', 'rejected', 'cancelled']),
  approved: new Set(['approved', 'enrollment_pending', 'withdrawn', 'cancelled']),
  enrollment_pending: new Set(['approved', 'withdrawn', 'cancelled']),
  rejected: new Set(['under_review', 'waitlisted']),
  enrolled: new Set([]),
  withdrawn: new Set([]),
  cancelled: new Set([])
});

const APPLICANT_TRANSITIONS = Object.freeze({
  draft: new Set(['submitted', 'withdrawn']),
  submitted: new Set(['withdrawn']),
  under_review: new Set(['withdrawn']),
  documents_requested: new Set(['documents_submitted', 'withdrawn']),
  documents_submitted: new Set(['documents_submitted', 'withdrawn']),
  waitlisted: new Set(['withdrawn']),
  approved: new Set(['withdrawn'])
});

function validateApplicationTransition({ fromStatus, toStatus, actorRole, isSuperadmin = false, systemTransition = false }) {
  const from = normalizeApplicationStatus(fromStatus);
  const to = normalizeApplicationStatus(toStatus);

  if (!STATUS_LABELS[to]) {
    return {
      allowed: false,
      code: 'INVALID_STATUS',
      reason: `Unsupported application status "${toStatus}".`
    };
  }

  // System-driven registration completion (approved/enrollment_pending -> enrolled)
  if (systemTransition) {
    if ((from === 'approved' || from === 'enrollment_pending' || from === 'enrolled') && to === 'enrolled') {
      return { allowed: true, fromStatus: from, toStatus: to };
    }
    return {
      allowed: false,
      code: 'INVALID_SYSTEM_TRANSITION',
      reason: `Cannot transition application from "${from}" to "${to}" via registration completion.`
    };
  }

  const role = normalizeRole(actorRole);
  const isAdmin = isSchoolAdminRole(role) || Boolean(isSuperadmin);
  const isApplicant = isParentRole(role) || isLearnerRole(role);

  if (isApplicant && !isAdmin) {
    if (['approved', 'rejected', 'enrolled', 'waitlisted', 'under_review', 'documents_under_review'].includes(to)) {
      return {
        allowed: false,
        code: 'UNAUTHORIZED_STATUS_CHANGE',
        reason: 'Applicants and parents are not permitted to approve, decline, or adjudicate admission applications.'
      };
    }
    const allowedSet = APPLICANT_TRANSITIONS[from] || new Set();
    if (!allowedSet.has(to)) {
      return {
        allowed: false,
        code: 'INVALID_TRANSITION',
        reason: `Cannot change application from "${getStatusLabel(from)}" to "${getStatusLabel(to)}".`
      };
    }
    return { allowed: true, fromStatus: from, toStatus: to };
  }

  if (!isAdmin) {
    return {
      allowed: false,
      code: 'UNAUTHORIZED_ROLE',
      reason: 'Only authorized school administration or the applicant/parent may perform this action.'
    };
  }

  if (to === 'enrolled') {
    return {
      allowed: false,
      code: 'REGISTRATION_WORKFLOW_REQUIRED',
      reason: 'Applications must first be approved and completed through the learner registration workflow before becoming enrolled.'
    };
  }

  if (TERMINAL_STATUSES.has(from)) {
    return {
      allowed: false,
      code: 'TERMINAL_STATUS',
      reason: `Application is already finalized (${getStatusLabel(from)}) and cannot transition to "${getStatusLabel(to)}".`
    };
  }

  // Idempotent no-op for same status (e.g., retrying approval on already-approved application)
  if (from === to && to === 'approved') {
    return { allowed: true, fromStatus: from, toStatus: to, idempotent: true };
  }

  const allowedSet = ADMIN_TRANSITIONS[from] || new Set();
  if (!allowedSet.has(to)) {
    return {
      allowed: false,
      code: 'INVALID_TRANSITION',
      reason: `Transition from "${getStatusLabel(from)}" to "${getStatusLabel(to)}" is not permitted.`
    };
  }

  return { allowed: true, fromStatus: from, toStatus: to };
}

/**
 * Validates that ALL mandatory data exists BEFORE an approval email can be dispatched.
 * Prevents ever sending an incomplete approval email missing learner number, reference,
 * grade, academic year, school, or learner name.
 */
function validateApprovalDispatchPayload(payload = {}) {
  const missing = [];
  if (!String(payload.schoolName || '').trim()) missing.push('schoolName');
  if (!String(payload.learnerName || '').trim()) missing.push('learnerName');
  if (!String(payload.learnerNumber || '').trim()) missing.push('learnerNumber');
  if (!String(payload.applicationNumber || '').trim()) missing.push('applicationNumber');
  const grade = Number(payload.grade);
  if (!Number.isInteger(grade) || grade < 8 || grade > 12) missing.push('grade');
  const academicYear = Number(payload.academicYear);
  if (!Number.isInteger(academicYear) || academicYear < 2020 || academicYear > 2100) missing.push('academicYear');
  if (!String(payload.parentEmail || '').trim() && !String(payload.learnerEmail || '').trim()) {
    missing.push('recipientEmail');
  }
  return {
    valid: missing.length === 0,
    missing,
    reason: missing.length
      ? `Cannot dispatch approval email with missing mandatory field(s): ${missing.join(', ')}.`
      : null
  };
}

/**
 * Validates a documentation request submitted by an authorized Principal or School Admin.
 */
function validateDocumentRequestPayload(body = {}) {
  const rawDocs = Array.isArray(body.required_documents)
    ? body.required_documents
    : (Array.isArray(body.requiredDocuments) ? body.requiredDocuments : []);

  const normalizedDocs = [];
  const seen = new Set();
  for (const item of rawDocs) {
    const rawKey = typeof item === 'string'
      ? item
      : (item && typeof item === 'object' ? (item.document_type || item.type || item.key || '') : '');
    const key = String(rawKey || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    const safeType = ALLOWED_DOCUMENT_TYPES.has(key) ? key : 'supporting_document';
    const customLabel = typeof item === 'object' && item
      ? String(item.label || item.name || '').trim()
      : '';
    const label = customLabel || DOCUMENT_TYPE_LABELS[safeType] || rawKey || 'Supporting Document';
    const description = typeof item === 'object' && item ? String(item.description || '').trim() : '';
    const dedupKey = `${safeType}:${label.toLowerCase()}`;
    if (!seen.has(dedupKey)) {
      seen.add(dedupKey);
      normalizedDocs.push({ document_type: safeType, label, description });
    }
  }

  const instructions = String(body.instructions || body.reason || body.notes || '').trim();
  const descriptions = String(body.descriptions || '').trim();

  if (normalizedDocs.length === 0) {
    return {
      valid: false,
      error: 'Select at least one required document to request from the applicant.'
    };
  }

  if (instructions.length < 5) {
    return {
      valid: false,
      error: 'Provide clear instructions or a reason for the documentation request (at least 5 characters).'
    };
  }

  let deadline = null;
  if (body.deadline) {
    const parsed = new Date(body.deadline);
    if (Number.isNaN(parsed.getTime())) {
      return { valid: false, error: 'Deadline must be a valid date.' };
    }
    deadline = parsed.toISOString();
  }

  return {
    valid: true,
    value: {
      required_documents: normalizedDocs,
      descriptions: descriptions || normalizedDocs.map((d) => d.label).join(', '),
      instructions,
      deadline
    }
  };
}

/**
 * Authoritative access classifier determining whether a Learner account has unlocked
 * the full Learner Dashboard (enrolled) or must stay inside the Restricted Applicant Dashboard.
 */
function evaluateLearnerDashboardAccess({
  role,
  activeChildren = [],
  applications = []
}) {
  const normalizedRole = normalizeRole(role);
  if (!isLearnerRole(normalizedRole)) {
    return {
      mode: 'full',
      isRestrictedApplicant: false,
      hasActiveEnrollment: true,
      allowedModules: null,
      reason: null
    };
  }

  const enrolledChildren = (Array.isArray(activeChildren) ? activeChildren : []).filter(
    (c) => c && c.is_active !== false && Number(c.school_id) > 0
  );

  if (enrolledChildren.length > 0) {
    return {
      mode: 'enrolled',
      isRestrictedApplicant: false,
      hasActiveEnrollment: true,
      activeChildId: enrolledChildren[0].id || enrolledChildren[0].child_id || null,
      learnerNumber: enrolledChildren[0].learner_number || null,
      schoolId: Number(enrolledChildren[0].school_id),
      grade: Number(enrolledChildren[0].grade) || null,
      allowedModules: null,
      reason: null
    };
  }

  const normalizedApps = (Array.isArray(applications) ? applications : []).map((a) => ({
    id: a.id || a.application_id,
    status: normalizeApplicationStatus(a.status || a.application_status)
  }));
  const hasApproved = normalizedApps.some((a) => a.status === 'approved' || a.status === 'enrollment_pending');

  return {
    mode: 'restricted_applicant',
    isRestrictedApplicant: true,
    hasActiveEnrollment: false,
    activeChildId: null,
    learnerNumber: null,
    hasApprovedApplication: hasApproved,
    allowedModules: ['applications', 'registration', 'profile', 'settings'],
    reason: hasApproved
      ? 'Your admission has been approved. Complete Learner Registration to unlock your full Learner Dashboard.'
      : 'Your account is currently in Applicant Tracking Mode. Full Learner Dashboard modules unlock automatically once your school approves your application and Learner Registration is completed.'
  };
}

/**
 * Strips sensitive fields (passwords, activation tokens, raw bearer secrets) from objects before logging/auditing.
 */
function redactSensitiveFields(input) {
  if (typeof input === 'string') {
    if (/[?&]token=[^&\s]+/i.test(input)) return '[REDACTED]';
    return input;
  }
  if (!input || typeof input !== 'object') return input;
  const sensitivePattern = /(password|token|secret|authorization|cookie|hash|key|activation_url|activationurl|reset_url|reseturl)/i;
  if (Array.isArray(input)) return input.map(redactSensitiveFields);
  const out = {};
  for (const [k, v] of Object.entries(input)) {
    if (sensitivePattern.test(k)) {
      out[k] = '[REDACTED]';
    } else if (typeof v === 'string' && /[?&]token=[^&\s]+/i.test(v)) {
      out[k] = '[REDACTED]';
    } else if (v && typeof v === 'object') {
      out[k] = redactSensitiveFields(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Verifies actual file magic bytes match an allowed PDF, JPG, PNG, or WebP document.
 */
function matchesAllowedMagicBytes(filePath, mimeType) {
  const fs = require('fs');
  try {
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(12);
    const bytesRead = fs.readSync(fd, buf, 0, 12, 0);
    fs.closeSync(fd);
    if (bytesRead < 4) return false;
    if (mimeType === 'application/pdf') {
      return bytesRead >= 5 && buf.subarray(0, 5).toString('ascii') === '%PDF-';
    }
    if (mimeType === 'image/jpeg') {
      return buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;
    }
    if (mimeType === 'image/png') {
      return bytesRead >= 8 &&
        buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47 &&
        buf[4] === 0x0D && buf[5] === 0x0A && buf[6] === 0x1A && buf[7] === 0x0A;
    }
    if (mimeType === 'image/webp') {
      return bytesRead >= 12 &&
        buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buf.subarray(8, 12).toString('ascii') === 'WEBP';
    }
    return false;
  } catch (_) {
    return false;
  }
}

module.exports = {
  APPLICATION_STATUSES,
  STATUS_LABELS,
  TERMINAL_STATUSES,
  ALLOWED_DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  normalizeApplicationStatus,
  getStatusLabel,
  validateApplicationTransition,
  validateApprovalDispatchPayload,
  validateDocumentRequestPayload,
  evaluateLearnerDashboardAccess,
  redactSensitiveFields,
  matchesAllowedMagicBytes
};
