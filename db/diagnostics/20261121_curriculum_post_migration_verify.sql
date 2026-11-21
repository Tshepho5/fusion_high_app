-- =============================================================================
-- GELEZA SA — POST-MIGRATION READ-ONLY CURRICULUM VERIFICATION DIAGNOSTIC
-- =============================================================================
-- TARGET:     Live Production Supabase PostgreSQL Database (Stage 4 ONLY)
-- MODE:       STRICTLY READ-ONLY (Single WITH ... SELECT query; ZERO DDL/DML)
-- SAFETY:     Contains ZERO schema changes, ZERO row writes, ZERO DO blocks,
--             and ZERO session mutations. Safe to execute in Supabase SQL Editor.
-- PURPOSE:    Verify EVERY schema, constraint, index, foreign-key, column,
--             row-preservation, and uniqueness requirement AFTER executing:
--             db/migrations/20261121_curriculum_grades_8_12_upgrade.sql
--
-- STOP GATE:  Every check in section V. VERIFICATION_SUMMARY must return PASS
--             (and POST_MIGRATION_VERIFICATION_VERDICT = PASS) BEFORE Stage 5
--             backend deployment is authorized.
-- =============================================================================

WITH
table_flags AS (
  SELECT
    (to_regclass('public.schools') IS NOT NULL)                  AS has_schools,
    (to_regclass('public.applications') IS NOT NULL)             AS has_applications,
    (to_regclass('public.school_subject_offerings') IS NOT NULL) AS has_offerings,
    (to_regclass('public.academic_streams') IS NOT NULL)         AS has_streams,
    (to_regclass('public.subject_change_approvals') IS NOT NULL) AS has_approvals
),

-- ---------------------------------------------------------------------------
-- 0. Identity
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
-- 1. Columns: school_subject_offerings.stream_name, subject_change_approvals, applications
-- ---------------------------------------------------------------------------
stream_name_col AS (
  SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'school_subject_offerings'
    AND column_name = 'stream_name'
),

approvals_cols AS (
  SELECT
    COALESCE(array_agg(column_name::text ORDER BY ordinal_position), ARRAY[]::text[]) AS present_cols
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'subject_change_approvals'
),

app_cols AS (
  SELECT
    tf.has_applications,
    req.col_name,
    req.expected_desc,
    col.data_type,
    col.character_maximum_length,
    CASE
      WHEN NOT tf.has_applications THEN 'INFO'
      WHEN col.column_name IS NULL THEN 'FAIL'
      WHEN req.col_name = 'first_additional_language'
        AND col.data_type IN ('character varying', 'text')
        AND (col.character_maximum_length IS NULL OR col.character_maximum_length >= 80) THEN 'PASS'
      WHEN req.col_name = 'academic_stream_id'
        AND col.data_type IN ('integer', 'bigint') THEN 'PASS'
      WHEN req.col_name = 'subject_package'
        AND col.data_type = 'jsonb' THEN 'PASS'
      ELSE 'FAIL'
    END AS status
  FROM table_flags tf
  CROSS JOIN (
    VALUES
      ('first_additional_language', 'VARCHAR(80+) or TEXT'),
      ('academic_stream_id',        'INTEGER or BIGINT'),
      ('subject_package',           'JSONB')
  ) AS req(col_name, expected_desc)
  LEFT JOIN information_schema.columns col
    ON col.table_schema = 'public'
   AND col.table_name = 'applications'
   AND col.column_name = req.col_name
),

-- ---------------------------------------------------------------------------
-- 2. Constraints: Grade 8-12 CHECKs, Category/Status CHECKs, Foreign Keys
-- ---------------------------------------------------------------------------
all_constraints AS (
  SELECT
    rel.relname AS tbl,
    con.conname,
    con.contype,
    pg_get_constraintdef(con.oid) AS condef
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname IN ('school_subject_offerings', 'academic_streams', 'subject_change_approvals')
),

-- ---------------------------------------------------------------------------
-- 3. Indexes: Unique & Lookup Index Exact Key / Predicate Verification
-- ---------------------------------------------------------------------------
all_indexes AS (
  SELECT
    tbl.relname AS tbl,
    idx_cls.relname AS index_name,
    idx.indisunique AS is_unique,
    idx.indisvalid AS is_valid,
    pg_get_indexdef(idx.indexrelid) AS indexdef
  FROM pg_index idx
  JOIN pg_class idx_cls ON idx_cls.oid = idx.indexrelid
  JOIN pg_class tbl ON tbl.oid = idx.indrelid
  JOIN pg_namespace nsp ON nsp.oid = tbl.relnamespace
  WHERE nsp.nspname = 'public'
    AND tbl.relname IN ('school_subject_offerings', 'academic_streams', 'subject_change_approvals')
),

-- ---------------------------------------------------------------------------
-- 4. Dynamic Read-Only Data Integrity & Zero-Duplicate Verification
-- ---------------------------------------------------------------------------
data_probe AS (
  SELECT
    CASE
      WHEN tf.has_schools AND tf.has_offerings AND tf.has_streams AND tf.has_approvals THEN (
        SELECT xt.payload::jsonb
        FROM XMLTABLE(
          '/table/row'
          PASSING query_to_xml(
            $q$
            WITH
            off_dupes AS (
              SELECT school_id, academic_year, grade, stream_name, subject_name, language_level,
                     COUNT(*)::int AS cnt, array_agg(id ORDER BY id) AS ids
              FROM public.school_subject_offerings
              GROUP BY 1, 2, 3, 4, 5, 6
              HAVING COUNT(*) > 1
            ),
            str_dupes AS (
              SELECT school_id, academic_year, grade, LOWER(name) AS lower_name,
                     COUNT(*)::int AS cnt, array_agg(id ORDER BY id) AS ids
              FROM public.academic_streams
              WHERE status <> 'archived'
              GROUP BY 1, 2, 3, 4
              HAVING COUNT(*) > 1
            )
            SELECT jsonb_build_object(
              'evaluated', true,
              'schools_count', (SELECT COUNT(*)::int FROM public.schools),
              'offerings_count', (SELECT COUNT(*)::int FROM public.school_subject_offerings),
              'offerings_null_stream_name', (SELECT COUNT(*)::int FROM public.school_subject_offerings WHERE stream_name IS NULL),
              'offerings_out_of_range_grade', (SELECT COUNT(*)::int FROM public.school_subject_offerings WHERE grade IS NULL OR grade NOT BETWEEN 8 AND 12),
              'offerings_invalid_category', (SELECT COUNT(*)::int FROM public.school_subject_offerings WHERE category IS NULL OR category NOT IN ('language', 'mathematics', 'elective')),
              'offerings_orphan_school', (
                SELECT COUNT(*)::int FROM public.school_subject_offerings o
                LEFT JOIN public.schools s ON s.id = o.school_id WHERE s.id IS NULL
              ),
              'offerings_duplicate_groups', (SELECT COUNT(*)::int FROM off_dupes),
              'offerings_duplicates', COALESCE((SELECT jsonb_agg(to_jsonb(off_dupes)) FROM off_dupes), '[]'::jsonb),
              'streams_count', (SELECT COUNT(*)::int FROM public.academic_streams),
              'streams_out_of_range_grade', (SELECT COUNT(*)::int FROM public.academic_streams WHERE grade IS NULL OR grade NOT BETWEEN 8 AND 12),
              'streams_invalid_status', (SELECT COUNT(*)::int FROM public.academic_streams WHERE status IS NULL OR status NOT IN ('draft', 'published', 'archived')),
              'streams_orphan_school', (
                SELECT COUNT(*)::int FROM public.academic_streams st
                LEFT JOIN public.schools s ON s.id = st.school_id WHERE s.id IS NULL
              ),
              'streams_duplicate_groups', (SELECT COUNT(*)::int FROM str_dupes),
              'streams_duplicates', COALESCE((SELECT jsonb_agg(to_jsonb(str_dupes)) FROM str_dupes), '[]'::jsonb),
              'approvals_count', (SELECT COUNT(*)::int FROM public.subject_change_approvals),
              'approvals_orphan_school', (
                SELECT COUNT(*)::int FROM public.subject_change_approvals a
                LEFT JOIN public.schools s ON s.id = a.school_id WHERE s.id IS NULL
              ),
              'approvals_orphan_stream', (
                SELECT COUNT(*)::int FROM public.subject_change_approvals a
                LEFT JOIN public.academic_streams st ON st.id = a.academic_stream_id
                WHERE a.academic_stream_id IS NOT NULL AND st.id IS NULL
              )
            )::text AS payload
            $q$,
            true, false, ''
          )
          COLUMNS payload text PATH 'payload'
        ) xt
        LIMIT 1
      )
      ELSE jsonb_build_object('evaluated', false, 'reason', 'required_curriculum_table_missing')
    END AS data
  FROM table_flags tf
),

applications_count_probe AS (
  SELECT
    CASE
      WHEN tf.has_applications THEN (
        SELECT xt.cnt
        FROM XMLTABLE(
          '/table/row'
          PASSING query_to_xml(
            $q$ SELECT COUNT(*)::int AS cnt FROM public.applications $q$,
            true, false, ''
          )
          COLUMNS cnt int PATH 'cnt'
        ) xt
        LIMIT 1
      )
      ELSE NULL
    END AS app_count
  FROM table_flags tf
),

-- ---------------------------------------------------------------------------
-- 5. Individual Post-Migration Checks
-- ---------------------------------------------------------------------------
checks AS (
  -- 1. school_subject_offerings.stream_name column
  SELECT
    20 AS sort_order,
    '1. SCHEMA_COLUMNS' AS section,
    'verify_offerings_stream_name_column' AS check_name,
    CASE
      WHEN NOT tf.has_offerings THEN 'FAIL'
      WHEN EXISTS (
        SELECT 1 FROM stream_name_col
        WHERE data_type = 'character varying'
          AND character_maximum_length >= 80
          AND is_nullable = 'NO'
          AND COALESCE(column_default, '') LIKE '''''%'
      ) THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    CASE
      WHEN NOT tf.has_offerings THEN 'FAIL: Table school_subject_offerings does not exist.'
      WHEN NOT EXISTS (SELECT 1 FROM stream_name_col) THEN 'FAIL: Column school_subject_offerings.stream_name is missing.'
      ELSE (
        SELECT format(
          'stream_name exists: type=%s(%s), nullable=%s, default=%s.',
          data_type, COALESCE(character_maximum_length::text, 'unbounded'), is_nullable, COALESCE(column_default, 'none')
        )
        FROM stream_name_col LIMIT 1
      )
    END AS detail,
    COALESCE((SELECT to_jsonb(stream_name_col) FROM stream_name_col LIMIT 1), '{}'::jsonb) AS evidence_json
  FROM table_flags tf

  UNION ALL

  -- 2. school_subject_offerings grade CHECK permits Grades 8-12 (no legacy 10-12 CHECK left)
  SELECT
    21,
    '2. CONSTRAINTS',
    'verify_offerings_grade_check_8_to_12',
    CASE
      WHEN NOT tf.has_offerings THEN 'FAIL'
      WHEN EXISTS (
        SELECT 1 FROM all_constraints
        WHERE tbl = 'school_subject_offerings' AND contype = 'c'
          AND condef ~* 'grade\s*>=\s*8' AND condef ~* 'grade\s*<=\s*12'
      )
      AND NOT EXISTS (
        SELECT 1 FROM all_constraints
        WHERE tbl = 'school_subject_offerings' AND contype = 'c'
          AND condef ~* 'grade\s*>=\s*10'
      ) THEN 'PASS'
      ELSE 'FAIL'
    END,
    CASE
      WHEN NOT tf.has_offerings THEN 'FAIL: Table school_subject_offerings missing.'
      WHEN EXISTS (
        SELECT 1 FROM all_constraints
        WHERE tbl = 'school_subject_offerings' AND contype = 'c' AND condef ~* 'grade\s*>=\s*10'
      ) THEN 'FAIL: Legacy Grade 10-12 CHECK constraint still exists on school_subject_offerings.'
      WHEN EXISTS (
        SELECT 1 FROM all_constraints
        WHERE tbl = 'school_subject_offerings' AND contype = 'c'
          AND condef ~* 'grade\s*>=\s*8' AND condef ~* 'grade\s*<=\s*12'
      ) THEN 'Grade 8-12 CHECK constraint active on school_subject_offerings; no legacy 10-12 CHECK remains.'
      ELSE 'FAIL: No Grade 8-12 CHECK constraint found on school_subject_offerings.'
    END,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', conname, 'definition', condef) ORDER BY conname)
      FROM all_constraints WHERE tbl = 'school_subject_offerings' AND contype = 'c' AND condef ILIKE '%grade%'
    ), '[]'::jsonb)
  FROM table_flags tf

  UNION ALL

  -- 3. school_subject_offerings category CHECK intact
  SELECT
    22,
    '2. CONSTRAINTS',
    'verify_offerings_category_check_intact',
    CASE
      WHEN NOT tf.has_offerings THEN 'FAIL'
      WHEN EXISTS (
        SELECT 1 FROM all_constraints
        WHERE tbl = 'school_subject_offerings' AND contype = 'c'
          AND condef ILIKE '%category%'
          AND condef ILIKE '%language%'
          AND condef ILIKE '%mathematics%'
          AND condef ILIKE '%elective%'
      ) THEN 'PASS'
      ELSE 'FAIL'
    END,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM all_constraints
        WHERE tbl = 'school_subject_offerings' AND contype = 'c'
          AND condef ILIKE '%category%' AND condef ILIKE '%language%'
      ) THEN 'Existing category CHECK constraint (language, mathematics, elective) preserved intact.'
      ELSE 'FAIL: category CHECK constraint on school_subject_offerings is missing.'
    END,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', conname, 'definition', condef) ORDER BY conname)
      FROM all_constraints WHERE tbl = 'school_subject_offerings' AND contype = 'c' AND condef ILIKE '%category%'
    ), '[]'::jsonb)
  FROM table_flags tf

  UNION ALL

  -- 4. academic_streams grade CHECK permits Grades 8-12 (no legacy 10-12 CHECK left)
  SELECT
    23,
    '2. CONSTRAINTS',
    'verify_streams_grade_check_8_to_12',
    CASE
      WHEN NOT tf.has_streams THEN 'FAIL'
      WHEN EXISTS (
        SELECT 1 FROM all_constraints
        WHERE tbl = 'academic_streams' AND contype = 'c'
          AND condef ~* 'grade\s*>=\s*8' AND condef ~* 'grade\s*<=\s*12'
      )
      AND NOT EXISTS (
        SELECT 1 FROM all_constraints
        WHERE tbl = 'academic_streams' AND contype = 'c'
          AND condef ~* 'grade\s*>=\s*10'
      ) THEN 'PASS'
      ELSE 'FAIL'
    END,
    CASE
      WHEN NOT tf.has_streams THEN 'FAIL: Table academic_streams missing.'
      WHEN EXISTS (
        SELECT 1 FROM all_constraints
        WHERE tbl = 'academic_streams' AND contype = 'c' AND condef ~* 'grade\s*>=\s*10'
      ) THEN 'FAIL: Legacy Grade 10-12 CHECK constraint still exists on academic_streams.'
      WHEN EXISTS (
        SELECT 1 FROM all_constraints
        WHERE tbl = 'academic_streams' AND contype = 'c'
          AND condef ~* 'grade\s*>=\s*8' AND condef ~* 'grade\s*<=\s*12'
      ) THEN 'Grade 8-12 CHECK constraint active on academic_streams; no legacy 10-12 CHECK remains.'
      ELSE 'FAIL: No Grade 8-12 CHECK constraint found on academic_streams.'
    END,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', conname, 'definition', condef) ORDER BY conname)
      FROM all_constraints WHERE tbl = 'academic_streams' AND contype = 'c' AND condef ILIKE '%grade%'
    ), '[]'::jsonb)
  FROM table_flags tf

  UNION ALL

  -- 5. academic_streams status CHECK intact
  SELECT
    24,
    '2. CONSTRAINTS',
    'verify_streams_status_check_intact',
    CASE
      WHEN NOT tf.has_streams THEN 'FAIL'
      WHEN EXISTS (
        SELECT 1 FROM all_constraints
        WHERE tbl = 'academic_streams' AND contype = 'c'
          AND condef ILIKE '%status%'
          AND condef ILIKE '%draft%'
          AND condef ILIKE '%published%'
          AND condef ILIKE '%archived%'
      ) THEN 'PASS'
      ELSE 'FAIL'
    END,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM all_constraints
        WHERE tbl = 'academic_streams' AND contype = 'c'
          AND condef ILIKE '%status%' AND condef ILIKE '%archived%'
      ) THEN 'Existing status CHECK constraint (draft, published, archived) preserved intact.'
      ELSE 'FAIL: status CHECK constraint on academic_streams is missing.'
    END,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', conname, 'definition', condef) ORDER BY conname)
      FROM all_constraints WHERE tbl = 'academic_streams' AND contype = 'c' AND condef ILIKE '%status%'
    ), '[]'::jsonb)
  FROM table_flags tf

  UNION ALL

  -- 6. Foreign keys intact across all three curriculum tables
  SELECT
    25,
    '2. CONSTRAINTS',
    'verify_curriculum_foreign_keys_intact',
    CASE
      WHEN EXISTS (SELECT 1 FROM all_constraints WHERE tbl = 'school_subject_offerings' AND contype = 'f' AND condef ILIKE '%REFERENCES schools(id)%')
       AND EXISTS (SELECT 1 FROM all_constraints WHERE tbl = 'academic_streams' AND contype = 'f' AND condef ILIKE '%REFERENCES schools(id)%')
       AND EXISTS (SELECT 1 FROM all_constraints WHERE tbl = 'subject_change_approvals' AND contype = 'f' AND condef ILIKE '%REFERENCES schools(id)%')
       AND EXISTS (SELECT 1 FROM all_constraints WHERE tbl = 'subject_change_approvals' AND contype = 'f' AND condef ILIKE '%REFERENCES academic_streams(id)%')
      THEN 'PASS'
      ELSE 'FAIL'
    END,
    'Verifies schools(id) and academic_streams(id) foreign keys remain intact across school_subject_offerings, academic_streams, and subject_change_approvals.',
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object('table', tbl, 'name', conname, 'definition', condef) ORDER BY tbl, conname)
      FROM all_constraints WHERE contype = 'f'
    ), '[]'::jsonb)

  UNION ALL

  -- 7. school_subject_offerings_unique exact 6-column key
  SELECT
    30,
    '3. INDEXES',
    'verify_offerings_unique_index_exact_key',
    CASE
      WHEN EXISTS (
        SELECT 1 FROM all_indexes
        WHERE tbl = 'school_subject_offerings'
          AND index_name = 'school_subject_offerings_unique'
          AND is_unique = TRUE
          AND is_valid = TRUE
          AND indexdef ~* '\(\s*school_id,\s*academic_year,\s*grade,\s*stream_name,\s*subject_name,\s*language_level\s*\)'
      ) THEN 'PASS'
      ELSE 'FAIL'
    END,
    COALESCE(
      (SELECT format('Valid UNIQUE index found: %s', indexdef)
       FROM all_indexes WHERE tbl = 'school_subject_offerings' AND index_name = 'school_subject_offerings_unique' LIMIT 1),
      'FAIL: Index school_subject_offerings_unique is missing.'
    ),
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', index_name, 'unique', is_unique, 'valid', is_valid, 'definition', indexdef))
      FROM all_indexes WHERE tbl = 'school_subject_offerings' AND index_name = 'school_subject_offerings_unique'
    ), '[]'::jsonb)

  UNION ALL

  -- 8. academic_streams_active_name exact key + partial predicate
  SELECT
    31,
    '3. INDEXES',
    'verify_streams_active_name_unique_index',
    CASE
      WHEN EXISTS (
        SELECT 1 FROM all_indexes
        WHERE tbl = 'academic_streams'
          AND index_name = 'academic_streams_active_name'
          AND is_unique = TRUE
          AND is_valid = TRUE
          AND indexdef ~* '\(\s*school_id,\s*academic_year,\s*grade,\s*lower\(\(?name\)?(::text)?\)\s*\)'
          AND indexdef ~* 'WHERE\s+.*status.*<>.*''archived'''
      ) THEN 'PASS'
      ELSE 'FAIL'
    END,
    COALESCE(
      (SELECT format('Valid partial UNIQUE index found: %s', indexdef)
       FROM all_indexes WHERE tbl = 'academic_streams' AND index_name = 'academic_streams_active_name' LIMIT 1),
      'FAIL: Index academic_streams_active_name is missing.'
    ),
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', index_name, 'unique', is_unique, 'valid', is_valid, 'definition', indexdef))
      FROM all_indexes WHERE tbl = 'academic_streams' AND index_name = 'academic_streams_active_name'
    ), '[]'::jsonb)

  UNION ALL

  -- 9. Lookup indexes exist and are valid
  SELECT
    32,
    '3. INDEXES',
    'verify_curriculum_lookup_indexes',
    CASE
      WHEN EXISTS (
        SELECT 1 FROM all_indexes
        WHERE tbl = 'school_subject_offerings'
          AND index_name = 'school_subject_offerings_lookup'
          AND is_valid = TRUE
          AND indexdef ~* '\(\s*school_id,\s*academic_year,\s*grade,\s*is_active\s*\)'
      )
      AND EXISTS (
        SELECT 1 FROM all_indexes
        WHERE tbl = 'academic_streams'
          AND index_name = 'academic_streams_lookup'
          AND is_valid = TRUE
          AND indexdef ~* '\(\s*school_id,\s*academic_year,\s*grade,\s*status\s*\)'
      ) THEN 'PASS'
      ELSE 'FAIL'
    END,
    'Verifies school_subject_offerings_lookup and academic_streams_lookup exist with expected column lists and are valid.',
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object('table', tbl, 'name', index_name, 'valid', is_valid, 'definition', indexdef) ORDER BY tbl, index_name)
      FROM all_indexes WHERE index_name IN ('school_subject_offerings_lookup', 'academic_streams_lookup')
    ), '[]'::jsonb)

  UNION ALL

  -- 10. subject_change_approvals structure
  SELECT
    40,
    '4. SUPPORTING_TABLES',
    'verify_subject_change_approvals_structure',
    CASE
      WHEN NOT tf.has_approvals THEN 'FAIL'
      WHEN ac.present_cols @> ARRAY['id', 'school_id', 'id_number', 'academic_year', 'grade', 'academic_stream_id', 'approved_by', 'created_at']::text[]
       AND EXISTS (SELECT 1 FROM all_constraints WHERE tbl = 'subject_change_approvals' AND contype = 'p')
      THEN 'PASS'
      ELSE 'FAIL'
    END,
    CASE
      WHEN NOT tf.has_approvals THEN 'FAIL: Table subject_change_approvals does not exist.'
      ELSE format('subject_change_approvals columns present: %s.', array_to_string(ac.present_cols, ', '))
    END,
    jsonb_build_object('exists', tf.has_approvals, 'columns', to_jsonb(ac.present_cols))
  FROM table_flags tf, approvals_cols ac

  UNION ALL

  -- 11. applications required additive columns compatibility
  SELECT
    41,
    '4. SUPPORTING_TABLES',
    'verify_applications_columns_compatible',
    CASE
      WHEN NOT tf.has_applications THEN 'INFO'
      WHEN EXISTS (SELECT 1 FROM app_cols WHERE status = 'FAIL') THEN 'FAIL'
      WHEN (SELECT COUNT(*) FROM app_cols WHERE status = 'PASS') = 3 THEN 'PASS'
      ELSE 'UNKNOWN'
    END,
    CASE
      WHEN NOT tf.has_applications THEN 'Table public.applications does not exist on this database.'
      WHEN EXISTS (SELECT 1 FROM app_cols WHERE status = 'FAIL') THEN 'FAIL: One or more required applications columns are missing or have an incompatible data type.'
      ELSE 'All 3 applications columns (first_additional_language, academic_stream_id, subject_package) present with compatible types.'
    END,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object('column', col_name, 'expected', expected_desc, 'data_type', data_type, 'max_length', character_maximum_length, 'status', status) ORDER BY col_name)
      FROM app_cols
    ), '[]'::jsonb)
  FROM table_flags tf

  UNION ALL

  -- 12. Data Preservation, Integrity & Zero Duplicates
  SELECT
    50,
    '5. DATA_AND_UNIQUENESS',
    'verify_row_counts_and_data_integrity',
    CASE
      WHEN (dp.data ->> 'evaluated')::boolean IS NOT TRUE THEN 'UNKNOWN'
      WHEN (dp.data ->> 'offerings_null_stream_name')::int = 0
       AND (dp.data ->> 'offerings_out_of_range_grade')::int = 0
       AND (dp.data ->> 'offerings_invalid_category')::int = 0
       AND (dp.data ->> 'offerings_orphan_school')::int = 0
       AND (dp.data ->> 'streams_out_of_range_grade')::int = 0
       AND (dp.data ->> 'streams_invalid_status')::int = 0
       AND (dp.data ->> 'streams_orphan_school')::int = 0
       AND (dp.data ->> 'approvals_orphan_school')::int = 0
       AND (dp.data ->> 'approvals_orphan_stream')::int = 0
      THEN 'PASS'
      ELSE 'FAIL'
    END,
    CASE
      WHEN (dp.data ->> 'evaluated')::boolean IS NOT TRUE
        THEN format('UNKNOWN: Could not evaluate curriculum data (%s).', COALESCE(dp.data ->> 'reason', 'unknown'))
      ELSE format(
        'schools=%s, offerings=%s, streams=%s, approvals=%s, applications=%s | null_stream_name=%s, bad_grades=%s, orphans=%s.',
        dp.data ->> 'schools_count',
        dp.data ->> 'offerings_count',
        dp.data ->> 'streams_count',
        dp.data ->> 'approvals_count',
        COALESCE(acp.app_count::text, 'n/a'),
        dp.data ->> 'offerings_null_stream_name',
        ((dp.data ->> 'offerings_out_of_range_grade')::int + (dp.data ->> 'streams_out_of_range_grade')::int)::text,
        ((dp.data ->> 'offerings_orphan_school')::int + (dp.data ->> 'streams_orphan_school')::int + (dp.data ->> 'approvals_orphan_school')::int + (dp.data ->> 'approvals_orphan_stream')::int)::text
      )
    END,
    dp.data || jsonb_build_object('applications_count', acp.app_count)
  FROM data_probe dp, applications_count_probe acp

  UNION ALL

  SELECT
    51,
    '5. DATA_AND_UNIQUENESS',
    'verify_zero_duplicates_against_target_indexes',
    CASE
      WHEN (dp.data ->> 'evaluated')::boolean IS NOT TRUE THEN 'UNKNOWN'
      WHEN (dp.data ->> 'offerings_duplicate_groups')::int = 0
       AND (dp.data ->> 'streams_duplicate_groups')::int = 0
      THEN 'PASS'
      ELSE 'FAIL'
    END,
    CASE
      WHEN (dp.data ->> 'evaluated')::boolean IS NOT TRUE
        THEN format('UNKNOWN: Could not evaluate duplicate keys (%s).', COALESCE(dp.data ->> 'reason', 'unknown'))
      WHEN (dp.data ->> 'offerings_duplicate_groups')::int = 0
       AND (dp.data ->> 'streams_duplicate_groups')::int = 0
        THEN '0 duplicate groups on school_subject_offerings_unique and 0 duplicate active names on academic_streams_active_name.'
      ELSE format(
        'FAIL: offerings_duplicate_groups=%s, streams_duplicate_groups=%s.',
        dp.data ->> 'offerings_duplicate_groups',
        dp.data ->> 'streams_duplicate_groups'
      )
    END,
    jsonb_build_object(
      'offerings_duplicate_groups', dp.data -> 'offerings_duplicate_groups',
      'offerings_duplicates', dp.data -> 'offerings_duplicates',
      'streams_duplicate_groups', dp.data -> 'streams_duplicate_groups',
      'streams_duplicates', dp.data -> 'streams_duplicates'
    )
  FROM data_probe dp
),

summary_verdict AS (
  SELECT
    99 AS sort_order,
    'V. VERIFICATION_SUMMARY' AS section,
    'POST_MIGRATION_VERIFICATION_VERDICT' AS check_name,
    CASE
      WHEN EXISTS (SELECT 1 FROM checks WHERE status = 'FAIL') THEN 'FAIL'
      WHEN EXISTS (SELECT 1 FROM checks WHERE status = 'UNKNOWN') THEN 'UNKNOWN'
      WHEN (SELECT COUNT(*) FROM checks WHERE status = 'PASS') >= 12 THEN 'PASS'
      ELSE 'UNKNOWN'
    END AS status,
    CASE
      WHEN EXISTS (SELECT 1 FROM checks WHERE status = 'FAIL')
        THEN 'STOP — DO NOT DEPLOY: One or more post-migration verification checks FAILED.'
      WHEN EXISTS (SELECT 1 FROM checks WHERE status = 'UNKNOWN')
        THEN 'STOP — DO NOT DEPLOY: One or more post-migration checks returned UNKNOWN.'
      WHEN (SELECT COUNT(*) FROM checks WHERE status = 'PASS') >= 12
        THEN 'ALL POST-MIGRATION CHECKS PASSED: Compare row counts against Phase F preflight baseline (48 offerings, 15 streams) before requesting Stage 5 backend deployment authorization.'
      ELSE 'STOP — DO NOT DEPLOY: Not all mandatory checks evaluated to PASS.'
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
) all_rows
ORDER BY sort_order, check_name;
