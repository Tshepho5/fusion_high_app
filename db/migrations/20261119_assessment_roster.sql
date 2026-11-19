-- Additive assessment roster. Safe to run more than once.
-- Does not change existing assessment or mark rows.

ALTER TABLE assessments ADD COLUMN IF NOT EXISTS school_id INTEGER;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS academic_year INTEGER;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS term VARCHAR(40);
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS category VARCHAR(80);
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS weight NUMERIC(6, 2);
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS assessment_date DATE;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS opened_by INTEGER;

CREATE TABLE IF NOT EXISTS assessment_rosters (
  id SERIAL PRIMARY KEY,
  assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (assessment_id, child_id)
);

CREATE INDEX IF NOT EXISTS assessment_rosters_child ON assessment_rosters (child_id);
