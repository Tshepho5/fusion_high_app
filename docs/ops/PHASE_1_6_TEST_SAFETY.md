# Geleza SA test safety

Phase 1.6 keeps automated tests away from production Firebase, PostgreSQL, email, payments, WhatsApp, and paid AI calls.

## Commands

| Command | What it runs | Resources |
|---|---|---|
| `npm test` | Unit tests only. This is the safe default. | No database and no external network. |
| `npm run test:unit` | Same as `npm test`. | No database and no external network. |
| `npm run test:integration` | Guard tests that prove legacy database suites are not launched automatically. | Does not open a database connection. |
| `npm run test:e2e` | Guard tests that prove live browser and provider scripts are not launched. | Does not call a deployed environment. |

Every command above starts with `node --require ./tests/safety/bootstrap.js`. The bootstrap runs before the test file and before application modules. It sets `GELEZA_TEST_MODE=1`, removes production database URLs and provider secrets from the process, and blocks outbound HTTP, HTTPS, TCP, and TLS except loopback.

## Rules the bootstrap and modules enforce

- PostgreSQL connections during tests require `GELEZA_TEST_DATABASE`. The name must be a disposable `geleza_test_`, `geleza_phase`, or `geleza_streams_` database, and the host must be loopback. `FUSION_DB` is refused.
- Firebase tests do not initialise `fusion-high-app`. Set `GELEZA_FIREBASE_MOCK=1` for a null test double, or `GELEZA_FIREBASE_EMULATOR=1` with emulator hosts and a project id other than `fusion-high-app`.
- Email, Gemini, WhatsApp, and web push throw unless the matching `GELEZA_EMAIL_MOCK`, `GELEZA_AI_MOCK`, `GELEZA_WHATSAPP_MOCK`, or `GELEZA_PUSH_MOCK` flag is `1`.
- `tests/test-gemini.js` exits before it can call a model unless `GELEZA_ALLOW_LIVE_GEMINI=1` is set deliberately outside the test suite.

## Legacy suites

Older files under `tests/` that open PostgreSQL, call a running server, or talk to a provider are not part of `npm test`. They still load `tests/safety/blockLiveEffects.js` when executed directly, and database modules refuse unsafe targets. Run one of those files only against a loopback disposable database you created for that run, with `GELEZA_TEST_DATABASE` set to that database name before the application database module loads.

Do not point `DATABASE_URL`, Firebase credentials, SMTP, WhatsApp, or Gemini keys at production while a test process is running.
