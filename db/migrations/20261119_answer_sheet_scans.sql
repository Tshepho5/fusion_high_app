-- Human-assisted answer-sheet register. Safe to run more than once.
-- A row records the sheet fingerprint and the teacher's reading.
-- It does not create learners and it does not become an official mark until confirmed.

CREATE TABLE IF NOT EXISTS answer_sheet_scans (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL,
  assessment_id INTEGER NOT NULL,
  child_id INTEGER,
  learner_number VARCHAR(80),
  document_hash VARCHAR(64) NOT NULL,
  original_filename TEXT,
  stated_mark NUMERIC(8, 2),
  maximum NUMERIC(8, 2) NOT NULL,
  confidence VARCHAR(30) NOT NULL DEFAULT 'unrecognized',
  status VARCHAR(30) NOT NULL,
  reason TEXT,
  confirmed_mark NUMERIC(8, 2),
  confirmed_by INTEGER,
  confirmed_at TIMESTAMPTZ,
  stored_path TEXT,
  created_by INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE answer_sheet_scans ADD COLUMN IF NOT EXISTS stored_path TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS answer_sheet_scans_one_hash
  ON answer_sheet_scans (assessment_id, document_hash)
  WHERE status <> 'rejected';

CREATE INDEX IF NOT EXISTS answer_sheet_scans_assessment
  ON answer_sheet_scans (assessment_id, created_at DESC);
