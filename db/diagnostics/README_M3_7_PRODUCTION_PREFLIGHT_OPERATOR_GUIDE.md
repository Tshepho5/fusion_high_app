# GELEZA SA — PHASE M3.7 OPERATOR PRODUCTION PREFLIGHT EXECUTION & INTERPRETATION GUIDE

> **CRITICAL WARNING — READ BEFORE PROCEEDING**
>
> **THIS IS A READ-ONLY PREFLIGHT. DO NOT EXECUTE ANY MIGRATION SQL.**
>
> - Do **NOT** execute `db/migrations/20261122_auth_hardening_and_parent_onboarding.sql`.
> - Do **NOT** execute `db/diagnostics/20261122_auth_hardening_post_migration_verify.sql` before migration.
> - A **`PASS`** preflight result confirms structural and duplicate readiness **ONLY** — it does **NOT** authorize running a migration or deploying code.

---

## 1. Exact SQL Package to Use

- **Filename:** `db/diagnostics/20261122_auth_hardening_production_preflight_operator_safe.sql`
- **Mode:** Single pure read-only `WITH ... SELECT` query (zero DDL, zero DML, zero PII, zero secrets).

---

## 2. Step-by-Step Operator Execution Procedure

1. **Verify the Correct Production Project:**
   - Sign into the Supabase Dashboard (or approved PostgreSQL admin client) and confirm the organization, project name, and project reference match the live Geleza SA production database (NOT a staging, dev, or test project).
2. **Verify the Correct PostgreSQL Database & Environment:**
   - Confirm you are targeting the production `postgres` / application database with the `public` schema.
   - If the database identity is uncertain in any way, **STOP immediately**.
3. **Verify Backup / PITR Visibility (Read-Only Check Only):**
   - While in the dashboard, note the most recent verified backup timestamp and whether Point-In-Time Recovery (PITR) is enabled (do **not** trigger a restore).
4. **Open & Review the Exact SQL File:**
   - Open `db/diagnostics/20261122_auth_hardening_production_preflight_operator_safe.sql` locally.
   - Visually confirm it starts with `-- GELEZA SA — PHASE M3.7 OPERATOR-SAFE PRODUCTION READ-ONLY PREFLIGHT PACKAGE` and contains only `WITH ... SELECT` (no `BEGIN`/`ALTER`/`UPDATE`/`INSERT`/`DELETE`/`CREATE`/`DROP`/`DO`).
5. **Execute the Preflight Safely (Choose Method A or Method B):**
   - **Method A — Supabase Web SQL Editor (Recommended for Web UI):**
     1. Open a brand-new blank SQL Editor tab.
     2. Paste the **entire contents** of `20261122_auth_hardening_production_preflight_operator_safe.sql` (do not paste any migration file).
     3. Click **Run**.
     4. *Why no `BEGIN ... ROLLBACK` wrapper in Supabase Web UI?* Because Supabase's web UI displays only the result grid of the **last** statement in a multi-statement run — appending `ROLLBACK;` hides the diagnostic rows behind *"Success. No rows returned"*. Because this file is a single pure `SELECT` statement with zero side effects, Supabase executes it atomically and immediately closes the statement without leaving an open transaction.
   - **Method B — `psql`, DBeaver, or pgAdmin (Explicit Read-Only Transaction Wrapper):**
     1. Run:
        ```sql
        BEGIN TRANSACTION READ ONLY;
        -- Paste full contents of 20261122_auth_hardening_production_preflight_operator_safe.sql here
        ROLLBACK;
        ```
     2. Verify the output displays all **10 rows** (sections `0. IDENTITY` through `V. PREFLIGHT_SUMMARY`) and that `ROLLBACK` completed cleanly with no open transaction.
6. **Confirm Clean Completion:**
   - Confirm exactly **10 rows** are returned (`0. IDENTITY`, `1. CORE_SCHEMA`, two `2. PREREQ_MIGRATIONS` rows, `3. SCHEMA_METADATA`, `4. USER_AUTH_STATE`, two `5. UNIQUENESS` rows, `6. LIFECYCLE_ENROLMENTS`, and `V. PREFLIGHT_SUMMARY`).
   - Confirm zero SQL errors occurred.
7. **Inspect the Final Verdict Row (`OPERATOR_PREFLIGHT_VERDICT`):**
   - Locate section `V. PREFLIGHT_SUMMARY`, check `OPERATOR_PREFLIGHT_VERDICT`.
   - Read both `status` (`PASS` or `FAIL`) and `detail`.
8. **STOP on Any `FAIL` or Unexpected Result:**
   - Do **NOT** attempt to delete, merge, renumber, or update production records to "fix" duplicates.
   - Do **NOT** execute any migration SQL.
9. **Export Anonymized Results Only:**
   - Copy the `section`, `check_name`, `status`, `detail`, and `evidence_json` values into `db/diagnostics/M3_7_PREFLIGHT_RESULT_SUBMISSION_TEMPLATE.md`.
   - Redact any private database name/host if sensitive.
10. **Never Share Sensitive Material:**
    - **NEVER** include database passwords, connection strings, API keys, JWT secrets, parent emails, learner names, SA ID numbers, password hashes, or activation tokens when sharing results.

---

## 3. Preflight Result Interpretation Guide

| Section / Check | What It Checks & Why It Matters | `PASS` | `FAIL` | `INFO` / `UNVERIFIED` | Blocks Migration? | Evidence to Share |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `0. IDENTITY` / `database_identity` | Confirms DB name, schema, PostgreSQL version, and UTC timestamp. | — | — | `INFO`: Verify DB matches production. | **Yes** if identity is uncertain | Redacted DB confirmation + PG version + UTC time |
| `1. CORE_SCHEMA` / `core_tables_columns_and_fk_types` | Verifies `schools`, `users`, `roles`, `applications`, `children` exist, required columns exist, and PK columns referenced by `account_action_tokens` FKs are `integer`/`smallint`. | All core tables, columns & FK target types compatible. | Missing core table/column or incompatible PK type (e.g. `uuid`/`bigint`). | — | **YES** | `status` + `detail` (missing/incompatible column names only) |
| `2. PREREQ_MIGRATIONS` / `prerequisite_20261121_schema_objects` | Verifies structural objects from `20261121_curriculum_grades_8_12_upgrade.sql`, `20261121_integrated_learner_registration.sql`, and `20261121_application_lifecycle_remediation.sql` (including `applications.academic_year`). | All `20261121` prerequisite tables & columns exist. | One or more `20261121` migrations have not been applied. | — | **YES** | `status` + `detail` + `evidence_json` booleans |
| `2. PREREQ_MIGRATIONS` / `migration_history_provenance` | Honestly reports whether a formal migration ledger exists; never fabricates migration history from table presence alone. | — | — | `UNVERIFIED` (expected): confirms operator must cross-check deployment/migration records. | Review required | `status` + `has_schema_migrations_table` + `account_action_tokens_already_exists` |
| `3. SCHEMA_METADATA` / `constraints_fks_and_indexes_inventory` | Snapshots existing constraints, FKs, status CHECK constraints, and indexes on auth/admission tables. | — | — | `INFO`: Count of constraints/indexes + `applications_status_lifecycle_check` flag. | **Yes** if incompatible constraint exists | Counts + `applications_status_lifecycle_check` boolean |
| `4. USER_AUTH_STATE` / `legacy_auth_policy_and_duplicate_emails` | Previews legacy email verification classification (`verified`, `legacy_unverified`, `pending_verification`), checks for duplicate normalized emails, invalid existing statuses, and legacy accounts with fabricated timestamps. | Zero duplicate normalized emails, zero invalid statuses. | `dup_lowercase_email_groups > 0`, invalid status, or `users` missing. | — | **YES** | Aggregate counts + conflict record IDs only (zero emails/PII) |
| `5. UNIQUENESS` / `duplicate_learner_numbers_check` | Detects duplicate `UPPER(TRIM(learner_number))` in `children` (which would cause `20261122` to skip `uniq_children_learner_number`). | Zero duplicate Learner Number groups. | `dup_child_learner_number_groups > 0` or `children` missing. | — | **YES** | Counts + conflict record IDs only |
| `5. UNIQUENESS` / `duplicate_applications_and_active_intake_check` | Detects duplicate `application_number`, duplicate active `(school_id, normalized id_number, academic_year)`, blank identifier counts, and non-canonical `applications.status` values. | Zero duplicate refs, zero duplicate active apps, zero non-canonical statuses. | Any duplicate group > `0` or non-canonical status > `0`. | — | **YES** | Counts + conflict record IDs + status distribution |
| `6. LIFECYCLE_ENROLMENTS` / `registrations_enrolments_and_family_links` | Reports counts for `learner_registrations`, `learner_enrolments` (and active enrolments), `parent_children`, and whether `account_action_tokens` already exists. | — | — | `INFO` when all tables present; `UNVERIFIED` if `parent_children` or `learner_enrolments` missing. | **Yes** if `UNVERIFIED` is unexpected | Aggregate counts only |
| `V. PREFLIGHT_SUMMARY` / `OPERATOR_PREFLIGHT_VERDICT` | Roll-up verdict of all blocking checks. | All automated structural & uniqueness checks passed (does NOT authorize migration). | One or more blocking checks failed. | — | **YES** on `FAIL` | `status`, `detail`, `blocking_failures`, `unverified_notices` |

---

## 4. Mandatory STOP Conditions

**STOP immediately and do NOT proceed toward migration authorization if ANY of the following occur:**

1. Any required core table or required column is missing (`1. CORE_SCHEMA = FAIL`).
2. Any required `20261121` migration dependency is missing (`2. PREREQ_MIGRATIONS = FAIL`).
3. Any duplicate normalized email group exists (`dup_lowercase_email_groups > 0`).
4. Any duplicate Learner Number exists (`dup_child_learner_number_groups > 0`).
5. Any duplicate Application Reference exists (`dup_application_number_groups > 0`).
6. Any duplicate active application exists (`dup_active_app_school_year_groups > 0`).
7. Any non-canonical `applications.status` or invalid `email_verification_status` exists.
8. Any constraint or PK/FK data type is incompatible with `20261122_auth_hardening_and_parent_onboarding.sql`.
9. The SQL Editor returns any runtime error or fewer than 10 diagnostic rows.
10. The database identity is uncertain or not confirmed to be live production.
11. Any critical prerequisite result is ambiguous or unexpectedly `UNVERIFIED`.

> **RECONCILIATION RULE:** Never delete, merge, renumber, or alter production rows to clear a duplicate conflict during preflight. Submit the anonymized conflict IDs for a separately reviewed and explicitly authorized reconciliation plan.
