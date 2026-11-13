# Geleza SA — compliance remediation plan (Stage A proposal)

**Date:** 12 November 2026  
**Status:** Batch 0 code containment is in the working tree. It is not deployed from this audit. Git history was not rewritten. The Google mailbox secret must still be revoked in the Google account. Administrator and exposed roster passwords rotate once, the first time this code starts against a database.

Implement only the batches the operator approves. Do not delete school records, drop columns, or rewrite git history without an explicit instruction and a backup that has been restored once on a non-production database.

## Principles

1. Close exposure before rewriting legal pages. A new privacy notice that describes today’s behaviour would have to disclose the admin password bypass and the public admission files. Fix those, then describe the fixed system.
2. Do not add dummy consent rows, dummy Information Officers, or sample schools to look compliant.
3. Do not promise encryption, accreditation, Home Affairs checks, or payment-provider status that the code does not have.
4. Prefer denying access when a check fails. Do not fall back to “verified” or to a fictional learner.
5. Every server route that reads or writes a person must check identity on the server. The React route guard is not that check.

## Batch 0 — contain secrets (do this before the next deploy)

Owner: operator, with an engineer. Legal review: yes, for possible section 22 notification (see [LEGAL_REVIEW_REQUIRED.md](./LEGAL_REVIEW_REQUIRED.md) L-4).

| Step | Finding | Action |
|---|---|---|
| 0.1 | GSA-004 | Done in source: SMTP no longer falls back to a personal mailbox. Operator must revoke the old mailbox secret at Google and keep `SMTP_USER` / `SMTP_PASS` only in the host environment. |
| 0.2 | GSA-001 | Done in source: login bypass removed. First boot runs `db/batch0_credential_rotation.js`, which sets a random password and clears `active_session_id` for administrators and superadmins. |
| 0.3 | GSA-003 | Done in source: `/api/auth/sync-roster` returns 404 unless `MAINTENANCE_TOKEN` (24+ characters) matches `x-maintenance-token`. Boot migration no longer resets passwords. The same rotation covers the roster accounts. |
| 0.4 | GSA-002 | Done in source: `/api/init-db` uses the same maintenance gate and no longer returns database error text. |
| 0.5 | GSA-022 | Done in source: personal rows removed from `db/schema.sql`. Demo seeding is off unless `ALLOW_DEMO_SEED=true`. Git history was not purged. |
| 0.6 | GSA-028 | Done in source: JWT signing no longer has a hardcoded fallback. |

**Backup:** take a `pg_dump` and a copy of `uploads/` before Batch 1 writes. Follow `docs/ops/BACKUP_RESTORE.md`. Confirm the dump restores to a scratch database before destructive deletes.

## Batch 1 — stop unauthorised disclosure and unauthorised writes

Legal review: required if Batch 0 shows the public routes were reachable.

| Step | Finding | Action | Test |
|---|---|---|---|
| 1.1 | GSA-005 | Remove anonymous static serving of `uploads/applications`, `uploads/messages`, and homework submissions. Serve through an authorised handler or a short-lived signed URL. | Logged-out GET returns 401. A parent cannot fetch another child’s file. |
| 1.2 | GSA-006 | Use the existing child-link check on every parent handler that takes `childId`. | Parent A receives 403 for Parent B’s child. |
| 1.3 | GSA-007 | On AI advisor routes, require the caller’s school and role, and the child link for parents. | A learner token cannot read another id. |
| 1.4 | GSA-008, GSA-009 | Match `school_id` on admin user read, update, delete, and branding, unless the user is superadmin. | School A token cannot load School B’s user. |
| 1.5 | GSA-010 | Before `saveClassMarks`, require the learner to be in the teacher’s school and assigned class/subject. | Foreign `child_id` is rejected and no row changes. |
| 1.6 | GSA-012 | Parent link creates a pending record until a school user approves it. | Knowledge of an ID number alone does not open the record. |
| 1.7 | GSA-013 | CORS allow-list only. | A random origin is rejected. |
| 1.8 | GSA-025 | Allow-list chat and textbook MIME types and extensions. | An executable upload is rejected. |

Add tests in the existing `node --test` suite for 1.2–1.5. Do not use production data in tests.

## Batch 2 — stop false official records

| Step | Finding | Action |
|---|---|---|
| 2.1 | GSA-017 | On AI or parser failure, `is_verified` stays false and the client shows a failure. |
| 2.2 | GSA-044 | Remove “Department of Home Affairs Certified” and “98.5% Verified” placeholders. Describe the local checksum as a format check. |
| 2.3 | GSA-017 | Bursary and matric screens render an empty state when the database is empty. Delete the Sipho Dlamini / Academic Candidate fallbacks. |
| 2.4 | GSA-016 | Discard `role` from JSON bodies. Tutor chat that can see marks requires a session. |
| 2.5 | GSA-015 | Remove ID numbers and document text from the Gemini request. Keep a local checksum. Leave a feature flag defaulting to off for any remaining cloud tutor that includes a name. |
| 2.6 | — | Label remaining AI replies as generated and not as a school mark. |

## Batch 3 — minimise and retain, after counsel answers L-1, L-2, and L-3

Do not drop columns in this batch until those answers exist.

| Step | Finding | Action |
|---|---|---|
| 3.1 | GSA-021 | If counsel says race, family income, and learning-disability flags are not required, stop writing them and schedule a deletion that does not break admissions. |
| 3.2 | GSA-011 | Generate a random temporary password. Never derive it from the ID number. Force change at first login. Remove published defaults such as `Learner@2026`. |
| 3.3 | GSA-014 | Store the terms version, user id, timestamp, and source IP or school id on the server **only after** the notice text is the approved text. Do not backfill consent. |
| 3.4 | GSA-024, GSA-031 | Implement the retention periods counsel provides. Strip `password_hash` from recycle-bin JSON. Expire the bin. |
| 3.5 | GSA-026, GSA-027 | Hash reset codes. Use the same error text whether or not the email exists. |
| 3.6 | GSA-023 | Stop mirroring message bodies to Firestore, or document and contract the mirror. |

## Batch 4 — notices and contracts (documents, not a claim of compliance)

Publish only after Batches 0–2 are on the host the public uses, and only with the legal entity’s real name, address, and Information Officer supplied by the operator. Placeholders stay in draft until then.

| Document | Where it should live | Depends on |
|---|---|---|
| Terms of service | Replace the mixed content in `TermsPage.tsx` with contract terms only | L-5, L-6 |
| Privacy notice and POPIA section | New page, linked beside terms, not inside them | L-1, L-2, L-8, processor register |
| Parent notice and short learner notice | New pages, linked at registration | Children’s report |
| AI note | Section of the privacy notice plus in-product label | Batch 2 |
| PAIA manual | Static page or PDF once the body (private or public) is known | L-9 |
| School services agreement and operator agreement | `docs/compliance/contracts/` as drafts for signature, not as a click-wrap that pretends the school has signed | L-1 |
| Incident procedure | `docs/compliance/` internal, not marketing | L-4 |

Remove from the UI in the same release as Batch 4, or earlier if the operator agrees that the false statements should not wait:

- “POPIA & CAPS Accredited”, “DBE CAPS Accredited”, “Accredited Partner”, “Accredited & Active”
- “encrypted JWT session tokens” and “Encrypted with SHA-256 JWT”
- “Responsible Party for all personal information” until counsel states the actual role
- “archived and auditable” until an access log exists

## Batch 5 — intellectual property and dependencies

| Step | Finding | Action |
|---|---|---|
| 5.1 | GSA-019, GSA-038 | Remove DBE-copyrighted files from the deploy artefact. Disable the fetch script. History deletion needs a separate approval. |
| 5.2 | GSA-039, GSA-040 | Replace unlicensed crests and stock images, or add a licence file that cites the grant. |
| 5.3 | GSA-041 | Run `npm audit` on a branch and upgrade within tests. |
| 5.4 | GSA-054 | Attach a real SPDX report to the IP register. |

## Explicitly out of scope until a later decision

- Rewriting Flutter to parity.
- Turning on WhatsApp.
- Connecting PayFast or Ozow. If payments are added later, that is a new audit (PCI, ECTA, refunds, school as merchant).
- Database row-level security. Worth doing after the application checks in Batch 1, not instead of them.
- Column encryption of ID numbers. Useful after access control works. Not a substitute for GSA-005.

## Acceptance criteria for a later compliance claim

The operator may still **not** say “Geleza SA is POPIA compliant” merely because these batches are merged. A later claim requires all of:

- Batches 0–2 deployed
- counsel’s written view on responsible party, children, special personal information, and cross-border transfer
- signed operator arrangements with the processors that remain enabled
- Information Officer identified and registration confirmed by counsel
- notices that match the deployed code
- a recorded incident process
- re-test of the access-control cases

Until then, permitted wording is factual: “Geleza SA is engaged in a remediation programme. It is not certified and does not claim POPIA accreditation.”

## Suggested approval gate

Reply with the batches to implement, for example “approve Batch 0 and Batch 1 only”. Batch 0 should not wait.
