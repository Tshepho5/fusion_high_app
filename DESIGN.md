# Official Design System: Geleza SA (Global Standardisation)

## 1. Visual Theme & Identity
Geleza SA is the unified, CAPS-aligned school management and learning platform. This design system establishes a consistent, calm, and professional visual identity across all user roles:
* Super Admin / Platform Admin
* School Admin
* Principal
* Teachers / Educators
* Learners / Students
* Parents / Guardians

The design system enforces a calm, professional Light Mode, a premium charcoal/black Dark Mode, and a single decorative accent: **Electric Blue (`#168BFF`)**.

---

## 2. Official Colour Palette

### A. Light Mode — Soft, Professional Light Theme
Light Mode uses soft, cool grey-blue canvas surfaces to reduce glare and visual fatigue. Pure white is reserved for elevated cards and input fields.

| Semantic Token | Hex Code | Purpose |
| :--- | :--- | :--- |
| `--app-background` | `#E5EBF1` | Main application background / viewport canvas |
| `--surface-background` | `#DCE4EC` | Secondary background, navigation surfaces, section backdrops |
| `--card-background` | `#F4F6F8` | Main cards, content panels, lists |
| `--input-background` | `#FFFFFF` | Elevated cards, modal dialogs, input fields, dropdowns |
| `--text-primary` | `#101820` | Headings, primary labels, table data |
| `--text-secondary` | `#526071` | Subtitles, supporting copy, captions |
| `--border-color` | `#C7D1DC` | Card borders, dividers, list separators |
| `--icon-muted` | `#697586` | Inactive icons, unfocused controls, placeholders |
| `--accent-primary` | `#168BFF` | Active navigation, primary buttons, selected tabs, progress |
| `--accent-hover` | `#0878E8` | Hover / pressed state for primary action buttons |
| `--accent-soft` | `#DCEEFF` | Soft blue selection background, active row highlights |
| `--focus-ring` | `#168BFF` | Focus outlines, keyboard accessibility ring |
| `--disabled-background` | `#D4DCE5` | Disabled button/control background |
| `--disabled-text` | `#9AA5B4` | Disabled button/control readable label |

### B. Dark Mode — Premium Black and Charcoal Theme
Dark Mode delivers a focused, deep experience matching the approved Geleza SA dark aesthetic.

| Semantic Token | Hex Code | Purpose |
| :--- | :--- | :--- |
| `--app-background` | `#080B10` | Main application background / viewport canvas |
| `--surface-background` | `#0D121A` | Secondary background, navigation surfaces, sidebar |
| `--card-background` | `#111821` | Main cards, content panels, lists |
| `--input-background` | `#171F29` | Elevated cards, modal dialogs, input fields, dropdowns |
| `--text-primary` | `#F5F7FA` | Headings, primary labels, table data |
| `--text-secondary` | `#AAB5C2` | Subtitles, supporting copy, captions |
| `--border-color` | `#2C3948` | Card borders, dividers, list separators |
| `--icon-muted` | `#8794A5` | Inactive icons, unfocused controls, placeholders |
| `--accent-primary` | `#168BFF` | Active navigation, primary buttons, selected tabs, progress |
| `--accent-hover` | `#0878E8` | Hover / pressed state for primary action buttons |
| `--accent-soft` | `#102B45` | Soft blue selection background, active row highlights |
| `--focus-ring` | `#168BFF` | Focus outlines, keyboard accessibility ring |
| `--disabled-background` | `#141C26` | Disabled button/control background |
| `--disabled-text` | `#5B6878` | Disabled button/control readable label |

### C. Electric Blue Accent Rules
* **Electric Blue (`#168BFF`)** is the **ONLY** standard decorative accent colour.
* Used selectively for:
  - Active navigation items and bottom dock icons.
  - Selected tabs, pills, and filter buttons.
  - Primary action buttons ("Save", "Create", "Submit", "Sign In").
  - Focus rings and selection states.
  - Progress indicators and active highlights.
  - "Tap to close" floating action trigger.
* **Prohibited:** Random decorative purple, cyan, magenta, orange, or green styling across dashboards.
* **Functional Status Indicators (Preserved Sparingly):**
  - Success / Present: `#10B981` (soft light `#D1FAE5`, soft dark `#064E3B`)
  - Warning / Late: `#F59E0B` (soft light `#FEF3C7`, soft dark `#78350F`)
  - Danger / Absent / Overdue: `#EF4444` (soft light `#FEE2E2`, soft dark `#7F1D1D`)
  - Info: `#168BFF` (soft light `#DCEEFF`, soft dark `#102B45`)

---

## 3. Universal Architecture & Role Application
Identical visual tokens and contrast rules apply consistently across all roles:
1. **Platform & School Admin Portal** (`/dashboards/admin.html`, `AdminDashboard.tsx`)
2. **Teacher / Educator Portal** (`/dashboards/teacher.html`, `TeacherDashboard.tsx`)
3. **Learner / Student Portal** (`/dashboards/learner.html`, `LearnerDashboard.tsx`)
4. **Parent & Guardian Portal** (`/dashboards/parent.html`, `ParentDashboard.tsx`)
5. **Admissions & Auth Portals** (`/application.html`, `/auth/index.html`)

Roles are differentiated through permissions, content, and icons — never through conflicting branding colors.
