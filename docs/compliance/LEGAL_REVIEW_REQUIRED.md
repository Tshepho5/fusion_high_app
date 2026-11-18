# Geleza SA — matters that need a qualified South African legal practitioner

**Date:** 12 November 2026  
**Prepared from:** source inspection recorded in [LEGAL_COMPLIANCE_AUDIT.md](./LEGAL_COMPLIANCE_AUDIT.md)  
**This file is not legal advice.** It lists decisions an engineer must not make. The practitioner needs the companion reports in `docs/compliance/` and a description of the operator’s actual legal form.

Do not insert a company name, registration number, or address into policies until the operator provides them in writing. The repository does not contain those facts.

## Facts the practitioner does not have yet (operator must supply)

| Placeholder | Why it matters |
|---|---|
| [LEGAL ENTITY NAME] | Parties to the terms, the PAIA manual, and the operator agreement. “Geleza SA” and “Fusion High Dev Team” are names in the UI and `package.json`, not proof of a juristic person. |
| [REGISTRATION NUMBER] | Company or other body. |
| [PHYSICAL ADDRESS AND EMAIL] | ECTA supplier information, POPIA openness, and service of notices. |
| [INFORMATION OFFICER NAME AND CONTACT] | POPIA accountability and PAIA. |
| [INFORMATION REGULATOR REGISTRATION REFERENCE] | If already registered. None is in the repo. |
| [PUBLIC SCHOOL, INDEPENDENT SCHOOL, OR BOTH] | Changes who the responsible party is likely to be and which education statutes apply. |
| [LIST OF LIVE PROCESSORS AND REGIONS] | Production env was not readable from this audit. Counsel should be told whether Gemini, Firebase, Gmail, Resend, Brevo, and WhatsApp are actually on. |
| [WHETHER THE GIT REMOTE IS PUBLIC] | Drives breach analysis for the committed mailbox secret, admin bypass string, and seed identity numbers. |

## Questions

### L-1. Responsible party and operator

The interface says Geleza SA is the responsible party for all personal information collected. The software is multi-tenant: schools determine enrolment and assessment; the vendor determines AI providers, Firebase mirroring, and retention mechanics. Superadmin accounts can cross schools.

**Ask:** For each processing activity in [POPIA_COMPLIANCE_ASSESSMENT.md](./POPIA_COMPLIANCE_ASSESSMENT.md) section 2, who is the responsible party, who is the operator, and where is there joint responsibility? What must the school contract say before another school is onboarded? Is a click-wrap terms page enough for a school, or is a signed services agreement required?

**Do not implement** a sentence that names the vendor as sole responsible party until this is answered.

### L-2. Children

Learners are in Grades 8–12. POPIA sections 34 and 35 restrict processing of a child’s personal information. The Children’s Act 38 of 2005 deals with parental responsibilities. The product does not store a competent-person authorisation. Some parent links succeed on knowledge of an ID number and a learner number.

**Ask:** Which section 35 ground, if any, allows a public school and an independent school to use this platform? Is a parent tick-box required, or does a statutory education duty suffice? What evidence must be kept? May a parent who merely knows the ID number be treated as a competent person?

### L-3. Special personal information

The database stores race, `medical_info`, `special_needs`, a learning-disability flag, and disciplinary narratives. POPIA section 26 restricts special personal information, including race and health. Criminal behaviour is a separate category; school discipline may or may not fall inside it.

**Ask:** Which of these fields may be collected, by whom, and for what purpose? Which must be removed? Does a passkey public key (WebAuthn) count as biometric information for this product, given that no fingerprint image is stored?

### L-4. Security compromise

Source on `main` contains an administrator login bypass and a mailbox secret. Admission files are served without authentication if the URL is known. `/api/auth/sync-roster` is unauthenticated and can reset passwords.

**Ask:** Assuming the remote was reachable, has a security compromise under section 22 already occurred, or does that depend on evidence of access? Who must notify the Information Regulator and data subjects, and in what time? Should the named person in the `schema.sql` seed be notified even if no outsider pulled the repository?

The engineer’s next step (revoke secrets, close routes) should not wait for this opinion. The **wording of any notice to data subjects** should.

### L-5. Consumer and electronic-contracting law

Terms include a limitation of liability that says it applies only to the extent South African law allows. The product also markets “accreditation” it does not evidence, and fee screens name PayFast and Ozow although no gateway is called.

**Ask:** Does the Consumer Protection Act 68 of 2008 apply to schools buying the service, to parents, or to neither? Is the liability clause unfair? Do the accreditation lines contravene marketing rules? Does the Electronic Communications and Transactions Act 25 of 2002 require supplier identity information that the terms omit? This audit did not apply a section number to the liability clause beyond pointing at ECTA’s consumer-information chapter as a topic.

### L-6. What the terms must not say

**Ask for wording that avoids:** a waiver of statutory rights, a blanket exclusion of liability for gross negligence or data-protection duties if the law does not allow it, a warranty of absolute security, and any statement that the service is accredited, Home Affairs certified, or POPIA certified.

### L-7. Copyright and examination papers

`QuestionBank` contains text that prints “Copyright reserved” and identifies a DBE November 2018 paper. A script downloads papers from the DBE website. The Copyright Act 98 of 1978 applies. No exception was analysed to a conclusion.

**Ask:** Who owns copyright in those papers? Does any educational exception or DBE permission allow Geleza SA to store them in git and serve them to many schools? If not, is deletion sufficient, or is there exposure for copies already distributed?

### L-8. Cross-border processing

Gemini, Firebase, Gmail, Google Fonts, and possibly Resend, Brevo, Meta, and the database host process information outside the school. POPIA section 72 applies to transborder flows. The code does not record a country or a safeguard.

**Ask:** For each recipient that will remain enabled, which section 72 ground is available? Is consent of a parent valid for a child’s information in this context, or is a binding agreement with the foreign operator required? What must the privacy notice say if the ground is consent?

### L-9. PAIA

PAIA Act 2 of 2000. Private-body manuals are dealt with in section 51. Whether the operator is a private body that must publish a manual, and whether each public school remains separately responsible, was **not** determined.

**Ask:** Who must publish a PAIA manual, by when, and may the platform host the school’s manual? Do not generate a manual in the company’s name until L-1 and the entity’s details exist.

### L-10. Education-record retention

The South African Schools Act 84 of 1996 applies to schools. This audit did **not** identify a specific regulation that fixes how many years a mark, an admission file, or a disciplinary note must be kept. The application currently keeps them until a manual delete.

**Ask:** What is the minimum and maximum retention for each record type, for public schools and for independent schools? Which deletions would put the school in breach? The remediation plan refuses to invent a period.

### L-11. AI-assisted decisions

Admissions can show a document as verified when the model failed. Matric screens can show invented learners and pass rates. Remedial mail can be sent from a model. POPIA’s provisions on automated decision-making that has a legal effect or similarly significant effect need to be applied to these features by counsel. The section number and the “similarly significant” test should be confirmed by the practitioner rather than asserted here, because the product mixes advisory text with flags that look official.

**Ask:** Which of these features are automated decisions under POPIA, and what opportunity to make representations is required? Must a human at the school approve a document before it is marked verified?

### L-12. Cybercrimes and acceptable use

The Cybercrimes Act 19 of 2020 criminalises unlawful access and related conduct. The terms forbid unauthorised access. That contractual sentence does not secure the system.

**Ask:** After the bypass and the open database routes are closed, is any user notice or police report appropriate, or is this solely a regulatory notice under POPIA? The engineer will not draft a criminal complaint.

## Documents that must not be published until the answers exist

- Privacy policy and POPIA notice
- PAIA manual
- School service agreement and operator agreement presented as binding
- Parent and learner notices
- Any banner that says the platform is compliant, accredited, or certified

A short factual holding statement is safer than a long template. Proposed holding statement, for counsel to edit before it is shown to users:

> Geleza SA is updating its security and its privacy notices. The service is not accredited by the Department of Basic Education or the Information Regulator. Some features send information to service providers outside your school. Do not treat AI output or document scores as an official school or Home Affairs decision.

If counsel rejects that sentence, do not replace it with a stronger claim.

## What engineering will not treat as legal clearance

- Publishing these markdown files
- Adding a checkbox labelled “I consent to POPIA”
- Hashing ID numbers while leaving copies on public URLs
- Renaming the terms page to “Privacy Policy” without splitting the content and matching it to the code

When written advice arrives, file it outside the public client bundle if it is privileged, and update [COMPLIANCE_REMEDIATION_PLAN.md](./COMPLIANCE_REMEDIATION_PLAN.md) with the decisions. Do not paste privileged advice into the React app.
