-- Applied only to geleza_phase_g2. Do not run this against FUSION_DB.
-- Extends the existing school subject and stream tables from grades 10-12 to grades 8-12.
-- A blank stream_name means the offering applies to the grade. A named stream is that stream's own requirement.
-- This statement does not insert subjects.

DO $$
DECLARE constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'school_subject_offerings'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%grade%'
  LOOP
    EXECUTE format('ALTER TABLE school_subject_offerings DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END $$;

ALTER TABLE school_subject_offerings
  ADD CONSTRAINT school_subject_offerings_grade_range CHECK (grade BETWEEN 8 AND 12);

ALTER TABLE school_subject_offerings
  ADD COLUMN IF NOT EXISTS stream_name VARCHAR(80) NOT NULL DEFAULT '';

DROP INDEX IF EXISTS school_subject_offerings_unique;
CREATE UNIQUE INDEX school_subject_offerings_unique
  ON school_subject_offerings (school_id, academic_year, grade, stream_name, subject_name, language_level);

DO $$
DECLARE constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'academic_streams'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%grade%'
  LOOP
    EXECUTE format('ALTER TABLE academic_streams DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END $$;

ALTER TABLE academic_streams
  ADD CONSTRAINT academic_streams_grade_range CHECK (grade BETWEEN 8 AND 12);

-- Rollback, only on geleza_phase_g2 and only when no grades 8 or 9 rows exist:
-- DELETE is not part of this rollback.
-- ALTER TABLE school_subject_offerings DROP CONSTRAINT school_subject_offerings_grade_range;
-- ALTER TABLE school_subject_offerings ADD CONSTRAINT school_subject_offerings_grade_range CHECK (grade BETWEEN 10 AND 12);
-- ALTER TABLE academic_streams DROP CONSTRAINT academic_streams_grade_range;
-- ALTER TABLE academic_streams ADD CONSTRAINT academic_streams_grade_range CHECK (grade BETWEEN 10 AND 12);
-- DROP INDEX school_subject_offerings_unique;
-- CREATE UNIQUE INDEX school_subject_offerings_unique
--   ON school_subject_offerings (school_id, academic_year, grade, subject_name, language_level);
