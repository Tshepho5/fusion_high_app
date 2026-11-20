-- NOT APPLIED. Do not run this against production until an authorised person approves it after a backup.
-- This is the same school subject structure already defined in public/src/services/academicStreamService.js.
-- It does not insert subjects, streams, classes, or learners.
-- Timetable generation reads these tables. It does not create them.

CREATE TABLE IF NOT EXISTS school_subject_offerings (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year INTEGER NOT NULL,
  grade INTEGER NOT NULL CHECK (grade BETWEEN 10 AND 12),
  subject_name VARCHAR(80) NOT NULL,
  category VARCHAR(20) NOT NULL CHECK (category IN ('language', 'mathematics', 'elective')),
  language_level VARCHAR(40) NOT NULL DEFAULT '',
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS school_subject_offerings_unique
  ON school_subject_offerings (school_id, academic_year, grade, subject_name, language_level);

CREATE TABLE IF NOT EXISTS academic_streams (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year INTEGER NOT NULL,
  grade INTEGER NOT NULL CHECK (grade BETWEEN 10 AND 12),
  name VARCHAR(80) NOT NULL,
  mathematics_option VARCHAR(40) NOT NULL,
  electives TEXT[] NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_by INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rollback, only after approval and only if these tables are still empty:
-- DROP TABLE IF EXISTS academic_streams;
-- DROP TABLE IF EXISTS school_subject_offerings;
