# Geleza SA Phase 1.6 — implementation and security verification

Date of verification: 15 November 2026 (Africa/Johannesburg).

This report covers the repository state after the Phase 1.6 remediation. Stage A found that Phase 1.6 was not already implemented. The checks below are from source inspection and from the safe commands that were actually executed.

## Stage A findings (before changes)

Phase 1.6 was missing.

- There was no shared test bootstrap. `db/db.js` opened a PostgreSQL pool on import and defaulted the database name to `FUSION_DB`. `db/firebase.js` defaulted to the production project `fusion-high-app` and a service-account file.
- `authMiddleware.requireRole` could accept a JWT role, the role name `superadmin`, or `req.user.is_superadmin` copied from the token. School-registration review and system master-admin routes trusted that same token flag.
- The tester-account screen could assign any name from the `roles` table and could update an account that already held the database superadmin flag.
- `npm test` happened to list three pure unit files, but many other scripts under `tests/` imported the database, called Gemini, or talked to a running server. Those scripts were not separated into unit, integration, and end-to-end commands.
- Regression coverage did not exercise production-project rejection, disposable-database refusal, external-call blocking, stale JWT claims, or missing and deleted users.

## Requirement results

| Requirement | Status | Evidence | Tests | Remaining Issues |
|---|---|---|---|---|
| Shared test bootstrap | PASS | `tests/safety/bootstrap.js` is loaded with `node --require` before the test files in `package.json`. It calls `activateTestSafetyBootstrap` in `lib/testSafety.js`, which sets `GELEZA_TEST_MODE`, strips database URLs and service credentials, and installs the network guard before application modules load. Every `tests/*.js` file also requires `tests/safety/blockLiveEffects.js` before its own imports. | `npm test`: 46 passed, 0 failed. `npm run test:integration`: 2 passed. `npm run test:e2e`: 2 passed. | A file added later under `tests/` must keep that first require, or be launched with the bootstrap. |
| Firebase isolation | PASS | `assertFirebaseTestAllowed` in `lib/testSafety.js` rejects project id `fusion-high-app`. `db/firebase.js` returns null exports only when `GELEZA_FIREBASE_MOCK=1`, or initialises an emulator project id only when `GELEZA_FIREBASE_EMULATOR=1` and both emulator hosts are set. Otherwise it throws. It does not load the service-account file or application default credentials in test mode. `client/src/firebase.ts` throws when Vite/Node mode is `test` and the project id is `fusion-high-app`. | `tests/safety/phase16-safety.test.js`: production project rejection, missing mock, missing-mock module process, explicit mock exports no app, emulator cannot select `fusion-high-app`. All passed inside `npm test`. | No client test runner executes `client/src/firebase.ts`. The production browser build still initialises the live project, which is required for the deployed app. |
| PostgreSQL isolation | PASS | `assertTestDatabaseAllowed` runs in `db/db.js` before `new Pool` when the process is a test. Approved hosts are only `localhost`, `127.0.0.1`, and `::1`. The database name must equal `GELEZA_TEST_DATABASE` and match `geleza_test_`, `geleza_phase_`, or `geleza_streams_` plus a safe suffix. `FUSION_DB`, `postgres`, `template0`, and `template1` are rejected. | Unit cases for `FUSION_DB`, an unapproved host, and a missing disposable name passed. A child process requiring `db/db.js` against a non-routable `FUSION_DB` URL exited with `TestSafetyError` and did not print a connection success. Direct runs of `tests/lesson-planning-db.test.js` and `tests/run_schema_test.js` exited 1 with `TestSafetyError` before a pool was created. | `tests/phase1-critical-security.test.js` and the database section of `tests/academic-streams.test.js` can still open a loopback connection when `GELEZA_TEST_DATABASE` is set on purpose. They are not part of `npm test` and were not executed. |
| External-service isolation | PASS | `refuseExternalService` throws unless the matching mock flag is `1`. It is called from `emailService` (`sendViaDirectTls`, `getTransporter`, `httpsJson`), `aiProvider.getClient`, `applicationService` before `getGenerativeModel`, `whatsappService` (`postMessage`, `deliver`), and `webPushService.notifyUsers`. `installTestNetworkGuard` rejects non-loopback `http`, `https`, `net`, `tls`, and `fetch`. `tests/test-gemini.js` exits 1 unless `GELEZA_ALLOW_LIVE_GEMINI=1`, and it loads the bootstrap before dotenv. | Email, AI, WhatsApp, and push refusal passed. The AI provider child process refused a configured key. `fetch('https://example.invalid/phase16')` threw `TestSafetyError`. The Gemini script child exited 1. The application-service source assertion confirmed the refusal is before `getGenerativeModel`. | No separate SMS provider exists in this tree. PayFast and Ozow appear only as payment-method labels in `paymentHold.js`, not as a gateway client. The WhatsApp webhook routes are inbound. `applicationService` can still construct a Gemini client object at import if a key is already in the environment; the model call and the network guard both refuse the request. `npm run test:ai` and `npm run test:ai:auto` were not executed. |
| Test-suite separation | PASS | `npm test` and `npm run test:unit` run the bootstrap plus `tests/critical-path.test.js`, `tests/learner-csv-import.test.js`, `tests/batch0-containment.test.js`, and `tests/safety/phase16-safety.test.js`. `test:integration` runs only `tests/safety/phase16-integration.test.js`. `test:e2e` runs only `tests/safety/phase16-e2e-guard.test.js`. Commands are documented in `docs/ops/PHASE_1_6_TEST_SAFETY.md`. | The script-boundary tests passed in all three commands. Default `npm test` completed without a database, Firebase, or external service. | Historical scripts under `tests/test_*.js`, `tests/verify_*.js`, and the live AI scripts remain in the tree. They are not on the default command. Running them on purpose still needs a controlled environment. |
| Superadmin authorization | PASS | `lib/authoritativeAccess.js` loads `users.is_superadmin` with the role name on each check. Only boolean `true` counts. `authMiddleware.auth` replaces token role, email, school, and superadmin flag from that row and returns 401 for a missing, deleted, or deactivated account before the session id is accepted. `requireRole` no longer falls back to the token role and no longer treats the role name `superadmin` as a bypass. `schoolRoutes` review and `systemRoutes` master-admin use `createEnforceDatabaseSuperadmin`. `testerRoleChangeAllowed` refuses role names `superadmin`, `system_admin`, `master`, `master_admin`, and `platform_admin`, and refuses a target whose database flag is true. The tester update also requires `is_superadmin` to be false in SQL. The designated account is represented as role `admin` with `is_superadmin` true in the regression fixture. Its role was not changed and the flag was not cleared. No production account row was read or written. | Designated-account shape, role-name denial, JWT school-review denial, stale JWT overwrite, database flag grant, missing user, deleted user with a remaining child row, deactivated `is_active`, token role ignored when the database has no user, tester escalation refusal, and route-source wiring. All passed inside `npm test`. | The base `users` table has no `is_active` or `deleted_at` column. Deactivation is enforced only when such a column exists. Deletion is denied when the row is missing or recorded in `recycle_bin`. A current row with a valid session remains authorized. The client still receives `is_superadmin` in the login payload; the server does not trust it. `requireRole`, used on its own, still allows a missing non-recycled learner token when a `children` row exists. Normal routes call `auth()` first, which denies that user. The live designated account was not queried. |
| Security regression coverage | PASS | `tests/safety/phase16-safety.test.js`, `tests/safety/phase16-integration.test.js`, and `tests/safety/phase16-e2e-guard.test.js` exercise the boundaries above, including child processes that load `db/db.js` and `db/firebase.js`. Existing critical-path, learner CSV, and batch-0 unit tests still run on the default command. | 46 unit tests passed, 0 failed (2.57s). 2 integration-boundary tests passed. 2 end-to-end-boundary tests passed. | The older phase-1 security file and the academic-stream database section were not re-executed, because they open a real loopback PostgreSQL connection. Their production-database assertions remain in those files, and both now set `GELEZA_TEST_MODE` and `GELEZA_TEST_DATABASE` before requiring `db/db.js`. |

## 1. Actual Phase 1.6 status

All seven requirements are implemented in this tree. The safe default suite, the integration boundary suite, and the end-to-end boundary suite passed. Unsafe historical scripts fail closed on import or are absent from the default commands. Superadmin privilege is the database flag `users.is_superadmin`, reloaded on each authenticated request. Phase 2 was not started.

## 2. Files created or modified

Created:

- `lib/testSafety.js`
- `lib/authoritativeAccess.js`
- `tests/safety/bootstrap.js`
- `tests/safety/blockLiveEffects.js`
- `tests/safety/phase16-safety.test.js`
- `tests/safety/phase16-integration.test.js`
- `tests/safety/phase16-e2e-guard.test.js`
- `docs/ops/PHASE_1_6_TEST_SAFETY.md`
- `docs/ops/PHASE_1_6_VERIFICATION.md`

Modified:

- `db/db.js`, `db/firebase.js`
- `authMiddleware.js`
- `public/src/routes/schoolRoutes.js`, `public/src/routes/systemRoutes.js`
- `public/src/controller/systemController.js`
- `public/src/services/emailService.js`, `public/src/services/ai/aiProvider.js`, `public/src/services/applicationService.js`, `public/src/services/whatsappService.js`, `public/src/services/webPushService.js`
- `client/src/firebase.ts` (test-mode guard only; this file is not on the protected login-routing list)
- `package.json` test scripts
- `tests/test-gemini.js`, `tests/phase1-critical-security.test.js`, `tests/academic-streams.test.js`
- every other `tests/*.js` file, to require the bootstrap before its own code

## 3. Security vulnerabilities discovered

- Importing `db/db.js` or `db/firebase.js` during a test could use production defaults (`FUSION_DB`, project `fusion-high-app`, service-account credentials).
- A JWT claim, or a role named `superadmin`, could pass `requireRole` without `users.is_superadmin` being true.
- School-registration review and master-admin routes trusted `req.user.is_superadmin` taken from the token.
- The tester screen could assign a privileged role name and could change the role of an account that already had the database superadmin flag.
- Stale tokens kept their privilege until the session id changed. A missing account was already rejected by the session check, but a deleted account with a remaining child row could still be treated as a learner by `requireRole`.
- Live Gemini, email, WhatsApp, and push paths had no test-mode refusal. The network was not blocked for the test process.

## 4. Security vulnerabilities fixed

- Test processes fail closed before a pool or a Firebase app is created, and before email, AI, WhatsApp, or push calls leave the process.
- `auth()` and `requireRole` reload the account and set `is_superadmin` only from the database boolean.
- School review and master-admin routes query that same rule again.
- Tester role changes cannot grant a platform role and cannot modify a database superadmin.
- Missing and recycle-bin-deleted users are denied. When a deactivation column exists, a deactivated row is denied even if the token is still signed.

## 5. Tests executed and exact results

Commands were run with no production database URL, Firebase credential, or third-party secret in the environment.

- `npm test` — 46 tests, 11 suites, 46 passed, 0 failed, 0 skipped, duration 2571.792868 ms.
- `npm run test:integration` — 2 tests, 1 suite, 2 passed, 0 failed, duration 46.106096 ms.
- `npm run test:e2e` — 2 tests, 1 suite, 2 passed, 0 failed, duration 43.470434 ms.
- `node tests/lesson-planning-db.test.js` — exit 1, `TestSafetyError: Tests require GELEZA_TEST_DATABASE to name an explicit disposable database. No connection was created.`
- `node tests/run_schema_test.js` — exit 1, the same `TestSafetyError`. This script previously targeted `FUSION_DB`.

## 6. Tests deliberately not executed

These were not run because a static reading showed they open PostgreSQL, call a live model, or talk to a running application. They were not used as a way to discover whether they were safe.

- `tests/phase1-critical-security.test.js`
- the database section of `tests/academic-streams.test.js`
- `tests/school-registration-db.test.js`, `tests/school-registration-approval.test.js`, `tests/school-registration-http.test.js`, and the other school-registration scripts
- `tests/lesson-planning.test.js`, `tests/lesson-planning-integrity.test.js`, `tests/retention-payment-security.test.js`, `tests/email-relay-acceptance.test.js`, `tests/grade-class-isolation.test.js`, `tests/report-card-system.test.js`
- `tests/geleza-ai.test.js`, `tests/geleza-ai-automation.test.js`, `tests/geleza-ai-life-sciences-fix.test.js`
- `tests/test-gemini.js` as a live model call (only the early exit was executed, inside the unit suite)
- `tests/test_*.js`, `tests/verify_*.js`, `tests/dashboard_comprehensive_audit.js`, `tests/full_health_check.js`, `tests/inspect_chat_and_contacts.js`
- no browser session, no production database, no Firebase project, no email, no payment, and no query of the designated account

`lesson-planning-db` and `run_schema_test` are listed under executed results only as fail-closed import checks. Their original assertions were not run.

## 7. Protected-file integrity

These files were not edited. SHA-256 before and after the work:

| File | SHA-256 |
|---|---|
| `client/vite.config.ts` | `23a5a7beb03e37d72fc6755eb0d3353bd89cb7b6ee83c429ec22baa9e8b71e88` |
| `client/productionApiGuard.mjs` | `4d7f5ed4fec912a26a1a7fa9cf4297c186801e1ccd83b5c60384226489de5937` |
| `client/src/services/api.ts` | `c273894d2fd8fde6fd2b7333a966b44004c56a4bcbe61a7a1dc387b57f460810` |
| `client/src/services/authResponse.ts` | `aa41a2f5e434d229a1dbbf274fd80c03cfd69ffb3075e5401bcea496b7551e73` |
| `client/src/context/AuthContext.tsx` | `4d2172fa1c49d0b84c13d5bfbfc59c6d74c61b69154d7f063a9cffd77892b3a9` |
| `client/src/pages/auth/LoginPage.tsx` | `e42e3c85ce8c3866dbe4989e238511e7ba4acc8659358713b24ea29f3c7759dc` |
| `client/src/utils/imageUrl.ts` | `5cbbbf51a4ddfb87ae60926cae9cd9ee57a6b9feeb4b58c6d67f90b70697525b` |
| `client/public/sw.js` | `4c07278f3f090c6eabfca9852465bf4ad276b527977ea20d914b781b2561a731` |
| `firebase.json` | `303c334e45672118f8ab03bcf83b5e3a5df40d21c6899293c16690e12e439d6d` |

`client/.env.production` is gitignored and was not present in this clone. It was not created or modified.

## 8. Residual security risks

- The production client still initialises Firebase project `fusion-high-app`. That is the deployed app, not the test path. A future client test runner should import `client/src/firebase.ts` under Vite test mode and expect the throw.
- There is still no `is_active` column in the base schema. An account that should be disabled but has not been deleted stays authorized while its session id matches.
- If the optional-column probe against `information_schema` fails, the process caches an empty column set and will not see a deactivation column until restart. A failed user lookup still returns 500.
- Login tokens still contain `is_superadmin` for the client UI. API authorization does not use that claim. The UI can show a control until the API returns 403.
- Intentional loopback integration tests remain in the repository. They are safe only when `GELEZA_TEST_DATABASE` names a disposable database and the host is loopback.
- `npm run test:ai` and `npm run test:ai:auto` still exist. They load the bootstrap, but they were not executed in this verification.

## 9. Recommended next steps

- Keep using `npm test` as the default. Run `npm run test:integration` and `npm run test:e2e` for the suite boundaries. Do not point the older database scripts at a shared or production database.
- When a disposable loopback PostgreSQL instance is available, run `tests/phase1-critical-security.test.js` and the database section of `tests/academic-streams.test.js` there. They were left unrun here on purpose.
- Add a client unit runner later if the Firebase test-mode throw in `client/src/firebase.ts` should be executed rather than only inspected.
- If product policy requires disabling an account without deleting it, add an explicit column in a reviewed migration. Do not infer that state from the JWT.
- Do not start Phase 2 until this branch is reviewed. The production login-routing files listed above must stay untouched in that review.
