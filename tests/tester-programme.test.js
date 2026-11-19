'use strict';

const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const programme = require('../lib/testerProgramme');

const root = path.join(__dirname, '..');

test('tester invitations allow only parent, teacher, and learner', () => {
  for (const role of ['parent', 'teacher', 'learner']) {
    const decision = programme.testerInviteRoleAllowed({ requestedRole: role, targetIsSuperadmin: false });
    assert.equal(decision.ok, true);
    assert.equal(decision.role, role);
  }
  for (const role of ['admin', 'principal', 'superadmin', 'master_admin']) {
    const decision = programme.testerInviteRoleAllowed({ requestedRole: role, targetIsSuperadmin: false });
    assert.equal(decision.ok, false);
    assert.equal(decision.status, 403);
  }
  const protectedAdmin = programme.testerInviteRoleAllowed({ requestedRole: 'teacher', targetIsSuperadmin: true });
  assert.equal(protectedAdmin.ok, false);
});

test('an existing school account cannot be converted into a tester', () => {
  assert.equal(programme.existingAccountInviteAllowed({ exists: false }).ok, true);
  const realAccount = programme.existingAccountInviteAllowed({
    exists: true,
    isTester: false,
    isSuperadmin: false,
    schoolIsTest: false
  });
  assert.equal(realAccount.status, 409);
  const platform = programme.existingAccountInviteAllowed({
    exists: true,
    isTester: true,
    isSuperadmin: true,
    schoolIsTest: true
  });
  assert.equal(platform.status, 403);
  const wrongSchool = programme.existingAccountInviteAllowed({
    exists: true,
    isTester: true,
    isSuperadmin: false,
    schoolIsTest: false
  });
  assert.equal(wrongSchool.status, 409);
  const reuse = programme.existingAccountInviteAllowed({
    exists: true,
    isTester: true,
    isSuperadmin: false,
    schoolIsTest: true
  });
  assert.equal(reuse.reuse, true);
});

test('learner and parent links stay inside the matching test boundary', () => {
  assert.equal(programme.assertTestSchool({ is_test_school: true }).ok, true);
  assert.equal(programme.assertTestSchool({ is_test_school: false }).ok, false);
  assert.equal(programme.assertTestSchool(null).ok, false);
  assert.equal(programme.canBindLearnerChild({
    userSchoolId: 2,
    childSchoolId: 9,
    userIsTester: true,
    childIsTestRecord: false
  }), false);
  assert.equal(programme.canBindLearnerChild({
    userSchoolId: 4,
    childSchoolId: 4,
    userIsTester: true,
    childIsTestRecord: true
  }), true);
  assert.equal(programme.canBindLearnerChild({
    userSchoolId: 4,
    childSchoolId: 4,
    userIsTester: false,
    childIsTestRecord: true
  }), false);
  assert.equal(programme.childVisibleToParent({
    parentIsTester: true,
    parentSchoolId: 4,
    childSchoolId: 9,
    childIsTestRecord: true
  }), false);
});

test('email delivery is recorded only when the provider accepts it', () => {
  assert.equal(programme.deliveryFromSendResult({ success: true }).email_sent, true);
  assert.equal(programme.deliveryFromSendResult({ success: true }).status, 'pending');
  const failed = programme.deliveryFromSendResult({ success: false });
  assert.equal(failed.email_sent, false);
  assert.equal(failed.delivery_status, 'failed');
  assert.equal(failed.status, 'draft');
  const kept = programme.resendDelivery({ delivery_status: 'sent', status: 'pending' }, { success: false });
  assert.equal(kept.previous_link_kept, true);
  assert.equal(kept.delivery_status, 'sent');
});

test('invitation tokens are stored as hashes and programme counts come from rows', () => {
  const minted = programme.createInviteToken();
  assert.equal(programme.hashInviteToken(minted.token), minted.hash);
  assert.notEqual(minted.token, minted.hash);
  assert.equal(minted.hash.length, 64);

  const summary = programme.summariseProgramme([
    { id: 1, role_name: 'parent', delivery_status: 'sent', status: 'pending', expires_at: '2999-01-01', accepted_at: null, activated_at: null },
    { id: 2, role_name: 'teacher', delivery_status: 'sent', status: 'activated', accepted_at: '2026-01-01', activated_at: '2026-01-01', user_id: 8 },
    { id: 3, role_name: 'learner', delivery_status: 'not_sent', status: 'draft' },
    { id: 4, role_name: 'learner', delivery_status: 'sent', status: 'revoked', user_id: 9 }
  ], [
    { kind: 'check', result: 'pass', dashboard: 'Parent', module: 'Children' },
    { kind: 'check', result: 'fail', dashboard: 'Teacher', module: 'Marks' },
    { kind: 'issue', severity: 'critical', status: 'open', dashboard: 'Learner', module: 'Assignments' },
    { kind: 'issue', severity: 'low', status: 'ready_for_retesting', dashboard: 'Learner', module: 'Assignments' },
    { kind: 'issue', severity: 'critical', status: 'verified', dashboard: 'Parent', module: 'Fees' }
  ], {
    8: { is_tester: true, deactivated: false },
    9: { is_tester: true, deactivated: true }
  }, new Date('2026-11-19T12:00:00Z'));

  assert.equal(summary.parent_testers_invited, 1);
  assert.equal(summary.teacher_testers_invited, 1);
  assert.equal(summary.learner_testers_invited, 1);
  assert.equal(summary.invitations_pending, 1);
  assert.equal(summary.invitations_accepted, 1);
  assert.equal(summary.accounts_activated, 1);
  assert.equal(summary.active_testers, 1);
  assert.equal(summary.suspended_or_revoked, 1);
  assert.equal(summary.dashboards_tested, 3);
  assert.equal(summary.modules_tested, 4);
  assert.equal(summary.passed_tests, 1);
  assert.equal(summary.failed_tests, 1);
  assert.equal(summary.outstanding_issues, 2);
  assert.equal(summary.critical_issues, 1);
  assert.equal(summary.awaiting_retest, 1);
});

test('tester reports reject outsiders and the invitation path does not keep a password', () => {
  const outsider = programme.validateTesterReport({
    kind: 'check',
    dashboard: 'Parent',
    module: 'Home',
    description: 'This module loaded from the test school.',
    result: 'pass'
  }, { is_tester: false, role: 'parent' });
  assert.equal(outsider.ok, false);
  assert.equal(outsider.status, 403);

  const controller = fs.readFileSync(path.join(root, 'public/src/controller/systemController.js'), 'utf8');
  const service = fs.readFileSync(path.join(root, 'public/src/services/testerProvisioning.js'), 'utf8');
  const email = fs.readFileSync(path.join(root, 'public/src/services/emailService.js'), 'utf8');
  const learner = fs.readFileSync(path.join(root, 'public/src/controller/learnerController.js'), 'utf8');
  const inviteMail = email.slice(email.indexOf('sendTesterInvitationEmail:'), email.indexOf('sendChildLinkageEmail:'));
  assert.equal(controller.includes('temp_password'), false);
  assert.equal(service.includes('temp_password'), false);
  assert.equal(/temporaryPassword/.test(inviteMail), false);
  assert.match(inviteMail, /Accept invitation/);
  assert.equal(/full_name ILIKE/.test(learner), false);
});
