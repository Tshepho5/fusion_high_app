/**
 * Pure validation helpers for Contact Admin / Support Desk tickets.
 * Kept side-effect free so critical-path unit tests can run without a database.
 */

const TICKET_CATEGORIES = [
  'wrong_email',
  'wrong_phone',
  'wrong_id_number',
  'wrong_learner_details',
  'wrong_parent_details',
  'application_correction',
  'login_access',
  'account_profile',
  'fees_payments',
  'technical',
  'other'
];

const CATEGORY_LABELS = {
  wrong_email: 'Wrong email address',
  wrong_phone: 'Wrong phone number',
  wrong_id_number: 'Wrong ID number',
  wrong_learner_details: 'Wrong learner / child details',
  wrong_parent_details: 'Wrong parent / guardian details',
  application_correction: 'Application form correction',
  login_access: 'Login or account access',
  account_profile: 'Profile / personal details',
  fees_payments: 'Fees or payments',
  technical: 'Technical / app issue',
  other: 'Other support request'
};

function normalizeCategory(raw) {
  const c = String(raw || 'other').trim().toLowerCase().replace(/\s+/g, '_');
  return TICKET_CATEGORIES.includes(c) ? c : 'other';
}

function generateTicketNumber(now = new Date()) {
  const year = now.getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `GSA-SUP-${year}-${rand}`;
}

/**
 * @returns {{ ok: true, value: object } | { ok: false, error: string }}
 */
function validateSupportTicketInput(body = {}) {
  const requester_name = String(body.requester_name || body.name || '').trim();
  const requester_email = String(body.requester_email || body.email || '').trim().toLowerCase();
  let requester_phone = String(body.requester_phone || body.phone || '').trim() || null;
  const subject = String(body.subject || '').trim();
  const description = String(body.description || body.message || '').trim();
  const category = normalizeCategory(body.category);
  let related_application_number =
    String(body.related_application_number || body.application_number || '').trim() || null;

  if (!requester_name || requester_name.length < 2) {
    return { ok: false, error: 'Please provide your full name.' };
  }
  if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(requester_name) || /\d/.test(requester_name)) {
    return { ok: false, error: 'Full name may only contain letters (no numbers).' };
  }
  if (!requester_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requester_email)) {
    return { ok: false, error: 'Please provide a valid contact email so we can reply.' };
  }
  if (requester_phone) {
    const digits = requester_phone.replace(/\D/g, '');
    if (!/^\d{10}$/.test(digits)) {
      return { ok: false, error: 'Phone must be exactly 10 digits if provided.' };
    }
    requester_phone = digits;
  }
  if (related_application_number) {
    related_application_number = related_application_number.toUpperCase();
    if (!/^[A-Z]{2,5}-\d{4}-\d{4,6}$/.test(related_application_number)) {
      return {
        ok: false,
        error: 'Application reference format is invalid. Example: PAR-2026-48192.'
      };
    }
  }
  if (!subject || subject.length < 4) {
    return { ok: false, error: 'Please provide a short subject for your request.' };
  }
  if (!description || description.length < 10) {
    return {
      ok: false,
      error: 'Please describe the problem in a bit more detail (at least 10 characters).'
    };
  }

  return {
    ok: true,
    value: {
      requester_name,
      requester_email,
      requester_phone,
      subject,
      description,
      category,
      related_application_number,
      priority:
        body.priority === 'high' || body.priority === 'urgent' ? body.priority : 'normal'
    }
  };
}

/** Simple SLA: urgent 4h, high 24h, normal 72h from created_at */
function computeSlaDueAt(priority, createdAt = new Date()) {
  const base = createdAt instanceof Date ? createdAt : new Date(createdAt);
  const hours =
    priority === 'urgent' ? 4 : priority === 'high' ? 24 : priority === 'low' ? 120 : 72;
  return new Date(base.getTime() + hours * 60 * 60 * 1000);
}

function slaStatus(dueAt, now = new Date()) {
  if (!dueAt) return 'none';
  const due = dueAt instanceof Date ? dueAt : new Date(dueAt);
  const ms = due.getTime() - now.getTime();
  if (ms < 0) return 'breached';
  if (ms < 6 * 60 * 60 * 1000) return 'due_soon';
  return 'on_track';
}

module.exports = {
  TICKET_CATEGORIES,
  CATEGORY_LABELS,
  normalizeCategory,
  generateTicketNumber,
  validateSupportTicketInput,
  computeSlaDueAt,
  slaStatus
};
