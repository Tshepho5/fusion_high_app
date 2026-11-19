-- Additive only. Safe to run more than once.
-- Adds the academic year on marks, the year-end enrolment tables, and the document register.
-- Does not delete rows and does not change a learner's current grade.

ALTER TABLE marks ADD COLUMN IF NOT EXISTS academic_year INTEGER;

UPDATE marks
SET academic_year = SUBSTRING(term::text FROM '(20[0-9]{2})')::INTEGER
WHERE academic_year IS NULL
  AND term::text ~ '20[0-9]{2}';

CREATE INDEX IF NOT EXISTS idx_marks_child_year_term ON marks (child_id, academic_year, term);

CREATE TABLE IF NOT EXISTS learner_enrolments (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL,
  child_id INTEGER NOT NULL,
  academic_year INTEGER NOT NULL,
  grade INTEGER NOT NULL,
  class_id INTEGER,
  status VARCHAR(30) NOT NULL,
  source VARCHAR(30) NOT NULL DEFAULT 'progression',
  created_by INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (school_id, child_id, academic_year)
);

CREATE TABLE IF NOT EXISTS progression_decisions (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL,
  child_id INTEGER NOT NULL,
  from_year INTEGER NOT NULL,
  decision VARCHAR(20) NOT NULL,
  reason TEXT,
  results_complete BOOLEAN NOT NULL DEFAULT FALSE,
  decided_by INTEGER NOT NULL,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  enrolment_id INTEGER,
  UNIQUE (school_id, child_id, from_year)
);

CREATE TABLE IF NOT EXISTS stored_files (
  id SERIAL PRIMARY KEY,
  school_id INTEGER,
  category VARCHAR(40) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type VARCHAR(120),
  size_bytes INTEGER,
  checksum VARCHAR(64),
  uploaded_by INTEGER,
  academic_year INTEGER,
  child_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stored_files_school ON stored_files (school_id, category);

CREATE TABLE IF NOT EXISTS report_card_versions (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL,
  child_id INTEGER NOT NULL,
  academic_year INTEGER NOT NULL,
  term INTEGER NOT NULL,
  grade INTEGER,
  class_name VARCHAR(80),
  snapshot JSONB NOT NULL,
  reason TEXT,
  created_by INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
