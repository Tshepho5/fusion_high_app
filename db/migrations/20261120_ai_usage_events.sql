-- NOT APPLIED. Proposal only. Do not run until approved.
-- Stores operational AI usage. It does not store prompts, marks, identity documents, or secrets.
-- Suggested retention: delete rows older than 180 days.

CREATE TABLE IF NOT EXISTS ai_usage_events (
  id BIGSERIAL PRIMARY KEY,
  request_id UUID NOT NULL,
  provider VARCHAR(40) NOT NULL,
  model VARCHAR(80),
  feature VARCHAR(80) NOT NULL,
  school_id INTEGER,
  user_role VARCHAR(40),
  input_tokens INTEGER,
  output_tokens INTEGER,
  duration_ms INTEGER,
  success BOOLEAN NOT NULL,
  error_category VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_usage_events_school_time
  ON ai_usage_events (school_id, created_at DESC);

-- Rollback:
-- DROP TABLE IF EXISTS ai_usage_events;
