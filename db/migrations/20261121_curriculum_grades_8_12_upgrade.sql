-- Production-compatible additive migration for Geleza SA Grades 8-12 curriculum,
-- subject offerings, academic streams, and application subject-package columns.
--
-- IMPORTANT:
-- 1. Take a full PostgreSQL backup before running against production.
-- 2. Preserves 100% of existing school_subject_offerings, academic_streams,
--    schools, applications, and children records.
-- 3. Inserts ZERO synthetic schools, subjects, languages, or streams.
-- 4. Checks for duplicate/conflicting rows BEFORE creating unique indexes.
--    If duplicates exist, aborts cleanly and reports the exact conflicting IDs
--    without deleting or mutating any data.
-- 5. Safe to run repeatedly (idempotent).

BEGIN;

-- 1. Create curriculum tables if missing on a fresh database
CREATE TABLE IF NOT EXISTS school_subject_offerings (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year INTEGER NOT NULL,
  grade INTEGER NOT NULL CHECK (grade BETWEEN 8 AND 12),
  subject_name VARCHAR(80) NOT NULL,
  category VARCHAR(20) NOT NULL CHECK (category IN ('language', 'mathematics', 'elective')),
  language_level VARCHAR(40) NOT NULL DEFAULT '',
  stream_name VARCHAR(80) NOT NULL DEFAULT '',
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Safely upgrade an existing legacy (Grades 10-12, no stream_name) school_subject_offerings table
ALTER TABLE school_subject_offerings
  ADD COLUMN IF NOT EXISTS stream_name VARCHAR(80) NOT NULL DEFAULT '';
ALTER TABLE school_subject_offerings
  ADD COLUMN IF NOT EXISTS language_level VARCHAR(40) NOT NULL DEFAULT '';
ALTER TABLE school_subject_offerings
  ADD COLUMN IF NOT EXISTS is_required BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE school_subject_offerings
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Widen ONLY grade-related CHECK constraints on school_subject_offerings (preserve category & other constraints;
-- abort safely if any matched CHECK constraint also references a non-grade column)
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT con.conname, pg_get_constraintdef(con.oid) AS condef
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'school_subject_offerings'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%grade%'
  LOOP
    IF rec.condef ~* '\m(category|status|subject_name|stream_name|language_level|is_required|is_active|school_id|academic_year)\M' THEN
      RAISE EXCEPTION
        'MIGRATION ABORTED: Refusing to drop mixed CHECK constraint % on school_subject_offerings: %',
        rec.conname, rec.condef;
    END IF;
    EXECUTE format('ALTER TABLE school_subject_offerings DROP CONSTRAINT %I', rec.conname);
  END LOOP;
END $$;

ALTER TABLE school_subject_offerings
  ADD CONSTRAINT school_subject_offerings_grade_range CHECK (grade BETWEEN 8 AND 12);

-- Pre-flight duplicate check BEFORE replacing school_subject_offerings_unique (NEVER auto-deletes)
DO $$
DECLARE
  conflict_report TEXT;
BEGIN
  SELECT string_agg(
    format(
      '(school_id=%s, year=%s, grade=%s, stream=%L, subject=%L, level=%L, ids=%s)',
      school_id, academic_year, grade, stream_name, subject_name, language_level, ids
    ),
    '; '
  )
  INTO conflict_report
  FROM (
    SELECT school_id,
           academic_year,
           grade,
           stream_name,
           subject_name,
           language_level,
           array_agg(id ORDER BY id) AS ids
    FROM school_subject_offerings
    GROUP BY school_id, academic_year, grade, stream_name, subject_name, language_level
    HAVING COUNT(*) > 1
  ) dupes;

  IF conflict_report IS NOT NULL THEN
    RAISE EXCEPTION
      'MIGRATION ABORTED: Duplicate rows detected in school_subject_offerings. Resolve manually before retrying: %',
      conflict_report;
  END IF;
END $$;

-- Replace legacy unique index (without stream_name) with Grades 8-12 unique index (with stream_name)
DROP INDEX IF EXISTS school_subject_offerings_unique;
CREATE UNIQUE INDEX school_subject_offerings_unique
  ON school_subject_offerings (school_id, academic_year, grade, stream_name, subject_name, language_level);

CREATE INDEX IF NOT EXISTS school_subject_offerings_lookup
  ON school_subject_offerings (school_id, academic_year, grade, is_active);

-- 3. Create / upgrade academic_streams table
CREATE TABLE IF NOT EXISTS academic_streams (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year INTEGER NOT NULL,
  grade INTEGER NOT NULL CHECK (grade BETWEEN 8 AND 12),
  name VARCHAR(80) NOT NULL,
  mathematics_option VARCHAR(40) NOT NULL,
  electives TEXT[] NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_by INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Widen ONLY grade-related CHECK constraints on academic_streams (preserve status & other constraints;
-- abort safely if any matched CHECK constraint also references a non-grade column)
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT con.conname, pg_get_constraintdef(con.oid) AS condef
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'academic_streams'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%grade%'
  LOOP
    IF rec.condef ~* '\m(status|name|mathematics_option|electives|school_id|academic_year)\M' THEN
      RAISE EXCEPTION
        'MIGRATION ABORTED: Refusing to drop mixed CHECK constraint % on academic_streams: %',
        rec.conname, rec.condef;
    END IF;
    EXECUTE format('ALTER TABLE academic_streams DROP CONSTRAINT %I', rec.conname);
  END LOOP;
END $$;

ALTER TABLE academic_streams
  ADD CONSTRAINT academic_streams_grade_range CHECK (grade BETWEEN 8 AND 12);

-- Pre-flight duplicate check BEFORE creating academic_streams_active_name (NEVER auto-deletes)
DO $$
DECLARE
  stream_conflicts TEXT;
BEGIN
  SELECT string_agg(
    format(
      '(school_id=%s, year=%s, grade=%s, name=%L, ids=%s)',
      school_id, academic_year, grade, lower_name, ids
    ),
    '; '
  )
  INTO stream_conflicts
  FROM (
    SELECT school_id,
           academic_year,
           grade,
           LOWER(name) AS lower_name,
           array_agg(id ORDER BY id) AS ids
    FROM academic_streams
    WHERE status <> 'archived'
    GROUP BY school_id, academic_year, grade, LOWER(name)
    HAVING COUNT(*) > 1
  ) dupes;

  IF stream_conflicts IS NOT NULL THEN
    RAISE EXCEPTION
      'MIGRATION ABORTED: Duplicate non-archived streams detected in academic_streams. Resolve manually before retrying: %',
      stream_conflicts;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS academic_streams_active_name
  ON academic_streams (school_id, academic_year, grade, LOWER(name))
  WHERE status <> 'archived';

CREATE INDEX IF NOT EXISTS academic_streams_lookup
  ON academic_streams (school_id, academic_year, grade, status);

-- 4. Create subject_change_approvals table if missing
CREATE TABLE IF NOT EXISTS subject_change_approvals (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  id_number VARCHAR(20) NOT NULL,
  academic_year INTEGER NOT NULL,
  grade INTEGER NOT NULL,
  academic_stream_id INTEGER REFERENCES academic_streams(id) ON DELETE CASCADE,
  approved_by INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Additive columns on applications (only when applications table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'applications'
  ) THEN
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS first_additional_language VARCHAR(80);
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS academic_stream_id INTEGER;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS subject_package JSONB;
  END IF;
END $$;

COMMIT;
