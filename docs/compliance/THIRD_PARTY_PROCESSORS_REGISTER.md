# Geleza SA — third-party processors and recipients (Stage A)

**Date:** 12 November 2026  
**Rule used:** a processor is listed if source code can send personal information to it, or if production might, depending on environment variables this audit cannot see.

“Contract in repository” is **no** for every row. No data-processing agreement, operator agreement, or sub-processor list was found in the tree.

Cross-border status is **not verified** unless the code pins a region. Absence of a region means the transfer must be treated as potentially outside South Africa. POPIA section 72 is the provision to discuss with counsel. This table is not a section 72 assessment.

## 1. Active or conditional processors

| ID | Recipient | Code | Trigger | Personal information that can be included | Retention by recipient | Training use | Contract | Region |
|---|---|---|---|---|---|---|---|---|
| P-01 | Google Gemini API | `public/src/services/ai/aiProvider.js`, `aiTutorService.js`, `applicationService.js`, `specializedModules.js`, `gelezaOrchestrator.js` | `GEMINI_API_KEY` or `GOOGLE_API_KEY` set | Learner and parent names; school name; chat text; marks summaries via tools; on admissions, ID numbers and document text | **Not in code.** Set by Google’s API terms. | **Not in code.** Must be read from the current Google Cloud / Gemini terms. | None | **Not pinned** |
| P-02 | Google Gmail (SMTP) | `emailService.js` ~11–16 | Always available as a fallback, even when env is empty, because a user and secret are hardcoded | To-address, subject, HTML body: OTP, admissions, fees, absence, invites | Google account. **Not verified.** | Not applicable in the usual mail sense. The mailbox operator can read mail. | None. The mailbox is a personal Gmail address, not a role account documented here. | Google. **Not pinned** |
| P-03 | Google Apps Script | `emailService.js` `sendViaHttpsRest` | `GOOGLE_SCRIPT_EMAIL_URL` or Firestore `config/email.googleScriptUrl` | Same email payload | Depends on the script owner. **Not verified.** | Unknown | None | Google |
| P-04 | Resend | `emailService.js` | `RESEND_API_KEY` | Same email payload | **Not verified** | Unknown | None | **Not verified.** Resend’s infrastructure is not shown as South African. |
| P-05 | Brevo | `emailService.js` | `BREVO_API_KEY` | Same email payload plus sender from SMTP user | **Not verified** | Unknown | None | **Not verified** |
| P-06 | Google Firebase / Firestore | `db/firebase.js`, `client/src/firebase.ts`, `userController.js`, `applicationController.js` | Admin credentials or client config | Message bodies and attachments metadata; application contact fields; optional `mail` queue; notifications | **Not verified.** Security rules are not in the repo. | **Not verified** | None | **Not pinned** |
| P-07 | Firebase Storage | `firebaseStorageService.js` | If uploads are redirected there | File bytes (could include ID documents) | **Not verified** | Unknown | None | **Not pinned** |
| P-08 | Meta WhatsApp Cloud API | `whatsappService.js`, `whatsappRoutes.js` | `WHATSAPP_TOKEN` and phone number id | Mobile number, learner name, application reference, OTP, fee amounts | Meta. **Not verified.** | **Not verified** | None | Meta. **Not pinned.** Feature is dormant if env is empty. |
| P-09 | Google Fonts | `client/index.html`, `client/src/index.css` | Every page load that uses the CSS | IP address, user agent, referrer. Not the learner record. | Google. **Not verified.** | Unknown | Fonts terms not archived | Google |
| P-10 | Unsplash | `AdminOverview.tsx` image URLs | When that admin view loads | IP address, user agent. Not the learner record. | Unsplash. **Not verified.** | Unknown | Not recorded | Unsplash |
| P-11 | PostgreSQL host | `db/db.js` | `DATABASE_URL` or `SUPABASE_DATABASE_URL` or discrete `PG*` variables | Entire database, including children’s ID numbers and health text | The host’s backups. **Not verified.** | Should be none. **Not verified.** | None in repo | **Not verified.** A Supabase URL would usually be outside the school’s building. |
| P-12 | Web Push service (browser vendor) | `webPushService.js` | User accepts notifications | Push endpoint, keys, and the notification text the server sends (may name a learner) | Apple, Google, or Mozilla push gateways depending on the browser. **Not verified per user.** | Unknown | None | **Not verified** |
| P-13 | Hosting platform (Render, Vercel, Firebase Hosting — referenced in code and `vercel.json`) | `server.js` health comment, `vercel.json`, Firebase config | Wherever the process is deployed | Request logs, IPs, and anything the platform captures. **Cannot be verified** without the host dashboard. | Platform policy | Unknown | None in repo | **Not verified** |

## 2. Not processors, despite the user interface

| Name shown in the product | What the code does | Risk |
|---|---|---|
| PayFast, Ozow | Named in fee UI. `financeController.processPayment` inserts `fee_payments` locally and sets `gateway_transaction_id` null. No HTTP call to those firms. | Users may think a regulated payment provider is in the chain (GSA-043). |
| Stripe, Yoco | No integration. Stray words in knowledge files are not an API. | Do not list them as processors. |
| Department of Home Affairs | Local ID checksum and a text label. | The label is false if read as a DHA result (GSA-044). |
| OpenAI | Named inside prompt strings. | No API call. Do not list as a processor unless a key and client are added. |
| WhatsApp as a required channel | Optional. | Earlier product copy that promised WhatsApp OTP should stay removed. The service file still exists. |

## 3. On-server components that are not third parties if they stay on the same host

| Component | Note |
|---|---|
| `ml_models/src/predict.py` | Spawned locally with JSON on stdin. Personal information stays on the machine **only if** the process is not shipped to a separate data science host. Deployment **cannot be verified**. |
| `pdf-parse` | Runs in the API process. Document text then may be forwarded to Gemini by a different function. The parser itself is not the disclosure; the next call is. |

## 4. Operator-agreement checklist (none of these exist in repo)

For each of P-01 to P-08 and P-11, a written agreement should cover, once counsel confirms the clause list:

- subject matter and duration of processing
- nature and purpose
- types of personal information (including children, ID numbers, health)
- categories of data subjects (learners, parents, staff)
- the operator’s security measures
- a prohibition on using the data for the operator’s own model training, unless a separate lawful basis exists
- assistance with data-subject requests and security-compromise notices
- deletion or return at the end of the contract
- sub-processors and cross-border locations
- audit rights

Section 21 of POPIA is the statutory starting point for operator contracts. The exact clause set should be settled by a practitioner, not copied from a foreign DPA template without reading this system.

## 5. Immediate processing that should stop before a contract exists

1. **P-01 admissions payload** — ID numbers and identity-document text to Gemini.
2. **P-02 hardcoded personal Gmail** — OTPs must not flow through an individual’s mailbox secret stored in git. Use a role mailbox with a secret that exists only in the host environment, after the old secret is revoked.
3. **P-08** — leave WhatsApp unset.
4. **P-06 message mirror** — do not copy message bodies to Firestore until rules and a contract exist. Whether production already mirrors **cannot be verified** from source alone; the code path is present.

## 6. Information the privacy notice must name, once it is lawful to turn the feature on

Minimum list, if the feature remains enabled:

- Google (Gemini, and Firebase if sync stays, and Gmail or Workspace if mail stays)
- the email API actually used (one of Resend, Brevo, or Apps Script — not all four as silent alternatives)
- Meta, only if WhatsApp is switched on
- the database host’s legal name
- the application host’s legal name

Do not name PayFast or Home Affairs as recipients.

## 7. Sale of personal information

No code sells or brokers personal information to advertisers. The terms modal says information is never sold. That sentence can remain only if it is narrowed to “Geleza SA does not sell personal information” and is not used to hide processor disclosures. “Never” cannot cover a future integration. Prefer a present-tense factual sentence after counsel reviews it.
