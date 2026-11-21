# Geleza SA — Application Lifecycle Production Readiness Preflight & Controlled Release Runbook (Phase K)

> **STATUS**: **READY FOR PRODUCTION EXECUTION PLANNING — NOT EXECUTED AGAINST PRODUCTION**.
> No production database migration, Git commit/push, Render backend deploy, Firebase Hosting deploy, live SMTP send, or DNS/environment change has been executed.
> **Every production stage (Stages 0–9) requires separate explicit operator authorization.**

---

## 1. Repository & Release Candidate Identity

- **Repository Location**: `C:\FUSION_HIGH_APP_1\FUSION_HIGH_APP_2.1`
- **Branch**: `main`
- **Current `HEAD` Commit**: `60f2e1610e6bfc14fea4c92d0d17e1fd26fd7b5a` (`0` ahead / `0` behind `origin/main`)
- **Curriculum Remediation Preservation (Phases A–G)**: Verified zero diff vs `HEAD` across all 5 untouched files:
  - `db/migrations/20261121_curriculum_grades_8_12_upgrade.sql`
  - `db/migrations/20261121_curriculum_grades_8_12_upgrade.down.sql`
  - `db/diagnostics/20261121_curriculum_production_preflight.sql`
  - `db/diagnostics/20261121_curriculum_post_migration_verify.sql`
  - `db/diagnostics/README_curriculum_production_release.md`
- **Secrets Scan**: `npm run scan:secrets` — **PASS** (`Secrets scan OK — no obvious credentials in tracked files.`).

### Application Lifecycle Release-Candidate Files (32 files)
- **Migrations & Diagnostics (5)**:
  - `db/migrations/20261121_application_lifecycle_remediation.sql`
  - `db/migrations/20261121_application_lifecycle_remediation.down.sql`
  - `db/diagnostics/20261121_application_lifecycle_production_preflight.sql` (strictly read-only Stage 2 preflight)
  - `db/diagnostics/20261121_application_lifecycle_post_migration_verify.sql` (strictly read-only Stage 4 post-migration check)
  - `db/diagnostics/README_application_lifecycle_release_readiness.md` (this runbook)
- **Backend Domain, Routes, Controllers & Services (15)**:
  - `lib/applicationLifecycle.js`
  - `lib/learnerRegistrationWorkflow.js`
  - `public/src/routes/applicationRoutes.js`
  - `public/src/routes/learnerRoutes.js`
  - `public/src/controller/adminController.js`
  - `public/src/controller/applicationController.js`
  - `public/src/controller/learnerController.js`
  - `public/src/controller/parentApplicationController.js`
  - `public/src/controller/principalActivationController.js`
  - `public/src/controller/protectedFileController.js`
  - `public/src/services/applicationLifecycleService.js`
  - `public/src/services/learnerRegistrationService.js`
  - `public/src/services/emailService.js`
  - `public/src/services/acceptanceLetterPdfService.js`
  - `public/src/services/principalActivation.js`
- **Frontend UI & API Client (8)**:
  - `client/src/components/applications/ApplicantTrackingPanel.tsx`
  - `client/src/components/registration/LearnerRegistrationPanel.tsx`
  - `client/src/components/registration/RegistrationActionBanner.tsx`
  - `client/src/pages/admin/AdminUsers.tsx`
  - `client/src/pages/auth/ActivateAccountPage.tsx`
  - `client/src/pages/learner/LearnerDashboard.tsx`
  - `client/src/pages/learner/LearnerOverview.tsx`
  - `client/src/services/api.ts`
- **Tests & Package Manifest (4)**:
  - `package.json`
  - `tests/application-lifecycle.test.js`
  - `tests/application-lifecycle-db.test.js`
  - `tests/integrated-learner-registration.test.js`

### Generated / Excluded Artifacts (Do Not Commit as Source)
- `client/dist/index.html` (and `client/dist/`): generated Vite production bundle — rebuild cleanly at Stage 7 before Firebase Hosting deploy.
- `.env` and any local credential files (never commit, log, or expose).
- External scratch test harnesses (`.../brain/.../scratch/phase_i_full_staging_verification.js`).
- Local `uploads/applications/` test files and disposable PostgreSQL databases (`geleza_staging_*`, `geleza_test_*`).

---

## 2. Migration Compatibility & Dependency Analysis

### Forward Migration: `db/migrations/20261121_application_lifecycle_remediation.sql`
- **Additive & Idempotent**: Yes — uses `ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, and drops/re-adds `applications_status_lifecycle_check` cleanly inside a single `BEGIN ... COMMIT` transaction. Inserts zero synthetic rows.
- **Preserves Legacy Data**: Preserves 100% of existing `applications` (including `'pending'`, `'accepted'`, `'declined'`, `'registered'`), legacy `provisional_learner_number` values, `application_documents`, `children`, `users`, and `learner_registrations`. Backfills `applications.academic_year` **only** where `IS NULL` using `COALESCE(EXTRACT(YEAR FROM created_at)::int, EXTRACT(YEAR FROM NOW())::int)`.
- **Critical Prerequisite Discovered in Phase K**:
  - `20261121_application_lifecycle_remediation.sql` runs `ALTER TABLE IF EXISTS learner_registrations ADD COLUMN IF NOT EXISTS learner_number ...` — it relies on `public.learner_registrations` already existing from `db/migrations/20261121_integrated_learner_registration.sql` (tracked in `HEAD` `60f2e16`).
  - Stage 2 read-only preflight (`table_learner_registrations`) explicitly verifies whether `public.learner_registrations` exists in production. **If missing, `20261121_integrated_learner_registration.sql` MUST be applied first before `20261121_application_lifecycle_remediation.sql`.**
- **Production Schema Assumptions Checked by Stage 2 Preflight**:
  - `applications.provisional_learner_number` must exist before the unique-index duplicate check block executes.
  - No multi-column `CHECK` constraint referencing `applications.status` may exist (the migration intentionally drops only single-column `array_length(con.conkey, 1) = 1` status checks).
  - Duplicate `provisional_learner_number` values on `applications` will cause the migration to skip creating `uniq_applications_provisional_learner_number` (flagged as `FAIL` in Stage 2 preflight so duplicates are resolved before migration).
  - Unrecognized legacy `applications.status` values outside the 21-status whitelist will leave `applications_status_lifecycle_check` as `NOT VALID` (flagged in Stage 2 preflight and Stage 4 verification).
- **Locking & Downtime Profile**:
  - `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (nullable or constant default on PG 11+) acquires a brief `ACCESS EXCLUSIVE` lock (milliseconds).
  - `UPDATE applications SET academic_year = ... WHERE academic_year IS NULL` holds row locks only on NULL rows; `CREATE INDEX` takes `SHARE` locks (blocks concurrent writes on `applications` briefly). Schedule during a low-traffic maintenance window (~5–15 minutes).
- **Live Production Schema Compatibility Status**: **`NOT VERIFIED`** until an authorized operator executes Stage 2 (`db/diagnostics/20261121_application_lifecycle_production_preflight.sql`) against the live Supabase production database.

### Rollback Guard: `db/migrations/20261121_application_lifecycle_remediation.down.sql`
- Non-destructive guard raises `ROLLBACK REFUSED` if any row exists in `application_document_requests`, `application_status_history`, `application_email_log`, or if any application uses an extended lifecycle status (`draft`, `under_review`, `documents_requested`, `documents_submitted`, `documents_under_review`, `enrollment_pending`, `withdrawn`, `cancelled`).
- Never drops additive columns on `users`, `children`, `applications`, `application_documents`, or `learner_registrations` (preserving all historical data).
- Full database rollback after live traffic requires restoring from the Stage 1 verified backup / PITR snapshot.

---

## 3. Curriculum Remediation Coordination (`20261121_curriculum_grades_8_12_upgrade.sql`)

| Dimension | Finding |
| :--- | :--- |
| **SQL DDL Dependency** | **Independent** — `20261121_application_lifecycle_remediation.sql` does NOT require `20261121_curriculum_grades_8_12_upgrade.sql` to run first, and vice versa. Both add `applications.first_additional_language` (`VARCHAR(80)`), `academic_stream_id` (`INTEGER`), and `subject_package` (`JSONB`) via identical `ADD COLUMN IF NOT EXISTS` statements. |
| **Runtime Read Compatibility** | `learnerRegistrationService.fetchSchoolSubjectConfig` and `academicStreamService.readOfferings` / `readApplicantLanguages` / `resolveApplicantPackage` query `subject_name, category, language_level, is_required, is_active` on `school_subject_offerings` and do **not** reference `stream_name` during reads. Legacy Grades 10–12 applications and registration continue working without `stream_name`. |
| **Runtime Write & Grade 8–9 Coordination** | `academicStreamService.saveOfferings` and `copyYearConfiguration` write `school_subject_offerings.stream_name` and require `grade BETWEEN 8 AND 12`. Because Grade 8–9 admissions require schools to configure Grade 8–9 Home Languages via `saveOfferings`, **full Grades 8–12 admissions + registration requires the separate curriculum migration** to be executed under its own authorized release workflow (`README_curriculum_production_release.md`). |
| **Recommended Migration Order** | 1. `20261121_integrated_learner_registration.sql` (only if Stage 2 preflight shows `learner_registrations` missing)<br>2. `20261121_curriculum_grades_8_12_upgrade.sql` (via its own authorized runbook, if not yet applied — checked by Stage 2 `curriculum_grades_8_12_upgrade_status`)<br>3. `20261121_application_lifecycle_remediation.sql` (Stage 3 of this runbook) |

---

## 4. Production Email Provider & Acceptance Letter PDF Attachment Readiness

### Code-Level Transport Selection & Attachment Support (`public/src/services/emailService.js`)

| Priority | Transport / Env Var | Trigger Condition | PDF Attachment Support (Email 5) | Production Caveats & Requirements |
| :--- | :--- | :--- | :--- | :--- |
| **0 (Staging Only)** | `GELEZA_STAGING_MAIL_DIR` | Staging capture mode only | **YES** (writes `.pdf` + `.html` + `.json` to disk) | Must NEVER be set in production. |
| **1a (Recommended on Render)** | **Resend HTTPS API** (`RESEND_API_KEY`, `RESEND_FROM` / `SMTP_FROM`) | `RESEND_API_KEY` set | **YES** (`attachments: [{ filename, content: base64 }]`) | **CRITICAL**: `RESEND_FROM` (or `SMTP_FROM`) MUST use a Resend-verified sender domain with passing **SPF, DKIM, DMARC**. If unverified (HTTP 403), code falls back to `onboarding@resend.dev`, which Resend restricts to the Resend account owner's email only — external parents/learners would fail! |
| **1b (Recommended on Render)** | **Brevo HTTPS API** (`BREVO_API_KEY`, `SMTP_FROM`) | `BREVO_API_KEY` set (used if Resend absent/fails) | **YES** (`attachment: [{ name, content: base64 }]`) | Requires verified sender domain in Brevo (`SMTP_FROM` or `SMTP_USER`) with passing SPF/DKIM/DMARC. |
| **2 (Render Fallback)** | **Google Apps Script Relay** (`GOOGLE_SCRIPT_EMAIL_URL` or Firestore `config/email.googleScriptUrl`) | `process.env.RENDER` truthy when Resend/Brevo absent or failed | **NO — HTML-ONLY LIMITATION** (`attachments` NOT forwarded in JSON payload) | **PRODUCTION LIMITATION**: Cannot attach the Acceptance Letter PDF to Email 5. A dashboard download link is **NOT** equivalent to the PDF attachment. Do **NOT** rely on Google Apps Script as the primary production transport for Email 5. |
| **3 (Non-Render / Local)** | **Nodemailer SMTP STARTTLS** (`smtp.gmail.com:587`, `SMTP_USER`, `SMTP_PASS`) | Non-Render or after Render relay | **YES** (`attachments` supported natively) | Outbound TCP `587` is typically blocked on Render. |
| **4 (Last Resort)** | **Direct TLS Socket** (`smtp.gmail.com:465`) | Port 587 failure | **NO — HTML-ONLY** (`Content-Type: text/html`) | Also typically blocked on Render; cannot attach binary PDFs. |

### Observed Configuration Status (Boolean Presence Only — Zero Secrets Inspected or Printed)
- **Local `.env` (non-production)**: `RESEND_API_KEY` present, `GOOGLE_SCRIPT_EMAIL_URL` present, `SMTP_USER` present, `SMTP_PASS` present; `BREVO_API_KEY`, `SMTP_FROM`, `RESEND_FROM`, `APP_URL`, `FRONTEND_URL` NOT set in local `.env`.
- **Render Production Environment**: **NOT VERIFIED / OPERATOR CONFIRMATION REQUIRED** (not accessible from this workspace). Operator must confirm in Render Dashboard (without exposing values):
  1. `RESEND_API_KEY` or `BREVO_API_KEY` is configured and active.
  2. `RESEND_FROM` / `SMTP_FROM` is configured on a verified Geleza SA sender domain (not `onboarding@resend.dev`).
  3. DNS **SPF**, **DKIM**, and **DMARC** records pass for that sender domain.
  4. `FRONTEND_URL` / `APP_URL` points to the live production origin (`https://gelezasa.co.za` or active Firebase Hosting domain) so activation and dashboard links never fall back to `http://localhost:4000`.
- **Retry, Deduplication & Audit Controls**: `application_email_log` enforces `idempotency_key UNIQUE`, tracks `status` (`pending`/`sent`/`failed`/`skipped`), `attempts`, `sent_at`, and truncated safe `error_message`; `keepOutOfQueue` prevents activation links from entering Firestore `mail`; `redactSensitiveMail` strips tokens, SA IDs, OTPs, and passwords.

---

## 5. Controlled SMTP / Email Verification Plan (DO NOT EXECUTE IN PHASE K)

Execute **only** at Stage 6 under separate explicit operator authorization:

1. **Controlled Test Inbox**: Operator-owned test inbox (e.g., dedicated QA mailbox) — never a real Parent, Learner, or school email.
2. **Synthetic Test School**: Isolated test/sandbox school record (never a real production school).
3. **Synthetic Parent & Learner**: Distinct synthetic Parent email and Learner email both routed to operator-controlled inboxes (e.g., `+parent` / `+learner` subaddresses).
4. **Synthetic Applicant & Application**: Submit a synthetic Grade 10 application; confirm no real PII is used.
5. **Email 1 Verification**: Confirm sender address, recipient, subject, Application Reference, applied grade, explicit notice that submission is not approval, and working activation CTA (zero plaintext passwords).
6. **Controlled Approval**: Principal approves synthetic application in staging/controlled test school.
7. **Learner Number Verification**: Confirm unique persistent Learner Number in DB (`applications.provisional_learner_number` and `learner_registrations.learner_number`) matches Email 5 and Acceptance Letter PDF identically.
8. **Acceptance Letter PDF Attachment Verification**: Confirm Email 5 arrives with an **actual binary `.pdf` attachment** (not just a link) delivered via Resend or Brevo (never Google Apps Script HTML-only fallback).
9. **PDF Integrity Verification**: Download & open the attached PDF; confirm `%PDF-` header, zero corruption, readable school header, applicant name, Application Reference, Official Learner Number, Grade, and Academic Year.
10. **Email Sender & Authentication Headers**: Inspect raw email headers (`Authentication-Results`) verifying `SPF=PASS`, `DKIM=PASS`, `DMARC=PASS`, verified `From:` domain (not `onboarding@resend.dev`), and TLS transport.
11. **Email Recipient Verification**: Confirm Parent and (if distinct) Learner each received only their authorized message.
12. **Email Body Verification**: Verify HTML renders cleanly on desktop & mobile mail clients, all CTA URLs point to production origin (not `localhost`), and mandatory approval fields are present.
13. **Email Retry Behavior**: Verify transient failure marks `application_email_log.status = 'failed'`, increments `attempts`, preserves application approval state, and succeeds on retry.
14. **Duplicate Email Protection**: Re-trigger approval / confirmation idempotently; confirm `application_email_log` skips duplicate delivery (`alreadySent: true`) and inbox receives only one Email 5.
15. **Failure Handling**: Confirm provider error returns safe diagnostic message without corrupting `applications` or `learner_registrations`.
16. **Logging Audit**: Query `application_email_log` (metadata only) verifying `status = 'sent'`, `attempts >= 1`, and `sent_at IS NOT NULL`.
17. **Token & Password Exposure Audit**: Confirm zero raw activation tokens, zero plaintext passwords, and zero SA IDs appear in `application_email_log`, application logs, or Firestore `mail`.
18. **Cleanup Requirements**: Archive/remove synthetic test application, synthetic user accounts, and test files per operator cleanup policy.
19. **Operator Authorization**: Requires explicit Stage 6 sign-off before sending the first real test email.
20. **Pass Criterion**: Gate fails if Email 5 lacks a valid attached Acceptance Letter PDF or falls back to `onboarding@resend.dev` / Google Apps Script HTML-only relay.

---

## 6. Production Backup & PITR Verification Checklist (Operator-Completed at Stage 1)

| Item | Operator Verification Required |
| :--- | :--- |
| **Production Project / DB Identity** | Confirm exact Supabase project ref & `current_database()` |
| **Backup Type & Status** | PITR enabled / Scheduled daily backup / Fresh verified logical `pg_dump` |
| **PITR Recovery Window** | Record exact retention window (e.g., 7 days / 30 days) |
| **Pre-Migration Recovery Point (UTC)** | Record exact UTC timestamp immediately before Stage 3 |
| **Restore Verification / Capability** | Confirm operator has Supabase dashboard/CLI permissions & verified restore path |
| **Recovery Procedure & Implications** | PITR / snapshot restore rolls back ALL writes after recovery point (full-DB RPO); schedule migration during low-traffic window |
| **Expected Maintenance Window** | ~5–15 minutes low-traffic window (DDL + verification) |
| **Risk Assessment** | Low schema risk (strictly additive DDL) once Stage 2 preflight passes; medium operational risk if `learner_registrations` prerequisite or SMTP PDF transport is unverified |
| **Operator Identity & Sign-Off** | Named operator approval recorded before Stage 3 authorization |

---

## 7. Gated Production Release Execution Runbook (Stages 0–9)

> **MANDATORY RULE**: Do NOT combine authorizations across stages. STOP immediately if any check returns `FAIL` or `UNKNOWN`.

### Stage 0 — Release Identity Confirmation
- Confirm repo `C:\FUSION_HIGH_APP_1\FUSION_HIGH_APP_2.1`, branch `main`, HEAD `60f2e1610e6bfc14fea4c92d0d17e1fd26fd7b5a`, release-candidate file list (32 files above), untouched curriculum files, and passing final regression + `npm run scan:secrets`.
- Obtain explicit operator sign-off to begin Stage 1.

### Stage 1 — Production Backup & PITR Confirmation
- Complete Section 6 Backup & PITR Checklist above against live Supabase production.
- Record UTC recovery timestamp and confirm restore procedure.
- **STOP** until operator confirms Stage 1 = `PASS`.

### Stage 2 — Live Read-Only Production Preflight
- Operator runs `db/diagnostics/20261121_application_lifecycle_production_preflight.sql` (pure `SELECT`-only) in the **live production Supabase SQL Editor**.
- Review EVERY row of output, especially:
  - `table_learner_registrations` (determines whether `20261121_integrated_learner_registration.sql` must run first).
  - `required_existing_base_columns` & `additive_columns_type_compatibility`.
  - `applications_status_check_compatibility` (0 multi-column status CHECK conflicts).
  - `applications_status_values_compatible` (0 unrecognized statuses).
  - `learner_number_uniqueness_and_cross_school_integrity` (0 duplicate Learner Numbers, 0 cross-school collisions).
  - `documents_registrations_and_enrolments_integrity` (0 orphans / cross-school mismatches).
  - `curriculum_grades_8_12_upgrade_status` (notes whether separate curriculum migration is already applied).
  - Record baseline row counts (`users`, `children`, `applications`, `application_documents`, `learner_registrations`).
- **STOP** if `PREFLIGHT_VERDICT <> 'PASS'`.

### Stage 3 — Production Database Migration (Separate Explicit Authorization Required)
- If Stage 2 reported `table_learner_registrations` missing, execute `db/migrations/20261121_integrated_learner_registration.sql` first.
- Execute `db/migrations/20261121_application_lifecycle_remediation.sql` in the production Supabase SQL Editor inside its `BEGIN ... COMMIT` transaction.
- Confirm clean commit with zero errors.
- *(Note: If the Grades 8–12 curriculum upgrade has not yet been applied, coordinate it separately via `db/diagnostics/README_curriculum_production_release.md`.)*

### Stage 4 — Post-Migration Read-Only Verification (Gate Before Backend Deploy)
- Execute `db/diagnostics/20261121_application_lifecycle_post_migration_verify.sql` (pure `SELECT`-only) in the production Supabase SQL Editor.
- Verify `POST_MIGRATION_VERIFICATION_VERDICT = 'PASS'` (all 6 check groups `PASS`: 3 new tables, all 27 additive columns, validated `applications_status_lifecycle_check`, 3 FKs, all 10 valid indexes, `0` NULL `academic_year`).
- Verify row counts on `users`, `children`, `applications`, `application_documents`, and `learner_registrations` match Stage 2 preflight baseline exactly.
- **STOP** if any check fails — do NOT proceed to Stage 5.

### Stage 5 — Backend Release (Git Commit/Push + Render Deploy — Separate Explicit Authorization Required)
- Stage ONLY the verified release-candidate source/migration/test files (exclude `.env`, scratch files, and `client/dist/` build artifacts unless intentionally tracked).
- Commit and push to `origin/main` only upon explicit Stage 5 authorization.
- Confirm Render builds and starts cleanly with zero startup errors.
- Confirm Render environment variables (without printing values): `RESEND_API_KEY` or `BREVO_API_KEY`, verified `RESEND_FROM` / `SMTP_FROM`, `FRONTEND_URL` / `APP_URL`, and `GELEZA_STAGING_MAIL_DIR` unset.
- Smoke-check `/api/learner/access-status` returns `401` unauthenticated.

### Stage 6 — Controlled Production Email Verification (Separate Explicit Authorization Required)
- Execute the 20-point **Controlled SMTP / Email Verification Plan** (Section 5 above) using an operator-owned test inbox and synthetic test applicant.
- Confirm Email 5 delivers a valid, readable **Acceptance Letter PDF attachment** via Resend or Brevo with `SPF=PASS`, `DKIM=PASS`, `DMARC=PASS`, and zero token/password leaks in `application_email_log`.
- **STOP** if Email 5 fails to attach the PDF or falls back to `onboarding@resend.dev` / HTML-only relay.

### Stage 7 — Frontend Release (Firebase Hosting — Separate Explicit Authorization Required)
- Run `npm --prefix client test` and `npm --prefix client run build` (`tsc && vite build`).
- Deploy `client/dist` via `firebase deploy --only hosting`.
- Verify `firebase.json` serves only `client/dist` and does not expose `uploads/`.

### Stage 8 — Post-Release End-to-End Smoke Tests (Controlled Synthetic Account)
Verify every critical journey on production (desktop + mobile viewport `390x844`):
1. Application submission & confirmation (Email 1).
2. Restricted applicant tracking & `/activate` password setup (URL token stripped, survives refresh).
3. Principal document request (Email 2) & Parent/Learner document upload (Email 3, protected file download).
4. Principal document review (accept/resubmit, Email 4) & application approval.
5. Unique Official Learner Number persisted + Email 5 received with valid Acceptance Letter PDF attachment.
6. Learner Registration completion (Email 7) & automatic unlock of Full Learner Dashboard.
7. Pre-registration Restricted Applicant Dashboard enforcement (`403 ENROLLMENT_REQUIRED` on academic endpoints; `?tab=subjects` blocked).
8. Parent Dashboard multi-child visibility & status timeline accuracy.
9. Cross-school admin & unrelated parent isolation (`403`/`404`).
10. Mobile browser layout (`0` horizontal overflow, zero console/page errors).
11. Archive/clean up synthetic smoke-test records afterwards.

### Stage 9 — Rollback, Monitoring & Incident Recovery Plan
- **Release Failure / Rollback Triggers**:
  - Any `5xx` spike on `/api/applications/*`, `/api/registrations/*`, `/api/learner/*`, or `/api/auth/*`.
  - Cross-school data leakage or unauthorized document/dashboard access.
  - Approval failing to persist Learner Number or sending incomplete Email 5.
  - Persistent broken frontend bundle or activation flow failure.
- **Backend Rollback**: Re-deploy previous Render commit (`60f2e1610e6bfc14fea4c92d0d17e1fd26fd7b5a`). Because the database migration is strictly additive, `60f2e16` remains schema-compatible with the migrated database.
- **Frontend Rollback**: Roll back Firebase Hosting to the previous release version in Firebase Console / CLI.
- **Database Rollback Limitations**:
  - Prior to live lifecycle writes: `db/migrations/20261121_application_lifecycle_remediation.down.sql` safely removes the new tables and indexes.
  - After live lifecycle writes: `.down.sql` intentionally raises `ROLLBACK REFUSED` to prevent data loss; full DB rollback requires restoring to the Stage 1 backup/PITR recovery point (which reverts all post-recovery-point DB writes across the platform) and requires explicit incident-commander approval.
- **Monitoring & Escalation**: Monitor Render logs, Supabase query errors, `application_email_log` failure rates (`status = 'failed'`), and HTTP `4xx`/`5xx` metrics for 24 hours post-release. Escalate immediately to the platform lead and pause new rollouts on any trigger above.

---

## 8. Production Release Gates Summary

| Gate | Requirement | Current Status |
| :--- | :--- | :--- |
| **G1** | Verified Release Candidate (Code, Security Hardening, Secrets Scan) | **PASS** |
| **G2** | Final Consolidated Staging Regression (Backend, DB, Curriculum, Client, Build, Real Chrome E2E) | **PASS** |
| **G3** | Migration Additive/Idempotent/Rollback-Guard Review (Staging Disposable DB) | **PASS** |
| **G4** | Curriculum Remediation Coordination & Sequencing Documented (5 Files Preserved Untouched) | **PASS** |
| **G5** | Production Backup & PITR Verification (Stage 1) | **OPERATOR CONFIRMATION REQUIRED** |
| **G6** | Live Production Read-Only Preflight (`20261121_application_lifecycle_production_preflight.sql`, Stage 2) | **NOT VERIFIED** (operator must execute on live production) |
| **G7** | Render Email Provider Env Vars (`RESEND_API_KEY`/`BREVO_API_KEY`, verified `From`, `FRONTEND_URL`, DNS SPF/DKIM/DMARC) | **OPERATOR CONFIRMATION REQUIRED** |
| **G8** | Controlled Production Email & Acceptance Letter PDF Attachment Verification (Stage 6) | **NOT VERIFIED** (awaits Stage 6 authorization) |
| **G9** | Explicit Per-Stage Operator Authorizations (Stages 0–9) | **OPERATOR CONFIRMATION REQUIRED** |
