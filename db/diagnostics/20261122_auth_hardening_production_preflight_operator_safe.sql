-- =============================================================================
-- GELEZA SA — PHASE M3.7 OPERATOR-SAFE PRODUCTION READ-ONLY PREFLIGHT PACKAGE
-- =============================================================================
-- FILE:       db/diagnostics/20261122_auth_hardening_production_preflight_operator_safe.sql
-- MODE:       STRICTLY READ-ONLY (Single pure WITH ... SELECT query; ZERO DDL/DML)
-- TARGET:     Pre-check BEFORE applying:
--             db/migrations/20261122_auth_hardening_and_parent_onboarding.sql
--
-- SAFETY GUARANTEES:
--   * Contains ZERO mutating SQL (no INSERT, UPDATE, DELETE, MERGE, DROP, ALTER,
--     TRUNCATE, CREATE, GRANT, REVOKE, VACUUM, ANALYZE, CALL, DO, SET, TEMP TABLE,
--     or sequence-advancing functions).
--   * Safe to run as a single statement in Supabase SQL Editor OR wrapped in:
--       BEGIN TRANSACTION READ ONLY;
--       <this query>
--       ROLLBACK;
--     when using psql / DBeaver / pgAdmin.
--   * PRIVACY: Outputs aggregate counts, schema metadata, and numeric record IDs
--     for duplicate conflict groups (capped at 50 sample groups) ONLY.
--     NEVER exports names, emails, phones, SA IDs, passwords, hashes, or tokens.
--
-- IMPORTANT OPERATOR NOTICES:
--   1. THIS PREFLIGHT HAS NOT BEEN EXECUTED AGAINST LIVE PRODUCTION BY THE AGENT.
--   2. THIS IS A READ-ONLY PREFLIGHT. DO NOT EXECUTE ANY MIGRATION SQL HERE.
--   3. A "PASS" VERDICT DOES NOT AUTHORIZE MIGRATION OR DEPLOYMENT.
-- =============================================================================

WITH
table_flags AS (
  SELECT
    (to_regclass('public.schools') IS NOT NULL)                       AS has_schools,
    (to_regclass('public.users') IS NOT NULL)                         AS has_users,
    (to_regclass('public.roles') IS NOT NULL)                         AS has_roles,
    (to_regclass('public.applications') IS NOT NULL)                  AS has_applications,
    (to_regclass('public.children') IS NOT NULL)                      AS has_children,
    (to_regclass('public.parent_children') IS NOT NULL)               AS has_parent_children,
    (to_regclass('public.school_subject_offerings') IS NOT NULL)      AS has_subject_offerings,
    (to_regclass('public.academic_streams') IS NOT NULL)              AS has_academic_streams,
    (to_regclass('public.learner_registrations') IS NOT NULL)         AS has_learner_regs,
    (to_regclass('public.learner_enrolments') IS NOT NULL)            AS has_learner_enrolments,
    (to_regclass('public.application_documents') IS NOT NULL)         AS has_app_docs,
    (to_regclass('public.application_document_requests') IS NOT NULL) AS has_doc_requests,
    (to_regclass('public.application_status_history') IS NOT NULL)    AS has_status_history,
    (to_regclass('public.application_email_log') IS NOT NULL)         AS has_email_log,
    (to_regclass('public.account_action_tokens') IS NOT NULL)         AS has_action_tokens,
    (to_regclass('public.schema_migrations') IS NOT NULL)             AS has_schema_migrations
),

section_identity AS (
  SELECT
    10 AS sort_order,
    '0. IDENTITY' AS section,
    'database_identity' AS check_name,
    'INFO' AS status,
    format(
      'database=%s | schema=%s | pg=%s | read_only_setting=%s | checked_at_utc=%s',
      current_database(),
      current_schema(),
      current_setting('server_version'),
      current_setting('default_transaction_read_only'),
      to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ) AS detail,
    jsonb_build_object(
      'database', current_database(),
      'schema', current_schema(),
      'server_version', current_setting('server_version'),
      'read_only_setting', current_setting('default_transaction_read_only'),
      'checked_at_utc', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ) AS evidence_json
),

col_audit AS (
  SELECT
    req.tbl,
    req.col_name,
    req.tier,
    req.expected_type_family,
    (c.column_name IS NOT NULL) AS present,
    c.data_type,
    c.is_nullable,
    CASE
      WHEN c.column_name IS NULL THEN false
      WHEN req.expected_type_family = 'integer' THEN c.data_type IN ('integer', 'smallint')
      WHEN req.expected_type_family = 'text' THEN c.data_type IN ('character varying', 'text', 'character')
      WHEN req.expected_type_family = 'boolean' THEN c.data_type = 'boolean'
      WHEN req.expected_type_family = 'timestamp' THEN c.data_type IN ('timestamp with time zone', 'timestamp without time zone')
      ELSE true
    END AS type_compatible
  FROM (
    VALUES
      -- Core tables & FK targets (must exist and be type-compatible with 20261122)
      ('schools', 'id', 'core_fk_target', 'integer'),
      ('users', 'id', 'core_fk_target', 'integer'),
      ('users', 'email', 'core_required', 'text'),
      ('users', 'password_hash', 'core_required', 'text'),
      ('children', 'id', 'core_fk_target', 'integer'),
      ('children', 'learner_number', 'core_required', 'text'),
      ('children', 'learner_user_id', 'core_required', 'integer'),
      ('children', 'school_id', 'core_required', 'integer'),
      ('applications', 'id', 'core_fk_target', 'integer'),
      ('applications', 'application_number', 'core_required', 'text'),
      ('applications', 'school_id', 'core_required', 'integer'),
      ('applications', 'id_number', 'core_required', 'text'),
      ('applications', 'status', 'core_required', 'text'),
      -- Prerequisite 20261121 migration columns required by M2 migration / runtime
      ('children', 'is_active', 'prereq_20261121', 'boolean'),
      ('applications', 'academic_year', 'prereq_20261121', 'integer'),
      ('applications', 'parent_user_id', 'prereq_20261121', 'integer'),
      ('applications', 'provisional_learner_number', 'prereq_20261121', 'text'),
      -- Auth columns added/ensured by 20261122 (optional pre-migration; inspected if present)
      ('users', 'active_session_id', 'm2_target', 'text'),
      ('users', 'password_set_at', 'm2_target', 'timestamp'),
      ('users', 'activation_token_hash', 'm2_target', 'text'),
      ('users', 'activation_expires_at', 'm2_target', 'timestamp'),
      ('users', 'email_verified_at', 'm2_target', 'timestamp'),
      ('users', 'email_verification_status', 'm2_target', 'text'),
      ('users', 'activation_purpose', 'm2_target', 'text'),
      ('users', 'reset_code', 'legacy_auth', 'text'),
      ('users', 'reset_code_hash', 'm2_target', 'text'),
      ('users', 'reset_attempts', 'm2_target', 'integer')
  ) AS req(tbl, col_name, tier, expected_type_family)
  LEFT JOIN information_schema.columns c
    ON c.table_schema = 'public'
   AND c.table_name = req.tbl
   AND c.column_name = req.col_name
),

schema_objects AS (
  SELECT
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'table', rel.relname,
        'name', con.conname,
        'type', con.contype,
        'validated', con.convalidated,
        'definition', pg_get_constraintdef(con.oid)
      ) ORDER BY rel.relname, con.contype, con.conname)
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE nsp.nspname = 'public'
        AND rel.relname IN (
          'users', 'applications', 'children', 'parent_children',
          'learner_registrations', 'learner_enrolments', 'account_action_tokens'
        )
        AND con.contype IN ('c', 'f', 'u', 'p')
    ), '[]'::jsonb) AS constraints_json,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'table', tablename,
        'index', indexname,
        'definition', indexdef
      ) ORDER BY tablename, indexname)
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename IN (
          'users', 'applications', 'children', 'parent_children',
          'learner_registrations', 'learner_enrolments', 'account_action_tokens'
        )
    ), '[]'::jsonb) AS indexes_json,
    EXISTS (
      SELECT 1
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE nsp.nspname = 'public'
        AND rel.relname = 'applications'
        AND con.conname = 'applications_status_lifecycle_check'
    ) AS has_app_lifecycle_status_check
),

-- Independent schema-safe probes using to_jsonb() so a missing column NEVER crashes
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
                (to_jsonb(users) ->> 'id') AS row_id,
                NULLIF(TRIM(COALESCE(to_jsonb(users) ->> 'password_hash', '')), '') AS pw_hash,
                NULLIF(TRIM(COALESCE(to_jsonb(users) ->> 'password_set_at', '')), '') AS pw_set_at,
                NULLIF(TRIM(COALESCE(to_jsonb(users) ->> 'email_verification_status', '')), '') AS ev_status,
                NULLIF(TRIM(COALESCE(to_jsonb(users) ->> 'email_verified_at', '')), '') AS ev_at,
                NULLIF(TRIM(COALESCE(to_jsonb(users) ->> 'activation_token_hash', '')), '') AS act_hash,
                NULLIF(TRIM(COALESCE(to_jsonb(users) ->> 'reset_code', '')), '') AS legacy_reset,
                NULLIF(TRIM(COALESCE(to_jsonb(users) ->> 'reset_code_hash', '')), '') AS hashed_reset,
                NULLIF(TRIM(COALESCE(to_jsonb(users) ->> 'active_session_id', '')), '') AS active_sid,
                LOWER(TRIM(COALESCE(to_jsonb(users) ->> 'email', ''))) AS norm_email
              FROM public.users
            ),
            dup_email AS (
              SELECT norm_email, COUNT(*)::int AS cnt, array_agg(row_id ORDER BY row_id) AS ids
              FROM u
              WHERE norm_email <> ''
              GROUP BY 1
              HAVING COUNT(*) > 1
            ),
            dup_email_sample AS (
              SELECT cnt, ids FROM dup_email ORDER BY cnt DESC LIMIT 50
            )
            SELECT jsonb_build_object(
              'evaluated', true,
              'users_total', (SELECT COUNT(*)::int FROM u),
              'blank_or_null_email_count', (SELECT COUNT(*)::int FROM u WHERE norm_email = ''),
              'will_be_verified', (SELECT COUNT(*)::int FROM u WHERE pw_hash IS NOT NULL AND pw_set_at IS NOT NULL),
              'will_be_legacy_unverified', (SELECT COUNT(*)::int FROM u WHERE pw_hash IS NOT NULL AND pw_set_at IS NULL),
              'will_be_pending_verification', (SELECT COUNT(*)::int FROM u WHERE pw_hash IS NULL),
              'already_classified_count', (SELECT COUNT(*)::int FROM u WHERE ev_status IS NOT NULL),
              'invalid_existing_ev_status_count', (
                SELECT COUNT(*)::int FROM u
                WHERE ev_status IS NOT NULL
                  AND ev_status NOT IN ('verified', 'pending_verification', 'legacy_unverified')
              ),
              'existing_email_verified_at_count', (SELECT COUNT(*)::int FROM u WHERE ev_at IS NOT NULL),
              'existing_legacy_with_verified_ts_count', (
                SELECT COUNT(*)::int FROM u
                WHERE ev_status = 'legacy_unverified' AND ev_at IS NOT NULL
              ),
              'existing_activation_token_rows', (SELECT COUNT(*)::int FROM u WHERE act_hash IS NOT NULL),
              'existing_plaintext_reset_code_rows', (SELECT COUNT(*)::int FROM u WHERE legacy_reset IS NOT NULL),
              'existing_hashed_reset_code_rows', (SELECT COUNT(*)::int FROM u WHERE hashed_reset IS NOT NULL),
              'active_session_rows', (SELECT COUNT(*)::int FROM u WHERE active_sid IS NOT NULL),
              'dup_lowercase_email_groups', (SELECT COUNT(*)::int FROM dup_email),
              'dup_lowercase_email_sample_ids', COALESCE((SELECT jsonb_agg(jsonb_build_object('count', cnt, 'ids', ids)) FROM dup_email_sample), '[]'::jsonb)
            )::text AS payload
            $q$,
            true, false, ''
          )
          COLUMNS payload text PATH 'payload'
        ) xt
        LIMIT 1
      )
      ELSE jsonb_build_object('evaluated', false, 'reason', 'public.users table missing')
    END AS data
  FROM table_flags tf
),

children_probe AS (
  SELECT
    CASE
      WHEN tf.has_children THEN (
        SELECT xt.payload::jsonb
        FROM XMLTABLE(
          '/table/row'
          PASSING query_to_xml(
            $q$
            WITH c AS (
              SELECT
                (to_jsonb(children) ->> 'id') AS row_id,
                UPPER(TRIM(COALESCE(to_jsonb(children) ->> 'learner_number', ''))) AS norm_ln,
                NULLIF(TRIM(COALESCE(to_jsonb(children) ->> 'learner_user_id', '')), '') AS learner_uid,
                COALESCE(LOWER(to_jsonb(children) ->> 'is_active'), 'true') AS is_active_str
              FROM public.children
            ),
            dup_ln AS (
              SELECT norm_ln, COUNT(*)::int AS cnt, array_agg(row_id ORDER BY row_id) AS ids
              FROM c
              WHERE norm_ln <> ''
              GROUP BY 1
              HAVING COUNT(*) > 1
            ),
            dup_ln_sample AS (
              SELECT cnt, ids FROM dup_ln ORDER BY cnt DESC LIMIT 50
            )
            SELECT jsonb_build_object(
              'evaluated', true,
              'children_total', (SELECT COUNT(*)::int FROM c),
              'children_active_count', (SELECT COUNT(*)::int FROM c WHERE is_active_str = 'true'),
              'children_blank_or_null_learner_number', (SELECT COUNT(*)::int FROM c WHERE norm_ln = ''),
              'children_without_learner_user_id', (SELECT COUNT(*)::int FROM c WHERE learner_uid IS NULL),
              'dup_child_learner_number_groups', (SELECT COUNT(*)::int FROM dup_ln),
              'dup_child_learner_number_sample_ids', COALESCE((SELECT jsonb_agg(jsonb_build_object('count', cnt, 'ids', ids)) FROM dup_ln_sample), '[]'::jsonb)
            )::text AS payload
            $q$,
            true, false, ''
          )
          COLUMNS payload text PATH 'payload'
        ) xt
        LIMIT 1
      )
      ELSE jsonb_build_object('evaluated', false, 'reason', 'public.children table missing')
    END AS data
  FROM table_flags tf
),

applications_probe AS (
  SELECT
    CASE
      WHEN tf.has_applications THEN (
        SELECT xt.payload::jsonb
        FROM XMLTABLE(
          '/table/row'
          PASSING query_to_xml(
            $q$
            WITH a AS (
              SELECT
                (to_jsonb(applications) ->> 'id') AS row_id,
                NULLIF(TRIM(COALESCE(to_jsonb(applications) ->> 'school_id', '')), '') AS school_id_str,
                UPPER(TRIM(COALESCE(to_jsonb(applications) ->> 'application_number', ''))) AS norm_app_no,
                UPPER(REGEXP_REPLACE(TRIM(COALESCE(to_jsonb(applications) ->> 'id_number', '')), '[^A-Za-z0-9]', '', 'g')) AS norm_id,
                CASE
                  WHEN COALESCE(to_jsonb(applications) ->> 'academic_year', '') ~ '^\s*\d{4}\s*$'
                    THEN TRIM(to_jsonb(applications) ->> 'academic_year')::int
                  ELSE 0
                END AS norm_year,
                NULLIF(TRIM(COALESCE(to_jsonb(applications) ->> 'academic_year', '')), '') AS raw_year,
                LOWER(TRIM(COALESCE(to_jsonb(applications) ->> 'status', ''))) AS norm_status
              FROM public.applications
            ),
            dup_app_no AS (
              SELECT norm_app_no, COUNT(*)::int AS cnt, array_agg(row_id ORDER BY row_id) AS ids
              FROM a
              WHERE norm_app_no <> ''
              GROUP BY 1
              HAVING COUNT(*) > 1
            ),
            dup_app_no_sample AS (
              SELECT cnt, ids FROM dup_app_no ORDER BY cnt DESC LIMIT 50
            ),
            dup_active_app AS (
              SELECT school_id_str, norm_id, norm_year, COUNT(*)::int AS cnt, array_agg(row_id ORDER BY row_id) AS ids
              FROM a
              WHERE school_id_str IS NOT NULL
                AND LENGTH(norm_id) >= 6
                AND norm_status NOT IN ('rejected', 'declined', 'withdrawn', 'cancelled')
              GROUP BY 1, 2, 3
              HAVING COUNT(*) > 1
            ),
            dup_active_sample AS (
              SELECT school_id_str, norm_year, cnt, ids FROM dup_active_app ORDER BY cnt DESC LIMIT 50
            ),
            status_dist AS (
              SELECT COALESCE(NULLIF(norm_status, ''), '<NULL>') AS status_key, COUNT(*)::int AS cnt
              FROM a
              GROUP BY 1
            )
            SELECT jsonb_build_object(
              'evaluated', true,
              'applications_total', (SELECT COUNT(*)::int FROM a),
              'blank_or_null_application_number', (SELECT COUNT(*)::int FROM a WHERE norm_app_no = ''),
              'blank_or_null_id_number', (SELECT COUNT(*)::int FROM a WHERE norm_id = ''),
              'blank_or_null_school_id', (SELECT COUNT(*)::int FROM a WHERE school_id_str IS NULL),
              'blank_or_null_academic_year', (SELECT COUNT(*)::int FROM a WHERE raw_year IS NULL),
              'non_canonical_status_count', (
                SELECT COUNT(*)::int FROM a
                WHERE norm_status <> ''
                  AND norm_status NOT IN (
                    'draft', 'pending', 'pending_payment', 'awaiting_review', 'submitted',
                    'under_ai_review', 'under_review', 'action_required', 'documents_requested',
                    'documents_submitted', 'documents_under_review', 'waitlisted',
                    'accepted', 'approved', 'declined', 'rejected',
                    'enrollment_pending', 'registered', 'enrolled', 'withdrawn', 'cancelled'
                  )
              ),
              'application_status_distribution', COALESCE((SELECT jsonb_object_agg(status_key, cnt) FROM status_dist), '{}'::jsonb),
              'dup_application_number_groups', (SELECT COUNT(*)::int FROM dup_app_no),
              'dup_application_number_sample_ids', COALESCE((SELECT jsonb_agg(jsonb_build_object('count', cnt, 'ids', ids)) FROM dup_app_no_sample), '[]'::jsonb),
              'dup_active_app_school_year_groups', (SELECT COUNT(*)::int FROM dup_active_app),
              'dup_active_app_school_year_sample_ids', COALESCE((SELECT jsonb_agg(jsonb_build_object('school_id', school_id_str, 'academic_year', norm_year, 'count', cnt, 'ids', ids)) FROM dup_active_sample), '[]'::jsonb)
            )::text AS payload
            $q$,
            true, false, ''
          )
          COLUMNS payload text PATH 'payload'
        ) xt
        LIMIT 1
      )
      ELSE jsonb_build_object('evaluated', false, 'reason', 'public.applications table missing')
    END AS data
  FROM table_flags tf
),

lifecycle_probe AS (
  SELECT
    CASE
      WHEN tf.has_learner_regs THEN (
        SELECT xt.cnt::int FROM XMLTABLE('/table/row' PASSING query_to_xml('SELECT COUNT(*)::int AS cnt FROM public.learner_registrations', true, false, '') COLUMNS cnt text PATH 'cnt') xt LIMIT 1
      ) ELSE NULL
    END AS learner_registrations_count,
    CASE
      WHEN tf.has_learner_enrolments THEN (
        SELECT xt.cnt::int FROM XMLTABLE('/table/row' PASSING query_to_xml('SELECT COUNT(*)::int AS cnt FROM public.learner_enrolments', true, false, '') COLUMNS cnt text PATH 'cnt') xt LIMIT 1
      ) ELSE NULL
    END AS learner_enrolments_count,
    CASE
      WHEN tf.has_learner_enrolments THEN (
        SELECT xt.cnt::int FROM XMLTABLE('/table/row' PASSING query_to_xml($q$SELECT COUNT(*)::int AS cnt FROM public.learner_enrolments WHERE LOWER(COALESCE(to_jsonb(learner_enrolments) ->> 'status', '')) = 'active'$q$, true, false, '') COLUMNS cnt text PATH 'cnt') xt LIMIT 1
      ) ELSE NULL
    END AS active_enrolments_count,
    CASE
      WHEN tf.has_parent_children THEN (
        SELECT xt.cnt::int FROM XMLTABLE('/table/row' PASSING query_to_xml('SELECT COUNT(*)::int AS cnt FROM public.parent_children', true, false, '') COLUMNS cnt text PATH 'cnt') xt LIMIT 1
      ) ELSE NULL
    END AS parent_children_count,
    CASE
      WHEN tf.has_action_tokens THEN (
        SELECT xt.cnt::int FROM XMLTABLE('/table/row' PASSING query_to_xml('SELECT COUNT(*)::int AS cnt FROM public.account_action_tokens', true, false, '') COLUMNS cnt text PATH 'cnt') xt LIMIT 1
      ) ELSE NULL
    END AS existing_action_tokens_count
  FROM table_flags tf
),

checks AS (
  -- 1. Core tables, columns, and FK target type compatibility
  SELECT
    20 AS sort_order,
    '1. CORE_SCHEMA' AS section,
    'core_tables_columns_and_fk_types' AS check_name,
    CASE
      WHEN tf.has_schools AND tf.has_users AND tf.has_roles AND tf.has_applications AND tf.has_children
       AND NOT EXISTS (SELECT 1 FROM col_audit WHERE tier IN ('core_fk_target', 'core_required') AND (NOT present OR NOT type_compatible))
      THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    CASE
      WHEN tf.has_schools AND tf.has_users AND tf.has_roles AND tf.has_applications AND tf.has_children
       AND NOT EXISTS (SELECT 1 FROM col_audit WHERE tier IN ('core_fk_target', 'core_required') AND (NOT present OR NOT type_compatible))
      THEN 'All core tables, required columns, and integer FK targets (schools/users/children/applications) are present and type-compatible.'
      ELSE format(
        'Missing/incompatible core objects: tables_ok=%s | bad_cols=%s',
        (tf.has_schools AND tf.has_users AND tf.has_roles AND tf.has_applications AND tf.has_children),
        COALESCE((SELECT string_agg(tbl || '.' || col_name || '(' || COALESCE(data_type, 'MISSING') || ')', ', ' ORDER BY tbl, col_name) FROM col_audit WHERE tier IN ('core_fk_target', 'core_required') AND (NOT present OR NOT type_compatible)), 'missing core table(s)')
      )
    END AS detail,
    jsonb_build_object(
      'core_tables', jsonb_build_object('schools', tf.has_schools, 'users', tf.has_users, 'roles', tf.has_roles, 'applications', tf.has_applications, 'children', tf.has_children),
      'core_columns', (SELECT jsonb_agg(jsonb_build_object('table', tbl, 'column', col_name, 'tier', tier, 'present', present, 'data_type', data_type, 'nullable', is_nullable, 'type_compatible', type_compatible) ORDER BY tbl, col_name) FROM col_audit WHERE tier IN ('core_fk_target', 'core_required'))
    ) AS evidence_json
  FROM table_flags tf

  UNION ALL

  -- 2. Prerequisite 20261121 migration structural readiness
  SELECT
    25,
    '2. PREREQ_MIGRATIONS',
    'prerequisite_20261121_schema_objects',
    CASE
      WHEN tf.has_subject_offerings AND tf.has_academic_streams
       AND tf.has_learner_regs AND tf.has_doc_requests AND tf.has_status_history AND tf.has_email_log
       AND NOT EXISTS (SELECT 1 FROM col_audit WHERE tier = 'prereq_20261121' AND (NOT present OR NOT type_compatible))
      THEN 'PASS'
      ELSE 'FAIL'
    END,
    CASE
      WHEN tf.has_subject_offerings AND tf.has_academic_streams
       AND tf.has_learner_regs AND tf.has_doc_requests AND tf.has_status_history AND tf.has_email_log
       AND NOT EXISTS (SELECT 1 FROM col_audit WHERE tier = 'prereq_20261121' AND (NOT present OR NOT type_compatible))
      THEN 'All prerequisite 20261121 curriculum, registration, and application-lifecycle tables & columns exist.'
      ELSE format(
        'Missing prerequisite 20261121 objects: curriculum_ok=%s | registration_ok=%s | lifecycle_ok=%s | missing_cols=%s',
        (tf.has_subject_offerings AND tf.has_academic_streams),
        tf.has_learner_regs,
        (tf.has_doc_requests AND tf.has_status_history AND tf.has_email_log),
        COALESCE((SELECT string_agg(tbl || '.' || col_name, ', ' ORDER BY tbl, col_name) FROM col_audit WHERE tier = 'prereq_20261121' AND (NOT present OR NOT type_compatible)), 'none')
      )
    END,
    jsonb_build_object(
      'curriculum_20261121', jsonb_build_object('school_subject_offerings', tf.has_subject_offerings, 'academic_streams', tf.has_academic_streams),
      'registration_20261121', jsonb_build_object('learner_registrations', tf.has_learner_regs),
      'lifecycle_20261121', jsonb_build_object('application_document_requests', tf.has_doc_requests, 'application_status_history', tf.has_status_history, 'application_email_log', tf.has_email_log, 'applications_status_lifecycle_check', so.has_app_lifecycle_status_check),
      'prereq_columns', (SELECT jsonb_agg(jsonb_build_object('table', tbl, 'column', col_name, 'present', present, 'data_type', data_type, 'type_compatible', type_compatible) ORDER BY tbl, col_name) FROM col_audit WHERE tier = 'prereq_20261121')
    )
  FROM table_flags tf CROSS JOIN schema_objects so

  UNION ALL

  -- 2b. Honest migration-history provenance check (never fabricates migration history)
  SELECT
    26,
    '2. PREREQ_MIGRATIONS',
    'migration_history_provenance',
    'UNVERIFIED',
    CASE
      WHEN tf.has_schema_migrations
        THEN 'A schema_migrations table exists, but this preflight does not assume 20261121/20261122 completion from table names alone; verify operator migration logs.'
      ELSE 'No schema_migrations ledger exists in public schema. Structural presence is checked above, but formal migration execution history is UNVERIFIED.'
    END,
    jsonb_build_object(
      'has_schema_migrations_table', tf.has_schema_migrations,
      'account_action_tokens_already_exists', tf.has_action_tokens,
      'm2_target_columns', (SELECT jsonb_agg(jsonb_build_object('table', tbl, 'column', col_name, 'present', present, 'data_type', data_type) ORDER BY tbl, col_name) FROM col_audit WHERE tier IN ('m2_target', 'legacy_auth'))
    )
  FROM table_flags tf

  UNION ALL

  -- 3. Constraints, foreign keys & indexes inventory
  SELECT
    30,
    '3. SCHEMA_METADATA',
    'constraints_fks_and_indexes_inventory',
    'INFO',
    format('constraints=%s | indexes=%s | applications_status_lifecycle_check=%s',
      jsonb_array_length(so.constraints_json),
      jsonb_array_length(so.indexes_json),
      so.has_app_lifecycle_status_check),
    jsonb_build_object('constraints', so.constraints_json, 'indexes', so.indexes_json)
  FROM schema_objects so

  UNION ALL

  -- 4. Authentication state, legacy email verification preview & duplicate normalized emails
  SELECT
    40,
    '4. USER_AUTH_STATE',
    'legacy_auth_policy_and_duplicate_emails',
    CASE
      WHEN (up.data ->> 'evaluated')::boolean IS NOT TRUE THEN 'FAIL'
      WHEN (up.data ->> 'dup_lowercase_email_groups')::int > 0 THEN 'FAIL'
      WHEN (up.data ->> 'invalid_existing_ev_status_count')::int > 0 THEN 'FAIL'
      WHEN (up.data ->> 'existing_legacy_with_verified_ts_count')::int > 0 THEN 'FAIL'
      ELSE 'PASS'
    END,
    CASE
      WHEN (up.data ->> 'evaluated')::boolean IS NOT TRUE
        THEN COALESCE(up.data ->> 'reason', 'users probe not evaluated')
      ELSE format(
        'users=%s (verified=%s, legacy_unverified=%s, pending=%s) | blank_email=%s | dup_email_groups=%s | act_tokens=%s | plaintext_resets=%s | hashed_resets=%s | invalid_ev_status=%s',
        up.data ->> 'users_total',
        up.data ->> 'will_be_verified',
        up.data ->> 'will_be_legacy_unverified',
        up.data ->> 'will_be_pending_verification',
        up.data ->> 'blank_or_null_email_count',
        up.data ->> 'dup_lowercase_email_groups',
        up.data ->> 'existing_activation_token_rows',
        up.data ->> 'existing_plaintext_reset_code_rows',
        up.data ->> 'existing_hashed_reset_code_rows',
        up.data ->> 'invalid_existing_ev_status_count'
      )
    END,
    up.data
  FROM users_probe up

  UNION ALL

  -- 5a. Duplicate Learner Numbers check (guards uniq_children_learner_number)
  SELECT
    50,
    '5. UNIQUENESS',
    'duplicate_learner_numbers_check',
    CASE
      WHEN (cp.data ->> 'evaluated')::boolean IS NOT TRUE THEN 'FAIL'
      WHEN (cp.data ->> 'dup_child_learner_number_groups')::int > 0 THEN 'FAIL'
      ELSE 'PASS'
    END,
    CASE
      WHEN (cp.data ->> 'evaluated')::boolean IS NOT TRUE
        THEN COALESCE(cp.data ->> 'reason', 'children probe not evaluated')
      ELSE format(
        'children=%s (active=%s) | blank_ln=%s | missing_learner_user_id=%s | dup_learner_number_groups=%s',
        cp.data ->> 'children_total',
        cp.data ->> 'children_active_count',
        cp.data ->> 'children_blank_or_null_learner_number',
        cp.data ->> 'children_without_learner_user_id',
        cp.data ->> 'dup_child_learner_number_groups'
      )
    END,
    cp.data
  FROM children_probe cp

  UNION ALL

  -- 5b. Duplicate Application References & Duplicate Active Applications (guards 2 unique indexes)
  SELECT
    51,
    '5. UNIQUENESS',
    'duplicate_applications_and_active_intake_check',
    CASE
      WHEN (ap.data ->> 'evaluated')::boolean IS NOT TRUE THEN 'FAIL'
      WHEN (ap.data ->> 'dup_application_number_groups')::int > 0 THEN 'FAIL'
      WHEN (ap.data ->> 'dup_active_app_school_year_groups')::int > 0 THEN 'FAIL'
      WHEN (ap.data ->> 'non_canonical_status_count')::int > 0 THEN 'FAIL'
      ELSE 'PASS'
    END,
    CASE
      WHEN (ap.data ->> 'evaluated')::boolean IS NOT TRUE
        THEN COALESCE(ap.data ->> 'reason', 'applications probe not evaluated')
      ELSE format(
        'apps=%s | dup_app_ref_groups=%s | dup_active_school_year_groups=%s | non_canonical_status=%s | blank_ref=%s | blank_id=%s | blank_school=%s | blank_year=%s',
        ap.data ->> 'applications_total',
        ap.data ->> 'dup_application_number_groups',
        ap.data ->> 'dup_active_app_school_year_groups',
        ap.data ->> 'non_canonical_status_count',
        ap.data ->> 'blank_or_null_application_number',
        ap.data ->> 'blank_or_null_id_number',
        ap.data ->> 'blank_or_null_school_id',
        ap.data ->> 'blank_or_null_academic_year'
      )
    END,
    ap.data
  FROM applications_probe ap

  UNION ALL

  -- 6. Learner lifecycle, registrations, enrolments & parent-child diagnostic counts
  SELECT
    60,
    '6. LIFECYCLE_ENROLMENTS',
    'registrations_enrolments_and_family_links',
    CASE
      WHEN NOT tf.has_parent_children OR NOT tf.has_learner_enrolments THEN 'UNVERIFIED'
      ELSE 'INFO'
    END,
    format(
      'learner_registrations=%s | learner_enrolments=%s (active=%s) | parent_children=%s | existing_action_tokens=%s',
      COALESCE(lp.learner_registrations_count::text, 'MISSING_TABLE'),
      COALESCE(lp.learner_enrolments_count::text, 'MISSING_TABLE'),
      COALESCE(lp.active_enrolments_count::text, 'MISSING_TABLE'),
      COALESCE(lp.parent_children_count::text, 'MISSING_TABLE'),
      COALESCE(lp.existing_action_tokens_count::text, 'NOT_YET_CREATED')
    ),
    jsonb_build_object(
      'has_learner_registrations', tf.has_learner_regs,
      'learner_registrations_count', lp.learner_registrations_count,
      'has_learner_enrolments', tf.has_learner_enrolments,
      'learner_enrolments_count', lp.learner_enrolments_count,
      'active_enrolments_count', lp.active_enrolments_count,
      'has_parent_children', tf.has_parent_children,
      'parent_children_count', lp.parent_children_count,
      'has_account_action_tokens', tf.has_action_tokens,
      'existing_action_tokens_count', lp.existing_action_tokens_count
    )
  FROM table_flags tf CROSS JOIN lifecycle_probe lp
),

summary_verdict AS (
  SELECT
    99 AS sort_order,
    'V. PREFLIGHT_SUMMARY' AS section,
    'OPERATOR_PREFLIGHT_VERDICT' AS check_name,
    CASE
      WHEN EXISTS (SELECT 1 FROM checks WHERE status = 'FAIL') THEN 'FAIL'
      ELSE 'PASS'
    END AS status,
    CASE
      WHEN EXISTS (SELECT 1 FROM checks WHERE status = 'FAIL')
        THEN format(
          'BLOCKED: %s blocking check(s) failed (%s). DO NOT APPLY MIGRATION until resolved and re-verified.',
          (SELECT COUNT(*)::int FROM checks WHERE status = 'FAIL'),
          (SELECT string_agg(check_name, ', ' ORDER BY sort_order) FROM checks WHERE status = 'FAIL')
        )
      ELSE 'ALL AUTOMATED PREFLIGHT CHECKS PASSED. NOTE: This PASS confirms structural/duplicate readiness ONLY and does NOT authorize migration or deployment.'
    END AS detail,
    jsonb_build_object(
      'blocking_failures', COALESCE((SELECT jsonb_agg(check_name ORDER BY sort_order) FROM checks WHERE status = 'FAIL'), '[]'::jsonb),
      'unverified_notices', COALESCE((SELECT jsonb_agg(check_name ORDER BY sort_order) FROM checks WHERE status = 'UNVERIFIED'), '[]'::jsonb),
      'check_statuses', (SELECT jsonb_object_agg(check_name, status) FROM checks),
      'authorization_warning', 'A PASS result does NOT authorize production migration or deployment.'
    ) AS evidence_json
)

SELECT section, check_name, status, detail, evidence_json
FROM (
  SELECT * FROM section_identity
  UNION ALL SELECT * FROM checks
  UNION ALL SELECT * FROM summary_verdict
) final_rows
ORDER BY sort_order, check_name;
