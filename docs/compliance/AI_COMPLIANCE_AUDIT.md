# Geleza SA — AI and automated-decision audit (Stage A)

**Date:** 12 November 2026  
**Status:** Not approved for processing children’s identity documents or official academic decisions.  
**Related:** [THIRD_PARTY_PROCESSORS_REGISTER.md](./THIRD_PARTY_PROCESSORS_REGISTER.md), [CHILDREN_DATA_PROTECTION.md](./CHILDREN_DATA_PROTECTION.md)

No model was called during this audit. Findings are from source.

## 1. Systems in the product

| System | Where | External model? | Writes official `marks` / `progress`? |
|---|---|---|---|
| Subject tutor | `public/src/services/aiTutorService.js`, `aiTutorController.js` | Google Gemini when `GEMINI_API_KEY` or `GOOGLE_API_KEY` is set. Otherwise an on-server knowledge bank. | No. It stores chat rows. Prompts tell the model to print a score. That score is conversation text unless a person copies it into a mark screen. |
| Orchestrator and tools | `public/src/services/ai/gelezaOrchestrator.js`, `toolRegistry.js`, `aiRoutes.js` | Gemini via `aiProvider.js`. | Tool handlers reviewed are `SELECT`s (`get_my_marks_summary`, `get_child_academic_summary`, and similar). They do not insert into `marks`. |
| Quizzes, lesson plans, papers, parent-message drafts | `specializedModules.js` | Gemini. | Generates text only. |
| Admissions “verification” | `applicationService.js` `verifyApplicationWithAI` | Gemini, with ID numbers and document text. | Sets `is_verified` and a confidence score on the application document object. That flag is an official-looking gate, not a class mark. |
| OCR inspection | `inspectDocumentOCR` | Local `pdf-parse`. No cloud OCR vendor was found. | Can still label a document as Home Affairs certified. |
| Local ID check | `validateSAID` | None. Checksum and date logic. | Not a Home Affairs result. |
| Performance predictions | `aiAdvisorService.js`, `aiAdvisorRoutes.js` | Local Python `ml_models/src/predict.py` on the server, not a SaaS model. | Inserts `ai_performance_predictions`. Does not update `marks`. The route does not check that the caller may see that child (GSA-007). |
| Matric projector and behaviour models | `matricAnalyticsController.js`, `behaviorMlService.js` | In-process rules and JSON artefacts. | Can email parents from `autoRouteRemedial`. Displays fabricated cohort rows when the grade is empty. |
| Bursary matcher | `bursaryController.js` | No external model. | Invents an “Academic Candidate” when no learner is linked. |
| Flutter tutor | `flutter_app/lib/services/gemini_service.dart` | Gemini, and the API key can be passed into the client. | Parked app. A client-side key would be extractable. |
| OpenAI | Mentioned in prompt text only. | No HTTP client. | — |

## 2. What is transmitted to Google

From `applicationService.js` (admissions) the prompt construction includes learner and parent names, ID numbers, date of birth, gender, age, grade, and a slice of extracted document text (on the order of 3 000 characters per file in the reviewed function).

From the tutor and orchestrator the prompt includes the user’s full name, role, school name, grade, subject, prior turns, and the new question. If a tool runs, a JSON summary of marks or attendance can be added to the follow-up prompt (`gelezaOrchestrator.js`).

`specializedModules.js` can include a learner’s wrong answer, and a draft teacher message can include parent and child names.

The API key is read from the environment in `aiProvider.js` and `aiTutorService.js`. It was not found hardcoded. That is the correct pattern. It does not limit what the prompt contains.

### Not known from the repository

- Which Google region receives the prompt.
- Whether the API project has disabled retention and training.
- The contents of Google’s current data-processing addendum.
- Whether production has a key set. If it does not, the offline path runs instead, and that path has its own defects.

Until those are documented, **personal information of learners should not be sent** (GSA-015). A privacy notice that omits Google would be false if the key is set.

## 3. Role and authority

| ID | Behaviour |
|---|---|
| GSA-016 | `POST` chat on `aiRoutes.js` sets `effectiveRole` from `req.body.role` when present, otherwise the token role. `aiTutorController.js` uses `req.user.role` or the body’s role. |
| GSA-050 area | Learner tutor route is optionally authenticated, so a signed-out client can supply role and name. |
| GSA-007 | Advisor reads any `childId` for any logged-in user and can save a prediction. |

The model is instructed with a role string the client can influence. Tool execution must use the database role only. Body role must be ignored. Tools that read a named child must call the same authorisation helper as the parent and teacher controllers.

The model is not given a tool to change marks. Keep it that way. Do not add write tools for marks, attendance, discipline, or admissions status.

## 4. Fabrication and official appearance

| ID | Behaviour | Why it matters |
|---|---|---|
| GSA-017 | On Gemini error, `doc.is_verified = true` and confidence 85. If Gemini is absent, verified is still set true with confidence 90. | An admissions officer can accept an ID document the system did not read. |
| GSA-017 | `document_authenticity` string “Department of Home Affairs Certified & Validated”. Admin UI placeholders include “98.5% Verified”. | Implies a state verification that does not exist (GSA-044). |
| GSA-017 | Bursary matcher returns a synthetic candidate (APS 34, high match) when no learner record exists. | A parent or learner may rely on a match that is not theirs. |
| GSA-017 | Matric gateway statistics include fixed percentages. Empty Grade 12 cohorts fall back to named demo students. | Invented children in a real school dashboard. |
| GSA-017 | Offline tutor and orchestrator answer from a local bank or a template, including a repeated Physical Sciences item when matching fails (`physicalSciencesGrade10KB[0]`). | A learner receives the same lesson regardless of the question and can believe it is a personalised teacher. |
| — | Server errors on tutor chat still return a canned reply body. | The UI can present an error as tutoring. |

AI output is not labelled, in the data model, as “generated, not a school record”. Some flags (`is_verified`) are stored as if they were checks.

**Required behaviour, not yet implemented:**

- If the model or the parser fails, the document stays unverified.
- If there is no cohort, the chart is empty.
- If the knowledge bank does not match, the tutor says it does not know.
- Every learner-visible AI answer is marked as generated and not as the teacher’s mark or the school’s report.
- The assistant does not speak as the principal, the teacher, or the parent. Prompt text that role-plays those people should be removed when Stage B is approved. This audit did not quote every persona string.

## 5. Human review

| Decision | Human in the loop? |
|---|---|
| Official SBA mark | Only if staff use the mark screen. The AI cannot save it through the tool registry. A teacher can save an unauthorised learner’s mark (GSA-010), which is a human with too much power, not an AI safeguard. |
| Admissions document “verified” | The flag is set by software, including on failure. A human may rely on it. |
| Homework `ai_*` fields | Stored beside teacher fields. Whether the UI requires a teacher to confirm before the AI score is shown as final was **not** fully verified on every screen. |
| Remedial email from matric automation | `autoRouteRemedial` can email families from model output. A human approval step was **not** found on that path. |
| Early-warning job | Scheduled performance alerts (`server.js` cron area). Content and recipients need a later read before they are described as safe. **Not fully verified in this pass.** |

## 6. Prompts and minimisation

Admissions verification does not need the full ID number inside a generative model to perform a checksum. The checksum is already local. Sending the identity document text to Gemini is the opposite of minimisation.

Tutor prompts do not need the learner’s legal name for a subject explanation. A session id is enough for the log. School name is optional context and still identifies a small cohort.

Discipline notes, medical text, and income fields must not be added to prompts. This audit did not find medical text inside the tutor prompt. It did find those columns in the database, available to any future tool that “includes the learner profile”. That is a forward risk.

## 7. Logging and training

Chat is stored in PostgreSQL (`learner_ai_messages`, `geleza_ai_conversations`). That is the operator’s copy. Google’s copy is additional and ungoverned here.

There is no setting in source for “do not use for training”, no redaction of ID numbers before the HTTP call, and no retention limit on AI tables.

Console warnings log Gemini error messages. Those messages can echo request context. **Not verified** in production logs.

## 8. Claims in the interface

`TermsPage.tsx` section 6 says AI tools support revision and do not replace formal assessment. That sentence is narrower than the admissions verifier, the bursary matcher, and the matric projector, which are not “revision”.

The terms do not mention Google, cross-border processing, or failure-open verification.

About-page accreditation lines (GSA-018) are not an AI governance statement and are unsupported.

## 9. Stage B direction (do not implement until approved)

1. Block admissions document text and ID numbers from leaving the server.
2. Set verification to false when the model errors or is unconfigured.
3. Delete Home Affairs certification strings.
4. Ignore client-supplied role. Require a real session for any tool that reads marks.
5. Authorise `childId` on the advisor.
6. Remove demo students and synthetic bursary profiles.
7. Show a persistent “generated by AI — not an official mark or state verification” label.
8. Add a short AI section to the privacy notice only after items 1–6 are true, naming Google and stating that training use is whatever the contract says — or stating that the contract is not yet in place and the feature is off.

No statement in this file means the AI features are lawful, accurate, or safe for children.
