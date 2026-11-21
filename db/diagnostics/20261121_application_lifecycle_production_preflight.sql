-- =============================================================================
-- GELEZA SA — LIVE PRODUCTION READ-ONLY APPLICATION LIFECYCLE PREFLIGHT DIAGNOSTIC
-- =============================================================================
-- TARGET:     Live Production Supabase PostgreSQL Database (Stage 2 ONLY)
-- MODE:       STRICTLY READ-ONLY (Single pure WITH ... SELECT query; ZERO DDL/DML)
-- SAFETY:     Contains ZERO INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, TRUNCATE,
--             EXECUTE, DO blocks, or write-capable functions. Safe to paste and
--             execute directly in the Supabase SQL Editor.
--             (If running via psql, you may optionally wrap with:
--              BEGIN TRANSACTION READ ONLY; ... ROLLBACK;)
-- PRIVACY:    Returns counts, schema metadata, constraint/index definitions, and
--             minimal numeric row IDs only when a conflict exists. NEVER exports
--             applicant names, emails, phone numbers, SA IDs, tokens, or passwords.
-- PURPOSE:    Verify live production schema prerequisites, legacy statuses,
--             Learner Number uniqueness, registration & enrolment integrity,
--             curriculum coordination status, and rollback baseline BEFORE
--             authorizing migration:
--             db/migrations/20261121_application_lifecycle_remediation.sql
--
-- DO NOT EXECUTE ANY MIGRATION DURING THIS STEP.
-- =============================================================================

WITH
-- ---------------------------------------------------------------------------
-- 0. Table Existence Discovery (safe on any schema revision)
-- ---------------------------------------------------------------------------
table_flags AS (
  SELECT
    (to_regclass('public.schools') IS NOT NULL)                        AS has_schools,
    (to_regclass('public.users') IS NOT NULL)                          AS has_users,
    (to_regclass('public.roles') IS NOT NULL)                          AS has_roles,
    (to_regclass('public.applications') IS NOT NULL)                   AS has_applications,
    (to_regclass('public.application_documents') IS NOT NULL)          AS has_app_docs,
    (to_regclass('public.children') IS NOT NULL)                       AS has_children,
    (to_regclass('public.classes') IS NOT NULL)                        AS has_classes,
    (to_regclass('public.learner_registrations') IS NOT NULL)          AS has_learner_regs,
    (to_regclass('public.learner_registration_consents') IS NOT NULL)  AS has_reg_consents,
    (to_regclass('public.learner_deregistration_requests') IS NOT NULL) AS has_dereg_reqs,
    (to_regclass('public.learner_enrolments') IS NOT NULL)             AS has_enrolments,
    (to_regclass('public.school_subject_offerings') IS NOT NULL)       AS has_offerings,
    (to_regclass('public.academic_streams') IS NOT NULL)               AS has_streams,
    (to_regclass('public.application_document_requests') IS NOT NULL)  AS has_doc_requests,
    (to_regclass('public.application_status_history') IS NOT NULL)     AS has_status_history,
    (to_regclass('public.application_email_log') IS NOT NULL)          AS has_email_log
),

-- ---------------------------------------------------------------------------
-- 0. Database Identity
-- ---------------------------------------------------------------------------
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
      'read_only_session', current_setting('default_transaction_read_only'),
      'checked_at_utc', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ) AS evidence_json
),

-- ---------------------------------------------------------------------------
-- A. Table Existence & Migration Prerequisite Checks
-- ---------------------------------------------------------------------------
section_tables AS (
  SELECT
    20 + ord AS sort_order,
    'A. TABLE_EXISTENCE' AS section,
    'table_' || tbl AS check_name,
    CASE
      WHEN tbl IN ('schools', 'users', 'roles', 'applications', 'application_documents', 'children') AND NOT exists_flag THEN 'FAIL'
      WHEN tbl = 'learner_registrations' AND NOT exists_flag THEN 'FAIL'
      WHEN exists_flag THEN 'PASS'
      ELSE 'INFO'
    END AS status,
    CASE
      WHEN exists_flag THEN format('Table public.%s exists.', tbl)
      WHEN tbl = 'learner_registrations' THEN 'PREREQUISITE MISSING: public.learner_registrations does not exist yet. Apply 20261121_integrated_learner_registration.sql BEFORE 20261121_application_lifecycle_remediation.sql.'
      WHEN tbl IN ('schools', 'users', 'roles', 'applications', 'application_documents', 'children') THEN format('CRITICAL: Required core table public.%s is missing.', tbl)
      ELSE format('Table public.%s does not exist yet (migration will create or handle cleanly).', tbl)
    END AS detail,
    jsonb_build_object('table', tbl, 'exists', exists_flag) AS evidence_json
  FROM (
    SELECT  1 AS ord, 'schools' AS tbl, has_schools AS exists_flag FROM table_flags
    UNION ALL SELECT  2, 'users', has_users FROM table_flags
    UNION ALL SELECT  3, 'roles', has_roles FROM table_flags
    UNION ALL SELECT  4, 'applications', has_applications FROM table_flags
    UNION ALL SELECT  5, 'application_documents', has_app_docs FROM table_flags
    UNION ALL SELECT  6, 'children', has_children FROM table_flags
    UNION ALL SELECT  7, 'classes', has_classes FROM table_flags
    UNION ALL SELECT  8, 'learner_registrations', has_learner_regs FROM table_flags
    UNION ALL SELECT  9, 'learner_registration_consents', has_reg_consents FROM table_flags
    UNION ALL SELECT 10, 'learner_deregistration_requests', has_dereg_reqs FROM table_flags
    UNION ALL SELECT 11, 'learner_enrolments', has_enrolments FROM table_flags
    UNION ALL SELECT 12, 'school_subject_offerings', has_offerings FROM table_flags
    UNION ALL SELECT 13, 'academic_streams', has_streams FROM table_flags
    UNION ALL SELECT 14, 'application_document_requests', has_doc_requests FROM table_flags
    UNION ALL SELECT 15, 'application_status_history', has_status_history FROM table_flags
    UNION ALL SELECT 16, 'application_email_log', has_email_log FROM table_flags
  ) t
),

-- ---------------------------------------------------------------------------
-- B. Existing Column Metadata & Additive Column Type Compatibility
-- ---------------------------------------------------------------------------
section_columns AS (
  SELECT
    40 + t.ord AS sort_order,
    'B. COLUMN_METADATA' AS section,
    'columns_' || t.tbl AS check_name,
    'INFO' AS status,
    CASE
      WHEN COALESCE(c.col_count, 0) = 0 THEN format('Table public.%s does not exist (0 columns).', t.tbl)
      ELSE format('%s column(s) discovered on public.%s.', c.col_count, t.tbl)
    END AS detail,
    COALESCE(c.cols_json, '[]'::jsonb) AS evidence_json
  FROM (
    VALUES
      (1, 'applications'),
      (2, 'application_documents'),
      (3, 'learner_registrations'),
      (4, 'children'),
      (5, 'users'),
      (6, 'learner_enrolments')
  ) AS t(ord, tbl)
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*)::int AS col_count,
      jsonb_agg(
        jsonb_build_object(
          'column', column_name,
          'data_type', data_type,
          'udt_name', udt_name,
          'max_length', character_maximum_length,
          'nullable', is_nullable,
          'default', column_default
        )
        ORDER BY ordinal_position
      ) AS cols_json
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = t.tbl
  ) c ON TRUE
),

required_base_cols AS (
  SELECT
    req.tbl,
    req.col_name,
    req.purpose,
    (col.column_name IS NOT NULL) AS col_exists,
    col.data_type,
    col.character_maximum_length
  FROM (
    VALUES
      ('applications', 'id', 'Primary key referenced by new lifecycle FKs'),
      ('applications', 'school_id', 'School tenant scope & new index'),
      ('applications', 'application_number', 'Application reference identifier'),
      ('applications', 'status', 'Status CHECK widening & lifecycle state machine'),
      ('applications', 'provisional_learner_number', 'Queried directly by migration unique-index guard'),
      ('applications', 'grade_applied', 'Applied grade for approval/registration'),
      ('applications', 'first_name', 'Applicant name'),
      ('applications', 'surname', 'Applicant surname'),
      ('applications', 'primary_parent_email', 'Mandatory approval/tracking recipient'),
      ('applications', 'created_at', 'Backfill source for NULL academic_year'),
      ('users', 'id', 'Primary key'),
      ('users', 'email', 'Account identity'),
      ('users', 'password_hash', 'Passwordless account detection'),
      ('children', 'id', 'Primary key'),
      ('children', 'school_id', 'School tenant scope'),
      ('children', 'learner_number', 'Official Learner Number uniqueness check'),
      ('application_documents', 'id', 'Primary key'),
      ('application_documents', 'application_id', 'Parent application link & new index')
  ) AS req(tbl, col_name, purpose)
  LEFT JOIN information_schema.columns col
    ON col.table_schema = 'public'
   AND col.table_name = req.tbl
   AND col.column_name = req.col_name
),

section_required_base_cols AS (
  SELECT
    50 AS sort_order,
    'B. COLUMN_COMPATIBILITY' AS section,
    'required_existing_base_columns' AS check_name,
    CASE
      WHEN EXISTS (SELECT 1 FROM required_base_cols WHERE NOT col_exists) THEN 'FAIL'
      ELSE 'PASS'
    END AS status,
    CASE
      WHEN EXISTS (SELECT 1 FROM required_base_cols WHERE NOT col_exists) THEN format(
        'FAIL: %s required existing column(s) missing: %s.',
        (SELECT COUNT(*) FROM required_base_cols WHERE NOT col_exists),
        (SELECT string_agg(tbl || '.' || col_name, ', ' ORDER BY tbl, col_name) FROM required_base_cols WHERE NOT col_exists)
      )
      ELSE format('All %s required base columns exist across core tables.', (SELECT COUNT(*) FROM required_base_cols))
    END AS detail,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'table', tbl,
          'column', col_name,
          'exists', col_exists,
          'data_type', data_type,
          'max_length', character_maximum_length,
          'purpose', purpose
        )
        ORDER BY tbl, col_name
      )
      FROM required_base_cols
    ) AS evidence_json
),

additive_col_compat AS (
  SELECT
    req.tbl,
    req.col_name,
    req.expected_desc,
    col.data_type,
    col.character_maximum_length,
    CASE
      WHEN to_regclass('public.' || req.tbl) IS NULL THEN 'INFO'
      WHEN col.column_name IS NULL THEN 'PASS'
      WHEN req.expected_kind = 'int' AND col.data_type IN ('integer', 'bigint', 'smallint') THEN 'PASS'
      WHEN req.expected_kind = 'timestamptz' AND col.data_type IN ('timestamp with time zone', 'timestamp without time zone') THEN 'PASS'
      WHEN req.expected_kind = 'text' AND col.data_type IN ('character varying', 'text') THEN 'PASS'
      WHEN req.expected_kind = 'jsonb' AND col.data_type IN ('jsonb', 'json') THEN 'PASS'
      ELSE 'FAIL'
    END AS compat_status
  FROM (
    VALUES
      ('users', 'activation_token_hash', 'text', 'VARCHAR(64) or TEXT'),
      ('users', 'activation_expires_at', 'timestamptz', 'TIMESTAMPTZ'),
      ('users', 'password_set_at', 'timestamptz', 'TIMESTAMPTZ'),
      ('children', 'application_number', 'text', 'VARCHAR(60) or TEXT'),
      ('applications', 'academic_year', 'int', 'INTEGER'),
      ('applications', 'decision_reason', 'text', 'TEXT'),
      ('applications', 'reviewed_by', 'int', 'INTEGER'),
      ('applications', 'reviewed_at', 'timestamptz', 'TIMESTAMPTZ'),
      ('applications', 'approved_by', 'int', 'INTEGER'),
      ('applications', 'approved_at', 'timestamptz', 'TIMESTAMPTZ'),
      ('applications', 'rejected_by', 'int', 'INTEGER'),
      ('applications', 'rejected_at', 'timestamptz', 'TIMESTAMPTZ'),
      ('applications', 'confirmation_email_sent_at', 'timestamptz', 'TIMESTAMPTZ'),
      ('applications', 'decision_email_sent_at', 'timestamptz', 'TIMESTAMPTZ'),
      ('applications', 'applicant_user_id', 'int', 'INTEGER'),
      ('applications', 'parent_user_id', 'int', 'INTEGER'),
      ('applications', 'first_additional_language', 'text', 'VARCHAR(80) or TEXT'),
      ('applications', 'academic_stream_id', 'int', 'INTEGER'),
      ('applications', 'subject_package', 'jsonb', 'JSONB'),
      ('application_documents', 'request_id', 'int', 'INTEGER'),
      ('application_documents', 'uploaded_by', 'int', 'INTEGER'),
      ('application_documents', 'review_status', 'text', 'VARCHAR(30) or TEXT'),
      ('application_documents', 'reviewed_by', 'int', 'INTEGER'),
      ('application_documents', 'reviewed_at', 'timestamptz', 'TIMESTAMPTZ'),
      ('application_documents', 'review_notes', 'text', 'TEXT'),
      ('learner_registrations', 'learner_number', 'text', 'VARCHAR(50) or TEXT'),
      ('learner_registrations', 'registration_email_sent_at', 'timestamptz', 'TIMESTAMPTZ')
  ) AS req(tbl, col_name, expected_kind, expected_desc)
  LEFT JOIN information_schema.columns col
    ON col.table_schema = 'public'
   AND col.table_name = req.tbl
   AND col.column_name = req.col_name
),

section_additive_col_compat AS (
  SELECT
    51 AS sort_order,
    'B. COLUMN_COMPATIBILITY' AS section,
    'additive_columns_type_compatibility' AS check_name,
    CASE
      WHEN EXISTS (SELECT 1 FROM additive_col_compat WHERE compat_status = 'FAIL') THEN 'FAIL'
      ELSE 'PASS'
    END AS status,
    CASE
      WHEN EXISTS (SELECT 1 FROM additive_col_compat WHERE compat_status = 'FAIL') THEN format(
        'FAIL: %s pre-existing additive column(s) have incompatible types.',
        (SELECT COUNT(*) FROM additive_col_compat WHERE compat_status = 'FAIL')
      )
      ELSE format(
        'All %s target additive columns are either absent (ready to add) or already present with compatible types (%s already present).',
        (SELECT COUNT(*) FROM additive_col_compat),
        (SELECT COUNT(*) FROM additive_col_compat WHERE data_type IS NOT NULL)
      )
    END AS detail,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'table', tbl,
          'column', col_name,
          'expected', expected_desc,
          'actual_type', data_type,
          'max_length', character_maximum_length,
          'status', compat_status
        )
        ORDER BY tbl, col_name
      )
      FROM additive_col_compat
    ) AS evidence_json
),

-- ---------------------------------------------------------------------------
-- C. Constraints, Multi-Column Status CHECK Guard, Foreign Keys & Indexes
-- ---------------------------------------------------------------------------
raw_constraints AS (
  SELECT
    rel.relname AS tbl,
    con.conname,
    con.contype,
    con.convalidated,
    COALESCE(array_length(con.conkey, 1), 0) AS col_count,
    pg_get_constraintdef(con.oid) AS definition,
    (
      rel.relname = 'applications'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%status%'
      AND pg_get_constraintdef(con.oid) NOT ILIKE '%fee_status%'
      AND pg_get_constraintdef(con.oid) NOT ILIKE '%ai_verification_status%'
    ) AS mentions_app_status
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname IN (
      'applications', 'application_documents', 'learner_registrations',
      'children', 'users', 'application_document_requests',
      'application_status_history', 'application_email_log'
    )
),

section_constraints AS (
  SELECT
    60 AS sort_order,
    'C. CONSTRAINTS' AS section,
    'applications_status_check_compatibility' AS check_name,
    CASE
      WHEN NOT tf.has_applications THEN 'FAIL'
      WHEN EXISTS (
        SELECT 1 FROM raw_constraints
        WHERE mentions_app_status AND col_count > 1
      ) THEN 'FAIL'
      ELSE 'PASS'
    END AS status,
    CASE
      WHEN NOT tf.has_applications THEN 'FAIL: Table public.applications does not exist.'
      WHEN EXISTS (SELECT 1 FROM raw_constraints WHERE mentions_app_status AND col_count > 1)
        THEN 'FAIL: Multi-column CHECK constraint referencing applications.status detected; migration only drops single-column status CHECK constraints.'
      ELSE format(
        '%s single-column status CHECK constraint(s) found on public.applications; 0 multi-column status CHECK conflicts.',
        (SELECT COUNT(*) FROM raw_constraints WHERE mentions_app_status AND col_count = 1)
      )
    END AS detail,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'name', conname,
          'col_count', col_count,
          'validated', convalidated,
          'definition', definition
        )
        ORDER BY conname
      )
      FROM raw_constraints
      WHERE tbl = 'applications' AND contype = 'c'
    ), '[]'::jsonb) AS evidence_json
  FROM table_flags tf

  UNION ALL

  SELECT
    61,
    'C. CONSTRAINTS',
    'all_lifecycle_foreign_keys_and_constraints',
    'INFO',
    format('%s constraint(s) inspected across lifecycle tables.', (SELECT COUNT(*) FROM raw_constraints)),
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'table', tbl,
          'name', conname,
          'type', CASE contype
            WHEN 'c' THEN 'CHECK'
            WHEN 'f' THEN 'FOREIGN KEY'
            WHEN 'p' THEN 'PRIMARY KEY'
            WHEN 'u' THEN 'UNIQUE'
            ELSE contype::text
          END,
          'validated', convalidated,
          'definition', definition
        )
        ORDER BY tbl, contype, conname
      )
      FROM raw_constraints
    ), '[]'::jsonb)
  FROM table_flags tf

  UNION ALL

  SELECT
    62,
    'C. INDEXES',
    'existing_lifecycle_indexes',
    'INFO',
    format('%s index(es) inspected across lifecycle tables.', (
      SELECT COUNT(*) FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename IN (
          'applications', 'application_documents', 'learner_registrations',
          'children', 'users', 'learner_enrolments',
          'application_document_requests', 'application_status_history', 'application_email_log'
        )
    )),
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'table', tablename,
          'name', indexname,
          'definition', indexdef
        )
        ORDER BY tablename, indexname
      )
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename IN (
          'applications', 'application_documents', 'learner_registrations',
          'children', 'users', 'learner_enrolments',
          'application_document_requests', 'application_status_history', 'application_email_log'
        )
    ), '[]'::jsonb)
  FROM table_flags tf
),

-- ---------------------------------------------------------------------------
-- D & E. Dynamic Read-Only Data Integrity, Statuses, Learner Numbers & Links
-- Guarded by table existence + to_jsonb() so missing columns NEVER crash.
-- Zero PII: aggregate counts and minimal numeric IDs only on conflicts.
-- ---------------------------------------------------------------------------
applications_probe AS (
  SELECT
    CASE
      WHEN tf.has_applications AND tf.has_schools THEN (
        SELECT xt.payload::jsonb
        FROM XMLTABLE(
          '/table/row'
          PASSING query_to_xml(
            $q$
            WITH base AS (
              SELECT
                a.id,
                a.school_id,
                NULLIF(TRIM(COALESCE(to_jsonb(a) ->> 'application_number', '')), '') AS app_no,
                to_jsonb(a) ->> 'status' AS raw_status,
                NULLIF(TRIM(COALESCE(to_jsonb(a) ->> 'provisional_learner_number', '')), '') AS prov_ln,
                NULLIF(TRIM(COALESCE(to_jsonb(a) ->> 'academic_year', '')), '') AS acad_yr,
                NULLIF(TRIM(COALESCE(to_jsonb(a) ->> 'primary_parent_email', '')), '') AS has_parent_email
              FROM public.applications a
            ),
            status_dist AS (
              SELECT COALESCE(raw_status, '<NULL>') AS status_val, COUNT(*)::int AS cnt
              FROM base
              GROUP BY 1
            ),
            unknown_statuses AS (
              SELECT COALESCE(raw_status, '<NULL>') AS status_val, COUNT(*)::int AS cnt
              FROM base
              WHERE raw_status IS NOT NULL AND raw_status NOT IN (
                'draft', 'pending', 'pending_payment', 'awaiting_review', 'submitted',
                'under_ai_review', 'under_review', 'action_required', 'documents_requested',
                'documents_submitted', 'documents_under_review', 'waitlisted',
                'accepted', 'approved', 'declined', 'rejected',
                'enrollment_pending', 'registered', 'enrolled', 'withdrawn', 'cancelled'
              )
              GROUP BY 1
            ),
            dup_app_no AS (
              SELECT app_no, COUNT(*)::int AS cnt, array_agg(id ORDER BY id) AS ids
              FROM base
              WHERE app_no IS NOT NULL
              GROUP BY 1
              HAVING COUNT(*) > 1
            ),
            dup_prov_ln AS (
              SELECT prov_ln, COUNT(*)::int AS cnt, array_agg(id ORDER BY id) AS ids
              FROM base
              WHERE prov_ln IS NOT NULL
              GROUP BY 1
              HAVING COUNT(*) > 1
            ),
            orphan_schools AS (
              SELECT b.id
              FROM base b
              LEFT JOIN public.schools s ON s.id = b.school_id
              WHERE b.school_id IS NULL OR s.id IS NULL
            )
            SELECT jsonb_build_object(
              'evaluated', true,
              'total_applications', (SELECT COUNT(*)::int FROM base),
              'status_distribution', COALESCE((SELECT jsonb_object_agg(status_val, cnt) FROM status_dist), '{}'::jsonb),
              'unknown_status_group_count', (SELECT COUNT(*)::int FROM unknown_statuses),
              'unknown_statuses', COALESCE((SELECT jsonb_object_agg(status_val, cnt) FROM unknown_statuses), '{}'::jsonb),
              'null_academic_year_count', (SELECT COUNT(*)::int FROM base WHERE acad_yr IS NULL),
              'missing_parent_email_count', (SELECT COUNT(*)::int FROM base WHERE has_parent_email IS NULL),
              'orphan_or_null_school_count', (SELECT COUNT(*)::int FROM orphan_schools),
              'orphan_or_null_school_ids', COALESCE((SELECT jsonb_agg(id ORDER BY id) FROM orphan_schools), '[]'::jsonb),
              'duplicate_application_number_groups', (SELECT COUNT(*)::int FROM dup_app_no),
              'duplicate_application_numbers', COALESCE((SELECT jsonb_agg(jsonb_build_object('count', cnt, 'ids', ids)) FROM dup_app_no), '[]'::jsonb),
              'with_provisional_learner_number_count', (SELECT COUNT(*)::int FROM base WHERE prov_ln IS NOT NULL),
              'duplicate_provisional_learner_number_groups', (SELECT COUNT(*)::int FROM dup_prov_ln),
              'duplicate_provisional_learner_numbers', COALESCE((SELECT jsonb_agg(jsonb_build_object('count', cnt, 'ids', ids)) FROM dup_prov_ln), '[]'::jsonb),
              'extended_status_count', (
                SELECT COUNT(*)::int FROM base
                WHERE raw_status IN ('draft', 'under_review', 'documents_requested', 'documents_submitted', 'documents_under_review', 'enrollment_pending', 'withdrawn', 'cancelled')
              )
            )::text AS payload
            $q$,
            true, false, ''
          )
          COLUMNS payload text PATH 'payload'
        ) xt
        LIMIT 1
      )
      ELSE jsonb_build_object('evaluated', false, 'reason', 'applications_or_schools_missing')
    END AS data
  FROM table_flags tf
),

children_and_links_probe AS (
  SELECT
    CASE
      WHEN tf.has_children AND tf.has_schools AND tf.has_applications THEN (
        SELECT xt.payload::jsonb
        FROM XMLTABLE(
          '/table/row'
          PASSING query_to_xml(
            $q$
            WITH ch AS (
              SELECT
                c.id,
                c.school_id,
                NULLIF(TRIM(COALESCE(to_jsonb(c) ->> 'learner_number', '')), '') AS ln,
                NULLIF(TRIM(COALESCE(to_jsonb(c) ->> 'application_number', '')), '') AS app_no,
                to_jsonb(c) ->> 'parent_id' AS parent_id,
                to_jsonb(c) ->> 'learner_user_id' AS learner_user_id
              FROM public.children c
            ),
            dup_child_ln AS (
              SELECT ln, COUNT(*)::int AS cnt, array_agg(id ORDER BY id) AS ids
              FROM ch
              WHERE ln IS NOT NULL
              GROUP BY 1
              HAVING COUNT(*) > 1
            ),
            cross_school_ln_collision AS (
              SELECT a.id AS application_id, c.id AS child_id, a.school_id AS app_school_id, c.school_id AS child_school_id
              FROM public.applications a
              JOIN ch c ON NULLIF(TRIM(COALESCE(to_jsonb(a) ->> 'provisional_learner_number', '')), '') = c.ln
              WHERE c.ln IS NOT NULL AND a.school_id IS DISTINCT FROM c.school_id
            ),
            orphan_child_school AS (
              SELECT ch.id FROM ch LEFT JOIN public.schools s ON s.id = ch.school_id WHERE ch.school_id IS NULL OR s.id IS NULL
            )
            SELECT jsonb_build_object(
              'evaluated', true,
              'total_children', (SELECT COUNT(*)::int FROM ch),
              'children_with_learner_number', (SELECT COUNT(*)::int FROM ch WHERE ln IS NOT NULL),
              'duplicate_child_learner_number_groups', (SELECT COUNT(*)::int FROM dup_child_ln),
              'duplicate_child_learner_numbers', COALESCE((SELECT jsonb_agg(jsonb_build_object('count', cnt, 'ids', ids)) FROM dup_child_ln), '[]'::jsonb),
              'cross_school_learner_number_collisions', (SELECT COUNT(*)::int FROM cross_school_ln_collision),
              'cross_school_collision_pairs', COALESCE((SELECT jsonb_agg(to_jsonb(cross_school_ln_collision)) FROM cross_school_ln_collision), '[]'::jsonb),
              'orphan_child_school_count', (SELECT COUNT(*)::int FROM orphan_child_school),
              'total_users', (SELECT COUNT(*)::int FROM public.users),
              'total_schools', (SELECT COUNT(*)::int FROM public.schools)
            )::text AS payload
            $q$,
            true, false, ''
          )
          COLUMNS payload text PATH 'payload'
        ) xt
        LIMIT 1
      )
      ELSE jsonb_build_object('evaluated', false, 'reason', 'core_table_missing')
    END AS data
  FROM table_flags tf
),

docs_and_regs_probe AS (
  SELECT
    CASE
      WHEN tf.has_app_docs AND tf.has_applications THEN (
        SELECT xt.payload::jsonb
        FROM XMLTABLE(
          '/table/row'
          PASSING query_to_xml(
            $q$
            SELECT jsonb_build_object(
              'evaluated', true,
              'total_application_documents', (SELECT COUNT(*)::int FROM public.application_documents),
              'orphan_application_documents', (
                SELECT COUNT(*)::int
                FROM public.application_documents d
                LEFT JOIN public.applications a ON a.id = d.application_id
                WHERE d.application_id IS NULL OR a.id IS NULL
              )
            )::text AS payload
            $q$,
            true, false, ''
          )
          COLUMNS payload text PATH 'payload'
        ) xt
        LIMIT 1
      )
      ELSE jsonb_build_object('evaluated', false, 'reason', 'application_documents_missing')
    END AS docs_data,
    CASE
      WHEN tf.has_learner_regs AND tf.has_applications THEN (
        SELECT xt.payload::jsonb
        FROM XMLTABLE(
          '/table/row'
          PASSING query_to_xml(
            $q$
            WITH orphan_regs AS (
              SELECT lr.id FROM public.learner_registrations lr
              LEFT JOIN public.applications a ON a.id = lr.application_id
              WHERE a.id IS NULL
            ),
            cross_school_regs AS (
              SELECT lr.id, lr.school_id AS reg_school_id, a.school_id AS app_school_id
              FROM public.learner_registrations lr
              JOIN public.applications a ON a.id = lr.application_id
              WHERE lr.school_id IS DISTINCT FROM a.school_id
            ),
            dup_active_regs AS (
              SELECT child_id, academic_year, COUNT(*)::int AS cnt, array_agg(id ORDER BY id) AS ids
              FROM public.learner_registrations
              WHERE child_id IS NOT NULL AND status IN ('completed', 'deregistration_requested')
              GROUP BY 1, 2
              HAVING COUNT(*) > 1
            )
            SELECT jsonb_build_object(
              'evaluated', true,
              'total_registrations', (SELECT COUNT(*)::int FROM public.learner_registrations),
              'orphan_registration_count', (SELECT COUNT(*)::int FROM orphan_regs),
              'orphan_registration_ids', COALESCE((SELECT jsonb_agg(id ORDER BY id) FROM orphan_regs), '[]'::jsonb),
              'cross_school_registration_mismatch_count', (SELECT COUNT(*)::int FROM cross_school_regs),
              'cross_school_registration_mismatches', COALESCE((SELECT jsonb_agg(to_jsonb(cross_school_regs)) FROM cross_school_regs), '[]'::jsonb),
              'duplicate_active_registration_groups', (SELECT COUNT(*)::int FROM dup_active_regs)
            )::text AS payload
            $q$,
            true, false, ''
          )
          COLUMNS payload text PATH 'payload'
        ) xt
        LIMIT 1
      )
      ELSE jsonb_build_object('evaluated', false, 'reason', 'learner_registrations_missing')
    END AS regs_data,
    CASE
      WHEN tf.has_enrolments THEN (
        SELECT xt.payload::jsonb
        FROM XMLTABLE(
          '/table/row'
          PASSING query_to_xml(
            $q$
            WITH dup_enrol AS (
              SELECT child_id, academic_year, COUNT(*)::int AS cnt, array_agg(id ORDER BY id) AS ids
              FROM public.learner_enrolments
              WHERE status = 'active'
              GROUP BY 1, 2
              HAVING COUNT(*) > 1
            )
            SELECT jsonb_build_object(
              'evaluated', true,
              'total_enrolments', (SELECT COUNT(*)::int FROM public.learner_enrolments),
              'duplicate_active_enrolment_groups', (SELECT COUNT(*)::int FROM dup_enrol),
              'duplicate_active_enrolments', COALESCE((SELECT jsonb_agg(to_jsonb(dup_enrol)) FROM dup_enrol), '[]'::jsonb)
            )::text AS payload
            $q$,
            true, false, ''
          )
          COLUMNS payload text PATH 'payload'
        ) xt
        LIMIT 1
      )
      ELSE jsonb_build_object('evaluated', false, 'reason', 'learner_enrolments_missing')
    END AS enrol_data
  FROM table_flags tf
),

-- ---------------------------------------------------------------------------
-- F. Curriculum Coordination & Rollback Baseline Probes
-- ---------------------------------------------------------------------------
curriculum_coord_probe AS (
  SELECT
    tf.has_offerings,
    tf.has_streams,
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'school_subject_offerings' AND column_name = 'stream_name'
    ) AS has_offerings_stream_name,
    EXISTS (
      SELECT 1 FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE nsp.nspname = 'public' AND rel.relname = 'school_subject_offerings'
        AND con.contype = 'c' AND pg_get_constraintdef(con.oid) ~* 'grade\s*>=\s*8'
    ) AS offerings_grade_8_12_active
  FROM table_flags tf
),

rollback_baseline_probe AS (
  SELECT
    CASE WHEN tf.has_doc_requests THEN (
      SELECT xt.cnt FROM XMLTABLE('/table/row' PASSING query_to_xml($q$ SELECT COUNT(*)::int AS cnt FROM public.application_document_requests $q$, true, false, '') COLUMNS cnt int PATH 'cnt') xt LIMIT 1
    ) ELSE 0 END AS doc_requests_cnt,
    CASE WHEN tf.has_status_history THEN (
      SELECT xt.cnt FROM XMLTABLE('/table/row' PASSING query_to_xml($q$ SELECT COUNT(*)::int AS cnt FROM public.application_status_history $q$, true, false, '') COLUMNS cnt int PATH 'cnt') xt LIMIT 1
    ) ELSE 0 END AS status_history_cnt,
    CASE WHEN tf.has_email_log THEN (
      SELECT xt.cnt FROM XMLTABLE('/table/row' PASSING query_to_xml($q$ SELECT COUNT(*)::int AS cnt FROM public.application_email_log $q$, true, false, '') COLUMNS cnt int PATH 'cnt') xt LIMIT 1
    ) ELSE 0 END AS email_log_cnt
  FROM table_flags tf
),

section_integrity_checks AS (
  -- 1. Application status whitelist & baseline counts
  SELECT
    70 AS sort_order,
    'D. APPLICATION_DATA' AS section,
    'applications_status_values_compatible' AS check_name,
    CASE
      WHEN (ap.data ->> 'evaluated')::boolean IS NOT TRUE THEN 'UNKNOWN'
      WHEN (ap.data ->> 'unknown_status_group_count')::int = 0 THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    CASE
      WHEN (ap.data ->> 'evaluated')::boolean IS NOT TRUE THEN 'Unable to evaluate applications.'
      WHEN (ap.data ->> 'unknown_status_group_count')::int = 0
        THEN format(
          'All %s application(s) use recognized statuses; %s row(s) have NULL academic_year (will be safely backfilled from created_at).',
          ap.data ->> 'total_applications',
          ap.data ->> 'null_academic_year_count'
        )
      ELSE format(
        'CONFLICT: %s unrecognized status value(s) found on applications; applications_status_lifecycle_check would stay NOT VALID until resolved.',
        ap.data ->> 'unknown_status_group_count'
      )
    END AS detail,
    jsonb_build_object(
      'total_applications', ap.data -> 'total_applications',
      'status_distribution', ap.data -> 'status_distribution',
      'unknown_statuses', ap.data -> 'unknown_statuses',
      'null_academic_year_count', ap.data -> 'null_academic_year_count',
      'missing_parent_email_count', ap.data -> 'missing_parent_email_count'
    ) AS evidence_json
  FROM applications_probe ap

  UNION ALL

  -- 2. Application school ownership & duplicate application_number
  SELECT
    71,
    'D. APPLICATION_DATA',
    'applications_school_ownership_and_app_number_uniqueness',
    CASE
      WHEN (ap.data ->> 'evaluated')::boolean IS NOT TRUE THEN 'UNKNOWN'
      WHEN (ap.data ->> 'orphan_or_null_school_count')::int = 0
       AND (ap.data ->> 'duplicate_application_number_groups')::int = 0 THEN 'PASS'
      ELSE 'FAIL'
    END,
    CASE
      WHEN (ap.data ->> 'evaluated')::boolean IS NOT TRUE THEN 'Unable to evaluate applications school ownership.'
      ELSE format(
        'orphan_or_null_school=%s, duplicate_application_number_groups=%s across %s application(s).',
        ap.data ->> 'orphan_or_null_school_count',
        ap.data ->> 'duplicate_application_number_groups',
        ap.data ->> 'total_applications'
      )
    END,
    jsonb_build_object(
      'orphan_or_null_school_count', ap.data -> 'orphan_or_null_school_count',
      'orphan_or_null_school_ids', ap.data -> 'orphan_or_null_school_ids',
      'duplicate_application_number_groups', ap.data -> 'duplicate_application_number_groups',
      'duplicate_application_numbers', ap.data -> 'duplicate_application_numbers'
    )
  FROM applications_probe ap

  UNION ALL

  -- 3. Learner Number uniqueness across applications and children
  SELECT
    72,
    'E. LEARNER_NUMBERS',
    'learner_number_uniqueness_and_cross_school_integrity',
    CASE
      WHEN (ap.data ->> 'evaluated')::boolean IS NOT TRUE OR (cl.data ->> 'evaluated')::boolean IS NOT TRUE THEN 'UNKNOWN'
      WHEN (ap.data ->> 'duplicate_provisional_learner_number_groups')::int = 0
       AND (cl.data ->> 'duplicate_child_learner_number_groups')::int = 0
       AND (cl.data ->> 'cross_school_learner_number_collisions')::int = 0 THEN 'PASS'
      ELSE 'FAIL'
    END,
    CASE
      WHEN (ap.data ->> 'evaluated')::boolean IS NOT TRUE OR (cl.data ->> 'evaluated')::boolean IS NOT TRUE THEN 'Unable to evaluate Learner Numbers.'
      ELSE format(
        'apps_with_learner_no=%s (dup_groups=%s) | children_with_learner_no=%s/%s (dup_groups=%s) | cross_school_collisions=%s.',
        ap.data ->> 'with_provisional_learner_number_count',
        ap.data ->> 'duplicate_provisional_learner_number_groups',
        cl.data ->> 'children_with_learner_number',
        cl.data ->> 'total_children',
        cl.data ->> 'duplicate_child_learner_number_groups',
        cl.data ->> 'cross_school_learner_number_collisions'
      )
    END,
    jsonb_build_object(
      'apps_with_provisional_learner_number', ap.data -> 'with_provisional_learner_number_count',
      'duplicate_provisional_learner_number_groups', ap.data -> 'duplicate_provisional_learner_number_groups',
      'duplicate_provisional_learner_numbers', ap.data -> 'duplicate_provisional_learner_numbers',
      'total_children', cl.data -> 'total_children',
      'children_with_learner_number', cl.data -> 'children_with_learner_number',
      'duplicate_child_learner_number_groups', cl.data -> 'duplicate_child_learner_number_groups',
      'duplicate_child_learner_numbers', cl.data -> 'duplicate_child_learner_numbers',
      'cross_school_learner_number_collisions', cl.data -> 'cross_school_learner_number_collisions',
      'cross_school_collision_pairs', cl.data -> 'cross_school_collision_pairs',
      'orphan_child_school_count', cl.data -> 'orphan_child_school_count',
      'total_users', cl.data -> 'total_users',
      'total_schools', cl.data -> 'total_schools'
    )
  FROM applications_probe ap, children_and_links_probe cl

  UNION ALL

  -- 4. Application documents, learner_registrations & learner_enrolments integrity
  SELECT
    73,
    'E. RELATIONSHIPS',
    'documents_registrations_and_enrolments_integrity',
    CASE
      WHEN (dr.docs_data ->> 'evaluated')::boolean IS NOT TRUE THEN 'UNKNOWN'
      WHEN (dr.docs_data ->> 'orphan_application_documents')::int > 0 THEN 'FAIL'
      WHEN (dr.regs_data ->> 'evaluated')::boolean IS TRUE
        AND (
          (dr.regs_data ->> 'orphan_registration_count')::int > 0
          OR (dr.regs_data ->> 'cross_school_registration_mismatch_count')::int > 0
          OR (dr.regs_data ->> 'duplicate_active_registration_groups')::int > 0
        ) THEN 'FAIL'
      WHEN (dr.enrol_data ->> 'evaluated')::boolean IS TRUE
        AND (dr.enrol_data ->> 'duplicate_active_enrolment_groups')::int > 0 THEN 'FAIL'
      ELSE 'PASS'
    END,
    format(
      'app_docs=%s (orphans=%s) | learner_registrations=%s (orphans=%s, cross_school=%s, dup_active=%s) | learner_enrolments=%s (dup_active=%s).',
      COALESCE(dr.docs_data ->> 'total_application_documents', 'n/a'),
      COALESCE(dr.docs_data ->> 'orphan_application_documents', 'n/a'),
      COALESCE(dr.regs_data ->> 'total_registrations', 'table_missing'),
      COALESCE(dr.regs_data ->> 'orphan_registration_count', 'n/a'),
      COALESCE(dr.regs_data ->> 'cross_school_registration_mismatch_count', 'n/a'),
      COALESCE(dr.regs_data ->> 'duplicate_active_registration_groups', 'n/a'),
      COALESCE(dr.enrol_data ->> 'total_enrolments', 'table_missing'),
      COALESCE(dr.enrol_data ->> 'duplicate_active_enrolment_groups', 'n/a')
    ),
    jsonb_build_object(
      'application_documents', dr.docs_data,
      'learner_registrations', dr.regs_data,
      'learner_enrolments', dr.enrol_data
    )
  FROM docs_and_regs_probe dr

  UNION ALL

  -- 5. Curriculum Remediation Coordination Check (Informational)
  SELECT
    80,
    'F. CURRICULUM_COORDINATION',
    'curriculum_grades_8_12_upgrade_status',
    'INFO',
    CASE
      WHEN cc.has_offerings_stream_name AND cc.offerings_grade_8_12_active
        THEN 'Curriculum Grades 8-12 schema upgrade appears ALREADY APPLIED (school_subject_offerings.stream_name & Grade 8-12 CHECK present).'
      ELSE 'Curriculum Grades 8-12 schema upgrade NOT YET APPLIED (stream_name missing or Grade 8-12 CHECK not active). Application lifecycle DDL is schema-independent, but Grade 8-9 offering edits require the separate curriculum migration.'
    END,
    jsonb_build_object(
      'has_school_subject_offerings', cc.has_offerings,
      'has_academic_streams', cc.has_streams,
      'has_offerings_stream_name', cc.has_offerings_stream_name,
      'offerings_grade_8_12_active', cc.offerings_grade_8_12_active
    )
  FROM curriculum_coord_probe cc

  UNION ALL

  -- 6. Rollback Safety Assumptions Baseline
  SELECT
    85,
    'G. ROLLBACK_BASELINE',
    'non_destructive_rollback_baseline',
    'INFO',
    format(
      'Existing lifecycle rows before migration: doc_requests=%s, status_history=%s, email_log=%s, extended_status_apps=%s. (Zero means .down.sql can reverse cleanly prior to live traffic; non-zero requires PITR/backup restore for full rollback.)',
      rb.doc_requests_cnt,
      rb.status_history_cnt,
      rb.email_log_cnt,
      COALESCE(ap.data ->> 'extended_status_count', '0')
    ),
    jsonb_build_object(
      'doc_requests_cnt', rb.doc_requests_cnt,
      'status_history_cnt', rb.status_history_cnt,
      'email_log_cnt', rb.email_log_cnt,
      'extended_status_apps_cnt', COALESCE((ap.data ->> 'extended_status_count')::int, 0)
    )
  FROM rollback_baseline_probe rb, applications_probe ap
),

all_checks AS (
  SELECT * FROM section_identity
  UNION ALL SELECT * FROM section_tables
  UNION ALL SELECT * FROM section_columns
  UNION ALL SELECT * FROM section_required_base_cols
  UNION ALL SELECT * FROM section_additive_col_compat
  UNION ALL SELECT * FROM section_constraints
  UNION ALL SELECT * FROM section_integrity_checks
),

summary_verdict AS (
  SELECT
    99 AS sort_order,
    'V. PREFLIGHT_SUMMARY' AS section,
    'PREFLIGHT_VERDICT' AS check_name,
    CASE
      WHEN EXISTS (SELECT 1 FROM all_checks WHERE status = 'FAIL') THEN 'FAIL'
      WHEN EXISTS (SELECT 1 FROM all_checks WHERE status = 'UNKNOWN') THEN 'UNKNOWN'
      ELSE 'PASS'
    END AS status,
    CASE
      WHEN EXISTS (SELECT 1 FROM all_checks WHERE status = 'FAIL')
        THEN 'BLOCKED — DO NOT EXECUTE MIGRATION: One or more preflight prerequisites FAILED. Resolve reported blockers before requesting Stage 3 authorization.'
      WHEN EXISTS (SELECT 1 FROM all_checks WHERE status = 'UNKNOWN')
        THEN 'BLOCKED — DO NOT EXECUTE MIGRATION: One or more preflight checks returned UNKNOWN.'
      ELSE 'PREFLIGHT PASSED: All application lifecycle migration prerequisites verified. Record baseline row counts before requesting Stage 3 migration authorization.'
    END AS detail,
    (
      SELECT jsonb_object_agg(check_name, status)
      FROM all_checks
      WHERE status IN ('PASS', 'FAIL', 'UNKNOWN')
    ) AS evidence_json
)

SELECT
  section,
  check_name,
  status,
  detail,
  evidence_json
FROM (
  SELECT * FROM all_checks
  UNION ALL SELECT * FROM summary_verdict
) final_rows
ORDER BY sort_order, check_name;
