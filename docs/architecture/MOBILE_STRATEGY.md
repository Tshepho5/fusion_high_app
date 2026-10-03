# Mobile strategy — Geleza SA

**Decision (2026-10):** **Progressive Web App (PWA) via `client/`** is the primary mobile experience. The Flutter project is parked until product metrics justify a native rebuild.

## Why PWA first

- One codebase for learner / parent / teacher / principal portals already in React.
- Schools and guardians mostly need browser access (attendance, marks, fees, support) — not store-distributed native binaries.
- Firebase Hosting + responsive Tailwind already cover phone viewports used in SA school contexts.
- Faster ship cycle for Support Desk, CAPS report cards, and corrections.

## Flutter (`flutter_app/`)

- Keep the folder for experiments / offline prototypes.
- Do **not** block web releases on Flutter parity.
- Revisit native only if: offline-heavy teacher register use, push reliability gaps, or a funded mobile workstream.

## Near-term PWA hardening checklist

- [ ] Verify `manifest` + service worker installability on Android Chrome
- [ ] Mobile QA on learner home, parent children, teacher attendance, Support Desk
- [ ] Touch targets ≥ 44px on primary CTAs
- [ ] Test Contact Admin + OTP recovery on slow mobile networks
