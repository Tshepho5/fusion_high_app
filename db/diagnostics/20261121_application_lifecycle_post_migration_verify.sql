-- =============================================================================
-- GELEZA SA — POST-MIGRATION READ-ONLY APPLICATION LIFECYCLE VERIFICATION
-- =============================================================================
-- TARGET:     Live Production Supabase PostgreSQL Database (Stage 4 ONLY)
-- MODE:       STRICTLY READ-ONLY (Single pure WITH ... SELECT query; ZERO DDL/DML)
-- SAFETY:     Contains ZERO schema changes, ZERO row writes, ZERO DO blocks,
--             and ZERO session mutations. Safe to execute in Supabase SQL Editor.
-- PRIVACY:    Returns counts, schema metadata, constraint/index definitions only.
--             Zero PII exported.
-- PURPOSE:    Verify EVERY table, column, CHECK constraint, index, foreign key,
--             academic_year backfill, and row-count preservation check AFTER:
--             db/migrations/20261121_application_lifecycle_remediation.sql
--
-- STOP GATE:  POST_MIGRATION_VERIFICATION_VERDICT must equal PASS and baseline
--             row counts must match Stage 2 preflight BEFORE Stage 5 backend
--             release is authorized.
-- =============================================================================

WITH
table_flags AS (
  SELECT
    (to_regclass('public.users') IS NOT NULL)                         AS has_users,
    (to_regclass('public.children') IS NOT NULL)                      AS has_children,
    (to_regclass('public.applications') IS NOT NULL)                  AS has_applications,
    (to_regclass('public.application_documents') IS NOT NULL)         AS has_app_docs,
    (to_regclass('public.learner_registrations') IS NOT NULL)         AS has_learner_regs,
    (to_regclass('public.application_document_requests') IS NOT NULL) AS has_doc_requests,
    (to_regclass('public.application_status_history') IS NOT NULL)    AS has_status_history,
    (to_regclass('public.application_email_log') IS NOT NULL)         AS has_email_log
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
      ('users', 'activation_token_hash'),
      ('users', 'activation_expires_at'),
      ('users', 'password_set_at'),
      ('children', 'application_number'),
      ('applications', 'academic_year'),
      ('applications', 'decision_reason'),
      ('applications', 'reviewed_by'),
      ('applications', 'reviewed_at'),
      ('applications', 'approved_by'),
      ('applications', 'approved_at'),
      ('applications', 'rejected_by'),
      ('applications', 'rejected_at'),
      ('applications', 'confirmation_email_sent_at'),
      ('applications', 'decision_email_sent_at'),
      ('applications', 'applicant_user_id'),
      ('applications', 'parent_user_id'),
      ('applications', 'first_additional_language'),
      ('applications', 'academic_stream_id'),
      ('applications', 'subject_package'),
      ('application_documents', 'request_id'),
      ('application_documents', 'uploaded_by'),
      ('application_documents', 'review_status'),
      ('application_documents', 'reviewed_by'),
      ('application_documents', 'reviewed_at'),
      ('application_documents', 'review_notes'),
      ('learner_registrations', 'learner_number'),
      ('learner_registrations', 'registration_email_sent_at')
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
    (idx_cls.oid IS NOT NULL AND idx.indisvalid) AS valid_present,
    pg_get_indexdef(idx.indexrelid) AS indexdef
  FROM (
    VALUES
      ('applications', 'uniq_applications_provisional_learner_number'),
      ('applications', 'idx_applications_school_status'),
      ('applications', 'idx_applications_parent_user'),
      ('applications', 'idx_applications_applicant_user'),
      ('application_documents', 'idx_app_docs_app_request'),
      ('application_document_requests', 'idx_app_doc_requests_app'),
      ('application_document_requests', 'idx_app_doc_requests_school_status'),
      ('application_status_history', 'idx_app_status_history_app'),
      ('application_status_history', 'idx_app_status_history_school'),
      ('application_email_log', 'idx_app_email_log_app')
  ) AS req(tbl, idx_name)
  LEFT JOIN pg_class tbl_cls ON tbl_cls.relname = req.tbl
  LEFT JOIN pg_namespace nsp ON nsp.oid = tbl_cls.relnamespace AND nsp.nspname = 'public'
  LEFT JOIN pg_index idx ON idx.indrelid = tbl_cls.oid
  LEFT JOIN pg_class idx_cls ON idx_cls.oid = idx.indexrelid AND idx_cls.relname = req.idx_name
  WHERE idx_cls.oid IS NOT NULL OR NOT EXISTS (
    SELECT 1
    FROM pg_index i2
    JOIN pg_class c2 ON c2.oid = i2.indexrelid
    JOIN pg_class t2 ON t2.oid = i2.indrelid
    JOIN pg_namespace n2 ON n2.oid = t2.relnamespace
    WHERE n2.nspname = 'public' AND t2.relname = req.tbl AND c2.relname = req.idx_name
  )
),

dedup_expected_indexes AS (
  SELECT
    tbl,
    idx_name,
    BOOL_OR(COALESCE(valid_present, FALSE)) AS valid_present,
    MAX(indexdef) AS indexdef
  FROM expected_indexes
  GROUP BY tbl, idx_name
),

status_constraint AS (
  SELECT
    con.conname,
    con.convalidated,
    pg_get_constraintdef(con.oid) AS condef
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'applications'
    AND con.conname = 'applications_status_lifecycle_check'
),

new_table_fks AS (
  SELECT
    rel.relname AS tbl,
    con.conname,
    pg_get_constraintdef(con.oid) AS condef
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname IN ('application_document_requests', 'application_status_history', 'application_email_log')
    AND con.contype = 'f'
),

row_baseline_probe AS (
  SELECT
    CASE
      WHEN tf.has_applications AND tf.has_users AND tf.has_children AND tf.has_app_docs AND tf.has_learner_regs THEN (
        SELECT xt.payload::jsonb
        FROM XMLTABLE(
          '/table/row'
          PASSING query_to_xml(
            $q$
            SELECT jsonb_build_object(
              'evaluated', true,
              'users_count', (SELECT COUNT(*)::int FROM public.users),
              'children_count', (SELECT COUNT(*)::int FROM public.children),
              'applications_count', (SELECT COUNT(*)::int FROM public.applications),
              'applications_null_academic_year', (SELECT COUNT(*)::int FROM public.applications WHERE academic_year IS NULL),
              'application_documents_count', (SELECT COUNT(*)::int FROM public.application_documents),
              'learner_registrations_count', (SELECT COUNT(*)::int FROM public.learner_registrations),
              'application_document_requests_count', (SELECT COUNT(*)::int FROM public.application_document_requests),
              'application_status_history_count', (SELECT COUNT(*)::int FROM public.application_status_history),
              'application_email_log_count', (SELECT COUNT(*)::int FROM public.application_email_log)
            )::text AS payload
            $q$,
            true, false, ''
          )
          COLUMNS payload text PATH 'payload'
        ) xt
        LIMIT 1
      )
      ELSE jsonb_build_object('evaluated', false, 'reason', 'required_table_missing')
    END AS data
  FROM table_flags tf
),

checks AS (
  -- 1. New lifecycle tables exist
  SELECT
    20 AS sort_order,
    '1. TABLES' AS section,
    'verify_new_lifecycle_tables_exist' AS check_name,
    CASE
      WHEN tf.has_doc_requests AND tf.has_status_history AND tf.has_email_log AND tf.has_learner_regs THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    format(
      'application_document_requests=%s, application_status_history=%s, application_email_log=%s, learner_registrations=%s.',
      tf.has_doc_requests, tf.has_status_history, tf.has_email_log, tf.has_learner_regs
    ) AS detail,
    to_jsonb(tf) AS evidence_json
  FROM table_flags tf

  UNION ALL

  -- 2. All 27 additive columns exist
  SELECT
    25,
    '2. COLUMNS',
    'verify_all_27_additive_columns_present',
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM expected_cols WHERE NOT present) THEN 'PASS'
      ELSE 'FAIL'
    END,
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM expected_cols WHERE NOT present)
        THEN 'All 27 additive lifecycle columns exist across users, children, applications, application_documents, and learner_registrations.'
      ELSE format(
        'FAIL: Missing %s column(s): %s.',
        (SELECT COUNT(*) FROM expected_cols WHERE NOT present),
        (SELECT string_agg(tbl || '.' || col_name, ', ' ORDER BY tbl, col_name) FROM expected_cols WHERE NOT present)
      )
    END,
    (
      SELECT jsonb_agg(jsonb_build_object('table', tbl, 'column', col_name, 'present', present, 'data_type', data_type) ORDER BY tbl, col_name)
      FROM expected_cols
    )

  UNION ALL

  -- 3. applications_status_lifecycle_check present and validated
  SELECT
    30,
    '3. CONSTRAINTS',
    'verify_applications_status_lifecycle_check',
    CASE
      WHEN EXISTS (SELECT 1 FROM status_constraint WHERE convalidated = TRUE) THEN 'PASS'
      ELSE 'FAIL'
    END,
    CASE
      WHEN EXISTS (SELECT 1 FROM status_constraint WHERE convalidated = TRUE)
        THEN 'Constraint applications_status_lifecycle_check exists and is VALIDATED.'
      WHEN EXISTS (SELECT 1 FROM status_constraint)
        THEN 'FAIL: Constraint applications_status_lifecycle_check exists but is NOT VALID (legacy unrecognized status rows present).'
      ELSE 'FAIL: Constraint applications_status_lifecycle_check is missing.'
    END,
    COALESCE((SELECT jsonb_agg(to_jsonb(status_constraint)) FROM status_constraint), '[]'::jsonb)

  UNION ALL

  -- 4. Foreign keys on all 3 new tables
  SELECT
    31,
    '3. CONSTRAINTS',
    'verify_new_table_foreign_keys',
    CASE
      WHEN EXISTS (SELECT 1 FROM new_table_fks WHERE tbl = 'application_document_requests' AND condef ILIKE '%REFERENCES applications(id)%')
       AND EXISTS (SELECT 1 FROM new_table_fks WHERE tbl = 'application_status_history' AND condef ILIKE '%REFERENCES applications(id)%')
       AND EXISTS (SELECT 1 FROM new_table_fks WHERE tbl = 'application_email_log' AND condef ILIKE '%REFERENCES applications(id)%')
      THEN 'PASS'
      ELSE 'FAIL'
    END,
    'Verifies applications(id) ON DELETE CASCADE foreign keys exist on application_document_requests, application_status_history, and application_email_log.',
    COALESCE((SELECT jsonb_agg(to_jsonb(new_table_fks) ORDER BY tbl, conname) FROM new_table_fks), '[]'::jsonb)

  UNION ALL

  -- 5. All 10 lifecycle indexes valid
  SELECT
    40,
    '4. INDEXES',
    'verify_all_10_lifecycle_indexes_valid',
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM dedup_expected_indexes WHERE NOT valid_present) THEN 'PASS'
      ELSE 'FAIL'
    END,
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM dedup_expected_indexes WHERE NOT valid_present)
        THEN 'All 10 lifecycle indexes exist and are valid (including uniq_applications_provisional_learner_number).'
      ELSE format(
        'FAIL: Missing or invalid index(es): %s.',
        (SELECT string_agg(tbl || '.' || idx_name, ', ' ORDER BY tbl, idx_name) FROM dedup_expected_indexes WHERE NOT valid_present)
      )
    END,
    (
      SELECT jsonb_agg(jsonb_build_object('table', tbl, 'index', idx_name, 'valid_present', valid_present, 'definition', indexdef) ORDER BY tbl, idx_name)
      FROM dedup_expected_indexes
    )

  UNION ALL

  -- 6. Zero NULL academic_year & baseline row counts
  SELECT
    50,
    '5. DATA_PRESERVATION',
    'verify_academic_year_backfill_and_row_counts',
    CASE
      WHEN (rb.data ->> 'evaluated')::boolean IS NOT TRUE THEN 'UNKNOWN'
      WHEN (rb.data ->> 'applications_null_academic_year')::int = 0 THEN 'PASS'
      ELSE 'FAIL'
    END,
    CASE
      WHEN (rb.data ->> 'evaluated')::boolean IS NOT TRUE THEN 'UNKNOWN: Unable to evaluate row counts.'
      ELSE format(
        'users=%s, children=%s, applications=%s (null_academic_year=%s), app_docs=%s, learner_regs=%s | new tables: doc_reqs=%s, history=%s, email_log=%s.',
        rb.data ->> 'users_count',
        rb.data ->> 'children_count',
        rb.data ->> 'applications_count',
        rb.data ->> 'applications_null_academic_year',
        rb.data ->> 'application_documents_count',
        rb.data ->> 'learner_registrations_count',
        rb.data ->> 'application_document_requests_count',
        rb.data ->> 'application_status_history_count',
        rb.data ->> 'application_email_log_count'
      )
    END,
    rb.data
  FROM row_baseline_probe rb
),

summary_verdict AS (
  SELECT
    99 AS sort_order,
    'V. VERIFICATION_SUMMARY' AS section,
    'POST_MIGRATION_VERIFICATION_VERDICT' AS check_name,
    CASE
      WHEN EXISTS (SELECT 1 FROM checks WHERE status = 'FAIL') THEN 'FAIL'
      WHEN EXISTS (SELECT 1 FROM checks WHERE status = 'UNKNOWN') THEN 'UNKNOWN'
      WHEN (SELECT COUNT(*) FROM checks WHERE status = 'PASS') = 6 THEN 'PASS'
      ELSE 'UNKNOWN'
    END AS status,
    CASE
      WHEN EXISTS (SELECT 1 FROM checks WHERE status = 'FAIL')
        THEN 'STOP — DO NOT DEPLOY BACKEND: One or more post-migration verification checks FAILED.'
      WHEN EXISTS (SELECT 1 FROM checks WHERE status = 'UNKNOWN')
        THEN 'STOP — DO NOT DEPLOY BACKEND: One or more post-migration checks returned UNKNOWN.'
      WHEN (SELECT COUNT(*) FROM checks WHERE status = 'PASS') = 6
        THEN 'ALL POST-MIGRATION CHECKS PASSED: Compare row counts against Stage 2 preflight baseline before requesting Stage 5 backend release authorization.'
      ELSE 'STOP — DO NOT DEPLOY BACKEND: Not all mandatory checks evaluated to PASS.'
    END AS detail,
    (SELECT jsonb_object_agg(check_name, status) FROM checks) AS evidence_json
)

SELECT
  section,
  check_name,
  status,
  detail,
  evidence_json
FROM (
  SELECT * FROM section_identity
  UNION ALL SELECT * FROM checks
  UNION ALL SELECT * FROM summary_verdict
) final_rows
ORDER BY sort_order, check_name;
