# Design System: Fusion High Portal (v2.1)

## 1. Visual Theme & Atmosphere
A restrained, high-trust institutional portal with calm density, confident spatial structure, and fluid micro-interactions. The atmosphere is academic, serene, and executive-grade — designed specifically for School Principals, Department of Education stakeholders, Teachers, Learners, and Parents. Visual clutter, hyper-saturated neon glows, and distracting floating background orbs are strictly eliminated in favor of clean whitespace, whisper-thin borders, and smooth tactile feedback.

* **Density:** Daily App Balanced (5/10)
* **Variance:** Offset Asymmetric (5/10)
* **Motion:** Fluid CSS with Perimeter Hover Beams (6/10)

---

## 2. Color Palette & Roles (The 60–30–10 Rule)

### 60% Base Canvas & 30% Structural Surfaces
* **Canvas Alabaster (Light Mode)** (`#F8FAFC`) — Primary light background; eliminates harsh daylight eye fatigue.
* **Pure Surface (Light Mode)** (`#FFFFFF`) — Card, table, and modal container fills with soft hairline `1px solid #E2E8F0` borders.
* **Deep Slate Ink** (`#0F172A`) — Primary headline typography and high-contrast labels.
* **Muted Steel** (`#64748B`) — Secondary captions, metadata, timestamps, and subtle hints.
* **Canvas Obsidian (Dark Mode)** (`#0B1120`) — Primary dark background; eliminates pitch-black eye strain.
* **Elevated Slate (Dark Mode)** (`#151E32`) — Card, table, and modal fills with `rgba(255, 255, 255, 0.08)` hairline dividers.
* **Subtle Canvas Surface** (`#0F172A`) — Deeper inset containers, search inputs, and table headers.

### 10% Signature Accent & Semantic Status
* **Royal Indigo Accent** (`#4F46E5` / `#6366F1`) — Primary interactive buttons, active tab indicators, and primary CTAs. Saturation capped under 80%.
* **Oceanic Cyan Touch** (`#0284C7`) — Subtle search badges, active focus highlights, and verified tags.
* **Success Emerald** (`#10B981`) — Attendance present status, marks 70%+, verified state.
* **Warning Amber** (`#F59E0B`) — Pending submissions, review requests, timetable swaps.
* **Danger Rose** (`#EF4444`) — Absent alerts, overdue assignments, irreversible actions.

---

## 3. Typography Architecture
* **Display & Headlines:** `Outfit`, sans-serif (`font-display`). Track-tight (`letter-spacing: -0.02em`), controlled scale. Hierarchy conveyed through font-weight and tonal depth rather than aggressive size.
* **Body & UI Controls:** `Plus Jakarta Sans`, sans-serif (`font-sans`). Relaxed leading, optimal legibility up to 65 characters per line.
* **Data, Codes & Marks:** `JetBrains Mono`, monospace (`font-mono`). Forced tabular figures (`font-variant-numeric: tabular-nums`) for marks, timetables, percentages, and Learner IDs.
* **Banned Fonts:** `Inter` in display contexts, generic browser serif fonts (`Times New Roman`, `Georgia`, `Garamond`). Serif fonts are strictly banned in software dashboards.

---

## 4. Component Stylings & Behaviors

### 1. Animated Hover Border Beam (Module & Card Signature)
* Every dashboard module, stat card, and feature tile features a smooth, hardware-accelerated **rotating border beam** on hover.
* Built using CSS `@property --border-angle` and masked conic gradients that follow the exact curved perimeter (`border-radius: inherit`) without extending outside or getting clipped by `overflow: hidden`.
* Ambient outer shadow (`box-shadow: 0 10px 24px -4px rgba(0, 0, 0, 0.25), 0 0 18px -2px rgba(99, 102, 241, 0.35)`) breathes softly at `2.5s ease-in-out`.
* Tactile `-2.5px` vertical lift on hover and `scale(0.99)` on active click.

### 2. Buttons & Actions
* **Primary Buttons:** Solid brand color (`#4F46E5`), subtle lift, active push state (`active:scale-98`). No harsh outer neon flares.
* **Secondary Buttons:** Crisp surface background with hairline border (`#E2E8F0` in light, `rgba(255,255,255,0.1)` in dark).
* **Theme Switcher:** 1-Click interactive header toggle (`Sun` / `Moon`) with smooth rotational icon transitions.

### 3. Inputs & Forms
* Labels positioned cleanly above inputs; error alerts inline below.
* Focused inputs adopt a single restrained indigo accent ring (`#4F46E5`). No flashing outlines.

---

## 5. Layout Principles
* **Universal 4-Dashboard Architecture:** Identical visual standards and theme responsiveness across all 4 portals:
  1. **Educator / Teacher Portal**
  2. **Parent & Guardian Portal**
  3. **Institutional Administrator Portal**
  4. **Student / Learner Portal**
* **Clean Spatial Zones:** No overlapping text or floating background neon blur orbs. Every element occupies its own clean spatial area.
* **Maximum Width Containment:** Dashboard contents centered with `max-w-7xl mx-auto`.
* **Mobile-First Responsiveness:** Sidebar collapses into accessible slide-out navigation on screens under `768px`; bottom dock provides quick access to core functions.

---

## 6. Motion & Interaction Philosophy
* **Perimeter Orbit on Hover:** Animated border beam sweeps continuously at `2.5s linear infinite` only when the user hovers over a module.
* **Hardware Acceleration:** Animations restricted to `transform`, `opacity`, and custom CSS properties (`--border-angle`).
* **Tactile Spring Feedback:** Interactive buttons depress naturally upon click, avoiding sluggish ease-in delays.

---

## 7. Anti-Patterns (Strictly Banned)
* ❌ **NO Floating Neon Ambient Orbs:** Distracting blurred glowing circles in the background are banned.
* ❌ **NO Multi-Color Rainbow Clashes:** Never mix pink, cyan, yellow, purple, and green gradients on the same card.
* ❌ **NO Pure Pitch-Black (#000000):** Use calibrated obsidian slate (`#0B1120`) to prevent harsh contrast and OLED smear.
* ❌ **NO Hardcoded Red Text on Neutral Links:** Danger red is reserved exclusively for errors and absence alerts.
* ❌ **NO Fabricated AI Filler Numbers:** All dashboard metrics, grades, and timetables are bound strictly to real database values.
