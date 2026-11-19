-- Teacher marksheet submissions. Additive. Does not change existing mark rows.

CREATE TABLE IF NOT EXISTS marksheet_submissions (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL,
  academic_year INTEGER NOT NULL,
  grade INTEGER NOT NULL,
  class_name VARCHAR(80) NOT NULL DEFAULT '',
  subject VARCHAR(120) NOT NULL,
  assessment_name VARCHAR(255) NOT NULL,
  term_number INTEGER NOT NULL,
  term_label VARCHAR(40) NOT NULL DEFAULT '',
  teacher_id INTEGER,
  status VARCHAR(20) NOT NULL CHECK (status IN ('submitted', 'reopened')),
  version INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  missing_count INTEGER NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reopen_requested_at TIMESTAMPTZ,
  reopen_request_reason TEXT,
  reopened_at TIMESTAMPTZ,
  reopened_by INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS marksheet_submissions_one_open
  ON marksheet_submissions (school_id, academic_year, grade, class_name, lower(subject), lower(assessment_name), term_number)
  WHERE status = 'submitted';
