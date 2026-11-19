-- Report correction details and a copy of the report before a return.
-- Safe to run more than once. Does not change marks.

ALTER TABLE report_verifications ADD COLUMN IF NOT EXISTS learner_id INTEGER;
ALTER TABLE report_verifications ADD COLUMN IF NOT EXISTS subject VARCHAR(120);
ALTER TABLE report_verifications ADD COLUMN IF NOT EXISTS routed_teacher_id INTEGER;

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
