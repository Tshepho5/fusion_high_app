-- Authorized subject calculations. Additive. Does not change existing mark rows.

CREATE TABLE IF NOT EXISTS calculation_authorizations (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL,
  academic_year INTEGER NOT NULL,
  grade INTEGER NOT NULL,
  class_name VARCHAR(80) NOT NULL DEFAULT '',
  subject VARCHAR(120) NOT NULL,
  term_number INTEGER NOT NULL,
  policy VARCHAR(40) NOT NULL,
  teacher_id INTEGER,
  status VARCHAR(20) NOT NULL CHECK (status IN ('authorized', 'invalid')),
  result JSONB NOT NULL,
  assessments_included JSONB NOT NULL,
  authorized_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invalid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS calculation_authorizations_lookup
  ON calculation_authorizations (school_id, grade, term_number, lower(subject), status);
