# Design System: Fusion High Portal (v2.1 - Ice Blue & Neon Cyan)

## 1. Visual Theme & Atmosphere
A modern, vibrant, and tactile design system inspired by the reference banking & school portal interfaces. The aesthetic pairs a soft ice blue desaturated cyan gradient light mode canvas with an ultra-deep midnight navy-black dark mode canvas. Elevated content cards, soft pastel blue-grey chip containers with dark charcoal glyphs in light mode, and glowing turquoise/cyan glyphs in dark mode define the experience across all user portals: Teacher, Learner, Parent, and Admin.

* **Density:** Daily App Balanced (5/10)
* **Variance:** Offset Asymmetric (5/10)
* **Motion:** Fluid CSS with subtle micro-interactions and transitions (4/10)

---

## 2. Color Palette & Roles (Reference Architecture)

### Light Mode (Soft Ice Blue Canvas & Pastel Blue-Grey Chips)
* **Screen Background:** `#CBDDE3` to `#EBF2F5` — Very soft ice blue / pale desaturated cyan gradient.
* **Surface / Content Cards:** `#FFFFFF` — Crisp clean pure white elevated cards with subtle soft drop shadows (`rgba(18, 38, 58, 0.05)`).
* **Inset / Sub-Cards / Search Bars:** `#EDF4F7` — Soft light greyish-blue tint for input fields, top summary cards, and pill backdrops.
* **Primary Typography:** `#1C252C` — Deep charcoal black for maximum legibility and sharpness.
* **Secondary Typography:** `#52525B` — Neutral zinc for sub-labels and secondary details.
* **Muted / Captions:** `#71717A` — Supporting captions, timestamps, and placeholder copy.
* **Quick Action Buttons (Deposit / Pay / Create / Add):** Very dark charcoal / deep navy-black circle (`#1C252C`) with bright cyan / turquoise glyph (`#13C8D9`).
* **Signature Accent Badges / Active Tabs:** Bright cyan pill (`#13C8D9` / `#18E2EC`) with cyan progress underline indicator.
* **Middle Module Icon Chips:** Soft pastel blue-grey squircle (`#E1ECF0`) with dark charcoal / slate black glyphs (`#232B32`).

### Dark Mode (Midnight Navy-Black & Glowing Cyan Accent)
* **Screen Background:** `#060D14` to `#0B1520` — Deep midnight navy-black canvas with subtle dark cyan wave ambient glow.
* **Surface / Content Cards:** `#0F1A24` to `#111C26` — Elevated dark navy-slate containers with `1px solid #1B2E3D` borders.
* **Inset / Sub-Cards / Search Bars:** `#0A121A` to `#142230` — Recessed dark navy containers.
* **Primary Typography:** `#FFFFFF` — Crisp pure white text for effortless reading on dark backgrounds.
* **Secondary Typography:** `#94A3B8` — Soft silvery slate for secondary descriptions and labels.
* **Muted / Captions:** `#64748B` — Balanced muted slate for timestamps and inactive states.
* **Quick Action Buttons (Deposit / Pay / Create / Add):** Deep navy-black circle (`#1C252C` / `#131E28`) with bright glowing cyan glyph (`#13C8D9` / `#18E2EC`).
* **Signature Accent Badges / Active Tabs:** Bright neon cyan pill (`#13C8D9` / `#18E2EC`) with dark charcoal text (`#071018`) and cyan progress indicator.
* **Middle Module Icon Chips:** Deep blue-grey squircle (`#152535` / `#182E42`) with glowing turquoise / cyan glyphs (`#13C8D9` / `#18E2EC`).

### Floating Bottom Menu / Mascot Button
* **Inner Circle:** Deep charcoal black (`#181E24`).
* **Text / Accent:** Bright cyan / neon turquoise (`#18E2EC`).
* **Border / Outer Ring:** Split gradient ring featuring cyan / teal (`#18E2EC` / `#06B6D4`) on the bottom-right and hot magenta / pink (`#EC4899` / `#F43F5E`) on the top-left edge.

### Floating Bottom Navigation Dock
* **Dock Bar Background:** Deep navy-black (`#0D1620` / `#0A1118`) with subtle border.
* **Active Tab Item:** Bright cyan / neon turquoise (`#13C8D9` / `#18E2EC`) with top cyan emitter lamp and downward projector light beam.
* **Inactive Tab Items:** Slate muted (`#64748B` / `#7E96A9`).

### Semantic Status Indicators
* **Success / Present:** `#10B981` — Attendance present, 70%+ performance, verified states.
* **Warning:** `#F59E0B` — Pending reviews, notices, scheduling updates.
* **Danger:** `#EF4444` — Overdue assignments, absences, critical alerts.

---

## 3. Strict Contrast & Content Preservation Rules
* **No White-on-White in Light Mode:** Headings, table cells, form labels, card texts, and status descriptions dynamically inherit `var(--wave-text-primary)` (`#1C252C`) or `var(--wave-text-secondary)` (`#52525B`).
* **No Dark-on-Dark in Dark Mode:** Stat cards, modals, table headers, and form inputs dynamically inherit `var(--wave-text-primary)` (`#FFFFFF`) or `var(--wave-text-secondary)` (`#94A3B8`).
* **Theme Switching:** Both modes are powered by universal CSS custom properties declared in `/css/waves-theme.css` and `client/src/index.css`.

---

## 4. Universal 4-Dashboard Architecture
Identical visual tokens and contrast guarantees apply consistently to:
1. **Teacher / Educator Portal** (`TeacherDashboard.tsx`, `/dashboards/teacher.html`)
2. **Student / Learner Portal** (`LearnerDashboard.tsx`, `/dashboards/learner.html`)
3. **Parent & Guardian Portal** (`ParentDashboard.tsx`, `/dashboards/parent.html`)
4. **Institutional Admin Portal** (`AdminDashboard.tsx`, `/dashboards/admin.html`)
5. **Admissions & Auth Portals** (`application.html`, `/auth/index.html`)
