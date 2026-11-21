-- =============================================================================
-- GELEZA SA — LIVE PRODUCTION READ-ONLY CURRICULUM PREFLIGHT DIAGNOSTIC
-- =============================================================================
-- TARGET:     Live Production Supabase PostgreSQL Database
-- MODE:       STRICTLY READ-ONLY (Pure SELECT-only diagnostic; ZERO DDL/DML)
-- SAFETY:     Single WITH ... SELECT query. Contains ZERO schema changes,
--             ZERO row writes, ZERO DO blocks, and ZERO session mutations.
--             Safe to execute directly in the Supabase SQL Editor.
-- PURPOSE:    Verify live schema metadata, constraints, indexes, data
--             integrity, duplicate keys, and applications compatibility
--             BEFORE authorizing migration:
--             db/migrations/20261121_curriculum_grades_8_12_upgrade.sql
--
-- DO NOT EXECUTE THE UPGRADE MIGRATION DURING THIS STEP.
-- =============================================================================

WITH
-- ---------------------------------------------------------------------------
-- 0. Environment & Table Existence Discovery
-- ---------------------------------------------------------------------------
table_flags AS (
  SELECT
    (to_regclass('public.schools') IS NOT NULL)                  AS has_schools,
    (to_regclass('public.applications') IS NOT NULL)             AS has_applications,
    (to_regclass('public.school_subject_offerings') IS NOT NULL) AS has_offerings,
    (to_regclass('public.academic_streams') IS NOT NULL)         AS has_streams,
    (to_regclass('public.subject_change_approvals') IS NOT NULL) AS has_approvals,
    (to_regclass('public.learner_registrations') IS NOT NULL)    AS has_learner_regs
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
      'database=%s | schema=%s | checked_at=%s',
      current_database(),
      current_schema(),
      to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ) AS detail,
    jsonb_build_object(
      'database', current_database(),
      'schema', current_schema(),
      'server_version', current_setting('server_version'),
      'read_only_session', current_setting('default_transaction_read_only')
    ) AS evidence_json
),

-- ---------------------------------------------------------------------------
-- A. Table Existence Checks
-- ---------------------------------------------------------------------------
section_tables AS (
  SELECT
    20 + ord AS sort_order,
    'A. TABLE_EXISTENCE' AS section,
    'table_' || tbl AS check_name,
    CASE
      WHEN tbl = 'schools' AND NOT exists_flag THEN 'FAIL'
      WHEN exists_flag THEN 'PASS'
      ELSE 'INFO'
    END AS status,
    CASE
      WHEN exists_flag THEN format('Table public.%s exists.', tbl)
      WHEN tbl = 'schools' THEN 'CRITICAL: Table public.schools is missing (required FK target).'
      ELSE format('Table public.%s does not exist yet (migration will handle cleanly).', tbl)
    END AS detail,
    jsonb_build_object('table', tbl, 'exists', exists_flag) AS evidence_json
  FROM (
    SELECT 1 AS ord, 'schools' AS tbl, has_schools AS exists_flag FROM table_flags
    UNION ALL SELECT 2, 'applications', has_applications FROM table_flags
    UNION ALL SELECT 3, 'school_subject_offerings', has_offerings FROM table_flags
    UNION ALL SELECT 4, 'academic_streams', has_streams FROM table_flags
    UNION ALL SELECT 5, 'subject_change_approvals', has_approvals FROM table_flags
    UNION ALL SELECT 6, 'learner_registrations', has_learner_regs FROM table_flags
  ) t
),

-- ---------------------------------------------------------------------------
-- B. Actual Column Metadata (information_schema.columns)
-- ---------------------------------------------------------------------------
section_columns AS (
  SELECT
    30 + ord AS sort_order,
    'B. COLUMN_METADATA' AS section,
    'columns_' || t.tbl AS check_name,
    'INFO' AS status,
    CASE
      WHEN c.col_count = 0 THEN format('Table public.%s does not exist (0 columns).', t.tbl)
      WHEN t.tbl = 'school_subject_offerings' THEN format(
        '%s columns found; stream_name column present=%s, language_level present=%s.',
        c.col_count,
        CASE WHEN COALESCE(c.has_stream_name, FALSE) THEN 'true' ELSE 'false' END,
        CASE WHEN COALESCE(c.has_language_level, FALSE) THEN 'true' ELSE 'false' END
      )
      ELSE format('%s columns found on public.%s.', c.col_count, t.tbl)
    END AS detail,
    COALESCE(c.cols_json, '[]'::jsonb) AS evidence_json
  FROM (
    VALUES
      (1, 'school_subject_offerings'),
      (2, 'academic_streams'),
      (3, 'subject_change_approvals'),
      (4, 'applications'),
      (5, 'schools')
  ) AS t(ord, tbl)
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*)::int AS col_count,
      BOOL_OR(column_name = 'stream_name') AS has_stream_name,
      BOOL_OR(column_name = 'language_level') AS has_language_level,
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

-- ---------------------------------------------------------------------------
-- C. Exact Constraints & Indexes (pg_constraint & pg_indexes)
-- Never infers constraint names; inspects exact definitions in pg_catalog.
-- ---------------------------------------------------------------------------
raw_curriculum_constraints AS (
  SELECT
    t.ord,
    t.tbl,
    con.conname,
    con.contype,
    pg_get_constraintdef(con.oid) AS definition,
    (con.contype = 'c' AND pg_get_constraintdef(con.oid) ILIKE '%grade%') AS matches_grade_rule,
    (
      con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%grade%'
      AND (
        pg_get_constraintdef(con.oid) ILIKE '%category%'
        OR pg_get_constraintdef(con.oid) ILIKE '%status%'
        OR pg_get_constraintdef(con.oid) ILIKE '%subject_name%'
        OR pg_get_constraintdef(con.oid) ILIKE '%stream_name%'
        OR pg_get_constraintdef(con.oid) ILIKE '%language_level%'
        OR pg_get_constraintdef(con.oid) ILIKE '%electives%'
      )
    ) AS has_mixed_non_grade_clause
  FROM (
    VALUES
      (1, 'school_subject_offerings'),
      (2, 'academic_streams'),
      (3, 'subject_change_approvals')
  ) AS t(ord, tbl)
  JOIN pg_class rel ON rel.relname = t.tbl
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace AND nsp.nspname = 'public'
  JOIN pg_constraint con ON con.conrelid = rel.oid
),

section_constraints AS (
  SELECT
    40 + t.ord AS sort_order,
    'C. CONSTRAINTS' AS section,
    'constraints_' || t.tbl AS check_name,
    CASE
      WHEN COALESCE(c.mixed_cnt, 0) > 0 THEN 'FAIL'
      ELSE 'INFO'
    END AS status,
    CASE
      WHEN to_regclass('public.' || t.tbl) IS NULL THEN format('Table public.%s does not exist.', t.tbl)
      WHEN COALESCE(c.mixed_cnt, 0) > 0 THEN format(
        'WARNING: %s CHECK constraint(s) matching %%grade%% also reference other columns on public.%s.',
        c.mixed_cnt,
        t.tbl
      )
      ELSE format(
        '%s total constraint(s) (%s CHECK, %s FK, %s PK/UNIQUE; %s matched by grade-check rule) on public.%s.',
        COALESCE(c.total_cnt, 0),
        COALESCE(c.check_cnt, 0),
        COALESCE(c.fk_cnt, 0),
        COALESCE(c.pk_uniq_cnt, 0),
        COALESCE(c.grade_rule_cnt, 0),
        t.tbl
      )
    END AS detail,
    COALESCE(c.constraints_json, '[]'::jsonb) AS evidence_json
  FROM (
    VALUES
      (1, 'school_subject_offerings'),
      (2, 'academic_streams'),
      (3, 'subject_change_approvals')
  ) AS t(ord, tbl)
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*)::int AS total_cnt,
      COUNT(*) FILTER (WHERE rc.contype = 'c')::int AS check_cnt,
      COUNT(*) FILTER (WHERE rc.contype = 'f')::int AS fk_cnt,
      COUNT(*) FILTER (WHERE rc.contype IN ('p', 'u'))::int AS pk_uniq_cnt,
      COUNT(*) FILTER (WHERE rc.matches_grade_rule)::int AS grade_rule_cnt,
      COUNT(*) FILTER (WHERE rc.has_mixed_non_grade_clause)::int AS mixed_cnt,
      jsonb_agg(
        jsonb_build_object(
          'name', rc.conname,
          'type', CASE rc.contype
            WHEN 'c' THEN 'CHECK'
            WHEN 'f' THEN 'FOREIGN KEY'
            WHEN 'p' THEN 'PRIMARY KEY'
            WHEN 'u' THEN 'UNIQUE'
            ELSE rc.contype::text
          END,
          'definition', rc.definition,
          'matches_grade_drop_rule', rc.matches_grade_rule,
          'has_mixed_non_grade_clause', rc.has_mixed_non_grade_clause
        )
        ORDER BY rc.contype, rc.conname
      ) AS constraints_json
    FROM raw_curriculum_constraints rc
    WHERE rc.tbl = t.tbl
  ) c ON TRUE
),

section_indexes AS (
  SELECT
    50 + ord AS sort_order,
    'C. INDEXES' AS section,
    'indexes_' || t.tbl AS check_name,
    'INFO' AS status,
    CASE
      WHEN to_regclass('public.' || t.tbl) IS NULL THEN format('Table public.%s does not exist.', t.tbl)
      ELSE format('%s index(es) found on public.%s.', COALESCE(i.idx_cnt, 0), t.tbl)
    END AS detail,
    COALESCE(i.idx_json, '[]'::jsonb) AS evidence_json
  FROM (
    VALUES
      (1, 'school_subject_offerings'),
      (2, 'academic_streams'),
      (3, 'subject_change_approvals')
  ) AS t(ord, tbl)
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*)::int AS idx_cnt,
      jsonb_agg(
        jsonb_build_object(
          'name', indexname,
          'definition', indexdef
        )
        ORDER BY indexname
      ) AS idx_json
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = t.tbl
  ) i ON TRUE
),

-- ---------------------------------------------------------------------------
-- D & E. Dynamic Read-Only Data Integrity & Proposed Unique-Index Checks
-- Uses to_jsonb() inside query_to_xml() ONLY when target tables exist, so
-- missing stream_name / missing optional columns / missing tables NEVER crash.
-- ---------------------------------------------------------------------------
offerings_probe_raw AS (
  SELECT
    CASE
      WHEN tf.has_offerings AND tf.has_schools THEN (
        SELECT xt.payload::jsonb
        FROM XMLTABLE(
          '/table/row'
          PASSING query_to_xml(
            $q$
            WITH base AS (
              SELECT
                o.id,
                o.school_id,
                o.academic_year,
                o.grade,
                COALESCE(to_jsonb(o) ->> 'stream_name', '') AS effective_stream_name,
                o.subject_name,
                o.category,
                COALESCE(to_jsonb(o) ->> 'language_level', '') AS effective_language_level,
                (to_jsonb(o) ? 'stream_name' AND (to_jsonb(o) ->> 'stream_name') IS NULL) AS raw_stream_name_is_null,
                (to_jsonb(o) ? 'language_level' AND (to_jsonb(o) ->> 'language_level') IS NULL) AS raw_language_level_is_null,
                (to_jsonb(o) ? 'is_required' AND (to_jsonb(o) ->> 'is_required') IS NULL) AS raw_is_required_is_null,
                (to_jsonb(o) ? 'is_active' AND (to_jsonb(o) ->> 'is_active') IS NULL) AS raw_is_active_is_null
              FROM public.school_subject_offerings o
            ),
            dupes AS (
              SELECT
                school_id,
                academic_year,
                grade,
                effective_stream_name AS stream_name,
                subject_name,
                effective_language_level AS language_level,
                COUNT(*)::int AS row_count,
                array_agg(id ORDER BY id) AS ids
              FROM base
              GROUP BY 1, 2, 3, 4, 5, 6
              HAVING COUNT(*) > 1
            ),
            orphans AS (
              SELECT b.id, b.school_id
              FROM base b
              LEFT JOIN public.schools s ON s.id = b.school_id
              WHERE s.id IS NULL
            )
            SELECT jsonb_build_object(
              'evaluated', true,
              'total_rows', (SELECT COUNT(*)::int FROM base),
              'min_grade', (SELECT MIN(grade) FROM base),
              'max_grade', (SELECT MAX(grade) FROM base),
              'out_of_range_grade_count', (SELECT COUNT(*)::int FROM base WHERE grade IS NULL OR grade NOT BETWEEN 8 AND 12),
              'out_of_range_grade_ids', COALESCE((SELECT jsonb_agg(id ORDER BY id) FROM base WHERE grade IS NULL OR grade NOT BETWEEN 8 AND 12), '[]'::jsonb),
              'invalid_category_count', (SELECT COUNT(*)::int FROM base WHERE category IS NULL OR category NOT IN ('language', 'mathematics', 'elective')),
              'invalid_category_ids', COALESCE((SELECT jsonb_agg(id ORDER BY id) FROM base WHERE category IS NULL OR category NOT IN ('language', 'mathematics', 'elective')), '[]'::jsonb),
              'null_required_count', (
                SELECT COUNT(*)::int FROM base
                WHERE school_id IS NULL
                   OR academic_year IS NULL
                   OR grade IS NULL
                   OR subject_name IS NULL
                   OR category IS NULL
                   OR raw_stream_name_is_null
                   OR raw_language_level_is_null
                   OR raw_is_required_is_null
                   OR raw_is_active_is_null
              ),
              'null_required_ids', COALESCE((
                SELECT jsonb_agg(id ORDER BY id) FROM base
                WHERE school_id IS NULL
                   OR academic_year IS NULL
                   OR grade IS NULL
                   OR subject_name IS NULL
                   OR category IS NULL
                   OR raw_stream_name_is_null
                   OR raw_language_level_is_null
                   OR raw_is_required_is_null
                   OR raw_is_active_is_null
              ), '[]'::jsonb),
              'orphan_school_count', (SELECT COUNT(*)::int FROM orphans),
              'orphan_school_ids', COALESCE((SELECT jsonb_agg(id ORDER BY id) FROM orphans), '[]'::jsonb),
              'duplicate_group_count', (SELECT COUNT(*)::int FROM dupes),
              'duplicates', COALESCE((SELECT jsonb_agg(to_jsonb(dupes)) FROM dupes), '[]'::jsonb)
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
        'reason', CASE WHEN NOT tf.has_offerings THEN 'table_missing' ELSE 'schools_table_missing' END
      )
    END AS data
  FROM table_flags tf
),

streams_probe_raw AS (
  SELECT
    CASE
      WHEN tf.has_streams AND tf.has_schools THEN (
        SELECT xt.payload::jsonb
        FROM XMLTABLE(
          '/table/row'
          PASSING query_to_xml(
            $q$
            WITH base AS (
              SELECT
                st.id,
                st.school_id,
                st.academic_year,
                st.grade,
                st.name,
                st.mathematics_option,
                st.electives,
                st.status
              FROM public.academic_streams st
            ),
            dupes AS (
              SELECT
                school_id,
                academic_year,
                grade,
                LOWER(name) AS lower_name,
                COUNT(*)::int AS row_count,
                array_agg(id ORDER BY id) AS ids
              FROM base
              WHERE status <> 'archived'
              GROUP BY 1, 2, 3, 4
              HAVING COUNT(*) > 1
            ),
            orphans AS (
              SELECT b.id, b.school_id
              FROM base b
              LEFT JOIN public.schools s ON s.id = b.school_id
              WHERE s.id IS NULL
            )
            SELECT jsonb_build_object(
              'evaluated', true,
              'total_rows', (SELECT COUNT(*)::int FROM base),
              'min_grade', (SELECT MIN(grade) FROM base),
              'max_grade', (SELECT MAX(grade) FROM base),
              'out_of_range_grade_count', (SELECT COUNT(*)::int FROM base WHERE grade IS NULL OR grade NOT BETWEEN 8 AND 12),
              'out_of_range_grade_ids', COALESCE((SELECT jsonb_agg(id ORDER BY id) FROM base WHERE grade IS NULL OR grade NOT BETWEEN 8 AND 12), '[]'::jsonb),
              'invalid_status_count', (SELECT COUNT(*)::int FROM base WHERE status IS NULL OR status NOT IN ('draft', 'published', 'archived')),
              'invalid_status_ids', COALESCE((SELECT jsonb_agg(id ORDER BY id) FROM base WHERE status IS NULL OR status NOT IN ('draft', 'published', 'archived')), '[]'::jsonb),
              'null_required_count', (
                SELECT COUNT(*)::int FROM base
                WHERE school_id IS NULL
                   OR academic_year IS NULL
                   OR grade IS NULL
                   OR name IS NULL
                   OR mathematics_option IS NULL
                   OR electives IS NULL
                   OR status IS NULL
              ),
              'null_required_ids', COALESCE((
                SELECT jsonb_agg(id ORDER BY id) FROM base
                WHERE school_id IS NULL
                   OR academic_year IS NULL
                   OR grade IS NULL
                   OR name IS NULL
                   OR mathematics_option IS NULL
                   OR electives IS NULL
                   OR status IS NULL
              ), '[]'::jsonb),
              'orphan_school_count', (SELECT COUNT(*)::int FROM orphans),
              'orphan_school_ids', COALESCE((SELECT jsonb_agg(id ORDER BY id) FROM orphans), '[]'::jsonb),
              'duplicate_group_count', (SELECT COUNT(*)::int FROM dupes),
              'duplicates', COALESCE((SELECT jsonb_agg(to_jsonb(dupes)) FROM dupes), '[]'::jsonb)
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
        'reason', CASE WHEN NOT tf.has_streams THEN 'table_missing' ELSE 'schools_table_missing' END
      )
    END AS data
  FROM table_flags tf
),

approvals_probe_raw AS (
  SELECT
    CASE
      WHEN tf.has_approvals AND tf.has_schools AND tf.has_streams THEN (
        SELECT xt.payload::jsonb
        FROM XMLTABLE(
          '/table/row'
          PASSING query_to_xml(
            $q$
            WITH base AS (
              SELECT a.id, a.school_id, a.id_number, a.academic_year, a.grade, a.academic_stream_id
              FROM public.subject_change_approvals a
            ),
            orphan_schools AS (
              SELECT b.id FROM base b LEFT JOIN public.schools s ON s.id = b.school_id WHERE s.id IS NULL
            ),
            orphan_streams AS (
              SELECT b.id FROM base b LEFT JOIN public.academic_streams st ON st.id = b.academic_stream_id
              WHERE b.academic_stream_id IS NOT NULL AND st.id IS NULL
            )
            SELECT jsonb_build_object(
              'evaluated', true,
              'total_rows', (SELECT COUNT(*)::int FROM base),
              'orphan_school_count', (SELECT COUNT(*)::int FROM orphan_schools),
              'orphan_school_ids', COALESCE((SELECT jsonb_agg(id ORDER BY id) FROM orphan_schools), '[]'::jsonb),
              'orphan_stream_count', (SELECT COUNT(*)::int FROM orphan_streams),
              'orphan_stream_ids', COALESCE((SELECT jsonb_agg(id ORDER BY id) FROM orphan_streams), '[]'::jsonb),
              'null_required_count', (
                SELECT COUNT(*)::int FROM base
                WHERE school_id IS NULL OR id_number IS NULL OR academic_year IS NULL OR grade IS NULL
              )
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
        'reason', CASE WHEN NOT tf.has_approvals THEN 'table_missing' ELSE 'dependency_table_missing' END
      )
    END AS data
  FROM table_flags tf
),

schools_inventory_raw AS (
  SELECT
    CASE
      WHEN tf.has_schools THEN (
        SELECT xt.payload::jsonb
        FROM XMLTABLE(
          '/table/row'
          PASSING query_to_xml(
            $q$
            SELECT COALESCE(jsonb_agg(
              jsonb_build_object(
                'school_id', s.id,
                'school_name', s.name,
                'has_legacy_languages', (to_jsonb(s) -> 'offered_languages') IS NOT NULL AND jsonb_typeof(to_jsonb(s) -> 'offered_languages') <> 'null',
                'has_legacy_subjects', (to_jsonb(s) -> 'offered_subjects') IS NOT NULL AND jsonb_typeof(to_jsonb(s) -> 'offered_subjects') <> 'null',
                'has_legacy_streams', (to_jsonb(s) -> 'offered_streams') IS NOT NULL AND jsonb_typeof(to_jsonb(s) -> 'offered_streams') <> 'null'
              )
              ORDER BY s.id
            ), '[]'::jsonb)::text AS payload
            FROM public.schools s
            $q$,
            true, false, ''
          )
          COLUMNS payload text PATH 'payload'
        ) xt
        LIMIT 1
      )
      ELSE '[]'::jsonb
    END AS data
  FROM table_flags tf
),

-- ---------------------------------------------------------------------------
-- F. Applications Additive Columns Compatibility Check
-- ---------------------------------------------------------------------------
app_col_checks AS (
  SELECT
    tf.has_applications,
    req.col_name,
    req.expected_desc,
    col.data_type,
    col.udt_name,
    col.character_maximum_length,
    col.is_nullable,
    col.column_default,
    CASE
      WHEN NOT tf.has_applications THEN 'INFO'
      WHEN col.column_name IS NULL THEN 'PASS'
      WHEN req.col_name = 'first_additional_language'
        AND col.data_type IN ('character varying', 'text')
        AND (col.character_maximum_length IS NULL OR col.character_maximum_length >= 80) THEN 'PASS'
      WHEN req.col_name = 'academic_stream_id'
        AND col.data_type IN ('integer', 'bigint') THEN 'PASS'
      WHEN req.col_name = 'subject_package'
        AND col.data_type = 'jsonb' THEN 'PASS'
      ELSE 'FAIL'
    END AS compat_status,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', con.conname, 'definition', pg_get_constraintdef(con.oid)))
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE nsp.nspname = 'public'
        AND rel.relname = 'applications'
        AND pg_get_constraintdef(con.oid) ILIKE '%' || req.col_name || '%'
    ), '[]'::jsonb) AS related_constraints
  FROM table_flags tf
  CROSS JOIN (
    VALUES
      ('first_additional_language', 'VARCHAR(80) or TEXT'),
      ('academic_stream_id',        'INTEGER or BIGINT'),
      ('subject_package',           'JSONB')
  ) AS req(col_name, expected_desc)
  LEFT JOIN information_schema.columns col
    ON col.table_schema = 'public'
   AND col.table_name = 'applications'
   AND col.column_name = req.col_name
),

section_data_and_unique AS (
  -- Offerings Grade Range
  SELECT
    60 AS sort_order,
    'D. DATA_INTEGRITY' AS section,
    'offerings_grade_range_8_to_12' AS check_name,
    CASE
      WHEN NOT tf.has_offerings THEN 'PASS'
      WHEN (op.data ->> 'evaluated')::boolean IS NOT TRUE THEN 'UNKNOWN'
      WHEN (op.data ->> 'out_of_range_grade_count')::int = 0 THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    CASE
      WHEN NOT tf.has_offerings THEN 'Table school_subject_offerings does not exist yet (0 rows to conflict).'
      WHEN (op.data ->> 'evaluated')::boolean IS NOT TRUE THEN format('Unable to evaluate school_subject_offerings (%s).', COALESCE(op.data ->> 'reason', 'unknown'))
      WHEN (op.data ->> 'out_of_range_grade_count')::int = 0
        THEN format('All %s row(s) have grades within 8-12 (min=%s, max=%s).', op.data ->> 'total_rows', COALESCE(op.data ->> 'min_grade', 'n/a'), COALESCE(op.data ->> 'max_grade', 'n/a'))
      ELSE format('CONFLICT: %s row(s) have NULL or out-of-range grades outside 8-12.', op.data ->> 'out_of_range_grade_count')
    END AS detail,
    jsonb_build_object(
      'total_rows', op.data -> 'total_rows',
      'min_grade', op.data -> 'min_grade',
      'max_grade', op.data -> 'max_grade',
      'out_of_range_grade_ids', op.data -> 'out_of_range_grade_ids'
    ) AS evidence_json
  FROM table_flags tf, offerings_probe_raw op

  UNION ALL

  -- Offerings Required Columns / Category / Orphans
  SELECT
    61,
    'D. DATA_INTEGRITY',
    'offerings_required_columns_and_fk',
    CASE
      WHEN NOT tf.has_offerings THEN 'PASS'
      WHEN (op.data ->> 'evaluated')::boolean IS NOT TRUE THEN 'UNKNOWN'
      WHEN (op.data ->> 'invalid_category_count')::int = 0
       AND (op.data ->> 'null_required_count')::int = 0
       AND (op.data ->> 'orphan_school_count')::int = 0 THEN 'PASS'
      ELSE 'FAIL'
    END,
    CASE
      WHEN NOT tf.has_offerings THEN 'Table school_subject_offerings does not exist yet (0 rows).'
      WHEN (op.data ->> 'evaluated')::boolean IS NOT TRUE THEN format('Unable to evaluate school_subject_offerings (%s).', COALESCE(op.data ->> 'reason', 'unknown'))
      ELSE format(
        'invalid_category=%s, null_required=%s, orphan_school_id=%s across %s row(s).',
        op.data ->> 'invalid_category_count',
        op.data ->> 'null_required_count',
        op.data ->> 'orphan_school_count',
        op.data ->> 'total_rows'
      )
    END,
    jsonb_build_object(
      'invalid_category_ids', op.data -> 'invalid_category_ids',
      'null_required_ids', op.data -> 'null_required_ids',
      'orphan_school_ids', op.data -> 'orphan_school_ids'
    )
  FROM table_flags tf, offerings_probe_raw op

  UNION ALL

  -- Proposed school_subject_offerings_unique Compatibility
  SELECT
    62,
    'E. UNIQUE_INDEX_COMPATIBILITY',
    'offerings_unique_key_conflicts',
    CASE
      WHEN NOT tf.has_offerings THEN 'PASS'
      WHEN (op.data ->> 'evaluated')::boolean IS NOT TRUE THEN 'UNKNOWN'
      WHEN (op.data ->> 'duplicate_group_count')::int = 0 THEN 'PASS'
      ELSE 'FAIL'
    END,
    CASE
      WHEN NOT tf.has_offerings THEN 'Table school_subject_offerings does not exist yet (0 duplicates).'
      WHEN (op.data ->> 'evaluated')::boolean IS NOT TRUE THEN format('Unable to evaluate school_subject_offerings duplicates (%s).', COALESCE(op.data ->> 'reason', 'unknown'))
      WHEN (op.data ->> 'duplicate_group_count')::int = 0
        THEN '0 duplicate groups for target unique key (school_id, academic_year, grade, stream_name, subject_name, language_level).'
      ELSE format('CONFLICT: %s duplicate group(s) would abort school_subject_offerings_unique.', op.data ->> 'duplicate_group_count')
    END,
    jsonb_build_object(
      'target_index_name', 'school_subject_offerings_unique',
      'target_key', '(school_id, academic_year, grade, stream_name, subject_name, language_level)',
      'duplicate_group_count', op.data -> 'duplicate_group_count',
      'duplicates', op.data -> 'duplicates'
    )
  FROM table_flags tf, offerings_probe_raw op

  UNION ALL

  -- Academic Streams Grade Range
  SELECT
    63,
    'D. DATA_INTEGRITY',
    'streams_grade_range_8_to_12',
    CASE
      WHEN NOT tf.has_streams THEN 'PASS'
      WHEN (sp.data ->> 'evaluated')::boolean IS NOT TRUE THEN 'UNKNOWN'
      WHEN (sp.data ->> 'out_of_range_grade_count')::int = 0 THEN 'PASS'
      ELSE 'FAIL'
    END,
    CASE
      WHEN NOT tf.has_streams THEN 'Table academic_streams does not exist yet (0 rows to conflict).'
      WHEN (sp.data ->> 'evaluated')::boolean IS NOT TRUE THEN format('Unable to evaluate academic_streams (%s).', COALESCE(sp.data ->> 'reason', 'unknown'))
      WHEN (sp.data ->> 'out_of_range_grade_count')::int = 0
        THEN format('All %s row(s) have grades within 8-12 (min=%s, max=%s).', sp.data ->> 'total_rows', COALESCE(sp.data ->> 'min_grade', 'n/a'), COALESCE(sp.data ->> 'max_grade', 'n/a'))
      ELSE format('CONFLICT: %s row(s) in academic_streams have NULL or out-of-range grades outside 8-12.', sp.data ->> 'out_of_range_grade_count')
    END,
    jsonb_build_object(
      'total_rows', sp.data -> 'total_rows',
      'min_grade', sp.data -> 'min_grade',
      'max_grade', sp.data -> 'max_grade',
      'out_of_range_grade_ids', sp.data -> 'out_of_range_grade_ids'
    )
  FROM table_flags tf, streams_probe_raw sp

  UNION ALL

  -- Academic Streams Required Columns / Status / Orphans
  SELECT
    64,
    'D. DATA_INTEGRITY',
    'streams_required_columns_and_fk',
    CASE
      WHEN NOT tf.has_streams THEN 'PASS'
      WHEN (sp.data ->> 'evaluated')::boolean IS NOT TRUE THEN 'UNKNOWN'
      WHEN (sp.data ->> 'invalid_status_count')::int = 0
       AND (sp.data ->> 'null_required_count')::int = 0
       AND (sp.data ->> 'orphan_school_count')::int = 0 THEN 'PASS'
      ELSE 'FAIL'
    END,
    CASE
      WHEN NOT tf.has_streams THEN 'Table academic_streams does not exist yet (0 rows).'
      WHEN (sp.data ->> 'evaluated')::boolean IS NOT TRUE THEN format('Unable to evaluate academic_streams (%s).', COALESCE(sp.data ->> 'reason', 'unknown'))
      ELSE format(
        'invalid_status=%s, null_required=%s, orphan_school_id=%s across %s row(s).',
        sp.data ->> 'invalid_status_count',
        sp.data ->> 'null_required_count',
        sp.data ->> 'orphan_school_count',
        sp.data ->> 'total_rows'
      )
    END,
    jsonb_build_object(
      'invalid_status_ids', sp.data -> 'invalid_status_ids',
      'null_required_ids', sp.data -> 'null_required_ids',
      'orphan_school_ids', sp.data -> 'orphan_school_ids'
    )
  FROM table_flags tf, streams_probe_raw sp

  UNION ALL

  -- Proposed academic_streams_active_name Partial Unique Index Compatibility
  SELECT
    65,
    'E. UNIQUE_INDEX_COMPATIBILITY',
    'streams_active_name_conflicts',
    CASE
      WHEN NOT tf.has_streams THEN 'PASS'
      WHEN (sp.data ->> 'evaluated')::boolean IS NOT TRUE THEN 'UNKNOWN'
      WHEN (sp.data ->> 'duplicate_group_count')::int = 0 THEN 'PASS'
      ELSE 'FAIL'
    END,
    CASE
      WHEN NOT tf.has_streams THEN 'Table academic_streams does not exist yet (0 duplicates).'
      WHEN (sp.data ->> 'evaluated')::boolean IS NOT TRUE THEN format('Unable to evaluate academic_streams duplicates (%s).', COALESCE(sp.data ->> 'reason', 'unknown'))
      WHEN (sp.data ->> 'duplicate_group_count')::int = 0
        THEN '0 duplicate active stream names for target partial unique index (school_id, academic_year, grade, LOWER(name)) WHERE status <> ''archived''.'
      ELSE format('CONFLICT: %s duplicate active stream group(s) would abort academic_streams_active_name.', sp.data ->> 'duplicate_group_count')
    END,
    jsonb_build_object(
      'target_index_name', 'academic_streams_active_name',
      'target_key', '(school_id, academic_year, grade, LOWER(name))',
      'target_predicate', 'status <> ''archived''',
      'duplicate_group_count', sp.data -> 'duplicate_group_count',
      'duplicates', sp.data -> 'duplicates'
    )
  FROM table_flags tf, streams_probe_raw sp

  UNION ALL

  -- Subject Change Approvals Integrity & FK Check
  SELECT
    66,
    'D. DATA_INTEGRITY',
    'approvals_integrity_and_fk',
    CASE
      WHEN NOT tf.has_approvals THEN 'PASS'
      WHEN (ap.data ->> 'evaluated')::boolean IS NOT TRUE THEN 'UNKNOWN'
      WHEN (ap.data ->> 'orphan_school_count')::int = 0
       AND (ap.data ->> 'orphan_stream_count')::int = 0
       AND (ap.data ->> 'null_required_count')::int = 0 THEN 'PASS'
      ELSE 'FAIL'
    END,
    CASE
      WHEN NOT tf.has_approvals THEN 'Table subject_change_approvals does not exist yet (0 rows).'
      WHEN (ap.data ->> 'evaluated')::boolean IS NOT TRUE THEN format('Unable to evaluate subject_change_approvals (%s).', COALESCE(ap.data ->> 'reason', 'unknown'))
      ELSE format(
        'orphan_school_id=%s, orphan_stream_id=%s, null_required=%s across %s row(s).',
        ap.data ->> 'orphan_school_count',
        ap.data ->> 'orphan_stream_count',
        ap.data ->> 'null_required_count',
        ap.data ->> 'total_rows'
      )
    END,
    ap.data
  FROM table_flags tf, approvals_probe_raw ap

  UNION ALL

  -- Schools Legacy Curriculum Inventory (Aggregate Only — Zero PII)
  SELECT
    67,
    'D. DATA_INTEGRITY',
    'schools_legacy_curriculum_inventory',
    'INFO',
    format('%s school record(s) inspected for legacy offered_* curriculum presence.', jsonb_array_length(si.data)),
    si.data
  FROM schools_inventory_raw si
),

section_applications AS (
  SELECT
    70 + ROW_NUMBER() OVER (ORDER BY col_name) AS sort_order,
    'F. APPLICATIONS_COMPATIBILITY' AS section,
    'applications_col_' || col_name AS check_name,
    compat_status AS status,
    CASE
      WHEN NOT has_applications THEN format('Table public.applications does not exist (migration skips applications.%s).', col_name)
      WHEN data_type IS NULL THEN format('Column applications.%s does not exist yet (migration will add %s).', col_name, expected_desc)
      WHEN compat_status = 'PASS' THEN format('Column applications.%s exists with compatible type %s.', col_name, data_type)
      ELSE format('INCOMPATIBLE: Column applications.%s exists with type %s (max_len=%s), expected %s.', col_name, data_type, COALESCE(character_maximum_length::text, 'n/a'), expected_desc)
    END AS detail,
    jsonb_build_object(
      'column', col_name,
      'expected', expected_desc,
      'exists', (data_type IS NOT NULL),
      'data_type', data_type,
      'udt_name', udt_name,
      'max_length', character_maximum_length,
      'nullable', is_nullable,
      'default', column_default,
      'related_constraints', related_constraints
    ) AS evidence_json
  FROM app_col_checks
),

-- ---------------------------------------------------------------------------
-- G. Explicit Migration Prerequisite Readiness Summary (PASS / FAIL / UNKNOWN)
-- ---------------------------------------------------------------------------
prereq_rows AS (
  SELECT
    'prereq_schools_pk_ready' AS check_name,
    CASE
      WHEN NOT tf.has_schools THEN 'FAIL'
      WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'schools' AND column_name = 'id' AND data_type IN ('integer', 'bigint')
      ) THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    'schools(id) integer/bigint FK target exists' AS detail
  FROM table_flags tf

  UNION ALL

  SELECT
    'prereq_grade_check_scope_safe',
    CASE
      WHEN EXISTS (SELECT 1 FROM raw_curriculum_constraints WHERE has_mixed_non_grade_clause) THEN 'FAIL'
      ELSE 'PASS'
    END,
    'All CHECK constraints matched by ILIKE %grade% only govern grade range (no mixed non-grade clauses)'

  UNION ALL

  SELECT
    'prereq_offerings_data_and_unique_ready',
    CASE
      WHEN EXISTS (SELECT 1 FROM section_data_and_unique WHERE check_name IN ('offerings_grade_range_8_to_12', 'offerings_required_columns_and_fk', 'offerings_unique_key_conflicts') AND status = 'FAIL') THEN 'FAIL'
      WHEN EXISTS (SELECT 1 FROM section_data_and_unique WHERE check_name IN ('offerings_grade_range_8_to_12', 'offerings_required_columns_and_fk', 'offerings_unique_key_conflicts') AND status = 'UNKNOWN') THEN 'UNKNOWN'
      ELSE 'PASS'
    END,
    'school_subject_offerings grade range, required columns, FK integrity, and unique key compatibility'

  UNION ALL

  SELECT
    'prereq_streams_data_and_unique_ready',
    CASE
      WHEN EXISTS (SELECT 1 FROM section_data_and_unique WHERE check_name IN ('streams_grade_range_8_to_12', 'streams_required_columns_and_fk', 'streams_active_name_conflicts') AND status = 'FAIL') THEN 'FAIL'
      WHEN EXISTS (SELECT 1 FROM section_data_and_unique WHERE check_name IN ('streams_grade_range_8_to_12', 'streams_required_columns_and_fk', 'streams_active_name_conflicts') AND status = 'UNKNOWN') THEN 'UNKNOWN'
      ELSE 'PASS'
    END,
    'academic_streams grade range, required columns, FK integrity, and active-name partial unique compatibility'

  UNION ALL

  SELECT
    'prereq_approvals_integrity_ready',
    CASE
      WHEN EXISTS (SELECT 1 FROM section_data_and_unique WHERE check_name = 'approvals_integrity_and_fk' AND status = 'FAIL') THEN 'FAIL'
      WHEN EXISTS (SELECT 1 FROM section_data_and_unique WHERE check_name = 'approvals_integrity_and_fk' AND status = 'UNKNOWN') THEN 'UNKNOWN'
      ELSE 'PASS'
    END,
    'subject_change_approvals FK integrity and required columns (or table not yet present)'

  UNION ALL

  SELECT
    'prereq_applications_columns_ready',
    CASE
      WHEN NOT (SELECT has_applications FROM table_flags) THEN 'PASS'
      WHEN EXISTS (SELECT 1 FROM app_col_checks WHERE compat_status = 'FAIL') THEN 'FAIL'
      WHEN EXISTS (SELECT 1 FROM app_col_checks WHERE compat_status NOT IN ('PASS', 'INFO')) THEN 'UNKNOWN'
      ELSE 'PASS'
    END,
    'applications additive columns (first_additional_language, academic_stream_id, subject_package) absent or type-compatible'
),

section_prerequisites AS (
  SELECT
    80 + ROW_NUMBER() OVER (ORDER BY check_name) AS sort_order,
    'G. MIGRATION_PREREQUISITES' AS section,
    check_name,
    status,
    detail,
    '{}'::jsonb AS evidence_json
  FROM prereq_rows

  UNION ALL

  SELECT
    99,
    'G. MIGRATION_PREREQUISITES',
    'OVERALL_MIGRATION_PREREQUISITE_VERDICT',
    CASE
      WHEN EXISTS (SELECT 1 FROM prereq_rows WHERE status = 'FAIL') THEN 'FAIL'
      WHEN EXISTS (SELECT 1 FROM prereq_rows WHERE status = 'UNKNOWN') THEN 'UNKNOWN'
      ELSE 'PASS'
    END,
    CASE
      WHEN EXISTS (SELECT 1 FROM prereq_rows WHERE status = 'FAIL')
        THEN 'DO NOT RUN MIGRATION: One or more prerequisites FAILED. Review FAIL rows above.'
      WHEN EXISTS (SELECT 1 FROM prereq_rows WHERE status = 'UNKNOWN')
        THEN 'DO NOT RUN MIGRATION: One or more prerequisites returned UNKNOWN. Investigate before proceeding.'
      ELSE 'ALL PREREQUISITES PASSED: Schema and existing data are compatible with 20261121_curriculum_grades_8_12_upgrade.sql (return output for authorization before executing migration).'
    END,
    (SELECT jsonb_object_agg(check_name, status) FROM prereq_rows)
)

SELECT
  section,
  check_name,
  status,
  detail,
  evidence_json
FROM (
  SELECT * FROM section_identity
  UNION ALL SELECT * FROM section_tables
  UNION ALL SELECT * FROM section_columns
  UNION ALL SELECT * FROM section_constraints
  UNION ALL SELECT * FROM section_indexes
  UNION ALL SELECT * FROM section_data_and_unique
  UNION ALL SELECT * FROM section_applications
  UNION ALL SELECT * FROM section_prerequisites
) all_checks
ORDER BY sort_order, check_name;
