# Geleza SA — children’s data protection (Stage A)

**Date:** 12 November 2026  
**Priority:** Highest. The product is built for Grades 8–12 (`children.grade` and admissions grades are constrained to 8–12). Many learners are under 18. POPIA defines a child as a person under 18. Some Grade 12 learners may be 18 or older; the schema does not split “minor” from “adult learner”, so the same pipes carry both.

This report does not authorise processing. It records what the software does with learner information and where safeguards are missing.

## 1. What is held about a learner

| Category | Examples in the system | Typical table or store |
|---|---|---|
| Identity | Legal name, surname, date of birth, gender, home language, learner number, South African ID number | `children`, `users`, `applications` |
| Contact | Phone, email, physical address | `users`, `applications` |
| Family | Parent names, parent ID numbers, phones, emails, employer, relationship | `applications`, `parent_portal_applications`, `parent_children` |
| Images | Profile photo, message images | database base64 and `/uploads` |
| Academic | Subjects, marks, report cards, homework files, quiz scores | `marks`, `progress`, `report_cards`, `homework_submissions` |
| Presence | Period and daily attendance | `attendance` |
| Conduct | Merits, demerits, incident descriptions, detention flags | `merits`, `disciplinary_records`, `behavior_incidents` |
| Health | `medical_info`, `special_needs` free text | `applications` |
| Inferred | Learning-disability flag, family income band, motivation, predicted scores, risk tier | `learner_performance_profiles`, `ai_performance_predictions` |
| Speech and writing | AI tutor transcripts, message text, voice-note files | `learner_ai_messages`, `messages`, `uploads/messages/voice` |
| Documents | ID, birth certificate, proof of residence, clinic card (as described in product docs and upload types) | `application_documents`, `uploads/applications` |

Parent accounts have their own identity numbers and, on the parent application, race.

## 2. Authority to process a child’s information

POPIA section 34 prohibits processing a child’s personal information unless section 35 allows it. Section 35 includes consent of a **competent person** and certain other grounds, including where processing is necessary for the exercise or defence of a right or obligation in law. This audit does not decide which ground a public school, an independent school, or the platform may use. A practitioner must.

What the product implements today:

| Expectation | Implementation |
|---|---|
| Competent person identified | Parent fields exist. Nothing records that this adult has parental responsibilities under the Children’s Act 38 of 2005 or a court order. |
| Authorisation stored | **Absent.** Terms checkbox is `localStorage` on the device that clicked it (GSA-014). |
| School approval before a parent sees a child | Inconsistent. Some routes check linkage. Activate/link can succeed on knowledge of the learner number and ID (GSA-012). |
| Separation of schools | Incomplete (GSA-006, GSA-007, GSA-008, GSA-010, GSA-020). |
| Age check before an AI or admissions feature | Not found. A public admissions form accepts Grade 8–12 applications from the open internet. |

**Risk:** a person who is not the parent can attach themselves to a learner, and a user in another school can read or edit the learner, because the server trusts an id.

## 3. Access rules the product must actually enforce

The following are product requirements from the audit brief, checked against code.

| Rule | Result |
|---|---|
| One school must not read another school’s learner records. | **Failed** for admin by-ID profile and delete (GSA-008), AI advisor by child id (GSA-007), teacher mark writes (GSA-010), and branding of another school (GSA-009). List screens that call `resolveSchoolId` are in better shape. Superadmin is intentionally global; that power has no contract in the repo. |
| A parent must not read another family’s learner. | **Failed** on parent performance, timetable, and alert handlers that do not repeat the linkage check (GSA-006). Other handlers in the same file do check. |
| A teacher must not read or mark learners outside assigned classes. | **Partial.** Roster queries are scoped. Saving marks is not (GSA-010). |
| Marks, attendance, and identity documents must not be available on a public URL or an open API. | **Failed** for files under `/uploads` (GSA-005). **Failed** for unauthenticated `init-db` and `sync-roster` (GSA-002, GSA-003), which are not record downloads but can destroy or reset the accounts that protect those records. AI advisor requires a token but not a relationship (GSA-007). |

## 4. Sensitive fields that should not be casual

| Field | Why it is higher risk | Recommendation before Stage B deletes anything |
|---|---|---|
| ID number | Identity theft; also used to build a password. | Stop deriving passwords. Keep the number only if admission or a statutory register needs it. Restrict reads to roles that need it. |
| Race | POPIA special personal information. | Ask counsel whether any school report legally requires it. If not, stop collecting and plan a deletion. |
| Medical and special needs | Health information about a child. | Collect only what the school’s admission policy requires, with a stated purpose, not a free-text box copied into AI. |
| Learning disability and family income | Profiling a child. | These fields are not needed for a register. Prefer removal after counsel confirms no statutory report depends on them. |
| Disciplinary narrative | Can be stigmatising and may edge into alleged criminal behaviour. | Limit text, limit readers to the school’s designated staff, and do not send the narrative to Gemini. |
| Voice notes and chat | A child may disclose abuse, health, or another person’s information. | Access control, retention, and a human process. Do not claim administrators already audit this unless an audit log exists. |
| Photos | Biographical and sometimes biometric-adjacent. | No public static URLs. |

Stage A does not drop columns. Deleting `medical_info` or discipline history can also destroy records a school is legally required to keep. That decision needs the school and counsel.

## 5. Sharing a child’s data outside the school

| Recipient | Child data visible in source |
|---|---|
| Google Gemini | Admissions: child and parent names, ID numbers, date of birth, gender, and up to thousands of characters of document text. Tutor: learner name, grade, subject, and the conversation the child typed. Orchestrator tools can add mark summaries back into a prompt. |
| Email providers | Absence notices, fee mail, OTP, staff invites. Bodies can name the learner. |
| Meta WhatsApp | Learner name, application reference, OTP, fees, if tokens are configured. |
| Firebase | Message content and application contacts when sync runs. |
| Other users of the API | Via the access-control gaps above. |
| Public internet | Anyone who can guess an upload URL. |

There is no in-product switch that keeps a minor’s record on-server only. AI features call out when an API key exists.

## 6. Accuracy and children

Fabricated verification and fabricated matric or bursary profiles (GSA-017) are more serious for minors because an adult may treat them as official. A child should not be shown another person’s invented “pass probability” as if it were calculated from their own marks. The code path that substitutes a demo cohort when Grade 12 rows are missing does that (`matricAnalyticsController.js`).

AI must not be the writer of the official mark. Reviewed tool definitions read marks; teacher controllers write them. That split is good and must stay. It is weakened by GSA-010 (any teacher can write) and by homework fields that store an “AI mark” beside a teacher mark. The interface should keep calling the AI score advisory. This audit did not re-check every screen label.

## 7. Retention for minors

No child-specific retention or “delete when the learner leaves” job exists (GSA-024). Backup notes suggest keeping dumps for weeks, not a school archive schedule.

Leaving a school, turning 18, or a parent’s request to erase does not trigger a workflow. Erasure can conflict with a school’s duty to keep academic records. The platform should not promise deletion in a notice until counsel defines what may be deleted and what the school must retain. The honest notice is: requests are received, identity is checked, and some records are kept where the law or the school’s duty requires it.

## 8. Learner-facing language

There is no separate learner privacy notice. The terms are written for a general user and cite statutes by name. A Grade 8 learner is unlikely to understand “responsible party”, “POPIA”, or the accreditation claims. When notices are rewritten (Stage B, after legal review), the learner text should say, in plain sentences:

- who runs the service (once the legal name is known)
- that teachers and the school can see marks and attendance
- that parents linked to them can see those records
- that some questions typed to the AI helper are sent to an outside company
- that the AI helper can be wrong and is not the teacher’s mark
- who to tell if something is wrong or frightening

Those sentences are a content requirement, not a published notice. Do not ship them until the facts in them are true.

## 9. Safeguards that are worth keeping

- Grades are bounded, which shows the product knows its users are school learners.
- Some parent routes already call a child-access check. That pattern should be the only pattern.
- Official mark tables are not written by the Gemini tool registry.
- WebAuthn does not upload a fingerprint image of the child. Do not market it as if the server stores the fingerprint.

## 10. Minimum technical bar before processing more children’s data

1. Close GSA-001, GSA-003, GSA-005, GSA-006, GSA-007, GSA-008, GSA-010, and GSA-012.
2. Stop the Gemini admissions payload (ID numbers and document text) until a written arrangement exists.
3. Remove demo learners from any screen a real school can open.
4. Record, on the server, who linked a parent to a child and which staff member approved it.
5. Only then ask counsel to confirm the section 35 ground and the notice wording.

Until that work is done, the children’s-data processing described above remains exposed.
