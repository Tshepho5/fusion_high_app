-- =============================================================================
-- GELEZA SA — PHASE M2.1 POST-MIGRATION READ-ONLY VERIFICATION
-- =============================================================================
-- MODE:    STRICTLY READ-ONLY (Single pure WITH ... SELECT query; ZERO DDL/DML)
-- SAFETY:  Zero writes, zero DDL, zero PII.
-- PURPOSE: Verify all Phase M2.1 columns, constraints, tables, indexes, and
--          legacy email verification policy integrity after applying:
--          db/migrations/20261122_auth_hardening_and_parent_onboarding.sql
-- =============================================================================

WITH
table_flags AS (
  SELECT
    (to_regclass('public.users') IS NOT NULL)                 AS has_users,
    (to_regclass('public.children') IS NOT NULL)              AS has_children,
    (to_regclass('public.applications') IS NOT NULL)          AS has_applications,
    (to_regclass('public.account_action_tokens') IS NOT NULL) AS has_action_tokens
),

section_identity AS (
  SELECT
    10 AS sort_order,
    '0. IDENTITY' AS section,
    'database_identity' AS check_name,
    'INFO' AS status,
    format(
      'database=%s | schema=%s | checked_at=%s | read_only=%s',
      current_database(),
      current_schema(),
      to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      current_setting('default_transaction_read_only')
    ) AS detail,
    jsonb_build_object(
      'database', current_database(),
      'schema', current_schema(),
      'server_version', current_setting('server_version'),
      'read_only_session', current_setting('default_transaction_read_only')
    ) AS evidence_json
),

expected_cols AS (
  SELECT
    req.tbl,
    req.col_name,
    (col.column_name IS NOT NULL) AS present,
    col.data_type
  FROM (
    VALUES
      ('users', 'email_verified_at'),
      ('users', 'email_verification_status'),
      ('users', 'activation_purpose'),
      ('users', 'reset_code_hash'),
      ('users', 'reset_attempts'),
      ('users', 'activation_token_hash'),
      ('users', 'activation_expires_at'),
      ('users', 'password_set_at'),
      ('account_action_tokens', 'id'),
      ('account_action_tokens', 'user_id'),
      ('account_action_tokens', 'purpose'),
      ('account_action_tokens', 'token_hash'),
      ('account_action_tokens', 'created_by_user_id'),
      ('account_action_tokens', 'application_id'),
      ('account_action_tokens', 'child_id'),
      ('account_action_tokens', 'school_id'),
      ('account_action_tokens', 'expires_at'),
      ('account_action_tokens', 'consumed_at')
  ) AS req(tbl, col_name)
  LEFT JOIN information_schema.columns col
    ON col.table_schema = 'public'
   AND col.table_name = req.tbl
   AND col.column_name = req.col_name
),

expected_indexes AS (
  SELECT
    req.tbl,
    req.idx_name,
    EXISTS (
      SELECT 1
      FROM pg_index i
      JOIN pg_class ic ON ic.oid = i.indexrelid
      JOIN pg_class tc ON tc.oid = i.indrelid
      JOIN pg_namespace n ON n.oid = tc.relnamespace
      WHERE n.nspname = 'public'
        AND tc.relname = req.tbl
        AND ic.relname = req.idx_name
        AND i.indisvalid
    ) AS valid_present
  FROM (
    VALUES
      ('children', 'uniq_children_learner_number'),
      ('applications', 'uniq_applications_application_number'),
      ('applications', 'uniq_active_application_per_school_year'),
      ('users', 'idx_users_reset_code_hash'),
      ('users', 'idx_users_email_verification_status'),
      ('account_action_tokens', 'idx_account_action_tokens_user_purpose'),
      ('account_action_tokens', 'idx_account_action_tokens_active_hash'),
      ('account_action_tokens', 'idx_account_action_tokens_application'),
      ('account_action_tokens', 'idx_account_action_tokens_child')
  ) AS req(tbl, idx_name)
),

policy_probe AS (
  SELECT
    CASE
      WHEN tf.has_users
       AND tf.has_children
       AND tf.has_applications
       AND tf.has_action_tokens
       AND EXISTS (SELECT 1 FROM expected_cols WHERE tbl = 'users' AND col_name = 'email_verification_status' AND present)
       AND EXISTS (SELECT 1 FROM expected_cols WHERE tbl = 'users' AND col_name = 'email_verified_at' AND present)
      THEN (
        SELECT xt.payload::jsonb
        FROM XMLTABLE(
          '/table/row'
          PASSING query_to_xml(
            $q$
            SELECT jsonb_build_object(
              'evaluated', true,
              'total_users', (SELECT COUNT(*)::int FROM public.users),
              'verified_count', (SELECT COUNT(*)::int FROM public.users WHERE email_verification_status = 'verified'),
              'legacy_unverified_count', (SELECT COUNT(*)::int FROM public.users WHERE email_verification_status = 'legacy_unverified'),
              'pending_verification_count', (SELECT COUNT(*)::int FROM public.users WHERE email_verification_status = 'pending_verification'),
              'fabricated_legacy_verified_at', (
                SELECT COUNT(*)::int FROM public.users
                WHERE email_verification_status = 'legacy_unverified' AND email_verified_at IS NOT NULL
              ),
              'null_status_count', (SELECT COUNT(*)::int FROM public.users WHERE email_verification_status IS NULL),
              'children_count', (SELECT COUNT(*)::int FROM public.children),
              'applications_count', (SELECT COUNT(*)::int FROM public.applications),
              'action_tokens_count', (SELECT COUNT(*)::int FROM public.account_action_tokens)
            )::text AS payload
            $q$,
            true, false, ''
          )
          COLUMNS payload text PATH 'payload'
        ) xt
        LIMIT 1
      )
      ELSE jsonb_build_object(
        'evaluated', false,
        'reason', 'Migration 20261122_auth_hardening_and_parent_onboarding.sql has not been applied yet (missing email_verification_status, email_verified_at, or account_action_tokens).'
      )
    END AS data
  FROM table_flags tf
),

checks AS (
  SELECT
    20 AS sort_order,
    '1. TABLES_AND_COLUMNS' AS section,
    'verify_m21_tables_and_columns' AS check_name,
    CASE
      WHEN tf.has_action_tokens AND NOT EXISTS (SELECT 1 FROM expected_cols WHERE NOT present) THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    CASE
      WHEN tf.has_action_tokens AND NOT EXISTS (SELECT 1 FROM expected_cols WHERE NOT present)
        THEN 'Table account_action_tokens and all 18 target columns are present.'
      ELSE format(
        'Missing columns: %s',
        COALESCE((SELECT string_agg(tbl || '.' || col_name, ', ' ORDER BY tbl, col_name) FROM expected_cols WHERE NOT present), 'account_action_tokens missing')
      )
    END AS detail,
    (SELECT jsonb_agg(jsonb_build_object('table', tbl, 'column', col_name, 'present', present, 'data_type', data_type) ORDER BY tbl, col_name) FROM expected_cols) AS evidence_json
  FROM table_flags tf

  UNION ALL

  SELECT
    30,
    '2. CONSTRAINTS',
    'verify_email_verification_status_constraint',
    CASE
      WHEN EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'users_email_verification_status_check'
          AND conrelid = 'public.users'::regclass
          AND convalidated = TRUE
      ) THEN 'PASS'
      ELSE 'FAIL'
    END,
    'Checks users_email_verification_status_check exists and is VALIDATED.',
    jsonb_build_object('present', EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'users_email_verification_status_check'
        AND conrelid = 'public.users'::regclass
        AND convalidated = TRUE
    ))

  UNION ALL

  SELECT
    40,
    '3. INDEXES',
    'verify_all_9_m21_indexes_valid',
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM expected_indexes WHERE NOT valid_present) THEN 'PASS'
      ELSE 'FAIL'
    END,
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM expected_indexes WHERE NOT valid_present)
        THEN 'All 9 M2.1 indexes (including the 3 guarded uniqueness indexes) exist and are valid.'
      ELSE format(
        'Missing or invalid index(es): %s',
        (SELECT string_agg(tbl || '.' || idx_name, ', ' ORDER BY tbl, idx_name) FROM expected_indexes WHERE NOT valid_present)
      )
    END,
    (SELECT jsonb_agg(jsonb_build_object('table', tbl, 'index', idx_name, 'valid_present', valid_present) ORDER BY tbl, idx_name) FROM expected_indexes)

  UNION ALL

  SELECT
    50,
    '4. LEGACY_POLICY',
    'verify_legacy_email_verification_policy_and_preservation',
    CASE
      WHEN (pp.data ->> 'evaluated')::boolean IS NOT TRUE THEN 'FAIL'
      WHEN (pp.data ->> 'null_status_count')::int = 0
       AND (pp.data ->> 'fabricated_legacy_verified_at')::int = 0
      THEN 'PASS'
      ELSE 'FAIL'
    END,
    CASE
      WHEN (pp.data ->> 'evaluated')::boolean IS NOT TRUE
        THEN COALESCE(pp.data ->> 'reason', 'Migration not yet applied.')
      ELSE format(
        'users=%s (verified=%s, legacy_unverified=%s, pending=%s, fabricated_legacy_ts=%s) | children=%s | applications=%s | tokens=%s',
        pp.data ->> 'total_users',
        pp.data ->> 'verified_count',
        pp.data ->> 'legacy_unverified_count',
        pp.data ->> 'pending_verification_count',
        pp.data ->> 'fabricated_legacy_verified_at',
        pp.data ->> 'children_count',
        pp.data ->> 'applications_count',
        pp.data ->> 'action_tokens_count'
      )
    END,
    pp.data
  FROM policy_probe pp
),

summary_verdict AS (
  SELECT
    99 AS sort_order,
    'V. VERIFICATION_SUMMARY' AS section,
    'POST_MIGRATION_VERIFICATION_VERDICT' AS check_name,
    CASE
      WHEN EXISTS (SELECT 1 FROM checks WHERE status = 'FAIL') THEN 'FAIL'
      ELSE 'PASS'
    END AS status,
    CASE
      WHEN EXISTS (SELECT 1 FROM checks WHERE status = 'FAIL')
        THEN 'FAIL: One or more M2.1 post-migration checks failed.'
      ELSE 'ALL M2.1 POST-MIGRATION CHECKS PASSED.'
    END AS detail,
    (SELECT jsonb_object_agg(check_name, status) FROM checks) AS evidence_json
)

SELECT section, check_name, status, detail, evidence_json
FROM (
  SELECT * FROM section_identity
  UNION ALL SELECT * FROM checks
  UNION ALL SELECT * FROM summary_verdict
) final_rows
ORDER BY sort_order, check_name;
