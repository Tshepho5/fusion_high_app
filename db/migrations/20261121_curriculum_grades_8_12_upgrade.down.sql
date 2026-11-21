-- Controlled non-destructive rollback for 20261121_curriculum_grades_8_12_upgrade.sql
--
-- HONEST LIMITATIONS:
-- 1. This script NEVER deletes rows. If Grade 8 or Grade 9 offerings/streams or
--    named-stream offering rows have already been saved after deployment, narrowing
--    the constraints back to Grades 10-12 or dropping stream_name is IRREVERSIBLE
--    without data loss; this script intentionally ABORTS and you must restore from
--    the pre-migration backup snapshot instead.
-- 2. Additive columns added to `applications` (`first_additional_language`,
--    `academic_stream_id`, `subject_package`) and `school_subject_offerings.stream_name`
--    are intentionally preserved to avoid destructive data loss on historical records.

BEGIN;

DO $$
DECLARE
  g89_offerings INTEGER := 0;
  g89_streams INTEGER := 0;
  named_stream_offerings INTEGER := 0;
BEGIN
  SELECT COUNT(*) INTO g89_offerings
  FROM school_subject_offerings
  WHERE grade IN (8, 9);

  SELECT COUNT(*) INTO g89_streams
  FROM academic_streams
  WHERE grade IN (8, 9);

  SELECT COUNT(*) INTO named_stream_offerings
  FROM school_subject_offerings
  WHERE COALESCE(stream_name, '') <> '';

  IF g89_offerings > 0 OR g89_streams > 0 OR named_stream_offerings > 0 THEN
    RAISE EXCEPTION
      'ROLLBACK REFUSED (NON-DESTRUCTIVE GUARD): Found % Grade 8-9 offering(s), % Grade 8-9 stream(s), and % stream-scoped offering(s). Restoring Grades 10-12 constraints would violate or lose data. Restore from the pre-migration backup snapshot instead.',
      g89_offerings, g89_streams, named_stream_offerings;
  END IF;
END $$;

ALTER TABLE school_subject_offerings
  DROP CONSTRAINT IF EXISTS school_subject_offerings_grade_range;
ALTER TABLE school_subject_offerings
  ADD CONSTRAINT school_subject_offerings_grade_range CHECK (grade BETWEEN 10 AND 12);

ALTER TABLE academic_streams
  DROP CONSTRAINT IF EXISTS academic_streams_grade_range;
ALTER TABLE academic_streams
  ADD CONSTRAINT academic_streams_grade_range CHECK (grade BETWEEN 10 AND 12);

DROP INDEX IF EXISTS school_subject_offerings_unique;
CREATE UNIQUE INDEX school_subject_offerings_unique
  ON school_subject_offerings (school_id, academic_year, grade, subject_name, language_level);

COMMIT;
