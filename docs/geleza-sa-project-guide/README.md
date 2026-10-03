# Geleza SA — Full Project Documentation

- **Full PDF:** [Geleza_SA_Full_Project_Documentation.pdf](./Geleza_SA_Full_Project_Documentation.pdf) (GSA-DOC-PROJECT-001)
- **Executive brief:** [Geleza_SA_Executive_Brief.pdf](./Geleza_SA_Executive_Brief.pdf) (GSA-DOC-EXEC-001) — short stakeholder summary
- **Contents (full):** Introduction, problem, solution, objectives, mission, public journey, then **module-by-module** walkthroughs for Learner, Parent, Teacher, and Principal / School Admin

## Regenerate

1. Ensure API (`npm start` / `:4000`) and Vite client (`npm run dev:client` / `:3000`) are running.
2. Capture role modules (optional if screenshots already present):

```bash
node docs/geleza-sa-project-guide/capture-modules.js
```

3. Build PDFs:

```bash
npm run docs:pdf    # full module documentation
npm run docs:exec   # short executive brief
```

## Source files

| File | Purpose |
|------|---------|
| `generate-geleza-sa-pdf.js` | PDFKit document builder |
| `module-catalog.js` | Per-role module narratives (prose for every module page) |
| `module-capture-plan.json` | Tabs + screenshot filenames for automation |
| `capture-modules.js` | Puppeteer-core capture against localhost |
| `screenshots/` | PNGs embedded in the PDF |

Tester suite password used for captures: `password123`.
