# GELEZA SA — PHASE M3.7 DISPOSABLE DATABASE PREFLIGHT TEST RESULTS

- **Phase:** `M3.7.5 — Disposable PostgreSQL Validation (10 Scenarios)`
- **Validated SQL Package:** `db/diagnostics/20261122_auth_hardening_production_preflight_operator_safe.sql`
- **PostgreSQL Engine:** `PostgreSQL 17.5 on x86_64-windows, compiled by msvc-19.44.35209, 64-bit`
- **Isolated Local Databases Tested (`127.0.0.1:5432` ONLY):**
  - Fresh synthetic disposable validation DB: `geleza_test_m37_20261122121836`
  - Retained Phase M2 staging DB (strictly `BEGIN TRANSACTION READ ONLY` in Scenario 10): `geleza_staging_phase_m2_20261121220348`
- **Production Database Touched:** **NO** (zero production connections or queries; synthetic data only)
- **Static SQL Safety Violations:** `0`
- **Overall Test Outcome:** **`10 / 10 SCENARIOS PASSED` (`0` failures)**

---

## Scenario-by-Scenario Verification Evidence

| # | Scenario Tested | Synthetic Setup (Rolled Back After Check) | Expected Behavior | Observed Result | Elapsed | Status |
| :-: | :--- | :--- | :--- | :--- | :---: | :---: |
| **1** | **Fully compatible schema** | All core + `20261121_*` tables/columns present; clean synthetic users, children, applications, registrations, enrolments | Prerequisites `PASS`, uniqueness `PASS`, provenance `UNVERIFIED`, verdict `PASS` | `core_tables_columns_and_fk_types=PASS`, `prerequisite_20261121_schema_objects=PASS`, `migration_history_provenance=UNVERIFIED`, `OPERATOR_PREFLIGHT_VERDICT=PASS` | 74 ms | **PASS** |
| **2** | **Missing prerequisite table** | `DROP TABLE public.learner_registrations CASCADE` inside rolled-back tx | No crash; missing table reported; verdict `FAIL` | Query succeeded cleanly; `prerequisite_20261121_schema_objects=FAIL (registration_ok=f)`; `OPERATOR_PREFLIGHT_VERDICT=FAIL` | 21 ms | **PASS** |
| **3** | **Missing required column** | `ALTER TABLE public.applications DROP COLUMN academic_year` inside rolled-back tx | No `42703` crash; missing column named; verdict `FAIL` | Query succeeded cleanly; `prerequisite_20261121_schema_objects=FAIL (missing_cols=applications.academic_year)`; `OPERATOR_PREFLIGHT_VERDICT=FAIL` | 24 ms | **PASS** |
| **4** | **Duplicate Learner Number** | Inserted child with `' 20270001 '` colliding with `'20270001'` after trim/upper | Duplicate detected (`dup_child_learner_number_groups=1`); verdict `FAIL` | `duplicate_learner_numbers_check=FAIL`, `dup_child_learner_number_groups=1`, sample IDs returned (zero PII); `OPERATOR_PREFLIGHT_VERDICT=FAIL` | 23 ms | **PASS** |
| **5** | **Duplicate Application Reference** | Inserted application with `'syn-2027-0002'` colliding with `'SYN-2027-0002'` | Duplicate detected (`dup_application_number_groups=1`); verdict `FAIL` | `duplicate_applications_and_active_intake_check=FAIL`, `dup_application_number_groups=1`; `OPERATOR_PREFLIGHT_VERDICT=FAIL` | 20 ms | **PASS** |
| **6** | **Duplicate normalized email** | Inserted user `' VERIFIED.SYN@EXAMPLE.TEST '` colliding with `'verified.syn@example.test'` | Duplicate detected (`dup_lowercase_email_groups=1`); verdict `FAIL` | `legacy_auth_policy_and_duplicate_emails=FAIL`, `dup_lowercase_email_groups=1`; `OPERATOR_PREFLIGHT_VERDICT=FAIL` | 20 ms | **PASS** |
| **7** | **Duplicate active application** | Inserted active `under_review` application with same `school_id`, hyphenated SA ID `'120618-0002-085'`, same `academic_year=2027` | Normalized duplicate detected (`dup_active_app_school_year_groups=1`); verdict `FAIL` | `duplicate_applications_and_active_intake_check=FAIL`, `dup_active_app_school_year_groups=1`; `OPERATOR_PREFLIGHT_VERDICT=FAIL` | 19 ms | **PASS** |
| **8** | **Migration-dependent tables missing** | Dropped `public.application_email_log` and `public.learner_enrolments` inside rolled-back tx | Core schema `PASS`; prereq migrations `FAIL`; enrolments `UNVERIFIED`; no misleading `PASS` | `core_tables_columns_and_fk_types=PASS`, `prerequisite_20261121_schema_objects=FAIL`, `registrations_enrolments_and_family_links=UNVERIFIED`, `migration_history_provenance=UNVERIFIED`, `OPERATOR_PREFLIGHT_VERDICT=FAIL` | 25 ms | **PASS** |
| **9** | **Legacy authentication state (all 5 combinations)** | Seeded users with: (1) hash + `password_set_at`, (2) hash + NULL `password_set_at`, (3) NULL hash, (4) pre-existing `email_verification_status` & `email_verified_at`, (5) legacy plaintext `reset_code` & hashed `reset_code_hash` | Exact counts verified; `existing_legacy_with_verified_ts_count=0`; zero row mutation | `users_total=7` (`will_be_verified=3`, `will_be_legacy_unverified=2`, `will_be_pending_verification=2`, `already_classified=3`, `existing_email_verified_at=1`, `plaintext_resets=1`, `hashed_resets=1`); re-queried `legacy.syn@example.test` confirming `email_verified_at IS NULL` & `email_verification_status IS NULL` unchanged | 26 ms | **PASS** |
| **10** | **Read-only enforcement** | Executed inside `BEGIN TRANSACTION READ ONLY; ... ROLLBACK;` on BOTH `geleza_test_m37_20261122121836` and `geleza_staging_phase_m2_20261121220348` | `transaction_read_only = on`; zero tables created/dropped; zero sequences advanced; zero `n_tup_ins/upd/del` changes | Confirmed `transaction_read_only=on`, identical before/after `information_schema.tables`, `pg_sequences`, and `pg_stat_user_tables` on BOTH databases (`56 ms` and `133 ms`); verdict `PASS / PASS` | 189 ms total | **PASS** |

---

## Limitations Noted

- Local disposable testing used PostgreSQL 17.5 with synthetic school-scale row counts. Production PostgreSQL version (e.g. Supabase PostgreSQL 15/16/17) and larger table sizes may exhibit different execution latency.
- `BEGIN TRANSACTION READ ONLY; ... ROLLBACK;` was tested via the `pg` driver. In the Supabase Web SQL Editor UI, operators should run the single pure `WITH ... SELECT` statement directly so the UI renders the result table (see `README_M3_7_PRODUCTION_PREFLIGHT_OPERATOR_GUIDE.md`).
