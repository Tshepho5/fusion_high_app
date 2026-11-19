'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { decideEarlyWarningAlert, sameSchoolRecipientIds, periodicAuditPlan } = require('../lib/earlyWarningAlert');
const { questionBankArguments } = require('../lib/questionBankRequest');

describe('AI phase D automation', () => {
  test('a recent alert is not sent again inside the cooldown', () => {
    const now = new Date('2026-11-20T00:00:00Z');
    const recent = decideEarlyWarningAlert({
      predictionAvailable: true,
      riskTierId: 0,
      predictedScore: 40,
      attendancePct: 60,
      lastAlertAt: '2026-11-18T00:00:00Z',
      now
    });
    const later = decideEarlyWarningAlert({
      predictionAvailable: true,
      riskTierId: 0,
      predictedScore: 40,
      attendancePct: 60,
      lastAlertAt: '2026-11-01T00:00:00Z',
      now
    });
    const missing = decideEarlyWarningAlert({
      predictionAvailable: false,
      riskTierId: 0,
      predictedScore: 40,
      attendancePct: 60,
      now
    });
    assert.equal(recent.dispatch, false);
    assert.equal(recent.reason, 'cooldown');
    assert.equal(later.dispatch, true);
    assert.equal(missing.dispatch, false);
  });

  test('an alert goes only to people in the same school', () => {
    const ids = sameSchoolRecipientIds([
      { id: 4, school_id: 2 },
      { id: 4, school_id: 2 },
      { id: 9, school_id: 3 },
      { id: 0, school_id: 2 }
    ], 2);
    assert.deepEqual(ids, [4]);
  });

  test('question bank arguments reject values that could change the command', () => {
    const rejected = questionBankArguments({ subject: 'Science\n--help', grade: 10 });
    const accepted = questionBankArguments({ subject: 'Physical Sciences', grade: 12, marks: 30 });
    assert.equal(rejected.ok, false);
    assert.equal(accepted.ok, true);
    assert.equal(accepted.args.subject, 'Physical Sciences');
  });

  test('a scheduled audit waits until a term is configured', () => {
    assert.equal(periodicAuditPlan({}).run, false);
    assert.deepEqual(periodicAuditPlan({ GELEZA_AUDIT_TERM: '4', GELEZA_AUDIT_YEAR: '2026' }), {
      run: true,
      term: 4,
      academicYear: 2026
    });
  });
});
