/**
 * Critical-path unit tests (no DB required).
 * Run: npm test
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { MESSAGE, rejectNameDigits } = require('../public/src/services/lettersOnly');
const {
  validateSupportTicketInput,
  normalizeCategory,
  generateTicketNumber,
  computeSlaDueAt,
  slaStatus,
  TICKET_CATEGORIES
} = require('../public/src/services/supportTicketValidation');

describe('lettersOnly / name validation', () => {
  it('rejects digits in name fields', () => {
    let statusCode = null;
    let body = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(payload) {
        body = payload;
        return this;
      }
    };
    const blocked = rejectNameDigits(res, 'Sarah', 'Walters2');
    assert.equal(blocked, true);
    assert.equal(statusCode, 400);
    assert.equal(body.success, false);
    assert.match(body.error, /letters only/i);
    assert.equal(MESSAGE.includes('Numbers'), true);
  });

  it('allows letter-only names', () => {
    const res = {
      status() {
        return this;
      },
      json() {
        return this;
      }
    };
    assert.equal(rejectNameDigits(res, 'Thabo', "O'Connor"), false);
  });
});

describe('support ticket validation', () => {
  it('accepts a well-formed Contact Admin payload', () => {
    const result = validateSupportTicketInput({
      requester_name: 'Sarah Walters',
      requester_email: 'parent.walters@gelezasa.co.za',
      requester_phone: '0821234567',
      category: 'wrong_email',
      subject: 'Wrong email on application',
      description: 'I typed the wrong email on my parent portal application.',
      related_application_number: 'PAR-2026-48192'
    });
    assert.equal(result.ok, true);
    assert.equal(result.value.category, 'wrong_email');
    assert.equal(result.value.requester_phone, '0821234567');
    assert.equal(result.value.related_application_number, 'PAR-2026-48192');
  });

  it('rejects names with numbers', () => {
    const result = validateSupportTicketInput({
      requester_name: 'Sarah123',
      requester_email: 'a@b.co',
      subject: 'Help please',
      description: 'My email is wrong on the form.'
    });
    assert.equal(result.ok, false);
    assert.match(result.error, /letters/i);
  });

  it('rejects invalid phone length', () => {
    const result = validateSupportTicketInput({
      requester_name: 'Sarah Walters',
      requester_email: 'a@b.co',
      requester_phone: '12345',
      subject: 'Help please',
      description: 'My phone number was captured incorrectly.'
    });
    assert.equal(result.ok, false);
    assert.match(result.error, /10 digits/i);
  });

  it('rejects invalid application reference format', () => {
    const result = validateSupportTicketInput({
      requester_name: 'Sarah Walters',
      requester_email: 'a@b.co',
      subject: 'Help please',
      description: 'Please fix my application details.',
      related_application_number: 'BADREF'
    });
    assert.equal(result.ok, false);
    assert.match(result.error, /PAR-2026/i);
  });

  it('normalizes unknown categories to other', () => {
    assert.equal(normalizeCategory('not-a-real-category'), 'other');
    assert.ok(TICKET_CATEGORIES.includes('application_correction'));
  });

  it('generates GSA-SUP ticket numbers', () => {
    const n = generateTicketNumber(new Date('2026-10-03'));
    assert.match(n, /^GSA-SUP-2026-\d{6}$/);
  });
});

describe('support SLA helpers', () => {
  it('computes urgent SLA within 4 hours', () => {
    const created = new Date('2026-10-03T08:00:00Z');
    const due = computeSlaDueAt('urgent', created);
    assert.equal(due.toISOString(), '2026-10-03T12:00:00.000Z');
  });

  it('marks breached when past due', () => {
    assert.equal(slaStatus(new Date('2020-01-01'), new Date('2026-10-03')), 'breached');
    assert.equal(slaStatus(new Date('2099-01-01'), new Date('2026-10-03')), 'on_track');
  });
});

describe('login payload shape (client contract)', () => {
  it('maps email/identifier/learnerNumber consistently', () => {
    // Mirrors client/src/services/api.ts authService.login body shape
    const credentials = { email: 'learner.walters@gelezasa.co.za', password: 'password123' };
    const body = {
      email: credentials.email || credentials.identifier || credentials.learnerNumber,
      identifier: credentials.identifier || credentials.email || credentials.learnerNumber,
      learnerNumber: credentials.learnerNumber || credentials.identifier || credentials.email,
      password: credentials.password
    };
    assert.equal(body.email, 'learner.walters@gelezasa.co.za');
    assert.equal(body.identifier, 'learner.walters@gelezasa.co.za');
    assert.ok(body.password.length >= 8);
  });
});
