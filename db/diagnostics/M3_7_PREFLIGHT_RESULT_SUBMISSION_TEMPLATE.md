# GELEZA SA — PHASE M3.7 ANONYMIZED PRODUCTION PREFLIGHT RESULT SUBMISSION TEMPLATE

> **PRIVACY & SECURITY REMINDER:**
> Do **NOT** paste database passwords, connection strings, API keys, tokens, parent/learner emails, names, SA ID numbers, phone numbers, or password hashes anywhere in this form. Share **anonymized counts, statuses, schema metadata, and numeric conflict IDs only**.

---

## 1. Execution & Environment Confirmation

- **SQL File Executed:** `db/diagnostics/20261122_auth_hardening_production_preflight_operator_safe.sql`
- **Production Project / DB Identity Confirmed (Redacted):** `[e.g. Confirmed live Geleza SA Supabase production DB — name redacted]`
- **PostgreSQL Version (`0. IDENTITY`):** `[e.g. PostgreSQL 15.x / 16.x / 17.x]`
- **Execution Date & Time (UTC):** `[YYYY-MM-DDTHH:MM:SSZ]`
- **Execution Method Used:** `[ ] Supabase SQL Editor (single pure SELECT)  [ ] psql/DBeaver with BEGIN TRANSACTION READ ONLY ... ROLLBACK`
- **Read-Only Execution Confirmed:** `[ ] YES — zero writes executed`
- **No Migration Executed Confirmed:** `[ ] YES — 20261122 migration was NOT executed`
- **Rows Returned (expected 10):** `[ ]`

---

## 2. Core Schema & Migration Dependency Results

- **`1. CORE_SCHEMA` (`core_tables_columns_and_fk_types`):** `[PASS / FAIL]`
  - Missing or type-incompatible objects (if any): `[none / list column names only]`
- **`2. PREREQ_MIGRATIONS` (`prerequisite_20261121_schema_objects`):** `[PASS / FAIL]`
  - `curriculum_20261121` (`school_subject_offerings`, `academic_streams`): `[true / false]`
  - `registration_20261121` (`learner_registrations`): `[true / false]`
  - `lifecycle_20261121` (`application_document_requests`, `application_status_history`, `application_email_log`): `[true / false]`
  - Missing prerequisite columns (if any): `[none / list]`
- **`2. PREREQ_MIGRATIONS` (`migration_history_provenance`):** `[UNVERIFIED]`
  - `account_action_tokens_already_exists`: `[true / false]`
- **`3. SCHEMA_METADATA` (`constraints_fks_and_indexes_inventory`):**
  - Constraints count: `[ ]` | Indexes count: `[ ]`
  - `applications_status_lifecycle_check` present: `[true / false]`

---

## 3. Duplicate & Integrity Checks

- **`4. USER_AUTH_STATE` (`legacy_auth_policy_and_duplicate_emails`):** `[PASS / FAIL]`
  - Duplicate normalized email groups (`dup_lowercase_email_groups`): `[ ]`
  - Conflict record IDs only (if > 0): `[ ]`
- **`5. UNIQUENESS` (`duplicate_learner_numbers_check`):** `[PASS / FAIL]`
  - Duplicate Learner Number groups (`dup_child_learner_number_groups`): `[ ]`
  - Conflict record IDs only (if > 0): `[ ]`
- **`5. UNIQUENESS` (`duplicate_applications_and_active_intake_check`):** `[PASS / FAIL]`
  - Duplicate Application Reference groups (`dup_application_number_groups`): `[ ]`
  - Conflict record IDs only (if > 0): `[ ]`
  - Duplicate active application groups (`dup_active_app_school_year_groups`): `[ ]`
  - Conflict `(school_id, academic_year, ids)` only (if > 0): `[ ]`
  - Non-canonical application statuses (`non_canonical_status_count`): `[ ]`
  - Blank/NULL identifier counts: `blank_email=[ ]`, `blank_ln=[ ]`, `blank_app_ref=[ ]`, `blank_id=[ ]`, `blank_school=[ ]`, `blank_year=[ ]`

---

## 4. Existing Authentication, Registration & Enrolment Counts

- **Users (`users_total`):** `[ ]`
  - `will_be_verified`: `[ ]`
  - `will_be_legacy_unverified`: `[ ]`
  - `will_be_pending_verification`: `[ ]`
  - `already_classified_count`: `[ ]` | `invalid_existing_ev_status_count`: `[ ]`
  - `existing_activation_token_rows`: `[ ]`
  - `existing_plaintext_reset_code_rows`: `[ ]` | `existing_hashed_reset_code_rows`: `[ ]`
- **Children (`children_total` / `children_active_count`):** `[ ] / [ ]`
- **Applications (`applications_total`):** `[ ]`
  - Status distribution JSON: `[paste application_status_distribution object]`
- **Lifecycle & Enrolments (`6. LIFECYCLE_ENROLMENTS`):** `[INFO / UNVERIFIED]`
  - `learner_registrations_count`: `[ ]`
  - `learner_enrolments_count` / `active_enrolments_count`: `[ ] / [ ]`
  - `parent_children_count`: `[ ]`
  - `existing_action_tokens_count`: `[ ]`

---

## 5. Overall Verdict, Errors & Blockers

- **`V. PREFLIGHT_SUMMARY` (`OPERATOR_PREFLIGHT_VERDICT`):** `[PASS / FAIL]`
- **Blocking Failures Listed:** `[ ]`
- **Unverified Notices Listed:** `[ ]`
- **SQL Errors Encountered (if any):** `[none / exact PostgreSQL error code & message without PII]`

---

## 6. Operator Readiness Confirmations (Separate from SQL Output)

- **Backup & PITR Confirmed?** `[ ] YES (Snapshot UTC: ______, PITR window: ______)  [ ] NOT YET`
- **Render Env Vars Confirmed?** (`FRONTEND_URL`, `APP_URL`, `NODE_ENV`, HTTPS Email Provider w/ PDF attachments `RESEND_API_KEY` or `BREVO_API_KEY`): `[ ] YES  [ ] NOT YET`
- **Render `/uploads` Persistent Storage Confirmed?** `[ ] YES  [ ] NO / Ephemeral acknowledged  [ ] NOT YET`
