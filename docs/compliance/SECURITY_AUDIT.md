# Geleza SA — security audit (Stage A)

**Date:** 12 November 2026  
**Mode:** Read-only source review. No exploit was run against production. No configuration was changed.  
**Related:** [LEGAL_COMPLIANCE_AUDIT.md](./LEGAL_COMPLIANCE_AUDIT.md)

This report describes insecure behaviour that is visible in source. It does not include reproduction steps, payloads, or secret values.

## 1. Secrets in source control

| ID | Severity | Evidence | Effect |
|---|---|---|---|
| GSA-001 | Critical | `public/src/controller/authController.js` compares a failed admin/superadmin login to a hardcoded string (around line 677). The same string is bcrypt-hashed in `db/migrate_school_onboarding_and_clean_roster.js` (around line 128) and referenced by credential scripts. | Administrator authentication bypass. The string is on `main`. |
| GSA-004 | Critical | `public/src/services/emailService.js` `getSmtpUser` / `getSmtpPass` (around lines 11–12) substitute a Gmail address and a hardcoded secret when environment variables are empty. | Disclosure of a mailbox secret. OTP and admissions mail use this service. |
| GSA-022 | High | `db/schema.sql` seed inserts (around lines 382–386) contain an email address, ID number, mobile number, and street address of a named person, plus further seed identities. | Personal information in git. Password hashes in that seed look like placeholders, not a verified live hash. |
| GSA-028 | Medium | `staffInviteController.js` around line 491 falls back to a fixed JWT string. Test files use other fixed JWT strings. | Dangerous if any entry point starts without the production secret. The main `server.js` refuses to boot without `JWT_SECRET`. |
| GSA-037 | Medium | `client/src/firebase.ts` embeds a Firebase web configuration as a fallback. | Project identifier in the client bundle. This is not a service-account private key. Admin SDK JSON filenames are referenced in `db/firebase.js` and those JSON files are gitignored. None were found in `git` tracked names during this review. |

`.gitignore` ignores `.env`, `.env.local`, `.env.production`, and `*firebase-adminsdk*.json`. That control is real and does not cover secrets written into `.js` and `.sql`.

**Correction:** revoke the mailbox secret at Google, replace `JWT_SECRET` if there is any chance the fallback was ever used, remove the login bypass, force a password reset for every admin and every account the roster migration can rewrite, and purge the literals from history. Do not commit the replacement values.

## 2. Unauthenticated and under-authenticated routes

| ID | Severity | Route or function | Gap |
|---|---|---|---|
| GSA-002 | Critical | `ALL /api/init-db` in `server.js` ~618 | No `authenticateToken`. Runs schema initialisation. Returns `err.message`. |
| GSA-003 | Critical | `ALL /api/auth/sync-roster` in `authRoutes.js` ~24 | No authentication. Calls `migrateSchoolOnboardingAndCleanRoster`, which updates `password_hash` of existing users it recognises. |
| GSA-005 | High | `express.static` on `uploads/` and `public/uploads/`; message file resolver; `/downloads`; textbook and `caps_archive` download routes | No login check. `Access-Control-Allow-Origin: *` on upload responses. |
| GSA-051 | Low / unverified exploitability | Public application payment handlers | No session. They do not call a card network. An id in the URL may still reveal or change application payment state. Not executed. |
| GSA-047 | Low | `/api` behaviour ML `GET /personas`, `POST /simulate` | No authentication on those two handlers. |
| — | Note | `POST /api/auth/register`, login, forgot-password, OTP, parent applications, public admissions | Intentionally public. Risk is in what they accept (GSA-011, GSA-027, file upload), not in the fact that login is public. |
| — | Note | Learner AI chat is mounted with optional authentication | A visitor can reach the tutor. Combined with GSA-016, role can be supplied by the client when no token role exists. |

## 3. Broken access control and tenant isolation

There is no PostgreSQL row-level security policy in `db/schema.sql`. Isolation is whatever each query remembers to filter.

`public/src/services/schoolScope.js` prevents a non-superadmin from choosing another `school_id` on the code paths that call it. That helper is not universal.

| ID | Severity | Who can cross the boundary | Evidence |
|---|---|---|---|
| GSA-006 | High | Authenticated parent (and other roles allowed on parent routes) | Performance, timetable, and alerts load `children` by id. Assignment listing in the same controller does check linkage. The safer pattern was not applied everywhere. |
| GSA-007 | High | Any authenticated user | `GET /api/ai-advisor/learner/:childId` selects the child and attendance with `WHERE c.id = $1` only (`aiAdvisorRoutes.js` ~34–43). A save path writes `ai_performance_predictions` for that id. |
| GSA-008 | High | School administrator | User profile read/update and user/learner delete use the numeric id without a `school_id` match. |
| GSA-009 | High | School administrator | Branding update uses the school id in the URL without an ownership check. Module updates in the same controller do check ownership. |
| GSA-010 | High | Teacher | `saveClassMarks` writes `marks` / `progress` for a body-supplied learner without proving the teacher’s class or school. Roster listing is scoped. Mark entry is not. |
| GSA-012 | High | Authenticated parent who knows identifiers | Link and activate flows trust learner number, ID number, and names. | 
| GSA-020 | High | Any missed query | `school_id` often defaults to `1` when a column is added (`init_full_schema.js`). `parent_portal_applications.school_id` is a string in one bootstrap script and an integer elsewhere. |

Frontend route guards in `client/src/App.tsx` are not a control. They read `localStorage` and explicitly allow the admin role onto other dashboards (GSA-034).

## 4. Authentication and sessions

| Topic | Finding |
|---|---|
| Password storage | bcrypt for normal passwords. Good. |
| Admin bypass | GSA-001. Overrides bcrypt. |
| Default passwords | GSA-011. `Learner@2026`, `Parent@2026`, `Admin@2026`, `Staff@2026`, `password123` in the roster migration, `Geleza@` + EMIS, and a password derived from SA ID digits with fallback `123456`. |
| Session | JWT plus `geleza_session` cookie. Cookie is `httpOnly`. `secure` is set when `NODE_ENV === 'production'`. `sameSite` is `lax`. Session id must match `users.active_session_id`. |
| CSRF | No CSRF middleware (GSA-030). `express-session` is a dependency and is not mounted in `server.js`. |
| Password reset | 10-digit code from `crypto.randomInt`. Stored in plaintext (GSA-026). Auth rate limit is 60 requests per 15 minutes per IP. Forgot-password can confirm that an email exists (GSA-027). |
| WebAuthn | Public key and counter stored. Login checks the request origin. This is not a stored fingerprint image. A lost device does not automatically revoke a credential unless the product deletes the row. Logout of other devices is a separate session mechanism. |
| Registration role | `authController` accepts a role from the body on registration. The exact privilege a self-selected role receives was not fully walked. Treat client-supplied role as untrusted (same class of bug as GSA-016). |

## 5. Files

| Topic | Finding |
|---|---|
| Profile images | 5 MB, image MIME prefix, name includes the user id (`server.js`). |
| Admissions | 15 MB, PDF/JPEG/PNG/WEBP. Directory `uploads/applications/`, then published by the public static route (GSA-005). |
| Chat | 25 MB, no allow-list (GSA-025). |
| Assignments | 25 MB, extension allow-list only. |
| Textbooks | 50 MB. The filter logs disallowed extensions and still calls the accept callback (`teacherRoutes.js`). |
| Path traversal | Download helpers that use `path.basename` are safer. `resolveMessageFile` joins route parameters. Traversal was **not** exploit-tested. |
| Serving | Knowledge of a predictable name (`userId-timestamp`, `app-timestamp`) is enough to fetch the file. |

## 6. Injection, XSS, headers, errors

| Topic | Finding |
|---|---|
| SQL injection | Controllers reviewed use parameter placeholders. A full audit of `scripts/` and string-built `db/` jobs was **not** completed. Residual risk is unverified, not cleared. |
| XSS | React escapes text by default. `dangerouslySetInnerHTML` was not fully enumerated. Markdown or HTML from the AI tutor, if rendered as HTML, needs a later pass. Not closed. |
| Headers | Helmet is enabled. CSP `scriptSrc` is `'self'`. `styleSrc` allows `'unsafe-inline'` and Google Fonts. `imgSrc` allows `data:`, `blob:`, and Unsplash. Static uploads override CORP and CORS. |
| CORS | Allow-list, then a fallback that allows any other origin with credentials (GSA-013). |
| Errors | Global handler returns `err.message`, not `err.stack` (GSA-029). `/api/health` can include the database error string. |
| Rate limits | Present on `/api/` and tighter on auth and support. Expensive AI routes share the broad API limit (GSA-042). Static uploads are not under that limiter. |
| Logging | Console logs include AI and migration errors. A structured redaction policy for ID numbers, OTPs, and prompts was **not** found. Whether production logs store prompts **cannot be verified**. |

## 7. Dependency and supply-chain notes

Root dependencies include Express 4, `multer` 1.4 LTS, `jsonwebtoken`, `firebase-admin`, and `@google/generative-ai`. Client dependencies include React 18, Vite 6, Firebase, and Capacitor. Versions are ranges (`^`), so the installed tree can move.

`npm audit` was not run. Multer 1.x has published advisories referenced in the lockfile (GSA-041). That is a lead, not a confirmed exploitable issue in this deployment.

`@vercel/speed-insights` is listed and not imported in application source (GSA-049).

## 8. Positive observations

- Server refuses to start without `JWT_SECRET`.
- Single active session id is checked on authenticated requests.
- WebAuthn does not store a biometric template.
- `.env` is gitignored.
- No payment-card PAN handling was found, because no gateway is called.
- Helmet is on.

## 9. Production unknowns

Cannot be verified from the repository:

- Whether the live host has already executed `sync-roster` or `init-db` from the internet.
- Whether `SMTP_PASS` in production overrides the hardcoded default. The default remains a leaked secret even if it is overridden.
- Database TLS, disk encryption, backup encryption, and who can download backups.
- Firebase security rules.
- WAF or platform authentication in front of Render, Vercel, or Firebase Hosting.

Until those are checked on the real host, the source findings should be treated as live.
