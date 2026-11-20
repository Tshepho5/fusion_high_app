-- NOT APPLIED. Do not run this against production until the record review below is approved.
-- This statement removes the silent school 1 default for new timetable rows.
-- It does not update, reassign, or delete existing rows.

ALTER TABLE timetables ALTER COLUMN school_id DROP DEFAULT;

-- Pre-check, run before the statement and keep the output:
-- SELECT COUNT(*) AS timetable_rows FROM timetables;
-- SELECT school_id, COUNT(*) AS rows FROM timetables GROUP BY school_id ORDER BY school_id;
-- SELECT COUNT(*) AS missing_school FROM timetables WHERE school_id IS NULL;
-- SELECT t.id, t.school_id, t.created_by, u.school_id AS creator_school
--   FROM timetables t
--   LEFT JOIN users u ON u.id = t.created_by
--  WHERE t.school_id IS NULL
--     OR u.school_id IS DISTINCT FROM t.school_id;

-- After the statement:
-- SELECT column_default
--   FROM information_schema.columns
--  WHERE table_name = 'timetables' AND column_name = 'school_id';
-- The default must be null. Existing school_id values must be unchanged.
