# Geleza SA — Production Read-Only Curriculum Preflight Guide

This runbook guides an authorized database operator through running the **strictly read-only** preflight diagnostic script against the live production Supabase PostgreSQL database **before** authorizing [20261121_curriculum_grades_8_12_upgrade.sql](../migrations/20261121_curriculum_grades_8_12_upgrade.sql).

> **DO NOT EXECUTE THE MIGRATION AT THIS STAGE.**
> Only execute `db/diagnostics/20261121_curriculum_production_preflight.sql`. It contains pure `SELECT` queries only and makes zero schema or data changes.

---

## 1. Open the Correct Supabase Project

1. Sign in to the **Supabase Dashboard** using your authorized production operator account.
2. Select the **Geleza SA / Fusion High Production** organization and project (the same project referenced by your live Render backend service `fusion-high-backend`).
3. In the left navigation bar, click **SQL Editor**.

---

## 2. Verify You Are Inspecting the Actual Production Project

Before running any query, double-check all three indicators:

1. **Supabase Project URL / Reference**: Confirm the project reference in your browser URL matches the live production database configured in Render's `DATABASE_URL` environment variable *(do not copy or paste the password or full URI anywhere)*.
2. **Active Schools Cross-Check**: Look at the `schools_legacy_curriculum_inventory` row returned in Section `D` of the diagnostic — the `school_id` and `school_name` list must match the live production schools served by `https://fusion-high-backend.onrender.com/api/schools` (e.g., `Walters High School` and `Geleza SA Tester School`).
3. **Database Identity Row**: Check row `0. IDENTITY → database_identity` in the output (`database = postgres`, `schema = public`, current UTC timestamp).

---

## 3. Open and Execute the Read-Only Diagnostic SQL Script

1. Open [20261121_curriculum_production_preflight.sql](./20261121_curriculum_production_preflight.sql) locally and copy its entire contents.
2. In Supabase **SQL Editor**, click **+ New query** and paste the script.
3. Visually verify that the pasted query is a single `WITH ... SELECT ... ORDER BY ...;` statement containing **no** `CREATE`, `ALTER`, `DROP`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, or `SET` statements.
4. Click **Run** (or press `Ctrl+Enter`).
5. Because the script returns **one unified result grid** across Sections `0` and `A` through `G`, every check will appear in the Supabase results table at once.

---

## 4. How to Interpret Each Result Section

Each row contains five columns: `section`, `check_name`, `status`, `detail`, and `evidence_json`.

| Section | What It Reports | What to Look For |
|---|---|---|
| **`0. IDENTITY`** | Database name, schema, PostgreSQL version, UTC timestamp | Confirms you are on the live production Supabase Postgres instance. |
| **`A. TABLE_EXISTENCE`** | Existence of `schools`, `applications`, `school_subject_offerings`, `academic_streams`, `subject_change_approvals`, `learner_registrations` | `schools` must be `PASS`. Other curriculum tables may be `PASS` (exists) or `INFO` (not yet created). |
| **`B. COLUMN_METADATA`** | Exact columns, types, lengths, nullability, and defaults for all 5 tables | On legacy production v1, `columns_school_subject_offerings` will show `stream_name column present=false` — confirming the root cause of the current live HTTP 500. |
| **`C. CONSTRAINTS` & `C. INDEXES`** | Exact `pg_constraint` definitions (`CHECK`, `FOREIGN KEY`, `PRIMARY KEY`, `UNIQUE`) and exact `pg_indexes` definitions | Verify which constraints have `matches_grade_drop_rule = true` (only grade CHECK constraints should be flagged; `category`, `status`, and foreign keys must have `matches_grade_drop_rule = false`). |
| **`D. DATA_INTEGRITY`** | Out-of-range grades (`NOT BETWEEN 8 AND 12`), NULL required values, invalid `category`/`status`, orphaned `school_id` rows, and aggregate per-school legacy curriculum presence | All integrity checks must be `PASS` (0 offending IDs). |
| **`E. UNIQUE_INDEX_COMPATIBILITY`** | Duplicate-key checks against the exact proposed migration indexes: `school_subject_offerings_unique` on `(school_id, academic_year, grade, stream_name, subject_name, language_level)` and `academic_streams_active_name` on `(school_id, academic_year, grade, LOWER(name)) WHERE status <> 'archived'` | Must report `PASS` with `duplicate_group_count = 0`. |
| **`F. APPLICATIONS_COMPATIBILITY`** | Checks `applications.first_additional_language`, `applications.academic_stream_id`, and `applications.subject_package` | Must be `PASS` (column absent or already has a compatible type). |
| **`G. MIGRATION_PREREQUISITES`** | Roll-up readiness gate for all prerequisites + `OVERALL_MIGRATION_PREREQUISITE_VERDICT` | See Section 5 below. |

---

## 5. Checks That MUST Be `PASS` Before Migration Authorization

Every one of the following rows in `G. MIGRATION_PREREQUISITES` **must** show `status = 'PASS'`:

1. `prereq_schools_pk_ready` → **`PASS`**
2. `prereq_grade_check_scope_safe` → **`PASS`**
3. `prereq_offerings_data_and_unique_ready` → **`PASS`**
4. `prereq_streams_data_and_unique_ready` → **`PASS`**
5. `prereq_approvals_integrity_ready` → **`PASS`**
6. `prereq_applications_columns_ready` → **`PASS`**
7. `OVERALL_MIGRATION_PREREQUISITE_VERDICT` → **`PASS`**

In addition, confirm in `C. CONSTRAINTS` that **only** grade-range `CHECK` constraints have `matches_grade_drop_rule = true` and `has_mixed_non_grade_clause = false` (no unrelated constraint has the word `grade` in its definition).

---

## 6. What to Do If Any Check Returns `FAIL` or `UNKNOWN`

**STOP immediately. Do NOT execute the upgrade migration.**

- **Duplicate rows (`offerings_unique_key_conflicts` or `streams_active_name_conflicts = FAIL`)**:
  - Inspect `evidence_json -> duplicates`, which lists the exact conflicting key tuple and row `ids` array.
  - Do **not** blindly delete rows. Review the conflicting records with the school administrator / engineering team to decide which duplicate record should be archived or merged under a controlled, audited cleanup plan.
- **Out-of-range grades or invalid `category` / `status` (`DATA_INTEGRITY = FAIL`)**:
  - Inspect the exact row IDs in `evidence_json` and resolve them manually before retrying preflight.
- **Unexpected constraint flagged with `matches_grade_drop_rule = true`**:
  - Report the exact constraint name and definition from `C. CONSTRAINTS` so the migration SQL can be narrowed to drop only the specific legacy grade-range constraint.
- **Incompatible `applications` column type (`F. APPLICATIONS_COMPATIBILITY = FAIL`)**:
  - Report the existing column type and constraints from `evidence_json` so the migration can be adjusted safely without data conversion errors.
- **Any check returns `UNKNOWN`**:
  - Treat `UNKNOWN` as a stop condition. Verify operator role read permissions on `public.*` tables and re-run the read-only diagnostic.

---

## 7. How to Return Diagnostic Output Safely (Without Exposing Secrets)

1. In Supabase SQL Editor's result toolbar, click **Export → Copy as JSON** (or **Download CSV**).
2. Review the exported rows before sharing:
   - The diagnostic returns **only** table/column/constraint/index metadata, row counts, conflicting numeric IDs (if any), and school IDs/names.
   - It contains **no** passwords, tokens, connection strings, API keys, emails, phone numbers, ID numbers, or learner/parent personal records.
3. Paste or attach the exported diagnostic JSON/CSV for engineering review.
4. Wait for written review and explicit authorization before taking a production backup and executing `db/migrations/20261121_curriculum_grades_8_12_upgrade.sql`.
