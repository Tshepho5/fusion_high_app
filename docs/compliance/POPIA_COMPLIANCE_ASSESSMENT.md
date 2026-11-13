# Geleza SA — POPIA compliance assessment (Stage A)

**Date:** 12 November 2026  
**Status:** Not compliant on the evidence in the repository. This is an engineering assessment for counsel, not a finding by the Information Regulator, and not a certificate.

POPIA is the Protection of Personal Information Act 4 of 2013. The conditions for lawful processing are in Chapter 3. This assessment maps the code to those conditions. It does not invent additional statutory tests.

## 1. Who is the responsible party?

**Cannot be verified.**

The terms modal states that Geleza SA is the responsible party for all personal information collected (`client/src/components/common/TermsAgreementModal.tsx`, around line 190). The terms page defines Geleza SA as a name, not as a registered entity. There is no company number, no physical address, and no Information Officer in the repository.

What the software actually does:

- A school registers and holds learners, staff, marks, attendance, and fees.
- The platform operator decides the product design: which fields exist, which AI provider is called, how long recycle-bin JSON is kept, and what the marketing site says.
- Superadmin features can see across schools.

Under POPIA, the responsible party determines the purpose and means of processing. An operator processes on behalf of a responsible party under a written contract (section 21, in the security-safeguards condition). Both roles can exist at once for different activities.

A supportable working assumption, **subject to legal advice**, is:

| Processing | More likely character | Why this is only an assumption |
|---|---|---|
| Learner admissions, attendance, marks, discipline, and fees that a school requires | School as responsible party; platform as operator | The school decides to enrol and assess. The code does not show a contract saying so. |
| Platform accounts, security logs, product AI prompts, Firebase mirroring chosen by the vendor | Platform operator as responsible party, or joint responsibility | The school does not choose Gemini or Firestore. No joint-responsibility clause exists. |
| Superadmin access to many schools | Needs a specific authority | The code grants it. A contract authorising it was not found. |

**Do not keep the sentence that Geleza SA is the responsible party for all personal information.** It may be wrong, and it may admit duties the operator has not staffed (Information Officer registration, section 22 notifications, PAIA manual).

Information Officer registration with the Information Regulator is **not evidenced**.

## 2. What is collected, why, and where

“Why” below is inferred from the feature. It is not a stated purpose in a privacy notice, except for the short paragraph in `TermsPage.tsx` section 5.

| Data | Where stored | Apparent purpose | Necessity |
|---|---|---|---|
| Learner and parent names, email, phone, address, date of birth, gender | `users`, `children`, `applications`, `parent_portal_applications` | Account, admission, contact | Consistent with a school system. Still needs a lawful basis. |
| South African ID numbers | `users.id_number`, `applications.id_number`, parent ID columns, `children` linkage | Identity matching | High risk. Used to **derive passwords** (GSA-011), which is not an identity purpose. |
| Race | `users.race`, parent application race | Unknown. Not required to take a register or store a mark. | Likely special personal information (section 26). No exemption is recorded in code. **Recommend counsel review before any further collection.** |
| `medical_info`, `special_needs` | `applications` | Admission. Health information. | Special personal information. Free text can include diagnoses. |
| `learning_disabilities`, `family_income`, parental education, peer influence, motivation | `learner_performance_profiles` (`db/schema.sql` ~1659–1676) | AI risk profiles | Goes beyond school administration. Disability and income inference are high risk. No notice describes this table. |
| Marks, report cards, homework, AI scores on homework | `marks`, `progress`, `report_cards`, `homework_submissions` | Teaching | Core, but access control is incomplete (GSA-006, GSA-010). |
| Attendance | `attendance` | Teaching and parent notice | Core. Same access-control gaps. |
| Merits and disciplinary text | `merits`, `disciplinary_records`, `behavior_incidents` | Conduct | May include information about alleged offences. Section 26’s criminal-behaviour category needs a legal view before this is treated as ordinary school data. |
| Photographs | Files and base64 in `users` / `children` | Profile | Not minimised (GSA-032). Public URL if stored under `/uploads` (GSA-005). |
| Messages, voice notes, attachments | `messages`, files, optional Firestore | Communication | Stored. Not shown to be access-audited (contradicts the modal). |
| AI chat text | `learner_ai_messages`, `geleza_ai_messages` | Tutoring | Can contain anything a child types, then be sent to Google (GSA-015). |
| Admission document files and OCR text | `application_documents`, `uploads/applications` | Admission | Identity documents. Public static hosting is not a safeguard. |
| Fee payer name and email | `fee_payments` | School fees | Local records. No card data found. |
| WebAuthn public key, device label | `webauthn_credentials` | Sign-in | Not a fingerprint image. Whether POPIA’s biometric category applies to a passkey public key is a legal question. Do not describe it as stored biometrics in the notice until counsel decides. |
| Push endpoint and user agent | `push_subscriptions` | Browser notifications | Device identifier. |
| Reset code | `users.reset_code` | Account recovery | Should not be stored in clear text (GSA-026). |
| Seed identities | `db/schema.sql` | Demo | Not a legitimate production purpose (GSA-022). |

Firebase may hold a second copy of messages and application contacts (GSA-023).

## 3. Lawful basis and consent

Section 11 requires a justification such as consent, a contract, a legal obligation, a legitimate interest that passes the Act’s tests, or another listed ground. This assessment does **not** pick a ground for the operator. The code shows:

- No database column for consent, purpose, or competent-person authority. A repository search of `db/` found no consent or POPIA record.
- The checkbox in `TermsAgreementModal.tsx` writes a version key and a timestamp to `localStorage` only (GSA-014).
- Parent–child rows (`parent_children`) record a relationship, not a legal authorisation.
- Public admissions collect child and parent ID numbers and health text before an account exists, from whoever submits the form. The form does not prove that the submitter is a competent person.

**Children:** section 34 prohibits processing personal information of a child unless a section 35 authorisation applies. One authorisation is consent of a competent person. Others include necessity for the exercise of a right or obligation in law. A school’s statutory duties **might** be relevant. That is counsel’s conclusion to make. The software currently proceeds either way and keeps no evidence of which ground was used.

**Special personal information:** section 26 prohibits processing listed categories, including race and health, unless an authorisation in the following sections applies. Race and `medical_info` are collected with no authorisation record.

## 4. Purpose limitation and minimisation

| Issue | ID |
|---|---|
| Race is collected and not used for any verified educational calculation in the areas reviewed. | GSA-021 |
| Disability and family-income fields exist for profiling. | GSA-021 |
| ID numbers are reused as password material. | GSA-011 |
| AI prompts include names and, for admissions, identity numbers and document text, which is more than a tutoring or a checksum need. | GSA-015 |
| Offline and failure paths invent academic and verification facts, which is a further use the user did not provide. | GSA-017 |
| Recycle bin keeps deleted rows, including credential hashes, with no time limit. | GSA-031 |

## 5. Openness

POPIA’s openness condition requires the data subject to know the responsible party is collecting information, and why, unless an exception applies. The terms do not identify:

- the legal entity and contact details
- an Information Officer
- each category actually stored (race, health, income, AI chats, voice notes)
- recipients (Google Gemini, Gmail, Firebase, Resend, Brevo, Meta)
- the fact of cross-border processing
- retention periods
- whether provision is voluntary or required for enrolment
- the right to complain to the Information Regulator

The modal’s security and responsible-party sentences are inaccurate (GSA-018). An inaccurate notice is not openness.

## 6. Information quality

Section 16 requires reasonable steps to keep information complete and accurate.

The product undermines accuracy:

- Documents are marked verified when Gemini throws or when only a heuristic runs (`applicationService.js` ~414–422).
- OCR can label a file “Department of Home Affairs Certified & Validated” (`applicationService.js` ~491) with no Home Affairs lookup.
- Matric and bursary views insert fictional people and fixed percentages when data are missing.
- AI tutor errors can return a canned answer that is not about the subject asked.

Schools may copy these outputs into decisions. That is an accuracy failure, not only a product defect (GSA-017).

## 7. Security safeguards

Section 19 requires appropriate, reasonable technical and organisational measures. Section 21 requires a written contract with operators. Section 22 requires notification of a security compromise to the Regulator and to data subjects when the statutory test is met. Whether a compromise has already occurred is a factual and legal judgment.

Technical measures that fail the “appropriate” test on source evidence:

- GSA-001 to GSA-010, GSA-004, GSA-005, GSA-013, GSA-025.

Measures that exist and should be kept:

- bcrypt, JWT secret required at startup, httpOnly session cookie, single active session, Helmet, auth rate limit, parameterised SQL on reviewed controllers.

Organisational measures **not** in the repository:

- operator agreements
- access-log review
- incident runbook
- backup encryption standard (the backup note in `docs/ops/BACKUP_RESTORE.md` describes `pg_dump` and file copies, not encryption or access control)
- staff confidentiality commitments

**Notification:** if the hardcoded mailbox secret or the admin bypass was present on a host that others could reach, counsel should consider section 22. This audit cannot determine whether unauthorised access already happened. It can determine that the design makes unauthorised access straightforward.

## 8. Data-subject participation

Sections 23 to 25 deal with access, correction, and deletion requests. The terms say requests go “through the School and/or Geleza SA Administration”. There is:

- no request type, clock, or identity-verification step
- no export of a learner’s full record for the parent
- no self-service deletion
- an admin delete that can hard-delete and that is not scoped to the school (GSA-008)
- a recycle bin that restores or retains the row

Support tickets (`support_tickets`) can hold a description and corrected fields. That is a helpdesk, not a POPIA process.

## 9. Cross-border transfers

Section 72 restricts transfers of personal information to a third party in another country unless a listed condition is met (adequate protection, binding agreement, consent, or another ground). The code does not record the country of processing.

| Flow | Country | Verified? |
|---|---|---|
| Gemini API | Not set in code. Google’s generative-AI processing is not shown to be confined to South Africa. | **Not verified.** Treat as a cross-border transfer until the contract says otherwise. |
| Gmail, Firebase, Google Fonts, Apps Script | Google infrastructure. Region not pinned in code. | **Not verified.** |
| Resend, Brevo | Foreign providers if keys are set. | **Not verified** whether keys are set in production. |
| Meta WhatsApp | Meta infrastructure if enabled. | **Not verified.** |
| PostgreSQL | Depends on `DATABASE_URL` / host. Supabase is supported as a Postgres URL in `db/db.js`. | **Not verified.** |
| Browser users abroad | Possible. `country` is a free field. | No geo-fence. |

No section 72 assessment, no binding corporate rule, and no transfer consent are in the repository.

## 10. Retention and deletion

| Store | Retention in code |
|---|---|
| Users, learners, marks, messages, AI chats, applications | Kept until an administrator deletes them. No age limit. |
| Recycle bin | Kept until an administrator purges. Snapshot can include `password_hash`. |
| Uploaded files | Not tied to the database delete in a way this audit fully verified. Orphan files are possible. **Not fully verified.** |
| Backups | `docs/ops/BACKUP_RESTORE.md` suggests 14–30 days for database dumps and 30 days for uploads, as an operator practice. The application does not enforce it. |
| `localStorage` terms flag | Until the browser clears it. Not a retention design. |

A retention period required by education law was **not** established in this audit. Do not delete official school records solely because a privacy project prefers short retention. Counsel and the school’s record-keeping duties must set the periods. After that, the platform can implement them.

## 11. Direct marketing and cookies

No advertising pixel was found. Fee reminders and OTP mail are transactional. A general marketing mailing list was not found. If one is added, it needs its own basis.

Cookies found: `geleza_session` (authentication). `localStorage` holds the token, profile cache, school context, theme, and the terms flag. That is not a cookie banner problem by itself. A notice should still mention the session cookie and local storage. Google Fonts causes the browser to contact Google (not a first-party cookie, still a disclosure).

## 12. Accountability gap

POPIA’s accountability condition (the responsible party must ensure the conditions are complied with) cannot be met while:

- the responsible party is unidentified and misstated
- processing records do not exist
- operator contracts do not exist
- the interface claims accreditation and encryption that the code does not implement

**Conclusion:** the application processes personal information at a scale and sensitivity that POPIA regulates, and the repository does not contain the technical or documentary controls the Act expects. Compliance is not claimed.
