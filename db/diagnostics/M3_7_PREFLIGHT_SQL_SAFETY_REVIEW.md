# GELEZA SA — PHASE M3.7 PREFLIGHT SQL SAFETY & COVERAGE REVIEW

- **Phase:** `M3.7.2 & M3.7.3 — Exact SQL Safety & Diagnostic Coverage Review`
- **Target Migration Under Audit:** `db/migrations/20261122_auth_hardening_and_parent_onboarding.sql`
- **Reviewed SQL Artifacts:**
  1. Original tracked repo preflight (preserved untouched): `db/diagnostics/20261122_auth_hardening_production_preflight.sql`
  2. Phase M3.2 unified draft (scratch, preserved untouched): `m32_unified_preflight.sql`
  3. **New Validated Operator-Safe Package:** `db/diagnostics/20261122_auth_hardening_production_preflight_operator_safe.sql`

> **IMPORTANT:** Neither the original SQL nor the new operator-safe package has been executed against live production PostgreSQL. All testing occurred exclusively on isolated loopback disposable databases.

---

## 1. Static Read-Only Safety Analysis

Automated regex and manual statement-by-statement review of `db/diagnostics/20261122_auth_hardening_production_preflight_operator_safe.sql` (including inside all dollar-quoted `$q$ ... $q$` SQL strings passed to `query_to_xml`) confirmed **zero mutating constructs**:

| Forbidden Construct | Found? | Verification Basis |
| :--- | :---: | :--- |
| `INSERT`, `UPDATE`, `DELETE`, `MERGE`, `UPSERT` | **NO (0)** | Static scan + `BEGIN TRANSACTION READ ONLY` execution |
| `DROP`, `ALTER`, `TRUNCATE`, `CREATE` | **NO (0)** | Static scan + `information_schema.tables` before/after diff |
| `GRANT`, `REVOKE`, `VACUUM`, `ANALYZE`, `CALL` | **NO (0)** | Static scan |
| `DO $$` anonymous code blocks | **NO (0)** | Pure single `WITH ... SELECT` query only |
| `SET` configuration changes | **NO (0)** | Static scan (`current_setting()` read-only inspection only) |
| `TEMP TABLE` / persistent objects | **NO (0)** | Static scan + catalog snapshot diff |
| `nextval()` / `setval()` / sequence side effects | **NO (0)** | Static scan + `pg_sequences.last_value` before/after diff |
| `pg_terminate_backend()` / volatile admin functions | **NO (0)** | Static scan |

---

## 2. Specific Technical Hazards Identified in Prior SQL & Corrections Made

| # | Hazard Found in Earlier Preflight SQL | Impact if Run on Production | Correction in `20261122_auth_hardening_production_preflight_operator_safe.sql` |
| :-: | :--- | :--- | :--- |
| **1** | **Direct column references inside `query_to_xml()`** (`email`, `learner_number`, `application_number`, `school_id`, `id_number`, `status`) | If any core column were missing on a target DB, `query_to_xml` threw `ERROR 42703` instead of returning a `FAIL` diagnostic row. | Replaced every data-probe column reference with `to_jsonb(tbl) ->> 'col'` and split `users_probe`, `children_probe`, `applications_probe`, and `lifecycle_probe` independently so a missing table/column never crashes unrelated checks. |
| **2** | **Unchecked `::int` cast on `academic_year`** | Any non-numeric string in a non-integer `academic_year` column would throw `ERROR 22P02`. | Guarded with regex `~ '^\s*\d{4}\s*$'` before casting to `int`. |
| **3** | **Unbounded duplicate conflict arrays (`jsonb_agg`)** | A large table with thousands of duplicate rows could produce a multi-megabyte JSON cell or slow SQL Editor rendering. | Capped sample conflict ID lists to `LIMIT 50` groups (ordered by largest conflict count) while still reporting the exact total conflict group count. |
| **4** | **No PK / FK target type compatibility check** | `20261122` defines `account_action_tokens` FKs as `INTEGER REFERENCES schools/users/children/applications(id)`. A `bigint` or `uuid` PK on production would fail FK creation. | Added explicit `core_fk_target` type-family validation (`integer` / `smallint`) in `col_audit`. |
| **5** | **Implicit assumption of migration completion** | Checking only table presence could mislead operators into assuming `20261121_*` migrations were formally recorded. | Separated `2. PREREQ_MIGRATIONS / prerequisite_20261121_schema_objects` (`PASS`/`FAIL`) from `migration_history_provenance` (explicitly **`UNVERIFIED`** when no formal ledger proves execution history). |
| **6** | **Missing NULL/blank identifier and non-canonical status checks** | Blank `learner_number`, `application_number`, `id_number`, `school_id`, `academic_year`, or unexpected `applications.status` / `email_verification_status` values were not explicitly counted. | Added explicit counts for all blank/NULL identifier fields, `non_canonical_status_count`, `invalid_existing_ev_status_count`, and `existing_legacy_with_verified_ts_count`. |
| **7** | **Supabase SQL Editor `ROLLBACK;` result-hiding quirk** | Wrapping `BEGIN TRANSACTION READ ONLY; <SELECT>; ROLLBACK;` in Supabase Web SQL Editor executes cleanly, but Supabase UI displays only the final statement (`ROLLBACK` → *"Success. No rows returned"*), hiding the diagnostic table. | Packaged the file as a pure single-statement `WITH ... SELECT` (auto-terminated read-only snapshot in Supabase Web SQL Editor) AND documented the explicit `BEGIN TRANSACTION READ ONLY; ... ROLLBACK;` wrapper for `psql` / DBeaver / pgAdmin. |

---

## 3. Why `query_to_xml` + `XMLTABLE` Is Retained & Safety Proof

- **Why required:** In PostgreSQL, static `FROM public.learner_registrations` or `FROM public.account_action_tokens` fails at **parse time** (`ERROR 42P01: relation does not exist`) if that table has not yet been created — even inside an unevaluated `CASE WHEN` branch. Using `query_to_xml` inside a `CASE WHEN to_regclass('public.<table>') IS NOT NULL` guard is the only pure-SQL, zero-DDL way in PostgreSQL (without `DO $$` blocks or temporary functions) to safely inspect tables that may or may not exist yet.
- **Safety proof:** Every `$q$ ... $q$` query inside `query_to_xml` is a static string literal (zero user input, zero dynamic concatenation/injection surface) containing strictly read-only `SELECT` statements. PostgreSQL enforces `transaction_read_only = on` inside `query_to_xml` execution (verified in Scenario 10 on PostgreSQL 17.5).

---

## 4. Remaining Limitations & Performance Considerations

1. **Full-table scans on `users`, `children`, and `applications`:** Duplicate detection (`GROUP BY`) performs sequential scans on these tables. On typical school-scale datasets (< 100k rows), execution completes in < 1 second (19–133 ms on local disposable databases). On very large tables, run during a low-traffic window.
2. **Schema scope:** Checks target the `public` schema (matching `20261122_auth_hardening_and_parent_onboarding.sql`).
3. **No PII exported, by design:** Conflict reports emit only database record `id` values and counts — never email addresses, names, SA IDs, or Learner Numbers. Manual reconciliation (if duplicates exist) requires a separately authorized operator lookup.
4. **No formal migration ledger:** Because Geleza SA does not maintain a `schema_migrations` ledger, `migration_history_provenance` intentionally reports `UNVERIFIED` rather than fabricating migration completion history.
