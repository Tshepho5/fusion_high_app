import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  buildDashboardOwnerUser,
  dashboardRole,
  type DashboardOwnerCandidate,
  type DashboardView,
} from './dashboardView.ts';

const SUPERADMIN_ACCOUNT: DashboardOwnerCandidate = {
  id: 1,
  role: 'admin',
  full_name: 'Tshepo',
  surname: 'Makola',
  email: 'exec@geleza-sa.co.za',
  school_id: 1,
  is_superadmin: true,
  profile_picture: 'https://cdn.example/superadmin-photo.jpg',
  profile_picture_path: '/uploads/pfp/superadmin.jpg',
  phone: '+27820000001',
};

describe('dashboard-owner identity context isolation', () => {
  test('returns own account when not viewing another dashboard', () => {
    const owner = buildDashboardOwnerUser(SUPERADMIN_ACCOUNT, null);
    assert.equal(owner?.id, 1);
    assert.equal(owner?.is_superadmin, true);
    assert.equal(owner?.profile_picture, 'https://cdn.example/superadmin-photo.jpg');
  });

  test('never leaks superadmin profile picture or personal details into a viewed school admin with no photo', () => {
    const view: DashboardView = {
      id: 42,
      role: 'admin',
      schoolId: 14,
      full_name: 'Bontle',
      surname: 'Mothopeng',
      email: 'principal@walters.co.za',
      profile_picture: null,
      profile_picture_path: null,
    };
    const owner = buildDashboardOwnerUser(SUPERADMIN_ACCOUNT, view, null);
    assert.equal(owner?.id, 42);
    assert.equal(owner?.full_name, 'Bontle');
    assert.equal(owner?.surname, 'Mothopeng');
    assert.equal(owner?.school_id, 14);
    assert.equal(owner?.is_superadmin, false);
    assert.equal(owner?.profile_picture, null);
    assert.equal(owner?.profile_picture_path, null);
    assert.equal(owner?.phone, undefined);
  });

  test('uses target user profile picture when target user has one (directory row or resolved profile)', () => {
    const view: DashboardView = {
      id: 77,
      role: 'teacher',
      schoolId: 14,
      full_name: 'Lerato',
      surname: 'Ndlovu',
      email: 'lerato@walters.co.za',
      profile_picture: '/uploads/pfp/lerato.jpg',
    };
    const fromView = buildDashboardOwnerUser(SUPERADMIN_ACCOUNT, view, null);
    assert.equal(fromView?.profile_picture, '/uploads/pfp/lerato.jpg');
    assert.equal(fromView?.is_superadmin, false);

    const fromResolved = buildDashboardOwnerUser(SUPERADMIN_ACCOUNT, { ...view, profile_picture: null }, {
      id: 77,
      full_name: 'Lerato',
      surname: 'Ndlovu',
      profile_picture: '/uploads/pfp/lerato-live.jpg',
    });
    assert.equal(fromResolved?.profile_picture, '/uploads/pfp/lerato-live.jpg');
    assert.notEqual(fromResolved?.profile_picture, SUPERADMIN_ACCOUNT.profile_picture);
  });

  test('ignores stale resolved profile belonging to a different user id', () => {
    const view: DashboardView = {
      id: 88,
      role: 'learner',
      schoolId: 14,
      full_name: 'Kagiso',
      surname: 'Modise',
      grade: 11,
    };
    const owner = buildDashboardOwnerUser(SUPERADMIN_ACCOUNT, view, {
      id: 99,
      profile_picture: '/uploads/pfp/other-user.jpg',
    });
    assert.equal(owner?.id, 88);
    assert.equal(owner?.profile_picture, null);
    assert.equal(owner?.grade, 11);
  });

  test('non-superadmin account cannot be switched into a viewed dashboard context', () => {
    const schoolAdmin: DashboardOwnerCandidate = {
      id: 42,
      role: 'admin',
      full_name: 'Bontle',
      surname: 'Mothopeng',
      is_superadmin: false,
      profile_picture: '/uploads/pfp/bontle.jpg',
    };
    const view: DashboardView = {
      id: 88,
      role: 'learner',
      schoolId: 14,
      full_name: 'Kagiso',
    };
    const owner = buildDashboardOwnerUser(schoolAdmin, view);
    assert.equal(owner?.id, 42);
    assert.equal(owner?.profile_picture, '/uploads/pfp/bontle.jpg');
  });

  test('normalizes dashboard roles safely', () => {
    assert.equal(dashboardRole('principal'), 'admin');
    assert.equal(dashboardRole('educator'), 'teacher');
    assert.equal(dashboardRole('student'), 'learner');
    assert.equal(dashboardRole('parent'), 'parent');
    assert.equal(dashboardRole(''), null);
  });
});
