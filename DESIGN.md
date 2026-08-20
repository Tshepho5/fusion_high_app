# Design System: Fusion High LMS & AI Tutor (Enterprise v2.1)

## 1. Visual Theme & Atmosphere
A high-agency, cockpit-dense educational workspace blending modern Scandinavian precision with high-contrast tactile elements. The interface delivers deep focus, zero eye fatigue during extended study sessions, and lively micro-interactions. The aesthetic is clean, academic yet futuristic, powered by crisp typography, subtle borders, deep slate canvas surfaces, and luminous indigo/cyan accents.

- **Density:** 7/10 (High information density with clean spatial separation)
- **Variance:** 6/10 (Asymmetric split layouts, rich modular grid cards)
- **Motion:** 7/10 (Spring physics on tab switches, interactive AI streaming indicators, tactile button presses)

---

## 2. Color Palette & Roles

### Base Surfaces
- **Canvas Obsidian** (`#090D16`) — Deep base canvas background in Dark Mode
- **Surface Elevation 1** (`#111827`) — Primary card and navigation panel fill
- **Surface Elevation 2** (`#1F2937`) — Nested card sections, table headers, and modal surfaces
- **Surface Darker** (`#0B0F19`) — Inset metric wells and code blocks
- **Light Canvas Surface** (`#F1F5F9`) — Crisp canvas background in Light Mode
- **Light Panel Surface** (`#FFFFFF`) — Card containers and sidebar background in Light Mode

### Typography & Neutrals
- **Ink Primary Dark** (`#F9FAFB`) — High-contrast headline and body text (Dark Mode)
- **Ink Primary Light** (`#0F172A`) — High-contrast headline and body text (Light Mode)
- **Ink Muted** (`#94A3B8`) — Secondary text, metadata, labels, and timestamps
- **Whisper Border Dark** (`rgba(255, 255, 255, 0.08)`) — Structural dividers and subtle card borders
- **Whisper Border Light** (`rgba(15, 23, 42, 0.08)`) — Light mode borders

### Functional Accents & Statuses
- **Electric Indigo** (`#4F46E5` / `#6366F1`) — Primary interactive buttons, active tab indicators, and AI tutor highlights
- **Cyber Cyan** (`#06B6D4`) — Secondary highlight, CAPS curriculum tags, and progress meters
- **Emerald Success** (`#10B981`) — Attendance present status, passing grades (70%+), quiz success feedback
- **Amber Warning** (`#F59E0B`) — Pending assessments, attendance late status, review alerts (50-69%)
- **Rose Danger** (`#EF4444`) — Attendance absent, overdue tasks, critical alerts (<50%)

---

## 3. Typography Rules
- **Display Headlines:** `Outfit`, sans-serif — Weight 600–700, track-tight (`-0.02em`), confident scale hierarchy without screaming.
- **Body & Interface:** `Plus Jakarta Sans`, sans-serif — Weight 400–500, relaxed leading (`1.6`), max 70ch per paragraph.
- **Data & Metrics:** `JetBrains Mono`, monospace — Grades (`78%`), Learner IDs (`2026-FHS-042`), Timetable slots, timestamps, formula expressions.
- **Banned:** Generic serif fonts (Times, Georgia) and uninspired browser defaults.

---

## 4. Component Stylings & Patterns

### Buttons & Interactive Controls
- **Primary CTA:** Solid Electric Indigo with smooth tactile press feedback (`active:scale-[0.98]`). High contrast white text with subtle top bevel highlight.
- **Secondary / Ghost:** Subtle glass backdrop (`bg-surface/50 hover:bg-surface/80 border border-whisper`).
- **Pill Badges:** Low-opacity tinted backgrounds with crisp saturated text (`bg-emerald-500/10 text-emerald-400 border border-emerald-500/20`).

### Cards & Panels
- Rounded corners (`rounded-2xl` / `16px`).
- 1px crisp subtle border (`border-white/10` or `border-slate-200/80`).
- Diffused ambient shadow (`shadow-sm hover:shadow-md transition-shadow`).
- Never use flat uncontained text stacks.

### High-Density Timetable Slots
- **Active / In Session:** Luminous Cyan border glow with pulsing live dot.
- **Standard Period:** Surface elevation 1 with subject badge and room code.
- **Break Period:** Subtle diagonal striped texture with muted slate time tag (`10:15 - 11:00`).

### AI Tutor Chat & Study Workspace
- Speech bubbles with asymmetric radius: user messages right-aligned in Electric Indigo, AI responses left-aligned in glass-slate with KaTeX/LaTeX math formatting, step-by-step numbered logic, and interactive action chips (*"Explain Simpler"*, *"Generate Practice Quiz"*, *"Flashcards"*).

---

## 5. Layout Principles & Responsive Architecture
- **Desktop (>= 1024px):** Fixed collapsible high-productivity sidebar with top summary app bar and multi-column modular widget grids.
- **Tablet (768px - 1023px):** Compact icon sidebar with flexible 2-column card layouts.
- **Mobile (< 768px):** Strict single-column stack, slide-out drawer navigation or bottom navigation bar, 48px minimum touch targets, zero horizontal scrolling.

---

## 6. Motion & Micro-interactions
- Hardware-accelerated CSS transforms (`transform`, `opacity`).
- Spring easing curves for modals, dropdowns, and tab panels (`cubic-bezier(0.16, 1, 0.3, 1)`).
- Staggered cascade animation (`.stagger-container`) for lists and dashboard grids.
- Shimmer sweep placeholders for loading skeletons.
