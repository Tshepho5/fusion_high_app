-- Class-teacher report verification. Additive. Does not change existing report rows.

CREATE TABLE IF NOT EXISTS report_verifications (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL,
  academic_year INTEGER NOT NULL,
  grade INTEGER NOT NULL,
  class_name VARCHAR(80) NOT NULL,
  term_number INTEGER NOT NULL,
  teacher_id INTEGER NOT NULL,
  decision VARCHAR(20) NOT NULL CHECK (decision IN ('approved', 'returned')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS report_verifications_lookup
  ON report_verifications (school_id, grade, term_number, lower(class_name), created_at DESC);
