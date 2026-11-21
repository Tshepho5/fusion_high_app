-- =============================================================================
-- GELEZA SA — APPLICATION TRACKING, DOCUMENTATION, APPROVAL & ENROLMENT LIFECYCLE
-- =============================================================================
-- Strictly additive, idempotent, backward-compatible migration.
-- Preserves 100% of existing applications, application_documents,
-- learner_registrations, children, users, and parent_children records.
-- Inserts ZERO synthetic records.
-- =============================================================================

BEGIN;

-- 0. Ensure passwordless activation columns on users and application reference column on children
ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS activation_token_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS activation_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS password_set_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS children
  ADD COLUMN IF NOT EXISTS application_number VARCHAR(60);

-- 1. Additive lifecycle columns on applications
ALTER TABLE IF EXISTS applications
  ADD COLUMN IF NOT EXISTS academic_year INTEGER,
  ADD COLUMN IF NOT EXISTS decision_reason TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by INTEGER,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by INTEGER,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by INTEGER,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmation_email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS decision_email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS applicant_user_id INTEGER,
  ADD COLUMN IF NOT EXISTS parent_user_id INTEGER,
  ADD COLUMN IF NOT EXISTS first_additional_language VARCHAR(80),
  ADD COLUMN IF NOT EXISTS academic_stream_id INTEGER,
  ADD COLUMN IF NOT EXISTS subject_package JSONB;

-- Backfill NULL academic_year safely from created_at (never overwrites non-NULL values)
UPDATE applications
SET academic_year = COALESCE(EXTRACT(YEAR FROM created_at)::int, EXTRACT(YEAR FROM NOW())::int)
WHERE academic_year IS NULL;

-- Widen ONLY pure status CHECK constraints on applications so all canonical lifecycle statuses are accepted
DO $$
DECLARE
  rec RECORD;
BEGIN
  IF to_regclass('public.applications') IS NOT NULL THEN
    FOR rec IN
      SELECT con.conname, pg_get_constraintdef(con.oid) AS condef
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE nsp.nspname = 'public'
        AND rel.relname = 'applications'
        AND con.contype = 'c'
        AND array_length(con.conkey, 1) = 1
        AND pg_get_constraintdef(con.oid) ILIKE '%status%'
        AND pg_get_constraintdef(con.oid) NOT ILIKE '%fee_status%'
        AND pg_get_constraintdef(con.oid) NOT ILIKE '%ai_verification_status%'
    LOOP
      EXECUTE format('ALTER TABLE applications DROP CONSTRAINT %I', rec.conname);
    END LOOP;

    ALTER TABLE applications
      ADD CONSTRAINT applications_status_lifecycle_check CHECK (
        status IN (
          'draft',
          'pending',
          'pending_payment',
          'awaiting_review',
          'submitted',
          'under_ai_review',
          'under_review',
          'action_required',
          'documents_requested',
          'documents_submitted',
          'documents_under_review',
          'waitlisted',
          'accepted',
          'approved',
          'declined',
          'rejected',
          'enrollment_pending',
          'registered',
          'enrolled',
          'withdrawn',
          'cancelled'
        )
      ) NOT VALID;

    IF NOT EXISTS (
      SELECT 1 FROM applications
      WHERE status IS NOT NULL AND status NOT IN (
        'draft', 'pending', 'pending_payment', 'awaiting_review', 'submitted',
        'under_ai_review', 'under_review', 'action_required', 'documents_requested',
        'documents_submitted', 'documents_under_review', 'waitlisted',
        'accepted', 'approved', 'declined', 'rejected',
        'enrollment_pending', 'registered', 'enrolled', 'withdrawn', 'cancelled'
      )
    ) THEN
      ALTER TABLE applications VALIDATE CONSTRAINT applications_status_lifecycle_check;
    END IF;
  END IF;
END $$;

-- Guard against duplicate provisional_learner_number values at the DB level (only if no legacy duplicates conflict)
DO $$
DECLARE
  dup_count INTEGER := 0;
BEGIN
  IF to_regclass('public.applications') IS NOT NULL THEN
    SELECT COUNT(*) INTO dup_count
    FROM (
      SELECT provisional_learner_number
      FROM applications
      WHERE provisional_learner_number IS NOT NULL AND TRIM(provisional_learner_number) <> ''
      GROUP BY provisional_learner_number
      HAVING COUNT(*) > 1
    ) d;

    IF dup_count = 0 THEN
      EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS uniq_applications_provisional_learner_number ON applications (provisional_learner_number) WHERE provisional_learner_number IS NOT NULL AND TRIM(provisional_learner_number) <> ''''';
    END IF;
  END IF;
END $$;

-- 2. Additive review & request linkage columns on application_documents
ALTER TABLE IF EXISTS application_documents
  ADD COLUMN IF NOT EXISTS request_id INTEGER,
  ADD COLUMN IF NOT EXISTS uploaded_by INTEGER,
  ADD COLUMN IF NOT EXISTS review_status VARCHAR(30) NOT NULL DEFAULT 'submitted',
  ADD COLUMN IF NOT EXISTS reviewed_by INTEGER,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- 3. Additive learner_number & registration_email_sent_at columns on learner_registrations
ALTER TABLE IF EXISTS learner_registrations
  ADD COLUMN IF NOT EXISTS learner_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS registration_email_sent_at TIMESTAMPTZ;

-- 4. Structured Documentation Requests Table
CREATE TABLE IF NOT EXISTS application_document_requests (
  id SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  school_id INTEGER NOT NULL,
  requested_by INTEGER NOT NULL,
  required_documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  descriptions TEXT,
  instructions TEXT,
  deadline TIMESTAMPTZ,
  status VARCHAR(30) NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'submitted', 'under_review', 'approved', 'rejected', 'cancelled')),
  fulfilled_at TIMESTAMPTZ,
  reviewed_by INTEGER,
  reviewed_at TIMESTAMPTZ,
  review_outcome VARCHAR(30),
  review_notes TEXT,
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_doc_requests_app
  ON application_document_requests (application_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_doc_requests_school_status
  ON application_document_requests (school_id, status);

-- 5. Authoritative Application Status & Review History Timeline Table
CREATE TABLE IF NOT EXISTS application_status_history (
  id SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  school_id INTEGER NOT NULL,
  from_status VARCHAR(40),
  to_status VARCHAR(40) NOT NULL,
  actor_id INTEGER,
  actor_role VARCHAR(40),
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_status_history_app
  ON application_status_history (application_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_app_status_history_school
  ON application_status_history (school_id, created_at DESC);

-- 6. Reliable, Idempotent Application Email Dispatch Log (NEVER stores passwords or tokens)
CREATE TABLE IF NOT EXISTS application_email_log (
  id SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  school_id INTEGER NOT NULL,
  event_type VARCHAR(60) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  idempotency_key VARCHAR(160) UNIQUE NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  error_message TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_email_log_app
  ON application_email_log (application_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_applications_school_status
  ON applications (school_id, status);
CREATE INDEX IF NOT EXISTS idx_applications_parent_user
  ON applications (parent_user_id)
  WHERE parent_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_applications_applicant_user
  ON applications (applicant_user_id)
  WHERE applicant_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_app_docs_app_request
  ON application_documents (application_id, request_id);

COMMIT;
