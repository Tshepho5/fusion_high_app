# Geleza SA — legal, privacy, security and operational risk audit

**Document:** LEGAL_COMPLIANCE_AUDIT.md  
**Stage:** A — read-only. No application code, configuration, database, or user-facing policy was changed.  
**Date of inspection:** 12 November 2026  
**Repository:** Fusion High App 2.1 (`fusion-high-app`), product name Geleza SA  
**Method:** Source inspection of the frontend, Express API, SQL schema and bootstrap scripts, services, and existing legal pages. This was not a live penetration test, not a production-environment review, and not a legal opinion.

## Status of this audit

This document does **not** certify Geleza SA as legally compliant, POPIA-compliant, PAIA-compliant, or accredited. It does **not** create a legal defence. Where a conclusion depends on facts outside the repository (the operator’s legal identity, signed school contracts, production environment variables, Google’s current data-processing terms, or whether a repository is public), the finding says that those facts **cannot be verified from source**.

Companion reports in this folder:

| Report | Scope |
|---|---|
| [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) | Access control, secrets, uploads, sessions |
| [POPIA_COMPLIANCE_ASSESSMENT.md](./POPIA_COMPLIANCE_ASSESSMENT.md) | Personal-information processing against POPIA conditions |
| [CHILDREN_DATA_PROTECTION.md](./CHILDREN_DATA_PROTECTION.md) | Learner and minor data |
| [AI_COMPLIANCE_AUDIT.md](./AI_COMPLIANCE_AUDIT.md) | Gemini and fabricated “official” outputs |
| [INTELLECTUAL_PROPERTY_REGISTER.md](./INTELLECTUAL_PROPERTY_REGISTER.md) | Code, fonts, images, examination content |
| [THIRD_PARTY_PROCESSORS_REGISTER.md](./THIRD_PARTY_PROCESSORS_REGISTER.md) | External recipients of data |
| [COMPLIANCE_REMEDIATION_PLAN.md](./COMPLIANCE_REMEDIATION_PLAN.md) | Proposed Stage B work, pending approval |
| [LEGAL_REVIEW_REQUIRED.md](./LEGAL_REVIEW_REQUIRED.md) | Questions for a qualified South African practitioner |

---

## 1. Executive risk report

Geleza SA is a multi-school platform for Grades 8–12. It stores learner and parent identity numbers, contact details, photographs, marks, attendance, discipline, health and special-needs text, messages, and AI conversations. The product is aimed at minors. The controls in source do not match the assurances on the legal screens.

The highest immediate risks are:

1. **Account takeover of every administrator.** Login accepts a hardcoded password for any user with `role_id === 1` or `is_superadmin`, after a normal password check fails (`public/src/controller/authController.js`, around line 677). The same string is hashed into a migration (`db/migrate_school_onboarding_and_clean_roster.js`, around line 128). The value is withheld from this report. Treat it as exposed because it is in tracked source on `main`, which tracks `origin/main`.
2. **Unauthenticated database operations.** `POST/GET /api/init-db` runs schema initialisation with no login (`server.js`, around lines 618–626). `ALL /api/auth/sync-roster` runs a migration that resets passwords of matching accounts to `password123` and rewrites identity fields (`public/src/routes/authRoutes.js`, around lines 24–32; migration around lines 126–157).
3. **A mailbox credential is hardcoded.** `public/src/services/emailService.js` (around lines 11–12) falls back to a named Gmail address and a hardcoded secret when `SMTP_USER` / `SMTP_PASS` are unset. The secret is withheld here. Rotate it at the provider and remove it from git history. One-time passwords and admissions mail can leave the platform through that account, Google Apps Script, Resend, or Brevo.
4. **Learner records are reachable across tenants and families.** Several parent, AI-advisor, admin, and teacher routes load or write a learner by numeric ID without proving the caller’s school or parent link. See [SECURITY_AUDIT.md](./SECURITY_AUDIT.md).
5. **Admission files can be fetched without login** if the URL is known. `/uploads` is served as static files with `Access-Control-Allow-Origin: *` (`server.js`, around lines 285–292). Admission documents are stored under `uploads/applications/`.
6. **Children’s identity documents and academic data are sent to Google Gemini** during admissions verification and tutoring, with no operator agreement, no cross-border assessment, and no consent record in the database. When Gemini fails, documents are still marked verified (`public/src/services/applicationService.js`, around lines 414–422).
7. **The legal pages overclaim.** The terms modal says Geleza SA is the responsible party for all personal information collected, that JWTs are encrypted, and that messages are auditable by administrators. The About copy says the product is “POPIA & CAPS Accredited”. None of those statements is supported by the code or by any certificate in the repository.
8. **Personal information of a named individual is committed in `db/schema.sql`** (seed `INSERT` around lines 382–386): email, South African ID number, phone, and street address. This report does not repeat those values. If they are real, this is a disclosure of personal information in source control.
9. **DBE examination material with a “Copyright reserved” notice is in the repository** (`QuestionBank/data/text/ps1_memo.txt` and related PDFs). A script downloads papers from `education.gov.za`. Redistribution rights were not found in the repo.
10. **There is no separate privacy notice, PAIA manual, retention schedule, breach procedure, school services agreement, or operator agreement.** Acceptance of terms is stored in browser `localStorage`, not in the database.

**Overall posture:** not fit to be described as compliant. Technical exposure is current. Legal role (responsible party versus operator) cannot be settled from code alone and needs a practitioner.

---

## 2. Critical vulnerabilities

| ID | Location | What the code does | Consequence | Legal review |
|---|---|---|---|---|
| GSA-001 | `public/src/controller/authController.js` ~677 | If bcrypt fails and the account is superadmin or `role_id === 1`, a hardcoded password is accepted. | Anyone who has the string can sign in as any administrator. | Yes — security compromise notification may be required if this was reachable in production. |
| GSA-002 | `server.js` ~618 | `/api/init-db` has no authentication. | An internet client can trigger schema changes and receive database error text. | Yes, if production was exposed. |
| GSA-003 | `authRoutes.js` ~24; `db/migrate_school_onboarding_and_clean_roster.js` ~126–157 | `/api/auth/sync-roster` has no authentication and updates `password_hash` of existing emails to `password123`, including a superadmin hash of the master string. | Unauthenticated password reset and identity overwrite for roster emails. | Yes, if production was exposed. |
| GSA-004 | `public/src/services/emailService.js` ~11–12 | Default SMTP user is a personal Gmail address; default SMTP secret is hardcoded. | Mailbox takeover, interception of OTPs and learner mail, secret in git. | Yes. Rotate whether or not production env overrides it, because the value is in source. |

Secret values are intentionally omitted. Do not copy them into new documents, tickets, or chat logs.

---

## 3. High-risk legal and privacy issues

| ID | Location | Description | Consequence | Correction (not yet applied) | Legal review |
|---|---|---|---|---|---|
| GSA-005 | `server.js` ~285–318; `applicationController.js` upload dir | Static `/uploads` and message-file routes have no auth. Admission PDFs, chat media, homework, and avatars are URL-addressable. | Unauthorised disclosure of identity documents and learner communications. | Authenticated or signed, short-lived URLs; stop serving `uploads/applications` publicly. | Yes |
| GSA-006 | `public/src/controller/parentController.js` (performance, timetable, alerts) | Some parent routes load `children` by `childId` without the linkage check used on other routes. | A parent, and on `/api/parent/*` also a teacher or admin, can read another learner’s marks and attendance. | Enforce the same child-link check on every child route. | No, once fixed; Yes if disclosure already occurred |
| GSA-007 | `public/src/routes/aiAdvisorRoutes.js` ~34–50 | Any logged-in user can `GET /api/ai-advisor/learner/:childId`. The query has no school or parent predicate. `evaluate-and-save` similarly keys off `childId`. | Cross-school read of names, marks, and attendance; prediction rows written for learners the caller does not teach. | Authorise against school and role before read or write. | Yes if used in production |
| GSA-008 | `adminController.js` user profile get/update; admin delete user/learner | By-ID admin routes do not compare `school_id` with the caller. List APIs often use `resolveSchoolId`. | School A administrator can read or delete School B people if IDs are known. | Scope every by-ID mutation and read. | Yes |
| GSA-009 | `schoolController.js` branding update | `PUT /api/schools/:id/branding` checks admin role, not ownership of that school. | Cross-school defacement of branding. | Compare `req.user.school_id` unless superadmin. | No |
| GSA-010 | `teacherLearnersController.js` `saveClassMarks` | Marks are written for a `child_id` from the body without a class or school check. | A teacher can alter another school’s official marks. | Authorise the learner, class, subject, and school on the server. | Yes — integrity of official academic records |
| GSA-011 | `adminController.js`, `authController.js` `generateLearnerPasswordFromID`, `schoolController.js` | Omitted passwords fall back to values such as `Learner@2026`, `Parent@2026`, `Admin@2026`, `Staff@2026`. Learner passwords can be derived from ID digits, with fallback `123456`. School approval can use `Geleza@` plus EMIS number. | Predictable first login to children’s and staff accounts. | Random one-time secrets, forced change, no derivation from the ID number. | Yes |
| GSA-012 | `parentController.js` link/activate child | A parent who supplies learner number, ID number, and names can link a child without a recorded school approval on the activate path. | Unauthorised guardian access to a minor. | School or existing competent-person approval, stored as a record. | Yes |
| GSA-013 | `server.js` CORS ~239–261 | Unknown browser origins are allowed, with credentials enabled. | Weakens isolation of cookie-authenticated calls. | Allow only configured origins. | No |
| GSA-014 | `TermsAgreementModal.tsx`; no consent columns in `db/` | Terms and “POPIA” checkboxes write only to `localStorage` (`fusion_terms_accepted_v2_1`). | No evidence of who consented, when, for which child, or as which competent person. | Server-side consent or authority record if counsel confirms it is required. | Yes |
| GSA-015 | `applicationService.js` ~357–418; `aiTutorService.js`; `gelezaOrchestrator.js` | Gemini receives names, role, school, chat, and on admissions ID numbers plus document text. | Cross-border processing of children’s special and identity data without a recorded lawful basis or contract. | Stop sending identity documents to Gemini until a verified arrangement exists. Minimise tutor prompts. | Yes |
| GSA-016 | `aiRoutes.js` ~47–53; `aiTutorController.js` ~169–174; learner AI route uses optional auth | The requested role can come from the JSON body when the token role is absent. Visitor tutor chat is possible. | Prompt and tool behaviour can be steered by a claimed role. Official marks tools are read-oriented, but the boundary is not trustworthy. | Ignore body role. Require authentication for any learner-record tool. | No |
| GSA-017 | `applicationService.js` ~414–422 and ~491; `bursaryController.js`; `matricAnalyticsController.js`; admin OCR UI | Gemini or OCR failure still sets `is_verified = true`. OCR text can say “Department of Home Affairs Certified & Validated” with no DHA connection. Bursary and matric screens invent candidates and pass rates. | Users and schools may rely on fabricated verification and results. | Fail closed. Label estimates. Never invent learners. | Yes — misrepresentation |
| GSA-018 | `TermsAgreementModal.tsx` ~190, ~207, ~241; `AboutUsModal.tsx` ~54 and ~345; `LearnerProfile.tsx` ~647 | Claims: Geleza is responsible party for all personal information; “encrypted JWT”; messages “archived and auditable”; “POPIA & CAPS Accredited”; “Encrypted with SHA-256 JWT”. | Misleading statements to schools, parents, and learners. JWTs are signed, not encrypted. No accreditation artefact exists. No message-audit table exists. | Remove accreditation and encryption claims. Split terms and privacy notice. Describe the real role. | Yes before republishing |
| GSA-019 | `QuestionBank/data/text/ps1_memo.txt`; `scripts/fetch_dbe_past_papers.js` | Tracked examination text begins “Copyright reserved / Kopiereg voorbehou” and identifies DBE November 2018. A script downloads from `education.gov.za`. | Copyright infringement risk if redistribution is not licensed. | Confirm a licence or remove and stop automated download. | Yes |
| GSA-020 | `db/schema.sql`; `db/init_full_schema.js` | No row-level security. Many `school_id` columns default to `1`. Enforcement is per query and incomplete. | Tenant isolation depends on every controller. Several controllers omit it (GSA-006 to GSA-010). | Server checks on every query; consider database policies after a backup. | No |
| GSA-021 | `users.race`; `applications.medical_info`, `special_needs`; `learner_performance_profiles.learning_disabilities`, `family_income` | Race, health, disability, and income-related fields are stored. | These are higher-risk categories under POPIA. Collection is broader than attendance and marks. | Justify each field with counsel or stop collecting it. | Yes |
| GSA-022 | `db/schema.sql` ~382–386 | Seed data includes a named person’s email, ID number, phone, and physical address. | Personal information in the repository and any database built from the seed. | Remove from seed and from git history if the data are real; assess notification. | Yes |
| GSA-023 | `db/firebase.js`; `userController.js`; `applicationController.js` | Firestore can store message bodies and application contact data in addition to PostgreSQL. | A second store, a second breach surface, and an additional Google processing location. | Document it, minimise it, and contract it — or stop mirroring content. | Yes |
| GSA-024 | No retention job; `recycle_bin` | No scheduled erasure. Admin soft-delete keeps a JSON snapshot that can include `password_hash` until a manual purge. No data-subject request workflow beyond generic support tickets. | Over-retention and no demonstrable participation rights. | Retention schedule approved by counsel, then implement. | Yes |
| GSA-025 | `server.js` chat multer ~143–163 | Chat uploads accept the client’s MIME type up to 25 MB, without an allow-list. Teacher textbook filter can still accept a rejected extension. | Malware hosting and unexpected file types on a school platform. | Allow-list types, scan, and do not serve them anonymously. | No |

---

## 4. Medium- and low-risk issues

| ID | Severity | Location | Description | Correction |
|---|---|---|---|---|
| GSA-026 | Medium | `authController.js` reset flow | Reset code stored in `users.reset_code` in plaintext. Ten-digit OTP generation itself uses `crypto.randomInt` (adequate entropy). Rate limit is per IP (60 / 15 min on auth routes), not per account. | Hash the code; limit per account. |
| GSA-027 | Medium | `authController.js` forgot-password response | Response can echo the account email. Login errors distinguish “account not found” from “password incorrect”. | Uniform responses. |
| GSA-028 | Medium | `staffInviteController.js` ~491 | JWT signing falls back to a hardcoded string if `JWT_SECRET` is missing. `server.js` refuses to start without `JWT_SECRET`, so this path is dormant on the main server. Tests and scripts still embed other fallback secrets. | Delete fallbacks. |
| GSA-029 | Medium | Many controllers; `/api/health`; `/api/init-db` | `err.message` is returned to clients. Stack traces were not found in JSON responses. | Generic client errors; log details server-side. |
| GSA-030 | Medium | `authMiddleware.js` | Session cookie is `httpOnly`, `sameSite: 'lax'`, and `secure` in production. No CSRF token. Mutations that rely only on the cookie are exposed to some cross-site request patterns. Bearer-header calls are less exposed. | CSRF token for cookie-authenticated mutations, or require a custom header. |
| GSA-031 | Medium | `scripts/migrate_recycle_bin.js`; admin delete | Recycle bin stores full row JSON, which can include password hashes, until manual purge. | Strip secrets from snapshots; define a maximum age. |
| GSA-032 | Medium | `userController.js` | Profile photos can be stored as base64 in PostgreSQL, so backups duplicate images. | Store files outside the row, with access control. |
| GSA-033 | Medium | `db/schema.sql` | `pgcrypto` is created. No column encryption of ID numbers, health text, or documents was found. Passwords are bcrypt-hashed. TLS depends on the host; the app can also serve optional local HTTPS. | Encrypt sensitive columns or disk at the host; do not claim encryption that is not implemented. |
| GSA-034 | Medium | `client/src/App.tsx` ~72–76 | Route guards read role from client storage and let `admin` through other role routes. APIs are the real control, and several APIs are incomplete. | Keep UI checks; do not describe them as security. |
| GSA-035 | Medium | `whatsappService.js` | If `WHATSAPP_TOKEN` is set, Meta receives phone numbers, learner names, application references, OTPs, and fee amounts. If unset, messages are not sent. Whether production is configured **cannot be verified**. | Leave disabled until a contract and a lawful basis exist. |
| GSA-036 | Medium | `emailService.js` | Mail may be POSTed to a Google Apps Script URL, or to Resend or Brevo, depending on env. | One contracted processor; no personal Gmail default. |
| GSA-037 | Medium | `client/src/firebase.ts` | Firebase web config (API key, project id) is hardcoded as a fallback. Firebase web keys are not secret by themselves, but they identify a live project. Service-account JSON is gitignored. A tracked service-account file was not found. | Env-only config; confirm Firebase security rules (not in this repo). |
| GSA-038 | Medium | `scripts/fetch_dbe_past_papers.js` | Automated download from the DBE website into `uploads/textbooks/`. | See GSA-019. |
| GSA-039 | Medium | `public/assets/schools/`, `client/public/assets/schools/` | SVG/PNG marks of named schools. Permission to use those badges **cannot be verified**. | Written permission or replace with neutral marks. |
| GSA-040 | Medium | `client/public/assets/cloud-*.jpg`, campus images; Unsplash URLs in `AdminOverview.tsx` | Image licences are not recorded. CSP allows `images.unsplash.com`. | Record the licence or replace. |
| GSA-041 | Medium | `package.json` `multer@^1.4.5-lts.1` | Lockfile notes Multer 1.x vulnerability advisories. `npm audit` was **not** run in this Stage A pass. | Run `npm audit` in Stage B and upgrade on a test branch. |
| GSA-042 | Medium | `server.js` API limiter | About 1000 requests per 15 minutes per IP on `/api/`. Auth routes are tighter. AI and upload routes are not separately capped. | Per-route limits on AI, OTP, and uploads. |
| GSA-043 | Medium | `financeController.js` `processPayment` | Fee UI names PayFast and Ozow. The handler inserts a local `fee_payments` row and does not call a payment gateway. | Say that online card payment is not active. Do not imply a payment licence. |
| GSA-044 | Medium | `applicationService.js` `validateSAID` | South African ID checks are local length/date/checksum logic. There is no Department of Home Affairs API. | Remove “Home Affairs certified” wording. |
| GSA-045 | Medium | `TermsPage.tsx` | One page combines terms, acceptable use, a short POPIA paragraph, and AI rules. There is no privacy-policy route. | Separate documents after legal review. |
| GSA-046 | Medium | Repository-wide | No PAIA manual, retention policy, breach procedure, information-security policy, school agreement, or data-processing agreement in the repo. `docs/ops/BACKUP_RESTORE.md` and `docs/ops/SA_SAMS_LEARNER_IMPORT.md` are operational notes only. | Draft only after counsel supplies the operator’s identity and role. |
| GSA-047 | Low | `behaviorMlRoutes.js` | `GET /personas` and `POST /simulate` have no auth. Sensitivity looks low; payload content was not fully characterised. | Require auth or remove. |
| GSA-048 | Low | Tests and `docs/geleza-sa-project-guide/capture-modules.js` | Default passwords and JWT fallbacks in test tooling (`password123` and similar). | Keep them out of production paths. |
| GSA-049 | Low | `package.json` | `@vercel/speed-insights` is a dependency. No import was found in application source. Active product analytics (gtag, Meta pixel, Mixpanel, Sentry) were not found. | Remove the unused dependency or document it if hosting injects it. Hosting-level analytics **cannot be verified**. |
| GSA-050 | Low | `flutter_app/` | A Flutter client exists, described in architecture docs as parked. It can call Gemini with a caller-supplied key. It is not the primary product. | Do not ship it with a client-side model key. |
| GSA-051 | Low | `applicationRoutes.js` pay endpoints | Public application payment routes key off an application id. Gateway charging was not found. IDOR on application status remains plausible if ids are guessable. **Not exploit-tested.** | Authenticate and use unguessable references. |

### Controls that are present

These reduce risk. They do not offset the critical findings.

- The main process exits if `JWT_SECRET` is empty (`server.js` lines 2–4).
- Passwords on normal registration use bcrypt. A complexity check exists for some password changes (`authController.js`).
- Login can bind a JWT to `active_session_id`, so a new sign-in replaces the previous session (`authMiddleware.js`).
- WebAuthn stores a credential id and public key, not a fingerprint image (`webauthnController.js`). Calling this “the app recording the fingerprint” would be inaccurate.
- Helmet sets a content-security policy (`server.js` ~166–183). Style sources allow `unsafe-inline` and Google Fonts.
- Many admin **list** queries use `resolveSchoolId` (`public/src/services/schoolScope.js`). By-ID routes are the gap.
- Sampled SQL uses `$1` placeholders. A line-by-line injection review of every script was **not** completed.
- `.env` and `*firebase-adminsdk*.json` are gitignored. Only `.env.example` is tracked. That does not protect secrets already committed in `.js` files.
- OpenAI is not called. PayFast, Ozow, Stripe, and Yoco are not called.
- No third-party advertising pixel was found in `client/index.html`.

---

## 5. Existing policy deficiencies

The only user-facing legal page found is `client/src/pages/landing/TermsPage.tsx` (GSA-DOC-TERMS-001, version 2.1, effective 1 January 2026), plus `TermsAgreementModal.tsx` and marketing lines in the About components.

| What exists | What is wrong relative to the software |
|---|---|
| Terms define “Geleza SA” as “Geleza South Africa” with no registration number, address, or Information Officer. | The contracting party cannot be identified. This audit will not invent one. |
| Terms say use is governed by the South African Schools Act 84 of 1996, CAPS, and POPIA 4 of 2013. | CAPS is curriculum policy, not a statute that “governs” a software contract. The Schools Act binds schools. Whether it binds the platform operator is a legal question. |
| Section 5 is a short POPIA paragraph inside the terms. | A privacy notice is a different document. It does not list categories, recipients, cross-border transfers, retention, or rights in a way that matches the schema. |
| Modal: Geleza SA is the responsible party for **all** personal information collected. | Multi-tenant school records are usually determined by the school. The code has no contract that allocates the role. The claim is broader than anything this audit can support. |
| Modal: encrypted JWT session tokens; profile: “Encrypted with SHA-256 JWT”. | Tokens are signed with `JWT_SECRET`. SHA-256 is not encryption of the token. |
| Modal: messaging is archived and auditable by administrators for child protection. | Messages are stored. A dedicated audit log of who read them was not found. |
| Modal: information is never sold. | No sale mechanism was found. “Never” is an operational promise the code cannot prove, because Firestore, Gemini, email, and WhatsApp still disclose information to processors. |
| Section 6: AI supports revision and schools may audit it. | Does not say that names, marks, and ID documents are sent to Google, or that verification can be marked successful on failure. |
| Section 8: third-party payment processors “where used”. | No payment processor is integrated. The sentence implies a capability the code does not have. |
| Section 9 liability limit. | It says exclusions apply only to the extent permitted by South African law. That is better than a total waiver. It still needs a practitioner to check fairness, especially for schools and for parents acting for children. |
| About: “POPIA & CAPS Accredited”, “DBE CAPS Accredited”, “Accredited Partner”. | No accreditation certificate, DBE endorsement, or Information Regulator registration reference is in the repository. These lines should be treated as inaccurate until a real credential is produced. |
| Acceptance stored in `localStorage` only. | Clearing the browser removes the only record. It is not evidence. |

`docs/ops/SA_SAMS_LEARNER_IMPORT.md` says schools must agree before import. That is a note to operators, not a recorded consent.

---

## 6. Missing policies

Not found as documents that describe this application:

1. Terms of service separate from the privacy notice (the current page mixes them).
2. Privacy policy / POPIA privacy notice stating actual processing.
3. PAIA manual.
4. Acceptable use policy as its own document (some use rules sit inside the terms).
5. Cookie notice. A session cookie exists; a cookie policy does not. Third-party analytics cookies were not found in source.
6. Information security policy.
7. Data retention and destruction policy.
8. Security-compromise / incident response procedure, including who notifies the Information Regulator and data subjects.
9. AI usage notice that matches Gemini, offline fallbacks, and human review of marks.
10. School service agreement.
11. Operator / data-processing agreement.
12. Third-party provider terms pack (Google, email, Firebase, Meta).
13. Intellectual-property and copyright policy, including past-paper use.
14. Parent or guardian privacy notice.
15. Learner notice in language a Grade 8 learner can understand.
16. Information Officer appointment and registration evidence.
17. Record of processing activities.
18. Competent-person authorisation record for children’s information.

Stage A does not draft these as if they were in force. Publishing them before the technical gaps close would repeat the current problem: text that the software does not fulfil.

---

## 7. Third-party integration risks

Summary. Detail is in [THIRD_PARTY_PROCESSORS_REGISTER.md](./THIRD_PARTY_PROCESSORS_REGISTER.md).

| Processor | Personal information that source shows can be sent | Contract in repo |
|---|---|---|
| Google Gemini | Tutor prompts (name, school, history); admissions names, ID numbers, document text; lesson and parent-message drafts | None |
| Google Gmail SMTP | Recipient address and full email body, including OTPs | None; personal mailbox hardcoded |
| Google Apps Script | Same email payload | None |
| Resend / Brevo | Same, if API keys are set | None |
| Google Firebase / Firestore | Messages, application contacts, optional mail queue | None in repo. Security rules not in repo |
| Meta WhatsApp | Phone, names, OTP, fees, if configured | None |
| Google Fonts | Browser IP and user agent to Google. No learner record in the font request | Font terms not archived |
| Unsplash | Browser request for images on an admin screen | Not recorded |
| PostgreSQL host (including a Supabase connection string if `SUPABASE_DATABASE_URL` is used) | Entire database | Hosting contract not in repo |
| Python ML on the same machine | Marks and features via stdin to `predict.py` | Stays on-host if the process stays on-host. Deployment **cannot be verified** |

No Department of Home Affairs integration exists. No card-payment processor is called.

---

## 8. Intellectual property concerns

| ID | Item | Issue |
|---|---|---|
| GSA-019 | `QuestionBank/` DBE November 2018 text and PDFs | “Copyright reserved” is printed in the extracted text. No licence file. |
| GSA-038 | `scripts/fetch_dbe_past_papers.js` | Automated copying from the DBE site. |
| GSA-052 | `public/assets/caps_archive/*.pdf` | Git-tracked PDFs. Some sampled text looks generated by the product rather than a scanned DBE paper. Each file was **not** opened. Treat the set as unverified. |
| GSA-039 | School crests | Trademark and copyright ownership not evidenced. |
| GSA-040 | Stock and Unsplash images | Licence not evidenced. |
| GSA-053 | Google Fonts (Outfit, Plus Jakarta Sans, Inter, and others) | Loaded from Google. Per-font licence files are not in the repo. |
| GSA-054 | npm dependencies | Root `package.json` says `"license": "ISC"` for this project. That is the project’s claim, not a third-party grant. Client `package.json` has `"private": true` and no licence field. Individual dependency licences were **not** inventoried with `npm` licence tooling. |
| GSA-055 | AI-generated quizzes, lesson plans, and verification text | The product presents some of this as school or “Home Affairs” material. AI output is not a guarantee of originality or of factual truth. |
| GSA-056 | Product name and logos (`geleza-logo`, `gsa-logo`) | Ownership by the operator is assumed by the UI and was **not** verified against a trade-mark register. |

---

## 9. Recommended corrective actions

Do these in order. Stage B should not start until the operator approves the batch. Details and a suggested sequence are in [COMPLIANCE_REMEDIATION_PLAN.md](./COMPLIANCE_REMEDIATION_PLAN.md).

1. **Rotate and revoke** the SMTP secret, the admin bypass string, and any password that was set to `password123` or the master string. Remove the literals from source and from git history. Assume the remote already has them.
2. **Disable** `/api/init-db` and `/api/auth/sync-roster` on any shared or production host, or require a secret that is not in source.
3. **Stop public access** to `uploads/applications`, message attachments, and homework files.
4. **Close IDOR and cross-school writes** (GSA-006 to GSA-010) before any further feature work.
5. **Stop telling users documents are verified** when the check failed. Remove Home Affairs certification language.
6. **Stop sending ID documents and ID numbers to Gemini** until counsel confirms a basis and a written operator arrangement.
7. **Remove accreditation, “encrypted JWT”, and “responsible party for all personal information” claims** from the interface so the product stops making statements it cannot support. Full replacement notices come after legal review, not before.
8. **Remove or quarantine DBE copyrighted files** and the personal data in `schema.sql` seeds, after confirming what is real.
9. **Engage a South African attorney** on the items in [LEGAL_REVIEW_REQUIRED.md](./LEGAL_REVIEW_REQUIRED.md) before publishing new terms.

---

## 10. Items requiring professional legal advice

See [LEGAL_REVIEW_REQUIRED.md](./LEGAL_REVIEW_REQUIRED.md). In short: who the responsible party is; whether a school’s statutory duties authorise processing of children’s information without a separate competent-person consent; whether race and health fields may be collected; cross-border transfers to Google, Meta, Resend, and Brevo; security-compromise notification for the committed secrets and the public upload path; PAIA manual duty; consumer-law fairness of the liability clause; and copyright in DBE papers.

---

## What this audit could not verify

- Production environment variables, firewall rules, database host encryption, Firebase security rules, and whether `/api/init-db` is reachable on the live host.
- Whether Google, Resend, Brevo, or Meta retain prompts or use them for model training. That is a contract question, not visible in this code.
- Whether any school has signed a services agreement.
- The operator’s company registration, address, or Information Officer.
- A full dependency-vulnerability scan (`npm audit` was not executed).
- Exploit confirmation. Findings describe code paths. They were not executed against production.
- Whether every SQL statement in `scripts/` and `db/` is parameterised.
- Whether `caps_archive` PDFs are official DBE works or synthetic files, file by file.
- Foreign privacy law. The code does not restrict accounts to South Africa (`users.country` exists and can be set). If a user is outside South Africa, additional laws may apply. No transfer assessment was found. This audit uses South African law as the primary context and does not give an opinion under GDPR or any other statute.

## Legislation considered, without treating the product as compliant

Statutes and instruments that are relevant because of what the software does. This is not a complete legal memorandum. Section numbers below are limited to provisions the review is confident exist; anything less certain is flagged.

| Instrument | Why it is in scope | Confidence |
|---|---|---|
| Protection of Personal Information Act 4 of 2013 | The system processes personal information, special personal information, and information about children, and uses operators. | The Act applies to this processing if the responsible party is domiciled in South Africa or makes use of means in South Africa. Who that responsible party is must be confirmed. Conditions in Chapter 3, security safeguards (section 19), operator contracts (section 21), security-compromise notification (section 22), the prohibition on special personal information (section 26), the prohibition on processing children’s personal information (section 34) and the authorisations in section 35, and cross-border transfers (section 72) are the provisions most clearly engaged by the code. |
| Promotion of Access to Information Act 2 of 2000 | People may request records. Private bodies have manual duties (section 51 is the commonly cited private-body manual provision). Whether Geleza, a public school, or both must publish a manual depends on their legal character. | Flag for counsel. Do not publish a manual that names the wrong body. |
| Electronic Communications and Transactions Act 25 of 2002 | The platform contracts and delivers services electronically and sends commercial or transactional email. Chapter 7 (consumer information, often discussed around section 43) may apply to online supply. | Applicability to a school-procured system versus a direct consumer signup needs advice. |
| Consumer Protection Act 68 of 2008 | Parents or schools may be consumers of a service. Unfair terms and marketing (including “accredited”) can matter. | Whether each school contract is in the ordinary course and above any threshold needs advice. Do not assume the Act both applies and does not apply. |
| Cybercrimes Act 19 of 2020 | Unauthorised access to data and systems is a criminal matter. Weak controls increase the chance of an offence by a third party and of questions about the operator’s safeguards. | This audit is not a criminal-law opinion. |
| Copyright Act 98 of 1978 | Examination papers, logos, fonts, and software are works. State or DBE copyright in examination papers needs confirmation. | No fair-dealing conclusion is made. Educational use is not assumed to be a blanket exception. |
| South African Schools Act 84 of 1996 | Schools, not the software vendor by default, carry admission and governance duties. The product stores the records those duties rely on. | Which sections oblige a particular retention period was **not** determined. Do not invent a retention period. |
| Children’s Act 38 of 2005 | Parental responsibilities and the best interests of the child are relevant to guardian linking and to who may authorise processing. | How “competent person” in POPIA maps to a specific school workflow needs advice. |
| CAPS / National Curriculum Statement | The product claims curriculum alignment. CAPS does not accredit a software vendor. | Marketing claim is unsupported. |

No finding in this audit should be quoted as a statement that Geleza SA complies with any of the above.
