const fs = require('fs');
const path = require('path');
const db = require('./db');

const SQL_PATH = path.join(__dirname, 'migrations', '20261113_lesson_planning.sql');
const CORRECTION_PATH = path.join(__dirname, 'migrations', '20261113_lesson_planning_corrections.sql');
let schemaReady = false;

async function applyLessonPlanningMigrations(client) {
  const runner = client || db;
  await runner.query(fs.readFileSync(SQL_PATH, 'utf8'));
  await runner.query(fs.readFileSync(CORRECTION_PATH, 'utf8'));
}

async function ensureLessonPlanningSchema() {
  if (schemaReady) return;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await applyLessonPlanningMigrations(client);
    await client.query('COMMIT');
    schemaReady = true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { ensureLessonPlanningSchema, applyLessonPlanningMigrations };
