'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parentCardView,
  paymentEntitlement,
  assembleParentReleases
} = require('../lib/reportRelease');

test('an unpublished report does not include marks', () => {
  const view = parentCardView({
    child_id: 7,
    child_name: 'Amina Dlamini',
    grade: 10,
    class_name: '10A',
    academic_year: 2026,
    term: 3,
    is_published: false,
    overall_average: 81,
    marks_breakdown: { Mathematics: 81 }
  });
  assert.equal(view.release_status, 'not_released');
  assert.equal(view.download_available, false);
  assert.equal(view.overall_average, undefined);
  assert.equal(view.marks_breakdown, undefined);
  assert.equal(view.payment_required, false);
});

test('a released report can be downloaded and a fee does not block it', () => {
  const view = parentCardView({
    child_id: 7,
    child_name: 'Amina Dlamini',
    grade: 10,
    academic_year: 2026,
    term: 3,
    status: 'published',
    overall_average: 74
  });
  const payment = paymentEntitlement();
  assert.equal(view.release_status, 'released');
  assert.equal(view.download_available, true);
  assert.equal(view.overall_average, 74);
  assert.equal(payment.enabled, false);
  assert.equal(payment.blocks_access, false);
});

test('a parent release list keeps only linked children', () => {
  const list = assembleParentReleases(4, [
    { child_id: 7, full_name: 'Amina', surname: 'Dlamini', grade: 10, class_name: '10A', parent_id: 4 },
    { child_id: 8, full_name: 'Other', surname: 'Learner', grade: 10, class_name: '10A', parent_id: 9 }
  ], [
    { child_id: 7, academic_year: 2026, term: 3, is_published: true, overall_average: 74 },
    { child_id: 8, academic_year: 2026, term: 3, is_published: true, overall_average: 91, marks_breakdown: { English: 91 } }
  ]);
  assert.equal(list.length, 1);
  assert.equal(list[0].child_id, 7);
  assert.equal(list[0].reports[0].release_status, 'released');
  assert.equal(JSON.stringify(list).includes('Other'), false);
  assert.equal(JSON.stringify(list).includes('91'), false);
});
