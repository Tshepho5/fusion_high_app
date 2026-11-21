# Geleza SA — Controlled Production Migration & Release Procedure (Grades 8–12 Curriculum Remediation)

This runbook defines the **strictly staged, operator-executed** production release procedure for:

- **Database migration**: [20261121_curriculum_grades_8_12_upgrade.sql](../migrations/20261121_curriculum_grades_8_12_upgrade.sql)
- **Read-only preflight diagnostic**: [20261121_curriculum_production_preflight.sql](./20261121_curriculum_production_preflight.sql)
- **Read-only post-migration verification**: [20261121_curriculum_post_migration_verify.sql](./20261121_curriculum_post_migration_verify.sql)
- **Backend service**: Render (`https://fusion-high-backend.onrender.com`)
- **Frontend / PWA hosting**: Firebase Hosting (`site: fusion-high-app`)

> **MANDATORY AUTHORIZATION RULE**
> **No stage automatically authorizes the next stage.**
> Database migration authorization (Stage 3), Git commit/push & Render backend deployment authorization (Stage 5), and Firebase Hosting deployment authorization (Stage 7) are **separate, explicit approval gates**.

---

## Stage 1 — Production Backup & Recovery Point Confirmation

**Goal**: Confirm a verifiable, recoverable production PostgreSQL backup exists **before** any write SQL is authorized.

### Where to Initiate & Verify Backup in Supabase
1. Sign in to the **Supabase Dashboard** and select the live **Geleza SA / Fusion High Production** project.
2. Navigate to **Project Settings → Database → Backups** (or **Database → Backups**).
3. Verify which backup tier is active:
   - **Point-in-Time Recovery (PITR) enabled**: Record the exact **latest PITR WAL timestamp** and confirm status is **Active / Healthy** with a recovery window covering the current UTC time.
   - **Daily Scheduled Backups / Manual Backup**: Trigger an on-demand backup if available on your plan, OR run a verified logical dump from an authorized operator workstation using `pg_dump --format=custom --no-owner --no-acl` against the Supabase direct connection string *(never store or paste credentials or dumps inside the Git repository)*.
4. Confirm the **Restore** action / recovery path is available and enabled in the Supabase Dashboard (or that your local encrypted `.dump` file passes `pg_restore --list <file>` with zero errors and includes `schools`, `applications`, `school_subject_offerings`, `academic_streams`, and `children`).

### Evidence Required Before Proceeding
Record in the release ticket:
- Supabase project reference (no passwords/tokens)
- Backup ID or PITR UTC timestamp
- Confirmation that the backup completed cleanly and the restore mechanism is available

### Why You Must NOT Rely Solely on `20261121_curriculum_grades_8_12_upgrade.down.sql`
- [20261121_curriculum_grades_8_12_upgrade.down.sql](../migrations/20261121_curriculum_grades_8_12_upgrade.down.sql) is a **non-destructive guard script**, NOT a full snapshot recovery mechanism.
- It **intentionally refuses to run** (`ROLLBACK REFUSED`) if any Grade 8–9 offering, Grade 8–9 stream, or named-stream offering row has already been saved.
- Running `.down.sql` while the upgraded backend is live on Render would replace the 6-column unique index with the legacy 5-column index, causing new backend `ON CONFLICT` writes to fail with HTTP `503 SCHEMA_OUT_OF_DATE`.
- Only a verified **Supabase Backup / PITR snapshot** (coordinated with rolling back the Render backend commit if already deployed) provides guaranteed full recovery.

### Stage 1 Stop Condition
- **If a recent backup / PITR recovery point cannot be confirmed and verified: STOP.** Do not proceed to Stage 2 or Stage 3.

---

## Stage 2 — Final Read-Only Preflight Confirmation

**Goal**: Confirm the live database has not drifted since the Phase F preflight baseline (`48` `school_subject_offerings` rows, `15` `academic_streams` rows, `0` duplicates, `0` out-of-range grades, `0` mixed CHECK constraints).

1. Re-run [20261121_curriculum_production_preflight.sql](./20261121_curriculum_production_preflight.sql) (strictly read-only) in the Supabase **SQL Editor** immediately before the maintenance window.
2. Confirm:
   - `OVERALL_MIGRATION_PREREQUISITE_VERDICT = PASS`
   - All 6 individual `prereq_*` rows in Section `G` are `PASS`
   - Record the exact pre-migration row counts of `school_subject_offerings` and `academic_streams` (baseline: `48` offerings, `15` streams) to compare in Stage 4.
3. Confirm no long-running queries or idle-in-transaction locks are holding `school_subject_offerings` or `academic_streams` (low-traffic maintenance window recommended).

### Stage 2 Stop Condition
- **If ANY preflight check returns `FAIL` or `UNKNOWN`, or unexpected schema/data drift appeared: STOP.** Do not execute Stage 3.

---

## Stage 3 — Production Database Migration Execution *(Separate Explicit Authorization Required)*

> **AUTHORIZATION GATE**: Do NOT execute this stage until Stage 1 (backup confirmed) and Stage 2 (final preflight `PASS`) are complete AND written authorization specifically for **Stage 3 Database Migration** has been granted.

1. Open [20261121_curriculum_grades_8_12_upgrade.sql](../migrations/20261121_curriculum_grades_8_12_upgrade.sql) and verify it matches the reviewed file (contains `BEGIN; ... COMMIT;`, zero `INSERT`/`DELETE`/`TRUNCATE` statements, mixed-constraint abort guard, and duplicate abort guard).
2. In the Supabase **SQL Editor** (live production project), paste the exact contents of [20261121_curriculum_grades_8_12_upgrade.sql](../migrations/20261121_curriculum_grades_8_12_upgrade.sql) and execute it once.
3. Confirm the query completes cleanly with **zero errors** (`COMMIT` succeeded).
   - Because the entire migration executes inside a single `BEGIN; ... COMMIT;` transaction, any abort (`MIGRATION ABORTED: ...`) automatically rolls back all DDL changes with zero partial state.
   - Note on interim compatibility: the currently deployed Render backend (`HEAD = 998b278`) already expects `stream_name` and the 6-column unique index, so migrating the database before Stage 5 backend deployment is forward-compatible and does not break existing routes.

### Stage 3 Stop Condition
- **If the migration raises ANY error or times out on locks: STOP.** Confirm the transaction rolled back cleanly, capture the exact PostgreSQL error message, and do NOT proceed to Stage 4 or Stage 5.

---

## Stage 4 — Post-Migration Read-Only Database Verification

**Goal**: Prove every structural and data-preservation requirement succeeded on live production before authorizing any code deployment.

1. In the Supabase **SQL Editor**, paste and run [20261121_curriculum_post_migration_verify.sql](./20261121_curriculum_post_migration_verify.sql) (strictly read-only).
2. Export the result grid via **Export → Copy as JSON** (or **Download CSV**).
3. Verify ALL of the following:
   - `verify_offerings_stream_name_column` → **`PASS`** (`VARCHAR(80)`, `NOT NULL`, `DEFAULT ''`)
   - `verify_offerings_grade_check_8_to_12` → **`PASS`** (Grades 8–12 active, no legacy 10–12 CHECK remaining)
   - `verify_offerings_category_check_intact` → **`PASS`**
   - `verify_streams_grade_check_8_to_12` → **`PASS`** (Grades 8–12 active, no legacy 10–12 CHECK remaining)
   - `verify_streams_status_check_intact` → **`PASS`**
   - `verify_curriculum_foreign_keys_intact` → **`PASS`**
   - `verify_offerings_unique_index_exact_key` → **`PASS`** (`(school_id, academic_year, grade, stream_name, subject_name, language_level)`)
   - `verify_streams_active_name_unique_index` → **`PASS`** (`(school_id, academic_year, grade, lower((name)::text)) WHERE status <> 'archived'`)
   - `verify_curriculum_lookup_indexes` → **`PASS`**
   - `verify_subject_change_approvals_structure` → **`PASS`**
   - `verify_applications_columns_compatible` → **`PASS`**
   - `verify_row_counts_and_data_integrity` → **`PASS`** AND confirm row counts match Stage 2 pre-migration baseline (`offerings_count >= 48`, `streams_count >= 15`, zero rows lost, `null_stream_name = 0`)
   - `verify_zero_duplicates_against_target_indexes` → **`PASS`**
   - `POST_MIGRATION_VERIFICATION_VERDICT` → **`PASS`**

### Stage 4 Stop Condition
- **If ANY check is `FAIL` or `UNKNOWN`, or if row counts decreased compared to Stage 2: STOP immediately.** Do NOT proceed to Stage 5 backend deployment. Escalate for backup/recovery assessment.

---

## Stage 5 — Backend Commit, Push & Render Deployment *(Separate Explicit Authorization Required)*

> **AUTHORIZATION GATE**: Only proceed after Stage 4 `POST_MIGRATION_VERIFICATION_VERDICT = PASS` is reviewed AND **separate explicit authorization** is granted for Git commit, push, and Render backend deployment.

1. Confirm local working tree contains only the reviewed curriculum remediation, migration, diagnostic, caching, and test files (zero credentials, zero untracked temp files).
2. Run a final local `npm test`, `npm --prefix client test`, and `npm --prefix client run build` to verify clean build parity (`public/` ≡ `client/public/` ≡ `client/dist/`).
3. Commit and push the authorized commit to `main` (or the configured Render deployment branch).
4. Monitor the **Render Dashboard** for `fusion-high-backend` until the new deploy reaches **Live** status and startup logs show zero database bootstrap or syntax errors.

### Stage 5 Stop Condition
- **If Render build fails, startup crashes, or health/boot logs show errors: STOP.** Roll back Render to the previous healthy deploy before investigating. Do NOT deploy Firebase Hosting (Stage 7).

---

## Stage 6 — Live Render Production Smoke Testing (Read-Only API Verification)

**Goal**: Verify the live Render backend serves real school curriculum data cleanly with zero schema-drift HTTP 500/503 errors and intact cross-school isolation.

Test the exact application endpoints verified in [server.js](../../server.js) and [schoolRoutes.js](../../public/src/routes/schoolRoutes.js):

1. **Active schools baseline (public)**:
   - `GET https://fusion-high-backend.onrender.com/api/schools`
   - Expected: HTTP `200`, lists live schools including School `13` and School `14`.
2. **CAPS catalogue (public)**:
   - `GET https://fusion-high-backend.onrender.com/api/schools/catalogue/nsc`
   - Expected: HTTP `200`, returns recognised official languages and CAPS subject catalogues.
3. **School 13 published streams & applicant languages (public)**:
   - `GET https://fusion-high-backend.onrender.com/api/schools/13/published-streams?grade=10`
   - `GET https://fusion-high-backend.onrender.com/api/schools/13/published-streams?grade=8`
   - Expected: HTTP `200` (NO HTTP `500` or `503`), valid JSON containing `academic_year`, `languages` (only School 13's configured languages), `language_source`, and `streams` (for Grade 10; `[]` for Grade 8).
4. **School 14 published streams & applicant languages (public)**:
   - `GET https://fusion-high-backend.onrender.com/api/schools/14/published-streams?grade=10`
   - `GET https://fusion-high-backend.onrender.com/api/schools/14/published-streams?grade=8`
   - Expected: HTTP `200` (NO HTTP `500` or `503`), valid JSON containing only School 14's configured languages and streams.
5. **Authenticated Curriculum Configuration & Cross-School Isolation** *(using authorized School Admin JWTs; read-only GET requests only)*:
   - School 13 Admin → `GET https://fusion-high-backend.onrender.com/api/schools/13/academic-configuration?year=auto&grade=10` → Expected: HTTP `200`, resolves configured year with offerings and streams.
   - School 13 Admin → `GET https://fusion-high-backend.onrender.com/api/schools/14/academic-configuration?year=auto&grade=10` → Expected: HTTP `403` (`You can only manage subject streams for your own school.`).
   - School 14 Admin → `GET https://fusion-high-backend.onrender.com/api/schools/14/academic-configuration?year=auto&grade=10` → Expected: HTTP `200`.
6. **Confirm zero unintended data mutations**:
   - Re-check row counts via [20261121_curriculum_post_migration_verify.sql](./20261121_curriculum_post_migration_verify.sql) if needed: all `GET` smoke tests must leave row counts completely unchanged (`0` DDL/DML on GET).

### Stage 6 Stop Condition
- **If ANY endpoint returns HTTP `500`/`503`, leaks cross-school data, or returns missing/corrupted curriculum data: STOP.** Do NOT deploy Firebase Hosting (Stage 7). Roll back Render to the prior deployment and inspect Render logs.

---

## Stage 7 — Firebase Hosting Deployment *(Separate Explicit Authorization Required)*

> **AUTHORIZATION GATE**: Firebase Hosting MUST NOT be deployed until Stage 6 Render smoke tests pass 100% AND explicit authorization for Firebase Hosting deployment is granted.

1. Confirm `client/dist/` was built cleanly from the exact committed code and matches `public/` and `client/public/` for `application.html`, `js/application.js`, and `sw.js`.
2. Verify [firebase.json](../../firebase.json) hosting headers:
   - `/@(index|application|offline).html` & `/` & `/sw.js` → `no-cache, no-store, must-revalidate`
   - `/js/**` & `/css/**` → `no-cache, must-revalidate`
   - `/assets/**/*.@(js|css)` → `public, max-age=31536000, immutable`
3. Deploy only hosting to the authorized site (`firebase deploy --only hosting`).

### Stage 7 Stop Condition
- **If Firebase deploy fails or serves mismatched assets: STOP** and roll back to the previous Firebase Hosting release from the Firebase Console (**Hosting → Release history → Rollback**).

---

## Stage 8 — Live Browser, Service Worker & Cache Verification

**Goal**: Verify returning and fresh browsers immediately pick up the new assets, purge `geleza-sa-cache-v2.8`, and load live backend curriculum dynamically.

Open the live portal (`https://fusion-high-app.web.app/application` or custom production domain) in Chrome with **DevTools** open:

1. **Network Tab (disable cache OFF first, reload twice to test returning-browser upgrade)**:
   - Confirm `/application` response header has `Cache-Control: no-cache, no-store, must-revalidate`.
   - Confirm `/js/application.js?v=20261121-1` is requested and returns HTTP `200` with `Cache-Control: no-cache, must-revalidate` (NOT `immutable`).
   - Confirm `/sw.js` returns HTTP `200` with `Cache-Control: no-cache, no-store, must-revalidate`.
   - Confirm NO request loads an unversioned stale `/js/application.js` without `?v=20261121-1`.
2. **Application Tab → Service Workers & Cache Storage**:
   - Confirm the active Service Worker is running `CACHE_NAME = 'geleza-sa-cache-v2.9'`.
   - Confirm `geleza-sa-cache-v2.8` (and any older `v2.*` cache) is **absent / purged** from Cache Storage.
3. **Functional Application Form Verification (Read-Only — Do NOT Submit Fake Production Applications)**:
   - Select **School 13** and **Grade 8 / 9**: confirm Home Language dropdown populates dynamically from `/api/schools/13/published-streams?grade=8` (zero hardcoded fallback languages).
   - Select **School 13** and **Grade 10**: confirm Home Language, First Additional Language, and Academic Streams populate dynamically from `/api/schools/13/published-streams?grade=10`.
   - Switch to **School 14** and **Grade 10**: confirm the language and stream options immediately refresh to School 14's offerings with zero School 13 leakage.
   - Sign in as an authorized School Admin (if testing admin UI) and confirm **Subject Offerings** and **Subject Streams** open cleanly for Grades 8–12 without errors.

### Stage 8 Stop Condition
- **If browsers serve stale `v2.8` assets, Service Worker fails to activate `v2.9`, or Home Language / Streams fail to load dynamically: STOP.** Roll back Firebase Hosting release if needed and inspect DevTools console/network errors.

---

## Stage 9 — Coordinated Stop & Recovery Reference

| Failure Stage | Immediate Action | Coordinated Recovery Path |
|---|---|---|
| **Stage 1 (Backup)** | Abort release before any change. | Resolve Supabase backup/PITR availability first. |
| **Stage 2 (Preflight)** | Abort before migration. | Investigate `FAIL`/`UNKNOWN` rows with read-only inspection only. |
| **Stage 3 (Migration)** | Transaction auto-rolls back; do not retry blindly. | Inspect exact PostgreSQL error; verify schema unchanged via Phase F preflight. |
| **Stage 4 (Post-Verify)** | Halt before Render deploy. | If any corruption or unexpected state occurred, restore from Stage 1 verified Supabase backup/PITR snapshot. |
| **Stage 5–6 (Backend / Smoke)** | Halt before Firebase deploy. | Roll back Render to prior healthy commit. Keep migrated DB (it is forward-compatible with `HEAD = 998b278`!) unless DB-level recovery is also required via Stage 1 backup. |
| **Stage 7–8 (Frontend / Cache)** | Halt release announcement. | Roll back Firebase Hosting to prior release via Firebase Console; verify backend remains healthy independently. |

> **Never** execute `20261121_curriculum_grades_8_12_upgrade.down.sql` while the upgraded backend is live on Render, and **never** rely on `.down.sql` once Grade 8–9 or stream-scoped offering rows have been written. Always coordinate application rollback + Supabase backup/PITR restoration.
