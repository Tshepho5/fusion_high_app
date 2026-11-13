/**
 * Integrity checks for the lesson-planning migration.
 * Schema corrections are applied. Row probes run inside a transaction and roll back.
 * The down migration is also executed inside a transaction and rolled back,
 * so lesson rows are not deleted.
 */
const fs = require('fs');
const path = require('path');
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

require('dotenv').config();
const db = require('../db/db');
const { applyLessonPlanningMigrations } = require('../db/migrate_lesson_planning');

const DOWN_SQL = fs.readFileSync(
  path.join(__dirname, '..', 'db', 'migrations', '20261113_lesson_planning.down.sql'),
  'utf8'
);

async function counts(client) {
  const { rows } = await client.query(`
    SELECT
      (SELECT COUNT(*)::int FROM schools) AS schools,
      (SELECT COUNT(*)::int FROM users) AS users,
      (SELECT COUNT(*)::int FROM classes) AS classes,
      (SELECT COUNT(*)::int FROM subjects) AS subjects,
      (SELECT COUNT(*)::int FROM timetables) AS timetables,
      (SELECT COUNT(*)::int FROM lesson_plans) AS lesson_plans
  `);
  return rows[0];
}

describe('lesson planning migration integrity', () => {
  let client;
  let beforeCounts;

  before(async () => {
    client = await db.pool.connect();
    beforeCounts = await counts(client);
    await applyLessonPlanningMigrations(client);
    await applyLessonPlanningMigrations(client);
  });

  after(async () => {
    if (client) client.release();
    await db.pool.end();
  });

  it('keeps existing school, user, class, subject, timetable, and lesson counts', async () => {
    const afterCounts = await counts(client);
    assert.deepEqual(afterCounts, beforeCounts);
  });

  it('rejects a negative lesson duration and a teacher from another school', async () => {
    await client.query('BEGIN');
    try {
      const teacher = await client.query(
        `SELECT u.id, u.school_id
         FROM users u
         JOIN schools s ON s.id = u.school_id
         ORDER BY u.id
         LIMIT 1`
      );
      assert.ok(teacher.rows.length > 0);
      const schoolId = teacher.rows[0].school_id;
      const teacherId = teacher.rows[0].id;
      await client.query('SAVEPOINT duration_check');
      try {
        await client.query(
          `INSERT INTO lesson_plans
            (school_id, teacher_id, subject_name, grade, academic_year, term, status, topic, duration_minutes)
           VALUES ($1, $2, 'Mathematics', 10, 2026, 1, 'draft', 'Bad duration', -5)`,
          [schoolId, teacherId]
        );
        assert.fail('negative duration was accepted');
      } catch (error) {
        assert.equal(error.code, '23514', error.message);
        await client.query('ROLLBACK TO SAVEPOINT duration_check');
      }

      const other = await client.query(
        `INSERT INTO schools (name, slug)
         VALUES ('Lesson integrity probe school', 'lesson-integrity-probe-' || substr(md5(random()::text), 1, 12))
         RETURNING id`
      );
      await assert.rejects(
        () => client.query(
          `INSERT INTO lesson_plans
            (school_id, teacher_id, subject_name, grade, academic_year, term, status, topic)
           VALUES ($1, $2, 'Mathematics', 10, 2026, 1, 'draft', 'Wrong school')`,
          [other.rows[0].id, teacherId]
        ),
        (error) => error.code === '23514'
      );
    } finally {
      await client.query('ROLLBACK');
    }
  });

  it('moves updated_at when a lesson plan changes and rejects another school timetable', async () => {
    await client.query('BEGIN');
    try {
      const teacher = await client.query(
        `SELECT u.id, u.school_id
         FROM users u
         JOIN schools s ON s.id = u.school_id
         ORDER BY u.id
         LIMIT 1`
      );
      const schoolId = teacher.rows[0].school_id;
      const teacherId = teacher.rows[0].id;
      const plan = await client.query(
        `INSERT INTO lesson_plans
          (school_id, teacher_id, subject_name, grade, academic_year, term, status, topic)
         VALUES ($1, $2, 'Mathematics', 10, 2026, 1, 'draft', 'Timestamp probe')
         RETURNING id, updated_at`,
        [schoolId, teacherId]
      );
      await new Promise((resolve) => setTimeout(resolve, 20));
      const updated = await client.query(
        `UPDATE lesson_plans SET topic = 'Timestamp probe revised' WHERE id = $1 RETURNING updated_at`,
        [plan.rows[0].id]
      );
      assert.ok(new Date(updated.rows[0].updated_at).getTime() > new Date(plan.rows[0].updated_at).getTime());

      const other = await client.query(
        `INSERT INTO schools (name, slug)
         VALUES ('Timetable probe school', 'timetable-probe-' || substr(md5(random()::text), 1, 12))
         RETURNING id`
      );
      const timetable = await client.query(
        `INSERT INTO timetables (name, school_id, timetable_data)
         VALUES ('Integrity probe', $1, '{}'::jsonb)
         RETURNING id`,
        [other.rows[0].id]
      );
      await assert.rejects(
        () => client.query(
          'UPDATE lesson_plans SET timetable_id = $2 WHERE id = $1',
          [plan.rows[0].id, timetable.rows[0].id]
        ),
        (error) => error.code === '23514'
      );
    } finally {
      await client.query('ROLLBACK');
    }
  });

  it('rejects a homework id that is not a real homework assignment', async () => {
    await client.query('BEGIN');
    try {
      const teacher = await client.query(
        `SELECT u.id, u.school_id
         FROM users u
         JOIN schools s ON s.id = u.school_id
         ORDER BY u.id
         LIMIT 1`
      );
      const plan = await client.query(
        `INSERT INTO lesson_plans
          (school_id, teacher_id, subject_name, grade, academic_year, term, status, topic)
         VALUES ($1, $2, 'Mathematics', 10, 2026, 1, 'draft', 'Homework probe')
         RETURNING id`,
        [teacher.rows[0].school_id, teacher.rows[0].id]
      );
      await assert.rejects(
        () => client.query(
          `INSERT INTO lesson_assignments (lesson_plan_id, title, homework_assignment_id)
           VALUES ($1, 'Practice', 2147483647)`,
          [plan.rows[0].id]
        ),
        (error) => error.code === '23503' || error.code === '23514'
      );
    } finally {
      await client.query('ROLLBACK');
    }
  });

  it('rolls back the down migration without dropping the lesson tables', async () => {
    await client.query('BEGIN');
    try {
      await client.query(DOWN_SQL);
      const dropped = await client.query(`SELECT to_regclass('public.lesson_plans') AS name`);
      assert.equal(dropped.rows[0].name, null);
    } finally {
      await client.query('ROLLBACK');
    }
    const restored = await client.query(`SELECT to_regclass('public.lesson_plans') AS name`);
    assert.equal(restored.rows[0].name, 'lesson_plans');
    const afterCounts = await counts(client);
    assert.deepEqual(afterCounts, beforeCounts);
  });
});
