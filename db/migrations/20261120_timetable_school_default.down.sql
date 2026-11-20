-- Rollback for 20261120_timetable_school_default.sql.
-- Restores the previous default. It does not rewrite existing school_id values.

ALTER TABLE timetables ALTER COLUMN school_id SET DEFAULT 1;
