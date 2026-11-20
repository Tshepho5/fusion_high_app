import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { PLATFORM_ONLY_MODULE_IDS, visibleDirectoryModules } from './adminDirectoryModel.ts';
import {
  DEFAULT_SCHOOL_ADMIN_QUICK_ACCESS_IDS,
  filterSchoolAdminNotifications,
  formatAdminDisplayName,
  getAdminInitials,
  getAuthorizedSchoolAdminModuleCount,
  isAuthorizedSchoolAdminModule,
  normalizeSchoolAdminStats,
  resolveSchoolAdminQuickAccessModules,
} from './schoolAdminHomeModel.ts';

describe('school admin identity helpers', () => {
  test('formats display name without duplicating surname', () => {
    assert.equal(formatAdminDisplayName({ full_name: 'Bontle', surname: 'Mothopeng' }), 'Bontle Mothopeng');
    assert.equal(formatAdminDisplayName({ full_name: 'Bontle Mothopeng', surname: 'Mothopeng' }), 'Bontle Mothopeng');
    assert.equal(formatAdminDisplayName({ full_name: 'Bontle Mothopeng' }), 'Bontle Mothopeng');
    assert.equal(formatAdminDisplayName({}), 'School Administrator');
  });

  test('computes fallback avatar initials cleanly', () => {
    assert.equal(getAdminInitials({ full_name: 'Bontle', surname: 'Mothopeng' }), 'BM');
    assert.equal(getAdminInitials({ full_name: 'Tshepo Makola' }), 'TM');
    assert.equal(getAdminInitials({ full_name: 'Principal' }), 'PR');
  });
});

describe('school admin quick access permissions & resolution', () => {
  test('default quick access modules are all authorized for School Admin', () => {
    assert.equal(getAuthorizedSchoolAdminModuleCount(), 25);
    DEFAULT_SCHOOL_ADMIN_QUICK_ACCESS_IDS.forEach((id) => {
      assert.equal(isAuthorizedSchoolAdminModule(id), true, id);
      assert.equal((PLATFORM_ONLY_MODULE_IDS as readonly string[]).includes(id), false, id);
    });
  });

  test('never exposes superadmin platform-only modules even if saved in localStorage', () => {
    const visible = visibleDirectoryModules(false);
    const resolved = resolveSchoolAdminQuickAccessModules(
      ['command-center', 'school-admissions', 'testers', 'users', 'reports'],
      visible
    );
    assert.deepEqual(
      resolved.map((m) => m.id),
      ['users', 'reports']
    );
  });

  test('falls back to real School Admin defaults when stored list is empty or platform-only', () => {
    const visible = visibleDirectoryModules(false);
    const fromEmpty = resolveSchoolAdminQuickAccessModules([], visible);
    const fromPlatformOnly = resolveSchoolAdminQuickAccessModules(['command-center', 'testers'], visible);
    assert.deepEqual(
      fromEmpty.map((m) => m.id),
      [...DEFAULT_SCHOOL_ADMIN_QUICK_ACCESS_IDS]
    );
    assert.deepEqual(
      fromPlatformOnly.map((m) => m.id),
      [...DEFAULT_SCHOOL_ADMIN_QUICK_ACCESS_IDS]
    );
  });
});

describe('school admin stats & notification data integrity', () => {
  test('never fabricates metrics when stats are empty or zero', () => {
    const empty = normalizeSchoolAdminStats(null);
    assert.equal(empty.totalLearners, null);
    assert.equal(empty.totalTeachers, null);
    assert.equal(empty.totalClasses, null);
    assert.equal(empty.attendanceRate, null);
    assert.deepEqual(empty.recentAnnouncements, []);

    const zeroed = normalizeSchoolAdminStats({
      enrolled_learners: 0,
      teacher: 0,
      total_classes: 0,
      overall_attendance: 0,
    });
    assert.equal(zeroed.totalLearners, null);
    assert.equal(zeroed.totalTeachers, null);
    assert.equal(zeroed.totalClasses, null);
    assert.equal(zeroed.attendanceRate, null);
  });

  test('preserves real school stats and announcements', () => {
    const real = normalizeSchoolAdminStats({
      enrolled_learners: 412,
      teacher: 24,
      total_classes: 15,
      overall_attendance: 94,
      recent_announcements: [
        { id: 1, title: 'Term 4 Timetable', content: 'Published', author_name: 'Principal', created_at: '2026-11-20T08:00:00Z' },
      ],
    });
    assert.equal(real.totalLearners, 412);
    assert.equal(real.totalTeachers, 24);
    assert.equal(real.totalClasses, 15);
    assert.equal(real.attendanceRate, 94);
    assert.equal(real.recentAnnouncements.length, 1);
    assert.equal(real.recentAnnouncements[0].title, 'Term 4 Timetable');
  });

  test('filters out chat and security items from school admin home notifications', () => {
    const filtered = filterSchoolAdminNotifications([
      { id: 1, type: 'chat', title: 'New DM', message: 'Hi', is_read: false, created_at: '' },
      { id: 2, type: 'security', title: 'Login alert', message: 'Signed in', is_read: false, created_at: '' },
      { id: 3, type: 'announcement', title: 'Password Reset Request', message: 'Reset', is_read: false, created_at: '' },
      { id: 4, type: 'announcement', title: 'Exam Schedule Ready', message: 'Check timetable', is_read: false, created_at: '2026-11-20T09:00:00Z' },
    ]);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, 4);
  });
});
