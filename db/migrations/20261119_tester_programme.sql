-- Additive tester-programme safeguards.
-- Does not delete schools, users, learners, or applications.
-- The dedicated test school is created by the tester service on first use, not by this file.

ALTER TABLE schools ADD COLUMN IF NOT EXISTS is_test_school BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_tester BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS active_session_id TEXT;
ALTER TABLE children ADD COLUMN IF NOT EXISTS is_test_record BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS school_id INTEGER;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS school_id INTEGER;

CREATE TABLE IF NOT EXISTS tester_invitations (
  id SERIAL PRIMARY KEY,
  reference_code VARCHAR(24) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  surname VARCHAR(255) NOT NULL DEFAULT '',
  phone VARCHAR(30),
  role_name VARCHAR(20) NOT NULL,
  school_id INTEGER NOT NULL,
  user_id INTEGER,
  token_hash VARCHAR(64),
  expires_at TIMESTAMPTZ,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  delivery_status VARCHAR(20) NOT NULL DEFAULT 'not_sent',
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  invited_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tester_reports (
  id SERIAL PRIMARY KEY,
  reference_code VARCHAR(24) UNIQUE NOT NULL,
  tester_user_id INTEGER NOT NULL,
  invitation_id INTEGER,
  role_name VARCHAR(20) NOT NULL,
  dashboard VARCHAR(80) NOT NULL,
  module VARCHAR(120) NOT NULL,
  kind VARCHAR(20) NOT NULL,
  result VARCHAR(30),
  severity VARCHAR(20),
  status VARCHAR(40) NOT NULL DEFAULT 'open',
  description TEXT NOT NULL,
  steps_to_reproduce TEXT,
  expected_behaviour TEXT,
  actual_behaviour TEXT,
  screenshot_data TEXT,
  admin_note TEXT,
  updated_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS tester_invitations_one_open_email
  ON tester_invitations (LOWER(email))
  WHERE status IN ('draft', 'pending', 'accepted', 'activated');
CREATE INDEX IF NOT EXISTS idx_tester_invitations_email ON tester_invitations (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_tester_invitations_status ON tester_invitations (status, role_name);
CREATE INDEX IF NOT EXISTS idx_tester_reports_filters ON tester_reports (role_name, dashboard, status, created_at DESC);
