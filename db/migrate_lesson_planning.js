const fs = require('fs');
const path = require('path');
const db = require('./db');

const SQL_PATH = path.join(__dirname, 'migrations', '20261113_lesson_planning.sql');
let schemaReady = false;

async function ensureLessonPlanningSchema() {
  if (schemaReady) return;
  const sql = fs.readFileSync(SQL_PATH, 'utf8');
  await db.query(sql);
  await db.query(`
    DO $$ BEGIN
      ALTER TABLE lesson_assignments
        ADD CONSTRAINT lesson_assignments_homework_fk
        FOREIGN KEY (homework_assignment_id) REFERENCES homework_assignments(id) ON DELETE SET NULL;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
      WHEN undefined_table THEN NULL;
    END $$;
  `).catch(() => {});
  schemaReady = true;
}

module.exports = { ensureLessonPlanningSchema };
