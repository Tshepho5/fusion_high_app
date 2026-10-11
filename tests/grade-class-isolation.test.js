const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
require('dotenv').config();

const db = require('../db/db');
const teacherLearnersController = require('../public/src/controller/teacher/teacherLearnersController');
const teacherAttendanceController = require('../public/src/controller/teacher/teacherAttendanceController');

describe('Geleza SA: Learner Class & Grade Strict Isolation', () => {

  test('Classes table for School 14 contains isolated numeric grade names (10, 11, 12)', async () => {
    const res = await db.query(
      `SELECT id, name, grade FROM classes WHERE school_id = 14 ORDER BY grade`
    );
    assert.ok(res.rows.length >= 3, 'Must have at least Grade 10, 11, 12');
    res.rows.forEach(r => {
      assert.ok(!r.name.includes('School'), `Class name "${r.name}" must not contain "School"`);
      assert.ok(/^[0-9]+$/.test(r.name), `Class name "${r.name}" must be pure number without alphabets`);
    });
  });

  test('getClassList with grade 11 returns 0 learners and does NOT leak Grade 10 learners', async () => {
    const req = {
      query: { class: '11', grade: '11' },
      user: { id: 36, school_id: 14, role: 'teacher' }
    };
    let jsonResult = null;
    const res = {
      json: (data) => { jsonResult = data; return res; },
      status: () => res
    };

    await teacherLearnersController.getClassList(req, res);
    assert.ok(jsonResult, 'Response must be received');
    const roster = Array.isArray(jsonResult) ? jsonResult : (jsonResult.roster || []);
    assert.equal(roster.length, 0, 'Grade 11 should have 0 learners and not leak Grade 10 learners');
  });

  test('getClassList with grade 10 returns only Grade 10 learners with numeric class name', async () => {
    const req = {
      query: { class: '10', grade: '10' },
      user: { id: 36, school_id: 14, role: 'teacher' }
    };
    let jsonResult = null;
    const res = {
      json: (data) => { jsonResult = data; return res; },
      status: () => res
    };

    await teacherLearnersController.getClassList(req, res);
    assert.ok(jsonResult, 'Response must be received');
    const roster = Array.isArray(jsonResult) ? jsonResult : (jsonResult.roster || []);
    assert.ok(roster.length > 0, 'Grade 10 should have learners');
    roster.forEach(l => {
      assert.equal(Number(l.grade), 10, 'All returned learners must be in Grade 10');
      assert.equal(String(l.class_name), '10', 'Class name must be pure number "10"');
    });

    // Verify deduplication: no duplicate learner IDs
    const ids = roster.map(l => l.id);
    const uniqueIds = Array.from(new Set(ids));
    assert.equal(ids.length, uniqueIds.length, 'Learner roster must have unique learner IDs');
  });

  test('getAttendanceRoster for Grade 11 returns 0 learners and does NOT return Grade 10 learners', async () => {
    const req = {
      query: { class: '11', date: '2026-10-11' },
      user: { id: 36, school_id: 14, role: 'teacher' }
    };
    let jsonResult = null;
    const res = {
      json: (data) => { jsonResult = data; return res; },
      status: () => res
    };

    await teacherAttendanceController.getAttendanceRoster(req, res);
    assert.ok(jsonResult, 'Response must be received');
    const roster = jsonResult.roster || [];
    assert.equal(roster.length, 0, 'Grade 11 attendance roster must be empty');
  });

});
