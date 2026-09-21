# Design System: Fusion High Portal (v2.1)

## 1. Visual Theme & Atmosphere
A clean, minimalist monochrome and soft lavender design system inspired by modern iOS/macOS design principles (as shown in reference designs). The aesthetic pairs deep pitch-black dark mode surfaces with an ultra-clean, light gray/white light mode canvas. High contrast, typographic clarity, and subtle tactile buttons define the experience across all user portals: Teacher, Learner, Parent, and Admin.

* **Density:** Daily App Balanced (5/10)
* **Variance:** Offset Asymmetric (5/10)
* **Motion:** Fluid CSS with subtle micro-interactions and transitions (4/10)

---

## 2. Color Palette & Roles (Reference Architecture)

### Light Mode (Clean Monochrome & Lavender Accent)
* **Canvas Background:** `#F5F5F7` — Soft off-white canvas that prevents harsh glare.
* **Surface / Cards:** `#FFFFFF` — Pure white elevated cards with crisp `1px solid #E4E4E7` borders.
* **Inset / Subtle Backdrops:** `#F4F4F6` — Clean input fields, subtle pill tags, and table striping.
* **Primary Typography:** `#111111` — Deep ink black for maximum legibility and sharpness.
* **Secondary Typography:** `#52525B` — Neutral zinc for sub-labels and secondary details.
* **Muted / Captions:** `#71717A` — Supporting captions, timestamps, and placeholder copy.
* **Primary CTA Buttons:** Solid black pill (`#111111`) with crisp white text (`#FFFFFF`), `border-radius: 9999px`.
* **Secondary Buttons:** Pure white pill (`#FFFFFF`) with dark text (`#111111`) and border (`#E4E4E7`).
* **Signature Accent Badges / Icons:** Soft lavender pill container (`#F3E8FF`) with deep purple/violet icon and text (`#9333EA`).

### Dark Mode (Pitch Black & Elevated Charcoal)
* **Canvas Background:** `#0A0A0C` — Deep pitch-black canvas for true dark mode aesthetic.
* **Surface / Cards:** `#16161A` — Elevated dark charcoal containers with `1px solid #27272E` borders.
* **Inset / Subtle Backdrops:** `#1E1E24` — Recessed input elements, metric insets, and search containers.
* **Primary Typography:** `#FFFFFF` — Crisp pure white text for effortless reading on dark backgrounds.
* **Secondary Typography:** `#A1A1AA` — Soft silvery gray for secondary descriptions and labels.
* **Muted / Captions:** `#71717A` — Balanced muted slate for timestamps and inactive states.
* **Primary CTA Buttons:** Solid bright white pill (`#FFFFFF`) with jet-black text (`#000000`), `border-radius: 9999px`.
* **Secondary Buttons:** Dark charcoal pill (`#16161A`) with white text (`#FFFFFF`) and border (`#27272E`).
* **Signature Accent Badges / Icons:** Deep plum/violet pill container (`#261B35`) with glowing lavender icon and text (`#C084FC`).

### Semantic Status Indicators
* **Success:** `#10B981` — Attendance present, 70%+ performance, verified states.
* **Warning:** `#F59E0B` — Pending reviews, notices, scheduling updates.
* **Danger:** `#EF4444` — Overdue assignments, absences, critical alerts.

---

## 3. Strict Contrast & Content Preservation Rules
* **No White-on-White in Light Mode:** Headings, table cells, form labels, card texts, and status descriptions dynamically inherit `var(--wave-text-primary)` (`#111111`) or `var(--wave-text-secondary)` (`#52525B`).
* **No Dark-on-Dark in Dark Mode:** Stat cards, modals, table headers, and form inputs dynamically inherit `var(--wave-text-primary)` (`#FFFFFF`) or `var(--wave-text-secondary)` (`#A1A1AA`).
* **Theme Switching:** Both modes are powered by universal CSS custom properties declared in `/css/waves-theme.css` (`:root` and `[data-theme="dark"]`).

---

## 4. Universal 4-Dashboard Architecture
Identical visual tokens and contrast guarantees apply consistently to:
1. **Teacher / Educator Portal** (`/dashboards/teacher.html`)
2. **Student / Learner Portal** (`/dashboards/learner.html`)
3. **Parent & Guardian Portal** (`/dashboards/parent.html`)
4. **Institutional Admin Portal** (`/dashboards/admin.html`)
5. **Admissions & Auth Portals** (`/application.html`, `/auth/index.html`)
