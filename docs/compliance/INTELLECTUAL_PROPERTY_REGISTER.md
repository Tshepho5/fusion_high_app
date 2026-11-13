# Geleza SA — intellectual property register (Stage A)

**Date:** 12 November 2026  
**Method:** Repository inspection. `npm license` / licence-checker was **not** run. Licences marked “not verified” must not be treated as cleared for commercial use.

Nothing in this register is a licence grant. AI-generated text, quizzes, and images are not assumed to be free of third-party rights.

## 1. The application itself

| Item | Source | Licence / ownership | Commercial use | Attribution | Modification | Open question |
|---|---|---|---|---|---|---|
| `fusion-high-app` 2.1.0 | Root `package.json` | `"license": "ISC"` is declared by the project. Copyright owner is not named beyond `"author": "Fusion High Dev Team"`. | Declared by the author field only. | Not specified. | Not specified. | Who owns the copyright: a company, a natural person, or a school? **Cannot be verified.** ISC on a private product is an unusual choice if the owner does not intend to license the world. Confirm before any public distribution of source. |
| `client` package | `client/package.json` | `"private": true`. No licence field. | Private app. | — | — | Same ownership question. |
| `flutter_app` | `flutter_app/pubspec.yaml` | Name `fusion_high_app`. Flutter template README still present. | Unclear. | — | — | Parked. Do not publish store listings from the template text. |
| Geleza name, `geleza-logo.png`, `geleza-logo.svg`, `gsa-logo.svg`, mascot | `client/public/assets/` | No assignment or trade-mark certificate in the repo. | **Not verified.** | — | — | Search the trade-mark register before claiming exclusive rights. GSA-056. |

## 2. Third-party code (declared dependencies)

Versions are the ranges in `package.json`, not a locked audit of every transitive module. **Licence of each package: not verified in this audit.**

### Server (`package.json` dependencies)

| Package | Declared range | Typical use in this app | Licence status |
|---|---|---|---|
| `@google/generative-ai` | ^0.24.1 | Gemini client | Not verified. API use is also governed by Google’s terms, which are not stored here. |
| `@simplewebauthn/server` | ^13.2.2 | Passkeys | Not verified |
| `@vercel/speed-insights` | ^2.0.0 | Listed; no import found | Not verified. Remove or document. |
| `axios` | ^1.7.2 | HTTP | Not verified |
| `bcryptjs` | ^2.4.3 | Password hashes | Not verified |
| `body-parser` | ^1.20.3 | Express body parsing | Not verified |
| `cors` | ^2.8.5 | CORS | Not verified |
| `dotenv` | ^16.4.5 | Environment | Not verified |
| `express` | ^4.19.2 | HTTP server | Not verified |
| `express-rate-limit` | ^8.6.2 | Rate limits | Not verified |
| `express-session` | ^1.18.0 | Listed; not mounted | Not verified |
| `firebase` | ^12.18.0 | Client SDK on the server tree as well | Not verified. Google terms apply. |
| `firebase-admin` | ^14.3.0 | Firestore, storage | Not verified |
| `helmet` | ^8.3.0 | Security headers | Not verified |
| `http-errors` | ^2.0.0 | HTTP errors | Not verified |
| `jsonwebtoken` | ^9.0.2 | Sessions | Not verified |
| `multer` | ^1.4.5-lts.1 | Uploads | Not verified. Security advisories exist for 1.x (GSA-041). |
| `nodemailer` | ^8.0.5 | SMTP | Not verified |
| `pdf-parse` | ^1.1.4 | Admission PDF text | Not verified |
| `pdfkit` | ^0.19.1 | Generated PDFs | Not verified |
| `pg` | ^8.12.0 | PostgreSQL | Not verified |
| `pptxgenjs` | ^4.0.1 | Slides | Not verified |
| `selfsigned` | ^5.5.0 | Local HTTPS certificates | Not verified |
| `web-push` | ^3.6.7 | Browser push | Not verified |

Development: `nodemon`, `puppeteer-core`. Not verified.

### Client (`client/package.json`)

| Package | Declared range | Licence status |
|---|---|---|
| `@capacitor/android`, `@capacitor/cli`, `@capacitor/core` | ^8.5.0 | Not verified |
| `@simplewebauthn/browser` | ^13.2.2 | Not verified |
| `axios` | ^1.7.9 | Not verified |
| `canvas-confetti` | ^1.9.4 | Not verified |
| `chart.js`, `react-chartjs-2` | ^4.4.7 / ^5.3.0 | Not verified |
| `clsx`, `tailwind-merge` | ^2.1.1 / ^3.0.1 | Not verified |
| `date-fns` | ^4.1.0 | Not verified |
| `firebase` | ^12.18.0 | Not verified |
| `jsqr` | ^1.4.0 | Not verified |
| `lucide-react` | ^0.475.0 | Not verified. Icons are code; confirm the licence before any claim that the icon set was “designed for Geleza”. |
| `react`, `react-dom` | ^18.3.1 | Not verified |
| `react-router-dom` | ^7.1.5 | Not verified |

Development: TypeScript, Vite, Tailwind, PostCSS, Autoprefixer, type packages. Not verified.

**Do not strip licence notices from `node_modules` or from vendored files.** None were removed in this audit.

**Stage B optional check (read-only command, when approved):** generate an SPDX report from the lockfiles and attach it. This document must be updated with the actual licence identifiers. Until then every row stays “not verified”.

## 3. Fonts

| Asset | Source | Licence | Attribution | Open question |
|---|---|---|---|---|
| Outfit, Plus Jakarta Sans, JetBrains Mono | `client/index.html` Google Fonts CSS | Not verified. Google Fonts distributes many families under the SIL Open Font Licence. **This audit did not open each family licence.** | OFL attribution rules were not checked. | Browser calls `fonts.googleapis.com` (privacy side effect). GSA-053. |
| Inter, Playfair, Caveat, and further families | `client/src/index.css` `@import` | Not verified | Not verified | Same. |

No font files were found committed as desktop binaries in the paths reviewed. Loading from Google is not a local copy with a stored licence.

## 4. Images, logos, and school marks

| Asset | Source | Licence | Commercial use | Open question |
|---|---|---|---|---|
| Geleza logos and mascot | `client/public/assets/geleza-logo.*`, `gsa-logo.svg`, `geleza-ai-mascot.png` | No licence file beside the assets | Assumed internal. **Not verified.** | Author and trade mark (GSA-056). |
| `cloud-*.jpg`, campus imagery | `client/public/assets/` | **No source recorded** | **Not verified** | Replace if the photographer or a stock agency cannot be shown (GSA-040). |
| Unsplash URLs | `client/src/pages/admin/AdminOverview.tsx` | Unsplash licence was **not** retrieved for those photo ids | Hotlinking may breach Unsplash API or content terms. **Not verified.** | Download under a recorded licence or remove (GSA-040). |
| Named school SVG/PNG marks | `public/assets/schools/`, `client/public/assets/schools/` | No permission letters | **Not verified** | Schools’ badges are often protected. Do not keep another school’s crest without written permission (GSA-039). |

## 5. Educational and examination content

| Asset | Source | What was seen | Licence | Risk |
|---|---|---|---|---|
| `QuestionBank/data/text/ps1_memo.txt` | Tracked text extraction | Opens with “Copyright reserved / Kopiereg voorbehou”. Later pages identify DBE November 2018. | **None in repo** | High. GSA-019. Do not treat extraction as transforming the work into Geleza’s property. |
| `QuestionBank/data/raw/ps1.pdf`, `ps1_memo.pdf` | Tracked PDFs | Paired with the text above. Binary not fully read. | **None** | High. Same item. |
| `public/assets/caps_archive/*.pdf` | Tracked | A sample of text looked like product-generated portal wording rather than a scanned state paper. **Each PDF was not inspected.** | **None** | Unverified. GSA-052. Counsel or a content owner must classify file by file before public serving. |
| `scripts/fetch_dbe_past_papers.js` | Script | Downloads from `https://www.education.gov.za` into `uploads/textbooks/` | No permission recorded | High. GSA-038. The output directory is gitignored; the act of copying still needs a right. |
| `db/seed_past_papers.js`, `scripts/distribute_past_papers.js` | Scripts | Place papers into the product | Depends on the files | Do not distribute DBE papers to schools through the platform until a licence or a statutory permission is confirmed. |
| Local knowledge JSON | `data/*_kb.json`, `QuestionBank/topics.json` | Curriculum-style notes used by the offline tutor | Authorship **not verified**. May be original, copied, or model-written. | Do not assume originality. A human should sample them for copied textbook prose. **Not done exhaustively.** |
| AI quizzes and “CAPS” papers generated at runtime | `specializedModules.js` | Model output | Not a licence. Can imitate existing papers. | Label as generated. Do not badge as “official DBE”. Several UI strings say “Official DBE”. Those strings overclaim unless the file is an actual DBE document the school is allowed to hold. |

The Copyright Act 98 of 1978 is the relevant statute. This register does **not** conclude that fair dealing, education exceptions, or state-copyright rules permit this copying. That is item L-7 in [LEGAL_REVIEW_REQUIRED.md](./LEGAL_REVIEW_REQUIRED.md).

## 6. Sound, video, 3D

No committed music bed, stock video library, or 3D model pack was identified in the paths reviewed. Voice notes are user recordings, not a sound library. User recordings are personal information, not Geleza-owned media. **Cannot be verified** that every binary under `client/public` and `public/` was opened.

## 7. User and school content

Schools and users upload assignments, ID documents, and messages. The terms do not include a clear licence from the school to host that content, nor do they say that the school keeps copyright in its materials. They do say official academic decisions remain the school’s. That is not an IP clause.

Do not use learner uploads, ID scans, or tutor transcripts to train a model. Nothing in the code shows a training pipeline on those files. Gemini’s side of the request is outside this repo (see the AI audit).

## 8. Actions before any public content claim

1. Quarantine `QuestionBank` DBE files from the deployed static tree until a licence is produced, or delete them.
2. Stop `fetch_dbe_past_papers.js` from being a supported operator workflow until the same licence exists.
3. Remove “Official DBE” and “Accredited” labels from screens that are not serving a licensed DBE file.
4. Record a one-line source and licence next to every image that stays.
5. Run a lockfile licence report and replace section 2.
6. Ask the owner for a copyright assignment covering contractors and generated assets they intend to own.

This register is an inventory of gaps. It is not clearance to keep or to remove a work. Removal of DBE files from git history is a Stage B change and needs approval so that a school using those files is not silently broken.
