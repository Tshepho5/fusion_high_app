-- =============================================================================
-- GELEZA SA — PHASE M2.1 PRODUCTION READ-ONLY PREFLIGHT DIAGNOSTIC
-- =============================================================================
-- MODE:    STRICTLY READ-ONLY (Single pure WITH ... SELECT query; ZERO DDL/DML)
-- SAFETY:  Contains ZERO INSERT, UPDATE, DELETE, ALTER, CREATE, DROP, DO blocks.
--          Safe to execute in Supabase SQL Editor or inside BEGIN TRANSACTION READ ONLY.
-- PRIVACY: Returns aggregate counts, schema metadata, and numeric IDs on conflicts only.
--          NEVER exports names, emails, phone numbers, SA IDs, passwords, or tokens.
-- PURPOSE: Verify prerequisites, legacy email verification classification counts,
--          and duplicate diagnostics BEFORE applying:
--          db/migrations/20261122_auth_hardening_and_parent_onboarding.sql
-- =============================================================================

WITH
table_flags AS (
  SELECT
    (to_regclass('public.schools') IS NOT NULL)               AS has_schools,
    (to_regclass('public.users') IS NOT NULL)                 AS has_users,
    (to_regclass('public.roles') IS NOT NULL)                 AS has_roles,
    (to_regclass('public.applications') IS NOT NULL)          AS has_applications,
    (to_regclass('public.children') IS NOT NULL)              AS has_children,
    (to_regclass('public.parent_children') IS NOT NULL)       AS has_parent_children,
    (to_regclass('public.learner_registrations') IS NOT NULL) AS has_learner_regs,
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

prereq_cols AS (
  SELECT
    req.tbl,
    req.col_name,
    (col.column_name IS NOT NULL) AS present,
    col.data_type
  FROM (
    VALUES
      ('users', 'id'),
      ('users', 'email'),
      ('users', 'password_hash'),
      ('users', 'password_set_at'),
      ('users', 'activation_token_hash'),
      ('users', 'activation_expires_at'),
      ('children', 'id'),
      ('children', 'learner_number'),
      ('children', 'learner_user_id'),
      ('children', 'school_id'),
      ('applications', 'id'),
      ('applications', 'application_number'),
      ('applications', 'school_id'),
      ('applications', 'id_number'),
      ('applications', 'academic_year'),
      ('applications', 'status')
  ) AS req(tbl, col_name)
  LEFT JOIN information_schema.columns col
    ON col.table_schema = 'public'
   AND col.table_name = req.tbl
   AND col.column_name = req.col_name
),

users_probe AS (
  SELECT
    CASE
      WHEN tf.has_users THEN (
        SELECT xt.payload::jsonb
        FROM XMLTABLE(
          '/table/row'
          PASSING query_to_xml(
            $q$
            WITH u AS (
              SELECT
                id,
                NULLIF(TRIM(COALESCE(to_jsonb(users) ->> 'password_hash', '')), '') AS pw_hash,
                NULLIF(TRIM(COALESCE(to_jsonb(users) ->> 'password_set_at', '')), '') AS pw_set_at,
                NULLIF(TRIM(COALESCE(to_jsonb(users) ->> 'email_verification_status', '')), '') AS ev_status,
                NULLIF(TRIM(COALESCE(to_jsonb(users) ->> 'email_verified_at', '')), '') AS ev_at,
                LOWER(TRIM(COALESCE(email, ''))) AS norm_email
              FROM public.users
            ),
            dup_emails AS (
              SELECT norm_email, COUNT(*)::int AS cnt, array_agg(id ORDER BY id) AS ids
              FROM u
              WHERE norm_email <> ''
              GROUP BY 1
              HAVING COUNT(*) > 1
            )
            SELECT jsonb_build_object(
              'evaluated', true,
              'total_users', (SELECT COUNT(*)::int FROM u),
              'will_be_verified', (SELECT COUNT(*)::int FROM u WHERE pw_hash IS NOT NULL AND pw_set_at IS NOT NULL),
              'will_be_legacy_unverified', (SELECT COUNT(*)::int FROM u WHERE pw_hash IS NOT NULL AND pw_set_at IS NULL),
              'will_be_pending_verification', (SELECT COUNT(*)::int FROM u WHERE pw_hash IS NULL),
              'already_classified', (SELECT COUNT(*)::int FROM u WHERE ev_status IS NOT NULL),
              'already_verified_ts', (SELECT COUNT(*)::int FROM u WHERE ev_at IS NOT NULL),
              'duplicate_lowercase_email_groups', (SELECT COUNT(*)::int FROM dup_emails),
              'duplicate_lowercase_emails', COALESCE((SELECT jsonb_agg(jsonb_build_object('count', cnt, 'ids', ids)) FROM dup_emails), '[]'::jsonb)
            )::text AS payload
            $q$,
            true, false, ''
          )
          COLUMNS payload text PATH 'payload'
        ) xt
        LIMIT 1
      )
      ELSE jsonb_build_object('evaluated', false, 'reason', 'users_table_missing')
    END AS data
  FROM table_flags tf
),

duplicates_probe AS (
  SELECT
    CASE
      WHEN tf.has_children AND tf.has_applications THEN (
        SELECT xt.payload::jsonb
        FROM XMLTABLE(
          '/table/row'
          PASSING query_to_xml(
            $q$
            WITH dup_child_ln AS (
              SELECT UPPER(TRIM(learner_number)) AS k, COUNT(*)::int AS cnt, array_agg(id ORDER BY id) AS ids
              FROM public.children
              WHERE learner_number IS NOT NULL AND TRIM(learner_number) <> ''
              GROUP BY 1
              HAVING COUNT(*) > 1
            ),
            dup_app_no AS (
              SELECT UPPER(TRIM(application_number)) AS k, COUNT(*)::int AS cnt, array_agg(id ORDER BY id) AS ids
              FROM public.applications
              WHERE application_number IS NOT NULL AND TRIM(application_number) <> ''
              GROUP BY 1
              HAVING COUNT(*) > 1
            ),
            dup_active_app AS (
              SELECT
                school_id,
                UPPER(REGEXP_REPLACE(TRIM(COALESCE(id_number, '')), '[^A-Za-z0-9]', '', 'g')) AS norm_id,
                COALESCE((to_jsonb(applications) ->> 'academic_year')::int, 0) AS norm_year,
                COUNT(*)::int AS cnt,
                array_agg(id ORDER BY id) AS ids
              FROM public.applications
              WHERE school_id IS NOT NULL
                AND LENGTH(REGEXP_REPLACE(TRIM(COALESCE(id_number, '')), '[^A-Za-z0-9]', '', 'g')) >= 6
                AND COALESCE(LOWER(status), '') NOT IN ('rejected', 'declined', 'withdrawn', 'cancelled')
              GROUP BY 1, 2, 3
              HAVING COUNT(*) > 1
            )
            SELECT jsonb_build_object(
              'evaluated', true,
              'total_children', (SELECT COUNT(*)::int FROM public.children),
              'total_applications', (SELECT COUNT(*)::int FROM public.applications),
              'dup_child_learner_number_groups', (SELECT COUNT(*)::int FROM dup_child_ln),
              'dup_child_learner_numbers', COALESCE((SELECT jsonb_agg(jsonb_build_object('count', cnt, 'ids', ids)) FROM dup_child_ln), '[]'::jsonb),
              'dup_application_number_groups', (SELECT COUNT(*)::int FROM dup_app_no),
              'dup_application_numbers', COALESCE((SELECT jsonb_agg(jsonb_build_object('count', cnt, 'ids', ids)) FROM dup_app_no), '[]'::jsonb),
              'dup_active_app_school_year_groups', (SELECT COUNT(*)::int FROM dup_active_app),
              'dup_active_app_school_years', COALESCE((SELECT jsonb_agg(jsonb_build_object('school_id', school_id, 'academic_year', norm_year, 'count', cnt, 'ids', ids)) FROM dup_active_app), '[]'::jsonb)
            )::text AS payload
            $q$,
            true, false, ''
          )
          COLUMNS payload text PATH 'payload'
        ) xt
        LIMIT 1
      )
      ELSE jsonb_build_object('evaluated', false, 'reason', 'children_or_applications_missing')
    END AS data
  FROM table_flags tf
),

checks AS (
  SELECT
    20 AS sort_order,
    '1. PREREQUISITES' AS section,
    'core_tables_and_columns_present' AS check_name,
    CASE
      WHEN tf.has_schools AND tf.has_users AND tf.has_roles AND tf.has_applications AND tf.has_children
       AND NOT EXISTS (SELECT 1 FROM prereq_cols WHERE NOT present)
      THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    CASE
      WHEN tf.has_schools AND tf.has_users AND tf.has_roles AND tf.has_applications AND tf.has_children
       AND NOT EXISTS (SELECT 1 FROM prereq_cols WHERE NOT present)
      THEN 'All prerequisite core tables and Phase H-L columns exist.'
      ELSE format(
        'Missing prerequisite columns: %s',
        COALESCE((SELECT string_agg(tbl || '.' || col_name, ', ' ORDER BY tbl, col_name) FROM prereq_cols WHERE NOT present), 'core tables missing')
      )
    END AS detail,
    (SELECT jsonb_agg(jsonb_build_object('table', tbl, 'column', col_name, 'present', present, 'data_type', data_type) ORDER BY tbl, col_name) FROM prereq_cols) AS evidence_json
  FROM table_flags tf

  UNION ALL

  SELECT
    30,
    '2. USER_POLICY',
    'legacy_email_verification_classification_preview',
    CASE
      WHEN (up.data ->> 'evaluated')::boolean IS NOT TRUE THEN 'FAIL'
      WHEN (up.data ->> 'duplicate_lowercase_email_groups')::int > 0 THEN 'FAIL'
      ELSE 'PASS'
    END,
    format(
      'users=%s | verified=%s | legacy_unverified=%s | pending_verification=%s | dup_lowercase_email_groups=%s',
      up.data ->> 'total_users',
      up.data ->> 'will_be_verified',
      up.data ->> 'will_be_legacy_unverified',
      up.data ->> 'will_be_pending_verification',
      up.data ->> 'duplicate_lowercase_email_groups'
    ),
    up.data
  FROM users_probe up

  UNION ALL

  SELECT
    40,
    '3. UNIQUENESS',
    'uniq_children_learner_number_preflight',
    CASE
      WHEN (dp.data ->> 'evaluated')::boolean IS NOT TRUE THEN 'FAIL'
      WHEN (dp.data ->> 'dup_child_learner_number_groups')::int = 0 THEN 'PASS'
      ELSE 'FAIL'
    END,
    format(
      'children=%s | duplicate_learner_number_groups=%s',
      dp.data ->> 'total_children',
      dp.data ->> 'dup_child_learner_number_groups'
    ),
    jsonb_build_object(
      'duplicate_groups', dp.data -> 'dup_child_learner_number_groups',
      'conflicts', dp.data -> 'dup_child_learner_numbers'
    )
  FROM duplicates_probe dp

  UNION ALL

  SELECT
    41,
    '3. UNIQUENESS',
    'uniq_applications_application_number_preflight',
    CASE
      WHEN (dp.data ->> 'evaluated')::boolean IS NOT TRUE THEN 'FAIL'
      WHEN (dp.data ->> 'dup_application_number_groups')::int = 0 THEN 'PASS'
      ELSE 'FAIL'
    END,
    format(
      'applications=%s | duplicate_application_number_groups=%s',
      dp.data ->> 'total_applications',
      dp.data ->> 'dup_application_number_groups'
    ),
    jsonb_build_object(
      'duplicate_groups', dp.data -> 'dup_application_number_groups',
      'conflicts', dp.data -> 'dup_application_numbers'
    )
  FROM duplicates_probe dp

  UNION ALL

  SELECT
    42,
    '3. UNIQUENESS',
    'uniq_active_application_per_school_year_preflight',
    CASE
      WHEN (dp.data ->> 'evaluated')::boolean IS NOT TRUE THEN 'FAIL'
      WHEN (dp.data ->> 'dup_active_app_school_year_groups')::int = 0 THEN 'PASS'
      ELSE 'FAIL'
    END,
    format(
      'applications=%s | duplicate_active_school_year_id_groups=%s',
      dp.data ->> 'total_applications',
      dp.data ->> 'dup_active_app_school_year_groups'
    ),
    jsonb_build_object(
      'duplicate_groups', dp.data -> 'dup_active_app_school_year_groups',
      'conflicts', dp.data -> 'dup_active_app_school_years'
    )
  FROM duplicates_probe dp
),

summary_verdict AS (
  SELECT
    99 AS sort_order,
    'V. PREFLIGHT_SUMMARY' AS section,
    'PREFLIGHT_VERDICT' AS check_name,
    CASE
      WHEN EXISTS (SELECT 1 FROM checks WHERE status = 'FAIL') THEN 'FAIL'
      ELSE 'PASS'
    END AS status,
    CASE
      WHEN EXISTS (SELECT 1 FROM checks WHERE status = 'FAIL')
        THEN 'BLOCKED: Resolve duplicate or prerequisite findings before applying 20261122_auth_hardening_and_parent_onboarding.sql.'
      ELSE 'ALL PREFLIGHT CHECKS PASSED: Safe to apply 20261122_auth_hardening_and_parent_onboarding.sql.'
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
