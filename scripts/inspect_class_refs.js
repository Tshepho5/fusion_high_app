const db = require('../db/db');
(async () => {
  const r = await db.query(`
    SELECT table_name, column_name, data_type FROM information_schema.columns
    WHERE table_schema='public' AND (column_name IN ('class_id','class_name','grade_level') OR (column_name='grade' AND table_name IN ('classes','teacher_timetable','homework_assignments','marks','timetables')))
    ORDER BY table_name`);
  console.log(r.rows);
  const fk = await db.query(`
    SELECT tc.table_name, kcu.column_name, tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type='FOREIGN KEY' AND ccu.table_name='classes'`);
  console.log('FKs ->classes', fk.rows);
  const idx = await db.query(`SELECT indexname, indexdef FROM pg_indexes WHERE tablename IN ('classes','teacher_assignments')`);
  console.log(idx.rows);
  process.exit(0);
})();
