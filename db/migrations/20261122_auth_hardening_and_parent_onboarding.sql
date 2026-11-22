-- =============================================================================
-- GELEZA SA — AUTHENTICATION HARDENING, PARENT ONBOARDING & LEARNER ACTIVATION
-- =============================================================================
-- Phase M2.1 Additive, Idempotent, Backward-Compatible Migration.
-- Preserves 100% of existing users, passwords, children, applications,
-- learner_registrations, learner_enrolments, and curriculum records.
-- NEVER fabricates email_verified_at timestamps for legacy accounts.
-- NEVER automatically deletes, merges, or renumbers conflicting rows.
-- =============================================================================

BEGIN;

-- 1. Ensure prerequisite activation columns and additive auth hardening columns on users
ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS active_session_id TEXT,
  ADD COLUMN IF NOT EXISTS activation_token_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS activation_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS password_set_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_verification_status VARCHAR(32),
  ADD COLUMN IF NOT EXISTS activation_purpose VARCHAR(50),
  ADD COLUMN IF NOT EXISTS reset_code_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS reset_attempts INTEGER NOT NULL DEFAULT 0;

-- 2. Apply exact Legacy Email Verification Policy ONLY to unclassified rows (idempotent)
--    - password_hash IS NOT NULL AND password_set_at IS NOT NULL -> 'verified', email_verified_at = COALESCE(email_verified_at, password_set_at)
--    - password_hash IS NOT NULL AND password_set_at IS NULL     -> 'legacy_unverified', email_verified_at stays NULL (NEVER fabricated)
--    - password_hash IS NULL                                     -> 'pending_verification', email_verified_at stays NULL
UPDATE users
SET email_verification_status = 'verified',
    email_verified_at = COALESCE(email_verified_at, password_set_at)
WHERE email_verification_status IS NULL
  AND password_hash IS NOT NULL
  AND password_set_at IS NOT NULL;

UPDATE users
SET email_verification_status = 'legacy_unverified'
WHERE email_verification_status IS NULL
  AND password_hash IS NOT NULL
  AND password_set_at IS NULL;

UPDATE users
SET email_verification_status = 'pending_verification'
WHERE email_verification_status IS NULL
  AND password_hash IS NULL;

ALTER TABLE IF EXISTS users
  ALTER COLUMN email_verification_status SET DEFAULT 'legacy_unverified';

DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM users WHERE email_verification_status IS NULL) THEN
      ALTER TABLE users ALTER COLUMN email_verification_status SET NOT NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'users_email_verification_status_check'
        AND conrelid = 'public.users'::regclass
    ) THEN
      ALTER TABLE users
        ADD CONSTRAINT users_email_verification_status_check
        CHECK (email_verification_status IN ('verified', 'pending_verification', 'legacy_unverified'));
    END IF;
  END IF;
END $$;

-- 3. Purpose-specific, single-use, hashed Account Action Tokens table
--    Prevents token collision across email verification, Parent activation,
--    Learner email activation, Learner Parent-handoff, and Learner reset handoff.
CREATE TABLE IF NOT EXISTS account_action_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose VARCHAR(50) NOT NULL CHECK (
    purpose IN (
      'parent_email_verify',
      'parent_activation',
      'learner_email_activation',
      'learner_parent_handoff',
      'learner_password_reset_handoff',
      'principal_activation',
      'legacy_parent_activation'
    )
  ),
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
  child_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
  school_id INTEGER REFERENCES schools(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  consumed_by_ip VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_account_action_tokens_user_purpose
  ON account_action_tokens (user_id, purpose, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_account_action_tokens_active_hash
  ON account_action_tokens (token_hash)
  WHERE consumed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_account_action_tokens_application
  ON account_action_tokens (application_id)
  WHERE application_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_account_action_tokens_child
  ON account_action_tokens (child_id)
  WHERE child_id IS NOT NULL;

-- 4. Guarded Unique Indexes (created ONLY when zero conflicting duplicates exist;
--    never deletes, merges, or renumbers existing rows)
DO $$
DECLARE
  dup_count INTEGER := 0;
BEGIN
  -- 4a. uniq_children_learner_number
  IF to_regclass('public.children') IS NOT NULL THEN
    SELECT COUNT(*) INTO dup_count
    FROM (
      SELECT UPPER(TRIM(learner_number))
      FROM children
      WHERE learner_number IS NOT NULL AND TRIM(learner_number) <> ''
      GROUP BY 1
      HAVING COUNT(*) > 1
    ) d;

    IF dup_count = 0 THEN
      EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS uniq_children_learner_number ON children (UPPER(TRIM(learner_number))) WHERE learner_number IS NOT NULL AND TRIM(learner_number) <> ''''';
    END IF;
  END IF;

  -- 4b. uniq_applications_application_number
  IF to_regclass('public.applications') IS NOT NULL THEN
    SELECT COUNT(*) INTO dup_count
    FROM (
      SELECT UPPER(TRIM(application_number))
      FROM applications
      WHERE application_number IS NOT NULL AND TRIM(application_number) <> ''
      GROUP BY 1
      HAVING COUNT(*) > 1
    ) d;

    IF dup_count = 0 THEN
      EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS uniq_applications_application_number ON applications (UPPER(TRIM(application_number))) WHERE application_number IS NOT NULL AND TRIM(application_number) <> ''''';
    END IF;
  END IF;

  -- 4c. uniq_active_application_per_school_year
  IF to_regclass('public.applications') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'academic_year'
     ) THEN
    SELECT COUNT(*) INTO dup_count
    FROM (
      SELECT
        school_id,
        UPPER(REGEXP_REPLACE(TRIM(COALESCE(id_number, '')), '[^A-Za-z0-9]', '', 'g')) AS norm_id,
        COALESCE(academic_year, 0) AS norm_year
      FROM applications
      WHERE school_id IS NOT NULL
        AND LENGTH(REGEXP_REPLACE(TRIM(COALESCE(id_number, '')), '[^A-Za-z0-9]', '', 'g')) >= 6
        AND COALESCE(LOWER(status), '') NOT IN ('rejected', 'declined', 'withdrawn', 'cancelled')
      GROUP BY 1, 2, 3
      HAVING COUNT(*) > 1
    ) d;

    IF dup_count = 0 THEN
      EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_application_per_school_year ON applications (school_id, UPPER(REGEXP_REPLACE(TRIM(COALESCE(id_number, '''')), ''[^A-Za-z0-9]'', '''', ''g'')), COALESCE(academic_year, 0)) WHERE school_id IS NOT NULL AND LENGTH(REGEXP_REPLACE(TRIM(COALESCE(id_number, '''')), ''[^A-Za-z0-9]'', '''', ''g'')) >= 6 AND COALESCE(LOWER(status), '''') NOT IN (''rejected'', ''declined'', ''withdrawn'', ''cancelled'')';
    END IF;
  END IF;
END $$;

-- 5. Supporting lookup indexes for hardened authentication & recovery
CREATE INDEX IF NOT EXISTS idx_users_reset_code_hash
  ON users (reset_code_hash)
  WHERE reset_code_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_email_verification_status
  ON users (email_verification_status);

COMMIT;
