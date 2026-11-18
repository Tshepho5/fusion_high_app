import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  ADMIN_DIRECTORY_CATEGORIES,
  ADMIN_DIRECTORY_MODULES,
  PLATFORM_ONLY_MODULE_IDS,
  directoryMatches,
  filterDirectory,
  isDirectoryModule,
  modulesInCategory,
  readIdList,
  rememberAdminDirectoryVisit,
  rememberRecentIds,
  resolveListedModules,
  toggleStoredId,
  visibleDirectoryModules,
} from './adminDirectoryModel.ts';

const EXPECTED_TITLES: Record<string, string[]> = {
  'governance-access': [
    'School Admissions & Registrations',
    'Master Controls & Testers',
    'User Directory & Roles',
    'Multi-School Command',
    'User Support Desk',
  ],
  'academic-curriculum': [
    'Subject Streams',
    'School Curriculum & Subjects',
    'Lesson Planning Oversight',
    'Dynamic Classes & Homerooms',
    'Faculty & Coach Invites',
  ],
  'assessment-performance': [
    'School Performance Metrics',
    'CAPS Mark Audits & Report Cards',
    'CAPS Report Card Studio',
    'Matric Pass Rate Projector',
    'Exam Seating Master',
  ],
  'operations-resources': [
    'Timetable Allocations',
    'School Calendar',
    'Staff Leave & Relief Duty',
    'Textbook Inventory',
    'School Fees & Invoicing',
  ],
  'communication-engagement': [
    'Communication Hub',
    'Official Broadcasts',
    'Parent-Educator Consultations',
  ],
  'enrichment-partnerships': [
    'Inter-School Derbies & League',
    'Sports & Extracurriculars',
    'Tertiary Bursary Engine',
    'Import Learners (SA-SAMS CSV)',
  ],
  'system-administration': ['Technical Settings'],
};

describe('admin directory categories', () => {
  test('every existing module appears in exactly one category', () => {
    const seen = new Map<string, string>();
    ADMIN_DIRECTORY_MODULES.forEach((module) => {
      assert.equal(seen.has(module.id), false, module.id);
      seen.set(module.id, module.categoryId);
      assert.ok(ADMIN_DIRECTORY_CATEGORIES.some((category) => category.id === module.categoryId));
    });
    assert.equal(ADMIN_DIRECTORY_MODULES.length, 28);
    ADMIN_DIRECTORY_CATEGORIES.forEach((category) => {
      const titles = modulesInCategory(ADMIN_DIRECTORY_MODULES, category.id).map((module) => module.title);
      assert.deepEqual(titles, EXPECTED_TITLES[category.id]);
    });
  });

  test('school administrators do not see platform-only modules', () => {
    const visible = visibleDirectoryModules(false).map((module) => module.id);
    PLATFORM_ONLY_MODULE_IDS.forEach((id) => assert.equal(visible.includes(id), false));
    assert.equal(visibleDirectoryModules(true).length, 28);
    assert.equal(visible.length, 25);
  });

  test('search matches module names and category names', () => {
    const modules = visibleDirectoryModules(true);
    assert.deepEqual(
      filterDirectory(modules, 'seating').map((module) => module.id),
      ['exam-seating']
    );
    assert.deepEqual(
      filterDirectory(modules, 'communication & engagement').map((module) => module.id),
      ['messages', 'announcements', 'consultations']
    );
    assert.equal(directoryMatches(modules[0], '   '), true);
    assert.equal(filterDirectory(modules, 'not-a-module').length, 0);
  });
});

describe('admin directory preferences', () => {
  test('favourites start empty unless the user has saved them', () => {
    assert.deepEqual(readIdList(null), []);
    assert.deepEqual(readIdList('[]'), []);
    assert.deepEqual(readIdList('not-json'), []);
    assert.deepEqual(readIdList(JSON.stringify(['users', 4, 'marks'])), ['users', 'marks']);
  });

  test('starring persists by toggling the saved id list', () => {
    assert.deepEqual(toggleStoredId([], 'users'), ['users']);
    assert.deepEqual(toggleStoredId(['users', 'marks'], 'users'), ['marks']);
  });

  test('recently used records real visits and ignores unknown tabs', () => {
    assert.deepEqual(rememberRecentIds([], 'overview'), []);
    assert.deepEqual(rememberRecentIds([], 'users'), ['users']);
    assert.deepEqual(rememberRecentIds(['users', 'marks'], 'users'), ['users', 'marks']);
    assert.deepEqual(
      rememberRecentIds(['users', 'marks', 'finance', 'calendar'], 'settings'),
      ['settings', 'users', 'marks', 'finance']
    );
    const storage = new Map<string, string>();
    const memory = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
    };
    assert.deepEqual(rememberAdminDirectoryVisit('more', memory), []);
    assert.deepEqual(rememberAdminDirectoryVisit('timetable', memory), ['timetable']);
    assert.deepEqual(rememberAdminDirectoryVisit('finance', memory), ['finance', 'timetable']);
    assert.equal(isDirectoryModule('settings'), true);
    assert.equal(isDirectoryModule('profile'), false);
    const visible = visibleDirectoryModules(false);
    assert.deepEqual(
      resolveListedModules(['testers', 'users', 'users'], visible).map((module) => module.id),
      ['users']
    );
  });
});
