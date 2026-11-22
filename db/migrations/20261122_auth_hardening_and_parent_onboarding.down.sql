-- =============================================================================
-- GELEZA SA — NON-DESTRUCTIVE ROLLBACK GUARD FOR PHASE M2.1 MIGRATION
-- =============================================================================
-- Target: Rollback of 20261122_auth_hardening_and_parent_onboarding.sql
-- SAFETY: Preserves user accounts, passwords, applications, and children rows.
--         Refuses to drop account_action_tokens if live unconsumed tokens exist.
-- =============================================================================

BEGIN;

-- 1. Drop guarded indexes added in 20261122 (safe, non-destructive)
DROP INDEX IF EXISTS idx_users_email_verification_status;
DROP INDEX IF EXISTS idx_users_reset_code_hash;
DROP INDEX IF EXISTS uniq_active_application_per_school_year;
DROP INDEX IF EXISTS uniq_applications_application_number;
DROP INDEX IF EXISTS uniq_children_learner_number;

-- 2. Refuse to drop account_action_tokens if active records exist
DO $$
DECLARE
  token_rows INTEGER := 0;
BEGIN
  IF to_regclass('public.account_action_tokens') IS NOT NULL THEN
    SELECT COUNT(*) INTO token_rows FROM account_action_tokens;
    IF token_rows > 0 THEN
      RAISE EXCEPTION 'ROLLBACK GUARD: public.account_action_tokens contains % row(s). Preserve audit/token history or archive explicitly before dropping.', token_rows;
    END IF;
    DROP TABLE account_action_tokens;
  END IF;
END $$;

-- 3. Drop CHECK constraint only; preserve additive columns on users unless empty
ALTER TABLE IF EXISTS users
  DROP CONSTRAINT IF EXISTS users_email_verification_status_check;

DO $$
DECLARE
  non_default_data INTEGER := 0;
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'reset_code_hash'
    ) THEN
      SELECT COUNT(*) INTO non_default_data
      FROM users
      WHERE reset_code_hash IS NOT NULL
         OR activation_purpose IS NOT NULL
         OR email_verified_at IS NOT NULL;
      IF non_default_data > 0 THEN
        RAISE NOTICE 'ROLLBACK NOTICE: Preserving additive columns on users because % row(s) contain verification/reset state.', non_default_data;
      ELSE
        ALTER TABLE users
          DROP COLUMN IF EXISTS reset_attempts,
          DROP COLUMN IF EXISTS reset_code_hash,
          DROP COLUMN IF EXISTS activation_purpose,
          DROP COLUMN IF EXISTS email_verification_status,
          DROP COLUMN IF EXISTS email_verified_at;
      END IF;
    END IF;
  END IF;
END $$;

COMMIT;
