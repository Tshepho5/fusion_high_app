# Design Guide: Fusion High School Portal (v2.1)

## 1. Overview & Vision
A clean, modern, and student-friendly School Management System designed for Fusion High. The focus is on clarity, accessibility, responsive navigation, and intuitive workflows for Learners, Teachers, Parents, and Administrators.

---

## 2. Color Palette

### Base Surfaces
- **Dark Theme Canvas:** `#090D16` / `#111827` (Clean dark theme for evening study)
- **Navy Theme Canvas:** `#0b1329` / `#132247` (Classic school navy tone)
- **Light Theme Canvas:** `#F8FAFC` / `#FFFFFF` (Clean, crisp daylight theme)
- **Card Borders:** `1px solid rgba(255, 255, 255, 0.08)` (Dark) / `1px solid #E2E8F0` (Light)

### Accent & Status Colors
- **Primary Brand:** `#4F46E5` / `#6366F1` (Indigo Blue - Primary actions and active tabs)
- **Secondary Accent:** `#06B6D4` (Teal/Cyan - Highlights and badges)
- **Success:** `#10B981` (Emerald - Attendance present, marks 70%+)
- **Warning:** `#F59E0B` (Amber - Pending submissions, reviews)
- **Danger:** `#EF4444` (Rose - Absent status, overdue alerts)

---

## 3. Typography
- **Headings & Titles:** `Outfit` / `Inter`, sans-serif (Clean, confident hierarchy)
- **Body & Controls:** `Plus Jakarta Sans` / `Inter`, system-ui, sans-serif (Legible and easy on the eyes)
- **Codes & Data:** `JetBrains Mono`, monospace (Learner IDs, timetable codes, timestamps)

---

## 4. UI Components & Patterns

### Buttons & Navigation
- **Primary Buttons:** Solid brand color with subtle lift and active state feedback (`active:scale-98`).
- **Secondary Buttons:** Clean outline or subtle surface background.
- **Status Badges:** Rounded pill badges with clear, readable contrast.

### Cards & Layouts
- Rounded corners (`12px` to `16px`).
- Subtle, natural shadows (`shadow-sm`, `shadow-md`) instead of harsh neon glows.
- Clean spacing and grid alignment for quick scannability.

---

## 5. Responsive Design
- **Desktop (1024px+):** Sidebar navigation with multi-column widgets.
- **Tablet (768px - 1023px):** Compact sidebar with 2-column grid cards.
- **Mobile (<768px):** Clean single-column layout with accessible drawer/bottom menu.
