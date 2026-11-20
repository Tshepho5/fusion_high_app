-- Integrated School Admission, Acceptance, Learner Registration,
-- Class Allocation, Subject Distribution & Controlled Deregistration
-- Strictly additive & idempotent migration.

ALTER TABLE IF EXISTS children
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS learner_registrations (
  id SERIAL PRIMARY KEY,
  application_id INTEGER UNIQUE NOT NULL,
  school_id INTEGER NOT NULL,
  child_id INTEGER,
  learner_user_id INTEGER,
  parent_user_id INTEGER,
  academic_year INTEGER NOT NULL,
  grade INTEGER NOT NULL,
  class_id INTEGER,
  class_teacher_id INTEGER,
  academic_stream_id INTEGER,
  stream_name VARCHAR(120),
  home_language VARCHAR(100),
  first_additional_language VARCHAR(100),
  selected_subjects TEXT[] DEFAULT '{}',
  status VARCHAR(50) NOT NULL DEFAULT 'awaiting_registration',
  acceptance_letter_reference VARCHAR(80),
  acceptance_letter_issued_at TIMESTAMPTZ,
  acceptance_email_sent_at TIMESTAMPTZ,
  terms_version VARCHAR(40),
  terms_accepted BOOLEAN DEFAULT FALSE,
  terms_accepted_by INTEGER,
  terms_accepted_at TIMESTAMPTZ,
  completed_by INTEGER,
  completed_at TIMESTAMPTZ,
  class_teacher_notified_at TIMESTAMPTZ,
  subject_teachers_notified_at TIMESTAMPTZ,
  subject_teachers_notified_ids INTEGER[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learner_registrations_school_status
  ON learner_registrations (school_id, status);
CREATE INDEX IF NOT EXISTS idx_learner_registrations_parent
  ON learner_registrations (parent_user_id);
CREATE INDEX IF NOT EXISTS idx_learner_registrations_learner
  ON learner_registrations (learner_user_id);
CREATE INDEX IF NOT EXISTS idx_learner_registrations_child
  ON learner_registrations (child_id);

-- Enforce single active school registration per learner per academic year
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_learner_registration_per_year
  ON learner_registrations (child_id, academic_year)
  WHERE child_id IS NOT NULL AND status IN ('completed', 'deregistration_requested');

-- Enforce single active learner enrolment across all schools per academic year (if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'learner_enrolments'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_learner_enrolment_per_year ON learner_enrolments (child_id, academic_year) WHERE status = ''active''';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS learner_registration_consents (
  id SERIAL PRIMARY KEY,
  registration_id INTEGER NOT NULL REFERENCES learner_registrations(id) ON DELETE CASCADE,
  application_id INTEGER,
  school_id INTEGER NOT NULL,
  child_id INTEGER,
  accepted_by_user_id INTEGER NOT NULL,
  accepted_by_role VARCHAR(50),
  terms_version VARCHAR(40) NOT NULL,
  terms_summary TEXT,
  consent_context VARCHAR(80) NOT NULL DEFAULT 'dashboard_learner_registration',
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learner_reg_consents_reg
  ON learner_registration_consents (registration_id);
CREATE INDEX IF NOT EXISTS idx_learner_reg_consents_school
  ON learner_registration_consents (school_id);

CREATE TABLE IF NOT EXISTS learner_deregistration_requests (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL,
  child_id INTEGER NOT NULL,
  learner_user_id INTEGER,
  registration_id INTEGER,
  enrolment_id INTEGER,
  academic_year INTEGER NOT NULL,
  request_type VARCHAR(30) NOT NULL DEFAULT 'deregistration',
  reason TEXT NOT NULL,
  target_school_name VARCHAR(255),
  requested_by_user_id INTEGER NOT NULL,
  requested_by_role VARCHAR(50) NOT NULL,
  parent_confirmed_by INTEGER,
  parent_confirmed_at TIMESTAMPTZ,
  assigned_class_id INTEGER,
  assigned_class_teacher_id INTEGER,
  status VARCHAR(50) NOT NULL DEFAULT 'pending_teacher_review',
  teacher_reviewed_by INTEGER,
  teacher_reviewed_at TIMESTAMPTZ,
  teacher_notes TEXT,
  admin_decided_by INTEGER,
  admin_decided_at TIMESTAMPTZ,
  admin_decision_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dereg_requests_school_status
  ON learner_deregistration_requests (school_id, status);
CREATE INDEX IF NOT EXISTS idx_dereg_requests_child
  ON learner_deregistration_requests (child_id);
CREATE INDEX IF NOT EXISTS idx_dereg_requests_teacher
  ON learner_deregistration_requests (assigned_class_teacher_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_open_deregistration_request
  ON learner_deregistration_requests (school_id, child_id)
  WHERE status IN ('pending_teacher_review', 'pending_admin_approval');
