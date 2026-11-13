/**
 * Database round-trip for lesson planning.
 * Inserts inside a transaction and rolls back, so no lesson rows are kept.
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

require('dotenv').config();
const db = require('../db/db');
const { ensureLessonPlanningSchema } = require('../db/migrate_lesson_planning');

describe('lesson planning database', () => {
  let client;

  before(async () => {
    await ensureLessonPlanningSchema();
    client = await db.pool.connect();
  });

  after(async () => {
    if (client) client.release();
    await db.pool.end();
  });

  it('saves and reads a plan inside one school, then rolls the row back', async () => {
    await client.query('BEGIN');
    try {
      const teacher = await client.query(
        `SELECT u.id, u.school_id
         FROM users u
         JOIN schools s ON s.id = u.school_id
         ORDER BY u.id
         LIMIT 1`
      );
      assert.ok(teacher.rows.length > 0, 'a user linked to an existing school is required');
      const schoolId = teacher.rows[0].school_id;
      const plan = await client.query(
        `INSERT INTO lesson_plans
          (school_id, teacher_id, subject_name, grade, academic_year, term, status, topic)
         VALUES ($1, $2, 'Mathematics', 10, 2026, 1, 'draft', 'Rollback probe')
         RETURNING id`,
        [schoolId, teacher.rows[0].id]
      );
      await client.query(
        'INSERT INTO lesson_objectives (lesson_plan_id, objective, display_order) VALUES ($1, $2, 0)',
        [plan.rows[0].id, 'State a definition.']
      );
      const read = await client.query(
        'SELECT objective FROM lesson_objectives WHERE lesson_plan_id = $1',
        [plan.rows[0].id]
      );
      assert.equal(read.rows[0].objective, 'State a definition.');
      const hidden = await client.query(
        'SELECT id FROM lesson_plans WHERE id = $1 AND school_id = $2',
        [plan.rows[0].id, Number(schoolId) + 999999]
      );
      assert.equal(hidden.rows.length, 0);
      await client.query('ROLLBACK');
      const leftover = await client.query(
        "SELECT id FROM lesson_plans WHERE topic = 'Rollback probe'"
      );
      assert.equal(leftover.rows.length, 0);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  });
});
